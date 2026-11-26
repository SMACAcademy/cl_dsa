import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Communication ============ */

export const MULTIPLAYER_QUIZ: CaseStudy = caseStudy(
  {
    id: "multiplayer-quiz",
    title: "A live multiplayer quiz",
    tagline:
      "A host shows a question; 5,000 players answer on their phones in ten seconds. Same question, same clock, live leaderboard.",
    minutes: 9,
    level: "intermediate",
    tier: "combine",
    concepts: ["realtime", "pubsub", "caching", "stateless"],
    learn: [
      "Push questions to every phone at once",
      "Score answers against the server's clock",
      "Keep a live leaderboard in memory",
      "Survive a gateway restart mid-game",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One room, five thousand phones",
      body: [
        "A company runs a quiz at its annual meeting: a host's screen shows each question, 5,000 people answer on their phones within 10 seconds, and a leaderboard updates after every round.",
      ],
      add: [
        node("host", "browser", "Host screen", -4.4, -2),
        node("players", "phone", "Players", -4.4, 1.6, { sub: "5,000" }),
        node("game", "service", "Game service", 0, 0),
      ],
      link: [both("host", "game", 1), both("players", "game", 2)],
    },
    {
      kind: "problem",
      short: "Polling",
      uses: "realtime",
      title: "Polling can't start a question fairly",
      body: [
        'If phones poll every 2 seconds, some see the question 2 seconds late, a big handicap in a 10-second round. And 5,000 phones × a poll every 2 s = 2,500 requests a second for mostly "nothing new".',
      ],
      metrics: [
        { label: "Unfair delay", value: "up to 2 s", tone: "bad" },
        { label: "Wasted polls", value: "2,500 /s", tone: "bad" },
      ],
    },
    {
      kind: "solution",
      short: "Push",
      uses: "realtime",
      title: "One WebSocket per phone",
      body: [
        'Every phone keeps a WebSocket to a gateway. When the host clicks "next", the question reaches all 5,000 phones within about 100 ms of each other.',
      ],
      add: [node("ws", "gateway", "Live gateways", -2, 1.6, { sub: "WebSockets" })],
      unlink: ["players>game"],
      link: [both("players", "ws", 3), link("game", "ws", "event")],
    },
    {
      kind: "technique",
      short: "Fan out",
      uses: "pubsub",
      title: "Several gateways, one channel",
      body: [
        "5,000 connections are spread over four gateways. The game service publishes **QuestionShown** and **RoundScored** on a channel per game; every gateway subscribes and forwards to its own phones.",
      ],
      add: [node("bus", "stream", "Game channel", -1.6, -1.2)],
      unlink: ["game>ws"],
      link: [link("game", "bus", "event"), link("bus", "ws", { kind: "event", rate: 3 })],
    },
    {
      kind: "technique",
      short: "Fair clock",
      uses: "realtime",
      title: "The server's clock decides",
      body: [
        'Each question carries "opens at" and "closes at" in server time. Answers are scored by when the server received them, and phones show a countdown corrected for their clock difference, so a fast phone has no edge.',
      ],
      quiz: {
        question: "A player's phone clock is 3 seconds fast. What happens?",
        options: [
          "They get 3 extra seconds",
          "Nothing: the countdown is corrected and the server's receive time is what counts",
          "Their answers are always rejected",
        ],
        answer: 1,
        why: "The phone learns its offset from the server when it connects; scoring never trusts the phone's clock.",
      },
    },
    {
      kind: "solution",
      short: "Leaderboard",
      uses: "caching",
      title: "A leaderboard in memory",
      body: [
        "Scores go into an in-memory sorted set: adding points and reading the top 10 are both fast. After each round the top 10 and each player's own rank are pushed out; the full scores are saved to the database at the end.",
      ],
      add: [
        node("board", "cache", "Leaderboard", 2.6, -1.4, { sub: "sorted set" }),
        node("db", "db", "Results DB", 2.6, 1.4),
      ],
      link: [both("game", "board", 3), link("game", "db", "write")],
    },
    {
      kind: "case",
      short: "Restart",
      uses: "stateless",
      title: "Case: a gateway restarts mid-game",
      body: [
        "One gateway crashes in round 7. Its 1,250 phones reconnect to the others within two seconds; because gateways keep no game state (the game service and leaderboard do), players continue with their scores intact.",
      ],
      set: { ws: { state: "hot", badge: "1 of 4 restarted" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fair, live, and fast",
      body: ["Push for fairness, one clock for scoring, memory for rankings."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Everyone sees the question at once", "WebSockets", "Real-time updates"],
          ["Many gateways", "a channel per game", "Pub/sub"],
          ["Live rankings", "in-memory sorted set", "Caching"],
          ["Gateway crashes", "no state in gateways", "Stateless services"],
        ],
      },
      set: { ws: { state: "ok", badge: "" } },
    },
  ],
);

export const PUSH_NOTIFICATIONS: CaseStudy = caseStudy(
  {
    id: "push-notifications",
    title: "Push notifications for a shopping app",
    tagline:
      "Fifty million phones, a flash sale at noon, and the mobile push services' limits. Send fast without sending twice.",
    minutes: 9,
    level: "intermediate",
    tier: "combine",
    concepts: ["queues", "pubsub", "apis", "unique-ids"],
    learn: [
      "Turn one event into millions of messages",
      "Respect the push services' rate limits",
      "Never notify the same person twice",
      "Let other teams send without coupling",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Noon: the flash sale starts",
      body: [
        'A shopping app has 50 million installs. Marketing wants "Flash sale is live!" on every opted-in phone within 10 minutes of noon. Orders, delivery and chat also send notifications all day.',
      ],
      add: [
        node("teams", "service", "Product teams", -4.4, 0, { sub: "orders, sale, chat" }),
        node("notify", "service", "Notification service", -0.6, 0),
        node("push", "internet", "Push services", 3.4, 0, { sub: "Apple / Google" }),
        node("phones", "phone", "Phones", 6, 0, { sub: "50 M" }),
      ],
      link: [
        both("teams", "notify", 1),
        link("notify", "push", "request"),
        link("push", "phones", "event"),
      ],
    },
    {
      kind: "technique",
      short: "One API",
      uses: "apis",
      title: "One small API for everyone",
      body: [
        "Teams don't talk to Apple or Google directly. They call one API: `POST /notifications` with an audience, a template and an idempotency key. The notification service handles devices, languages, quiet hours and opt-outs.",
      ],
      code: [
        "POST /notifications",
        '{ "audience": "segment:sale-optin", "template": "flash_sale", "key": "sale-2026-11-26" }',
      ],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Or just publish an event",
      body: [
        "For everyday messages, teams don't even call the API: the order service already publishes **OrderShipped**, and the notification service subscribes. New notifications need no change in the order service.",
      ],
      add: [node("bus", "stream", "Event bus", -2.6, -2.4)],
      link: [link("teams", "bus", "event"), link("bus", "notify", "event")],
    },
    {
      kind: "solution",
      short: "Queue",
      uses: "queues",
      title: "Fan out through a queue",
      body: [
        "One sale event becomes 30 million messages. A job expands the audience in pages and puts small batches on a queue; senders take batches at the rate the push services allow, and retry later when told to slow down.",
      ],
      metrics: [
        { label: "Messages", value: "30 M" },
        { label: "Send rate", value: "≈ 60,000 /s" },
        { label: "Time", value: "≈ 8 min", tone: "good" },
      ],
      add: [
        node("q", "queue", "Send queue", 1.4, 1.8, { queue: 7 }),
        node("senders", "worker", "Senders ×20", 3.4, 2.4),
      ],
      unlink: ["notify>push"],
      link: [
        link("notify", "q", { kind: "event", rate: 3 }),
        link("q", "senders", "event"),
        link("senders", "push", { kind: "request", rate: 3 }),
      ],
    },
    {
      kind: "technique",
      short: "Once",
      uses: "unique-ids",
      title: "Never send the same message twice",
      body: [
        "A sender crashes after sending half a batch; the batch is redelivered. Each message has an id made from the campaign key and the user (`sale-2026-11-26:u_8812`). Senders record sent ids and skip any they've seen.",
      ],
      quiz: {
        question:
          'Marketing\'s tool times out and they press "Send" again. What prevents a second sale notification?',
        options: [
          "Nothing, the users get two",
          "The same idempotency key: the service sees it already accepted this campaign",
          "The push services drop duplicates",
        ],
        answer: 1,
        why: "The key turns a repeated request into the same campaign, not a second one.",
      },
    },
    {
      kind: "case",
      short: "Priorities",
      uses: "queues",
      title: 'Case: "your order is here" during the sale',
      body: [
        "During the sale's 30 million messages, a delivery notification must not wait 8 minutes. Transactional messages go on their own high-priority queue with dedicated senders; marketing waits its turn.",
      ],
      add: [node("qfast", "queue", "Priority queue", 1.4, -1.8, { queue: 1, hue: "amber" })],
      link: [link("notify", "qfast", "event"), link("qfast", "senders", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast, fair, and only once",
      body: ["One API and events in; queues and ids between; push services out."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Teams send easily", "one API with idempotency keys", "APIs"],
          ["No coupling", "subscribe to existing events", "Pub/sub"],
          ["30 M at the allowed rate", "batches on a queue", "Message queues"],
          ["No duplicates", "a message id per user and campaign", "Unique IDs"],
        ],
      },
    },
  ],
);

/* ============ After Reliability ============ */

export const SMS_OTP: CaseStudy = caseStudy(
  {
    id: "sms-otp",
    title: "One-time codes by SMS",
    tagline:
      "Sign-in codes must arrive in seconds, even when an SMS provider has a bad day, and must not become a free SMS cannon for attackers.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["timeouts-retries", "queues", "rate-limiting", "observability", "redundancy"],
    learn: [
      "Send through a queue with tight timeouts",
      "Fail over between SMS providers",
      "Stop attackers from pumping SMS",
      "Measure delivery, not just sending",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: '"Enter the 6-digit code"',
      body: [
        "A bank's app signs people in with a code sent by SMS: 2 million codes a day, more on salary day. A code is useful for 5 minutes; if it takes 60 seconds to arrive, people give up and call support.",
      ],
      add: [
        node("app", "phone", "Banking app", -4.4, 0),
        node("auth", "service", "Sign-in service", -1, 0),
        node("smsA", "internet", "SMS provider A", 3, -1.2),
      ],
      link: [both("app", "auth", 2), link("auth", "smsA", "request")],
    },
    {
      kind: "problem",
      short: "Slow provider",
      uses: "timeouts-retries",
      title: "The provider hangs, and so does sign-in",
      body: [
        "One afternoon provider A takes 30 seconds to answer. The sign-in service waits on each call, its threads fill up, and even password checks stall.",
      ],
      set: { smsA: { state: "hot", badge: "30 s replies" }, auth: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Queue",
      uses: "queues",
      title: "Sign-in hands off, workers send",
      body: [
        "The sign-in service stores the code and puts a send job on a queue, answering the app at once. Workers send with a 3-second timeout; a failed send is retried once, quickly, because a code that's late is useless.",
      ],
      add: [
        node("q", "queue", "SMS jobs", 0.8, 1.6, { queue: 4 }),
        node("workers", "worker", "SMS workers", 2.6, 1.6),
      ],
      unlink: ["auth>smsA"],
      link: [
        link("auth", "q", "event"),
        link("q", "workers", "event"),
        link("workers", "smsA", "request"),
      ],
      set: { auth: { state: "ok" } },
    },
    {
      kind: "solution",
      short: "Two providers",
      uses: "redundancy",
      title: "A second provider",
      body: [
        "Workers keep a running success rate for each provider. When A's timeouts climb past a threshold, sends switch to provider B for a few minutes, then a trickle tests A again.",
      ],
      add: [node("smsB", "internet", "SMS provider B", 5, 1.6)],
      link: [link("workers", "smsB", { kind: "request", rate: 3 })],
      set: { smsA: { state: "down" } },
    },
    {
      kind: "technique",
      short: "Limits",
      uses: "rate-limiting",
      title: "Stop the SMS cannon",
      body: [
        'Attackers love "send code" buttons: they trigger thousands of SMS to premium numbers and the bank pays. Limits: 3 codes per phone number per 10 minutes, 20 per device per day, and a cap per country prefix.',
      ],
      quiz: {
        question:
          "Which limit stops an attacker using many different phone numbers from one script?",
        options: [
          "Per phone number",
          "Per device and per network address, plus a country cap",
          "None; you can't stop it",
        ],
        answer: 1,
        why: "Per-number limits only stop repeats to the same number. Limits on the sender's side and on unusual destinations catch spraying.",
      },
      add: [node("limits", "cache", "Rate limits", -1, -2.2, { sub: "per number, device" })],
      link: [both("auth", "limits", 2)],
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Measure the code being typed in",
      body: [
        '"Sent" isn\'t success: delivery is. The bank tracks, per provider and country, the time from request to the user typing the right code, and alerts if the p95 passes 20 seconds.',
      ],
      metrics: [
        { label: "Request → typed, p95", value: "11 s", tone: "good" },
        { label: "Codes never used", value: "4%" },
      ],
      add: [node("mon", "monitor", "Delivery dashboard", 5, -2)],
      link: [link("workers", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Codes that arrive",
      body: ["Hand off, bound every wait, keep a second route, and limit who can trigger costs."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Sign-in never stalls", "queue and workers", "Message queues"],
          ["Slow providers", "3 s timeout, one quick retry", "Timeouts and retries"],
          ["Provider outage", "second provider, automatic switch", "Redundancy"],
          ["SMS pumping", "limits per number, device, country", "Rate limiting"],
          ["Is it working?", "measure time to typed code", "Observability"],
        ],
      },
      set: { smsA: { state: "ok" } },
    },
  ],
);

/* ============ After Architecture ============ */

export const TRAVEL_SAGA: CaseStudy = caseStudy(
  {
    id: "travel-saga",
    title: "Booking a trip: flight, hotel and car",
    tagline:
      "Three partners, three bookings, one trip. If the car is gone, the flight and hotel must be undone, cleanly.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["sagas", "timeouts-retries", "queues", "microservices", "unique-ids"],
    learn: [
      "Run a booking as a saga of steps",
      "Undo with compensations, not rollbacks",
      "Handle partners that time out",
      "Make every step safe to repeat",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One trip, three partners",
      body: [
        "A travel site sells packages: a flight, a hotel and a rental car, each booked through a different partner's system. The customer pays once and expects all three, or none.",
      ],
      add: [
        node("customer", "browser", "Customer", -4.6, 0),
        node("trip", "service", "Trip service", -1.4, 0),
        node("flight", "internet", "Airline", 2.6, -2),
        node("hotel", "internet", "Hotel chain", 2.6, 0),
        node("car", "internet", "Car rental", 2.6, 2),
      ],
      link: [
        both("customer", "trip", 1),
        both("trip", "flight", 1),
        both("trip", "hotel", 1),
        both("trip", "car", 1),
      ],
    },
    {
      kind: "problem",
      short: "No rollback",
      uses: "microservices",
      title: "There's no transaction across companies",
      body: [
        "The airline, hotel and car company each have their own databases. Nothing can lock all three and commit together; each booking is final the moment the partner confirms it.",
      ],
    },
    {
      kind: "technique",
      short: "Saga",
      uses: "sagas",
      title: "A saga with an undo for each step",
      body: [
        "Book the flight, then the hotel, then the car. Each step has a **compensation**: cancel the flight, cancel the hotel. If the car fails, the saga runs the compensations backwards and refunds the customer.",
      ],
      table: {
        head: ["Step", "Compensation"],
        rows: [
          ["Hold payment", "release hold"],
          ["Book flight", "cancel flight (free within 24 h)"],
          ["Book hotel", "cancel hotel"],
          ["Book car", "(last step: nothing to undo)"],
        ],
      },
      add: [node("log", "db", "Saga log", -1.4, 2.4, { sub: "step, state" })],
      link: [link("trip", "log", "write")],
    },
    {
      kind: "case",
      short: "Car gone",
      uses: "sagas",
      title: "Case: no cars left in Goa",
      body: [
        'Flight and hotel are booked, then the car partner says "sold out". The saga cancels the hotel, cancels the flight, releases the payment hold, and offers the customer the trip without a car.',
      ],
      set: { car: { state: "down", badge: "sold out" } },
      link: [link("trip", "hotel", "fail"), link("trip", "flight", "fail")],
    },
    {
      kind: "technique",
      short: "Timeouts",
      uses: "timeouts-retries",
      title: "The hotel doesn't answer",
      body: [
        'The hotel\'s system times out after 10 seconds. Did the booking happen? Unknown. The saga **asks** the hotel ("status of booking trip-7731-hotel?") before retrying, because a blind retry could book two rooms.',
      ],
      quiz: {
        question: "A partner call times out. What's the safest next move?",
        options: [
          "Assume it failed and move on",
          "Retry the booking with the same request id, or check its status first",
          "Cancel the whole trip immediately",
        ],
        answer: 1,
        why: 'A timeout means "unknown". Same-id retries or a status check turn unknown into known without double-booking.',
      },
      set: { car: { state: "ok", badge: "" }, hotel: { state: "hot", badge: "10 s timeout" } },
      link: [both("trip", "hotel", 1), both("trip", "flight", 1)],
    },
    {
      kind: "technique",
      short: "Same id",
      uses: "unique-ids",
      title: "Every step has its own id",
      body: [
        "Each partner request carries an id like `trip-7731-hotel`. Partners that support it treat repeats as the same booking; for those that don't, the saga's status check comes first.",
      ],
      set: { hotel: { state: "ok", badge: "" } },
    },
    {
      kind: "solution",
      short: "Durable",
      uses: "queues",
      title: "Sagas survive crashes",
      body: [
        "Each saga step is a message on a queue, and progress is written to the saga log. If the trip service restarts mid-saga, a worker picks up the next message and continues, or compensates, from the last recorded step.",
      ],
      add: [node("q", "queue", "Saga steps", 0.6, 2.4, { queue: 3 })],
      link: [link("trip", "q", "event"), link("q", "trip", { kind: "event", back: false })],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "All three, or a clean undo",
      body: ["Across companies, consistency comes from steps, undos and patient retries."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Separate systems", "no shared transaction", "Microservices"],
          ["All or nothing", "saga with compensations", "Sagas"],
          ["Unknown outcomes", "status check, then retry", "Timeouts and retries"],
          ["No double bookings", "an id per step", "Unique IDs"],
          ["Crashes mid-saga", "queued steps and a saga log", "Message queues"],
        ],
      },
    },
  ],
);

export const FRAUD_DETECTION: CaseStudy = caseStudy(
  {
    id: "fraud-detection",
    title: "Card fraud checks in real time",
    tagline:
      "Every card payment gets a risk score in under 100 ms. Learn from yesterday's patterns, react to this second's.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["batch-stream", "pubsub", "caching", "timeouts-retries", "observability"],
    learn: [
      "Combine stream features with batch-trained models",
      "Score inside a strict time budget",
      "Fail open or closed on purpose",
      "Watch the model, not just the servers",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "100 ms to say yes or no",
      body: [
        "A card network handles 5,000 payments a second. Each must be scored for fraud before it's approved, with a 100 ms budget, because the shopper is waiting at a till.",
      ],
      add: [
        node("tills", "user", "Shops and tills", -4.6, 0),
        node("pay", "service", "Payment switch", -1.4, 0),
        node("score", "service", "Fraud scorer", 1.8, 0),
      ],
      link: [both("tills", "pay", 3), both("pay", "score", 3)],
    },
    {
      kind: "technique",
      short: "Batch",
      uses: "batch-stream",
      title: "Nightly: learn the patterns",
      body: [
        "Every night a batch job trains a model on months of payments and known fraud cases, and computes slow-moving facts for every card: usual countries, usual amounts, usual shops.",
      ],
      add: [
        node("lake", "storage", "Payment history", 1.8, 3, { sub: "months" }),
        node("train", "worker", "Nightly training", 4.6, 3),
      ],
      link: [link("lake", "train", "heavy")],
    },
    {
      kind: "technique",
      short: "Stream",
      uses: "batch-stream",
      title: "Every second: what's happening now",
      body: [
        'Some signals can\'t wait for tonight: "this card was used in Chennai 4 minutes ago and is now in Lisbon", "9 small payments in a minute". A stream job keeps these counts per card, updated with each payment.',
      ],
      add: [
        node("events", "stream", "Payment events", -1.4, -2.4),
        node("streamjob", "worker", "Stream job", 1.8, -2.4, { sub: "per-card counts" }),
      ],
      link: [
        link("pay", "events", "event"),
        link("events", "streamjob", { kind: "event", rate: 3 }),
      ],
    },
    {
      kind: "solution",
      short: "Features",
      uses: "caching",
      title: "Both kinds of facts, one fast lookup",
      body: [
        "The batch facts and the live counts both land in an in-memory feature store keyed by card. The scorer does one lookup (about 2 ms) and runs the model locally.",
      ],
      add: [node("features", "cache", "Feature store", 4.6, 0, { sub: "per card" })],
      link: [
        link("streamjob", "features", "write"),
        link("train", "features", "write"),
        both("score", "features", 3),
      ],
    },
    {
      kind: "tradeoff",
      short: "Budget",
      uses: "timeouts-retries",
      title: "The scorer is slow: approve or decline?",
      body: [
        "If the scorer doesn't answer in 80 ms, the switch can't wait. For small amounts it **fails open** (approve, review later); for large ones it **fails closed** (decline, ask for another check). The choice is made in advance, per amount band.",
      ],
      quiz: {
        question: "Why not just retry the scorer when it's slow?",
        options: [
          "Retries are forbidden in payments",
          "The time budget is already spent; a retry would keep the shopper waiting past the limit",
          "The scorer would give a different answer",
        ],
        answer: 1,
        why: "A retry only helps if there's time left in the budget. Here the safer move is a pre-agreed fallback.",
      },
      set: { score: { state: "hot", badge: "> 80 ms" } },
    },
    {
      kind: "solution",
      short: "Decisions",
      uses: "pubsub",
      title: "Decisions feed everyone else",
      body: [
        'Each decision is published as **PaymentScored**. Case managers subscribe to review declines, the customer app subscribes to send "Was this you?", and tonight\'s training subscribes too, so the model learns from today.',
      ],
      add: [node("review", "service", "Case review", 4.6, -2.4)],
      link: [
        link("score", "events", "event"),
        link("events", "review", "event"),
        link("events", "lake", "copy"),
      ],
      set: { score: { state: "ok", badge: "" } },
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Watch the model, not just the servers",
      body: [
        "Servers can be healthy while the model goes wrong. Dashboards track decline rate, scores by country, and how many declines customers say were genuine; a sudden jump pages the risk team.",
      ],
      metrics: [
        { label: "Score p99", value: "42 ms", tone: "good" },
        { label: "Decline rate", value: "0.8%" },
        { label: "Genuine declined", value: "0.05%", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Yesterday's lessons, this second's signals",
      body: ["Batch for depth, stream for freshness, a strict budget for the shopper."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Long-term patterns", "nightly training", "Batch and stream"],
          ["Right-now signals", "per-card stream counts", "Batch and stream"],
          ["2 ms lookups", "in-memory feature store", "Caching"],
          ["100 ms budget", "fail open or closed by amount", "Timeouts and retries"],
          ["Learn and react", "PaymentScored subscribers", "Pub/sub"],
          ["Is the model OK?", "business metrics on dashboards", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const FILE_SHARING: CaseStudy = caseStudy(
  {
    id: "file-sharing",
    title: "Sharing files with a link",
    tagline:
      '"Anyone with the link can view" sounds simple. Make links safe, revocable and fast, without leaking a single file.',
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["authorization", "files-media", "encryption", "cdn", "authentication"],
    learn: [
      "Check permissions on every download",
      "Use short-lived signed URLs",
      "Encrypt files at rest with per-file keys",
      "Revoke a link instantly",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Share a folder with a client",
      body: [
        'A design studio shares project folders with clients: some links are "anyone with the link", some only for named people, some expire after a week. Files range from PDFs to 4 GB videos.',
      ],
      add: [
        node("owner", "browser", "Studio", -4.6, -1.6),
        node("client", "browser", "Client", -4.6, 1.6),
        node("api", "service", "Sharing service", -1, 0),
        node("files", "storage", "File storage", 2.8, 0),
      ],
      link: [both("owner", "api", 1), both("client", "api", 1), link("api", "files", "write")],
    },
    {
      kind: "technique",
      short: "Who?",
      uses: "authentication",
      title: "Who is asking?",
      body: [
        'Studio staff sign in with their company accounts. A client on a "named people" link signs in with a one-time email code. An "anyone" link carries no identity at all; the link itself is the key.',
      ],
    },
    {
      kind: "technique",
      short: "Allowed?",
      uses: "authorization",
      title: "Check the share on every download",
      body: [
        "A share is a row: file or folder, who (anyone / these emails), can (view / edit), expires. Every request checks it, including the 50th file in a folder, so a removed person loses access at once.",
      ],
      add: [node("shares", "db", "Shares", -1, 2.6, { sub: "who, can, until" })],
      link: [both("api", "shares", 2)],
      code: [
        "share = shares.find(link_id)",
        "allow = share and not share.expired and (share.anyone or user.email in share.people)",
      ],
    },
    {
      kind: "solution",
      short: "Signed URL",
      uses: "files-media",
      title: "Big files come straight from storage",
      body: [
        "Once allowed, the service returns a signed URL valid for 5 minutes and the browser downloads directly from storage, so 4 GB videos never pass through the service.",
      ],
      link: [link("files", "client", { kind: "heavy", rate: 2 })],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "Fast downloads, still private",
      body: [
        "Videos are served through a CDN that checks the same short-lived signature, so clients abroad get fast downloads, and the edge never serves a file without a valid signature.",
      ],
      add: [node("cdn", "cdn", "CDN", 0.6, -2.6, { sub: "checks signatures" })],
      unlink: ["files>client"],
      link: [link("files", "cdn", "copy"), link("cdn", "client", { kind: "heavy", rate: 2 })],
    },
    {
      kind: "technique",
      short: "Encrypt",
      uses: "encryption",
      title: "A key per file",
      body: [
        "Each file is encrypted with its own key, and those keys are encrypted by a master key in a key service. A leaked disk is useless, and deleting a file's key makes every copy, including backups, unreadable.",
      ],
      quiz: {
        question:
          "A client asks for their files to be erased everywhere, including backups. What's the quickest reliable way?",
        options: [
          "Find and delete every backup copy",
          "Destroy the files' keys so all copies become unreadable",
          "Rename the files",
        ],
        answer: 1,
        why: "This is called crypto-shredding: without the key, every encrypted copy is just noise.",
      },
      add: [node("kms", "lock", "Key service", 2.8, 2.6)],
      link: [link("files", "kms", "request")],
    },
    {
      kind: "case",
      short: "Revoke",
      uses: "authorization",
      title: "Case: a link was forwarded by mistake",
      body: [
        'A client forwards an "anyone" link to the wrong mailing list. The studio clicks "turn off link": the share row is disabled, new downloads are refused, and signed URLs already handed out expire within 5 minutes.',
      ],
      set: { shares: { badge: "link disabled", state: "lit" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Easy to share, hard to leak",
      body: ["Every download is checked, every byte is encrypted, and every grant expires."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Know the user", "accounts, email codes, or the link itself", "Authentication"],
          ["Who may see what", "share rows checked each time", "Authorization"],
          ["4 GB downloads", "direct, signed, 5-minute URLs", "Files and media"],
          ["Fast abroad", "CDN that checks signatures", "CDNs"],
          ["Leaks and erasure", "per-file keys", "Encryption"],
        ],
      },
    },
  ],
);

/* ============ After Shipping ============ */

export const ZERO_DOWNTIME_MIGRATION: CaseStudy = caseStudy(
  {
    id: "zero-downtime-migration",
    title: "Changing a database without downtime",
    tagline:
      "Split one column into two on a table with 400 million rows, while the app keeps serving every request.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["cicd", "testing", "replication", "observability", "indexes"],
    learn: [
      "Expand, migrate, contract",
      "Backfill without hurting live traffic",
      "Ship each phase through the pipeline",
      "Prove the data matches before switching",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One name becomes two",
      body: [
        "A shop's `customers` table stores `full_name`. The new invoices need `first_name` and `last_name`. The table has 400 million rows, and the shop can't go offline, not even at night.",
      ],
      add: [
        node("app", "server", "Shop app v1", -3, 0),
        node("db", "db", "Customers DB", 1, 0, { sub: "400 M rows" }),
        node("rep", "db", "Replica", 4, 0, { hue: "teal" }),
      ],
      link: [both("app", "db", 3), link("db", "rep", "copy")],
    },
    {
      kind: "problem",
      short: "Big bang",
      uses: "replication",
      title: "Why not just ALTER and UPDATE?",
      body: [
        "Rewriting 400 million rows in one statement would lock the table for hours and flood the replica with changes; the replica would fall far behind and reads from it would show old data.",
      ],
      set: { rep: { state: "hot", badge: "lag 2 h" } },
    },
    {
      kind: "technique",
      short: "Expand",
      uses: "cicd",
      title: "Phase 1: expand",
      body: [
        "Deploy 1 adds two empty, nullable columns: a quick change that doesn't rewrite rows. Deploy 2 ships app v2, which writes **both** the old and new columns. Each goes through the normal pipeline and can be rolled back on its own.",
      ],
      set: { rep: { state: "ok", badge: "" }, app: { label: "Shop app v2", badge: "writes both" } },
    },
    {
      kind: "solution",
      short: "Backfill",
      uses: "replication",
      title: "Phase 2: backfill, gently",
      body: [
        "A background job fills the new columns for old rows in batches of 5,000, pausing whenever replica lag goes over 5 seconds. It takes two days, and nobody notices.",
      ],
      metrics: [
        { label: "Batch", value: "5,000 rows" },
        { label: "Replica lag", value: "< 5 s", tone: "good" },
        { label: "Duration", value: "≈ 2 days" },
      ],
      add: [node("backfill", "worker", "Backfill job", 1, 2.6, { sub: "throttled" })],
      link: [link("backfill", "db", "write")],
    },
    {
      kind: "technique",
      short: "Index",
      uses: "indexes",
      title: "Build the new index without locking",
      body: [
        "Invoices search by `last_name`, so it needs an index. It's created concurrently: slower to build, but writes keep flowing while it does.",
      ],
      code: ["CREATE INDEX CONCURRENTLY customers_last_name ON customers (last_name);"],
    },
    {
      kind: "technique",
      short: "Verify",
      uses: "testing",
      title: "Prove the data matches",
      body: [
        "Before anything reads the new columns, a check samples rows and compares `first_name + ' ' + last_name` with `full_name`. Tests in the pipeline cover tricky names: single names, \"van der Berg\", names with accents.",
      ],
      quiz: {
        question: "When is it safe to drop the old full_name column?",
        options: [
          "As soon as the backfill finishes",
          "Once no running code reads it, and the release that stopped reading it can't need rolling back",
          "Never",
        ],
        answer: 1,
        why: "Contract only after every reader has moved on; otherwise a rollback would bring back code that needs the old column.",
      },
      add: [node("checks", "monitor", "Comparison checks", 4, -2.4)],
      link: [link("db", "checks", "request")],
    },
    {
      kind: "solution",
      short: "Contract",
      uses: "observability",
      title: "Phase 3: switch reads, then contract",
      body: [
        "App v3 reads the new columns behind a flag, turned on for 5%, then everyone, while dashboards watch errors and invoice totals. Weeks later, v4 stops writing `full_name` and a final deploy drops it.",
      ],
      set: {
        app: { label: "Shop app v3", badge: "reads new" },
        backfill: { state: "dim", badge: "done" },
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Expand, migrate, contract",
      body: ["Many small, reversible deploys instead of one risky night."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["No downtime", "expand → migrate → contract", "CI/CD"],
          ["Don't flood replicas", "throttled backfill watching lag", "Replication"],
          ["Search by surname", "index built concurrently", "Indexes"],
          ["Correct data", "sampled comparisons, tricky-name tests", "Testing"],
          ["Safe switch", "flagged rollout, watched dashboards", "Observability"],
        ],
      },
    },
  ],
);
