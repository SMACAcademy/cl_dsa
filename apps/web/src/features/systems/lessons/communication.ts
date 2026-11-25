import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ---------------------------------------- APIs ---------------------------------------- */

const phone = node("phone", "phone", "AlgoVerse app", -3.6, 0, { sub: "on 4G" });
const gw = node("gw", "gateway", "API", -0.6, 0);
const users = node("users", "service", "Learners service", 2.4, -2);
const progress = node("progress", "service", "Progress service", 2.8, 0);
const lessonsSvc = node("lessonsSvc", "service", "Lessons service", 2.4, 2);
const services: Scene = {
  nodes: [phone, gw, users, progress, lessonsSvc],
  links: [
    both("phone", "gw", 1),
    both("gw", "users", 1),
    both("gw", "progress", 1),
    both("gw", "lessonsSvc", 1),
  ],
};

export const APIS: Lesson = {
  id: "apis",
  title: "APIs: REST, RPC and GraphQL",
  tagline:
    "Three ways for programs to ask each other for things, and what each one costs a phone on 4G.",
  minutes: 11,
  level: "beginner",
  learn: [
    "An API as a contract",
    "REST: resources and HTTP verbs",
    "GraphQL: one query, exactly the fields you need",
    "gRPC between services",
    "Paging with cursors, and evolving an API safely",
  ],
  steps: [
    {
      kind: "setup",
      short: "Contract",
      title: "Programs need a contract",
      body: [
        "The AlgoVerse phone app shows a profile: name, avatar, current streak and the last three lessons. The data lives on AlgoVerse's servers, so the app has to ask for it.",
        "An **API** is the agreed way to ask: which addresses exist, what to send and what comes back. Here, JSON over HTTPS.",
      ],
      callout: {
        kind: "key",
        text: "An API is a promise. Other people's code depends on it not changing under them.",
      },
      scene: services,
    },
    {
      kind: "technique",
      short: "REST",
      title: "REST: resources and verbs",
      body: [
        "**REST** treats data as resources with addresses (`/learners/42`, `/learners/42/lessons`) and uses HTTP verbs on them: GET to read, POST to create, PUT or PATCH to update, DELETE to remove.",
        "It is simple, works with every tool, and GET responses can be cached by browsers and CDNs.",
      ],
      code: ["GET /learners/42", "GET /learners/42/streak", "GET /learners/42/lessons?limit=3"],
      callout: {
        kind: "good",
        text: "GET, PUT and DELETE are idempotent: repeating them has the same effect as doing them once, so they are safe to retry.",
      },
      scene: services,
    },
    {
      kind: "problem",
      short: "Chatty",
      title: "Chatty and bloated on a phone",
      body: [
        "On 4G each round trip costs about 120 ms. The app makes its three calls one after another (one needs an id from the previous answer), so the screen waits for all three.",
        "Each endpoint also returns the whole object: 60 KB arrive to show about 4 KB.",
      ],
      metrics: [
        { label: "Round trips", value: "3 × 120 ms", tone: "bad" },
        { label: "Downloaded", value: "60 KB for 4 KB", tone: "bad" },
      ],
      scene: {
        ...services,
        links: [
          link(
            "phone",
            "gw",
            { kind: "request", rate: 3, speed: 2.5 },
            { kind: "heavy", back: true, rate: 3, speed: 2.5 },
          ),
          both("gw", "users", 1),
          both("gw", "progress", 1),
          both("gw", "lessonsSvc", 1),
        ],
      },
    },
    {
      kind: "solution",
      short: "GraphQL",
      title: "GraphQL: ask for exactly what you need",
      body: [
        "With **GraphQL** the app sends one query describing the exact shape it wants. The GraphQL server fetches each part from the services behind it and returns just those fields.",
        "One round trip, a few kilobytes.",
      ],
      code: [
        "query { learner(id: 42) {",
        "  name avatar streak",
        "  lessons(last: 3) { title } } }",
      ],
      metrics: [
        { label: "Round trips", value: "1", tone: "good" },
        { label: "Downloaded", value: "4 KB", tone: "good" },
      ],
      scene: {
        ...services,
        nodes: [phone, { ...gw, label: "GraphQL" }, users, progress, lessonsSvc],
      },
    },
    {
      kind: "tradeoff",
      short: "Costly",
      title: "Flexible queries can be expensive",
      body: [
        'Clients can ask for anything the schema allows, including "followers of followers of followers, with all their lessons". One innocent-looking query can melt a service.',
        "And because queries are usually POSTed to a single URL, ordinary HTTP caches can't help. Teams limit query depth and cost, and often allow only pre-registered (persisted) queries.",
      ],
      scene: {
        nodes: [
          phone,
          { ...gw, label: "GraphQL" },
          { ...users, state: "hot", queue: 7 },
          progress,
          lessonsSvc,
        ],
        links: [
          link("phone", "gw", "heavy"),
          link("gw", "users", { kind: "heavy", rate: 4 }),
          both("gw", "progress", 1),
        ],
      },
    },
    {
      kind: "technique",
      short: "gRPC",
      title: "Inside the data centre: RPC",
      body: [
        "Behind the API, services call each other constantly. There the usual choice is **RPC**, calling a function on another machine as if it were local, today mostly **gRPC**.",
        "The contract is a typed schema (Protocol Buffers); code for both sides is generated from it, and compact binary messages travel over long-lived HTTP/2 connections.",
      ],
      code: ["service Progress {", "  rpc GetStreak(LearnerId) returns (Streak);", "}"],
      scene: {
        ...services,
        links: [
          both("phone", "gw", 1),
          both("gw", "progress", 1),
          both("progress", "users", 2),
          both("progress", "lessonsSvc", 2),
        ],
      },
    },
    {
      kind: "case",
      short: "Paging",
      title: "Case: a list with three million entries",
      body: [
        "The all-time leaderboard has three million learners. Nobody returns that in one response: APIs return lists in **pages**.",
        '`?offset=40000&limit=20` looks simple, but the database still walks past 40,000 rows, and if new learners join meanwhile, entries shift and repeat. A **cursor** ("the 20 after learner 9f3c") jumps straight there and stays stable.',
      ],
      quiz: {
        question: "Why does offset paging get slower on later pages?",
        options: [
          "Later pages have bigger rows",
          "The database must skip every row before the offset",
          "Cursors are cached",
        ],
        answer: 1,
        why: "OFFSET 40000 still reads and throws away 40,000 rows. A cursor uses an index to jump to the start position.",
      },
      scene: services,
    },
    {
      kind: "case",
      short: "Renames",
      title: "Case: renaming a field breaks old apps",
      body: [
        "A tidy-up renames `name` to `display_name`. The new app is fine, but millions of phones still run last month's version, and their profile screens crash. Phones can't be forced to update.",
        "So APIs evolve **additively**: add the new field, keep the old one, and remove it only when almost nobody calls it, or publish a new version (`/v2/`).",
      ],
      callout: {
        kind: "watch",
        text: "Removing or renaming anything in a public API is a breaking change.",
      },
      scene: {
        ...services,
        nodes: [
          { ...phone, label: "Old app", state: "hot", badge: "crash" },
          gw,
          users,
          progress,
          lessonsSvc,
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "They mix happily: REST or GraphQL at the edge for apps, gRPC between services inside.",
      ],
      table: {
        head: ["Style", "Best for", "Watch out"],
        rows: [
          ["REST", "public APIs, simple reads, caching", "many calls per screen"],
          ["GraphQL", "many clients with different screens", "expensive queries, caching"],
          ["gRPC", "service to service", "not for browsers directly"],
        ],
      },
      scene: services,
    },
  ],
};

/* ------------------------------------ Message queues ------------------------------------ */

const coders = node("coders", "user", "Learners", -3.6, 0, { sub: "submitting code" });
const webQ = node("webQ", "server", "Web server", -1, 0);
const jobs = node("jobs", "queue", "Grading queue", 1.6, 0);
const w = (i: number, extra: Partial<SceneNode> = {}) =>
  node(`w${i}`, "worker", `Grader ${i + 1}`, 4.2, -1.8 + i * 1.8, extra);
const queued = (workers: SceneNode[], q = 2, extraLinks: Scene["links"] = []): Scene => ({
  nodes: [coders, webQ, { ...jobs, queue: q }, ...workers],
  links: [
    both("coders", "webQ", 2),
    link("webQ", "jobs", "event"),
    ...workers.filter((x) => x.state !== "down").map((x) => link("jobs", x.id, "event")),
    ...(extraLinks ?? []),
  ],
});

export const QUEUES: Lesson = {
  id: "queues",
  title: "Message queues",
  tagline: "Answer right away, do the slow work later, and never lose a job along the way.",
  minutes: 12,
  level: "beginner",
  learn: [
    "Moving slow work out of the request",
    "Queues turn spikes into backlogs",
    "Competing consumers and acknowledgements",
    "Poison messages and dead-letter queues",
    "Ordering per key, and backpressure",
  ],
  builtOn: [
    { label: "Queue", path: "/structures/queue" },
    { label: "Circular queue", path: "/structures/circular-queue" },
  ],
  steps: [
    {
      kind: "problem",
      short: "Slow work",
      title: "Slow work inside the request",
      body: [
        "Grading a code submission means running the learner's program against 30 test cases in a sandbox: about 5 seconds. Right now the web server does it inside the request.",
        "Learners stare at a spinner, many requests time out, and while servers grind through grading, every other page slows down.",
      ],
      metrics: [
        { label: "Submit request", value: "5.2 s", tone: "bad" },
        { label: "Timeouts", value: "7%", tone: "bad" },
      ],
      scene: {
        nodes: [coders, { ...webQ, state: "hot", queue: 6 }],
        links: [link("coders", "webQ", "heavy", { kind: "fail", rate: 1 })],
      },
    },
    {
      kind: "solution",
      short: "Queue",
      title: "Put a queue in between",
      body: [
        'The web server now stores the submission, puts a small job message on a **message queue** and replies at once: "grading…". Separate **worker** machines take jobs off the queue and grade at their own pace.',
        "The web server is the **producer**; the workers are **consumers**.",
      ],
      callout: {
        kind: "good",
        text: "Popular queues: RabbitMQ, Amazon SQS, Google Pub/Sub, Redis streams.",
      },
      metrics: [{ label: "Submit request", value: "40 ms", tone: "good" }],
      scene: queued([w(0), w(1)]),
    },
    {
      kind: "insight",
      short: "Spikes",
      title: "A spike becomes a backlog",
      body: [
        "A contest ends and submissions jump twentyfold in a minute. Without the queue, the web tier would collapse. Now it stays fast, because it only enqueues, and jobs simply wait their turn.",
      ],
      callout: {
        kind: "key",
        text: 'A queue turns "too much work right now" into "a bit of work for a while".',
      },
      metrics: [
        { label: "Queue length", value: "4,800" },
        { label: "Web latency", value: "40 ms", tone: "good" },
      ],
      scene: queued([w(0), w(1)], 9),
    },
    {
      kind: "technique",
      short: "More workers",
      title: "Add workers to drain it",
      body: [
        "Need to catch up faster? Start more workers. They all pull from the same queue and each job goes to exactly one of them: the **competing consumers** pattern.",
        "Workers are stateless, so many teams scale them automatically on queue length.",
      ],
      quiz: {
        question:
          "4,800 jobs wait; each grader finishes 2 jobs a second. With 8 graders, about how long until the backlog clears (ignoring new jobs)?",
        options: ["30 seconds", "5 minutes", "40 minutes"],
        answer: 1,
        why: "8 × 2 = 16 jobs a second; 4,800 ÷ 16 = 300 s = 5 minutes.",
      },
      scene: queued([w(0), w(1), w(2)], 5),
    },
    {
      kind: "problem",
      short: "Crash",
      title: "A worker dies mid-job",
      body: [
        "Grader 2 crashes halfway through a job. If the queue deleted each job the moment it handed it out, that submission is simply gone and the learner waits forever.",
      ],
      callout: { kind: "watch", text: "Handing out a job is not the same as finishing it." },
      scene: queued([w(0), w(1, { state: "down" }), w(2)], 4),
    },
    {
      kind: "solution",
      short: "Acks",
      title: "Acknowledge when done",
      body: [
        "A job is only **hidden** while a worker has it. When the worker finishes, it sends an **acknowledgement** and the job is deleted. No ack before a timeout? The job reappears and another worker takes it.",
        "The catch: a job can now run twice (a worker finishes but dies before acking). So jobs must be **idempotent**: grading the same submission twice must give the same single result.",
      ],
      scene: queued([w(0), w(1, { state: "down" }), w(2)], 4, [
        link("w0", "jobs", { kind: "response", rate: 1 }),
      ]),
    },
    {
      kind: "technique",
      short: "Dead letters",
      title: "Poison messages and the dead-letter queue",
      body: [
        "One submission triggers a bug in the grader itself. Every worker that tries it crashes, the job is redelivered, and it fails again, forever, blocking others.",
        "So queues count attempts. After, say, three failures the message moves to a **dead-letter queue** for a person or a script to inspect.",
      ],
      scene: {
        nodes: [
          webQ,
          { ...jobs, queue: 3 },
          w(0),
          w(1),
          node("dlq", "queue", "Dead letters", 1.6, 2.6, { sub: "1 message", hue: "slate" }),
        ],
        links: [
          link("webQ", "jobs", "event"),
          link("jobs", "w0", "event"),
          link("jobs", "w1", "fail"),
          link("jobs", "dlq", "event"),
        ],
      },
    },
    {
      kind: "case",
      short: "Order",
      title: "Case: messages out of order",
      body: [
        'Another queue carries account events: created, email changed, deleted. With several workers in parallel, a slow worker can finish "email changed" after another already processed "deleted".',
        "Systems like Kafka split a topic into **partitions**. Messages with the same key (the learner id) always go to the same partition, read by one worker in order. Different learners still run in parallel.",
      ],
      scene: {
        nodes: [
          webQ,
          node("part0", "stream", "Partition 0", 1.6, -1.3, { sub: "learners 0, 2, 4…" }),
          node("part1", "stream", "Partition 1", 1.6, 1.3, { sub: "learners 1, 3, 5…" }),
          w(0),
          w(2),
        ],
        links: [
          link("webQ", "part0", "event"),
          link("webQ", "part1", "event"),
          link("part0", "w0", "event"),
          link("part1", "w2", "event"),
        ],
      },
    },
    {
      kind: "technique",
      short: "Backpressure",
      title: "When the backlog never drains",
      body: [
        "Queues absorb spikes, but if jobs arrive faster than workers finish them for hours, the backlog grows forever, jobs get stale, and storage runs out.",
        "Watch the **age** of the oldest job, not just the length, and push back: add workers, cap the queue, or tell producers to slow down.",
      ],
      scene: queued([w(0, { state: "hot" }), w(1, { state: "hot" })], 12),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Move slow work out of the request: enqueue a job and answer at once.",
        "Queues absorb spikes; add workers to drain the backlog.",
        "Acknowledge after finishing; unacked jobs are retried, so keep jobs idempotent.",
        "Park repeat failures in a dead-letter queue; keep order per key with partitions.",
      ],
      scene: queued([w(0), w(1), w(2)], 2),
    },
  ],
};

/* ---------------------------------------- Pub/sub ---------------------------------------- */

const lessonSvc = node("ls", "service", "Lesson service", -2.4, 0, { sub: "learner finished!" });
const bus = node("bus", "stream", "Event bus", 0.6, 0, { sub: "LessonCompleted" });
const subs: SceneNode[] = [
  node("xp", "service", "XP", 3.4, -2.6),
  node("badges", "service", "Badges", 3.8, -0.9),
  node("email", "service", "Email", 3.8, 0.9),
  node("analytics", "service", "Analytics", 3.4, 2.6),
];
const direct: Scene = {
  nodes: [lessonSvc, ...subs],
  links: subs.map((s) => both("ls", s.id, 1)),
};
const published = (extra: SceneNode[] = [], down = ""): Scene => ({
  nodes: [
    lessonSvc,
    bus,
    ...subs.map((s) => (s.id === down ? { ...s, state: "down" as const, queue: 4 } : s)),
    ...extra,
  ],
  links: [
    link("ls", "bus", "event"),
    ...[...subs, ...extra].filter((s) => s.id !== down).map((s) => link("bus", s.id, "event")),
  ],
});

export const PUBSUB: Lesson = {
  id: "pubsub",
  title: "Pub/sub and events",
  tagline: "Announce that something happened, and let whoever cares react, without anyone waiting.",
  minutes: 10,
  level: "beginner",
  learn: [
    "Why direct calls make a service slow and fragile",
    "Topics: every subscriber gets its own copy",
    "New features that just subscribe",
    "The transactional outbox",
    "Replaying history from an event log",
  ],
  steps: [
    {
      kind: "problem",
      short: "Calls all",
      title: "Finishing a lesson calls everyone",
      body: [
        "When a learner finishes a lesson, four other things must happen: add XP, check badges, send a congratulations email, record analytics. The lesson service calls each in turn and waits for every answer.",
        "The learner waits for all four: almost a second.",
      ],
      metrics: [{ label: "Finish click", value: "900 ms", tone: "bad" }],
      scene: direct,
    },
    {
      kind: "problem",
      short: "Email down",
      title: "Email is down, so nobody can finish a lesson",
      body: [
        "The email provider has an outage. The call fails, and because the lesson service waits on every call, finishing a lesson fails. A congratulations email, which could easily arrive ten minutes later, just broke the core feature.",
      ],
      callout: {
        kind: "watch",
        text: "With direct calls, availability multiplies: four services at 99.9% give about 99.6%.",
      },
      scene: {
        nodes: [
          lessonSvc,
          ...subs.map((s) => (s.id === "email" ? { ...s, state: "down" as const } : s)),
        ],
        links: subs.map((s) => (s.id === "email" ? link("ls", s.id, "fail") : both("ls", s.id, 1))),
      },
    },
    {
      kind: "solution",
      short: "Publish",
      title: "Publish an event instead",
      body: [
        "The lesson service now saves the result and publishes one event, `LessonCompleted`, to a **topic** on an **event bus**, then answers the learner straight away.",
        "XP, badges, email and analytics each **subscribe** to the topic, and every one receives its own copy of the event.",
      ],
      metrics: [{ label: "Finish click", value: "60 ms", tone: "good" }],
      scene: published(),
    },
    {
      kind: "insight",
      short: "Topic",
      title: "Queue or topic?",
      body: [
        "In a **queue** each job goes to one worker: it shares out work. A **topic** does the opposite: each event goes to every subscriber, spreading the news.",
        "Real systems combine them: each subscribing service gets its own queue of events, shared by however many copies of that service are running.",
      ],
      scene: published(),
    },
    {
      kind: "solution",
      short: "Subscribe",
      title: "New features just subscribe",
      body: [
        'The team wants a streak counter: "5 days in a row!". They build a service that subscribes to `LessonCompleted`, and that\'s it.',
        "The lesson service didn't change, wasn't redeployed, and doesn't even know streaks exist. This is **loose coupling**.",
      ],
      callout: {
        kind: "good",
        text: "Name events as facts in the past tense: LessonCompleted, not SendEmail.",
      },
      scene: published([node("streaks", "service", "Streaks", 1.2, 3.2, { state: "lit" })]),
    },
    {
      kind: "insight",
      short: "Catch up",
      title: "A subscriber is down? It catches up.",
      body: [
        "Email is down again. This time nobody notices: the bus keeps email's copies of the events until it is back, then email works through the backlog. Every message goes out, a little late, none lost.",
      ],
      scene: published([], "email"),
    },
    {
      kind: "tradeoff",
      short: "Costs",
      title: "What events cost",
      body: [
        'Events decouple services, but the flow is harder to see: "what happens when a lesson is finished?" is now spread across five codebases.',
        "Subscribers act a little later (eventual consistency), events can arrive twice or out of order, and debugging needs good tracing.",
      ],
      scene: published(),
    },
    {
      kind: "case",
      short: "Outbox",
      title: "Case: saved, but never announced",
      body: [
        "The lesson service saves the result, then publishes the event. One day it crashes between those two steps: the lesson is marked complete, but no XP, no badge, no email.",
        "The fix is the **transactional outbox**: write the event into an `outbox` table in the same database transaction as the result. A separate relay reads the outbox and publishes. Saved and announced, or neither.",
      ],
      quiz: {
        question: "Why does the outbox fix the crash?",
        options: [
          "It makes the event bus faster",
          "The result and the event are saved in one transaction, so both exist or neither does",
          "It deletes duplicate events",
        ],
        answer: 1,
        why: "A database transaction is all-or-nothing; the relay can retry publishing until it succeeds.",
      },
      scene: {
        nodes: [
          lessonSvc,
          node("ldb2", "db", "Database", -2.4, 2.6, { sub: "result + outbox" }),
          node("relay", "worker", "Outbox relay", 0.4, 2.6),
          bus,
          ...subs,
        ],
        links: [
          link("ls", "ldb2", "write"),
          link("ldb2", "relay", "event"),
          link("relay", "bus", "event"),
          ...subs.map((s) => link("bus", s.id, "event")),
        ],
      },
    },
    {
      kind: "case",
      short: "Replay",
      title: "Case: replaying history",
      body: [
        "Analytics finds a bug that miscounted completions for the last 30 days. With a classic queue those events are gone. A log-based bus such as Kafka keeps events for days or weeks.",
        "Analytics fixes its code, rewinds its position 30 days, and reprocesses everything. Other subscribers are untouched.",
      ],
      scene: {
        ...published(),
        nodes: published().nodes.map((n) =>
          n.id === "analytics" ? { ...n, state: "lit" as const, badge: "rewind 30 d" } : n,
        ),
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Direct calls make the caller slow and fragile, and couple every team to it.",
        "Publish an event; every subscriber gets its own copy.",
        "New features just subscribe; a down subscriber catches up later.",
        "Use an outbox so saving and announcing never drift apart.",
      ],
      scene: published(),
    },
  ],
};

/* ------------------------------------ Real-time updates ------------------------------------ */

const priya = node("priya", "browser", "Priya", -3.6, -1.4);
const mentor = node("mentor", "browser", "Mentor", -3.6, 1.6);
const chat = node("chat", "server", "Help-chat server", 0, 0);
const msgs = node("msgs", "db", "Message store", 3, 0);
const gw1 = node("g1", "gateway", "Gateway 1", 0, -1.6, { sub: "Priya's socket" });
const gw2 = node("g2", "gateway", "Gateway 2", 0, 1.6, { sub: "mentor's socket" });
const pubsub = node("ps", "stream", "Pub/sub", 2.8, 0);

export const REALTIME: Lesson = {
  id: "realtime",
  title: "Real-time updates",
  tagline:
    "How the server tells you something happened: live help chat, contest leaderboards, notifications.",
  minutes: 11,
  level: "beginner",
  learn: [
    "Why plain HTTP can't push",
    "Polling and long polling",
    "Server-Sent Events and WebSockets",
    "Finding which server holds a connection",
    "Offline learners and presence",
  ],
  steps: [
    {
      kind: "problem",
      short: "Push?",
      title: "The mentor replied. How does Priya find out?",
      body: [
        "Priya asks a question in live help chat; the mentor's reply reaches the server. Her screen should show it instantly.",
        'But plain HTTP is request then response: only the browser can start a conversation. The server has no way to call Priya and say "you have a reply".',
      ],
      scene: {
        nodes: [priya, mentor, chat],
        links: [link("mentor", "chat", "request"), link("chat", "priya", { dashed: true })],
      },
    },
    {
      kind: "technique",
      short: "Polling",
      title: "Polling: keep asking",
      body: [
        'The simplest fix: Priya\'s page asks "anything new?" every 3 seconds. Most answers are empty; now and then one carries a message.',
        "Easy to build, but replies arrive up to 3 seconds late, and most requests are wasted.",
      ],
      scene: {
        nodes: [priya, mentor, chat],
        links: [
          link("mentor", "chat", "request"),
          link(
            "priya",
            "chat",
            { kind: "request", rate: 3 },
            { kind: "response", back: true, rate: 1 },
          ),
        ],
      },
    },
    {
      kind: "problem",
      short: "Waste",
      title: "Polling a million browsers",
      body: [
        'Now multiply. During a contest a million learners keep a page open that polls every 3 seconds, and almost every answer is "nothing new".',
        "Polling faster cuts the delay but makes the waste worse.",
      ],
      quiz: {
        question:
          "A million clients poll every 3 seconds. Roughly how many requests a second is that?",
        options: ["3,000", "33,000", "333,000"],
        answer: 2,
        why: '1,000,000 ÷ 3 ≈ 333,000 requests a second, nearly all of them answered "nothing new".',
      },
      metrics: [
        { label: "Requests", value: "333,000 /s", tone: "bad" },
        { label: "Empty answers", value: "97%", tone: "bad" },
      ],
      scene: {
        nodes: [
          { ...priya, label: "1M learners", kind: "user" },
          { ...chat, state: "hot", queue: 8 },
        ],
        links: [link("priya", "chat", { kind: "request", rate: 4 })],
      },
    },
    {
      kind: "solution",
      short: "Long poll",
      title: "Long polling: hold the request open",
      body: [
        'Instead of answering "nothing" at once, the server **holds** the request open until a message arrives or about 30 seconds pass. Then it answers, and the page immediately asks again.',
        "Messages now arrive almost instantly, and empty answers are rare.",
      ],
      scene: {
        nodes: [priya, mentor, { ...chat, queue: 1 }],
        links: [
          link("mentor", "chat", "request"),
          link("priya", "chat", { kind: "request", rate: 1 }),
          link("chat", "priya", "response"),
        ],
      },
    },
    {
      kind: "technique",
      short: "SSE",
      title: "Server-Sent Events: one response that never ends",
      body: [
        "With **Server-Sent Events**, the page makes one request and the server never finishes the response; it writes each new event down that open stream as it happens.",
        "One-way (server to browser), plain HTTP, and browsers reconnect automatically. Ideal for a live contest leaderboard.",
      ],
      scene: { nodes: [priya, chat], links: [link("chat", "priya", { kind: "event", rate: 3 })] },
    },
    {
      kind: "technique",
      short: "WebSocket",
      title: "WebSockets: talk both ways",
      body: [
        "A **WebSocket** starts as an HTTP request, then upgrades into a permanent two-way connection. Either side can send at any moment, with tiny overhead per message.",
        "Priya and the mentor each hold one socket, and messages flow both ways in milliseconds. Use them for chat, pair programming and multiplayer.",
      ],
      scene: {
        nodes: [priya, mentor, chat, msgs],
        links: [
          link("priya", "chat", "event", { kind: "event", back: true }),
          link("mentor", "chat", "event", { kind: "event", back: true }),
          link("chat", "msgs", "write"),
        ],
      },
    },
    {
      kind: "insight",
      short: "Which server",
      title: "Scaling: which server has Priya?",
      body: [
        "Each open connection costs memory, so a million learners need many gateway servers. Now the mentor's socket is on Gateway 2 and Priya's on Gateway 1, which Gateway 2 can't reach directly.",
        "So gateways relay through **pub/sub**: Gateway 2 publishes to Priya's channel, and whichever gateway holds her socket is subscribed to it.",
      ],
      scene: {
        nodes: [priya, mentor, gw1, gw2, pubsub, msgs],
        links: [
          link("mentor", "g2", "event"),
          link("g2", "ps", "event"),
          link("ps", "g1", "event"),
          link("g1", "priya", "event"),
          link("ps", "msgs", "write"),
        ],
      },
    },
    {
      kind: "case",
      short: "Offline",
      title: "Case: Priya's laptop goes to sleep",
      body: [
        "Priya closes her laptop. Her socket drops and the mentor's replies have nowhere to go. So every message is **stored first**, then pushed if the recipient is connected.",
        'When she reconnects, her page says "the last message I saw was 1041" and fetches everything after it. If she stays away, a push notification goes out instead.',
      ],
      callout: {
        kind: "key",
        text: "Store first, deliver second. The connection is a fast path, not the record.",
      },
      scene: {
        nodes: [{ ...priya, state: "down" }, mentor, gw1, gw2, pubsub, msgs],
        links: [
          link("mentor", "g2", "event"),
          link("g2", "ps", "event"),
          link("ps", "msgs", "write"),
          link("g1", "priya", { cut: true }),
        ],
      },
    },
    {
      kind: "technique",
      short: "Presence",
      title: "Presence: who's online?",
      body: [
        'The green dot beside a mentor\'s name needs **presence**: each app sends a small heartbeat every 30 seconds, and the server records "last seen". No heartbeat for a minute means offline.',
        "Keep presence in a fast store with expiring keys, and push only changes, to people who are looking.",
      ],
      scene: {
        nodes: [
          priya,
          mentor,
          gw1,
          gw2,
          node("presence", "cache", "Presence", 2.8, -2.4, { sub: "keys expire in 60 s" }),
        ],
        links: [
          link("g1", "presence", "write"),
          link("g2", "presence", "write"),
          link("priya", "g1", "event"),
          link("mentor", "g2", "event"),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Persistent connections need many servers at scale, joined by pub/sub. Store every message first, so offline learners catch up.",
      ],
      table: {
        head: ["Method", "Delay", "Direction"],
        rows: [
          ["Polling", "up to the interval", "client asks"],
          ["Long polling", "low", "client asks, server waits"],
          ["Server-Sent Events", "low", "server → client"],
          ["WebSocket", "lowest", "both ways"],
        ],
      },
      scene: {
        nodes: [priya, mentor, gw1, gw2, pubsub, msgs],
        links: [
          link("mentor", "g2", "event"),
          link("g2", "ps", "event"),
          link("ps", "g1", "event"),
          link("g1", "priya", "event"),
          link("ps", "msgs", "write"),
        ],
      },
    },
  ],
};
