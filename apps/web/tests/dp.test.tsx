import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  coinSteps,
  EDIT_FORMS,
  editSteps,
  fibSteps,
  ITEM_FORMS,
  knapsackSteps,
  LCS_FORMS,
  lcsSteps,
  validateCoins,
  type ItemOp,
  type WordsOp,
} from "../src/features/viz/ds/dp";
import { parseOps, type OpForm } from "../src/features/viz/ds/ops";
import { renderRoute } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const parsed = <Op,>(text: string, forms: readonly OpForm<Op>[]) => {
  const p = parseOps<Op>(text, forms);
  if (!p.ok) throw new Error(text);
  return p.value;
};

describe("memoized Fibonacci", () => {
  it("fib(5) takes 15 steps and 9 calls instead of 15", () => {
    const steps = fibSteps([], [{ kind: "fib", n: 5 }]);
    expect(steps).toHaveLength(15);
    expect(keys(steps)).toEqual([
      "start",
      "call",
      "call",
      "call",
      "call",
      "base",
      "base",
      "store",
      "hit",
      "store",
      "hit",
      "store",
      "hit",
      "store",
      "result",
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ n: 5, value: 5, calls: 9, naive: 15 });
    expect(steps[7]!.question?.correct).toBe("1");
  });

  it("gives the right value for n = 0 to 7", () => {
    const fib = [0, 1, 1, 2, 3, 5, 8, 13];
    for (let n = 0; n <= 7; n++)
      expect(fibSteps([], [{ kind: "fib", n }]).at(-1)!.say.vars?.value, `fib ${n}`).toBe(fib[n]);
  });
});

/** Fewest coins by trying every count of every coin (tiny amounts only). */
function bruteCoins(coins: number[], amount: number): number {
  if (amount === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const c of coins) if (c <= amount) best = Math.min(best, bruteCoins(coins, amount - c) + 1);
  return best;
}

describe("coin change", () => {
  it("coins 1, 3, 4 make 6 with 2 coins (the catalog example)", () => {
    const steps = coinSteps(["1", "3", "4"], [{ kind: "make", amount: 6 }]);
    expect(steps.at(-1)!.state.best).toEqual([0, 1, 2, 1, 1, 2, 2]);
    expect(steps.at(-1)!.say).toEqual({
      key: "answer",
      vars: { amount: 6, value: "2", pieces: "3 + 3", greedy: "3 (4 + 1 + 1)", rest: 0 },
    });
  });

  it("matches trying every combination", () => {
    for (const coins of [
      [1, 3, 4],
      [1, 5, 10],
      [2, 5],
      [3, 7],
    ])
      for (let amount = 1; amount <= 10; amount++) {
        const last = coinSteps(coins.map(String), [{ kind: "make", amount }]).at(-1)!;
        const want = bruteCoins(coins, amount);
        expect(last.say.vars?.value, `${coins} → ${amount}`).toBe(
          want === Number.POSITIVE_INFINITY ? "∞" : String(want),
        );
      }
  });

  it("shows when no answer exists and when biggest-coin-first gets stuck", () => {
    const steps = coinSteps(
      ["3", "5"],
      [
        { kind: "make", amount: 7 },
        { kind: "make", amount: 9 },
      ],
    );
    const ends = steps.filter((s) => ["impossible", "answer", "answerStuck"].includes(s.say.key));
    expect(ends.map((s) => s.say.key)).toEqual(["impossible", "answerStuck"]);
    expect(ends[1]!.say.vars).toMatchObject({ value: "3", greedy: "2 (5 + 3)", rest: 1 });
  });

  it("accepts positive coins only", () => {
    expect(validateCoins(["1", "3"])).toBeNull();
    expect(validateCoins([])).toEqual({ key: "emptyStart" });
    expect(validateCoins(["0"])).toEqual({ key: "badCoin", token: "0" });
    expect(validateCoins(["A"])).toEqual({ key: "badCoin", token: "A" });
  });
});

describe("0/1 knapsack", () => {
  it("capacity 4 takes A + B for 6 (the catalog example)", () => {
    const steps = knapsackSteps(["4"], parsed<ItemOp>("A 1 1, B 3 5, C 4 5", ITEM_FORMS));
    expect(keys(steps)).toEqual([
      "start",
      "row",
      "row",
      "row",
      "skippedItem",
      "tookItem",
      "tookItem",
      "answer",
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ best: 6, taken: "A + B", W: 4 });
    expect(steps.at(-1)!.state.dp[2]).toEqual([0, 1, 1, 5, 6]);
  });

  it("matches trying every subset, and the taken items fit", () => {
    const cases: [string, string][] = [
      ["7", "A 1 1, B 3 4, C 4 5, D 5 7"],
      ["4", "A 3 5, B 2 3, C 2 3"],
      ["5", "A 2 3, B 3 4, C 4 5, D 5 6"],
      ["2", "A 3 9"],
    ];
    for (const [cap, text] of cases) {
      const items = parsed<ItemOp>(text, ITEM_FORMS);
      let best = 0;
      for (let mask = 0; mask < 1 << items.length; mask++) {
        const pick = items.filter((_, i) => mask & (1 << i));
        if (pick.reduce((s, it) => s + it.w, 0) <= Number(cap))
          best = Math.max(
            best,
            pick.reduce((s, it) => s + it.v, 0),
          );
      }
      const last = knapsackSteps([cap], items).at(-1)!;
      expect(last.say.vars?.best, text).toBe(best);
      const taken = last.state.taken.map((n) => items.find((it) => it.name === n)!);
      expect(taken.reduce((s, it) => s + it.w, 0)).toBeLessThanOrEqual(Number(cap));
      expect(taken.reduce((s, it) => s + it.v, 0)).toBe(best);
    }
  });
});

const isSubsequence = (s: string, of: string) => {
  let i = 0;
  for (const ch of of) if (ch === s[i]) i++;
  return i === s.length;
};
const bruteLcs = (a: string, b: string): number =>
  !a || !b
    ? 0
    : a[0] === b[0]
      ? 1 + bruteLcs(a.slice(1), b.slice(1))
      : Math.max(bruteLcs(a.slice(1), b), bruteLcs(a, b.slice(1)));
const bruteEdit = (a: string, b: string): number =>
  !a
    ? b.length
    : !b
      ? a.length
      : Math.min(
          bruteEdit(a.slice(1), b) + 1,
          bruteEdit(a, b.slice(1)) + 1,
          bruteEdit(a.slice(1), b.slice(1)) + (a[0] === b[0] ? 0 : 1),
        );
const PAIRS = ["ABCB BDCB", "GATTA GTA", "ABC XYZ", "CAT CUT", "KITTEN SITTIN", "AB BA", "A A"];

describe("longest common subsequence", () => {
  it("ABCB vs BDCB gives BCB (the catalog example)", () => {
    const steps = lcsSteps([], parsed<WordsOp>("lcs ABCB BDCB", LCS_FORMS));
    expect(keys(steps)).toEqual([
      "start",
      "rowNoMatch",
      "rowMatch",
      "rowMatch",
      "rowMatch",
      "answer",
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ a: "ABCB", b: "BDCB", lcs: "BCB", len: 3 });
  });

  it("matches the plain recursive answer and is a subsequence of both words", () => {
    for (const p of PAIRS) {
      const [a, b] = p.split(" ") as [string, string];
      const vars = lcsSteps([], [{ a, b }]).at(-1)!.say.vars!;
      expect(vars.len, p).toBe(bruteLcs(a, b));
      expect(isSubsequence(String(vars.lcs), a) && isSubsequence(String(vars.lcs), b), p).toBe(
        true,
      );
    }
  });
});

describe("edit distance", () => {
  it("CAT → CUT takes 1 edit (the catalog example)", () => {
    const steps = editSteps([], parsed<WordsOp>("edit cat cut", EDIT_FORMS));
    expect(keys(steps)).toEqual(["start", "borders", "row", "row", "row", "answer"]);
    expect(steps.at(-1)!.say.vars).toEqual({
      a: "CAT",
      b: "CUT",
      d: 1,
      edits: "keep C, A→U, keep T",
    });
  });

  it("matches the plain recursive answer, and the listed edits cost that much", () => {
    for (const p of PAIRS) {
      const [a, b] = p.split(" ") as [string, string];
      const vars = editSteps([], [{ a, b }]).at(-1)!.say.vars!;
      expect(vars.d, p).toBe(bruteEdit(a, b));
      const paid = String(vars.edits)
        .split(", ")
        .filter((e) => !e.startsWith("keep")).length;
      expect(paid, p).toBe(vars.d);
    }
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  return user;
}

describe("dynamic programming players", () => {
  it("Fibonacci asks for fib(2) once both smaller calls return", async () => {
    const user = await open("fibonacci-memo", "Fibonacci with memoization");
    expect(screen.getByText("Step 1 of 15")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const next = screen.getByRole("button", { name: "Next" });
    for (let i = 0; i < 6; i++) await user.click(next);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("What is fib(2)?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("knapsack draws the table with a caption", async () => {
    await open("knapsack", "0/1 knapsack");
    expect(
      screen.getByRole("table", {
        name: "dp[i][c]: rows = items considered so far, columns = capacity",
      }),
    ).toBeVisible();
    expect(screen.getByRole("rowheader", { name: "A (w1, v1)" })).toBeVisible();
  });
});
