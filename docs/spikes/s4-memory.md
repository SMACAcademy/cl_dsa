# Spike S4: Memory measurement and ceiling

## Question

Is `tracemalloc` usable in Pyodide? What is the WASM memory ceiling behaviour (giant allocations, allocate-until-failure), and which approach should AlgoVerse use for "peak memory" reporting and for a soft memory limit: (a) a `tracemalloc` soft limit checked in the trace hook, or (b) a structural `sys.getsizeof` estimate?

## Pass condition

Documented; fallback chosen

## Setup

- Machine: the owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Other dev servers were running during the runs.
- Browsers (Playwright builds, headless): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2. All three ran; none untested.
- Versions: Pyodide 314.0.8 (CPython 3.14.2, wasm32), Vite 8.3.8, Node v22.23.4, Playwright 1.65.1. Recorded programmatically in `docs/spikes/data/s4-results.json`.
- Production build only (served by `serve-prod.mjs` with COOP/COEP). No Vite dev run: memory behaviour does not depend on the dev server.
- Docker `--cpus=0.5` row: **skipped**. S3's container runner is specific to S3's harness and not trivially reusable, and memory behaviour is not CPU-bound.

## Method

`spikes/s4-memory/`: a module worker boots self-hosted Pyodide; the main thread (`main.ts`) runs code with a **hard-kill watchdog** (`terminate()` after 15 s unless stated; the watchdog is armed before the worker confirms it started). Python can call `js.s4progress(mb)` while busy; the value and the WASM heap size (`pyodide._module.HEAP8.length`) land in a `SharedArrayBuffer`, so the last progress is readable even if the worker dies. `measure.mjs` (Playwright, from `spikes/`: `node s4-memory/measure.mjs --out ../docs/spikes/data/s4-results.json`) runs per browser:

1. `tracemalloc.start(); x = [0] * 10**6; get_traced_memory()`.
2. Giant allocations, each in the watchdog: `[0] * 10**10`, `[0] * 10**9`, `bytearray(3 * 2**30)`. Recorded: the exact exception and whether the same worker still answers `1 + 1`.
3. A loop appending 50 MB `bytearray` chunks until failure, **3 runs per browser** (memory runs are slow and the results were identical, so 3 is enough).
4. Candidate soft limit: a `sys.settrace` hook that counts events and every N-th event calls `tracemalloc.get_traced_memory()` and raises `MemoryError` above 256 MB. Run on **two workload shapes** for N = 1, 10, 100, 1000: **chunks** (one 50 MB `bytearray` per loop iteration, about 3 trace events per 50 MB) and **small** (`xs.append([0] * 1000)`, a 4 KB list per iteration, about 3 events per 4 KB, so about 12,000 times more events per MB).
5. Overhead on a loop of 10^6 simple operations (`x += i`), **median of 5**, with the cost components separated: baseline; `tracemalloc` only; a bare trace hook (no `tracemalloc`); hook + `tracemalloc` with **no check**; and hook + `tracemalloc` + check every N = 1000 / 100 / 10 / 1. The cost of the check itself is (variant N) minus (hook + `tracemalloc`, no check).
6. The same components with the **real S2 tracer** (`spikes/s2-tracer/tracer_proto.py`, copied into `spikes/s4-memory/`) as the installed hook, with the memory check added in its `local` handler, on 10^5 loop iterations (about 200,000 trace events; 10^6 would keep gigabytes of event dicts). Median of 5.
7. Fallback: `deep_size()` (`sys.getsizeof` traversal) compared with `tracemalloc` on four structures including the 10^6-element list.

Asserted per browser (38 checks, 114 total, `ASSERTIONS OK`): page and workers are cross-origin isolated; `tracemalloc` returns non-zero numbers; **after every hazardous scenario a fresh worker boots on the same page and returns `2` for `1 + 1`**; the N = 1 soft limit raises on both workloads. Boot and run have explicit timeouts (20 s `BOOT_TIMEOUT`, 10 s `RUN_TIMEOUT`, plus a 300 s ceiling on every page call naming the step); a boot failure on a live page fails the run loudly. Only a page that itself dies (crash event or closed target) would be recorded as a result, and even then a fresh worker must boot on the reopened page (asserted). Which exception each scenario produced is recorded, not asserted. No page crash or worker crash occurred in any browser (`events` is empty everywhere), and the 15 s watchdog never fired (the failures are all fast, clean Python exceptions), so the watchdog kill path itself is not exercised here (S3 covers it).

## Results

**Step 1: `tracemalloc` works** in all three browsers (`import tracemalloc` succeeds, no build flags needed). `[0] * 10**6`: peak 4,000,004 B, `sys.getsizeof` 4,000,028 B. **That is 4 MB, not the 8 MB the brief expected**: wasm32 pointers are 4 bytes (`struct.calcsize("P") == 4`), so the "peak >= 8 MB" threshold (a 64-bit assumption) is not met. The numbers are exact and plausible for wasm32.

**Step 2: giant allocations** (identical in Chromium, Firefox, WebKit):

| Expression | Observed failure | Time | Same worker answers afterwards | Fresh worker boots |
|---|---|---|---|---|
| `[0] * 10**10` | **`OverflowError: cannot fit 'int' into an index-sized integer`** (not `MemoryError`) | 5.7 to 19 ms | yes | yes (asserted) |
| `[0] * 10**9` (4 GB) | `MemoryError` | 4.5 to 13 ms | yes | yes (asserted) |
| `bytearray(3 * 2**30)` | `OverflowError` (same message) | 4.5 to 13 ms | yes | yes (asserted) |

`10**10` exceeds the 31-bit `Py_ssize_t` of wasm32, so CPython rejects it before attempting any allocation. The heap stayed at 30 MB. No WASM abort, no worker or tab crash.

**Step 3: allocate 50 MB chunks until failure** (3 runs per browser, all 9 identical in outcome):

| Browser | Outcome | Max allocated, MB (median / min / max) | WASM heap at failure, MB | Time to failure, s (median / min / max) |
|---|---|---|---|---|
| Chromium | `MemoryError` (Python exception) | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 1.13 / 1.07 / 1.15 |
| Firefox | `MemoryError` | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 0.77 / 0.68 / 0.82 |
| WebKit | `MemoryError` | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 0.56 / 0.55 / 0.58 |

The ceiling is the wasm32 4 GiB limit (heap 4096 MB, 81 chunks of 50 MB fit), the failure is an ordinary catchable `MemoryError`, and in every run the **same worker still answered `1 + 1`** afterwards and a fresh worker booted (asserted). The idle heap after boot is 30 MB.

**Soft limit (`sys.settrace` + `tracemalloc`, 256 MB): where it stops depends on N and on the workload.** Stop point in MB allocated (events seen at the stop); identical in all three browsers:

| Check every N events | **chunks** workload (50 MB per iteration, ~16.7 MB per trace event) | **small** workload (4 KB per iteration, ~0.0013 MB per trace event) |
|---|---|---|
| 1 | 300 MB (20 events) | 256.00 MB (199,721 events) |
| 10 | 300 MB (20 events) | 256.01 MB (199,730 events) |
| 100 | **1600 MB** (100 events), 6x over the limit | 256.10 MB (199,800 events) |
| 1000 | **never fired**: native `MemoryError` at 4050 MB, the run ended after only 249 events | 256.36 MB (200,000 events) |

The hook can only act at the first multiple of N after the limit is crossed, so the worst overshoot is about N times the allocation per trace event. That is a property of the workload shape, not of N alone: with small allocations even N = 1000 overshoots by under 0.4 MB, while with 50 MB-per-iteration allocations N = 100 overshoots by gigabytes and N = 1000 never gets a check. For the chunk loop, even N = 1 overshoots by one chunk (300 vs 256 MB), because the check runs after the allocation. A **single giant allocation** (`[0] * 10**9`, one `bytearray(...)`) happens inside one C call, produces no trace events, and cannot be pre-empted by any N; those are caught only by the `OverflowError` / 4 GiB `MemoryError` backstop above (which fired in under 15 ms).

**Overhead on 10^6 simple operations, cost components separated** (ms, median of 5, Chromium / Firefox / WebKit; factor vs baseline in brackets for Chromium). Raw runs are in the JSON.

| Component | Chromium | Firefox | WebKit |
|---|---|---|---|
| Baseline (no tracing) | 92.8 | 104.9 | 77.1 |
| 1. `tracemalloc.start()` only | 346.2 (3.7x) | 513.6 | 378.7 |
| 2. Trace hook installed, no memory check | 746.7 (8.0x) | 947.8 | 722.9 |
| 3. Hook + `tracemalloc`, **no check** | 1159.4 (12.5x) | 1589.4 | 1217.8 |
| Hook + `tracemalloc` + check, N = 1000 | 1361.2 | 1637.9 | 1223.3 |
| N = 100 | 1257.1 | 1593.1 | 1239.8 |
| N = 10 | 1292.5 | 1697.2 | 1296.0 |
| N = 1 | 1862.6 (20.1x) | 2999.1 | 1845.4 |
| **Per-event check cost** (N = 1 minus row 3) | +703 (+61 %) | +1410 (+89 %) | +628 (+52 %) |
| Check cost at N = 10 to 1000 (that minus row 3) | +98 to +202 | +4 to +108 | +5 to +78 |

So three costs stack: enabling `tracemalloc` (about 4x on this allocation-heavy loop, because every int is intercepted), installing any trace hook (about 8 to 9x), and the memory check itself, which is only clearly measurable at N = 1 (about +50 to +90 % over hook + `tracemalloc`, about 0.6 to 1.4 s per ~2 million events). At N >= 10 the check cost is within run-to-run noise (about +-100 ms).

**The same components with the real S2 tracer installed** (10^5 iterations, 200,009 trace events; ms, median of 5; the `tracer only` spread alone is large, e.g. 368 to 2031 ms in Chromium, so differences under ~15 % are not resolvable):

| Component | Chromium | Firefox | WebKit |
|---|---|---|---|
| Untraced | 7.4 | 9.8 | 7.1 |
| S2 tracer only | 1367.8 | 1631.6 | 1362.5 |
| Tracer + `tracemalloc`, no check | 2892.1 (2.1x tracer only) | 3124.8 (1.9x) | 2735.9 (2.0x) |
| + check N = 1000 | 2882.4 | 2887.6 | 2852.4 |
| N = 100 | 2282.3 | 2699.9 | 2154.0 |
| N = 10 | 2823.1 | 2915.1 | 2656.2 |
| N = 1 | 3100.6 | 3088.7 | 2962.7 |
| Check cost at N = 1 (minus no check) | +208 (+7 %) | -36 (noise) | +227 (+8 %) |

With the real tracer the dominant added cost is enabling `tracemalloc` (about 2x, because the tracer allocates an event dict and locals snapshot per line), and the N = 1 check adds at most roughly 10 % on top, below the noise floor of this measurement. Only the event density of this one loop was measured.

**Fallback structural estimate (`sys.getsizeof` traversal) vs `tracemalloc`** (bytes; identical in all three browsers, times in ms Chromium / Firefox / WebKit):

| Structure | `tracemalloc` current | Estimate | Estimate time, ms |
|---|---|---|---|
| `[0] * 10**6` | 4,000,904 | 4,000,044 | 162 / 381 / 176 |
| `list(range(10**6))` | 19,995,224 | 20,000,028 | 1735 / 3757 / 1734 |
| `[str(i) for i in range(10**5)]` | 2,989,430 | 2,989,382 | 173 / 345 / 183 |
| `{i: i for i in range(10**5)}` | 4,740,136 | 4,745,780 | 222 / 540 / 255 |

The estimate is within 0.15 % of `tracemalloc`'s current usage on all four. It cannot see transient peaks (e.g. the dict's resize peak) and was not tested on custom-class instances. It is slow: 0.2 to 3.8 s for 10^5 to 10^6 elements, so it can only run once at the end of a run, not as a continuous check.

## Verdict

**PASS WITH CHANGES.** Behaviour is fully documented, and a choice is made.

**Chosen approach: (a) `tracemalloc`, with changes.** (b) is kept only as a labelled fallback if `tracemalloc` is ever missing (it was not).

- **Peak memory reporting: use `tracemalloc`** (`start()`, `get_traced_memory()` peak). It is available and exact in all three browsers. Because enabling it costs about 4x on allocation-heavy code, enable it only when memory is being measured (the `measure` mode / Battle Arena memory comparison), not in every Playground run. Report peak in wasm32 terms and label it accordingly (pointers are 4 bytes, so numbers are about half a 64-bit CPython's for pointer-heavy data).
- **Soft limit design: PROVISIONAL.** A `tracemalloc` check inside the trace hook works, but the right N is workload-dependent and the cost has only been measured on a trivial loop and a 10^5-iteration run of the S2 tracer. What the data shows: the overshoot is about N times the allocation per trace event. For loops that allocate small objects per iteration (the common algorithm case) any N up to 1000 stops within 0.4 MB of the limit; for loops that allocate tens of MB per iteration, N must be 1 and even then overshoots by one allocation; a bigger N (100, 1000) can miss the limit by gigabytes or never check at all. A fixed N is therefore a heuristic, and N = 1 is the only value that is safe for every loop shape, at the cost measured above (per-event check about +50 to +90 % over hook + `tracemalloc` on a trivial loop; at most about +10 %, not resolvable from noise, on top of the real S2 tracer). **This design must be re-measured with the real tracer on realistic programs in Phase 3 before it is fixed.** An N that is adaptive to the observed allocation rate was not evaluated.
- **The real backstop is the hard ceiling**: `OverflowError` for requests beyond 2^31 bytes, `MemoryError` at 4 GiB in about 0.6 to 1.1 s in all three browsers, with the worker still usable. A single big C-level allocation (no trace events) is caught only by this backstop, never by the soft limit. A watchdog kill/hot-spare swap (S3) remains the answer for anything that does not return.
- Change required: **`[0] * 10**10` raises `OverflowError`, not `MemoryError`.** The friendly-error layer (EXECUTION_ENGINE §5.2) must map `OverflowError: cannot fit 'int' into an index-sized integer` to "your program tried to use too much memory" as well as `MemoryError`.

## Consequences for ADRs

- **ADR-003 (Pyodide in a Web Worker): confirmed.** Memory exhaustion is survivable in-worker (clean `MemoryError`, same worker keeps answering) and a fresh worker always boots afterwards, so "hard kill + replace" is a backstop, not the primary mechanism. EXECUTION_ENGINE §5.1 (memory exhaustion row) should say: `OverflowError` for requests beyond 2^31 bytes, `MemoryError` at the 4 GiB wasm32 ceiling, and a `tracemalloc` soft limit in the trace hook that is provisional (workload-dependent N, see above). EXECUTION_ENGINE §7's "feasibility verified" note is now verified for `tracemalloc` availability and accuracy.
- ADR-004, ADR-005, ADR-006: not affected.

## Follow-ups

- The ROADMAP/EXECUTION_ENGINE test line "`[0]*10**10` gives a memory error" should be reworded (it is an `OverflowError`) and an additional case added for the real ceiling (`[0] * 10**9` or the chunk loop).
- **Re-measure the soft limit with the real tracer in Phase 3** on realistic programs (recursion, nested data structures, string building), and decide N (or an adaptive/sampled scheme, e.g. check on `call` events and every K lines, or from a timer). Only two allocation shapes were tried here.
- A 4 GiB heap is fine on this 64 GB desktop. **Not tested: low-RAM devices** (phones, 4 GB laptops), where the OS or browser may kill the tab before Pyodide reaches `MemoryError`. A lower, explicit soft cap (256 MB in trace mode) is the mitigation; measure on a real low-memory device before relying on it. Whole-process RSS was not measured here.
- The 15 s watchdog never fired because every failure was fast; no scenario produced a hang or crash. Memory-pressure behaviour of a worker that is killed mid-allocation is covered only by S3's kill tests, not here.
- The real-tracer timings are noisy (the S2 tracer builds a large event list; run-to-run spread is 3 to 5x within one variant), so its check-cost figure is an upper bound, not a measurement.
- The structural estimate does not account for custom-class instances and is slow (up to 3.8 s on 10^6 distinct ints); only needed if `tracemalloc` ever becomes unavailable.
- Memory runs were 3 per browser (identical results), not 5; WebKit is Playwright's build, not Safari.
