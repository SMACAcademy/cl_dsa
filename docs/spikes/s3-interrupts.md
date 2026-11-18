# Spike S3: Interrupts and worker re-boot

## Question

Soft interrupt via SharedArrayBuffer + hard `terminate()` + re-boot time

## Pass condition

`while True` stopped < 1 s soft; re-boot < 2 s warm

## Setup

- Machine: the owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Not a laptop. Unrelated dev servers were running on the machine during the runs, so timings are realistic rather than quiet.
- Mid-range-laptop approximation: the same Chromium measurement inside `mcr.microsoft.com/playwright:v1.65.1-noble` with `docker run --cpus=0.5` (cgroup `cpu.max` = `50000 100000`, recorded; Docker Desktop VM, Linux 6.18.33.2-microsoft-standard-WSL2, 31.3 GB RAM, Node v26.13.1), production build served inside the container.
- Browsers (Playwright builds, headless): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2 (all three ran; none untested).
- Versions: Pyodide 314.0.8 (CPython 3.14.2), Vite 8.3.8, Node v22.23.4 (host), Playwright 1.65.1. Recorded programmatically in `docs/spikes/data/s3-results.json`.

## Method

`spikes/s3-interrupts/`: the main thread creates a `SharedArrayBuffer(1)` per worker, sends it to a module worker, which boots self-hosted Pyodide and calls `pyodide.setInterruptBuffer(new Uint8Array(sab))`. Soft stop is `Atomics.store(view, 0, 2)` from the main thread (the worker is busy, so it cannot be a message). Hard kill is `worker.terminate()` plus spawning a fresh worker and waiting for its `ready`. The page also has buttons (Run `while True: pass`, Run `sum(range(10**10))`, Soft stop, Hard kill, Boot spare, Hard kill (swap to spare), Run 1 + 1) for a human; `?manual` stops the page auto-booting so Playwright drives it.

`measure.mjs` (Playwright, from `spikes/`: `node s3-interrupts/measure.mjs --out ../docs/spikes/data/s3-results.json`) runs, per browser and per server (production build via `serve-prod.mjs`, and Vite dev), in one page after a first boot that warms the HTTP/browser cache:

- 5 soft stops of `while True: pass`. The harness waits for the worker's `started` message plus 300 ms, then sends the stop, resending every 250 ms until the run ends (up to 8 sends, otherwise fail). Latency = first send to receiving the result message. Asserted per run: the result is a `KeyboardInterrupt` error, and the SAME worker then returns `2` for `1 + 1`.
- 5 hard kills of a worker busy in `while True: pass`. Time = `terminate()` to the new worker's `ready` (same page, warm cache). Asserted per run: the new worker reports ready, its `self.crossOriginIsolated` is true and `typeof SharedArrayBuffer` is `function`, and it returns `2` for `1 + 1`.
- 3 soft stops of `sum(range(10**10))` (a C-level loop), capped at 3 s. If it does not stop, hard kill and re-boot are asserted as above; if it stops, survival is asserted. Both outcomes are recorded, not failed.
- **Spare-worker mode (fix round 1).** A second Pyodide worker is booted and idle-ready in advance. On a hard kill the busy worker is `terminate()`d, the next `1 + 1` is routed to the spare, and a replacement spare starts booting in the background. Measured 5 times per row: swap latency = `terminate()` to the spare returning the `1 + 1` result (asserted `2`); time until the replacement spare reports ready (asserted isolated, `SharedArrayBuffer` present); and the **double kill**: a second kill right after the first, while the replacement spare is still booting, timed from the second `terminate()` to the `1 + 1` result on the then-promoted spare (asserted `2` both times).
- Memory cost of an idle spare: `performance.measureUserAgentSpecificMemory()` first; where unavailable, in the Docker row the sum of `/proc/*/statm` resident pages in the container before and after booting the spare (1.5 s settle each, one trial).
- Also asserted: page `crossOriginIsolated`, no request leaves the page origin.

Final run: 315 assertion checks, `ASSERTIONS OK`, nothing untested. Median / min / max of 5 runs.

## Results

Times in ms, median / min / max of 5, from the final committed run (`docs/spikes/data/s3-results.json`).

| Row | Soft stop (`while True`) | Naive re-boot: `terminate()` to new worker ready | **Spare swap**: `terminate()` to spare's `1 + 1` | Replacement spare ready | **Double kill**: 2nd recovery |
|---|---|---|---|---|---|
| **Chromium, mid-range-laptop approximation (Docker `--cpus=0.5`), prod** | 2.8 / 2.5 / 8.4 | **3861.6 / 3821.6 / 3989.0** | 2.7 / 2.6 / 50.5 | 3825.9 / 3805.2 / 3962.8 | 6601.1 / 6396.1 / 7082.6 |
| Chromium, desktop, prod | 2.3 / 2.2 / 8.2 | **1820.3 / 1698.6 / 1885.4** | 2.6 / 2.3 / 3.0 | 1883.3 / 1760.8 / 1979.8 | 1795.0 / 1698.9 / 1971.4 |
| Firefox, desktop, prod | 4.9 / 3.5 / 5.2 | **2456.2 / 2328.2 / 2603.6** | 3.3 / 3.0 / 3.7 | 2472.8 / 2427.7 / 2589.8 | 2489.5 / 2364.5 / 2550.9 |
| WebKit, desktop, prod | 15.4 / 14.7 / 15.6 | **2213.6 / 2103.8 / 2379.5** | 15.1 / 14.9 / 15.4 | 2129.3 / 1781.9 / 2388.5 | 2523.6 / 2486.2 / 2830.4 |
| Chromium, desktop, Vite dev | 2.3 / 2.2 / 7.9 | 1547.6 / 1482.1 / 1729.4 | 2.8 / 2.4 / 2.9 | 1695.4 / 1383.1 / 1812.0 | 1665.7 / 1451.0 / 1859.8 |
| Firefox, desktop, Vite dev | 3.7 / 3.0 / 5.2 | 2173.8 / 2099.9 / 2254.5 | 3.3 / 3.0 / 3.4 | 2135.7 / 1806.0 / 2286.8 | 2328.7 / 2092.0 / 2470.0 |
| WebKit, desktop, Vite dev | 15.1 / 14.8 / 15.7 | 2122.4 / 2027.5 / 2209.0 | 15.7 / 12.5 / 16.1 | 2124.6 / 1954.9 / 2410.7 | 2548.1 / 2480.3 / 2942.9 |

First (cold) boot, for reference (prod): Docker 6628, Chromium 1626, Firefox 1742, WebKit 1531.

**Run-to-run spread of the naive re-boot is large** on this shared desktop. Across the complete runs I made (same code and machine, other dev servers running), the prod medians were Chromium 1.82 to 2.42 s, Firefox 2.34 to 2.67 s, WebKit 2.14 to 2.45 s. The table is the final run; only it is kept in the committed JSON.

C-level loop `sum(range(10**10))`, 3 runs per row: **the soft interrupt did not stop it in any run, in any browser** (0 of 3 within the 3 s cap, all 7 rows). After the cap the hard kill + re-boot worked and the new worker returned 2.

Worker-side isolation, all rows: `self.crossOriginIsolated === true`, `typeof SharedArrayBuffer === "function"`.

Memory of an idle spare:

- `performance.measureUserAgentSpecificMemory()` was **not available** in any row (Chromium throws a `SecurityError` saying it is not available in this headless Playwright build even though the page is cross-origin isolated; Firefox and WebKit do not implement it). No number from it.
- Docker Chromium, `/proc` resident-set sum across the whole container: 792.9 MB with one worker booted, 850.9 MB with the spare also booted, so **about 58 MB for one idle spare** (one trial, whole-browser RSS including page and utility processes, so noisy; treat as order of magnitude). Not measured on desktop or in Firefox/WebKit.

Other observations:

- **A soft stop sent before Pyodide has entered the loop is dropped.** With a 100 ms wait after the worker's `started` message the stop was lost at 0.5 CPU (Docker) and once in WebKit, and a re-send worked. The final harness waits 300 ms and re-sends every 250 ms; every final-run stop needed only 1 send, but an intermediate WebKit run needed 2 (279 ms). The real watchdog must therefore re-send the interrupt (it is one byte store) until the run ends, not fire once.
- **KeyboardInterrupt is also thrown as an uncaught worker error in Chromium.** With `runPythonAsync`, each soft-stopped run produced, besides the rejected promise, one uncaught error event on the page in Chromium (5 per 5 runs, all three Chromium rows; 0 in Firefox and WebKit). It looks like Pyodide's `webloop` re-raising out of the timer callback. Harmless, but the worker needs a global `error` handler that swallows it. The harness tolerates exactly these and fails on anything else.
- **Loading Pyodide with plain `import(/* @vite-ignore */ url)` works in the production build** (all three browsers; no `new Function`, so no CSP `unsafe-eval` needed for loading). **It does not work in Vite dev**: Vite rewrites it to `.../pyodide.mjs?import` and answers HTTP 500 (observed). Dev therefore falls back to S1's `new Function` import, selected by `import.meta.env.DEV`, so the fallback is absent from the production bundle. The loader used is recorded per row.

## Verdict

Per clause:

- **Soft stop of `while True` < 1 s: PASS**, by a wide margin (2 to 16 ms medians on every row, including the 0.5 CPU row, subject to the dropped-early-stop caveat above). The interpreter survives every time: the same worker ran `1 + 1` = 2 after every soft stop (asserted).
- **Re-boot < 2 s warm: FAIL as measured** for a naive terminate-then-boot. Desktop prod medians in the final run are Chromium 1.82 s, Firefox 2.46 s, WebKit 2.21 s. Chromium is on the line (earlier runs 2.06 to 2.42 s) and Firefox and WebKit are over in every run. The Docker `--cpus=0.5` row is 3.86 s. A fresh worker costs a full Pyodide boot (the cold first boot is 1.5 to 1.7 s on desktop), so a warm cache does not make it much cheaper: the cost is WASM instantiation plus stdlib setup, not network.

Overall: **PASS WITH CHANGES, conditional on the spare-worker design** (measured above). With a pre-booted spare, the learner-visible recovery after a hard kill is **2.6 to 15 ms medians on desktop (all three browsers, prod) and 2.7 ms median (50.5 ms max) at 0.5 CPU**, with every run returning `2` from the spare. That is recovery time, not re-boot time: the re-boot itself still takes the naive-column numbers, it is moved off the critical path. The condition holds only if a second kill does not arrive within one boot time of the first. If it does (double kill), the second recovery waits for the replacement spare and takes about a full boot: 1.8 s (Chromium), 2.5 s (Firefox), 2.5 s (WebKit), **6.6 s at 0.5 CPU** (two boots compete for the CPU). Phase 3 must decide whether that case is acceptable (a learner killing runs back-to-back) or needs rate limiting or a second spare. The price is roughly one extra idle Pyodide, about 58 MB resident in the one Docker trial.

## Consequences for ADRs

- **ADR-003 (Pyodide in a Web Worker): confirmed, with a revision.** Soft interrupts via SharedArrayBuffer work in Chromium, Firefox and WebKit, and need cross-origin isolation (the worker sees `crossOriginIsolated === true`; S1 already requires COOP/COEP). The "watchdog kill" text must be revised to: soft interrupt (re-sent until the run ends) first, escalating to `terminate()` and a **hot-spare swap**, with the spare re-booted in the background. "Kill then re-boot" is not fast enough on its own (1.8 to 2.5 s desktop, 3.9 s at 0.5 CPU), and the soft interrupt cannot be relied on for loops inside C builtins. Cost: one extra idle worker, about 58 MB (indicative).
- ADR-004, ADR-005, ADR-006: not affected by this spike.

## Follow-ups

- **Soft interrupt does not reach C-level loops** (`sum(range(10**10))` ran past the 3 s cap in all 21 runs). The watchdog must always escalate to hard kill after a short grace period (suggest: soft stop re-sent for about 250 ms, then terminate). Other C-heavy calls (big `sorted`, `str * n`, regex backtracking) were not measured; assume the same until tested.
- Decide the double-kill policy (wait for the replacement spare, keep two spares, or rate-limit runs) and measure it on a real mid-range laptop.
- Memory: `measureUserAgentSpecificMemory` is unavailable here; the 58 MB is one Docker-Chromium whole-container RSS delta. Measure properly (desktop, Firefox, WebKit, repeated trials) before sizing a spare in production.
- Re-boot could also improve by trimming the Pyodide boot (snapshots, fewer preloaded packages); this helps both the naive path and the double-kill case.
- Add a worker `error` handler for the stray KeyboardInterrupt seen in Chromium, or find a run path that does not leave it on the webloop (not investigated).
- The mid-range-laptop row is an approximation (`--cpus=0.5` in a Docker VM), not a real laptop. WebKit is Playwright's build, not Safari.
- Desktop timings were taken on a shared machine with unrelated dev servers running; naive re-boot medians varied by up to about 0.6 s between runs.
