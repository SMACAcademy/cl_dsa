// Automated S2 measurement. From spikes/: node s2-tracer/measure.mjs [--out results.json] [--no-docker]
// Host: builds, serves dist via serve-prod.mjs, runs Chromium/Firefox/WebKit, then repeats Chromium inside the
// Playwright Docker image with --cpus=0.5 (mid-range-laptop approximation). Every benchmark run is asserted
// (in the worker AND here); any violation exits non-zero. `--container` is the in-Docker entry point.
import { spawn, execSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(name);
const outFile = arg("--out");
const inContainer = flag("--container");
const PORT = inContainer ? 4173 : 4172;
const EXPECT_RUNS = 5;

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const r = (v) => +v.toFixed(1);
  return { median: r(m), min: r(s[0]), max: r(s.at(-1)) };
};
const fwd = (p) => p.split(path.sep).join("/");
const col = (rows, k) => rows.map((r) => r[k]);

async function waitUp(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("server did not start: " + url);
}

function assertBench(where, s2, foreign) {
  const bad = [];
  if (s2.error) bad.push(`page error: ${s2.error}`);
  if (s2.crossOriginIsolated !== true) bad.push(`crossOriginIsolated=${s2.crossOriginIsolated}`);
  if (foreign.length) bad.push(`foreign requests: ${foreign.join(", ")}`);
  for (const k of ["shallow", "copy"]) {
    const rows = s2[k] ?? [];
    if (rows.length !== EXPECT_RUNS) bad.push(`${k}: ${rows.length} runs`);
    for (const r of rows) {
      if (!(r.events > 0)) bad.push(`${k}: zero events`);
      if (!(r.traceMs > 0 && r.stringifyMs >= 0)) bad.push(`${k}: bad timings`);
    }
    if (new Set(col(rows, "events")).size !== 1) bad.push(`${k}: event counts differ between runs`);
  }
  if ((s2.baselineMs ?? []).length !== EXPECT_RUNS) bad.push("baseline runs missing");
  const p = s2.payload;
  if (!p || p.jsonValid !== true || p.bigSerialized?.$bigint !== "1" + "0".repeat(30) || p.stringLength !== 5000) bad.push("payload case invalid");
  if (bad.length) throw new Error(`ASSERT FAIL [${where}]: ${bad.join("; ")}`);
}

async function measure(label, type, origin) {
  const out = { label, browser: type.name() };
  let browser;
  try { browser = await type.launch(); } catch (e) { return { ...out, untested: String(e).split("\n")[0] }; }
  out.browserVersion = browser.version();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const foreign = [];
    ctx.on("request", (r) => {
      const u = r.url();
      if (!u.startsWith("data:") && !u.startsWith("blob:") && new URL(u).origin !== origin) foreign.push(u);
    });
    await page.goto(origin + "/bench.html");
    await page.waitForFunction(() => window.__s2 && window.__s2.done, null, { timeout: 900000 });
    const s2 = await page.evaluate(() => ({ ...window.__s2 }));
    assertBench(label, s2, foreign);
    Object.assign(out, { pyVersion: s2.pyVersion, seed: s2.seed, n: s2.n, input: s2.input, bootMs: +s2.bootMs.toFixed(1),
      raw: { shallow: s2.shallow, copy: s2.copy, baselineMs: s2.baselineMs }, payload: s2.payload, assertions: 1 });
    for (const k of ["shallow", "copy"]) {
      out[k] = { events: s2[k][0].events, jsonBytes: s2[k][0].jsonBytes };
      for (const m of ["traceMs", "toJsMs", "stringifyMs", "totalMs", "eventsPerSecTrace", "eventsPerSecTotal"]) out[k][m] = stat(col(s2[k], m));
    }
    out.baselineStat = stat(s2.baselineMs);
    await ctx.close();
  } finally { await browser.close().catch(() => {}); }
  return out;
}

function systemInfo() {
  const cpus = os.cpus();
  const pkg = (n) => { try { return JSON.parse(readFileSync(path.join(spikes, "node_modules", n, "package.json"), "utf8")).version; } catch { return null; } };
  let cgroup = null;
  try { cgroup = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim(); } catch {}
  return {
    cpu: cpus[0].model.trim(), logicalCores: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
    os: `${os.type()} ${os.release()}`, node: process.version, playwright: pkg("playwright"), vite: pkg("vite"),
    pyodide: /^version=(.+)$/m.exec(readFileSync(path.join(spikes, "pyodide-version.txt"), "utf8"))[1].trim(),
    ...(inContainer ? { cgroupCpuMax: cgroup } : {}),
  };
}

async function withServer(fn) {
  const proc = spawn(process.execPath, [path.join(here, "serve-prod.mjs"), String(PORT)], { cwd: here, stdio: "ignore" });
  const origin = `http://localhost:${PORT}`;
  try { await waitUp(origin + "/bench.html"); return await fn(origin); }
  finally {
    if (process.platform === "win32") { try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); } }
    else proc.kill();
  }
}

const describe = (r) => r.untested ? `${r.label}: UNTESTED ${r.untested}` :
  `${r.label} ${r.browserVersion}: events ${r.shallow.events}; trace(shallow) ${JSON.stringify(r.shallow.traceMs)} total ${JSON.stringify(r.shallow.totalMs)}; ` +
  `trace(copy) ${JSON.stringify(r.copy.traceMs)}; baseline ${JSON.stringify(r.baselineStat)}`;

const system = systemInfo();
console.log("SYSTEM", JSON.stringify(system));

if (inContainer) {
  const results = await withServer(async (o) => [await measure("chromium (Docker --cpus=0.5)", chromium, o)]);
  results.forEach((r) => console.log(describe(r)));
  writeFileSync(outFile, JSON.stringify({ system, results }, null, 2));
  process.exit(0);
}

execSync("pnpm exec vite build --config s2-tracer/vite.config.ts s2-tracer", { cwd: spikes, stdio: "inherit" });

const results = [];
await withServer(async (origin) => {
  for (const [label, type] of [["chromium (desktop)", chromium], ["firefox (desktop)", firefox], ["webkit (desktop)", webkit]]) {
    const r = await measure(label, type, origin);
    results.push(r);
    console.log(describe(r));
  }
});

let dockerSystem = null;
if (!flag("--no-docker")) {
  const cache = path.join(here, ".cache");
  mkdirSync(cache, { recursive: true });
  const image = "mcr.microsoft.com/playwright:v1.65.1-noble";
  // /work/s2 = this folder (with dist/). The container has no usable npm registry access behind a TLS-intercepting
  // proxy, so the host's pure-JS playwright packages are mounted read-only into /work/node_modules instead.
  const pnpm = fwd(path.join(spikes, "node_modules/.pnpm"));
  const inner = "node /work/s2/measure.mjs --container --out /work/s2/.cache/docker.json";
  console.log(`DOCKER ${image} --cpus=0.5`);
  execFileSync("docker", ["run", "--rm", "--cpus=0.5", "--ipc=host",
    "-v", `${fwd(here)}:/work/s2`,
    "-v", `${fwd(spikes)}/pyodide-version.txt:/work/pyodide-version.txt:ro`,
    "-v", `${pnpm}/playwright@1.65.1/node_modules/playwright:/work/node_modules/playwright:ro`,
    "-v", `${pnpm}/playwright-core@1.65.1/node_modules/playwright-core:/work/node_modules/playwright-core:ro`,
    image, "bash", "-c", inner], { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  const d = JSON.parse(readFileSync(path.join(cache, "docker.json"), "utf8"));
  dockerSystem = d.system;
  for (const r of d.results) { r.label = "chromium, mid-range-laptop approximation (Docker --cpus=0.5)"; results.push(r); }
}

const untested = results.filter((r) => r.untested).map((r) => r.label);
const total = results.reduce((a, r) => a + (r.assertions ?? 0), 0);
console.log(`ASSERTIONS OK: ${total} benchmark loads checked (per-run: events>0, result==sorted(input), JSON.stringify ok, payload exact, 0 foreign origins); untested: ${untested.join(", ") || "none"}`);
if (outFile) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ system, dockerSystem, results }, null, 2));
}
