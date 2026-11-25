// Automated S5 measurement. From spikes/: node s5-animation/measure.mjs [--out results.json] [--runs 5] [--swaps 200]
//   [--browsers chromium,firefox,webkit] [--no-docker]
// Desktop: HEADED browsers (headless rAF timing is not representative), production build, 4 cells per browser
// (SVG-300 and Canvas-5k, each at 1x and 8x), N runs per cell, 200 swaps per run. Then Chromium HEADLESS in the Playwright
// Docker image with --cpus=0.5 (SVG-300 and Canvas-5k cells only). `--container` is the in-Docker entry point.
import { spawn, execSync, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const flag = (n) => process.argv.includes(n);
const fwd = (p) => p.split(path.sep).join("/");
const inContainer = flag("--container");
const THROTTLE = Number(arg("--throttle") ?? 0); // CDP Emulation.setCPUThrottlingRate (Chromium only), headed
const mergeInto = arg("--merge"); // append this run's results to an existing results JSON
const outFile = arg("--out");
const RUNS = Number(arg("--runs") ?? 5), SWAPS = Number(arg("--swaps") ?? 200), SEED = 20261118;
const CELLS = [
  { renderer: "svg", n: 300, speed: 1 }, { renderer: "svg", n: 300, speed: 8 },
  { renderer: "canvas", n: 5000, speed: 1 }, { renderer: "canvas", n: 5000, speed: 8 },
];
let assertions = 0;
const must = (c, msg) => { assertions++; if (!c) throw new Error("ASSERT " + msg); };
const stat = (a, d = 2) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const r = (v) => +v.toFixed(d);
  return { median: r(m), min: r(s[0]), max: r(s.at(-1)) };
};
async function waitUp(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error("server did not start: " + url);
}
const kill = (proc) => {
  if (process.platform === "win32") { try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); } }
  else proc.kill();
};
async function withServer(fn) {
  const port = inContainer ? 4176 : 4175;
  const proc = spawn(process.execPath, [path.join(here, "serve-prod.mjs"), String(port)], { cwd: here, stdio: "ignore" });
  const origin = `http://localhost:${port}`;
  try { await waitUp(origin + "/"); return await fn(origin); } finally { kill(proc); }
}

function systemInfo() {
  const cpus = os.cpus();
  const pkg = (n) => { try { return JSON.parse(readFileSync(path.join(spikes, "node_modules", n, "package.json"), "utf8")).version; } catch { return null; } };
  const info = {
    cpu: cpus[0].model.trim(), logicalCores: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
    os: `${os.type()} ${os.release()}`, node: process.version, playwright: pkg("playwright"), vite: pkg("vite"),
  };
  if (inContainer) { try { info.cgroupCpuMax = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim(); } catch {} return info; }
  const ps = (c) => { try { return execFileSync("powershell", ["-NoProfile", "-Command", c], { encoding: "utf8" }).trim(); } catch { return null; } };
  info.displayRefreshHz_os = ps("(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty CurrentRefreshRate) -join ','");
  info.batteryPresent = ps("@(Get-CimInstance Win32_Battery).Count") !== "0";
  info.powerState = info.batteryPresent ? "battery present (state not asserted)" : "no battery: desktop on AC";
  return info;
}

const hostLaunch = { chromium: { headless: false, args: ["--disable-backgrounding-occluded-windows"] }, firefox: { headless: false }, webkit: { headless: false } };

let stalls = [];
async function runCellOnce(browser, origin, cell) {
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 450 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  if (THROTTLE > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE }); }
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });
  try {
    await page.goto(origin + "/", { waitUntil: "load" });
    await page.waitForFunction(() => window.s5ready === true, null, { timeout: 20000 });
    const timeout = SWAPS * (450 / cell.speed) * 1.6 + 30000;
    const r = await Promise.race([
      page.evaluate((o) => window.runS5(o), { ...cell, swaps: SWAPS, seed: SEED }),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`run timeout ${timeout} ms`)), timeout)),
    ]);
    const tag = `${cell.renderer}-${cell.n} ${cell.speed}x`;
    must(r.errors.length === 0, `${tag}: in-run exceptions: ${r.errors.join("|")}`);
    must(r.pageErrors.length === 0 && pageErrors.length === 0, `${tag}: page errors: ${[...r.pageErrors, ...pageErrors].join("|")}`);
    must(r.resolved === SWAPS, `${tag}: ${r.resolved}/${SWAPS} tweens resolved`);
    must(r.orderMatchesModel, `${tag}: rendered bar order != model array after ${SWAPS} swaps (seed ${SEED})`);
    must(r.elements >= cell.n, `${tag}: expected >= ${cell.n} elements, got ${r.elements}`);
    must(r.frames > SWAPS, `${tag}: implausibly few frames (${r.frames})`);
    return r;
  } finally { await ctx.close(); }
}

// A run that exceeds its timeout (observed once on the desktop: headed window stalled, rAF not delivered) is logged,
// recorded in `stalls`, and retried up to 2 times; it never silently counts as data.
async function runCell(browser, origin, cell) {
  for (let attempt = 0; ; attempt++) {
    try { return await runCellOnce(browser, origin, cell); }
    catch (e) {
      if (!String(e.message).startsWith("run timeout") || attempt >= 2) throw e;
      const msg = `${cell.renderer}-${cell.n} ${cell.speed}x attempt ${attempt + 1}: ${e.message}`;
      stalls.push(msg); console.log("  STALL (retrying):", msg);
    }
  }
}

async function measureBrowser(label, type, origin, cells, launchOpts) {
  let browser;
  try { browser = await type.launch(launchOpts); }
  catch (e) { return { label, untested: "launch failed: " + String(e.message).split("\n")[0] }; }
  const version = browser.version();
  stalls = [];
  const out = { label, browserVersion: version, headless: launchOpts.headless !== false, cells: [], stalls };
  try {
    for (const cell of cells) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await runCell(browser, origin, cell);
        runs.push(r);
        console.log(`  ${label} ${cell.renderer}-${cell.n} ${cell.speed}x run ${i + 1}: avg ${r.avgFps.toFixed(1)} fps, p5 ${r.p5Fps.toFixed(1)}, dropped(>25ms) ${r.dropped}, refresh~${r.idleRefreshHz.toFixed(0)} Hz, wall ${(r.wallMs / 1000).toFixed(1)}s`);
      }
      out.cells.push({
        ...cell, swaps: SWAPS, seed: SEED, perSwapMs: 450 / cell.speed, runs: runs.length,
        idleRefreshHz: stat(runs.map((r) => r.idleRefreshHz), 1),
        avgFps: stat(runs.map((r) => r.avgFps)), p5Fps: stat(runs.map((r) => r.p5Fps)),
        dropped: stat(runs.map((r) => r.dropped), 0), droppedVsRefresh: stat(runs.map((r) => r.droppedVsRefresh), 0),
        worstFrameMs: stat(runs.map((r) => r.worstFrameMs)), framesPerRun: stat(runs.map((r) => r.frames), 0),
        wallS: stat(runs.map((r) => r.wallMs / 1000), 1),
        raw: runs.map(({ errors, pageErrors, ...x }) => x),
      });
    }
  } catch (e) {
    await browser.close().catch(() => {});
    if (type === webkit) return { label, untested: "run failed: " + String(e.message).split("\n")[0] };
    throw e;
  }
  await browser.close();
  return out;
}

const system = systemInfo();
console.log("SYSTEM", JSON.stringify(system));

if (inContainer) {
  const results = await withServer(async (o) => [await measureBrowser("chromium headless (Docker --cpus=0.5)", chromium, o, CELLS, { headless: true })]);
  writeFileSync(outFile, JSON.stringify({ system, assertions, results }, null, 2));
  process.exit(0);
}

execSync("pnpm exec vite build --config s5-animation/vite.config.ts s5-animation", { cwd: spikes, stdio: "inherit" });

const results = [];
await withServer(async (origin) => {
  const only = (arg("--browsers") ?? "chromium,firefox,webkit").split(",");
  for (const [n, t] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]].filter(([n]) => only.includes(n))) {
    console.log(`BROWSER ${n} (headed)`);
    const r = await measureBrowser(THROTTLE > 1 ? `${n} headed (desktop), CDP CPU throttling ${THROTTLE}x` : `${n} headed (desktop)`, t, origin, CELLS, hostLaunch[n]);
    results.push(r);
    if (r.untested) console.log("  UNTESTED:", r.untested);
  }
});

if (!flag("--no-docker")) {
  const cache = path.join(here, ".cache");
  mkdirSync(cache, { recursive: true });
  const image = "mcr.microsoft.com/playwright:v1.65.1-noble";
  const pnpm = fwd(path.join(spikes, "node_modules/.pnpm"));
  console.log(`DOCKER ${image} --cpus=0.5`);
  execFileSync("docker", ["run", "--rm", "--cpus=0.5", "--ipc=host",
    "-v", `${fwd(here)}:/work/s5`,
    "-v", `${pnpm}/playwright@1.65.1/node_modules/playwright:/work/node_modules/playwright:ro`,
    "-v", `${pnpm}/playwright-core@1.65.1/node_modules/playwright-core:/work/node_modules/playwright-core:ro`,
    image, "bash", "-c", `node /work/s5/measure.mjs --container --runs ${RUNS} --swaps ${SWAPS} --out /work/s5/.cache/docker.json`],
    { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
  const d = JSON.parse(readFileSync(path.join(cache, "docker.json"), "utf8"));
  assertions += d.assertions;
  for (const r of d.results) { r.system = d.system; results.push(r); }
}

const untested = results.filter((r) => r.untested).map((r) => r.label);
console.log(`ASSERTIONS OK: ${assertions} checks (per run: no in-run exceptions or page errors; every tween promise resolved; rendered bar order == model order after ${SWAPS} seeded swaps; element count; frame count); untested: ${untested.join(", ") || "none"}`);
if (mergeInto) {
  const d = JSON.parse(readFileSync(mergeInto, "utf8"));
  d.results.push(...results.map((r) => ({ ...r, cpuThrottlingRate: THROTTLE })));
  d.assertions += assertions;
  writeFileSync(mergeInto, JSON.stringify(d, null, 2));
} else if (outFile) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ system, assertions, seed: SEED, swaps: SWAPS, runsPerCell: RUNS, results }, null, 2));
}
