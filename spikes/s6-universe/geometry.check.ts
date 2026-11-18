// Geometry checks. Run: node s6-universe/geometry.check.ts (from spikes/)
import { buildTiles, neighbours, tilesInRow, tileCount, type Origin, type Pt } from "./geometry.ts";

let checks = 0;
const ok = (c: boolean, m: string) => { checks++; if (!c) throw new Error("CHECK FAILED: " + m); };
const R = 8, o: Origin = { x0: 0, y0: 0, S: 100 };
const tiles = buildTiles(R, o);
const key = (r: number, c: number) => `${r},${c}`;
const byKey = new Map(tiles.map((t) => [key(t.r, t.c), t]));

ok(tiles.length === 81 && tiles.length === tileCount(R), "81 tiles through row 8");
for (let r = 0; r <= R; r++) ok(tiles.filter((t) => t.r === r).length === tilesInRow(r) && tilesInRow(r) === 2 * r + 1, `row ${r} has 2r+1 tiles`);
for (const t of tiles) ok(t.kind === (t.c % 2 === 0 ? "domain" : "bridge"), `parity (${t.r},${t.c})`);
ok(tiles.filter((t) => t.kind === "domain").length === 45 && tiles.filter((t) => t.kind === "bridge").length === 36, "45 domains, 36 bridges");

// geometric edge sharing: exactly two vertices in common
const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
const shared = (a: Pt[], b: Pt[]) => a.filter((p) => b.some((q) => same(p, q))).length;
const geo = new Map<string, Set<string>>();
for (const a of tiles) {
  const s = new Set<string>();
  for (const b of tiles) if (a !== b && shared(a.verts, b.verts) === 2) s.add(key(b.r, b.c));
  geo.set(key(a.r, a.c), s);
}
for (const t of tiles) {
  const rule = neighbours(t.r, t.c, R);
  const ruleSet = new Set(rule.map(([r, c]) => key(r, c)));
  for (const [r, c] of rule) {
    ok(byKey.has(key(r, c)), `neighbour (${r},${c}) of (${t.r},${t.c}) exists`);
    ok(shared(t.verts, byKey.get(key(r, c))!.verts) === 2, `(${t.r},${t.c}) shares an edge with rule neighbour (${r},${c})`);
  }
  const g = geo.get(key(t.r, t.c))!;
  ok(g.size === ruleSet.size && [...g].every((k) => ruleSet.has(k)), `rule neighbours == geometric edge-sharers for (${t.r},${t.c})`);
  if (t.kind === "bridge") ok(rule.length === 3, `bridge (${t.r},${t.c}) has exactly 3 neighbours`);
}
for (const t of tiles) for (const [r, c] of neighbours(t.r, t.c, R)) ok(neighbours(r, c, R).some(([rr, cc]) => rr === t.r && cc === t.c), `adjacency symmetric (${t.r},${t.c}) <-> (${r},${c})`);
console.log(`geometry.check OK: ${checks} checks`);
