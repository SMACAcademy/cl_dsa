# Case studies: design and catalogue

Goal: after every module, learners apply what they know to real products, and the products grow
with the course. A case study only combines lessons already taught (it unlocks after the module of
its last concept), every step names the concept it applies, and the architecture is built one
decision at a time on the same animated diagram. Over time this grows to several hundred studies.

## How a case study is written

- Code: `apps/web/src/features/systems/cases/` — `caseStudy(meta, steps)` builds the scenes, each
  step adding, changing or removing parts of the previous picture (`add`, `set`, `remove`, `link`,
  `unlink`, `zones`).
- Every study: a brief with the numbers, 6–12 steps that each `uses` one lesson, at least one
  self-check question, and a recap table "concern → decision → lesson".
- Tiers: **combine** (3–4 lessons), **integrate** (5–8), **capstone** (most of the course).
- Tests (`tests/systems.test.tsx`) check that every concept exists, each `uses` is one of the
  study's concepts, most concepts are applied, links are valid, and every step renders.
- Variety rule: every study is a different product or domain; shared shapes (feeds, queues,
  ledgers) appear in new settings so ideas transfer.

## Progression

| Checkpoint (after) | What studies combine                                                                                    | Target count |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------ |
| 01 Foundations     | estimating, tracing, latency                                                                            | 10           |
| 02 Scaling         | + scale out, balancers, stateless, caches, CDNs                                                         | 25           |
| 03 Data & storage  | + SQL/NoSQL, indexes, engines, replication, sharding, hashing, ids, CAP, consensus, transactions, files | 60           |
| 04 Communication   | + APIs, queues, pub/sub, real time                                                                      | 45           |
| 05 Reliability     | + redundancy, rate limits, timeouts, observability                                                      | 40           |
| 06 Architecture    | + services, discovery, sagas, batch/stream                                                              | 40           |
| 07 Security        | + authentication, authorization, encryption                                                             | 30           |
| 08 Shipping        | + testing, CI/CD                                                                                        | 20           |
| 09 Whole systems   | capstones drawing on everything                                                                         | 30           |

## Built (50 studies)

- Batch 1: results day 1 and 2 · recipe blog · library catalogue · train booking · ride locations ·
  food delivery · video lectures · payments · marketplace checkout · school single sign-on ·
  AlgoVerse at ten million learners.
- Batch 2: cricket scores · breaking news · festival grocery · hospital appointments · bank ledger ·
  key–value store · live auction · whiteboard · public API · status page · clickstream analytics ·
  health records.
- Batch 3: course registration · docs site worldwide · mobile game launch · warehouse inventory ·
  photo backup · multi-tenant SaaS database · multiplayer quiz · push notifications · SMS one-time
  codes · travel booking saga · real-time fraud checks · file sharing with links · zero-downtime
  database migration (the first Shipping checkpoint study).
- Batch 4: election-night results · coding contest start · chat history store · factory sensor
  readings · order webhooks · support ticket desk · sign-in under attack · splitting a monolith ·
  recommendations · password manager sync · API keys · daily deploys · capstone: a video-sharing
  platform (the first Whole-systems study).

## Planned catalogue (next batches)

Concept ids refer to lesson ids in `lessons/`.

### After Foundations

- Cricket score app on match day — napkin-math, latency-throughput, request-journey
- A city's tax-filing deadline night — napkin-math, latency-throughput
- Weather app for a cyclone warning — request-journey, napkin-math, latency-throughput
- University course registration opening — napkin-math, latency-throughput
- Election-night results page — napkin-math, request-journey, latency-throughput

### After Scaling

- News site on a breaking story — cdn, caching, load-balancing, napkin-math
- Online grocery on festival eve — scale-up-out, load-balancing, stateless, caching
- Government form portal on the last day — load-balancing, stateless, scale-up-out
- Open-source docs site worldwide — cdn, caching
- Podcast host with one hit episode — cdn, napkin-math, caching
- Mobile game launch day — scale-up-out, load-balancing, stateless, cdn
- Restaurant reviews read-heavy site — caching, cdn, load-balancing
- Webinar sign-up page for 200k — stateless, load-balancing, caching
- Image gallery for a wedding photographer — cdn, caching, napkin-math
- Coding contest problem pages at start time — caching, cdn, scale-up-out

### After Data & storage

- Hospital appointment booking — transactions, indexes, replication
- Bank account ledger — transactions, replication, consensus, unique-ids
- E-commerce product catalogue — sql-nosql, indexes, caching, cdn
- URL bookmarks with tags — sql-nosql, indexes, sharding
- Chat message history store — storage-engines, sharding, unique-ids
- IoT sensor readings from a factory — storage-engines, sharding, replication
- Global user profiles in three regions — replication, cap, caching
- Inventory across 200 warehouses — transactions, sharding, cap
- Leaderboards for a mobile game — caching, sharding, indexes
- Distributed lock for a job scheduler — consensus, cap
- Feature-flag configuration store — consensus, replication, caching
- Document storage for a legal firm — files-media, indexes, replication
- Recipe search with filters — sql-nosql, indexes, caching
- Hotel room inventory — transactions, sharding, caching, cap
- Stock price history — storage-engines, sharding, replication
- Multi-tenant SaaS database — sharding, indexes, replication
- Sports betting odds store — cap, replication, caching, transactions
- Photo backup app — files-media, sharding, replication, unique-ids
- Shared shopping list across devices — cap, replication, unique-ids
- Key–value store from scratch — consistent-hashing, replication, cap, storage-engines

### After Communication

- Ride-sharing trip lifecycle — pubsub, realtime, transactions, queues
- Email newsletter sender — queues, pubsub, apis
- Collaborative whiteboard — realtime, pubsub, cap
- Order status webhooks for merchants — queues, apis, pubsub
- Live auction — realtime, transactions, queues
- Push notifications at scale — queues, pubsub, apis
- Public REST API for a library — apis, caching, indexes
- GraphQL gateway for a mobile app — apis, caching, replication
- Live sports commentary — realtime, pubsub, cdn
- Background report generation — queues, files-media, pubsub
- Customer-support ticketing — queues, pubsub, indexes
- Multiplayer quiz game — realtime, pubsub, caching
- Calendar invites across companies — apis, queues, transactions
- Stock ticker to a million screens — realtime, pubsub, cdn

### After Reliability

- Payment gateway outage drill — redundancy, timeouts-retries, observability
- Public API with fair use — rate-limiting, apis, observability
- Status page that stays up — redundancy, cdn, caching
- Login under a credential-stuffing attack — rate-limiting, observability
- SMS one-time codes with a flaky provider — timeouts-retries, queues
- Multi-region read path — redundancy, replication, cap
- Search service with a slow dependency — timeouts-retries, caching
- Alerting that doesn't wake people at night — observability
- Video streaming during a regional outage — redundancy, cdn
- Checkout with a third-party tax service — timeouts-retries, rate-limiting

### After Architecture

- Splitting a monolith shop — microservices, sagas, pubsub
- Travel booking saga — sagas, timeouts-retries, queues
- Clickstream analytics — batch-stream, queues, storage-engines
- Recommendation pipeline — batch-stream, caching, pubsub
- Fraud detection in real time — batch-stream, pubsub, rate-limiting
- Service mesh for 50 services — service-discovery, timeouts-retries, observability
- Data warehouse nightly loads — batch-stream, storage-engines
- Order fulfilment across services — sagas, pubsub, transactions
- Search indexing pipeline — batch-stream, pubsub, sql-nosql
- Notification preferences service — microservices, caching, pubsub

### After Security

- Healthcare records portal — authentication, authorization, encryption
- Multi-tenant SaaS admin — authorization, sharding
- Password manager sync — encryption, cap, replication
- Banking app sessions — authentication, rate-limiting, encryption
- API keys for developers — authentication, rate-limiting, observability
- File sharing with links — authorization, files-media, encryption
- Exam proctoring uploads — files-media, authentication, encryption

### After Shipping

- Zero-downtime database migration — cicd, testing, replication
- Weekly releases to daily deploys — cicd, testing, observability
- Feature flags for a risky launch — cicd, observability
- Mobile app with old versions in the wild — apis, cicd, testing

### Capstones (Whole systems)

- A social network — news-feed ideas, sharding, caching, realtime, pubsub
- A video platform — files-media, cdn, queues, batch-stream
- A ride-hailing company — realtime, sharding, transactions, pubsub
- A marketplace — microservices, sagas, search, payments
- An online exam platform — redundancy, rate-limiting, realtime, security
- A messaging app — chat ideas, encryption, realtime, storage-engines
- A maps and navigation service — sharding, caching, cdn, batch-stream
- A banking core — transactions, consensus, redundancy, security
- A collaborative document editor — realtime, cap, storage-engines
- A global e-learning platform (AlgoVerse itself) — everything
