# AlgoVerse — UI/UX Design & Screen Specifications

> Deliverable 8. Design language, app shell, screen-by-screen specifications with wireframes, interaction patterns and accessibility.

---

## 1. Design language

**Feel:** a calm, precise *laboratory*: an IDE's clarity, a knowledge map's sense of exploration, and a game's sense of progress. The visualization stage is always the hero.

| Aspect | Specification |
|---|---|
| Typography | **Inter** (UI, variable font), **JetBrains Mono** (code, values, indices), **KaTeX** for math. Both fonts OFL and self-hosted. Scale: 12 / 14 / 16 (base) / 20 / 24 / 32 / 40 |
| Spacing | 4 px grid; generous whitespace around the stage |
| Shape | 8 px radius for panels, 6 px for controls; triangles reserved as the brand motif (universe, progress glyphs) |
| Colour (UI) | Neutral slate surfaces; one brand accent (indigo `#5b6cff`); tier colours (gold, teal, blue, violet, orange, grey) used **only** for curriculum identity |
| Colour (viz tokens) | `active` blue · `compare` amber · `swap` rose · `write` orange · `sorted` green · `visited` violet · `frontier` cyan · `path` gold · `muted` grey · `error` red. Each token also has a **pattern/glyph** (dashed outline, ✓, dot, double-arrow) so meaning never relies on colour alone. Palettes validated for deuteranopia/protanopia/tritanopia and ≥ 3:1 non-text contrast |
| Themes | Light, Dark (default follows OS), High-contrast. All defined as CSS variable token sets |
| Motion | Purposeful only. UI transitions 150–250 ms ease-out. Viz timing per [VISUALIZATION_ENGINE §8](VISUALIZATION_ENGINE.md#8-animator-and-renderers). `prefers-reduced-motion` honoured everywhere |
| Iconography | Lucide icons (ISC) + custom triangle glyphs for tiles/bridges |
| Voice | Friendly, precise, never condescending. Errors explain and suggest |

---

## 2. App shell

```text
┌───┬───────────────────────────────────────────────────────────────────────────────┐
│ ▲ │  Search concepts, algorithms…  (Ctrl K)          🔥 6   ⚡ 1,240 XP  Lv 7   ☾  👤 │
├───┼───────────────────────────────────────────────────────────────────────────────┤
│ ⌂ │                                                                               │
│ ✦ │                                                                               │
│ ☰ │                         ( active screen )                                     │
│ ⚗ │                                                                               │
│ ⛬ │                                                                               │
│ ⌨ │                                                                               │
│ ? │                                                                               │
│ ⚒ │                                                                               │
│ ◔ │                                                                               │
│ 📚│                                                                               │
└───┴───────────────────────────────────────────────────────────────────────────────┘
```

Left nav rail (collapsible, labels on hover/expanded), in order: **Dashboard · Learning Universe · Curriculum · Algorithm Lab · Data Structure Lab · Python Playground · Problem Solving · Real-World Projects · My Progress · Knowledge Library**. Settings is under the avatar menu.

Global: command palette (`Ctrl/⌘ K`) to jump to any concept, problem or screen; toasts for XP/badges (batched, never blocking); offline indicator.

---

## 3. Screen specifications

### 3.1 Dashboard

```text
┌──────────────────────────────── Good evening, Learner ─────────────────────────────────┐
│ ┌─ Continue learning ─────────────────────┐ ┌─ Your pyramid ─────────────┐ ┌ Today ──┐  │
│ │ Binary Search · section E (step 14/31)  │ │        ▲                   │ │ Goal    │  │
│ │ ████████░░░░ 62%     [ Resume ▶ ]       │ │       ▲▼▲  Pyramid I 71%  │ │ 40/50XP │  │
│ └─────────────────────────────────────────┘ │      (mini-map, click)    │ │ 🔥 6 days│  │
│ ┌─ Recommended next ──────────────────────┐ └───────────────────────────┘ └─────────┘  │
│ │ ① Review: Linear Search (due today)     │ ┌─ Daily challenge ─────────────────────┐  │
│ │ ② Insertion Sort  — unlocks 3 concepts  │ │ 🐞 Debugging: find the off-by-one     │  │
│ │ ③ Refresher: integer division (why: …)  │ │ in this binary search  · 15 min · +60 │  │
│ └─────────────────────────────────────────┘ └───────────────────────────────────────┘  │
│ ┌─ Skill mastery (radar) ─┐ ┌─ Recent ──────────────┐ ┌─ Achievements / milestones ──┐  │
│ │   Arrays ●●●●○          │ │ Bubble Sort ✓          │ │ 🏅 First Trace  🏅 Predictor │  │
│ │   Searching ●●●○○       │ │ Logarithms ✓           │ │ Next: Pyramid I (4 left)    │  │
│ └─────────────────────────┘ └────────────────────────┘ └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Each "Recommended" item shows **why** it is recommended (transparency builds trust).

### 3.2 My Learning Universe
Full-bleed canvas (see [PYRAMID_MODEL](PYRAMID_MODEL.md)). Overlay controls: zoom ±, fit, minimap (bottom-right), layer toggles (prerequisites, recommended path, review due), legend, list-view toggle (accessible alternative). Side drawer on selection: tile or concept card with *Start/Continue*, prerequisites ✓/✗, unlocks, and *Open in Dependency Explorer*.

### 3.3 Curriculum
Hierarchical browser: Tier → Tile → Module → Concept. Shows maturity labels (E/R/X), estimated time, status, and filters (thread, kind, status, maturity). It is the linear, scannable counterpart of the Universe.

### 3.4 Lesson Player (the most important screen)

```text
┌ ◀ First Algorithms ▸ Binary Search          A  B  C  D [E] F  G  H  I  J  K  L   ⓘ  ⛶ ┐
├───────────────────────────────────────────────┬─╫─┬────────────────────────────────────┤
│                                               │ ║ │ ┌Code┬Inspector┬Call stack┬Output┐ │
│           VISUALIZATION STAGE                  │ ║ │ │ 3   while lo <= hi:            │ │
│   (array / tree / graph / … from the engine)  │ ║ │ │▶4       mid = (lo + hi) // 2   │ │
│                                               │ ║ │ │ 5       if arr[mid] == target: │ │
│                                               │ ║ │ └───────────────────────────────┘ │
│                                               │ ║ │ ┌ Inspector (pinned) ───────────┐ │
│                                               │ ║ │ │ lo 0 · hi 8 · mid 4 ◆ new     │ │
│                                               │ ║ │ └───────────────────────────────┘ │
├───────────────────────────────────────────────┴─╨─┴────────────────────────────────────┤
│ 💬 arr[mid]=16 < target=23 → discard the left half                    [ log ▾ ]         │
│ ⏮  ◀  ▶ Play  ▶  ⏭   ━━━━━━━●━━━━━━━━  14/31   1×▾   granularity: line ▾   🔁  ✎ input │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Resizable split** (drag handle `║`), default 58/42. Layout presets: *Balanced*, *Stage focus* (code collapses to a strip), *Code focus*, *Presenter* (larger fonts, hides chrome). Remembered per learner.
- Right panel tabs: **Code** (always visible on wide screens) · **Inspector** · **Call stack** · **Output** · **Notes**. Inspector can be pinned under the code.
- Non-E sections render as a centred reading column (max 72 ch) with embedded widgets. The stage expands only where needed.
- **Prediction gate:** a card slides over the stage ("What will `mid` be next?"), with the answer chosen by clicking a cell directly on the visualization when possible (direct manipulation beats MCQ).
- **Experiment (I):** the input chip opens an editor with presets and custom values. The code panel switches to editable mode with a *Reset to reference* button.

### 3.5 Algorithm Laboratory
Tabs: **Explore** (pick any algorithm → full player with free inputs) · **Battle Arena** · **Time Machine** · **Reverse Engineering**.

```text
Battle Arena (numbers illustrative)
┌ Dataset: n=64  distribution: nearly sorted ▾  seed 42 🎲 ──────────────── [ Run battle ] ┐
│ ┌ Bubble ─────────┐ ┌ Insertion ──────┐ ┌ Merge ──────────┐                              │
│ │ ▁▂▃▅▆▇ (live)   │ │ ▁▂▃▅▆▇ (live)   │ │ ▁▂▃▅▆▇ (live)   │   synced playback by step    │
│ │ cmp 1,912 sw 77 │ │ cmp 139  mv 77  │ │ cmp 321 wr 384  │                              │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                              │
│ Growth: comparisons vs n (log-log) ── measured ● theory ┄ (labelled)                     │
│ Why did Insertion win here? → nearly sorted input ⇒ few inversions ⇒ O(n + inversions)   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Time Machine: a full-width scrub timeline with an op-density sparkline, bookmarks, a query bar ("go to next step where `arr[3]` changes"), and a split before/after view.

### 3.6 Data Structure Laboratory
Canvas (React Flow) + palette (node, pointer, bucket) + operations panel (insert/delete/search/traverse) + live **Python view** (generated constructor code, editable for round-trip) + invariant checker banner.

### 3.7 Python Playground

```text
┌ examples ▾  untitled.py ●   [▶ Run] [◉ Visualize] [🐞 Debug] [✓ Test] [⇆ Compare]   seed 42 ┐
├───────────────── editor (CodeMirror) ────────────┬──── visualization (Auto View) ──────────┤
│                                                   │                                         │
├───────────────── inputs / tests ─────────────────┼──── console / inspector / perf ─────────┤
└───────────────────────────────────────────────────┴─────────────────────────────────────────┘
```

### 3.8 Problem Solving
Catalog with facets (concept, structure, paradigm, pattern, difficulty, application, status). Problem page: statement · examples · constraints | editor · tests. Hints panel reveals one hint at a time. Approaches & solution are locked until the reveal policy is met. **Pattern Trainer** mode: statement only → pick a pattern → justify → feedback.

### 3.9 Real-World Projects
Project overview (architecture diagram, DS/algorithm map, milestones) → milestone workspace (instructions, starter code, tests, visualization of the system's core structure) → performance exploration.

### 3.10 My Progress
Mastery by tile (pyramid heat map), concept table (state, mastery, last review, next review), XP history, streak calendar heat map, badges wall, misconception history ("you used to struggle with X, now fixed ✓"), and export.

### 3.11 Knowledge Library
Search-first reference: concept pages (condensed lesson: definition, complexity table, code, applications), complexity cheat-sheets, glossary, references/bibliography, and the **Dependency Explorer** (layered prerequisite graph, path-from-my-knowledge highlight, alternative routes).

### 3.12 Settings
Theme, motion, default playback speed and granularity, daily goal, keyboard shortcuts, accessibility (high-contrast, larger code font, narration verbosity), data (export/import/delete), mode (local/cloud).

---

## 4. Responsive behaviour

| Width | Layout |
|---|---|
| ≥ 1280 px (desktop, primary) | Nav rail + full split lesson player |
| 768–1279 px (tablet) | Nav collapses to icons; lesson player stacks: stage on top (60% height), tabbed code/inspector below |
| < 768 px (phone) | Bottom tab bar; lesson player shows one panel at a time (Stage / Code / State) with swipe; playback bar stays fixed. Coding exercises allowed but optimized for reading/watching/predicting. Universe uses list view by default with map optional |

---

## 5. Keyboard shortcuts

| Action | Keys |
|---|---|
| Play / pause | `Space` |
| Next / previous step | `→` / `←` |
| Next / previous at coarser granularity | `Shift+→` / `Shift+←` |
| Jump to start / end | `Home` / `End` |
| Speed down / up | `[` / `]` |
| Toggle granularity | `G` |
| Focus code / stage / inspector | `Alt+1/2/3` |
| Run / Visualize (Playground) | `Ctrl+Enter` / `Ctrl+Shift+Enter` |
| Command palette | `Ctrl/⌘+K` |
| Toggle theme | `Ctrl+Alt+T` |
| Universe: move between adjacent tiles | Arrow keys (adjacency-aware); `Enter` open; `Esc` back out a zoom level |

All interactive elements are reachable by `Tab` with a visible focus ring. Shortcuts are listed via `?`.

---

## 6. Accessibility checklist (WCAG 2.2 AA)
- Narration (`aria-live`) for every animation step. A textual state summary is available on demand (`S`).
- Visualization elements have accessible names (e.g. "index 3, value 12, compared").
- Colour plus pattern plus text for every state. Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI and graphics.
- No time limits on learning activities (challenges with timers offer untimed practice).
- Drag-and-drop activities have keyboard equivalents (pick up with `Space`, move with arrows, drop with `Space`).
- Focus is never trapped. Dialogs follow Radix accessibility patterns.
- Captions/alt text are required for illustrations (enforced by content validation).

---

## 7. Progressive disclosure rules
1. Show the minimum state needed: the inspector lists spec-declared watches first, and "show all locals" is one click away.
2. Advanced notes (`:::advanced`) render collapsed with a one-line teaser.
3. Complexity: show the Big-O badge first, with the case breakdown and proof sketch on expand.
4. New UI capabilities are introduced contextually the first time they are useful (coach marks, max one per session, dismissible).
