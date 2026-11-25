import { describe, expect, it } from "vitest";
import { countingSortSteps } from "../src/features/viz/countingSort";
import { heapSortSteps } from "../src/features/viz/heapSort";
import { parseValues } from "../src/features/viz/input";
import { insertionSortSteps } from "../src/features/viz/insertionSort";
import { mergeSortSteps } from "../src/features/viz/mergeSort";
import { quickSortSteps } from "../src/features/viz/quickSort";
import { radixSortSteps } from "../src/features/viz/radixSort";

const perms = (xs: number[]): number[][] =>
  xs.length <= 1
    ? [xs]
    : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
const keysOf = (steps: { narration: { key: string } }[]) => steps.map((s) => s.narration.key);

describe("insertion sort", () => {
  it("matches the catalog example [4, 1, 3, 2]", () => {
    const steps = insertionSortSteps([4, 1, 3, 2]);
    expect(keysOf(steps)).toEqual([
      "start",
      "pick",
      "compareShift",
      "shift",
      "reachedStart",
      "insert",
      "pick",
      "compareShift",
      "shift",
      "compareStop",
      "insert",
      "pick",
      "compareShift",
      "shift",
      "compareShift",
      "shift",
      "compareStop",
      "insert",
      "done",
    ]);
    expect(steps.filter((s) => s.narration.key === "insert").map((s) => s.values)).toEqual([
      [1, 4, 3, 2],
      [1, 3, 4, 2],
      [1, 2, 3, 4],
    ]);
    expect(steps.at(-1)).toMatchObject({ comparisons: 6, shifts: 4, done: true });
  });

  it("follows the Python line by line", () => {
    expect(insertionSortSteps([4, 1, 3, 2]).map((s) => s.line)).toEqual([
      1, 3, 5, 6, 5, 8, 3, 5, 6, 5, 8, 3, 5, 6, 5, 6, 5, 8, 9,
    ]);
  });

  it("does no shifts on sorted input and n(n−1)/2 on reversed input", () => {
    expect(insertionSortSteps([1, 2, 3, 4]).at(-1)).toMatchObject({ comparisons: 3, shifts: 0 });
    expect(insertionSortSteps([5, 4, 3, 2, 1]).at(-1)).toMatchObject({
      values: [1, 2, 3, 4, 5],
      comparisons: 10,
      shifts: 10,
    });
  });

  it("keeps ids with values and sorts every arrangement of 1..4", () => {
    for (const p of perms([1, 2, 3, 4])) {
      const steps = insertionSortSteps(p);
      for (const s of steps) expect(s.ids.map((id) => p[id])).toEqual(s.values);
      expect(steps.at(-1)!.values).toEqual([1, 2, 3, 4]);
    }
  });
});

describe("merge sort", () => {
  it("matches the catalog example [6, 2, 5, 1]", () => {
    const steps = mergeSortSteps([6, 2, 5, 1]);
    expect(keysOf(steps)).toEqual([
      "start",
      "split",
      "split",
      "mergeStart",
      "takeRight",
      "rest",
      "merged",
      "split",
      "mergeStart",
      "takeRight",
      "rest",
      "merged",
      "mergeStart",
      "takeRight",
      "takeLeft",
      "takeRight",
      "rest",
      "merged",
      "done",
    ]);
    expect(steps.filter((s) => s.narration.key === "merged").map((s) => s.narration)).toEqual([
      { key: "merged", list: "[2, 6]" },
      { key: "merged", list: "[1, 5]" },
      { key: "merged", list: "[1, 2, 5, 6]" },
    ]);
    expect(steps.at(-1)).toMatchObject({ values: [1, 2, 5, 6], comparisons: 5 });
  });

  it("only rewrites the array when a merge finishes", () => {
    const steps = mergeSortSteps([6, 2, 5, 1]);
    const lastMergeTakes = steps.slice(12, 17);
    for (const s of lastMergeTakes) expect(s.values).toEqual([2, 6, 1, 5]);
  });

  it("needs 12 comparisons for 8 reversed values and sorts every arrangement of 1..5", () => {
    expect(mergeSortSteps([8, 7, 6, 5, 4, 3, 2, 1]).at(-1)).toMatchObject({
      values: [1, 2, 3, 4, 5, 6, 7, 8],
      comparisons: 12,
    });
    for (const p of perms([1, 2, 3, 4, 5])) {
      expect(mergeSortSteps(p).at(-1)!.values).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("handles one value", () => {
    expect(keysOf(mergeSortSteps([7]))).toEqual(["start", "done"]);
  });
});

describe("quick sort", () => {
  it("matches the catalog example [3, 6, 1, 5, 2]", () => {
    const steps = quickSortSteps([3, 6, 1, 5, 2]);
    expect(keysOf(steps)).toEqual([
      "start",
      "partition",
      "compareBig",
      "compareBig",
      "compareSmall",
      "swap",
      "compareBig",
      "placePivot",
      "single",
      "partition",
      "compareSmall",
      "compareSmall",
      "placePivot",
      "partition",
      "compareSmall",
      "placePivot",
      "single",
      "done",
    ]);
    expect(steps[7]!.values).toEqual([1, 2, 3, 5, 6]);
    expect(steps.at(-1)).toMatchObject({ values: [1, 2, 3, 5, 6], comparisons: 7, swaps: 2 });
  });

  it("sorted input is the worst case for a last-value pivot", () => {
    expect(quickSortSteps([1, 2, 3, 4, 5]).at(-1)).toMatchObject({ comparisons: 10 });
  });

  it("puts every pivot in its final place and sorts every arrangement of 1..5", () => {
    for (const p of perms([1, 2, 3, 4, 5])) {
      const steps = quickSortSteps(p);
      const last = steps.at(-1)!;
      expect(last.values).toEqual([1, 2, 3, 4, 5]);
      for (const s of steps.filter((x) => x.narration.key === "placePivot")) {
        const { p: pos, pivot } = s.narration as { p: number; pivot: number };
        expect(last.values[pos]).toBe(pivot);
      }
      for (const s of steps) expect(s.ids.map((id) => p[id])).toEqual(s.values);
    }
  });
});

describe("heap sort", () => {
  it("matches the catalog example [4, 1, 3]", () => {
    const steps = heapSortSteps([4, 1, 3]);
    expect(keysOf(steps)).toEqual([
      "start",
      "build",
      "siftStart",
      "pickTwo",
      "heapOk",
      "sortPhase",
      "extract",
      "pickOne",
      "heapOk",
      "extract",
      "done",
    ]);
    expect(steps.filter((s) => s.narration.key === "extract").map((s) => s.values)).toEqual([
      [3, 1, 4],
      [1, 3, 4],
    ]);
    expect(steps.at(-1)).toMatchObject({ values: [1, 3, 4], comparisons: 3, swaps: 2 });
  });

  it("builds a valid max-heap before sorting, for every arrangement of 1..5", () => {
    for (const p of perms([1, 2, 3, 4, 5])) {
      const steps = heapSortSteps(p);
      const heap = steps.find((s) => s.narration.key === "sortPhase")!.values;
      for (let i = 1; i < heap.length; i++) {
        expect(heap[Math.floor((i - 1) / 2)]!).toBeGreaterThanOrEqual(heap[i]!);
      }
      expect(steps.at(-1)!.values).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("swaps down when a parent is smaller than its bigger child", () => {
    const steps = heapSortSteps([1, 5, 3]);
    expect(keysOf(steps).slice(0, 6)).toEqual([
      "start",
      "build",
      "siftStart",
      "pickTwo",
      "swapDown",
      "leaf",
    ]);
    expect(steps[4]!.values).toEqual([5, 1, 3]);
  });
});

describe("counting sort", () => {
  it("matches the catalog example [2, 0, 2, 1]", () => {
    const steps = countingSortSteps([2, 0, 2, 1]);
    expect(keysOf(steps)).toEqual([
      "start",
      "makeCounts",
      "tally",
      "tally",
      "tally",
      "tally",
      "write",
      "write",
      "write",
      "done",
    ]);
    expect(steps.at(-1)).toMatchObject({ counts: [1, 1, 2], result: [0, 1, 2, 2] });
  });

  it("skips zero counts and keeps repeats", () => {
    const last = countingSortSteps([3, 1, 3, 3, 1, 0]).at(-1)!;
    expect(last.result).toEqual([0, 1, 1, 3, 3, 3]);
    expect(countingSortSteps([3, 1, 3]).filter((s) => s.narration.key === "write")).toHaveLength(2);
  });

  it("only accepts digits 0..9", () => {
    expect(parseValues("2, 12", "digits")).toEqual({ ok: false, error: "notDigits" });
    expect(parseValues("2, -1", "digits")).toEqual({ ok: false, error: "notDigits" });
    expect(parseValues("9, 0", "digits")).toEqual({ ok: true, items: [9, 0] });
  });
});

describe("radix sort", () => {
  it("matches the catalog example [21, 13, 32, 12]", () => {
    const steps = radixSortSteps([21, 13, 32, 12]);
    expect(steps).toHaveLength(14);
    expect(steps.filter((s) => s.narration.key === "collect").map((s) => s.items)).toEqual([
      [21, 32, 12, 13],
      [12, 13, 21, 32],
    ]);
    expect(steps.at(-1)!.narration).toEqual({
      key: "done",
      place: 100,
      max: 32,
      list: "[12, 13, 21, 32]",
    });
  });

  it("drops each value into the bucket of its current digit", () => {
    const drops = radixSortSteps([21, 13, 32, 12]).filter((s) => s.narration.key === "drop");
    expect(drops.map((s) => s.bucket)).toEqual([1, 3, 2, 2, 2, 3, 1, 1]);
  });

  it("needs one pass for single digits and none for all zeros", () => {
    expect(radixSortSteps([5, 3, 8]).filter((s) => s.narration.key === "pass")).toHaveLength(1);
    expect(keysOf(radixSortSteps([0, 0]))).toEqual(["start", "done"]);
  });

  it("rejects negative values", () => {
    expect(parseValues("4, -2", "nonNegative")).toEqual({ ok: false, error: "negative" });
  });
});
