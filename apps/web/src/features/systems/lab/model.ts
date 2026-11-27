import type { Level, NodeKind, Scene } from "../model";

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
    links: d.links.map((l) =>
      l.mode === "sync"
        ? {
            from: l.from,
            to: l.to,
            flows: [
              { kind: "request", rate: 1 },
              { kind: "response", back: true, rate: 1 },
            ],
          }
        : { from: l.from, to: l.to, flows: [{ kind: "event", rate: 2 }] },
    ),
  };
}
