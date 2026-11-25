# Review: "System Design" interactive course (designed-to-scale.vercel.app)

Reviewed 2026-11-24 by reading every step of every lesson. Notes are in our own words; no
course text is copied. Purpose: learn what makes it work, and what an even better app would add.

## 1. What it is
A free, single-page web course on **system design**: 40 lessons in 9 modules, each a guided,
animated walkthrough of 8–14 steps (about 10–15 minutes per lesson). It has a hash-routed URL per
step (`#/<lesson>/<step>`), 24 languages, light/dark themes, search, and progress saved in the
browser. Three more sections are already in the menu but say **"coming soon"**:
**Practice**, **Design Lab** and **Cheatsheets**.

## 2. Curriculum (9 modules, 40 lessons)
| Module | Lessons |
|---|---|
| 01 Foundations | How a request travels · Latency & throughput · Napkin math |
| 02 Scaling | Vertical vs horizontal · Load balancing · Stateless services · Caching · CDN |
| 03 Data & Storage | SQL vs NoSQL · Indexes · Storage engines · Replication · Sharding · Consistent hashing · Unique IDs · CAP & consistency · Consensus & leaders · Transactions & isolation · Files & media |
| 04 Communication | REST/RPC/GraphQL · Message queues · Pub/sub & events · Real-time updates |
| 05 Reliability | Redundancy & failover · Rate limiting · Timeouts & retries · Observability |
| 06 Architecture | Monolith vs microservices · Service discovery & gateways · Sagas · Batch & stream |
| 07 Security | Authentication · Authorization · Encryption & secrets |
| 08 Shipping | Testing · CI/CD & deployments |
| 09 Whole Systems | HLD & LLD · Design a URL shortener · Design a news feed · Design a chat system |

The order builds: each recap ends with "Next up", and later lessons point back to earlier ones
(for example, the chat design reuses real-time updates, pub/sub and the registry idea).

## 3. The lesson recipe (the part worth learning from)
Every lesson follows the same pattern:

1. **One story, one running example.** A shop, PhotoShare, a ticket site with one seat left.
   The numbers stay consistent across steps.
2. **Each step is labelled** with what kind of step it is: SETUP, PROBLEM, INSIGHT, TECHNIQUE,
   SOLUTION, TRADE-OFF, RECAP. The rhythm is: a naive design → it breaks → a fix → the fix's
   new problem → a better fix.
3. **"Case:" steps** are realistic failure stories (the celebrity hot key, the cache stampede,
   the migration with no WHERE, the clock stepping back, the 3 a.m. certificate expiry).
4. **Callout boxes** on every step: KEY IDEA, GOOD TO KNOW, WATCH OUT.
5. **"What changed"**: a list of + / − / ~ lines showing exactly what this step added, removed
   or changed (components, metrics such as "p99 600 ms → 190 ms").
6. **A live metrics strip** above the diagram (for example p95 latency, rows read, writes per
   insert) that updates as you step.
7. **Recap** with 4–6 one-line takeaways, sometimes a comparison table, then "Coming up".
8. **"You'll learn" checklist** (5 items) that ticks off as you advance.

## 4. The visual engine
- An **isometric 3-D diagram**: chunky boxes for app servers, databases, caches, queues and
  load balancers on a grid floor, joined by paths.
- **Animated dots travel the paths.** A legend gives each kind its own colour: request,
  response, write, failed request, fan-out job and so on. Heavy work is drawn as a bigger
  square. Waiting shows as dots queued at a box. Health checks show as pulsing rings.
- **The scene morphs from step to step** (boxes appear, fade, die and get promoted) rather
  than being redrawn, so the learner sees what changed.
- Special scenes for some topics, such as the hash ring with virtual-node diamonds.
- Controls: replay (R), pause (Space), ← → to step, Fit, full screen, and a clickable step
  timeline with a short name for each step.

## 5. Product features
- Course menu with module folders, ✓ per lesson and a progress panel (n / 40).
- Search (Ctrl K) across lessons **and individual steps**, showing each step's type badge.
- 24 languages, a dark theme, and a remembered last position and recent lessons
  (localStorage only; no accounts).

## 6. Gaps: where a better app can win
1. **No active learning.** There are no questions, predictions or exercises; the learner only
   watches and reads. (Practice is "coming soon".)
2. **No "you drive" simulation.** The numbers are scripted per step. The learner can't change
   the traffic, kill a server, change W/R, or pick round-robin vs least-connections and see what
   happens. (Design Lab is "coming soon".)
3. **No design exercises with feedback.** The three "Design a…" lessons are walkthroughs, not
   problems the learner solves.
4. **No spaced review or mastery tracking.** "Done" just means visited. Nothing brings ideas
   back later.
5. **No cheatsheets or quick reference yet** ("coming soon"), for example the latency numbers,
   napkin-math formulas or the decision tables.
6. **No code.** The concepts never connect to real code (an LRU cache, a token bucket, a
   consistent-hash ring, Raft voting, Bloom filters) that the learner can run and trace.
7. **Progress lives only in one browser**, with no profiles, streaks or sharing.

## 7. Fit with AlgoVerse
AlgoVerse already has what this course lacks: step-through players with a code panel and the
current line highlighted, "predict the next step" questions, presets and a Random button,
real data structures (LRU cache, Bloom filter, hash tables, heaps, tries, union-find) and a
planned Python tracing engine. The course has what AlgoVerse can borrow: the step-type
rhythm, "Case:" failure stories, the "What changed" list, a live metrics strip, a clear legend,
and search down to the step.

Several lessons depend on our existing DSA topics: B-trees (indexes), LSM-trees and Bloom
filters (storage engines), hashing and binary search (consistent hashing), token buckets
(rate limiting), LRU (caching), queues, heaps and HyperLogLog (stream processing).
That makes a natural "from data structure to system" bridge.
