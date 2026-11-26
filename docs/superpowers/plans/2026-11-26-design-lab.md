# Design Lab Implementation Plan

> **For agentic workers:** executed natively in the authoring session (the user asked to proceed
> without per-step check-ins). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/systems/lab` with 10 graded design problems: a drag-and-drop canvas, rule-based marking
out of 100, and a model answer shown in 3D.

**Architecture:** Pure graph helpers (`rules.ts`) and scoring (`grade.ts`) are unit-tested without
React. Problems are data (`problems.ts`). The editor (`DesignLabPage.tsx`) keeps a `Design` in
state, renders HTML boxes on a CSS grid with an SVG link layer, and reuses `IsoScene` for the 3D
comparison.

**Tech Stack:** React 19, TypeScript, Tailwind v4, react-i18next, react-router lazy routes,
Vitest + Testing Library + vitest-axe.

**Spec:** `docs/superpowers/specs/2026-11-26-design-lab-design.md`

## Global Constraints

- Static site: no network calls, no new runtime dependencies.
- Every visible UI string comes from `en.json` (`lab.*`); a missing key fails tests.
- Grid 12 × 8, one box per cell. Score = round(100 × passed points / total).
- Storage key `algoverse.lab.v1`, every access in try/catch.
- Every check fails on an empty design; every model answer scores 100.
- Keyboard: add, select, move (arrows), connect, delete all work without a mouse.

## Review Focus

- Dropping a box on an occupied cell: it goes to the nearest free cell, never on top.
- Deleting a box removes its links.
- Linking a box to itself, or adding a duplicate link: refused.
- A saved draft from an older problem version (unknown ids or kinds): ignored, not crashing.
- Palette `max` reached: the item is disabled.

---

### Task 1: Rules and grading (`features/systems/lab/{model,rules,grade}.ts`)

- [ ] Tests in `tests/lab.test.ts`: each helper on a small design; `grade` bands; `toScene` maps
      sync → request+response, async → event.
- [ ] Implement `rules.ts` helpers and groups as in the spec; `grade(problem, design)` returns
      `{ score, band, results: {check, passed}[] }`; `toScene(design)` in `model.ts`.

### Task 2: Problems (`features/systems/lab/problems.ts`)

- [ ] Tests: ids unique and not clashing with lessons/cases; every answer scores 100; empty scores
      0; answer nodes are all offered by the palette; concepts are lesson ids; caseId exists.
- [ ] Write the 10 problems from the spec table.

### Task 3: Editor and list pages

- [ ] `LabHome.tsx` (`/systems/lab`), `DesignLabPage.tsx` (`/systems/lab/:problemId`), routes before
      `systems/:lessonId`, a card on `SystemsHome`, `lab.*` strings, ROUTE_PATHS entries.
- [ ] UI tests: list shows 10 problems; add boxes from the palette, connect via the inspector,
      check → score and per-check results; model answer button shows the explanation; draft
      survives a re-render; unknown problem id shows not-found.

### Task 4: Verify and ship

- [ ] Full tests, typecheck, lint; browser check (mouse drag, keyboard, narrow width, dark mode).
- [ ] Commit, push, PR.
