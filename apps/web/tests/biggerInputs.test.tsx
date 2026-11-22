import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { arraySizing } from "../src/features/viz/ArrayView";
import { barSizing } from "../src/features/viz/BarsView";
import { MAX_VALUES, parseValues, RANDOM_COUNT, randomValues } from "../src/features/viz/input";
import { MAX_OPS, MAX_START, randomNumbers } from "../src/features/viz/ds/ops";
import { renderRoute } from "./render";

describe("bigger inputs", () => {
  it("allows 16 values and 12 commands", () => {
    expect(MAX_VALUES).toBe(16);
    expect(MAX_START).toBe(16);
    expect(MAX_OPS).toBe(12);
    expect(parseValues(Array.from({ length: 16 }, (_, i) => i).join(", "))).toMatchObject({
      ok: true,
    });
    expect(parseValues(Array.from({ length: 17 }, (_, i) => i).join(", "))).toEqual({
      ok: false,
      error: "tooMany",
    });
  });

  it("random values respect their range, and can be distinct and sorted", () => {
    for (let run = 0; run < 20; run++) {
      const v = randomValues(RANDOM_COUNT, { min: 1, max: 99, unique: true, sorted: true });
      expect(v).toHaveLength(12);
      expect(new Set(v).size).toBe(12);
      expect(v).toEqual([...v].sort((a, b) => a - b));
      expect(v.every((x) => x >= 1 && x <= 99)).toBe(true);
      const digits = randomValues(12, { min: 0, max: 9 });
      expect(digits.every((x) => x >= 0 && x <= 9)).toBe(true);
    }
    // Asking for more distinct values than the range holds gives the whole range.
    expect(randomNumbers(20, { min: 1, max: 5 }).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("shrinks array boxes as arrays grow", () => {
    expect(arraySizing(8).cell).toBe(56);
    expect(arraySizing(10).cell).toBe(44);
    expect(arraySizing(11).cell).toBe(36);
    expect(arraySizing(16).cell).toBe(28);
    // The row is n slots minus one gap; it must fit the ~510 px stage.
    const rowWidth = (n: number) => {
      const { cell, slot } = arraySizing(n);
      return n * slot - (slot - cell);
    };
    for (const n of [8, 10, 12, 16]) {
      expect(rowWidth(n)).toBeLessThanOrEqual(510);
    }
  });

  it("narrows sort bars so 12 random values fit beside the code panel", () => {
    expect(barSizing(8).slot).toBe(56);
    expect(barSizing(10).slot).toBe(44);
    expect(barSizing(11).slot).toBe(36);
    expect(barSizing(13).slot).toBe(30);
    // The bar stage is about 510 px wide next to the code panel.
    for (const n of [8, 10, 12, 16]) {
      expect(n * barSizing(n).slot).toBeLessThanOrEqual(510);
    }
  });

  it("opens bubble sort on 10 values, and Random fills in 12 new ones", async () => {
    const user = userEvent.setup();
    renderRoute("/algorithms/bubble-sort");
    await screen.findByRole("heading", { level: 2, name: "Try it: step through Bubble sort" });
    const field = screen.getByLabelText("Values (up to 16 whole numbers)");
    expect((field as HTMLInputElement).value.split(",")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "🎲 Random (12 values)" }));
    const values = (field as HTMLInputElement).value.split(",").map((s) => Number(s.trim()));
    expect(values).toHaveLength(12);
    expect(values.every((x) => Number.isInteger(x) && x >= 1 && x <= 99)).toBe(true);
    expect(screen.getByText("Step 1 of", { exact: false })).toBeVisible();
  });

  it.each([
    ["/algorithms/linear-search", "Found in the middle"],
    ["/algorithms/binary-search", "Found on the right"],
    ["/algorithms/bubble-sort", "Mixed"],
    ["/algorithms/selection-sort", "Mixed"],
    ["/algorithms/insertion-sort", "Mixed"],
    ["/algorithms/merge-sort", "Mixed"],
    ["/algorithms/quick-sort", "Mixed"],
    ["/algorithms/heap-sort", "Mixed"],
    ["/algorithms/counting-sort", "Mixed"],
    ["/algorithms/radix-sort", "Mixed"],
  ])("%s first shows the same input as its first preset", async (path, firstPreset) => {
    const user = userEvent.setup();
    renderRoute(path);
    await screen.findByRole("heading", { level: 2, name: /^Try it:/ });
    const stepCount = () => screen.getByText(/^Step 1 of \d+$/).textContent;
    const onLoad = stepCount();
    await user.click(screen.getByRole("button", { name: firstPreset }));
    expect(stepCount()).toBe(onLoad);
  });

  it("binary search's Random keeps the values sorted", async () => {
    const user = userEvent.setup();
    renderRoute("/algorithms/binary-search");
    await screen.findByRole("heading", { level: 2, name: "Try it: step through Binary search" });
    await user.click(screen.getByRole("button", { name: "🎲 Random (12 values)" }));
    expect(screen.queryByRole("alert")).toBeNull();
    const field = screen.getByLabelText("Sorted values (up to 16 whole numbers)");
    const values = (field as HTMLInputElement).value.split(",").map((s) => Number(s.trim()));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("the binary search tree's Random builds a 10-value tree without errors", async () => {
    const user = userEvent.setup();
    renderRoute("/structures/binary-search-tree");
    await screen.findByRole("heading", { level: 2, name: /^Try it:/ });
    await user.click(screen.getByRole("button", { name: "🎲 Random (12 values)" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Step 1 of", { exact: false })).toBeVisible();
  });
});
