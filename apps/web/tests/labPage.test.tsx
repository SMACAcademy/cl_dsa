import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { findProblem, LAB_PROBLEMS } from "../src/features/systems/lab/problems";
import { cleanDesign, readBest } from "../src/features/systems/lab/storage";
import { readDone } from "../src/features/systems/progress";
import { STORAGE_KEYS } from "../src/lib/progress";
import { renderRoute } from "./render";

const canvas = () => screen.getByRole("group", { name: "Your design" });

describe("Design Lab", () => {
  it("the System Design home links to the lab", async () => {
    renderRoute("/systems");
    const card = await screen.findByRole("link", { name: /Design Lab: draw it yourself/ });
    expect(card).toHaveAttribute("href", "/systems/lab");
  });

  it("/systems/lab lists every problem", async () => {
    renderRoute("/systems/lab");
    expect(await screen.findByRole("heading", { level: 1, name: "Design Lab" })).toBeVisible();
    for (const p of LAB_PROBLEMS) {
      expect(screen.getByRole("link", { name: new RegExp(p.title) })).toHaveAttribute(
        "href",
        `/systems/lab/${p.id}`,
      );
    }
  });

  it("adds boxes, connects them from the inspector, and marks the design", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/link-shortener");
    await screen.findByRole("heading", { level: 1, name: "A link shortener" });
    expect(within(canvas()).getByText(/Add boxes from the list/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add Web browser" }));
    await user.click(screen.getByRole("button", { name: "Add Load balancer" }));
    expect(
      within(canvas()).getByRole("button", {
        name: /^Web browser \(web browser\), column 1, row 1$/,
      }),
    ).toBeVisible();
    const lb = within(canvas()).getByRole("button", { name: /^Load balancer/ });
    expect(lb).toHaveAttribute("aria-pressed", "true");

    await user.selectOptions(screen.getByLabelText("Connect to"), "Web browser");
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("Load balancer → Web browser")).toBeVisible();

    // Reverse it so the browser starts the conversation, then mark it.
    await user.click(screen.getByRole("button", { name: "Reverse Load balancer → Web browser" }));
    expect(screen.getByText("Web browser → Load balancer")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Check my design" }));
    const result = screen.getByRole("region", { name: "Your result" });
    expect(within(result).getByText("0/100")).toBeVisible();
    expect(within(result).getByText("Keep going")).toBeVisible();
    expect(within(result).getAllByText(/Missing/).length).toBe(
      findProblem("link-shortener")?.checks.length,
    );
  });

  it("refuses duplicate connections", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/link-shortener");
    await screen.findByRole("heading", { level: 1, name: "A link shortener" });
    await user.click(screen.getByRole("button", { name: "Add Web browser" }));
    await user.click(screen.getByRole("button", { name: "Add Load balancer" }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(
      screen.getAllByRole("listitem").filter((li) => li.textContent?.includes("→")),
    ).toHaveLength(1);
    expect(screen.getByText(/are already connected/)).toBeVisible();
  });

  it("moves and removes a box with the keyboard", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/results-day");
    await screen.findByRole("heading", { level: 1, name: "Exam results day" });
    await user.click(screen.getByRole("button", { name: "Add Load balancer" }));
    const box = within(canvas()).getByRole("button", { name: /^Load balancer/ });
    box.focus();
    await user.keyboard("{ArrowRight}{ArrowDown}");
    expect(
      within(canvas()).getByRole("button", { name: /Load balancer.*column 2, row 2$/ }),
    ).toBeVisible();
    await user.keyboard("{Delete}");
    expect(within(canvas()).queryByRole("button", { name: /^Load balancer/ })).toBeNull();
    expect(screen.getByText("Removed Load balancer.")).toBeVisible();
  });

  it("the model answer earns full marks, is remembered, and can be compared", async () => {
    const user = userEvent.setup();
    const p = findProblem("order-notifications");
    if (!p) throw new Error("missing problem");
    window.localStorage.setItem(STORAGE_KEYS.lab, JSON.stringify({ [p.id]: { draft: p.answer } }));
    renderRoute(`/systems/lab/${p.id}`);
    await screen.findByRole("heading", { level: 1, name: p.title });
    await user.click(screen.getByRole("button", { name: "Check my design" }));
    const result = screen.getByRole("region", { name: "Your result" });
    expect(within(result).getByText("100/100")).toBeVisible();
    expect(within(result).getByText("Excellent")).toBeVisible();
    expect(readBest(p.id)).toBe(100);
    expect(readDone().has(`lab:${p.id}`)).toBe(true);

    await user.click(within(result).getByRole("button", { name: "Show the model answer" }));
    expect(within(result).getByText("Why the model answer looks like this")).toBeVisible();
    expect(within(result).getByText("Model answer")).toBeVisible();
    expect(within(result).getByRole("link", { name: /Read the full case study/ })).toHaveAttribute(
      "href",
      `/systems/case/${p.caseId}`,
    );
  });

  it("an unknown problem says so", async () => {
    renderRoute("/systems/lab/no-such-problem");
    expect(await screen.findByText(/no Design Lab problem called “no-such-problem”/)).toBeVisible();
  });

  it("drops saved designs that no longer make sense", () => {
    const d = cleanDesign({
      nodes: [
        { id: "a", kind: "server", label: "A", col: 0, row: 0 },
        { id: "b", kind: "spaceship", label: "B", col: 1, row: 0 },
        { id: "c", kind: "db", label: "C", col: 0, row: 0 },
        { id: "d", kind: "db", label: "D", col: 40, row: 0 },
        { id: "e", kind: "db", label: "E", col: 2, row: 2 },
      ],
      links: [
        { from: "a", to: "e", mode: "sync" },
        { from: "a", to: "b", mode: "sync" },
        { from: "a", to: "a", mode: "sync" },
        { from: "a", to: "e", mode: "sideways" },
      ],
    });
    expect(d.nodes.map((n) => n.id)).toEqual(["a", "e"]);
    expect(d.links).toEqual([{ from: "a", to: "e", mode: "sync" }]);
    expect(cleanDesign("nonsense")).toEqual({ nodes: [], links: [] });
  });
});
