# AlgoVerse — Product Requirements Document (PRD)

> **Explore. Visualize. Experiment. Master.**
> Deliverable 1 (Product vision & requirements) and Deliverable 4 (Detailed feature specification).

| Field | Value |
|---|---|
| Status | Draft v1.0 — awaiting owner review |
| Date | 2026-11-18 |
| Scope | Long-term product vision + MVP boundary |
| Related | [CURRICULUM](CURRICULUM.md) · [PYRAMID_MODEL](PYRAMID_MODEL.md) · [ARCHITECTURE](ARCHITECTURE.md) · [ROADMAP](ROADMAP.md) |

---

## 1. Product vision

AlgoVerse is an **interactive computer-science laboratory**. It is not a video course. A learner should be able to start from *"What is an algorithm?"* and reach *"How does an LSM-tree database, a Raft cluster or an HNSW vector index actually work?"*. At every step they **watch real Python code execute** and **see the data change** while it runs.

The learning philosophy, applied to every concept:

```text
See the concept → Understand the logic → Execute the code →
Observe the transformation → Experiment independently → Apply it to real-world problems
```

### 1.1 The gap AlgoVerse fills

| Existing tool type | What it does well | What is missing |
|---|---|---|
| Algorithm animation sites | Attractive animations | Animations are scripted, not driven by real code. No path from basics to mastery. |
| Python execution visualizers | Accurate memory/variable view of real code | No semantic visuals (no "swap", "visit", "relax edge"). No curriculum. No assessment. |
| Coding-problem sites | Large problem banks | Little teaching. The learner is tested before understanding. |
| Gamified concept apps | Engagement, bite-size lessons | Rarely real code. Shallow for advanced CS. |
| MOOCs / textbooks | Depth, rigor | Passive, slow feedback, no experimentation. |

**AlgoVerse's single core idea.** Every visualization is *derived from an actual Python execution trace*. The same trace powers the animation, the code highlighting, the state inspector, the time machine, the battle arena metrics and auto-generated practice questions. That makes the animations **truthful by construction**: they cannot drift away from what the code really does.

### 1.2 Differentiators

1. **Truthful visualizations.** Animation = f(execution trace, view spec). There are no hand-scripted animations for algorithms.
2. **The Expanding Pyramid.** A growing triangular map of the learner's knowledge universe, separate from (and drawn on top of) a real prerequisite graph.
3. **Evidence-based mastery.** A topic is mastered only through demonstrated performance, never by watching.
4. **Infinite verified practice.** Questions are generated from traces of reference implementations, so answers are always correct and never memorizable.
5. **From zero to industry.** One continuous graph links "bits and bytes" to database internals, distributed consensus and vector search.
6. **Runs locally, free, offline-capable.** Python runs in the browser via WebAssembly. No paid APIs.

---

## 2. Target learners (personas)

| Persona | Starting point | Goal | What they need most |
|---|---|---|---|
| **Absolute beginner** (school/early college) | Never programmed | Understand what computing is; learn to think algorithmically | Analogies, slow pacing, visual-first, small wins |
| **CS student** | Knows some Python, struggles with DSA | Pass courses and *understand* rather than memorize | Step-through visuals, complexity intuition, practice |
| **Career switcher / interview candidate** | Can code, weak at problem solving | Recognize patterns, solve interview problems | Pattern-recognition training, progressive hints, problem lab |
| **Working engineer** | Strong coder | Understand systems internals (DB, OS, distributed, vector search) | Advanced tiers, real-world projects, accuracy |
| **Educator** | Expert | Demonstrate concepts live in class | Presenter mode, custom inputs, shareable states |

The design centre is the **beginner who becomes an engineer**. Content and UI must work at both ends of that journey.

---

## 3. Goals, non-goals, anti-goals

### Goals
- G1. Take a learner from zero knowledge to advanced, industry-relevant CS via a connected curriculum.
- G2. Make every algorithm *observable*: synchronized visual + code + state, steppable forwards and backwards.
- G3. Let learners *experiment*: change inputs and code, then observe the different execution.
- G4. Measure understanding honestly (mastery from evidence) and adapt to the learner.
- G5. Stay engaging through meaningful gamification that rewards understanding.
- G6. Be **data-driven and extensible**: hundreds of concepts and thousands of activities without architectural change.
- G7. Run locally, privately and free of paid dependencies.

### Non-goals (for v1.x; can be revisited)
- Languages other than Python for learner code (the trace schema is language-neutral, so this is possible later).
- Social network features, forums, live classrooms.
- Native mobile apps (responsive web only).
- Certification or proctored exams.
- Any core feature that depends on an AI/LLM service. An optional, pluggable local-model tutor may come later.

### Anti-goals (would be failures even if the software "works")
- ❌ An animation that does not match what the code actually does.
- ❌ XP or badges earned by clicking "next" without demonstrating understanding.
- ❌ Lessons hardcoded into React components, so that a new topic needs a code change.
- ❌ Curriculum "islands": topics with no prerequisite or connection links.
- ❌ Visual noise: decorative motion that does not explain *what changed and why*.
- ❌ Executing learner code inside the API server process.

---

## 4. Success metrics

| Metric | Target (post-MVP) | How measured |
|---|---|---|
| Time to first "aha" | First concept completed < 10 min after landing | Analytics events |
| Learning gain | +30 pp from pre-check to mastery checkpoint per concept (median) | Assessment engine |
| Retention of mastery | ≥ 80% of mastered concepts pass their first scheduled review | FSRS review outcomes |
| Visualization fidelity | **100%** of lesson visualizations pass trace-fidelity tests | CI |
| Content correctness | 100% of reference implementations pass tests + property tests | Content CI |
| Engagement | D7 return ≥ 35%, D30 ≥ 20% (cloud deployments) | Analytics |
| Performance | Lesson interactive < 2.5 s (warm), step latency < 50 ms | Perf tests |
| Accessibility | WCAG 2.2 AA on all core flows | axe + manual audit |

---

## 5. Assumptions (documented, changeable)

| # | Assumption | Why | Impact if wrong |
|---|---|---|---|
| A1 | Primary audience reads English. UI strings are still externalized for i18n. | Fastest path | i18n is built in from day one, so only translation work is needed |
| A2 | AlgoVerse is a **hosted web application**, installable as a **PWA**. MVP learners are **anonymous guests** (one per browser, no sign-up); real accounts come in Phases 8–10 | Owner decision, 2026-11-18 | Guests convert to accounts later without losing progress |
| A3 | Learner code runs **in the browser** (Pyodide/WebAssembly) in a Web Worker | Isolation, zero server cost, offline | Server sandbox ("Judge") is designed and scheduled for Phase 8/10 |
| A4 | Python 3.12+ semantics | Pyodide ships modern CPython | Tracer abstracts trace backend |
| A5 | Desktop-first (≥1280 px). Tablet/mobile supported for reading, watching and light practice | Spec | Layout system is responsive from the start |
| A6 | Content authored by the project team in-repo (Markdown + YAML), reviewed via PR | Accuracy, versioning | A web authoring UI can come later on the same schema |
| A7 | Standard library only for learner Python; NumPy loaded lazily for numeric tiers | Download size | Package allow-list per lesson |
| A8 | No PII for guests; email/display name only once accounts exist | Privacy | — |

---

## 6. Functional requirements (summary)

IDs are referenced by tests and acceptance criteria. Modules are specified in §8.

| ID | Requirement |
|---|---|
| FR-01 | Curriculum is a data-driven graph of domains, bridges, modules, concepts, lessons, items, problems and projects |
| FR-02 | "My Learning Universe" renders the expanding triangular map with zoom, pan, expand/collapse and node → lesson navigation |
| FR-03 | Every concept follows the 12-section lesson template (A–L), rendered by one lesson engine |
| FR-04 | Algorithm lessons show a synchronized side-by-side view: visualization (left) and Python code (right) |
| FR-05 | Playback: play, pause, resume, reset, next/prev step, jump to step, speed control, step granularity |
| FR-06 | State inspector shows only the state relevant to the concept (variables, pointers, stacks, heap, call stack…) |
| FR-07 | Learners can edit inputs and code, then re-run and re-visualize |
| FR-08 | Python Playground: write, run, trace, debug (time-travel), compare implementations, measure time and op counts |
| FR-09 | Learner code is executed in an isolated sandbox with time, step, memory and output limits and no network/filesystem/OS access |
| FR-10 | Assessment engine supports ≥ 12 item types incl. predict-next-step, Parsons, find-the-bug, code-with-tests |
| FR-11 | Mastery is computed from evidence. Viewing content never grants mastery |
| FR-12 | Spaced-repetition review schedules per concept |
| FR-13 | Gamification: XP ledger, levels, badges, streaks, daily goals, challenges |
| FR-14 | Adaptive engine detects weak concepts, missing prerequisites and misconceptions, and recommends next activities |
| FR-15 | Problem lab organized by concept, structure, paradigm, difficulty, pattern and application, with progressive hints |
| FR-16 | Projects show architecture, implementation, execution and performance using the platform's engines |
| FR-17 | Algorithm Time Machine, Build-Your-Own Data Structure, Battle Arena, Dependency Explorer, Reverse Engineering |
| FR-18 | Light/dark themes, keyboard navigation, resizable panels, responsive layout |
| FR-19 | Content validation pipeline verifies schema, graph integrity, reference implementations and complexity claims |
| FR-20 | Installable Progressive Web App: manifest, install prompt, offline app shell and previously opened lessons, "update available" prompt |

## 7. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Correctness | Visual state at every step equals the program state captured by the tracer (fidelity tests) |
| NFR-02 | Performance | Step navigation < 50 ms. 60 fps animation for ≤ 300 array elements (SVG). Canvas renderer for ≤ 10k elements |
| NFR-03 | Performance | Trace of a 5,000-step algorithm generated in < 1.5 s on a mid-range laptop |
| NFR-04 | Performance | Initial app shell < 250 KB gzipped JS. Pyodide loaded lazily and cached (Service Worker) |
| NFR-05 | Security | No learner code runs in server processes. Sandbox limits enforced (see [EXECUTION_ENGINE](EXECUTION_ENGINE.md)) |
| NFR-06 | Security | OWASP ASVS L1 for web/API. Argon2id password hashing. httpOnly cookies + CSRF protection |
| NFR-07 | Accessibility | WCAG 2.2 AA. Every animation step has a text narration. Colour is never the only encoding. Reduced-motion support |
| NFR-08 | Extensibility | New concept/lesson/item/problem added with **zero** application code changes |
| NFR-09 | Extensibility | New visualization type added by registering one view adapter + one renderer (no engine changes) |
| NFR-10 | Reliability | Progress writes are idempotent. XP ledger is never double-counted |
| NFR-11 | Portability | Runs on Windows/macOS/Linux for development. Docker for deployment. SQLite or PostgreSQL |
| NFR-12 | Privacy | Guest learners are pseudonymous (no PII). No third-party trackers. Learners can export or delete their data |
| NFR-13 | Maintainability | Module boundaries enforced (lint rules). ≥ 85% coverage on engine packages |
| NFR-14 | Browser support | Last 2 versions of Chrome, Edge, Firefox, Safari |

---

## 8. Detailed feature specification (Deliverable 4)

Each module lists **Purpose · Features · Dependencies · Technical implementation · UX · Testing · Acceptance criteria**. Deeper designs live in the linked documents.

### M1. Curriculum & Content Engine
- **Purpose:** Single source of truth for all learning content, separated from application logic.
- **Features:** domain/bridge/module/concept/lesson/item/problem/project schemas; typed prerequisite graph (hard/soft/related/applies-to); maturity labels (Established / Research / Experimental); references; versioned releases.
- **Dependencies:** none (foundation).
- **Technical:** Content-as-code in `content/` (YAML + Markdown with directives + Python files). `content-tools` CLI validates (Pydantic/JSON Schema), checks graph integrity (DAG, no orphans, bridge adjacency), runs reference implementations and tests, verifies complexity claims empirically, and compiles a versioned JSON bundle that is loaded into the DB. See [CONTENT_SCHEMA](CONTENT_SCHEMA.md).
- **UX:** invisible to learners. Authors get precise validation errors with file and line.
- **Testing:** schema tests, graph property tests, reference-implementation CI, snapshot of compiled bundle.
- **Acceptance:** adding a new concept folder + `content build` makes it appear in the Universe, Curriculum and Library with no code change. A broken prerequisite reference fails CI with a clear message.

### M2. My Learning Universe (Expanding Pyramid)
- **Purpose:** Visual map of the learning journey that grows as the learner masters material.
- **Features:** triangular tile map (domains ▲, bridges ▼); semantic zoom (universe → tile → concept); pan/zoom/keyboard navigation; fog-of-war; tile/concept status colours; prerequisite overlays; recommended path; "pyramid grows" ceremony at tier completion; minimap; search-to-focus.
- **Dependencies:** M1, M10.
- **Technical:** custom SVG renderer + `d3-zoom`; geometry from `(row, col)` triangular-grid coordinates; level-of-detail rendering; layout computed in a pure module (testable). See [PYRAMID_MODEL](PYRAMID_MODEL.md).
- **UX:** calm space-like canvas. Click a concept to see a preview card, then "Start lesson". Unlocks animate gently.
- **Testing:** geometry unit tests (adjacency, side length), visual regression, keyboard navigation E2E, perf with 81 tiles + 800 concepts.
- **Acceptance:** zoom/pan at 60 fps. Clicking a concept opens its lesson. Completing the last core concept in a tile changes its state and reveals adjacent tiles.

### M3. Lesson Engine
- **Purpose:** Render every concept with the mandatory 12-section template.
- **Features:** section blocks A–L; block registry (markdown, analogy, illustration, animation, code, side-by-side, inspector, complexity chart, application, experiment, exercise set, connections, mastery checkpoint); progress per section; resume where left.
- **Dependencies:** M1, M4, M5, M9.
- **Technical:** lesson JSON → block list → React components from a registry. Markdown directives (`:::viz{ref=…}`) embed engine widgets. See [LEARNING_DESIGN](LEARNING_DESIGN.md).
- **UX:** stepper at the top (A→L), one focused section at a time, progressive disclosure for advanced details.
- **Testing:** renders every block type from fixtures. Every content lesson renders without error (CI smoke over the whole bundle).
- **Acceptance:** the Binary Search lesson works end-to-end with all 12 sections. Swapping the content file changes the lesson with no rebuild of the app.

### M4. Algorithm Visualization Engine
- **Purpose:** Reusable, trace-driven visualization for all 14 visualization types.
- **Features:** trace model with keyframes; semantic operation detector; view adapters (array, linked list, stack/queue, tree, graph, sorting bars, search, recursion tree, DP table, hash table, memory/heap, matrix, geometry, parallel timeline); renderer-agnostic scene; SVG and Canvas renderers; animator; narrator; playback controller with granularity (micro-op / line / iteration / call).
- **Dependencies:** M5 (traces), trace-schema package.
- **Technical:** pure TypeScript pipeline `Trace → Ops → ViewModel → Scene → Renderer`. See [VISUALIZATION_ENGINE](VISUALIZATION_ENGINE.md).
- **UX:** the learner always sees *what changed and why* (highlight + narration line).
- **Testing:** fidelity tests (scene ↔ trace state), golden scene snapshots, perf budgets.
- **Acceptance:** bubble, selection and insertion sort plus linear and binary search all render from traces with the same engine and no per-algorithm animation code.

### M5. Python Runtime & Tracer
- **Purpose:** Execute learner/reference Python safely and produce structured execution traces.
- **Features:** Pyodide in a dedicated Web Worker; AST instrumentation (comparisons, subscripts, container methods) + line/call/return tracing; heap-aware serializer; step/time/output/memory limits; deterministic seeding; cancellation.
- **Dependencies:** trace-schema.
- **Technical:** `packages/tracer` (pure Python, also used server-side later); typed worker RPC. See [EXECUTION_ENGINE](EXECUTION_ENGINE.md).
- **UX:** "Run" feels instant (warm worker). Errors are mapped to the learner's own line numbers with friendly explanations.
- **Testing:** tracer unit tests under CPython **and** Pyodide; sandbox escape and resource-exhaustion tests.
- **Acceptance:** infinite loop is stopped in ≤ 5 s with a friendly message. `import socket`/`os.system`/`js` is blocked. The trace of every reference algorithm matches its golden file.

### M6. Python Playground
- **Purpose:** Free-coding and educational execution lab.
- **Features:** CodeMirror editor; Run / Visualize / Debug / Test / Compare modes; inputs panel; output console; variable inspector; time-travel debugger; preloaded examples; snippets saved locally or to account; performance panel (time, op counts, peak memory estimate).
- **Dependencies:** M4, M5.
- **Acceptance:** learner modifies insertion sort, presses Visualize and sees their own version animated. Two implementations compared side-by-side with op counts.

### M7. Algorithm Laboratory
- **Purpose:** Explore algorithms beyond the lesson: **Time Machine**, **Battle Arena**, **Reverse Engineering**.
- **Features:**
  - *Time Machine:* scrub every step; jump to step; before/after diff; bookmarks; **trace queries** ("go to the step where `arr[3]` changed", "when did `lo > hi`").
  - *Battle Arena:* 2–4 algorithms on the same dataset; input distributions (random, sorted, reversed, nearly sorted, few unique, sawtooth); metrics (steps, comparisons, swaps, reads/writes, peak memory estimate, measured runtime) with theory vs measurement clearly separated; growth charts over n; "why did X win?" explanation.
  - *Reverse Engineering:* animation with code hidden; identify the algorithm, predict the next op, explain, implement; compare to reference via tests and trace similarity.
- **Dependencies:** M4, M5, M9.
- **Acceptance:** Arena runs bubble vs insertion vs merge on n=8…512 and plots comparisons vs n with the theoretical curves overlaid and labelled.

### M8. Data Structure Laboratory (Build Your Own)
- **Purpose:** Construct structures visually and see equivalent Python.
- **Features:** drag-and-drop linked list / tree / graph / hash table builders; operations palette (insert, delete, search, traverse) executed as *real Python* on the built structure and animated; bidirectional sync (visual ⇄ Python constructor code); invariant checks (e.g. "this is not a valid BST: 7 is in the left subtree of 5").
- **Dependencies:** M4 (heap model views), M5.
- **Technical:** builder state = the same **heap model** the tracer emits, so code generation and visualization share one representation. React Flow canvas.
- **Acceptance:** learner builds a 4-node singly linked list, clicks "Generate Python", runs `insert_after`, and sees the pointer rewiring animated.

### M9. Assessment Engine
- **Purpose:** Measure understanding with varied, honest item types.
- **Item types:** MCQ, multi-select, numeric, predict-output, **predict-next-step** (on a trace), **trace-the-variable**, **Parsons** (arrange code lines), fill-in-code, **find-the-bug line**, code-with-tests, drag-to-arrange (perform the sort by hand), build-structure, complexity-pick, choose-the-algorithm, explain-by-reasons (structured self-explanation).
- **Features:** item templates with **generators** (parametrized inputs, answers computed by running reference code); misconception-tagged distractors; feedback with explanation + follow-up activity; hints with cost.
- **Dependencies:** M1, M5, M10.
- **Acceptance:** a wrong answer on "which index does binary search check next?" shows the correct step on the animation, names the misconception (e.g. *"off-by-one on mid"*), and queues a remediation item.

### M10. Mastery & Adaptive Learning
- **Purpose:** Know what the learner knows; decide what comes next.
- **Features:** per-knowledge-component ability (Elo-style); concept mastery state machine; FSRS spaced repetition; misconception tracking; prerequisite-gap detection; next-best-activity recommender; revision queue.
- **Dependencies:** M1, M9.
- **Technical:** see [GAMIFICATION](GAMIFICATION.md) §Adaptive.
- **Acceptance:** a learner who repeatedly fails binary-search items involving `mid` is recommended "integer division & indexing" before re-attempting.

### M11. Gamification
- **Purpose:** Sustain motivation without rewarding mindless clicking.
- **Features:** XP ledger (evidence-weighted), levels, skill/behaviour/milestone badges, streaks with freezes, daily goals, daily/weekly challenges (debugging, optimization, comparison, build-it), pyramid-growth ceremonies.
- **Dependencies:** M9, M10.
- **Acceptance:** watching an animation yields 0 XP; a correct first-try prediction yields XP; repeating the same item has diminishing returns.

### M12. Problem-Solving Lab & Interview Prep
- **Purpose:** Apply concepts to problems and learn pattern recognition.
- **Features:** problem bank tagged by concept, structure, paradigm, difficulty, pattern, application; each problem has statement, I/O, constraints, examples, progressive hints, brute-force & optimized approaches (locked until attempt), Python solution, complexity, tests, edge cases, alternatives; hidden tests run in the sandbox; **Pattern Recognition trainer** ("read the statement and pick the paradigm, then justify").
- **Dependencies:** M5, M9, M10.
- **Acceptance:** solution reveal requires ≥ 1 submitted attempt or all hints used; hidden tests report which edge case failed (without leaking it, at the learner's option).

### M13. Real-World Projects
- **Purpose:** Connect theory to engineering.
- **Features:** 15 guided projects (search engine, autocomplete, task scheduler, cache, file indexer, URL router, recommender, DB index, maze solver, navigation, spell checker, compression, load balancer, social-network analyzer, vector search). Each has milestones, architecture diagram, DS/algorithm map, starter code, tests and a performance exploration.
- **Dependencies:** M5, M6, M12.
- **Acceptance:** the "LRU Cache" project shows hash map + doubly linked list cooperating in one synchronized visualization.

### M14. Dashboard & My Progress
- **Purpose:** Orientation and motivation.
- **Features:** continue learning; pyramid mini-map; recommended next; daily challenge; review due; recent topics; achievements; skill mastery radar; upcoming milestones; history/heatmap; per-domain mastery.
- **Dependencies:** M10, M11.

### M15. Knowledge Library & Concept Dependency Explorer
- **Purpose:** Reference lookup and prerequisite exploration.
- **Features:** searchable library (concepts, algorithms, structures, complexity cheat-sheets, glossary); Dependency Explorer: pick any concept → see the prerequisite subgraph, shortest learning path from current knowledge, alternative routes, related concepts.
- **Technical:** graph queries on the concept DAG (ancestors, shortest path weighted by learner's mastery); React Flow + `elkjs`-style layered layout (or d3-dag).
- **Acceptance:** selecting "Dijkstra" shows arrays → heaps → graph representation → BFS → Dijkstra, highlighting what the learner already mastered.

### M16. Learners, Accounts & Settings
- **Features:** anonymous guest learner per browser (httpOnly session cookie, no sign-up) in the MVP; email/password accounts that adopt a guest's progress (Phases 8–10); profile; preferences (theme, motion, speed, daily goal); data export/import (JSON); delete my data.

### M17. Content Operations
- **Features:** `content-tools` CLI (`validate`, `test`, `verify-complexity`, `build`, `publish`, `graph`); preview server for authors; content release history; reference/citation registry; maturity review dates (for emerging topics).

---

## 9. Feature-to-phase map

| Module | MVP (Phases 2–4) | Later |
|---|---|---|
| M1 Content engine | ✅ full schema, validation, build | Web authoring UI |
| M2 Universe | ✅ Pyramid I + fogged future tiles | Path mode, ceremonies polish |
| M3 Lesson engine | ✅ all 12 sections | Presenter mode |
| M4 Visualization | ✅ array/sort/search/variables/call-stack | 10 more view types (Phases 5–7) |
| M5 Runtime/Tracer | ✅ Pyodide + tracer | Server judge (Phase 8/10) |
| M6 Playground | ✅ Run/Visualize/Debug | Compare, profiling |
| M7 Algo Lab | ✅ Time Machine basic | Arena (Phase 6), Reverse Eng. (Phase 8) |
| M8 DS Lab | — | Phase 5 |
| M9 Assessment | ✅ 8 item types incl. predict-next-step, Parsons | All types |
| M10 Adaptive | ✅ mastery states, basic recommender | FSRS, misconception engine (Phase 8) |
| M11 Gamification | ✅ XP, levels, streak, 10 badges | Challenges, full catalogue (Phase 8) |
| M12 Problems | ✅ ~20 problems for Pyramid I | Full lab (Phase 6+) |
| M13 Projects | — | Phase 9 |
| M14 Dashboard | ✅ | — |
| M15 Library/Explorer | ✅ library basic | Explorer (Phase 5) |
| M16 Learners | ✅ guest learners, PWA install | Accounts (Phases 8–10) |
| M17 Content ops | ✅ CLI | Preview server |
