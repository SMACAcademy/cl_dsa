import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

async function openPlayer() {
  const user = userEvent.setup();
  renderRoute("/algorithms/binary-search");
  await screen.findByRole("heading", { level: 2, name: "Try it: step through Binary search" });
  return user;
}

const activeCodeLine = () => document.querySelector('li[aria-current="step"]')?.textContent ?? "";

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe("binary search player", () => {
  it("starts on the catalog example", async () => {
    await openPlayer();
    expect(screen.getByLabelText("Sorted values (up to 8 whole numbers)")).toHaveValue(
      "1, 3, 5, 7, 9, 11",
    );
    expect(screen.getByText("Step 1 of 14")).toBeVisible();
    expect(screen.getByText("Look for 7 in a sorted list of 6 values.")).toBeVisible();
  });

  it("discards the left half after the first comparison", async () => {
    const user = await openPlayer();
    await clickNext(user, 5);
    expect(
      screen.getByText("5 < 7, so 7 can only be to the right. Discard the left half: lo = 3."),
    ).toBeVisible();
    expect(activeCodeLine()).toContain("lo = mid + 1");
    expect(screen.getByText("Index 0, value 1, ruled out")).toBeInTheDocument();
    expect(screen.getByText("Index 2, value 5, ruled out")).toBeInTheDocument();
    expect(screen.getByText("Index 3, value 7, not checked yet")).toBeInTheDocument();
  });

  it("finds 7 at index 3 after 3 comparisons", async () => {
    const user = await openPlayer();
    await clickNext(user, 13);
    expect(screen.getByText("Step 14 of 14")).toBeVisible();
    expect(screen.getByText("Return 3. Comparisons made: 3.")).toBeVisible();
    expect(activeCodeLine()).toContain("return mid");
    expect(screen.getByText("Index 3, value 7, found")).toBeInTheDocument();
  });

  it("asks which way the target lies before each comparison", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 3);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("items[2] = 5. Where is 7?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "To the right" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();

    await clickNext(user, 3);
    await user.click(screen.getByRole("button", { name: "To the right" }));
    expect(screen.getByText("✗ Not quite: the answer was “To the left”.")).toBeVisible();
    expect(screen.getByText("Predictions: 1 of 2 correct")).toBeVisible();
  });

  it("refuses unsorted values with an explanation", async () => {
    const user = await openPlayer();
    const values = screen.getByLabelText("Sorted values (up to 8 whole numbers)");
    await user.clear(values);
    await user.type(values, "9, 2, 5");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Binary search needs the values in ascending order",
    );
    expect(screen.getByText("Step 1 of 14")).toBeVisible();
  });

  it("runs the not-found preset to -1", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("button", { name: "Not found" }));
    expect(screen.getByText("Step 1 of 12")).toBeVisible();
    await clickNext(user, 11);
    expect(screen.getByText("5 is not in the list. Return -1. Comparisons made: 2.")).toBeVisible();
    expect(activeCodeLine()).toContain("return -1");
  });
});
