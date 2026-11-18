import { describe, expect, it } from "vitest";
import { binarySearchSteps, isDiscarded } from "../src/features/viz/binarySearch";
import { parseInput } from "../src/features/viz/input";

const keys = (items: number[], target: number) =>
  binarySearchSteps(items, target).map((s) => s.narration.key);

describe("binarySearchSteps", () => {
  it("finds 7 in [1, 3, 5, 7, 9, 11] at index 3 after 3 comparisons (the catalog example)", () => {
    const steps = binarySearchSteps([1, 3, 5, 7, 9, 11], 7);
    expect(steps.map((s) => s.narration.key)).toEqual([
      "start",
      "init",
      "loop",
      "mid",
      "compareNo",
      "goRight",
      "loop",
      "mid",
      "compareNo",
      "goLeft",
      "loop",
      "mid",
      "compareYes",
      "found",
    ]);
    expect(steps.filter((s) => s.narration.key === "mid").map((s) => s.mid)).toEqual([2, 4, 3]);
    expect(steps.at(-1)).toMatchObject({ line: 6, result: 3, found: 3, comparisons: 3 });
  });

  it("follows the Python line by line", () => {
    expect(binarySearchSteps([1, 3, 5, 7, 9, 11], 7).map((s) => s.line)).toEqual([
      1, 2, 3, 4, 5, 8, 3, 4, 5, 10, 3, 4, 5, 6,
    ]);
  });

  it("narrows lo..hi exactly as the code does", () => {
    const ranges = binarySearchSteps([1, 3, 5, 7, 9, 11], 7)
      .filter((s) => s.narration.key === "loop")
      .map((s) => [s.lo, s.hi]);
    expect(ranges).toEqual([
      [0, 5],
      [3, 5],
      [3, 3],
    ]);
  });

  it("goes left when the middle value is too big", () => {
    expect(keys([2, 4, 6, 8, 10], 4)).toEqual([
      "start",
      "init",
      "loop",
      "mid",
      "compareNo",
      "goLeft",
      "loop",
      "mid",
      "compareNo",
      "goRight",
      "loop",
      "mid",
      "compareYes",
      "found",
    ]);
  });

  it("returns -1 when lo passes hi", () => {
    const steps = binarySearchSteps([2, 4, 6, 8], 5);
    const last = steps.at(-1)!;
    expect(steps.at(-2)!.narration).toEqual({ key: "empty", lo: 2, hi: 1 });
    expect(last).toMatchObject({ line: 11, result: -1, found: null, comparisons: 2 });
  });

  it("handles a single value and targets beyond both ends", () => {
    expect(binarySearchSteps([5], 5).at(-1)).toMatchObject({ result: 0, comparisons: 1 });
    expect(binarySearchSteps([1, 2, 3], 99).at(-1)).toMatchObject({ result: -1, comparisons: 2 });
    expect(binarySearchSteps([1, 2, 3], -5).at(-1)).toMatchObject({ result: -1, comparisons: 2 });
  });

  it("agrees with a plain search on every target from -1 to 9 for an 8-value list", () => {
    const items = [0, 1, 2, 4, 4, 6, 7, 8];
    for (let target = -1; target <= 9; target++) {
      const result = binarySearchSteps(items, target).at(-1)!.result!;
      if (items.includes(target)) expect(items[result]).toBe(target);
      else expect(result).toBe(-1);
    }
  });

  it("never needs more than 4 comparisons for 8 values (⌊log₂ 8⌋ + 1)", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    for (let target = 0; target <= 9; target++) {
      expect(binarySearchSteps(items, target).at(-1)!.comparisons).toBeLessThanOrEqual(4);
    }
  });

  it("marks values outside lo..hi as discarded", () => {
    const afterFirstMove = binarySearchSteps([1, 3, 5, 7, 9, 11], 7)[5]!;
    expect([0, 1, 2, 3, 4, 5].map((i) => isDiscarded(afterFirstMove, i))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe("parseInput for binary search", () => {
  it("rejects unsorted values", () => {
    expect(parseInput("3, 1, 2", "1", { requireSorted: true })).toEqual({
      ok: false,
      error: "notSorted",
    });
  });

  it("accepts sorted values with ties", () => {
    expect(parseInput("1, 2, 2, 5", "2", { requireSorted: true })).toEqual({
      ok: true,
      items: [1, 2, 2, 5],
      target: 2,
    });
  });
});
