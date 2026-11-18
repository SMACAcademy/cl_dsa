import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

async function openPlayer() {
  const user = userEvent.setup();
  renderRoute("/algorithms/selection-sort");
  await screen.findByRole("heading", { level: 2, name: "Try it: step through Selection sort" });
  return user;
}

const activeCodeLine = () => document.querySelector('li[aria-current="step"]')?.textContent ?? "";

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe("selection sort player", () => {
  it("starts on the catalog example", async () => {
    await openPlayer();
    expect(screen.getByLabelText("Values (up to 8 whole numbers)")).toHaveValue("3, 1, 4, 2");
    expect(screen.getByText("Step 1 of 17")).toBeVisible();
  });

  it("highlights the smallest-so-far value while scanning", async () => {
    const user = await openPlayer();
    await clickNext(user, 1);
    expect(
      screen.getByText("Pass 1: fill index 0. Start by assuming items[0] = 3 is the smallest."),
    ).toBeVisible();
    expect(screen.getByText("Position 0, value 3, smallest so far")).toBeInTheDocument();
    await clickNext(user, 2);
    expect(screen.getByText("Remember the new smallest: 1 at index 1.")).toBeVisible();
    expect(activeCodeLine()).toContain("smallest = j");
    expect(screen.getByText("Position 1, value 1, smallest so far")).toBeInTheDocument();
    expect(screen.getByText("Position 0, value 3, not yet in place")).toBeInTheDocument();
  });

  it("swaps once at the end of the pass and marks the value as placed", async () => {
    const user = await openPlayer();
    await clickNext(user, 6);
    expect(
      screen.getByText("Swap it into index 0: 1 is now in its final place: [1, 3, 4, 2]."),
    ).toBeVisible();
    expect(screen.getByText("Comparisons: 3 · Swaps: 1")).toBeVisible();
    await clickNext(user, 1);
    expect(screen.getByText("Position 0, value 1, in its final place")).toBeInTheDocument();
  });

  it("finishes sorted", async () => {
    const user = await openPlayer();
    await clickNext(user, 16);
    expect(screen.getByText("Sorted! Comparisons: 6, swaps: 3.")).toBeVisible();
    expect(activeCodeLine()).toContain("return items");
  });

  it("asks whether each value is a new smallest", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 1);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("items[1] = 1. Is it smaller than the smallest so far, 3?"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "Yes, new smallest" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("already-sorted input still scans everything but never swaps", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("button", { name: "Already sorted" }));
    expect(screen.getByText("Step 1 of 14")).toBeVisible();
    await clickNext(user, 5);
    expect(screen.getByText("1 is already at index 0, so no swap is needed.")).toBeVisible();
    await clickNext(user, 8);
    expect(screen.getByText("Sorted! Comparisons: 6, swaps: 0.")).toBeVisible();
  });
});
