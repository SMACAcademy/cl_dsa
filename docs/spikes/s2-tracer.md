# Spike S2: Tracer prototype

## Question

`settrace` + AST rewrite of compares/subscripts inside Pyodide: overhead and events/sec

## Pass condition

Bubble sort n=50 traced (≈ 3–5k events) in < 1.5 s on a mid-range laptop

## Setup

- Machine: owner's desktop, AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Not a laptop.
- Mid-range-laptop approximation (R7a): the same Chromium benchmark inside `mcr.microsoft.com/playwright:v1.65.1-noble` with `docker run --cpus=0.5` (cgroup `cpu.max` = `50000 100000`, recorded), production build served inside the container. Docker Desktop VM: Linux 6.18.33.2-microsoft-standard-WSL2, 31.3 GB RAM, Node v26.13.1. Chrome DevTools throttling cannot reach Web Workers (S1), so it is not used.
- Browsers (Playwright builds, headless): Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2.
- Versions: Pyodide 314.0.8 (reports CPython 3.14.2), Vite 8.3.8, Node v22.23.4 (host), Playwright 1.65.1. Pytest ran on CPython 3.12.11 and 3.14.0b2 (see below). All recorded programmatically in `docs/spikes/data/s2-results.json`.

## Method

`spikes/s2-tracer/tracer_proto.py` (177 lines): `trace_source(source, namespace=None, copy_containers=False)` parses the source, rewrites single `Compare` nodes to `_av_cmp(op, l, r)` and non-slice `Subscript` loads/stores to `_av_get` / `_av_set` (an assignment is lowered only when a target stores into a subscript: `tmp = _av_unpack(value, n)`, i.e. `list(value)` with a native-error length check, then sequential sets; plain `a, b = x` keeps native unpacking), runs it under `sys.settrace` limited to the user code object, and returns plain-dict events: `call`, `line` (with a locals snapshot), `return`, `compare` (with `leftOrigin`/`rightOrigin` from a per-line `id(value) -> (container, key)` registry) and `write`. Helper names are `_av_*`, not `__av_*` as in the brief, because a double-underscore name is mangled inside class bodies (covered by a test). Slices, augmented subscript assignment, chained compares and starred targets are left unrewritten (spike scope; a test checks they still run correctly). Semantics preserved, as far as the tests show: generator/set unpacking, wrong-length unpack raising the same ValueError as plain Python (plain and subscript targets), `a, b = b, a`, and subscript swaps emitting two writes. Nothing beyond those tests is claimed; an equivalence suite is Phase 3 work.

Benchmark (`worker.ts`, `bench.ts`, `bench.html`): a module worker boots self-hosted Pyodide, loads `tracer_proto.py`, and traces bubble sort on a seeded random list, n = 50, values 0 to 999, mulberry32 seed **20261118** (input recorded in the JSON). Per run it times three stages inside the worker: trace (the Python call), `toJs` (events to JS objects), `JSON.stringify`; total is the sum. 5 runs per variant in one page load per browser. Variants: `shallow` (container locals as `{$type,id,len}` refs, the intended design), `copy` (lists copied one level deep into every snapshot, to show the cost of naive snapshots), and `baseline` (untraced `runPython` of the same program). The Review Focus payload case traces a function with `10**30` and a 5,000-character string in locals.

Assertions on every run, in the worker and again in `measure.mjs` (it exits non-zero on any violation): events > 0, event count identical across runs, result == sorted(input), `JSON.stringify` succeeds and round-trips with the same length, `crossOriginIsolated`, no request leaves the page origin. Payload: the JSON must parse, `big` must equal exactly `{"$bigint":"1000000000000000000000000000000"}`, and the string must be 5,000 characters after the round trip. Rerun: `node s2-tracer/measure.mjs --out ../docs/spikes/data/s2-results.json` from `spikes/` (needs Docker running).

## Results

Bubble sort n = 50: **5,143 events**, 571,138 bytes of JSON (shallow). Times in ms, median / min / max of 5 runs. The first run in a page load is included (it is the slowest in the Docker row).

| Row | Trace | toJs | JSON.stringify | **Total** | Events/s (trace only) | Events/s (total) |
|---|---|---|---|---|---|---|
| **Chromium, mid-range-laptop approximation (Docker `--cpus=0.5`), shallow** | 84.1 / 24.4 / 99.5 | 82.0 / 25.7 / 101.0 | 1.5 / 1.5 / 1.6 | **112.7 / 108.0 / 202.2** | 61,132 | 45,634 |
| Chromium, desktop, shallow | 22.7 / 22.3 / 30.2 | 25.0 / 24.6 / 31.2 | 0.9 / 0.9 / 1.2 | 48.5 / 48.2 / 62.3 | 227,014 | 105,998 |
| Firefox, desktop, shallow | 36.0 / 35.6 / 41.9 | 53.3 / 52.7 / 56.2 | 2.0 / 1.9 / 2.3 | 91.3 / 90.3 / 100.2 | 142,782 | 56,331 |
| WebKit, desktop, shallow | 21.1 / 20.9 / 27.4 | 29.0 / 27.4 / 33.1 | 2.4 / 2.2 / 2.9 | 52.4 / 50.8 / 62.1 | 243,283 | 98,075 |
| Chromium, Docker `--cpus=0.5`, copy snapshots | 128.7 / 115.6 / 176.3 | 163.4 / 111.1 / 189.0 | 4.5 / 3.5 / 4.6 | 291.7 / 231.2 / 369.8 | 39,950 | 17,629 |
| Chromium, desktop, copy snapshots | 65.5 / 62.7 / 71.5 | 50.7 / 48.6 / 55.8 | 2.4 / 2.2 / 3.0 | 117.8 / 116.0 / 124.6 | 78,561 | 43,666 |
| Firefox, desktop, copy snapshots | 129.3 / 98.0 / 168.6 | 138.3 / 121.1 / 214.6 | 5.9 / 4.8 / 9.5 | 277.1 / 227.7 / 381.5 | 39,776 | 18,557 |
| WebKit, desktop, copy snapshots | 63.9 / 61.8 / 68.5 | 59.2 / 57.7 / 61.2 | 4.4 / 4.2 / 5.6 | 128.8 / 125.6 / 130.3 | 80,536 | 39,930 |

Untraced baseline (same program, `runPython`): 1.1 ms Chromium (Docker 1.2), 1.8 Firefox, 1.1 WebKit. Tracing costs roughly 20x to 70x the bare run, but the bare run is tiny; the absolute cost is what matters. Pyodide boot (not part of the pass condition): 1.6 to 1.9 s on desktop, 6.1 s in Docker at 0.5 CPU.

Review Focus payload (all four rows identical): 9 events, 10,609 bytes of JSON, valid on `JSON.parse`. `10**30` is exact (`{"$bigint":"1000000000000000000000000000000"}`) and the 5,000-character string survives unchanged. Serialization rule: Python ints within ±(2^53 - 1) are emitted as plain numbers; larger ones become `{"$bigint": "<decimal string>"}`, so no precision can be silently lost on the JS side; non-finite floats become `{"$float": "inf"}` (JSON has no representation). Without this wrapper Pyodide would hand large ints to JS as `BigInt`, which `JSON.stringify` rejects (not exercised here; only the wrapped form was tested).

Python tests (`uv run --native-tls --python X --with pytest pytest spikes/s2-tracer -q`): **8 passed on 3.12.11 and 8 passed on 3.14.0b2** (the 3 from the brief plus payload JSON fidelity, an unrewritten-constructs test, and 3 unpacking-semantics tests). `--native-tls` was needed on this machine because uv's bundled roots fail behind a TLS-intercepting proxy. The local 3.14 is a beta (3.14.0b2), not 3.14.2; the benchmark itself ran under Pyodide's real CPython 3.14.2. Per R9, pytest on the local 3.14.0b2 is accepted for this spike because the benchmark asserts correctness on every run inside Pyodide's CPython 3.14.2. One version-specific behaviour: CPython's wrong-length unpack ValueError text differs between 3.12 and 3.14 (3.14 adds "got N" for sized values), so the tracer re-runs a native unpack to raise CPython's own message instead of formatting one.

## Verdict

**PASS.** Bubble sort n = 50 (5,143 events) is traced, converted and serialized in a median of **112.7 ms** (max 202.2 ms, the first run) on the mid-range-laptop approximation, against a budget of 1,500 ms: about 13x headroom at the median and 7x at the worst run. Desktop browsers take 49 to 91 ms.

Limits of the approximation: `--cpus=0.5` is a CFS quota (50 ms of CPU per 100 ms window), not a half-speed core, so short bursts that fit inside a window run at full desktop speed (visible as trace min 24.4 ms vs median 84.1 ms). A genuinely slower core would scale roughly linearly from the desktop numbers; even a 10x slowdown of the Chromium desktop total (49 ms) stays far under 1.5 s. Only n = 50 on one algorithm was measured; larger inputs should scale about linearly in events (about 227k events/s trace-only on desktop Chromium, 61k/s under the quota), so a 50k-event trace would take about 0.8 s trace-only at the Docker rate, before conversion.

## Consequences for ADRs

- Supports the Phase 3 approach (AST rewrite for compares/subscripts plus `sys.settrace` for line/call/return in Pyodide) as fast enough for educational-size inputs; R1 stays mitigated but not closed for large inputs. The ADR texts were not reviewed here; the controller should map this onto ADR-003/004/005/006.
- Design guidance, not an ADR change: snapshot cost dominates. Copying container contents into every `line` snapshot is about 2.4x slower in total on Chromium (118 vs 49 ms) and 3x on Firefox (277 vs 91 ms); the roadmap's delta serialization and step limits should avoid it. Snapshots should be refs plus deltas.
- The Pyodide-to-JS boundary (`toJs`) costs as much as tracing itself (25 ms vs 23 ms on Chromium; 53 vs 36 ms on Firefox) while `JSON.stringify` is negligible. Phase 3 should avoid per-event proxy conversion (for example `json.dumps` in Python and one string transfer, or compact arrays); that was not measured here.

## Follow-ups

- Measure `json.dumps` in Python plus one string transfer against `toJs`; measure n = 200+ and a call-heavy recursive algorithm for scaling.
- The value-origin registry is keyed by `id()`, so equal small ints that are the same object (for example `arr[j] == arr[j+1]` with both 5) share one entry and the later read wins. Phase 3 needs the origin passed explicitly through the rewrite instead of an id registry.
- Not instrumented: slices, augmented subscript assignment, chained compares, starred assignment targets (their subscript stores emit no `write`), exceptions; subscript-target unpacking now materializes the right-hand side with `list()` (an extra O(n) copy per unpack, no timing change measured); no limits on event count or string size (5,000-character strings are emitted in full in every snapshot).
- Re-run the Docker row if a real mid-range laptop becomes available; compare `sys.monitoring` (3.12+) as the Phase 3 backend against this baseline (R1 mitigation).
- `measure.mjs` mounts the host's pnpm Playwright packages into the container because `npm install` inside it fails behind the TLS-intercepting proxy. Docker Desktop had to be started manually before the run.
