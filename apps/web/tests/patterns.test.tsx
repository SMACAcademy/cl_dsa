import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  prefixSumSteps,
  slidingWindowSteps,
  sortedNumbers,
  twoPointerSteps,
} from "../src/features/viz/ds/patterns";
import { renderRoute, startFromCard } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const strs = (...xs: number[]) => xs.map(String);

describe("two pointers", () => {
  it("finds 2 + 7 = 9 in [1, 2, 4, 7, 11] (the catalog example)", () => {
    const steps = twoPointerSteps(strs(1, 2, 4, 7, 11), [{ kind: "pair", target: 9 }]);
    expect(keys(steps)).toEqual(["start", "pointers", "tooBig", "tooSmall", "found", "end"]);
    expect(steps.filter((s) => s.question).map((s) => s.question?.correct)).toEqual([
      "← R",
      "L →",
      "=",
    ]);
  });

  it("agrees with checking every pair, for every target", () => {
    const values = [1, 3, 4, 6, 8, 9];
    for (let target = 0; target <= 20; target++) {
      const steps = twoPointerSteps(strs(...values), [{ kind: "pair", target }]);
      const brute = values.some((a, i) => values.some((b, j) => i < j && a + b === target));
      expect(keys(steps).includes("found"), `target ${target}`).toBe(brute);
    }
  });

  it("needs sorted numbers", () => {
    expect(sortedNumbers(["1", "2", "2", "5"])).toBeNull();
    expect(sortedNumbers(["3", "1"])).toEqual({ key: "notSorted" });
    expect(sortedNumbers([])).toEqual({ key: "emptyStart" });
  });
});

describe("sliding window", () => {
  it("windows 8, 7, 9 give a best of 9 (the catalog example)", () => {
    const steps = slidingWindowSteps(strs(2, 1, 5, 1, 3), [{ kind: "window", k: 3 }]);
    expect(keys(steps)).toEqual(["start", "first", "slide", "slideBest", "best", "end"]);
    expect(steps.find((s) => s.say.key === "best")!.say.vars).toMatchObject({
      best: 9,
      from: 2,
      to: 4,
    });
  });

  it("matches a brute-force maximum for every k", () => {
    const values = [4, -2, 1, 7, 8, -1, 2, 8];
    for (let k = 1; k <= values.length; k++) {
      const steps = slidingWindowSteps(strs(...values), [{ kind: "window", k }]);
      const brute = Math.max(
        ...values
          .slice(0, values.length - k + 1)
          .map((_, i) => values.slice(i, i + k).reduce((a, b) => a + b, 0)),
      );
      expect(steps.find((s) => s.say.key === "best")!.say.vars?.best, `k ${k}`).toBe(brute);
    }
  });

  it("explains a window that doesn't fit", () => {
    expect(keys(slidingWindowSteps(strs(1, 2), [{ kind: "window", k: 5 }]))).toContain("badK");
  });
});

describe("prefix sums", () => {
  it("builds [0, 3, 4, 8, 9] and answers sum(1..2) = 5 (the catalog example)", () => {
    const steps = prefixSumSteps(strs(3, 1, 4, 1), [{ kind: "sum", l: 1, r: 2 }]);
    expect(steps.find((s) => s.say.key === "built")!.state.extra).toEqual([0, 3, 4, 8, 9]);
    expect(steps.find((s) => s.say.key === "query")!.say.vars).toEqual({
      l: 1,
      r: 2,
      r1: 3,
      hi: 8,
      lo: 3,
      total: 5,
    });
    expect(steps).toHaveLength(8);
  });

  it("answers every range correctly, with negatives too", () => {
    const values = [4, -3, 2, -1, 5];
    for (let l = 0; l < values.length; l++) {
      for (let r = l; r < values.length; r++) {
        const steps = prefixSumSteps(strs(...values), [{ kind: "sum", l, r }]);
        expect(steps.find((s) => s.say.key === "query")!.say.vars?.total).toBe(
          values.slice(l, r + 1).reduce((a, b) => a + b, 0),
        );
      }
    }
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  await startFromCard(user);
  return user;
}

describe("pattern players", () => {
  it.each([
    ["two-pointers", "Two pointers", 6],
    ["sliding-window", "Sliding window", 6],
    ["prefix-sums", "Prefix sums", 8],
  ])("%s runs its first preset in the expected number of steps", async (id, name, total) => {
    await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
  });

  it("two pointers asks which pointer moves", async () => {
    const user = await open("two-pointers", "Two pointers");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText(
        "1 + 11 vs 9: move L → (sum too small), ← R (too big), or stop (=)?",
      ),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "← R" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("two pointers rejects unsorted values", async () => {
    const user = await open("two-pointers", "Two pointers");
    const start = screen.getByLabelText("Start with (up to 16 values, may be empty)");
    await user.clear(start);
    await user.type(start, "5, 1, 3");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("needs the values in ascending order");
  });
});
