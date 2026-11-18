// Automated S1 measurement. Run from spikes/: node s1-pyodide-worker/measure.mjs [--out results.json]
// Asserts on EVERY load (cold and warm, each browser, dev and prod); any violation exits non-zero.
import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const RUNS = 5;
const outIdx = process.argv.indexOf("--out");
const outFile = outIdx > 0 ? process.argv[outIdx + 1] : null;

const servers = {
  dev: { port: 5171, cmd: "pnpm exec vite --config s1-pyodide-worker/vite.config.ts s1-pyodide-worker --port 5171 --strictPort", cwd: spikes },
  prod: { port: 4171, cmd: "node serve-prod.mjs 4171", cwd: here },
};
// [label, browser type, CPU throttle rate]. Emulation.setCPUThrottlingRate is rejected for worker targets
// ("only supported for pages"), so the throttle never reaches the Pyodide worker; see the findings note.
const targets = [
  ["chromium", chromium, 1],
  ["firefox", firefox, 1],
  ["webkit", webkit, 1],
  ["chromium-4x-throttle (main thread only)", chromium, 4],
];

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return { median: +m.toFixed(1), min: +s[0].toFixed(1), max: +s.at(-1).toFixed(1) };
};

async function waitUp(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start: " + url);
}

function assertLoad(where, s1, load) {
  const bad = [];
  if (s1.error) bad.push(`page error: ${s1.error}`);
  if (s1.crossOriginIsolated !== true) bad.push(`crossOriginIsolated=${s1.crossOriginIsolated}`);
  if (s1.sum !== "2") bad.push(`1+1 returned ${JSON.stringify(s1.sum)}`);
  if (!/^3\.\d+\.\d+ /.test(s1.version ?? "")) bad.push(`sys.version=${JSON.stringify(s1.version)}`);
  if (typeof s1.bootMs !== "number") bad.push("no bootMs");
  if (load.foreign.length) bad.push(`foreign requests: ${load.foreign.join(", ")}`);
  if (bad.length) throw new Error(`ASSERT FAIL [${where}]: ${bad.join("; ")}`);
}

async function measure(mode, name, type, rate, origin) {
  const out = { server: mode, browser: name, cpuThrottle: rate, cold: [], warm: [], requestsPerLoad: [], pyVersion: null, assertions: 0 };
  let browser;
  try { browser = await type.launch(); }
  catch (e) { return { ...out, untested: String(e).split("\n")[0] }; }
  out.browserVersion = browser.version();
  try {
    for (let i = 1; i <= RUNS; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      if (rate !== 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
      let load;
      ctx.on("request", (r) => {
        load.requests++;
        const u = r.url();
        if (!u.startsWith("data:") && !u.startsWith("blob:") && new URL(u).origin !== origin) load.foreign.push(u);
      });
      for (const kind of ["cold", "warm"]) {
        load = { requests: 0, foreign: [] };
        if (kind === "cold") await page.goto(origin + "/"); else await page.reload();
        await page.waitForFunction(() => window.__s1 && window.__s1.done, null, { timeout: 180000 });
        const s1 = await page.evaluate(() => ({ ...window.__s1 }));
        assertLoad(`${mode}/${name}/run ${i}/${kind}`, s1, load);
        out.assertions++;
        out[kind].push(s1.bootMs);
        out.requestsPerLoad.push(load.requests);
        out.pyVersion = s1.version;
      }
      await ctx.close();
    }
  } finally { await browser.close().catch(() => {}); }
  out.coldStat = stat(out.cold);
  out.warmStat = stat(out.warm);
  return out;
}

const cpus = os.cpus();
const pw = JSON.parse(readFileSync(path.join(spikes, "node_modules/playwright/package.json"), "utf8")).version;
const vite = JSON.parse(readFileSync(path.join(spikes, "node_modules/vite/package.json"), "utf8")).version;
const system = {
  cpu: cpus[0].model.trim(), logicalCores: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  os: `${os.type()} ${os.release()}`, node: process.version, playwright: pw, vite,
  pyodide: /^version=(.+)$/m.exec(readFileSync(path.join(spikes, "pyodide-version.txt"), "utf8"))[1].trim(),
};
console.log("SYSTEM", JSON.stringify(system));

execSync("pnpm exec vite build --config s1-pyodide-worker/vite.config.ts s1-pyodide-worker", { cwd: spikes, stdio: "inherit" });

const results = [];
let failure = null;
for (const [mode, s] of Object.entries(servers)) {
  const proc = spawn(s.cmd, { cwd: s.cwd, shell: true, stdio: "ignore" });
  const origin = `http://localhost:${s.port}`;
  try {
    await waitUp(origin + "/");
    for (const [n, t, rate] of targets) {
      const r = await measure(mode, n, t, rate, origin);
      results.push(r);
      console.log(r.untested ? `${mode}/${n}: UNTESTED ${r.untested}` :
        `${mode}/${n} ${r.browserVersion}: ${r.assertions} loads asserted; cold ${JSON.stringify(r.coldStat)} warm ${JSON.stringify(r.warmStat)}; requests/load ${[...new Set(r.requestsPerLoad)].join(",")}`);
    }
  } catch (e) {
    failure = e;
    break;
  } finally {
    try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); }
  }
}
if (failure) { console.error(String(failure.message ?? failure)); process.exit(1); }

const total = results.reduce((a, r) => a + r.assertions, 0);
const untested = results.filter((r) => r.untested).map((r) => `${r.server}/${r.browser}`);
console.log(`ASSERTIONS OK: ${total} loads checked (isolated, 1+1=2, sys.version, 0 foreign origins); untested: ${untested.join(", ") || "none"}`);
if (outFile) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ system, results }, null, 2));
}
