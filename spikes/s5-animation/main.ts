import { animate, type Attrs } from "./tween.ts";
import { createSvgBars, type BarRenderer } from "./svgBars.ts";
import { createCanvasBars } from "./canvasBars.ts";

export interface RunOpts { renderer: "svg" | "canvas"; n: number; speed: number; swaps: number; seed: number }

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600, H = 400, BASE_MS = 450;
const host = document.getElementById("stage")!;

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

async function idleRefreshHz(frames = 120): Promise<number> {
  const ts: number[] = [];
  await new Promise<void>((res) => {
    const f = (t: number) => { ts.push(t); ts.length > frames ? res() : requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const d = ts.slice(10).map((t, i) => t - ts[i + 9]).sort((a, b) => a - b);
  return 1000 / d[Math.floor(d.length / 2)];
}

async function run(o: RunOpts) {
  const rand = mulberry32(o.seed);
  const renderer: BarRenderer = o.renderer === "svg" ? createSvgBars(host) : createCanvasBars(host);
  const slot = W / o.n, barW = o.renderer === "svg" ? slot * 0.8 : slot;
  const order: string[] = [];
  const height = new Map<string, number>();
  for (let i = 0; i < o.n; i++) { order.push(String(i)); height.set(String(i), 20 + rand() * (H - 40)); }
  const at = (pos: number): Attrs => ({ id: order[pos], x: pos * slot, y: 0, h: height.get(order[pos])! });
  renderer.init(order.map((_, i) => at(i)), barW, W, H);

  const idleHz = await idleRefreshHz();

  // rAF frame counter over the whole run
  const stamps: number[] = [];
  let counting = true;
  const count = (t: number) => { if (!counting) return; stamps.push(t); requestAnimationFrame(count); };
  requestAnimationFrame(count);

  let resolved = 0, errors: string[] = [];
  const dur = BASE_MS / o.speed;
  const t0 = performance.now();
  try {
    for (let s = 0; s < o.swaps; s++) {
      let i = Math.floor(rand() * o.n), j = Math.floor(rand() * o.n);
      while (j === i) j = Math.floor(rand() * o.n);
      const a = at(i), b = at(j);
      const from = [a, b];
      const to = [{ ...a, x: b.x }, { ...b, x: a.x }];
      await animate(from, to, dur, (attrs) => renderer.apply(attrs));
      resolved++;
      [order[i], order[j]] = [order[j], order[i]]; // model: same swap applied to the array
    }
  } catch (e) { errors.push(String((e as Error)?.stack ?? e)); }
  const wallMs = performance.now() - t0;
  counting = false;

  const iv = stamps.slice(1).map((t, i) => t - stamps[i]);
  const sorted = [...iv].sort((x, y) => x - y);
  // fps from interval: p5 fps = fps at the 95th-percentile interval
  const avgFps = (stamps.length - 1) / ((stamps.at(-1)! - stamps[0]) / 1000);
  const p5Fps = 1000 / pct(sorted, 0.95);
  const dropped = iv.filter((d) => d > 1.5 * (1000 / 60)).length;
  const droppedVsRefresh = iv.filter((d) => d > 1.5 * (1000 / idleHz)).length;
  const rendered = renderer.renderedOrder();
  return {
    renderer: o.renderer, n: o.n, speed: o.speed, swaps: o.swaps, seed: o.seed, perSwapMs: dur,
    elements: renderer.elementCount(), idleRefreshHz: idleHz, frames: iv.length, wallMs,
    avgFps, p5Fps, dropped, droppedVsRefresh, worstFrameMs: sorted.at(-1) ?? 0,
    resolved, errors,
    orderMatchesModel: rendered.length === order.length && rendered.every((id, k) => id === order[k]),
    pageErrors: (window as any).__errors as string[],
  };
}

(window as any).__errors = [];
window.addEventListener("error", (e) => (window as any).__errors.push(String(e.message)));
window.addEventListener("unhandledrejection", (e) => (window as any).__errors.push(String(e.reason)));
(window as any).runS5 = run;
(window as any).s5ready = true;
