# Spike S6: Universe geometry rendering with semantic zoom

## Question

Can the triangular Learning Universe map (81 pyramid tiles plus 800 concept nodes, SVG, `d3-zoom`, semantic level of detail) pan and zoom at 60 fps?

## Pass condition

60 fps pan/zoom

(`docs/ROADMAP.md`, M2.0 De-risking spikes, row S6 "Universe geometry": "Triangular SVG map with d3-zoom + LOD, 81 tiles + 800 nodes".)

## Setup

- Machine: the owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Display refresh **60 Hz** (read from Windows and confirmed by an in-page idle rAF probe: 60 Hz in Chromium and Firefox, 62.4 Hz in WebKit). Power: **desktop, no battery detected, on AC** (battery case not applicable, ruling R6).
- Automation: automated via Playwright on owner's laptop (ruling R5 wording); in fact the runs were on the owner's desktop described above, not a laptop.
- Browsers (Playwright builds, **headed**): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2. All three ran; none untested. **The Playwright WebKit build on Windows is not Safari.**
- Versions: Vite 8.3.8, d3-zoom 3.0.1, d3-selection 3.0.1, Playwright 1.65.1, Node v22.23.4. Recorded in `docs/spikes/data/s6-results.json`. Production build only, served by `serve-prod.mjs` on port 4177.

## Method

`spikes/s6-universe/`:

- `geometry.ts`: pure port of PYRAMID_MODEL section 2 (vertex formulas for upright and inverted tiles, adjacency table). `geometry.check.ts` (`node s6-universe/geometry.check.ts` from `spikes/`) asserts 857 checks: 81 tiles through row 8; row r has 2r+1 tiles; even col = domain, odd col = bridge (45 domains, 36 bridges); for every tile the rule neighbours exist, share exactly two vertices with it, and equal the set found by brute-force geometric edge sharing; adjacency is symmetric. All pass.
- `main.ts`: a 1280 x 800 SVG, side length S = 90. 81 `<polygon>` tiles (plus 81 tile id texts) always rendered. 800 synthetic concepts (seed 20261118, 10 per tile over the first 80 tiles, random points pulled toward the tile centroid). `d3-zoom`, scale extent [1, 8]. **LOD:** concept `<circle>`s are mounted (all 800) when k >= 2.5 and removed below; concept `<text>` labels (all 800) mounted when k >= 4 and removed below. There is no viewport culling, so this is the worst case for the mounted set.
- Driving: inside the page, one rAF loop that both counts frames and drives the interaction, so every frame interval includes the cost of the zoom event, DOM mutation, style, layout and paint.
  - (a) **Zoom:** real `WheelEvent`s dispatched on the svg at the viewport centre, delta computed each frame so k follows 8^p, p a triangle wave 0 -> 1 -> 0; 2 cycles in 16 s (so 1 -> 8 -> 1 takes 8 s). It crosses both LOD thresholds four times.
  - (b) **Pan:** transform set to k = 3, then `mousedown` / `mousemove` / `mouseup` events on the svg and window, dragging on a 220 px radius circle (2.5 s per loop) for 12 s. At k = 3 the 800 circles are mounted and no labels.
  - These are synthetic DOM events through d3-zoom's own handlers, not OS-level input, so input latency is not measured.
- Metrics per run: average fps, 5th-percentile fps (1000 / 95th-percentile interval), dropped frames (interval > 25 ms; also counted against the measured refresh, identical here), worst frame. 5 fresh-page runs per cell, median/min/max.
- Rows: Chromium, Firefox, WebKit headed; plus headed Chromium with CDP `Emulation.setCPUThrottlingRate` 4x, labelled **mid-range-laptop approximation (main-thread only)**. No Docker row (ruling R9).
- Assertions per run (360 total, `ASSERTIONS OK`): no in-run exception or page/console error; 81 tiles at every sample; every 5th frame the DOM is counted and must show circles == 800 if k >= 2.5 else 0, and labels == 800 if k >= 4 else 0 (all three LOD bands were sampled in every zoom run); zoom reached k >= 7.5 and returned to <= 1.05; pan stayed at k = 3 with 800 circles and 0 labels. No stalled attempts occurred.

## Results

Median / min / max of 5 runs, 60 Hz display. Zoom run = about 960 frames, pan run = about 720 frames.

| Row | Scenario | Avg fps | 5th-pct fps | Dropped frames | Worst frame (ms) |
|---|---|---|---|---|---|
| Chromium 159 | Zoom 1-8-1 | 59.98 / 38.81 / 59.98 | 59.84 / 59.83 / 59.86 | 0 / 0 / 6 | 16.9 / 16.8 / 1000.4 |
| Chromium 159 | Pan at k=3 | 59.98 / 59.98 / 59.98 | 59.84 / 59.83 / 59.88 | 0 / 0 / 0 | 16.9 / 16.8 / 17.1 |
| Firefox 159 | Zoom 1-8-1 | 59.98 / 59.98 / 59.99 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 18.7 / 18.7 / 20.7 |
| Firefox 159 | Pan at k=3 | 59.98 / 59.97 / 59.98 | 59.95 / 59.95 / 59.95 | 0 / 0 / 0 | 18.7 / 18.7 / 20.7 |
| WebKit 27.2 (Playwright, Windows) | Zoom 1-8-1 | 63.65 / 63.36 / 63.72 | 61.80 / 61.43 / 61.88 | 4 / 3 / 5 | 40.1 / 39.5 / 41.2 |
| WebKit 27.2 | Pan at k=3 | 64.21 / 64.16 / 64.29 | 61.96 / 61.96 / 62.03 | 0 / 0 / 0 | 16.6 / 16.5 / 17.0 |
| Chromium 159, CDP 4x (mid-range-laptop approximation (main-thread only)) | Zoom 1-8-1 | 47.16 / 45.66 / 49.35 | 19.99 / 19.98 / 29.97 | 118 / 98 / 142 | 83.4 / 50.1 / 83.4 |
| Chromium 159, CDP 4x | Pan at k=3 | 59.98 / 59.98 / 59.98 | 59.86 / 59.77 / 59.88 | 0 / 0 / 0 | 16.8 / 16.8 / 17.3 |

Notes:

- Chromium zoom, one of five runs: a single 1,000 ms frame (average 38.81 fps, 6 dropped). It is a one-off stall of the frame loop of the kind seen in S5 (headed window not receiving rAF), not a repeatable cost: the other four runs had worst frames 17 to 19 ms. It is included in the min/max, and the median is unaffected. I did not establish the cause.
- WebKit averages above 60 because its display cadence is about 62.4 Hz; its zoom runs show about 40 ms worst frames (4 dropped) reproducibly, probably at LOD mount/unmount, which I did not confirm.
- **At 4x main-thread throttling, zoom does not hold 60 fps** (average 47 fps, 5th percentile 20 fps, about 118 dropped of about 750 frames), while pan at k=3 still holds 60. Pan with 800 circles mounted is cheap; the zoom sweep, which mounts and unmounts 800 circles and 800 text labels and renders up to 800 labels at k >= 4, is the costly case. I did not isolate whether the cost is the mount/unmount at the thresholds or the steady-state cost of 800 labels at high k. Main-thread-only throttling, Chromium only, 4x of a 5950X; indicative, not a laptop measurement.
- Frame times of about 18.7 ms in Firefox look like a timestamp quantum on this display, as in S5.

## Verdict

**PASS WITH CHANGES.**

On the owner's fast desktop, Chromium and Firefox hold 60 fps (median avg 59.98, 5th percentile >= 59.84, 0 dropped in the medians) for both wheel zoom 1 -> 8 -> 1 and drag pan at k = 3 with 81 tiles and 800 nodes, so the pass condition is met there. WebKit (not Safari) also holds the frame rate on pan and has a few 40 ms frames on zoom. The "changes": the 4x CPU-throttled Chromium row misses 60 fps on the zoom sweep (47 fps average), so the real Universe screen should not mount all 800 circles and 800 labels at once. Cull concepts and labels to the viewport (and/or per tile), and consider batching or deferring the mount at LOD thresholds. This is a recommendation I have **not** measured.

**The desktop rows (Chromium and Firefox) decide this verdict; the 4x row is only an indicator, and it is not laptop-ready evidence. 4x zoom (47 fps average, 5th percentile 20 fps) fails the literal "60 fps" criterion, and it stays a failure until a re-measure with viewport culling at 4x shows otherwise (the culling fix is unmeasured).** PASS here means "passes on a fast desktop", not "ready for laptops".

LOD thresholds are also checked at the boundaries by `spikes/s6-universe/lod.check.mjs` (hardcoded 2.5 and 4, k = 2.4999, 2.5, 3.9999, 4 up and down, in Chromium and Firefox; 72 checks pass), independent of the constants in the app.

Scope: one fast machine, 60 Hz, synthetic events (no input latency), main-thread-only throttling in Chromium, a Playwright WebKit that is not Safari, synthetic concepts without edges, no curved overlay links on focus, no tile text beyond ids.

## Consequences for ADRs

No ADR edited. Nothing here contradicts the SVG + `d3-zoom` choice for the map on desktop-class hardware. Any ADR or design text on the Universe screen should state that concept circles and labels are mounted only above the LOD thresholds **and culled to the viewport**, because the unculled version degrades under CPU throttling.

## Follow-ups

- Re-measure the Universe with viewport culling of concepts and labels, at 4x throttling, and isolate threshold mount/unmount cost from steady-state label cost.
- Real mid-range laptop (and real Safari/iOS) measurement; the CDP row throttles main-thread JS only.
- Not measured: real pointer or trackpad input latency, touch pinch, high-refresh displays, curved cross-tile links on focus, larger universes (rows beyond 8).
- Headed-window rAF stalls (one 1 s frame in Chromium zoom) remain a measurement hazard, as noted in S5.
- Raw per-run data: `docs/spikes/data/s6-results.json`. The page and harness are throwaway code under `spikes/s6-universe/` (`measure.mjs --out ../docs/spikes/data/s6-results.json`).
