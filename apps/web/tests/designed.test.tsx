import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  BLOOM_FORMS,
  bloomHashes,
  bloomSteps,
  LRU_FORMS,
  lruSteps,
  validateBits,
  type BloomOp,
  type LruOp,
} from "../src/features/viz/ds/designed";
import { parseOps, type OpForm } from "../src/features/viz/ds/ops";
import { renderRoute } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const parsed = <Op,>(text: string, forms: readonly OpForm<Op>[]) => {
  const p = parseOps<Op>(text, forms);
  if (!p.ok) throw new Error(text);
  return p.value;
};

/** A reference LRU on a JS Map (insertion order = recency order). */
function referenceLru(cap: number, ops: readonly LruOp[]) {
  const map = new Map<string, number>();
  const gets: number[] = [];
  for (const op of ops) {
    if (op.kind === "get") {
      const v = map.get(op.key);
      if (v === undefined) gets.push(-1);
      else {
        map.delete(op.key);
        map.set(op.key, v);
        gets.push(v);
      }
    } else {
      map.delete(op.key);
      map.set(op.key, op.value);
      if (map.size > cap) map.delete(map.keys().next().value as string);
    }
  }
  return { keys: [...map.keys()], gets };
}

describe("LRU cache", () => {
  it("capacity 2 evicts b and keeps a and c (the catalog example)", () => {
    const ops = parsed<LruOp>("put a 1, put b 2, get a, put c 3, get b", LRU_FORMS);
    const steps = lruSteps(["2"], ops);
    expect(keys(steps)).toEqual(["start", "add", "add", "hit", "add", "evict", "miss", "end"]);
    expect(steps[3]!.question).toMatchObject({ correct: "1" });
    expect(steps[5]!.question).toMatchObject({ correct: "b", options: ["b", "a"] });
    expect(steps[5]!.state.nodes.map((n) => n.value)).toEqual(["b:2", "a:1", "c:3"]);
    expect(steps.at(-1)!.say.vars).toEqual({ list: "a, c", n: 2, cap: 2 });
  });

  it("matches a reference cache for several sequences", () => {
    const cases: [string, string][] = [
      ["2", "put a 1, put b 2, put a 5, put c 3, get b, get a"],
      ["3", "put a 1, put b 2, put c 3, get a, put d 4, get b, get c"],
      ["2", "get a, put a 1, put a 2, get a, put b 3, put c 4, get a, get c"],
      ["4", "put 1 10, put 2 20, put 3 30, get 1, put 4 40, put 5 50, get 2, get 3"],
    ];
    for (const [cap, text] of cases) {
      const ops = parsed<LruOp>(text, LRU_FORMS);
      const steps = lruSteps([cap], ops);
      const want = referenceLru(Number(cap), ops);
      const last = steps.at(-1)!;
      expect(
        last.state.nodes.map((n) => n.value.split(":")[0]),
        text,
      ).toEqual(want.keys);
      const gets = steps
        .filter((s) => s.say.key === "hit" || s.say.key === "miss")
        .map((s) => (s.say.key === "hit" ? Number(s.say.vars?.v) : -1));
      expect(gets, text).toEqual(want.gets);
    }
  });

  it("never asks a one-choice question on an empty cache", () => {
    const steps = lruSteps(["2"], [{ kind: "get", key: "a" }]);
    expect(steps[1]!.question).toBeUndefined();
  });
});

describe("Bloom filter", () => {
  it("cat and dog make bat a false positive, and cow a definite no (the catalog example)", () => {
    const steps = bloomSteps(
      ["8"],
      parsed<BloomOp>("add cat, add dog, query bat, query cow", BLOOM_FORMS),
    );
    expect(keys(steps)).toEqual(["start", "add", "add", "falsePositive", "no", "end"]);
    expect(steps.slice(1, 5).map((s) => [s.say.vars?.a, s.say.vars?.b])).toEqual([
      [0, 1],
      [2, 7],
      [7, 0],
      [1, 6],
    ]);
    expect(steps[4]!.say.vars?.zero).toBe(6);
    expect(steps[3]!.question?.correct).toBe("maybe");
    expect(steps.at(-1)!.say.vars).toMatchObject({ set: 4, alarms: 1 });
  });

  it("writes out the hash arithmetic", () => {
    expect(bloomHashes("cat", 8)).toEqual({
      h1: 0,
      h2: 1,
      h1expr: "(3 + 1 + 20) % 8",
      h2expr: "(3·1 + 1·2 + 20·3) % 8",
    });
  });

  it("never says no to a word that was added, and more bits avoid the false alarm", () => {
    const words = ["cat", "dog", "eel", "fox", "owl", "bee", "ant"];
    for (const m of [4, 8, 16]) {
      const ops: BloomOp[] = [
        ...words.map((word) => ({ kind: "add" as const, word })),
        ...words.map((word) => ({ kind: "query" as const, word })),
      ];
      const answers = bloomSteps([String(m)], ops)
        .filter((x) => ["no", "maybe", "falsePositive"].includes(x.say.key))
        .map((x) => x.say.key);
      expect(answers, `${m} bits`).toEqual(words.map(() => "maybe"));
    }
    const big = bloomSteps(["16"], parsed<BloomOp>("add cat, add dog, query bat", BLOOM_FORMS));
    expect(big.at(-2)!.say.key).toBe("no");
  });

  it("accepts 4 to 16 bits", () => {
    expect(validateBits(["8"])).toBeNull();
    expect(validateBits(["3"])).toEqual({ key: "badBits" });
    expect(validateBits(["17"])).toEqual({ key: "badBits" });
    expect(validateBits(["8", "2"])).toEqual({ key: "badBits" });
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/structures/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  return user;
}

describe("designed structure players", () => {
  it("LRU cache asks what get returns", async () => {
    const user = await open("lru-cache", "LRU cache");
    expect(screen.getByText("Step 1 of 8")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const next = screen.getByRole("button", { name: "Next" });
    await user.click(next);
    await user.click(next);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("What does get(a) return?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("Bloom filter asks maybe or no", async () => {
    const user = await open("bloom-filter", "Bloom filter");
    expect(screen.getByText("Step 1 of 6")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const next = screen.getByRole("button", { name: "Next" });
    await user.click(next);
    await user.click(next);
    const question = screen.getByRole("group", { name: "Your prediction" });
    await user.click(within(question).getByRole("button", { name: "maybe" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });
});
