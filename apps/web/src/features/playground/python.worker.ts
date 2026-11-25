/**
 * Runs Python in the browser with Pyodide, inside a worker so a long or endless
 * program never freezes the page (the page can terminate the worker to stop it).
 * Pyodide (≈10 MB) is fetched from the jsDelivr CDN on first use and then cached.
 */

export const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";

type Py = {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
};
type PyodideModule = { loadPyodide(options: { indexURL: string }): Promise<Py> };

export type ToWorker = { id: number; code: string };
export type FromWorker =
  | { id: number; type: "status"; text: "loading" | "running" }
  | { id: number; type: "out" | "err"; text: string }
  | { id: number; type: "done"; ms: number }
  | { id: number; type: "error"; text: string };

const ctx = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

let pyodide: Promise<Py> | null = null;

async function load(): Promise<Py> {
  const mod = (await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`)) as PyodideModule;
  return mod.loadPyodide({ indexURL: PYODIDE_URL });
}

ctx.onmessage = (event) => {
  const { id, code } = event.data;
  void (async () => {
    try {
      if (!pyodide) {
        ctx.postMessage({ id, type: "status", text: "loading" });
        pyodide = load();
      }
      const py = await pyodide;
      py.setStdout({ batched: (text) => ctx.postMessage({ id, type: "out", text }) });
      py.setStderr({ batched: (text) => ctx.postMessage({ id, type: "err", text }) });
      ctx.postMessage({ id, type: "status", text: "running" });
      const started = performance.now();
      await py.runPythonAsync(code);
      ctx.postMessage({ id, type: "done", ms: performance.now() - started });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      ctx.postMessage({ id, type: "error", text });
    }
  })();
};
