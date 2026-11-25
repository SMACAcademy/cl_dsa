// Module worker: boots self-hosted Pyodide, runs code on request. Python can call js.s4progress(mb) while busy;
// the value (and the WASM heap size at that moment) goes into a SharedArrayBuffer the main thread reads even if this worker dies.
const indexURL = "/pyodide/";
let pyodide: any;
let prog: Float64Array;

const heapBytes = () => {
  try { return pyodide._module.HEAP8.length as number; } catch { return -1; }
};

async function boot(sab: SharedArrayBuffer) {
  prog = new Float64Array(sab); // [0] last reported MB, [1] heap bytes at that report, [2] performance.now() at report
  (self as any).s4progress = (mb: number) => { prog[0] = mb; prog[1] = heapBytes(); prog[2] = performance.now(); };
  const url = indexURL + "pyodide.mjs";
  const { loadPyodide } = import.meta.env.DEV
    ? await (new Function("u", "return import(u)") as (u: string) => Promise<any>)(url)
    : await import(/* @vite-ignore */ url);
  pyodide = await loadPyodide({ indexURL });
  self.postMessage({ type: "ready", heapBytes: heapBytes(), crossOriginIsolated: self.crossOriginIsolated,
    loader: import.meta.env.DEV ? "function-import (dev fallback)" : "plain import(@vite-ignore)" });
}

self.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "init") {
    boot(m.sab).catch((err) => self.postMessage({ type: "error", message: "boot: " + String(err) }));
  } else if (m.type === "run") {
    self.postMessage({ type: "started", id: m.id });
    const t0 = performance.now();
    try {
      const value = String(await pyodide.runPythonAsync(m.code));
      self.postMessage({ type: "result", id: m.id, value, ms: performance.now() - t0, heapBytes: heapBytes() });
    } catch (err: any) {
      self.postMessage({ type: "error", id: m.id, message: String(err).slice(0, 600), errName: err?.name ?? null,
        ms: performance.now() - t0, heapBytes: heapBytes() });
    }
  }
};
