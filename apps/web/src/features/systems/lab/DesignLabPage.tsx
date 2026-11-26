import {
  ArrowLeft,
  ArrowLeftRight,
  Cable,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { findCase } from "../cases";
import { ICON, IsoScene, sceneBounds } from "../IsoScene";
import { findLesson } from "../lessons";
import { KIND_HUE, type NodeKind } from "../model";
import { markDone } from "../progress";
import { grade, type Grade, PASS_SCORE } from "./grade";
import {
  defaultMode,
  type Design,
  type DesignNode,
  GRID_COLS,
  GRID_ROWS,
  type LabProblem,
  type LinkMode,
  type PaletteItem,
  toScene,
} from "./model";
import { findProblem } from "./problems";
import { readBest, readDraft, saveBest, saveDraft } from "./storage";

const CELL_W = 88;
const CELL_H = 72;
const BOX_W = 80;
const BOX_H = 56;

const backLink =
  "inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline";
const button =
  "inline-flex items-center gap-1.5 rounded-control border border-line bg-raised px-3 py-1.5 text-sm font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "inline-flex items-center gap-1.5 rounded-control bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-90";

/** The free cell nearest to (col, row), or undefined when the grid is full. */
function nearestFree(design: Design, col: number, row: number, ignore?: string) {
  const taken = new Set(
    design.nodes.filter((n) => n.id !== ignore).map((n) => `${n.col},${n.row}`),
  );
  let best: { col: number; row: number; d: number } | undefined;
  for (let c = 0; c < GRID_COLS; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (taken.has(`${c},${r}`)) continue;
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

export function DesignLabPage() {
  const { problemId = "" } = useParams();
  const problem = findProblem(problemId);
  const { t } = useTranslation();
  useDocumentTitle(problem ? problem.title : t("lab.title"));
  if (!problem) {
    return (
      <div className="space-y-4">
        <Link to="/systems/lab" className={backLink}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("lab.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("lab.missing", { id: problemId })}</p>
      </div>
    );
  }
  return <Editor key={problem.id} problem={problem} />;
}

function Editor({ problem }: { problem: LabProblem }) {
  const { t } = useTranslation();
  const [design, setDesign] = useState<Design>(() => readDraft(problem.id));
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Grade | null>(null);
  const [checked, setChecked] = useState<Design | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [best, setBest] = useState(() => readBest(problem.id));
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

  useEffect(() => saveDraft(problem.id, design), [problem.id, design]);
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
    const c = Math.min(Math.max(col, 0), GRID_COLS - 1);
    const r = Math.min(Math.max(row, 0), GRID_ROWS - 1);
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
    const g = grade(problem, design);
    setResult(g);
    setChecked(design);
    saveBest(problem.id, g.score);
    setBest(readBest(problem.id) ?? g.score);
    if (g.score >= PASS_SCORE) markDone(`lab:${problem.id}`);
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
    return {
      col: Math.min(GRID_COLS - 1, Math.floor(x / (rect.width / GRID_COLS))),
      row: Math.min(GRID_ROWS - 1, Math.floor(y / (rect.height / GRID_ROWS))),
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
  }

  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
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
      const c = n.col + delta[0];
      const r = n.row + delta[1];
      if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) return;
      if (design.nodes.some((m) => m.col === c && m.row === r)) return;
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
  const answerScene = useMemo(() => toScene(problem.answer), [problem.answer]);
  const mineScene = useMemo(() => toScene(checked ?? design), [checked, design]);
  const caseStudy = problem.caseId ? findCase(problem.caseId)?.cs : undefined;
  const helpId = useId();

  return (
    <article className="space-y-5">
      <Link to="/systems/lab" className={backLink}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("lab.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-sm text-muted">{t("lab.title")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{problem.title}</h1>
        <p className="max-w-prose text-muted">{problem.tagline}</p>
        <p className="flex flex-wrap gap-2 text-xs text-muted">
          <span>{t(`catalog.level.${problem.level}`)}</span>
          <span aria-hidden="true">·</span>
          <span>{t("systems.minutes", { count: problem.minutes })}</span>
          <span aria-hidden="true">·</span>
          <span>{best === undefined ? t("lab.notTried") : t("lab.best", { score: best })}</span>
        </p>
      </header>

      <section className="grid gap-4 rounded-panel border border-line bg-raised p-4 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">{t("lab.brief")}</h2>
          {problem.brief.map((p) => (
            <p key={p} className="text-sm">
              {p}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">{t("lab.requirements")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {problem.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="pt-1 text-sm text-muted">
            {t("lab.practises")}{" "}
            {problem.concepts.map((c, i) => {
              const lesson = findLesson(c)?.lesson;
              if (!lesson) return null;
              return (
                <span key={c}>
                  {i > 0 && ", "}
                  <Link
                    to={`/systems/${c}`}
                    className="text-accent-ink underline underline-offset-2"
                  >
                    {lesson.title}
                  </Link>
                </span>
              );
            })}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
        {/* Palette */}
        <section aria-labelledby={`${helpId}-palette`} className="space-y-2">
          <h2 id={`${helpId}-palette`} className="font-semibold">
            {t("lab.palette")}
          </h2>
          <p className="text-xs text-muted">{t("lab.paletteHelp")}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {problem.palette.map((item) => {
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
                    "linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)",
                  backgroundSize: `${CELL_W}px ${CELL_H}px`,
                  transform: scale === 1 ? undefined : `scale(${scale})`,
                  transformOrigin: "0 0",
                }}
              >
                <Links design={design} />
                {design.nodes.length === 0 && (
                  <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
                    {t("lab.empty")}
                  </p>
                )}
                {design.nodes.map((n) => {
                  const Icon = ICON[n.kind];
                  const isSel = n.id === selected;
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
                      className={`scene-hue-${KIND_HUE[n.kind]} absolute flex touch-none flex-col items-center justify-center gap-0.5 rounded-control border-2 bg-raised px-1 text-center text-[11px] leading-tight font-medium shadow-sm ${
                        isSel ? "border-accent ring-2 ring-accent/40" : "border-[var(--h)]"
                      } ${connecting && connecting !== n.id ? "cursor-crosshair" : "cursor-grab"}`}
                      style={{
                        left: n.col * CELL_W + (CELL_W - BOX_W) / 2,
                        top: n.row * CELL_H + (CELL_H - BOX_H) / 2,
                        width: BOX_W,
                        height: BOX_H,
                      }}
                    >
                      <Icon className="size-4 text-[var(--h)]" aria-hidden="true" />
                      <span className="line-clamp-2">{n.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
            {result.results.map(({ check: c, passed }) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                {passed ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-found-ink" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                )}
                <span>
                  <span className="sr-only">{passed ? t("lab.passed") : t("lab.missed")}: </span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted"> · {t("lab.points", { count: c.points })}</span>
                  {!passed && <span className="block text-muted">{c.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className={button} onClick={() => setShowAnswer((s) => !s)}>
            {showAnswer ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
            {showAnswer ? t("lab.hideAnswer") : t("lab.showAnswer")}
          </button>
          {showAnswer && (
            <div className="space-y-3">
              <h3 className="font-semibold">{t("lab.why")}</h3>
              {problem.explain.map((p) => (
                <p key={p} className="text-sm">
                  {p}
                </p>
              ))}
              <div className="grid gap-3 md:grid-cols-2">
                <Scene3D title={t("lab.yours")} scene={mineScene} />
                <Scene3D title={t("lab.answer")} scene={answerScene} />
              </div>
              {caseStudy && (
                <p className="text-sm">
                  <Link
                    to={`/systems/case/${caseStudy.id}`}
                    className="text-accent-ink underline underline-offset-2"
                  >
                    {t("lab.readCase", { title: caseStudy.title })}
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {ghost && (
        <div
          aria-hidden="true"
          className={`scene-hue-${KIND_HUE[ghost.item.kind]} pointer-events-none fixed z-50 rounded-control border-2 border-[var(--h)] bg-raised px-2 py-1 text-xs font-medium shadow-lg`}
          style={{ left: ghost.x + 8, top: ghost.y + 8 }}
        >
          {ghost.item.label}
        </div>
      )}
    </article>
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

/** Arrows between boxes: solid when the caller waits, dashed when it sends and moves on. */
function Links({ design }: { design: Design }) {
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
        const ax = a.col * CELL_W + CELL_W / 2;
        const ay = a.row * CELL_H + CELL_H / 2;
        const bx = b.col * CELL_W + CELL_W / 2;
        const by = b.row * CELL_H + CELL_H / 2;
        // Stop the line at the edge of the target box.
        const dx = bx - ax;
        const dy = by - ay;
        const k = Math.min(
          Math.abs(dx) > 0 ? BOX_W / 2 / Math.abs(dx) : Infinity,
          Math.abs(dy) > 0 ? BOX_H / 2 / Math.abs(dy) : Infinity,
        );
        const ex = bx - dx * k;
        const ey = by - dy * k;
        const sx = ax + dx * k;
        const sy = ay + dy * k;
        return (
          <line
            key={`${l.from}-${l.to}`}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray={l.mode === "async" ? "6 5" : undefined}
            markerEnd={`url(#${markerId})`}
          />
        );
      })}
    </svg>
  );
}

function Scene3D({ title, scene }: { title: string; scene: ReturnType<typeof toScene> }) {
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
