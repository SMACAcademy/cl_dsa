import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

async function open(id: string, name: string) {
  const user = userEvent.setup();
  renderRoute(`/structures/${id}`);
  await screen.findByRole("heading", { level: 2, name: `Try it: step through ${name}` });
  return user;
}

async function clickNext(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let k = 0; k < times; k++) await user.click(screen.getByRole("button", { name: "Next" }));
}

describe.each([
  ["array", "Array", 18, "Done: a = [5, 3, 9, 4]."],
  [
    "dynamic-array",
    "Dynamic array (Python list)",
    10,
    "3 append(s) needed 2 copy step(s) in total: on average about one per append.",
  ],
  ["singly-linked-list", "Singly linked list", 9, "Done: head → [3, 4, 5]."],
  ["doubly-linked-list", "Doubly linked list", 5, "Done: head ⇄ [2, 9]."],
  ["stack", "Stack", 7, "Done: items = [4, 7]."],
  ["queue", "Queue", 7, "Done: items = ['B', 'C']."],
  [
    "circular-queue",
    "Circular queue (ring buffer)",
    14,
    "Done: 4 of 4 slots in use. No value was ever moved.",
  ],
  ["deque", "Deque (double-ended queue)", 7, "Done: d = deque([2])."],
])("/structures/%s player", (id, name, total, endText) => {
  it(`runs the first preset in ${total} steps`, async () => {
    const user = await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(endText)).toBeVisible();
  });
});

describe("linear structure details", () => {
  it("stack asks what pop() returns", async () => {
    const user = await open("stack", "Stack");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    await clickNext(user, 3);
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("What will pop() return?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "1" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("Pop the top value 1. Now items = [4, 7].")).toBeVisible();
  });

  it("singly linked list shows the new node before linking it", async () => {
    const user = await open("singly-linked-list", "Singly linked list");
    await clickNext(user, 2);
    expect(screen.getByText("Create node 4 and point it at 8.")).toBeVisible();
    expect(screen.getByText("new node")).toBeVisible();
    await clickNext(user, 1);
    expect(screen.getByText("Point 3 at 4: [3, 4, 8, 5]. Only two arrows changed.")).toBeVisible();
    expect(screen.getByText(/^Node 4, next is 8, new\./)).toBeInTheDocument();
  });

  it("ring buffer wraps the tail around", async () => {
    const user = await open("circular-queue", "Circular queue (ring buffer)");
    await clickNext(user, 11);
    expect(
      screen.getByText("tail = (head 1 + size 3) % 4 = 0: it wraps around to the start."),
    ).toBeVisible();
    await clickNext(user, 1);
    expect(screen.getByText(/^Slot 0: 5\./)).toBeInTheDocument();
  });

  it("explains an unknown command", async () => {
    const user = await open("stack", "Stack");
    const ops = screen.getByLabelText("Operations (up to 8, separated by commas)");
    await user.clear(ops);
    await user.type(ops, "push 1, jump 3");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "I don't know the command “jump 3”. Commands: push x, pop, peek",
    );
  });

  it("ring buffer rejects a capacity above 8", async () => {
    const user = await open("circular-queue", "Circular queue (ring buffer)");
    const capacity = screen.getByLabelText("Capacity (2 to 8)");
    await user.clear(capacity);
    await user.type(capacity, "9");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Capacity must be one whole number from 2 to 8.",
    );
  });

  it("the Data Structure Lab marks all 8 linear structures as interactive", async () => {
    renderRoute("/structures");
    await screen.findByRole("heading", { level: 1, name: "Data Structure Lab" });
    const interactive = within(screen.getByRole("main"))
      .getAllByText("Interactive")
      .map((chip) => chip.closest("a")?.getAttribute("href"));
    expect(interactive).toEqual([
      "/structures/array",
      "/structures/dynamic-array",
      "/structures/singly-linked-list",
      "/structures/doubly-linked-list",
      "/structures/stack",
      "/structures/queue",
      "/structures/circular-queue",
      "/structures/deque",
    ]);
  });
});
