# Spike S1: Pyodide worker + COOP/COEP

## Question

Does Pyodide run in a module worker under Vite dev **and** a production static server with cross-origin isolation?

## Pass condition

`crossOriginIsolated === true`; Python `1+1` in worker; self-hosted assets

## Setup

- Machine: owner's machine, a desktop (not a laptop): AMD Ryzen 9 5950X 16-Core Processor, 32 logical cores, 63.9 GB RAM, Windows_NT 10.0.26100 (Windows 11 Pro). Automated via Playwright on the owner's desktop. Roadmap budgets assume a mid-range laptop; see the throttled row.
- Browser: Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2 (Playwright builds, Windows, headless).
- Versions: Pyodide 314.0.8 (reports CPython 3.14.2), Vite 8.3.8, Node v22.23.4, Playwright 1.65.1. Recorded programmatically by `measure.mjs`.

## Method

`spikes/s1-pyodide-worker/`: `main.ts` creates a module worker (`new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`); `worker.ts` loads self-hosted Pyodide from `/pyodide/` and answers `{type:"run", code}` with `{type:"result", value, ms}`. The page shows `crossOriginIsolated`, boot time (`performance.now()` from worker creation to `ready`), `1 + 1` and `sys.version`, and exposes them on `window.__s1`.

`measure.mjs` serves the app two ways (Vite dev on :5171; `vite build` output via `serve-prod.mjs` on :4171, which sets COOP `same-origin`, COEP `require-corp`, CORP `same-origin`), and for each of Chromium, Firefox, WebKit (plus a Chromium run with CDP 4x CPU throttle) does 5 runs. Each run: fresh browser context, cold load (`goto`), then warm load (`reload` in the same context). It records `crossOriginIsolated`, boot ms, results, and checks every request (context-level, so worker and Pyodide fetches included) is to the page's own origin. Rerun with `node s1-pyodide-worker/measure.mjs` from `spikes/`.

## Results

Boot time = worker creation to `ready` (ms), n=5 per cell. Raw output: `docs/spikes/data/s1-results.json`. `measure.mjs` asserts on every one of the 80 loads (2 servers x 4 targets x 5 runs x cold/warm) that `crossOriginIsolated === true`, `1 + 1` is `2`, `sys.version` is a Python 3.x string, boot time is present, and no request left the page's origin; it exits non-zero otherwise. Final line: `ASSERTIONS OK: 80 loads checked (isolated, 1+1=2, sys.version, 0 foreign origins); untested: none`. Requests per page load: 8 in prod, 11 in dev. `sys.version` = `3.14.2 (main, Nov 13 2026, 20:18:53) [Cl...`.

| Metric | Median | Min | Max |
|---|---|---|---|
| Dev, Chromium, cold | 1593 | 1576.2 | 1610.5 |
| Dev, Chromium, warm | 1322.2 | 1295.5 | 1360.5 |
| Dev, Firefox, cold | 1692.6 | 1647.6 | 1759.8 |
| Dev, Firefox, warm | 1567.4 | 1472.1 | 1733.3 |
| Dev, Webkit, cold | 1477.7 | 1459.6 | 1515.6 |
| Dev, Webkit, warm | 1615.2 | 1507.8 | 1669.1 |
| Dev, mid-range-laptop approximation (Chromium, 4× CPU throttle; main thread only, NOT applied to worker, see below), cold | 1642.6 | 1599.8 | 1646.9 |
| Dev, mid-range-laptop approximation (Chromium, 4× CPU throttle; main thread only, NOT applied to worker, see below), warm | 1423.6 | 1384.1 | 1463.1 |
| Prod, Chromium, cold | 1590.8 | 1562 | 1619.8 |
| Prod, Chromium, warm | 1652.8 | 1608.6 | 1686 |
| Prod, Firefox, cold | 1693.8 | 1647.7 | 1730.6 |
| Prod, Firefox, warm | 1960.3 | 1887.9 | 2047.6 |
| Prod, Webkit, cold | 1508 | 1481.5 | 1526.2 |
| Prod, Webkit, warm | 1628.1 | 1527.8 | 1649.8 |
| Prod, mid-range-laptop approximation (Chromium, 4× CPU throttle; main thread only, NOT applied to worker, see below), cold | 1694.3 | 1660.9 | 1768.5 |
| Prod, mid-range-laptop approximation (Chromium, 4× CPU throttle; main thread only, NOT applied to worker, see below), warm | 1817.8 | 1787.7 | 1878.7 |

Observations: boot is about 1.3-2.0 s everywhere, dominated by wasm compile and stdlib setup, not network (localhost). Warm is not faster than cold in prod because `serve-prod.mjs` sends no validators/cache headers, so a reload refetches; do not read this as a cache result. Playwright WebKit on Windows is not Safari; treat WebKit numbers as indicative only.

**The 4x throttle row is not a valid laptop approximation.** CDP `Emulation.setCPUThrottlingRate` is applied to the page, and Chromium rejects it for worker targets ("Operation is only supported for pages, not workers"; verified by attaching to the worker target directly). Pyodide runs in the worker, so the throttle never reaches it and the row is statistically the same as unthrottled Chromium. The 4x row is kept to document this. A real laptop estimate needs another method (a slower machine, OS-level CPU limiting of the browser process, or the same page measured on a laptop); until then S1 gives no mid-range-laptop boot figure. Treat the desktop numbers as a lower bound on boot time.

## Verdict

PASS WITH CHANGES (functional verdict: isolation, 1+1, self-hosted). All three conditions hold in dev and prod on Chromium, Firefox and WebKit. Two non-obvious changes were required (below).

Changes needed:

1. **Vite dev cannot dynamic-import Pyodide from `public/`.** `import(indexURL + "pyodide.mjs")` fails in dev: Vite rewrites it to `/pyodide/pyodide.mjs?import` and refuses to serve it (Chromium, Firefox and WebKit all fail; prod is fine). Workaround in `worker.ts`: `new Function("u", "return import(u)")`, which hides the import from Vite. This needs CSP `unsafe-eval` in the worker, so the production app should instead bundle a small loader or import Pyodide via a path Vite treats as an asset (to be decided in the real runtime; verify under the app's CSP).
2. **Vite dev `server.headers` is absent on 304 responses.** On reload, WebKit revalidates the worker script, gets a 304 without COEP, and blocks the worker ("Worker load was blocked by Cross-Origin-Embedder-Policy"). Chromium and Firefox tolerate it. Fix in `vite.config.ts`: a plugin middleware that sets COOP/COEP on every response before Vite's own handlers. Verified WebKit dev reload works afterwards.

## Consequences for ADRs

- ADR-003/004 (Pyodide in a Web Worker): confirmed on 3 engines with Pyodide 314.0.8 (CPython 3.14.2). No change to the choice.
- COOP/COEP isolation (needed for SharedArrayBuffer-based interrupts, S3): confirmed obtainable in dev and prod with fully self-hosted assets. The hosting ADR should state the required headers (COOP `same-origin`, COEP `require-corp`, CORP `same-origin`, `application/wasm` MIME) and that every response, including 304s, must carry them.
- Pyodide must be self-hosted (served from `/pyodide/` under the app origin); no CDN, which would also break COEP without CORP.

## Follow-ups

- Real app: choose a Pyodide loading approach that works in Vite dev without `new Function` (CSP).
- Add ETag/Cache-Control to the production server and re-measure warm loads; consider caching the compiled wasm.
- Find a way to measure on slower hardware (worker CPU throttling is unsupported in Chromium CDP). Boot of about 1.5-2 s needs a loading UX (and is a baseline for S2/S4).
- Safari proper (macOS/iOS) is still untested; Playwright WebKit on Windows is a proxy.
