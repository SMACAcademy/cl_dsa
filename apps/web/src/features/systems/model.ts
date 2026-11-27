/**
 * The System Design Lab lesson format. A lesson is plain data: a list of steps,
 * each with words for the side panel and a scene for the animated diagram.
 * Scenes use a small isometric grid (x to the lower right, y to the lower left);
 * see IsoScene for how it is drawn.
 */
import type { ComponentType } from "react";

export type NodeKind =
  | "user"
  | "phone"
  | "browser"
  | "dns"
  | "lb"
  | "server"
  | "service"
  | "worker"
  | "gateway"
  | "db"
  | "cache"
  | "queue"
  | "stream"
  | "cdn"
  | "storage"
  | "search"
  | "registry"
  | "lock"
  | "monitor"
  | "clock"
  | "internet"
  | "mainframe"
  | "files"
  | "llm"
  | "vector"
  | "agent";

export type Hue = "blue" | "violet" | "amber" | "green" | "rose" | "teal" | "slate";

export type NodeState = "ok" | "hot" | "down" | "dim" | "lit";

export type SceneNode = {
  id: string;
  kind: NodeKind;
  label: string;
  /** A second, smaller line under the label (e.g. "16 vCPU", "leader"). */
  sub?: string;
  /** Grid position: x runs to the lower right, y to the lower left. */
  x: number;
  y: number;
  state?: NodeState;
  /** A small tag on the box, e.g. "92%" or "v2". */
  badge?: string;
  /** Override the colour that comes with the kind. */
  hue?: Hue;
  /** Draws this many waiting items (up to 8) stacked beside the box. */
  queue?: number;
  /** Box size: 1 is normal, 1.4 is big (a giant server). */
  size?: number;
};

export type FlowKind =
  | "request"
  | "response"
  | "write"
  | "fail"
  | "event"
  | "copy"
  | "heavy"
  /** A file left in a drop folder. */
  | "file"
  /** Text streaming back from an AI model, token by token. */
  | "token";

export type Flow = {
  kind: FlowKind;
  /** Dots on the link at once (1–4). */
  rate?: number;
  /** Travel from `to` back to `from`. */
  back?: boolean;
  /** Seconds for one dot to cross (default from the link length). */
  speed?: number;
};

export type SceneLink = {
  from: string;
  to: string;
  flows?: readonly Flow[];
  dashed?: boolean;
  label?: string;
  /** Cut: drawn broken with a cross in the middle (a partition, a dead line). */
  cut?: boolean;
};

/** A dashed area on the floor: an availability zone, a region, a shard. */
export type Zone = {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hue?: Hue;
};

/** A floating note on the floor, e.g. "26 steps, not 50 million". */
export type Note = { x: number; y: number; text: string; tone?: "good" | "bad" | "plain" };

export type Metric = { label: string; value: string; tone?: "good" | "bad" | "plain" };

export type Scene = {
  nodes: readonly SceneNode[];
  links?: readonly SceneLink[];
  zones?: readonly Zone[];
  notes?: readonly Note[];
};

export type StepKind =
  "setup" | "problem" | "insight" | "technique" | "solution" | "tradeoff" | "case" | "recap";

export type Callout = { kind: "key" | "good" | "watch"; text: string };

export type Change = { op: "+" | "-" | "~"; text: string };

export type Quiz = {
  question: string;
  options: readonly string[];
  /** Index of the right option. */
  answer: number;
  /** Shown after answering, right or wrong. */
  why: string;
};

export type Table = { head: readonly string[]; rows: readonly (readonly string[])[] };

export type LessonStep = {
  kind: StepKind;
  /** One or two words for the step timeline. */
  short: string;
  title: string;
  body: readonly string[];
  callout?: Callout;
  changes?: readonly Change[];
  metrics?: readonly Metric[];
  scene: Scene;
  quiz?: Quiz;
  table?: Table;
  /** A few lines of Python or pseudo-code shown under the text. */
  code?: readonly string[];
  /** Case studies: the lesson whose idea this step applies (a lesson id). */
  uses?: string;
};

export type Level = "beginner" | "intermediate" | "advanced";

export type Lesson = {
  id: string;
  title: string;
  /** One sentence under the title. */
  tagline: string;
  minutes: number;
  level: Level;
  /** Five short "you'll learn" items. */
  learn: readonly string[];
  steps: readonly LessonStep[];
  /** Data structures and algorithms (catalog paths) this lesson stands on. */
  builtOn?: readonly { label: string; path: string }[];
  /** A hands-on lab shown under the lesson. */
  lab?: ComponentType;
};

/**
 * A case study: a real product designed end to end by combining lessons already learned.
 * "combine" uses 2–4 ideas, "integrate" 5–8, "capstone" draws on most of the course.
 */
export type CaseTier = "combine" | "integrate" | "capstone";
export type CaseStudy = Lesson & { concepts: readonly string[]; tier: CaseTier };

export type Module = {
  id: string;
  number: string;
  title: string;
  blurb: string;
  lessons: readonly Lesson[];
};

/* ------------------------------ Authoring helpers ------------------------------ */

/** A node: `node("lb", "lb", "Load balancer", 0, 0, { sub: "round robin" })`. */
export function node(
  id: string,
  kind: NodeKind,
  label: string,
  x: number,
  y: number,
  extra: Partial<Omit<SceneNode, "id" | "kind" | "label" | "x" | "y">> = {},
): SceneNode {
  return { id, kind, label, x, y, ...extra };
}

/** A link with flows: `link("lb", "a", "request", "response")`. */
export function link(
  from: string,
  to: string,
  ...flows: (FlowKind | Flow | Partial<Omit<SceneLink, "from" | "to">>)[]
): SceneLink {
  const result: SceneLink = { from, to };
  const list: Flow[] = [];
  let extra: Partial<SceneLink> = {};
  for (const f of flows) {
    if (typeof f === "string") list.push({ kind: f });
    else if ("kind" in f) list.push(f as Flow);
    else extra = { ...extra, ...(f as Partial<SceneLink>) };
  }
  return { ...result, ...extra, flows: list };
}

/** Copies a scene, replacing nodes by id (or adding them) and optionally swapping links. */
export function patch(
  base: Scene,
  changes: {
    nodes?: Record<string, Partial<SceneNode>>;
    add?: readonly SceneNode[];
    remove?: readonly string[];
    links?: readonly SceneLink[];
    zones?: readonly Zone[];
    notes?: readonly Note[];
  },
): Scene {
  const removed = new Set(changes.remove ?? []);
  const nodes = base.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => (changes.nodes?.[n.id] ? { ...n, ...changes.nodes[n.id] } : n));
  return {
    nodes: [...nodes, ...(changes.add ?? [])],
    links: (changes.links ?? base.links ?? []).filter(
      (l) => !removed.has(l.from) && !removed.has(l.to),
    ),
    zones: changes.zones ?? base.zones,
    notes: changes.notes ?? [],
  };
}

/** The default colour of each kind of box. */
export const KIND_HUE: Record<NodeKind, Hue> = {
  user: "slate",
  phone: "slate",
  browser: "slate",
  internet: "slate",
  dns: "teal",
  lb: "blue",
  gateway: "blue",
  server: "blue",
  service: "violet",
  worker: "violet",
  db: "green",
  storage: "green",
  search: "teal",
  cache: "amber",
  cdn: "amber",
  queue: "rose",
  stream: "rose",
  registry: "teal",
  lock: "teal",
  monitor: "violet",
  clock: "slate",
  mainframe: "slate",
  files: "green",
  llm: "violet",
  vector: "teal",
  agent: "violet",
};
