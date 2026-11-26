import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findItem } from "../src/features/catalog/catalog";
import { readAutoplay, writeAutoplay } from "../src/lib/progress";
import { dwellMs } from "../src/features/systems/autoplay";
import { CASES, checkpointOf } from "../src/features/systems/cases";
import { findLesson, LESSONS, MODULES } from "../src/features/systems/lessons";
import { renderRoute } from "./render";

beforeEach(() => window.localStorage.clear());

describe("system design lessons (data)", () => {
  it("have unique ids", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LESSONS.map((l) => [l.id, l] as const))("%s is well formed", (_, lesson) => {
    expect(lesson.steps.length, "steps").toBeGreaterThanOrEqual(6);
    expect(lesson.steps.at(-1)?.kind, "last step").toBe("recap");
    expect(lesson.learn.length, "learn").toBeGreaterThanOrEqual(3);
    lesson.steps.forEach((step, i) => {
      const where = `${lesson.id} step ${i + 1}`;
      const ids = step.scene.nodes.map((n) => n.id);
      expect(new Set(ids).size, `${where}: node ids`).toBe(ids.length);
      for (const l of step.scene.links ?? []) {
        expect(ids, `${where}: link ${l.from}→${l.to}`).toContain(l.from);
        expect(ids, `${where}: link ${l.from}→${l.to}`).toContain(l.to);
      }
      expect(step.body.length, `${where}: body`).toBeGreaterThan(0);
      expect(step.short.length, `${where}: short`).toBeLessThanOrEqual(14);
      if (step.quiz) {
        expect(step.quiz.answer, `${where}: quiz answer`).toBeLessThan(step.quiz.options.length);
        expect(new Set(step.quiz.options).size, `${where}: quiz options`).toBe(
          step.quiz.options.length,
        );
      }
      for (const row of step.table?.rows ?? []) {
        expect(row.length, `${where}: table row`).toBe(step.table?.head.length);
      }
    });
    for (const b of lesson.builtOn ?? []) {
      const [, section, id] = b.path.split("/");
      const item = findItem(id ?? "");
      expect(item, b.path).toBeDefined();
      expect(item?.kind, b.path).toBe(section === "algorithms" ? "algorithm" : "structure");
    }
  });
});

describe("case studies", () => {
  it("have ids that never clash with lessons", () => {
    const ids = [...LESSONS, ...CASES].map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CASES.map((c) => [c.id, c] as const))("%s is well formed", (_, c) => {
    expect(c.concepts.length, "concepts").toBeGreaterThanOrEqual(3);
    for (const id of c.concepts) expect(findLesson(id), `concept ${id}`).toBeDefined();
    expect(c.steps.length).toBeGreaterThanOrEqual(7);
    expect(c.steps.at(-1)?.kind).toBe("recap");
    const used = new Set(c.steps.flatMap((s) => (s.uses ? [s.uses] : [])));
    for (const id of used) expect(c.concepts, `step uses ${id}`).toContain(id);
    // Most concepts should be visibly applied in some step.
    expect(used.size / c.concepts.length).toBeGreaterThanOrEqual(0.6);
    c.steps.forEach((step, i) => {
      const ids = step.scene.nodes.map((n) => n.id);
      expect(new Set(ids).size, `step ${i + 1} node ids`).toBe(ids.length);
      for (const l of step.scene.links ?? []) {
        expect(ids, `step ${i + 1} link ${l.from}→${l.to}`).toContain(l.from);
        expect(ids, `step ${i + 1} link ${l.from}→${l.to}`).toContain(l.to);
      }
      if (step.quiz) expect(step.quiz.answer).toBeLessThan(step.quiz.options.length);
    });
  });

  it("only combine ideas already learned: each unlocks after its last concept's module", () => {
    for (const c of CASES) {
      const checkpoint = MODULES.indexOf(checkpointOf(c));
      for (const id of c.concepts) {
        const m = MODULES.findIndex((mod) => mod.lessons.some((l) => l.id === id));
        expect(m, `${c.id}: ${id}`).toBeLessThanOrEqual(checkpoint);
      }
    }
    expect(CASES.map((c) => MODULES.indexOf(checkpointOf(c)))).toEqual(
      [...CASES.map((c) => MODULES.indexOf(checkpointOf(c)))].sort((a, b) => a - b),
    );
  });

  it("the System Design Lab shows checkpoints with their case studies", async () => {
    renderRoute("/systems");
    await screen.findByRole("heading", { level: 1, name: "System Design Lab" });
    const groups = screen.getAllByRole("group", { name: "Checkpoint: put it together" });
    expect(groups.length).toBe(new Set(CASES.map((c) => checkpointOf(c).id)).size);
    for (const c of CASES) {
      expect(
        screen.getAllByRole("link").some((a) => a.getAttribute("href") === `/systems/case/${c.id}`),
        c.id,
      ).toBe(true);
    }
  });

  it("a case study names the concept each step uses and links to the lessons it combines", async () => {
    renderRoute("/systems/case/recipe-blog?step=3");
    await screen.findByRole("heading", { level: 1, name: "A recipe blog hits the front page" });
    expect(screen.getByText("Concept:")).toBeVisible();
    for (const a of screen.getAllByRole("link", { name: "Content delivery networks" })) {
      expect(a).toHaveAttribute("href", "/systems/cdn");
    }
    const combines = screen.getByRole("region", { name: "Combines these lessons" });
    expect(within(combines).getAllByRole("link")).toHaveLength(5);
  });

  it.each(CASES.map((c) => [c.id]))("%s renders every step", async (id) => {
    renderRoute(`/systems/case/${id}`);
    await screen.findByRole("heading", { level: 1 });
    const main = screen.getByRole("main");
    for (let guard = 0; guard < 30; guard++) {
      expect(main.textContent, `step ${guard + 1}`).not.toMatch(/\{\{\w+\}\}/);
      const next = screen.queryByRole("button", { name: /^Next: / });
      if (!next) break;
      fireEvent.click(next);
    }
    expect(screen.getByText(/^Step (\d+) \/ \1$/)).toBeVisible();
  });
});

describe("autoplay", () => {
  afterEach(() => vi.useRealTimers());

  it("reading time grows with the text, adds time for a quiz, and follows the speed", () => {
    const lb = findLesson("load-balancing")?.lesson;
    const plain = lb?.steps[1];
    const quiz = lb?.steps[2];
    if (!plain || !quiz) throw new Error("lesson missing");
    expect(dwellMs(plain)).toBeGreaterThanOrEqual(7000);
    expect(dwellMs(quiz)).toBeGreaterThan(dwellMs({ ...quiz, quiz: undefined }));
    expect(dwellMs(plain, "fast")).toBeLessThan(dwellMs(plain, "slow"));
  });

  it("is on by default, moves on after the reading time, and can be switched off", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const lesson = findLesson("load-balancing")?.lesson;
    if (!lesson) throw new Error("lesson missing");
    renderRoute("/systems/load-balancing");
    await screen.findByRole("heading", { level: 1, name: "Load balancing" });
    const toggle = screen.getByRole("button", { name: "Autoplay" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await act(async () => {
      vi.advanceTimersByTime(dwellMs(lesson.steps[0]!) + 100);
    });
    expect(screen.getByText("Step 2 / 11")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Autoplay" }));
    expect(screen.getByRole("button", { name: "Autoplay" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await act(async () => {
      vi.advanceTimersByTime(dwellMs(lesson.steps[1]!) * 2);
    });
    expect(screen.getByText("Step 2 / 11")).toBeVisible();
  });

  it("the Settings choice is remembered", () => {
    writeAutoplay({ on: false, speed: "slow" });
    expect(readAutoplay()).toEqual({ on: false, speed: "slow" });
    window.localStorage.clear();
    expect(readAutoplay()).toEqual({ on: true, speed: "normal" });
  });
});

describe("System Design Lab screens", () => {
  it("/systems lists every module and lesson", async () => {
    renderRoute("/systems");
    expect(
      await screen.findByRole("heading", { level: 1, name: "System Design Lab" }),
    ).toBeVisible();
    const main = screen.getByRole("main");
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(MODULES.map((m) => `${m.number}${m.title}`));
    for (const lesson of LESSONS) {
      expect(
        within(main)
          .getAllByRole("link")
          .some((a) => a.getAttribute("href") === `/systems/${lesson.id}`),
        lesson.id,
      ).toBe(true);
    }
    expect(screen.getByText(`0 of ${LESSONS.length} lessons finished`)).toBeVisible();
  });

  it("steps through a lesson with the buttons, the keyboard and the timeline", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/systems/load-balancing");
    expect(await screen.findByRole("heading", { level: 1, name: "Load balancing" })).toBeVisible();
    expect(screen.getByText("Step 1 / 11")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next: Front door" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Put a load balancer in front" }),
    ).toBeVisible();
    expect(router.state.location.search).toBe("?step=2");
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("heading", { level: 2, name: "Round robin: take turns" }),
    ).toBeVisible();
    const timeline = screen.getByRole("navigation", { name: "Steps in this lesson" });
    await user.click(within(timeline).getByRole("button", { name: /^11\./ }));
    expect(screen.getByRole("heading", { level: 2, name: "Recap" })).toBeVisible();
    expect(window.localStorage.getItem("algoverse.systems.done")).toContain("load-balancing");
  });

  it("a quiz says whether the answer was right and why", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/load-balancing?step=3");
    const quiz = await screen.findByRole("group", { name: "Check yourself" });
    await user.click(within(quiz).getByRole("button", { name: "App B" }));
    expect(within(quiz).getByText("Not quite. The answer is “App A”.")).toBeVisible();
    expect(within(quiz).getByText(/Requests 1, 4 and 7 go to A/)).toBeVisible();
  });

  it("describes the diagram for screen readers", async () => {
    renderRoute("/systems/load-balancing?step=7");
    await screen.findByRole("heading", { level: 2, name: "Who balances the balancer?" });
    expect(screen.getByText("Load balancer, one public address (down)")).toBeInTheDocument();
  });

  it("an unknown lesson shows a friendly page", async () => {
    renderRoute("/systems/no-such-lesson");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Not in the catalog" }),
    ).toBeVisible();
  });

  it.each(LESSONS.map((l) => [l.id]))(
    "%s renders every step without leaking placeholders",
    async (id) => {
      renderRoute(`/systems/${id}`);
      await screen.findByRole("heading", { level: 1 });
      const main = screen.getByRole("main");
      for (let guard = 0; guard < 40; guard++) {
        expect(main.textContent, `step ${guard + 1}`).not.toMatch(/\{\{\w+\}\}/);
        const next = screen.queryByRole("button", { name: /^Next: / });
        if (!next) break;
        fireEvent.click(next);
      }
      expect(screen.getByText(/^Step (\d+) \/ \1$/)).toBeVisible();
    },
  );
});
