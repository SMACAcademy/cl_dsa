import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  attacked,
  queensSteps,
  subsetSteps,
  validateItems,
} from "../src/features/viz/ds/backtracking";
import { renderRoute, startFromCard } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);

describe("generating subsets", () => {
  it("[1, 2] gives [], [2], [1], [1, 2] (the catalog example)", () => {
    const steps = subsetSteps(["1", "2"], [{ kind: "all" }]);
    expect(keys(steps)).toEqual([
      "start",
      "skip",
      "leaf",
      "leaf",
      "undo",
      "take",
      "leaf",
      "leaf",
      "undo",
      "undo",
      "end",
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ count: 4, n: 2, list: "[], [2], [1], [1, 2]" });
    expect(steps[2]!.question).toMatchObject({ correct: "[]" });
    expect(steps[2]!.question!.options).toContain("[2]");
  });

  it("lists 2ⁿ subsets, and the sum mode finds exactly the subsets that add up", () => {
    for (const items of [[5], [1, 2, 3], [1, 1, 2], [1, 2, 3, 4], [3, 9, 4, 2]]) {
      const start = items.map(String);
      const all = subsetSteps(start, [{ kind: "all" }]).at(-1)!;
      expect(all.state.out, String(items)).toHaveLength(2 ** items.length);
      for (const target of [0, 3, 5, 7]) {
        let want = 0;
        for (let mask = 0; mask < 1 << items.length; mask++)
          if (items.filter((_, i) => mask & (1 << i)).reduce((s, x) => s + x, 0) === target) want++;
        const last = subsetSteps(start, [{ kind: "sum", target }]).at(-1)!;
        expect(last.say.vars?.count, `${items} sum ${target}`).toBe(want);
      }
    }
  });

  it("prunes branches whose sum is already too big", () => {
    const steps = subsetSteps(["1", "2", "3", "4"], [{ kind: "sum", target: 5 }]);
    expect(steps.at(-1)!.say).toMatchObject({
      key: "endSum",
      vars: { count: 2, list: "[2, 3], [1, 4]" },
    });
    expect(Number(steps.at(-1)!.say.vars?.pruned)).toBeGreaterThan(0);
    expect(keys(steps)).toContain("prune");
  });

  it("accepts 1 to 4 positive whole numbers", () => {
    expect(validateItems(["1", "2"])).toBeNull();
    expect(validateItems([])).toEqual({ key: "emptyStart" });
    expect(validateItems(["1", "2", "3", "4", "5"])).toEqual({ key: "tooManyStart", max: 4 });
    expect(validateItems(["0"])).toEqual({ key: "badPositive", token: "0" });
    expect(validateItems(["A"])).toEqual({ key: "badPositive", token: "A" });
  });
});

/** The first answer in column order, by trying every arrangement. */
function firstSolution(n: number): number[] | null {
  const perm: number[] = [];
  const tryRow = (): boolean => {
    if (perm.length === n) return true;
    for (let c = 1; c <= n; c++) {
      if (perm.includes(c)) continue;
      perm.push(c);
      const r = perm.length;
      if (!attacked(perm, r, c) && tryRow()) return true;
      perm.pop();
    }
    return false;
  };
  return tryRow() ? perm : null;
}

describe("N-Queens", () => {
  it("4 × 4 backs up twice and ends at columns 2, 4, 1, 3 (the catalog example)", () => {
    const steps = queensSteps([], [{ n: 4 }]);
    expect(keys(steps)).toEqual([
      "start",
      "place",
      "place",
      "dead",
      "lift",
      "place",
      "place",
      "dead",
      "lift",
      "deadFrom",
      "lift",
      "deadEnd",
      "lift",
      "place",
      "place",
      "place",
      "place",
      "solved",
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ cols: "2, 4, 1, 3" });
    expect(steps[1]!.question).toMatchObject({
      correct: "1",
      options: ["1", "2", "3", "4", "none"],
    });
    expect(steps[3]!.question).toMatchObject({ correct: "none" });
  });

  it("matches trying every arrangement for boards 1 to 8, and never places an attacked queen", () => {
    for (let n = 1; n <= 8; n++) {
      const steps = queensSteps([], [{ n }]);
      const want = firstSolution(n);
      if (want === null) expect(steps.at(-1)!.say.key, `n = ${n}`).toBe("none");
      else expect(steps.at(-1)!.state.cols, `n = ${n}`).toEqual(want);
      for (const s of steps.filter((x) => x.say.key === "place")) {
        const cols = s.state.cols;
        cols.forEach((c, i) => expect(attacked(cols, i + 1, c)).toBe(false));
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

describe("backtracking players", () => {
  it("subsets asks which subset a leaf holds", async () => {
    const user = await open("subsets", "Generating subsets");
    expect(screen.getByText("Step 1 of 11")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("Every item is decided. Which subset does this leaf hold?"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "[]" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("N-Queens draws the board and asks for the first safe column", async () => {
    const user = await open("n-queens", "N-Queens");
    expect(screen.getByText("Step 1 of 18")).toBeVisible();
    expect(screen.getByRole("table", { name: /^4 × 4 board/ })).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("Row 1: which is the first safe column, starting at column 1?"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getAllByText("queen")).toHaveLength(1);
  });
});
