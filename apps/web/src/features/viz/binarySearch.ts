/**
 * Iterative binary search as a list of full-state snapshots, one per teaching
 * moment. Input must be sorted ascending (checked by input.ts).
 */

/** The Python shown beside the visualization. Line numbers below are 1-based. */
export const BINARY_SEARCH_CODE: readonly string[] = [
  "def binary_search(items, target):",
  "    lo, hi = 0, len(items) - 1",
  "    while lo <= hi:",
  "        mid = (lo + hi) // 2",
  "        if items[mid] == target:",
  "            return mid",
  "        elif items[mid] < target:",
  "            lo = mid + 1",
  "        else:",
  "            hi = mid - 1",
  "    return -1",
];

/** Where the target lies relative to items[mid]. */
export type Direction = "found" | "right" | "left";

export type BinaryNarration =
  | { key: "start"; target: number; count: number }
  | { key: "init"; lo: number; hi: number }
  | { key: "loop"; lo: number; hi: number }
  | { key: "mid"; lo: number; hi: number; mid: number }
  | { key: "compareNo"; mid: number; value: number; target: number }
  | { key: "compareYes"; mid: number; value: number; target: number }
  | { key: "goRight"; value: number; target: number; lo: number }
  | { key: "goLeft"; value: number; target: number; hi: number }
  | { key: "found"; mid: number; comparisons: number }
  | { key: "empty"; lo: number; hi: number }
  | { key: "notFound"; target: number; comparisons: number };

export type BinarySearchStep = {
  line: number;
  lo: number | null;
  hi: number | null;
  mid: number | null;
  /** Index being compared in this step, if any. */
  comparing: number | null;
  /** For a comparison step: where the target turned out to be. */
  direction: Direction | null;
  found: number | null;
  comparisons: number;
  result: number | null;
  narration: BinaryNarration;
};

export function binarySearchSteps(items: readonly number[], target: number): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let comparisons = 0;
  const base = { mid: null, comparing: null, direction: null, found: null, result: null };

  steps.push({
    ...base,
    line: 1,
    lo: null,
    hi: null,
    comparisons,
    narration: { key: "start", target, count: items.length },
  });

  let lo = 0;
  let hi = items.length - 1;
  steps.push({ ...base, line: 2, lo, hi, comparisons, narration: { key: "init", lo, hi } });

  while (true) {
    if (lo > hi) {
      steps.push({ ...base, line: 3, lo, hi, comparisons, narration: { key: "empty", lo, hi } });
      steps.push({
        ...base,
        line: 11,
        lo,
        hi,
        comparisons,
        result: -1,
        narration: { key: "notFound", target, comparisons },
      });
      return steps;
    }
    steps.push({ ...base, line: 3, lo, hi, comparisons, narration: { key: "loop", lo, hi } });

    const mid = Math.floor((lo + hi) / 2);
    const value = items[mid] as number;
    steps.push({
      ...base,
      line: 4,
      lo,
      hi,
      mid,
      comparisons,
      narration: { key: "mid", lo, hi, mid },
    });

    comparisons++;
    const direction: Direction = value === target ? "found" : value < target ? "right" : "left";
    steps.push({
      ...base,
      line: 5,
      lo,
      hi,
      mid,
      comparing: mid,
      direction,
      comparisons,
      narration:
        direction === "found"
          ? { key: "compareYes", mid, value, target }
          : { key: "compareNo", mid, value, target },
    });

    if (direction === "found") {
      steps.push({
        ...base,
        line: 6,
        lo,
        hi,
        mid,
        found: mid,
        comparisons,
        result: mid,
        narration: { key: "found", mid, comparisons },
      });
      return steps;
    }
    if (direction === "right") {
      lo = mid + 1;
      steps.push({
        ...base,
        line: 8,
        lo,
        hi,
        mid,
        comparisons,
        narration: { key: "goRight", value, target, lo },
      });
    } else {
      hi = mid - 1;
      steps.push({
        ...base,
        line: 10,
        lo,
        hi,
        mid,
        comparisons,
        narration: { key: "goLeft", value, target, hi },
      });
    }
  }
}

/** True when index `i` is outside the current search range lo..hi. */
export function isDiscarded(step: BinarySearchStep, i: number): boolean {
  if (step.lo === null || step.hi === null) return false;
  return i < step.lo || i > step.hi;
}
