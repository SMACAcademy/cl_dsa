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

`spikes/s2-tracer/tracer_proto.py` (177 lines): `trace_source(source, namespace=None, copy_containers=False)` parses the source, rewrites single `Compare` nodes to `_av_cmp(op, l, r)` and non-slice `Subscript` loads/stores to `_av_get` / `_av_set` (tuple and multi-target assignments become a temp plus sequential sets), runs it under `sys.settrace` limited to the user code object, and returns plain-dict events: `call`, `line` (with a locals snapshot), `return`, `compare` (with `leftOrigin`/`rightOrigin` from a per-line `id(value) -> (container, key)` registry) and `write`. Helper names are `_av_*`, not `__av_*` as in the brief, because a double-underscore name is mangled inside class bodies (covered by a test). Slices, augmented subscript assignment, chained compares and starred targets are left unrewritten (spike scope; a test checks they still run correctly).

Benchmark (`worker.ts`, `bench.ts`, `bench.html`): a module worker boots self-hosted Pyodide, loads `tracer_proto.py`, and traces bubble sort on a seeded random list, n = 50, values 0 to 999, mulberry32 seed **20261118** (input recorded in the JSON). Per run it times three stages inside the worker: trace (the Python call), `toJs` (events to JS objects), `JSON.stringify`; total is the sum. 5 runs per variant in one page load per browser. Variants: `shallow` (container locals as `{$type,id,len}` refs, the intended design), `copy` (lists copied one level deep into every snapshot, to show the cost of naive snapshots), and `baseline` (untraced `runPython` of the same program). The Review Focus payload case traces a function with `10**30` and a 5,000-character string in locals.

Assertions on every run, in the worker and again in `measure.mjs` (it exits non-zero on any violation): events > 0, event count identical across runs, result == sorted(input), `JSON.stringify` succeeds and round-trips with the same length, `crossOriginIsolated`, no request leaves the page origin. Payload: the JSON must parse, `big` must equal exactly `{"$bigint":"1000000000000000000000000000000"}`, and the string must be 5,000 characters after the round trip. Rerun: `node s2-tracer/measure.mjs --out ../docs/spikes/data/s2-results.json` from `spikes/` (needs Docker running).

## Results

Bubble sort n = 50: **5,143 events**, 571,138 bytes of JSON (shallow). Times in ms, median / min / max of 5 runs. The first run in a page load is included (it is the slowest in the Docker row).

| Row | Trace | toJs | JSON.stringify | **Total** | Events/s (trace only) | Events/s (total) |
|---|---|---|---|---|---|---|
| **Chromium, mid-range-laptop approximation (Docker `--cpus=0.5`), shallow** | 81.8 / 22.0 / 99.3 | 86.8 / 26.7 / 105.4 | 1.9 / 1.8 / 2.0 | **110.6 / 108.0 / 206.7** | 62,838 | 46,520 |
| Chromium, desktop, shallow | 23.3 / 22.4 / 31.6 | 27.8 / 26.8 / 34.2 | 1.2 / 1.0 / 1.5 | 52.4 / 51.2 / 66.9 | 220,635 | 98,093 |
| Firefox, desktop, shallow | 37.2 / 35.8 / 43.2 | 58.1 / 57.4 / 62.8 | 2.4 / 2.2 / 3.2 | 98.4 / 96.1 / 108.4 | 138,178 | 52,288 |
| WebKit, desktop, shallow | 20.6 / 20.5 / 28.9 | 29.4 / 28.3 / 31.8 | 2.6 / 2.5 / 2.9 | 53.0 / 51.5 / 63.4 | 249,418 | 97,038 |
| Chromium, Docker `--cpus=0.5`, copy snapshots | 121.1 / 117.9 / 171.1 | 132.8 / 108.1 / 171.6 | 4.1 / 3.7 / 59.1 | 291.7 / 230.1 / 363.0 | 42,459 | 17,633 |
| Chromium, desktop, copy snapshots | 66.7 / 62.5 / 74.6 | 56.0 / 55.2 / 61.5 | 2.6 / 2.3 / 2.9 | 125.4 / 121.1 / 135.9 | 77,095 | 40,998 |
| Firefox, desktop, copy snapshots | 177.4 / 108.5 / 191.7 | 254.8 / 131.1 / 261.8 | 9.9 / 5.8 / 10.1 | 446.0 / 248.2 / 459.9 | 28,994 | 11,532 |
| WebKit, desktop, copy snapshots | 64.4 / 62.1 / 68.9 | 62.1 / 60.3 / 63.3 | 4.3 / 4.2 / 4.9 | 130.8 / 126.6 / 134.0 | 79,810 | 39,332 |

Untraced baseline (same program, `runPython`): 1.2 ms Chromium (Docker 1.2), 2.3 Firefox, 1.3 WebKit. Tracing costs roughly 20x to 70x the bare run, but the bare run is tiny; the absolute cost is what matters. Pyodide boot (not part of the pass condition): 1.6 to 1.9 s on desktop, 6.1 s in Docker at 0.5 CPU.

Review Focus payload (all four rows identical): 9 events, 10,609 bytes of JSON, valid on `JSON.parse`. `10**30` is exact (`{"$bigint":"1000000000000000000000000000000"}`) and the 5,000-character string survives unchanged. Serialization rule: Python ints within ±(2^53 - 1) are emitted as plain numbers; larger ones become `{"$bigint": "<decimal string>"}`, so no precision can be silently lost on the JS side; non-finite floats become `{"$float": "inf"}` (JSON has no representation). Without this wrapper Pyodide would hand large ints to JS as `BigInt`, which `JSON.stringify` rejects (not exercised here; only the wrapped form was tested).

Python tests (`uv run --native-tls --python X --with pytest pytest spikes/s2-tracer -q`): **5 passed on 3.12.11 and 5 passed on 3.14.0b2** (the 3 from the brief plus payload JSON fidelity and an unrewritten-constructs test). `--native-tls` was needed on this machine because uv's bundled roots fail behind a TLS-intercepting proxy. The local 3.14 is a beta (3.14.0b2), not 3.14.2; the benchmark itself ran under Pyodide's real CPython 3.14.2. No version-specific behaviour was observed.

## Verdict

**PASS.** Bubble sort n = 50 (5,143 events) is traced, converted and serialized in a median of **110.6 ms** (max 206.7 ms, the first run) on the mid-range-laptop approximation, against a budget of 1,500 ms: about 13x headroom at the median and 7x at the worst run. Desktop browsers take 52 to 98 ms.

Limits of the approximation: `--cpus=0.5` is a CFS quota (50 ms of CPU per 100 ms window), not a half-speed core, so short bursts that fit inside a window run at full desktop speed (visible as trace min 22.0 ms vs median 81.8 ms). A genuinely slower core would scale roughly linearly from the desktop numbers; even a 10x slowdown of the Chromium desktop total (52 ms) stays far under 1.5 s. Only n = 50 on one algorithm was measured; larger inputs should scale about linearly in events (about 220k events/s trace-only on desktop Chromium, 63k/s under the quota), so a 50k-event trace would take about 0.8 s trace-only at the Docker rate, before conversion.

## Consequences for ADRs

- Supports the Phase 3 approach (AST rewrite for compares/subscripts plus `sys.settrace` for line/call/return in Pyodide) as fast enough for educational-size inputs; R1 stays mitigated but not closed for large inputs. The ADR texts were not reviewed here; the controller should map this onto ADR-003/004/005/006.
- Design guidance, not an ADR change: snapshot cost dominates. Copying container contents into every `line` snapshot is about 2.4x slower in total on Chromium (125 vs 52 ms) and 4.5x on Firefox; the roadmap's delta serialization and step limits should avoid it. Snapshots should be refs plus deltas.
- The Pyodide-to-JS boundary (`toJs`) costs as much as tracing itself (28 ms vs 23 ms on Chromium; 58 vs 37 ms on Firefox) while `JSON.stringify` is negligible. Phase 3 should avoid per-event proxy conversion (for example `json.dumps` in Python and one string transfer, or compact arrays); that was not measured here.

## Follow-ups

- Measure `json.dumps` in Python plus one string transfer against `toJs`; measure n = 200+ and a call-heavy recursive algorithm for scaling.
- The value-origin registry is keyed by `id()`, so equal small ints that are the same object (for example `arr[j] == arr[j+1]` with both 5) share one entry and the later read wins. Phase 3 needs the origin passed explicitly through the rewrite instead of an id registry.
- Not instrumented: slices, augmented subscript assignment, chained compares, starred targets, exceptions; no limits on event count or string size (5,000-character strings are emitted in full in every snapshot).
- Re-run the Docker row if a real mid-range laptop becomes available; compare `sys.monitoring` (3.12+) as the Phase 3 backend against this baseline (R1 mitigation).
- `measure.mjs` mounts the host's pnpm Playwright packages into the container because `npm install` inside it fails behind the TLS-intercepting proxy. Docker Desktop had to be started manually before the run.
