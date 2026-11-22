import type { BarState } from "./BarsView";

const WIDTH = 320;
const LEVEL_GAP = 52;
const R = 17;

const NODE: Record<BarState, string> = {
  idle: "fill-raised stroke-control",
  minimum: "fill-accent-soft stroke-accent",
  key: "fill-accent-soft stroke-accent",
  pivot: "fill-accent-soft stroke-accent",
  comparing: "fill-compare-soft stroke-compare",
  swapping: "fill-compare-soft stroke-compare",
  sorted: "fill-found-soft stroke-found",
  outside: "fill-sunken stroke-line",
};

const TEXT: Record<BarState, string> = {
  idle: "fill-fg",
  minimum: "fill-accent-ink",
  key: "fill-accent-ink",
  pivot: "fill-accent-ink",
  comparing: "fill-compare-ink",
  swapping: "fill-compare-ink",
  sorted: "fill-found-ink",
  outside: "fill-muted",
};

function place(i: number, width: number) {
  const level = Math.floor(Math.log2(i + 1));
  const first = 2 ** level - 1;
  const slots = 2 ** level;
  return { x: ((i - first + 0.5) * width) / slots, y: R + 6 + level * LEVEL_GAP };
}

/**
 * The array drawn as the binary tree it represents (children of i are 2i+1
 * and 2i+2). Only positions inside the heap are connected; the rest are
 * shown faded beside it. Decorative: the bars' list carries the same facts.
 */
export function HeapTree({
  values,
  heapSize,
  stateAt,
}: {
  values: readonly number[];
  heapSize: number;
  stateAt: (position: number) => BarState;
}) {
  const n = values.length;
  const levels = n === 0 ? 1 : Math.floor(Math.log2(n)) + 1;
  const height = R * 2 + 12 + (levels - 1) * LEVEL_GAP;
  // A fifth level (16 values) needs twice the width so its circles don't touch.
  const width = levels >= 5 ? WIDTH * 2 : WIDTH;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      className={`mx-auto block w-full ${levels >= 5 ? "max-w-2xl" : "max-w-sm"}`}
    >
      {values.map((_, i) => {
        if (i === 0 || i >= heapSize) return null;
        const p = place(Math.floor((i - 1) / 2), width);
        const c = place(i, width);
        return (
          <line
            key={`e${i}`}
            x1={p.x}
            y1={p.y}
            x2={c.x}
            y2={c.y}
            className="stroke-control"
            strokeWidth={1.5}
          />
        );
      })}
      {values.map((v, i) => {
        const { x, y } = place(i, width);
        const state = stateAt(i);
        const inHeap = i < heapSize;
        return (
          <g key={`n${i}`} className="transition-opacity duration-300" opacity={inHeap ? 1 : 0.45}>
            <circle
              cx={x}
              cy={y}
              r={R}
              className={NODE[state]}
              strokeWidth={2}
              strokeDasharray={inHeap ? undefined : "4 3"}
            />
            <text
              x={x}
              y={y}
              dy="0.35em"
              textAnchor="middle"
              className={`font-mono text-[13px] font-semibold ${TEXT[state]}`}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
