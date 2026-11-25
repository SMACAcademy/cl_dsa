// Main thread: owns the workers and their SharedArrayBuffer interrupt flags; exposes window.__s3 for Playwright.
// An "active" worker runs learner code; an optional idle "spare" is booted in advance so a hard kill can swap to it.
const log = (s: string) => { document.getElementById("log")!.textContent += s + "\n"; };

type Handle = {
  worker: Worker;
  view: Uint8Array;
  waiting: Map<number, (m: any) => void>;
  started: Map<number, () => void>;
  ready: Promise<any>;
};
let nextId = 1;
let active: Handle;
let spare: Handle | null = null;

function makeWorker(): Handle {
  const sab = new SharedArrayBuffer(1);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const waiting = new Map<number, (m: any) => void>();
  const started = new Map<number, () => void>();
  let resolve!: (m: any) => void;
  let reject!: (e: Error) => void;
  const ready = new Promise<any>((res, rej) => { resolve = res; reject = rej; });
  ready.catch(() => {}); // a spare nobody awaits yet must not raise an unhandled rejection
  worker.onerror = (e) => reject(new Error(e.message || "worker error"));
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "ready") resolve(m);
    else if (m.type === "started") { started.get(m.id)?.(); started.delete(m.id); }
    else if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m); waiting.delete(m.id); }
    else if (m.type === "error") { log("worker error: " + m.message); if (/^boot:/.test(m.message)) reject(new Error(m.message)); }
  };
  worker.postMessage({ type: "init", sab });
  return { worker, view: new Uint8Array(sab), waiting, started, ready };
}

function spawn(): Promise<any> { active = makeWorker(); return active.ready; }

function runOn(h: Handle, code: string): { id: number; done: Promise<any>; started: Promise<void> } {
  const id = nextId++;
  const done = new Promise<any>((res) => h.waiting.set(id, res));
  const started = new Promise<void>((res) => h.started.set(id, res)); // worker is about to execute the code
  h.ready.then(() => h.worker.postMessage({ type: "run", id, code })); // queued until that worker has booted
  return { id, done, started };
}
const run = (code: string) => runOn(active, code);

const softStop = () => Atomics.store(active.view, 0, 2); // 2 = SIGINT

async function hardKill() {
  const t0 = performance.now();
  active.worker.terminate();
  const ready = await spawn();
  return { ms: performance.now() - t0, ready };
}

// Spare-worker mode.
function prepareSpare(): Promise<any> { spare = makeWorker(); return spare.ready; }
function spareReady(): Promise<any> { return spare!.ready; }
// Hard kill with a spare: terminate the busy worker, promote the spare, start a replacement spare in the background.
// Returns the promoted worker's id-run helper result and the replacement spare's ready promise.
function swapToSpare() {
  const t0 = performance.now();
  active.worker.terminate();
  active = spare!;
  spare = makeWorker();
  return { t0, spareReady: spare.ready, run: (code: string) => runOn(active, code).done };
}

async function memory() {
  const f = (performance as any).measureUserAgentSpecificMemory;
  if (!f) return { error: "performance.measureUserAgentSpecificMemory not available" };
  try {
    const r = await f.call(performance);
    return { bytes: r.bytes as number, entries: r.breakdown.length };
  } catch (e) { return { error: String(e) }; }
}

(window as any).__s3 = {
  crossOriginIsolated, spawn, run, softStop, hardKill, now: () => performance.now(),
  prepareSpare, spareReady, swapToSpare, memory,
};

// Interactive buttons for a human.
const $ = (id: string) => document.getElementById(id)!;
let softT = 0;
const show = (p: Promise<any>) => p.then((m) => log(`${m.type}: ${m.value ?? m.message}` + (softT ? `  (${(performance.now() - softT).toFixed(1)} ms after soft stop)` : "")));
if (!location.search.includes("manual")) spawn().then((m) => log("ready " + JSON.stringify(m)));
$("run").onclick = () => { softT = 0; show(run("while True: pass").done); };
$("runc").onclick = () => { softT = 0; show(run("sum(range(10**10))").done); };
$("soft").onclick = () => { softT = performance.now(); softStop(); };
$("hard").onclick = async () => { const r = await hardKill(); log(`hard kill -> new worker ready in ${r.ms.toFixed(1)} ms`); };
$("spare").onclick = async () => { if (!spare) { await prepareSpare(); log("spare ready"); } else log("spare already booted"); };
$("swap").onclick = async () => {
  if (!spare) { log("boot a spare first"); return; }
  const s = swapToSpare();
  const m = await s.run("1 + 1");
  log(`swap -> 1 + 1 = ${m.value} in ${(performance.now() - s.t0).toFixed(1)} ms (new spare booting)`);
};
$("two").onclick = () => { softT = 0; show(run("1 + 1").done); };
