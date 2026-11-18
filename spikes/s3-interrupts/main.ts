// Main thread: owns the worker and the SharedArrayBuffer interrupt flag; exposes window.__s3 for Playwright.
const log = (s: string) => { document.getElementById("log")!.textContent += s + "\n"; };

const sab = new SharedArrayBuffer(1);
const view = new Uint8Array(sab);
let worker: Worker;
let nextId = 1;
const waiting = new Map<number, (m: any) => void>();
let readyResolve: ((m: any) => void) | null = null;
let bootReject: ((e: Error) => void) | null = null;

function spawn(): Promise<any> {
  Atomics.store(view, 0, 0);
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const mine = worker;
  const ready = new Promise<any>((res, rej) => {
    readyResolve = res;
    bootReject = rej;
    mine.onerror = (e) => rej(new Error(e.message || "worker error"));
  });
  mine.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "ready") readyResolve?.(m);
    else if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m); waiting.delete(m.id); }
    else if (m.type === "error") { log("worker error: " + m.message); if (/^boot:/.test(m.message)) bootReject?.(new Error(m.message)); }
  };
  mine.postMessage({ type: "init", sab });
  return ready;
}

function run(code: string): { id: number; done: Promise<any> } {
  const id = nextId++;
  const done = new Promise<any>((res) => waiting.set(id, res));
  worker.postMessage({ type: "run", id, code });
  return { id, done };
}

const softStop = () => Atomics.store(view, 0, 2); // 2 = SIGINT
async function hardKill() {
  const t0 = performance.now();
  worker.terminate();
  waiting.clear();
  const ready = await spawn();
  return { ms: performance.now() - t0, ready };
}

(window as any).__s3 = { crossOriginIsolated, spawn, run, softStop, hardKill, now: () => performance.now() };

// Interactive buttons for a human.
const $ = (id: string) => document.getElementById(id)!;
let pendingRun: Promise<any> | null = null;
let softT = 0;
const show = (p: Promise<any>) => p.then((m) => log(`${m.type}: ${m.value ?? m.message}` + (softT ? `  (${(performance.now() - softT).toFixed(1)} ms after soft stop)` : "")));
if (!location.search.includes("manual")) spawn().then((m) => log("ready " + JSON.stringify(m)));
$("run").onclick = () => { softT = 0; pendingRun = run("while True: pass").done; show(pendingRun); };
$("runc").onclick = () => { softT = 0; pendingRun = run("sum(range(10**10))").done; show(pendingRun); };
$("soft").onclick = () => { softT = performance.now(); softStop(); };
$("hard").onclick = async () => { const r = await hardKill(); log(`hard kill -> new worker ready in ${r.ms.toFixed(1)} ms`); };
$("two").onclick = () => show(run("1 + 1").done);
