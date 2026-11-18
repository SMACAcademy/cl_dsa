import type { Attrs } from "./tween.ts";

export interface BarRenderer {
  init(bars: Attrs[], barW: number, width: number, height: number): void;
  apply(attrs: Attrs[]): void;
  /** bar ids ordered by their rendered x (read back from the DOM / last drawn state) */
  renderedOrder(): string[];
  elementCount(): number;
}

const NS = "http://www.w3.org/2000/svg";

export function createSvgBars(host: HTMLElement): BarRenderer {
  let svg: SVGSVGElement;
  let H = 0;
  const rects = new Map<string, SVGRectElement>();
  return {
    init(bars, barW, width, height) {
      host.replaceChildren();
      rects.clear();
      H = height;
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      for (const b of bars) {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("data-id", b.id);
        r.setAttribute("width", String(barW));
        r.setAttribute("fill", "#4a7bd0");
        rects.set(b.id, r);
        svg.appendChild(r);
      }
      host.appendChild(svg);
      this.apply(bars);
    },
    apply(attrs) {
      for (const a of attrs) {
        const r = rects.get(a.id)!;
        r.setAttribute("x", String(a.x));
        r.setAttribute("y", String(H - a.h));
        r.setAttribute("height", String(a.h));
      }
    },
    renderedOrder() {
      return [...svg.querySelectorAll("rect")]
        .map((r) => ({ id: r.getAttribute("data-id")!, x: Number(r.getAttribute("x")) }))
        .sort((p, q) => p.x - q.x)
        .map((p) => p.id);
    },
    elementCount: () => svg.querySelectorAll("*").length,
  };
}
