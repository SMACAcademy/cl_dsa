# AlgoVerse — Development Progress Tracker

> Updated after every milestone. A feature is marked ✅ only when its tests pass (brief rule 15).
> Legend: ✅ done · 🟡 in progress · ⏳ pending · 🔬 spike · ⛔ blocked

## Current status
**Phase 1 — Product & Engineering Blueprint: ✅ approved** (2026-11-18).
**Phase 2 — 🟡 in progress** (branch `phase-2`, not yet merged or pushed):
- **2A spikes:** S1–S6 run and written up (Task 7, consolidating them into decisions, is still open).
- **2B foundation:** Tasks 1 (monorepo scaffold) and 13 (web shell) done; the trace-schema package (Task 2) is started but uncommitted; the rest are pending.
- **Ahead of plan:** an interactive catalog of all 54 algorithms and data structures, each with a step-through player (see below).
- **Ahead of plan:** the System Design Lab (40 animated lessons) and the public static site (see below).

## System Design Lab and public site (2026-11-25, branch `system-design`)
Owner direction: AlgoVerse becomes a public static site (no database; progress in localStorage) with
personal branding, and gains a full system-design track. Plan and ledger:
[plans/2026-11-25-system-design-lab.md](plans/2026-11-25-system-design-lab.md).

| Piece | Status |
|---|---|
| Isometric scene engine (SVG, animated request/response flows, zones, notes, reduced-motion fallback) | ✅ |
| Lesson player (step kinds, callouts, what changed, live metrics, quizzes, tables, timeline, `?step=` links, keyboard, progress) | ✅ |
| 40 lessons in 9 modules, told through AlgoVerse's own growth | ✅ |
| Load-balancing lab (drive requests, policies and failures) | ✅ |
| GitHub Pages workflow, base-path-safe PWA, link-preview tags, About page, creator card | ✅ (needs owner: public repo, Pages source, LinkedIn URL) |

Tests: 711 passing in 39 files; type check and lint clean (2026-11-25).

## Interactive catalog (built ahead of the roadmap)
The web app has a catalog of 54 entries, each with a worked example and a step-through player:
code panel with the current line, variables, narration, "predict the next step" questions,
presets (default 10–12 values, plus a small "card example"), and a 🎲 Random button.
These players run the algorithm in TypeScript. They are **not** the Python-traced visualizations
of Phase 3, which still need the execution engine.

| Section | Status |
|---|---|
| Searching (linear, binary) | ✅ |
| Sorting (bubble, selection, insertion, merge, quick, heap, counting, radix) | ✅ |
| Linear structures (arrays, dynamic array, linked lists, stack, queue, ring buffer) | ✅ |
| Hashing (hash table, open addressing) | ✅ |
| Trees (binary tree, BST, AVL, heap, trie, segment tree) | ✅ |
| Graphs and sets (graph, union-find) and graph algorithms | ✅ |
| Recursion (incl. Tower of Hanoi) and problem-solving patterns | ✅ |
| Greedy, dynamic programming, backtracking | ✅ |
| Strings and numbers (naive match, KMP, GCD, sieve) | ✅ |
| Designed structures (LRU cache, Bloom filter) | ✅ |

Tests: 601 passing in 36 files (Vitest + Testing Library + axe); type check and lint clean (2026-11-22).

## Phase 1 — Blueprint deliverables

| # | Deliverable | Document | Status |
|---|---|---|---|
| 1 | Product vision & requirements | [PRD](PRD.md) | ✅ drafted |
| 2 | Curriculum & concept hierarchy | [CURRICULUM](CURRICULUM.md) | ✅ drafted |
| 3 | Expanding pyramid architecture | [PYRAMID_MODEL](PYRAMID_MODEL.md) | ✅ drafted |
| 4 | Detailed feature specification | [PRD §8](PRD.md#8-detailed-feature-specification-deliverable-4) | ✅ drafted |
| 5 | Learning experience & lesson design | [LEARNING_DESIGN](LEARNING_DESIGN.md) | ✅ drafted |
| 6 | Visualization engine architecture | [VISUALIZATION_ENGINE](VISUALIZATION_ENGINE.md) | ✅ drafted |
| 7 | Python execution & debugging | [EXECUTION_ENGINE](EXECUTION_ENGINE.md) | ✅ drafted |
| 8 | UI/UX & screen specifications | [UI_UX](UI_UX.md) | ✅ drafted |
| 9 | Technical architecture & stack | [ARCHITECTURE](ARCHITECTURE.md) | ✅ drafted |
| 10 | Database schema & API | [DATA_MODEL_AND_API](DATA_MODEL_AND_API.md) | ✅ drafted |
| 11 | Gamification & adaptive learning | [GAMIFICATION](GAMIFICATION.md) | ✅ drafted |
| 12 | Testing & QA strategy | [TESTING](TESTING.md) | ✅ drafted |
| 13 | Phased roadmap | [ROADMAP](ROADMAP.md) | ✅ drafted |
| 14 | Initial folder structure | [ARCHITECTURE §9](ARCHITECTURE.md#9-initial-project-folder-structure-deliverable-14) | ✅ drafted |
| 15 | Risks & recommendations | [ROADMAP §6](ROADMAP.md#6-risk-assessment--mitigation-deliverable-15) | ✅ drafted |
| — | Content architecture | [CONTENT_SCHEMA](CONTENT_SCHEMA.md) | ✅ drafted |
| — | Decisions log | [DECISIONS](DECISIONS.md) | ✅ 18 ADRs proposed |

## Next up (after approval)
| Milestone | Status |
|---|---|
| Owner review of blueprint | ✅ approved 2026-11-18 |
| Answer open questions in [BLUEPRINT §8](BLUEPRINT.md#8-questions-that-genuinely-need-your-input) (licence blocks only the `LICENSE` file) | ⏳ |
| Phase 2 execution plans: [2A spikes](plans/2026-11-18-phase-2a-spikes.md) (8 tasks) · [2B foundation](plans/2026-11-18-phase-2b-foundation.md) (19 tasks) | ✅ written |
| M2.0 De-risking spikes (S1–S6) | 🟡 all six run (S2 pass; S1, S4, S5, S6 pass with changes; S3 per clause); 2A Task 7 consolidation pending |
| M2.1 Monorepo scaffold | ✅ pnpm + uv workspaces, lint, LF |
| 2B remaining tasks (2–12, 14–19) | ⏳ trace-schema started, uncommitted |
| Push `phase-2` and open a PR to `main` | ⏳ needs owner OK |

## Phase checklist

| Phase | Status |
|---|---|
| 1 Blueprint | ✅ approved |
| 2 Foundation | 🟡 in progress |
| 3 Visualization engine | ⏳ |
| 4 Pyramid I (MVP) | ⏳ |
| 5 Data structures | ⏳ |
| 6 Algorithms | ⏳ |
| 7 Advanced CS | ⏳ |
| 8 Gamification & adaptive | ⏳ |
| 9 Projects | ⏳ |
| 10 Production readiness | ⏳ |

## Change log
- **2026-11-18** — Phase 1 blueprint drafted: 16 documents, the universe diagram and 18 proposed ADRs.
- **2026-11-18** — Blueprint approved. Phase 2A (spikes) and 2B (foundation) execution plans written. The tile "glimpsed" rule now also follows prerequisite links (PYRAMID_MODEL §5.1).
- **2026-11-18** — Spikes S1–S6 run and written up in [spikes/](spikes/). Monorepo scaffold and web app shell (routing, themes, i18n). Owner decision: hosted web app, installable PWA, guest learners. System-freeze incident recorded in [incidents/](incidents/).
- **2026-11-18 – 11-20** — Interactive catalog: 54 algorithms and data structures, each with a step-through player, built section by section.
- **2026-11-25** — System Design Lab: scene engine, lesson player and all 40 lessons; public-site setup (GitHub Pages workflow, About page, branding). Trace schema (2B Task 2) committed on `phase-2`.
- **2026-11-22** — Bigger examples: players open on 10–12 values (up to 16), each keeps a small "card example", and a 🎲 Random button fills in 12 fresh values. Bars and array boxes shrink so 16 values fit beside the code panel.
