import { STORAGE_KEYS } from "../../../lib/progress";
import type { Design } from "./model";
import { cleanDesign } from "./storage";

/** A problem the learner wrote, with their drawing for it. Kept in this browser only. */
export type OwnProblem = {
  id: string;
  title: string;
  brief: string;
  /** One requirement per line, as typed. */
  requirements: string;
  draft: Design;
  /** When it was last changed (ms since 1970), for ordering the list. */
  updated: number;
};

const LIMITS = { title: 120, brief: 4000, requirements: 4000 } as const;

function clean(value: unknown): OwnProblem | null {
  const v = (value ?? {}) as Partial<Record<keyof OwnProblem, unknown>>;
  if (typeof v.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(v.id)) return null;
  const text = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
  return {
    id: v.id,
    title: text(v.title, LIMITS.title),
    brief: text(v.brief, LIMITS.brief),
    requirements: text(v.requirements, LIMITS.requirements),
    draft: cleanDesign(v.draft),
    updated: typeof v.updated === "number" ? v.updated : 0,
  };
}

/** Every own problem, most recently changed first. Broken entries are dropped. */
export function listOwn(): OwnProblem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.labOwn);
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data
      .map(clean)
      .filter((p): p is OwnProblem => p !== null)
      .sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}

function writeAll(list: readonly OwnProblem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.labOwn, JSON.stringify(list));
  } catch {
    // Private windows and blocked storage: the problem just isn't remembered.
  }
}

export function readOwn(id: string): OwnProblem | undefined {
  return listOwn().find((p) => p.id === id);
}

export function saveOwn(problem: OwnProblem): void {
  const next = clean({ ...problem, updated: Date.now() });
  if (!next) return;
  writeAll([next, ...listOwn().filter((p) => p.id !== problem.id)]);
}

export function deleteOwn(id: string): void {
  writeAll(listOwn().filter((p) => p.id !== id));
}

/** Creates and saves a new own problem, optionally filled in from a starting point. */
export function createOwn(
  start: Partial<Pick<OwnProblem, "title" | "brief" | "requirements">> = {},
) {
  const taken = new Set(listOwn().map((p) => p.id));
  const fresh = () => `p-${Math.random().toString(36).slice(2, 8)}`;
  let id = fresh();
  while (taken.has(id)) id = fresh();
  const problem: OwnProblem = {
    id,
    title: start.title ?? "",
    brief: start.brief ?? "",
    requirements: start.requirements ?? "",
    draft: { nodes: [], links: [] },
    updated: Date.now(),
  };
  saveOwn(problem);
  return problem;
}

/** The requirement lines, trimmed, without blanks. */
export function requirementLines(problem: Pick<OwnProblem, "requirements">): string[] {
  return problem.requirements
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}
