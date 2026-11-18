import { useTranslation } from "react-i18next";
import { RangeRow, type Range } from "./RangeRow";

export type BarState =
  "idle" | "minimum" | "key" | "pivot" | "comparing" | "swapping" | "sorted" | "outside";

type Props = {
  /** Current values, left to right. */
  values: readonly number[];
  /** Stable id per position, so a moved value keeps its DOM node and slides. */
  ids: readonly number[];
  stateAt: (position: number) => BarState;
  /** Labels drawn under positions, e.g. `j` and `j+1`. */
  markers?: readonly { position: number; label: string }[];
  /** Brackets under spans of positions, e.g. "sorted part". */
  ranges?: readonly Range[];
};

const SLOT = 56; // px per position, including the gap
const BAR_WIDTH = 48;
const MIN_HEIGHT = 28;
const MAX_HEIGHT = 112;

const BAR: Record<BarState, string> = {
  idle: "border-line bg-raised",
  minimum: "border-accent bg-accent-soft text-accent-ink",
  key: "border-accent bg-accent-soft text-accent-ink ring-2 ring-accent",
  pivot: "border-accent bg-accent-soft text-accent-ink ring-2 ring-accent",
  comparing: "border-compare bg-compare-soft text-compare-ink",
  swapping: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  sorted: "border-found bg-found-soft text-found-ink",
  outside: "border-dashed border-line bg-sunken text-muted opacity-50",
};

/** Glyphs keep each state readable without colour (UI_UX §1). */
const GLYPH: Record<BarState, string> = {
  idle: "",
  minimum: "★",
  key: "↑",
  pivot: "P",
  comparing: "?",
  swapping: "⇄",
  sorted: "✓",
  outside: "",
};

/**
 * Value bars that slide to their new position when moved. The picture is
 * hidden from screen readers; a plain list beside it reads out every value
 * and its state.
 */
export function BarsView({ values, ids, stateAt, markers = [], ranges = [] }: Props) {
  const { t } = useTranslation();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const heightOf = (v: number) =>
    max === min
      ? (MIN_HEIGHT + MAX_HEIGHT) / 2
      : MIN_HEIGHT + ((v - min) / (max - min)) * (MAX_HEIGHT - MIN_HEIGHT);
  const width = values.length * SLOT - (SLOT - BAR_WIDTH);
  const positionOf = new Map(ids.map((id, position) => [id, position]));
  const valueOfId = new Map(ids.map((id, position) => [id, values[position] as number]));
  const sortedIds = [...ids].sort((a, b) => a - b);

  return (
    <div className="w-full overflow-x-auto py-2">
      <div
        aria-hidden="true"
        className="relative mx-auto"
        style={{ width, height: MAX_HEIGHT + 24 }}
      >
        {sortedIds.map((id) => {
          const position = positionOf.get(id) as number;
          const value = valueOfId.get(id) as number;
          const state = stateAt(position);
          return (
            <div
              key={id}
              className="absolute bottom-0 flex flex-col items-center transition-[left] duration-500 ease-in-out"
              style={{ left: position * SLOT, width: BAR_WIDTH }}
            >
              <span className="mb-1 h-5 text-xs">
                {GLYPH[state] && (
                  <span className="grid size-5 place-items-center rounded-full border border-current bg-raised">
                    {GLYPH[state]}
                  </span>
                )}
              </span>
              <span
                className={`flex w-full items-start justify-center rounded-t-control border-2 pt-1 font-mono text-base font-semibold transition-colors duration-300 ${BAR[state]}`}
                style={{ height: heightOf(value) }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="relative mx-auto mt-1" style={{ width, height: 36 }}>
        {values.map((_, position) => (
          <span
            key={position}
            className="absolute top-0 text-center font-mono text-xs text-muted"
            style={{ left: position * SLOT, width: BAR_WIDTH }}
          >
            {position}
          </span>
        ))}
        {markers.map((m) => (
          <span
            key={m.label}
            className="absolute top-4 flex justify-center font-mono whitespace-nowrap text-xs font-semibold text-accent-ink transition-[left] duration-300"
            style={{ left: m.position * SLOT, width: BAR_WIDTH }}
          >
            ▲ {m.label}
          </span>
        ))}
      </div>
      <RangeRow ranges={ranges} slot={SLOT} cell={BAR_WIDTH} width={width} />
      <ol aria-label={t("viz.array.label")} className="sr-only">
        {values.map((value, position) => (
          <li key={position}>
            {t("viz.bars.cell", {
              position,
              value,
              state: t(`viz.bars.state.${stateAt(position)}`),
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
