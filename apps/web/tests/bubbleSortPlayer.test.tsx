import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

async function openPlayer() {
  const user = userEvent.setup();
  renderRoute("/algorithms/bubble-sort");
  await screen.findByRole("heading", { level: 2, name: "Try it: step through Bubble sort" });
  return user;
}

const activeCodeLine = () => document.querySelector('li[aria-current="step"]')?.textContent ?? "";

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe("bubble sort player", () => {
  it("starts on the catalog example without a target field", async () => {
    await openPlayer();
    expect(screen.getByLabelText("Values (up to 8 whole numbers)")).toHaveValue("5, 1, 4, 2");
    expect(screen.queryByLabelText("Target")).not.toBeInTheDocument();
    expect(screen.getByText("Step 1 of 18")).toBeVisible();
    expect(screen.getByText("Comparisons: 0 · Swaps: 0")).toBeVisible();
  });

  it("compares, then swaps the first pair", async () => {
    const user = await openPlayer();
    await clickNext(user, 2);
    expect(
      screen.getByText("Compare items[0] = 5 and items[1] = 1: 5 > 1, so they are out of order."),
    ).toBeVisible();
    expect(activeCodeLine()).toContain("if items[j] > items[j + 1]:");
    expect(screen.getByText("Position 0, value 5, being compared")).toBeInTheDocument();
    await clickNext(user, 1);
    expect(
      screen.getByText("Swap them, so the larger value 5 moves right: [1, 5, 4, 2]."),
    ).toBeVisible();
    expect(screen.getByText("Position 1, value 5, just swapped")).toBeInTheDocument();
    expect(screen.getByText("Comparisons: 1 · Swaps: 1")).toBeVisible();
  });

  it("marks the largest value as sorted after the first pass", async () => {
    const user = await openPlayer();
    await clickNext(user, 8);
    expect(
      screen.getByText("End of pass 1: 5 has bubbled up to index 3, its final place."),
    ).toBeVisible();
    expect(screen.getByText("Position 3, value 5, in its final place")).toBeInTheDocument();
    expect(screen.getByText("Position 2, value 2, not yet in place")).toBeInTheDocument();
  });

  it("stops early and finishes sorted", async () => {
    const user = await openPlayer();
    await clickNext(user, 16);
    expect(
      screen.getByText("No swaps in pass 3: everything is already in order, so stop early."),
    ).toBeVisible();
    expect(activeCodeLine()).toContain("break");
    await clickNext(user, 1);
    expect(screen.getByText("Sorted! Comparisons: 6, swaps: 4.")).toBeVisible();
    for (const [position, value] of [1, 2, 4, 5].entries()) {
      expect(
        screen.getByText(`Position ${position}, value ${value}, in its final place`),
      ).toBeInTheDocument();
    }
  });

  it("asks swap-or-leave before each comparison", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 1);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("items[0] = 5 and items[1] = 1. Swap them?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "Swap" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("the best-case preset finishes after one pass", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("button", { name: "Already sorted (best case)" }));
    expect(screen.getByText("Step 1 of 7")).toBeVisible();
    await clickNext(user, 6);
    expect(screen.getByText("Sorted! Comparisons: 3, swaps: 0.")).toBeVisible();
  });

  it("rejects bad input with an explanation", async () => {
    const user = await openPlayer();
    const values = screen.getByLabelText("Values (up to 8 whole numbers)");
    await user.clear(values);
    await user.type(values, "3, x");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use whole numbers only");
  });
});
