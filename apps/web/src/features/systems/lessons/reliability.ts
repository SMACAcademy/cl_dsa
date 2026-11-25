import { link, node, type Lesson, type Scene, type SceneNode, type Zone } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* --------------------------------- Redundancy and failover --------------------------------- */

const people = node("people", "user", "Learners", -4, 0);
const lbA = node("lbA", "lb", "LB", -1.6, -1.2, { sub: "active" });
const lbB = node("lbB", "lb", "LB", -1.6, 1.2, { sub: "standby", state: "dim" });
const appA = node("appA", "server", "App", 1, -1.2);
const appB = node("appB", "server", "App", 1, 1.2);
const dbA = node("dbA", "db", "Leader", 3.6, -1.2);
const dbB = node("dbB", "db", "Follower", 3.6, 1.2, { hue: "teal" });
const ZONES: Zone[] = [
  { label: "Zone A", x1: -2.6, y1: -2.1, x2: 4.6, y2: -0.3, hue: "blue" },
  { label: "Zone B", x1: -2.6, y1: 0.3, x2: 4.6, y2: 2.1, hue: "violet" },
];
const pair = (extra: Record<string, Partial<SceneNode>> = {}, zones = false): Scene => {
  const nodes = [people, lbA, lbB, appA, appB, dbA, dbB].map((n) => ({
    ...n,
    ...(extra[n.id] ?? {}),
  }));
  const alive = (id: string) => nodes.find((n) => n.id === id)?.state !== "down";
  const lb = alive("lbA") ? "lbA" : "lbB";
  const leader = alive("dbA") ? "dbA" : "dbB";
  return {
    nodes,
    zones: zones ? ZONES : undefined,
    links: [
      both("people", lb, 2),
      ...["appA", "appB"].filter(alive).map((a) => both(lb, a, 1)),
      ...["appA", "appB"].filter(alive).map((a) => both(a, leader, 1)),
      ...(alive("dbA") && alive("dbB") ? [link("dbA", "dbB", "copy")] : []),
      link("lbA", "lbB", { dashed: true }),
    ],
  };
};

export const REDUNDANCY: Lesson = {
  id: "redundancy",
  title: "Redundancy and failover",
  tagline: "Everything fails eventually. Design so that no single failure takes AlgoVerse down.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "How availabilities multiply along a chain",
    "Removing single points of failure",
    "Correlated failures and availability zones",
    "RTO and RPO, and practising failover",
    "Why most outages are changes, and canary releases",
  ],
  steps: [
    {
      kind: "setup",
      short: "The chain",
      title: "How available is one of everything?",
      body: [
        "A simple stack: a load balancer, an app server and a database. Each is up 99.9% of the time, which sounds great.",
        "But a request needs all three, so their availabilities multiply: 0.999 × 0.999 × 0.999 ≈ **99.7%**, about 26 hours of downtime a year.",
      ],
      table: {
        head: ["Availability", "Downtime per year"],
        rows: [
          ["99%", "3.7 days"],
          ["99.9%", "8.8 hours"],
          ["99.99%", "53 minutes"],
          ["99.999%", "5 minutes"],
        ],
      },
      scene: {
        nodes: [people, { ...lbA, sub: "" }, { ...appA }, { ...dbA, label: "Database" }],
        links: [both("people", "lbA", 2), both("lbA", "appA", 2), both("appA", "dbA", 2)],
      },
    },
    {
      kind: "problem",
      short: "SPOFs",
      title: "Every box is a single point of failure",
      body: [
        "A **single point of failure** is anything whose failure alone takes the system down. Here, that is every component: a bad disk, a crash or a botched deploy and every learner sees an error page.",
      ],
      callout: {
        kind: "watch",
        text: "Assume each component will fail, and ask what happens then.",
      },
      scene: {
        nodes: [
          people,
          { ...lbA, sub: "" },
          { ...appA, state: "down" },
          { ...dbA, label: "Database" },
        ],
        links: [both("people", "lbA", 2), link("lbA", "appA", "fail")],
      },
    },
    {
      kind: "solution",
      short: "Two of each",
      title: "Redundancy: two of everything",
      body: [
        "Add a spare for each part: an active–standby pair of balancers, two app servers sharing traffic, and a database follower ready to take over.",
        "Now both copies must fail at once for an outage. Losing any single machine is a non-event.",
      ],
      quiz: {
        question: "Two independent app servers are each up 99.9%. How often are both down at once?",
        options: ["0.1% of the time", "0.0001% of the time", "Never"],
        answer: 1,
        why: "0.001 × 0.001 = 0.000001, or 0.0001%: about 30 seconds a year, if the failures really are independent.",
      },
      scene: pair(),
    },
    {
      kind: "problem",
      short: "One building",
      title: "Copies that fail together",
      body: [
        'All those copies sit in one data centre. A power cut, a flood or a cooling failure takes out the whole building, and every "redundant" copy with it.',
        "Failures that hit many components at once are **correlated**. Redundancy only helps if copies fail independently.",
      ],
      scene: {
        ...pair(),
        zones: [
          {
            label: "One data centre: power lost",
            x1: -2.6,
            y1: -2.1,
            x2: 4.6,
            y2: 2.1,
            hue: "rose",
          },
        ],
        nodes: pair().nodes.map((n) => (n.id === "people" ? n : { ...n, state: "down" as const })),
        links: [link("people", "lbA", "fail")],
      },
    },
    {
      kind: "solution",
      short: "Zones",
      title: "Spread across availability zones",
      body: [
        "Cloud regions are split into **availability zones**: separate data centres a few kilometres apart, with their own power and network, joined by fast links.",
        "Put one app server and one database copy in each zone. A zone-wide disaster now takes out only half.",
      ],
      scene: pair({}, true),
    },
    {
      kind: "solution",
      short: "Failover",
      title: "Zone A goes dark: failover",
      body: [
        "Zone A loses power. Health checks fail, the standby balancer takes over, and the follower in zone B is promoted to leader. Learners mid-request may see one error and retry; within a minute everything runs from zone B.",
      ],
      callout: {
        kind: "key",
        text: "Zone B must have enough spare capacity to carry everything alone.",
      },
      scene: pair(
        {
          lbA: { state: "down" },
          appA: { state: "down" },
          dbA: { state: "down" },
          lbB: { state: "lit", sub: "now active" },
          dbB: { label: "New leader", hue: "green" },
        },
        true,
      ),
    },
    {
      kind: "technique",
      short: "RTO / RPO",
      title: "How fast, and how much lost?",
      body: [
        "Two numbers describe a failover. **RTO** (recovery time objective): how long until service is back. **RPO** (recovery point objective): how much recent data you can afford to lose.",
        "Asynchronous replication means the follower may be seconds behind, and those writes are lost. Synchronous replication brings RPO to zero, at the cost of slower writes.",
      ],
      quiz: {
        question:
          "AlgoVerse can live with losing the last 5 seconds of quiz answers, but not with being down for an hour. Which matters more to design for?",
        options: ["A tiny RPO", "A short RTO", "Neither"],
        answer: 1,
        why: "Some data loss is acceptable (RPO of seconds), but downtime is not: invest in fast, automatic failover.",
      },
      scene: pair({}, true),
    },
    {
      kind: "insight",
      short: "Practise",
      title: "Untested failover doesn't work",
      body: [
        "A failover path that never runs quietly rots: a config drifts, a spare is too small, a script has a typo. You find out during the real outage.",
        "So teams break things on purpose, in working hours, and watch the system cope: **chaos engineering**. Game days rehearse whole-zone failures.",
      ],
      scene: pair({ appB: { state: "down", badge: "killed by test" } }, true),
    },
    {
      kind: "case",
      short: "Bad deploy",
      title: "Case: the bug that is everywhere at once",
      body: [
        "A new release with a bug goes out to every app server in both zones together. Every copy crashes on the same request. Redundancy doesn't help when all copies share the same broken code.",
        "This is the most common cause of real outages: not hardware, but **changes** to code, configuration or infrastructure.",
      ],
      scene: pair(
        { appA: { state: "down", badge: "v2.4" }, appB: { state: "down", badge: "v2.4" } },
        true,
      ),
    },
    {
      kind: "solution",
      short: "Canary",
      title: "Canary releases",
      body: [
        "Roll out in stages. First a **canary**: one server, or 1% of traffic, gets v2.4. Compare its error rate and latency with the rest. Worse? Roll back; only 1% of learners saw it, briefly. Fine? Continue to 10%, 50%, 100%.",
        "Many teams also deploy one zone at a time.",
      ],
      scene: pair({ appA: { badge: "v2.4 · 1%", state: "lit" }, appB: { badge: "v2.3" } }, true),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Components in a chain multiply their availability.",
        "Remove single points of failure with redundant copies.",
        "Copies must fail independently: spread them across zones.",
        "Set RTO and RPO, and practise failover so it works when needed.",
        "Most outages are changes: roll out with canaries.",
      ],
      scene: pair({}, true),
    },
  ],
};

/* -------------------------------------- Rate limiting -------------------------------------- */

const script = node("script", "browser", "Runaway script", -3.6, -1.6, { sub: "4,000 req/s" });
const normal = node("normal", "user", "Learners", -3.6, 1.6);
const limiter = node("limiter", "gateway", "API gateway", -0.6, 0, { sub: "rate limiter" });
const runApi = node("runApi", "server", "Run API", 2.6, 0, { sub: "runs code" });
const counters = node("counters", "cache", "Shared counters", -0.6, -2.8, { sub: "Redis" });

export const RATE_LIMITING: Lesson = {
  id: "rate-limiting",
  title: "Rate limiting",
  tagline: "Give every client a fair budget, so one runaway script can't take everyone down.",
  minutes: 10,
  level: "intermediate",
  learn: [
    "Why one client can starve everyone",
    "The token bucket",
    "Fixed and sliding windows",
    "Shared counters across many gateways",
    "Telling clients to back off, and shedding load",
  ],
  steps: [
    {
      kind: "problem",
      short: "Runaway",
      title: "One script, everyone suffers",
      body: [
        'A learner writes a script against AlgoVerse\'s "run code" API, and a bug makes it loop: 4,000 requests a second. The Run API spends almost all its time on that one client.',
        "Everyone else's code runs queue behind it and time out.",
      ],
      metrics: [
        { label: "From one script", value: "93% of load", tone: "bad" },
        { label: "Learner p95", value: "8 s", tone: "bad" },
      ],
      scene: {
        nodes: [script, normal, { ...runApi, state: "hot", queue: 8 }],
        links: [
          link("script", "runApi", { kind: "request", rate: 4 }),
          link("normal", "runApi", "request", { kind: "fail", rate: 1 }),
        ],
      },
    },
    {
      kind: "solution",
      short: "Limiter",
      title: "A rate limiter at the front door",
      body: [
        "Put a **rate limiter** in the gateway. Each client, identified by API key, user id or IP address, gets a budget: say 10 requests a second.",
        "Requests within the budget pass; the rest are rejected at once with **429 Too Many Requests**, before they cost the Run API anything.",
      ],
      scene: {
        nodes: [script, normal, limiter, runApi],
        links: [
          link(
            "script",
            "limiter",
            { kind: "request", rate: 4 },
            { kind: "fail", back: true, rate: 3 },
          ),
          both("normal", "limiter", 2),
          both("limiter", "runApi", 2),
        ],
      },
    },
    {
      kind: "technique",
      short: "Token bucket",
      title: "How it counts: the token bucket",
      body: [
        "Each client has a bucket holding up to 10 **tokens**, refilled at 5 per second. Every request takes one token; an empty bucket means 429.",
        "A quiet client saves up tokens, so short bursts are fine, while the long-run average is capped at the refill rate.",
      ],
      code: [
        "def allow(bucket, now):",
        "    bucket.tokens = min(10, bucket.tokens + (now - bucket.last) * 5)",
        "    bucket.last = now",
        "    if bucket.tokens >= 1:",
        "        bucket.tokens -= 1",
        "        return True",
        "    return False   # 429",
      ],
      quiz: {
        question:
          "A full bucket (10 tokens, refill 5/s) gets 14 requests in one instant. How many pass?",
        options: ["5", "10", "14"],
        answer: 1,
        why: "The 10 saved tokens allow a burst of 10; the other 4 get 429 until tokens refill.",
      },
      scene: {
        nodes: [normal, { ...limiter, badge: "tokens: 7 / 10" }, runApi],
        links: [both("normal", "limiter", 2), both("limiter", "runApi", 2)],
      },
    },
    {
      kind: "technique",
      short: "Windows",
      title: "Windows and their edges",
      body: [
        "A simpler **fixed window** counts requests per calendar minute and resets at :00. Easy, but a client can send a full minute's budget at 12:00:59 and another at 12:01:00: double the limit in two seconds.",
        "**Sliding windows** weigh the previous minute's count to smooth that edge. Token buckets avoid it naturally.",
      ],
      scene: {
        nodes: [normal, limiter, runApi],
        links: [both("normal", "limiter", 3), both("limiter", "runApi", 3)],
        notes: [{ x: -2, y: -1.4, text: "12:00:59 + 12:01:00 = 2× budget", tone: "bad" }],
      },
    },
    {
      kind: "problem",
      short: "Many gates",
      title: "Many gateways, one budget",
      body: [
        "One gateway isn't enough, so AlgoVerse runs several behind a load balancer. If each counts on its own, a client spread across 5 gateways gets 5 times its limit.",
        "So the gateways keep the counters in a **shared fast store** such as Redis, updated atomically. A little approximation (syncing every few hundred milliseconds) is usually fine.",
      ],
      scene: {
        nodes: [
          script,
          normal,
          limiter,
          node("lim2", "gateway", "Gateway 2", -0.6, 2.4),
          runApi,
          counters,
        ],
        links: [
          link("script", "limiter", "request"),
          link("normal", "lim2", "request"),
          both("limiter", "counters", 1),
          both("lim2", "counters", 1),
          link("limiter", "runApi", "request"),
          link("lim2", "runApi", "request"),
        ],
      },
    },
    {
      kind: "technique",
      short: "Headers",
      title: "Tell clients how to behave",
      body: [
        "A good 429 says when to come back: a `Retry-After: 30` header, plus headers showing the limit and what is left. Well-behaved clients slow down and retry later.",
        "The runaway script still gets 429s, but now its author can see exactly why.",
      ],
      code: [
        "HTTP/1.1 429 Too Many Requests",
        "Retry-After: 30",
        "RateLimit-Limit: 10",
        "RateLimit-Remaining: 0",
      ],
      scene: {
        nodes: [script, limiter, runApi],
        links: [
          link(
            "script",
            "limiter",
            { kind: "request", rate: 1 },
            { kind: "fail", back: true, rate: 1 },
          ),
          both("limiter", "runApi", 1),
        ],
      },
    },
    {
      kind: "case",
      short: "Classroom",
      title: "Case: a whole classroom behind one address",
      body: [
        "A school runs AlgoVerse in a lab: 600 students behind one school IP address. A per-IP limit of 10 a second blocks most of the class.",
        "Limit per **signed-in user** where you can, use generous limits per IP, and give schools their own tenant budget.",
      ],
      scene: {
        nodes: [
          { ...normal, label: "600 students", sub: "one school IP" },
          { ...limiter, badge: "per user" },
          runApi,
        ],
        links: [both("normal", "limiter", 4), both("limiter", "runApi", 3)],
      },
    },
    {
      kind: "technique",
      short: "Shed load",
      title: "When everyone spikes: shed load",
      body: [
        "Rate limits stop one client hogging capacity. But when a contest ends and everyone submits at once, the total can still exceed what AlgoVerse can serve.",
        '**Load shedding** decides what to drop first: keep sign-ins and submissions, delay recommendations and analytics, and say "try again in a minute" rather than slowing everything down.',
      ],
      scene: {
        nodes: [
          normal,
          limiter,
          runApi,
          node("recs", "service", "Recommendations", 2.6, 2.6, { state: "dim", sub: "paused" }),
        ],
        links: [
          both("normal", "limiter", 4),
          both("limiter", "runApi", 3),
          link("limiter", "recs", { dashed: true }),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Give each client a budget; reject the excess early with 429.",
        "Token buckets allow short bursts and cap the average rate.",
        "Across many gateways, keep counters in a shared store.",
        "Say when to retry; limit per user or tenant, not only per IP.",
        "When everything spikes, shed the least important work first.",
      ],
      scene: {
        nodes: [script, normal, limiter, runApi, counters],
        links: [
          link("script", "limiter", "request", { kind: "fail", back: true }),
          both("normal", "limiter", 2),
          both("limiter", "runApi", 2),
          both("limiter", "counters", 1),
        ],
      },
    },
  ],
};

/* ----------------------------------- Timeouts and retries ----------------------------------- */

const caller = node("caller", "service", "Submission service", -1.4, 0, { sub: "200 threads" });
const grader = node("grader", "service", "Grader", 2.4, 0, { sub: "normally 300 ms" });
const learnersT = node("learnersT", "user", "Learners", -4.4, 0);
const chainT = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [learnersT, caller, grader].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [both("learnersT", "caller", 2), both("caller", "grader", 2)],
});

export const TIMEOUTS_RETRIES: Lesson = {
  id: "timeouts-retries",
  title: "Timeouts and retries",
  tagline:
    "Calling a struggling service safely: give up in time, retry carefully, and know when to stop.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why every remote call needs a timeout",
    "Retries, and the retry storm",
    "Exponential backoff with jitter",
    "Circuit breakers and bulkheads",
    "Idempotency keys and passing deadlines along",
  ],
  steps: [
    {
      kind: "problem",
      short: "No timeout",
      title: "One slow service takes down another",
      body: [
        "The grader starts answering in 40 seconds instead of 300 ms. The submission service calls it and simply waits, with no limit. Each waiting call holds a thread.",
        "Within a minute all 200 threads are waiting on the grader, and the submission service can't even serve its health check. A slow dependency became a full outage.",
      ],
      metrics: [
        { label: "Threads waiting", value: "200 / 200", tone: "bad" },
        { label: "Errors", value: "100%", tone: "bad" },
      ],
      scene: chainT(
        { caller: { state: "hot", queue: 8 }, grader: { sub: "40 s per call", state: "hot" } },
        [
          link("learnersT", "caller", "request", { kind: "fail", back: true }),
          link("caller", "grader", { kind: "request", rate: 3, speed: 3 }),
        ],
      ),
    },
    {
      kind: "solution",
      short: "Timeout",
      title: "Set a timeout, and have a fallback",
      body: [
        "Give every outgoing call a **timeout**: if the grader hasn't answered in 1 second, give up and free the thread.",
        'Then degrade gracefully: accept the submission as "queued for grading" and grade it later. The learner gets an answer, and the submission service stays healthy.',
      ],
      scene: chainT({ grader: { sub: "slow", state: "hot" }, caller: { badge: "timeout 1 s" } }, [
        both("learnersT", "caller", 2),
        link("caller", "grader", "request", { kind: "fail", rate: 1 }),
      ]),
    },
    {
      kind: "technique",
      short: "Retry",
      title: "Retry the blips",
      body: [
        "Many failures are momentary: a dropped packet, a grader restarting. Trying again a moment later usually works, and one retry turns most of those failures into successes.",
      ],
      scene: chainT({}, [
        both("learnersT", "caller", 2),
        link(
          "caller",
          "grader",
          "request",
          { kind: "heavy", rate: 1 },
          { kind: "response", back: true },
        ),
      ]),
    },
    {
      kind: "problem",
      short: "Storm",
      title: "Retries become a storm",
      body: [
        "Then the grader becomes genuinely overloaded. Every caller retries three times, immediately. Each failed request becomes four, so the struggling grader now gets four times its normal load.",
        "It was slow; now it is buried.",
      ],
      quiz: {
        question:
          "1,000 calls a second fail, and each caller retries up to 3 times at once. How many calls hit the grader?",
        options: ["1,000", "3,000", "4,000"],
        answer: 2,
        why: "Each original call plus 3 retries: 4 × 1,000. Retries multiply load exactly when the service can least afford it.",
      },
      scene: chainT({ grader: { state: "hot", queue: 9, badge: "× 4 load" } }, [
        both("learnersT", "caller", 2),
        link("caller", "grader", { kind: "request", rate: 4 }, { kind: "fail", rate: 3 }),
      ]),
    },
    {
      kind: "solution",
      short: "Backoff",
      title: "Back off, with jitter",
      body: [
        "Wait before retrying, and wait longer each time: 100 ms, then 200, then 400: **exponential backoff**. Add randomness (**jitter**) so thousands of clients don't retry in the same instant. Cap the number of attempts.",
      ],
      code: [
        "for attempt in range(3):",
        "    try:",
        "        return call(timeout=1.0)",
        "    except Timeout:",
        "        sleep(random.uniform(0, 0.1 * 2 ** attempt))",
        "raise GiveUp()",
      ],
      scene: chainT({}, [
        both("learnersT", "caller", 2),
        link(
          "caller",
          "grader",
          { kind: "request", rate: 1 },
          { kind: "response", back: true, rate: 1 },
        ),
      ]),
    },
    {
      kind: "technique",
      short: "Breaker",
      title: "Circuit breaker: stop calling for a while",
      body: [
        "The grader goes fully down. Even with timeouts, every call wastes a second finding that out. A **circuit breaker** watches the failures; past a threshold it **opens** and fails calls instantly, without trying.",
        "After a cool-down it lets one trial call through (**half-open**). Success closes the breaker; failure opens it again.",
      ],
      callout: {
        kind: "key",
        text: "Closed → open on too many failures → half-open after a pause → closed on success.",
      },
      scene: chainT({ grader: { state: "down" }, caller: { badge: "breaker: open" } }, [
        both("learnersT", "caller", 2),
        link("caller", "grader", { cut: true }),
      ]),
    },
    {
      kind: "technique",
      short: "Idempotency",
      title: "Retries must not charge twice",
      body: [
        "A nasty case: a learner buys Premium, the payment service charges the card, but the response is lost. The caller times out and retries, and the learner is charged twice.",
        "Fix: send an **idempotency key** (a unique id for this purchase) with every attempt. The payment service remembers keys it has seen and returns the original result instead of charging again.",
      ],
      scene: {
        nodes: [
          learnersT,
          caller,
          node("pay", "service", "Payments", 2.4, 0, { badge: "key 7f3a: charged once" }),
        ],
        links: [
          both("learnersT", "caller", 1),
          link("caller", "pay", "request", "request", { kind: "response", back: true }),
        ],
      },
    },
    {
      kind: "technique",
      short: "Deadlines",
      title: "Pass the deadline along",
      body: [
        "The learner's browser gives up after 3 seconds. If the submission service has already spent 2.9 s, there is no point starting a fresh second of work in the grader: nobody will see the answer.",
        "So pass the remaining time down the chain as a **deadline**, and let every service skip work that can no longer arrive in time.",
      ],
      scene: chainT({ caller: { badge: "100 ms left" } }),
    },
    {
      kind: "technique",
      short: "Bulkheads",
      title: "Bulkheads: separate pools",
      body: [
        "Remember the first step, when a slow grader used up all 200 threads? Give each dependency its own pool: say 60 threads for the grader, 60 for the database, and so on.",
        "A slow grader can then exhaust only its own pool, like a ship's watertight compartments.",
      ],
      scene: {
        nodes: [
          learnersT,
          { ...caller, sub: "pools: 60 · 60 · 80" },
          { ...grader, state: "hot" },
          node("dbT", "db", "Database", 2.4, 2.4),
        ],
        links: [
          both("learnersT", "caller", 2),
          link("caller", "grader", "request", { kind: "fail", rate: 1 }),
          both("caller", "dbT", 2),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Every remote call needs a timeout and a fallback.",
        "Retry transient errors with exponential backoff, jitter and a cap.",
        "A circuit breaker stops hammering a service that is down.",
        "Idempotency keys make retries safe; deadlines and bulkheads contain the damage.",
      ],
      scene: chainT(),
    },
  ],
};

/* ---------------------------------------- Observability ---------------------------------------- */

const obsNodes = [
  node("edge", "gateway", "Gateway", -3.6, 0),
  node("subm", "service", "Submissions", -1.2, 0),
  node("grd", "service", "Grader", 1.2, -1.4),
  node("sbx", "worker", "Sandbox", 3.6, -1.4),
  node("store", "db", "Database", 1.2, 1.4),
];
const obs = (
  extra: Record<string, Partial<SceneNode>> = {},
  notes: Scene["notes"] = [],
): Scene => ({
  nodes: obsNodes.map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: [
    both("edge", "subm", 2),
    both("subm", "grd", 2),
    both("grd", "sbx", 2),
    both("subm", "store", 2),
  ],
  notes,
});

export const OBSERVABILITY: Lesson = {
  id: "observability",
  title: "Observability",
  tagline: "Metrics, logs and traces: how to find out what's wrong, where, and why, fast.",
  minutes: 11,
  level: "intermediate",
  learn: [
    "Metrics: rate, errors, duration",
    "Alerting on what users feel: SLOs",
    "Structured logs with request ids",
    "Distributed traces",
    "Incidents, rollbacks and blameless post-mortems",
  ],
  steps: [
    {
      kind: "problem",
      short: "Where?",
      title: '"Submissions are slow." Where?',
      body: [
        "Messages pile up: grading takes ages. A submission touches the gateway, the submission service, the grader, a sandbox and the database. Any of them could be the culprit.",
        "Guessing and adding print statements across five services won't do. We need the system to tell us.",
      ],
      scene: obs({
        edge: { badge: "?" },
        subm: { badge: "?" },
        grd: { badge: "?" },
        sbx: { badge: "?" },
        store: { badge: "?" },
      }),
    },
    {
      kind: "technique",
      short: "Metrics",
      title: "Metrics: numbers over time",
      body: [
        "Every service records a few numbers about the requests it handles, the **RED** method: **R**ate (requests a second), **E**rrors (failed share) and **D**uration (latency percentiles). They go to a time-series database and onto dashboards.",
        "The dashboard shows it at once: the grader's p95 jumped from 300 ms to 4 s at 14:05. Now we know **where**.",
      ],
      metrics: [
        { label: "Grader p95", value: "4.1 s", tone: "bad" },
        { label: "Grader errors", value: "0.3%" },
        { label: "Others p95", value: "normal", tone: "good" },
      ],
      scene: obs({ grd: { state: "hot", badge: "p95 4.1 s" } }),
    },
    {
      kind: "technique",
      short: "SLOs",
      title: "Alert on what users feel",
      body: [
        'Don\'t page people for "CPU above 80%"; it fires constantly and often means nothing. Pick a **service level indicator** (the share of submissions graded within 5 seconds) and an **objective** (99.5% over 30 days).',
        "The 0.5% left is the **error budget**. Page a human only when it is burning fast.",
      ],
      quiz: {
        question: "Which alert should wake an engineer at 3 a.m.?",
        options: [
          "A server's CPU is at 85%",
          "Grading within 5 s dropped to 92% for 10 minutes",
          "Disk usage grew 1% today",
        ],
        answer: 1,
        why: "It measures what learners actually experience, and it is well outside the 99.5% objective.",
      },
      scene: obs({ grd: { state: "hot" } }),
    },
    {
      kind: "technique",
      short: "Logs",
      title: "Logs: the story, line by line",
      body: [
        "Metrics say where; logs say what happened. But at thousands of requests a second, lines from different submissions interleave into noise.",
        "So every request gets a **request id** at the gateway, passed to every service and written in every log line, as structured JSON. Search for the id, and one submission's story appears.",
      ],
      code: ['{"t":"14:05:03","svc":"grader","req":"9c1e","msg":"sandbox start","ms":3900}'],
      scene: obs({}, [{ x: 0, y: -2.6, text: "req 9c1e in every line" }]),
    },
    {
      kind: "solution",
      short: "Traces",
      title: "Traces: follow one request everywhere",
      body: [
        "A **distributed trace** records every hop of one request as a **span** with a start and a duration, all joined by the same trace id. Drawn as a waterfall, it shows exactly where the time goes.",
        "Here: 3.9 s of a 4.2 s submission is the sandbox pulling a fresh 2 GB language image for every run.",
      ],
      table: {
        head: ["Span", "Time"],
        rows: [
          ["gateway", "4.2 s"],
          ["  submissions", "4.1 s"],
          ["    database", "12 ms"],
          ["    grader", "4.0 s"],
          ["      sandbox image pull", "3.9 s"],
        ],
      },
      scene: obs({ sbx: { state: "hot", badge: "3.9 s pulling image" } }),
    },
    {
      kind: "solution",
      short: "Fix it",
      title: "Fix it, then prove it",
      body: [
        "With the cause known, the fix is quick: keep language images cached on each sandbox host and pre-warm a few sandboxes.",
        "The same dashboards prove it worked: grader p95 back to 350 ms, and the SLO recovering.",
      ],
      metrics: [
        { label: "Grader p95", value: "350 ms", tone: "good" },
        { label: "SLO (5 s)", value: "99.8%", tone: "good" },
      ],
      scene: obs({ sbx: { badge: "image cached" } }),
    },
    {
      kind: "case",
      short: "3 a.m.",
      title: "Case: 3 a.m., errors spike",
      body: [
        "The pager fires: submission errors jumped from 0.1% to 6% at 03:12. The dashboard points at the database. The deploy log shows a configuration change to it at 03:10.",
        "First **mitigate**: roll the change back, and errors drop within minutes. Investigate the root cause in daylight.",
      ],
      callout: {
        kind: "key",
        text: "Stop the bleeding first. Most incidents start with a change, so rolling back is the fastest fix.",
      },
      scene: obs({ store: { state: "hot", badge: "config 03:10" } }),
    },
    {
      kind: "insight",
      short: "Post-mortem",
      title: "Learn from it: the post-mortem",
      body: [
        "Afterwards the team writes a **post-mortem**: a timeline, the impact, the root cause, and actions that stop it happening again (a config check in CI, a canary for config changes).",
        "It is **blameless**: the question is how the system allowed the mistake, not who made it.",
      ],
      scene: obs(),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Metrics (rate, errors, duration) show where it hurts.",
        "Alert on SLOs, what users feel, not on raw CPU.",
        "Logs with a request id tell one request's story.",
        "Traces follow a request across every service.",
        "Mitigate first, then learn with a blameless post-mortem.",
      ],
      scene: obs(),
    },
  ],
};
