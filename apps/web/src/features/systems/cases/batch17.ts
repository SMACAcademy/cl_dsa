import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Legacy integration ============ */

export const MOBILE_BANKING_CORE: CaseStudy = caseStudy(
  {
    id: "mobile-banking-core",
    title: "Mobile banking on a 40-year-old core",
    tagline:
      "Five million customers get a modern app, while every balance still comes from the mainframe and its capacity budget stays fixed.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["mainframes", "api-facade", "caching", "rate-limiting", "authentication"],
    learn: [
      "Keep new apps away from the core's quirks",
      "Serve most balances without touching the core",
      "Hold the core to a fixed budget on the busiest morning",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "mainframes",
      title: "A new app, an old heart",
      body: [
        "A bank's 30 million accounts live on a mainframe. Branches use it all day. The bank is launching a mobile app for 5 million customers, and the core team has one rule: the app may use no more than 800 core transactions a second, because extra capacity is very expensive.",
      ],
      add: [
        node("app", "phone", "Mobile app", -4.4, 0, { sub: "5 million customers" }),
        node("core", "mainframe", "Core banking", 3.6, 0, {
          size: 1.4,
          sub: "max 800 tx/s for the app",
        }),
        node("branch", "browser", "Branches", 3.6, 3),
      ],
      link: [both("branch", "core", 2)],
    },
    {
      kind: "problem",
      short: "Direct",
      title: "The first prototype calls the core",
      body: [
        "The prototype calls the core from the app servers. In a load test, every app launch makes five core calls, the old status codes appear on screen (“ST 07”), and at 2,000 users a second the core budget is gone.",
      ],
      add: [node("srv", "server", "App servers", -1.4, 0)],
      set: { core: { state: "hot", badge: "budget gone" } },
      link: [both("app", "srv", 3), both("srv", "core", 4)],
    },
    {
      kind: "solution",
      short: "Façade",
      uses: "api-facade",
      title: "One Accounts API in front",
      body: [
        "An Accounts API becomes the only thing that talks to the core. It turns `ST 07` into `dormant`, amounts in cents into decimals with a currency, and offers clean calls like “balance” and “last 20 transactions”. The app servers use only this API.",
      ],
      add: [node("api", "service", "Accounts API", 1, 0, { sub: "the only core caller" })],
      set: { core: { state: "ok", badge: "" } },
      unlink: ["srv>core"],
      link: [both("srv", "api", 3), both("api", "core", 2)],
    },
    {
      kind: "solution",
      short: "Sign-in",
      uses: "authentication",
      title: "Who is asking, checked once",
      body: [
        "Customers sign in with the app's login and a device check, and get a short-lived token. A gateway checks the token on every request and passes the verified customer id on. The Accounts API only returns accounts that belong to that customer, never whichever account number the app sends.",
      ],
      add: [
        node("gw", "gateway", "Gateway", -2.8, -2.2, { sub: "checks tokens" }),
        node("auth", "service", "Sign-in", -4.4, -3.6),
      ],
      unlink: ["app>srv"],
      link: [both("app", "gw", 3), both("gw", "srv", 3), both("app", "auth", 1)],
    },
    {
      kind: "technique",
      short: "Cache",
      uses: "caching",
      title: "Most balances never reach the core",
      body: [
        "The Accounts API caches each balance for 30 seconds and recent transactions for a minute, always shown with an “as of” time. A payment clears that customer's entries, so they see the change at once.",
      ],
      add: [node("cache", "cache", "Balance cache", 1, -2.8, { sub: "30 s" })],
      link: [both("api", "cache", 3), both("api", "core", 1)],
      metrics: [
        { label: "Answered by the cache", value: "88%", tone: "good" },
        { label: "Core use", value: "340 tx/s", tone: "good" },
      ],
    },
    {
      kind: "solution",
      short: "Budget",
      uses: "rate-limiting",
      title: "Two kinds of limit",
      body: [
        "The gateway limits each customer (a stuck app can't make 50 calls a second). The Accounts API holds the core to 800 transactions a second in total. Above that it answers from the cache, even if slightly older, and asks the app to retry payments in a moment.",
      ],
      set: { gw: { badge: "per customer" }, api: { badge: "≤ 800 tx/s" } },
      quiz: {
        question: "Why have a total limit in the Accounts API as well as per-customer limits?",
        options: [
          "Per-customer limits alone can't stop millions of well-behaved customers adding up to more than the core can take",
          "Because the gateway can't count requests",
          "To make the app slower on purpose",
        ],
        answer: 0,
        why: "Each customer can be within their limit while the total still breaks the core's budget. The total limit protects the shared resource.",
      },
    },
    {
      kind: "technique",
      short: "Payments",
      uses: "mainframes",
      title: "Payments through the core's queue",
      body: [
        "Payments go onto a message queue that the core reads, each with a unique key, so a retried payment is never paid twice. During the nightly batch the core is read-only for two hours; payments wait in the queue, shown as “scheduled”, and are processed after the batch.",
      ],
      add: [node("mq", "queue", "Payment queue", 2.4, 2.4)],
      link: [link("api", "mq", "event"), link("mq", "core", "event")],
    },
    {
      kind: "case",
      short: "Payday",
      uses: "caching",
      title: "Case: payday at 07:00",
      body: [
        "On the first of the month salaries arrive overnight and 2 million customers open the app between 07:00 and 08:00. The cache answers most repeat checks, the core runs at 70% of the app's budget, and branches don't notice a thing.",
      ],
      set: { app: { badge: "2 million opens" }, core: { badge: "70% of budget" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A modern app on an old core",
      body: ["The core stayed exactly as it was; everything new was built in front of it."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["No old codes in the app", "one Accounts API that translates", "API façade"],
          ["Only your own accounts", "verified customer id from the gateway", "Authentication"],
          ["Few core calls", "30-second balance cache with an as-of time", "Caching"],
          ["Fixed core budget", "per-customer and total limits", "Rate limiting"],
          ["Safe payments, even at night", "keyed messages on the core's queue", "Mainframes"],
        ],
      },
    },
  ],
);

export const CLAIMS_FILES: CaseStudy = caseStudy(
  {
    id: "claims-files",
    title: "From nightly claim files to same-day payouts",
    tagline:
      "An insurer pays repair claims three days after they happen. Make it the same day, without asking 40 garages to rebuild their systems.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["file-batch", "change-data-capture", "queues", "batch-stream"],
    learn: [
      "Load partner files safely and quickly",
      "React to new claims without touching the old app",
      "Keep a nightly batch where it still helps",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Three days to pay",
      body: [
        "Forty garages send a file of repair claims every night. The next morning the claims system loads them; a day later a check job runs; a day after that, payouts go out. Customers wait three days for money for a repair they already paid for.",
      ],
      add: [
        node("garages", "internet", "Garages", -4.4, 0, { sub: "40 partners" }),
        node("drop", "files", "Drop folder", -2, 0),
        node("claims", "server", "Claims system", 0.6, 0, { sub: "15 years old" }),
        node("cdb", "db", "Claims DB", 3.2, 0),
      ],
      link: [
        link("garages", "drop", "file"),
        link("drop", "claims", "event"),
        both("claims", "cdb", 2),
      ],
    },
    {
      kind: "solution",
      short: "Loading",
      uses: "file-batch",
      title: "First, load files properly",
      body: [
        "Before going faster, loading must be safe. Files are picked up only when complete, copied untouched to an archive, and checked against their trailer counts. Bad rows go to a fix-up list for staff. Each claim is written by its claim number, so reloading a file never creates duplicates.",
      ],
      add: [
        node("arch", "storage", "Archive", -2, -2.8),
        node("fix", "queue", "Rows to fix", 0.6, 2.8),
      ],
      link: [link("drop", "arch", "copy"), link("claims", "fix", "event")],
    },
    {
      kind: "solution",
      short: "Smaller",
      uses: "file-batch",
      title: "Smaller files, more often",
      body: [
        "The ten biggest garages, with 70% of the claims, agree to send a file every 15 minutes instead of once a night. Their software already writes files; only the schedule changes. The others stay nightly.",
      ],
      set: { garages: { badge: "10 send every 15 min" } },
      metrics: [{ label: "Claims arriving the same day", value: "70%", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Capture",
      uses: "change-data-capture",
      title: "Every new claim becomes an event",
      body: [
        "The claims system is old and nobody wants to change it. Instead, a change-capture tool reads the claims database's change log and publishes each new or updated claim as an event. The old system has no idea; it just keeps loading files.",
      ],
      add: [
        node("cap", "worker", "Change capture", 3.2, 2.6),
        node("stream", "stream", "Claim events", 5, 0.8),
      ],
      link: [link("cdb", "cap", "copy"), link("cap", "stream", "event")],
    },
    {
      kind: "technique",
      short: "Checks",
      uses: "queues",
      title: "Checks as jobs on a queue",
      body: [
        "Each claim event becomes a job: check the policy covers it, check for fraud signals, then approve small claims automatically. Workers take jobs from a queue; a failing check retries with back-off, and after three failures the claim goes to a person.",
      ],
      add: [node("q", "queue", "Check jobs", 5, 3.4), node("w", "worker", "Checkers", 2.6, 4.2)],
      link: [link("stream", "q", "event"), link("q", "w", "event")],
    },
    {
      kind: "technique",
      short: "Keep batch",
      uses: "batch-stream",
      title: "The nightly batch still has a job",
      body: [
        "Same-day decisions come from the stream. But every night a batch job still compares the day's paid total with the files' trailer totals and the finance system, and flags any difference. Streaming for speed, batch for the books.",
      ],
      add: [node("night", "clock", "Nightly check", -4.4, 3.2)],
      link: [link("night", "cdb", "heavy")],
      quiz: {
        question: "Why keep a nightly batch once claims are processed as they arrive?",
        options: [
          "Streams can't carry money",
          "A complete, end-of-day comparison catches anything the fast path missed or double-counted",
          "The garages require it",
        ],
        answer: 1,
        why: "Streaming makes decisions quickly, claim by claim. A daily reconciliation over everything is the safety net that proves the totals add up.",
      },
    },
    {
      kind: "case",
      short: "Resent",
      uses: "file-batch",
      title: "Case: the garage that resent yesterday",
      body: [
        "A garage's system crashed and resent yesterday's file along with today's. Because loads are keyed by claim number, the 600 old claims replaced themselves. The change log showed no real change, so no events and no second payouts.",
      ],
      set: { drop: { badge: "yesterday again" } },
      metrics: [{ label: "Duplicate payouts", value: "0", tone: "good" }],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Same day, same old system",
      body: ["No garage rebuilt anything, and the old claims system wasn't changed at all."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          [
            "Safe loads and reruns",
            "complete files, trailer checks, keyed writes",
            "Files and batch",
          ],
          ["Faster arrival", "15-minute files from the biggest garages", "Files and batch"],
          ["React to new claims", "change capture onto a stream", "Change data capture"],
          ["Checks that survive failures", "jobs on a queue with retries", "Queues"],
          ["Books that balance", "nightly reconciliation batch", "Batch and stream"],
        ],
      },
    },
  ],
);

export const ORDERS_STRANGLER: CaseStudy = caseStudy(
  {
    id: "orders-strangler",
    title: "Replacing a 20-year-old order system",
    tagline:
      "Move a retailer's order system to new services one route at a time, with every step tested and reversible.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["strangler-fig", "change-data-capture", "api-facade", "testing", "cicd"],
    learn: [
      "Put a proxy in front before writing new code",
      "Feed new services from the old database safely",
      "Prove each slice before shoppers depend on it",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One big system, 600 rules",
      body: [
        "A retailer's order system handles checkout, tracking, returns and invoices for 40,000 orders a day. It's one application with one database, and nobody can list all its rules. The goal: replace it within two years without a single big switch-over.",
      ],
      add: [
        node("shop", "browser", "Shoppers", -4.4, 0),
        node("old", "server", "Order system", 0.6, -1.8, { sub: "20 years old" }),
        node("odb", "db", "Old database", 3.4, -1.8),
      ],
      link: [both("shop", "old", 3), both("old", "odb", 2)],
    },
    {
      kind: "solution",
      short: "Proxy",
      uses: "strangler-fig",
      title: "A proxy first, 100% to the old system",
      body: [
        "Step one changes nothing visible: a routing proxy goes in front, sending every request to the old system. From now on, where each route goes is a setting.",
      ],
      add: [node("proxy", "gateway", "Routing proxy", -2, 0, { sub: "100% old" })],
      unlink: ["shop>old"],
      link: [both("shop", "proxy", 3), both("proxy", "old", 3)],
    },
    {
      kind: "solution",
      short: "Data",
      uses: "change-data-capture",
      title: "The new service gets its own copy",
      body: [
        "The first slice is order tracking. The new tracking service has its own database, filled by change capture from the old one: every order change in the old database's log becomes an event the new service applies. No shared tables.",
      ],
      add: [
        node("cap", "worker", "Change capture", 3.4, 0.6),
        node("track", "service", "Tracking service", 0.6, 1.8),
        node("tdb", "db", "Tracking DB", 3.4, 3),
      ],
      link: [link("odb", "cap", "copy"), link("cap", "tdb", "write"), both("track", "tdb", 2)],
    },
    {
      kind: "technique",
      short: "Translate",
      uses: "api-facade",
      title: "Old codes stop at the border",
      body: [
        "Captured rows carry old status codes (`PK`, `SH2`, `RTN`). One translator turns them into clear states (packed, shipped by courier, returning) before they reach the new database. The same translator serves the customer details the new service still has to fetch from the old system.",
      ],
      set: { cap: { label: "Capture + translate", badge: "SH2 → shipped" } },
    },
    {
      kind: "technique",
      short: "Shadow",
      uses: "testing",
      title: "Shadow traffic and contract tests",
      body: [
        "For two weeks the proxy sends a copy of every tracking request to the new service and compares the answers. 0.6% differ: orders split across two warehouses show only the first parcel. That's fixed before any shopper sees the new code.",
        "Contract tests pin down what tracking relies on from the translator, so a change on either side fails a build, not a customer.",
      ],
      add: [node("cmp", "monitor", "Compare answers", -2, 2.8)],
      link: [
        link("proxy", "track", "copy"),
        link("track", "cmp", "event"),
        link("old", "cmp", "event"),
      ],
      metrics: [{ label: "Answers that differ", value: "0.6% → 0%", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Shift",
      uses: "cicd",
      title: "1%, 10%, 50%, 100%",
      body: [
        "The pipeline deploys tracking like any change, and the proxy shifts real traffic in steps, each held for a day while error rates and speed are watched. Rolling back is one setting, effective in seconds.",
      ],
      set: { proxy: { badge: "tracking 10% new" } },
      link: [both("proxy", "track", 1)],
      quiz: {
        question: "At 10%, tracking errors double. What happens next?",
        options: [
          "Keep going to 50% to collect more data",
          "Route tracking back to the old system, then investigate",
          "Switch off the old system so there is only one to debug",
        ],
        answer: 1,
        why: "The old path is still live, so going back costs seconds. Investigate with shoppers safe, then try again.",
      },
    },
    {
      kind: "case",
      short: "Back door",
      uses: "strangler-fig",
      title: "Case: the report nobody listed",
      body: [
        "Weeks later, finance's weekly report started showing returns twice. It read the old database directly, joining a table the old system had stopped updating for tracked orders. The database's connection log revealed four more programs like it, each moved or retired before the next slice.",
      ],
      add: [node("rep", "worker", "Finance report", 5, -3.4)],
      link: [both("rep", "odb", 1)],
      set: { rep: { state: "hot", badge: "reads directly" } },
    },
    {
      kind: "solution",
      short: "Next slices",
      uses: "strangler-fig",
      title: "Slice by slice, then switch off",
      body: [
        "Returns, then invoicing, then checkout move the same way, each with its own service and database. When the old system has served no traffic for a month, it's switched off and its database archived.",
      ],
      set: {
        old: { state: "dim", badge: "0% traffic" },
        proxy: { badge: "100% new" },
        rep: { state: "ok", badge: "moved" },
      },
      unlink: ["proxy>old", "rep>odb"],
      link: [both("proxy", "track", 3)],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Replaced without a big weekend",
      body: ["At every point, the next step was small and the way back was open."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Control over routing", "proxy first, 100% to old", "Strangler fig"],
          [
            "Data without shared tables",
            "change capture into each new database",
            "Change data capture",
          ],
          ["No old codes in new code", "one translator at the border", "API façade"],
          ["Proof before shoppers", "shadow traffic, contract tests", "Testing"],
          ["Safe switch-over", "staged traffic and instant rollback", "CI/CD"],
        ],
      },
    },
  ],
);
