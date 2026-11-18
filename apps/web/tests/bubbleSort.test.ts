import { describe, expect, it } from "vitest";
import { bubbleSortSteps } from "../src/features/viz/bubbleSort";
import { parseValues } from "../src/features/viz/input";

describe("bubbleSortSteps", () => {
  it("sorts [5, 1, 4, 2] in 3 passes with an early exit (the catalog example)", () => {
    const steps = bubbleSortSteps([5, 1, 4, 2]);
    expect(steps.map((s) => s.narration.key)).toEqual([
      "start",
      "pass",
      "compareSwap",
      "swap",
      "compareSwap",
      "swap",
      "compareSwap",
      "swap",
      "passEnd",
      "pass",
      "compareKeep",
      "compareSwap",
      "swap",
      "passEnd",
      "pass",
      "compareKeep",
      "earlyExit",
      "done",
    ]);
    expect(steps.at(-1)).toMatchObject({ values: [1, 2, 4, 5], comparisons: 6, swaps: 4 });
  });

  it("matches the catalog's pass-by-pass arrays", () => {
    const afterPasses = bubbleSortSteps([5, 1, 4, 2])
      .filter((s) => s.narration.key === "passEnd")
      .map((s) => s.values);
    expect(afterPasses).toEqual([
      [1, 4, 2, 5],
      [1, 2, 4, 5],
    ]);
  });

  it("follows the Python line by line for the first pass", () => {
    expect(
      bubbleSortSteps([5, 1, 4, 2])
        .slice(0, 9)
        .map((s) => s.line),
    ).toEqual([1, 4, 6, 7, 6, 7, 6, 7, 9]);
  });

  it("keeps each value's id with it when swapping, so bars can slide", () => {
    const steps = bubbleSortSteps([5, 1, 4, 2]);
    for (const s of steps) {
      expect(s.ids.map((id) => [5, 1, 4, 2][id])).toEqual(s.values);
    }
  });

  it("grows the sorted tail from the right after each pass", () => {
    const tails = bubbleSortSteps([5, 4, 3, 2, 1])
      .filter((s) => s.narration.key === "passEnd")
      .map((s) => s.sortedFrom);
    expect(tails).toEqual([4, 3, 2, 1]);
  });

  it("needs only one pass on already-sorted input (best case)", () => {
    const steps = bubbleSortSteps([1, 2, 3, 4]);
    expect(steps.filter((s) => s.narration.key === "pass")).toHaveLength(1);
    expect(steps.at(-1)).toMatchObject({ comparisons: 3, swaps: 0 });
    expect(steps.at(-2)!.narration).toEqual({ key: "earlyExit", pass: 1 });
  });

  it("does n(n−1)/2 comparisons and swaps on reversed input (worst case)", () => {
    expect(bubbleSortSteps([5, 4, 3, 2, 1]).at(-1)).toMatchObject({
      values: [1, 2, 3, 4, 5],
      comparisons: 10,
      swaps: 10,
    });
  });

  it("handles one value, two values, ties and negatives", () => {
    expect(bubbleSortSteps([7]).map((s) => s.narration.key)).toEqual(["start", "done"]);
    expect(bubbleSortSteps([2, 1]).at(-1)!.values).toEqual([1, 2]);
    expect(bubbleSortSteps([3, -1, 3, 0]).at(-1)!.values).toEqual([-1, 0, 3, 3]);
  });

  it("sorts every 4-value arrangement of 1..4 correctly", () => {
    const perms = (xs: number[]): number[][] =>
      xs.length <= 1
        ? [xs]
        : xs.flatMap((x, i) =>
            perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]),
          );
    for (const p of perms([1, 2, 3, 4])) {
      const last = bubbleSortSteps(p).at(-1)!;
      expect(last.values).toEqual([1, 2, 3, 4]);
      expect(last.sortedFrom).toBe(0);
    }
  });
});

describe("parseValues", () => {
  it("accepts up to 8 values without a target", () => {
    expect(parseValues("5 1 4 2")).toEqual({ ok: true, items: [5, 1, 4, 2] });
    expect(parseValues("1,2,3,4,5,6,7,8,9")).toEqual({ ok: false, error: "tooMany" });
  });
});
