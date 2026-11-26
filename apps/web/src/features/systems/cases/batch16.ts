import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Reliability ============ */

export const CACHE_STAMPEDE: CaseStudy = caseStudy(
  {
    id: "cache-stampede",
    title: "When the cache goes cold",
    tagline:
      "A news homepage serves 30,000 requests a second from a cache. One expired entry knocks the database over. Find out why, and stop it.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["caching", "timeouts-retries", "rate-limiting", "observability"],
    learn: [
      "See how a single miss becomes thousands",
      "Rebuild once, serve stale meanwhile",
      "Protect the database from the rush",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Fine for months",
      body: [
        "The homepage is built from 40 database queries and cached for 60 seconds. With a 99.9% hit rate, the database sees a gentle trickle while readers get pages in 20 ms.",
      ],
      add: [
        node("readers", "browser", "Readers", -4.4, 0, { sub: "30,000 req/s" }),
        node("app", "server", "Web servers", -1.4, 0),
        node("cache", "cache", "Page cache", 1.4, -1.8, { sub: "60 s" }),
        node("db", "db", "Articles DB", 1.4, 1.8),
      ],
      link: [both("readers", "app", 3), both("app", "cache", 3), both("app", "db", 1)],
    },
    {
      kind: "problem",
      short: "Stampede",
      title: "The entry expires at 09:00:00",
      body: [
        "In the 100 ms after the homepage entry expires, 3,000 requests find it missing and all start rebuilding it. The database, used to a few queries, gets 120,000. Each now takes 2 seconds, so more requests miss, and the pile grows until the database falls over.",
      ],
      set: { db: { state: "down", badge: "overloaded" }, app: { state: "hot" } },
      link: [both("app", "db", 4)],
      metrics: [
        { label: "Rebuilds started", value: "3,000", tone: "bad" },
        { label: "Rebuilds needed", value: "1" },
      ],
    },
    {
      kind: "solution",
      short: "One rebuild",
      uses: "caching",
      title: "Only one request rebuilds",
      body: [
        "The first request to miss takes a short lock for that key and rebuilds the page. Everyone else who misses waits briefly for its result, or is served the old copy. 3,000 rebuilds become one.",
      ],
      set: { db: { state: "ok", badge: "" }, app: { state: "ok" } },
      add: [node("lock", "lock", "Rebuild lock", -1.4, -2.6)],
      link: [both("app", "lock", 1), both("app", "db", 1)],
    },
    {
      kind: "technique",
      short: "Stale",
      uses: "caching",
      title: "Serve stale, refresh early, add jitter",
      body: [
        "Entries now carry two times: “fresh until” (60 s) and “usable until” (10 minutes). After 60 s a request triggers a background refresh but still gets the stale page at once. Lifetimes get a random ±10 s, so thousands of keys don't expire in the same second.",
      ],
      code: [
        "if now < fresh_until: return page",
        "if now < usable_until: refresh_in_background(); return page",
      ],
    },
    {
      kind: "technique",
      short: "Retries",
      uses: "timeouts-retries",
      title: "Retries were multiplying the load",
      body: [
        "During the outage, the apps retried each failed query three times at once, and the browser reloaded too: one reader became up to 12 queries. Now a retry budget allows at most 10% extra calls, retries back off with jitter, and timeouts are shorter than a reader's patience.",
      ],
      quiz: {
        question: "Why can retries turn a slowdown into an outage?",
        options: [
          "Retries use a different database",
          "Each failure adds more requests to a system that is already struggling to keep up",
          "Retries are always slower",
        ],
        answer: 1,
        why: "An overloaded service fails more; failures trigger retries; retries add load. Budgets and back-off break the loop.",
      },
    },
    {
      kind: "solution",
      short: "Shed",
      uses: "rate-limiting",
      title: "A door in front of the database",
      body: [
        "The apps allow at most 50 database queries in flight. Beyond that, a request is answered from stale cache or gets a quick “try again” instead of joining a queue that can only grow. The database stays at the speed it handles well.",
      ],
      add: [node("gate", "gateway", "Max 50 in flight", -0.2, 2.6)],
      unlink: ["app>db"],
      link: [both("app", "gate", 2), both("gate", "db", 1)],
    },
    {
      kind: "solution",
      short: "Watch",
      uses: "observability",
      title: "Watch the hit rate, not just the CPU",
      body: [
        "A dashboard shows the cache hit rate, rebuilds per second and queries in flight. An alert fires if the hit rate drops below 98%, minutes before the database would notice. Deploys that restart the cache now warm the top 1,000 pages first.",
      ],
      add: [node("mon", "monitor", "Cache dashboard", 4.2, 0)],
      link: [link("cache", "mon", "event"), link("gate", "mon", "event")],
      metrics: [
        { label: "Hit rate", value: "99.9%", tone: "good" },
        { label: "Queries in flight", value: "12 of 50", tone: "good" },
      ],
    },
    {
      kind: "case",
      short: "Restart",
      uses: "caching",
      title: "Case: the cache cluster restarts",
      body: [
        "A cache node is replaced during the morning rush. Its keys are empty, but one rebuild per key, stale copies from the other nodes and the 50-query door keep the database calm. Readers see pages a few seconds old, not errors.",
      ],
      set: { cache: { badge: "1 node warming" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A cache that fails gently",
      body: ["The cache was never the problem; the rush behind a miss was."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["One miss, one rebuild", "per-key rebuild lock", "Caching"],
          ["No cliff at expiry", "stale-while-refresh, jittered lifetimes", "Caching"],
          ["No retry storms", "budgets, back-off, short timeouts", "Timeouts and retries"],
          ["Protect the database", "max 50 queries in flight", "Rate limiting"],
          ["See it coming", "hit-rate alert, warm-up on deploy", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Architecture ============ */

export const LOAN_APPLICATION: CaseStudy = caseStudy(
  {
    id: "loan-application",
    title: "A loan application across five checks",
    tagline:
      "A bank's app approves personal loans. Identity, credit, fraud and affordability checks take from seconds to days. No application may get lost or half-done.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["microservices", "queues", "sagas", "timeouts-retries", "observability"],
    learn: [
      "Turn a long request into a tracked process",
      "Undo earlier steps when a later one fails",
      "Never run a credit check twice",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Apply in the app, money in the account",
      body: [
        "A customer applies for a loan. The bank verifies their identity, asks a credit bureau, scores fraud risk and checks affordability. If approved, it opens a loan account and pays the money out.",
      ],
      add: [
        node("cust", "phone", "Customer", -4.4, 0),
        node("app", "server", "Loans app server", -1.2, 0),
        node("bureau", "internet", "Credit bureau", 2.6, -2.6),
      ],
      link: [both("cust", "app", 2), both("app", "bureau", 1)],
    },
    {
      kind: "problem",
      short: "90 s",
      title: "One request, waiting for everything",
      body: [
        "The first version did all checks inside one request. It took 90 seconds, phones gave up, and when the bureau timed out the application was simply lost. Customers applied again, getting two credit checks on their record.",
      ],
      set: { app: { state: "hot", badge: "90 s" }, bureau: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Services",
      uses: "microservices",
      title: "One service per check",
      body: [
        "Each check is its own service owned by the team that knows it: identity, credit, fraud, affordability, accounts. An application service coordinates them and keeps the application's state.",
      ],
      set: { bureau: { state: "ok" } },
      remove: ["app"],
      add: [
        node("apps", "service", "Applications", -1.2, 0, { sub: "coordinator" }),
        node("appdb", "db", "Application state", -1.2, 2.6),
        node("credit", "service", "Credit", 1.4, -1.6),
        node("fraud", "service", "Fraud", 1.4, 0.2),
        node("afford", "service", "Affordability", 1.4, 2),
        node("accounts", "service", "Accounts", 4.2, 1),
      ],
      link: [
        both("cust", "apps", 1),
        link("apps", "appdb", "write"),
        both("apps", "credit", 1),
        both("apps", "fraud", 1),
        both("apps", "afford", 1),
        both("credit", "bureau", 1),
      ],
    },
    {
      kind: "solution",
      short: "Received",
      uses: "queues",
      title: "“Application received” in a second",
      body: [
        "Submitting saves the application and answers at once with a reference number. The checks run as jobs from a queue, and the app shows progress: “identity ✓, credit check in progress”. Closing the app loses nothing.",
      ],
      add: [node("jobs", "queue", "Check jobs", -3.6, -2.6, { queue: 4 })],
      link: [link("apps", "jobs", "write"), link("jobs", "apps", "event")],
    },
    {
      kind: "technique",
      short: "Once",
      uses: "timeouts-retries",
      title: "Retry the bureau without a second check",
      body: [
        "Calls to the bureau time out after 5 seconds and retry with back-off. Every call carries the application id as an idempotency key, and the credit service remembers the answer for that key. A retry can never put a second hard check on the customer's record.",
      ],
      quiz: {
        question: "What makes a retried credit-bureau call safe here?",
        options: [
          "A longer timeout",
          "The application id as an idempotency key, so the same request returns the stored answer",
          "Calling a different bureau",
        ],
        answer: 1,
        why: "Retries are only safe when repeating the call has no new effect. The key makes the second call return the first result.",
      },
    },
    {
      kind: "solution",
      short: "Saga",
      uses: "sagas",
      title: "Approval as a saga with undo steps",
      body: [
        "After approval: reserve the loan in the risk book, open the loan account, pay out. Each step has an undo. If the payout fails (say the customer's account is frozen), the coordinator closes the loan account and releases the reservation, in reverse order.",
      ],
      add: [node("risk", "service", "Risk book", 4.2, -1.6)],
      link: [both("apps", "risk", 1), both("apps", "accounts", 1)],
      changes: [
        { op: "+", text: "reserve → open account → pay out" },
        { op: "-", text: "on failure: close account → release reservation" },
      ],
    },
    {
      kind: "case",
      short: "Review",
      uses: "sagas",
      title: "Case: two days in manual review",
      body: [
        "The fraud score is borderline, so a person reviews the application. The saga is saved in the database, waiting. A timer expires the application after five days without a decision and tells the customer, so nothing waits forever.",
      ],
      set: { fraud: { badge: "manual review" } },
      add: [node("timer", "clock", "Expiry timer", -3.6, 2.6, { sub: "5 days" })],
      link: [link("timer", "apps", "event")],
    },
    {
      kind: "solution",
      short: "Trace",
      uses: "observability",
      title: "Follow one application everywhere",
      body: [
        "Every log line and trace carries the application id. Support can see one customer's whole journey across six services, and a dashboard lists applications stuck in any step for more than an hour.",
      ],
      add: [node("mon", "monitor", "Stuck applications", -3.6, 4.2)],
      link: [link("apps", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every application finished, one way or the other",
      body: ["A tracked process, safe retries and a plan for undoing."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Clear ownership", "one service per check", "Monolith or microservices"],
          ["No 90-second wait", "accept, then queue the checks", "Message queues"],
          ["One credit check", "timeouts, retries, idempotency key", "Timeouts and retries"],
          ["Undo on failure", "saga with compensating steps", "Sagas and distributed transactions"],
          ["Find stuck ones", "application id in every trace", "Observability"],
        ],
      },
    },
  ],
);

export const AD_CLICKS: CaseStudy = caseStudy(
  {
    id: "ad-clicks",
    title: "Counting ad clicks for billing",
    tagline:
      "Advertisers pay per click. Dashboards must update within a minute; invoices must be exact to the click.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["unique-ids", "sharding", "pubsub", "batch-stream"],
    learn: [
      "Count each real click exactly once",
      "Fast numbers from a stream, exact numbers from a batch",
      "Split a hot campaign across workers",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "10 million clicks a day, all billable",
      body: [
        "An ad network shows a billion ads a day and receives 10 million clicks, about 115 a second and 1,000 at peak. Advertisers watch clicks per minute on a dashboard and receive a monthly invoice.",
      ],
      add: [
        node("people", "browser", "People clicking", -4.4, 0),
        node("click", "server", "Click servers", -1.4, 0),
        node("site", "internet", "Advertiser's site", -1.4, -2.8),
      ],
      link: [link("people", "click", "request"), link("click", "site", "response")],
    },
    {
      kind: "technique",
      short: "Ids",
      uses: "unique-ids",
      title: "Each ad view has an id",
      body: [
        "Every ad shown gets a unique id, built into its click link. A double-click, a reload or a bot repeating a link all carry the same id, so a click is counted at most once per ad view, no matter how many times it arrives.",
      ],
      notes: [{ x: -4.4, y: 2.2, text: "imp=7f3a…  clicked 3×, counted 1×", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Log",
      uses: "pubsub",
      title: "Every click into an event log",
      body: [
        "Click servers redirect the visitor at once and publish a click event to a durable log. Independent subscribers read it: the live counter, the fraud filter and the raw archive for billing.",
      ],
      add: [
        node("log", "stream", "Click events", 1.4, 0),
        node("archive", "storage", "Raw archive", 4.2, 2.6),
      ],
      link: [link("click", "log", "event"), link("log", "archive", "write")],
    },
    {
      kind: "solution",
      short: "Live",
      uses: "batch-stream",
      title: "A stream job for the dashboard",
      body: [
        "A stream job counts clicks per campaign per minute, removing duplicates seen in the last hour, and writes the counts within seconds. Dashboards are fresh, but a click arriving late or flagged as fraud tomorrow isn't reflected.",
      ],
      add: [
        node("stream", "worker", "Stream counter", 4.2, -1.4),
        node("dash", "db", "Minute counts", 4.2, -3.8),
      ],
      link: [link("log", "stream", "event"), link("stream", "dash", "write")],
    },
    {
      kind: "solution",
      short: "Exact",
      uses: "batch-stream",
      title: "A nightly batch for the invoice",
      body: [
        "Every night a batch job recounts the whole day from the raw archive, with all duplicates and fraud removed using a full day of data. Its numbers replace the stream's for that day and are what invoices use.",
      ],
      add: [
        node("batch", "worker", "Nightly recount", 1.4, 3.6),
        node("bill", "db", "Billable clicks", -1.4, 3.6),
      ],
      link: [link("archive", "batch", "copy"), link("batch", "bill", "write")],
      quiz: {
        question: "Why keep both a stream count and a nightly batch count?",
        options: [
          "Two counts are twice as accurate",
          "The stream is fast but approximate; the batch sees the whole day and is exact for billing",
          "The batch is faster",
        ],
        answer: 1,
        why: "Speed and completeness pull in different directions. The stream serves the dashboard; the batch, with all the data in hand, serves the money.",
      },
    },
    {
      kind: "technique",
      short: "Partitions",
      uses: "sharding",
      title: "Partition by campaign, split the giants",
      body: [
        "The log is partitioned by campaign id, so one worker sees all of a campaign's clicks and can count them alone. A huge campaign on a big match night would swamp one partition, so its key gets a suffix 0–15, spreading it across 16 workers whose counts are added up.",
      ],
      set: { stream: { sub: "16 partitions" } },
    },
    {
      kind: "case",
      short: "Replay",
      uses: "batch-stream",
      title: "Case: the stream job crashes and replays",
      body: [
        "The counter restarts from its last checkpoint and re-reads five minutes of clicks. Because it writes “campaign 42, minute 10:31 = 812” as an overwrite, not “add 812”, the replay produces the same numbers instead of doubling them.",
      ],
      set: { stream: { state: "hot", badge: "replaying" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast for the dashboard, exact for the bill",
      body: ["Ids decide what one click is; two paths decide how fast and how exact."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["One click, once", "ad-view id in every click", "Unique IDs at scale"],
          ["Many consumers", "durable click event log", "Pub/sub and events"],
          ["Live dashboard", "stream counts per minute", "Batch and stream processing"],
          ["Exact invoices", "nightly batch recount", "Batch and stream processing"],
          ["Hot campaigns", "partition by campaign, salt the giants", "Sharding"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const SECRETS_VAULT: CaseStudy = caseStudy(
  {
    id: "secrets-vault",
    title: "Getting passwords out of the code",
    tagline:
      "Thirty services keep database passwords in config files in git. A laptop with the repository is stolen. Fix it for good.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["encryption", "authentication", "authorization", "observability"],
    learn: [
      "Keep secrets in one encrypted store",
      "Let services prove who they are without a password",
      "Hand out short-lived credentials",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Passwords in plain sight",
      body: [
        "Each service reads its database password from a config file committed to git. Every developer who can read the repository can read production passwords, and old passwords live forever in git history.",
      ],
      add: [
        node("repo", "storage", "Git repository", -4.4, -1.6, { sub: "config.yml" }),
        node("orders", "service", "Orders service", -1.2, 0),
        node("db", "db", "Orders DB", 2.2, 0),
      ],
      link: [link("repo", "orders", "copy"), both("orders", "db", 2)],
    },
    {
      kind: "problem",
      short: "Stolen",
      title: "A laptop goes missing",
      body: [
        "A laptop with a clone of the repository is stolen. Every database password in it must now be treated as known, and changing them means editing thirty configs and redeploying thirty services.",
      ],
      set: { repo: { state: "hot", badge: "leaked" } },
      add: [node("thief", "user", "Someone else", -4.4, 2.4, { hue: "rose" })],
      link: [link("thief", "db", "fail")],
    },
    {
      kind: "solution",
      short: "Vault",
      uses: "encryption",
      title: "One encrypted secrets store",
      body: [
        "Secrets move to a secrets store. Each value is encrypted with a data key, and data keys are encrypted by a master key held in a key-management service that never lets it out. The repository now holds only names like “orders/db”.",
      ],
      set: { repo: { state: "ok", badge: "names only" } },
      remove: ["thief"],
      add: [
        node("vault", "lock", "Secrets store", -1.2, -2.8),
        node("kms", "lock", "Key service", 2.2, -2.8, { sub: "master key" }),
      ],
      link: [both("vault", "kms", 1)],
    },
    {
      kind: "technique",
      short: "Identity",
      uses: "authentication",
      title: "Services prove who they are",
      body: [
        "To ask for a secret, a service needs a credential, but not another password. The platform gives each running service a signed identity (“I am orders, in production”). The store verifies the signature and returns a token valid for 15 minutes.",
      ],
      link: [both("orders", "vault", 1)],
      quiz: {
        question: "Why not give each service a password to log in to the secrets store?",
        options: [
          "Passwords are too short",
          "That password would itself need storing somewhere, moving the problem instead of solving it",
          "The store cannot check passwords",
        ],
        answer: 1,
        why: "An identity the platform signs for each workload ends the chain. A stored password just becomes the new secret to leak.",
      },
    },
    {
      kind: "technique",
      short: "Policy",
      uses: "authorization",
      title: "Each service reads only its own secrets",
      body: [
        "Policies say the orders service may read “orders/*” and nothing else. People get no standing access to production secrets; a break-glass request needs a second approver and expires after an hour.",
      ],
      code: ['allow service="orders" env="prod" read "orders/*"', "deny * (default)"],
    },
    {
      kind: "solution",
      short: "Short-lived",
      uses: "authentication",
      title: "Database logins that expire in an hour",
      body: [
        "Better still, the store creates a fresh database user for each service instance on request, valid for one hour, and deletes it afterwards. A leaked login stops working on its own before anyone can use it for long.",
      ],
      link: [link("vault", "db", "write")],
      set: { db: { badge: "users expire in 1 h" } },
    },
    {
      kind: "solution",
      short: "Audit",
      uses: "observability",
      title: "Every read is recorded",
      body: [
        "The store logs who read which secret, when, from where. An alert fires when a secret is read by an identity that never read it before, or at an unusual rate.",
      ],
      add: [node("audit", "monitor", "Audit log", 2.2, -4.2)],
      link: [link("vault", "audit", "event")],
    },
    {
      kind: "case",
      short: "Rotate",
      uses: "encryption",
      title: "Case: rotating a shared API key",
      body: [
        "A payment partner's API key has to be changed. The store holds the new and old key at once; services pick up the new one within 15 minutes, the old one is revoked after all instances have switched, and nobody redeploys anything.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Nothing worth stealing in the repo",
      body: [
        "Encrypted storage, identities instead of passwords, narrow policies, a record of every read.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Secrets out of git", "encrypted store with a master key", "Encryption and secrets"],
          ["No bootstrap password", "signed workload identity", "Authentication"],
          ["Least access", "per-service policies", "Authorization"],
          ["Know who looked", "audit log with alerts", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Shipping ============ */

export const LOAD_TEST: CaseStudy = caseStudy(
  {
    id: "load-test",
    title: "Load-testing before the big sale",
    tagline:
      "An online shop expects ten times its normal traffic in three weeks. Find the breaking point before customers do.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["napkin-math", "scale-up-out", "observability", "testing"],
    learn: [
      "Set a target with a safety margin",
      "Test with traffic that looks real",
      "Find the first bottleneck and remove it",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Three weeks to the sale",
      body: [
        "The shop runs on 6 web servers and one database. Marketing promises the biggest sale of the year. Nobody knows how much traffic the site can actually take.",
      ],
      add: [
        node("shoppers", "browser", "Shoppers", -4.4, 0),
        node("lb", "lb", "Load balancer", -2, 0),
        node("web", "server", "Web servers", 0.4, 0, { sub: "×6" }),
        node("db", "db", "Shop DB", 3, 0),
      ],
      link: [both("shoppers", "lb", 2), both("lb", "web", 2), both("web", "db", 2)],
    },
    {
      kind: "technique",
      short: "Target",
      uses: "napkin-math",
      title: "Pick a number to aim for",
      body: [
        "Last sale's peak was 800 requests a second. Marketing expects ten times the visitors: 8,000. Add a 50% margin for surprises: the test target is **12,000 requests a second** with 99% of pages under 400 ms.",
      ],
      metrics: [
        { label: "Normal peak", value: "800 /s" },
        { label: "Expected", value: "8,000 /s" },
        { label: "Test target", value: "12,000 /s" },
      ],
    },
    {
      kind: "technique",
      short: "Script",
      uses: "testing",
      title: "Traffic that looks like shoppers",
      body: [
        "The test replays a realistic mix taken from last sale's logs: 70% browsing, 20% search, 8% cart, 2% checkout, with think time between clicks. It runs against a full-size copy of production with test payment cards.",
      ],
      add: [node("gen", "worker", "Load generators", -4.4, -2.6)],
      link: [link("gen", "lb", { kind: "heavy", rate: 3 })],
    },
    {
      kind: "solution",
      short: "Watch",
      uses: "observability",
      title: "Watch the right graphs",
      body: [
        "During the test the team watches p99 latency, error rate and saturation: CPU, memory, database connections, queue lengths. The first resource to hit its limit is the bottleneck.",
      ],
      add: [node("mon", "monitor", "Dashboards", 3, -2.6)],
      link: [link("web", "mon", "event"), link("db", "mon", "event")],
    },
    {
      kind: "case",
      short: "5,000 /s",
      uses: "observability",
      title: "Case: the curve bends at 5,000",
      body: [
        "At 5,000 requests a second, p99 jumps from 180 ms to 3 seconds while CPU is only 40%. The graphs show why: each web server's pool of 100 database connections is full, and requests wait in line for a connection.",
      ],
      set: { web: { state: "hot", badge: "pool full" }, db: { state: "hot" } },
      metrics: [
        { label: "p99 latency", value: "3 s", tone: "bad" },
        { label: "Web CPU", value: "40%" },
      ],
    },
    {
      kind: "solution",
      short: "Scale",
      uses: "scale-up-out",
      title: "Scale out the web tier, up the database",
      body: [
        "A connection pooler lets many web servers share the database's connections efficiently. The web tier grows from 6 to 18 servers (out); the database moves to a machine with twice the CPU and memory for the sale week (up), with read replicas for product pages.",
      ],
      set: {
        web: { state: "ok", badge: "", sub: "×18" },
        db: { state: "ok", sub: "2× size, sale week" },
      },
      add: [
        node("pool", "gateway", "Connection pooler", 1.7, 1.6),
        node("rep", "db", "Read replicas", 3, 2.8, { hue: "teal" }),
      ],
      link: [both("web", "pool", 2), both("pool", "db", 1), link("db", "rep", "copy")],
      quiz: {
        question: "Why scale the web tier out but the database up?",
        options: [
          "Databases cannot run on more than one machine",
          "Stateless web servers are easy to add; a single primary database is simplest to make bigger for one week",
          "Scaling up is always cheaper",
        ],
        answer: 1,
        why: "Adding copies works when copies are interchangeable. The primary database holds the one true state, so a bigger machine (plus replicas for reads) is the quick, safe step.",
      },
    },
    {
      kind: "technique",
      short: "Again",
      uses: "testing",
      title: "Run it again, and for longer",
      body: [
        "The rerun reaches 12,000 requests a second with p99 at 310 ms. A four-hour soak test then finds a slow memory leak in the search service that would have crashed it on the afternoon of the sale; it is fixed a week early.",
      ],
      metrics: [
        { label: "Reached", value: "12,000 /s", tone: "good" },
        { label: "p99", value: "310 ms", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "No surprises on sale day",
      body: ["A target, a realistic test, the right graphs, and a fix for each bottleneck found."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["A goal", "12,000/s with 50% margin", "Napkin math"],
          ["Real behaviour", "replayed traffic mix, soak test", "Testing"],
          ["Find the limit", "latency, errors, saturation", "Observability"],
          ["Remove it", "pooler, more web servers, bigger DB", "Scale up or scale out"],
        ],
      },
    },
  ],
);

/* ============ Whole systems ============ */

export const TICKETING_PLATFORM: CaseStudy = caseStudy(
  {
    id: "ticketing-platform",
    title: "Capstone: a concert ticketing platform",
    tagline:
      "A stadium tour goes on sale at 10:00. 1.5 million fans for 60,000 seats, and bots trying to grab them first. Design the whole platform.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "hld-lld",
      "napkin-math",
      "cdn",
      "caching",
      "rate-limiting",
      "queues",
      "transactions",
      "timeouts-retries",
      "authentication",
      "observability",
    ],
    learn: [
      "Absorb a crowd with a fair waiting room",
      "Hold seats without selling one twice",
      "Keep bots out and payments safe",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "hld-lld",
      title: "Requirements",
      body: [
        "Functional: browse events, pick seats on a map or “best available”, hold them while paying, receive tickets in the app, resell through the platform only.",
        "Non-functional: no seat sold twice; fair access at on-sale time; pages stay up under any crowd; bots shouldn't win.",
      ],
      add: [
        node("fans", "phone", "Fans", -4.4, 0, { sub: "1.5 M at 10:00" }),
        node("api", "gateway", "API", -1.4, 0),
      ],
      link: [both("fans", "api", 3)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "The crowd versus the seats",
      body: [
        "1.5 million fans arrive within 5 minutes: **5,000 new visitors a second**, each refreshing. Only 60,000 seats exist, and checkout can comfortably handle about 500 buyers a minute. Everyone else must wait somewhere harmless.",
      ],
      metrics: [
        { label: "Arrivals", value: "≈ 5,000 /s" },
        { label: "Seats", value: "60,000" },
        { label: "Checkouts", value: "≈ 500 /min" },
      ],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "Event pages from the edge",
      body: [
        "Event pages, images and the venue map are the same for everyone and served by a CDN. Only seat availability and checkout reach our servers.",
      ],
      add: [node("cdn", "cdn", "CDN", -4.4, -2.6)],
      link: [link("cdn", "fans", { kind: "heavy", rate: 3 })],
    },
    {
      kind: "solution",
      short: "Wait room",
      uses: "rate-limiting",
      title: "A waiting room with a fair order",
      body: [
        "At 10:00 everyone who arrived in the last 15 minutes gets a random place in line; later arrivals join the end. The waiting room admits buyers at 500 a minute, the rate checkout can serve, and shows each fan their place and estimated wait.",
      ],
      add: [node("wait", "gateway", "Waiting room", -2.8, 2.4, { sub: "admits 500/min" })],
      unlink: ["fans>api"],
      link: [both("fans", "wait", 3), link("wait", "api", "request")],
      quiz: {
        question: "Why randomize the order of people who arrived before 10:00?",
        options: [
          "To make the queue shorter",
          "So refreshing at 9:59:59.9 or having a faster script gives no advantage among early arrivals",
          "Random numbers are faster to sort",
        ],
        answer: 1,
        why: "Strict first-come rewards whoever has the fastest connection or a bot. Randomizing the early group makes the start fair.",
      },
    },
    {
      kind: "solution",
      short: "Seat map",
      uses: "caching",
      title: "Seat availability from a cache",
      body: [
        "Admitted fans look at the seat map many times before choosing. Availability per section is kept in a cache updated on every hold and sale; the map may lag a second, and the hold step is the real check.",
      ],
      add: [node("seatmap", "cache", "Seat availability", 1.4, -2.4)],
      link: [both("api", "seatmap", 3)],
    },
    {
      kind: "technique",
      short: "Hold",
      uses: "transactions",
      title: "Hold seats atomically for 10 minutes",
      body: [
        "Choosing seats runs one transaction: mark them held for this fan with an expiry time, only if they're free or their old hold has expired. Two fans clicking the same seat can't both win; the loser is offered the next best seats.",
      ],
      add: [node("seats", "db", "Seats", 1.4, 0.4, { sub: "sharded by event" })],
      link: [both("api", "seats", 2), link("seats", "seatmap", "write")],
      code: [
        "UPDATE seats SET held_by = :fan, hold_until = now() + 10 min",
        "  WHERE id IN (:ids) AND (sold = false)",
        "    AND (held_by IS NULL OR hold_until < now())",
        "-- all rows updated, or roll back",
      ],
    },
    {
      kind: "solution",
      short: "Pay",
      uses: "timeouts-retries",
      title: "Payment with a timeout and one key",
      body: [
        "Checkout calls the payment provider with a 10-second timeout and the order id as idempotency key, so a retry never charges twice. If payment fails or the hold expires, the seats return to the pool automatically.",
      ],
      add: [node("pay", "internet", "Payment provider", 4.2, 0.4)],
      link: [both("api", "pay", 1)],
    },
    {
      kind: "solution",
      short: "Tickets",
      uses: "queues",
      title: "Tickets issued from a queue",
      body: [
        "A paid order goes on a queue. Workers generate the tickets, send confirmation emails and update the fan's app. A slow email provider can't slow down the sale itself.",
      ],
      add: [
        node("orders", "queue", "Paid orders", 1.4, 2.6, { queue: 5 }),
        node("issue", "worker", "Ticket issuing", 4.2, 2.6),
      ],
      link: [link("api", "orders", "write"), link("orders", "issue", "event")],
    },
    {
      kind: "technique",
      short: "Bots",
      uses: "authentication",
      title: "Verified fans, not scripts",
      body: [
        "Fans register and verify a phone number before the sale; the waiting room issues each admitted account a signed, single-use pass bound to that session. Limits of 6 tickets per account and per card stop one buyer from sweeping a section.",
      ],
      set: { wait: { badge: "signed passes" } },
    },
    {
      kind: "solution",
      short: "Watch",
      uses: "observability",
      title: "One dashboard for on-sale day",
      body: [
        "The team watches the line length, admissions per minute, hold-to-sale conversion, payment errors and seat-table latency. If payment errors rise, the waiting room slows admissions instead of letting checkouts fail.",
      ],
      add: [node("mon", "monitor", "On-sale dashboard", -1.4, -3.8)],
      link: [link("api", "mon", "event"), link("wait", "mon", "event")],
    },
    {
      kind: "technique",
      short: "Low level",
      uses: "hld-lld",
      title: "The tables underneath",
      body: [
        "High-level boxes rest on a few precise tables. Seats carry their hold; orders link a fan to seats and a payment; a background job releases expired holds every 30 seconds.",
      ],
      code: [
        "seats(event, id, section, row, num, sold, held_by, hold_until)",
        "orders(id PRIMARY KEY, fan, event, seat_ids, status, payment_ref)",
        "INDEX seats(event, section) WHERE sold = false",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Sold out, fairly, with no doubles",
      body: ["Requirements, numbers, then one decision per pressure point."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["What to build", "requirements and tables", "High-level and low-level design"],
          ["Size", "5,000 arrivals/s, 500 checkouts/min", "Napkin math"],
          ["Static pages", "served by a CDN", "Content delivery networks"],
          ["The crowd", "randomized waiting room", "Rate limiting"],
          ["Seat map", "cached availability", "Caching"],
          ["No double sale", "atomic 10-minute holds", "Transactions and isolation"],
          ["Safe payment", "timeout and idempotency key", "Timeouts and retries"],
          ["Ticket delivery", "paid-order queue", "Message queues"],
          ["Bots", "verified accounts, signed passes", "Authentication"],
          ["On-sale day", "line, conversion, error graphs", "Observability"],
        ],
      },
    },
  ],
);
