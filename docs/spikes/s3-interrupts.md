# Spike S3: Interrupts and worker re-boot

## Question

Soft interrupt via SharedArrayBuffer + hard `terminate()` + re-boot time

## Pass condition

`while True` stopped < 1 s soft; re-boot < 2 s warm

## Setup

- Machine: the owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Not a laptop. Unrelated dev servers were running on the machine during the runs, so treat timings as realistic rather than quiet.
- Mid-range-laptop approximation: the same Chromium measurement inside `mcr.microsoft.com/playwright:v1.65.1-noble` with `docker run --cpus=0.5` (cgroup `cpu.max` = `50000 100000`, recorded; Docker Desktop VM, Linux 6.18.33.2-microsoft-standard-WSL2, 31.3 GB RAM, Node v26.13.1), production build served inside the container.
- Browsers (Playwright builds, headless): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2 (all three ran; none untested).
- Versions: Pyodide 314.0.8 (CPython 3.14.2), Vite 8.3.8, Node v22.23.4 (host), Playwright 1.65.1. Recorded programmatically in `docs/spikes/data/s3-results.json`.

## Method

`spikes/s3-interrupts/`: the main thread creates a `SharedArrayBuffer(1)`, sends it to a module worker, which boots self-hosted Pyodide and calls `pyodide.setInterruptBuffer(new Uint8Array(sab))`. Soft stop is `Atomics.store(view, 0, 2)` from the main thread (the worker is busy, so it cannot be a message). Hard kill is `worker.terminate()` plus spawning a fresh worker and waiting for its `ready`. The page also has buttons (Run `while True: pass`, Run `sum(range(10**10))`, Soft stop, Hard kill, Run 1 + 1) for a human; `?manual` stops the page auto-booting so Playwright drives it.

`measure.mjs` (Playwright, from `spikes/`: `node s3-interrupts/measure.mjs --out ../docs/spikes/data/s3-results.json`) runs, per browser and per server (production build via `serve-prod.mjs`, and Vite dev), in one page after a first boot that warms the HTTP/browser cache:

- 5 soft stops of `while True: pass`. Latency = time from setting the flag to receiving the result message. Asserted per run: the result is a `KeyboardInterrupt` error, and the SAME worker then returns `2` for `1 + 1`.
- 5 hard kills of a worker busy in `while True: pass`. Time = `terminate()` to the new worker's `ready` (same page, warm cache). Asserted per run: the new worker reports ready, its `self.crossOriginIsolated` is true and `typeof SharedArrayBuffer` is `function`, and it returns `2` for `1 + 1`.
- 3 soft stops of `sum(range(10**10))` (a C-level loop), capped at 3 s. If it does not stop, hard kill and re-boot are asserted as above; if it stops, survival is asserted. Both outcomes are recorded, not failed.
- Also asserted: page `crossOriginIsolated`, no request leaves the page origin.

Final run: 168 assertion checks, `ASSERTIONS OK`, nothing untested. Median / min / max of 5 runs.

## Results

Times in ms, median / min / max of 5.

| Row | Soft stop (`while True`) | Hard kill to new worker ready | First (cold) boot |
|---|---|---|---|
| **Chromium, mid-range-laptop approximation (Docker `--cpus=0.5`), prod** | 2.9 / 2.6 / 11.1 | **4098.7 / 3888.6 / 4298.6** | 6108.6 |
| Chromium, desktop, prod | 3.3 / 2.2 / 7.8 | **2237.9 / 2171.8 / 2261.0** | 1682.7 |
| Firefox, desktop, prod | 4.9 / 3.7 / 6.0 | **2668.6 / 2086.4 / 2810.4** | 2039.6 |
| WebKit, desktop, prod | 15.3 / 14.7 / 15.8 | 2452.8 / 2404.4 / 2585.4 | 1727.4 |
| Chromium, desktop, Vite dev | 3.7 / 2.4 / 9.4 | 2078.5 / 1995.0 / 2119.2 | 1890.2 |
| Firefox, desktop, Vite dev | 4.8 / 4.7 / 6.1 | 2704.9 / 2652.1 / 2725.3 | 1930.4 |
| WebKit, desktop, Vite dev | 15.6 / 13.9 / 16.1 | 2461.9 / 2368.2 / 2535.6 | 1722.5 |

C-level loop `sum(range(10**10))`, 3 runs per row: **the soft interrupt did not stop it in any run, in any browser** (0 of 3 stopped within the 3 s cap, all 7 rows). After the cap the hard kill + re-boot worked and the new worker returned 2 (re-boot medians: prod Chromium 2204.8, Firefox 2537.2, WebKit 2374.5; Docker 3970.3).

Worker-side isolation, all rows: `self.crossOriginIsolated === true`, `typeof SharedArrayBuffer === "function"`.

Other observations:

- **KeyboardInterrupt is also thrown as an uncaught worker error in Chromium.** With `runPythonAsync`, each soft-stopped run produced, besides the rejected promise, one uncaught error event on the page in Chromium (5 per 5 runs; 0 in Firefox and WebKit). It looks like Pyodide's `webloop` re-raising out of the timer callback (the traceback passes through `webloop.py run_handle`). Harmless, but the worker needs a global `error` handler that swallows it, or it pollutes the console and any error telemetry. The harness tolerates exactly these and fails on anything else.
- **Loading Pyodide with plain `import(/* @vite-ignore */ url)` works in the production build** (all three browsers; no `new Function`, so no CSP `unsafe-eval` needed for loading). **It does not work in Vite dev**: Vite rewrites it to `.../pyodide.mjs?import` and answers HTTP 500 (observed). Dev therefore falls back to S1's `new Function` import, selected by `import.meta.env.DEV`, so the fallback is absent from the production bundle. The loader used is recorded per row.
- Soft-stop latency is the time for the worker to notice the 1-byte flag between bytecodes plus message delivery; WebKit sits at about 15 ms, the others under 10 ms.

## Verdict

**PASS WITH CHANGES.**

- Soft interrupt: **PASS**, by a wide margin. `while True` is stopped in about 3 to 15 ms (worst single run 11 ms in Chromium/Docker) against a 1 s limit, on desktop and at 0.5 CPU. The interpreter survives every time: the same worker ran `1 + 1` = 2 after every soft stop (asserted).
- Re-boot: **misses the 2 s warm target as built.** Median desktop re-boot is 2.2 s (Chromium), 2.7 s (Firefox), 2.5 s (WebKit); Chromium dev is at 2.08 s median (1.995 s min), which is within noise of the line. The 0.5-CPU approximation takes 4.1 s. A re-boot after a hard kill costs roughly a full Pyodide boot (the first boot was 1.7 to 2.0 s), so a warm cache does not make a fresh worker much cheaper: the cost is WASM instantiation plus stdlib setup, not network.
- The soft path meets the condition; a naive "terminate then boot" path does not. The change that should make it pass is a **pre-warmed spare worker**: on a hard kill, swap to the already-booted spare and boot the replacement spare in the background, so the learner-visible re-boot is a swap. This was not built or measured here; Phase 3 should measure it.

## Consequences for ADRs

- **ADR-003 (Pyodide in a Web Worker): confirmed, with a revision.** Soft interrupts via SharedArrayBuffer work in Chromium, Firefox and WebKit, and need cross-origin isolation (the worker sees `crossOriginIsolated === true`; S1 already requires COOP/COEP). The "watchdog kill" must be paired with a pre-warmed spare worker, because a cold re-boot costs about 2.2 to 2.7 s on desktop and about 4 s on a throttled laptop, and the soft interrupt cannot be relied on for loops inside C builtins (see Follow-ups).
- ADR-004, ADR-005, ADR-006: not affected by this spike.

## Follow-ups

- **Soft interrupt does not reach C-level loops** (`sum(range(10**10))` ran past the 3 s cap in all 21 runs). The watchdog timer must therefore always escalate to hard kill after a short grace period (suggest soft stop, wait about 250 ms, then terminate). Other C-heavy calls (big `sorted`, `str * n`, regex backtracking) were not measured; assume the same until tested.
- Build and measure the hot-spare worker: swap latency, memory cost of a second Pyodide instance (not measured), spare rebuild time under the 0.5-CPU profile.
- Add a worker `error` handler for the stray KeyboardInterrupt seen in Chromium, or find a run path that does not leave it on the webloop (not investigated).
- Re-boot could also improve by trimming the Pyodide boot (snapshots, fewer preloaded packages); out of scope here.
- The mid-range-laptop row is an approximation (`--cpus=0.5` in a Docker VM), not a real laptop. WebKit is Playwright's build, not Safari.
- One dev Firefox C-loop re-boot took 4.6 s (an outlier among 3; in the raw JSON).
