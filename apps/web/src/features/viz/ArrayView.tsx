import { useTranslation } from "react-i18next";

export type CellState = "idle" | "checked" | "comparing" | "found";

type Props = {
  items: readonly number[];
  stateOf: (index: number) => CellState;
  /** Index the loop variable points at, drawn as a marker under the box. */
  pointer: number | null;
  pointerLabel?: string;
};

const BOX: Record<CellState, string> = {
  idle: "border-line bg-raised",
  checked: "border-line bg-sunken text-muted",
  comparing: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  found: "border-found bg-found-soft text-found-ink ring-2 ring-found",
};

/** Glyphs keep each state readable without colour (UI_UX §1). */
const GLYPH: Record<CellState, string> = { idle: "", checked: "✗", comparing: "?", found: "✓" };

/** A row of array boxes with index labels, per-cell state and an `i` pointer. */
export function ArrayView({ items, stateOf, pointer, pointerLabel = "i" }: Props) {
  const { t } = useTranslation();
  return (
    <ol aria-label={t("viz.array.label")} className="flex flex-wrap justify-center gap-2 py-2">
      {items.map((value, index) => {
        const state = stateOf(index);
        const here = pointer === index;
        return (
          <li key={index} className="flex w-14 flex-col items-center gap-1">
            <span
              className={`relative grid size-14 place-items-center rounded-control border-2 font-mono text-xl font-semibold transition-colors duration-300 ${BOX[state]}`}
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
              className={`font-mono text-xs font-semibold text-accent-ink transition-opacity duration-300 ${here ? "opacity-100" : "opacity-0"}`}
            >
              ▲ {pointerLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
