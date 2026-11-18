import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RangeRow, type Range } from "./RangeRow";

export type CellState =
  "idle" | "checked" | "discarded" | "comparing" | "found" | "used" | "outside" | "empty";

/** A labelled pointer drawn under a box, e.g. `i`, or `lo` / `mid` / `hi`. */
export type Marker = { index: number; label: string };

type Props<T extends number | string> = {
  /** Values to show; `null` draws an empty slot. */
  items: readonly (T | null)[];
  stateOf: (index: number) => CellState;
  markers?: readonly Marker[];
  ranges?: readonly Range[];
  /** Accessible name of the list (defaults to "Array"). */
  label?: string;
  /** Show index numbers under the boxes (default true). */
  showIndex?: boolean;
  /** Optional custom rendering of a value (e.g. to underline one digit). */
  renderValue?: (value: T, index: number) => ReactNode;
  /** Extra text under each index, e.g. a memory address. */
  subLabel?: (index: number) => string;
  /** Reserve a row under the boxes for markers (default true). */
  markerRow?: boolean;
};

const SLOT = 64; // box 56 px + gap 8 px
const CELL = 56;

const BOX: Record<CellState, string> = {
  idle: "border-line bg-raised",
  checked: "border-line bg-sunken text-muted",
  discarded: "border-dashed border-line bg-sunken text-muted opacity-60",
  comparing: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  found: "border-found bg-found-soft text-found-ink ring-2 ring-found",
  used: "border-line bg-sunken text-muted",
  outside: "border-dashed border-line bg-sunken text-muted opacity-50",
  empty: "border-dashed border-line bg-transparent",
};

/** Glyphs keep each state readable without colour (UI_UX §1). */
const GLYPH: Record<CellState, string> = {
  idle: "",
  checked: "✗",
  discarded: "–",
  comparing: "?",
  found: "✓",
  used: "↓",
  outside: "",
  empty: "",
};

/** A row of array boxes with index labels, per-cell state, markers and range brackets. */
export function ArrayView<T extends number | string>({
  items,
  stateOf,
  markers = [],
  ranges = [],
  label,
  showIndex = true,
  renderValue,
  markerRow = true,
  subLabel,
}: Props<T>) {
  const { t } = useTranslation();
  const width = items.length * SLOT - (SLOT - CELL);
  return (
    <div className="w-full overflow-x-auto py-2">
      <ol aria-label={label ?? t("viz.array.label")} className="mx-auto flex w-max gap-2">
        {items.map((value, index) => {
          const state = value === null ? "empty" : stateOf(index);
          const labels = markers.filter((m) => m.index === index).map((m) => m.label);
          return (
            <li key={index} className="flex w-14 flex-col items-center gap-1">
              <span
                className={`relative grid size-14 place-items-center rounded-control border-2 font-mono text-xl font-semibold transition-all duration-300 ${BOX[state]}`}
              >
                {value === null ? "" : renderValue ? renderValue(value, index) : value}
                {GLYPH[state] && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border border-current bg-raised text-xs"
                  >
                    {GLYPH[state]}
                  </span>
                )}
                <span className="sr-only">
                  {value === null
                    ? t("viz.array.emptyCell", { index })
                    : t("viz.array.cell", { index, value, state: t(`viz.array.state.${state}`) })}
                </span>
              </span>
              {showIndex && (
                <span aria-hidden="true" className="font-mono text-xs text-muted">
                  {index}
                </span>
              )}
              {subLabel && (
                <span aria-hidden="true" className="font-mono text-[10px] text-muted">
                  {subLabel(index)}
                </span>
              )}
              {markerRow && (
                <span
                  aria-hidden="true"
                  className="flex min-h-8 flex-col items-center font-mono text-xs leading-4 font-semibold text-accent-ink"
                >
                  {labels.map((l) => (
                    <span key={l}>▲ {l}</span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <RangeRow ranges={ranges} slot={SLOT} cell={CELL} width={width} />
    </div>
  );
}
