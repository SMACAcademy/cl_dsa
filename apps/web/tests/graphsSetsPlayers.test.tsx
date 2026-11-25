import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute, startFromCard } from "./render";

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/structures/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  await startFromCard(user);
  return user;
}

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe.each([
  [
    "graph",
    "Graph (adjacency list & matrix)",
    10,
    "4 vertices, 3 edge(s). The list stores 10 entries (V + 2E); the matrix stores 16 cells (V²).",
  ],
  [
    "union-find",
    "Union–Find (disjoint sets)",
    20,
    "5 items in 2 group(s). With union by size and path compression, each operation is nearly O(1).",
  ],
])("/structures/%s player", (id, name, total, endText) => {
  it(`runs the first preset in ${total} steps`, async () => {
    const user = await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(endText)).toBeVisible();
  });
});

describe("graphs & sets details", () => {
  it("graph shows the adjacency list and matrix together", async () => {
    const user = await open("graph", "Graph (adjacency list & matrix)");
    await clickNext(user, 3);
    const list = screen.getByRole("list", { name: "Adjacency list" });
    expect(within(list).getByText("A:")).toBeVisible();
    const matrix = screen.getByRole("table", { name: "Adjacency matrix" });
    expect(within(matrix).getAllByRole("row")).toHaveLength(5);
  });

  it("graph asks whether an edge exists", async () => {
    const user = await open("graph", "Graph (adjacency list & matrix)");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    await clickNext(user, 3);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Is B–D an edge? (✓ yes / ✗ no)")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "✓" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("union–find rejects too many items", async () => {
    const user = await open("union-find", "Union–Find (disjoint sets)");
    const count = screen.getByLabelText("Number of items (2 to 12)");
    await user.clear(count);
    await user.type(count, "13");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The number of items must be one whole number from 2 to 12.",
    );
  });
});
