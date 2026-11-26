# Contributing to AlgoVerse

Thanks for wanting to help. AlgoVerse is a free, open-source lab for data structures, algorithms
and system design, and it gets better every time someone fixes a sentence, adds an example or
argues about a design.

## Ways to join in

| You have… | Do this |
| --- | --- |
| 10 minutes | Answer this week's [design challenge](https://github.com/SMACAcademy/cl_dsa/discussions/categories/q-a), or upvote the answers that teach you something. |
| Spotted a mistake | Use **Suggest an improvement** at the end of any lesson, or [open an issue](https://github.com/SMACAcademy/cl_dsa/issues/new/choose). |
| An hour | Pick a [good first issue](https://github.com/SMACAcademy/cl_dsa/issues?q=is%3Aopen+label%3A%22good+first+issue%22) and open a pull request. |
| An evening | [Add a case study](#add-a-case-study): a real product, designed one decision at a time. |
| An idea | Start a thread in [Ideas](https://github.com/SMACAcademy/cl_dsa/discussions/categories/ideas). |

## Set up

You need Node 22+ and pnpm 10.

```bash
pnpm install
pnpm --filter @algoverse/web dev        # http://localhost:5173
pnpm --filter @algoverse/web test       # all tests
pnpm --filter @algoverse/web typecheck
pnpm --filter @algoverse/web lint       # ESLint + Prettier
```

## Make a pull request

1. Fork the repository and create a branch, e.g. `case-study/podcast-host`.
2. Make your change and run the tests, typecheck and lint above.
3. Open a pull request and fill in the checklist. The **Checks** workflow runs automatically.
4. A maintainer reviews it. Small fixes are usually merged within a few days; once merged, the
   live site updates by itself.

Write in your own words. Don't copy text, diagrams or examples from books, courses or other
sites; explain the idea freshly, with your own numbers and products.

## Add a case study

Case studies live in `apps/web/src/features/systems/cases/`. Each is plain data built with
`caseStudy(meta, steps)`; every step changes the previous step's diagram.

```ts
export const PODCAST_HOST: CaseStudy = caseStudy(
  {
    id: "podcast-host",
    title: "A podcast host with one hit episode",
    tagline: "One episode goes viral overnight. Serve 3 million downloads without a huge bill.",
    minutes: 8,
    level: "beginner",
    tier: "combine",                       // combine (3–4 lessons), integrate (5–8), capstone
    concepts: ["napkin-math", "cdn", "caching"],  // lesson ids from features/systems/lessons
    learn: ["…", "…", "…"],
  },
  [
    {
      kind: "setup", short: "The brief", title: "…", body: ["…"],
      add: [node("listeners", "phone", "Listeners", -4, 0), node("origin", "server", "Origin", 1, 0)],
      link: [link("listeners", "origin", "request")],
    },
    { kind: "problem", short: "…", uses: "napkin-math", title: "…", body: ["…"], quiz: { … } },
    // … more steps: add / set / remove / link / unlink change the picture
    { kind: "recap", short: "Recap", title: "…", body: ["…"], table: { head: […], rows: […] } },
  ],
);
```

Then:

1. Export it from a batch file and add it to the `ALL` list in `cases/index.ts`. It unlocks after
   the module of its latest concept automatically.
2. Add its open design question to `apps/web/src/features/community/challenges.json`.
3. Run the tests. They check that it has 7+ steps, ends with a recap, that every `uses` is one of
   its concepts, that most concepts are used, and that every step renders.

A good case study has real numbers in the brief, one decision per step, at least one "this
breaks" moment, a self-check question, and a recap table of need → decision → lesson.

## Be kind

See the [code of conduct](CODE_OF_CONDUCT.md). Disagree with designs, never with people.
