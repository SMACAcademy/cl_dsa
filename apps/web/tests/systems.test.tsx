import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { findItem } from "../src/features/catalog/catalog";
import { LESSONS, MODULES } from "../src/features/systems/lessons";
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
