# AlgoVerse: Explore. Visualize. Experiment. Master.

An interactive lab for data structures, algorithms and system design. Every idea is a picture you can step through, poke at and predict, right in your browser. No sign-up, no tracking: progress stays in your own browser.

**Live site:** https://smacacademy.github.io/cl_dsa/ (published from `main` by GitHub Actions)

![AlgoVerse learning universe](docs/assets/pyramid-universe.svg)

## What's inside

| Lab | What you get |
|---|---|
| **Algorithm Lab** | 33 algorithms (searching, sorting, graphs, greedy, dynamic programming, backtracking, strings). Each runs step by step beside its Python code, with the current line lit up, live variables and "predict the next step" questions. |
| **Data Structure Lab** | 21 structures (arrays to AVL trees, tries, heaps, union-find, LRU caches, Bloom filters) that you drive with your own commands. |
| **System Design Lab** | 40 animated lessons in 9 modules, from "how a request travels" to designing a chat system: isometric diagrams where requests flow, servers fail and numbers change, with self-check questions and hands-on labs. Each lesson links back to the data structures it is built on. |

## Run it locally

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm --filter @algoverse/web dev     # http://localhost:5173
pnpm --filter @algoverse/web test    # 700+ tests (Vitest, Testing Library, axe)
```

## Publishing

`.github/workflows/pages.yml` tests, builds and deploys `apps/web` to GitHub Pages on every push to `main`. One-time setup: make the repository public, then **Settings → Pages → Source: GitHub Actions**. The creator card on the About page reads from `apps/web/src/branding.ts`.

## Documentation

| Document | Purpose |
|---|---|
| [BLUEPRINT](docs/BLUEPRINT.md) | Entry point: summary, deliverables index, MVP, key decisions, open questions |
| [PRD](docs/PRD.md) | Product requirements & detailed feature specification |
| [CURRICULUM](docs/CURRICULUM.md) | Complete learning hierarchy (9 tiers, 81 tiles, ~665 concepts) |
| [PYRAMID_MODEL](docs/PYRAMID_MODEL.md) | Expanding pyramid learning architecture |
| [LEARNING_DESIGN](docs/LEARNING_DESIGN.md) | 12-section lesson template & pedagogy |
| [CONTENT_SCHEMA](docs/CONTENT_SCHEMA.md) | Content-as-code schemas & verification pipeline |
| [VISUALIZATION_ENGINE](docs/VISUALIZATION_ENGINE.md) | Trace-driven animation & execution design |
| [EXECUTION_ENGINE](docs/EXECUTION_ENGINE.md) | Python sandbox, tracer & debugger |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Technical architecture, stack, security, deployment, folder structure |
| [DATA_MODEL_AND_API](docs/DATA_MODEL_AND_API.md) | Database schema & REST API |
| [UI_UX](docs/UI_UX.md) | Design language & screen specifications |
| [GAMIFICATION](docs/GAMIFICATION.md) | Assessment, mastery, adaptive learning & gamification |
| [TESTING](docs/TESTING.md) | QA strategy |
| [ROADMAP](docs/ROADMAP.md) | Implementation phases, detailed MVP plan, risks |
| [PROGRESS](docs/PROGRESS.md) | Completed and pending work |
| [DECISIONS](docs/DECISIONS.md) | Architecture decision records |
