import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Reliability ============ */

export const STREAMING_OUTAGE: CaseStudy = caseStudy(
  {
    id: "streaming-outage",
    title: "Video streaming during a regional outage",
    tagline:
      "The final of a cricket tournament streams to 8 million viewers. Then a cloud region fails. Keep the picture moving.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["redundancy", "cdn", "observability", "timeouts-retries"],
    learn: [
      "Feed the CDN from two origins",
      "Let players switch sources on their own",
      "Measure what viewers actually see",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Eight million viewers, one stream",
      body: [
        "A streaming service shows a live final. The camera feed is encoded into 2-second video segments at several qualities in a cloud region, then delivered through a CDN to 8 million phones and TVs.",
      ],
      add: [
        node("venue", "internet", "Stadium feed", -4.6, -1.8),
        node("enc", "worker", "Encoders (region A)", -1.4, -1.8),
        node("origin", "storage", "Origin (region A)", 1.4, -1.8),
        node("cdn", "cdn", "CDN edges", 1.4, 1.2),
        node("viewers", "phone", "Viewers", -2, 2.6, { sub: "8 M" }),
      ],
      link: [
        link("venue", "enc", { kind: "heavy", rate: 2 }),
        link("enc", "origin", "write"),
        link("origin", "cdn", "copy"),
        link("cdn", "viewers", { kind: "heavy", rate: 4 }),
      ],
    },
    {
      kind: "insight",
      short: "Edge",
      uses: "cdn",
      title: "The CDN carries almost everything",
      body: [
        "8 million viewers at about 3 Mbit/s is 24 Tbit/s; no single origin could send that. The CDN fetches each new segment once per edge and serves it to everyone nearby, so the origin only sees a few thousand requests per segment.",
      ],
      metrics: [
        { label: "Viewer traffic", value: "≈ 24 Tbit/s" },
        { label: "Origin traffic", value: "a few Gbit/s", tone: "good" },
      ],
    },
    {
      kind: "solution",
      short: "Two origins",
      uses: "redundancy",
      title: "A second region encodes the same feed",
      body: [
        "The stadium sends the feed to two regions. Each encodes independently and writes segments with the same names and timing. The CDN is told: try region A, and if it fails or is slow, use region B.",
      ],
      add: [
        node("enc2", "worker", "Encoders (region B)", -1.4, -4.2),
        node("origin2", "storage", "Origin (region B)", 1.4, -4.2),
      ],
      link: [
        link("venue", "enc2", { kind: "heavy", rate: 2 }),
        link("enc2", "origin2", "write"),
        link("origin2", "cdn", "copy"),
      ],
    },
    {
      kind: "technique",
      short: "Failover",
      uses: "timeouts-retries",
      title: "Fail over within a segment",
      body: [
        "Edges request each segment from region A with a 1-second timeout; on a timeout or error they ask region B at once. Players keep about 10 seconds of video buffered, so a switch of a second or two is invisible.",
      ],
      quiz: {
        question: "Why does a 10-second player buffer make failover invisible?",
        options: [
          "The buffer stores the whole match",
          "The player keeps playing from what it already has while edges fetch the next segments from region B",
          "Buffers speed up the network",
        ],
        answer: 1,
        why: "A buffer longer than the failover time lets playback continue while the source changes behind the scenes.",
      },
    },
    {
      kind: "case",
      short: "Region A",
      uses: "redundancy",
      title: "Case: region A fails in the 18th over",
      body: [
        "Region A's storage stops answering. Within two seconds edges are fetching from region B. Viewers notice nothing; the operations team notices everything.",
      ],
      set: { enc: { state: "down" }, origin: { state: "down", badge: "region A down" } },
      link: [link("origin", "cdn", "fail")],
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Measure the viewers' experience",
      body: [
        'Players report rebuffering, start time and quality every 30 seconds. During the failover, the rebuffering rate rose from 0.4% to 0.6% for 20 seconds, the number that matters, rather than "region A CPU: unknown".',
      ],
      metrics: [
        { label: "Rebuffering (normal)", value: "0.4%" },
        { label: "Rebuffering (failover peak)", value: "0.6%", tone: "good" },
      ],
      add: [node("mon", "monitor", "Viewer quality", 4.4, 1.2)],
      link: [link("viewers", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The match never stopped",
      body: [
        "Two independent pipelines, an edge that switches fast, players with a buffer, and metrics from the viewer's side.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["24 Tbit/s", "CDN edges", "CDNs"],
          ["Survive a region", "second region encodes the same feed", "Redundancy"],
          ["Switch quickly", "1-second origin timeout, then B", "Timeouts and retries"],
          ["Know viewers are fine", "player-side quality metrics", "Observability"],
        ],
      },
    },
  ],
);

export const TAX_SERVICE: CaseStudy = caseStudy(
  {
    id: "tax-service",
    title: "Checkout with a third-party tax service",
    tagline:
      "Every checkout asks an outside service for the right sales tax. It's slow sometimes, down occasionally, and charges per call.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["timeouts-retries", "rate-limiting", "caching", "observability"],
    learn: [
      "Bound calls to a dependency you don't control",
      "Retry safely, with backoff",
      "Stay under the provider's limits",
      "Cache answers that repeat",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Tax rules you don't want to own",
      body: [
        "An online store sells in many US states, each with different sales-tax rules. Checkout sends the cart and address to a tax provider's API and gets back the tax to charge. 400 checkouts a minute at peak.",
      ],
      add: [
        node("shoppers", "browser", "Shoppers", -4.6, 0),
        node("checkout", "service", "Checkout", -1.2, 0),
        node("tax", "internet", "Tax provider", 2.8, 0),
      ],
      link: [both("shoppers", "checkout", 2), both("checkout", "tax", 2)],
    },
    {
      kind: "problem",
      short: "Hang",
      uses: "timeouts-retries",
      title: "The provider hangs and checkout hangs",
      body: [
        "On a busy afternoon the tax API takes 20 seconds to reply. Checkout has no timeout, so shoppers stare at a spinner and abandon their carts.",
      ],
      set: { tax: { state: "hot", badge: "20 s" }, checkout: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Timeout",
      uses: "timeouts-retries",
      title: "A 2-second timeout and one retry",
      body: [
        "Each call now times out at 2 seconds and is retried once after a short random pause. Tax calculation has no side effects, so retrying is safe. If both attempts fail, checkout uses a fallback.",
      ],
      set: { checkout: { state: "ok" } },
    },
    {
      kind: "tradeoff",
      short: "Fallback",
      uses: "timeouts-retries",
      title: "If the provider is down: estimate, then settle",
      body: [
        'Rather than block the sale, checkout charges an estimated tax from a cached table of state rates and marks the order "tax estimated". A background job recalculates with the provider later; the small difference is absorbed or refunded.',
      ],
      quiz: {
        question: "Why is estimating acceptable here but not for, say, a payment?",
        options: [
          "Taxes don't matter",
          "A small tax difference can be corrected later at little cost; a wrong payment can't be undone so easily",
          "Payments are faster",
        ],
        answer: 1,
        why: "Choose the fallback by asking what an error costs and whether it can be fixed afterwards.",
      },
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Same cart, same address, same answer",
      body: [
        "Shoppers revisit checkout several times before paying. Tax results are cached for 15 minutes, keyed by the cart contents and the address, cutting provider calls by about 60% and saving money too.",
      ],
      add: [node("cache", "cache", "Tax results cache", -1.2, -2.6, { sub: "15 min" })],
      link: [both("checkout", "cache", 3)],
    },
    {
      kind: "technique",
      short: "Limit",
      uses: "rate-limiting",
      title: "Stay under the provider's limit",
      body: [
        "The contract allows 50 calls a second. A shared limiter in checkout keeps under it; above the limit, requests use the cache or the estimate rather than getting rejected by the provider.",
      ],
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Watch the dependency, and the bill",
      body: [
        "Dashboards show the provider's latency, errors, how often the fallback was used, and calls per day against the contract. An alert fires if fallback use stays above 5% for 15 minutes.",
      ],
      metrics: [
        { label: "Provider p95", value: "310 ms" },
        { label: "Fallback used", value: "0.2%", tone: "good" },
        { label: "Calls saved by cache", value: "≈ 60%", tone: "good" },
      ],
      add: [node("mon", "monitor", "Tax dashboard", 2.8, -2.6)],
      link: [link("checkout", "mon", "event")],
      set: { tax: { state: "ok", badge: "" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Someone else's outage isn't yours",
      body: ["Bound the wait, retry once, fall back safely, cache repeats, stay under limits."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Slow provider", "2 s timeout, one retry", "Timeouts and retries"],
          ["Provider down", "estimate now, settle later", "Timeouts and retries"],
          ["Repeat checkouts", "15-minute cache", "Caching"],
          ["Contract limit", "shared limiter", "Rate limiting"],
          ["Health and cost", "provider dashboard", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Architecture ============ */

export const SEARCH_INDEXING: CaseStudy = caseStudy(
  {
    id: "search-indexing",
    title: "Keeping a search index in sync",
    tagline:
      "A job board's search must reflect new and closed jobs within a minute, without the search team reading the jobs database directly.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["batch-stream", "pubsub", "sql-nosql", "indexes", "microservices"],
    learn: [
      "Keep the database as the source of truth",
      "Stream changes into the search index",
      "Rebuild the index from scratch with a batch job",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Two million job listings",
      body: [
        "A job board stores 2 million listings in a relational database. Candidates search by keywords, location, salary and experience. A filled job must disappear from search quickly, or candidates apply for nothing.",
      ],
      add: [
        node("employers", "browser", "Employers", -4.6, -1.8),
        node("jobs", "service", "Jobs service", -1.4, -1.8),
        node("jdb", "db", "Jobs DB", -1.4, 1.2),
        node("candidates", "browser", "Candidates", 4.6, -1.8),
      ],
      link: [both("employers", "jobs", 1), link("jobs", "jdb", "write")],
    },
    {
      kind: "technique",
      short: "Two stores",
      uses: "sql-nosql",
      title: "A database for truth, an index for search",
      body: [
        "The relational database is right for listings, applications and edits. Full-text search with ranking and filters needs a search engine with an inverted index. Each does its job; the search index is a copy, rebuilt from the database whenever needed.",
      ],
      add: [
        node("search", "search", "Search index", 1.8, 1.2, { sub: "inverted index" }),
        node("ssvc", "service", "Search service", 1.8, -1.8),
      ],
      link: [both("candidates", "ssvc", 3), both("ssvc", "search", 3)],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Listen for job changes",
      body: [
        "The jobs service publishes **JobPosted**, **JobUpdated** and **JobClosed**. The search team owns an indexer that subscribes and updates the index within seconds, without touching the jobs database.",
      ],
      add: [
        node("bus", "stream", "Job events", 0.2, -4),
        node("indexer", "worker", "Indexer", 1.8, -4),
      ],
      link: [
        link("jobs", "bus", "event"),
        link("bus", "indexer", "event"),
        link("indexer", "search", "write"),
      ],
    },
    {
      kind: "insight",
      short: "Ownership",
      uses: "microservices",
      title: "Each team owns its side",
      body: [
        "The jobs team can change its tables freely as long as the events stay the same. The search team can change ranking, analyzers and index layout without asking anyone.",
      ],
    },
    {
      kind: "technique",
      short: "Inverted",
      uses: "indexes",
      title: "What the index stores",
      body: [
        'For each word, the index keeps the list of jobs containing it ("python" → 48,213 jobs). A search intersects these lists and applies filters, also indexed (location, salary band), then ranks.',
      ],
      quiz: {
        question: "Why not run full-text search as LIKE '%python%' on the jobs table?",
        options: [
          "It wouldn't find anything",
          "It scans every row for every search and can't rank results; an inverted index jumps straight to matching jobs",
          "Relational databases can't store text",
        ],
        answer: 1,
        why: "Inverted indexes are built for word lookup and ranking; scanning text is slow and unranked.",
      },
    },
    {
      kind: "solution",
      short: "Rebuild",
      uses: "batch-stream",
      title: "A nightly-able full rebuild",
      body: [
        "Events can be missed (a bug, a lost message). A batch job can rebuild a fresh index from the database in 40 minutes; searches switch to it in one step, then the stream catches it up. It runs weekly, and after any change to ranking or analyzers.",
      ],
      add: [node("rebuild", "worker", "Rebuild job", -1.4, 4)],
      link: [link("jdb", "rebuild", "heavy"), link("rebuild", "search", "write")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Search that keeps up",
      body: ["Truth in the database, a stream for freshness, a batch for repair."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Truth vs search", "database + search engine", "SQL and NoSQL"],
          ["Fresh within a minute", "job events to an indexer", "Pub/sub"],
          ["Teams move independently", "events as the contract", "Microservices"],
          ["Fast word lookup", "inverted index", "Indexes"],
          ["Repair and re-rank", "full rebuild, then switch", "Batch and stream"],
        ],
      },
    },
  ],
);

export const NOTIFICATION_PREFS: CaseStudy = caseStudy(
  {
    id: "notification-prefs",
    title: "A notification preferences service",
    tagline:
      'Twelve services send messages; users want one place to say "no marketing SMS, order updates only by push". Respect it everywhere.',
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["microservices", "caching", "pubsub", "service-discovery"],
    learn: [
      "Own a shared concern in one service",
      "Answer preference checks in microseconds",
      "Spread changes to every sender quickly",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Everyone sends, nobody asks",
      body: [
        "A travel company's 12 services (bookings, loyalty, marketing, reviews…) each send email, SMS or push. Each kept its own opt-out list; a customer who unsubscribed from one still got messages from five others.",
      ],
      add: [
        node("users", "phone", "Customers", -4.6, 0),
        node("senders", "service", "12 sending services", 1.6, 0),
      ],
      link: [link("senders", "users", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "One owner",
      uses: "microservices",
      title: "One service owns preferences",
      body: [
        "A small Preferences service owns the rules: per customer, per category (bookings, offers, reviews) and per channel (email, SMS, push), plus quiet hours. The settings screen talks only to it.",
      ],
      add: [
        node("prefs", "service", "Preferences", -1.4, -2.6),
        node("pdb", "db", "Preferences DB", -4.2, -2.6),
      ],
      link: [both("users", "prefs", 1), both("prefs", "pdb", 1)],
    },
    {
      kind: "technique",
      short: "Find it",
      uses: "service-discovery",
      title: "Senders find it by name",
      body: [
        'Senders look up "preferences" in the service registry rather than a fixed address, so the Preferences team can move, scale and replace instances without coordinating with 12 teams.',
      ],
      add: [node("reg", "registry", "Service registry", 1.6, -4.2)],
      link: [link("senders", "reg", "request")],
    },
    {
      kind: "problem",
      short: "Too many checks",
      uses: "caching",
      title: "Millions of checks a day",
      body: [
        "Marketing alone checks 4 million customers before a campaign. Calling Preferences for each would be slow and fragile. Each sender keeps a local cache of preferences, so a check takes microseconds.",
      ],
      quiz: {
        question:
          "A customer turns off offer emails. A sender's cache still says \"on\" for a minute. What's the risk, and how is it handled?",
        options: [
          "None, caches are always right",
          "One unwanted email could slip through; changes are pushed to caches within seconds to keep the window tiny",
          "The customer is unsubscribed from everything",
        ],
        answer: 1,
        why: "Caches trade a little freshness for speed; pushing changes keeps the stale window short.",
      },
      add: [node("local", "cache", "Local preference cache", 1.6, 2.6, { sub: "in each sender" })],
      link: [both("senders", "local", 4)],
    },
    {
      kind: "solution",
      short: "Push changes",
      uses: "pubsub",
      title: "Changes are published",
      body: [
        "Every change publishes **PreferenceChanged**. Senders subscribe and update their local caches within seconds; a full snapshot is loaded when a sender starts.",
      ],
      add: [node("bus", "stream", "Preference events", -1.4, 2.6)],
      link: [link("prefs", "bus", "event"), link("bus", "local", "event")],
    },
    {
      kind: "case",
      short: "Legal",
      uses: "microservices",
      title: "Case: a new privacy rule",
      body: [
        "A new rule says marketing SMS needs explicit opt-in. The Preferences team changes one default and one screen; all 12 senders comply the moment the change is published, without 12 separate projects.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Ask once, respected everywhere",
      body: ["One owner for preferences, local caches for speed, events for freshness."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["One source of truth", "Preferences service", "Microservices"],
          ["Find it reliably", "service registry", "Service discovery"],
          ["Microsecond checks", "local cache in each sender", "Caching"],
          ["Changes in seconds", "PreferenceChanged events", "Pub/sub"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const UPLOAD_SCANNING: CaseStudy = caseStudy(
  {
    id: "upload-scanning",
    title: "Safe file uploads for a support portal",
    tagline:
      "Customers attach screenshots and logs to support tickets. Some files will be malicious. Keep agents and systems safe.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["files-media", "queues", "authorization", "encryption", "authentication"],
    learn: [
      "Quarantine uploads until they're scanned",
      "Scan in the background from a queue",
      "Serve files only to people allowed to see them",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Attach a file to your ticket",
      body: [
        "A software company's support portal lets customers attach files (screenshots, logs, crash dumps) up to 200 MB. Agents open them to diagnose problems. Attackers know agents open attachments.",
      ],
      add: [
        node("customers", "browser", "Customers", -4.6, 0),
        node("portal", "service", "Support portal", -1.2, 0),
        node("agents", "browser", "Support agents", 4.6, 0),
      ],
      link: [both("customers", "portal", 1)],
    },
    {
      kind: "solution",
      short: "Quarantine",
      uses: "files-media",
      title: "Uploads land in quarantine",
      body: [
        'Customers upload directly to a quarantine bucket through a short-lived signed URL. Nothing in quarantine can be downloaded by anyone. Each file is recorded as "pending scan".',
      ],
      add: [
        node("quarantine", "storage", "Quarantine bucket", -1.2, 2.6, {
          state: "hot",
          badge: "no downloads",
        }),
      ],
      link: [link("customers", "quarantine", "heavy")],
    },
    {
      kind: "solution",
      short: "Scan",
      uses: "queues",
      title: "Scanners work from a queue",
      body: [
        "A new upload puts a scan job on a queue. Scanner workers check the file's real type (not its name), run malware scanning, and strip active content from documents. Clean files move to the clean bucket; bad ones are deleted and the ticket notes why.",
      ],
      add: [
        node("q", "queue", "Scan jobs", 1.4, 2.6, { queue: 4 }),
        node("scanner", "worker", "Scanners", 1.4, 4.4, { sub: "sandboxed" }),
        node("clean", "storage", "Clean bucket", 4.2, 2.6),
      ],
      link: [
        link("quarantine", "q", "event"),
        link("q", "scanner", "event"),
        link("scanner", "clean", "write"),
      ],
      quiz: {
        question:
          "A file is named screenshot.png but is really a program. What should the scanner do?",
        options: [
          "Trust the name",
          "Check the actual content type, reject the mismatch, and record it on the ticket",
          "Rename it to .exe",
        ],
        answer: 1,
        why: "File names are chosen by the uploader; only the bytes tell you what a file really is.",
      },
    },
    {
      kind: "technique",
      short: "Who opens",
      uses: "authorization",
      title: "Only the ticket's people can open it",
      body: [
        "A file belongs to a ticket. Only the customer who opened it, people in their company with access, and agents assigned to that ticket can request a download link, which is valid for 5 minutes.",
      ],
      link: [link("clean", "agents", "heavy")],
    },
    {
      kind: "technique",
      short: "Agents",
      uses: "authentication",
      title: "Agents sign in strongly",
      body: [
        "Agents can see many customers' files, so their accounts use single sign-on with hardware keys. A stolen agent password alone opens nothing.",
      ],
    },
    {
      kind: "technique",
      short: "Encrypt",
      uses: "encryption",
      title: "Encrypted, and deleted on schedule",
      body: [
        "Files are encrypted at rest with keys managed by a key service. Attachments are deleted 90 days after a ticket closes; logs often contain personal data, so keeping them forever is a risk, not a benefit.",
      ],
      add: [node("kms", "lock", "Key service", 4.2, 4.4)],
      link: [link("clean", "kms", "request")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Files in, safely",
      body: ["Quarantine first, scan in the background, then show files only to the right people."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Untrusted uploads", "quarantine bucket, direct upload", "Files and media"],
          ["Scan without slowing anyone", "queued, sandboxed scanners", "Message queues"],
          ["Right people only", "ticket-based download links", "Authorization"],
          ["Powerful accounts", "SSO + hardware keys for agents", "Authentication"],
          ["Personal data in logs", "encrypted, deleted after 90 days", "Encryption"],
        ],
      },
    },
  ],
);

/* ============ After Shipping ============ */

export const DR_DRILL: CaseStudy = caseStudy(
  {
    id: "dr-drill",
    title: "A disaster-recovery drill",
    tagline:
      "Everyone says the backup region works. Nobody has tried it. Plan, automate and actually run a failover drill.",
    minutes: 9,
    level: "advanced",
    tier: "integrate",
    concepts: ["redundancy", "testing", "cicd", "observability", "replication"],
    learn: [
      "Set recovery time and data-loss targets",
      "Keep the standby region deployed by the same pipeline",
      "Run a drill and measure it",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "A backup nobody has tried",
      body: [
        "An insurance company runs its policy system in one region, with a standby region that receives database copies. The standby was set up two years ago. Its app servers are three versions behind.",
      ],
      add: [
        node("users", "browser", "Users", -4.6, 0),
        node("app", "server", "App (primary)", -1.2, -1.8),
        node("db", "db", "DB (primary)", 2.2, -1.8),
        node("app2", "server", "App (standby)", -1.2, 1.8, {
          state: "dim",
          badge: "3 versions old",
        }),
        node("db2", "db", "DB (standby)", 2.2, 1.8, { hue: "teal" }),
      ],
      link: [both("users", "app", 2), both("app", "db", 2), link("db", "db2", "copy")],
    },
    {
      kind: "technique",
      short: "Targets",
      uses: "redundancy",
      title: "Decide the targets first",
      body: [
        "The business agrees on two numbers: recover within **30 minutes** (recovery time objective) and lose at most **1 minute** of data (recovery point objective). Every design choice is checked against them.",
      ],
      metrics: [
        { label: "Recovery time target", value: "30 min" },
        { label: "Data-loss target", value: "≤ 1 min" },
      ],
    },
    {
      kind: "solution",
      short: "Same pipeline",
      uses: "cicd",
      title: "Deploy both regions together",
      body: [
        'The pipeline now deploys every release to both regions. The standby runs the same version, scaled down to two servers, so failing over never means "first, upgrade three versions".',
      ],
      add: [node("ci", "worker", "Pipeline", -4.6, -3.4)],
      link: [link("ci", "app", "request"), link("ci", "app2", "request")],
      set: { app2: { state: "ok", badge: "same version" } },
    },
    {
      kind: "technique",
      short: "Lag",
      uses: "replication",
      title: "Is the copy fresh enough?",
      body: [
        "The data-loss target means replication lag must stay under a minute. Lag is measured continuously and alerts at 30 seconds, so the team knows before a disaster whether they'd meet the target.",
      ],
      add: [node("mon", "monitor", "Lag & health", 5.2, 0)],
      link: [link("db2", "mon", "event")],
    },
    {
      kind: "technique",
      short: "Runbook",
      uses: "testing",
      title: "A runbook that's run, not read",
      body: [
        "Failover steps (stop writes, promote the standby database, scale up standby servers, switch DNS, verify) become a script with checks after each step. It's tested monthly against a copy of the setup before the real drill.",
      ],
      quiz: {
        question: "Why automate the failover instead of writing careful instructions?",
        options: [
          "Instructions are illegal",
          "Under stress, at 3 am, people skip or mistype steps; a tested script does the same thing every time",
          "Scripts are faster to write",
        ],
        answer: 1,
        why: "Recovery is exactly when humans are least reliable. Tested automation removes that risk.",
      },
    },
    {
      kind: "case",
      short: "Drill",
      uses: "observability",
      title: "Case: the drill on a Saturday morning",
      body: [
        "With customers warned, the team fails over for real. The database promotes in 2 minutes; scaling servers takes 14 (too slow: images were large); DNS 5. Total 24 minutes, 20 seconds of data lost. Targets met, with a list of three fixes.",
      ],
      set: {
        app: { state: "dim" },
        db: { state: "dim" },
        db2: { hue: "green", badge: "now primary" },
      },
      link: [both("users", "app2", 2), both("app2", "db2", 2)],
      metrics: [
        { label: "Recovery time", value: "24 min", tone: "good" },
        { label: "Data lost", value: "20 s", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A backup you've actually used",
      body: [
        "Targets, the same pipeline for both regions, measured lag, an automated runbook, and real drills.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ['Know what "recovered" means', "30 min / 1 min targets", "Redundancy"],
          ["Standby actually works", "same pipeline deploys both", "CI/CD"],
          ["Data loss within target", "lag measured and alerted", "Replication"],
          ["No 3 am mistakes", "tested failover script", "Testing"],
          ["Proof", "timed drill with findings", "Observability"],
        ],
      },
    },
  ],
);

/* ============ Whole systems ============ */

export const SOCIAL_NETWORK: CaseStudy = caseStudy(
  {
    id: "social-network",
    title: "Capstone: a photo-sharing social network",
    tagline:
      "People post photos, follow friends and scroll a feed. Fifty million daily users, celebrities with millions of followers. Design the whole thing.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "news-feed",
      "napkin-math",
      "files-media",
      "cdn",
      "sharding",
      "unique-ids",
      "caching",
      "queues",
      "pubsub",
      "realtime",
      "rate-limiting",
      "authorization",
    ],
    learn: [
      "Store photos and posts at scale",
      "Build feeds by fan-out, with a celebrity exception",
      "Keep counters and notifications live",
      "Protect privacy and fight spam",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "news-feed",
      title: "Requirements",
      body: [
        "Functional: post photos with captions, follow people, a home feed of followed accounts' posts, likes and comments, notifications, private accounts.",
        "Non-functional: the feed opens in under 300 ms; a new post reaches followers' feeds within seconds; photos load fast anywhere; 50 million daily users.",
      ],
      add: [
        node("users", "phone", "Users", -4.6, 0, { sub: "50 M daily" }),
        node("api", "gateway", "API", -1.6, 0),
      ],
      link: [both("users", "api", 3)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "How big?",
      body: [
        "Posts: 50 M users × 0.2 posts a day = 10 M posts a day, about 120 a second. Feed reads: 50 M × 10 opens a day = 500 M a day, about **6,000 a second**, ~15,000 at peak. Photos: 10 M × 2 MB = **20 TB a day** of originals.",
      ],
      metrics: [
        { label: "Posts", value: "≈ 120 /s" },
        { label: "Feed reads", value: "≈ 6,000 /s avg" },
        { label: "New photos", value: "≈ 20 TB / day" },
      ],
    },
    {
      kind: "solution",
      short: "Photos",
      uses: "files-media",
      title: "Photos to storage, resized in the background",
      body: [
        "The app uploads the photo straight to object storage. A background job makes four sizes (thumbnail to full screen) and strips location data unless the user chose to share it.",
      ],
      add: [
        node("photos", "storage", "Photo storage", -1.6, -2.8),
        node("resize", "worker", "Resizers", 1.2, -2.8),
      ],
      link: [
        link("users", "photos", "heavy"),
        link("photos", "resize", "event"),
        link("resize", "photos", "write"),
      ],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "Photos served from the edge",
      body: [
        "Feeds are mostly images. Every resized photo has an unchanging URL served through a CDN; a popular photo is fetched from storage once per edge.",
      ],
      add: [node("cdn", "cdn", "Photo CDN", -4.6, -2.8)],
      link: [link("photos", "cdn", "copy"), link("cdn", "users", { kind: "heavy", rate: 4 })],
    },
    {
      kind: "technique",
      short: "Posts",
      uses: "unique-ids",
      title: "Post ids sort by time",
      body: [
        "Each post gets a time-sortable 64-bit id, generated without coordination. Feeds and profiles sort by id, which is the same as sorting by time.",
      ],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard posts and follows by user",
      body: [
        'Posts are sharded by author id (a profile page reads one shard). The follow graph is stored twice, sharded by follower and by followee, so "who do I follow" and "who follows me" are each one-shard reads.',
      ],
      add: [node("posts", "db", "Posts & follows", 1.2, 0, { sub: "sharded by user" })],
      link: [both("api", "posts", 2)],
    },
    {
      kind: "solution",
      short: "Fan-out",
      uses: "queues",
      title: "Fan out new posts to followers' feeds",
      body: [
        "A new post is put on a fan-out queue. Workers add its id to the cached feed list of each follower (300 on average). Opening the feed is then one read of a ready-made list.",
      ],
      add: [
        node("fanq", "queue", "Fan-out jobs", 1.2, 2.8, { queue: 5 }),
        node("feeds", "cache", "Feed lists", 4.2, 0, { sub: "per user" }),
      ],
      link: [
        link("posts", "fanq", "event"),
        link("fanq", "feeds", "write"),
        both("api", "feeds", 4),
      ],
    },
    {
      kind: "tradeoff",
      short: "Celebrities",
      uses: "caching",
      title: "The celebrity exception",
      body: [
        "A singer with 40 million followers posts: fanning out means 40 million writes. Instead, accounts with over 100,000 followers are not fanned out; their latest posts are cached once and merged into each follower's feed when it's read.",
      ],
      quiz: {
        question: "Why mix push (fan-out) and pull (merge at read time)?",
        options: [
          "To make the code harder",
          "Push makes reads fast for normal accounts; pull avoids millions of writes for the few huge accounts",
          "Pull is always faster",
        ],
        answer: 1,
        why: "The hybrid keeps both costs bounded: small fan-outs for most posts, one cached list for each celebrity.",
      },
      add: [node("celeb", "cache", "Celebrity posts", 4.2, -2.8)],
      link: [link("celeb", "api", "request")],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Likes, comments and notifications",
      body: [
        'Likes and comments are events. Counters are updated in memory and saved in batches; the notification service subscribes and tells authors "Asha and 41 others liked your photo", grouped so a viral post doesn\'t send 10,000 alerts.',
      ],
      add: [
        node("bus", "stream", "Activity events", -1.6, 2.8),
        node("notify", "service", "Notifications", -4.6, 2.8),
      ],
      link: [link("api", "bus", "event"), link("bus", "notify", "event")],
    },
    {
      kind: "solution",
      short: "Live",
      uses: "realtime",
      title: "Live updates while the app is open",
      body: [
        'While the app is open, a connection pushes new notifications and "3 new posts" hints, so users don\'t pull to refresh repeatedly. Closed apps get mobile push notifications instead.',
      ],
      link: [link("notify", "users", "event")],
    },
    {
      kind: "technique",
      short: "Private",
      uses: "authorization",
      title: "Private accounts and blocks",
      body: [
        "Every read of a post checks: is the account private, does the viewer follow it, has the author blocked them? Fan-out skips blocked followers; the CDN photo URLs for private accounts are signed and short-lived.",
      ],
    },
    {
      kind: "technique",
      short: "Spam",
      uses: "rate-limiting",
      title: "Limits against spam and bots",
      body: [
        "New accounts can follow only a few hundred people a day; comments and likes are limited per minute; mass-following patterns slow an account down automatically.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The whole network",
      body: ["Requirements, numbers, then one decision per box."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["What to build", "feed requirements", "Design an activity feed"],
          ["Size", "≈ 6,000 feed reads a second", "Napkin math"],
          ["Photos", "direct upload, background resizing", "Files and media"],
          ["Fast images", "CDN with fixed URLs", "CDNs"],
          ["Order by time", "time-sortable post ids", "Unique IDs"],
          ["Scale", "posts and follows sharded by user", "Sharding"],
          ["Fast feeds", "fan-out queue to feed lists", "Message queues"],
          ["Celebrities", "cached and merged at read", "Caching"],
          ["Likes and alerts", "activity events, grouped", "Pub/sub"],
          ["While open", "live pushes", "Real-time updates"],
          ["Privacy", "checks on every read", "Authorization"],
          ["Spam", "per-account limits", "Rate limiting"],
        ],
      },
    },
  ],
);
