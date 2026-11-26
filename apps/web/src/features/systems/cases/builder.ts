import type { CaseStudy, LessonStep, Note, Scene, SceneLink, SceneNode, Zone } from "../model";

/**
 * One step of a case study, written as a change to the previous step's picture:
 * the architecture grows (or breaks, or is fixed) one decision at a time.
 */
export type Grow = Omit<LessonStep, "scene"> & {
  /** New boxes (or replacements with the same id). */
  add?: readonly SceneNode[];
  /** Changes to existing boxes, by id. */
  set?: Readonly<Record<string, Partial<SceneNode>>>;
  /** Boxes to take away (their links go too). */
  remove?: readonly string[];
  /** New links, or replacements for the link with the same ends. */
  link?: readonly SceneLink[];
  /** Links to drop, written "from>to". */
  unlink?: readonly string[];
  /** Replace every link. */
  relink?: readonly SceneLink[];
  /** Floor zones from this step on (an empty list clears them). */
  zones?: readonly Zone[];
  /** Notes for this step only. */
  notes?: readonly Note[];
};

type Meta = Omit<CaseStudy, "steps">;

export function caseStudy(meta: Meta, grows: readonly Grow[]): CaseStudy {
  const nodes = new Map<string, SceneNode>();
  let links: SceneLink[] = [];
  let zones: readonly Zone[] = [];
  const steps = grows.map((g) => {
    for (const id of g.remove ?? []) nodes.delete(id);
    for (const n of g.add ?? []) nodes.set(n.id, n);
    for (const [id, change] of Object.entries(g.set ?? {})) {
      const n = nodes.get(id);
      if (n) nodes.set(id, { ...n, ...change });
    }
    if (g.relink) links = [...g.relink];
    for (const key of g.unlink ?? []) links = links.filter((l) => `${l.from}>${l.to}` !== key);
    for (const l of g.link ?? []) {
      links = links.filter((x) => !(x.from === l.from && x.to === l.to));
      links.push(l);
    }
    links = links.filter((l) => nodes.has(l.from) && nodes.has(l.to));
    if (g.zones) zones = g.zones;
    const scene: Scene = {
      nodes: [...nodes.values()],
      links: [...links],
      zones: zones.length ? [...zones] : undefined,
      notes: g.notes,
    };
    const { add, set, remove, link, unlink, relink, zones: z, notes, ...step } = g;
    void [add, set, remove, link, unlink, relink, z, notes];
    return { ...step, scene } satisfies LessonStep;
  });
  return { ...meta, steps };
}
