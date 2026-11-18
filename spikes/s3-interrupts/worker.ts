// Module worker: boots self-hosted Pyodide, installs the interrupt buffer, runs code on request.
const indexURL = "/pyodide/";
let pyodide: any;

async function boot(sab: SharedArrayBuffer) {
  // Production build: plain dynamic import with a non-literal URL (@vite-ignore), no CSP unsafe-eval needed.
  // Vite DEV server: that import is rewritten to "...pyodide.mjs?import" and answered with HTTP 500 (measured), so
  // dev falls back to S1's Function-wrapped import. The fallback is dev-only; the prod bundle drops it.
  const url = indexURL + "pyodide.mjs";
  const { loadPyodide } = import.meta.env.DEV
    ? await (new Function("u", "return import(u)") as (u: string) => Promise<any>)(url)
    : await import(/* @vite-ignore */ url);
  pyodide = await loadPyodide({ indexURL });
  pyodide.setInterruptBuffer(new Uint8Array(sab));
  self.postMessage({
    type: "ready",
    workerCrossOriginIsolated: self.crossOriginIsolated,
    workerSharedArrayBuffer: typeof SharedArrayBuffer,
    loader: import.meta.env.DEV ? "function-import (dev fallback)" : "plain import(@vite-ignore)",
  });
}

self.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "init") {
    boot(m.sab).catch((err) => self.postMessage({ type: "error", message: "boot: " + String(err) }));
  } else if (m.type === "run") {
    self.postMessage({ type: "started", id: m.id });
    try {
      const value = String(await pyodide.runPythonAsync(m.code));
      self.postMessage({ type: "result", id: m.id, value });
    } catch (err) {
      self.postMessage({ type: "error", id: m.id, message: String(err) });
    }
  }
};
