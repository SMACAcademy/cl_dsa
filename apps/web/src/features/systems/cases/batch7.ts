import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const ELECTION_NIGHT: CaseStudy = caseStudy(
  {
    id: "election-night",
    title: "Election-night results page",
    tagline:
      "Forty million people refresh one page while counting goes on. Size it, trace it, and keep the numbers honest.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "request-journey", "latency-throughput"],
    learn: [
      "Turn an audience into requests per second",
      "Find what each refresh really costs",
      "See why a tiny page still needs bandwidth math",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Counting day",
      body: [
        "A news site shows live results for 543 seats. Counting runs from 8 am to midnight; 40 million people check in, many refreshing every minute when a close seat is in play.",
      ],
      add: [
        node("readers", "phone", "Readers", -4.4, 0, { sub: "40 M" }),
        node("site", "server", "Results site", 0, 0),
        node("count", "db", "Count feed", 3.4, 0, { sub: "from officials" }),
      ],
      link: [both("readers", "site", 3), link("count", "site", "write")],
    },
    {
      kind: "technique",
      short: "Peak",
      uses: "napkin-math",
      title: "How many refreshes a second?",
      body: [
        "Say 10 million are watching at the busiest hour and refresh once a minute: 10,000,000 ÷ 60 ≈ **170,000 requests a second**. The daily average is far lower, but the peak is what the site must survive.",
      ],
      metrics: [
        { label: "Watching at peak", value: "10 M" },
        { label: "Refreshes", value: "≈ 170,000 /s", tone: "bad" },
      ],
      set: { site: { state: "hot" } },
    },
    {
      kind: "technique",
      short: "Bytes",
      uses: "napkin-math",
      title: "Small page, big pipe",
      body: [
        "The results page is 60 KB (compressed). 170,000 × 60 KB ≈ **10 GB a second**, about 80 Gbit/s. Even if the servers could compute it, one data centre's network link couldn't send it.",
      ],
      quiz: {
        question:
          "If the page shrank to a 2 KB JSON update after the first load, what would the bandwidth be?",
        options: ["About 340 MB/s", "About 3.4 GB/s", "About 34 GB/s"],
        answer: 0,
        why: "170,000 × 2 KB ≈ 340 MB a second: 30 times less, just by sending only what changed.",
      },
      metrics: [{ label: "Bandwidth", value: "≈ 10 GB/s", tone: "bad" }],
    },
    {
      kind: "insight",
      short: "One refresh",
      uses: "request-journey",
      title: "What one refresh really does",
      body: [
        "Trace it: DNS (cached), TLS handshake (reused), request, then the server reads 543 seat totals from the count database and builds the page. Every refresh repeats that same work for every reader, although the answer only changes every few seconds.",
      ],
      table: {
        head: ["Hop", "Time"],
        rows: [
          ["Network", "60 ms"],
          ["Read 543 seat totals", "45 ms"],
          ["Build the page", "15 ms"],
        ],
      },
      set: { count: { state: "hot", badge: "170k reads/s" } },
    },
    {
      kind: "solution",
      short: "Build once",
      uses: "latency-throughput",
      title: "Build the page once a second, not per reader",
      body: [
        "A job builds the results page and a small JSON update **once a second** and saves them as files. Every reader gets the same prebuilt file: the database sees one read a second instead of 170,000, and each response takes a few milliseconds.",
      ],
      add: [node("builder", "worker", "Page builder", 3.4, -2.2, { sub: "every 1 s" })],
      unlink: ["count>site"],
      link: [link("count", "builder", "request"), link("builder", "site", "write")],
      set: { count: { state: "ok", badge: "1 read/s" }, site: { state: "ok" } },
    },
    {
      kind: "insight",
      short: "Throughput",
      uses: "latency-throughput",
      title: "Faster answers, fewer servers",
      body: [
        "Serving a ready file takes ~2 ms of server time instead of ~60 ms. At 170,000 requests a second that's 340 server-seconds of work each second instead of 10,200: about **30 times fewer servers**.",
      ],
      metrics: [
        { label: "Work per request", value: "60 ms → 2 ms", tone: "good" },
        { label: "Servers needed", value: "÷ 30", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Numbers first",
      body: [
        "The peak, not the daily total, sets the size: ≈ 170,000 refreshes a second.",
        "Bandwidth can be the real limit: send small updates after the first load.",
        "Tracing one refresh showed repeated identical work.",
        "Build once a second, serve the same file to everyone.",
      ],
    },
  ],
);

/* ============ After Scaling ============ */

export const CODING_CONTEST: CaseStudy = caseStudy(
  {
    id: "coding-contest",
    title: "A coding contest starts at 8:00",
    tagline:
      "Fifty thousand programmers open the problems in the same second, then submit solutions for two hours.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["cdn", "caching", "scale-up-out", "load-balancing", "stateless"],
    learn: [
      "Hide problems until the start, then serve them from the edge",
      "Separate reading from judging",
      "Pre-scale for a known start time",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Problems unlock at 8:00:00",
      body: [
        "A contest site runs a two-hour contest for 50,000 programmers. At 8:00:00 everyone opens the five problems; then submissions arrive, each judged against hidden tests.",
      ],
      add: [
        node("coders", "browser", "Programmers", -4.6, 0, { sub: "50,000" }),
        node("site", "server", "Contest site", -0.8, 0),
        node("db", "db", "Contest DB", 2.8, 0),
      ],
      link: [both("coders", "site", 3), both("site", "db", 2)],
    },
    {
      kind: "problem",
      short: "8:00:00",
      uses: "scale-up-out",
      title: "Everyone in the same second",
      body: [
        "Last contest, 50,000 page loads arrived in about 5 seconds: 10,000 a second, each reading problems from the database. The site fell over at 8:00:03 and the contest was postponed.",
      ],
      set: { site: { state: "down", badge: "8:00:03" }, db: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "Problems as static files at the edge",
      body: [
        "Problem statements are the same for everyone, so they're rendered to static pages before the contest. At 8:00 the files are published to the CDN; programmers' browsers fetch them from nearby edges.",
      ],
      quiz: {
        question:
          "How do you stop people seeing the problems before 8:00 if they're already on the CDN?",
        options: [
          "Hope nobody guesses the URL",
          "Publish (or unlock) them at 8:00, with unguessable file names announced at that moment",
          "Serve them from the database instead",
        ],
        answer: 1,
        why: "The files go live only at the start, under names nobody knew before; after that, serving them from the edge is harmless.",
      },
      add: [node("cdn", "cdn", "CDN", -2.6, -2.4, { sub: "problem pages" })],
      link: [link("coders", "cdn", "request", { kind: "response", back: true, rate: 3 })],
      set: { site: { state: "ok", badge: "" }, db: { state: "ok" } },
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "The scoreboard is cached for 10 seconds",
      body: [
        "Everyone refreshes the scoreboard. Computing ranks for 50,000 people per request is wasteful; it's computed once every 10 seconds and cached. Each programmer's own submissions are read fresh.",
      ],
      add: [node("cache", "cache", "Scoreboard cache", 2.8, -2.4, { sub: "10 s" })],
      link: [both("site", "cache", 3)],
    },
    {
      kind: "solution",
      short: "Pool",
      uses: "load-balancing",
      title: "Submissions spread over a pool",
      body: [
        "Submissions go through a load balancer to a pool of stateless web servers. The heavy part, judging, is handed to separate judge machines so a flood of submissions never slows page loads.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -2.6, 0.8),
        node("judges", "worker", "Judges ×40", -0.8, 2.6, { sub: "run tests" }),
      ],
      unlink: ["coders>site"],
      link: [
        both("coders", "lb", 3),
        both("lb", "site", 3),
        link("site", "judges", "request"),
        link("judges", "db", "write"),
      ],
    },
    {
      kind: "technique",
      short: "Stateless",
      uses: "stateless",
      title: "Any server, any programmer",
      body: [
        "Sessions are signed tokens and drafts are saved in the browser, so if a web server is replaced mid-contest, nobody is logged out and nobody loses code.",
      ],
    },
    {
      kind: "technique",
      short: "Pre-scale",
      uses: "scale-up-out",
      title: "Scale before 8:00, not after",
      body: [
        "Autoscaling reacts in minutes, but the spike lasts seconds. The start time is known, so servers and judges are scaled out at 7:45 and scaled back after the last-hour submission rush.",
      ],
      metrics: [
        { label: "Web servers", value: "4 → 24 at 7:45" },
        { label: "Judges", value: "10 → 40" },
        { label: "8:00 page load", value: "180 ms", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A clean start at 8:00",
      body: ["Same content for everyone goes to the edge; heavy work goes to its own pool."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Problems at 8:00", "static pages on the CDN", "CDNs"],
          ["Scoreboard refreshes", "10-second cache", "Caching"],
          ["Submissions", "balanced pool + separate judges", "Load balancing"],
          ["Replace servers safely", "tokens and browser drafts", "Stateless services"],
          ["Known spike", "scale out at 7:45", "Scale up or out"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const CHAT_HISTORY: CaseStudy = caseStudy(
  {
    id: "chat-history",
    title: "Storing chat history",
    tagline:
      "Billions of messages a day, read newest first, scrolled back for years. Pick the engine, the ids and the shard key.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["storage-engines", "unique-ids", "sharding", "indexes", "replication"],
    learn: [
      "Choose a write-friendly storage engine",
      "Order messages with time-sortable ids",
      "Shard by conversation",
      "Read the latest page fast",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Every message, forever",
      body: [
        "A messaging app stores 5 billion messages a day. Opening a chat shows the newest 50; scrolling loads older pages. Users keep chats for years.",
      ],
      metrics: [
        { label: "Writes", value: "≈ 60,000 /s" },
        { label: "New data", value: "≈ 1 TB / day" },
      ],
      add: [
        node("apps", "phone", "Chat apps", -4.4, 0),
        node("chat", "service", "Message service", -1, 0),
        node("store", "db", "Message store", 2.6, 0),
      ],
      link: [both("apps", "chat", 3), link("chat", "store", { kind: "write", rate: 3 })],
    },
    {
      kind: "technique",
      short: "Engine",
      uses: "storage-engines",
      title: "A log-structured engine for constant writes",
      body: [
        "Messages are written once and almost never changed. A log-structured (LSM) engine appends writes in memory and flushes sorted files in the background: fast, sequential writes, which is exactly this workload.",
      ],
      set: { store: { sub: "LSM engine" } },
    },
    {
      kind: "technique",
      short: "Ids",
      uses: "unique-ids",
      title: "Ids that sort by time",
      body: [
        'Each message gets a 64-bit id: milliseconds since an epoch, then a machine number, then a counter. Generated without coordination, unique, and **sorted by time**, so "newest first" is just "highest ids first".',
      ],
      code: ["id = (ms_since_2020 << 22) | (machine << 12) | counter"],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by conversation",
      body: [
        'Every read is "messages in this conversation", so the shard key is the conversation id. A chat\'s history lives on one shard and a page is one read. Sharding by user would scatter a group chat over many shards.',
      ],
      quiz: {
        question: "Why not shard chat messages by message id?",
        options: [
          "Message ids aren't unique",
          "One conversation would be spread over every shard, so each page would ask them all",
          "It would make writes slower",
        ],
        answer: 1,
        why: "Shard by what you read together. Here that's the conversation.",
      },
      add: [
        node("s1", "db", "Shard A", 2.6, -1.6, { size: 0.85 }),
        node("s2", "db", "Shard B", 2.6, 1.6, { size: 0.85 }),
      ],
      remove: ["store"],
      link: [link("chat", "s1", "write"), link("chat", "s2", "write")],
    },
    {
      kind: "technique",
      short: "Key order",
      uses: "indexes",
      title: "The primary key is the index",
      body: [
        "Rows are stored sorted by `(conversation_id, message_id DESC)`. The latest 50 messages are the first 50 rows for that conversation; an older page starts after the last id the app has.",
      ],
      code: [
        "SELECT * FROM messages WHERE conversation_id = :c AND message_id < :before",
        "ORDER BY message_id DESC LIMIT 50;",
      ],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Three copies of every shard",
      body: [
        "Each shard is copied to three machines in different zones. A write is acknowledged after two copies have it, so losing a machine loses nothing, and reads of old pages can go to any copy.",
      ],
      add: [node("reps", "db", "Replicas ×3", 5.4, 0, { hue: "teal" })],
      link: [link("s1", "reps", "copy"), link("s2", "reps", "copy")],
    },
    {
      kind: "case",
      short: "Hot group",
      uses: "sharding",
      title: "Case: a 100,000-member group",
      body: [
        "A celebrity's fan group gets 2,000 messages a second, all on one shard. It's split into time buckets, `(conversation, month)`, so this month's bucket is hot but older history spreads across shards.",
      ],
      set: { s2: { state: "hot", badge: "hot group" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Write fast, read the newest page",
      body: ["The access pattern picked the engine, the id format and the shard key."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["60,000 writes/s", "LSM engine", "Storage engines"],
          ["Newest first", "time-sortable ids", "Unique IDs"],
          ["Read a chat from one place", "shard by conversation", "Sharding"],
          ["One page, one range read", "key (conversation, id desc)", "Indexes"],
          ["Never lose a message", "three copies", "Replication"],
        ],
      },
      set: { s2: { state: "ok", badge: "" } },
    },
  ],
);

export const IOT_SENSORS: CaseStudy = caseStudy(
  {
    id: "iot-sensors",
    title: "Sensor readings from a factory",
    tagline:
      'Ten thousand sensors report every second. Keep a year of readings, answer "last hour" instantly, and summarise the rest.',
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["napkin-math", "storage-engines", "sharding", "replication", "indexes"],
    learn: [
      "Size time-series data",
      "Store readings in time-ordered chunks",
      "Downsample old data",
      "Shard by sensor and time",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Every machine, every second",
      body: [
        "A factory has 10,000 sensors (temperature, vibration, pressure) each reporting once a second. Engineers watch the last hour live and compare months for maintenance planning.",
      ],
      add: [
        node("sensors", "internet", "Sensors", -4.6, 0, { sub: "10,000" }),
        node("ingest", "service", "Ingest", -1.4, 0),
        node("db", "db", "Readings DB", 2, 0),
        node("eng", "browser", "Engineers", 2, -2.6),
      ],
      link: [
        link("sensors", "ingest", { kind: "event", rate: 4 }),
        link("ingest", "db", "write"),
        both("eng", "db", 1),
      ],
    },
    {
      kind: "technique",
      short: "Size",
      uses: "napkin-math",
      title: "How much data?",
      body: [
        "10,000 readings a second × 86,400 s ≈ 860 million a day. At about 16 bytes each (time + value, after compression less), that's ~14 GB a day and ~5 TB a year of raw readings.",
      ],
      metrics: [
        { label: "Readings", value: "860 M / day" },
        { label: "Raw per year", value: "≈ 5 TB" },
      ],
    },
    {
      kind: "technique",
      short: "Engine",
      uses: "storage-engines",
      title: "Store in time-ordered chunks",
      body: [
        "Readings arrive in time order and are queried by time range, so a time-series engine stores each sensor's readings in compressed blocks of an hour. Consecutive values are similar, so compression saves about 10×.",
      ],
      set: { db: { sub: "time-series, hourly blocks" } },
    },
    {
      kind: "technique",
      short: "Index",
      uses: "indexes",
      title: "Find a sensor's hour instantly",
      body: [
        'Blocks are indexed by `(sensor_id, hour)`. "Vibration on press 7, last hour" reads one or two blocks, never scanning the other 9,999 sensors.',
      ],
    },
    {
      kind: "solution",
      short: "Downsample",
      uses: "storage-engines",
      title: "Keep detail recent, summaries forever",
      body: [
        "Per-second data is kept for 30 days. Older data is rolled up into one-minute min/avg/max, which is plenty for monthly trends and 60 times smaller.",
      ],
      quiz: {
        question:
          "An engineer needs the exact vibration spike from 4 months ago. What's the best answer?",
        options: [
          "Keep per-second data forever, just in case",
          "Keep per-minute max values; the spike's peak survives, and flagged incidents keep raw data longer",
          "Delete everything older than 30 days",
        ],
        answer: 1,
        why: "Keeping min and max (not just average) preserves spikes; incidents can be pinned at full detail.",
      },
      add: [node("rollup", "worker", "Roll-up job", 2, 2.6, { sub: "1-minute summaries" })],
      link: [link("db", "rollup", "request"), link("rollup", "db", "write")],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by sensor group",
      body: [
        "As more factories join, readings are sharded by **sensor id** (hashed), with time inside each shard. Writes spread evenly; a query about one sensor touches one shard.",
      ],
      add: [node("db2", "db", "Readings shard 2", 4.6, 0)],
      set: { db: { label: "Readings shard 1" } },
      link: [link("ingest", "db2", "write")],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "A copy on-site and a copy in the cloud",
      body: [
        "Each shard has a replica on-site (so dashboards keep working if the internet drops) and one in the cloud for long-term analysis.",
      ],
      add: [node("cloud", "db", "Cloud replica", 4.6, 2.6, { hue: "teal" })],
      link: [link("db", "cloud", "copy"), link("db2", "cloud", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A year of seconds",
      body: ["Size it, store by time, summarise the past, spread by sensor."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["How big?", "≈ 14 GB a day raw", "Napkin math"],
          ["Time-range reads", "time-series engine, hourly blocks", "Storage engines"],
          ["One sensor fast", "(sensor, hour) index", "Indexes"],
          ["More factories", "shard by sensor", "Sharding"],
          ["Survive outages", "on-site and cloud copies", "Replication"],
        ],
      },
    },
  ],
);

/* ============ After Communication ============ */

export const ORDER_WEBHOOKS: CaseStudy = caseStudy(
  {
    id: "order-webhooks",
    title: "Order webhooks for merchants",
    tagline:
      "A commerce platform tells 100,000 merchants' servers about every order. Some are slow, some are down, all must get every event.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["apis", "queues", "pubsub", "unique-ids", "timeouts-retries"],
    learn: [
      "Design a webhook contract",
      "Isolate slow merchants with queues",
      "Retry with backoff, then park",
      "Let merchants deduplicate",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: '"Tell my server when an order is paid"',
      body: [
        "An online-shop platform hosts 100,000 merchants. Many want their own systems (warehouses, accounting) to hear about orders within seconds: order paid, shipped, refunded.",
      ],
      add: [
        node("orders", "service", "Order service", -4, 0),
        node("hooks", "service", "Webhook service", -0.4, 0),
        node("merchants", "internet", "Merchant servers", 3.6, 0, { sub: "100,000" }),
      ],
      link: [link("orders", "hooks", "event"), link("hooks", "merchants", "request")],
    },
    {
      kind: "technique",
      short: "Contract",
      uses: "apis",
      title: "A clear, signed contract",
      body: [
        'Each webhook is an HTTPS POST with a JSON body, an event type, a timestamp and a signature the merchant can verify. A merchant answers 2xx to say "got it"; anything else means "try again".',
      ],
      code: [
        "POST https://merchant.example/hooks",
        "X-Signature: sha256=…   X-Event-Id: evt_01HF…",
        '{ "type": "order.paid", "order": "ord_7731", "amount": 2499 }',
      ],
    },
    {
      kind: "solution",
      short: "Subscribe",
      uses: "pubsub",
      title: "Subscribe to existing events",
      body: [
        "The order service already publishes **OrderPaid**, **OrderShipped** and **OrderRefunded** to the event bus. The webhook service subscribes; the order service doesn't know webhooks exist.",
      ],
      add: [node("bus", "stream", "Event bus", -2.2, -2.2)],
      unlink: ["orders>hooks"],
      link: [link("orders", "bus", "event"), link("bus", "hooks", "event")],
    },
    {
      kind: "problem",
      short: "Slow",
      uses: "queues",
      title: "One slow merchant blocks everyone",
      body: [
        "A merchant's server takes 30 seconds per call. If deliveries share one line, everyone else waits behind it. Each merchant gets its **own queue**; senders pull from many queues, so a slow merchant only slows itself.",
      ],
      add: [node("q", "queue", "Per-merchant queues", 1.6, 2, { queue: 6 })],
      unlink: ["hooks>merchants"],
      link: [link("hooks", "q", "event"), link("q", "merchants", "request")],
    },
    {
      kind: "technique",
      short: "Retry",
      uses: "timeouts-retries",
      title: "Retry with backoff, then park",
      body: [
        "Each call has a 10-second timeout. Failures are retried after 1 min, 5 min, 30 min, 2 h… for up to 3 days, with jitter. After that, the event is parked and the merchant is emailed; their dashboard can replay it.",
      ],
      set: { merchants: { state: "hot", badge: "1 merchant down" } },
    },
    {
      kind: "technique",
      short: "Dedupe",
      uses: "unique-ids",
      title: "Every event has a unique id",
      body: [
        "Retries mean a merchant may receive the same event twice (their 2xx got lost). Every event carries a unique `X-Event-Id`; merchants store ids they've processed and ignore repeats.",
      ],
      quiz: {
        question:
          "A merchant got order.paid twice and shipped two parcels. Whose fix is it, and how?",
        options: [
          "The platform must guarantee exactly one delivery",
          "The merchant should skip event ids it has already processed; the platform delivers at least once",
          "Turn off retries",
        ],
        answer: 1,
        why: 'Over a network, "at least once" plus deduplication by id is the practical way to get "effectively once".',
      },
      set: { merchants: { state: "ok", badge: "" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every merchant, every event",
      body: ["Subscribe in, queue per merchant, retry patiently, dedupe at the edge."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Clear integration", "signed JSON POST, 2xx = received", "APIs"],
          ["No coupling", "subscribe to order events", "Pub/sub"],
          ["Slow merchants", "a queue per merchant", "Message queues"],
          ["Merchant outages", "backoff for 3 days, then park", "Timeouts and retries"],
          ["Duplicates", "unique event ids", "Unique IDs"],
        ],
      },
    },
  ],
);

export const SUPPORT_TICKETS: CaseStudy = caseStudy(
  {
    id: "support-tickets",
    title: "A customer-support ticket desk",
    tagline:
      "Emails, chats and app reports become tickets, routed to the right agent, searchable in seconds.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["queues", "pubsub", "indexes", "realtime", "sql-nosql"],
    learn: [
      "Turn many channels into one ticket stream",
      "Route work with queues per team",
      "Search tickets with the right indexes",
      "Update agents' screens live",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Every channel, one desk",
      body: [
        "An airline's support team of 800 agents handles 60,000 contacts a day by email, chat and in-app form. Today they're in three different tools and customers repeat themselves.",
      ],
      add: [
        node("customers", "user", "Customers", -4.6, 0, { sub: "email, chat, app" }),
        node("intake", "service", "Intake", -1.4, 0),
        node("db", "db", "Tickets DB", 2, 0),
        node("agents", "browser", "Agents", 5, 0, { sub: "800" }),
      ],
      link: [
        link("customers", "intake", "request"),
        link("intake", "db", "write"),
        both("agents", "db", 2),
      ],
    },
    {
      kind: "technique",
      short: "Model",
      uses: "sql-nosql",
      title: "Tickets in a relational database",
      body: [
        'Tickets, customers, messages and agents are related and updated together ("assign and add a note"), so a relational database with transactions fits. Attachments go to file storage, not the table.',
      ],
    },
    {
      kind: "solution",
      short: "Route",
      uses: "queues",
      title: "A queue per team",
      body: [
        "Intake classifies each ticket (baggage, refunds, Hindi-speaking, VIP) and puts it on that team's queue. Agents pull the next ticket when free, so work is shared evenly and nobody cherry-picks.",
      ],
      add: [
        node("qBag", "queue", "Baggage queue", 2, -2.4, { queue: 5 }),
        node("qRef", "queue", "Refunds queue", 2, 2.4, { queue: 3 }),
      ],
      link: [
        link("intake", "qBag", "event"),
        link("intake", "qRef", "event"),
        link("qBag", "agents", "event"),
        link("qRef", "agents", "event"),
      ],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Ticket events for everyone else",
      body: [
        "Every change publishes an event: **TicketCreated**, **TicketAssigned**, **TicketSolved**. The customer app shows status, reports count response times, and a satisfaction survey goes out after **TicketSolved**.",
      ],
      add: [node("bus", "stream", "Ticket events", -1.4, 2.6)],
      link: [link("db", "bus", "event"), link("bus", "customers", "event")],
    },
    {
      kind: "technique",
      short: "Search",
      uses: "indexes",
      title: "Find a ticket in a second",
      body: [
        'Agents search by booking reference, email and phone: each has an index. Agents\' work lists use `(team, status, created_at)` so "open baggage tickets, oldest first" never scans closed ones.',
      ],
      quiz: {
        question: 'Which index serves "open tickets for my team, oldest first"?',
        options: ["(created_at)", "(team, status, created_at)", "(customer_email)"],
        answer: 1,
        why: "Filter columns first (team, status), then the sort column; the database reads the rows already in order.",
      },
    },
    {
      kind: "solution",
      short: "Live",
      uses: "realtime",
      title: "Two agents, one ticket",
      body: [
        'Agents\' screens hold a live connection. When someone opens a ticket, others see "Priya is replying", and a new customer message appears at once, so two agents never send conflicting answers.',
      ],
      add: [node("live", "gateway", "Live updates", 5, -2.4)],
      link: [link("bus", "live", "event"), link("live", "agents", "event")],
    },
    {
      kind: "case",
      short: "Storm",
      uses: "queues",
      title: "Case: a snowstorm cancels 300 flights",
      body: [
        "Contacts triple in an hour. Queues absorb the burst: the waiting count and estimated wait are shown to customers, and agents from other teams are added to the rebooking queue.",
      ],
      set: { qBag: { queue: 8, state: "hot" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "One desk for every channel",
      body: ["Relational records, team queues, events for the rest, live screens for agents."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Related records", "relational database", "SQL and NoSQL"],
          ["Fair routing", "queue per team", "Message queues"],
          ["Status, reports, surveys", "ticket events", "Pub/sub"],
          ["Fast search", "indexes per lookup", "Indexes"],
          ["No double replies", "live presence", "Real-time updates"],
        ],
      },
      set: { qBag: { queue: 4, state: "ok" } },
    },
  ],
);
