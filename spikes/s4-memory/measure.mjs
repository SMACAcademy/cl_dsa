// Automated S4 measurement. From spikes/: node s4-memory/measure.mjs [--out results.json] [--browsers chromium,firefox,webkit]
// Production build only (memory is not CPU- or dev-server-bound). Assertions fail loudly; the OBSERVED failure mode of each
// memory scenario (MemoryError / WASM abort / worker or tab crash) is recorded as a result, not asserted.
import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const spikes = path.join(here, "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const outFile = arg("--out");
const WATCHDOG_MS = 15000, CEIL_RUNS = 3, OVERHEAD_RUNS = 5, LIMIT_MB = 256;
let assertions = 0;
const must = (c, msg) => { assertions++; if (!c) throw new Error("ASSERT " + msg); };
const stat = (a, d = 1) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const r = (v) => +v.toFixed(d);
  return { median: r(m), min: r(s[0]), max: r(s.at(-1)) };
};
async function waitUp(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  throw new Error("server did not start: " + url);
}

// ---- Python snippets -------------------------------------------------------------------------------------------
const PY_TM = `
import tracemalloc, json, struct, sys
tracemalloc.start()
x = [0] * 10**6
cur, peak = tracemalloc.get_traced_memory()
tracemalloc.reset_peak()
cur2, peak2 = tracemalloc.get_traced_memory()
json.dumps({"current": cur, "peak": peak, "afterResetPeak": [cur2, peak2], "getsizeof": sys.getsizeof(x), "pointerBytes": struct.calcsize("P")})
`;
const PY_BIG = (expr) => `x = ${expr}\nlen(x)`;
const PY_CEIL = `
import js, json, time
chunks = []; mb = 0; t0 = time.time(); out = None
try:
    while True:
        chunks.append(bytearray(50 * 2**20)); mb += 50
        js.s4progress(mb)
except MemoryError as e:
    out = {"outcome": "MemoryError", "mb": mb, "pySeconds": time.time() - t0}
del chunks
json.dumps(out)
`;
const PY_SOFT = (n) => `
import sys, tracemalloc, js, json, time
LIMIT = ${LIMIT_MB} * 2**20; N = ${n}
S = {"cnt": 0, "mb": 0, "cur": 0}
def tracer(frame, event, arg):
    S["cnt"] += 1
    if S["cnt"] % N == 0:
        cur, _ = tracemalloc.get_traced_memory()
        if cur > LIMIT:
            S["cur"] = cur
            sys.settrace(None)
            raise MemoryError("soft limit")
    return tracer
def loop():
    chunks = []
    while True:
        chunks.append(bytearray(50 * 2**20)); S["mb"] += 50
        js.s4progress(S["mb"])
tracemalloc.start()
t0 = time.time()
sys.settrace(tracer)
out = None
try:
    loop()
except MemoryError as e:
    out = {"outcome": "soft-limit MemoryError" if S["cur"] > 0 else "native MemoryError (soft hook never fired)", "mb": S["mb"], "tracedAtStopMB": S["cur"] / 2**20, "events": S["cnt"], "pySeconds": time.time() - t0}
sys.settrace(None)
tracemalloc.stop()
json.dumps(out)
`;
const PY_OVERHEAD = `
import sys, tracemalloc, time, json
LIMIT = 256 * 2**20
def work():
    x = 0
    for i in range(10**6):
        x += i
    return x
def mk(N):
    S = [0]
    def tracer(frame, event, arg):
        S[0] += 1
        if S[0] % N == 0:
            cur, _ = tracemalloc.get_traced_memory()
            if cur > LIMIT: raise MemoryError("soft limit")
        return tracer
    return tracer
def timed(setup, teardown):
    setup(); t = time.perf_counter(); work(); d = (time.perf_counter() - t) * 1000; teardown(); return d
def hook(N, tm=True):
    def s():
        if tm: tracemalloc.start()
        sys.settrace(mk(N))
    def t():
        sys.settrace(None)
        if tm: tracemalloc.stop()
    return s, t
noop = (lambda: None, lambda: None)
variants = {
  "baseline": noop,
  "tracemalloc_only": (tracemalloc.start, tracemalloc.stop),
  "hook_no_tracemalloc_check": hook(10**12, tm=False),
  "hook_N1000": hook(1000),
  "hook_N100": hook(100),
  "hook_N1": hook(1),
}
R = {k: [] for k in variants}
work()
for _ in range(${OVERHEAD_RUNS}):
    for k, (s, t) in variants.items():
        R[k].append(timed(s, t))
json.dumps(R)
`;
const PY_EST = `
import sys, tracemalloc, json, time
def deep_size(o, seen=None):
    seen = set() if seen is None else seen
    stack = [o]; total = 0
    while stack:
        x = stack.pop()
        if id(x) in seen: continue
        seen.add(id(x))
        total += sys.getsizeof(x)
        if isinstance(x, dict): stack.extend(x.keys()); stack.extend(x.values())
        elif isinstance(x, (list, tuple, set, frozenset)): stack.extend(x)
    return total
cases = {
  "[0]*10**6": lambda: [0] * 10**6,
  "list(range(10**6))": lambda: list(range(10**6)),
  "[str(i) for i in range(10**5)]": lambda: [str(i) for i in range(10**5)],
  "{i: i for i in range(10**5)}": lambda: {i: i for i in range(10**5)},
}
out = {}
for name, f in cases.items():
    tracemalloc.start(); tracemalloc.reset_peak()
    base = tracemalloc.get_traced_memory()[0]
    obj = f()
    cur, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    t = time.perf_counter(); est = deep_size(obj); ms = (time.perf_counter() - t) * 1000
    out[name] = {"tracemallocCurrentBytes": cur - base, "tracemallocPeakBytes": peak - base, "estimateBytes": est, "estimateMs": ms}
    del obj
json.dumps(out)
`;

// ---- per-browser run -------------------------------------------------------------------------------------------
async function measure(label, type, origin) {
  const out = { label, browser: type.name() };
  let browser;
  try { browser = await type.launch(); } catch (e) { return { ...out, untested: String(e).split("\n")[0] }; }
  out.browserVersion = browser.version();
  const events = [];
  let ctx, page, pageCrashes = 0;
  const startAssertions = assertions;
  const newPage = async () => {
    if (ctx) await ctx.close().catch(() => {});
    ctx = await browser.newContext();
    page = await ctx.newPage();
    page.on("crash", () => { pageCrashes++; events.push("page crash event"); });
    page.on("pageerror", (e) => events.push("pageerror: " + String(e).slice(0, 200)));
    await page.goto(origin + "/?manual");
    await page.waitForFunction(() => window.__s4, null, { timeout: 30000 });
  };
  try {
    await newPage();
    must(await page.evaluate(() => crossOriginIsolated), `[${label}] page not crossOriginIsolated`);
    const ev = (fn, a) => page.evaluate(fn, a);
    const bootAndCheck = () => ev(async () => {
      const t = performance.now(); const m = await window.__s4.spawn(); const bootMs = performance.now() - t;
      const two = await window.__s4.run("1 + 1").done;
      return { bootMs, ready: m, two: two.value, type: two.type };
    });
    // Boot a fresh worker (terminating any previous one) and assert it works: the product relies on this after a kill.
    const fresh = async (where) => {
      let r;
      try { r = await bootAndCheck(); }
      catch (e) { // the page itself died: record it, open a fresh page, retry once
        events.push(`${where}: page died (${String(e).split("\n")[0]}), reopened`);
        out.pageDiedAt = (out.pageDiedAt ?? []).concat(where);
        await newPage();
        r = await bootAndCheck();
      }
      must(r.ready.crossOriginIsolated === true, `${where}: new worker not isolated`);
      must(r.type === "result" && r.two === "2", `${where}: fresh worker 1+1 -> ${JSON.stringify(r)}`);
      return r;
    };
    const watched = (code, ms = WATCHDOG_MS) => ev(([c, m]) => window.__s4.runWatched(c, m), [code, ms]);
    const afterwards = async (where) => { // does the SAME worker still answer, then does a fresh one boot (asserted)
      const alive = await ev(() => window.__s4.runWatched("1 + 1", 4000)).catch((e) => ({ type: "pageGone", message: String(e).slice(0, 100) }));
      const same = alive.type === "result" && alive.value === "2" ? "yes" : `no (${alive.type}${alive.message ? ": " + alive.message.slice(0, 100) : ""})`;
      const f = await fresh(where);
      return { sameWorkerAnswers: same, freshWorkerBootMs: +f.bootMs.toFixed(1) };
    };
    const heapMB = (b) => b > 0 ? +(b / 2 ** 20).toFixed(1) : null;

    const f0 = await fresh("first boot");
    out.firstBootMs = +f0.bootMs.toFixed(1);
    out.idleHeapMB = heapMB(f0.ready.heapBytes);

    // Step 1: tracemalloc on a 10**6-element list.
    const tm = await watched(PY_TM);
    must(tm.type === "result", `[${label}] tracemalloc scenario failed: ${JSON.stringify(tm)}`);
    out.step1_tracemalloc = JSON.parse(tm.value);
    must(out.step1_tracemalloc.peak > 0 && out.step1_tracemalloc.current > 0, `[${label}] tracemalloc returned zeros`);

    // Step 2: giant allocations. Observed outcome recorded; a fresh worker must boot afterwards (asserted).
    out.step2_giant = {};
    for (const [name, code] of [["[0]*10**10", PY_BIG("[0] * 10**10")], ["[0]*10**9", PY_BIG("[0] * 10**9")], ["bytearray(3*2**30)", PY_BIG("bytearray(3 * 2**30)")]]) {
      const r = await watched(code);
      const after = await afterwards(`step2 ${name}`);
      out.step2_giant[name] = { outcome: r.type, errName: r.errName ?? null, message: r.message ?? r.value ?? null, wallMs: +r.wallMs.toFixed(1),
        killedByWatchdog: r.killedByWatchdog, heapMBAtEnd: heapMB(r.heapBytes), ...after };
    }

    // Step 3: 50 MB chunk loop until failure, CEIL_RUNS times, each in a fresh worker (afterwards() boots one).
    out.step3_ceiling = { runs: [] };
    for (let i = 1; i <= CEIL_RUNS; i++) {
      const r = await watched(PY_CEIL);
      const run = { outcome: r.type, wallMs: +r.wallMs.toFixed(1), killedByWatchdog: r.killedByWatchdog, message: r.message ?? null,
        lastReportedMB: r.progress.mb, heapMBAtLastReport: heapMB(r.progress.heapBytes), heapMBAtEnd: heapMB(r.heapBytes) };
      if (r.type === "result") { const j = JSON.parse(r.value); run.outcome = j.outcome; run.maxMB = j.mb; run.pySeconds = +j.pySeconds.toFixed(2); }
      else run.maxMB = r.progress.mb;
      Object.assign(run, await afterwards(`step3 run ${i}`));
      out.step3_ceiling.runs.push(run);
    }
    const rs = out.step3_ceiling.runs;
    out.step3_ceiling.summary = { outcomes: [...new Set(rs.map((r) => r.outcome))], maxMB: stat(rs.map((r) => r.maxMB), 0),
      heapMBAtFailure: stat(rs.map((r) => r.heapMBAtEnd ?? r.heapMBAtLastReport ?? 0), 0),
      timeToFailureS: stat(rs.map((r) => r.wallMs / 1000), 2) };

    // Soft limit via sys.settrace + tracemalloc on the same 50 MB loop, for several check intervals N.
    out.softLimit = { limitMB: LIMIT_MB, byN: {} };
    for (const n of [1, 100, 1000]) {
      const r = await watched(PY_SOFT(n));
      const e = { outcome: r.type, wallMs: +r.wallMs.toFixed(1), killedByWatchdog: r.killedByWatchdog, message: r.message ?? null, lastReportedMB: r.progress.mb };
      if (r.type === "result") Object.assign(e, JSON.parse(r.value));
      e.stoppedBeforeWasmCeiling = e.outcome === "soft-limit MemoryError" && e.mb < out.step3_ceiling.summary.maxMB.min;
      Object.assign(e, await afterwards(`softlimit N=${n}`));
      out.softLimit.byN[n] = e;
    }
    must(out.softLimit.byN[1].outcome === "soft-limit MemoryError", `[${label}] soft limit with N=1 did not raise: ${JSON.stringify(out.softLimit.byN[1])}`);

    // Overhead on 10**6 simple operations (median of 5).
    const ov = await watched(PY_OVERHEAD, 240000);
    must(ov.type === "result", `[${label}] overhead failed: ${JSON.stringify(ov)}`);
    const raw = JSON.parse(ov.value);
    out.overheadMs = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, stat(v, 1)]));
    out.overheadRaw = raw;
    out.overheadFactorVsBaseline = Object.fromEntries(Object.entries(out.overheadMs).map(([k, v]) => [k, +(v.median / out.overheadMs.baseline.median).toFixed(2)]));

    // Fallback: structural estimate vs tracemalloc.
    const est = await watched(PY_EST);
    must(est.type === "result", `[${label}] estimate failed: ${JSON.stringify(est)}`);
    out.structuralEstimate = JSON.parse(est.value);

    out.pageCrashes = pageCrashes;
    out.events = events;
    out.assertions = assertions - startAssertions;
  } finally { await browser.close().catch(() => {}); }
  return out;
}

function systemInfo() {
  const cpus = os.cpus();
  const pkg = (n) => { try { return JSON.parse(readFileSync(path.join(spikes, "node_modules", n, "package.json"), "utf8")).version; } catch { return null; } };
  return { cpu: cpus[0].model.trim(), logicalCores: cpus.length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1), os: `${os.type()} ${os.release()}`,
    node: process.version, playwright: pkg("playwright"), vite: pkg("vite"),
    pyodide: /^version=(.+)$/m.exec(readFileSync(path.join(spikes, "pyodide-version.txt"), "utf8"))[1].trim() };
}
const kill = (proc) => { try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" }); } catch { proc.kill(); } };

const system = systemInfo();
console.log("SYSTEM", JSON.stringify(system));
execSync("pnpm exec vite build --config s4-memory/vite.config.ts s4-memory", { cwd: spikes, stdio: "inherit" });
const port = 4176;
const proc = spawn(process.execPath, [path.join(here, "serve-prod.mjs"), String(port)], { cwd: here, stdio: "ignore" });
const origin = `http://localhost:${port}`;
const results = [];
try {
  await waitUp(origin + "/");
  const only = (arg("--browsers") ?? "chromium,firefox,webkit").split(",");
  for (const [n, t] of [["chromium", chromium], ["firefox", firefox], ["webkit", webkit]].filter(([n]) => only.includes(n))) {
    let r;
    try { r = await measure(`prod/${n} (desktop)`, t, origin); }
    catch (e) {
      console.error("FAIL", String(e.message ?? e));
      if (n !== "webkit") throw e;
      r = { label: `prod/${n} (desktop)`, browser: n, untested: "run failed: " + String(e.message ?? e).split("\n")[0] };
    }
    results.push(r);
    console.log(r.untested ? `${r.label}: UNTESTED ${r.untested}` : `${r.label} ${r.browserVersion}: ceiling ${JSON.stringify(r.step3_ceiling.summary)}; giant ${JSON.stringify(r.step2_giant["[0]*10**10"])}`);
  }
} finally { kill(proc); }
const untested = results.filter((r) => r.untested).map((r) => r.label);
console.log(`ASSERTIONS OK: ${results.reduce((a, r) => a + (r.assertions ?? 0), 0)} checks; untested: ${untested.join(", ") || "none"}`);
if (outFile) { mkdirSync(path.dirname(outFile), { recursive: true }); writeFileSync(outFile, JSON.stringify({ system, watchdogMs: WATCHDOG_MS, ceilingRuns: CEIL_RUNS, results }, null, 2)); }
