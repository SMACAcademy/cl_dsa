// Automated S6 measurement. From spikes/: node s6-universe/measure.mjs --out ../docs/spikes/data/s6-results.json [--runs 5] [--browsers chromium,firefox,webkit] [--quick]
// HEADED browsers, production build. Per browser two scenarios: (a) wheel zoom k=1 -> 8 -> 1 (2 cycles), (b) drag pan at k=3.
// Plus a headed Chromium row with CDP Emulation.setCPUThrottlingRate 4x (main-thread only). N runs per cell.
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
const outFile = arg("--out");
const RUNS = Number(arg("--runs") ?? 5);
const QUICK = flag("--quick");
const ZOOM_MS = QUICK ? 4000 : 16000, ZOOM_CYCLES = 2, PAN_MS = QUICK ? 3000 : 12000;
const CELLS = [
  { scenario: "zoom", durationMs: ZOOM_MS, cycles: ZOOM_CYCLES },
  { scenario: "pan", durationMs: PAN_MS, cycles: 1 },
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
  const port = 4177;
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
    "d3-zoom": pkg("d3-zoom"), "d3-selection": pkg("d3-selection"),
  };
  const ps = (c) => { try { return execFileSync("powershell", ["-NoProfile", "-Command", c], { encoding: "utf8" }).trim(); } catch { return null; } };
  info.displayRefreshHz_os = ps("(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty CurrentRefreshRate) -join ','");
  info.batteryPresent = ps("@(Get-CimInstance Win32_Battery).Count") !== "0";
  info.powerState = info.batteryPresent ? "battery present (state not asserted)" : "no battery: desktop on AC";
  return info;
}

const hostLaunch = { chromium: { headless: false, args: ["--disable-backgrounding-occluded-windows"] }, firefox: { headless: false }, webkit: { headless: false } };

let stalls = [];
async function runCellOnce(browser, origin, cell, throttle) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });
  try {
    await page.goto(origin + "/", { waitUntil: "load" });
    await page.waitForFunction(() => window.s6ready === true, null, { timeout: 20000 });
    const timeout = cell.durationMs * 2 + 30000;
    const r = await Promise.race([
      page.evaluate((o) => window.runS6(o), cell),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`run timeout ${timeout} ms`)), timeout)),
    ]);
    const tag = cell.scenario;
    must(r.errors.length === 0, `${tag}: in-run exceptions: ${r.errors.join("|")}`);
    must(r.pageErrors.length === 0 && pageErrors.length === 0, `${tag}: page errors: ${[...r.pageErrors, ...pageErrors].join("|")}`);
    must(r.tiles === 81 && r.tilesOk, `${tag}: all 81 tiles rendered at every sample`);
    must(r.totalConcepts === 800, `${tag}: 800 concepts in the model`);
    must(r.lodViolations === 0, `${tag}: LOD violation (circles only when k>=2.5, labels only when k>=4) in ${r.lodViolations} samples`);
    must(r.frames > 20, `${tag}: implausibly few frames (${r.frames})`);
    if (cell.scenario === "zoom") {
      must(r.maxK >= 7.5, `zoom: reached k=${r.maxK.toFixed(2)}, expected >= 7.5`);
      must(r.minK <= 1.05, `zoom: min k ${r.minK.toFixed(2)}`);
      must(r.sampledBelowCircles > 0 && r.sampledCirclesNoLabels > 0 && r.sampledWithLabels > 0, `zoom: all three LOD bands sampled (${r.sampledBelowCircles}/${r.sampledCirclesNoLabels}/${r.sampledWithLabels})`);
      must(r.maxCircles === 800 && r.maxLabels === 800, `zoom: 800 circles and 800 labels mounted at peak (${r.maxCircles}/${r.maxLabels})`);
    } else {
      must(Math.abs(r.minK - 3) < 0.01 && Math.abs(r.maxK - 3) < 0.01, `pan: k stayed at 3 (${r.minK}..${r.maxK})`);
      must(r.maxCircles === 800 && r.maxLabels === 0, `pan: 800 circles, 0 labels at k=3 (${r.maxCircles}/${r.maxLabels})`);
    }
    return r;
  } finally { await ctx.close(); }
}

async function runCell(browser, origin, cell, throttle) {
  for (let attempt = 0; ; attempt++) {
    try { return await runCellOnce(browser, origin, cell, throttle); }
    catch (e) {
      if (!String(e.message).startsWith("run timeout") || attempt >= 2) throw e;
      const msg = `${cell.scenario} attempt ${attempt + 1}: ${e.message}`;
      stalls.push(msg); console.log("  STALL (retrying):", msg);
    }
  }
}

async function measureBrowser(label, type, origin, launchOpts, throttle = 0) {
  let browser;
  try { browser = await type.launch(launchOpts); }
  catch (e) { return { label, untested: "launch failed: " + String(e.message).split("\n")[0] }; }
  stalls = [];
  const out = { label, browserVersion: browser.version(), headless: launchOpts.headless !== false, cpuThrottlingRate: throttle, cells: [], stalls };
  try {
    for (const cell of CELLS) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await runCell(browser, origin, cell, throttle);
        runs.push(r);
        console.log(`  ${label} ${cell.scenario} run ${i + 1}: avg ${r.avgFps.toFixed(1)} fps, p5 ${r.p5Fps.toFixed(1)}, dropped(>25ms) ${r.dropped}, refresh~${r.idleRefreshHz.toFixed(0)} Hz, k ${r.minK.toFixed(2)}..${r.maxK.toFixed(2)}`);
      }
      out.cells.push({
        ...cell, runs: runs.length,
        idleRefreshHz: stat(runs.map((r) => r.idleRefreshHz), 1),
        avgFps: stat(runs.map((r) => r.avgFps)), p5Fps: stat(runs.map((r) => r.p5Fps)),
        dropped: stat(runs.map((r) => r.dropped), 0), droppedVsRefresh: stat(runs.map((r) => r.droppedVsRefresh), 0),
        worstFrameMs: stat(runs.map((r) => r.worstFrameMs)), framesPerRun: stat(runs.map((r) => r.frames), 0),
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
execSync("pnpm exec vite build --config s6-universe/vite.config.ts s6-universe", { cwd: spikes, stdio: "inherit" });

const results = [];
await withServer(async (origin) => {
  const only = (arg("--browsers") ?? "chromium,firefox,webkit").split(",");
  for (const [n, t] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]].filter(([n]) => only.includes(n))) {
    console.log(`BROWSER ${n} (headed)`);
    const r = await measureBrowser(`${n} headed (desktop)`, t, origin, hostLaunch[n]);
    results.push(r);
    if (r.untested) console.log("  UNTESTED:", r.untested);
  }
  if (only.includes("chromium")) {
    console.log("BROWSER chromium (headed, CDP 4x)");
    results.push(await measureBrowser("chromium headed, CDP CPU throttling 4x (mid-range-laptop approximation (main-thread only))", chromium, origin, hostLaunch.chromium, 4));
  }
});

const untested = results.filter((r) => r.untested).map((r) => r.label);
console.log(`ASSERTIONS OK: ${assertions} checks (per run: no exceptions or page errors; 81 tiles at every sample; circles mounted only at k>=2.5 and labels only at k>=4 at every DOM sample; k range reached); untested: ${untested.join(", ") || "none"}`);
if (outFile) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ system, assertions, zoomMs: ZOOM_MS, zoomCycles: ZOOM_CYCLES, panMs: PAN_MS, runsPerCell: RUNS, results }, null, 2));
}
