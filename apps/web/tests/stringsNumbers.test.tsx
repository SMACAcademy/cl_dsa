import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { parseOps } from "../src/features/viz/ds/ops";
import {
  failTable,
  FIND_FORMS,
  GCD_FORMS,
  gcdSteps,
  kmpSteps,
  naiveSteps,
  sieveSteps,
} from "../src/features/viz/ds/stringsNumbers";
import { renderRoute, startFromCard } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);

/** Every position where `pat` occurs in `text`, overlaps included. */
const positions = (pat: string, text: string) =>
  Array.from({ length: Math.max(0, text.length - pat.length + 1) }, (_, s) => s).filter(
    (s) => text.slice(s, s + pat.length) === pat,
  );
const CASES = [
  ["ab", "aab"],
  ["aa", "aaaa"],
  ["aab", "aaaaab"],
  ["abab", "abacababab"],
  ["aabaab", "aabaabaab"],
  ["xyz", "abcabc"],
  ["abcdef", "abc"],
  ["a", "banana"],
] as const;

describe("naive string matching", () => {
  it("finds ab in aab at position 1 (the catalog example)", () => {
    const steps = naiveSteps([], [{ pat: "ab", text: "aab" }]);
    expect(keys(steps)).toEqual(["start", "eq", "ne", "eq", "eq", "match", "end"]);
    expect(steps.at(-1)!.say.vars).toEqual({ list: "1", compares: 4 });
    expect(steps[1]!.question?.correct).toBe("✗");
    expect(steps[3]!.question?.correct).toBe("✓");
  });

  it("finds every occurrence, overlaps included", () => {
    for (const [pat, text] of CASES) {
      const last = naiveSteps([], [{ pat, text }]).at(-1)!;
      expect(last.state.found, `${pat} in ${text}`).toEqual(positions(pat, text));
    }
  });

  it("reads 'find AB in AAB' case-insensitively", () => {
    const p = parseOps("find AB in AAB", FIND_FORMS);
    expect(p).toEqual({ ok: true, value: [{ pat: "ab", text: "aab" }] });
  });
});

describe("KMP", () => {
  it("abab has the fail table 0, 0, 1, 2 (the catalog example)", () => {
    expect(failTable("abab")).toEqual([0, 0, 1, 2]);
    const steps = kmpSteps([], [{ pat: "abab", text: "abab" }]);
    const fills = steps.filter((s) => s.say.key.startsWith("fill"));
    expect(fills.map((s) => s.say.vars?.k)).toEqual([0, 1, 2]);
    expect(fills[2]!.say.vars).toMatchObject({ prefix: "abab", part: "ab" });
  });

  it("matches brute force for every case, with one step per text letter", () => {
    for (const [pat, text] of CASES) {
      const steps = kmpSteps([], [{ pat, text }]);
      expect(steps.at(-1)!.state.found, `${pat} in ${text}`).toEqual(positions(pat, text));
      const reads = steps.filter((s) =>
        ["match", "miss", "jumpMatch", "jumpMiss"].includes(s.say.key),
      );
      expect(reads).toHaveLength(text.length);
    }
  });

  it("keeps the overlap after a mismatch instead of restarting", () => {
    const steps = kmpSteps([], [{ pat: "abab", text: "abacababab" }]);
    const jump = steps.find((s) => s.say.key.startsWith("jump"))!;
    expect(jump.say.vars).toMatchObject({ i: 3, ch: "c", chain: "3 → 1 → 0" });
    expect(steps.at(-1)!.say.vars?.list).toBe("4, 6");
  });
});

describe("Euclid's GCD", () => {
  it("gcd(48, 18) takes three steps to reach 6 (the catalog example)", () => {
    const steps = gcdSteps([], [{ a: 48, b: 18 }]);
    expect(keys(steps)).toEqual(["start", "mod", "mod", "mod", "done"]);
    expect(steps.slice(1, 4).map((s) => s.say.vars?.r)).toEqual([12, 6, 0]);
    expect(steps[1]!.question?.correct).toBe("12");
    expect(steps.at(-1)!.say.vars).toEqual({ g: 6, steps: 3 });
  });

  it("matches a slow check, and the squares exactly tile the rectangle", () => {
    const slowGcd = (a: number, b: number) => {
      let g = 1;
      for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
      return g;
    };
    for (const [a, b] of [
      [48, 18],
      [12, 30],
      [21, 13],
      [7, 7],
      [1, 999],
      [100, 75],
    ] as const) {
      const last = gcdSteps([], [{ a, b }]).at(-1)!;
      expect(last.say.vars?.g, `gcd(${a}, ${b})`).toBe(slowGcd(a, b));
      const squares = last.state.squares;
      expect(squares.reduce((sum, q) => sum + q.size * q.size, 0)).toBe(a * b);
      for (const q of squares) {
        expect(q.x + q.size).toBeLessThanOrEqual(a);
        expect(q.y + q.size).toBeLessThanOrEqual(b);
      }
    }
  });

  it("swaps first when a < b, and rejects zero", () => {
    expect(keys(gcdSteps([], [{ a: 12, b: 30 }]))).toEqual(["start", "swap", "mod", "mod", "done"]);
    expect(parseOps("gcd 0 5", GCD_FORMS)).toMatchObject({ ok: false });
  });
});

describe("sieve of Eratosthenes", () => {
  it("n = 10 crosses out with 2 and 3, then stops at 4 (the catalog example)", () => {
    const steps = sieveSteps([], [{ n: 10 }]);
    expect(keys(steps)).toEqual(["start", "cross", "cross", "stop"]);
    expect(steps[1]!.say.vars).toMatchObject({ p: 2, list: "4, 6, 8, 10" });
    expect(steps[2]!.question).toMatchObject({ correct: "9", options: ["3", "6", "9"] });
    expect(steps.at(-1)!.say.vars).toMatchObject({ p: 4, list: "2, 3, 5, 7", count: 4 });
  });

  it("matches trial division up to 100, and skips crossed-out numbers", () => {
    const isPrime = (v: number) =>
      v > 1 && Array.from({ length: v - 2 }, (_, k) => k + 2).every((d) => v % d);
    for (const n of [2, 3, 30, 49, 60, 100]) {
      const last = sieveSteps([], [{ n }]).at(-1)!;
      const want = Array.from({ length: n }, (_, k) => k + 1).filter(isPrime);
      expect(last.say.vars?.list, `n = ${n}`).toBe(want.join(", "));
    }
    expect(keys(sieveSteps([], [{ n: 30 }]))).toEqual([
      "start",
      "cross",
      "cross",
      "skip",
      "cross",
      "stop",
    ]);
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  await startFromCard(user);
  return user;
}

describe("strings & numbers players", () => {
  it("naive matching asks whether each position matches", async () => {
    const user = await open("string-matching", "String matching (naive)");
    expect(screen.getByText("Step 1 of 7")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("Position 0: will the whole pattern match here? (✓ / ✗)"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "✗" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("KMP asks for each fail value", async () => {
    const user = await open("kmp", "Knuth–Morris–Pratt (KMP)");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("What is fail[1], the overlap of “ab”?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "0" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("GCD asks for a mod b", async () => {
    const user = await open("gcd", "Euclid's GCD");
    expect(screen.getByText("Step 1 of 5")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    await user.click(within(question).getByRole("button", { name: "12" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("the sieve draws numbers 1 to 10", async () => {
    await open("sieve", "Sieve of Eratosthenes");
    expect(screen.getByRole("list", { name: "Numbers 1 to 10" }).children).toHaveLength(10);
  });
});
