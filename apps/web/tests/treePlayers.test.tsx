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
    "binary-tree",
    "Binary tree & traversals",
    30,
    "Each traversal visited all 5 nodes exactly once: O(n).",
  ],
  [
    "binary-search-tree",
    "Binary search tree",
    16,
    "5 node(s), height 3. A search takes at most 3 comparison(s).",
  ],
  [
    "avl-tree",
    "AVL tree (self-balancing)",
    13,
    "3 node(s), height 2, in order [1, 2, 3]. AVL keeps the height near log₂ n.",
  ],
  [
    "binary-heap",
    "Binary heap (priority queue)",
    17,
    "Heap: [3, 5, 8]. Each insert or extract followed one path: O(log n).",
  ],
  [
    "trie",
    "Trie (prefix tree)",
    17,
    "3 word(s) in 7 letter node(s): ['car', 'cat', 'dog']. Shared prefixes are stored once.",
  ],
  [
    "segment-tree",
    "Segment tree",
    15,
    "Total: 10. Queries and updates each touched about 2 × log₂ n nodes.",
  ],
])("/structures/%s player", (id, name, total, endText) => {
  it(`runs the first preset in ${total} steps`, async () => {
    const user = await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(endText)).toBeVisible();
  });
});

describe("tree details", () => {
  it("BST asks left or right before each comparison", async () => {
    const user = await open("binary-search-tree", "Binary search tree");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    await clickNext(user, 1);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("From 8, does 3 go left (←) or right (→)?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "←" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("3 < 8: go left.")).toBeVisible();
  });

  it("AVL shows balance factors and the rotation", async () => {
    const user = await open("avl-tree", "AVL tree (self-balancing)");
    await clickNext(user, 9);
    expect(screen.getByText("1 has balance -2: too lopsided, so rotate.")).toBeVisible();
    expect(screen.getByText(/^1 \(-2\): children 2\./)).toBeInTheDocument();
    await clickNext(user, 2);
    expect(
      screen.getByText("Rotated left: 2 moves up. Every balance is back between -1 and +1."),
    ).toBeVisible();
  });

  it("trie lists the words under a prefix", async () => {
    const user = await open("trie", "Trie (prefix tree)");
    await clickNext(user, 15);
    expect(screen.getByText("Words starting with \"ca\": ['car', 'cat'] (2).")).toBeVisible();
  });

  it("segment tree rejects letters and empty starts", async () => {
    const user = await open("segment-tree", "Segment tree");
    const start = screen.getByLabelText("Start with (up to 16 values, may be empty)");
    await user.clear(start);
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Start with at least one value.");
    await user.type(start, "1, x");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent("“x” isn't a number.");
  });
});
