# AlgoVerse — Architecture Decision Records (ADRs)

> Every significant engineering decision is recorded here with its context, the alternatives considered and its consequences. Status values: **Proposed** (awaiting owner approval), **Accepted**, **Superseded**.
> All decisions below are **Proposed** as part of the Phase 1 blueprint (2026-11-18). Spike-dependent ones are marked ⚗ and will be confirmed or revised in Phase 2 (M2.0).

| ADR | Decision | Status |
|---|---|---|
| 001 | Modular monolith (one API deployable with strict module boundaries) | Proposed |
| 002 | React 19 + TypeScript + Vite SPA (no SSR) | Proposed |
| 003 | Learner Python runs in the browser: Pyodide in a dedicated Web Worker | Proposed ⚗ |
| 004 | Execution observation = AST instrumentation + `sys.settrace`; visuals are a pure function of trace + view spec | Proposed ⚗ |
| 005 | Visualization pipeline Trace → Ops → View → Scene → Renderer, with custom tween engine; SVG default, Canvas for large | Proposed ⚗ |
| 006 | Learning Universe = custom SVG + d3-zoom; React Flow only for node-link editors | Proposed ⚗ |
| 007 | Content-as-code (YAML + Markdown directives + Python) compiled into versioned releases | Proposed |
| 008 | SQLAlchemy 2 + Alembic; SQLite for local/dev, PostgreSQL for production | Proposed |
| 009 | Mastery from evidence: Elo per knowledge component + checkpoint; FSRS for review | Proposed |
| 010 | Append-only XP ledger with idempotency keys | Proposed |
| 011 | No paid APIs or AI services in core functionality | Proposed |
| 012 | CodeMirror 6 as the code editor | Proposed |
| 013 | Monorepo: pnpm workspaces + uv workspace | Proposed |
| 014 | Pyramid geometry = triangular grid `(row, col)`; bridges integrate their 3 geometric neighbours | Proposed |
| 015 | Server Judge deferred to Phase 8; container-isolated, never in the API process | Proposed |
| 016 | Trace-generated assessment items | Proposed |
| 017 | JSON Schema is the single source of truth for the trace schema (codegen to TS + Pydantic) | Proposed |
| 018 | Hosted web app with anonymous guest learners first; accounts later *(revised 2026-11-18, owner decision)* | Accepted |
| 020 | Installable PWA via `vite-plugin-pwa` (Workbox), prompt-to-update | Accepted |

---

### ADR-001 — Modular monolith
- **Context:** Small team, many domains (content, progress, assessment, gamification), long-term growth, cheap hosted deployment.
- **Decision:** One FastAPI deployable with modules communicating via services/domain events. Boundaries enforced by `import-linter`.
- **Alternatives:** Microservices (operational overhead, distributed transactions, overkill); unstructured monolith (erodes quickly).
- **Consequences:** One process to run locally or host. Modules can be extracted later (the Judge is already separate because of security).

### ADR-002 — React + TypeScript + Vite
- **Context:** The brief mandates React/TS. App is highly interactive. Needs workers, WASM and cross-origin isolation headers.
- **Decision:** Client-side SPA with Vite. No SSR.
- **Alternatives:** Next.js (SSR brings little for an authenticated, interactive lab, and complicates COOP/COEP and worker setup).
- **Consequences:** SEO for public pages (if ever needed) handled by a small static marketing site.

### ADR-003 — Pyodide in a Web Worker ⚗
- **Context:** Must run arbitrary learner Python securely with limits, and must not execute it in the server process. Hosted cheaply, free of paid services.
- **Decision:** Pyodide (CPython → WASM) in a dedicated worker, hardened (no network bridges, import deny-list), with watchdog kill + SharedArrayBuffer soft interrupts.
- **Alternatives:** Server-side sandbox for everything (cost, latency, attack surface, needs connectivity); Skulpt/Brython (not real CPython, so semantics drift); JupyterLite (heavier, notebook-centric).
- **Consequences:** ~10 MB first download (cached). Browser CPU limits for large runs. Timing is WASM-specific (labelled). The Judge covers authoritative needs later.

### ADR-004 — Instrumentation + tracing, state-derived visuals ⚗
- **Context:** Visuals must accurately reflect execution. No text matching of source.
- **Decision:** AST transformation emits semantic events (compare/read/write/method/attr) with exact spans and value origins. `sys.settrace` provides line/call/return/exception plus locals deltas. The engine derives visuals purely from trace snapshots + view spec.
- **Alternatives:** Hand-scripted animations (can lie, don't scale); `settrace` only (no compare/swap semantics, so guessing from diffs); tracked proxy containers only (changes `type()`, misses comparisons).
- **Consequences:** Fidelity becomes testable. Learner-edited code is visualized truthfully. Tracer must preserve semantics (Hypothesis suite).

### ADR-005 — Pipeline + custom tween engine ⚗
- **Decision:** Pure-TS pipeline producing renderer-agnostic scenes with stable ids. A small custom tween engine drives both the SVG and Canvas renderers. Framer Motion is used for UI chrome only.
- **Alternatives:** Framer Motion for viz (DOM-bound, no Canvas parity, harder deterministic testing); D3 transitions (DOM ownership conflicts with React); PixiJS/WebGL (unneeded below ~10k primitives).
- **Consequences:** More engine code owned by us, but total control over choreography, determinism and testability.

### ADR-006 — Universe renderer ⚗
- **Decision:** Custom SVG + `d3-zoom` with semantic zoom/LOD for the triangular map. React Flow (`@xyflow/react`) for the DS builder and Dependency Explorer.
- **Alternatives:** React Flow for the universe (its rectangular node model fights the triangular geometry); Canvas-only (worse accessibility).

### ADR-007 — Content-as-code
- **Decision:** `content/` in git: YAML metadata, Markdown with directives (remark-directive), Python reference code and tests. Compiled by `content-tools` into versioned, checksummed releases loaded into the DB.
- **Alternatives:** CMS/database-first authoring (weak review/versioning, hard to run code verification); MDX (mixes code into content).
- **Consequences:** Content changes need no app changes (NFR-08). A web authoring UI can be built later over the same schema.

### ADR-008 — Database
- **Decision:** SQLAlchemy 2 + Alembic; SQLite (WAL) locally; PostgreSQL in production; JSON columns with a JSONB variant; CI on both.
- **Consequences:** No DB-specific SQL outside repositories. The Postgres-only job queue (`SKIP LOCKED`) is used only by the Judge (cloud).

### ADR-009 — Mastery model
- **Decision:** Elo-style ability per learner × knowledge component; mastery requires KC ability + checkpoint with production and transfer items; unlocking at `proficient`; FSRS for spaced review.
- **Alternatives:** Completion-based mastery (violates the brief); BKT/IRT from day one (needs data to fit; can replace Elo later behind the same interface); SM-2 (older, weaker than FSRS).

### ADR-010 — XP ledger
- **Decision:** Append-only `xp_ledger` with unique idempotency keys. Totals are projections.
- **Consequences:** No double awards. Auditable. Rebuildable after rule changes.

### ADR-011 — No paid/AI dependencies in core
- **Decision:** All core learning functionality works offline without external services. Explanations are authored or template-generated. Free-text explanation is assessed via structured "explain-by-reasons" items.
- **Consequences:** An optional, pluggable local-model tutor may be considered later as a non-core add-on.

### ADR-012 — CodeMirror 6
- **Decision:** CodeMirror 6 for all code display/editing (precise line + range decorations for execution highlighting).
- **Alternatives:** Monaco (heavier, weaker on mobile, more complex decoration model for our needs).

### ADR-013 — Monorepo tooling
- **Decision:** pnpm workspaces (TS) + uv workspace (Python) in one repo, with a Makefile front door.

### ADR-014 — Pyramid geometry
- **Decision:** Tiles addressed by `(row, col)`. Even `col` = domain ▲, odd = bridge ▼. A bridge integrates its three geometric neighbours, which the validator enforces. The pyramid is a visual map, separate from the concept prerequisite DAG.
- **Consequences:** Islands are impossible by construction. The universe grows by appending tiers. Alternative learning paths are possible because unlocking uses the DAG.

### ADR-015 — Judge deferred
- **Decision:** Server-side execution only from Phase 8, in disposable locked-down containers (gVisor in production), as a separate service using the same tracer.

### ADR-016 — Trace-generated items
- **Decision:** Item templates generate parametrized questions whose answers are computed by running reference code under the tracer.
- **Consequences:** Unlimited practice, answers always correct, and spaced review uses fresh instances.

### ADR-017 — Trace schema source of truth
- **Decision:** JSON Schema in `packages/trace-schema`, generating TS types and Pydantic models. CI fails on stale generated code.

### ADR-018 — Hosted, guest learners first (revised 2026-11-18)
- **Context:** The owner wants AlgoVerse hosted as a web application (and installable as a PWA). The original single-user local mode would make every visitor share one learner's progress.
- **Decision:** Every browser gets an anonymous **guest learner** on its first request (random 256-bit session token, stored hashed; httpOnly `SameSite=Lax` cookie). There is no sign-up in the MVP. Email/password accounts arrive in Phases 8–10 and adopt the guest's progress. There is no separate "local mode": local development is a localhost-hosted instance.
- **Alternatives:** Single-user local mode (unsafe when hosted); accounts in the MVP (sign-up friction, more scope; owner chose "guest learners for now"); progress stored only in the browser (lost on clearing storage, no path to accounts).
- **Consequences:** Clearing cookies loses guest progress until accounts exist. Data export mitigates that. Guest rows need periodic cleanup (inactive > 180 days, Phase 10).
