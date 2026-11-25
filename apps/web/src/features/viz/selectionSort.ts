/**
 * Selection sort as full-state snapshots. Each value keeps a stable id (its
 * starting index) so the view can animate the one swap per pass.
 */

/** The Python shown beside the visualization. Line numbers below are 1-based. */
export const SELECTION_SORT_CODE: readonly string[] = [
  "def selection_sort(items):",
  "    n = len(items)",
  "    for i in range(n - 1):",
  "        smallest = i",
  "        for j in range(i + 1, n):",
  "            if items[j] < items[smallest]:",
  "                smallest = j",
  "        if smallest != i:",
  "            items[i], items[smallest] = items[smallest], items[i]",
  "    return items",
];

export type SelectionNarration =
  | { key: "start"; count: number }
  | { key: "pass"; pass: number; i: number; value: number }
  | { key: "compareNew"; j: number; a: number; b: number }
  | { key: "compareKeep"; j: number; a: number; b: number }
  | { key: "newMin"; j: number; value: number }
  | { key: "swap"; i: number; s: number; value: number; list: string }
  | { key: "inPlace"; i: number; value: number }
  | { key: "done"; comparisons: number; swaps: number };

export type SelectionSortStep = {
  line: number;
  values: readonly number[];
  /** Stable id of the value at each position (its starting index). */
  ids: readonly number[];
  pass: number | null;
  i: number | null;
  j: number | null;
  /** Position of the smallest value found so far in this pass. */
  smallest: number | null;
  /** For a comparison step: whether items[j] is a new minimum. */
  isNewMin: boolean | null;
  /** Positions swapped in this step, if any. */
  swappedPair: readonly [number, number] | null;
  /** Positions < sortedUpTo are in their final place. */
  sortedUpTo: number;
  comparisons: number;
  swaps: number;
  narration: SelectionNarration;
};

export function selectionSortSteps(input: readonly number[]): SelectionSortStep[] {
  const values = [...input];
  const ids = input.map((_, k) => k);
  const n = values.length;
  const steps: SelectionSortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  let sortedUpTo = 0;

  type Extra = Partial<
    Pick<SelectionSortStep, "pass" | "i" | "j" | "smallest" | "isNewMin" | "swappedPair">
  >;
  const snap = (line: number, narration: SelectionNarration, extra: Extra = {}): void => {
    steps.push({
      line,
      values: [...values],
      ids: [...ids],
      pass: null,
      i: null,
      j: null,
      smallest: null,
      isNewMin: null,
      swappedPair: null,
      sortedUpTo,
      comparisons,
      swaps,
      narration,
      ...extra,
    });
  };

  snap(1, { key: "start", count: n });

  for (let i = 0; i < n - 1; i++) {
    const pass = i + 1;
    let smallest = i;
    snap(4, { key: "pass", pass, i, value: values[i] as number }, { pass, i, smallest });

    for (let j = i + 1; j < n; j++) {
      const a = values[j] as number;
      const b = values[smallest] as number;
      comparisons++;
      const isNewMin = a < b;
      snap(6, isNewMin ? { key: "compareNew", j, a, b } : { key: "compareKeep", j, a, b }, {
        pass,
        i,
        j,
        smallest,
        isNewMin,
      });
      if (isNewMin) {
        smallest = j;
        snap(7, { key: "newMin", j, value: a }, { pass, i, j, smallest });
      }
    }

    if (smallest !== i) {
      const s = smallest;
      [values[i], values[s]] = [values[s] as number, values[i] as number];
      [ids[i], ids[s]] = [ids[s] as number, ids[i] as number];
      swaps++;
      sortedUpTo = i + 1;
      snap(
        9,
        { key: "swap", i, s, value: values[i] as number, list: `[${values.join(", ")}]` },
        { pass, i, smallest: i, swappedPair: [i, s] },
      );
    } else {
      sortedUpTo = i + 1;
      snap(8, { key: "inPlace", i, value: values[i] as number }, { pass, i, smallest: i });
    }
  }

  sortedUpTo = n;
  snap(10, { key: "done", comparisons, swaps });
  return steps;
}
