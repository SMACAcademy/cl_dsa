/**
 * Top-down merge sort as full-state snapshots. Splits are shown on the one
 * array as left/right ranges; each merge walks two fingers along the halves
 * and fills a separate result row, which is then copied back.
 */

export const MERGE_SORT_CODE: readonly string[] = [
  "def merge_sort(items):",
  "    if len(items) <= 1:",
  "        return items",
  "    mid = len(items) // 2",
  "    left = merge_sort(items[:mid])",
  "    right = merge_sort(items[mid:])",
  "    return merge(left, right)",
  "",
  "def merge(left, right):",
  "    result = []",
  "    i = j = 0",
  "    while i < len(left) and j < len(right):",
  "        if left[i] <= right[j]:",
  "            result.append(left[i])",
  "            i += 1",
  "        else:",
  "            result.append(right[j])",
  "            j += 1",
  "    result += left[i:] + right[j:]",
  "    return result",
];

export type MergeNarration =
  | { key: "start"; count: number }
  | { key: "split"; list: string; left: string; right: string }
  | { key: "mergeStart"; left: string; right: string }
  | { key: "takeLeft"; a: number; b: number }
  | { key: "takeRight"; a: number; b: number }
  | { key: "rest"; rest: string }
  | { key: "merged"; list: string }
  | { key: "done"; comparisons: number };

export type MergeSortStep = {
  line: number;
  values: readonly number[];
  /** Current range [lo, hi) and its split point, while splitting or merging. */
  lo: number | null;
  mid: number | null;
  hi: number | null;
  /** True while a merge is in progress (fingers and result row are shown). */
  merging: boolean;
  /** Fingers into the left and right halves (0-based within each half). */
  i: number;
  j: number;
  /** Absolute positions compared in this step, if any. */
  compared: readonly [number, number] | null;
  result: readonly number[];
  /** True right after a merge was copied back: lo..hi-1 is sorted. */
  justMerged: boolean;
  done: boolean;
  comparisons: number;
  narration: MergeNarration;
};

const fmt = (xs: readonly number[]) => `[${xs.join(", ")}]`;

export function mergeSortSteps(input: readonly number[]): MergeSortStep[] {
  const values = [...input];
  const steps: MergeSortStep[] = [];
  let comparisons = 0;

  type Extra = Partial<Omit<MergeSortStep, "line" | "values" | "comparisons" | "narration">>;
  const snap = (line: number, narration: MergeNarration, extra: Extra = {}) => {
    steps.push({
      line,
      values: [...values],
      lo: null,
      mid: null,
      hi: null,
      merging: false,
      i: 0,
      j: 0,
      compared: null,
      result: [],
      justMerged: false,
      done: false,
      comparisons,
      narration,
      ...extra,
    });
  };

  const merge = (lo: number, mid: number, hi: number) => {
    const left = values.slice(lo, mid);
    const right = values.slice(mid, hi);
    const result: number[] = [];
    let i = 0;
    let j = 0;
    const range = { lo, mid, hi, merging: true };
    snap(10, { key: "mergeStart", left: fmt(left), right: fmt(right) }, { ...range, i, j });
    while (i < left.length && j < right.length) {
      const a = left[i] as number;
      const b = right[j] as number;
      const compared = [lo + i, mid + j] as const;
      comparisons++;
      if (a <= b) {
        result.push(a);
        i++;
        snap(14, { key: "takeLeft", a, b }, { ...range, i, j, compared, result: [...result] });
      } else {
        result.push(b);
        j++;
        snap(17, { key: "takeRight", a, b }, { ...range, i, j, compared, result: [...result] });
      }
    }
    const rest = [...left.slice(i), ...right.slice(j)];
    if (rest.length > 0) {
      result.push(...rest);
      snap(
        19,
        { key: "rest", rest: fmt(rest) },
        { ...range, i: left.length, j: right.length, result: [...result] },
      );
    }
    values.splice(lo, hi - lo, ...result);
    snap(20, { key: "merged", list: fmt(result) }, { lo, mid, hi, justMerged: true });
  };

  const sort = (lo: number, hi: number) => {
    if (hi - lo <= 1) return;
    const mid = Math.floor((lo + hi) / 2);
    snap(
      4,
      {
        key: "split",
        list: fmt(values.slice(lo, hi)),
        left: fmt(values.slice(lo, mid)),
        right: fmt(values.slice(mid, hi)),
      },
      { lo, mid, hi },
    );
    sort(lo, mid);
    sort(mid, hi);
    merge(lo, mid, hi);
  };

  snap(1, { key: "start", count: values.length });
  sort(0, values.length);
  snap(7, { key: "done", comparisons }, { done: true });
  return steps;
}
