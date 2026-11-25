/** Shared graph drawing: vertices on a circle, optional arrows, weights and labels. */

export type VertexState = "idle" | "current" | "found" | "changed" | "queued";
export type EdgeState = "idle" | "on" | "taken" | "rejected";
export type PictureEdge = { u: string; w: string; label?: string };

const SIZE = 280;
/** Weight labels sit 35% along each edge (not mid-way), so crossing edges keep their labels apart. */
const LABEL_AT = 0.35;

const VERTEX: Record<VertexState, string> = {
  idle: "fill-raised stroke-control",
  current: "fill-accent-soft stroke-accent",
  found: "fill-found-soft stroke-found",
  changed: "fill-compare-soft stroke-compare",
  queued: "fill-compare-soft stroke-compare",
};

const EDGE: Record<EdgeState, string> = {
  idle: "stroke-control",
  on: "stroke-compare",
  taken: "stroke-found",
  rejected: "stroke-line",
};

/** Radius grows with the label so short words fit inside the circle. */
const radiusFor = (label: string) => Math.max(16, label.length * 4.5 + 6);

export function GraphPicture({
  vertices,
  edges,
  directed = false,
  vertexState,
  edgeState,
  vertexSub,
}: {
  vertices: readonly string[];
  edges: readonly PictureEdge[];
  directed?: boolean;
  vertexState: (v: string) => VertexState;
  edgeState: (u: string, w: string) => EdgeState;
  /** Small text under a vertex, e.g. a distance or an in-degree. */
  vertexSub?: (v: string) => string | undefined;
}) {
  const maxR = Math.max(16, ...vertices.map(radiusFor));
  const ring = SIZE / 2 - maxR - 14;
  const pos = new Map(
    vertices.map((v, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(vertices.length, 1);
      const r = vertices.length === 1 ? 0 : ring;
      return [v, { x: SIZE / 2 + r * Math.cos(a), y: SIZE / 2 + r * Math.sin(a) }];
    }),
  );

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block w-full max-w-72"
    >
      <defs>
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-control" />
        </marker>
      </defs>
      {edges.map(({ u, w, label }, k) => {
        const a = pos.get(u);
        const b = pos.get(w);
        if (!a || !b) return null;
        const state = edgeState(u, w);
        // Stop arrows at the target circle's edge.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const rb = radiusFor(w) + 3;
        const ra = radiusFor(u);
        const x1 = a.x + (dx / len) * ra;
        const y1 = a.y + (dy / len) * ra;
        const x2 = b.x - (dx / len) * (directed ? rb : radiusFor(w));
        const y2 = b.y - (dy / len) * (directed ? rb : radiusFor(w));
        return (
          <g key={`${u}-${w}-${k}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={EDGE[state]}
              strokeWidth={state === "idle" || state === "rejected" ? 1.5 : 3.5}
              strokeDasharray={state === "rejected" ? "5 4" : undefined}
              markerEnd={directed ? "url(#graph-arrow)" : undefined}
            />
            {label && (
              <text
                x={a.x + dx * LABEL_AT + (dy / len) * 9}
                y={a.y + dy * LABEL_AT - (dx / len) * 9}
                dy="0.35em"
                textAnchor="middle"
                className="fill-fg font-mono text-[12px] font-semibold"
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
      {vertices.map((v) => {
        const p = pos.get(v) as { x: number; y: number };
        const r = radiusFor(v);
        const sub = vertexSub?.(v);
        return (
          <g key={v}>
            <circle cx={p.x} cy={p.y} r={r} className={VERTEX[vertexState(v)]} strokeWidth={2} />
            <text
              x={p.x}
              y={p.y}
              dy="0.35em"
              textAnchor="middle"
              className="fill-fg font-mono text-[12px] font-semibold"
            >
              {v}
            </text>
            {sub && (
              <text
                x={p.x}
                y={p.y + r + 11}
                textAnchor="middle"
                className="fill-accent-ink font-mono text-[11px] font-semibold"
              >
                {sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Each undirected edge appears in both neighbour lists; list it once. */
export function undirectedEdges(
  adj: Readonly<Record<string, readonly string[]>>,
  order: readonly string[],
): PictureEdge[] {
  const seen = new Set<string>();
  const out: PictureEdge[] = [];
  for (const u of order) {
    for (const w of adj[u] ?? []) {
      const key = [u, w].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ u, w });
      }
    }
  }
  return out;
}
