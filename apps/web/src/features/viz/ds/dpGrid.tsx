import { useTranslation } from "react-i18next";

export type GridCell = "idle" | "filled" | "row" | "source" | "path";

const CELL: Record<GridCell, string> = {
  idle: "text-muted",
  filled: "",
  row: "bg-accent-soft text-accent-ink",
  source: "bg-compare-soft text-compare-ink",
  path: "bg-found-soft text-found-ink font-semibold",
};

/** A DP table: column labels across the top, row labels down the side. */
export function DpGrid({
  rowLabels,
  colLabels,
  cells,
  stateOf,
  caption,
}: {
  rowLabels: readonly string[];
  colLabels: readonly string[];
  /** null = not computed yet. */
  cells: readonly (readonly (number | string | null)[])[];
  stateOf: (r: number, c: number) => GridCell;
  caption: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full overflow-x-auto py-2">
      <table className="mx-auto border-collapse font-mono text-sm">
        <caption className="mb-1 font-sans text-xs font-semibold text-muted">{caption}</caption>
        <thead>
          <tr>
            <td />
            {colLabels.map((c, j) => (
              <th key={j} scope="col" className="px-2 py-1 text-xs font-semibold text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, r) => (
            <tr key={r}>
              <th
                scope="row"
                className="px-2 py-1 text-left text-xs font-semibold whitespace-nowrap text-muted"
              >
                {rowLabels[r]}
              </th>
              {row.map((v, c) => {
                const state = v === null ? "idle" : stateOf(r, c);
                return (
                  <td
                    key={c}
                    className={`h-8 min-w-8 border border-line px-1.5 text-center transition-colors duration-300 ${CELL[state]}`}
                  >
                    {v === null ? <span className="sr-only">{t("viz.ds.dp.notYet")}</span> : v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
