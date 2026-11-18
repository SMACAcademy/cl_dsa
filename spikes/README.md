# AlgoVerse spikes (Phase 2A)

Throwaway de-risking experiments (S1-S6) from `docs/ROADMAP.md`, section "M2.0 De-risking spikes".

**Rule: this code is throwaway and is never imported by the real app.** Only the findings are kept, written up in `docs/spikes/` using `docs/spikes/TEMPLATE.md`.

## Setup

```
cd spikes
pnpm install
node fetch-pyodide.mjs s1-pyodide-worker/public/pyodide
```

`fetch-pyodide.mjs <targetDir>` downloads the Pyodide core release pinned in `pyodide-version.txt`, verifies its SHA-256, and extracts it so `pyodide.mjs` and `pyodide.asm.wasm` sit directly in `<targetDir>`. Downloaded assets are git-ignored. Playwright browsers are installed by the spike tasks that need them.
