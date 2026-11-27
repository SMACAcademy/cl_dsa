import {
  ArrowLeftRight,
  Cable,
  Box,
  Check,
  ClipboardCheck,
  Lightbulb,
  Minus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FlowGlyph } from "../FlowGlyph";
import { ICON, IsoScene, sceneBounds, usePrefersReducedMotion } from "../IsoScene";
import { type FlowKind, KIND_HUE, type NodeKind, type Scene } from "../model";
import { grade, type Grade } from "./grade";
import {
  type Check as LabCheck,
  defaultMode,
  type Design,
  type DesignLink,
  flowsOf,
  type DesignNode,
  GRID_COLS,
  GRID_ROWS,
  type LinkMode,
  type PaletteItem,
  toScene,
} from "./model";

const CELL_W = 88;
const CELL_H = 72;
const BOX_W = 80;
const BOX_H = 56;

export const button =
  "inline-flex items-center gap-1.5 rounded-control border border-line bg-raised px-3 py-1.5 text-sm font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50";
export const primary =
  "inline-flex items-center gap-1.5 rounded-control bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90";

/** Boxes sit on half-cell steps, so the canvas feels free while lines stay tidy. */
const STEP = 0.5;
const snap = (v: number) => Math.round(v / STEP) * STEP;
const clampCol = (c: number) => Math.min(Math.max(c, 0), GRID_COLS - 1);
const clampRow = (r: number) => Math.min(Math.max(r, 0), GRID_ROWS - 1);

/** Two boxes would overlap if they are less than a whole cell apart both ways. */
const overlaps = (n: DesignNode, col: number, row: number) =>
  Math.abs(n.col - col) < 1 && Math.abs(n.row - row) < 1;

const isFree = (design: Design, col: number, row: number, ignore?: string) =>
  !design.nodes.some((n) => n.id !== ignore && overlaps(n, col, row));

/** The free spot nearest to (col, row), on half steps, or undefined when there is none. */
function nearestFree(design: Design, col: number, row: number, ignore?: string) {
  let best: { col: number; row: number; d: number } | undefined;
  for (let c = 0; c <= GRID_COLS - 1; c += STEP) {
    for (let r = 0; r <= GRID_ROWS - 1; r += STEP) {
      if (!isFree(design, c, r, ignore)) continue;
      const d = (c - col) ** 2 + (r - row) ** 2;
      if (!best || d < best.d) best = { col: c, row: r, d };
    }
  }
  return best;
}

function newId(design: Design, kind: string) {
  let i = design.nodes.length + 1;
  while (design.nodes.some((n) => n.id === `${kind}-${i}`)) i++;
  return `${kind}-${i}`;
}

const sameItem = (n: DesignNode, item: PaletteItem) => n.kind === item.kind && n.role === item.role;

export type EditorProps = {
  /** The boxes on offer. */
  palette: readonly PaletteItem[];
  /** What "Check my design" marks. */
  checks: readonly LabCheck[];
  /** The drawing to start from (read once). */
  initial: Design;
  /** Called with every change, to save the drawing. Keep it stable (useCallback). */
  onChange: (design: Design) => void;
  /** Called after each check. */
  onChecked?: (result: Grade) => void;
  /** Extra content at the end of the result panel, given the checked design as a 3D scene. */
  resultExtra?: (mine: Scene) => ReactNode;
  /** Content after the result panel, given the current design and the latest result. */
  after?: (design: Design, result: Grade | null) => ReactNode;
};

/**
 * The drawing board: palette, canvas, inspector, connections and marking. Used by the set
 * problems and by problems learners write themselves.
 */
export function DesignEditor({
  palette,
  checks,
  initial,
  onChange,
  onChecked,
  resultExtra,
  after,
}: EditorProps) {
  const { t } = useTranslation();
  const [design, setDesign] = useState<Design>(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Grade | null>(null);
  const [checked, setChecked] = useState<Design | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  /** Where a box being dragged is right now, before it snaps into place. */
  const [dragging, setDragging] = useState<{ id: string; col: number; row: number } | null>(null);
  const [show3D, setShow3D] = useState(false);
  /** How far each check's hint has been revealed: 1 = what to look at, 2 = how to fix it. */
  const [hints, setHints] = useState<Record<string, number>>({});
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [hintNote, setHintNote] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const reduced = usePrefersReducedMotion();
  const canvas = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Shrink the canvas to fit its column (down to 60%); below that it scrolls.
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.max(0.6, Math.min(1, (w - 2) / (GRID_COLS * CELL_W))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const boxRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusNext = useRef<string | null>(null);

  useEffect(() => onChange(design), [onChange, design]);
  useEffect(() => {
    if (!focusNext.current) return;
    boxRefs.current.get(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const byId = useMemo(() => new Map(design.nodes.map((n) => [n.id, n])), [design.nodes]);
  const nameOf = (id: string) => byId.get(id)?.label ?? id;
  const sel = selected ? byId.get(selected) : undefined;

  /* ---- editing ---- */

  function add(item: PaletteItem, col = 0, row = 0) {
    const cell = nearestFree(design, col, row);
    if (!cell) {
      setStatus(t("lab.status.full"));
      return;
    }
    const id = newId(design, item.kind);
    const node: DesignNode = {
      id,
      kind: item.kind,
      label: item.label,
      col: cell.col,
      row: cell.row,
      ...(item.role ? { role: item.role } : {}),
    };
    setDesign((d) => ({ ...d, nodes: [...d.nodes, node] }));
    setSelected(id);
    focusNext.current = id;
    setStatus(t("lab.status.added", { label: item.label, col: cell.col + 1, row: cell.row + 1 }));
  }

  function move(id: string, col: number, row: number) {
    const c = clampCol(snap(col));
    const r = clampRow(snap(row));
    const cell = nearestFree(design, c, r, id);
    if (!cell) return;
    setDesign((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id ? { ...n, col: cell.col, row: cell.row } : n)),
    }));
    setStatus(t("lab.status.moved", { label: nameOf(id), col: cell.col + 1, row: cell.row + 1 }));
  }

  function remove(id: string) {
    const label = nameOf(id);
    setDesign((d) => ({
      nodes: d.nodes.filter((n) => n.id !== id),
      links: d.links.filter((l) => l.from !== id && l.to !== id),
    }));
    setSelected(null);
    setConnecting(null);
    setStatus(t("lab.status.removed", { label }));
  }

  function connect(from: string, to: string) {
    setConnecting(null);
    if (from === to) return;
    if (
      design.links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))
    ) {
      setStatus(t("lab.status.already", { from: nameOf(from), to: nameOf(to) }));
      return;
    }
    const f = byId.get(from);
    const tNode = byId.get(to);
    if (!f || !tNode) return;
    setDesign((d) => ({
      ...d,
      links: [...d.links, { from, to, mode: defaultMode(f.kind, tNode.kind) }],
    }));
    setStatus(t("lab.status.connected", { from: f.label, to: tNode.label }));
  }

  function rename(id: string, label: string) {
    setDesign((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id ? { ...n, label: label.slice(0, 40) } : n)),
    }));
  }

  function setMode(i: number, mode: LinkMode) {
    setDesign((d) => ({ ...d, links: d.links.map((l, j) => (j === i ? { ...l, mode } : l)) }));
  }

  function reverse(i: number) {
    setDesign((d) => ({
      ...d,
      links: d.links.map((l, j) => (j === i ? { ...l, from: l.to, to: l.from } : l)),
    }));
  }

  function unlink(i: number) {
    setDesign((d) => ({ ...d, links: d.links.filter((_, j) => j !== i) }));
  }

  function clear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setDesign({ nodes: [], links: [] });
    setSelected(null);
    setResult(null);
    setStatus(t("lab.status.cleared"));
  }

  function check() {
    const g = grade({ checks }, design);
    setResult(g);
    setChecked(design);
    onChecked?.(g);
    setStatus(t("lab.status.checked", { score: g.score }));
  }

  /* ---- pointer: drag boxes, drop palette items ---- */

  const drag = useRef<{
    id?: string;
    item?: PaletteItem;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; item: PaletteItem } | null>(null);
  const suppressClick = useRef(false);

  function cellAt(clientX: number, clientY: number) {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return undefined;
    // The pointer holds the middle of the box.
    return {
      col: clampCol(x / (rect.width / GRID_COLS) - 0.5),
      row: clampRow(y / (rect.height / GRID_ROWS) - 0.5),
    };
  }

  function onPointerDown(e: ReactPointerEvent, start: { id?: string; item?: PaletteItem }) {
    if (e.button !== 0) return;
    drag.current = { ...start, x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
    if (d.moved && d.item) setGhost({ x: e.clientX, y: e.clientY, item: d.item });
    if (d.moved && d.id) {
      const spot = cellAt(e.clientX, e.clientY);
      if (spot) setDragging({ id: d.id, ...spot });
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    setDragging(null);
    if (!d?.moved) return;
    suppressClick.current = true;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    if (d.item) add(d.item, cell.col, cell.row);
    else if (d.id) move(d.id, cell.col, cell.row);
  }

  function takeClick() {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  }

  function onBoxClick(id: string) {
    if (takeClick()) return;
    if (connecting && connecting !== id) {
      connect(connecting, id);
      return;
    }
    setSelected(id === selected ? null : id);
  }

  function onBoxKey(e: KeyboardEvent, n: DesignNode) {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = step[e.key];
    if (delta) {
      e.preventDefault();
      // Arrows move a whole cell; with Shift, half a cell.
      const by = e.shiftKey ? STEP : 1;
      const c = n.col + delta[0] * by;
      const r = n.row + delta[1] * by;
      if (c < 0 || r < 0 || c > GRID_COLS - 1 || r > GRID_ROWS - 1) return;
      if (!isFree(design, c, r, n.id)) return;
      move(n.id, c, r);
      setSelected(n.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(n.id);
    } else if (e.key.toLowerCase() === "c") {
      e.preventDefault();
      setSelected(n.id);
      setConnecting(n.id);
      setStatus(t("lab.connecting", { label: n.label }));
    } else if (e.key === "Escape") {
      setConnecting(null);
    }
  }

  /* ---- render ---- */

  const kindName = (k: NodeKind): string => t(`lab.kind.${k}`);
  const stale = result !== null && checked !== design;
  const mineScene = useMemo(() => toScene(checked ?? design), [checked, design]);
  const helpId = useId();

  /** The design as drawn right now, with a dragged box under the pointer. */
  const shown = useMemo<Design>(
    () =>
      dragging
        ? {
            ...design,
            nodes: design.nodes.map((n) =>
              n.id === dragging.id ? { ...n, col: dragging.col, row: dragging.row } : n,
            ),
          }
        : design,
    [design, dragging],
  );
  const liveScene = useMemo(() => toScene(design), [design]);
  const linkedIds = new Set(design.links.flatMap((l) => [l.from, l.to]));
  const usedFlows = FLOW_ORDER.filter((k) =>
    design.links.some((l) => flowsOf(design, l).some((f) => f.kind === k)),
  );

  /** The next step of help: what to look at, then how to fix it, one missed check at a time. */
  function hint() {
    const g = grade({ checks }, design);
    const missed = g.results.filter((r) => r.applies && !r.passed);
    setHintsUsed((n) => n + 1);
    if (missed.length === 0) {
      setHintFor(null);
      setHintNote(t("lab.hint.none"));
      return;
    }
    const next = missed.find((r) => (hints[r.check.id] ?? 0) < 2) ?? missed[0];
    if (!next) return;
    const id = next.check.id;
    const level = Math.min(2, (hints[id] ?? 0) + 1);
    setHints((h) => ({ ...h, [id]: level }));
    setHintFor(id);
    setHintNote("");
  }
  const hintCheck = checks.find((c) => c.id === hintFor);
  const hintLevel = hintFor ? (hints[hintFor] ?? 0) : 0;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
        {/* Palette */}
        <section aria-labelledby={`${helpId}-palette`} className="space-y-2">
          <h2 id={`${helpId}-palette`} className="font-semibold">
            {t("lab.palette")}
          </h2>
          <p className="text-xs text-muted">{t("lab.paletteHelp")}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {palette.map((item) => {
              const Icon = ICON[item.kind];
              const full =
                item.max !== undefined &&
                design.nodes.filter((n) => sameItem(n, item)).length >= item.max;
              return (
                <li key={`${item.kind}-${item.role ?? ""}`}>
                  <button
                    type="button"
                    disabled={full}
                    title={item.hint}
                    aria-label={t("lab.add", { label: item.label })}
                    onPointerDown={(e) => !full && onPointerDown(e, { item })}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClick={() => {
                      if (takeClick()) return;
                      add(item);
                    }}
                    className={`scene-hue-${KIND_HUE[item.kind]} flex w-full touch-none items-center gap-2 rounded-control border border-line bg-raised px-2 py-1.5 text-left text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Icon className="size-4 shrink-0 text-[var(--h)]" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.label}</span>
                      <span className="block truncate text-[11px] text-muted">{item.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Canvas */}
        <section aria-labelledby={`${helpId}-canvas`} className="min-w-0 space-y-2">
          <h2 id={`${helpId}-canvas`} className="font-semibold">
            {t("lab.canvas")}
          </h2>
          <p id={`${helpId}-help`} className="text-xs text-muted">
            {t("lab.canvasHelp")}
          </p>
          <div className="min-h-10">
            {connecting && (
              <p className="flex flex-wrap items-center gap-2 rounded-control bg-accent-soft px-3 py-1 text-sm">
                {t("lab.connecting", { label: nameOf(connecting) })}
                <button type="button" className={button} onClick={() => setConnecting(null)}>
                  <X className="size-4" aria-hidden="true" />
                  {t("lab.cancel")}
                </button>
              </p>
            )}
          </div>
          <div ref={frame} className="overflow-auto rounded-panel border border-line bg-surface">
            <div style={{ width: GRID_COLS * CELL_W * scale, height: GRID_ROWS * CELL_H * scale }}>
              <div
                ref={canvas}
                role="group"
                aria-label={t("lab.canvas")}
                aria-describedby={`${helpId}-help`}
                className="relative"
                style={{
                  width: GRID_COLS * CELL_W,
                  height: GRID_ROWS * CELL_H,
                  backgroundImage:
                    "radial-gradient(circle, var(--color-line) 1.4px, transparent 1.6px)",
                  backgroundSize: `${CELL_W / 2}px ${CELL_H / 2}px`,
                  backgroundPosition: `${CELL_W / 4}px ${CELL_H / 4}px`,
                  transform: scale === 1 ? undefined : `scale(${scale})`,
                  transformOrigin: "0 0",
                }}
              >
                <Links design={shown} animate={!reduced && !dragging} />
                {design.nodes.length === 0 && (
                  <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
                    {t("lab.empty")}
                  </p>
                )}
                {shown.nodes.map((n) => {
                  const Icon = ICON[n.kind];
                  const isSel = n.id === selected;
                  const lifted = dragging?.id === n.id;
                  const lonely = design.nodes.length > 1 && !linkedIds.has(n.id);
                  return (
                    <button
                      key={n.id}
                      ref={(el) => {
                        if (el) boxRefs.current.set(n.id, el);
                        else boxRefs.current.delete(n.id);
                      }}
                      type="button"
                      aria-pressed={isSel}
                      aria-label={t("lab.nodeName", {
                        label: n.label,
                        kind: kindName(n.kind),
                        col: n.col + 1,
                        row: n.row + 1,
                      })}
                      onPointerDown={(e) => onPointerDown(e, { id: n.id })}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onClick={() => onBoxClick(n.id)}
                      onKeyDown={(e) => onBoxKey(e, n)}
                      title={lonely ? t("lab.unconnected") : undefined}
                      className={`lab-box scene-hue-${KIND_HUE[n.kind]} absolute flex touch-none flex-col items-center justify-center gap-0.5 rounded-control border-2 px-1 text-center text-[11px] leading-tight font-medium ${
                        isSel ? "border-accent ring-2 ring-accent/40" : "border-[var(--h)]"
                      } ${connecting && connecting !== n.id ? "cursor-crosshair" : "cursor-grab"} ${
                        lifted ? "lab-box-lifted z-10" : ""
                      }`}
                      style={{
                        left: n.col * CELL_W + (CELL_W - BOX_W) / 2,
                        top: n.row * CELL_H + (CELL_H - BOX_H) / 2,
                        width: BOX_W,
                        height: BOX_H,
                      }}
                    >
                      <Icon className="size-4 text-[var(--h)]" aria-hidden="true" />
                      <span className="line-clamp-2">{n.label}</span>
                      {lonely && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full bg-compare text-[10px] font-bold text-surface"
                        >
                          !
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            {usedFlows.length > 0 && <span className="sr-only">{t("systems.legend")}</span>}
            {usedFlows.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="-8 -8 16 16" className="size-4">
                  <FlowGlyph kind={k} />
                </svg>
                {t(`systems.flow.${k}`)}
              </span>
            ))}
            <button
              type="button"
              className={`${button} ml-auto`}
              aria-pressed={show3D}
              onClick={() => setShow3D((s) => !s)}
            >
              <Box className="size-4" aria-hidden="true" />
              {t("lab.view3d")}
            </button>
          </div>
          {show3D && <Scene3D title={t("lab.live3d")} scene={liveScene} />}
          <p role="status" className="min-h-5 text-sm text-muted">
            {status}
          </p>
          {/* Inspector */}
          <section aria-labelledby={`${helpId}-inspector`} className="max-w-xl space-y-3">
            <h2 id={`${helpId}-inspector`} className="font-semibold">
              {t("lab.inspector")}
            </h2>
            {sel ? (
              <Inspector
                key={sel.id}
                node={sel}
                others={design.nodes.filter((n) => n.id !== sel.id)}
                kindName={kindName(sel.kind)}
                onRename={(label) => rename(sel.id, label)}
                onConnect={(to) => connect(sel.id, to)}
                onConnectByClick={() => {
                  setConnecting(sel.id);
                  setStatus(t("lab.connecting", { label: sel.label }));
                }}
                onRemove={() => remove(sel.id)}
              />
            ) : (
              <p className="text-sm text-muted">{t("lab.nothingSelected")}</p>
            )}
          </section>
        </section>
      </div>

      {/* Connections, the accessible view of the arrows */}
      <section aria-labelledby={`${helpId}-links`} className="space-y-2">
        <h2 id={`${helpId}-links`} className="font-semibold">
          {t("lab.connections")}
        </h2>
        {design.links.length === 0 ? (
          <p className="text-sm text-muted">{t("lab.noConnections")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {design.links.map((l, i) => {
              const text = t("lab.link", { from: nameOf(l.from), to: nameOf(l.to) });
              return (
                <li
                  key={`${l.from}-${l.to}`}
                  className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-raised px-3 py-2 text-sm"
                >
                  <span className="min-w-0 basis-full font-medium sm:basis-auto sm:flex-1">
                    {text}
                  </span>
                  <select
                    aria-label={t("lab.modeOf", { link: text })}
                    value={l.mode}
                    onChange={(e) => setMode(i, e.target.value as LinkMode)}
                    className="rounded-control border border-line bg-raised px-2 py-1 text-sm"
                  >
                    <option value="sync">{t("lab.mode.sync")}</option>
                    <option value="async">{t("lab.mode.async")}</option>
                  </select>
                  <button
                    type="button"
                    className={button}
                    aria-label={t("lab.reverseOf", { link: text })}
                    onClick={() => reverse(i)}
                  >
                    <ArrowLeftRight className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={button}
                    aria-label={t("lab.removeLink", { link: text })}
                    onClick={() => unlink(i)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} onClick={check}>
          <ClipboardCheck className="size-4" aria-hidden="true" />
          {t("lab.check")}
        </button>
        <button type="button" className={button} onClick={hint}>
          <Lightbulb className="size-4" aria-hidden="true" />
          {t("lab.hint.button")}
        </button>
        <button
          type="button"
          className={button}
          onClick={clear}
          onBlur={() => setConfirmClear(false)}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {confirmClear ? t("lab.confirmClear") : t("lab.startAgain")}
        </button>
        <span className="text-xs text-muted">{t("lab.saved")}</span>
      </div>

      <div aria-live="polite">
        {(hintCheck || hintNote) && (
          <section
            aria-labelledby={`${helpId}-hint`}
            className="space-y-2 rounded-panel border border-compare/50 bg-compare-soft/40 p-4 text-sm"
          >
            <h2 id={`${helpId}-hint`} className="flex items-center gap-2 font-semibold">
              <Lightbulb className="size-4 text-compare-ink" aria-hidden="true" />
              {t("lab.hint.title")}
              <span className="text-xs font-normal text-muted">
                {t("lab.hint.used", { count: hintsUsed })}
              </span>
            </h2>
            {hintNote ? (
              <p>{hintNote}</p>
            ) : (
              hintCheck && (
                <>
                  <p>{t("lab.hint.lookAt", { label: hintCheck.label })}</p>
                  {hintLevel >= 2 ? (
                    <p>{t("lab.hint.tryThis", { hint: hintCheck.hint })}</p>
                  ) : (
                    <p className="text-muted">{t("lab.hint.more")}</p>
                  )}
                </>
              )
            )}
          </section>
        )}
      </div>

      {result && (
        <section
          aria-labelledby={`${helpId}-result`}
          className="space-y-4 rounded-panel border border-line bg-raised p-4"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id={`${helpId}-result`} className="font-semibold">
              {t("lab.result")}
            </h2>
            <p className="text-3xl font-semibold tabular-nums">
              {t("lab.score", { score: result.score })}
            </p>
            <p className="font-medium text-accent-ink">{t(`lab.band.${result.band}`)}</p>
          </div>
          {stale && <p className="text-sm text-muted">{t("lab.stale")}</p>}
          <ul className="space-y-2">
            {result.results.map(({ check: c, passed, applies }) => (
              <li
                key={c.id}
                className={`flex items-start gap-2 text-sm ${applies ? "" : "text-muted"}`}
              >
                {!applies ? (
                  <Minus className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                ) : passed ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-found-ink" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                )}
                <span>
                  <span className="sr-only">
                    {!applies ? t("lab.notApplicable") : passed ? t("lab.passed") : t("lab.missed")}
                    :{" "}
                  </span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted">
                    {" "}
                    · {applies ? t("lab.points", { count: c.points }) : t("lab.notApplicableShort")}
                  </span>
                  {applies && !passed && <span className="block text-muted">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
          {resultExtra?.(mineScene)}
        </section>
      )}

      {after?.(design, result)}

      {ghost && (
        <div
          aria-hidden="true"
          className={`scene-hue-${KIND_HUE[ghost.item.kind]} pointer-events-none fixed z-50 rounded-control border-2 border-[var(--h)] bg-raised px-2 py-1 text-xs font-medium shadow-lg`}
          style={{ left: ghost.x + 8, top: ghost.y + 8 }}
        >
          {ghost.item.label}
        </div>
      )}
    </>
  );
}

function Inspector({
  node,
  others,
  kindName,
  onRename,
  onConnect,
  onConnectByClick,
  onRemove,
}: {
  node: DesignNode;
  others: readonly DesignNode[];
  kindName: string;
  onRename: (label: string) => void;
  onConnect: (to: string) => void;
  onConnectByClick: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const chosen = others.some((o) => o.id === target) ? target : (others[0]?.id ?? "");
  return (
    <div className="space-y-3 rounded-panel border border-line bg-raised p-3 text-sm">
      <p className="text-xs text-muted">{kindName}</p>
      <div className="space-y-1">
        <label htmlFor={`${id}-label`} className="block font-medium">
          {t("lab.label")}
        </label>
        <input
          id={`${id}-label`}
          value={node.label}
          maxLength={40}
          onChange={(e) => onRename(e.target.value)}
          className="w-full rounded-control border border-line bg-surface px-2 py-1"
        />
      </div>
      {others.length > 0 && (
        <div className="space-y-1">
          <label htmlFor={`${id}-to`} className="block font-medium">
            {t("lab.connectTo")}
          </label>
          <div className="flex gap-2">
            <select
              id={`${id}-to`}
              value={chosen}
              onChange={(e) => setTarget(e.target.value)}
              className="min-w-0 flex-1 rounded-control border border-line bg-surface px-2 py-1"
            >
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="button" className={button} onClick={() => chosen && onConnect(chosen)}>
              {t("lab.connect")}
            </button>
          </div>
          <button type="button" className={button} onClick={onConnectByClick}>
            <Cable className="size-4" aria-hidden="true" />
            {t("lab.connectClick")}
          </button>
        </div>
      )}
      <button type="button" className={button} onClick={onRemove}>
        <Trash2 className="size-4" aria-hidden="true" />
        {t("lab.remove")}
      </button>
    </div>
  );
}

/** The order flow kinds are listed in the canvas legend. */
const FLOW_ORDER: readonly FlowKind[] = ["request", "response", "token", "write", "event", "file"];

/** Centre of a box on the canvas, in canvas pixels. */
const centre = (n: DesignNode) => ({
  x: n.col * CELL_W + CELL_W / 2,
  y: n.row * CELL_H + CELL_H / 2,
});

/**
 * Arrows between boxes, solid when the caller waits and dashed when it sends and moves on, with
 * what travels along them: dots for requests and replies, envelopes for messages, documents for
 * files, sparks for AI output, blocks for writes. Decorative; the connections list is the
 * accessible view.
 */
function Links({ design, animate }: { design: Design; animate: boolean }) {
  const markerId = useId();
  const byId = new Map(design.nodes.map((n) => [n.id, n]));
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 text-muted"
      width={GRID_COLS * CELL_W}
      height={GRID_ROWS * CELL_H}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {design.links.map((l) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        const p = centre(a);
        const q = centre(b);
        // Stop the line at the edges of both boxes.
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const k = Math.min(
          Math.abs(dx) > 0 ? BOX_W / 2 / Math.abs(dx) : Infinity,
          Math.abs(dy) > 0 ? BOX_H / 2 / Math.abs(dy) : Infinity,
        );
        const s = { x: p.x + dx * k, y: p.y + dy * k };
        const e = { x: q.x - dx * k, y: q.y - dy * k };
        return (
          <g key={`${l.from}-${l.to}`}>
            <line
              x1={s.x}
              y1={s.y}
              x2={e.x}
              y2={e.y}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray={l.mode === "async" ? "6 5" : undefined}
              markerEnd={`url(#${markerId})`}
            />
            {animate && <Traffic design={design} link={l} from={s} to={e} />}
          </g>
        );
      })}
    </svg>
  );
}

type Pt = { x: number; y: number };

/** Glyphs travelling along one link, outbound on one side of the line and replies on the other. */
function Traffic({
  design,
  link,
  from,
  to,
}: {
  design: Design;
  link: DesignLink;
  from: Pt;
  to: Pt;
}) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 24) return null;
  const nx = -(to.y - from.y) / len;
  const ny = (to.x - from.x) / len;
  const flows = flowsOf(design, link);
  const dur = Math.min(3.2, Math.max(1.2, len / 90));
  return (
    <>
      {flows.map((f, i) => {
        const off = flows.length > 1 ? (i === 0 ? -5 : 5) : 0;
        const a = { x: from.x + nx * off, y: from.y + ny * off };
        const b = { x: to.x + nx * off, y: to.y + ny * off };
        const [p, q] = f.back ? [b, a] : [a, b];
        const path = `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        const count = Math.min(3, Math.max(1, f.rate ?? 1));
        return Array.from({ length: count }, (_, j) => {
          const begin = `${(-(j * dur) / count - (f.back ? dur / 2 : 0)).toFixed(2)}s`;
          return (
            <FlowGlyph key={`${f.kind}-${i}-${j}`} kind={f.kind}>
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={path} />
            </FlowGlyph>
          );
        });
      })}
    </>
  );
}

export function Scene3D({ title, scene }: { title: string; scene: ReturnType<typeof toScene> }) {
  const bounds = useMemo(() => sceneBounds([scene]), [scene]);
  return (
    <figure className="space-y-1">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="aspect-[16/11] w-full overflow-hidden rounded-control border border-line bg-surface">
        <IsoScene scene={scene} bounds={bounds} />
      </div>
    </figure>
  );
}
