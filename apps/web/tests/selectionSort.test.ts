import { describe, expect, it } from "vitest";
import { selectionSortSteps } from "../src/features/viz/selectionSort";

describe("selectionSortSteps", () => {
  it("sorts [3, 1, 4, 2] with 6 comparisons and 3 swaps (the catalog example)", () => {
    const steps = selectionSortSteps([3, 1, 4, 2]);
    expect(steps.map((s) => s.narration.key)).toEqual([
      "start",
      "pass",
      "compareNew",
      "newMin",
      "compareKeep",
      "compareKeep",
      "swap",
      "pass",
      "compareKeep",
      "compareNew",
      "newMin",
      "swap",
      "pass",
      "compareNew",
      "newMin",
      "swap",
      "done",
    ]);
    expect(steps.at(-1)).toMatchObject({ values: [1, 2, 3, 4], comparisons: 6, swaps: 3 });
  });

  it("matches the catalog's arrays after each swap", () => {
    expect(
      selectionSortSteps([3, 1, 4, 2])
        .filter((s) => s.narration.key === "swap")
        .map((s) => s.values),
    ).toEqual([
      [1, 3, 4, 2],
      [1, 2, 4, 3],
      [1, 2, 3, 4],
    ]);
  });

  it("follows the Python line by line", () => {
    expect(selectionSortSteps([3, 1, 4, 2]).map((s) => s.line)).toEqual([
      1, 4, 6, 7, 6, 6, 9, 4, 6, 6, 7, 9, 4, 6, 7, 9, 10,
    ]);
  });

  it("tracks the smallest-so-far position through the first pass", () => {
    const firstPass = selectionSortSteps([3, 1, 4, 2]).slice(1, 6);
    expect(firstPass.map((s) => s.smallest)).toEqual([0, 0, 1, 1, 1]);
  });

  it("grows the sorted prefix from the left, one value per pass", () => {
    const prefixes = selectionSortSteps([5, 4, 3, 2, 1])
      .filter((s) => s.narration.key === "swap" || s.narration.key === "inPlace")
      .map((s) => s.sortedUpTo);
    expect(prefixes).toEqual([1, 2, 3, 4]);
  });

  it("always makes n(n−1)/2 comparisons, even on sorted input", () => {
    expect(selectionSortSteps([1, 2, 3, 4]).at(-1)).toMatchObject({ comparisons: 6, swaps: 0 });
    expect(selectionSortSteps([5, 4, 3, 2, 1]).at(-1)).toMatchObject({
      values: [1, 2, 3, 4, 5],
      comparisons: 10,
      swaps: 2,
    });
  });

  it("keeps each value's id with it when swapping", () => {
    const input = [3, 1, 4, 2];
    for (const s of selectionSortSteps(input)) {
      expect(s.ids.map((id) => input[id])).toEqual(s.values);
    }
  });

  it("handles one value, ties and negatives", () => {
    expect(selectionSortSteps([7]).map((s) => s.narration.key)).toEqual(["start", "done"]);
    expect(selectionSortSteps([2, -3, 2, 0]).at(-1)!.values).toEqual([-3, 0, 2, 2]);
  });

  it("sorts every arrangement of 1..4 with at most 3 swaps", () => {
    const perms = (xs: number[]): number[][] =>
      xs.length <= 1
        ? [xs]
        : xs.flatMap((x, i) =>
            perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]),
          );
    for (const p of perms([1, 2, 3, 4])) {
      const last = selectionSortSteps(p).at(-1)!;
      expect(last.values).toEqual([1, 2, 3, 4]);
      expect(last.swaps).toBeLessThanOrEqual(3);
    }
  });
});
