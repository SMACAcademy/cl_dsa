import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute, startFromCard } from "./render";

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/algorithms/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  await startFromCard(user);
  return user;
}

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe.each([
  [
    "bfs",
    "Breadth-first search (BFS)",
    14,
    "Queue empty: every vertex was visited, nearest first. Order ['A', 'B', 'C', 'D'].",
  ],
  [
    "dfs",
    "Depth-first search (DFS)",
    18,
    "Every vertex was visited, going as deep as possible first. Order ['A', 'B', 'D', 'C'].",
  ],
  [
    "topological-sort",
    "Topological sort",
    10,
    "Every task is placed after its prerequisites: ['wake', 'dress', 'eat', 'leave'].",
  ],
  ["dijkstra", "Dijkstra's shortest paths", 15, "Shortest distances: A 0, B 3, C 1, D 4."],
  [
    "kruskal",
    "Kruskal's minimum spanning tree",
    10,
    "Done: 3 edges connect all 4 vertices with total weight 7.",
  ],
])("/algorithms/%s player", (id, name, total, endText) => {
  it(`runs the first preset in ${total} steps`, async () => {
    const user = await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(endText)).toBeVisible();
  });
});

describe("graph algorithm details", () => {
  it("BFS shows the queue and asks which vertex is next", async () => {
    const user = await open("bfs", "Breadth-first search (BFS)");
    expect(screen.getByLabelText("Start at (one vertex)")).toHaveValue("A");
    expect(screen.getByLabelText("Edges (up to 12, separated by commas)")).toHaveValue(
      "A B, A C, B D, C D",
    );
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Which vertex is visited next?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "A" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
  });

  it("Kruskal explains skipping an edge that closes a loop", async () => {
    const user = await open("kruskal", "Kruskal's minimum spanning tree");
    await clickNext(user, 6);
    expect(
      screen.getByText("A and C are already connected: A–C would close a loop, so skip it."),
    ).toBeVisible();
  });

  it("asks for exactly one start vertex", async () => {
    const user = await open("dijkstra", "Dijkstra's shortest paths");
    const start = screen.getByLabelText("Start at (one vertex)");
    await user.clear(start);
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter one vertex to start from, for example A.",
    );
  });
});
