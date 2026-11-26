# Design Lab: draw a system, get it marked

Part 1 of 3. Part 2 adds the legacy-integration and AI-systems modules (new boxes, lessons, case
studies, lab problems). Part 3 lets learners bring their own problem, with general automatic checks
and a "Review with AI" prompt to copy. Both get their own design docs.

## Intent

Case studies teach people to recognise good designs. The lab makes them produce one: read a brief,
drag boxes onto a canvas, connect them, press **Check my design**, get a score with a reason for
every point won or lost, then compare with a model answer animated in the same 3D view the lessons
use.

Muthu's goals: a hands-on, interview-style practice space; something that showcases building real
systems with AI; and a base for the AI/legacy content of parts 2 and 3.

## Goals

- `/systems/lab`: a list of problems. `/systems/lab/:problemId`: the editor for one problem.
- 10 problems at launch, each tied to lessons and to a case study the learner can read after.
- Marking by **properties of the design graph**, not by matching one layout, so different correct
  designs pass.
- A score out of 100, a pass/miss list with hints, and the best score remembered in this browser.
- Works with mouse, touch and keyboard; passes the existing axe checks.

## Non-goals

- No server, accounts or AI calls (the site is static on GitHub Pages).
- No free-form drawing (shapes, text boxes). Boxes come from the palette.
- Learners' own problems (part 3).

## Anti-goals

- Marking that fails a reasonable design because a box sits in a different place, or has a
  different label.
- An editor that only works with a mouse.
- A score that can be gamed by dropping every box on the canvas: checks must also penalise
  harmful structure where it matters (for example, two services sharing one database).

## Approaches considered

1. **Rule-based checks on the graph (chosen).** Each problem lists checks written with a small set
   of graph helpers (has a box, is connected, every path passes through, no shared database…).
   Deterministic, offline, free, unit-testable, explains every point.
2. **Compare with the model answer** (graph similarity). Penalises valid alternatives; hard to
   explain a score.
3. **AI marking.** Needs a server or the learner's own API key; not possible on a static site
   without exposing a key. Deferred to part 3 as a copy-a-prompt option.

## Design

### Data

```ts
type LinkMode = "sync" | "async"; // "waits for a reply" | "sends and moves on"
type DesignNode = { id: string; kind: NodeKind; role?: string; label: string; col: number; row: number };
type DesignLink = { from: string; to: string; mode: LinkMode };
type Design = { nodes: DesignNode[]; links: DesignLink[] };

type PaletteItem = { kind: NodeKind; role?: string; label: string; hint: string; max?: number };
type Check = { id: string; label: string; hint: string; points: number; pass: (d: Design) => boolean };
type LabProblem = {
  id: string; title: string; tagline: string; level: Level; minutes: number;
  brief: string[];           // the problem statement
  requirements: string[];    // what the design must handle
  palette: PaletteItem[];    // boxes offered; roles name problem-specific services
  checks: Check[];
  answer: Design;            // model answer
  explain: string[];         // why the model answer looks the way it does
  concepts: string[];        // lesson ids
  caseId?: string;           // related case study
};
```

- Grid: 12 columns × 8 rows. One box per cell.
- A link's direction is "who starts the conversation". Links into or out of a queue or stream
  default to `async`; others to `sync`. The learner can switch.
- Roles let a problem offer named services ("Orders service", "Notification worker") so checks
  can tell them apart. Generic boxes have no role.

### Graph helpers (`lab/rules.ts`)

A selector `{ kinds?: NodeKind[]; roles?: string[] }` matches nodes. Helpers:

- `count(d, sel)`, `has(d, sel, n = 1)`
- `linked(d, a, b, mode?)`: a direct link between a match of `a` and a match of `b`, either
  direction; with `mode`, only links of that mode.
- `linkedFrom(d, a, b, mode?)`: directed version.
- `reaches(d, a, b)`: an undirected path exists.
- `guarded(d, a, b, guard)`: `a` reaches `b` and every path from `a` to `b` passes a `guard`
  node (search from `a` that cannot enter guards must not reach `b`).
- `behind(d, sel, front, n)`: at least `n` matches of `sel`, each linked to a `front` node.
- `noSharedStore(d, owners, stores)`: no store is linked to two different owner nodes.
- `between(d, mid, a, b)`: some `mid` node is linked to both an `a` and a `b` node.

Groups: `CLIENTS = user, phone, browser`; `COMPUTE = server, service`; `STORES = db, storage,
search`; `MESSAGING = queue, stream`.

Every check must fail on an empty canvas (unit-tested), and every model answer scores 100.

### Score

`score = round(100 × passed points / total points)`. Bands: 90+ "Excellent", 70+ "Solid", 40+
"Getting there", below "Keep going". The best score and the current draft are kept in
localStorage under `algoverse.lab.v1` (wrapped in try/catch); `markDone("lab:<id>")` on a score of
70 or more.

### Editor screen

```
┌ Brief ───────────────────────────────────────────────┐
│ title · tagline · requirements · lessons it uses     │
├ Palette ┬ Canvas (12×8 grid) ──────────┬ Inspector ──┤
│ [+ Users]│  ▢ Users ──▶ ▢ LB ──▶ ▢ App  │ Label [___] │
│ [+ LB]   │                 ╲            │ Connect to ▾│
│ [+ App]  │                  ▢ Cache     │ [Connect]   │
│ …        │                              │ [Delete]    │
├──────────┴──────────────────────────────┴─────────────┤
│ Connections list (text) · [Check my design] [Reset]   │
├ Result: 80/100 Solid · ✓/✗ per check with hints ──────┤
│ [Show model answer] → your design and the answer in 3D│
└───────────────────────────────────────────────────────┘
```

- **Add:** click a palette item (goes to the first free cell) or drag it onto a cell
  (pointer events, so touch works).
- **Move:** drag a box, or focus it and use the arrow keys.
- **Select:** click or Enter/Space. The inspector shows the label field, a "Connect to" list of
  the other boxes and a Connect button, and Delete.
- **Connect with the mouse:** with a box selected, press **C** or the "Connect" toggle, then click
  the target.
- **Links:** drawn in an SVG layer (decorative); the accessible source is the connections list
  under the canvas, where each link has a mode switch and a remove button.
- On narrow screens the canvas scrolls inside its own frame; the page never scrolls sideways.
- **Show model answer** reveals `explain` and renders both designs with `IsoScene` (converted by
  `toScene(design)`: sync links → request + response flows, async links → event flow).

### Problems at launch

| id | Problem | Core checks |
|---|---|---|
| link-shortener | Link shortener | LB with ≥2 servers; cache between servers and DB; click events async via queue/stream |
| results-day | Exam results day | CDN for clients; LB with ≥2 servers; cache; DB reached only through servers |
| photo-uploads | Photo uploads | uploads to storage; resize worker triggered async; CDN serves storage; metadata DB |
| order-notifications | Order notifications | orders service publishes to a queue/stream; notifier consumes; orders never waits on notifier |
| live-scores | Live scores | clients connect to a realtime gateway; scorer publishes to a stream the gateways read; CDN for pages |
| secure-sign-in | Sign-in for an app | clients reach data only through the gateway; auth service with its own store; monitor |
| order-saga | Checkout across services | orders, payments, stock each own their DB (no sharing); coordination async; clients via gateway |
| job-search | Search that stays in sync | jobs DB; change events to a stream; indexer writes the search index; search reads the index |
| public-api | A public API | gateway in front of services; rate-limit counters in a cache; ≥2 servers; monitor |
| chat | Group chat | realtime gateways; pub/sub between gateways; message DB; presence cache; offline push via queue |

### Where it appears

- A "Design Lab" card on `/systems` after the weekly challenge, linking to `/systems/lab`.
- The problem page links to the related lessons and case study.
- New strings in `en.json` under `lab.*`; problem content lives in TypeScript like the lessons.

## Left to the builder

Exact palette per problem, check wording, cell sizes and colours (reuse `KIND_HUE` and the
lesson icons), and the 3D coordinate mapping.
