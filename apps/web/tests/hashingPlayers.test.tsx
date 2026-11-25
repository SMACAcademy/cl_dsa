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
    "hash-table",
    "Hash table (chaining)",
    12,
    "3 key(s) in 5 buckets: load factor 0.60, longest chain 2. Short chains keep every operation fast.",
  ],
  [
    "hash-set",
    "Hash set",
    10,
    "The set holds 2 distinct value(s) in 5 buckets (load factor 0.40).",
  ],
  [
    "open-addressing",
    "Hash table (open addressing)",
    13,
    "3 key(s) in 5 slots: load factor 0.60. As it gets close to 1, probe runs get long.",
  ],
])("/structures/%s player", (id, name, total, endText) => {
  it(`runs the first preset in ${total} steps`, async () => {
    const user = await open(id, name);
    expect(screen.getByText(`Step 1 of ${total}`)).toBeVisible();
    await clickNext(user, total - 1);
    expect(screen.getByText(endText)).toBeVisible();
  });
});

describe("hashing details", () => {
  it("hash table asks which bucket a key goes to", async () => {
    const user = await open("hash-table", "Hash table (chaining)");
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const question = screen.getByRole("group", { name: "Your prediction" });
    expect(within(question).getByText("Which bucket does 12 go to?")).toBeVisible();
    await user.click(within(question).getByRole("button", { name: "2" }));
    expect(screen.getByText("✓ Correct prediction!")).toBeVisible();
    expect(screen.getByText("hash(12) = 12 % 5 = 2: go straight to bucket 2.")).toBeVisible();
  });

  it("hash table shows a collision as a chain", async () => {
    const user = await open("hash-table", "Hash table (chaining)");
    await clickNext(user, 5);
    expect(
      screen.getByText(
        "Collision! Bucket 2 already holds a key, so 7 joins its chain (now 2 long).",
      ),
    ).toBeVisible();
    expect(screen.getByText("Bucket 2: 12, 7")).toBeInTheDocument();
  });

  it("hash set hashes letters with ord()", async () => {
    const user = await open("hash-set", "Hash set");
    await clickNext(user, 1);
    expect(
      screen.getByText("hash('a') = ord('a') % 5 = 97 % 5 = 2: go straight to bucket 2."),
    ).toBeVisible();
  });

  it("open addressing moves on from a taken slot", async () => {
    const user = await open("open-addressing", "Hash table (open addressing)");
    await clickNext(user, 4);
    expect(screen.getByText("Slot 0 holds 10, not 15: move on to slot 1.")).toBeVisible();
  });

  it("the Data Structure Lab marks the hashing structures as interactive", async () => {
    renderRoute("/structures");
    await screen.findByRole("heading", { level: 1, name: "Data Structure Lab" });
    const interactive = within(screen.getByRole("main"))
      .getAllByText("Interactive")
      .map((chip) => chip.closest("a")?.getAttribute("href"));
    expect(interactive).toEqual(
      expect.arrayContaining([
        "/structures/hash-table",
        "/structures/open-addressing",
        "/structures/hash-set",
      ]),
    );
  });
});
