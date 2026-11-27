import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, recordPractice, recordVisit, readMotion } from "../src/lib/progress";
import { CATALOG, groupItems } from "../src/features/catalog/catalog";
import { GLOSSARY } from "../src/features/library/glossary";
import { PYRAMID } from "../src/features/map/topics";
import { PROJECTS } from "../src/features/projects/projects";
import { QUIZZES, shuffled } from "../src/features/practice/quizzes";
import { findLesson } from "../src/features/systems/lessons";
import { renderRoute } from "./render";

describe("home page", () => {
  it("welcomes a new visitor with two ways to start", async () => {
    renderRoute("/home");
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
    renderRoute("/home");
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

describe("learning universe and curriculum", () => {
  it("the pyramid has rows of 1, 3, 5, 7 and 9 topics, and every catalog group appears once", () => {
    expect(PYRAMID.map((r) => r.length)).toEqual([1, 3, 5, 7, 9]);
    const groups = PYRAMID.flat().filter((t) => t.id.startsWith("group-"));
    expect(groups.length).toBe(new Set(groupItems(CATALOG).map((g) => g.group)).size);
    for (const g of groups) expect(g.pages.length, g.title).toBeGreaterThan(0);
  });

  it("/universe lists every topic with progress", async () => {
    recordVisit({ path: "/algorithms/linear-search", title: "Linear search", kind: "algorithm" });
    renderRoute("/universe");
    await screen.findByRole("heading", { level: 1, name: "Learning Universe" });
    expect(screen.getByRole("link", { name: /^Searching\s*1\/2$/ })).toHaveAttribute(
      "href",
      "/algorithms#searching",
    );
    expect(screen.getByRole("link", { name: /^System design: Whole systems/ })).toHaveAttribute(
      "href",
      "/systems#whole",
    );
  });

  it("/curriculum filters to what is still to do", async () => {
    const user = userEvent.setup();
    recordVisit({ path: "/algorithms/linear-search", title: "Linear search", kind: "algorithm" });
    renderRoute("/curriculum");
    await screen.findByRole("heading", { level: 1, name: "Curriculum" });
    expect(screen.getByRole("link", { name: "Linear search" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Still to do" }));
    expect(screen.queryByRole("link", { name: "Linear search" })).toBeNull();
    expect(screen.getByRole("link", { name: "Binary search" })).toBeVisible();
  });
});

describe("playground and projects", () => {
  it("opens a project starter from the URL and switches examples", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/playground?example=maze");
    await screen.findByRole("heading", { level: 1, name: "Python Playground" });
    const editor = screen.getByRole("textbox", { name: "Python code" }) as HTMLTextAreaElement;
    expect(editor.value).toContain("maze = [");
    await user.selectOptions(screen.getByRole("combobox", { name: "Start from" }), "binary-search");
    expect(editor.value).toContain("def binary_search");
    expect(router.state.location.search).toBe("?example=binary-search");
    // jsdom has no Web Workers: the page says so instead of failing.
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByText(/can't run Python here/)).toBeVisible();
  });

  it("every project links to real lessons and opens in the playground", async () => {
    for (const p of PROJECTS) {
      expect(p.code.length, p.id).toBeGreaterThan(100);
      for (const u of p.uses) {
        const [path] = u.path.split("?");
        const [, section, id] = (path ?? "").split("/");
        if (section === "systems") expect(findLesson(id ?? ""), u.path).toBeDefined();
        else
          expect(
            CATALOG.some((c) => c.id === id),
            u.path,
          ).toBe(true);
      }
    }
    renderRoute("/projects");
    await screen.findByRole("heading", { level: 1, name: "Real-World Projects" });
    const opens = screen.getAllByRole("link", { name: "Open in the playground" });
    expect(opens).toHaveLength(PROJECTS.length);
    expect(opens[0]).toHaveAttribute("href", `/playground?example=${PROJECTS[0]?.id}`);
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
