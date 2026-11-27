import {
  Activity,
  Archive,
  Axis3d,
  Bot,
  Brain,
  Box,
  Clock,
  Cloud,
  Cog,
  Database,
  DoorOpen,
  FolderInput,
  Globe,
  Landmark,
  ListOrdered,
  Lock,
  Monitor,
  NotebookTabs,
  Search,
  Server,
  Signpost,
  Smartphone,
  Split,
  User,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  KIND_HUE,
  type Flow,
  type NodeKind,
  type Scene,
  type SceneLink,
  type SceneNode,
} from "./model";
import { FlowGlyph } from "./FlowGlyph";

/* Geometry: one grid unit is GX across and GY down; boxes are 2A wide, 2B deep, H tall. */
const GX = 76;
const GY = 38;
const A = 40;
const B = 20;
const H = 30;

export function iso(x: number, y: number) {
  return { sx: (x - y) * GX, sy: (x + y) * GY };
}

export const ICON: Record<NodeKind, LucideIcon> = {
  user: User,
  phone: Smartphone,
  browser: Monitor,
  internet: Cloud,
  dns: Signpost,
  lb: Split,
  gateway: DoorOpen,
  server: Server,
  service: Box,
  worker: Cog,
  db: Database,
  storage: Archive,
  search: Search,
  cache: Zap,
  cdn: Globe,
  queue: ListOrdered,
  stream: Waves,
  registry: NotebookTabs,
  lock: Lock,
  monitor: Activity,
  clock: Clock,
  mainframe: Landmark,
  files: FolderInput,
  llm: Brain,
  vector: Axis3d,
  agent: Bot,
};

export type Bounds = { x: number; y: number; w: number; h: number };

/** One camera for every step of a lesson, so the picture never jumps. */
export function sceneBounds(scenes: readonly Scene[]): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };
  for (const scene of scenes) {
    for (const n of scene.nodes) {
      const { sx, sy } = iso(n.x, n.y);
      const s = n.size ?? 1;
      const tower = n.queue ? Math.min(n.queue, 8) * 8 + 14 : 0;
      const half = Math.max(A * s + 8, n.label.length * 3.7 + 10, (n.sub?.length ?? 0) * 3.2 + 10);
      add(sx - half, sy - (H + B) * s - 12 - tower);
      add(sx + half, sy + B * s + (n.sub ? 38 : 24));
    }
    for (const z of scene.zones ?? []) {
      for (const [x, y] of [
        [z.x1, z.y1],
        [z.x2, z.y1],
        [z.x2, z.y2],
        [z.x1, z.y2],
      ] as const) {
        const p = iso(x, y);
        add(p.sx, p.sy - 24);
        add(p.sx, p.sy + 10);
      }
    }
    for (const note of scene.notes ?? []) {
      const p = iso(note.x, note.y);
      const half = note.text.length * 3.4 + 12;
      add(p.sx - half, p.sy - 16);
      add(p.sx + half, p.sy + 16);
    }
  }
  if (!Number.isFinite(minX)) return { x: -200, y: -120, w: 400, h: 240 };
  const pad = 16;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

type Props = {
  scene: Scene;
  bounds: Bounds;
  /** Node ids that were not in the previous step: they pop in. */
  fresh?: ReadonlySet<string>;
  paused?: boolean;
};

/**
 * The animated isometric diagram. Boxes are drawn back to front; requests and
 * responses travel as dots along the links with SVG animateMotion, so the
 * animation needs no JavaScript loop and pauses with the SVG.
 */
export function IsoScene({ scene, bounds, fresh, paused = false }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const gridId = useId();
  const reduced = usePrefersReducedMotion();
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    if (paused) el.pauseAnimations?.();
    else el.unpauseAnimations?.();
  }, [paused]);

  const nodes = [...scene.nodes].sort((p, q) => p.x + p.y - (q.x + q.y) || p.x - q.x);

  return (
    <svg
      ref={svg}
      aria-hidden="true"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      <defs>
        <pattern
          id={gridId}
          width={GX * 2}
          height={GY * 2}
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
        >
          <path
            d={`M0 0 L${GX * 2} ${GY * 2} M${GX * 2} 0 L0 ${GY * 2}`}
            className="stroke-line"
            strokeWidth={1}
            fill="none"
          />
        </pattern>
      </defs>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.w}
        height={bounds.h}
        fill={`url(#${gridId})`}
        opacity={0.55}
      />

      {(scene.zones ?? []).map((z) => {
        const pts = [iso(z.x1, z.y1), iso(z.x2, z.y1), iso(z.x2, z.y2), iso(z.x1, z.y2)];
        const top = pts.reduce((best, p) => (p.sy < best.sy ? p : best));
        return (
          <g key={`zone-${z.label}`} className={`scene-hue-${z.hue ?? "slate"}`}>
            <polygon
              points={pts.map((p) => `${p.sx},${p.sy}`).join(" ")}
              className="scene-zone"
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
            <text
              x={top.sx}
              y={top.sy - 8}
              textAnchor="middle"
              className="scene-zone-label text-[11px] font-semibold tracking-wide uppercase"
            >
              {z.label}
            </text>
          </g>
        );
      })}

      {(scene.links ?? []).map((l) => (
        <LinkLine key={`line-${l.from}-${l.to}`} link={l} byId={byId} />
      ))}

      {(scene.links ?? []).map((l) => (
        <LinkFlows key={`flow-${l.from}-${l.to}`} link={l} byId={byId} reduced={reduced} />
      ))}

      {nodes.map((n) => (
        <NodeBox key={n.id} n={n} fresh={fresh?.has(n.id) ?? false} />
      ))}

      {(scene.links ?? [])
        .filter((l) => l.label)
        .map((l) => {
          const a = byId.get(l.from);
          const b = byId.get(l.to);
          if (!a || !b) return null;
          const p = iso((a.x + b.x) / 2, (a.y + b.y) / 2);
          return <Pill key={`label-${l.from}-${l.to}`} x={p.sx} y={p.sy} text={l.label ?? ""} />;
        })}

      {(scene.notes ?? []).map((note) => {
        const p = iso(note.x, note.y);
        return (
          <Pill key={`note-${note.text}`} x={p.sx} y={p.sy} text={note.text} tone={note.tone} />
        );
      })}
    </svg>
  );
}

function ends(link: SceneLink, byId: Map<string, SceneNode>) {
  const a = byId.get(link.from);
  const b = byId.get(link.to);
  if (!a || !b) return null;
  const p = iso(a.x, a.y);
  const q = iso(b.x, b.y);
  return { x1: p.sx, y1: p.sy, x2: q.sx, y2: q.sy };
}

function LinkLine({ link, byId }: { link: SceneLink; byId: Map<string, SceneNode> }) {
  const e = ends(link, byId);
  if (!e) return null;
  const mx = (e.x1 + e.x2) / 2;
  const my = (e.y1 + e.y2) / 2;
  return (
    <g>
      <line
        {...e}
        className="stroke-control"
        strokeWidth={2}
        strokeOpacity={0.55}
        strokeDasharray={link.dashed || link.cut ? "6 5" : undefined}
        strokeLinecap="round"
      />
      {link.cut && (
        <g transform={`translate(${mx} ${my})`}>
          <circle r={11} className="fill-raised stroke-line" strokeWidth={1.5} />
          <path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#e5484d" strokeWidth={2.5} />
        </g>
      )}
    </g>
  );
}

function LinkFlows({
  link,
  byId,
  reduced,
}: {
  link: SceneLink;
  byId: Map<string, SceneNode>;
  reduced: boolean;
}) {
  const e = ends(link, byId);
  const flows = link.flows ?? [];
  if (!e || flows.length === 0 || link.cut) return null;
  const dx = e.x2 - e.x1;
  const dy = e.y2 - e.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return (
    <g>
      {flows.map((f, i) => {
        const off = (i - (flows.length - 1) / 2) * 8;
        const ox = nx * off;
        const oy = ny * off;
        const from = f.back ? { x: e.x2 + ox, y: e.y2 + oy } : { x: e.x1 + ox, y: e.y1 + oy };
        const to = f.back ? { x: e.x1 + ox, y: e.y1 + oy } : { x: e.x2 + ox, y: e.y2 + oy };
        const key = `${f.kind}-${i}`;
        if (reduced) return <StaticArrow key={key} from={from} to={to} kind={f.kind} />;
        return <Dots key={key} flow={f} from={from} to={to} len={len} />;
      })}
    </g>
  );
}

type Pt = { x: number; y: number };

function Dots({ flow, from, to, len }: { flow: Flow; from: Pt; to: Pt; len: number }) {
  const count = Math.min(4, Math.max(1, flow.rate ?? 2));
  const dur = flow.speed ?? Math.min(3, Math.max(0.8, len / 120));
  const fail = flow.kind === "fail";
  const end = fail ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } : to;
  const path = `M${from.x} ${from.y} L${end.x} ${end.y}`;
  return (
    <>
      {Array.from({ length: count }, (_, j) => {
        const begin = `${-((j * dur) / count).toFixed(2)}s`;
        const motion = (
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={path} />
        );
        const fade = fail ? (
          <animate
            attributeName="opacity"
            values="1;1;0"
            dur={`${dur}s`}
            repeatCount="indefinite"
            begin={begin}
          />
        ) : null;
        return (
          <FlowGlyph key={j} kind={flow.kind}>
            {motion}
            {fade}
          </FlowGlyph>
        );
      })}
    </>
  );
}

function StaticArrow({ from, to, kind }: { from: Pt; to: Pt; kind: Flow["kind"] }) {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const x = from.x + (to.x - from.x) * 0.6;
  const y = from.y + (to.y - from.y) * 0.6;
  return (
    <path
      d="M-6 -5 L6 0 L-6 5 Z"
      transform={`translate(${x} ${y}) rotate(${angle})`}
      className={`scene-dot-${kind}`}
    />
  );
}

function NodeBox({ n, fresh }: { n: SceneNode; fresh: boolean }) {
  const { sx, sy } = iso(n.x, n.y);
  const s = n.size ?? 1;
  const a = A * s;
  const b = B * s;
  const h = H * s;
  const hue = n.hue ?? KIND_HUE[n.kind];
  const Icon = ICON[n.kind];
  const down = n.state === "down";
  const k = 1.05 * s;
  const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(" ");
  const top = pts([
    [sx, sy - h - b],
    [sx + a, sy - h],
    [sx, sy - h + b],
    [sx - a, sy - h],
  ]);
  const left = pts([
    [sx - a, sy - h],
    [sx, sy - h + b],
    [sx, sy + b],
    [sx - a, sy],
  ]);
  const right = pts([
    [sx, sy - h + b],
    [sx + a, sy - h],
    [sx + a, sy],
    [sx, sy + b],
  ]);
  const dash = down ? "5 4" : undefined;
  const queue = Math.min(n.queue ?? 0, 8);

  return (
    <g className={fresh ? "scene-pop" : undefined}>
      <g
        className={`scene-hue-${hue} ${down ? "scene-down" : ""} ${n.state === "dim" ? "opacity-40" : ""}`}
      >
        {n.state === "hot" && (
          <ellipse cx={sx} cy={sy} rx={a + 14} ry={b + 8} className="scene-hot" />
        )}
        {n.state === "lit" && (
          <ellipse cx={sx} cy={sy} rx={a + 12} ry={b + 7} className="scene-lit" />
        )}
        <polygon
          points={left}
          className="scene-face-left scene-edge"
          strokeWidth={1.4}
          strokeDasharray={dash}
        />
        <polygon
          points={right}
          className="scene-face-right scene-edge"
          strokeWidth={1.4}
          strokeDasharray={dash}
        />
        <polygon
          points={top}
          className="scene-face-top scene-edge"
          strokeWidth={1.4}
          strokeDasharray={dash}
        />
        <g
          transform={`matrix(${k} ${k / 2} ${-k} ${k / 2} ${sx} ${sy - h})`}
          className="scene-icon"
        >
          <Icon x={-12} y={-12} width={24} height={24} strokeWidth={2} />
        </g>
        {Array.from({ length: queue }, (_, i) => {
          // Waiting work piles up as a little tower on top of the box.
          const qx = sx;
          const qy = sy - h - 4 - i * 8;
          return (
            <polygon
              key={i}
              points={pts([
                [qx, qy - 10],
                [qx + 7, qy - 6.5],
                [qx + 7, qy + 1],
                [qx, qy + 4.5],
                [qx - 7, qy + 1],
                [qx - 7, qy - 6.5],
              ])}
              className="scene-dot-heavy"
              stroke="var(--surface-raised)"
              strokeWidth={1}
            />
          );
        })}
        {(n.queue ?? 0) > 8 && (
          <text
            x={sx + 12}
            y={sy - h - 62}
            className="fill-compare-ink font-mono text-[11px] font-semibold"
          >
            +{(n.queue ?? 0) - 8}
          </text>
        )}
      </g>
      <text
        x={sx}
        y={sy + b + 17}
        textAnchor="middle"
        className="fill-fg text-[12px] font-semibold"
        stroke="var(--surface)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {n.label}
      </text>
      {n.sub && (
        <text
          x={sx}
          y={sy + b + 31}
          textAnchor="middle"
          className="fill-muted font-mono text-[10px]"
          stroke="var(--surface)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {n.sub}
        </text>
      )}
      {(n.badge || down) && (
        <Pill
          x={sx + a - 2}
          y={sy - h - b + 2}
          text={down ? "✕ down" : (n.badge ?? "")}
          tone={down ? "bad" : n.state === "hot" ? "bad" : "plain"}
          small
        />
      )}
    </g>
  );
}

function Pill({
  x,
  y,
  text,
  tone = "plain",
  small = false,
}: {
  x: number;
  y: number;
  text: string;
  tone?: "good" | "bad" | "plain";
  small?: boolean;
}) {
  const w = text.length * (small ? 6 : 6.6) + (small ? 12 : 18);
  const h = small ? 16 : 20;
  const stroke =
    tone === "good" ? "stroke-found" : tone === "bad" ? "stroke-compare" : "stroke-line";
  const ink = tone === "good" ? "fill-found-ink" : tone === "bad" ? "fill-compare-ink" : "fill-fg";
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        className={`fill-raised ${stroke}`}
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={y + (small ? 3.5 : 4)}
        textAnchor="middle"
        className={`${ink} font-mono ${small ? "text-[10px]" : "text-[11px]"} font-semibold`}
      >
        {text}
      </text>
    </g>
  );
}
