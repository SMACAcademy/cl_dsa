import { useTranslation } from "react-i18next";

export type CellState = "idle" | "checked" | "discarded" | "comparing" | "found";

/** A labelled pointer drawn under a box, e.g. `i`, or `lo` / `mid` / `hi`. */
export type Marker = { index: number; label: string };

type Props = {
  items: readonly number[];
  stateOf: (index: number) => CellState;
  markers?: readonly Marker[];
};

const BOX: Record<CellState, string> = {
  idle: "border-line bg-raised",
  checked: "border-line bg-sunken text-muted",
  discarded: "border-dashed border-line bg-sunken text-muted opacity-60",
  comparing: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  found: "border-found bg-found-soft text-found-ink ring-2 ring-found",
};

/** Glyphs keep each state readable without colour (UI_UX §1). */
const GLYPH: Record<CellState, string> = {
  idle: "",
  checked: "✗",
  discarded: "–",
  comparing: "?",
  found: "✓",
};

/** A row of array boxes with index labels, per-cell state and labelled markers. */
export function ArrayView({ items, stateOf, markers = [] }: Props) {
  const { t } = useTranslation();
  return (
    <ol aria-label={t("viz.array.label")} className="flex flex-wrap justify-center gap-2 py-2">
      {items.map((value, index) => {
        const state = stateOf(index);
        const labels = markers.filter((m) => m.index === index).map((m) => m.label);
        return (
          <li key={index} className="flex w-14 flex-col items-center gap-1">
            <span
              className={`relative grid size-14 place-items-center rounded-control border-2 font-mono text-xl font-semibold transition-all duration-300 ${BOX[state]}`}
            >
              {value}
              {GLYPH[state] && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full border border-current bg-raised text-xs"
                >
                  {GLYPH[state]}
                </span>
              )}
              <span className="sr-only">
                {t("viz.array.cell", { index, value, state: t(`viz.array.state.${state}`) })}
              </span>
            </span>
            <span aria-hidden="true" className="font-mono text-xs text-muted">
              {index}
            </span>
            <span
              aria-hidden="true"
              className="flex min-h-8 flex-col items-center font-mono text-xs leading-4 font-semibold text-accent-ink"
            >
              {labels.map((label) => (
                <span key={label}>▲ {label}</span>
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
