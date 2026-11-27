import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { flowsOf, type Design, toScene } from "../src/features/systems/lab/model";
import { cleanDesign } from "../src/features/systems/lab/storage";
import { renderRoute } from "./render";

const canvas = () => screen.getByRole("group", { name: "Your design" });

const D: Design = {
  nodes: [
    { id: "app", kind: "server", label: "App", col: 0, row: 0 },
    { id: "db", kind: "db", label: "DB", col: 2, row: 0 },
    { id: "q", kind: "queue", label: "Q", col: 2, row: 2 },
    { id: "drop", kind: "files", label: "Drop", col: 4, row: 2 },
    { id: "m", kind: "llm", label: "Model", col: 4, row: 0 },
    { id: "mon", kind: "monitor", label: "Mon", col: 0, row: 2 },
  ],
  links: [
    { from: "app", to: "db", mode: "sync" },
    { from: "app", to: "q", mode: "async" },
    { from: "q", to: "drop", mode: "async" },
    { from: "app", to: "m", mode: "sync" },
    { from: "app", to: "mon", mode: "sync" },
  ],
};

describe("what travels along a link", () => {
  it("picks a shape for each kind of traffic", () => {
    const kinds = D.links.map((l) => flowsOf(D, l).map((f) => f.kind));
    expect(kinds).toEqual([
      ["write", "response"],
      ["event"],
      ["file"],
      ["request", "token"],
      ["event"],
    ]);
    expect(toScene(D).links?.[3]?.flows?.[1]).toMatchObject({ kind: "token", back: true });
  });
});

describe("free placement", () => {
  it("keeps half-step positions and drops boxes that would overlap", () => {
    const d = cleanDesign({
      nodes: [
        { id: "a", kind: "server", label: "A", col: 1.5, row: 2.5 },
        { id: "b", kind: "server", label: "B", col: 2, row: 3 },
        { id: "c", kind: "server", label: "C", col: 2.5, row: 2.5 },
        { id: "d", kind: "server", label: "D", col: 1.25, row: 0 },
        { id: "e", kind: "server", label: "E", col: 11, row: 7 },
        { id: "f", kind: "server", label: "F", col: 11.5, row: 0 },
      ],
      links: [],
    });
    expect(d.nodes.map((n) => n.id)).toEqual(["a", "c", "e"]);
  });

  it("Shift and an arrow key move a box half a step", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/results-day");
    await screen.findByRole("heading", { level: 1, name: "Exam results day" });
    await user.click(screen.getByRole("button", { name: "Add Load balancer" }));
    within(canvas())
      .getByRole("button", { name: /^Load balancer/ })
      .focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(
      within(canvas()).getByRole("button", { name: /Load balancer.*column 1.5, row 1$/ }),
    ).toBeVisible();
  });

  it("marks boxes that aren't connected yet", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/results-day");
    await screen.findByRole("heading", { level: 1, name: "Exam results day" });
    await user.click(screen.getByRole("button", { name: "Add Load balancer" }));
    expect(within(canvas()).getByRole("button", { name: /^Load balancer/ })).not.toHaveAttribute(
      "title",
    );
    await user.click(screen.getByRole("button", { name: "Add App server" }));
    expect(within(canvas()).getByRole("button", { name: /^Load balancer/ })).toHaveAttribute(
      "title",
      "Not connected yet",
    );
  });
});

describe("hints and the live views", () => {
  it("a hint first says what to look at, then how to fix it", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/lab/link-shortener");
    await screen.findByRole("heading", { level: 1, name: "A link shortener" });
    await user.click(screen.getByRole("button", { name: "Add Web browser" }));

    await user.click(screen.getByRole("button", { name: "Give me a hint" }));
    const panel = screen.getByRole("region", { name: /Hint/ });
    expect(within(panel).getByText("1 hint used")).toBeVisible();
    expect(
      within(panel).getByText("Look at this: Visitors reach the servers through a load balancer."),
    ).toBeVisible();
    expect(within(panel).getByText(/Press Give me a hint again/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Give me a hint" }));
    expect(within(panel).getByText(/^Try this: Put a load balancer between/)).toBeVisible();
    expect(within(panel).getByText("2 hints used")).toBeVisible();

    // The third hint moves on to the next missing piece.
    await user.click(screen.getByRole("button", { name: "Give me a hint" }));
    expect(
      within(panel).getByText("Look at this: At least two app servers behind the load balancer."),
    ).toBeVisible();
  });

  it("shows a legend for what moves, and the design in 3D on request", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "algoverse.lab.v1",
      JSON.stringify({ "link-shortener": { draft: D } }),
    );
    renderRoute("/systems/lab/link-shortener");
    await screen.findByRole("heading", { level: 1, name: "A link shortener" });
    for (const label of ["write", "event / message", "file", "AI output"]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    const toggle = screen.getByRole("button", { name: "See it in 3D" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Your design in 3D, as you build it")).toBeVisible();
  });
});
