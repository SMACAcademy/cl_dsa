import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  ALGORITHMS,
  CATALOG,
  findItem,
  groupItems,
  STRUCTURES,
} from "../src/features/catalog/catalog";
import { renderRoute } from "./render";

describe("catalog data", () => {
  it("has unique ids across algorithms and data structures", () => {
    const ids = CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every 'builds on' link points at a real entry", () => {
    for (const item of CATALOG) {
      for (const dep of item.buildsOn ?? [])
        expect(findItem(dep), `${item.id} → ${dep}`).toBeDefined();
    }
  });

  it("every example is tiny: 2 to 6 steps, with an input and a result", () => {
    for (const item of CATALOG) {
      expect(item.example.steps.length, item.id).toBeGreaterThanOrEqual(2);
      expect(item.example.steps.length, item.id).toBeLessThanOrEqual(6);
      expect(item.example.input, item.id).not.toBe("");
      expect(item.example.result, item.id).not.toBe("");
      expect(item.visual.length, item.id).toBeGreaterThan(0);
      expect(item.cost.length, item.id).toBeGreaterThan(0);
    }
  });

  it("starts with stage-1 foundations in both lists", () => {
    expect(STRUCTURES[0]?.id).toBe("array");
    expect(ALGORITHMS.filter((a) => a.stage === 1).map((a) => a.id)).toEqual([
      "linear-search",
      "binary-search",
      "bubble-sort",
      "selection-sort",
      "insertion-sort",
    ]);
  });
});

describe("catalog screens", () => {
  it("/algorithms lists every algorithm under its group heading", async () => {
    renderRoute("/algorithms");
    expect(await screen.findByRole("heading", { level: 1, name: "Algorithm Lab" })).toBeVisible();
    const groups = groupItems(ALGORITHMS);
    const main = screen.getByRole("main");
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(groups.map((g) => g.group));
    for (const item of ALGORITHMS) {
      expect(
        within(main).getByRole("link", { name: new RegExp(`^${escapeRegex(item.name)}`) }),
      ).toHaveAttribute("href", `/algorithms/${item.id}`);
    }
  });

  it("/structures lists every data structure", async () => {
    renderRoute("/structures");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Data Structure Lab" }),
    ).toBeVisible();
    expect(
      screen.getByText(`${STRUCTURES.length} data structures in`, { exact: false }),
    ).toBeVisible();
  });

  it("clicking an entry opens its plan with the worked example", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/algorithms");
    await user.click(await screen.findByRole("link", { name: /^Binary search/ }));
    expect(router.state.location.pathname).toBe("/algorithms/binary-search");
    expect(await screen.findByRole("heading", { level: 1, name: "Binary search" })).toBeVisible();
    expect(screen.getByText("[1, 3, 5, 7, 9, 11], target 7")).toBeVisible();
    expect(screen.getByText("lo 3, hi 3, mid 3 → 7 = 7 → found")).toBeVisible();
    expect(screen.getByText("Index 3, after 3 comparisons")).toBeVisible();
    expect(screen.getByRole("link", { name: "All algorithms" })).toHaveAttribute(
      "href",
      "/algorithms",
    );
  });

  it("the rail keeps the section marked as current on a detail page", async () => {
    renderRoute("/algorithms/bubble-sort");
    await screen.findByRole("heading", { level: 1, name: "Bubble sort" });
    const rail = screen.getByRole("navigation", { name: "Main" });
    expect(within(rail).getByRole("link", { name: "Algorithm Lab" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("a detail page links to what it builds on and to its neighbours", async () => {
    renderRoute("/structures/hash-table");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Hash table (chaining)" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Array" })).toHaveAttribute(
      "href",
      "/structures/array",
    );
    expect(screen.getByRole("link", { name: "Singly linked list" })).toHaveAttribute(
      "href",
      "/structures/singly-linked-list",
    );
    const pager = screen.getByRole("navigation", { name: "Previous and next entries" });
    expect(within(pager).getByRole("link", { name: /^Previous:/ })).toHaveAttribute(
      "href",
      "/structures/deque",
    );
    expect(within(pager).getByRole("link", { name: /^Next:/ })).toHaveAttribute(
      "href",
      "/structures/open-addressing",
    );
  });

  it.each(["/algorithms/no-such-item", "/algorithms/hash-table"])(
    "%s shows a friendly not-in-catalog page",
    async (path) => {
      renderRoute(path);
      expect(
        await screen.findByRole("heading", { level: 1, name: "Not in the catalog" }),
      ).toBeVisible();
    },
  );
});

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
