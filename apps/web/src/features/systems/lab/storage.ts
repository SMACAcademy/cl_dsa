import { STORAGE_KEYS } from "../../../lib/progress";
import { KIND_HUE, type NodeKind } from "../model";
import { type Design, type DesignLink, type DesignNode, GRID_COLS, GRID_ROWS } from "./model";

/** Per problem: the best score and the current drawing, kept in this browser only. */
type Saved = Record<string, { best?: number; draft?: Design }>;

function readAll(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.lab);
    const data: unknown = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Saved) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Saved): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lab, JSON.stringify(data));
  } catch {
    // Private windows and blocked storage: the drawing just isn't remembered.
  }
}

const isKind = (k: unknown): k is NodeKind => typeof k === "string" && k in KIND_HUE;
const inGrid = (c: unknown, max: number) =>
  Number.isInteger(c) && (c as number) >= 0 && (c as number) < max;

/** A saved design, keeping only boxes and links that still make sense. */
export function cleanDesign(value: unknown): Design {
  const v = (value ?? {}) as { nodes?: unknown; links?: unknown };
  const nodes: DesignNode[] = [];
  const cells = new Set<string>();
  for (const raw of Array.isArray(v.nodes) ? v.nodes : []) {
    const n = raw as Partial<DesignNode>;
    if (typeof n.id !== "string" || typeof n.label !== "string" || !isKind(n.kind)) continue;
    if (!inGrid(n.col, GRID_COLS) || !inGrid(n.row, GRID_ROWS)) continue;
    const cell = `${n.col},${n.row}`;
    if (cells.has(cell) || nodes.some((m) => m.id === n.id)) continue;
    cells.add(cell);
    nodes.push({
      id: n.id,
      kind: n.kind,
      label: n.label.slice(0, 40),
      col: n.col as number,
      row: n.row as number,
      ...(typeof n.role === "string" ? { role: n.role } : {}),
    });
  }
  const ids = new Set(nodes.map((n) => n.id));
  const links: DesignLink[] = [];
  for (const raw of Array.isArray(v.links) ? v.links : []) {
    const l = raw as Partial<DesignLink>;
    if (typeof l.from !== "string" || typeof l.to !== "string") continue;
    if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to) continue;
    if (l.mode !== "sync" && l.mode !== "async") continue;
    links.push({ from: l.from, to: l.to, mode: l.mode });
  }
  return { nodes, links };
}

export function readDraft(problemId: string): Design {
  return cleanDesign(readAll()[problemId]?.draft);
}

export function saveDraft(problemId: string, design: Design): void {
  const all = readAll();
  all[problemId] = { ...all[problemId], draft: design };
  writeAll(all);
}

export function readBest(problemId: string): number | undefined {
  const best = readAll()[problemId]?.best;
  return typeof best === "number" ? best : undefined;
}

export function saveBest(problemId: string, score: number): void {
  const all = readAll();
  const old = all[problemId]?.best ?? -1;
  if (score <= old) return;
  all[problemId] = { ...all[problemId], best: score };
  writeAll(all);
}
