const $ = (id: string) => document.getElementById(id)!;
const s1: Record<string, unknown> = ((window as any).__s1 = {});

s1.crossOriginIsolated = crossOriginIsolated;
$("isolated").textContent = String(crossOriginIsolated);

const t0 = performance.now();
const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const pending: string[] = ["sum", "version"];

worker.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "ready") {
    s1.bootMs = performance.now() - t0;
    $("boot").textContent = (s1.bootMs as number).toFixed(1);
    worker.postMessage({ type: "run", code: "1 + 1" });
    worker.postMessage({ type: "run", code: "import sys; sys.version" });
  } else if (m.type === "result") {
    const id = pending.shift()!;
    s1[id] = m.value;
    $(id).textContent = m.value;
    if (!pending.length) s1.done = true;
  } else if (m.type === "error") {
    s1.error = m.message;
    $("error").textContent = m.message;
    s1.done = true;
  }
};
worker.onerror = (e) => {
  s1.error = e.message || "worker error";
  $("error").textContent = String(s1.error);
  s1.done = true;
};
