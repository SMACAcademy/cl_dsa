/**
 * Quick sort with the Lomuto partition (pivot = last value of the range), as
 * full-state snapshots. Values keep stable ids so swaps animate.
 */

export const QUICK_SORT_CODE: readonly string[] = [
  "def quick_sort(items, lo=0, hi=None):",
  "    if hi is None:",
  "        hi = len(items) - 1",
  "    if lo >= hi:",
  "        return",
  "    p = partition(items, lo, hi)",
  "    quick_sort(items, lo, p - 1)",
  "    quick_sort(items, p + 1, hi)",
  "",
  "def partition(items, lo, hi):",
  "    pivot = items[hi]",
  "    i = lo - 1",
  "    for j in range(lo, hi):",
  "        if items[j] <= pivot:",
  "            i += 1",
  "            items[i], items[j] = items[j], items[i]",
  "    items[i + 1], items[hi] = items[hi], items[i + 1]",
  "    return i + 1",
];

export type QuickNarration =
  | { key: "start"; count: number }
  | { key: "partition"; lo: number; hi: number; pivot: number }
  | { key: "compareSmall"; j: number; a: number; pivot: number }
  | { key: "compareBig"; j: number; a: number; pivot: number }
  | { key: "swap"; a: number; i: number }
  | { key: "placePivot"; pivot: number; p: number }
  | { key: "single"; value: number; p: number }
  | { key: "done"; comparisons: number; swaps: number };

export type QuickSortStep = {
  line: number;
  values: readonly number[];
  ids: readonly number[];
  /** Current partition range, inclusive. */
  lo: number | null;
  hi: number | null;
  /** Pivot position while partitioning (always hi). */
  pivotPos: number | null;
  /** End of the small side: lo..i hold values ≤ pivot. */
  i: number | null;
  j: number | null;
  /** For a comparison step: whether items[j] ≤ pivot. */
  small: boolean | null;
  swappedPair: readonly [number, number] | null;
  /** Positions already in their final place. */
  final: readonly number[];
  done: boolean;
  comparisons: number;
  swaps: number;
  narration: QuickNarration;
};

export function quickSortSteps(input: readonly number[]): QuickSortStep[] {
  const values = [...input];
  const ids = input.map((_, k) => k);
  const steps: QuickSortStep[] = [];
  const final = new Set<number>();
  let comparisons = 0;
  let swaps = 0;

  type Extra = Partial<
    Pick<QuickSortStep, "lo" | "hi" | "pivotPos" | "i" | "j" | "small" | "swappedPair" | "done">
  >;
  const snap = (line: number, narration: QuickNarration, extra: Extra = {}) => {
    steps.push({
      line,
      values: [...values],
      ids: [...ids],
      lo: null,
      hi: null,
      pivotPos: null,
      i: null,
      j: null,
      small: null,
      swappedPair: null,
      final: [...final].sort((a, b) => a - b),
      done: false,
      comparisons,
      swaps,
      narration,
      ...extra,
    });
  };

  const swap = (a: number, b: number) => {
    [values[a], values[b]] = [values[b] as number, values[a] as number];
    [ids[a], ids[b]] = [ids[b] as number, ids[a] as number];
    swaps++;
  };

  const partition = (lo: number, hi: number): number => {
    const pivot = values[hi] as number;
    let i = lo - 1;
    snap(11, { key: "partition", lo, hi, pivot }, { lo, hi, pivotPos: hi, i });
    for (let j = lo; j < hi; j++) {
      const a = values[j] as number;
      comparisons++;
      const small = a <= pivot;
      if (small) i++;
      snap(14, small ? { key: "compareSmall", j, a, pivot } : { key: "compareBig", j, a, pivot }, {
        lo,
        hi,
        pivotPos: hi,
        i,
        j,
        small,
      });
      if (small && i !== j) {
        swap(i, j);
        snap(16, { key: "swap", a, i }, { lo, hi, pivotPos: hi, i, j, swappedPair: [i, j] });
      }
    }
    const p = i + 1;
    if (p !== hi) swap(p, hi);
    final.add(p);
    snap(
      17,
      { key: "placePivot", pivot, p },
      { lo, hi, i, swappedPair: p !== hi ? [p, hi] : null },
    );
    return p;
  };

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      final.add(lo);
      snap(5, { key: "single", value: values[lo] as number, p: lo }, { lo, hi });
      return;
    }
    const p = partition(lo, hi);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };

  snap(1, { key: "start", count: values.length });
  sort(0, values.length - 1);
  snap(0, { key: "done", comparisons, swaps }, { done: true });
  return steps;
}
