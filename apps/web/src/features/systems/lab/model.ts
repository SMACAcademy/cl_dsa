import type { Flow, Level, NodeKind, Scene } from "../model";

/** "sync": the caller waits for a reply. "async": it sends and moves on. */
export type LinkMode = "sync" | "async";

/** A box on the lab canvas, at a grid cell. */
export type DesignNode = {
  id: string;
  kind: NodeKind;
  /** A problem-specific service ("orders"), so checks can tell services apart. */
  role?: string;
  label: string;
  col: number;
  row: number;
};

/** A connection, drawn from the box that starts the conversation. */
export type DesignLink = { from: string; to: string; mode: LinkMode };

export type Design = { nodes: readonly DesignNode[]; links: readonly DesignLink[] };

export type PaletteItem = {
  kind: NodeKind;
  role?: string;
  label: string;
  /** One line on what the box is for. */
  hint: string;
  /** At most this many on the canvas (no limit when absent). */
  max?: number;
};

export type Check = {
  id: string;
  /** What a good design does, e.g. "A cache sits between the servers and the database". */
  label: string;
  /** Shown when the check fails. */
  hint: string;
  points: number;
  pass: (d: Design) => boolean;
  /** When the check is relevant to this design (always, when absent). */
  applies?: (d: Design) => boolean;
};

export type LabProblem = {
  id: string;
  title: string;
  tagline: string;
  level: Level;
  minutes: number;
  brief: readonly string[];
  requirements: readonly string[];
  palette: readonly PaletteItem[];
  checks: readonly Check[];
  answer: Design;
  /** Why the model answer looks the way it does. */
  explain: readonly string[];
  /** Lesson ids the problem practises. */
  concepts: readonly string[];
  /** A case study to read afterwards. */
  caseId?: string;
};

export const GRID_COLS = 12;
export const GRID_ROWS = 8;

const MESSAGING: readonly NodeKind[] = ["queue", "stream", "files"];

/** Links that touch a queue, stream or file drop are naturally "send and move on". */
export function defaultMode(from: NodeKind, to: NodeKind): LinkMode {
  return MESSAGING.includes(from) || MESSAGING.includes(to) ? "async" : "sync";
}

/**
 * What travels along a link, by its mode and what it joins: requests and replies, AI output
 * streaming back, messages through queues and streams, files through a drop folder, and
 * writes into stores. The canvas animation and the 3D view both use this.
 */
export function flowsOf(d: Design, l: DesignLink): Flow[] {
  const kindOf = (id: string) => d.nodes.find((n) => n.id === id)?.kind;
  const from = kindOf(l.from);
  const to = kindOf(l.to);
  const touches = (...k: NodeKind[]) => k.some((x) => x === from || x === to);
  if (l.mode === "async") {
    if (touches("files")) return [{ kind: "file", rate: 1 }];
    return [{ kind: "event", rate: 2 }];
  }
  if (to === "llm") {
    return [
      { kind: "request", rate: 1 },
      { kind: "token", back: true, rate: 3 },
    ];
  }
  if (to === "monitor") return [{ kind: "event", rate: 1 }];
  if (to && ["db", "storage", "search", "vector"].includes(to)) {
    return [
      { kind: "write", rate: 1 },
      { kind: "response", back: true, rate: 1 },
    ];
  }
  return [
    { kind: "request", rate: 1 },
    { kind: "response", back: true, rate: 1 },
  ];
}

/** The design as a 3D scene: columns run left to right, rows top to bottom on screen. */
export function toScene(d: Design): Scene {
  return {
    nodes: d.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      x: (1.25 * n.col + 2.1 * n.row) / 2,
      y: (2.1 * n.row - 1.25 * n.col) / 2,
    })),
    links: d.links.map((l) => ({ from: l.from, to: l.to, flows: flowsOf(d, l) })),
  };
}
