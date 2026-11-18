# Incident report: three full-system freezes on 2026-11-18

**Status:** root cause identified from logs only (nothing was re-run). Prevention rules are in effect. Two of the mitigations need the owner's action.
**Author:** Claude, for the project owner.

## 1. What you saw

- The whole PC stopped responding. Task Manager listed no processes, and Firefox said there was no internet.
- CPU and memory stayed low (under 5 %).
- A window titled **datamodel-codegen.exe** was open, with an **AVG CyberCapture** banner at the top.
- A hard reset was needed: twice while my helpers were working, and a third time when I re-ran the generator myself.

## 2. Root cause (short version)

**AVG CyberCapture got stuck while sandboxing a brand-new, unsigned helper `.exe` from the project, and the whole PC hung with it.**

- When Python tools are installed with `uv`, each tool gets a small launcher program in `.venv\Scripts\`. Examples are `pytest.exe`, `lint-imports.exe`, `mypy.exe` and `datamodel-codegen.exe`.
- Every launcher is generated on this machine, so its file fingerprint is unique. AVG has never seen it, it has no publisher signature, and so it has no reputation.
- CyberCapture treats every unknown `.exe` as suspicious on its first run. It stops the program, shows its window, and runs the file inside AVG's sandbox (`snx`) to analyse it.
- Sometimes that sandbox analysis **never finished**. While it hangs, AVG's file and network filter drivers stall every program that touches the disk or the network. That explains the empty Task Manager, the "no internet" in Firefox and the idle CPU: the machine was blocked, not busy.

It was **not** caused by a large simulation, a memory leak or heavy CPU use.

## 3. Evidence

All times are IST. AVG logs in UTC; I converted them.

Source: `C:\ProgramData\AVG\Antivirus\log\detections.log`, which has a "snx scan started/finished" line for each sandboxed file, plus the Windows System log (Kernel-Power 41 and EventLog 6008 mark the unexpected shutdowns).

| # | Time | Launched program (first run) | AVG sandbox result | What followed |
|---|---|---|---|---|
| ok | 15:33:13 | `.venv\Scripts\pytest.exe` | finished after 8 s | ran normally |
| **1** | 15:33:28 | `.venv\Scripts\lint-imports.exe` | **never finished** (window closed at 15:34:29) | PC hung. Your own Firefox crashed at 15:47. Shutdown attempts at 15:50 and 15:59 also hung. Hard reset at 16:02. |
| ok | 18:55:56 | `lint-imports.exe` (after reboot) | finished after 1.5 s | ran normally |
| ok | 18:56:00 | `mypy.exe` | finished after 1.9 s | ran normally |
| **2** | 19:40:48 | `.venv\Scripts\datamodel-codegen.exe` | **never finished** (window closed at 19:41:49) | PC hung. Hard reset; last sign of life 20:45. |
| **3** | 20:56:25 | `datamodel-codegen.exe`, re-run by me under a "memory/time guard" | **never finished** (window closed at 20:57:26) | PC hung. Hard reset at about 21:05. |

The **same pattern already happened on 2026-10-11** in your other project, `Options_Horse`:
- 22:02:12: `uvicorn.exe`'s sandbox scan never finished.
- The next AVG start-up was at 22:43, meaning a reboot.

So this is a long-standing interaction between AVG and Python tool launchers, not something new in AlgoVerse.

Things that are **not** the cause:
- Memory exhaustion: no Resource-Exhaustion warnings were logged.
- A GPU or driver crash: no crash dumps and no display-driver resets.
- Docker: it was not running during freezes 2 and 3.
- The browser performance tests: they had finished earlier.

## 4. Who caused it and why it kept happening

- **Trigger:** my helper agents.
  - Freeze 1: the scaffold helper, which ran `pnpm test:py`, `pnpm lint` and `pnpm typecheck`.
  - Freeze 2: the trace-schema helper, which ran `pnpm gen`; that calls `uv run datamodel-codegen`.
  - Freeze 3: **me**. I re-ran the same generator to "test it safely".
- **Mechanism:** AVG CyberCapture's sandbox analysis hung.
- **Why it repeated:**
  1. I diagnosed the problem by guessing at memory and CPU instead of reading the antivirus log first.
  2. My guard only watched memory and time. It cannot see or stop a block inside the antivirus driver. I should not have run anything after two freezes.
  3. Helpers were running commands in the background without asking you. Nobody was watching the screen when the AVG window appeared.
- **What I still can't determine from the logs:** why some first runs pass in seconds (`pytest.exe`, `mypy.exe`) while others hang (`lint-imports.exe`, `uvicorn.exe`, `datamodel-codegen.exe`). That happens inside AVG's sandbox, which does not log its reasons.

## 5. What has already been done (no programs were run)

- All helper agents are stopped. Nothing of mine is running.
- I saved two permanent rules to memory, so future sessions follow them:
  1. **Do not run any program without your explicit approval.** One step at a time, tiny demos only, no large simulations or performance measurements.
  2. **Never launch `.venv\Scripts\*.exe` tool launchers.** Always use `uv run python -m <tool>` instead. That uses the standard `python.exe`, which AVG has never sandboxed in any log.
- The half-finished trace-schema work stays uncommitted on disk, untouched.

## 6. What needs your action (I must not change security settings myself)

1. **Add an AVG exception for the project folder.** In AVG, open Menu → Settings → General → Exceptions → Add exception, and add `E:\Learn3AI\Claude\DSA_Algos\*`. Optionally also add your uv tools folder, `%LOCALAPPDATA%\uv\*`. AVG's exceptions also apply to CyberCapture. This alone would most likely have prevented all three freezes.
2. **Optional:** set CyberCapture to **"Ask me what to do"** instead of automatic analysis. Then an unknown program shows a question instead of being silently sandboxed.

## 7. How I'll prevent this in future

| Risk | Prevention |
|---|---|
| Unknown `.exe` launchers trigger CyberCapture | Project scripts change from `uv run pytest` to `uv run python -m pytest` (likewise `mypy`, `importlinter`, `datamodel_code_generator`, `uvicorn`). After that change, no `.venv\Scripts\*.exe` is ever launched. |
| Programs run without you knowing | I ask before every run, and say exactly what will run and how long it should take. No background helpers run commands. |
| A hang goes unnoticed | Each run is a single, short foreground command. If anything takes longer than expected, I stop and report instead of retrying. |
| Heavy "proof" work | No performance spikes or large simulations. Large cases are explained in words, and demos use tiny inputs (5–8 elements). |
| Diagnosing by reproducing | Freezes are investigated from logs only. |
