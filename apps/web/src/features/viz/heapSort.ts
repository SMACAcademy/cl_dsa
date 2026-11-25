/**
 * Heap sort as full-state snapshots: build a max-heap by sifting down from the
 * last parent, then repeatedly move the maximum to the end and repair the heap.
 */

export const HEAP_SORT_CODE: readonly string[] = [
  "def heap_sort(items):",
  "    n = len(items)",
  "    for start in range(n // 2 - 1, -1, -1):",
  "        sift_down(items, start, n)",
  "    for end in range(n - 1, 0, -1):",
  "        items[0], items[end] = items[end], items[0]",
  "        sift_down(items, 0, end)",
  "    return items",
  "",
  "def sift_down(items, root, size):",
  "    while 2 * root + 1 < size:",
  "        child = 2 * root + 1",
  "        if child + 1 < size and items[child + 1] > items[child]:",
  "            child += 1",
  "        if items[root] >= items[child]:",
  "            return",
  "        items[root], items[child] = items[child], items[root]",
  "        root = child",
];

export type HeapNarration =
  | { key: "start"; count: number }
  | { key: "build"; k: number }
  | { key: "siftStart"; root: number; value: number }
  | { key: "pickTwo"; root: number; a: number; b: number; c: number; child: number }
  | { key: "pickOne"; root: number; c: number; child: number }
  | { key: "heapOk"; v: number; c: number }
  | { key: "swapDown"; v: number; c: number }
  | { key: "leaf"; root: number }
  | { key: "sortPhase" }
  | { key: "extract"; max: number; end: number }
  | { key: "done"; comparisons: number; swaps: number };

export type HeapSortStep = {
  line: number;
  values: readonly number[];
  ids: readonly number[];
  /** Positions < heapSize form the heap; the rest are in their final place. */
  heapSize: number;
  root: number | null;
  child: number | null;
  /** For a parent-vs-child decision step: whether they swap. */
  swapNeeded: boolean | null;
  swappedPair: readonly [number, number] | null;
  done: boolean;
  comparisons: number;
  swaps: number;
  narration: HeapNarration;
};

export function heapSortSteps(input: readonly number[]): HeapSortStep[] {
  const values = [...input];
  const ids = input.map((_, k) => k);
  const n = values.length;
  const steps: HeapSortStep[] = [];
  let heapSize = n;
  let comparisons = 0;
  let swaps = 0;

  type Extra = Partial<
    Pick<HeapSortStep, "root" | "child" | "swapNeeded" | "swappedPair" | "done">
  >;
  const snap = (line: number, narration: HeapNarration, extra: Extra = {}) => {
    steps.push({
      line,
      values: [...values],
      ids: [...ids],
      heapSize,
      root: null,
      child: null,
      swapNeeded: null,
      swappedPair: null,
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

  const siftDown = (start: number, size: number) => {
    let root = start;
    let moved = false;
    while (2 * root + 1 < size) {
      let child = 2 * root + 1;
      const hasRight = child + 1 < size;
      if (hasRight) {
        const a = values[child] as number;
        const b = values[child + 1] as number;
        comparisons++;
        if (b > a) child += 1;
        snap(
          child === 2 * root + 2 ? 14 : 13,
          { key: "pickTwo", root, a, b, c: values[child] as number, child },
          { root, child },
        );
      } else {
        snap(12, { key: "pickOne", root, c: values[child] as number, child }, { root, child });
      }
      const v = values[root] as number;
      const c = values[child] as number;
      comparisons++;
      if (v >= c) {
        snap(16, { key: "heapOk", v, c }, { root, child, swapNeeded: false });
        return;
      }
      swap(root, child);
      snap(
        17,
        { key: "swapDown", v, c },
        { root, child, swapNeeded: true, swappedPair: [root, child] },
      );
      root = child;
      moved = true;
    }
    if (moved) snap(11, { key: "leaf", root }, { root });
  };

  snap(1, { key: "start", count: n });
  if (n > 1) {
    snap(3, { key: "build", k: Math.floor(n / 2) - 1 });
    for (let start = Math.floor(n / 2) - 1; start >= 0; start--) {
      snap(4, { key: "siftStart", root: start, value: values[start] as number }, { root: start });
      siftDown(start, n);
    }
    snap(5, { key: "sortPhase" });
    for (let end = n - 1; end > 0; end--) {
      const max = values[0] as number;
      swap(0, end);
      heapSize = end;
      snap(6, { key: "extract", max, end }, { swappedPair: [0, end] });
      siftDown(0, end);
    }
  }
  heapSize = 0;
  snap(8, { key: "done", comparisons, swaps }, { done: true });
  return steps;
}
