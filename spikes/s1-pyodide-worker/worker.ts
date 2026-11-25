// Module worker: boots self-hosted Pyodide and runs code on request.
type RunMsg = { type: "run"; code: string };

const indexURL = "/pyodide/";
let pyodide: any;

async function boot() {
  // Vite dev appends ?import to dynamic imports of public/ files and then refuses to serve them,
  // so hide the import from Vite behind Function. (Needs CSP unsafe-eval; fine for a spike.)
  const nativeImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;
  const { loadPyodide } = await nativeImport(indexURL + "pyodide.mjs");
  pyodide = await loadPyodide({ indexURL });
  self.postMessage({ type: "ready" });
}

self.onmessage = async (e: MessageEvent<RunMsg>) => {
  if (e.data.type !== "run") return;
  const t0 = performance.now();
  try {
    const value = String(await pyodide.runPythonAsync(e.data.code));
    self.postMessage({ type: "result", value, ms: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};

boot().catch((err) => self.postMessage({ type: "error", message: String(err) }));
