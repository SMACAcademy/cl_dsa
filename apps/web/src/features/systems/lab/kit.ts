import type { NodeKind } from "../model";
import type { Check, DesignLink, DesignNode, PaletteItem } from "./model";
import { kinds, type Sel } from "./rules";

/* Small builders shared by every Design Lab problem. */

export const n = (
  id: string,
  kind: NodeKind,
  label: string,
  col: number,
  row: number,
  r?: string,
) => ({ id, kind, label, col, row, ...(r ? { role: r } : {}) }) satisfies DesignNode;
export const s = (from: string, to: string): DesignLink => ({ from, to, mode: "sync" });
export const a = (from: string, to: string): DesignLink => ({ from, to, mode: "async" });
export const check = (
  id: string,
  label: string,
  hint: string,
  points: number,
  pass: Check["pass"],
): Check => ({ id, label, hint, points, pass });

export const P: Record<string, PaletteItem> = {
  user: { kind: "user", label: "Users", hint: "People using the system" },
  phone: { kind: "phone", label: "Mobile app", hint: "The app on people's phones" },
  browser: { kind: "browser", label: "Web browser", hint: "People on the website" },
  lb: { kind: "lb", label: "Load balancer", hint: "Spreads requests across servers" },
  gateway: {
    kind: "gateway",
    label: "API gateway",
    hint: "One front door: checks, routing, limits",
  },
  server: { kind: "server", label: "App server", hint: "Runs your code; add several for capacity" },
  service: { kind: "service", label: "Service", hint: "One part of the system with its own job" },
  worker: { kind: "worker", label: "Worker", hint: "Does background jobs" },
  db: { kind: "db", label: "Database", hint: "Keeps records safely" },
  cache: { kind: "cache", label: "Cache", hint: "Fast copies of popular answers, in memory" },
  cdn: { kind: "cdn", label: "CDN", hint: "Serves files from servers near the user" },
  queue: { kind: "queue", label: "Queue", hint: "Holds jobs until a worker takes them" },
  stream: { kind: "stream", label: "Event stream", hint: "Events that many readers can follow" },
  storage: { kind: "storage", label: "File storage", hint: "Big files: photos, videos, exports" },
  search: { kind: "search", label: "Search index", hint: "Finds records by words, fast" },
  monitor: { kind: "monitor", label: "Monitoring", hint: "Metrics, logs and alerts" },
  internet: { kind: "internet", label: "Outside service", hint: "A system run by someone else" },
  mainframe: {
    kind: "mainframe",
    label: "Mainframe",
    hint: "The old core system that holds the real records",
  },
  files: {
    kind: "files",
    label: "File drop",
    hint: "A folder where files are left to be picked up",
  },
  llm: { kind: "llm", label: "AI model", hint: "A language model that answers in text" },
  vector: {
    kind: "vector",
    label: "Vector database",
    hint: "Finds passages by meaning, not exact words",
  },
  agent: { kind: "agent", label: "AI agent", hint: "Uses a model to decide which tools to call" },
  dns: { kind: "dns", label: "DNS", hint: "Turns a name into an address" },
  registry: { kind: "registry", label: "Service registry", hint: "Where services find each other" },
  lock: { kind: "lock", label: "Lock service", hint: "Lets only one worker do a job at a time" },
  clock: { kind: "clock", label: "Scheduler", hint: "Starts jobs at set times" },
};

/** Every kind of box, for problems the learner writes themselves. */
export const ALL_PALETTE: readonly PaletteItem[] = Object.values(P);

export const pal = (...keys: (keyof typeof P)[]): PaletteItem[] =>
  keys.map((k) => P[k] as PaletteItem);
export const named = (kind: NodeKind, r: string, label: string, hint: string): PaletteItem => ({
  kind,
  role: r,
  label,
  hint,
  max: 1,
});

export const SERVERS: Sel = kinds("server");
export const DB: Sel = kinds("db");
export const either = (...sels: Sel[]): Sel => ({
  kinds: sels.flatMap((x) => x.kinds ?? []),
  roles: sels.flatMap((x) => x.roles ?? []),
});
