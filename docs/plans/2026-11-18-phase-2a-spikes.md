# Phase 2A — De-risking Spikes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove or disprove the six runtime assumptions behind ADR-003/004/005/006 before the foundation and engine are built on them.

**Architecture:** Each spike is a small, throwaway program under `spikes/<name>/`, never imported by product code. Each spike ends with a findings note in `docs/spikes/` stating measured numbers against a pass condition, and an ADR status update (Accepted or revised).

**Tech Stack:** Vite + TypeScript (vanilla, no React), Pyodide (latest stable, self-hosted), Python 3.12 via uv, d3-zoom.

**Spec:** [ROADMAP §2 M2.0](../ROADMAP.md#m20-de-risking-spikes-do-first-throwaway-code-findings-kept--sm), [EXECUTION_ENGINE](../EXECUTION_ENGINE.md), [VISUALIZATION_ENGINE](../VISUALIZATION_ENGINE.md), [PYRAMID_MODEL](../PYRAMID_MODEL.md), [DECISIONS](../DECISIONS.md)

## Global Constraints

- Spike code lives only in `spikes/` and is excluded from the pnpm and uv workspaces. Nothing in `apps/` or `packages/` imports it.
- Pyodide is **self-hosted** from the spike's `public/pyodide/` folder (downloaded by script). No CDN URL at runtime.
- Measurements are taken on the owner's laptop. Record CPU, RAM, browser and version in every findings note.
- Every findings note uses the template in Task 0 and states **PASS / FAIL / PASS WITH CHANGES** against the pass condition copied verbatim from the roadmap.
- Work happens on branch `phase-2a-spikes`.

## Review Focus

- Pyodide version drift: the spike must record the exact Pyodide and CPython versions. Phase 3 pins them.
- Firefox and Safari behaviour of `crossOriginIsolated` and `SharedArrayBuffer`: S1 and S3 must be run in Chrome **and** Firefox. If Safari is unavailable, record that as untested.
- Cold vs warm loads: S1 must report both the first load (empty cache) and a reload.
- Traces containing large integers or long strings: S2 must include one run with `10**30` and a 5,000-character string in a local variable, confirming the event payload stays valid JSON.
- Measurement noise: every timing is the median of 5 runs, with min and max reported.

---

### Task 0: Spike workspace and findings template

**Files:**
- Create: `spikes/README.md` (purpose, "throwaway, never imported" rule)
- Create: `spikes/fetch-pyodide.mjs` (downloads the pinned Pyodide release tarball into a given `public/pyodide/` dir and verifies its SHA-256)
- Create: `docs/spikes/TEMPLATE.md`

- [ ] **Step 1:** Write `docs/spikes/TEMPLATE.md` with these headings: `Question`, `Pass condition` (verbatim from ROADMAP M2.0), `Setup` (machine, browser, versions), `Method`, `Results` (table: metric, median, min, max), `Verdict` (PASS / FAIL / PASS WITH CHANGES), `Consequences for ADRs`, `Follow-ups`.
- [ ] **Step 2:** Implement `spikes/fetch-pyodide.mjs <targetDir>`. Download the Pyodide release archive for the version given in `spikes/pyodide-version.txt` from the official GitHub release, verify the SHA-256 recorded in the same file, and extract it to `<targetDir>`. Exit non-zero on a checksum mismatch.
- [ ] **Step 3:** Run `node spikes/fetch-pyodide.mjs spikes/s1-pyodide-worker/public/pyodide`. Expected: the directory contains `pyodide.mjs` and `pyodide.asm.wasm`.
- [ ] **Step 4:** Commit: `git commit -m "spike: workspace, pyodide fetcher, findings template"`

### Task 1: S1 — Pyodide in a module worker with cross-origin isolation

**Files:**
- Create: `spikes/s1-pyodide-worker/{index.html, main.ts, worker.ts, vite.config.ts, serve-prod.mjs}`
- Create: `docs/spikes/s1-pyodide-worker.md`

- [ ] **Step 1:** In `vite.config.ts`, set `server.headers` and `preview.headers` to `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. `worker.ts` loads `loadPyodide({ indexURL: "/pyodide/" })` and answers `{type:"run", code}` with `{type:"result", value, ms}`.
- [ ] **Step 2:** In `main.ts`, display `crossOriginIsolated`, the boot time (`performance.now()` from worker creation to `ready`), and the result of running `1 + 1` and `import sys; sys.version`.
- [ ] **Step 3:** Run `pnpm dlx vite` in the spike folder and open it in Chrome and Firefox. Expected: `crossOriginIsolated: true`, result `2`, Python version printed.
- [ ] **Step 4:** Build with `pnpm dlx vite build`, then serve `dist/` with `serve-prod.mjs` (a ~30-line Node `http` static server that sets the same two headers plus `Cross-Origin-Resource-Policy: same-origin`). Expected: same results as Step 3.
- [ ] **Step 5:** Record cold and warm boot times (median of 5) and verdict in `docs/spikes/s1-pyodide-worker.md`. **Pass:** `crossOriginIsolated === true` in dev and prod servers; Python `1+1` returns 2 in the worker; all assets self-hosted (Network panel shows no third-party origin).
- [ ] **Step 6:** Commit: `git commit -m "spike(s1): pyodide worker under COOP/COEP"`

### Task 2: S2 — Tracer prototype overhead inside Pyodide

**Files:**
- Create: `spikes/s2-tracer/tracer_proto.py` (≤ 250 lines), `spikes/s2-tracer/test_tracer_proto.py`, `spikes/s2-tracer/bench.html`, `spikes/s2-tracer/bench.ts`
- Create: `docs/spikes/s2-tracer.md`

- [ ] **Step 1: Write the failing test** in `test_tracer_proto.py`:

```python
from tracer_proto import trace_source

BUBBLE = '''
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
result = bubble_sort([5, 1, 4])
'''

def test_bubble_emits_compare_and_writes_in_order():
    events = trace_source(BUBBLE)
    kinds = [e["kind"] for e in events if e["kind"] in ("compare", "write")]
    assert kinds[:4] == ["compare", "write", "write", "compare"]   # 5>1 swaps, then 5>4

def test_compare_carries_origins():
    first = next(e for e in trace_source(BUBBLE) if e["kind"] == "compare")
    assert first["result"] is True
    assert first["leftOrigin"]["key"] == 0 and first["rightOrigin"]["key"] == 1

def test_program_result_unchanged():
    ns = {}
    trace_source(BUBBLE, namespace=ns)
    assert ns["result"] == [1, 4, 5]
```

- [ ] **Step 2:** Run `uv run --python 3.12 --with pytest pytest spikes/s2-tracer -q`. Expected: FAIL (`tracer_proto` missing).
- [ ] **Step 3:** Implement `trace_source(source: str, namespace: dict | None = None) -> list[dict]`. Use an `ast.NodeTransformer` that rewrites single `Compare` nodes to `__av_cmp(op, left, right)` and `Subscript` loads/stores to `__av_get`/`__av_set` (tuple-target assignments become sequential sets). Keep a per-statement registry `id(value) → (container_id, key)` to fill origins, and call `sys.settrace` for `line`/`call`/`return` with a shallow locals snapshot. Events are plain dicts, with integer keys as Python ints.
- [ ] **Step 4:** Run the tests. Expected: 3 passed.
- [ ] **Step 5:** In `bench.ts`, load `tracer_proto.py` into Pyodide (in a worker, reusing S1's setup) and trace bubble sort on a random list of n = 50 (≈ 3–5k events). Measure wall time for trace + `JSON.stringify` of the event list. Also run the Review Focus payload case (`10**30`, 5,000-char string).
- [ ] **Step 6:** Record events count, events/second, total ms (median of 5) in `docs/spikes/s2-tracer.md`. **Pass:** bubble sort n=50 traced in < 1.5 s on a mid-range laptop.
- [ ] **Step 7:** Commit: `git commit -m "spike(s2): tracer prototype + pyodide benchmark"`

### Task 3: S3 — Soft interrupt, hard kill and re-boot

**Files:**
- Create: `spikes/s3-interrupts/{main.ts, worker.ts, index.html, vite.config.ts}` (copy S1 config)
- Create: `docs/spikes/s3-interrupts.md`

- [ ] **Step 1:** Worker calls `pyodide.setInterruptBuffer(new Uint8Array(sab))` with a `SharedArrayBuffer(1)` received from the main thread. Main thread offers buttons **Run `while True: pass`**, **Soft stop** (`Atomics.store(view, 0, 2)`), **Hard kill** (`worker.terminate()` + spawn a new worker and wait for `ready`).
- [ ] **Step 2:** Measure in Chrome and Firefox: soft-stop latency (button click → `KeyboardInterrupt` result message), hard-kill → new worker `ready` time (warm cache).
- [ ] **Step 3:** Confirm that after a soft stop the same worker runs `1 + 1` correctly (the interpreter survives).
- [ ] **Step 4:** Record the results. **Pass:** `while True` stopped < 1 s soft; re-boot < 2 s warm.
- [ ] **Step 5:** Commit: `git commit -m "spike(s3): interrupts and worker re-boot"`

### Task 4: S4 — Memory measurement and ceiling

**Files:**
- Create: `spikes/s4-memory/{main.ts, worker.ts, index.html, vite.config.ts}`
- Create: `docs/spikes/s4-memory.md`

- [ ] **Step 1:** In the worker, run `import tracemalloc; tracemalloc.start(); x = [0] * 10**6; print(tracemalloc.get_traced_memory())`. Record whether it imports and returns plausible numbers (peak ≥ 8 MB for 10⁶ references).
- [ ] **Step 2:** Run `x = [0] * 10**10` and record the exact failure mode (Python `MemoryError` vs WASM abort vs tab crash) and whether the worker can still answer afterwards.
- [ ] **Step 3:** Run a loop allocating 50 MB chunks until failure. Record the ceiling reached and `pyodide` heap size.
- [ ] **Step 4:** Record the results and choose: (a) `tracemalloc` soft limit in the trace hook, or (b) the fallback structural estimate via `sys.getsizeof` traversal. **Pass:** the behaviour is documented and a fallback is chosen.
- [ ] **Step 5:** Commit: `git commit -m "spike(s4): memory measurement in pyodide"`

### Task 5: S5 — Animation performance of the custom tween approach

**Files:**
- Create: `spikes/s5-animation/{index.html, main.ts, tween.ts, svgBars.ts, canvasBars.ts, vite.config.ts}`
- Create: `docs/spikes/s5-animation.md`

- [ ] **Step 1:** Implement `tween.ts`: `animate(from: Attrs[], to: Attrs[], durationMs: number, onFrame: (attrs: Attrs[]) => void): Promise<void>`, where `Attrs = { id: string; x: number; y: number; h: number }`. Matching is by `id`, interpolation linear with ease-out, driven by `requestAnimationFrame`.
- [ ] **Step 2:** `svgBars.ts` renders 300 `<rect>` bars and runs 200 consecutive random swaps at 450 ms each, at 1× and 8× speed. `canvasBars.ts` does the same with 5,000 bars on Canvas 2D.
- [ ] **Step 3:** Measure frame rate with a `requestAnimationFrame` counter (average and 5th-percentile fps) and dropped frames, in Chrome Performance panel and Firefox, on battery and on AC power.
- [ ] **Step 4:** Record the results. **Pass:** NFR-02: 60 fps with ≤ 300 SVG elements; Canvas renderer handles 5k bars at ≥ 45 fps.
- [ ] **Step 5:** Commit: `git commit -m "spike(s5): svg/canvas tween performance"`

### Task 6: S6 — Universe geometry rendering with semantic zoom

**Files:**
- Create: `spikes/s6-universe/{index.html, main.ts, geometry.ts, vite.config.ts}`
- Create: `docs/spikes/s6-universe.md`

- [ ] **Step 1:** Port the vertex formulas from [PYRAMID_MODEL §2](../PYRAMID_MODEL.md#2-coordinates-and-geometry-normative) into `geometry.ts`. Render 81 tile polygons (rows 0–8) plus 800 synthetic concept circles (≈ 10 per authored tile) as SVG, with `d3-zoom` pan/zoom.
- [ ] **Step 2:** Implement level of detail: concept circles mount only when zoom scale `k ≥ 2.5`, and labels only at `k ≥ 4`.
- [ ] **Step 3:** Measure pan/zoom fps (continuous wheel zoom from k=1 to k=8 and back, plus drag pan) in Chrome and Firefox.
- [ ] **Step 4:** Record the results. **Pass:** 60 fps pan/zoom with 81 tiles + 800 nodes.
- [ ] **Step 5:** Commit: `git commit -m "spike(s6): universe svg + d3-zoom LOD"`

### Task 7: Consolidate findings into decisions

**Files:**
- Modify: `docs/DECISIONS.md` (status column for ADR-003, 004, 005, 006 and any revisions)
- Modify: `docs/PROGRESS.md` (M2.0 row and change log)
- Create: `docs/spikes/SUMMARY.md` (one row per spike: verdict, key number, consequence)

- [ ] **Step 1:** For each ⚗ ADR, set **Accepted** when its spike passed, or write a revised decision when it failed or passed with changes. Example of a revision: if S2 fails the 1.5 s budget, plan the `sys.monitoring` backend for Phase 3 instead of Phase 6.
- [ ] **Step 2:** Record the pinned Pyodide version and its SHA-256 in `docs/spikes/SUMMARY.md`. Phase 3 consumes them.
- [ ] **Step 3:** Commit and push the branch, then open a PR titled "Phase 2A: spike findings".
