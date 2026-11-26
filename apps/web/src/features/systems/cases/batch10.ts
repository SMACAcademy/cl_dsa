import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Communication ============ */

export const REPORT_EXPORTS: CaseStudy = caseStudy(
  {
    id: "report-exports",
    title: '"Export to Excel" for a year of data',
    tagline:
      "Accountants click Export and the page times out. Move heavy reports to the background and tell people when they're ready.",
    minutes: 8,
    level: "intermediate",
    tier: "combine",
    concepts: ["queues", "files-media", "pubsub", "apis"],
    learn: [
      "Turn a slow request into a background job",
      "Store results as files with expiring links",
      "Notify the user when it's done",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Month-end, 400 accountants",
      body: [
        "An accounting product lets users export a year of transactions to a spreadsheet. Small exports take a second; a big company's takes 4 minutes. At month-end, 400 accountants export at once.",
      ],
      add: [
        node("users", "browser", "Accountants", -4.6, 0),
        node("web", "server", "Web app", -1.2, 0),
        node("db", "db", "Ledger DB", 2.4, 0),
      ],
      link: [both("users", "web", 2), both("web", "db", 3)],
    },
    {
      kind: "problem",
      short: "Timeouts",
      uses: "apis",
      title: "Requests that never finish",
      body: [
        "Browsers and load balancers give up after 60 seconds, but the export keeps running on the server, so a user retries, starting a second export. Web servers fill up with long jobs and normal pages slow down for everyone.",
      ],
      set: { web: { state: "hot", badge: "busy with exports" }, db: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Accept",
      uses: "apis",
      title: "Accept now, deliver later",
      body: [
        '`POST /exports` returns at once with `202 Accepted` and an export id. The page shows "Preparing your export…" and checks `GET /exports/{id}` for its status.',
      ],
      code: [
        'POST /exports { "from": "2025-04-01", "to": "2026-03-31" }',
        '202 Accepted  { "id": "exp_481", "status": "queued" }',
      ],
      set: { web: { state: "ok", badge: "" } },
    },
    {
      kind: "solution",
      short: "Queue",
      uses: "queues",
      title: "Workers take jobs from a queue",
      body: [
        "Each export becomes a job on a queue. A pool of 10 workers runs them, reading from a replica, so at month-end jobs wait their turn instead of crushing the database. Each company can have at most 2 exports running.",
      ],
      add: [
        node("q", "queue", "Export jobs", -1.2, 2.4, { queue: 6 }),
        node("workers", "worker", "Export workers", 2.4, 2.4, { sub: "×10" }),
      ],
      link: [
        link("web", "q", "event"),
        link("q", "workers", "event"),
        link("workers", "db", "request"),
      ],
      set: { db: { state: "ok" } },
    },
    {
      kind: "solution",
      short: "File",
      uses: "files-media",
      title: "The result is a file with an expiring link",
      body: [
        "The worker writes the spreadsheet to object storage and records its location. The user downloads it through a signed link valid for 24 hours; files are deleted after 7 days.",
      ],
      quiz: {
        question: "Why not keep the finished spreadsheet in the database?",
        options: [
          "Databases can't store files",
          "Large files bloat the database and its backups; object storage is built for big files and direct downloads",
          "Spreadsheets must be on a CDN",
        ],
        answer: 1,
        why: "Files belong in file storage; the database keeps the small facts (who, when, where it is).",
      },
      add: [node("files", "storage", "Export files", 5, 2.4, { sub: "deleted after 7 days" })],
      link: [link("workers", "files", "write"), link("files", "users", "heavy")],
    },
    {
      kind: "solution",
      short: "Notify",
      uses: "pubsub",
      title: '"Your export is ready"',
      body: [
        "When a job finishes, the worker publishes **ExportReady**. The web app shows a notification if the user is still there, and the email service sends a link if they've left.",
      ],
      add: [node("bus", "stream", "Events", 5, 0), node("email", "service", "Email", 5, -2.4)],
      link: [
        link("workers", "bus", "event"),
        link("bus", "web", "event"),
        link("bus", "email", "event"),
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Heavy work, off the request path",
      body: ["Accept fast, work in the background, deliver a file, tell the user."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["No timeouts", "202 Accepted + status endpoint", "APIs"],
          ["Month-end rush", "queue and a fixed worker pool", "Message queues"],
          ["Big results", "files with expiring links", "Files and media"],
          ["Tell the user", "ExportReady event", "Pub/sub"],
        ],
      },
    },
  ],
);

/* ============ After Reliability ============ */

export const MULTI_REGION_READS: CaseStudy = caseStudy(
  {
    id: "multi-region-reads",
    title: "Serving users from three regions",
    tagline:
      "A travel site serves India, Europe and the US from one region. Make pages fast everywhere and survive losing a whole region.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["redundancy", "replication", "cap", "observability", "caching"],
    learn: [
      "Read locally from regional replicas",
      "Send writes to one home region",
      "Fail over when a region goes dark",
      "Watch replication lag",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Everything in Mumbai",
      body: [
        "A travel-booking site runs entirely in a Mumbai data centre. Users in Europe and the US wait 250 ms per round trip; a page needing four database trips takes over a second before rendering.",
      ],
      add: [
        node("eu", "browser", "Users in Europe", -4.6, -2),
        node("us", "browser", "Users in the US", -4.6, 2),
        node("app", "server", "App (Mumbai)", 0, 0),
        node("db", "db", "Primary DB (Mumbai)", 3.4, 0),
      ],
      link: [both("eu", "app", 2), both("us", "app", 2), both("app", "db", 3)],
    },
    {
      kind: "solution",
      short: "Regions",
      uses: "replication",
      title: "A replica and app servers in each region",
      body: [
        "App servers and a read replica run in Frankfurt and Virginia too. Searching hotels, reading reviews and viewing bookings read the local replica: round trips drop to a few milliseconds.",
      ],
      add: [
        node("appEU", "server", "App (Frankfurt)", -1.6, -3),
        node("repEU", "db", "Replica (Frankfurt)", 1.6, -3, { hue: "teal" }),
        node("appUS", "server", "App (Virginia)", -1.6, 3),
        node("repUS", "db", "Replica (Virginia)", 1.6, 3, { hue: "teal" }),
      ],
      unlink: ["eu>app", "us>app"],
      link: [
        both("eu", "appEU", 2),
        both("us", "appUS", 2),
        both("appEU", "repEU", 3),
        both("appUS", "repUS", 3),
        link("db", "repEU", "copy"),
        link("db", "repUS", "copy"),
      ],
    },
    {
      kind: "tradeoff",
      short: "Writes",
      uses: "cap",
      title: "Writes still go home",
      body: [
        "Bookings must never double-sell a room, so all writes go to the primary in Mumbai: a European booking takes ~250 ms longer, which is acceptable for a booking. Right after booking, the user's own reads go to the primary for a minute, so they see their booking even if the replica lags.",
      ],
      link: [link("appEU", "db", "write"), link("appUS", "db", "write")],
      quiz: {
        question:
          'A European user books, then refreshes "My trips" and doesn\'t see it. Why, and what fixes it?',
        options: [
          "The booking failed",
          "The local replica hasn't caught up; read the user's own data from the primary for a short time after they write",
          "Clear the browser cache",
        ],
        answer: 1,
        why: 'Asynchronous replicas lag. "Read your own writes" routes that user\'s reads to the primary briefly.',
      },
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Regional caches for hot pages",
      body: [
        "Hotel pages for popular cities are cached in each region for 5 minutes. Prices and availability come live from the replica; descriptions and photos from the cache.",
      ],
      add: [node("cacheEU", "cache", "Cache (Frankfurt)", -4, -4.2, { size: 0.8 })],
      link: [both("appEU", "cacheEU", 2)],
    },
    {
      kind: "technique",
      short: "Lag",
      uses: "observability",
      title: "Watch replication lag",
      body: [
        'Each replica reports how far behind the primary it is. Normally under a second; above 30 seconds, the region\'s app shows availability as "checking…" and confirms at the primary before booking.',
      ],
      metrics: [
        { label: "Frankfurt lag", value: "0.4 s", tone: "good" },
        { label: "Virginia lag", value: "0.7 s", tone: "good" },
      ],
      add: [node("mon", "monitor", "Lag dashboard", 5.4, 0)],
      link: [link("repEU", "mon", "event"), link("repUS", "mon", "event")],
    },
    {
      kind: "case",
      short: "Region down",
      uses: "redundancy",
      title: "Case: Mumbai goes dark",
      body: [
        "A power failure takes out the Mumbai region. The Frankfurt replica is promoted to primary (a few seconds of writes may be lost, and that risk is accepted in advance), DNS sends Indian users to Frankfurt, and bookings resume in about four minutes.",
      ],
      set: {
        app: { state: "down" },
        db: { state: "down" },
        repEU: { badge: "promoted to primary", hue: "green" },
      },
      link: [link("repEU", "repUS", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Local reads, one home for writes",
      body: ["Fast everywhere for reads; careful about writes; ready to lose a region."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Fast pages abroad", "regional replicas", "Replication"],
          ["No double bookings", "writes to one primary; read your own writes", "CAP"],
          ["Hot pages", "regional caches", "Caching"],
          ["Know when data is stale", "replication-lag alerts", "Observability"],
          ["Lose a region", "promote a replica, move traffic", "Redundancy"],
        ],
      },
    },
  ],
);

/* ============ After Architecture ============ */

export const ORDER_FULFILMENT: CaseStudy = caseStudy(
  {
    id: "order-fulfilment",
    title: "Order fulfilment across services",
    tagline:
      "Pay, pick, pack, ship, deliver: five teams, five services, one order that must never get lost between them.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["sagas", "pubsub", "transactions", "microservices", "observability"],
    learn: [
      "Model an order as a series of events",
      "Publish reliably with an outbox",
      "Compensate when a later step fails",
      "Find stuck orders",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One order, five services",
      body: [
        "A home-goods store's order passes through Payments, Warehouse (pick and pack), Shipping (label and courier) and Notifications. Each is a separate service owned by a different team.",
      ],
      add: [
        node("orders", "service", "Orders", -4, 0),
        node("pay", "service", "Payments", -1.2, -2.4),
        node("wh", "service", "Warehouse", 1.6, 0),
        node("ship", "service", "Shipping", 4.4, -2.4),
        node("notify", "service", "Notifications", 4.4, 2.4),
      ],
    },
    {
      kind: "technique",
      short: "Events",
      uses: "pubsub",
      title: "Each step reacts to the previous one",
      body: [
        "Orders publishes **OrderPlaced**; Payments charges and publishes **PaymentTaken**; Warehouse picks and publishes **OrderPacked**; Shipping books a courier and publishes **Shipped**. Notifications listens to all of them.",
      ],
      add: [node("bus", "stream", "Event bus", 0.2, 2.6)],
      link: [
        link("orders", "bus", "event"),
        link("bus", "pay", "event"),
        link("bus", "wh", "event"),
        link("bus", "ship", "event"),
        link("bus", "notify", "event"),
      ],
    },
    {
      kind: "problem",
      short: "Lost event",
      uses: "transactions",
      title: "Saved, but never announced",
      body: [
        'Orders saves the order, then crashes before publishing **OrderPlaced**. The customer sees "Order confirmed", but no other service ever hears of it.',
        'The **outbox** fixes this: the order row and an "event to publish" row are written in **one transaction**; a relay publishes outbox rows and marks them sent.',
      ],
      add: [node("odb", "db", "Orders DB + outbox", -4, 2.6)],
      link: [link("orders", "odb", "write"), link("odb", "bus", "event")],
      code: [
        "BEGIN;",
        "INSERT INTO orders ...;",
        "INSERT INTO outbox (type, payload) VALUES ('OrderPlaced', ...);",
        "COMMIT;   -- both or neither",
      ],
    },
    {
      kind: "technique",
      short: "Saga",
      uses: "sagas",
      title: "When the warehouse can't find the item",
      body: [
        "Payment is taken, but the warehouse finds the last vase broken. It publishes **PickFailed**; Payments refunds, Orders marks the order cancelled, Notifications apologises with a coupon. Each step has a compensation.",
      ],
      set: { wh: { state: "hot", badge: "item damaged" } },
      quiz: {
        question:
          "Why does each service listen for failures instead of Orders calling refund directly?",
        options: [
          "Services can't call each other",
          "Each team owns its own undo; the saga stays loosely coupled and new steps can join without changing Orders",
          "Events are faster than calls",
        ],
        answer: 1,
        why: "Choreographed sagas let each service react to events it cares about. Orchestrated sagas (one coordinator) are the alternative when the flow gets complex.",
      },
    },
    {
      kind: "insight",
      short: "Boundaries",
      uses: "microservices",
      title: "Each service owns its data",
      body: [
        "Warehouse doesn't read the payments table and Shipping doesn't read the warehouse's. Each keeps the facts it needs from events, so teams can change their own schemas and deploy independently.",
      ],
      set: { wh: { state: "ok", badge: "" } },
    },
    {
      kind: "solution",
      short: "Stuck",
      uses: "observability",
      title: "Find orders that stopped moving",
      body: [
        "A tracker subscribes to all order events and knows each order's last step and when it happened. Orders paid but not packed after 24 hours, or packed but not shipped after 48, appear on a dashboard and alert the operations team.",
      ],
      metrics: [
        { label: "Orders today", value: "18,240" },
        { label: "Stuck > 24 h", value: "7", tone: "bad" },
      ],
      add: [node("tracker", "monitor", "Order tracker", 2.8, 4.4)],
      link: [link("bus", "tracker", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "No order lost between teams",
      body: [
        "Events between services, an outbox for reliability, compensations for failures, a tracker for the rest.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Steps owned by different teams", "event-driven flow", "Pub/sub"],
          ["Save and announce together", "transactional outbox", "Transactions"],
          ["A later step fails", "compensations (refund, cancel)", "Sagas"],
          ["Independent teams", "each service owns its data", "Microservices"],
          ["Stuck orders", "tracker and alerts", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const EXAM_PROCTORING: CaseStudy = caseStudy(
  {
    id: "exam-proctoring",
    title: "Recording online exams for review",
    tagline:
      "Forty thousand candidates take a certification exam from home. Webcam clips must upload reliably and only reviewers may see them.",
    minutes: 9,
    level: "advanced",
    tier: "integrate",
    concepts: ["authentication", "authorization", "encryption", "files-media", "queues"],
    learn: [
      "Upload video in chunks during the exam",
      "Encrypt recordings and limit who can view",
      "Verify the candidate is who they claim",
      "Delete recordings on schedule",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "An exam from your bedroom",
      body: [
        "A certification body runs a 2-hour exam online for 40,000 candidates. Webcam snapshots and short clips are recorded when something looks unusual, then checked by human reviewers. Recordings are personal data.",
      ],
      add: [
        node("candidates", "browser", "Candidates", -4.6, 0, { sub: "40,000" }),
        node("exam", "service", "Exam service", -1.2, 0),
        node("reviewers", "browser", "Reviewers", 5, -2),
      ],
      link: [both("candidates", "exam", 2)],
    },
    {
      kind: "technique",
      short: "Identity",
      uses: "authentication",
      title: "Is this really the candidate?",
      body: [
        "Candidates sign in with their account plus a one-time code sent to their registered phone, then hold their ID up to the camera. The exam session token is bound to that browser and expires when the exam ends.",
      ],
    },
    {
      kind: "solution",
      short: "Chunks",
      uses: "files-media",
      title: "Upload in small chunks as you go",
      body: [
        "Clips are uploaded in 5-second chunks straight to storage using short-lived signed URLs. If home Wi-Fi drops, chunks wait in the browser and upload when it returns; nothing has to be re-sent from the start.",
      ],
      add: [node("store", "storage", "Recordings", 1.6, 2.4)],
      link: [link("candidates", "store", { kind: "heavy", rate: 3 })],
    },
    {
      kind: "technique",
      short: "Encrypt",
      uses: "encryption",
      title: "Encrypted in transit and at rest",
      body: [
        "Uploads use TLS. Each candidate's recordings are encrypted at rest with their own data key, managed by a key service. Reviewers' browsers stream decrypted video through a viewing service; nobody downloads raw files.",
      ],
      add: [node("kms", "lock", "Key service", 4.4, 2.4)],
      link: [link("store", "kms", "request")],
    },
    {
      kind: "solution",
      short: "Review queue",
      uses: "queues",
      title: "Flags become review tasks",
      body: [
        "When the exam software flags something (a second face, the candidate leaving the frame), a task goes on the review queue with the clip's time range. Reviewers pull tasks; a candidate is never reviewed by someone from their own organisation.",
      ],
      add: [node("rq", "queue", "Review tasks", 1.6, -2, { queue: 4 })],
      link: [link("exam", "rq", "event"), link("rq", "reviewers", "event")],
    },
    {
      kind: "technique",
      short: "Who sees",
      uses: "authorization",
      title: "Reviewers see only their assigned clips",
      body: [
        "A reviewer may open a clip only while assigned the task, only the flagged time range, and every view is logged. Candidates can request their own recordings; support staff can't view them at all.",
      ],
      quiz: {
        question:
          "A support agent wants to check a candidate's complaint by watching their recording. What should happen?",
        options: [
          "Allow it, they're staff",
          "Deny it; route the complaint to a reviewer assigned to that case, and log the access",
          "Email the file to the agent",
        ],
        answer: 1,
        why: "Access follows the task, not the job title. Least privilege plus logging protects candidates and staff alike.",
      },
      add: [node("viewer", "service", "Viewing service", 4.4, -0.2)],
      link: [link("store", "viewer", "request"), both("reviewers", "viewer", 1)],
    },
    {
      kind: "case",
      short: "Retention",
      uses: "encryption",
      title: "Case: deleting after 90 days",
      body: [
        "Rules say recordings must be deleted 90 days after results unless under appeal. Deleting a candidate's data key makes every copy, including backups, unreadable at once; the files themselves are removed in the next sweep.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Reliable recordings, tightly guarded",
      body: [
        "Prove who's sitting, upload in pieces, encrypt everything, show only what a task needs.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Right candidate", "account + one-time code + ID check", "Authentication"],
          ["Flaky home Wi-Fi", "5-second chunks, signed URLs", "Files and media"],
          ["Personal data", "per-candidate keys", "Encryption"],
          ["Flags to people", "review task queue", "Message queues"],
          ["Least access", "only assigned clips, logged", "Authorization"],
        ],
      },
    },
  ],
);

export const BANKING_SESSIONS: CaseStudy = caseStudy(
  {
    id: "banking-sessions",
    title: "Sessions for a banking app",
    tagline:
      "Customers stay signed in on their phone for months, but a stolen phone or token must be useless within minutes.",
    minutes: 9,
    level: "advanced",
    tier: "integrate",
    concepts: ["authentication", "encryption", "rate-limiting", "observability", "caching"],
    learn: [
      "Use short access tokens and long refresh tokens",
      "Bind tokens to the device",
      "Ask again for risky actions",
      "Revoke a session everywhere quickly",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Signed in, but safely",
      body: [
        "A bank's app has 9 million users. People hate signing in each time, so the app remembers them, but money transfers, new payees and card controls must be strongly protected.",
      ],
      add: [
        node("app", "phone", "Banking app", -4.6, 0),
        node("gw", "gateway", "API gateway", -1.4, 0),
        node("auth", "service", "Auth service", 1.8, -2.2),
        node("bank", "service", "Banking services", 1.8, 2.2),
      ],
      link: [both("app", "gw", 3), both("gw", "auth", 1), both("gw", "bank", 3)],
    },
    {
      kind: "technique",
      short: "Two tokens",
      uses: "authentication",
      title: "A short pass and a long one",
      body: [
        "After sign-in, the app gets an **access token** valid for 10 minutes (sent with each request) and a **refresh token** valid for 90 days (used only to get new access tokens). A leaked access token is useful for minutes, not months.",
      ],
    },
    {
      kind: "technique",
      short: "Device",
      uses: "encryption",
      title: "Tokens tied to this phone",
      body: [
        "At enrolment the phone creates a key pair in its secure hardware; the private key never leaves the chip. Refreshing a token requires a signature from that key, so a refresh token copied to another device is worthless.",
      ],
      quiz: {
        question:
          "Malware copies the refresh token from a phone's storage. Can the attacker use it elsewhere?",
        options: [
          "Yes, tokens are just strings",
          "No: refreshing needs a signature from a key locked in the original phone's hardware",
          "Only for 10 minutes",
        ],
        answer: 1,
        why: "Binding tokens to a hardware key means stealing the token alone isn't enough.",
      },
    },
    {
      kind: "solution",
      short: "Step up",
      uses: "authentication",
      title: "Ask again before risky actions",
      body: [
        'Viewing a balance needs only the session. Adding a payee or sending more than ₹50,000 asks for a fingerprint or PIN again ("step-up"), producing a one-time proof valid for that action only.',
      ],
    },
    {
      kind: "solution",
      short: "Revoke",
      uses: "caching",
      title: "Revoke within a minute",
      body: [
        "A customer reports their phone stolen. The refresh token is revoked at once; access tokens can't be recalled, so the gateway checks a small revocation list, cached in memory and refreshed every 30 seconds. The stolen phone is locked out within a minute.",
      ],
      add: [
        node("revoked", "cache", "Revocation list", -1.4, -2.6, { sub: "refreshed every 30 s" }),
      ],
      link: [link("auth", "revoked", "write"), both("gw", "revoked", 3)],
    },
    {
      kind: "technique",
      short: "Limits",
      uses: "rate-limiting",
      title: "Limits on PIN and OTP attempts",
      body: [
        "Five wrong PINs lock step-up for 30 minutes; one-time codes allow three tries each. Refresh attempts per device are limited too, so a stolen token can't be hammered.",
      ],
    },
    {
      kind: "technique",
      short: "Signals",
      uses: "observability",
      title: "Spot sessions that look wrong",
      body: [
        "Session events (sign-in, refresh, step-up, new device) feed a risk dashboard. A refresh from a new country within an hour of one at home, or many step-up failures, triggers a call from the fraud team and a forced sign-out.",
      ],
      add: [node("risk", "monitor", "Session risk", 4.8, -2.2)],
      link: [link("auth", "risk", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Convenient and hard to steal",
      body: ["Short tokens, device-bound refresh, step-up for risk, fast revocation."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Stay signed in", "10-min access + 90-day refresh", "Authentication"],
          ["Stolen token", "refresh bound to a hardware key", "Encryption"],
          ["Stolen phone", "revocation list checked at the gateway", "Caching"],
          ["Guessing", "limits on PINs, codes, refreshes", "Rate limiting"],
          ["Odd behaviour", "session risk dashboard", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Shipping ============ */

export const MOBILE_OLD_VERSIONS: CaseStudy = caseStudy(
  {
    id: "mobile-old-versions",
    title: "A mobile app with old versions in the wild",
    tagline:
      "You release weekly, but a third of users run versions from last year. Change the API without breaking any of them.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["apis", "cicd", "testing", "observability"],
    learn: [
      "Change APIs in backward-compatible ways",
      "Test old app versions against new servers",
      "Know which versions are still in use",
      "Retire a version gently",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Forty versions at once",
      body: [
        "A food-delivery app ships a new version every week, but people don't update: 40 versions are in use, the oldest from 18 months ago. The servers deploy daily. Every server change must work for all of them.",
      ],
      add: [
        node("new", "phone", "Latest app", -4.6, -1.6),
        node("old", "phone", "Old apps", -4.6, 1.6, { sub: "40 versions" }),
        node("api", "server", "Mobile API", -0.6, 0),
      ],
      link: [both("new", "api", 2), both("old", "api", 2)],
    },
    {
      kind: "technique",
      short: "Compatible",
      uses: "apis",
      title: "Only add, never break",
      body: [
        "Rules for the API: add new fields, never rename or remove; new required inputs get defaults; old apps ignore fields they don't know. When a field must change meaning, add a new one (`delivery_eta_v2`) and keep the old one working.",
      ],
      quiz: {
        question: "You need to change `price` from rupees to paise. What's the safe way?",
        options: [
          "Change price to paise; old apps will adapt",
          "Add price_paise; keep price in rupees for old apps until they're gone",
          "Ship a new app version first, then change the server",
        ],
        answer: 1,
        why: "Old apps can't learn new meanings. Adding a field keeps them correct while new apps use the better one.",
      },
    },
    {
      kind: "technique",
      short: "Contract tests",
      uses: "testing",
      title: "Old apps' expectations as tests",
      body: [
        "Each released app version records the API calls it makes and the fields it reads. Those become contract tests: every server change runs against the expectations of all supported versions before it can merge.",
      ],
      add: [node("contracts", "storage", "Contracts per app version", 2.6, 2.4)],
    },
    {
      kind: "solution",
      short: "Pipeline",
      uses: "cicd",
      title: "Contract tests in the pipeline",
      body: [
        "The server pipeline runs unit tests, then contract tests for 40 app versions (about 2 minutes), then deploys gradually. A change that breaks version 7.3 fails before any user sees it.",
      ],
      add: [node("ci", "worker", "Server pipeline", 2.6, -2.2)],
      link: [link("contracts", "ci", "request"), link("ci", "api", "request")],
    },
    {
      kind: "technique",
      short: "Versions",
      uses: "observability",
      title: "Know who's on which version",
      body: [
        "Every request carries the app version in a header. A dashboard shows requests and errors per version; when a version drops below 0.5% of users, it's a candidate for retirement.",
      ],
      metrics: [
        { label: "Latest 3 versions", value: "71% of users" },
        { label: "Versions below 0.5%", value: "22" },
      ],
      add: [node("mon", "monitor", "Usage by version", 5.4, 0)],
      link: [link("api", "mon", "event")],
    },
    {
      kind: "case",
      short: "Retire",
      uses: "apis",
      title: "Case: retiring versions older than a year",
      body: [
        'The API has a "minimum version" endpoint. Versions marked old first show a gentle "please update" banner for a month, then a full-screen update prompt. Only then are their contract tests and compatibility code removed.',
      ],
      set: { old: { sub: "18 versions", badge: "update prompt" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Daily servers, yearly apps",
      body: ["Compatibility is a rule, tested on every change, measured every day."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Never break old apps", "only additive changes", "APIs"],
          ["Catch breaks early", "contract tests per app version", "Testing"],
          ["Every change checked", "contracts in the pipeline", "CI/CD"],
          ["Who's still on what", "version header + dashboard", "Observability"],
        ],
      },
    },
  ],
);

/* ============ Whole systems ============ */

export const MESSAGING_APP: CaseStudy = caseStudy(
  {
    id: "messaging-app",
    title: "Capstone: an end-to-end encrypted messaging app",
    tagline:
      "One-to-one and group chats for 200 million people, private even from the company running it. Design it from the first message to the billionth.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "chat",
      "napkin-math",
      "realtime",
      "encryption",
      "storage-engines",
      "sharding",
      "unique-ids",
      "queues",
      "files-media",
      "redundancy",
      "rate-limiting",
      "observability",
    ],
    learn: [
      "Deliver messages in real time and when offline",
      "Encrypt so only the people in a chat can read it",
      "Store and order billions of messages",
      "Keep it running and free of spam",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "chat",
      title: "Requirements",
      body: [
        "Functional: one-to-one and group chats up to 500 people, delivered and read receipts, photos and voice notes, works across phone and laptop.",
        "Non-functional: messages arrive within a second when both are online; nothing is lost if the receiver is offline for a week; the company cannot read messages.",
      ],
      add: [
        node("alice", "phone", "Sender", -4.6, -1.8),
        node("bob", "phone", "Receiver", -4.6, 1.8),
        node("chat", "service", "Chat service", -0.8, 0),
      ],
      link: [both("alice", "chat", 2), both("bob", "chat", 2)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "How big?",
      body: [
        "200 million daily users × 40 messages = 8 billion messages a day ≈ **93,000 a second** on average, about 3× at the evening peak. At ~200 bytes (encrypted text plus metadata), that's 1.6 TB of new messages a day before media.",
      ],
      metrics: [
        { label: "Messages", value: "≈ 93,000 /s avg" },
        { label: "Text per day", value: "≈ 1.6 TB" },
      ],
    },
    {
      kind: "solution",
      short: "Live",
      uses: "realtime",
      title: "A persistent connection per device",
      body: [
        "Each online device keeps a connection to a gateway. A session registry records which gateway each device is on, so a message for Bob goes straight to his gateway and down his open connection.",
      ],
      add: [
        node("gw", "gateway", "Connection gateways", -2.6, 0, { sub: "millions of sockets" }),
        node("sessions", "cache", "Session registry", -0.8, -2.6, { sub: "device → gateway" }),
      ],
      relink: [
        both("alice", "gw", 2),
        both("bob", "gw", 2),
        both("gw", "chat", 3),
        both("chat", "sessions", 2),
      ],
    },
    {
      kind: "technique",
      short: "Encrypt",
      uses: "encryption",
      title: "End-to-end encryption",
      body: [
        "Each device has its own key pair; public keys are published to a key directory. The sender's phone encrypts each message for each recipient device. Servers only ever relay ciphertext they cannot decrypt.",
      ],
      quiz: {
        question:
          "Bob uses his phone and laptop. How many encrypted copies does Alice's phone send for one message?",
        options: [
          "One, decrypted by the server for each device",
          "One per Bob's device (two), each for that device's key",
          "None; the server encrypts it",
        ],
        answer: 1,
        why: "With end-to-end encryption the server can't re-encrypt, so the sender encrypts once per receiving device (groups use shared sender keys to keep this cheap).",
      },
      add: [node("keys", "lock", "Key directory", 1.6, -2.6, { sub: "public keys only" })],
      link: [link("alice", "keys", "request")],
    },
    {
      kind: "solution",
      short: "Offline",
      uses: "queues",
      title: "Messages wait for offline devices",
      body: [
        "If Bob's phone is offline, the message goes to his device's inbox queue. When the phone reconnects, it drains the inbox and acknowledges each message; acknowledged messages are deleted from the server.",
      ],
      add: [node("inbox", "queue", "Device inboxes", 1.6, 2.6, { queue: 5 })],
      link: [link("chat", "inbox", "write"), link("inbox", "gw", "event")],
    },
    {
      kind: "technique",
      short: "Order",
      uses: "unique-ids",
      title: "Ordering within a chat",
      body: [
        "Each message gets a time-sortable id and a per-chat sequence number assigned by the chat's owner shard. Devices show messages by sequence, so a group sees the same order even if messages crossed on the network.",
      ],
    },
    {
      kind: "technique",
      short: "Store",
      uses: "storage-engines",
      title: "Write-heavy storage for inboxes",
      body: [
        "Inboxes are written constantly and read once, then deleted: a log-structured engine handles this well, with deletes cleaned up during background compaction.",
      ],
      set: { inbox: { sub: "LSM storage" } },
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by chat and by device",
      body: [
        "Chat metadata and sequence numbers are sharded by chat id; inboxes by device id. A busy group stays on one chat shard; one user's devices spread naturally.",
      ],
      add: [node("meta", "db", "Chat metadata", 4.4, 0, { sub: "sharded by chat" })],
      link: [both("chat", "meta", 2)],
    },
    {
      kind: "solution",
      short: "Media",
      uses: "files-media",
      title: "Photos and voice notes",
      body: [
        "The phone encrypts the file with a random key, uploads the ciphertext to object storage, and sends that key inside the (end-to-end encrypted) message. Storage holds only encrypted blobs, deleted after 30 days.",
      ],
      add: [node("media", "storage", "Encrypted media", 4.4, 2.6)],
      link: [link("alice", "media", "heavy")],
    },
    {
      kind: "technique",
      short: "Spam",
      uses: "rate-limiting",
      title: "Spam without reading messages",
      body: [
        "Servers can't read content, so spam control uses behaviour: new accounts may message only a few strangers a day, forwarding is limited, and users who are blocked by many people are slowed down.",
      ],
    },
    {
      kind: "solution",
      short: "Resilience",
      uses: "redundancy",
      title: "Losing a gateway or a region",
      body: [
        "Gateways are stateless apart from their sockets: when one dies, devices reconnect elsewhere in seconds and drain their inboxes. Inbox and metadata stores keep three copies across zones; a second region can take over.",
      ],
      set: { gw: { badge: "1 of 400 restarting" } },
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Measure delivery, not servers",
      body: [
        "The key numbers: time from send to delivered receipt, size of inbox backlogs, reconnect rate. Payloads are never logged; metrics use only counts and timings.",
      ],
      metrics: [
        { label: "Send → delivered, p95", value: "380 ms", tone: "good" },
        { label: "Undelivered > 7 days", value: "0.02%" },
      ],
      add: [node("mon", "monitor", "Delivery metrics", -4.6, -4.2)],
      link: [link("gw", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The whole messenger",
      body: ["Requirements, numbers, then one decision per box."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["What to build", "chat requirements", "Design a study-group chat"],
          ["Size", "≈ 93,000 messages a second", "Napkin math"],
          ["Instant delivery", "sockets + session registry", "Real-time updates"],
          ["Private from the company", "end-to-end encryption per device", "Encryption"],
          ["Offline users", "per-device inbox queues", "Message queues"],
          ["Same order for all", "per-chat sequence numbers", "Unique IDs"],
          ["Write-heavy inboxes", "LSM storage", "Storage engines"],
          ["Scale", "shard by chat and by device", "Sharding"],
          ["Photos and voice", "encrypted blobs, key in message", "Files and media"],
          ["Spam", "behaviour-based limits", "Rate limiting"],
          ["Failures", "reconnect, three copies, second region", "Redundancy"],
          ["Health", "delivery-time metrics, no payloads", "Observability"],
        ],
      },
      set: { gw: { badge: "" } },
    },
  ],
);
