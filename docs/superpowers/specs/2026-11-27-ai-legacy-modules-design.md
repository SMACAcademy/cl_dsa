# Legacy integration and AI systems: two new modules

Part 2 of 3 (part 1: the Design Lab; part 3: learners bring their own problem).

## Intent

Most real systems are not built from scratch. They sit next to a mainframe that has run a bank
for forty years, a partner who sends a file every night, and, more and more, a language model.
The course so far teaches clean-slate design. These two modules teach the two things working
architects spend their days on: connecting to what already exists, and adding AI safely.

Muthu's goals: show the "next generation integration" view (old systems and AI in one design),
give learners practice with it in the Design Lab, and keep the same quality and style as the
existing 40 lessons.

## Goals

- Module **10 · Legacy integration** (`legacy`): 5 lessons.
- Module **11 · AI systems** (`ai`): 5 lessons.
- 5 new box kinds usable in lessons, case studies and the lab:
  `mainframe`, `files` (a file drop), `llm` (an AI model), `vector` (a vector database),
  `agent` (an AI agent).
- 8 new case studies that unlock after these modules (102 → 110).
- 5 new Design Lab problems (10 → 15), each tied to a new case study.
- All content written in our own words, with invented organisations. No product names, no
  references to outside sources.

## Non-goals

- No live AI calls (the site stays static).
- No vendor-specific detail (no particular cloud, model or database product).
- Bring-your-own-problem (part 3).

## Anti-goals

- Lessons that read as hype: every AI lesson shows the failure modes and costs, not only the wins.
- "Rip and replace" as the default answer for legacy systems; the lessons favour wrapping,
  syncing and gradual replacement.

## Approaches considered

1. **Two new modules after "Whole systems" (chosen).** Module ids and numbers stay stable,
   the existing case-study checkpoints don't move, and the new case studies naturally come last
   because they combine new and old ideas.
2. Fold the lessons into existing modules (CDC into Data, LLM gateway into Communication).
   Scatters the story and reorders checkpoints of existing case studies.
3. One combined "Integration & AI" module of 10 lessons. Too long for one module; the two
   subjects stand on their own.

## Design

### New box kinds

| kind      | icon (lucide) | colour | lab label       |
| --------- | ------------- | ------ | --------------- |
| mainframe | Landmark      | slate  | Mainframe       |
| files     | FolderInput   | green  | File drop       |
| llm       | Brain         | violet | AI model        |
| vector    | Axis3d        | teal   | Vector database |
| agent     | Bot           | violet | AI agent        |

Links into or out of a `files` box default to "sends and moves on", like queues and streams.

### Module 10 · Legacy integration

| id                  | lesson                               | key ideas                                                                                                                                    |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| mainframes          | Mainframes and the core system       | what runs there (accounts, policies), transactions vs nightly batch, cost per use, why it stays, the system of record                        |
| file-batch          | Files and the nightly batch          | file drops, fixed-width records, control totals, landing → validate → load, reruns that don't double-count, missing-file alerts              |
| api-facade          | API façade and anti-corruption layer | one modern API over the old one, translating old codes into clear models, caching reads, protecting capacity, writes through a message queue |
| strangler-fig       | Replacing a system piece by piece    | a routing proxy, moving one route at a time, shadow traffic and comparing answers, rollback by routing, retiring the old part                |
| change-data-capture | Change data capture                  | reading the database's change log, events without touching old code, the outbox, ordering and replays, keeping a new database in sync        |

### Module 11 · AI systems

| id         | lesson                            | key ideas                                                                                                                                                                                    |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| llm-calls  | Calling an AI model               | tokens and context windows, time to first token and streaming, price per token, answers that vary, an LLM gateway (keys, limits, fallback, budgets, logging)                                 |
| rag        | Answering from your own documents | why the model doesn't know your data, chunks and embeddings, a vector database and nearest neighbours, filtering by permission, citing sources, keeping the index fresh                      |
| ai-agents  | Agents and tools                  | the loop (think → call a tool → read the result), tool descriptions, a standard tool protocol (MCP), step and spending limits, human approval for risky actions, idempotent tools            |
| guardrails | Guardrails                        | prompt injection (direct and hidden in documents), least-privilege tools, checking input and output, removing personal data, allow-lists, logging for audit                                  |
| evals-cost | Evals, cost and speed             | a test set of real questions, scoring with rules and with a second model, checking every prompt or model change, routing easy questions to a small model, caching, watching cost and latency |

Each lesson follows the existing format: 9–11 steps, animated scenes, at least one quiz, a recap.

### Case studies (unlock after their last module)

| id                    | case                                                | concepts                                                                                                                  |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| mobile-banking-core   | Mobile banking on a 40-year-old core                | mainframes, api-facade, caching, rate-limiting, authentication                                                            |
| claims-files          | From nightly claim files to same-day payouts        | file-batch, change-data-capture, queues, batch-stream                                                                     |
| orders-strangler      | Replacing a 20-year-old order system                | strangler-fig, change-data-capture, api-facade, testing, cicd                                                             |
| help-centre-assistant | A help-centre assistant that cites its sources      | llm-calls, rag, guardrails, caching, evals-cost                                                                           |
| wiki-assistant        | Ask the company wiki without leaking secrets        | rag, authorization, guardrails, queues                                                                                    |
| rebooking-agent       | An agent that rebooks cancelled flights             | ai-agents, guardrails, sagas, timeouts-retries, observability                                                             |
| invoice-intake        | Reading 50,000 invoices a day with AI               | file-batch, llm-calls, queues, evals-cost                                                                                 |
| ai-claims-desk        | Capstone: an AI claims desk for a mainframe insurer | mainframes, api-facade, change-data-capture, rag, ai-agents, guardrails, evals-cost, queues, observability, authorization |

### Design Lab problems

| id                 | problem                          | checks (points)                                                                                                                                                                                                                                                          | case                  |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| mainframe-balances | Balances from the mainframe      | phones reach the mainframe only via the gateway (15); only the account API talks to the mainframe (20); gateway in front of the account API (15); balances cached (20); payments sent through a queue (20); monitoring (10)                                              | mobile-banking-core   |
| partner-files      | Nightly files from partners      | partners send to a file drop (15); a loader reads the drop (15); partners reach the database only through the loader (20); originals archived (15); bad records to a queue for people (15); monitoring watches the loader (20)                                           | claims-files          |
| strangler-orders   | Swap the order system, gradually | clients reach old and new only via the routing proxy (20); proxy routes to both (15); the new service owns its database (15); changes captured from the old database onto a stream (20); the new service reads the stream (15); monitoring at the proxy (15)             | orders-strangler      |
| help-assistant     | A help assistant with sources    | the model is called only through the LLM gateway (20); users never reach the model except via the assistant (15); the assistant searches a vector database (20); an indexer reads the articles and writes the vectors (25); a cache (10); monitoring at the gateway (10) | help-centre-assistant |
| booking-agent      | An agent that books              | the agent calls the model through the LLM gateway (15); tools only through a tool gateway (20); payments only after an approval step (20); clients reach the agent through the API gateway (15); the agent keeps history in a database (10); every tool call logged (20) | rebooking-agent       |

A new rule helper, `onlyVia(d, target, allowed)`: at least one `target` box is linked, and every
box linked to a `target` matches `allowed`.

### Where it appears

- `/systems` lists the two modules after "Whole systems"; their case studies follow.
- The curriculum page's last stage includes both modules. The universe pyramid keeps its
  1-3-5-7-9 shape and does not gain tiles.
- Each lab problem appears on `/systems/lab`.
- New strings: `lab.kind.*` for the five kinds. Lesson content lives in TypeScript.

## Left to the builder

Scene layouts, the exact wording and numbers in each step, quiz questions, and which hue each
step highlights.
