// Main thread: owns the worker, a progress SharedArrayBuffer, and a hard-kill watchdog. Exposes window.__s4 for Playwright.
const log = (s: string) => { document.getElementById("log")!.textContent += s + "\n"; };

type Handle = { worker: Worker; prog: Float64Array; waiting: Map<number, (m: any) => void>; started: Map<number, () => void>; ready: Promise<any>; dead: boolean };
let nextId = 1;
let active: Handle;

function makeWorker(): Handle {
  const sab = new SharedArrayBuffer(8 * 4);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const waiting = new Map<number, (m: any) => void>();
  const started = new Map<number, () => void>();
  let resolve!: (m: any) => void;
  let reject!: (e: Error) => void;
  const ready = new Promise<any>((res, rej) => { resolve = res; reject = rej; });
  ready.catch(() => {});
  const h: Handle = { worker, prog: new Float64Array(sab), waiting, started, ready, dead: false };
  worker.onerror = (e) => { log("worker onerror: " + e.message); reject(new Error(e.message || "worker error")); };
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "ready") resolve(m);
    else if (m.type === "started") { started.get(m.id)?.(); started.delete(m.id); }
    else if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m); waiting.delete(m.id); }
    else if (m.type === "error" && /^boot:/.test(m.message)) reject(new Error(m.message));
  };
  worker.postMessage({ type: "init", sab });
  return h;
}

const BOOT_TIMEOUT_MS = 20000, STARTED_TIMEOUT_MS = 10000;
const timeout = <T,>(p: Promise<T>, ms: number, name: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${name} after ${ms} ms`)), ms))]);

// Rejects with "BOOT_TIMEOUT after N ms" if the worker never reports ready.
function spawn(): Promise<any> {
  if (active) { active.dead = true; active.worker.terminate(); }
  active = makeWorker();
  return timeout(active.ready, BOOT_TIMEOUT_MS, "BOOT_TIMEOUT");
}

function run(code: string) {
  const h = active;
  const id = nextId++;
  const done = new Promise<any>((res) => h.waiting.set(id, res));
  const started = new Promise<void>((res) => h.started.set(id, res));
  h.ready.then(() => h.worker.postMessage({ type: "run", id, code }));
  return { id, done, started };
}

// Run with a hard-kill watchdog. On timeout: terminate() the worker (the product's behaviour) and report it.
// Always returns the last progress the worker published (readable after death because it lives in a SAB).
async function runWatched(code: string, watchdogMs: number) {
  const h = active;
  h.prog.fill(0);
  const t0 = performance.now();
  const r = run(code);
  // The watchdog is armed BEFORE the worker confirms it started, so a worker that never boots or never starts cannot hang us.
  const m: any = await Promise.race([
    r.done,
    new Promise((res) => setTimeout(() => res({ type: "watchdog" }), watchdogMs)),
    new Promise((res) => { h.worker.addEventListener("error", (e) => res({ type: "workerError", message: (e as ErrorEvent).message })); }),
  ]);
  const startedInTime = await Promise.race([r.started.then(() => true), new Promise<boolean>((res) => setTimeout(() => res(false), 0))]);
  const wallMs = performance.now() - t0;
  const progress = { mb: h.prog[0], heapBytes: h.prog[1], atMs: h.prog[2] };
  if (m.type === "watchdog" || m.type === "workerError") { h.dead = true; h.worker.terminate(); }
  return { ...m, wallMs, progress, killedByWatchdog: m.type === "watchdog", startedInTime };
}

const memory = async () => {
  const f = (performance as any).measureUserAgentSpecificMemory;
  if (!f) return { error: "performance.measureUserAgentSpecificMemory not available" };
  try { const r = await f.call(performance); return { bytes: r.bytes as number }; } catch (e) { return { error: String(e) }; }
};

(window as any).__s4 = { crossOriginIsolated, spawn, run, runWatched, runTimeout: (code: string) => timeout(run(code).done, STARTED_TIMEOUT_MS, "RUN_TIMEOUT"), now: () => performance.now(), memory };
if (!location.search.includes("manual")) spawn().then((m) => log("ready " + JSON.stringify(m)));
