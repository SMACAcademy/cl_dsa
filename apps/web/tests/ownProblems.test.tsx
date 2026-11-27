import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { GENERAL_CHECKS } from "../src/features/systems/lab/general";
import { grade } from "../src/features/systems/lab/grade";
import type { Design } from "../src/features/systems/lab/model";
import {
  createOwn,
  deleteOwn,
  listOwn,
  readOwn,
  requirementLines,
} from "../src/features/systems/lab/ownStorage";
import { buildReviewPrompt } from "../src/features/systems/lab/prompt";
import i18n from "../src/lib/i18n";
import { STORAGE_KEYS } from "../src/lib/progress";
import { renderRoute } from "./render";

const n = (id: string, kind: Design["nodes"][number]["kind"], col: number, row: number) => ({
  id,
  kind,
  label: id,
  col,
  row,
});

/** users → lb → two servers → db; servers queue jobs for a worker; monitoring on the lb. */
const GOOD: Design = {
  nodes: [
    n("users", "browser", 0, 3),
    n("lb", "lb", 2, 3),
    n("s1", "server", 4, 2),
    n("s2", "server", 4, 4),
    n("db", "db", 7, 3),
    n("q", "queue", 6, 6),
    n("w", "worker", 8, 6),
    n("mon", "monitor", 2, 6),
  ],
  links: [
    { from: "users", to: "lb", mode: "sync" },
    { from: "lb", to: "s1", mode: "sync" },
    { from: "lb", to: "s2", mode: "sync" },
    { from: "s1", to: "db", mode: "sync" },
    { from: "s2", to: "db", mode: "sync" },
    { from: "s1", to: "q", mode: "async" },
    { from: "q", to: "w", mode: "async" },
    { from: "lb", to: "mon", mode: "async" },
  ],
};

describe("general checks", () => {
  it("an empty canvas scores 0", () => {
    const g = grade({ checks: GENERAL_CHECKS }, { nodes: [], links: [] });
    expect(g.score).toBe(0);
    expect(g.results.some((r) => r.passed)).toBe(false);
  });

  it("a sound design scores 100, with checks that don't fit left out", () => {
    const g = grade({ checks: GENERAL_CHECKS }, GOOD);
    expect(g.results.filter((r) => r.applies && !r.passed).map((r) => r.check.id)).toEqual([]);
    expect(g.score).toBe(100);
    const na = g.results.filter((r) => !r.applies).map((r) => r.check.id);
    expect(na).toEqual(["shared", "ai", "legacy"]);
  });

  it("spots users talking to the database and a single server", () => {
    const risky: Design = {
      nodes: [n("users", "browser", 0, 0), n("app", "server", 2, 0), n("db", "db", 4, 0)],
      links: [
        { from: "users", to: "app", mode: "sync" },
        { from: "app", to: "db", mode: "sync" },
        { from: "users", to: "db", mode: "sync" },
      ],
    };
    const failed = grade({ checks: GENERAL_CHECKS }, risky)
      .results.filter((r) => r.applies && !r.passed)
      .map((r) => r.check.id);
    expect(failed).toEqual(["front", "spare", "data", "watch"]);
  });

  it("AI models and mainframes must sit behind a door", () => {
    const ai: Design = {
      nodes: [n("users", "browser", 0, 0), n("app", "service", 2, 0), n("m", "llm", 4, 0)],
      links: [
        { from: "users", to: "app", mode: "sync" },
        { from: "app", to: "m", mode: "sync" },
      ],
    };
    const r = grade({ checks: GENERAL_CHECKS }, ai).results.find((x) => x.check.id === "ai");
    expect(r).toMatchObject({ applies: true, passed: false });
  });

  it("a check that doesn't apply is never counted, even if it would pass", () => {
    const g = grade(
      {
        checks: [
          { id: "a", label: "a", hint: "", points: 50, pass: () => true },
          { id: "b", label: "b", hint: "", points: 50, pass: () => true, applies: () => false },
        ],
      },
      GOOD,
    );
    expect(g.score).toBe(100);
    expect(g.results[1]).toMatchObject({ applies: false, passed: false });
  });
});

describe("own problem storage", () => {
  it("creates, lists newest first, reads and deletes", () => {
    const a = createOwn({ title: "First" });
    const b = createOwn({ title: "Second" });
    expect(a.id).not.toBe(b.id);
    expect(listOwn().map((p) => p.title)).toContain("Second");
    expect(readOwn(a.id)?.title).toBe("First");
    deleteOwn(a.id);
    expect(readOwn(a.id)).toBeUndefined();
    expect(listOwn()).toHaveLength(1);
  });

  it("drops broken saved entries instead of crashing", () => {
    window.localStorage.setItem(
      STORAGE_KEYS.labOwn,
      JSON.stringify([{ id: "BAD ID" }, "nonsense", { id: "p-ok", title: 7, draft: "x" }]),
    );
    const list = listOwn();
    expect(list.map((p) => p.id)).toEqual(["p-ok"]);
    expect(list[0]).toMatchObject({ title: "", draft: { nodes: [], links: [] } });
    window.localStorage.setItem(STORAGE_KEYS.labOwn, "{not json");
    expect(listOwn()).toEqual([]);
  });

  it("reads one requirement per line, without bullets or blanks", () => {
    expect(requirementLines({ requirements: "- Fast\n\n • Cheap \n* Safe\n" })).toEqual([
      "Fast",
      "Cheap",
      "Safe",
    ]);
  });
});

describe("the review prompt", () => {
  it("carries the problem, the design in words, the checks and the asks", () => {
    const result = grade({ checks: GENERAL_CHECKS }, GOOD);
    const text = buildReviewPrompt(
      {
        title: "Dental bookings",
        brief: "Patients book appointments online.",
        requirements: ["A booking is never lost"],
        design: GOOD,
        result,
      },
      i18n.t,
    );
    expect(text).toContain("Title: Dental bookings");
    expect(text).toContain("Patients book appointments online.");
    expect(text).toContain("- A booking is never lost");
    expect(text).toContain("2. lb (load balancer)");
    expect(text).toContain("- s1 → q (Sends and moves on)");
    expect(text).toContain("score 100/100");
    expect(text).toContain("- [not applicable] Services don't share a database");
    expect(text).toContain("5. A score out of 10");
    expect(text).not.toMatch(/\{\{|lab\.own/);
  });

  it("says so when parts are missing", () => {
    const text = buildReviewPrompt(
      { title: "", brief: "", requirements: [], design: { nodes: [], links: [] } },
      i18n.t,
    );
    expect(text).toContain("(no title)");
    expect(text).toContain("(the canvas is empty)");
    expect(text).not.toContain("Automatic checks");
  });
});

describe("bring your own problem (screens)", () => {
  it("starts a blank problem, saves what you type, checks and copies the review prompt", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const { router } = renderRoute("/systems/lab");
    await screen.findByRole("heading", { level: 2, name: "Bring your own problem" });
    expect(screen.getByText("You haven't written a problem yet.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start a blank problem" }));
    await screen.findByRole("heading", { level: 1, name: "Untitled problem" });
    const id = router.state.location.pathname.split("/").at(-1) as string;
    expect(router.state.location.pathname).toBe(`/systems/lab/own/${id}`);

    await user.type(screen.getByLabelText("Title"), "Dental bookings");
    await user.type(screen.getByLabelText("Requirements, one per line"), "Never lose a booking");
    expect(screen.getByRole("heading", { level: 1, name: "Dental bookings" })).toBeVisible();
    expect(readOwn(id)?.title).toBe("Dental bookings");

    // Every kind of box is on offer, including the AI and legacy ones.
    expect(screen.getByRole("button", { name: "Add Mainframe" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add Web browser" }));
    await user.click(screen.getByRole("button", { name: "Add App server" }));
    await user.click(screen.getByRole("button", { name: "Check my design" }));
    const result = screen.getByRole("region", { name: "Your result" });
    expect(within(result).getAllByText(/not counted for this design/).length).toBeGreaterThan(0);
    expect(within(result).getByText(/look only at the shape/)).toBeVisible();
    expect(readOwn(id)?.draft.nodes).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Copy the prompt" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = (writeText.mock.calls[0] as unknown as [string])[0];
    expect(copied).toContain("Title: Dental bookings");
    expect(copied).toContain("- Never lose a booking");
    expect(copied).toContain("(app server)");
    expect(screen.getByText(/Copied. Paste it/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Show the prompt" }));
    expect((screen.getByLabelText("The prompt") as HTMLTextAreaElement).value).toBe(copied);
  });

  it("starts from a lab problem's brief, lists it, and deletes after a second click", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/systems/lab");
    await screen.findByRole("heading", { level: 2, name: "Bring your own problem" });
    await user.selectOptions(screen.getByLabelText("Or start from a lab problem"), "chat");
    await user.click(screen.getByRole("button", { name: "Start from this one" }));
    await screen.findByRole("heading", { level: 1, name: "Group chat" });
    expect((screen.getByLabelText("Problem statement") as HTMLTextAreaElement).value).not.toBe("");

    const del = screen.getByRole("button", { name: "Delete this problem" });
    await user.click(del);
    expect(listOwn()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Click again to delete it for good" }));
    expect(router.state.location.pathname).toBe("/systems/lab");
    expect(listOwn()).toHaveLength(0);
  });

  it("lists problems written earlier", async () => {
    const p = createOwn({ title: "Parcel lockers" });
    renderRoute("/systems/lab");
    expect(await screen.findByRole("link", { name: "Parcel lockers" })).toHaveAttribute(
      "href",
      `/systems/lab/own/${p.id}`,
    );
  });

  it("an unknown own problem says so", async () => {
    renderRoute("/systems/lab/own/p-nothing");
    expect(await screen.findByText(/no problem called “p-nothing” in this browser/)).toBeVisible();
  });

  it("the own problem page has no axe violations", async () => {
    const p = createOwn({ title: "Parcel lockers", requirements: "Fast" });
    renderRoute(`/systems/lab/own/${p.id}`);
    await screen.findByRole("heading", { level: 1, name: "Parcel lockers" });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
