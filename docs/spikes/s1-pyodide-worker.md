# Spike S1: Pyodide worker + COOP/COEP

## Question

Does Pyodide run in a module worker under Vite dev **and** a production static server with cross-origin isolation?

## Pass condition

`crossOriginIsolated === true`; Python `1+1` in worker; self-hosted assets

## Setup

- Machine: AMD Ryzen 9 5950X 16-core (32 threads), 63.9 GB RAM, Windows 11 Pro 10.0.26100. Automated via Playwright on owner's laptop.
- Browser: Chromium 159.0.8154.6, Firefox 159.0, WebKit 27.2 (all Playwright builds, Windows, headless).
- Versions: Pyodide 314.0.8 (reports CPython 3.14.2), Vite 8.3.8, Node 22.23.4, Playwright 1.65.x.

## Method

`spikes/s1-pyodide-worker/`: `main.ts` creates a module worker (`new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`); `worker.ts` loads self-hosted Pyodide from `/pyodide/` and answers `{type:"run", code}` with `{type:"result", value, ms}`. The page shows `crossOriginIsolated`, boot time (`performance.now()` from worker creation to `ready`), `1 + 1` and `sys.version`, and exposes them on `window.__s1`.

`measure.mjs` serves the app two ways (Vite dev on :5171; `vite build` output via `serve-prod.mjs` on :4171, which sets COOP `same-origin`, COEP `require-corp`, CORP `same-origin`), and for each of Chromium, Firefox, WebKit does 5 runs. Each run: fresh browser context, cold load (`goto`), then warm load (`reload` in the same context). It records `crossOriginIsolated`, boot ms, results, and checks every request (context-level, so worker and Pyodide fetches included) is to the page's own origin. Rerun with `node s1-pyodide-worker/measure.mjs` from `spikes/`.

## Results

Boot time = worker creation to `ready` (ms), n=5 per cell. All cells: `crossOriginIsolated === true`, `1 + 1` = `2`, `sys.version` = `3.14.2 (main, Nov 13 2026, ...) [Clang 23.0.0git ...]`, 0 requests to a foreign origin (80 requests per page load in prod, 110 in dev).

| Metric | Median | Min | Max |
|---|---|---|---|
| Dev, Chromium, cold | 1639.4 | 1598.7 | 1739.6 |
| Dev, Chromium, warm | 1407.3 | 1362.7 | 1519.8 |
| Dev, Firefox, cold | 1690.8 | 1664.8 | 1698.5 |
| Dev, Firefox, warm | 1660.4 | 1630.1 | 1756.7 |
| Dev, WebKit, cold | 1509.4 | 1485.5 | 1614.7 |
| Dev, WebKit, warm | 1655.9 | 1606.5 | 1801.0 |
| Prod, Chromium, cold | 1613.9 | 1582.8 | 1643.1 |
| Prod, Chromium, warm | 1728.4 | 1624.3 | 1756.2 |
| Prod, Firefox, cold | 1766.2 | 1733.2 | 1847.5 |
| Prod, Firefox, warm | 2013.4 | 1885.5 | 2169.1 |
| Prod, WebKit, cold | 1484.2 | 1472.2 | 1503.5 |
| Prod, WebKit, warm | 1566.8 | 1477.9 | 1649.7 |

Observations: boot is about 1.5-2.0 s everywhere, dominated by wasm compile and stdlib setup, not network (localhost). Warm is not faster than cold in prod because `serve-prod.mjs` sends no validators/cache headers, so a reload refetches; do not read this as a cache result. Playwright WebKit on Windows is not Safari; treat WebKit numbers as indicative only.

## Verdict

PASS WITH CHANGES. All three conditions hold in dev and prod on Chromium, Firefox and WebKit. Two non-obvious changes were required (below).

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
- Boot of about 1.5-2 s needs a loading UX (and is a baseline for S2/S4).
- Safari proper (macOS/iOS) is still untested; Playwright WebKit on Windows is a proxy.
