# Spike S5: Animation performance of the custom tween approach

## Question

Can AlgoVerse's own small tween engine (rAF-driven, shared by both renderers) animate 200 consecutive random swaps of 300 SVG bars at 60 fps, and of 5,000 Canvas 2D bars at a frame rate that meets NFR-02?

## Pass condition

Meets NFR-02

NFR-02 (`docs/PRD.md`): "60 fps animation for <= 300 array elements (SVG). Canvas renderer for <= 10k elements". Brief for this spike: 60 fps with <= 300 SVG elements; Canvas renderer handles 5k bars at >= 45 fps.

## Setup

- Machine: the owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Display refresh rate **60 Hz** (read from Windows, `Win32_VideoController.CurrentRefreshRate`, and confirmed by an in-page idle rAF probe of 60 Hz in Chromium and Firefox). So the 60 fps criterion and "fps against the refresh rate" coincide. Power state: **desktop, no battery detected, on AC**. The battery case is not applicable (ruling R6).
- Browsers (Playwright builds, **headed**, `headless: false`; headless rAF timing is not representative): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2. Chromium was launched with `--disable-backgrounding-occluded-windows` so an occluded window is not throttled. All three ran; none untested. **The Playwright WebKit build on Windows is not Safari.** Treat its numbers as "a WebKit engine on Windows", not as evidence about Safari or iOS.
- Docker row: Chromium 159.0.8154.6 **headless** in `mcr.microsoft.com/playwright:v1.65.1-noble` with `--cpus=0.5` (cgroup `cpu.max` 50000 100000, confirmed), Linux 6.18 (WSL2), Node v26.13.1 inside the container.
- Versions: Vite 8.3.8, Node v22.23.4 (host), Playwright 1.65.1, no other libraries, no Pyodide. Recorded programmatically in `docs/spikes/data/s5-results.json`. Production build only, served by `serve-prod.mjs`.

## Method

`spikes/s5-animation/`:

- `tween.ts`: `animate(from: Attrs[], to: Attrs[], durationMs, onFrame): Promise<void>` with `Attrs = { id, x, y, h }`. Matches by `id`, linear interpolation with a cubic ease-out (`1 - (1 - t)^3`), driven by `requestAnimationFrame`; the last frame is exactly `to`, then the promise resolves. `tween.check.ts` (`node s5-animation/tween.check.ts` from `spikes/`) checks it with a fake rAF clock: ease-out shape, matching by id rather than index, endpoints, eased mid-frame, resolution, no further rAF after completion (8 checks, pass).
- `svgBars.ts`: 300 `<rect>` bars, one rect per bar; per frame only the rects named in the tween output are updated (attribute writes). `canvasBars.ts`: 5,000 bars on a 1600 x 400 Canvas 2D; per frame the state map is updated and the **whole canvas is cleared and all 5,000 bars are redrawn** (`fillRect`), as a straightforward scene renderer would.
- `main.ts`: seeded RNG (mulberry32, **seed 20261118**); bar heights random; **200 consecutive random swaps** (two distinct positions per swap, the two bars exchange x), each `animate`d for 450 ms at 1x or 56.25 ms at 8x (`450 / speed`), awaited in sequence. A rAF counter runs for the whole run and records the frame-to-frame intervals.
- Metrics per run: **average fps** (frames / elapsed), **5th-percentile fps** (1000 / the 95th-percentile frame interval), **dropped frames** (intervals > 1.5 x 16.67 ms = 25 ms; also counted against the measured refresh), worst frame interval.
- `measure.mjs` (from `spikes/`: `node s5-animation/measure.mjs --out ../docs/spikes/data/s5-results.json`): production build, for each browser four cells (SVG-300 and Canvas-5k, each at 1x and 8x), **5 fresh-page runs per cell**, median/min/max over the 5 runs. Then the Docker row, SVG-300 and Canvas-5k at 1x and 8x, 5 runs each.
- Assertions per run (480 total, `ASSERTIONS OK`, fail loudly): no exception inside the run and no page error or console error; **every tween promise resolved** (200 of 200); **the rendered bar order equals the result of applying the same 200 swaps to the model array** (SVG: read back from the DOM `x` attributes; Canvas: from the last drawn state); element count is at least the bar count; frame count is plausible.
- **Stalled runs.** Five attempts stalled (no completion within 174 s for a run that takes about 93 s): two in my first attempt at the full run (SVG-300 1x, Chromium) and, in the final run, one Chromium and two Firefox attempts, in each case the first attempt of a **1x cell** (Canvas-5k 1x in the final run). The harness logs a timeout, records it in `stalls` in the JSON, and retries (up to 2 times); the retry then completed normally every time, and WebKit and Docker had none. I did **not** find the cause. The page was `visible` and focused when I inspected one stuck run, and an identical standalone run completed in 93 s, so a rAF that stopped being delivered to a headed window (display power management or session state on a shared desktop are the candidates) is my guess, not a finding. These attempts are excluded from the statistics and are not in the frame data; the numbers below are only runs that completed all 200 swaps with all assertions passing. Treat "headed window can stop receiving rAF on this desktop" as a measurement hazard.

## Results

Each cell: median / min / max of 5 runs, 200 swaps, 60 Hz display. "Dropped" = intervals > 25 ms in the 200-swap run (about 12,000 frames at 1x, about 2,000 at 8x).

**Desktop, headed**

| Browser | Cell | Avg fps | 5th-pct fps | Dropped frames | Worst frame (ms) |
|---|---|---|---|---|---|
| Chromium 159 | SVG-300, 1x | 59.98 / 59.97 / 59.98 | 59.79 / 59.68 / 59.83 | 0 / 0 / 1 | 17.4 / 16.9 / 37.5 |
| Chromium 159 | SVG-300, 8x | 59.98 / 59.98 / 59.98 | 59.77 / 59.70 / 59.83 | 0 / 0 / 0 | 16.8 / 16.8 / 17.5 |
| Chromium 159 | Canvas-5k, 1x | 59.98 / 59.96 / 59.98 | 59.79 / 59.77 / 59.81 | 0 / 0 / 2 | 17.5 / 16.9 / 43.6 |
| Chromium 159 | Canvas-5k, 8x | 59.98 / 59.98 / 59.98 | 59.79 / 59.77 / 59.84 | 0 / 0 / 0 | 16.9 / 16.8 / 17.7 |
| Firefox 159 | SVG-300, 1x | 59.98 / 59.98 / 59.98 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 20.7 / 20.7 / 20.7 |
| Firefox 159 | SVG-300, 8x | 59.98 / 59.97 / 59.98 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 18.7 / 18.7 / 20.7 |
| Firefox 159 | Canvas-5k, 1x | 59.98 / 59.98 / 59.98 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 20.8 / 20.7 / 20.9 |
| Firefox 159 | Canvas-5k, 8x | 59.98 / 59.97 / 59.98 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 18.8 / 18.7 / 20.8 |
| WebKit 27.2 (Playwright, Windows) | SVG-300, 1x | 65.17 / 45.01 / 65.29 | 61.96 / 32.85 / 62.11 | 12 / 6 / 1966 | 30.8 / 30.3 / 155.4 |
| WebKit 27.2 | SVG-300, 8x | 65.12 / 62.19 / 65.29 | 62.03 / 60.10 / 62.27 | 3 / 2 / 44 | 30.6 / 29.8 / 154.4 |
| WebKit 27.2 | Canvas-5k, 1x | 30.08 / 25.13 / 30.55 | 16.83 / 16.40 / 20.33 | 2013 / 1962 / 2791 | 116.6 / 60.3 / 171.4 |
| WebKit 27.2 | Canvas-5k, 8x | 24.03 / 22.98 / 25.33 | 18.12 / 17.42 / 18.44 | 592 / 584 / 594 | 62.0 / 58.2 / 114.3 |

WebKit's idle rAF probe read about 62.4 Hz (not 60), which is why its SVG average is above 60; its per-frame cadence is irregular (worst frames about 30 ms even when most runs are clean), and one SVG 1x run fell to 45 fps average with 1,966 dropped frames.

**Docker, Chromium headless, `--cpus=0.5`** (SVG-300 and Canvas-5k, 5 runs each): average 60 fps, 5th percentile 59.99 fps, 0 dropped frames, worst frame 16.67 ms in every run, in all four cells. **This row is not informative about drawing cost.** Headless rAF is scheduled at an exact 16.67 ms cadence regardless of how long the frame took to paint, so a CPU quota does not show up as dropped frames the way a slow display would. All it shows is that the page ran correctly and to completion under 0.5 CPU (wall time 96.7 s vs 93.4 s on the desktop, about 3.5% slower). It is a rough lower-end indicator only, and I do not rely on it.

Notes on what the numbers do and do not show:

- At 8x a swap lasts 56.25 ms, which is 4 frames at 60 Hz (66.7 ms), so 200 swaps take 16.7 s rather than 11.25 s. The tween progresses in whole frames; this is expected, not a regression.
- fps is capped by the 60 Hz display, so a clean 60 means "kept up", not "had headroom". I did not record per-frame script time, so I cannot say how much of the 16.7 ms budget the work used.
- Only two bars move per swap. SVG updates only those two rects per frame. Canvas redraws all 5,000 every frame. A scene with many simultaneously moving elements (a whole-array shuffle, a tree layout change) is **not** measured here.
- Frame-time figures in the 20 ms range for Firefox (worst frame 18.7 to 20.9 ms in every cell, including the SVG rows) look like a Firefox rAF timestamp quantum on this display, not a rendering cost.

## Verdict

**PASS WITH CHANGES.**

- **Chromium and Firefox, desktop headed: PASS.** SVG-300 holds 60 fps (average 59.98, 5th percentile at least 59.68, 0 dropped frames in the medians, a maximum of 2 dropped frames in any single run) at 1x and 8x, and Canvas-5k meets the brief's 45 fps bar at the full 60 fps by a wide margin, in both browsers. Every tween resolved, and the rendered order matched the model after all 200 swaps in every run.
- **WebKit (Playwright build on Windows): Canvas-5k FAILS the 45 fps bar** (median about 30 fps at 1x and about 24 fps at 8x, 5th percentile about 17 to 18 fps), and SVG-300 is clean at the median but can degrade (one run at 45 fps). This is a non-Safari port, so it is a warning and not a verdict on Safari. It does show that the "redraw everything every frame" Canvas renderer, which is fine in Chromium and Firefox, is not safe on every engine.
- The Docker `--cpus=0.5` row is uninformative about frame cost (see Results) and does not affect the verdict.

The "changes": (1) design the Canvas renderer from the start so it does not repaint all bars every frame (static layer for unchanged bars, redraw only the moving bars' dirty rectangles); this is a recommendation I have **not** measured; (2) the Canvas criterion must be re-checked on real Safari (macOS and iOS) before we depend on it.

## Consequences for ADRs

- **ADR-005 (custom tween engine, SVG default, Canvas 2D for large inputs): confirmed** for Chromium and Firefox: a 30-line rAF tween driving both renderers meets NFR-02 on the desktop machine, with no Framer Motion or animation library in the hot path. The one revision: state in the ADR (and `docs/VISUALIZATION_ENGINE.md` section 8.3) that the Canvas renderer must be written with dirty-rect or layered redraw, not full redraw per frame, because the full-redraw version missed the criterion on the WebKit engine.
- ADR-003, ADR-004, ADR-006: not affected by this spike.

## Follow-ups

- Re-run `spikes/s5-animation` (the page is a static build) on a real Mac with Safari, and on an iOS device if practical, for both cells. This is the main open risk. Add a dirty-rect variant of `canvasBars.ts` and compare it on Playwright WebKit as a cheap proxy first.
- Not measured: low-end hardware (the Docker row cannot stand in for it), high-refresh displays, many simultaneously moving elements, text labels in bars, and per-frame script time. A real mid-range laptop on battery should be tried when one is available; battery vs AC was not applicable on this desktop (ruling R6).
- Investigate the headed-window rAF stalls (5 stalled attempts, see Method) before relying on headed automation for later spikes; running the harness while the desktop is idle and the display awake is the first thing to check.
- Reduced-motion behaviour is out of scope for this spike (ruling) and is not tested.
- Frame data per run is in `docs/spikes/data/s5-results.json`. The page and harness are throwaway code under `spikes/s5-animation/`.
