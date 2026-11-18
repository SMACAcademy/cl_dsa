import type { Attrs } from "./tween.ts";
import type { BarRenderer } from "./svgBars.ts";

// Canvas 2D: the whole scene is redrawn on every frame (as a real scene renderer would), from a state map
// updated by the tween's attrs.
export function createCanvasBars(host: HTMLElement): BarRenderer {
  let ctx: CanvasRenderingContext2D;
  let W = 0, H = 0, barW = 0;
  const state = new Map<string, Attrs>();
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#4a7bd0";
    for (const a of state.values()) ctx.fillRect(a.x, H - a.h, barW, a.h);
  };
  return {
    init(bars, bw, width, height) {
      host.replaceChildren();
      state.clear();
      W = width; H = height; barW = bw;
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      c.style.width = width + "px"; c.style.height = height + "px";
      host.appendChild(c);
      ctx = c.getContext("2d")!;
      this.apply(bars);
    },
    apply(attrs) {
      for (const a of attrs) state.set(a.id, a);
      draw();
    },
    renderedOrder() {
      return [...state.values()].sort((p, q) => p.x - q.x).map((a) => a.id);
    },
    elementCount: () => state.size,
  };
}
