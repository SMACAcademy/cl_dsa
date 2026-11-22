import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute, startFromCard } from "./render";

async function open(path: string, name: string) {
  const user = userEvent.setup();
  renderRoute(path);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  await startFromCard(user);
  return user;
}

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe.each([
  ["/algorithms/insertion-sort", "Insertion sort", 19, "Sorted! Comparisons: 6, shifts: 4."],
  ["/algorithms/merge-sort", "Merge sort", 19, "Sorted! Comparisons: 5."],
  ["/algorithms/quick-sort", "Quick sort", 18, "Sorted! Comparisons: 7, swaps: 2."],
  ["/algorithms/heap-sort", "Heap sort", 11, "Sorted! Comparisons: 3, swaps: 2."],
  [
    "/algorithms/counting-sort",
    "Counting sort",
    10,
    "Sorted: [0, 1, 2, 2]. Each of the 4 values was counted once and written once, with no comparisons.",
  ],
  [
    "/algorithms/radix-sort",
    "Radix sort",
    14,
    "place = 100 is bigger than the largest value 32, so stop. Sorted: [12, 13, 21, 32].",
  ],
])("%s player", (path, name, total, doneText) => {
  it(`steps through the catalog example in ${total} steps`, async () => {
    const user = await open(path, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(`Step ${total} of ${total}`)).toBeVisible();
    expect(screen.getByText(doneText)).toBeVisible();
  });
});

describe("sorting player details", () => {
  it("insertion sort lifts the key and asks whether to shift", async () => {
    const user = await open("/algorithms/insertion-sort", "Insertion sort");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 1);
    expect(
      screen.getByText("Pass 1: lift out key = items[1] = 1. Index 0..0 is already sorted."),
    ).toBeVisible();
    expect(screen.getByText("Position 1, value 1, the key being inserted")).toBeInTheDocument();
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("items[0] = 4. Is it bigger than the key 1?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "Yes, shift it right" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("merge sort shows the result row filling up", async () => {
    const user = await open("/algorithms/merge-sort", "Merge sort");
    await clickNext(user, 4);
    expect(screen.getByText("6 > 2: take 2 from the right half.")).toBeVisible();
    const result = screen.getByRole("list", { name: "result" });
    expect(within(result).getByText("Index 0, value 2, not checked yet")).toBeInTheDocument();
    expect(within(result).getByText("Index 1, empty")).toBeInTheDocument();
  });

  it("merge sort asks which value goes next", async () => {
    const user = await open("/algorithms/merge-sort", "Merge sort");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 3);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(
      within(question).getByText("Left has 6, right has 2. Which goes into the result next?"),
    ).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "2 (right)" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("quick sort marks the pivot and asks which side a value joins", async () => {
    const user = await open("/algorithms/quick-sort", "Quick sort");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 1);
    expect(screen.getByText("Position 4, value 2, the pivot")).toBeInTheDocument();
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Is 3 ≤ the pivot 2?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "No, big side" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("heap sort moves the maximum to the end", async () => {
    const user = await open("/algorithms/heap-sort", "Heap sort");
    await clickNext(user, 6);
    expect(
      screen.getByText(
        "Swap the top 4 with the last heap value: 4 is now in its final place at index 2.",
      ),
    ).toBeVisible();
  });

  it("counting sort rejects keys above 9", async () => {
    const user = await open("/algorithms/counting-sort", "Counting sort");
    const values = screen.getByLabelText("Values from 0 to 9 (up to 16)");
    await user.clear(values);
    await user.type(values, "3, 12");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("whole numbers from 0 to 9");
  });

  it("radix sort asks which bucket a value goes into", async () => {
    const user = await open("/algorithms/radix-sort", "Radix sort");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each comparison" }));
    await clickNext(user, 1);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Which bucket does 21 go into?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("Bucket 1: 21")).toBeInTheDocument();
  });

  it("radix sort rejects negative numbers", async () => {
    const user = await open("/algorithms/radix-sort", "Radix sort");
    const values = screen.getByLabelText("Values from 0 to 99 (up to 16)");
    await user.clear(values);
    await user.type(values, "4, -2");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("no negatives");
  });
});
