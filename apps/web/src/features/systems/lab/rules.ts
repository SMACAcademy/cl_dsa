import type { NodeKind } from "../model";
import type { Design, DesignNode, LinkMode } from "./model";

/** Matches boxes by kind, by role, or either. */
export type Sel = { kinds?: readonly NodeKind[]; roles?: readonly string[] };

export const CLIENTS: Sel = { kinds: ["user", "phone", "browser"] };
export const COMPUTE: Sel = { kinds: ["server", "service"] };
export const STORES: Sel = { kinds: ["db", "storage", "search"] };
export const MESSAGING: Sel = { kinds: ["queue", "stream"] };

export const kinds = (...k: NodeKind[]): Sel => ({ kinds: k });
export const role = (...r: string[]): Sel => ({ roles: r });

export function matches(n: DesignNode, s: Sel): boolean {
  return (
    (s.kinds?.includes(n.kind) ?? false) ||
    (n.role !== undefined && (s.roles?.includes(n.role) ?? false))
  );
}

const pick = (d: Design, s: Sel) => d.nodes.filter((n) => matches(n, s));

export const count = (d: Design, s: Sel) => pick(d, s).length;

export const has = (d: Design, s: Sel, n = 1) => count(d, s) >= n;

function byId(d: Design) {
  return new Map(d.nodes.map((n) => [n.id, n]));
}

/** A direct link between an `a` box and a `b` box, either direction (optionally of one mode). */
export function linked(d: Design, a: Sel, b: Sel, mode?: LinkMode): boolean {
  const nodes = byId(d);
  return d.links.some((l) => {
    if (mode && l.mode !== mode) return false;
    const f = nodes.get(l.from);
    const t = nodes.get(l.to);
    if (!f || !t) return false;
    return (matches(f, a) && matches(t, b)) || (matches(f, b) && matches(t, a));
  });
}

/** A direct link from an `a` box to a `b` box (optionally of one mode). */
export function linkedFrom(d: Design, a: Sel, b: Sel, mode?: LinkMode): boolean {
  const nodes = byId(d);
  return d.links.some((l) => {
    if (mode && l.mode !== mode) return false;
    const f = nodes.get(l.from);
    const t = nodes.get(l.to);
    return !!f && !!t && matches(f, a) && matches(t, b);
  });
}

function neighbours(d: Design): Map<string, string[]> {
  const out = new Map<string, string[]>(d.nodes.map((n) => [n.id, []]));
  for (const l of d.links) {
    out.get(l.from)?.push(l.to);
    out.get(l.to)?.push(l.from);
  }
  return out;
}

/** Ids reachable from any `from` box, never entering a box that matches `avoid`. */
function spread(d: Design, from: Sel, avoid?: Sel): Set<string> {
  const near = neighbours(d);
  const nodes = byId(d);
  const seen = new Set(pick(d, from).map((n) => n.id));
  const todo = [...seen];
  while (todo.length) {
    const id = todo.pop() as string;
    for (const next of near.get(id) ?? []) {
      if (seen.has(next)) continue;
      const n = nodes.get(next);
      if (!n || (avoid && matches(n, avoid))) continue;
      seen.add(next);
      todo.push(next);
    }
  }
  return seen;
}

/** An `a` box and a `b` box are connected by some path (links in any direction). */
export function reaches(d: Design, a: Sel, b: Sel): boolean {
  const seen = spread(d, a);
  return pick(d, b).some((n) => seen.has(n.id));
}

/** `a` reaches `b`, and every path from `a` to `b` passes through a `guard` box. */
export function guarded(d: Design, a: Sel, b: Sel, guard: Sel): boolean {
  if (!reaches(d, a, b)) return false;
  const seen = spread(d, a, guard);
  return !pick(d, b).some((n) => seen.has(n.id) && !matches(n, a));
}

/** At least `n` boxes matching `sel`, each linked directly to a `front` box. */
export function behind(d: Design, sel: Sel, front: Sel, n: number): boolean {
  const fronts = new Set(pick(d, front).map((f) => f.id));
  const ok = pick(d, sel).filter((s) =>
    d.links.some(
      (l) => (l.from === s.id && fronts.has(l.to)) || (l.to === s.id && fronts.has(l.from)),
    ),
  );
  return ok.length >= n;
}

/** No `store` box is linked to two different `owner` boxes. Needs at least one owned store. */
export function noSharedStore(d: Design, owners: Sel, stores: Sel): boolean {
  const nodes = byId(d);
  const ownersOf = new Map<string, Set<string>>();
  for (const l of d.links) {
    const f = nodes.get(l.from);
    const t = nodes.get(l.to);
    if (!f || !t) continue;
    const pairs: [DesignNode, DesignNode][] = [
      [f, t],
      [t, f],
    ];
    for (const [o, s] of pairs) {
      if (matches(o, owners) && matches(s, stores)) {
        const set = ownersOf.get(s.id) ?? new Set<string>();
        set.add(o.id);
        ownersOf.set(s.id, set);
      }
    }
  }
  if (ownersOf.size === 0) return false;
  return [...ownersOf.values()].every((set) => set.size === 1);
}

/** Every `owner` box has a `store` box of its own linked to it. */
export function eachOwns(d: Design, owners: Sel, stores: Sel): boolean {
  const list = pick(d, owners);
  const nodes = byId(d);
  return (
    list.length > 0 &&
    list.every((o) =>
      d.links.some((l) => {
        const other =
          l.from === o.id ? nodes.get(l.to) : l.to === o.id ? nodes.get(l.from) : undefined;
        return !!other && matches(other, stores);
      }),
    )
  );
}

/** Some `mid` box is linked to both an `a` box and a `b` box. */
export function between(d: Design, mid: Sel, a: Sel, b: Sel): boolean {
  const nodes = byId(d);
  return pick(d, mid).some((m) => {
    const others = d.links
      .filter((l) => l.from === m.id || l.to === m.id)
      .map((l) => nodes.get(l.from === m.id ? l.to : l.from))
      .filter((n): n is DesignNode => !!n);
    return others.some((n) => matches(n, a)) && others.some((n) => matches(n, b));
  });
}

/** No sync link from an `a` box to a `b` box (and at least one of each exists). */
export function neverWaitsOn(d: Design, a: Sel, b: Sel): boolean {
  return has(d, a) && has(d, b) && !linked(d, a, b, "sync");
}
