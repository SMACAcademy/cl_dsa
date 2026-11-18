// Module worker: boots Pyodide, loads tracer_proto.py, runs the S2 benchmark with per-run assertions.
import tracerSource from "./tracer_proto.py?raw";

const indexURL = "/pyodide/";
let pyodide: any;

async function boot() {
  // Vite dev cannot dynamic-import from public/; hide the import behind Function (as in S1).
  const nativeImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
  const { loadPyodide } = await nativeImport(indexURL + "pyodide.mjs");
  pyodide = await loadPyodide({ indexURL });
  pyodide.FS.writeFile("/home/pyodide/tracer_proto.py", tracerSource);
  pyodide.runPython("import tracer_proto");
  self.postMessage({ type: "ready" });
}

// mulberry32: small seeded PRNG so the input list is reproducible.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUBBLE = (list: number[]) => `
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
result = bubble_sort([${list.join(", ")}])
`;
const PAYLOAD = `
def f():
    big = 10**30
    s = "x" * 5000
    return len(s)
result = f()
`;
const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const need = (cond: unknown, msg: string) => { if (!cond) throw new Error("ASSERT FAIL: " + msg); };

function traceOnce(src: string, copy: boolean) {
  const mod = pyodide.pyimport("tracer_proto");
  const ns = pyodide.globals.get("dict")();
  const t0 = performance.now();
  const proxy = mod.trace_source(src, ns, copy);
  const t1 = performance.now();
  const events = proxy.toJs({ dict_converter: Object.fromEntries });
  const t2 = performance.now();
  const json = JSON.stringify(events);
  const t3 = performance.now();
  const resProxy = ns.get("result");
  const result = resProxy && resProxy.toJs ? resProxy.toJs() : resProxy;
  resProxy?.destroy?.(); proxy.destroy(); ns.destroy(); mod.destroy();
  return { events, json, result, traceMs: t1 - t0, toJsMs: t2 - t1, stringifyMs: t3 - t2, totalMs: t3 - t0 };
}

function bubbleRuns(list: number[], runs: number, copy: boolean) {
  const sorted = [...list].sort((a, b) => a - b);
  const src = BUBBLE(list);
  const out: Record<string, number>[] = [];
  for (let i = 0; i < runs; i++) {
    const r = traceOnce(src, copy);
    need(Array.isArray(r.events) && r.events.length > 0, "no events produced");
    need(same(r.result, sorted), "result != sorted(input)");
    need(typeof r.json === "string" && r.json.length > 2, "JSON.stringify failed");
    need(JSON.parse(r.json).length === r.events.length, "JSON round trip length mismatch");
    out.push({ events: r.events.length, jsonBytes: r.json.length, traceMs: r.traceMs, toJsMs: r.toJsMs,
      stringifyMs: r.stringifyMs, totalMs: r.totalMs,
      eventsPerSecTrace: r.events.length / (r.traceMs / 1000), eventsPerSecTotal: r.events.length / (r.totalMs / 1000) });
  }
  return out;
}

function baselineRuns(list: number[], runs: number) {
  const sorted = [...list].sort((a, b) => a - b);
  const src = BUBBLE(list);
  const out: number[] = [];
  for (let i = 0; i < runs; i++) {
    const ns = pyodide.globals.get("dict")();
    const t0 = performance.now();
    pyodide.runPython(src, { globals: ns });
    out.push(performance.now() - t0);
    const rp = ns.get("result"); const res = rp.toJs(); rp.destroy(); ns.destroy();
    need(same(res, sorted), "baseline result != sorted(input)");
  }
  return out;
}

function payloadCase() {
  const r = traceOnce(PAYLOAD, false);
  need(r.result === 5000, "payload result != 5000");
  const back = JSON.parse(r.json); // must be valid JSON
  const ret = back.find((e: any) => e.kind === "return" && e.locals?.big);
  need(ret, "no return event carrying `big`");
  need(ret.locals.big && ret.locals.big.$bigint === "1" + "0".repeat(30) && Object.keys(ret.locals.big).length === 1,
    "10**30 not preserved exactly");
  need(typeof ret.locals.s === "string" && ret.locals.s.length === 5000, "5000-char string not preserved");
  return { events: r.events.length, jsonBytes: r.json.length, bigSerialized: ret.locals.big, stringLength: ret.locals.s.length,
    jsonValid: true, totalMs: r.totalMs };
}

self.onmessage = (e: MessageEvent) => {
  if (e.data.type !== "bench") return;
  try {
    const { n, seed, runs } = e.data;
    const rand = rng(seed);
    const list = Array.from({ length: n }, () => Math.floor(rand() * 1000));
    const py = String(pyodide.runPython("import sys; sys.version"));
    const result = {
      n, seed, runs, pyVersion: py, input: list,
      shallow: bubbleRuns(list, runs, false),
      copy: bubbleRuns(list, runs, true),
      baselineMs: baselineRuns(list, runs),
      payload: payloadCase(),
    };
    self.postMessage({ type: "done", result });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};

boot().catch((err) => self.postMessage({ type: "error", message: String(err) }));
