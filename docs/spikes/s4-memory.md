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

`spikes/s4-memory/`: a module worker boots self-hosted Pyodide; the main thread (`main.ts`) runs code with a **hard-kill watchdog** (`terminate()` after 15 s). Python can call `js.s4progress(mb)` while busy; the value and the WASM heap size (`pyodide._module.HEAP8.length`) land in a `SharedArrayBuffer`, so the last progress is readable even if the worker dies. `measure.mjs` (Playwright, from `spikes/`: `node s4-memory/measure.mjs --out ../docs/spikes/data/s4-results.json`) runs per browser:

1. `tracemalloc.start(); x = [0] * 10**6; get_traced_memory()`.
2. Giant allocations, each in the watchdog: `[0] * 10**10`, `[0] * 10**9`, `bytearray(3 * 2**30)`. Recorded: the exact exception, whether the same worker still answers `1 + 1`, and (asserted) that a fresh worker boots and answers `1 + 1`.
3. A loop appending 50 MB `bytearray` chunks until failure, **3 runs per browser** (memory runs are slow and the results were identical, so 3 is enough), each followed by a fresh worker. Recorded: MB allocated before failure, WASM heap at failure, time to failure.
4. Candidate soft limit: `sys.settrace` hook that counts events and every N-th event calls `tracemalloc.get_traced_memory()` and raises `MemoryError` above 256 MB, on the same 50 MB loop, for N = 1, 100, 1000.
5. Overhead on a loop of 10^6 simple operations (`x += i`), **median of 5**, variants: baseline, `tracemalloc` only, bare trace hook (no `tracemalloc` check), hook with check N = 1000 / 100 / 1.
6. Fallback: `deep_size()` (`sys.getsizeof` traversal) compared with `tracemalloc` on four structures including the 10^6-element list.

Asserted per browser (26 checks, 78 total, `ASSERTIONS OK`): page and workers are cross-origin isolated; `tracemalloc` returns non-zero numbers; after every hazardous scenario a fresh worker boots and returns `2` for `1 + 1`; the N = 1 soft limit raises. Which exception each scenario produced is recorded, not asserted. No page crash or worker crash was observed in any browser, and the 15 s watchdog never fired (the failures are all fast, clean Python exceptions), so the watchdog kill path itself is not exercised here (S3 covers it).

## Results

**Step 1: `tracemalloc` works** in all three browsers (`import tracemalloc` succeeds, no build flags needed). `[0] * 10**6`: current 4,000,000 B, peak 4,000,004 B, `sys.getsizeof` 4,000,028 B. **That is 4 MB, not the 8 MB the brief expected**: wasm32 pointers are 4 bytes (`struct.calcsize("P") == 4`), so the "peak >= 8 MB" threshold (a 64-bit assumption) is not met. The numbers are exact and plausible for wasm32.

**Step 2: giant allocations** (identical in Chromium, Firefox, WebKit):

| Expression | Observed failure | Time | Same worker answers afterwards | Fresh worker boots |
|---|---|---|---|---|
| `[0] * 10**10` | **`OverflowError: cannot fit 'int' into an index-sized integer`** (not `MemoryError`) | 0.2 to 15 ms | yes | yes |
| `[0] * 10**9` (4 GB) | `MemoryError` | 0.2 to 8 ms | yes | yes |
| `bytearray(3 * 2**30)` | `OverflowError` (same message) | 0.2 to 8 ms | yes | yes |

`10**10` exceeds the 31-bit `Py_ssize_t` of wasm32, so CPython rejects it before attempting any allocation. The heap stayed at 30 MB. No WASM abort, no worker or tab crash.

**Step 3: allocate 50 MB chunks until failure** (3 runs per browser, all 9 identical in outcome):

| Browser | Outcome | Max allocated, MB (median / min / max) | WASM heap at failure, MB | Time to failure, s (median / min / max) |
|---|---|---|---|---|
| Chromium | `MemoryError` (Python exception) | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 1.06 / 1.06 / 1.08 |
| Firefox | `MemoryError` | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 0.68 / 0.68 / 0.69 |
| WebKit | `MemoryError` | 4050 / 4050 / 4050 | 4096 / 4096 / 4096 | 0.63 / 0.61 / 0.63 |

The ceiling is the wasm32 4 GiB limit (heap 4096 MB, 81 chunks of 50 MB fit), the failure is an ordinary catchable `MemoryError`, and in every run the **same worker still answered `1 + 1`** afterwards. The idle heap after boot is 30 MB.

**Soft limit (`sys.settrace` + `tracemalloc`, 256 MB) on the 50 MB loop:**

| Check every N events | Stopped at (MB allocated) | Before WASM ceiling? | Events seen | Wall time (Chromium / Firefox / WebKit), ms |
|---|---|---|---|---|
| 1 | 300 (traced 300.003 MB) | **yes** | 20 | 149 / 186 / 144 |
| 100 | 1600 | yes, but 6x over the limit | 100 | 419 / 401 / 341 |
| 1000 | never fired (native `MemoryError` at 4050) | **no** | 249 | 1160 / 891 / 740 |

The hook counts events, and an allocation-heavy loop with few events per MB means a large N only checks after gigabytes. N = 1 enforces the limit at the next event after it is exceeded. A single giant allocation cannot be pre-empted by a hook (it happens inside one C call), but as shown above those cases already fail instantly and cleanly by themselves.

**Overhead on 10^6 simple operations** (ms, median / min / max of 5; factor vs baseline):

| Variant | Chromium | Firefox | WebKit |
|---|---|---|---|
| Baseline (no tracing) | 105.2 / 82.4 / 111.2 | 108.4 / 101.0 / 112.5 | 84.2 / 54.8 / 89.1 |
| `tracemalloc.start()` only | 423.1 / 416.4 / 459.7 (**4.0x**) | 467.5 / 455.8 / 595.8 (4.3x) | 359.6 / 232.4 / 421.8 (4.3x) |
| Bare trace hook, no memory check | 889.2 (8.5x) | 934.9 (8.6x) | 727.1 (8.6x) |
| Hook + check, N = 1000 | 1466.0 / 1454.8 / 1550.9 (13.9x) | 1608.0 (14.8x) | 1208.7 (14.4x) |
| Hook + check, N = 100 | 1465.2 (13.9x) | 1636.7 (15.1x) | 1232.3 (14.6x) |
| Hook + check, N = 1 | 2218.2 / 1484.9 / 2248.4 (**21.1x**) | 2987.2 / 2465.3 / 2996.0 (**27.6x**) | 1901.6 / 1703.1 / 1989.7 (**22.6x**) |

Part of the cost is `sys.settrace` itself (about 8.5x with a no-op counting hook), which the S2 tracer would pay anyway; the `tracemalloc` increment on top of a hook is roughly 1.6x (N = 1000/100) to 2.5x (N = 1) in this loop, and `tracemalloc` alone is about 4x because it intercepts every allocation (here, every int).

**Fallback structural estimate (`sys.getsizeof` traversal) vs `tracemalloc`** (bytes, Chromium; Firefox and WebKit byte-identical):

| Structure | `tracemalloc` current | Estimate | Estimate time, Chromium / Firefox / WebKit, ms |
|---|---|---|---|
| `[0] * 10**6` | 4,000,076 | 4,000,044 | 290 / 383 / 198 |
| `list(range(10**6))` | 19,995,224 | 20,000,028 | 1791 / 3834 / 1344 |
| `[str(i) for i in range(10**5)]` | 2,989,430 | 2,989,382 | 211 / 346 / 119 |
| `{i: i for i in range(10**5)}` | 4,740,136 (peak 6,111,128) | 4,745,780 | 222 / 428 / 113 |

The estimate is within 0.15 % of `tracemalloc`'s current usage on all four. It cannot see transient peaks (e.g. the dict's resize peak) and was not tested on custom-class instances. It is slow: 0.2 to 3.8 s for 10^5 to 10^6 elements, so it can only run once at the end of a run, not as a continuous check.

## Verdict

**PASS WITH CHANGES.** Behaviour is fully documented, and a choice is made.

**Chosen approach: (a) `tracemalloc`, with changes.** (b) is kept only as a labelled fallback if `tracemalloc` is ever missing (it was not).

- Peak memory reporting: use `tracemalloc` (`start()`, `get_traced_memory()` peak). It is available and exact in all three browsers. Because it costs about 4x on allocation-heavy code, enable it only when memory is being measured (the `measure` mode / Battle Arena memory comparison), not in every Playground run. Report peak in wasm32 terms and label it accordingly (pointers are 4 bytes, so numbers are about half a 64-bit CPython's for pointer-heavy data).
- Soft limit: it works only with N = 1 (check on every trace event), costing 21x to 28x on a tight loop with `tracemalloc` on, or about 1.6x to 2.5x on top of a tracer that is already installed. N >= 100 is not safe (stops at 1600 MB or never). Since AlgoVerse's trace mode already runs a tracer (S2), the soft limit should live in that hook at N = 1 for trace mode only; in non-trace mode do not pay the cost.
- The real backstop is the hard ceiling: `MemoryError` at 4 GiB in about 0.6 to 1.1 s in all three browsers, with the worker still usable. A watchdog kill/hot-spare swap (S3) remains the answer for anything that does not return.
- Change required: **`[0] * 10**10` raises `OverflowError`, not `MemoryError`.** The friendly-error layer (EXECUTION_ENGINE §5.2) must map `OverflowError: cannot fit 'int' into an index-sized integer` to "your program tried to use too much memory" as well as `MemoryError`.

## Consequences for ADRs

- **ADR-003 (Pyodide in a Web Worker): confirmed.** Memory exhaustion is survivable in-worker (clean `MemoryError`, same worker keeps answering) and a fresh worker always boots afterwards, so the "hard kill + replace" policy is a backstop, not the primary mechanism. EXECUTION_ENGINE §5.1 (memory exhaustion row) should say: `OverflowError` for requests beyond 2^31 bytes, `MemoryError` at the 4 GiB wasm32 ceiling, `tracemalloc` soft limit only via an N = 1 hook in trace mode. EXECUTION_ENGINE §7's "feasibility verified" note is now verified.
- ADR-004, ADR-005, ADR-006: not affected.

## Follow-ups

- The ROADMAP/EXECUTION_ENGINE test line "`[0]*10**10` gives a memory error" should be reworded (it is an `OverflowError`) and an additional case added for the real ceiling (`[0] * 10**9` or the chunk loop).
- A 4 GiB heap is fine on this 64 GB desktop. **Not tested: low-RAM devices** (phones, 4 GB laptops), where the OS or browser may kill the tab before Pyodide reaches `MemoryError`. A lower, explicit soft cap (256 MB in trace mode) is the mitigation; measure on a real low-memory device before relying on it. Whole-process RSS was not measured here.
- The 15 s watchdog never fired because every failure was fast; no scenario produced a hang or crash. Memory-pressure behaviour of a worker that is killed mid-allocation is covered only by S3's kill tests, not here.
- N = 1 hook cost (21x to 28x) is for a trivial loop where nearly every event is cheap; measure on the real tracer (S2) before fixing the limit design. A cheaper variant (check on `call` events and every K lines, or sample on a timer from the soft-interrupt thread) was not evaluated.
- The structural estimate does not account for custom-class instances or shared-reference semantics beyond `id()` de-duplication, and is slow (up to 3.8 s on 10^6 distinct ints); only needed if `tracemalloc` ever becomes unavailable.
- Memory runs were 3 per browser (identical results), not 5; WebKit is Playwright's build, not Safari.
