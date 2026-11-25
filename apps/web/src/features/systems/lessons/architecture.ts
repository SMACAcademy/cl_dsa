import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* --------------------------------- Monolith vs microservices --------------------------------- */

const clients = node("clients", "user", "Learners", -4.2, 0);
const mono = node("mono", "server", "AlgoVerse monolith", -0.6, 0, {
  size: 1.4,
  sub: "everything in one",
});
const monoDb = node("monoDb", "db", "One database", 3, 0);
const gate = node("gate", "gateway", "API gateway", -1.6, 0);
const svcNodes: SceneNode[] = [
  node("learnersS", "service", "Learners", 1.4, -2.4),
  node("lessonsS", "service", "Lessons", 1.8, -0.8),
  node("gradingS", "service", "Grading", 1.8, 0.8),
  node("paymentsS", "service", "Payments", 1.4, 2.4),
];
const svcDbs: SceneNode[] = svcNodes.map((s) =>
  node(`${s.id}Db`, "db", `${s.label} DB`, s.x + 2.4, s.y, { size: 0.7 }),
);
const split = (
  withDbs = true,
  extra: Record<string, Partial<SceneNode>> = {},
  extraLinks: Scene["links"] = [],
): Scene => ({
  nodes: [clients, gate, ...svcNodes, ...(withDbs ? svcDbs : [])].map((n) => ({
    ...n,
    ...(extra[n.id] ?? {}),
  })),
  links: [
    both("clients", "gate", 2),
    ...svcNodes.map((s) => both("gate", s.id, 1)),
    ...(withDbs ? svcNodes.map((s) => both(s.id, `${s.id}Db`, 1)) : []),
    ...(extraLinks ?? []),
  ],
});

export const MICROSERVICES: Lesson = {
  id: "microservices",
  title: "Monolith or microservices",
  tagline:
    "One codebase or many services? What each buys you, what each costs, and how to move between them.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "When a monolith stops fitting the team",
    "Splitting by business capability",
    "Each service owns its data",
    "The network in the middle: latency and partial failure",
    "Contracts and the strangler fig migration",
  ],
  steps: [
    {
      kind: "setup",
      short: "Monolith",
      title: "One app, one deploy",
      body: [
        "AlgoVerse is a **monolith**: one codebase with every feature (accounts, lessons, grading, payments), deployed as one unit, several copies behind a load balancer, all sharing one database.",
        "For a small team that is a strength: one thing to build, test, deploy and debug, and a function call is a function call.",
      ],
      scene: {
        nodes: [clients, mono, monoDb],
        links: [both("clients", "mono", 2), both("mono", "monoDb", 2)],
      },
    },
    {
      kind: "problem",
      short: "Many teams",
      title: "Forty engineers, one codebase",
      body: [
        "The team grows to forty people in six teams. Every change rides one weekly release, so a bug in one feature delays everyone's work.",
        "A memory leak in the new reports page crashes the whole app, including sign-in and grading. And the whole app must scale together, even though only grading is busy.",
      ],
      scene: {
        nodes: [clients, { ...mono, state: "hot", badge: "leak in reports" }, monoDb],
        links: [link("clients", "mono", "request", "fail"), both("mono", "monoDb", 1)],
      },
    },
    {
      kind: "solution",
      short: "Split",
      title: "Split by business capability",
      body: [
        "Break the app into **microservices** along business lines: Learners, Lessons, Grading, Payments. Each is a separate program, owned by one team, deployed on its own schedule and scaled on its own.",
        "An API gateway gives apps one front door.",
      ],
      scene: split(false),
    },
    {
      kind: "technique",
      short: "Own data",
      title: "Each service owns its data",
      body: [
        "If services still share one database, they are still tied together: one team's schema change can break three others.",
        "So each service gets its own database, and nobody else touches it. Other services ask through its API.",
      ],
      callout: { kind: "key", text: "A service's database is private. Its API is the only door." },
      scene: split(true),
    },
    {
      kind: "problem",
      short: "Network",
      title: "The network is in the middle now",
      body: [
        "Showing a submission result now takes several calls: gateway → Grading → Lessons and Learners. Each hop adds latency, and each can be slow or fail on its own.",
        "What was a function call is now a network call that needs timeouts, retries and monitoring.",
      ],
      scene: split(true, { lessonsS: { state: "hot" } }, [
        both("gradingS", "lessonsS", 1),
        link("gradingS", "learnersS", "request", { kind: "fail", rate: 1 }),
      ]),
    },
    {
      kind: "case",
      short: "Dist. monolith",
      title: "Case: the distributed monolith",
      body: [
        "One company split its monolith into twelve services, but they kept reading each other's tables, and every feature needed changes in five services released together.",
        "They got the costs of microservices (network calls, many deploys) with none of the benefits.",
      ],
      callout: {
        kind: "watch",
        text: "If services must be deployed together, they are one service in disguise.",
      },
      scene: split(true, {}, [
        link("lessonsS", "learnersSDb", "request"),
        link("gradingS", "paymentsSDb", "request"),
      ]),
    },
    {
      kind: "case",
      short: "Lost joins",
      title: "Case: the progress page",
      body: [
        '"My progress" shows each attempt with the lesson\'s title. In the monolith that was one SQL join. Now attempts live in Grading and titles in Lessons.',
        "Grading keeps a **local read copy** of the few lesson fields it needs, and Lessons publishes a `LessonRenamed` event whenever they change. One fast local query again, slightly stale for a moment.",
      ],
      scene: split(true, { gradingSDb: { badge: "+ lesson titles" } }, [
        link("lessonsS", "gradingS", "event"),
      ]),
    },
    {
      kind: "technique",
      short: "Contracts",
      title: "An API change breaks a neighbour",
      body: [
        "The Payments team renames `amount` to `amount_cents`. Their own tests pass, they deploy, and every Premium purchase in another service fails.",
        "Independent deploys only work if teams can't break each other silently. **Contract tests** check, in each team's pipeline, that a provider still gives its consumers what they rely on.",
      ],
      scene: split(true, { paymentsS: { state: "hot", badge: "amount_cents" } }, [
        link("learnersS", "paymentsS", "fail"),
      ]),
    },
    {
      kind: "insight",
      short: "Which one",
      title: "Which should you pick?",
      body: [
        "Most products should start as a well-organised monolith, and split out services when a team or a scaling need clearly asks for it.",
      ],
      table: {
        head: ["", "Monolith", "Microservices"],
        rows: [
          ["Team size", "one to a few teams", "many teams"],
          ["Deploys", "together", "independent"],
          ["Calls", "in-process, fast", "network, can fail"],
          ["Data", "one DB, joins, transactions", "DB per service, events, sagas"],
          ["Operations", "simple", "needs tracing, discovery, automation"],
        ],
      },
      scene: split(true),
    },
    {
      kind: "technique",
      short: "Strangler",
      title: "Migrating: the strangler fig",
      body: [
        "Don't rewrite everything at once. Put the gateway in front of the monolith, build one new service (Payments), and route only `/payments/*` to it. Everything else still goes to the monolith.",
        "Move one capability at a time until the monolith withers away, like a strangler fig growing around a tree.",
      ],
      scene: {
        nodes: [
          clients,
          gate,
          { ...mono, x: 1.8, y: -0.6, size: 1.2 },
          node("payNew", "service", "Payments", 1.4, 2.4, { state: "lit" }),
          monoDb,
        ],
        links: [
          both("clients", "gate", 2),
          both("gate", "mono", 2),
          both("gate", "payNew", 1),
          both("mono", "monoDb", 1),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A monolith is simple and fast, until many teams share it.",
        "Microservices split by business capability, each with its own data.",
        "You pay with network calls, partial failure and more operations.",
        "Use contracts between teams; migrate gradually with a strangler fig.",
      ],
      scene: split(true),
    },
  ],
};

/* --------------------------------- Service discovery and gateways --------------------------------- */

const caller = node("caller", "service", "Grading", -3, 0);
const inst = (i: number, ip: string, extra: Partial<SceneNode> = {}) =>
  node(`i${i}`, "service", "Lessons", 1.6, -2.2 + i * 1.5, { sub: ip, size: 0.85, ...extra });
const registry = node("registry", "registry", "Service registry", -0.8, -2.8, {
  sub: "lessons: 3 healthy",
});
const INSTS = [
  inst(0, "10.0.4.11"),
  inst(1, "10.0.4.27"),
  inst(2, "10.0.5.3"),
  inst(3, "10.0.5.18"),
];
const disco = (instances: SceneNode[], extraLinks: Scene["links"] = []): Scene => ({
  nodes: [caller, registry, ...instances],
  links: [
    both("caller", "registry", 1),
    ...instances
      .filter((n) => n.state !== "down" && n.state !== "dim")
      .map((n) => both("caller", n.id, 1)),
    ...instances.map((n) => link(n.id, "registry", { kind: "copy", rate: 1 })),
    ...(extraLinks ?? []),
  ],
});

export const SERVICE_DISCOVERY: Lesson = {
  id: "service-discovery",
  title: "Service discovery and gateways",
  tagline:
    "How services find each other when instances come and go, and one front door for everyone outside.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why hard-coded addresses go stale",
    "Registries, heartbeats and DNS",
    "Readiness, slow start and draining",
    "Service meshes and sidecars",
    "API gateways at the edge",
  ],
  steps: [
    {
      kind: "setup",
      short: "Hard-coded",
      title: "Grading calls Lessons",
      body: [
        "Grading needs test cases from the Lessons service. The simplest way: list the Lessons servers' IP addresses in Grading's config file and spread calls across them.",
        "It works, until the addresses change.",
      ],
      scene: {
        nodes: [caller, ...INSTS.slice(0, 3)],
        links: INSTS.slice(0, 3).map((n) => both("caller", n.id, 1)),
      },
    },
    {
      kind: "problem",
      short: "Churn",
      title: "Instances come and go",
      body: [
        "In the cloud the autoscaler adds and removes instances, deploys replace them, and crashed ones are swapped out. `10.0.4.27` was just replaced by a new one at `10.0.5.18`.",
        "Grading's config still lists the old address, and a third of its calls fail.",
      ],
      scene: {
        nodes: [
          caller,
          INSTS[0] as SceneNode,
          { ...(INSTS[1] as SceneNode), state: "down" },
          INSTS[2] as SceneNode,
          { ...(INSTS[3] as SceneNode), state: "lit", badge: "new" },
        ],
        links: [both("caller", "i0", 1), link("caller", "i1", "fail"), both("caller", "i2", 1)],
      },
    },
    {
      kind: "solution",
      short: "Registry",
      title: "A service registry",
      body: [
        'Every instance **registers** itself with a service registry when it starts, then keeps sending **heartbeats**. Grading asks the registry "where is Lessons?" and gets the current list of healthy instances.',
      ],
      scene: disco(INSTS.slice(0, 3)),
    },
    {
      kind: "insight",
      short: "Self-healing",
      title: "Instances join and leave by themselves",
      body: [
        "Now churn is harmless. A new instance starts, registers and gets traffic within seconds. An instance that hangs misses three heartbeats and the registry drops it.",
        "Nobody edits a config file.",
      ],
      scene: disco([
        INSTS[0] as SceneNode,
        { ...(INSTS[1] as SceneNode), state: "dim", badge: "missed 3 beats" },
        INSTS[2] as SceneNode,
        { ...(INSTS[3] as SceneNode), state: "lit", badge: "joined" },
      ]),
    },
    {
      kind: "technique",
      short: "Who picks",
      title: "Client-side or server-side?",
      body: [
        "**Client-side discovery**: Grading gets the list itself and picks an instance. No extra hop, but every client needs that logic.",
        "**Server-side discovery**: Grading calls one stable address on a load balancer, which consults the registry. Simpler clients, one more hop. DNS can also serve the list: `lessons.internal` resolves to the healthy IPs, though cached DNS answers can be stale.",
      ],
      scene: disco(INSTS.slice(0, 3)),
    },
    {
      kind: "case",
      short: "Not ready",
      title: "Case: traffic before it's ready",
      body: [
        "A new instance registers the moment its process starts, before it has opened database connections or warmed its caches. It gets full traffic at once and its first requests time out.",
        "Separate two checks: **liveness** (the process runs) and **readiness** (it can serve now). List an instance only when ready, ramp its traffic up slowly, and on shutdown **deregister and drain** before stopping.",
      ],
      quiz: {
        question:
          "An instance is alive but still loading 2 GB of test data. What should its readiness check say?",
        options: ["Ready", "Not ready", "Dead"],
        answer: 1,
        why: "It is alive (don't restart it), but it can't serve yet, so the registry shouldn't send it traffic.",
      },
      scene: disco([
        ...INSTS.slice(0, 3),
        { ...(INSTS[3] as SceneNode), state: "dim", badge: "warming up" },
      ]),
    },
    {
      kind: "problem",
      short: "Plumbing",
      title: "Every team rebuilds the same plumbing",
      body: [
        "Discovery is only the start. Every call between services also needs timeouts, retries, circuit breakers, encryption and metrics. With services in Python, Go and TypeScript, each team rebuilds them, slightly differently.",
      ],
      scene: disco(INSTS.slice(0, 3)),
    },
    {
      kind: "solution",
      short: "Mesh",
      title: "A service mesh: sidecars do it",
      body: [
        "A **service mesh** (Istio, Linkerd) runs a small proxy, a **sidecar**, next to every service. Each service just talks to its local sidecar; the sidecars find instances, retry, encrypt (mTLS) and report metrics.",
        "Teams write business logic; the mesh handles the plumbing the same way everywhere.",
      ],
      scene: {
        nodes: [
          caller,
          node("side1", "gateway", "Sidecar", -1.4, 0, { size: 0.6 }),
          node("side2", "gateway", "Sidecar", 0.6, 0, { size: 0.6 }),
          { ...(INSTS[1] as SceneNode), x: 2.4, y: 0 },
        ],
        links: [both("caller", "side1", 1), both("side1", "side2", 2), both("side2", "i1", 1)],
      },
    },
    {
      kind: "technique",
      short: "Gateway",
      title: "At the edge: an API gateway",
      body: [
        "Discovery handles calls between services. For apps and browsers outside, an **API gateway** is the single front door: it authenticates requests, applies rate limits, routes `/lessons/*` and `/grading/*` to the right services, and can combine responses.",
      ],
      scene: {
        nodes: [
          node("outside", "phone", "Apps", -4, 0),
          node("apigw", "gateway", "API gateway", -1.4, 0),
          caller,
          ...INSTS.slice(0, 2),
        ],
        links: [
          both("outside", "apigw", 2),
          both("apigw", "caller", 1),
          both("apigw", "i0", 1),
          both("apigw", "i1", 1),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Hard-coded addresses go stale as instances come and go.",
        "A registry with heartbeats (or DNS) keeps the list current.",
        "List instances only when ready; deregister and drain before stopping.",
        "A mesh moves network plumbing into sidecars; a gateway guards the edge.",
      ],
      scene: disco(INSTS.slice(0, 3)),
    },
  ],
};

/* -------------------------------------------- Sagas -------------------------------------------- */

const orch = node("orch", "service", "Enrolment", -1.6, 0, { sub: "saga orchestrator" });
const enrolee = node("enrolee", "browser", "Priya", -4.4, 0);
const pay = node("pay", "service", "Payments", 1.6, -2.2);
const mentors = node("mentors", "service", "Mentor slots", 2.2, 0);
const cohort = node("cohort", "service", "Cohorts", 1.6, 2.2);
const saga = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [enrolee, orch, pay, mentors, cohort].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [
    both("enrolee", "orch", 1),
    both("orch", "pay", 1),
    both("orch", "mentors", 1),
    both("orch", "cohort", 1),
  ],
});

export const SAGAS: Lesson = {
  id: "sagas",
  title: "Sagas and distributed transactions",
  tagline:
    "One action, several services, several databases: keeping it all-or-nothing without one big transaction.",
  minutes: 13,
  level: "advanced",
  learn: [
    "Why one transaction can't span services",
    "Two-phase commit, and where it blocks",
    "Sagas: local steps plus compensations",
    "Orchestration and choreography",
    "Retries, unknown outcomes and compensations that fail",
  ],
  steps: [
    {
      kind: "problem",
      short: "Three DBs",
      title: "One enrolment, three databases",
      body: [
        "Priya enrols in a paid bootcamp: charge her card, reserve a weekly mentor slot, and give her a seat in a cohort. Each lives in a different service with its own database.",
        "If the card is charged but no cohort seat is left, she has paid for nothing. One database transaction can't cover all three.",
      ],
      scene: saga({ cohort: { badge: "no seats!", state: "hot" }, pay: { badge: "charged" } }),
    },
    {
      kind: "technique",
      short: "2PC",
      title: "Two-phase commit",
      body: [
        "A classic answer is **two-phase commit**. Phase 1: a coordinator asks every participant to **prepare**: do the work, lock the rows, and promise it can commit. Phase 2: if all said yes, it tells them to commit; otherwise, to abort.",
      ],
      scene: saga({}, [
        both("enrolee", "orch", 1),
        link("orch", "pay", "request", { kind: "response", back: true }),
        link("orch", "mentors", "request", { kind: "response", back: true }),
        link("orch", "cohort", "request", { kind: "response", back: true }),
      ]),
    },
    {
      kind: "problem",
      short: "Blocked",
      title: "When the coordinator dies",
      body: [
        'After preparing, participants must wait for the decision. If the coordinator crashes right then, payments and mentor slots sit "prepared", holding locks, unable to commit or abort, until it comes back.',
        "That is why 2PC is rare between independent services across a network.",
      ],
      scene: saga(
        {
          orch: { state: "down" },
          pay: { badge: "prepared · locked", state: "hot" },
          mentors: { badge: "prepared · locked", state: "hot" },
        },
        [link("orch", "pay", { cut: true }), link("orch", "mentors", { cut: true })],
      ),
    },
    {
      kind: "solution",
      short: "Saga",
      title: "A saga: commit step by step, undo on failure",
      body: [
        "A **saga** splits the enrolment into local transactions that each commit immediately: charge the card, then reserve the slot, then take the seat. Nothing is held open.",
        "Every step has a **compensating** step that undoes it: refund the card, release the slot. If a later step fails, the saga runs the compensations for the steps that succeeded, in reverse.",
      ],
      table: {
        head: ["Step", "Compensation"],
        rows: [
          ["Charge card", "Refund"],
          ["Reserve mentor slot", "Release slot"],
          ["Take cohort seat", "Free seat"],
        ],
      },
      scene: saga(
        {
          cohort: { state: "hot", badge: "full" },
          pay: { badge: "refund ↩" },
          mentors: { badge: "release ↩" },
        },
        [
          both("enrolee", "orch", 1),
          link("orch", "cohort", "fail"),
          link("orch", "mentors", "event"),
          link("orch", "pay", "event"),
        ],
      ),
    },
    {
      kind: "technique",
      short: "Orchestrate",
      title: "Orchestration: one service runs the saga",
      body: [
        "In an **orchestrated** saga, one component is a small state machine: it tells each service what to do next, waits for the answer, and decides whether to continue or compensate. It saves its state after every step.",
        "The flow is in one place, easy to read and to monitor.",
      ],
      scene: saga(),
    },
    {
      kind: "technique",
      short: "Choreograph",
      title: "Choreography: services react to events",
      body: [
        "In a **choreographed** saga there is no conductor. Payments publishes `CardCharged`; Mentor slots listens, reserves, and publishes `SlotReserved`; Cohorts listens and takes a seat, or publishes `CohortFull`, which the others react to by compensating.",
        "Fewer moving parts, but the overall flow is spread across services and harder to follow.",
      ],
      scene: {
        nodes: [enrolee, pay, mentors, cohort, node("busS", "stream", "Event bus", -0.6, 0)],
        links: [
          link("enrolee", "pay", "request"),
          link("pay", "busS", "event"),
          link("busS", "mentors", "event"),
          link("mentors", "busS", "event"),
          link("busS", "cohort", "event"),
        ],
      },
    },
    {
      kind: "tradeoff",
      short: "Half-done",
      title: "The catch: no isolation",
      body: [
        "While a saga runs, others can see its half-done state: the slot is taken but the seat isn't. And some steps can't truly be undone: a \"welcome to the bootcamp\" email is out in the world.",
        'Order steps so that the hard-to-undo ones come last, and design compensations people will accept ("sorry, the cohort filled up, here is your refund").',
      ],
      scene: saga({ mentors: { badge: "slot held" } }),
    },
    {
      kind: "case",
      short: "Resume",
      title: "Case: crash and resume",
      body: [
        'The orchestrator crashes right after Mentor slots reserved the slot, but before it saved that fact. On restart it sees "slot: pending" and sends the request again.',
        "If Mentor slots isn't **idempotent**, Priya now holds two slots. Every saga step needs an id the service uses to recognise a repeat.",
      ],
      quiz: {
        question: 'What makes "reserve slot (saga 77, step 2)" safe to send twice?',
        options: [
          "Sending it faster",
          "The service remembers saga 77 step 2 and returns the first result",
          "Using a bigger database",
        ],
        answer: 1,
        why: "That is idempotency: the same request id always produces one effect.",
      },
      scene: saga({ orch: { badge: "restarted" }, mentors: { badge: "saga 77 · step 2 ✓" } }),
    },
    {
      kind: "case",
      short: "Undo fails",
      title: "Case: the undo itself fails",
      body: [
        "Cohorts is full, so the saga releases the slot and refunds the card. But the payment provider is down. Giving up isn't an option: Priya would be charged for nothing.",
        "Compensations are retried, with backoff, until they succeed; ones that keep failing go to a queue for a person to resolve.",
      ],
      scene: saga({ pay: { state: "down" }, cohort: { badge: "full" } }, [
        both("enrolee", "orch", 1),
        link("orch", "pay", "fail"),
        link("orch", "mentors", "event"),
      ]),
    },
    {
      kind: "case",
      short: "Unknown",
      title: 'Case: a timeout means "unknown"',
      body: [
        "The call to take the cohort seat times out. Did Cohorts take the seat before the connection dropped, or not? A timeout is not a failure: the outcome is **unknown**.",
        "Compensating blindly could free a seat Priya actually holds. Ask Cohorts for the status of that request id (or retry it safely, since it is idempotent) before deciding.",
      ],
      scene: saga({ cohort: { badge: "? took seat ?" } }, [
        both("enrolee", "orch", 1),
        link("orch", "cohort", "request", { cut: true }),
      ]),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "One database transaction can't span several services.",
        "Two-phase commit is all-or-nothing but blocks when the coordinator fails.",
        "A saga commits step by step and runs compensations on failure.",
        "Orchestration is easier to follow; choreography has fewer moving parts.",
        "Make every step idempotent, retry compensations, and treat timeouts as unknown.",
      ],
      scene: saga(),
    },
  ],
};

/* ---------------------------------- Batch and stream processing ---------------------------------- */

const appsB = node("appsB", "server", "App servers", -4, 0, { sub: "2B events / day" });
const prod = node("prod", "db", "Production DB", -1.4, 2.4);
const lake = node("lake", "storage", "Event files", -0.8, -0.6, { sub: "object storage" });
const mappers = node("mappers", "worker", "Mappers", 1.8, -1.6, { sub: "× 100" });
const reducers = node("reducers", "worker", "Reducers", 3.8, 0, { sub: "× 50" });
const warehouse = node("warehouse", "db", "Warehouse", 5, 2.2, { sub: "columns", hue: "teal" });
const kafka = node("kafka", "stream", "Event stream", -0.8, -0.6, { sub: "partitioned" });
const flink = node("flink", "worker", "Stream processor", 2.2, -0.6, { sub: "running counts" });
const dash = node("dash", "monitor", "Live dashboard", 4.8, -0.6);
const streamScene = (extra: Record<string, Partial<SceneNode>> = {}): Scene => ({
  nodes: [appsB, kafka, flink, dash].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: [
    link("appsB", "kafka", { kind: "event", rate: 4 }),
    link("kafka", "flink", { kind: "event", rate: 3 }),
    link("flink", "dash", "write"),
  ],
});

export const BATCH_STREAM: Lesson = {
  id: "batch-stream",
  title: "Batch and stream processing",
  tagline:
    "Crunching billions of events: overnight in big batches, or continuously as they arrive.",
  minutes: 14,
  level: "intermediate",
  learn: [
    "Keeping analytics off the production database",
    "Batch jobs: map, shuffle, reduce",
    "Skewed keys and how to tame them",
    "Stream processing, windows and late events",
    "Counting unique learners approximately",
  ],
  builtOn: [
    { label: "Merge sort", path: "/algorithms/merge-sort" },
    { label: "Hash table", path: "/structures/hash-table" },
    { label: "Binary heap", path: "/structures/binary-heap" },
  ],
  steps: [
    {
      kind: "problem",
      short: "Prod DB",
      title: "Analytics on the production database",
      body: [
        'Every lesson view, quiz answer and code run is an event: about 2 billion a day. A dashboard of "time spent per lesson" runs a huge GROUP BY on the production database every minute.',
        "Each run scans hundreds of millions of rows and slows down every learner's page.",
      ],
      scene: {
        nodes: [
          appsB,
          { ...prod, state: "hot", queue: 8 },
          node("dash0", "monitor", "Dashboard", 2.4, 2.4),
        ],
        links: [both("appsB", "prod", 2), link("dash0", "prod", "heavy")],
      },
    },
    {
      kind: "solution",
      short: "Batch",
      title: "Batch: collect now, compute later",
      body: [
        "Instead, the apps append every event to cheap **object storage** as files. Once a night a **batch job** reads the whole day, computes the totals on a cluster of machines, and writes them to an analytics **warehouse**.",
        "Production never notices. The price: yesterday's numbers, not today's.",
      ],
      scene: {
        nodes: [appsB, prod, lake, mappers, reducers, warehouse],
        links: [
          both("appsB", "prod", 1),
          link("appsB", "lake", { kind: "write", rate: 3 }),
          link("lake", "mappers", "heavy"),
          link("mappers", "reducers", "copy"),
          link("reducers", "warehouse", "write"),
        ],
      },
    },
    {
      kind: "technique",
      short: "MapReduce",
      title: "Split the work: map, shuffle, reduce",
      body: [
        "Two billion events won't go through one machine quickly, so the job is split. **Map**: each worker reads its own chunk and counts minutes per lesson. **Shuffle**: partial counts for the same lesson are sent to the same reducer, sorted by key. **Reduce**: each reducer adds up its lessons.",
        "A hundred machines finish in minutes what one would take a day to do.",
      ],
      quiz: {
        question: 'Why must all partial counts for "binary-search" reach the same reducer?',
        options: [
          "To spread the load",
          "So one machine can add them into the final total",
          "Reducers can't read files",
        ],
        answer: 1,
        why: "The shuffle groups by key (often by hashing it), so each final total is computed in exactly one place.",
      },
      scene: {
        nodes: [lake, mappers, reducers, warehouse],
        links: [
          link("lake", "mappers", "heavy"),
          link("mappers", "reducers", { kind: "copy", rate: 4 }),
          link("reducers", "warehouse", "write"),
        ],
      },
    },
    {
      kind: "case",
      short: "Skew",
      title: "Case: one lesson, one exhausted reducer",
      body: [
        "A viral video sends 40% of all views to one lesson. In the shuffle, every one of them goes to the same reducer, which grinds for hours while the other 49 finished long ago.",
        "Two fixes: a **combiner** pre-adds counts on each mapper, so it ships one number instead of millions of rows; and hot keys are **salted** (split into `lesson#0`…`lesson#9`) and summed again at the end.",
      ],
      scene: {
        nodes: [
          lake,
          mappers,
          { ...reducers, state: "hot", queue: 8, badge: "40% of data" },
          warehouse,
        ],
        links: [
          link("lake", "mappers", "heavy"),
          link("mappers", "reducers", { kind: "heavy", rate: 4 }),
        ],
      },
    },
    {
      kind: "problem",
      short: "Too late",
      title: "A day late is too late",
      body: [
        "Some questions can't wait for tonight. A contest needs a live leaderboard. A bot submitting copied solutions every few seconds should be caught in minutes, not tomorrow.",
      ],
      scene: {
        nodes: [appsB, lake, warehouse],
        links: [
          link("appsB", "lake", "write"),
          link("lake", "warehouse", { dashed: true, label: "tomorrow" }),
        ],
      },
    },
    {
      kind: "solution",
      short: "Stream",
      title: "Stream processing: compute as events arrive",
      body: [
        "Now the apps publish each event to an **event stream** (Kafka). A **stream processor** (Flink, Kafka Streams) reads events as they arrive and keeps running results in memory, updating dashboards within seconds.",
      ],
      metrics: [{ label: "Freshness", value: "≈ 3 s", tone: "good" }],
      scene: streamScene(),
    },
    {
      kind: "technique",
      short: "Windows",
      title: "Counting in windows",
      body: [
        'A stream never ends, so "count submissions" needs a time frame: a **window**. **Tumbling** windows cut time into fixed slices (submissions per minute). **Sliding** windows overlap (the last 5 minutes, updated every 10 seconds). **Session** windows close after a gap of inactivity.',
        '"Top 10 lessons in the last hour" is a sliding window plus a small heap.',
      ],
      scene: streamScene({ flink: { badge: "window: 1 min" } }),
    },
    {
      kind: "case",
      short: "Late events",
      title: "Case: late and duplicate events",
      body: [
        "A learner practises on a train with no signal and the app uploads her quiz answers two hours later. Do they count for 09:04, when they happened, or 11:04, when they arrived?",
        'Stream processors use **event time** and a **watermark** ("we have probably seen everything up to 09:10") to decide when a window is final. Every event carries an id, so retried uploads are counted once.',
      ],
      scene: streamScene({ appsB: { badge: "2 h late" } }),
    },
    {
      kind: "technique",
      short: "Partitions",
      title: "When the processor falls behind",
      body: [
        "A big contest triples traffic. The processor can't keep up and events pile up in the stream: **consumer lag** reaches minutes and the leaderboard goes stale.",
        "The stream is split into **partitions** (by learner id, so each learner's events stay in order). Each processor instance owns some partitions, so adding instances adds throughput.",
      ],
      scene: {
        nodes: [appsB, kafka, flink, node("flink2", "worker", "Processor 2", 2.2, 1.4), dash],
        links: [
          link("appsB", "kafka", { kind: "event", rate: 4 }),
          link("kafka", "flink", "event"),
          link("kafka", "flink2", "event"),
          link("flink", "dash", "write"),
          link("flink2", "dash", "write"),
        ],
      },
    },
    {
      kind: "technique",
      short: "Uniques",
      title: "Case: counting unique learners",
      body: [
        "Counting views is easy. Counting **unique** learners per lesson exactly means remembering every learner id seen: megabytes per lesson, gigabytes overall.",
        "**HyperLogLog** estimates distinct counts within about 1% using roughly 12 KB, by hashing ids and tracking the longest run of leading zeros. A small, honest error buys a thousandfold saving.",
      ],
      scene: streamScene({ flink: { badge: "HLL: 12 KB" } }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Keep heavy analytics off the production database.",
        "Batch: process big finished datasets cheaply; results are hours old.",
        "Stream: process events as they arrive; results in seconds.",
        "Watch for skewed keys, late events and duplicates.",
        "Many systems run both: a stream for fresh answers, a nightly batch for exact ones.",
      ],
      scene: streamScene(),
    },
  ],
};
