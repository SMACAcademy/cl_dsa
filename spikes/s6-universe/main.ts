import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { buildTiles, centroid, type Pt } from "./geometry.ts";

const W = 1280, H = 800, S = 90, MAX_ROW = 8, N_CONCEPTS = 800;
const K_CONCEPTS = 2.5, K_LABELS = 4, K_MAX = 8;
const WHEEL_PER_PX = 0.002; // d3-zoom default wheelDelta: log2(k) change per wheel pixel

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- scene ----
const origin = { x0: W / 2, y0: 40, S };
const tiles = buildTiles(MAX_ROW, origin);
interface Concept { id: string; x: number; y: number; label: string; domain: boolean }
const rand = mulberry32(20261118);
const concepts: Concept[] = [];
// ~10 per tile: 80 tiles x 10 = 800 (tile order r,c; the last tile is left empty to land on exactly 800)
for (const t of tiles) {
  if (concepts.length >= N_CONCEPTS) break;
  const ctr = centroid(t.verts);
  for (let i = 0; i < 10 && concepts.length < N_CONCEPTS; i++) {
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const [a, b, c] = t.verts;
    const p: Pt = { x: a.x + u * (b.x - a.x) + v * (c.x - a.x), y: a.y + u * (b.y - a.y) + v * (c.y - a.y) };
    const k = 0.78; // pull toward centroid so nodes stay off the tile edges
    concepts.push({ id: `c${concepts.length}`, x: ctr.x + (p.x - ctr.x) * k, y: ctr.y + (p.y - ctr.y) * k, label: `concept-${t.r}.${t.c}.${i}`, domain: t.kind === "domain" });
  }
}

const host = document.getElementById("stage")!;
const svg = select(host).append("svg").attr("width", W).attr("height", H);
const root = svg.append("g").attr("class", "root");
const gTiles = root.append("g").attr("class", "tiles");
const gConcepts = root.append("g").attr("class", "concepts");
const gLabels = root.append("g").attr("class", "labels");

gTiles.selectAll("polygon").data(tiles).join("polygon")
  .attr("points", (t) => t.verts.map((p) => `${p.x},${p.y}`).join(" "))
  .attr("fill", (t) => (t.kind === "domain" ? "#dbeafe" : "#fde68a"))
  .attr("stroke", "#334155").attr("stroke-width", 0.8)
  .attr("data-r", (t) => t.r).attr("data-c", (t) => t.c);
gTiles.selectAll("text").data(tiles).join("text")
  .attr("x", (t) => centroid(t.verts).x).attr("y", (t) => centroid(t.verts).y)
  .attr("text-anchor", "middle").attr("font-size", 7).attr("fill", "#475569").attr("pointer-events", "none")
  .text((t) => `${t.kind === "domain" ? "D" : "B"}${t.r}.${t.c}`);

// ---- semantic LOD: mount/unmount by zoom scale ----
let circlesMounted = false, labelsMounted = false;
function applyLod(k: number) {
  const wantC = k >= K_CONCEPTS, wantL = k >= K_LABELS;
  if (wantC !== circlesMounted) {
    if (wantC) gConcepts.selectAll("circle").data(concepts, (d: any) => d.id).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 2.4)
      .attr("fill", (d) => (d.domain ? "#2563eb" : "#d97706")).attr("stroke", "#fff").attr("stroke-width", 0.4);
    else gConcepts.selectAll("circle").remove();
    circlesMounted = wantC;
  }
  if (wantL !== labelsMounted) {
    if (wantL) gLabels.selectAll("text").data(concepts, (d: any) => d.id).join("text")
      .attr("x", (d) => d.x).attr("y", (d) => d.y - 3.6).attr("text-anchor", "middle")
      .attr("font-size", 2.6).attr("fill", "#0f172a").attr("pointer-events", "none").text((d) => d.label);
    else gLabels.selectAll("text").remove();
    labelsMounted = wantL;
  }
}

let curK = 1;
const zoomer: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
  .scaleExtent([1, K_MAX])
  .on("zoom", (ev) => {
    const t = ev.transform;
    curK = t.k;
    root.attr("transform", `translate(${t.x},${t.y}) scale(${t.k})`);
    applyLod(t.k);
  });
svg.call(zoomer);
applyLod(1);

const counts = () => ({
  k: curK,
  tiles: gTiles.selectAll("polygon").size(),
  circles: gConcepts.selectAll("circle").size(),
  labels: gLabels.selectAll("text").size(),
});

// ---- measurement ----
export interface RunOpts { scenario: "zoom" | "pan"; durationMs: number; cycles: number }
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

const svgEl = svg.node()!;
const wheel = (deltaY: number, x: number, y: number) =>
  svgEl.dispatchEvent(new WheelEvent("wheel", { deltaY, deltaMode: 0, clientX: x, clientY: y, bubbles: true, cancelable: true, view: window }));
const mouse = (type: string, x: number, y: number, target: EventTarget) =>
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === "mouseup" ? 0 : 1, bubbles: true, cancelable: true, view: window }));

async function run(o: RunOpts) {
  svg.call(zoomer.transform, zoomIdentity);
  const rc = svgEl.getBoundingClientRect();
  const cx = rc.left + W / 2, cy = rc.top + H / 2;
  if (o.scenario === "pan") {
    // k = 3 about the viewport centre (concept circles mounted, labels not), then settle two frames
    svg.call(zoomer.transform, zoomIdentity.translate(W / 2, H / 2).scale(3).translate(-W / 2, -H / 2));
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const idleHz = await idleRefreshHz();

  const stamps: number[] = [], samples: ReturnType<typeof counts>[] = [], errors: string[] = [];
  const pageErrors: string[] = [];
  const onErr = (e: ErrorEvent) => pageErrors.push(e.message);
  window.addEventListener("error", onErr);
  let minK = Infinity, maxK = 0, frame = 0, dragging = false, lastX = 0, lastY = 0;
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (t: number) => {
      stamps.push(t);
      const el = t - t0;
      try {
        if (o.scenario === "zoom") {
          // k(t) = 8^p, p a triangle wave 0 -> 1 -> 0 per cycle; applied through real wheel events dispatched on the svg
          const u = ((el / o.durationMs) * o.cycles) % 1, p = 1 - Math.abs(2 * u - 1);
          const target = Math.pow(K_MAX, Math.min(1, p));
          const dy = -(Math.log2(target / curK) / WHEEL_PER_PX);
          if (Math.abs(dy) > 0.01) wheel(dy, cx, cy);
        } else {
          // circular drag, radius 220 px, 2.5 s per loop, through mousedown/mousemove/mouseup events
          const a = (el / 2500) * 2 * Math.PI, x = cx + 220 * Math.cos(a), y = cy + 220 * Math.sin(a);
          if (!dragging) { mouse("mousedown", x, y, svgEl); dragging = true; }
          else mouse("mousemove", x, y, window);
          lastX = x; lastY = y;
        }
        minK = Math.min(minK, curK); maxK = Math.max(maxK, curK);
        if (frame++ % 5 === 0) samples.push(counts()); // DOM counts sampled in the same frame as the zoom event
      } catch (e) { errors.push(String((e as Error)?.stack ?? e)); }
      if (el >= o.durationMs) {
        if (dragging) mouse("mouseup", lastX, lastY, window);
        resolve();
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  window.removeEventListener("error", onErr);
  const wallMs = performance.now() - t0;
  samples.push(counts());

  const iv = stamps.slice(1).map((t, i) => t - stamps[i]);
  const sorted = [...iv].sort((x, y) => x - y);
  const avgFps = (stamps.length - 1) / ((stamps.at(-1)! - stamps[0]) / 1000);
  const p5Fps = 1000 / pct(sorted, 0.95);
  const dropped = iv.filter((d) => d > 1.5 * (1000 / 60)).length;
  const droppedVsRefresh = iv.filter((d) => d > 1.5 * (1000 / idleHz)).length;

  let lodViolations = 0, tilesOk = true;
  for (const s of samples) {
    if (s.tiles !== 81) tilesOk = false;
    if (s.circles !== (s.k >= K_CONCEPTS ? N_CONCEPTS : 0)) lodViolations++;
    if (s.labels !== (s.k >= K_LABELS ? N_CONCEPTS : 0)) lodViolations++;
  }
  const ks = samples.map((s) => s.k);
  return {
    scenario: o.scenario, durationMs: o.durationMs, cycles: o.cycles, idleRefreshHz: idleHz, frames: iv.length, wallMs,
    avgFps, p5Fps, dropped, droppedVsRefresh, worstFrameMs: sorted.at(-1) ?? 0,
    minK, maxK, samples: samples.length, lodViolations, tilesOk,
    sampledBelowCircles: ks.filter((k) => k < K_CONCEPTS).length,
    sampledCirclesNoLabels: ks.filter((k) => k >= K_CONCEPTS && k < K_LABELS).length,
    sampledWithLabels: ks.filter((k) => k >= K_LABELS).length,
    maxCircles: Math.max(...samples.map((s) => s.circles)), maxLabels: Math.max(...samples.map((s) => s.labels)),
    tiles: samples[0].tiles, totalConcepts: concepts.length, errors, pageErrors,
  };
}

(window as any).runS6 = run;
(window as any).s6ready = true;
