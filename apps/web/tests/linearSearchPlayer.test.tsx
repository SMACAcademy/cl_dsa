import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

const PATH = "/algorithms/linear-search";

async function openPlayer() {
  const user = userEvent.setup();
  renderRoute(PATH);
  await screen.findByRole("heading", { level: 2, name: "Try it: step through Linear search" });
  return user;
}

const activeCodeLine = () => document.querySelector('li[aria-current="step"]')?.textContent ?? "";

describe("linear search player", () => {
  it("starts on step 1 with the default example", async () => {
    await openPlayer();
    expect(screen.getByText("Step 1 of 8")).toBeVisible();
    expect(screen.getByText("Look for 1 among 4 values, from left to right.")).toBeVisible();
    expect(activeCodeLine()).toContain("def linear_search(items, target):");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("steps forward to the answer and back again", async () => {
    const user = await openPlayer();
    const next = screen.getByRole("button", { name: "Next" });
    await user.click(next);
    await user.click(next);
    expect(screen.getByText("Is items[0] = 4 equal to 1? No, keep going.")).toBeVisible();
    expect(activeCodeLine()).toContain("if items[i] == target:");
    for (let k = 0; k < 5; k++) await user.click(next);
    expect(screen.getByText("Step 8 of 8")).toBeVisible();
    expect(screen.getByText("Return 2. Comparisons made: 3.")).toBeVisible();
    expect(activeCodeLine()).toContain("return i");
    expect(screen.getByText("Index 2, value 1, found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step 7 of 8")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("Step 1 of 8")).toBeVisible();
  });

  it("asks for a prediction before each comparison and keeps score", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Will items[0] = 4 equal 1?")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(within(question).getByRole("button", { name: "No match" }));
    expect(screen.getByText("Step 3 of 8")).toBeVisible();
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("Predictions: 1 of 1 correct")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "No match" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "No match" }));
    expect(screen.getByText("✗ Not quite: the answer was “Match”.")).toBeVisible();
    expect(screen.getByText("Predictions: 2 of 3 correct")).toBeVisible();
  });

  it("runs a preset where the target is missing", async () => {
    const user = await openPlayer();
    await user.click(screen.getByRole("button", { name: "Not found" }));
    expect(screen.getByLabelText("Values (up to 8 whole numbers)")).toHaveValue("5, 3, 8");
    const next = screen.getByRole("button", { name: "Next" });
    for (let k = 0; k < 7; k++) await user.click(next);
    expect(
      screen.getByText("Reached the end without finding 4. Return -1. Comparisons made: 3."),
    ).toBeVisible();
  });

  it("explains invalid input instead of running it", async () => {
    const user = await openPlayer();
    const values = screen.getByLabelText("Values (up to 8 whole numbers)");
    await user.clear(values);
    await user.type(values, "1,2,3,4,5,6,7,8,9");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use at most 8 values.");
    expect(values).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Step 1 of 8")).toBeVisible();
  });

  it("runs custom values", async () => {
    const user = await openPlayer();
    const values = screen.getByLabelText("Values (up to 8 whole numbers)");
    const target = screen.getByLabelText("Target");
    await user.clear(values);
    await user.type(values, "3 5");
    await user.clear(target);
    await user.type(target, "5");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByText("Step 1 of 6")).toBeVisible();
    expect(screen.getByText("Look for 5 among 2 values, from left to right.")).toBeVisible();
  });

  it("the Algorithm Lab marks linear search as interactive", async () => {
    renderRoute("/algorithms");
    const card = await screen.findByRole("link", { name: /^Linear search/ });
    expect(within(card).getByText("Interactive")).toBeVisible();
    const interactive = within(screen.getByRole("main"))
      .getAllByText("Interactive")
      .map((chip) => chip.closest("a")?.getAttribute("href"));
    expect(interactive).toEqual(
      expect.arrayContaining([
        "/algorithms/linear-search",
        "/algorithms/binary-search",
        "/algorithms/bubble-sort",
        "/algorithms/selection-sort",
        "/algorithms/insertion-sort",
        "/algorithms/merge-sort",
        "/algorithms/quick-sort",
        "/algorithms/heap-sort",
        "/algorithms/counting-sort",
        "/algorithms/radix-sort",
      ]),
    );
  });
});
