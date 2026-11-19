import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { parseOps } from "../src/features/viz/ds/ops";
import {
  HANOI_FORMS,
  hanoiSteps,
  RECURSION_FORMS,
  recursionSteps,
  type HanoiOp,
} from "../src/features/viz/ds/recursion";
import { renderRoute } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);

describe("recursion steps", () => {
  it("factorial(3) = 6 with at most 3 frames (the catalog example)", () => {
    const steps = recursionSteps([], [{ kind: "factorial", n: 3 }]);
    expect(keys(steps)).toEqual([
      "start",
      "call",
      "call",
      "base",
      "return",
      "return",
      "result",
      "end",
    ]);
    expect(steps.find((s) => s.say.key === "base")!.state.frames.map((f) => f.name)).toEqual([
      "factorial(3)",
      "factorial(2)",
      "factorial(1)",
    ]);
    expect(steps.at(-2)!.say.vars).toEqual({ name: "factorial(3)", value: 6, depth: 3 });
  });

  it("asks what each call returns", () => {
    const steps = recursionSteps([], [{ kind: "factorial", n: 3 }]);
    expect(steps.filter((s) => s.question).map((s) => s.question?.correct)).toEqual(["2", "6"]);
  });

  it("computes total(4) = 10 and handles the base case directly", () => {
    expect(recursionSteps([], [{ kind: "total", n: 4 }]).at(-2)!.say.vars?.value).toBe(10);
    expect(keys(recursionSteps([], [{ kind: "factorial", n: 0 }]))).toEqual([
      "start",
      "base",
      "result",
      "end",
    ]);
  });

  it("only accepts n from 0 to 7", () => {
    expect(parseOps("factorial 5", RECURSION_FORMS)).toMatchObject({ ok: true });
    expect(parseOps("factorial 8", RECURSION_FORMS)).toMatchObject({ ok: false });
  });
});

describe("Tower of Hanoi steps", () => {
  it("2 disks: A→B, A→C, B→C (the catalog example)", () => {
    const moves = hanoiSteps([], [{ kind: "hanoi", n: 2 }])
      .filter((s) => s.question)
      .map((s) => `${s.say.vars?.disk}:${s.say.vars?.source}→${s.say.vars?.target}`);
    expect(moves).toEqual(["1:A→B", "2:A→C", "1:B→C"]);
  });

  it("takes 2ⁿ − 1 moves and never puts a bigger disk on a smaller one", () => {
    for (const n of [1, 2, 3, 4]) {
      const steps = hanoiSteps([], [{ kind: "hanoi", n }]);
      expect(steps.at(-1)!.say.vars).toEqual({ n, moves: 2 ** n - 1 });
      for (const s of steps) {
        for (const peg of Object.values(s.state.pegs)) {
          for (let i = 1; i < peg.length; i++) expect(peg[i]!).toBeLessThan(peg[i - 1]!);
        }
      }
      expect(steps.at(-1)!.state.pegs.C).toEqual(Array.from({ length: n }, (_, i) => n - i));
    }
  });

  it("only accepts 1 to 4 disks", () => {
    expect(parseOps<HanoiOp>("hanoi 4", HANOI_FORMS)).toMatchObject({ ok: true });
    expect(parseOps<HanoiOp>("hanoi 5", HANOI_FORMS)).toMatchObject({ ok: false });
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  return user;
}

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe("recursion players", () => {
  it("shows the call stack growing and shrinking", async () => {
    const user = await open("recursion", "Recursion & the call stack");
    expect(screen.getByText("Step 1 of 8")).toBeVisible();
    await clickNext(user, 3);
    const stack = screen.getByRole("list", { name: "Call stack (top = running now)" });
    expect(within(stack).getAllByRole("listitem")).toHaveLength(3);
    expect(within(stack).getByText("returns 1")).toBeVisible();
    await clickNext(user, 4);
    expect(
      screen.getByText(
        "Every frame waited for the one above it, then returned in reverse order: last in, first out, like a stack.",
      ),
    ).toBeVisible();
  });

  it("Hanoi asks which peg a disk goes to and finishes in 3 moves", async () => {
    const user = await open("tower-of-hanoi", "Tower of Hanoi");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Disk 1 leaves A. Which peg does it go to?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "B" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("Peg B: 1")).toBeInTheDocument();
  });
});
