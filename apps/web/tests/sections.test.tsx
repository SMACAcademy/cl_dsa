import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, recordPractice, recordVisit, readMotion } from "../src/lib/progress";
import { GLOSSARY } from "../src/features/library/glossary";
import { QUIZZES, shuffled } from "../src/features/practice/quizzes";
import { findLesson } from "../src/features/systems/lessons";
import { renderRoute } from "./render";

describe("home page", () => {
  it("welcomes a new visitor with two ways to start", async () => {
    renderRoute("/");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Watch algorithms and systems move" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Start: How a request travels/ })).toHaveAttribute(
      "href",
      "/systems/request-journey",
    );
    expect(screen.getByRole("link", { name: "Try binary search" })).toHaveAttribute(
      "href",
      "/algorithms/binary-search",
    );
  });

  it("offers to continue where the learner left off", async () => {
    recordVisit({ path: "/systems/caching?step=4", title: "Caching", kind: "lesson" });
    renderRoute("/");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("link", { name: /^Continue/ })).toHaveAttribute(
      "href",
      "/systems/caching?step=4",
    );
    expect(screen.getByText("Caching")).toBeVisible();
  });

  it("opening a lesson or a player remembers it", async () => {
    renderRoute("/structures/stack");
    await screen.findByRole("heading", { level: 1, name: "Stack" });
    expect(window.localStorage.getItem(STORAGE_KEYS.last)).toContain("/structures/stack");
  });
});

describe("knowledge library", () => {
  it("every glossary link points at a real lesson step or catalog page", () => {
    for (const g of GLOSSARY) {
      const [path, query] = g.path.split("?");
      const [, section, id] = (path ?? "").split("/");
      if (section === "systems") {
        const found = findLesson(id ?? "");
        expect(found, g.term).toBeDefined();
        const step = Number(new URLSearchParams(query ?? "").get("step") ?? "1");
        expect(step, g.term).toBeLessThanOrEqual(found?.lesson.steps.length ?? 0);
      } else {
        expect(["algorithms", "structures"], g.term).toContain(section);
      }
    }
  });

  it("filters every section as you type", async () => {
    const user = userEvent.setup();
    renderRoute("/library");
    await screen.findByRole("heading", { level: 1, name: "Knowledge Library" });
    expect(screen.getByRole("heading", { level: 2, name: "Glossary" })).toBeVisible();
    await user.type(screen.getByRole("searchbox", { name: "Filter the library" }), "token bucket");
    expect(await screen.findByRole("link", { name: "Token bucket" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Binary search" })).toBeNull();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zzzzzz");
    expect(await screen.findByText("Nothing here matches “zzzzzz”.")).toBeVisible();
  });
});

describe("practice", () => {
  it("collects at least one question from most lessons, each well formed", () => {
    expect(QUIZZES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(QUIZZES.map((q) => q.id)).size).toBe(QUIZZES.length);
    for (const q of QUIZZES) expect(q.answer).toBeLessThan(q.options.length);
  });

  it("shuffling keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(shuffled(items).sort()).toEqual(items);
  });

  it("plays a full round and keeps the best score", async () => {
    renderRoute("/problems");
    await screen.findByRole("heading", { level: 1, name: "Problem Solving" });
    fireEvent.click(screen.getByRole("button", { name: /^Start a round of 10/ }));
    for (let i = 0; i < 10; i++) {
      const region = screen.getByRole("region", { name: `Question ${i + 1} of 10` });
      const group = within(region).getByRole("group");
      fireEvent.click(within(group).getAllByRole("button")[0] as HTMLElement);
      expect(within(region).getByRole("link", { name: "Review this step" })).toBeVisible();
      fireEvent.click(
        within(region).getByRole("button", { name: i < 9 ? "Next question" : "See my score" }),
      );
    }
    expect(
      screen.getByRole("heading", { level: 2, name: /^Round finished: \d+ of 10$/ }),
    ).toBeVisible();
    expect(window.localStorage.getItem(STORAGE_KEYS.practice)).toContain('"rounds":1');
  });

  it("a better round replaces the best score", () => {
    recordPractice(4, 10);
    expect(recordPractice(3, 10)).toMatchObject({ best: 4, outOf: 10, rounds: 2 });
    expect(recordPractice(9, 10)).toMatchObject({ best: 9, rounds: 3 });
  });
});

describe("my progress and settings", () => {
  it("shows what was done, and resets after confirming", async () => {
    const user = userEvent.setup();
    recordVisit({
      path: "/algorithms/bfs",
      title: "Breadth-first search (BFS)",
      kind: "algorithm",
    });
    window.localStorage.setItem(STORAGE_KEYS.lessonsDone, JSON.stringify(["cdn"]));
    renderRoute("/progress");
    await screen.findByRole("heading", { level: 1, name: "My Progress" });
    expect(screen.getByRole("link", { name: /Breadth-first search/ })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Scaling" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await user.click(screen.getByRole("button", { name: "Reset my progress" }));
    await user.click(screen.getByRole("button", { name: "Yes, reset" }));
    expect(screen.getByText("Your progress was cleared.")).toBeVisible();
    expect(window.localStorage.getItem(STORAGE_KEYS.visited)).toBeNull();
    expect(screen.getByRole("progressbar", { name: "Scaling" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("settings can start diagrams paused", async () => {
    const user = userEvent.setup();
    renderRoute("/settings");
    await screen.findByRole("heading", { level: 1, name: "Settings" });
    await user.click(screen.getByRole("radio", { name: /Still diagrams/ }));
    expect(readMotion()).toBe("still");
    renderRoute("/systems/cdn");
    expect(await screen.findAllByRole("button", { name: "Play animation" })).not.toHaveLength(0);
  });
});
