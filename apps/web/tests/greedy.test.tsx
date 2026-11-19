import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  activitySteps,
  FREQ_FORMS,
  huffmanSteps,
  MEETING_FORMS,
  type FreqOp,
  type MeetingOp,
} from "../src/features/viz/ds/greedy";
import { parseOps } from "../src/features/viz/ds/ops";
import { renderRoute } from "./render";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const meetings = (text: string) => {
  const p = parseOps<MeetingOp>(text, MEETING_FORMS);
  if (!p.ok) throw new Error(text);
  return p.value;
};
const freqs = (text: string) => {
  const p = parseOps<FreqOp>(text, FREQ_FORMS);
  if (!p.ok) throw new Error(text);
  return p.value;
};

describe("activity selection", () => {
  it("takes 1–3, skips 2–5, takes 4–6 and 6–8 (the catalog example)", () => {
    const steps = activitySteps([], meetings("1-3, 2-5, 4-6, 6-8"));
    expect(keys(steps)).toEqual(["start", "take", "skip", "take", "take", "end"]);
    expect(steps.at(-1)!.say.vars).toEqual({ count: 3, total: 4, list: "1–3, 4–6, 6–8" });
  });

  it("matches the best possible count found by trying every subset", () => {
    const sets = [
      "1-4, 3-5, 0-6, 5-7, 3-9, 5-9, 6-10, 8-11",
      "0-10, 1-2, 3-4, 5-6, 7-8",
      "1-2, 1-2, 2-3",
      "0-3, 1-4, 2-5",
    ];
    for (const text of sets) {
      const ms = meetings(text);
      let best = 0;
      for (let mask = 0; mask < 1 << ms.length; mask++) {
        const pick = ms.filter((_, i) => mask & (1 << i)).sort((a, b) => a.start - b.start);
        if (pick.every((m, i) => i === 0 || m.start >= pick[i - 1]!.end))
          best = Math.max(best, pick.length);
      }
      expect(activitySteps([], ms).at(-1)!.say.vars?.count, text).toBe(best);
    }
  });

  it("accepts '1-3' and '1–3' and rejects empty meetings", () => {
    expect(meetings("1-3, 4–6")).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 6 },
    ]);
    expect(parseOps("5-5", MEETING_FORMS)).toMatchObject({ ok: false });
  });
});

describe("Huffman coding", () => {
  it("a 5, b 2, c 1 gives a = 0, b = 10, c = 11 (the catalog example)", () => {
    const steps = huffmanSteps([], freqs("a 5, b 2, c 1"));
    expect(keys(steps)).toEqual(["start", "merge", "merge", "codes"]);
    expect(steps[1]!.question?.correct).toBe("c:1");
    expect(steps.at(-1)!.say.vars).toEqual({ codes: "a = 0, b = 10, c = 11", bits: 11, fixed: 16 });
  });

  it("produces prefix-free codes that are never longer in total than equal-length codes", () => {
    for (const text of [
      "a 3, b 1, n 2",
      "w 4, x 4, y 4, z 4",
      "a 1, b 1, c 1, d 1, e 1",
      "q 9, r 1",
    ]) {
      const last = huffmanSteps([], freqs(text)).at(-1)!;
      const codes = Object.values(last.state.codes ?? {});
      for (const c of codes)
        for (const d of codes) if (c !== d) expect(d.startsWith(c), text).toBe(false);
      expect(Number(last.say.vars?.bits)).toBeLessThanOrEqual(Number(last.say.vars?.fixed));
    }
  });

  it("gives banana's letters a = 1, b = 01, n = 00 (9 bits)", () => {
    const last = huffmanSteps([], freqs("a 3, b 1, n 2")).at(-1)!;
    expect(last.state.codes).toEqual({ a: "1", b: "01", n: "00" });
    expect(last.say.vars?.bits).toBe(9);
  });
});

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  return user;
}

describe("greedy players", () => {
  it("activity selection asks whether to take each meeting", async () => {
    const user = await open("activity-selection", "Activity selection");
    expect(screen.getByText("Step 1 of 6")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("Meeting 1–3: the room is free from 0. Take it? (✓ / ✗)"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "✓" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("Meeting 1–3: chosen")).toBeInTheDocument();
  });

  it("Huffman asks which subtree is rarest", async () => {
    const user = await open("huffman-coding", "Huffman coding");
    expect(screen.getByText("Step 1 of 4")).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    await user.click(within(question).getByRole("button", { name: "c:1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(
      screen.getByText("Join the two rarest, c:1 and b:2, into one tree of weight 3."),
    ).toBeVisible();
  });
});
