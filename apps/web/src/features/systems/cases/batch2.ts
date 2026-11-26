import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ Checkpoint after Communication ============ */

export const FOOD_ORDERS: CaseStudy = caseStudy(
  {
    id: "food-orders",
    title: "Food delivery: from tap to doorstep",
    tagline:
      "One order touches a customer, a restaurant, a courier and a payment. Events, queues and live updates tie them together.",
    minutes: 11,
    level: "intermediate",
    tier: "integrate",
    concepts: ["transactions", "pubsub", "queues", "realtime", "caching"],
    learn: [
      "Place an order and hold the payment in one step",
      "Announce the order once; let every team react",
      "Match couriers with a queue of jobs",
      "Stream live status to the customer",
    ],
    builtOn: [
      { label: "Queue", path: "/structures/queue" },
      { label: "Binary heap", path: "/structures/binary-heap" },
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Four parties, one order",
      body: [
        "A customer orders dinner. The restaurant must accept it, a courier must be found, the payment held and later captured, and the customer wants to watch the courier approach. Dinner peak: 3,000 orders a minute.",
      ],
      add: [
        node("customer", "phone", "Customer", -4.6, 0),
        node("orders", "service", "Orders", -1.4, 0),
        node("odb", "db", "Orders DB", -1.4, 2.6),
      ],
      link: [both("customer", "orders", 2)],
    },
    {
      kind: "solution",
      short: "Place it",
      uses: "transactions",
      title: "Place the order atomically",
      body: [
        "Placing an order writes the order row and a payment **hold** (an authorisation, not a charge) in one transaction with the status `placed`. If anything fails, there is neither an order nor a hold.",
      ],
      add: [node("pay", "service", "Payments", -3.8, 2.6)],
      link: [link("orders", "odb", "write"), both("orders", "pay", 1)],
    },
    {
      kind: "solution",
      short: "Announce",
      uses: "pubsub",
      title: "Announce it once: OrderPlaced",
      body: [
        "The order service publishes **OrderPlaced** and returns at once. The restaurant tablet app, courier matching, notifications and analytics each subscribe and react on their own.",
        'Adding a "loyalty points" feature next month is just another subscriber.',
      ],
      add: [
        node("bus", "stream", "Event bus", 1.4, 0),
        node("kitchen", "service", "Restaurant app", 4, -2.2),
        node("match", "service", "Courier matching", 4.4, 0),
        node("notify", "service", "Notifications", 4, 2.2),
      ],
      link: [
        link("orders", "bus", "event"),
        link("bus", "kitchen", "event"),
        link("bus", "match", "event"),
        link("bus", "notify", "event"),
      ],
    },
    {
      kind: "solution",
      short: "Matching",
      uses: "queues",
      title: "Courier matching is a queue of jobs",
      body: [
        "Each accepted order becomes a matching job on a queue. Workers pick the best nearby courier (a small heap of candidates by distance and rating) and offer the job; no answer in 20 s, the job is retried with the next courier.",
        "A job that fails five times lands in a dead-letter queue and a human dispatcher steps in.",
      ],
      add: [
        node("jobs", "queue", "Matching jobs", 6.6, -1, { queue: 3 }),
        node("workers", "worker", "Matchers", 6.6, 1.2),
      ],
      link: [link("match", "jobs", "event"), link("jobs", "workers", "event")],
    },
    {
      kind: "solution",
      short: "Live map",
      uses: "realtime",
      title: "The customer watches the courier come",
      body: [
        "The customer's app keeps one connection open (Server-Sent Events: the updates only flow one way). Status changes and the courier's position every few seconds are pushed down it.",
        'If the phone sleeps, it reconnects with "last event 57" and catches up.',
      ],
      quiz: {
        question: "Why Server-Sent Events rather than polling every 2 seconds?",
        options: [
          "Polling can't carry JSON",
          "Updates arrive as they happen, without thousands of empty requests",
          "SSE works without a network",
        ],
        answer: 1,
        why: 'The server pushes each change down one open response; polling would mostly return "nothing new".',
      },
      add: [node("live", "gateway", "Live updates", -1.4, -2.6, { sub: "SSE" })],
      link: [link("bus", "live", "event"), link("live", "customer", { kind: "event", rate: 3 })],
    },
    {
      kind: "solution",
      short: "Menus",
      uses: "caching",
      title: "Menus are read 1,000 times per change",
      body: [
        "Browsing menus is the heaviest read traffic. Each restaurant's menu is cached and deleted when the restaurant edits it, so the menu database barely notices dinner time.",
      ],
      add: [node("menus", "cache", "Menu cache", -3.8, -2.6)],
      link: [both("customer", "menus", 3)],
    },
    {
      kind: "case",
      short: "Offline",
      title: "Case: the restaurant tablet loses Wi-Fi",
      body: [
        'The tablet goes offline for three minutes. Its OrderPlaced events wait in its subscription; nothing is lost. After two minutes without an "accepted", a fallback rule phones the restaurant automatically.',
      ],
      set: { kitchen: { state: "down", queue: 3 } },
      link: [link("bus", "kitchen", { dashed: true })],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "The order is decided once, in one transaction; everything after it is a reaction to events.",
      ],
      table: {
        head: ["Step", "Mechanism", "Lesson"],
        rows: [
          ["Place order + hold payment", "one transaction", "Transactions"],
          ["Tell everyone", "OrderPlaced on a topic", "Pub/sub"],
          ["Find a courier", "jobs on a queue, retries, DLQ", "Message queues"],
          ["Live status", "SSE with catch-up", "Real-time updates"],
          ["Menus", "cache with delete-on-edit", "Caching"],
        ],
      },
      set: { kitchen: { state: "ok", queue: 0 } },
      link: [link("bus", "kitchen", "event")],
    },
  ],
);

export const COURSE_VIDEOS: CaseStudy = caseStudy(
  {
    id: "course-videos",
    title: "A video-lecture platform",
    tagline:
      "Mentors upload two-hour lectures from their laptops; learners stream them on trains. Uploads, events, workers and the edge.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["files-media", "pubsub", "queues", "cdn", "replication"],
    learn: [
      "Upload straight to storage, in resumable parts",
      "Fan the upload event out to independent processors",
      "Scale transcoding workers on queue age",
      "Stream adaptive video from the edge",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Big files in, many streams out",
      body: [
        "Mentors upload 2-hour lectures (about 4 GB each). Learners watch on anything from fibre to a moving train. Each video needs several qualities, captions and a thumbnail.",
      ],
      add: [
        node("mentor", "browser", "Mentor", -4.6, -1.4),
        node("app", "server", "Platform API", -1.4, -1.4),
        node("meta", "db", "Video metadata", -1.4, 1.4),
      ],
      link: [both("mentor", "app", 1), link("app", "meta", "write")],
    },
    {
      kind: "solution",
      short: "Upload",
      uses: "files-media",
      title: "Straight to storage, in resumable parts",
      body: [
        "The API checks the mentor and hands out presigned URLs for a multipart upload: 10 MB parts, sent in parallel, retried individually. A dropped connection resumes from the last part, not from zero.",
      ],
      add: [node("bucket", "storage", "Object storage", 1.6, -2.6, { sub: "originals" })],
      link: [link("mentor", "bucket", { kind: "heavy", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Fan out",
      uses: "pubsub",
      title: "UploadCompleted: three teams react",
      body: [
        "When the last part lands, storage emits **UploadCompleted**. Transcoding, captions and thumbnails each subscribe independently: a slow caption service never delays the video.",
      ],
      add: [
        node("bus", "stream", "Event bus", 3.6, -1),
        node("captions", "service", "Captions", 6, -2.6),
        node("thumbs", "service", "Thumbnails", 6.2, -0.8),
      ],
      link: [
        link("bucket", "bus", "event"),
        link("bus", "captions", "event"),
        link("bus", "thumbs", "event"),
      ],
    },
    {
      kind: "solution",
      short: "Transcode",
      uses: "queues",
      title: "Transcoding is a queue of heavy jobs",
      body: [
        "Transcoding a 2-hour lecture into 5 qualities takes an hour of CPU, so each video is split into 2-minute chunks: 60 jobs on a queue, processed in parallel by a worker pool that scales on the **age** of the oldest job.",
      ],
      quiz: {
        question: "Why scale workers on the age of the oldest job rather than CPU?",
        options: [
          "CPU can't be measured",
          "Age says how long mentors wait, which is what matters to them",
          "Old jobs are cheaper",
        ],
        answer: 1,
        why: "A queue that is busy but fresh is fine; a growing wait is the symptom users feel.",
      },
      add: [
        node("jobs", "queue", "Transcode jobs", 5.2, 1.2, { queue: 6 }),
        node("workers", "worker", "Transcoders", 7.4, 1.6, { sub: "autoscaled" }),
      ],
      link: [
        link("bus", "jobs", "event"),
        link("jobs", "workers", { kind: "heavy", rate: 3 }),
        link("workers", "bucket", "write"),
      ],
    },
    {
      kind: "case",
      short: "Crash",
      uses: "queues",
      title: "Case: a worker dies mid-chunk",
      body: [
        "A transcoder is replaced during a deploy halfway through chunk 37. It never acknowledges the job, so after its visibility timeout the job reappears and another worker redoes it. Writing the output under a fixed name makes the retry harmless.",
      ],
      set: { workers: { state: "hot", badge: "1 lost, retried" } },
    },
    {
      kind: "solution",
      short: "Stream",
      uses: "cdn",
      title: "Adaptive streaming from the edge",
      body: [
        "Each quality is cut into 4-second segments with a playlist. The player starts low and switches up or down as the connection changes, fetching segments from the nearest CDN edge.",
      ],
      add: [
        node("cdn", "cdn", "CDN", 1.6, 3.4, { sub: "video segments" }),
        node("learners", "phone", "Learners", -4.6, 3.4),
      ],
      set: { workers: { state: "ok", badge: "" } },
      link: [both("learners", "cdn", 3), link("cdn", "bucket", { kind: "request", rate: 1 })],
    },
    {
      kind: "solution",
      short: "Catalogue",
      uses: "replication",
      title: "The catalogue reads from replicas",
      body: [
        'Course pages, search and "continue watching" read video metadata constantly. Read replicas take that load; publishing a video writes to the leader.',
      ],
      add: [node("rep", "db", "Read replica", -1.4, 3.6, { hue: "teal" })],
      link: [link("meta", "rep", "copy"), both("learners", "rep", 1)],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "Bytes never pass through the API; work never blocks the upload; viewers never touch the origin.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["4 GB uploads", "presigned multipart to storage", "Files and media"],
          ["Several processors", "one event, independent subscribers", "Pub/sub"],
          ["Hours of CPU", "chunk jobs on a queue", "Message queues"],
          ["Shaky connections", "adaptive segments via CDN", "CDNs"],
          ["Catalogue reads", "replicas", "Replication"],
        ],
      },
    },
  ],
);

/* ============ Checkpoint after Reliability ============ */

export const PAYMENTS: CaseStudy = caseStudy(
  {
    id: "payments",
    title: "A payments flow that never charges twice",
    tagline:
      "Selling AlgoVerse Premium through a card provider: slow networks, retries, bots and outages, handled one by one.",
    minutes: 12,
    level: "advanced",
    tier: "integrate",
    concepts: [
      "transactions",
      "timeouts-retries",
      "queues",
      "rate-limiting",
      "redundancy",
      "observability",
    ],
    learn: [
      "Model a payment as states in a transaction",
      "Retry safely with idempotency keys",
      "Process provider webhooks from a queue",
      "Stop card-testing bots",
      "Fail over without losing a payment, and know it worked",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Money must move exactly once",
      body: [
        "Learners buy Premium with a card. AlgoVerse calls an external card provider, which later confirms with a webhook. The rule: never charge twice, never lose a payment, never grant Premium without one.",
      ],
      add: [
        node("buyer", "browser", "Learner", -4.6, 0),
        node("billing", "service", "Billing", -1.4, 0),
        node("bdb", "db", "Billing DB", -1.4, 2.6),
        node("provider", "service", "Card provider", 2.6, 0, { hue: "slate", sub: "external" }),
      ],
      link: [both("buyer", "billing", 1), both("billing", "provider", 1)],
    },
    {
      kind: "technique",
      short: "States",
      uses: "transactions",
      title: "A payment is a small state machine",
      body: [
        "Each attempt is a row: `created → pending → succeeded | failed`. Moving between states is a conditional update in a transaction, so a payment can't jump from failed to succeeded, or succeed twice.",
      ],
      code: [
        "UPDATE payments SET state = 'succeeded'",
        "WHERE id = :id AND state = 'pending';   -- 0 rows: already handled",
      ],
      link: [link("billing", "bdb", "write")],
    },
    {
      kind: "problem",
      short: "Lost reply",
      uses: "timeouts-retries",
      title: "The reply that got lost",
      body: [
        "The provider charges the card, but the response is lost on the way back. Billing times out after 5 s and retries. Without protection, the learner is charged twice.",
        "Every call carries an **idempotency key** (the payment's id). The provider recognises the retry and returns the first result instead of charging again.",
      ],
      quiz: {
        question: "Which value makes a good idempotency key here?",
        options: [
          "A fresh random id per attempt",
          "The payment's own id, the same for every retry",
          "The current time",
        ],
        answer: 1,
        why: "Retries must carry the same key so the provider can recognise them as one operation.",
      },
      set: { provider: { badge: "key pay_81f2: charged once" } },
      link: [link("billing", "provider", "request", "request", { kind: "response", back: true })],
    },
    {
      kind: "solution",
      short: "Webhooks",
      uses: "queues",
      title: "Webhooks go through a queue",
      body: [
        "The provider confirms payments with webhooks, sometimes twice, sometimes out of order. The webhook endpoint only verifies the signature, drops the event on a queue and answers 200.",
        "Workers apply each event with the conditional state update, so duplicates change nothing. Failed ones retry, then land in a dead-letter queue.",
      ],
      add: [
        node("hooks", "queue", "Webhook queue", 2.6, 2.6, { queue: 2 }),
        node("hworkers", "worker", "Webhook workers", 0.4, 3.8),
      ],
      link: [
        link("provider", "hooks", "event"),
        link("hooks", "hworkers", "event"),
        link("hworkers", "bdb", "write"),
      ],
    },
    {
      kind: "problem",
      short: "Card testers",
      uses: "rate-limiting",
      title: "Bots testing stolen cards",
      body: [
        "A bot tries thousands of stolen card numbers through the checkout to find working ones. Every attempt costs a provider fee and risks the account.",
        "Rate limits per account, per card and per IP address (token buckets in a shared store), plus a challenge after repeated failures, end the attack.",
      ],
      add: [
        node("bot", "user", "Card-testing bot", -4.6, -2.4, { hue: "rose" }),
        node("limiter", "gateway", "Rate limiter", -3, -1, { sub: "per account, card, IP" }),
      ],
      link: [
        link("bot", "limiter", { kind: "request", rate: 4 }, { kind: "fail", back: true, rate: 3 }),
      ],
    },
    {
      kind: "solution",
      short: "Two zones",
      uses: "redundancy",
      title: "Fail over without losing a payment",
      body: [
        "Billing runs in two zones. The database has a **synchronous** follower in the other zone, so a confirmed payment exists on two machines (RPO = 0). If zone A fails, the follower is promoted within a minute.",
      ],
      add: [node("bdb2", "db", "Sync follower", -3.8, 4, { hue: "teal", sub: "zone B" })],
      link: [link("bdb", "bdb2", "copy")],
      zones: [
        { label: "Zone A", x1: -2.4, y1: -0.8, x2: -0.4, y2: 3.4, hue: "blue" },
        { label: "Zone B", x1: -4.8, y1: 3.2, x2: -2.8, y2: 4.8, hue: "violet" },
      ],
    },
    {
      kind: "technique",
      short: "Watch it",
      uses: "observability",
      title: "Know that it works",
      body: [
        "The SLO: 99.5% of payments reach a final state within 60 seconds. Dashboards show success rate by provider and card type; a trace follows each payment from click to webhook.",
        'An alert on "payments stuck in pending" catches a broken webhook long before any learner complains.',
      ],
      metrics: [
        { label: "Success", value: "98.9%" },
        { label: "Final < 60 s", value: "99.7%", tone: "good" },
        { label: "Stuck pending", value: "0", tone: "good" },
      ],
      add: [node("monitor", "monitor", "Metrics + traces", 2.4, -2.6)],
      link: [link("billing", "monitor", "event"), link("hworkers", "monitor", "event")],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: ["Every failure has a planned answer, and the system can prove it is working."],
      table: {
        head: ["Threat", "Answer", "Lesson"],
        rows: [
          ["Double state changes", "conditional state updates", "Transactions"],
          ["Lost replies, retries", "idempotency keys", "Timeouts and retries"],
          ["Duplicate webhooks", "queue + idempotent workers", "Message queues"],
          ["Card testing", "rate limits + challenges", "Rate limiting"],
          ["Zone failure", "sync follower, RPO 0", "Redundancy"],
          ["Silent breakage", "SLO + stuck-payment alert", "Observability"],
        ],
      },
    },
  ],
);

/* ============ Checkpoint after Architecture ============ */

export const MARKETPLACE_CHECKOUT: CaseStudy = caseStudy(
  {
    id: "marketplace-checkout",
    title: "Marketplace checkout across services",
    tagline:
      "Inventory, payments and shipping are separate services with separate databases. A checkout must still be all-or-nothing.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["microservices", "sagas", "service-discovery", "pubsub", "timeouts-retries"],
    learn: [
      "Draw service boundaries around data",
      "Run checkout as an orchestrated saga",
      "Find services and protect calls with breakers",
      "Publish the result for everyone else",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Four teams, one checkout",
      body: [
        "A marketplace for second-hand textbooks. Four teams own Cart, Inventory, Payments and Shipping, each with its own database. A checkout must reserve the book, charge the buyer and book a pickup, or do none of it.",
      ],
      add: [
        node("buyer", "browser", "Buyer", -4.8, 0),
        node("gw", "gateway", "API gateway", -2.4, 0),
        node("cart", "service", "Cart", 0, -2.4),
        node("inv", "service", "Inventory", 0.6, -0.8),
        node("payS", "service", "Payments", 0.6, 0.8),
        node("ship", "service", "Shipping", 0, 2.4),
      ],
      link: [both("buyer", "gw", 2), both("gw", "cart", 1)],
    },
    {
      kind: "technique",
      short: "Own data",
      uses: "microservices",
      title: "Each service owns its data",
      body: [
        "No service reads another's tables: Inventory alone decides whether a book is available. That keeps teams independent, and rules out one big database transaction across all four.",
      ],
      add: [
        node("invDb", "db", "Inventory DB", 2.8, -1.4, { size: 0.7 }),
        node("payDb", "db", "Payments DB", 2.8, 1.2, { size: 0.7 }),
        node("shipDb", "db", "Shipping DB", 2.2, 3.2, { size: 0.7 }),
      ],
      link: [
        link("inv", "invDb", "write"),
        link("payS", "payDb", "write"),
        link("ship", "shipDb", "write"),
      ],
    },
    {
      kind: "solution",
      short: "Saga",
      uses: "sagas",
      title: "Checkout is an orchestrated saga",
      body: [
        "A checkout orchestrator runs three local steps in order: **reserve the book → charge the buyer → book a pickup**. Each step has a compensation: release the book, refund the charge.",
        "It saves its state after every step, so a restart resumes where it stopped.",
      ],
      table: {
        head: ["Step", "Compensation"],
        rows: [
          ["Reserve book", "Release book"],
          ["Charge buyer", "Refund"],
          ["Book pickup", "(last step: nothing to undo)"],
        ],
      },
      add: [node("orch", "service", "Checkout saga", -1.8, 2, { sub: "orchestrator" })],
      link: [
        both("gw", "orch", 1),
        both("orch", "inv", 1),
        both("orch", "payS", 1),
        both("orch", "ship", 1),
      ],
    },
    {
      kind: "case",
      short: "No pickup",
      uses: "sagas",
      title: "Case: no courier in that town",
      body: [
        "Shipping can't book a pickup in the seller's town. The saga runs compensations in reverse: refund the buyer, release the book, and tell the buyer why, all within seconds.",
      ],
      quiz: {
        question: "In which order do the compensations run?",
        options: [
          "Release book, then refund",
          "Refund, then release book",
          "Both at once, order doesn't matter",
        ],
        answer: 1,
        why: "Compensations undo in reverse order of the steps: the charge came after the reservation, so it is undone first.",
      },
      set: { ship: { state: "hot", badge: "no courier" } },
      link: [
        link("orch", "ship", "fail"),
        link("orch", "payS", "event"),
        link("orch", "inv", "event"),
      ],
    },
    {
      kind: "technique",
      short: "Discovery",
      uses: "service-discovery",
      title: "Finding services that move",
      body: [
        "Instances of every service come and go with deploys and autoscaling. Each registers with a service registry and heartbeats; sidecars resolve `payments` to healthy instances and drain old ones before shutdown.",
      ],
      add: [node("registry", "registry", "Service registry", -2.6, -2.6)],
      set: { ship: { state: "ok", badge: "" } },
      link: [
        link("inv", "registry", "copy"),
        link("payS", "registry", "copy"),
        link("ship", "registry", "copy"),
      ],
    },
    {
      kind: "technique",
      short: "Breakers",
      uses: "timeouts-retries",
      title: "Every hop has a timeout and a breaker",
      body: [
        'The orchestrator calls Payments with a 2-second timeout, retries with backoff and an idempotency key, and trips a circuit breaker if Payments keeps failing. Checkouts then fail fast with "try again in a minute" instead of piling up.',
      ],
      set: { payS: { badge: "breaker: closed" } },
    },
    {
      kind: "solution",
      short: "Announce",
      uses: "pubsub",
      title: "Publish OrderCompleted",
      body: [
        "When the saga succeeds it publishes **OrderCompleted**. Search removes the listing, the seller is notified, and analytics counts the sale, all as subscribers, none in the checkout path.",
      ],
      add: [node("bus", "stream", "Event bus", -3.6, 3.4)],
      link: [link("orch", "bus", "event")],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "Independence between teams is bought with explicit coordination: a saga, a registry and events.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["Team independence", "a database per service", "Monolith or microservices"],
          ["All-or-nothing checkout", "orchestrated saga + compensations", "Sagas"],
          ["Moving instances", "registry + sidecars", "Service discovery"],
          ["Slow dependencies", "timeouts, idempotent retries, breakers", "Timeouts and retries"],
          ["Everyone else", "OrderCompleted event", "Pub/sub"],
        ],
      },
    },
  ],
);

/* ============ Checkpoint after Security ============ */

export const SCHOOL_SSO: CaseStudy = caseStudy(
  {
    id: "school-sso",
    title: "Single sign-on for forty schools",
    tagline:
      "Students, teachers and principals from forty schools sign in once and see only what they should.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["authentication", "authorization", "stateless", "encryption", "caching"],
    learn: [
      "Delegate sign-in to an identity provider",
      "Carry identity in short-lived tokens",
      "Scope every query to the caller's school",
      "Encrypt everywhere and keep secrets out of code",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One login, forty schools",
      body: [
        "A district rolls AlgoVerse out to 40 schools: 60,000 students, 3,000 teachers, 40 principals. Everyone signs in with their school account; a teacher sees their classes, a principal their school, nobody another school's data.",
      ],
      add: [
        node("student", "browser", "Student", -4.6, -1.4),
        node("teacher", "browser", "Teacher", -4.6, 1.4),
        node("app", "server", "AlgoVerse", -1, 0),
        node("data", "db", "Classes & grades", 2.6, 0, { sub: "all 40 schools" }),
      ],
      link: [both("student", "app", 1), both("teacher", "app", 1), both("app", "data", 1)],
    },
    {
      kind: "solution",
      short: "Sign in",
      uses: "authentication",
      title: "Sign in at the district's identity provider",
      body: [
        "AlgoVerse never sees a password. It redirects to the district's identity provider (OpenID Connect), which already enforces MFA for staff; the provider returns a signed ID token naming the user, their school and their role.",
      ],
      add: [node("idp", "lock", "District identity provider", -1, -2.8)],
      link: [both("student", "idp", 1), link("idp", "app", "event")],
    },
    {
      kind: "technique",
      short: "Tokens",
      uses: "stateless",
      title: "Short-lived tokens keep servers stateless",
      body: [
        "AlgoVerse issues its own 15-minute access token (school, role, user) plus a refresh token that can be revoked. Any server verifies the signature without a lookup, so the servers stay stateless.",
      ],
      quiz: {
        question: "A teacher leaves the district. How is their access cut off quickly?",
        options: [
          "Wait for the 15-minute token to expire, and revoke the refresh token so it can't be renewed",
          "Tokens can never be cancelled",
          "Delete the teacher's browser cookies remotely",
        ],
        answer: 0,
        why: "Short access tokens limit the window; revoking the refresh token stops renewal. That is why access tokens are kept short.",
      },
      add: [node("app2", "server", "AlgoVerse ×N", -1, 2.4, { sub: "stateless" })],
      link: [both("teacher", "app2", 1), both("app2", "data", 1)],
    },
    {
      kind: "technique",
      short: "Tenant",
      uses: "authorization",
      title: "Every query is scoped to a school",
      body: [
        "Every query carries the caller's school from the token, and the database enforces row-level security too: even a buggy query can't return another school's rows.",
        "Within a school, roles decide actions (students submit, teachers grade), and relationships decide which class a teacher may see.",
      ],
      set: { data: { badge: "row-level security" } },
      zones: [{ label: "School 7", x1: 1.6, y1: -1, x2: 3.6, y2: 0.8, hue: "green" }],
    },
    {
      kind: "solution",
      short: "Fast checks",
      uses: "caching",
      title: "Cache the permission checks",
      body: [
        '"Does teacher 42 teach class 9B?" is asked on almost every request. The answer is cached for 60 seconds and deleted when class assignments change, so permission checks cost a millisecond.',
      ],
      add: [
        node("perm", "cache", "Permission cache", 2.6, -2.8, { sub: "60 s, delete on change" }),
      ],
      link: [both("app", "perm", 2), both("app2", "perm", 2)],
    },
    {
      kind: "solution",
      short: "Encrypt",
      uses: "encryption",
      title: "Encrypt everywhere, secrets in a vault",
      body: [
        "TLS from browsers, mutual TLS between services, grades encrypted at rest with keys in a key service. The identity provider's client secret lives in a secrets manager, not in the code.",
      ],
      add: [node("vault", "lock", "Secrets + keys", 4.8, -1.2, { hue: "violet" })],
      link: [both("app", "vault", 1)],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "Identity comes from the district; every request proves who it is; the data enforces who may see it.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["Passwords, MFA", "district identity provider (OIDC)", "Authentication"],
          ["Scaling servers", "short tokens, no server sessions", "Stateless services"],
          ["Forty tenants", "school scope + row-level security", "Authorization"],
          ["Fast checks", "cached permissions", "Caching"],
          ["Secrets and data", "TLS, mTLS, KMS, vault", "Encryption"],
        ],
      },
    },
  ],
);

/* ============ Capstone ============ */

export const ALGOVERSE_CAPSTONE: CaseStudy = caseStudy(
  {
    id: "algoverse-capstone",
    title: "Capstone: AlgoVerse at ten million learners",
    tagline:
      "Everything together. Grow AlgoVerse from one server to ten million learners, one decision at a time.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "napkin-math",
      "cdn",
      "load-balancing",
      "stateless",
      "caching",
      "replication",
      "sharding",
      "queues",
      "pubsub",
      "realtime",
      "rate-limiting",
      "redundancy",
      "observability",
      "authentication",
      "cicd",
    ],
    learn: [
      "Grow an architecture in the order the numbers demand",
      "See how fifteen lessons fit one system",
      "Explain why each box exists",
      "Ship and operate it safely",
    ],
  },
  [
    {
      kind: "setup",
      short: "Day one",
      title: "Day one: one server",
      body: [
        "AlgoVerse starts as one server and one database. It serves lessons, grades code and keeps progress. Perfect for a few hundred learners.",
      ],
      add: [
        node("learners", "user", "Learners", -5, 0),
        node("app", "server", "App", -1.6, 0),
        node("db", "db", "Database", 1.6, 0),
      ],
      link: [both("learners", "app", 1), both("app", "db", 1)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "The target: ten million a month",
      body: [
        "10M monthly learners, 2M daily, 40 requests each: about 80M requests a day, ≈ 1,000/s average and ≈ 3,000/s at the evening peak. Code runs: 4M a day at 2 s of CPU each. Video: 30 TB a day out.",
      ],
      metrics: [
        { label: "Peak requests", value: "≈ 3,000 /s" },
        { label: "Code runs", value: "4 M / day" },
        { label: "Egress", value: "30 TB / day" },
      ],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "The edge: everything static goes to a CDN",
      body: [
        "Scripts, images and lesson videos are identical for everyone: a CDN serves them from near each learner. Most of the 30 TB a day never reaches AlgoVerse's servers.",
      ],
      add: [node("cdn", "cdn", "CDN", -3.4, -2.6, { sub: "static + video" })],
      link: [link("learners", "cdn", "request", { kind: "heavy", back: true, rate: 3 })],
    },
    {
      kind: "solution",
      short: "Front door",
      uses: "load-balancing",
      title: "A front door and identical servers",
      body: [
        "A load balancer spreads requests over a pool of app servers with health checks; sessions move to a shared store so the servers are stateless and can autoscale.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -3.2, 0.6),
        node("app2", "server", "App ×20", -1.6, 2, { sub: "autoscaled" }),
        node("sessions", "cache", "Sessions", -1.6, -2.4),
      ],
      unlink: ["learners>app"],
      link: [
        both("learners", "lb", 3),
        both("lb", "app", 2),
        both("lb", "app2", 3),
        both("app", "sessions", 1),
        both("app2", "sessions", 1),
      ],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache what every learner reads",
      body: [
        "Lesson content, catalogue pages and leaderboards are read thousands of times per change: a shared cache answers 95% of reads in a millisecond.",
      ],
      add: [node("cache", "cache", "Cache", 1.6, -2.4)],
      link: [both("app", "cache", 3), both("app2", "cache", 3)],
    },
    {
      kind: "solution",
      short: "Data",
      uses: "sharding",
      title: "Progress data: sharded by learner, replicated",
      body: [
        "Attempts and progress grow by tens of millions of rows a day: they are sharded by learner id (each learner's history on one shard), and every shard has read replicas for dashboards.",
      ],
      add: [
        node("shardA", "db", "Shard A", 3.8, -0.8, { size: 0.8 }),
        node("shardB", "db", "Shard B", 3.8, 0.9, { size: 0.8 }),
        node("replicas", "db", "Replicas", 6, 0, { hue: "teal", size: 0.8 }),
      ],
      set: { db: { label: "Lessons DB", sub: "content" } },
      link: [
        link("app2", "shardA", "write"),
        link("app2", "shardB", "write"),
        link("shardA", "replicas", "copy"),
        link("shardB", "replicas", "copy"),
      ],
    },
    {
      kind: "solution",
      short: "Grading",
      uses: "queues",
      title: "Code runs go through a queue",
      body: [
        "4M code runs a day at 2 s of CPU each can't happen inside requests. Each run is a job on a queue; sandboxed graders autoscale on queue age, and results come back as events.",
      ],
      add: [
        node("jobs", "queue", "Grading queue", 0.6, 3.6, { queue: 4 }),
        node("graders", "worker", "Sandboxed graders", 3.2, 3.6),
      ],
      link: [link("app2", "jobs", "event"), link("jobs", "graders", { kind: "heavy", rate: 3 })],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Events tie features together",
      body: [
        "Graders publish **SubmissionGraded**. XP, badges, streaks, recommendations and analytics subscribe; none of them slows grading, and new features just subscribe.",
      ],
      add: [node("bus", "stream", "Event bus", 5.6, 2.4)],
      link: [link("graders", "bus", "event"), link("bus", "shardB", "event")],
    },
    {
      kind: "solution",
      short: "Live",
      uses: "realtime",
      title: "Live contests over WebSockets",
      body: [
        "Weekly contests push results and leaderboard changes over WebSockets held by dedicated gateways, which subscribe to the event bus.",
      ],
      add: [node("ws", "gateway", "Live gateways", -3.4, 3.6, { sub: "WebSockets" })],
      link: [link("bus", "ws", "event"), link("ws", "learners", "event")],
    },
    {
      kind: "solution",
      short: "Guard",
      uses: "rate-limiting",
      title: "Guard the door: identity and limits",
      body: [
        "Learners sign in through an identity provider and carry short-lived tokens. The gateway rate-limits each learner's code runs, so one runaway script can't starve a contest.",
      ],
      add: [node("idp", "lock", "Identity + limits", -5, -2.6)],
      link: [both("learners", "idp", 1)],
    },
    {
      kind: "solution",
      short: "Zones",
      uses: "redundancy",
      title: "Survive a zone failure",
      body: [
        "Everything runs in two zones: servers, cache replicas, shard followers, graders. A zone outage costs capacity, not availability; game days rehearse it every quarter.",
      ],
      zones: [
        { label: "Zone A + Zone B (mirrored)", x1: -3.8, y1: -3.2, x2: 6.8, y2: 4.4, hue: "slate" },
      ],
    },
    {
      kind: "technique",
      short: "Operate",
      uses: "observability",
      title: "Operate it: SLOs, traces, canaries",
      body: [
        "SLOs on page load and grading time; traces through every hop; alerts on symptoms. Every change ships through CI, a canary at 1%, then everyone, with feature flags separating deploy from release.",
      ],
      add: [node("ops", "monitor", "Metrics, logs, traces", 6, -2.4)],
      link: [link("app2", "ops", "event"), link("graders", "ops", "event")],
    },
    {
      kind: "recap",
      short: "The map",
      uses: "cicd",
      title: "The map, and why every box exists",
      body: ["Every box answers a number from the napkin math or a failure we planned for."],
      table: {
        head: ["Box", "Exists because", "Lesson"],
        rows: [
          ["CDN", "30 TB/day of identical bytes", "CDNs"],
          [
            "Load balancer + stateless app",
            "3,000 req/s, servers come and go",
            "Load balancing, Stateless",
          ],
          ["Cache", "95% of reads repeat", "Caching"],
          ["Shards + replicas", "progress grows forever", "Sharding, Replication"],
          ["Queue + graders", "4M slow code runs a day", "Message queues"],
          ["Event bus", "many features react to one fact", "Pub/sub"],
          ["Live gateways", "contests need push", "Real-time updates"],
          [
            "Identity + limits",
            "who you are, how much you may run",
            "Authentication, Rate limiting",
          ],
          [
            "Two zones, telemetry, CI/CD",
            "failures and changes are certain",
            "Redundancy, Observability, CI/CD",
          ],
        ],
      },
    },
  ],
);
