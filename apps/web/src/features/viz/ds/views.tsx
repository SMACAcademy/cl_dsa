import { useTranslation } from "react-i18next";

/** States shared by the data-structure views. Each has a glyph, so colour is never the only cue. */
export type NodeState = "idle" | "current" | "changed" | "found" | "new" | "removed";

const BOX: Record<NodeState, string> = {
  idle: "border-line bg-raised",
  current: "border-accent bg-accent-soft text-accent-ink",
  changed: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  found: "border-found bg-found-soft text-found-ink ring-2 ring-found",
  new: "border-accent bg-accent-soft text-accent-ink ring-2 ring-accent",
  removed: "border-dashed border-line bg-sunken text-muted opacity-50",
};

const GLYPH: Record<NodeState, string> = {
  idle: "",
  current: "●",
  changed: "↻",
  found: "✓",
  new: "+",
  removed: "✗",
};

function Glyph({ state }: { state: NodeState }) {
  if (!GLYPH[state]) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border border-current bg-raised text-xs"
    >
      {GLYPH[state]}
    </span>
  );
}

export function Box({
  value,
  state,
  small = false,
}: {
  value: string;
  state: NodeState;
  /** A smaller box, for long chains. */
  small?: boolean;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-control border-2 font-mono font-semibold transition-all duration-300 ${small ? "size-10 text-sm" : "size-12 text-lg"} ${BOX[state]}`}
    >
      {value}
      <Glyph state={state} />
    </span>
  );
}

export type ChainNode = { id: number; value: string };

/**
 * A linked list drawn as boxes joined by arrows (→ singly, ⇄ doubly), with
 * pointer labels (head, cur, prev…) under nodes and an optional new node
 * waiting above the chain.
 */
export function ChainView({
  nodes,
  doubly = false,
  stateOf,
  pointers = {},
  pending,
}: {
  nodes: readonly ChainNode[];
  doubly?: boolean;
  stateOf: (id: number) => NodeState;
  /** Pointer labels by node id, e.g. { 3: ["head"] }. */
  pointers?: Readonly<Record<number, readonly string[]>>;
  /** A node created but not linked in yet, with what its arrows point at. */
  pending?: { value: string; next: string | null; prev?: string | null } | null;
}) {
  const { t } = useTranslation();
  const arrow = doubly ? "⇄" : "→";
  // Long chains get smaller boxes so ten or so nodes fit without scrolling.
  const small = nodes.length > 7;
  const rowHeight = small ? "h-10" : "h-12";
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="mx-auto w-max">
        <div className="mb-3 flex min-h-14 items-center justify-center gap-2 text-sm">
          {pending && (
            <>
              <span className="text-xs text-muted">{t("viz.ds.view.newNode")}</span>
              <Box value={pending.value} state="new" />
              <span className="font-mono text-xs text-muted">
                {doubly && `prev → ${pending.prev ?? "None"} · `}next → {pending.next ?? "None"}
              </span>
            </>
          )}
        </div>
        <ol aria-label={t("viz.ds.view.chain")} className="flex items-start gap-1">
          <li
            aria-hidden="true"
            className={`flex ${rowHeight} items-center pr-1 font-mono text-xs text-muted`}
          >
            head →
          </li>
          {nodes.length === 0 && (
            <li className="flex h-12 items-center font-mono text-sm text-muted">None</li>
          )}
          {nodes.map((node, k) => {
            const state = stateOf(node.id);
            const next = nodes[k + 1]?.value ?? "None";
            return (
              <li key={node.id} className={`flex items-start ${small ? "gap-0.5" : "gap-1"}`}>
                <span className={`flex ${small ? "w-10" : "w-12"} flex-col items-center gap-1`}>
                  <Box value={node.value} state={state} small={small} />
                  <span
                    aria-hidden="true"
                    className="flex min-h-8 flex-col items-center font-mono text-xs leading-4 font-semibold text-accent-ink"
                  >
                    {(pointers[node.id] ?? []).map((p) => (
                      <span key={p}>▲ {p}</span>
                    ))}
                  </span>
                  <span className="sr-only">
                    {t("viz.ds.view.node", {
                      value: node.value,
                      next,
                      state: t(`viz.ds.view.state.${state}`),
                      pointers: (pointers[node.id] ?? []).join(", "),
                    })}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex ${rowHeight} items-center ${small ? "px-0.5" : "px-1"} text-muted`}
                >
                  {k === nodes.length - 1 ? (
                    <span className="font-mono text-xs">→ None</span>
                  ) : (
                    arrow
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** A stack drawn as a vertical pile, top at the top. */
export function StackView({
  items,
  stateAt,
  leaving,
}: {
  /** Bottom to top. */
  items: readonly string[];
  stateAt: (index: number) => NodeState;
  /** A value just popped, drawn lifting off above the pile. */
  leaving?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center py-2">
      <div className="flex min-h-14 items-center gap-2 text-sm">
        {leaving != null && (
          <>
            <Box value={leaving} state="removed" />
            <span className="text-xs text-muted">{t("viz.ds.view.leaving")}</span>
          </>
        )}
      </div>
      <ol
        aria-label={t("viz.ds.view.stack")}
        className="flex min-h-24 w-28 flex-col-reverse items-center gap-1 rounded-b-panel border-x-2 border-b-2 border-control px-2 pt-2 pb-2"
      >
        {items.length === 0 && (
          <li className="py-6 text-xs text-muted">{t("viz.ds.view.empty")}</li>
        )}
        {items.map((v, i) => (
          <li key={i} className="relative flex items-center">
            <span className="flex h-11 w-20 items-center justify-center">
              <span
                className={`relative grid h-10 w-20 place-items-center rounded-control border-2 font-mono text-lg font-semibold transition-all duration-300 ${BOX[stateAt(i)]}`}
              >
                {v}
                <Glyph state={stateAt(i)} />
              </span>
            </span>
            {i === items.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-full ml-2 font-mono text-xs font-semibold whitespace-nowrap text-accent-ink"
              >
                ◀ top
              </span>
            )}
            <span className="sr-only">
              {t("viz.ds.view.stackItem", {
                value: v,
                position: i === items.length - 1 ? t("viz.ds.view.top") : i + 1,
              })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const RING = 300;
const RADIUS = 78;

/** A ring buffer drawn as slots around a circle, with head and tail pointers. */
export function RingView({
  slots,
  head,
  tail,
  stateAt,
}: {
  slots: readonly (string | null)[];
  head: number;
  tail: number;
  stateAt: (index: number) => NodeState;
}) {
  const { t } = useTranslation();
  const n = slots.length;
  // More than 8 slots need a bigger circle so the boxes don't touch.
  const big = n > 8;
  const ringSize = big ? RING + 60 : RING;
  const radius = big ? RADIUS + 28 : RADIUS;
  const at = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: ringSize / 2 + r * Math.cos(angle), y: ringSize / 2 + r * Math.sin(angle) };
  };
  return (
    <div className="flex flex-col items-center py-2">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${ringSize} ${ringSize}`}
        className={`w-full ${big ? "max-w-80" : "max-w-72"}`}
      >
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          className="fill-none stroke-line"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        {slots.map((v, i) => {
          const { x, y } = at(i, radius);
          const label = at(i, radius + 42);
          const state = v === null ? "removed" : stateAt(i);
          const marks = [i === head ? "head" : null, i === tail ? "tail" : null].filter(Boolean);
          return (
            <g key={i}>
              <rect
                x={x - 18}
                y={y - 18}
                width={36}
                height={36}
                rx={6}
                className={
                  state === "changed" || state === "new"
                    ? "fill-compare-soft stroke-compare"
                    : state === "found"
                      ? "fill-found-soft stroke-found"
                      : v === null
                        ? "fill-sunken stroke-line"
                        : "fill-raised stroke-control"
                }
                strokeWidth={2}
                strokeDasharray={v === null ? "4 3" : undefined}
              />
              <text
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                className="fill-fg font-mono text-[14px] font-semibold"
              >
                {v ?? ""}
              </text>
              <text
                x={ringSize / 2 + (radius - 30) * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n)}
                y={ringSize / 2 + (radius - 30) * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n)}
                dy="0.35em"
                textAnchor="middle"
                className="fill-muted font-mono text-[10px]"
              >
                {i}
              </text>
              {marks.length > 0 && (
                <text
                  x={label.x}
                  y={label.y}
                  dy="0.35em"
                  textAnchor="middle"
                  className="fill-accent-ink font-mono text-[10px] font-semibold"
                >
                  {marks.join("/")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ol aria-label={t("viz.ds.view.ring")} className="sr-only">
        {slots.map((v, i) => (
          <li key={i}>
            {t("viz.ds.view.slot", {
              index: i,
              value: v ?? t("viz.ds.view.emptySlot"),
              pointers: [i === head ? "head" : "", i === tail ? "tail" : ""]
                .filter(Boolean)
                .join(", "),
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
