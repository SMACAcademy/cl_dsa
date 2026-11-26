import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Communication ============ */

export const LIVE_AUCTION: CaseStudy = caseStudy(
  {
    id: "live-auction",
    title: "A live online auction",
    tagline:
      "Thousands of bidders, a countdown, and one winning bid. Correct bids, instant updates.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["transactions", "realtime", "pubsub", "queues"],
    learn: [
      "Accept a bid only if it beats the current price",
      "Push every new price to every watcher",
      "Fan events out to notifications and analytics",
      "Handle the last-second rush",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Ten minutes, one vintage guitar",
      body: [
        "An auction site sells one item at a time with a 10-minute countdown. 20,000 people watch; in the last 30 seconds hundreds bid at once. Everyone must see the current price within a second, and the highest valid bid must win.",
      ],
      add: [
        node("bidders", "phone", "Bidders", -4.6, 0, { sub: "20,000 watching" }),
        node("auction", "service", "Auction service", -1, 0),
        node("db", "db", "Bids DB", 2.4, 0),
      ],
      link: [both("bidders", "auction", 2), link("auction", "db", "write")],
    },
    {
      kind: "technique",
      short: "Valid bid",
      uses: "transactions",
      title: "A bid wins only if it is higher",
      body: [
        'Two people bid ₹42,000 and ₹42,500 in the same millisecond on a ₹41,000 item. Reading the price and then writing would let both "win".',
        'Each bid is one conditional update that succeeds only if the new amount beats the current one and the auction is still open. The losing bid gets "outbid, the price is now ₹42,500".',
      ],
      code: [
        "UPDATE auctions SET price = :amount, leader = :bidder",
        "WHERE id = :id AND price < :amount AND ends_at > now();   -- 1 row: you lead",
      ],
    },
    {
      kind: "solution",
      short: "Live price",
      uses: "realtime",
      title: "Push every new price to every watcher",
      body: [
        "Each watcher holds a WebSocket to a gateway. When a bid is accepted, the new price and countdown are pushed to all 20,000 screens within a fraction of a second; no polling.",
      ],
      add: [node("ws", "gateway", "Live gateways", -2.8, -2.4, { sub: "WebSockets" })],
      link: [link("ws", "bidders", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "BidAccepted goes to everyone who cares",
      body: [
        'The auction service publishes **BidAccepted**. The gateways subscribe (to update screens), notifications subscribe ("you\'ve been outbid"), and analytics records the bid history, without slowing the bid itself.',
      ],
      add: [
        node("bus", "stream", "Event bus", 1, -2.4),
        node("notify", "service", "Notifications", 3.6, -2.4),
      ],
      link: [
        link("auction", "bus", "event"),
        link("bus", "ws", "event"),
        link("bus", "notify", "event"),
      ],
    },
    {
      kind: "problem",
      short: "Last second",
      uses: "queues",
      title: "The last 30 seconds",
      body: [
        "In the final seconds, 800 bids arrive in a burst and the bid database is the bottleneck. Bids are put on a short queue per auction and applied **in order of arrival** by one worker, so no valid bid is lost and the database sees a steady stream.",
      ],
      quiz: {
        question: "Why one worker per auction for the final burst?",
        options: [
          "Workers are expensive",
          "Bids for one item must be applied in arrival order; parallel workers could reorder them",
          "Queues only allow one worker",
        ],
        answer: 1,
        why: "Order matters within one auction; different auctions can still run on different workers in parallel.",
      },
      add: [node("bidq", "queue", "Bid queue", 0.8, 1.8, { queue: 6 })],
      link: [
        link("bidders", "bidq", { kind: "request", rate: 4 }),
        link("bidq", "auction", "event"),
      ],
    },
    {
      kind: "case",
      short: "Clock",
      title: 'Case: "I bid at 9:59!"',
      body: [
        "A bidder's phone showed 1 second left, but the bid arrived after the close. The server's clock decides, and the countdown on screens is driven by the server's \"ends at\" time, not each phone's clock, so what people see matches what counts.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Correct bids, live screens",
      body: ["One place decides who leads; everything else reacts to that decision."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Highest bid wins", "conditional update", "Transactions"],
          ["Price on every screen", "WebSocket push", "Real-time updates"],
          ["Outbid alerts, history", "BidAccepted subscribers", "Pub/sub"],
          ["Final burst", "ordered queue per auction", "Message queues"],
        ],
      },
    },
  ],
);

export const WHITEBOARD: CaseStudy = caseStudy(
  {
    id: "whiteboard",
    title: "A collaborative whiteboard",
    tagline:
      "A class draws on one board at once. Everyone sees every stroke, and nobody's work is lost when they reconnect.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["realtime", "pubsub", "cap", "storage-engines"],
    learn: [
      "Send strokes both ways over WebSockets",
      "Route a board's strokes through one channel",
      "Merge concurrent edits without locking",
      "Store the board as an append-only log",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Thirty students, one board",
      body: [
        "A teacher shares a whiteboard; 30 students draw, move shapes and type at once. A stroke should appear on every screen in under 100 ms, and nobody should lose their drawing if their Wi-Fi drops.",
      ],
      add: [
        node("teacher", "browser", "Teacher", -4.6, -1.4),
        node("students", "browser", "Students ×30", -4.6, 1.4),
        node("server", "server", "Board server", -1, 0),
      ],
      link: [both("teacher", "server", 1), both("students", "server", 1)],
    },
    {
      kind: "solution",
      short: "Sockets",
      uses: "realtime",
      title: "Strokes travel both ways",
      body: [
        'Every participant keeps a WebSocket open. Each stroke is a small message ("line from (10, 20) to (40, 22)") sent to the server and pushed to the other 30 screens.',
      ],
      link: [
        link("teacher", "server", "event", { kind: "event", back: true }),
        link(
          "students",
          "server",
          { kind: "event", rate: 3 },
          { kind: "event", back: true, rate: 3 },
        ),
      ],
    },
    {
      kind: "solution",
      short: "Channel",
      uses: "pubsub",
      title: "One channel per board",
      body: [
        "Thousands of boards run at once across many servers, and participants of one board may be connected to different servers. Each board has a pub/sub channel: servers publish strokes to it and every server with a participant subscribes.",
      ],
      add: [
        node("server2", "server", "Board server 2", -1, 2.6),
        node("bus", "stream", "Board channels", 2.2, 1.2),
      ],
      unlink: ["students>server"],
      link: [
        link(
          "students",
          "server2",
          { kind: "event", rate: 3 },
          { kind: "event", back: true, rate: 3 },
        ),
        link("server", "bus", "event"),
        link("bus", "server2", "event"),
      ],
    },
    {
      kind: "tradeoff",
      short: "Conflicts",
      uses: "cap",
      title: "Two people move the same shape",
      body: [
        "Locking a shape while someone drags it would make the board feel sluggish, and break whenever a connection lags. Instead each edit is applied locally at once and merged everywhere: the board is **available** and **eventually consistent**.",
        "Data types designed to merge (CRDTs) ensure everyone ends up with the same picture, whatever order the edits arrive in.",
      ],
      quiz: {
        question: "Why not lock a shape while it is being dragged?",
        options: [
          "Locks are illegal on whiteboards",
          "Every edit would wait for a round trip, and a lagging user could hold a lock forever",
          "Shapes can't be locked",
        ],
        answer: 1,
        why: "Local-first editing plus merging keeps drawing instant; locks trade that responsiveness for consistency the board doesn't need.",
      },
    },
    {
      kind: "solution",
      short: "The log",
      uses: "storage-engines",
      title: "Store the board as an append-only log",
      body: [
        "Every stroke is appended to the board's log, like a database's write-ahead log, and a snapshot is taken every few hundred strokes. Loading a board reads the latest snapshot and replays the strokes after it.",
      ],
      add: [node("log", "storage", "Board log + snapshots", 2.2, -1.6, { sub: "append only" })],
      link: [link("server", "log", "write")],
    },
    {
      kind: "case",
      short: "Reconnect",
      title: "Case: Wi-Fi drops for 40 seconds",
      body: [
        "A student keeps drawing offline. When the connection returns, their app sends the strokes it made and asks for everything after the last stroke number it saw. Both sides merge, and nothing is lost.",
      ],
      set: { students: { state: "dim", badge: "offline 40 s" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast, shared, and lossless",
      body: ["Instant locally, merged everywhere, recorded as a log."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Strokes in < 100 ms", "WebSockets both ways", "Real-time updates"],
          ["Participants on many servers", "a channel per board", "Pub/sub"],
          ["Concurrent edits", "merge, don't lock (available)", "CAP"],
          ["Never lose work", "append-only log + snapshots", "Storage engines"],
        ],
      },
      set: { students: { state: "ok", badge: "" } },
    },
  ],
);

/* ============ After Reliability ============ */

export const PUBLIC_API: CaseStudy = caseStudy(
  {
    id: "public-api",
    title: "A public API for developers",
    tagline:
      "Opening AlgoVerse's lesson data to outside developers: fair limits, fast answers, and visibility into everything.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["apis", "rate-limiting", "caching", "observability", "timeouts-retries"],
    learn: [
      "Design a stable, versioned API with cursors",
      "Give every key a fair budget",
      "Cache popular responses",
      "Watch each customer's traffic and errors",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Let others build on AlgoVerse",
      body: [
        "Teachers and app makers want lesson data and learners' progress (with permission) through an API. Some will be careful; some will write a loop that calls it 1,000 times a second by accident.",
      ],
      add: [
        node("devs", "browser", "Developers' apps", -4.6, 0),
        node("gw", "gateway", "API gateway", -1.6, 0),
        node("svc", "service", "Lessons service", 1.6, 0),
      ],
      link: [both("devs", "gw", 2), both("gw", "svc", 2)],
    },
    {
      kind: "technique",
      short: "Design",
      uses: "apis",
      title: "A stable REST API with cursors",
      body: [
        "Resources like `/v1/lessons/binary-search` and `/v1/learners/42/progress`, cursors for long lists, and additive changes only: fields are added, never renamed. A breaking change means `/v2/` and a long overlap.",
      ],
      code: ["GET /v1/lessons?limit=50&after=lsn_9f3c", '→ { "items": [...], "next": "lsn_a771" }'],
    },
    {
      kind: "solution",
      short: "Budgets",
      uses: "rate-limiting",
      title: "Every API key gets a budget",
      body: [
        "Each key has a token bucket: say 50 requests a second with bursts of 100, counted in a shared store across all gateways. Excess requests get **429** with `Retry-After`. Paying partners get bigger buckets.",
      ],
      add: [
        node("runaway", "browser", "Runaway script", -4.6, -2.4, { hue: "rose" }),
        node("counters", "cache", "Shared counters", -1.6, -2.6),
      ],
      link: [
        link("runaway", "gw", { kind: "request", rate: 4 }, { kind: "fail", back: true, rate: 3 }),
        both("gw", "counters", 1),
      ],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache what many developers ask for",
      body: [
        "Lesson data is the same for every developer and changes rarely: the gateway caches those responses for 10 minutes. Per-learner progress is private and never shared-cached.",
      ],
      quiz: {
        question: "Which response is safe for the gateway to cache and share across API keys?",
        options: ["GET /v1/lessons/binary-search", "GET /v1/learners/42/progress", "Both"],
        answer: 0,
        why: "Lesson content is identical for everyone; a learner's progress is personal and must stay private.",
      },
      add: [node("cache", "cache", "Response cache", 1.6, -2.6)],
      link: [both("gw", "cache", 3)],
    },
    {
      kind: "technique",
      short: "Timeouts",
      uses: "timeouts-retries",
      title: "Protect the API from its own dependencies",
      body: [
        "The progress endpoint depends on a slower analytics service. It gets a 500 ms timeout and a circuit breaker; when analytics is down, the API returns the lesson list without progress percentages rather than failing entirely.",
      ],
      add: [node("analytics", "service", "Analytics", 4.4, 0, { state: "hot" })],
      link: [link("svc", "analytics", "request", { kind: "fail", rate: 1 })],
    },
    {
      kind: "technique",
      short: "Visibility",
      uses: "observability",
      title: "See every customer's traffic",
      body: [
        "Metrics are broken down by API key: rate, errors, latency, 429s. A developer's dashboard shows their own usage, and an alert fires when any key's error rate jumps, often before the developer notices their bug.",
      ],
      add: [node("monitor", "monitor", "Per-key metrics", -1.6, 2.6)],
      set: { analytics: { state: "ok" } },
      link: [link("gw", "monitor", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "An API people can build on",
      body: [
        "Stable contracts, fair limits, fast common answers, and graceful failures, all visible.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["Stability", "versioned REST, cursors, additive changes", "APIs"],
          ["Fairness", "token bucket per key", "Rate limiting"],
          ["Speed", "cache shared lesson responses", "Caching"],
          ["Slow dependency", "timeout + breaker + degrade", "Timeouts and retries"],
          ["Visibility", "metrics per key, alerts", "Observability"],
        ],
      },
    },
  ],
);

export const STATUS_PAGE: CaseStudy = caseStudy(
  {
    id: "status-page",
    title: "A status page that stays up when everything else is down",
    tagline:
      "The one page that must work during an outage, including an outage of your own cloud region.",
    minutes: 8,
    level: "intermediate",
    tier: "combine",
    concepts: ["redundancy", "cdn", "caching", "observability"],
    learn: [
      "Keep the status page off the system it reports on",
      "Serve it as static files from many places",
      "Update it from health checks and humans",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: '"Is AlgoVerse down, or is it me?"',
      body: [
        "During an incident thousands of learners check the status page at once. If it runs on the same servers that are failing, it fails too, exactly when it matters.",
      ],
      add: [
        node("visitors", "user", "Visitors", -4.6, 0),
        node("app", "server", "AlgoVerse", 0, 0, { state: "down" }),
      ],
      link: [link("visitors", "app", "fail")],
    },
    {
      kind: "solution",
      short: "Elsewhere",
      uses: "redundancy",
      title: "Run it somewhere else entirely",
      body: [
        "The status page shares nothing with AlgoVerse: different hosting provider, different DNS, different region. A failure correlated with the main site can't take it down.",
      ],
      zones: [
        { label: "Main site region", x1: -1, y1: -1, x2: 1.2, y2: 1, hue: "rose" },
        { label: "Status page provider", x1: -3.6, y1: -3.6, x2: 2.4, y2: -1.6, hue: "green" },
      ],
    },
    {
      kind: "solution",
      short: "Static",
      uses: "cdn",
      title: "Static files from the edge",
      body: [
        "The page is plain HTML and a small JSON file of current status, served from a CDN. There is no database or server to fail; edges around the world answer the rush.",
      ],
      add: [node("cdn", "cdn", "CDN", -1.6, -2.6, { sub: "status.json + HTML" })],
      link: [both("visitors", "cdn", 4)],
    },
    {
      kind: "technique",
      short: "Short TTL",
      uses: "caching",
      title: "Cache for 30 seconds",
      body: [
        "The status JSON is cached for 30 seconds: fresh enough during an incident, and the rush of visitors still turns into one origin fetch per edge every half minute.",
      ],
      quiz: {
        question: "Why not cache the status for a day, like a logo?",
        options: [
          "Status changes during incidents; a day-old status is useless",
          "CDNs can't cache JSON",
          "Browsers forbid it",
        ],
        answer: 0,
        why: "Choose the TTL by how stale the content may be: a logo can be a year old, an incident status only seconds.",
      },
    },
    {
      kind: "technique",
      short: "Updates",
      uses: "observability",
      title: "Probes and people update it",
      body: [
        'Outside probes check AlgoVerse\'s key journeys every minute from three continents and flip components to "degraded" automatically. The on-call engineer adds human updates ("we\'ve found the cause").',
      ],
      add: [node("probes", "monitor", "Outside probes", 1, -3, { sub: "3 continents" })],
      link: [link("probes", "app", "request"), link("probes", "cdn", "write")],
    },
    {
      kind: "case",
      short: "All green?",
      uses: "observability",
      title: 'Case: "All systems operational" during an outage',
      body: [
        "An early version only checked that the home page loaded. One evening sign-ins failed for an hour while the status page stayed green, and learners trusted it less than social media.",
        "Probes now walk real journeys: sign in, open a lesson, run code. Green must mean what users feel.",
      ],
      callout: {
        kind: "watch",
        text: "A status page that is green during an outage is worse than none.",
      },
      set: { probes: { badge: "sign-in journey" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Independent, static, fresh",
      body: ["A status page is only useful if it fails independently of what it reports."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Survive the outage", "separate provider and region", "Redundancy"],
          ["Survive the rush", "static files on a CDN", "CDNs"],
          ["Stay fresh", "30-second TTL", "Caching"],
          ["Know the truth", "outside probes + human updates", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Architecture ============ */

export const CLICKSTREAM: CaseStudy = caseStudy(
  {
    id: "clickstream",
    title: "Clickstream analytics for learning",
    tagline:
      "Which lesson steps confuse learners? Collect every click, answer in seconds, and recompute exactly overnight.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["batch-stream", "queues", "storage-engines", "files-media"],
    learn: [
      "Collect events without slowing the app",
      "Answer live questions with a stream",
      "Recompute exact numbers in batch",
      "Store analytics in columns",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Where do learners get stuck?",
      body: [
        "The team wants to know which steps learners re-read, which questions they get wrong, and where they give up: about 300 million small events a day, from every lesson.",
      ],
      add: [
        node("apps", "browser", "Learners' browsers", -4.6, 0),
        node("collector", "service", "Event collector", -1.6, 0),
      ],
      link: [link("apps", "collector", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Collect",
      uses: "queues",
      title: "Collect fast, process later",
      body: [
        "The browser batches events and sends them every few seconds. The collector only validates and appends them to a partitioned event stream, then answers at once: the learner never waits on analytics.",
      ],
      add: [node("stream", "stream", "Event stream", 1.4, 0, { sub: "partitioned" })],
      link: [link("collector", "stream", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Live",
      uses: "batch-stream",
      title: "Live: where are learners stuck right now?",
      body: [
        "A stream processor counts, per lesson step, how many learners pause for more than a minute, in 5-minute sliding windows. A new lesson that confuses people shows up on the dashboard within minutes of release.",
      ],
      add: [
        node("proc", "worker", "Stream processor", 4, -1.6, { sub: "5-min windows" }),
        node("dash", "monitor", "Live dashboard", 6.4, -1.6),
      ],
      link: [link("stream", "proc", "event"), link("proc", "dash", "write")],
    },
    {
      kind: "solution",
      short: "Archive",
      uses: "files-media",
      title: "Every event lands in object storage",
      body: [
        "The stream is also written, hour by hour, as compressed files in object storage. Cheap, durable, and the source of truth for any recomputation.",
      ],
      add: [node("lake", "storage", "Event files", 4, 1.8, { sub: "hourly, compressed" })],
      link: [link("stream", "lake", "write")],
    },
    {
      kind: "solution",
      short: "Nightly",
      uses: "batch-stream",
      title: "Nightly: exact numbers",
      body: [
        "Each night a batch job reads the day's files and computes exact per-step statistics, deduplicating events that phones re-sent and placing late events in the right hour.",
      ],
      quiz: {
        question: "Why keep a nightly batch when a live stream already exists?",
        options: [
          "Streams can't count",
          "The batch sees the complete day, with late and duplicate events resolved, so its numbers are exact",
          "Batch jobs are faster",
        ],
        answer: 1,
        why: "Streams give fast approximate answers; batch over the full log gives the exact ones. Many systems run both.",
      },
      add: [node("batch", "worker", "Nightly job", 6.4, 1.8)],
      link: [link("lake", "batch", "heavy")],
    },
    {
      kind: "solution",
      short: "Columns",
      uses: "storage-engines",
      title: "Results go to a column store",
      body: [
        'Analysts ask "average time on step 4 of every sorting lesson, by country": scans over billions of rows using a few columns. A columnar warehouse reads only those columns and compresses them well.',
      ],
      add: [node("warehouse", "db", "Column warehouse", 8.4, 0, { hue: "teal" })],
      link: [link("batch", "warehouse", "write")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast and exact, both",
      body: ["One stream of events feeds two answers: live and approximate, nightly and exact."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Don't slow the app", "batch in browser, append to a stream", "Message queues"],
          ["Answers in minutes", "windowed stream processing", "Batch and stream"],
          ["Cheap, durable history", "hourly files in object storage", "Files and media"],
          ["Exact numbers", "nightly batch with dedup", "Batch and stream"],
          ["Analyst queries", "column store", "Storage engines"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const HEALTH_RECORDS: CaseStudy = caseStudy(
  {
    id: "health-records",
    title: "A patient health-records portal",
    tagline:
      "Patients, doctors and labs share the most private data there is. Who may see what, and how it stays secret.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["authentication", "authorization", "encryption", "replication", "observability"],
    learn: [
      "Strong sign-in for patients and staff",
      "Access by relationship: my patients, my records",
      "Encrypt records and keep keys apart",
      "Audit every access",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "The most private data there is",
      body: [
        "A clinic network puts records online: patients read their own results, doctors see their patients, labs upload results. A single leak harms real people and breaks the law.",
      ],
      add: [
        node("patient", "phone", "Patient", -4.6, -1.6),
        node("doctor", "browser", "Doctor", -4.6, 1.6),
        node("portal", "server", "Records portal", -1, 0),
        node("records", "db", "Records", 2.6, 0),
      ],
      link: [
        both("patient", "portal", 1),
        both("doctor", "portal", 1),
        both("portal", "records", 1),
      ],
    },
    {
      kind: "solution",
      short: "Sign in",
      uses: "authentication",
      title: "Strong sign-in for everyone",
      body: [
        "Patients sign in with a passkey or a password plus a one-time code; staff use the clinic's identity provider with hardware keys. Sessions are short and end when a shared clinic computer is idle.",
      ],
      add: [node("idp", "lock", "Identity provider", -1, -2.6)],
      link: [both("doctor", "idp", 1), link("idp", "portal", "event")],
    },
    {
      kind: "technique",
      short: "Who sees",
      uses: "authorization",
      title: "Access follows the care relationship",
      body: [
        'A doctor may read a record only if there is a care relationship ("Dr Iyer treats patient 812"). Patients see only their own. Every query is checked by a central policy and scoped in the database, so a bug can\'t widen access.',
      ],
      quiz: {
        question: "Dr Iyer types another clinic's patient number into the URL. What happens?",
        options: [
          "She sees the record: she is a doctor",
          "Not found: there is no care relationship, so the query returns nothing",
          "The patient is asked by email",
        ],
        answer: 1,
        why: "Being authenticated is not being authorised. The relationship, not the role alone, decides.",
      },
      add: [node("policy", "lock", "Access policy", 2.6, -2.6, { sub: "care relationships" })],
      link: [both("portal", "policy", 1)],
    },
    {
      kind: "solution",
      short: "Encrypt",
      uses: "encryption",
      title: "Encrypted everywhere, keys apart",
      body: [
        "TLS to every device, mutual TLS between services, records encrypted at rest with envelope encryption. Keys live in a key service in another account, so a stolen database backup is unreadable.",
      ],
      add: [node("kms", "lock", "Key service", 5, -1.4, { hue: "violet" })],
      link: [both("records", "kms", 1)],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Never lose a record",
      body: [
        "Records replicate synchronously to a second zone (a confirmed lab result exists in two places) and are backed up nightly, encrypted, with restores rehearsed every month.",
      ],
      add: [node("follower", "db", "Sync follower", 2.6, 2.6, { hue: "teal" })],
      link: [link("records", "follower", "copy")],
    },
    {
      kind: "technique",
      short: "Audit",
      uses: "observability",
      title: "Every access is recorded",
      body: [
        "Each read of a record writes an entry to an append-only audit log: who, which record, when, from where. Patients can see who viewed their file, and unusual patterns (a clerk opening 300 records at night) raise an alert.",
      ],
      add: [node("audit", "storage", "Audit log", -1, 2.8, { sub: "append only" })],
      link: [link("portal", "audit", "write")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Private by design",
      body: [
        "Prove who you are, prove you may, keep it secret, keep it safe, and record every look.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["Identity", "passkeys, MFA, clinic IdP", "Authentication"],
          ["Who may read", "care relationships + central policy", "Authorization"],
          ["Secrecy", "TLS, mTLS, envelope encryption", "Encryption"],
          ["Durability", "sync follower + rehearsed backups", "Replication"],
          ["Accountability", "append-only audit log + alerts", "Observability"],
        ],
      },
    },
  ],
);
