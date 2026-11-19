import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { findItem, itemPath } from "../src/features/catalog/catalog";
import { VISUALIZERS } from "../src/features/viz/registry";
import { renderRoute } from "./render";

/**
 * Safety net for every interactive page: step through the first preset to the
 * end and make sure no narration, question or label leaks a raw
 * "{{placeholder}}" (a value the step forgot to pass to its translation).
 */
describe.each(Object.keys(VISUALIZERS))("%s", (id) => {
  it("narrates every step without raw placeholders", async () => {
    const item = findItem(id);
    expect(item, `${id} is in the catalog`).toBeDefined();
    const user = userEvent.setup();
    renderRoute(itemPath(item!));
    await screen.findByRole("heading", { level: 2, name: /^Try it:/ });
    await user.click(screen.getByRole("checkbox", { name: /^Predict before each/ }));
    const main = screen.getByRole("main");
    for (let guard = 0; guard < 80; guard++) {
      expect(main.textContent, `step ${guard + 1}`).not.toMatch(/\{\{\w+\}\}/);
      const group = screen.queryByRole("group", { name: "Your prediction" });
      if (group) {
        // Answer with the first option; right or wrong, the player moves on.
        const first = group.querySelector("button");
        await user.click(first!);
        continue;
      }
      const next = screen.getByRole("button", { name: "Next" });
      if ((next as HTMLButtonElement).disabled) break;
      await user.click(next);
    }
    expect(screen.getByRole("button", { name: "Replay" })).toBeVisible();
  });
});
