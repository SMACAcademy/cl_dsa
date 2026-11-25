// Port of docs/PYRAMID_MODEL.md section 2 (normative). Pure functions, no DOM.
export interface Pt { x: number; y: number }
export interface Tile { r: number; c: number; kind: "domain" | "bridge"; verts: [Pt, Pt, Pt] }
export interface Origin { x0: number; y0: number; S: number }

export const isDomain = (c: number) => c % 2 === 0;
export const tilesInRow = (r: number) => 2 * r + 1;
export const tileCount = (maxRow: number) => (maxRow + 1) ** 2;

/** Vertices of tile (r, c), exactly as in the spec table. Upright: [top, bottom-left, bottom-right]. Inverted: [top-left, top-right, bottom]. */
export function tileVertices(r: number, c: number, { x0, y0, S }: Origin): [Pt, Pt, Pt] {
  const h = (S * Math.sqrt(3)) / 2;
  if (isDomain(c)) {
    const k = c / 2;
    const top = { x: x0 + (k - r / 2) * S, y: y0 + r * h };
    return [top, { x: top.x - S / 2, y: top.y + h }, { x: top.x + S / 2, y: top.y + h }];
  }
  const k = (c - 1) / 2;
  const tl = { x: x0 + (k - r / 2) * S, y: y0 + r * h };
  return [tl, { x: tl.x + S, y: tl.y }, { x: tl.x + S / 2, y: tl.y + h }];
}

export function buildTiles(maxRow: number, o: Origin): Tile[] {
  const out: Tile[] = [];
  for (let r = 0; r <= maxRow; r++)
    for (let c = 0; c <= 2 * r; c++)
      out.push({ r, c, kind: isDomain(c) ? "domain" : "bridge", verts: tileVertices(r, c, o) });
  return out;
}

/** Edge-sharing neighbours per the spec adjacency table, restricted to tiles that exist through `maxRow`. */
export function neighbours(r: number, c: number, maxRow: number): [number, number][] {
  const cand: [number, number][] = isDomain(c)
    ? [[r, c - 1], [r, c + 1], [r + 1, c + 1]]
    : [[r, c - 1], [r, c + 1], [r - 1, c - 1]];
  return cand.filter(([rr, cc]) => rr >= 0 && rr <= maxRow && cc >= 0 && cc <= 2 * rr);
}

export const centroid = (v: [Pt, Pt, Pt]): Pt => ({ x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 });
