// Automated S1 measurement. Run from spikes/: node s1-pyodide-worker/measure.mjs
import { spawn, execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const RUNS = 5;
const servers = {
  dev: { port: 5171, cmd: "pnpm exec vite --config s1-pyodide-worker/vite.config.ts s1-pyodide-worker --port 5171 --strictPort", cwd: spikes },
  prod: { port: 4171, cmd: "node serve-prod.mjs 4171", cwd: here },
};

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

async function load(page, url, origin, foreign, nav) {
  await nav();
  await page.waitForFunction(() => window.__s1 && window.__s1.done, null, { timeout: 120000 });
  return page.evaluate(() => ({ ...window.__s1 }));
}

async function measure(type, name, url, origin) {
  const out = { browser: name, cold: [], warm: [], isolated: null, sum: null, version: null, foreign: [], error: null, requests: 0 };
  let browser;
  try {
    browser = await type.launch();
    out.browserVersion = browser.version();
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      ctx.on("request", (r) => {
        out.requests++;
        if (!r.url().startsWith("data:") && !r.url().startsWith("blob:") && new URL(r.url()).origin !== origin) out.foreign.push(r.url());
      });
      const cold = await load(page, url, origin, out.foreign, () => page.goto(url));
      if (cold.error) throw new Error(cold.error);
      out.cold.push(cold.bootMs);
      const warm = await load(page, url, origin, out.foreign, () => page.reload());
      if (warm.error) throw new Error(warm.error);
      out.warm.push(warm.bootMs);
      out.isolated = cold.crossOriginIsolated && warm.crossOriginIsolated;
      out.sum = cold.sum;
      out.version = cold.version;
      await ctx.close();
    }
  } catch (e) {
    out.error = String(e).split("\n")[0];
  } finally {
    await browser?.close().catch(() => {});
  }
  return out;
}

const results = {};
const cpus = os.cpus();
const system = { cpu: cpus[0].model, threads: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), os: `${os.type()} ${os.release()}`, node: process.version };

execSync("pnpm exec vite build --config s1-pyodide-worker/vite.config.ts s1-pyodide-worker", { cwd: spikes, stdio: "ignore" });

for (const [mode, s] of Object.entries(servers)) {
  const proc = spawn(s.cmd, { cwd: s.cwd, shell: true, stdio: "ignore" });
  const origin = `http://localhost:${s.port}`;
  try {
    await waitUp(origin + "/");
    results[mode] = [];
    for (const [n, t] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]]) {
      const r = await measure(t, n, origin + "/", origin);
      if (!r.error) { r.coldStat = stat(r.cold); r.warmStat = stat(r.warm); }
      results[mode].push(r);
    }
  } finally {
    try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); }
  }
}
console.log(JSON.stringify({ system, results }, null, 2));
