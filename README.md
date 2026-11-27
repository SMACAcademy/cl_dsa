# AlgoVerse: Explore. Visualize. Experiment. Master.

[![Live site](https://img.shields.io/badge/live-smacacademy.github.io%2Fcl__dsa-2563eb)](https://smacacademy.github.io/cl_dsa/)
[![GitHub stars](https://img.shields.io/github/stars/SMACAcademy/cl_dsa?style=social)](https://github.com/SMACAcademy/cl_dsa/stargazers)
[![Discussions](https://img.shields.io/github/discussions/SMACAcademy/cl_dsa)](https://github.com/SMACAcademy/cl_dsa/discussions)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Checks](https://github.com/SMACAcademy/cl_dsa/actions/workflows/ci.yml/badge.svg)](https://github.com/SMACAcademy/cl_dsa/actions/workflows/ci.yml)

An interactive lab for data structures, algorithms and system design. Every idea is a picture you can step through, poke at and predict, right in your browser. No sign-up, no tracking: progress stays in your own browser.

**Live site:** https://smacacademy.github.io/cl_dsa/ (published from `main` by GitHub Actions)

![AlgoVerse learning universe](docs/assets/pyramid-universe.svg)

## What's inside

| Lab | What you get |
|---|---|
| **Algorithm Lab** | 33 algorithms (searching, sorting, graphs, greedy, dynamic programming, backtracking, strings). Each runs step by step beside its Python code, with the current line lit up, live variables and "predict the next step" questions. |
| **Data Structure Lab** | 21 structures (arrays to AVL trees, tries, heaps, union-find, LRU caches, Bloom filters) that you drive with your own commands. |
| **System Design Lab** | 50 animated lessons in 11 modules, from "how a request travels" to designing a chat system, connecting to mainframes and adding AI safely (RAG, agents, guardrails, evals): isometric diagrams where requests flow, servers fail and numbers change, with self-check questions and hands-on labs. Lessons autoplay (or step through at your own pace) and link back to the data structures they are built on. |
| **Case studies** | 110 real products designed step by step by combining the lessons learned so far: results-day traffic, train booking, payments, chat history, fraud checks, zero-downtime migrations, mobile banking on a mainframe, an AI help assistant and more, up to capstones for a video platform, an AI claims desk and AlgoVerse itself. Each step names the concept it applies, and each ends with an open design question. |
| **Design Lab** | Draw the system yourself: drag boxes onto a canvas, connect them, and press *Check my design*. Fifteen problems (link shortener, results day, live scores, group chat, balances from a mainframe, a help assistant with sources, a booking agent and more) are marked out of 100 with a reason for every point, then compared with a model answer in 3D. Bring your own problem too: write it down, draw a design, run general checks, and copy a ready-made prompt for a full review from the AI assistant you use. Works with mouse, touch and keyboard. |
| **Practice, Playground, Projects** | Shuffled self-check rounds, real Python running in your browser, and seven guided projects (autocomplete, LRU cache, rate limiter, maze solver, search engine, hash ring, link shortener). |

## Join in

- **Weekly design challenge.** Every Monday a new open question is posted in [Discussions](https://github.com/SMACAcademy/cl_dsa/discussions/categories/q-a). Post your design, compare trade-offs, upvote the best answers.
- **Every case study ends with "Your turn"**: an open question you can answer on GitHub in one click.
- **Improve a lesson.** Found a mistake or a clearer example? Use *Suggest an improvement* on any page, or open a pull request.
- **Add a case study.** See [CONTRIBUTING.md](CONTRIBUTING.md#add-a-case-study); every pull request is checked automatically and reviewed.
- If AlgoVerse helped you, a ⭐ helps other learners find it.

## Run it locally

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm --filter @algoverse/web dev     # http://localhost:5173
pnpm --filter @algoverse/web test    # 800+ tests (Vitest, Testing Library, axe)
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

## License

[MIT](LICENSE). Use it, adapt it for your class or team, and share what you build. A link back is appreciated.
