import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const CRICKET_SCORES: CaseStudy = caseStudy(
  {
    id: "cricket-scores",
    title: "Live scores for a cricket final",
    tagline:
      "Forty million fans refresh the score every few seconds. Before designing anything, measure what that really means.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "latency-throughput", "request-journey"],
    learn: [
      'Turn "refresh every few seconds" into requests per second',
      "Separate a tiny answer from the heavy page around it",
      "See why a short round trip matters more than a fast server",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "The last over of a final",
      body: [
        "A score app shows live cricket. For a final, 40 million fans are watching at once, and many keep the app open, refreshing for the latest ball.",
        "Today it runs on four servers that are fine for an ordinary match.",
      ],
      add: [
        node("fans", "phone", "Fans", -4.4, 0, { sub: "40 M watching" }),
        node("api", "server", "Score servers ×4", 0, 0),
        node("db", "db", "Match DB", 3.2, 0),
      ],
      link: [both("fans", "api", 2), both("api", "db", 1)],
    },
    {
      kind: "technique",
      short: "Per second",
      uses: "napkin-math",
      title: "Every few seconds × 40 million",
      body: [
        "If each of 40M phones asks for the score every 10 seconds, that is **4 million requests a second**. In the last over, many tap refresh after every ball: the peak can double.",
        "No sensible fleet of ordinary servers answers 8M requests a second from a database.",
      ],
      quiz: {
        question:
          "40 million phones each asking every 10 seconds: about how many requests a second?",
        options: ["40,000", "400,000", "4,000,000"],
        answer: 2,
        why: "40,000,000 ÷ 10 = 4,000,000. Polling multiplies quickly: the interval matters as much as the audience.",
      },
      metrics: [
        { label: "Average", value: "4 M /s", tone: "bad" },
        { label: "Last over", value: "≈ 8 M /s", tone: "bad" },
      ],
      set: { api: { state: "hot", queue: 8 } },
      link: [link("fans", "api", { kind: "request", rate: 4 }, { kind: "fail", rate: 1 })],
    },
    {
      kind: "insight",
      short: "Tiny answer",
      uses: "request-journey",
      title: "The score is 60 bytes",
      body: [
        'Trace one refresh: the app re-downloads a 300 KB page of ads, photos and commentary to change one line, "182/6 in 19.3 overs". The score itself is about 60 bytes.',
        "Split them: the heavy page loads once; refreshes fetch only the 60-byte score.",
      ],
      table: {
        head: ["Part", "Size", "Changes"],
        rows: [
          ["Page, photos, ads", "300 KB", "rarely"],
          ["Score line", "60 B", "every ball"],
        ],
      },
    },
    {
      kind: "insight",
      short: "Identical",
      uses: "napkin-math",
      title: "Everyone asks the same question",
      body: [
        "All 40 million fans want the **same** answer at the same moment. One score changes about every 40 seconds (one ball). That answer can be computed once and copied, not looked up 4 million times.",
      ],
      metrics: [
        { label: "Distinct answers", value: "1 per ball" },
        { label: "Balls per minute", value: "≈ 1.5" },
      ],
    },
    {
      kind: "problem",
      short: "The knee",
      uses: "latency-throughput",
      title: 'Why it falls over before it is "full"',
      body: [
        "Each server handles 20,000 score requests a second. At 95% busy, queues grow and the p99 jumps from 30 ms to seconds, so phones time out and retry, adding even more load.",
        "Retries turn a slow system into a stampede. Headroom is not optional on final day.",
      ],
      metrics: [
        { label: "Busy", value: "95%", tone: "bad" },
        { label: "p99", value: "4 s", tone: "bad" },
      ],
    },
    {
      kind: "insight",
      short: "Distance",
      uses: "request-journey",
      title: "Fans on four continents",
      body: [
        "Fans in London, Sydney and Dubai each pay 100–200 ms per round trip to servers in Mumbai, and a refresh needs one. A 60-byte answer still takes 200 ms to cross the world.",
        "Short answers kept close to fans beat a faster server far away.",
      ],
      add: [node("abroad", "phone", "Fans abroad", -4.4, 2.4, { sub: "200 ms away" })],
      link: [
        link(
          "abroad",
          "api",
          { kind: "request", rate: 1, speed: 3 },
          { kind: "response", back: true, rate: 1, speed: 3 },
        ),
      ],
    },
    {
      kind: "recap",
      short: "Verdict",
      title: "What final day needs",
      body: [
        "Millions of identical, tiny answers, refreshed constantly, all over the world.",
        "Compute the score once per ball; copy it close to fans; keep the heavy page out of refreshes.",
        "Plan for 60–70% busy at the peak, because retries punish anything slower.",
        "The Scaling module's caches and CDNs turn this into an easy problem.",
      ],
      set: { api: { state: "ok", queue: 0 } },
    },
  ],
);

/* ============ After Scaling ============ */

export const BREAKING_NEWS: CaseStudy = caseStudy(
  {
    id: "breaking-news",
    title: "A news site on a breaking story",
    tagline:
      "A big story breaks and traffic jumps fiftyfold in two minutes. Caches, the edge and a calm origin.",
    minutes: 9,
    level: "beginner",
    tier: "combine",
    concepts: ["cdn", "caching", "load-balancing", "napkin-math"],
    learn: [
      "Cache whole pages at the edge for short times",
      "Shield the origin from a sudden spike",
      "Keep personal parts out of shared caches",
    ],
  },
  [
    {
      kind: "setup",
      short: "Quiet day",
      title: "A regional news site",
      body: [
        "On a normal day 2,000 readers are online and three app servers behind a load balancer render articles from a database.",
      ],
      add: [
        node("readers", "user", "Readers", -4.6, 0),
        node("lb", "lb", "Load balancer", -1.6, 0),
        node("app", "server", "App ×3", 1, 0),
        node("db", "db", "Articles DB", 3.8, 0),
      ],
      link: [both("readers", "lb", 1), both("lb", "app", 1), both("app", "db", 1)],
    },
    {
      kind: "problem",
      short: "Story breaks",
      uses: "napkin-math",
      title: "100,000 readers in two minutes",
      body: [
        "A major story breaks. Readers jump to 100,000 within two minutes, each reloading every minute or so: about 1,700 page views a second, nearly all on **one** article.",
        "Every view renders the same page from the database. The servers and database are swamped.",
      ],
      metrics: [
        { label: "Readers", value: "100,000" },
        { label: "Views", value: "≈ 1,700 /s", tone: "bad" },
        { label: "Same article", value: "92%" },
      ],
      set: { app: { state: "hot", queue: 7 }, db: { state: "hot" } },
      link: [link("readers", "lb", { kind: "request", rate: 4 }, { kind: "fail", rate: 1 })],
    },
    {
      kind: "solution",
      short: "Edge cache",
      uses: "cdn",
      title: "Cache the whole article at the edge",
      body: [
        "The article is identical for everyone who isn't signed in. The CDN caches the full page for 30 seconds. Edges answer 99% of views; the origin renders the page about twice a minute per edge.",
      ],
      quiz: {
        question: "Why only 30 seconds, not a day?",
        options: [
          "CDNs can't cache longer",
          "A developing story is updated often; 30 s keeps it fresh while absorbing the load",
          "To save disk space",
        ],
        answer: 1,
        why: "Even a 30-second TTL turns thousands of identical views into one origin request per edge per 30 s.",
      },
      metrics: [
        { label: "Edge hit rate", value: "99%", tone: "good" },
        { label: "Origin views", value: "≈ 20 /s", tone: "good" },
      ],
      add: [node("cdn", "cdn", "CDN edges", -3, -2.4, { sub: "pages, 30 s" })],
      set: { app: { state: "ok", queue: 0 }, db: { state: "ok" } },
      unlink: ["readers>lb"],
      link: [
        both("readers", "cdn", 4),
        link("cdn", "lb", { kind: "request", rate: 1 }, { kind: "response", back: true, rate: 1 }),
      ],
    },
    {
      kind: "solution",
      short: "Shield",
      uses: "cdn",
      title: "An origin shield for the first seconds",
      body: [
        "When a new update is published, every edge misses at once. A shield layer in front of the origin collapses those hundreds of misses into one request.",
      ],
      add: [node("shield", "cdn", "Origin shield", -1.6, -2.4)],
      unlink: ["cdn>lb"],
      link: [
        both("cdn", "shield", 1),
        link(
          "shield",
          "lb",
          { kind: "request", rate: 1 },
          { kind: "response", back: true, rate: 1 },
        ),
      ],
    },
    {
      kind: "solution",
      short: "App cache",
      uses: "caching",
      title: "Cache the pieces inside the origin too",
      body: [
        'The "most read" box and related links are computed by heavy queries. The app caches them for a minute in a shared cache, so even the origin\'s few renders are cheap.',
      ],
      add: [node("cache", "cache", "Shared cache", 3.8, -2.2)],
      link: [both("app", "cache", 2)],
    },
    {
      kind: "case",
      short: "Signed in",
      uses: "caching",
      title: 'Case: "Welcome back, Anil"',
      body: [
        "Signed-in readers see their name and saved articles. Those parts must never be cached at the edge, or one reader's page would be served to another.",
        "The cached page has a blank slot; the browser fills it with a small personal request that is marked `private`.",
      ],
      callout: {
        kind: "watch",
        text: "Shared caches only ever hold content that is the same for everyone.",
      },
    },
    {
      kind: "solution",
      short: "Balancer",
      uses: "load-balancing",
      title: "The origin stays boring",
      body: [
        "With the edge taking the spike, the origin's load balancer sees a few dozen requests a second. Health checks still rotate out a server that crashed during the morning deploy, and nobody notices.",
      ],
      set: { app: { badge: "2 of 3 healthy" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Absorb the spike at the edge",
      body: ["The origin is protected by layers, each cutting the load by a large factor."],
      table: {
        head: ["Layer", "Does", "Lesson"],
        rows: [
          ["CDN edges", "serve the article for 30 s", "CDNs"],
          ["Origin shield", "collapses edge misses", "CDNs"],
          ["Shared cache", "heavy boxes, 1 minute", "Caching"],
          ["Load balancer", "spreads the few renders", "Load balancing"],
        ],
      },
    },
  ],
);

export const FESTIVAL_GROCERY: CaseStudy = caseStudy(
  {
    id: "festival-grocery",
    title: "Online grocery on festival eve",
    tagline:
      "The evening before a festival, orders triple and everyone wants a delivery slot. Scale out, stay stateless, cache wisely.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["scale-up-out", "load-balancing", "stateless", "caching", "latency-throughput"],
    learn: [
      "Pre-scale for a known evening",
      "Carts belong in a store, not in server memory",
      "Cache the catalogue, never the slot counts",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Festival eve, 6 p.m.",
      body: [
        "A grocery app sells delivery slots and groceries. Festival eve brings three times the usual orders, and everyone wants the 7–9 a.m. slot tomorrow.",
      ],
      add: [
        node("shoppers", "phone", "Shoppers", -4.6, 0),
        node("app", "server", "Shop server", -0.6, 0, { sub: "big VM" }),
        node("db", "db", "Shop DB", 3, 0),
      ],
      link: [both("shoppers", "app", 2), both("app", "db", 2)],
    },
    {
      kind: "problem",
      short: "Too busy",
      uses: "latency-throughput",
      title: "At 85% busy, checkout slows to a crawl",
      body: [
        "By 6:30 the single big server is 85% busy. Browsing still feels fine, but checkout's p99 passes 6 seconds and shoppers abandon carts.",
      ],
      metrics: [
        { label: "Busy", value: "85%", tone: "bad" },
        { label: "Checkout p99", value: "6.2 s", tone: "bad" },
      ],
      set: { app: { state: "hot", queue: 5 } },
    },
    {
      kind: "solution",
      short: "Scale out",
      uses: "scale-up-out",
      title: "Six servers, started at 5 p.m.",
      body: [
        "The server is already the biggest the team uses, so they scale out: six mid-size servers. Festival eves are known in advance, so the extra servers start at 5 p.m. on a schedule rather than waiting for autoscaling.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -2.4, 0),
        node("app2", "server", "Shop servers ×5", -0.6, 2.2),
      ],
      set: { app: { state: "ok", queue: 0, sub: "" } },
      unlink: ["shoppers>app"],
      link: [
        both("shoppers", "lb", 3),
        both("lb", "app", 2),
        both("lb", "app2", 3),
        both("app2", "db", 2),
      ],
    },
    {
      kind: "problem",
      short: "Lost carts",
      uses: "stateless",
      title: "Carts vanish between servers",
      body: [
        "Carts were kept in each server's memory. Now the balancer sends a shopper's next request to another server, and the cart looks empty. Angry messages arrive within minutes.",
      ],
      set: { app2: { badge: "cart: empty?!", state: "hot" } },
    },
    {
      kind: "solution",
      short: "Cart store",
      uses: "stateless",
      title: "Carts go to a shared store",
      body: [
        "Carts move to a fast key–value store keyed by shopper. Any server can read any cart; the servers become stateless, and the balancer can send requests anywhere.",
      ],
      add: [node("carts", "cache", "Cart store", 3, -2.4, { sub: "by shopper" })],
      set: { app2: { badge: "", state: "ok" } },
      link: [both("app", "carts", 2), both("app2", "carts", 2)],
    },
    {
      kind: "solution",
      short: "Catalogue",
      uses: "caching",
      title: "Cache the catalogue, not the slots",
      body: [
        "Product pages and prices are read hundreds of times per change: they are cached for 5 minutes. Delivery-slot counts change every second and must be exact at booking, so they are **not** cached for booking decisions.",
      ],
      quiz: {
        question:
          'A cached slot count says "3 left" but the database says 0. What should booking do?',
        options: [
          "Trust the cache: it is faster",
          "Check and reserve in the database, then show the true answer",
          "Book anyway and apologise later",
        ],
        answer: 1,
        why: "Show from the cache, decide from the source of truth. Overbooking a delivery slot breaks a promise to a customer.",
      },
      add: [node("cache", "cache", "Catalogue cache", 0.8, -2.6, { sub: "5 min" })],
      link: [both("app", "cache", 3), both("app2", "cache", 3)],
    },
    {
      kind: "solution",
      short: "Health",
      uses: "load-balancing",
      title: "A server runs out of memory at 8 p.m.",
      body: [
        "One server leaks memory and stops answering. Health checks take it out of the pool; carts are safe in the store, so its shoppers continue on another server without noticing.",
      ],
      metrics: [
        { label: "Checkout p99", value: "450 ms", tone: "good" },
        { label: "Lost carts", value: "0", tone: "good" },
      ],
      set: { app: { state: "down" } },
      link: [link("lb", "app", { dashed: true })],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Festival eve, handled",
      body: [
        "Scale out early, keep state out of servers, cache what can be stale and nothing else.",
      ],
      table: {
        head: ["Problem", "Fix", "Lesson"],
        rows: [
          ["85% busy, slow checkout", "6 servers from 5 p.m.", "Scale up or out"],
          ["Requests go anywhere", "load balancer with health checks", "Load balancing"],
          ["Vanishing carts", "carts in a shared store", "Stateless services"],
          ["Catalogue load", "5-minute cache; slots never cached", "Caching"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const HOSPITAL_APPOINTMENTS: CaseStudy = caseStudy(
  {
    id: "hospital-appointments",
    title: "Hospital appointment booking",
    tagline:
      "Forty doctors, ten thousand patients a week, and slots that must never be double-booked.",
    minutes: 9,
    level: "intermediate",
    tier: "combine",
    concepts: ["transactions", "indexes", "replication", "sql-nosql"],
    learn: [
      "Make a slot impossible to book twice",
      "Index for the questions receptionists actually ask",
      "Read schedules from replicas, book on the leader",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Slots, doctors, patients",
      body: [
        "A hospital lets patients book 15-minute slots with 40 doctors online, by phone and at the front desk. All three channels share one database. The rule: one patient per slot, always.",
      ],
      add: [
        node("patients", "phone", "Patients", -4.6, -1.4),
        node("desk", "browser", "Front desk", -4.6, 1.4),
        node("app", "server", "Booking app", -1.4, 0),
        node("db", "db", "PostgreSQL", 2.2, 0, { sub: "doctors, slots, bookings" }),
      ],
      link: [both("patients", "app", 2), both("desk", "app", 1), both("app", "db", 2)],
    },
    {
      kind: "technique",
      short: "Relational",
      uses: "sql-nosql",
      title: "This data is relational",
      body: [
        "Doctors have schedules, schedules have slots, slots have at most one booking, bookings belong to patients. Joins and transactions are exactly what is needed, so a relational database is the natural fit.",
      ],
    },
    {
      kind: "problem",
      short: "Same slot",
      uses: "transactions",
      title: "Two channels, one slot, one second",
      body: [
        'A patient books Dr Rao\'s 10:15 online while the front desk books the same slot for a walk-in. Both read "free", both write. Two patients arrive at 10:15.',
      ],
      set: { db: { state: "hot", badge: "10:15 booked twice" } },
    },
    {
      kind: "solution",
      short: "Constraint",
      uses: "transactions",
      title: "Let the database refuse the second booking",
      body: [
        'Bookings get a **unique constraint** on `slot_id`, and booking is a single insert. The second insert fails with a duplicate-key error, and the front desk sees "just taken" and offers 10:30.',
      ],
      code: [
        "CREATE UNIQUE INDEX one_booking_per_slot ON bookings (slot_id);",
        "INSERT INTO bookings (slot_id, patient_id) VALUES (:slot, :patient);",
      ],
      set: { db: { state: "ok", badge: "UNIQUE(slot_id)" } },
    },
    {
      kind: "technique",
      short: "Indexes",
      uses: "indexes",
      title: "Index the receptionists' questions",
      body: [
        'Receptionists ask "Dr Rao\'s free slots on Tuesday" all day: an index on `(doctor_id, day)` makes it instant. "This patient\'s upcoming appointments" needs `(patient_id, starts_at)`.',
      ],
      quiz: {
        question: 'Which index serves "Dr Rao\'s slots on Tuesday, in time order"?',
        options: ["(day)", "(doctor_id, day, starts_at)", "(starts_at, doctor_id)"],
        answer: 1,
        why: "Filter by doctor and day from the left, and the remaining column keeps the slots already in time order.",
      },
      metrics: [{ label: "Free-slot search", value: "900 ms → 3 ms", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Browse from replicas, book on the leader",
      body: [
        "Patients browse schedules ten times for every booking. A read replica serves browsing; every booking runs on the leader, where the unique constraint guarantees correctness even if the replica was a second behind.",
      ],
      add: [node("rep", "db", "Read replica", 4.6, 0, { hue: "teal" })],
      link: [link("db", "rep", "copy"), both("app", "rep", 3)],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Correct first, then fast",
      body: ["The constraint makes double booking impossible; indexes and replicas make it fast."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Related data, joins", "relational database", "SQL and NoSQL"],
          ["Never double-book", "unique constraint, single insert", "Transactions"],
          ["Instant searches", "(doctor, day, time) and (patient, time) indexes", "Indexes"],
          ["Browsing load", "read replica; book on leader", "Replication"],
        ],
      },
    },
  ],
);

export const BANK_LEDGER: CaseStudy = caseStudy(
  {
    id: "bank-ledger",
    title: "A bank account ledger",
    tagline:
      "Money moves between accounts, and the books must balance, survive crashes and never depend on one machine.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["transactions", "replication", "consensus", "unique-ids", "cap"],
    learn: [
      "Record money as an append-only ledger of entries",
      "Make transfers atomic and idempotent",
      "Replicate with a majority so nothing confirmed is lost",
      "Choose consistency over availability for balances",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Every rupee accounted for",
      body: [
        "A small digital bank moves money between its customers' accounts. Regulators require that every transfer is recorded forever, the books always balance, and a confirmed transfer survives any single failure.",
      ],
      add: [
        node("customers", "phone", "Customers", -4.6, 0),
        node("ledgerSvc", "service", "Ledger service", -1.2, 0),
        node("db", "db", "Ledger DB", 2.4, 0),
      ],
      link: [both("customers", "ledgerSvc", 1), both("ledgerSvc", "db", 1)],
    },
    {
      kind: "technique",
      short: "Entries",
      uses: "transactions",
      title: "Don't update balances; append entries",
      body: [
        "Instead of overwriting a balance, every transfer appends **two entries**: −500 from Asha's account, +500 to Ben's, in one transaction. A balance is the sum of an account's entries (kept in a summary row updated in the same transaction).",
        'The sum of all entries is always zero: that is what "the books balance" means.',
      ],
      code: [
        "BEGIN;",
        "INSERT INTO entries (transfer_id, account, amount) VALUES (:t, 'asha', -500), (:t, 'ben', +500);",
        "UPDATE balances SET amount = amount - 500 WHERE account = 'asha' AND amount >= 500;",
        "UPDATE balances SET amount = amount + 500 WHERE account = 'ben';",
        "COMMIT;",
      ],
    },
    {
      kind: "technique",
      short: "Transfer id",
      uses: "unique-ids",
      title: "Every transfer has an id from the phone",
      body: [
        "The app creates the transfer id (a UUID v7) before sending. If the network drops and the app retries, the ledger sees the same id, finds it already recorded, and returns the original result: no double transfer.",
      ],
      quiz: {
        question: "Why should the phone, not the server, create the transfer id?",
        options: [
          "Phones have better clocks",
          "So a retry after a lost reply carries the same id and is recognised",
          "Servers can't generate UUIDs",
        ],
        answer: 1,
        why: "An id made before the first attempt links every retry to one operation. A server-made id would be new on every retry.",
      },
    },
    {
      kind: "solution",
      short: "Majority",
      uses: "consensus",
      title: "Confirmed means stored on a majority",
      body: [
        "The ledger runs on a three-node consensus group (Raft). A transfer is confirmed only after a majority has written it to their logs, so losing any one machine loses nothing confirmed, and a cut-off node can never accept transfers on its own.",
      ],
      add: [
        node("n2", "db", "Ledger node 2", 4.6, -1.6, { hue: "teal" }),
        node("n3", "db", "Ledger node 3", 4.6, 1.6, { hue: "teal" }),
      ],
      set: { db: { label: "Ledger node 1", sub: "leader" } },
      link: [link("db", "n2", "copy"), link("db", "n3", "copy")],
    },
    {
      kind: "tradeoff",
      short: "CAP",
      uses: "cap",
      title: "Balances choose consistency",
      body: [
        'If the network splits and the leader can\'t reach a majority, transfers are **refused** with "try again shortly". Showing a stale balance or allowing a transfer twice would be far worse than a brief outage.',
      ],
      set: { n3: { state: "down" } },
      link: [link("db", "n3", { cut: true })],
    },
    {
      kind: "solution",
      short: "Reports",
      uses: "replication",
      title: "Statements and reports read from a follower",
      body: [
        "Monthly statements and regulator reports scan years of entries. An asynchronous follower outside the consensus group serves them, so heavy reports never slow transfers.",
      ],
      add: [node("reports", "db", "Reporting follower", 2.4, 2.8, { hue: "slate" })],
      set: { n3: { state: "ok" } },
      link: [link("db", "n3", "copy"), link("db", "reports", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A ledger regulators trust",
      body: [
        "Append, never overwrite; identify every operation; confirm on a majority; refuse rather than guess.",
      ],
      table: {
        head: ["Requirement", "Decision", "Lesson"],
        rows: [
          ["Books balance", "paired entries in one transaction", "Transactions"],
          ["No double transfers", "client-made transfer ids", "Unique IDs"],
          ["Survive a failure", "three-node majority log", "Consensus"],
          ["During a partition", "refuse transfers", "CAP"],
          ["Heavy reports", "async reporting follower", "Replication"],
        ],
      },
    },
  ],
);

export const KV_STORE: CaseStudy = caseStudy(
  {
    id: "kv-store",
    title: "Build a distributed key–value store",
    tagline:
      "Design your own small database: where keys live, how copies agree, and what happens on disk.",
    minutes: 12,
    level: "advanced",
    tier: "integrate",
    concepts: ["consistent-hashing", "replication", "cap", "storage-engines", "sharding"],
    learn: [
      "Place keys on a ring of nodes",
      "Keep three copies and read with quorums",
      "Store each node's data in an LSM-tree",
      "Heal after failures",
    ],
    builtOn: [
      { label: "Hash table", path: "/structures/hash-table" },
      { label: "Bloom filter", path: "/structures/bloom-filter" },
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "get(key) and put(key, value) on many machines",
      body: [
        "We want a store for user sessions and preferences: billions of small keys, always writable, spread over many machines that come and go.",
      ],
      add: [
        node("client", "server", "Client", -4.6, 0),
        node("a", "db", "Node A", 0, -2.4),
        node("b", "db", "Node B", 2.4, 0),
        node("c", "db", "Node C", 0, 2.4),
        node("d", "db", "Node D", -2.2, 0),
      ],
      link: [
        link("a", "b", { dashed: true }),
        link("b", "c", { dashed: true }),
        link("c", "d", { dashed: true }),
        link("d", "a", { dashed: true }),
      ],
    },
    {
      kind: "technique",
      short: "Partition",
      uses: "sharding",
      title: "Split the keys across nodes",
      body: [
        "No single node holds everything: keys are partitioned by a hash of the key, so each node owns a share and the load spreads evenly.",
      ],
      link: [both("client", "d", 2)],
    },
    {
      kind: "technique",
      short: "Ring",
      uses: "consistent-hashing",
      title: "Use a ring so nodes can come and go",
      body: [
        "Nodes and keys go on a hash ring with virtual nodes. A key belongs to the next node clockwise; adding a fifth node moves only about a fifth of the keys.",
      ],
      notes: [{ x: 0, y: 0, text: "hash ring 0 → 2³²" }],
    },
    {
      kind: "solution",
      short: "3 copies",
      uses: "replication",
      title: "Three copies on the next three nodes",
      body: [
        "Each key is written to its owner and the next two distinct nodes clockwise. Any one node can fail without losing data.",
      ],
      link: [link("d", "a", "copy"), link("d", "b", "copy")],
    },
    {
      kind: "technique",
      short: "Quorums",
      uses: "cap",
      title: "Tune consistency with W and R",
      body: [
        "With N = 3 copies, a write waits for W acknowledgements and a read asks R nodes. W = 2, R = 2 guarantees reads see the latest write; W = 1, R = 1 is faster and always available but may read stale data.",
        'Sessions use W = 2, R = 2. A "last seen" timestamp uses W = 1.',
      ],
      quiz: {
        question:
          "N = 3, W = 2. What is the smallest R that guarantees a read sees the latest write?",
        options: ["1", "2", "3"],
        answer: 1,
        why: "W + R must exceed N: 2 + 2 = 4 > 3, so every read overlaps a node that has the write.",
      },
    },
    {
      kind: "technique",
      short: "On disk",
      uses: "storage-engines",
      title: "Each node: a log and an LSM-tree",
      body: [
        "Writes are constant and small, so each node appends to a write-ahead log and a memtable, flushing sorted SSTables in the background. Bloom filters let a read skip files that can't contain the key; compaction merges old files.",
      ],
      add: [node("disk", "storage", "SSTables", 4.6, 0, { sub: "Bloom filter each" })],
      link: [link("b", "disk", "write")],
    },
    {
      kind: "case",
      short: "Node down",
      uses: "replication",
      title: "Case: node B is down for an hour",
      body: [
        "Writes meant for B go to the next node as **hints**; when B returns, the hints are handed back. Periodically, nodes compare their data (with hash trees) and repair any difference left behind.",
      ],
      set: { b: { state: "down" } },
      link: [link("d", "c", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Your own little Dynamo",
      body: [
        "Partitioning, copies, quorums and an LSM engine: the core of many real key–value stores.",
      ],
      table: {
        head: ["Question", "Answer", "Lesson"],
        rows: [
          ["Where does a key live?", "next node on the ring", "Consistent hashing"],
          ["Spread the load", "hash partitioning", "Sharding"],
          ["Survive failures", "3 copies, hints, repair", "Replication"],
          ["How consistent?", "W + R > N per request", "CAP"],
          ["How to store it?", "log + LSM-tree + Bloom filters", "Storage engines"],
        ],
      },
      set: { b: { state: "ok" } },
    },
  ],
);
