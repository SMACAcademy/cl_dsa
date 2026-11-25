/**
 * Everything AlgoVerse remembers about a visitor. The public site has no database, so
 * this lives in localStorage only: private to this browser, and cleared by "Reset".
 */

export type VisitKind = "lesson" | "algorithm" | "structure" | "practice";

/** The last page with content the learner opened, for "pick up where you left off". */
export type LastVisit = { path: string; title: string; kind: VisitKind };

export type PracticeRecord = { best: number; outOf: number; rounds: number };

export const STORAGE_KEYS = {
  last: "algoverse.last",
  visited: "algoverse.visited",
  practice: "algoverse.practice",
  lessonsDone: "algoverse.systems.done",
  motion: "algoverse.motion",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows and blocked storage: nothing is remembered, nothing breaks.
  }
}

export function recordVisit(visit: LastVisit): void {
  write(STORAGE_KEYS.last, visit);
  const base = visit.path.split("?")[0] ?? visit.path;
  const visited = read<string[]>(STORAGE_KEYS.visited, []);
  if (!visited.includes(base)) write(STORAGE_KEYS.visited, [...visited, base].slice(-1000));
}

export function readLast(): LastVisit | null {
  const last = read<LastVisit | null>(STORAGE_KEYS.last, null);
  return last && typeof last.path === "string" && typeof last.title === "string" ? last : null;
}

/** Paths (without query) of every lesson, algorithm and structure page opened. */
export function readVisited(): Set<string> {
  const list = read<unknown>(STORAGE_KEYS.visited, []);
  return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
}

export function readPractice(): PracticeRecord {
  const r = read<Partial<PracticeRecord>>(STORAGE_KEYS.practice, {});
  return { best: r.best ?? 0, outOf: r.outOf ?? 0, rounds: r.rounds ?? 0 };
}

/** Records one finished practice round, keeping the best score. */
export function recordPractice(score: number, outOf: number): PracticeRecord {
  const before = readPractice();
  const better = before.outOf === 0 || score / outOf > before.best / Math.max(before.outOf, 1);
  const next = {
    best: better ? score : before.best,
    outOf: better ? outOf : before.outOf,
    rounds: before.rounds + 1,
  };
  write(STORAGE_KEYS.practice, next);
  return next;
}

export type MotionPref = "animate" | "still";

export function readMotion(): MotionPref {
  return read<MotionPref>(STORAGE_KEYS.motion, "animate") === "still" ? "still" : "animate";
}

export function writeMotion(pref: MotionPref): void {
  write(STORAGE_KEYS.motion, pref);
}

/** Forgets finished lessons, visits and practice scores (not the theme). */
export function resetProgress(): void {
  for (const key of [
    STORAGE_KEYS.last,
    STORAGE_KEYS.visited,
    STORAGE_KEYS.practice,
    STORAGE_KEYS.lessonsDone,
  ]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
