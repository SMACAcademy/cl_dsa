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
const PY_SOFT = (n, workload) => `
import sys, tracemalloc, js, json, time
LIMIT = ${LIMIT_MB} * 2**20; N = ${n}
S = {"cnt": 0, "mb": 0, "cur": 0, "it": 0}
def tracer(frame, event, arg):
    S["cnt"] += 1
    if S["cnt"] % N == 0:
        cur, _ = tracemalloc.get_traced_memory()
        if cur > LIMIT:
            S["cur"] = cur
            sys.settrace(None)
            raise MemoryError("soft limit")
    return tracer
def loop_chunks():  # few events per MB: one 50 MB allocation per iteration
    chunks = []
    while True:
        chunks.append(bytearray(50 * 2**20)); S["mb"] += 50
        js.s4progress(S["mb"])
def loop_small():  # many events per MB: one 4 KB list per iteration
    xs = []
    while True:
        xs.append([0] * 1000)
        S["it"] += 1
loop = ${workload === "chunks" ? "loop_chunks" : "loop_small"}
tracemalloc.start()
t0 = time.time()
sys.settrace(tracer)
out = None
try:
    loop()
except MemoryError as e:
    fired = S["cur"] > 0
    out = {"outcome": "soft-limit MemoryError" if fired else "native MemoryError (soft hook never fired)",
           "stoppedAtMB": S["cur"] / 2**20 if fired else (S["mb"] if ${workload === "chunks" ? "True" : "False"} else S["it"] * 4000 / 2**20),
           "events": S["cnt"], "pySeconds": time.time() - t0}
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
  "hook_tracemalloc_no_check": hook(10**12),
  "hook_N1000": hook(1000),
  "hook_N100": hook(100),
  "hook_N10": hook(10),
  "hook_N1": hook(1),
}
R = {k: [] for k in variants}
work()
for _ in range(${OVERHEAD_RUNS}):
    for k, (s, t) in variants.items():
        R[k].append(timed(s, t))
json.dumps(R)
`;
const PY_REAL = (tracerSrc) => `
import sys, tracemalloc, time, json, ast
G = {}
exec(compile(${JSON.stringify(tracerSrc)}, "tracer_proto", "exec"), G)
_Tracer, _Rewriter, _av_unpack, _FILE = G["_Tracer"], G["_Rewriter"], G["_av_unpack"], G["_FILE"]
LIMIT = 256 * 2**20
USER = "def f():\\n    x = 0\\n    for i in range(10**5):\\n        x += i\\n    return x\\nf()\\n"
def make(N):
    class T(_Tracer):
        def __init__(self, copy):
            super().__init__(copy); self.k = 0
        def local(self, frame, event, arg):
            if N:
                self.k += 1
                if self.k % N == 0:
                    cur, _ = tracemalloc.get_traced_memory()
                    if cur > LIMIT: raise MemoryError("soft limit")
            return _Tracer.local(self, frame, event, arg)
    return T
def run(N, tm, traced=True):
    if tm: tracemalloc.start()
    code = compile(ast.fix_missing_locations(_Rewriter().visit(ast.parse(USER, _FILE))), _FILE, "exec")
    t = make(N)(False)
    ns = {"_av_cmp": t.cmp, "_av_get": t.get, "_av_set": t.set, "_av_unpack": _av_unpack}
    t0 = time.perf_counter()
    if traced: sys.settrace(t.glob)
    exec(code, ns)
    sys.settrace(None)
    d = (time.perf_counter() - t0) * 1000
    n = len(t.events)
    if tm: tracemalloc.stop()
    return d, n
variants = {"untraced": (0, False, False), "tracer_only": (0, False), "tracer_tracemalloc_no_check": (0, True),
            "tracer_tracemalloc_N1000": (1000, True), "tracer_tracemalloc_N100": (100, True), "tracer_tracemalloc_N10": (10, True), "tracer_tracemalloc_N1": (1, True)}
run(0, False)
R = {k: [] for k in variants}; EV = 0
for _ in range(${OVERHEAD_RUNS}):
    for k, v in variants.items():
        d, EV2 = run(*v)
        R[k].append(d)
        if v[2:] != (False,): EV = EV2
json.dumps({"ms": R, "eventsTraced": EV})
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
    let curStep = "start";
    const ev = (fn, a) => { // every page call has a 300 s ceiling that fails loudly, naming the step
      let t;
      return Promise.race([page.evaluate(fn, a), new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`ASSERT EVAL_TIMEOUT 300 s at step: ${curStep}`)), 300000); })])
        .finally(() => clearTimeout(t));
    };
    const bootAndCheck = () => ev(async () => {
      const t = performance.now(); const m = await window.__s4.spawn(); const bootMs = performance.now() - t; // rejects BOOT_TIMEOUT after 20 s
      const two = await window.__s4.runTimeout("1 + 1"); // rejects RUN_TIMEOUT after 10 s
      return { bootMs, ready: m, two: two.value, type: two.type };
    });
    // Boot a fresh worker (terminating any previous one) and assert it works: the product relies on this after a kill.
    // A boot failure on a LIVE page (timeout, error, wrong answer) is a loud assertion failure. Only a page that itself died
    // (crash event / closed target) is recorded as a result; the fresh worker must still boot on the reopened page (asserted).
    const fresh = async (where) => {
      curStep = "fresh " + where; console.error(`[${label}] ${curStep}`);
      let r;
      try { r = await bootAndCheck(); }
      catch (e) {
        const msg = String(e).slice(0, 200).replace(/[\r\n]+/g, " ");
        const pageDied = page.isClosed() || pageCrashes > 0 || /Target (page, context or browser )?has been closed|Target crashed|Execution context was destroyed|Page crashed/i.test(msg);
        if (!pageDied) throw new Error(`ASSERT ${where}: fresh worker failed to boot on a live page: ${msg}`);
        events.push(`${where}: page died (${msg}), reopened`);
        out.pageDiedAt = (out.pageDiedAt ?? []).concat(where);
        await newPage();
        r = await bootAndCheck(); // throws (fails the run) if even a new page cannot boot a worker
      }
      must(r.ready.crossOriginIsolated === true, `${where}: new worker not isolated`);
      must(r.type === "result" && r.two === "2", `${where}: fresh worker 1+1 -> ${JSON.stringify(r)}`);
      return r;
    };
    const watched = (code, ms = WATCHDOG_MS) => (curStep = "run " + code.trim().slice(0, 50).replace(/\s+/g, " "), console.error(`[${label}] ${curStep}`), ev)(([c, m]) => window.__s4.runWatched(c, m), [code, ms]);
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

    // Soft limit via sys.settrace + tracemalloc, two workload shapes, several check intervals N.
    out.softLimit = { limitMB: LIMIT_MB, chunks: {}, small: {} };
    for (const workload of ["chunks", "small"]) {
      for (const n of [1, 10, 100, 1000]) {
        const r = await watched(PY_SOFT(n, workload), 60000);
        const e = { outcome: r.type, wallMs: +r.wallMs.toFixed(1), killedByWatchdog: r.killedByWatchdog, message: r.message ?? null };
        if (r.type === "result") Object.assign(e, JSON.parse(r.value));
        e.stoppedBeforeWasmCeiling = e.outcome === "soft-limit MemoryError";
        Object.assign(e, await afterwards(`softlimit ${workload} N=${n}`));
        out.softLimit[workload][n] = e;
      }
      must(out.softLimit[workload][1].outcome === "soft-limit MemoryError", `[${label}] soft limit N=1 on ${workload} did not raise: ${JSON.stringify(out.softLimit[workload][1])}`);
    }

    // Overhead on 10**6 simple operations (median of 5).
    const ov = await watched(PY_OVERHEAD, 240000);
    must(ov.type === "result", `[${label}] overhead failed: ${JSON.stringify(ov)}`);
    const raw = JSON.parse(ov.value);
    out.overheadMs = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, stat(v, 1)]));
    out.overheadRaw = raw;
    out.overheadFactorVsBaseline = Object.fromEntries(Object.entries(out.overheadMs).map(([k, v]) => [k, +(v.median / out.overheadMs.baseline.median).toFixed(2)]));

    // Same overhead measurement with the REAL S2 tracer (spikes/s2-tracer/tracer_proto.py, copied) as the installed hook,
    // on 10**5 iterations (its event list holds a locals snapshot per line, so 10**6 would be gigabytes).
    const real = await watched(PY_REAL(readFileSync(path.join(here, "tracer_proto.py"), "utf8")), 240000);
    must(real.type === "result", `[${label}] real-tracer overhead failed: ${JSON.stringify(real)}`);
    const rr = JSON.parse(real.value);
    out.realTracerOverheadMs = Object.fromEntries(Object.entries(rr.ms).map(([k, v]) => [k, stat(v, 1)]));
    out.realTracerOverheadRaw = rr.ms;
    out.realTracerEvents = rr.eventsTraced;
    out.realTracerFactorVsTracerOnly = Object.fromEntries(Object.entries(out.realTracerOverheadMs).map(([k, v]) => [k, +(v.median / out.realTracerOverheadMs.tracer_only.median).toFixed(2)]));

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
