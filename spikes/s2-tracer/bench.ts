// Page side: starts the worker, which runs the whole benchmark and posts one "done" message.
const out = document.getElementById("out")!;
const s2: Record<string, unknown> = ((window as any).__s2 = {});
const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const t0 = performance.now();
worker.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "ready") {
    s2.bootMs = performance.now() - t0;
    worker.postMessage({ type: "bench", n: 50, seed: 20261118, runs: 5 });
  } else if (m.type === "done") {
    Object.assign(s2, m.result, { crossOriginIsolated, done: true });
    out.textContent = JSON.stringify(m.result, null, 2);
  } else if (m.type === "error") {
    s2.error = m.message; s2.done = true; out.textContent = m.message;
  }
};
worker.onerror = (e) => { s2.error = e.message || "worker error"; s2.done = true; };
