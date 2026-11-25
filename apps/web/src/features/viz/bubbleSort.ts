/**
 * Bubble sort with early exit, as full-state snapshots. Every value keeps a
 * stable id (its starting index) so the view can animate a swap as two bars
 * sliding past each other.
 */

/** The Python shown beside the visualization. Line numbers below are 1-based. */
export const BUBBLE_SORT_CODE: readonly string[] = [
  "def bubble_sort(items):",
  "    n = len(items)",
  "    for end in range(n - 1, 0, -1):",
  "        swapped = False",
  "        for j in range(end):",
  "            if items[j] > items[j + 1]:",
  "                items[j], items[j + 1] = items[j + 1], items[j]",
  "                swapped = True",
  "        if not swapped:",
  "            break",
  "    return items",
];

export type BubbleNarration =
  | { key: "start"; count: number }
  | { key: "pass"; pass: number; end: number }
  | { key: "compareSwap"; j: number; k: number; a: number; b: number }
  | { key: "compareKeep"; j: number; k: number; a: number; b: number }
  | { key: "swap"; a: number; list: string }
  | { key: "passEnd"; pass: number; value: number; end: number }
  | { key: "earlyExit"; pass: number }
  | { key: "done"; comparisons: number; swaps: number };

export type BubbleSortStep = {
  line: number;
  /** Current values, left to right. */
  values: readonly number[];
  /** Stable id of the value at each position (its starting index). */
  ids: readonly number[];
  pass: number | null;
  end: number | null;
  j: number | null;
  /** Positions being compared (j, j + 1), if any. */
  comparing: readonly [number, number] | null;
  /** True on the step right after the compared pair was swapped. */
  justSwapped: boolean;
  /** For a comparison step: whether that pair is out of order. */
  needsSwap: boolean | null;
  swapped: boolean | null;
  /** Positions >= sortedFrom are in their final place. */
  sortedFrom: number;
  comparisons: number;
  swaps: number;
  narration: BubbleNarration;
};

export function bubbleSortSteps(input: readonly number[]): BubbleSortStep[] {
  const values = [...input];
  const ids = input.map((_, i) => i);
  const n = values.length;
  const steps: BubbleSortStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  let sortedFrom = n;

  const snap = (
    line: number,
    narration: BubbleNarration,
    extra: Partial<
      Pick<
        BubbleSortStep,
        "pass" | "end" | "j" | "comparing" | "justSwapped" | "needsSwap" | "swapped"
      >
    > = {},
  ): void => {
    steps.push({
      line,
      values: [...values],
      ids: [...ids],
      pass: null,
      end: null,
      j: null,
      comparing: null,
      justSwapped: false,
      needsSwap: null,
      swapped: null,
      sortedFrom,
      comparisons,
      swaps,
      narration,
      ...extra,
    });
  };

  snap(1, { key: "start", count: n });

  let pass = 0;
  for (let end = n - 1; end > 0; end--) {
    pass++;
    let swapped = false;
    snap(4, { key: "pass", pass, end }, { pass, end, swapped });
    for (let j = 0; j < end; j++) {
      const a = values[j] as number;
      const b = values[j + 1] as number;
      comparisons++;
      const needsSwap = a > b;
      snap(
        6,
        needsSwap
          ? { key: "compareSwap", j, k: j + 1, a, b }
          : { key: "compareKeep", j, k: j + 1, a, b },
        { pass, end, j, comparing: [j, j + 1], needsSwap, swapped },
      );
      if (needsSwap) {
        values[j] = b;
        values[j + 1] = a;
        [ids[j], ids[j + 1]] = [ids[j + 1] as number, ids[j] as number];
        swaps++;
        swapped = true;
        snap(
          7,
          { key: "swap", a, list: `[${values.join(", ")}]` },
          { pass, end, j, comparing: [j, j + 1], justSwapped: true, swapped },
        );
      }
    }
    if (!swapped) {
      sortedFrom = 0;
      snap(10, { key: "earlyExit", pass }, { pass, end, swapped });
      break;
    }
    sortedFrom = end;
    snap(9, { key: "passEnd", pass, value: values[end] as number, end }, { pass, end, swapped });
  }

  sortedFrom = 0;
  snap(11, { key: "done", comparisons, swaps });
  return steps;
}
