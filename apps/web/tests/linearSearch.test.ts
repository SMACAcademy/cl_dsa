import { describe, expect, it } from "vitest";
import { parseInput } from "../src/features/viz/input";
import { linearSearchSteps } from "../src/features/viz/linearSearch";

describe("linearSearchSteps", () => {
  it("finds 1 in [4, 8, 1, 9] at index 2 after 3 comparisons", () => {
    const steps = linearSearchSteps([4, 8, 1, 9], 1);
    expect(steps.map((s) => s.narration.key)).toEqual([
      "start",
      "move",
      "compareNo",
      "move",
      "compareNo",
      "move",
      "compareYes",
      "found",
    ]);
    const last = steps.at(-1)!;
    expect(last).toMatchObject({ line: 4, found: 2, result: 2, comparisons: 3, checked: [0, 1] });
  });

  it("follows the Python line by line", () => {
    expect(linearSearchSteps([4, 8, 1, 9], 1).map((s) => s.line)).toEqual([1, 2, 3, 2, 3, 2, 3, 4]);
  });

  it("stops at the first match when the target appears twice", () => {
    const last = linearSearchSteps([7, 3, 7], 7).at(-1)!;
    expect(last.result).toBe(0);
    expect(last.comparisons).toBe(1);
  });

  it("returns -1 after checking every value when the target is missing", () => {
    const steps = linearSearchSteps([5, 3, 8], 4);
    const last = steps.at(-1)!;
    expect(last).toMatchObject({
      line: 5,
      result: -1,
      found: null,
      comparisons: 3,
      checked: [0, 1, 2],
      i: null,
    });
    expect(last.narration).toEqual({ key: "notFound", target: 4, comparisons: 3 });
  });

  it("marks only the current index as comparing, and earlier ones as checked", () => {
    const compare = linearSearchSteps([4, 8, 1, 9], 1).filter((s) => s.comparing !== null);
    expect(compare.map((s) => [s.comparing, s.checked])).toEqual([
      [0, []],
      [1, [0]],
      [2, [0, 1]],
    ]);
  });

  it("comparisons never decrease from one step to the next", () => {
    const steps = linearSearchSteps([2, 4, 6, 8, 10, 12, 14, 16], 99);
    for (let k = 1; k < steps.length; k++) {
      expect(steps[k]!.comparisons).toBeGreaterThanOrEqual(steps[k - 1]!.comparisons);
    }
    expect(steps.at(-1)!.comparisons).toBe(8);
  });
});

describe("parseInput", () => {
  it("accepts commas, spaces and negative numbers", () => {
    expect(parseInput(" 4, 8  -1,9 ", "-1")).toEqual({
      ok: true,
      items: [4, 8, -1, 9],
      target: -1,
    });
  });

  it.each([
    ["", "1", "empty"],
    ["1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17", "1", "tooMany"],
    ["1, two, 3", "1", "notInteger"],
    ["1.5, 2", "1", "notInteger"],
    ["1, 2", "x", "notInteger"],
    ["1, 200", "1", "outOfRange"],
    ["1, 2", "", "targetMissing"],
  ])("rejects values %j with target %j as %s", (values, target, error) => {
    expect(parseInput(values, target)).toEqual({ ok: false, error });
  });
});
