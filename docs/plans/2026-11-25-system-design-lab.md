# System Design Lab: build plan and progress ledger

Owner direction (2026-11-25): AlgoVerse becomes a **public static site** (no database; progress
in localStorage) with the owner's personal branding linking to LinkedIn. Build the whole
system-design track, with animation better than the reference course
(see [the review](../research/2026-11-24-designed-to-scale-review.md)). The owner waived
per-step approval for routine checks in this build. Pushing, opening PRs, making the repo public
and deploying still need the owner's OK.

Branch: `system-design` (from `phase-2`).

## Approach
- **Lesson format** (`apps/web/src/features/systems/`): each lesson is data (TypeScript):
  steps with a kind (setup · problem · insight · technique · solution · trade-off · case · recap),
  title, short paragraphs, one callout (key idea / good to know / watch out), a "what changed"
  list, live metrics, an optional question with an explanation, an optional table, and a scene.
- **Scene engine**: an isometric SVG diagram. Nodes are 3-D boxes coloured by kind; links carry
  continuous flows of dots (request, response, write, failure, event, replication), drawn with SVG
  `animateMotion` (no JS loop; reduced motion shows static arrows). Nodes keep their identity
  between steps, so they glide to new positions, and new ones pop in.
- **Better than the reference**: a question on most lessons with instant feedback; "built on"
  links to our data-structure players; shareable step URLs (`?step=4`); keyboard control;
  progress ticks; a hands-on lab where one exists (load balancing first); light and dark themes;
  screen-reader descriptions of every scene.
- **Original content**: our own words and our own running example (AlgoVerse itself growing from
  a hobby site to millions of learners). Never copy the reference's text.

## Modules and lessons (status)
| # | Module | Lessons | Status |
|---|---|---|---|
| 01 | Foundations | request-journey, latency-throughput, napkin-math | ✅ |
| 02 | Scaling | scale-up-out, load-balancing (+ lab), stateless, caching, cdn | ✅ |
| 03 | Data & storage | sql-nosql, indexes, storage-engines, replication, sharding, consistent-hashing, unique-ids, cap, consensus, transactions, files-media | ✅ |
| 04 | Communication | apis, queues, pubsub, realtime | ✅ |
| 05 | Reliability | redundancy, rate-limiting, timeouts-retries, observability | ✅ |
| 06 | Architecture | microservices, service-discovery, sagas, batch-stream | ✅ |
| 07 | Security | authentication, authorization, encryption | ✅ |
| 08 | Shipping | testing, cicd | ✅ |
| 09 | Whole systems | hld-lld, url-shortener, news-feed, chat | ✅ |

## Public site
- Vite `base` from `VITE_BASE`; router `basename` from `import.meta.env.BASE_URL`.
- GitHub Pages workflow (build on push to `main`, copy `index.html` to `404.html` for deep links).
- Branding: an About page plus a "Built by" link in the shell, read from `src/branding.ts`
  (name and LinkedIn URL from the owner; empty until given).

## Ledger
- 2026-11-25: plan written; load-balancing lab committed (2e688c5).
- Engine + player (b825d1c). Modules 01–02 (acc88e7). Module 03 (aa8b187).
  Lesson files: `apps/web/src/features/systems/lessons/{foundations,scaling,loadBalancing,data1,data2,data3}.ts`,
  registered in `lessons/index.ts`. Tests: `apps/web/tests/systems.test.tsx` checks every lesson.
- Modules 04–05 (d0c2702), 06–08 (94e4bb4), 09 (0736de7): all 40 lessons done.
- Public site (8d25ee9): VITE_BASE/basename, base-safe PWA, `.github/workflows/pages.yml`,
  og: tags, About page, `src/branding.ts`, lazy lesson routes. Build verified with base `/cl_dsa/`.
- Waiting on the owner: name + LinkedIn URL for `branding.ts`; OK to push and open a PR; making
  the repository public and choosing "GitHub Actions" as the Pages source.
