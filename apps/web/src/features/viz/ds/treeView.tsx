import { useTranslation } from "react-i18next";
import type { NodeState } from "./views";

/** One drawable tree node. `kids` keeps left/right order for binary trees (null = missing). */
export type DrawNode = {
  id: number;
  label: string;
  /** Small text under the node, e.g. a balance factor or a range. */
  sub?: string;
  kids: readonly (number | null)[];
  /** Text on the edge from the parent, e.g. a trie letter. */
  edge?: string;
  /** Drawn with a double ring, e.g. "end of a word" in a trie. */
  ringed?: boolean;
};

export type DrawTree = { root: number | null; nodes: Readonly<Record<number, DrawNode>> };

const SLOT = 50;
const LEVEL = 66;
const R = 17;
const PAD = 28;

const FILL: Record<NodeState, string> = {
  idle: "fill-raised stroke-control",
  current: "fill-accent-soft stroke-accent",
  changed: "fill-compare-soft stroke-compare",
  found: "fill-found-soft stroke-found",
  new: "fill-accent-soft stroke-accent",
  removed: "fill-sunken stroke-line",
};
const TEXT: Record<NodeState, string> = {
  idle: "fill-fg",
  current: "fill-accent-ink",
  changed: "fill-compare-ink",
  found: "fill-found-ink",
  new: "fill-accent-ink",
  removed: "fill-muted",
};
const GLYPH: Record<NodeState, string> = {
  idle: "",
  current: "●",
  changed: "↻",
  found: "✓",
  new: "+",
  removed: "✗",
};

/**
 * Positions nodes: binary trees by in-order (so a lone right child still sits
 * to the right), other trees by placing leaves left to right and centring
 * each parent over its children.
 */
export function layoutTree(tree: DrawTree, binary: boolean) {
  const pos = new Map<number, { x: number; depth: number }>();
  let next = 0;
  const visit = (id: number, depth: number): number => {
    const node = tree.nodes[id];
    if (!node) return next;
    const kids = node.kids;
    if (binary) {
      const [left, right] = kids;
      if (left != null) visit(left, depth + 1);
      const x = next++;
      pos.set(id, { x, depth });
      if (right != null) visit(right, depth + 1);
      return x;
    }
    const present = kids.filter((k): k is number => k != null);
    if (present.length === 0) {
      const x = next++;
      pos.set(id, { x, depth });
      return x;
    }
    const xs = present.map((k) => visit(k, depth + 1));
    const x = ((xs[0] as number) + (xs.at(-1) as number)) / 2;
    pos.set(id, { x, depth });
    return x;
  };
  if (tree.root != null) visit(tree.root, 0);
  return pos;
}

/** A tree drawn as circles and edges, with optional sub-labels, edge letters and pointers. */
export function TreeView({
  tree,
  binary = true,
  stateOf,
  pointers = {},
  label,
  hideRoot = false,
}: {
  tree: DrawTree;
  binary?: boolean;
  stateOf: (id: number) => NodeState;
  pointers?: Readonly<Record<number, readonly string[]>>;
  label: string;
  /** Hide the root and its edges: used to draw a forest under an invisible super-root. */
  hideRoot?: boolean;
}) {
  const { t } = useTranslation();
  const pos = layoutTree(tree, binary);
  if (hideRoot && tree.root != null) {
    pos.delete(tree.root);
    for (const p of pos.values()) p.depth -= 1;
  }
  const xs = [...pos.values()].map((p) => p.x);
  const depths = [...pos.values()].map((p) => p.depth);
  const width = Math.max(1, (xs.length ? Math.max(...xs) : 0) + 1) * SLOT + PAD * 2;
  const height = ((depths.length ? Math.max(...depths) : 0) + 1) * LEVEL + PAD;
  const at = (id: number) => {
    const p = pos.get(id) as { x: number; depth: number };
    return { cx: PAD + SLOT / 2 + p.x * SLOT, cy: PAD + p.depth * LEVEL };
  };
  const ids = [...pos.keys()];

  return (
    <div className="w-full overflow-x-auto py-2">
      {tree.root == null ? (
        <p className="py-6 text-center font-mono text-sm text-muted">None</p>
      ) : (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block"
          style={{ width, maxWidth: "none" }}
        >
          {ids.map((id) =>
            (tree.nodes[id]?.kids ?? []).map((kid) => {
              if (kid == null || !pos.has(kid)) return null;
              const a = at(id);
              const b = at(kid);
              const edge = tree.nodes[kid]?.edge;
              return (
                <g key={`e${id}-${kid}`}>
                  <line
                    x1={a.cx}
                    y1={a.cy}
                    x2={b.cx}
                    y2={b.cy}
                    className="stroke-control"
                    strokeWidth={1.5}
                  />
                  {edge && (
                    <text
                      x={(a.cx + b.cx) / 2 - 8}
                      y={(a.cy + b.cy) / 2}
                      dy="0.35em"
                      textAnchor="middle"
                      className="fill-accent-ink font-mono text-[12px] font-semibold"
                    >
                      {edge}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          {ids.map((id) => {
            const node = tree.nodes[id] as DrawNode;
            const { cx, cy } = at(id);
            const state = stateOf(id);
            return (
              <g key={`n${id}`} opacity={state === "removed" ? 0.5 : 1}>
                {node.ringed && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={R + 4}
                    className="fill-none stroke-found"
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={R}
                  className={FILL[state]}
                  strokeWidth={2}
                  strokeDasharray={state === "removed" ? "4 3" : undefined}
                />
                <text
                  x={cx}
                  y={cy}
                  dy="0.35em"
                  textAnchor="middle"
                  className={`font-mono text-[13px] font-semibold ${TEXT[state]}`}
                >
                  {node.label}
                </text>
                {GLYPH[state] && (
                  <text
                    x={cx + R}
                    y={cy - R + 2}
                    textAnchor="middle"
                    className={`text-[10px] ${TEXT[state]}`}
                  >
                    {GLYPH[state]}
                  </text>
                )}
                {node.sub && (
                  <text
                    x={cx}
                    y={cy + R + 12}
                    textAnchor="middle"
                    className="fill-muted font-mono text-[10px]"
                  >
                    {node.sub}
                  </text>
                )}
                {(pointers[id] ?? []).length > 0 && (
                  <text
                    x={cx}
                    y={cy - R - 6}
                    textAnchor="middle"
                    className="fill-accent-ink font-mono text-[10px] font-semibold"
                  >
                    {(pointers[id] ?? []).join(" ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      <ol aria-label={label} className="sr-only">
        {ids.map((id) => {
          const node = tree.nodes[id] as DrawNode;
          const kids = node.kids
            .filter((k): k is number => k != null)
            .map((k) => tree.nodes[k]?.label ?? "")
            .join(", ");
          return (
            <li key={id}>
              {t("viz.ds.view.treeNode", {
                label: node.label,
                sub: node.sub ? ` (${node.sub})` : "",
                children: kids || t("viz.ds.view.noChildren"),
                state: t(`viz.ds.view.state.${stateOf(id)}`),
              })}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
