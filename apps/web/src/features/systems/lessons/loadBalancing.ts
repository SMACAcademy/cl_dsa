import { LoadBalancerPlayer } from "../../viz/ds/loadBalancing";
import { link, node, patch, type Lesson, type Scene } from "../model";

const users = node("users", "user", "Learners", -3, 0, { sub: "120k online" });
const lb = node("lb", "lb", "Load balancer", 0, 0, { sub: "one public address" });
const a = node("a", "server", "App A", 3, -1.5);
const b = node("b", "server", "App B", 3, 0);
const c = node("c", "server", "App C", 3, 1.5);

const spread: Scene = {
  nodes: [users, lb, a, b, c],
  links: [
    link("users", "lb", "request", { kind: "response", back: true }),
    link("lb", "a", "request", { kind: "response", back: true }),
    link("lb", "b", "request", { kind: "response", back: true }),
    link("lb", "c", "request", { kind: "response", back: true }),
  ],
};

export const LOAD_BALANCING: Lesson = {
  id: "load-balancing",
  title: "Load balancing",
  tagline: "One front door for many servers, and the rules for who handles which request.",
  minutes: 12,
  level: "beginner",
  learn: [
    "Why extra servers do nothing without a front door",
    "Round robin vs least connections",
    "Health checks that route around a dead server",
    "Keeping the balancer itself from being a single point of failure",
    "Layer-7 routing and deploys without downtime",
  ],
  builtOn: [
    { label: "Queue", path: "/structures/queue" },
    { label: "Binary heap", path: "/structures/binary-heap" },
    { label: "Hash table", path: "/structures/hash-table" },
  ],
  lab: LoadBalancerPlayer,
  steps: [
    {
      kind: "problem",
      short: "One address",
      title: "Three servers, but only one is working",
      body: [
        "AlgoVerse's quiz API now runs on three app servers. But the domain name still points at a single IP address, App B's, so every learner's request lands there.",
        "App B is at 97% CPU and answers slowly. App A and App C sit idle. We paid for three servers and got one.",
      ],
      callout: {
        kind: "watch",
        text: "More servers only help if traffic can actually reach them.",
      },
      metrics: [
        { label: "App A CPU", value: "4%" },
        { label: "App B CPU", value: "97%", tone: "bad" },
        { label: "App C CPU", value: "3%" },
        { label: "p95 latency", value: "1.8 s", tone: "bad" },
      ],
      scene: {
        nodes: [
          users,
          { ...a, state: "dim" },
          { ...b, state: "hot", badge: "97%" },
          { ...c, state: "dim" },
        ],
        links: [link("users", "b", { kind: "request", rate: 4 }, { kind: "response", back: true })],
      },
    },
    {
      kind: "solution",
      short: "Front door",
      title: "Put a load balancer in front",
      body: [
        "A **load balancer** becomes the one public address. Learners connect to it; it forwards each request to one of the servers behind it, its **pool**, and passes the answer back.",
        "Servers can now join or leave the pool without any learner noticing: the address they use never changes.",
      ],
      callout: { kind: "key", text: "Clients talk to the balancer, never to a server directly." },
      changes: [
        { op: "+", text: "Load balancer" },
        { op: "~", text: "DNS now points at the balancer" },
        { op: "~", text: "CPU 4 / 97 / 3% → about 35% each" },
      ],
      metrics: [
        { label: "App A CPU", value: "34%", tone: "good" },
        { label: "App B CPU", value: "36%", tone: "good" },
        { label: "App C CPU", value: "35%", tone: "good" },
        { label: "p95 latency", value: "140 ms", tone: "good" },
      ],
      scene: spread,
    },
    {
      kind: "technique",
      short: "Round robin",
      title: "Round robin: take turns",
      body: [
        "How does the balancer choose? The simplest rule is **round robin**: A, then B, then C, then A again. It keeps one counter and needs no information about the servers.",
        "It is fair as long as the servers are equally strong and every request costs about the same.",
      ],
      code: [
        "turn = 0",
        "def pick(pool):",
        "    global turn",
        "    server = pool[turn % len(pool)]",
        "    turn += 1",
        "    return server",
      ],
      quiz: {
        question: "Three servers, round robin, starting at A. Which server gets request number 7?",
        options: ["App A", "App B", "App C"],
        answer: 0,
        why: "Requests 1, 4 and 7 go to A: 7 − 1 = 6 is a multiple of 3.",
      },
      callout: {
        kind: "good",
        text: "Weighted round robin gives a bigger server more turns, for example A : B : C = 2 : 1 : 1.",
      },
      metrics: [
        { label: "Strategy", value: "round robin" },
        { label: "Cost per pick", value: "O(1)" },
      ],
      scene: patch(spread, { nodes: { lb: { sub: "round robin" } } }),
    },
    {
      kind: "problem",
      short: "Uneven work",
      title: "When requests are not equal",
      body: [
        "Opening a lesson takes about 10 ms. Grading a learner's code submission runs their program in a sandbox and takes about 2 seconds.",
        "Round robin counts requests, not work. In this traffic every third request is a submission, and the rotation sends every one of them to App C. C drowns while A and B coast.",
      ],
      callout: { kind: "watch", text: "Round robin has no idea how busy a server really is." },
      changes: [
        { op: "+", text: "Heavy requests: code submissions" },
        { op: "~", text: "App C CPU 35% → 98%" },
        { op: "~", text: "p95 latency 140 ms → 2.6 s" },
      ],
      metrics: [
        { label: "App A CPU", value: "22%" },
        { label: "App B CPU", value: "24%" },
        { label: "App C CPU", value: "98%", tone: "bad" },
        { label: "p95 latency", value: "2.6 s", tone: "bad" },
      ],
      scene: patch(spread, {
        nodes: { lb: { sub: "round robin" }, c: { state: "hot", badge: "98%", queue: 6 } },
        links: [
          link("users", "lb", "request", "heavy", { kind: "response", back: true }),
          link("lb", "a", "request", { kind: "response", back: true }),
          link("lb", "b", "request", { kind: "response", back: true }),
          link("lb", "c", { kind: "heavy", rate: 3 }, { kind: "response", back: true, rate: 1 }),
        ],
      }),
    },
    {
      kind: "technique",
      short: "Least conns",
      title: "Least connections: send work where it is quietest",
      body: [
        "With **least connections**, the balancer tracks how many requests each server is still working on, and sends the next one to the server with the fewest.",
        "A server stuck on slow submissions holds more open connections, so it automatically receives fewer new requests. The work evens out without the balancer knowing what any request costs.",
      ],
      table: {
        head: ["Strategy", "Picks", "Good for"],
        rows: [
          ["Round robin", "the next server in turn", "equal servers, equal requests"],
          ["Least connections", "the fewest open requests", "requests of very different cost"],
          [
            "Power of two choices",
            "the less busy of 2 random servers",
            "huge pools, cheap and nearly as good",
          ],
          ["Hash of user id", "always the same server per user", "per-user caches on the server"],
        ],
      },
      quiz: {
        question:
          "App A has 4 open requests, App B has 1, App C has 7. Where does least connections send the next one?",
        options: ["App A", "App B", "App C"],
        answer: 1,
        why: "B has the fewest open requests. With thousands of servers, balancers keep these counts in a heap so the minimum is found in O(log n).",
      },
      changes: [
        { op: "~", text: "Strategy: least connections" },
        { op: "~", text: "App C CPU 98% → 55%" },
        { op: "~", text: "p95 latency 2.6 s → 210 ms" },
      ],
      metrics: [
        { label: "App A CPU", value: "52%" },
        { label: "App B CPU", value: "54%" },
        { label: "App C CPU", value: "55%", tone: "good" },
        { label: "p95 latency", value: "210 ms", tone: "good" },
      ],
      scene: patch(spread, {
        nodes: { lb: { sub: "least connections" }, c: { queue: 1 } },
        links: [
          link("users", "lb", "request", "heavy", { kind: "response", back: true }),
          link("lb", "a", "request", { kind: "heavy", rate: 1 }, { kind: "response", back: true }),
          link("lb", "b", "request", { kind: "heavy", rate: 1 }, { kind: "response", back: true }),
          link("lb", "c", "request", { kind: "heavy", rate: 1 }, { kind: "response", back: true }),
        ],
      }),
    },
    {
      kind: "technique",
      short: "Health checks",
      title: "Health checks route around a dead server",
      body: [
        "Every few seconds the balancer asks each server `GET /health`. A server that misses three checks in a row is taken out of the pool; when it answers again, it is put back.",
        "App C just crashed. Its requests now go to A and B, and learners see no errors at all.",
      ],
      callout: {
        kind: "key",
        text: "Health checks plus a spare server mean no single app server can take AlgoVerse down.",
      },
      changes: [
        { op: "-", text: "App C down" },
        { op: "~", text: "C removed from the pool" },
        { op: "~", text: "Errors stay at 0%" },
      ],
      metrics: [
        { label: "Healthy servers", value: "2 of 3" },
        { label: "App A CPU", value: "71%" },
        { label: "App B CPU", value: "73%" },
        { label: "Errors", value: "0%", tone: "good" },
      ],
      scene: patch(spread, {
        nodes: { lb: { sub: "least connections" }, c: { state: "down" } },
        links: [
          link("users", "lb", "request", { kind: "response", back: true }),
          link("lb", "a", { kind: "request", rate: 3 }, { kind: "response", back: true }),
          link("lb", "b", { kind: "request", rate: 3 }, { kind: "response", back: true }),
          link("lb", "c", { dashed: true }),
        ],
      }),
    },
    {
      kind: "problem",
      short: "Its own SPOF",
      title: "Who balances the balancer?",
      body: [
        "We fixed one single point of failure and created another. Every request now passes through one load balancer. When it dies, every server behind it is unreachable, even though all of them are healthy.",
      ],
      callout: {
        kind: "watch",
        text: "Anything every request depends on must itself be redundant.",
      },
      changes: [
        { op: "-", text: "Load balancer down" },
        { op: "~", text: "Errors 0% → 100%" },
      ],
      metrics: [
        { label: "Healthy servers", value: "3 of 3" },
        { label: "Errors", value: "100%", tone: "bad" },
      ],
      scene: patch(spread, {
        nodes: { lb: { state: "down" }, c: { state: "ok" } },
        links: [
          link("users", "lb", "fail", { cut: true }),
          link("lb", "a", { dashed: true }),
          link("lb", "b", { dashed: true }),
          link("lb", "c", { dashed: true }),
        ],
      }),
    },
    {
      kind: "solution",
      short: "Standby",
      title: "An active–standby pair",
      body: [
        "Run two balancers. The **active** one serves traffic; the **standby** watches it through heartbeats every second. Both share a floating (virtual) IP address, the one learners actually use.",
        "If the heartbeats stop, the standby claims the floating IP and starts forwarding traffic within seconds. Learners keep using the same address; at worst a few in-flight requests are retried.",
      ],
      callout: {
        kind: "good",
        text: "Cloud load balancers do this for you: they run on many machines across several zones.",
      },
      changes: [
        { op: "+", text: "Standby balancer" },
        { op: "+", text: "Heartbeats between the pair" },
        { op: "~", text: "Standby took over the floating IP" },
      ],
      metrics: [
        { label: "Failover time", value: "≈ 3 s", tone: "good" },
        { label: "Errors", value: "0.1% (retried)", tone: "good" },
      ],
      scene: {
        nodes: [
          users,
          { ...lb, state: "down", sub: "was active" },
          node("lb2", "lb", "Standby → active", 0, 2, {
            sub: "owns the floating IP",
            state: "lit",
          }),
          a,
          b,
          c,
        ],
        links: [
          link("users", "lb2", "request", { kind: "response", back: true }),
          link("lb", "lb2", { dashed: true, label: "heartbeat" }),
          link("lb2", "a", "request", { kind: "response", back: true }),
          link("lb2", "b", "request", { kind: "response", back: true }),
          link("lb2", "c", "request", { kind: "response", back: true }),
        ],
      },
    },
    {
      kind: "technique",
      short: "Layer 7",
      title: "Route by what is inside the request",
      body: [
        "A **layer-4** balancer only sees IP addresses and ports and forwards whole connections. A **layer-7** balancer reads the HTTP request itself.",
        "That lets AlgoVerse send `/api/*` to the API servers and `/run/*` (code submissions) to a separate pool of sandbox servers, each scaled on its own.",
      ],
      table: {
        head: ["", "Layer 4", "Layer 7"],
        rows: [
          ["Sees", "IP and port", "URL, headers, cookies"],
          ["Can route by path", "no", "yes"],
          ["Ends TLS", "usually not", "yes"],
          ["Overhead", "lowest", "a little more"],
        ],
      },
      changes: [
        { op: "~", text: "/api/* → App A, App B" },
        { op: "~", text: "/run/* → sandbox pool" },
      ],
      metrics: [
        { label: "API p95", value: "90 ms", tone: "good" },
        { label: "Sandbox p95", value: "2.1 s" },
      ],
      scene: patch(spread, {
        nodes: {
          lb: { sub: "layer 7: by path" },
          c: { label: "Sandbox", sub: "/run/*", kind: "worker" },
          a: { sub: "/api/*" },
          b: { sub: "/api/*" },
        },
        links: [
          link("users", "lb", "request", "heavy", { kind: "response", back: true }),
          link("lb", "a", "request", { kind: "response", back: true }),
          link("lb", "b", "request", { kind: "response", back: true }),
          link("lb", "c", { kind: "heavy", rate: 2 }, { kind: "response", back: true, rate: 1 }),
        ],
      }),
    },
    {
      kind: "case",
      short: "Deploys",
      title: "Case: shipping a new version with no downtime",
      body: [
        "A **rolling deploy** updates one server at a time. First the balancer **drains** it: no new requests, but the ones in flight may finish. Then it is updated, passes its health check, and rejoins the pool.",
        "Here App C already runs v2, App B is draining, and App A waits its turn. Learners never see an error.",
      ],
      callout: {
        kind: "good",
        text: "A blue-green deploy goes further: start a whole v2 pool, then switch the balancer over at once, and back if anything looks wrong.",
      },
      changes: [
        { op: "~", text: "App C: v2" },
        { op: "~", text: "App B: draining" },
        { op: "~", text: "App A: still v1" },
      ],
      metrics: [
        { label: "On v2", value: "1 of 3" },
        { label: "Errors", value: "0%", tone: "good" },
      ],
      scene: patch(spread, {
        nodes: {
          a: { badge: "v1" },
          b: { badge: "v1", sub: "draining", state: "dim" },
          c: { badge: "v2", state: "lit" },
        },
        links: [
          link("users", "lb", "request", { kind: "response", back: true }),
          link("lb", "a", { kind: "request", rate: 3 }, { kind: "response", back: true }),
          link("lb", "b", { kind: "response", back: true, rate: 1 }),
          link("lb", "c", { kind: "request", rate: 3 }, { kind: "response", back: true }),
        ],
      }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A load balancer gives a pool of servers one stable address.",
        "Round robin is simple; least connections adapts to requests of different cost.",
        "Health checks take dead servers out of the pool automatically.",
        "The balancer must be redundant too: an active–standby pair with a floating IP.",
        "Layer-7 balancers route by path, and draining makes deploys invisible.",
      ],
      callout: {
        kind: "key",
        text: "Below the lesson is a lab: send requests, switch policies and kill servers yourself.",
      },
      scene: spread,
    },
  ],
};
