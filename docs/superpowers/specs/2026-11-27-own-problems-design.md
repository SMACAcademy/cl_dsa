# Design Lab: bring your own problem

Part 3 of 3 (part 1: the Design Lab; part 2: legacy integration and AI systems).

## Intent

The 15 set problems teach with a fixed brief and a known answer. Learners also want to practise
on the problem in front of them: an interview question, a work project, an idea. Part 3 lets them
write their own problem, draw a design for it, get general automatic checks, and get detailed
feedback from an AI assistant of their choice, without the site needing a server or API key.

## Goals

- From `/systems/lab`: "Bring your own problem", with a blank start or a set problem's brief as a
  starting point. Any number of own problems, kept in this browser.
- `/systems/lab/own/:ownId`: title, problem statement and requirements (one per line), all saved
  as you type; the same canvas as the set problems with every box kind in the palette.
- **General checks** that hold for most designs, each saying when it applies. Checks that don't
  apply to this design are shown as "Not applicable" and left out of the score.
- **Review with AI**: a ready-made prompt with the problem, the design written out in words, and
  the check results, plus clear questions for the reviewer. Copy it with one click, or select it
  from a text box, and paste it into any AI assistant.
- Delete an own problem (two-step confirm).

## Non-goals

- No AI calls from the site and no API keys (static site; nothing leaves the browser unless the
  learner pastes it somewhere).
- No sharing links or accounts.
- Own problems don't count towards progress or "done".

## Approaches considered

1. **General checks plus a copy-a-prompt review (chosen).** Works offline and free; the prompt
   carries everything an assistant needs.
2. **Learner supplies an API key, the site calls a model.** Keys in a browser are easy to leak,
   and it ties the site to particular vendors.
3. **Learner writes their own checks.** Too hard for the people who need feedback most.

## Design

### General checks (`lab/general.ts`)

`Check` gains an optional `applies(d)`. `grade` skips checks that don't apply: the score is
passed points over applicable points; a design where nothing applies scores 0.

| id        | check                                                                       | applies when                        | points |
| --------- | --------------------------------------------------------------------------- | ----------------------------------- | ------ |
| connected | Every box is connected (at least two boxes)                                 | always                              | 15     |
| users     | People or apps use the system                                               | always                              | 10     |
| front     | Users reach servers only through a load balancer, gateway or CDN            | a server or service exists          | 15     |
| spare     | More than one copy of the app                                               | a server or service exists          | 15     |
| data      | Users reach stored data only through your code                              | a store exists                      | 15     |
| async     | Workers are fed by a queue, stream or file drop, without waiting            | a worker exists                     | 10     |
| shared    | Services don't share a database                                             | two or more services and a database | 10     |
| ai        | The AI model is reached only through a gateway                              | an AI model exists                  | 10     |
| legacy    | The mainframe is reached only through a service, worker, queue or file drop | a mainframe exists                  | 10     |
| watch     | Monitoring is connected                                                     | always                              | 10     |

### Storage

`algoverse.labown.v1`: a list of `{ id, title, brief, requirements, draft, updated }`, read with
validation (bad entries dropped) and cleared by "Reset progress".

### The prompt

Written in en.json so it can be translated later: the reviewer's role; the problem; the boxes
(label and kind) and connections ("waits for a reply" / "sends and moves on"); the general check
results; then the asks: each requirement met or not, the biggest risks (single points of failure,
bottlenecks, data loss, security), up to five changes most important first, what is good, and
scores out of 10 for requirements, scale, reliability, security and simplicity. If something is
unclear, the reviewer states an assumption and carries on.

### Code shape

The editor (palette, canvas, inspector, connections, check button, result list) moves into
`DesignEditor.tsx` with props for the palette, the checks, the starting design, a change
callback and extra result content. `DesignLabPage` (set problems) and `OwnProblemPage` both use it.

## Left to the builder

Wording, the exact layout of the problem form, and how the prompt is shown.
