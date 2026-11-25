import { link, node, patch, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ------------------------------ Scale up or scale out ------------------------------ */

const fans = node("fans", "user", "Learners", -3, 0, { sub: "200 online" });
const solo = node("solo", "server", "AlgoVerse", 1.5, 0, { sub: "4 vCPU" });
const lbx = node("lbx", "lb", "Load balancer", -0.5, 0);
const pool4: SceneNode[] = [-2.2, -0.75, 0.75, 2.2].map((y, i) =>
  node(`p${i}`, "server", `App ${String.fromCharCode(65 + i)}`, 2.5, y, { sub: "8 vCPU" }),
);
const out = (rate = 2, nodes: SceneNode[] = pool4): Scene => ({
  nodes: [fans, lbx, ...nodes],
  links: [
    both("fans", "lbx", rate),
    ...nodes.filter((n) => n.state !== "down").map((n) => both("lbx", n.id, 1)),
  ],
});

export const SCALE_UP_OUT: Lesson = {
  id: "scale-up-out",
  title: "Scale up or scale out",
  tagline: "Your one server is melting. Buy a bigger one, or more of them?",
  minutes: 11,
  level: "beginner",
  learn: [
    "Spot the signs of an overloaded server",
    "Scale up, and know where it stops",
    "Scale out with many mid-size servers",
    "Autoscale with the daily rhythm, and pre-scale for events",
    "Why scaling out needs a load balancer and stateless servers",
  ],
  steps: [
    {
      kind: "setup",
      short: "One server",
      title: "It starts with one server",
      body: [
        "AlgoVerse runs on a single virtual machine with 4 vCPUs. Every page view and every quiz answer travels from a learner's device to that one server and back.",
        "With 200 learners online it barely notices: the CPU idles at about 2%.",
      ],
      callout: {
        kind: "key",
        text: "A server has a fixed budget of CPU, memory, disk and network. Its capacity is how many requests a second it can serve before one of them runs out.",
      },
      metrics: [
        { label: "Learners", value: "200" },
        { label: "CPU", value: "2%", tone: "good" },
        { label: "Cost", value: "$140 / mo" },
      ],
      scene: { nodes: [fans, solo], links: [both("fans", "solo", 1)] },
    },
    {
      kind: "problem",
      short: "Went viral",
      title: "Then a famous coder recommends AlgoVerse",
      body: [
        "A popular programming channel shows AlgoVerse to two million subscribers. Within an hour 25,000 learners are online. The server can do about 350 requests a second, and 600 are arriving.",
        "CPU pins at 100%, requests queue, pages crawl, and some give up with timeouts.",
      ],
      callout: {
        kind: "watch",
        text: "Overload looks like this: CPU near 100%, growing queues, rising latency, then timeouts.",
      },
      changes: [
        { op: "~", text: "Learners 200 → 25,000" },
        { op: "~", text: "CPU 2% → 100%" },
        { op: "+", text: "Requests timing out" },
      ],
      metrics: [
        { label: "Learners", value: "25,000" },
        { label: "CPU", value: "100%", tone: "bad" },
        { label: "Errors", value: "14%", tone: "bad" },
      ],
      scene: {
        nodes: [
          { ...fans, sub: "25,000 online" },
          { ...solo, state: "hot", queue: 9, badge: "100%" },
        ],
        links: [
          link(
            "fans",
            "solo",
            { kind: "request", rate: 4 },
            { kind: "fail", rate: 2 },
            { kind: "response", back: true, rate: 1 },
          ),
        ],
      },
    },
    {
      kind: "solution",
      short: "Scale up",
      title: "Way 1: scale up",
      body: [
        "The quickest fix: move to a bigger machine with more cores, more memory and faster disks. Nothing about the design changes; the code doesn't even know.",
        "This is **vertical scaling**, or scaling up. Four times the machine, roughly four times the price.",
      ],
      callout: {
        kind: "good",
        text: "Scaling up is a great first move: zero code changes and nothing new to run.",
      },
      changes: [
        { op: "~", text: "4 vCPU → 16 vCPU" },
        { op: "~", text: "CPU 100% → 40%" },
      ],
      metrics: [
        { label: "CPU", value: "40%", tone: "good" },
        { label: "Errors", value: "0%", tone: "good" },
        { label: "Cost", value: "$560 / mo" },
      ],
      scene: {
        nodes: [
          { ...fans, sub: "25,000 online" },
          { ...solo, sub: "16 vCPU", size: 1.3 },
        ],
        links: [both("fans", "solo", 3)],
      },
    },
    {
      kind: "tradeoff",
      short: "Ceiling",
      title: "…until you hit the ceiling",
      body: [
        "Growth continues and you upgrade again and again. But machines only get so big, and software rarely uses 200 cores as well as it used 16: locks, memory and one shared disk get in the way.",
        "Every upgrade is also a migration with a restart. And at the very top of the range, the biggest machines cost a premium.",
      ],
      callout: {
        kind: "watch",
        text: "Vertical scaling has a hard ceiling, and each step up means downtime.",
      },
      changes: [
        { op: "~", text: "Learners 25,000 → 400,000" },
        { op: "+", text: "Largest machine reached" },
      ],
      metrics: [
        { label: "CPU", value: "92%", tone: "bad" },
        { label: "Machine", value: "192 vCPU (max)" },
        { label: "Cost", value: "$9,800 / mo", tone: "bad" },
      ],
      scene: {
        nodes: [
          { ...fans, sub: "400,000 online" },
          { ...solo, sub: "192 vCPU, the biggest", size: 1.6, state: "hot" },
        ],
        links: [both("fans", "solo", 4)],
      },
    },
    {
      kind: "problem",
      short: "One box",
      title: "…and everything depends on one box",
      body: [
        "Worse, a bad deploy, a full disk or a failed power supply takes the whole product offline. However big it is, it is one machine.",
        "Something whose failure alone stops the entire system is a **single point of failure**.",
      ],
      changes: [
        { op: "-", text: "The server is down" },
        { op: "~", text: "Errors → 100%" },
      ],
      metrics: [{ label: "Errors", value: "100%", tone: "bad" }],
      scene: {
        nodes: [
          { ...fans, sub: "400,000 online" },
          { ...solo, sub: "192 vCPU", size: 1.6, state: "down" },
        ],
        links: [link("fans", "solo", "fail", { cut: true })],
      },
    },
    {
      kind: "solution",
      short: "Scale out",
      title: "Way 2: scale out",
      body: [
        "Instead of one giant, run several mid-size servers side by side, all running the same code, behind a load balancer.",
        "Need more capacity? Add a server. There is no ceiling, mid-size machines are the best value, and each server is only a slice of the whole. This is **horizontal scaling**, how almost every large system grows.",
      ],
      quiz: {
        question: "Four servers are each 45% busy. One fails. About how busy are the other three?",
        options: ["45%", "60%", "90%"],
        answer: 1,
        why: "The same work spread over three: 4 × 45% ÷ 3 = 60%. That spare room is why you never run a pool near 100%.",
      },
      changes: [
        { op: "~", text: "1 giant → 4 mid-size servers" },
        { op: "+", text: "Load balancer" },
      ],
      metrics: [
        { label: "CPU each", value: "45%", tone: "good" },
        { label: "Survives", value: "1 server down", tone: "good" },
      ],
      scene: out(3),
    },
    {
      kind: "problem",
      short: "Idle nights",
      title: "Peak capacity, idle all night",
      body: [
        "Learning follows the clock. At 9 p.m. AlgoVerse needs all four servers; at 4 a.m. traffic is an eighth of that and they idle at 6% CPU.",
        "You are paying for peak capacity 24 hours a day.",
      ],
      metrics: [
        { label: "4 a.m. CPU", value: "6%" },
        { label: "Cost", value: "$3,200 / mo" },
      ],
      scene: out(
        1,
        pool4.map((p) => ({ ...p, state: "dim" as const })),
      ),
    },
    {
      kind: "solution",
      short: "Autoscale",
      title: "Autoscaling follows the demand",
      body: [
        "Because the servers are interchangeable, an **autoscaler** can add and remove them for you, for example to keep average CPU near 50%.",
        "At night it scales in to two servers, never fewer, so one can still fail. In the evening it scales back out.",
      ],
      callout: {
        kind: "good",
        text: "Autoscaling only works when servers keep no state of their own and sit behind a load balancer. Those are the next two lessons.",
      },
      changes: [
        { op: "-", text: "2 servers removed overnight" },
        { op: "~", text: "Cost $3,200 → $2,300 / mo" },
      ],
      metrics: [
        { label: "Servers", value: "2 (min)" },
        { label: "CPU", value: "24%" },
        { label: "Cost", value: "$2,300 / mo", tone: "good" },
      ],
      scene: out(1, pool4.slice(1, 3)),
    },
    {
      kind: "case",
      short: "Launch day",
      title: "Case: the live coding contest",
      body: [
        "A contest starts at 18:00 and traffic jumps sixfold in 90 seconds. The autoscaler reacts, but a new server needs about three minutes to boot and warm up.",
        "For those minutes the running servers serve only part of the traffic. The fix is to scale **before** the spike: scheduled scaling for known events, spare headroom for unknown ones.",
      ],
      callout: {
        kind: "watch",
        text: "Autoscaling reacts; it cannot predict. Pre-warm for launches and events.",
      },
      metrics: [
        { label: "Traffic", value: "× 6 in 90 s", tone: "bad" },
        { label: "Boot time", value: "≈ 3 min" },
        { label: "Errors", value: "9% while booting", tone: "bad" },
      ],
      scene: {
        nodes: [
          { ...fans, sub: "contest starts!" },
          lbx,
          { ...(pool4[1] as SceneNode), state: "hot" },
          { ...(pool4[2] as SceneNode), state: "hot" },
          { ...(pool4[0] as SceneNode), state: "dim", sub: "booting…" },
          { ...(pool4[3] as SceneNode), state: "dim", sub: "booting…" },
        ],
        links: [
          link("fans", "lbx", { kind: "request", rate: 4 }, { kind: "fail", rate: 1 }),
          both("lbx", "p1", 2),
          both("lbx", "p2", 2),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap: up versus out",
      body: ["Scale up while it is cheap and simple, then scale out."],
      table: {
        head: ["", "Scale up", "Scale out"],
        rows: [
          ["How", "a bigger machine", "more machines"],
          ["Code changes", "none", "servers must be stateless"],
          ["Ceiling", "the biggest machine", "practically none"],
          ["A failure", "total outage", "a slice of capacity"],
          ["To grow", "migrate and restart", "add a server"],
        ],
      },
      scene: out(2),
    },
  ],
};

/* ---------------------------------- Stateless servers ---------------------------------- */

const priya = node("priya", "browser", "Priya", -3, 0, { sub: "cookie: sid=81f2" });
const gate = node("gate", "lb", "Load balancer", -0.5, 0, { sub: "round robin" });
const sa = node("sa", "server", "App A", 2, -1.6);
const sb = node("sb", "server", "App B", 2, 0);
const sc = node("sc", "server", "App C", 2, 1.6);
const sessions = node("sessions", "cache", "Session store", 4.6, 0, { sub: "Redis" });
const trio = [sa, sb, sc];
const base: Scene = {
  nodes: [priya, gate, ...trio],
  links: [both("priya", "gate", 1), ...trio.map((s) => both("gate", s.id, 1))],
};

export const STATELESS: Lesson = {
  id: "stateless",
  title: "Stateless services",
  tagline: "Why the next request must work on any server, and where the state goes instead.",
  minutes: 10,
  level: "beginner",
  learn: [
    "What state is, and why it pins a learner to one server",
    "Sticky sessions, and how they break",
    "A shared session store makes servers interchangeable",
    "Carrying identity in a signed token",
    "Files belong in object storage, not on a server's disk",
  ],
  steps: [
    {
      kind: "setup",
      short: "Logged in",
      title: "Priya signs in",
      body: [
        "Priya signs in and starts a quiz. Her request happened to land on App A, which keeps a **session** in its memory: who she is and her answers so far.",
        "Her browser holds a cookie with the session id, so later requests can find that session again.",
      ],
      callout: {
        kind: "key",
        text: "State is anything a server remembers between requests: logins, quiz progress, half-finished uploads.",
      },
      scene: patch(base, {
        nodes: { sa: { badge: "session 81f2", state: "lit" } },
        links: [both("priya", "gate", 1), both("gate", "sa", 1)],
      }),
    },
    {
      kind: "problem",
      short: "Elsewhere",
      title: "Her next request lands on another server",
      body: [
        "The load balancer is doing its job: round robin sends Priya's next request to App B and the one after that to App C. Neither has ever heard of her.",
        "To Priya, AlgoVerse looks broken: one page shows her quiz, the next asks her to sign in again.",
      ],
      callout: {
        kind: "watch",
        text: "If a server keeps state in memory, every other server is useless to that user.",
      },
      metrics: [{ label: "Signed out", value: "2 of 3 pages", tone: "bad" }],
      scene: patch(base, {
        nodes: { sa: { badge: "session 81f2" }, sb: { badge: "who?" }, sc: { badge: "who?" } },
        links: [both("priya", "gate", 1), both("gate", "sb", 1), both("gate", "sc", 1)],
      }),
    },
    {
      kind: "solution",
      short: "Sticky",
      title: "Fix 1: sticky sessions",
      body: [
        "Tell the load balancer to remember where each learner started, usually with a cookie, and keep sending them there. Priya always reaches App A and stays signed in.",
        "Quick to switch on, and no code changes.",
      ],
      callout: {
        kind: "watch",
        text: "Sticky learners can't be moved. If many pile onto one server, it stays overloaded while others idle.",
      },
      scene: patch(base, {
        nodes: { gate: { sub: "sticky: Priya → A" }, sa: { badge: "session 81f2" } },
        links: [
          both("priya", "gate", 2),
          both("gate", "sa", 2),
          link("gate", "sb", { dashed: true }),
          link("gate", "sc", { dashed: true }),
        ],
      }),
    },
    {
      kind: "problem",
      short: "A dies",
      title: "…until App A dies",
      body: [
        "App A crashes. The balancer correctly moves Priya to App B, but her session died with A's memory.",
        "She is signed out and her quiz answers are gone. Every learner pinned to A just had the same experience.",
      ],
      callout: {
        kind: "watch",
        text: "Sticky sessions turn every server into a small single point of failure.",
      },
      changes: [
        { op: "-", text: "App A down" },
        { op: "-", text: "Priya's session lost" },
      ],
      metrics: [{ label: "Quiz answers", value: "lost", tone: "bad" }],
      scene: patch(base, {
        nodes: { sa: { state: "down" }, sb: { badge: "who?" } },
        links: [both("priya", "gate", 1), both("gate", "sb", 1), link("gate", "sa", { cut: true })],
      }),
    },
    {
      kind: "solution",
      short: "Shared store",
      title: "Fix 2: move the state out",
      body: [
        "Keep sessions in a shared, fast **session store** such as Redis. Every server reads Priya's session from it, so any server can handle any request.",
        "The servers are now **stateless**: they remember nothing between requests. Round robin is back, and Priya stays signed in.",
      ],
      callout: {
        kind: "good",
        text: "The cost is one extra hop of about a millisecond per request: cheap, for servers you can add, remove or lose freely.",
      },
      changes: [
        { op: "+", text: "Session store" },
        { op: "~", text: "Servers keep nothing in memory" },
      ],
      scene: {
        nodes: [priya, gate, ...trio, sessions],
        links: [
          both("priya", "gate", 1),
          ...trio.map((s) => both("gate", s.id, 1)),
          ...trio.map((s) => both(s.id, "sessions", 1)),
        ],
      },
    },
    {
      kind: "insight",
      short: "Cattle",
      title: "Now losing a server is a non-event",
      body: [
        "App A dies again. The balancer routes around it, B and C read the same session from the store, and Priya doesn't notice anything.",
        "This is what makes autoscaling possible: servers can be created and destroyed at any moment.",
      ],
      quiz: {
        question:
          "With a shared session store, what happens to Priya's quiz when App C is replaced by a fresh server?",
        options: [
          "It is lost",
          "It survives: the new server reads it from the store",
          "She must stay on App C",
        ],
        answer: 1,
        why: "No server owns her session any more; any of them, including a brand-new one, can read it.",
      },
      scene: {
        nodes: [priya, gate, { ...sa, state: "down" }, sb, sc, sessions],
        links: [
          both("priya", "gate", 2),
          both("gate", "sb", 1),
          both("gate", "sc", 1),
          both("sb", "sessions", 1),
          both("sc", "sessions", 1),
        ],
      },
    },
    {
      kind: "technique",
      short: "Tokens",
      title: "Or let the request carry it",
      body: [
        'Another option is to put the state in the request itself: a **signed token** (such as a JWT) that says "this is Priya, valid until 18:00". Any server can check the signature without looking anything up.',
        "No store and no extra hop. But a token can't easily be cancelled before it expires, and it travels with every request, so keep it small.",
      ],
      callout: {
        kind: "good",
        text: "A common split: tokens for identity, a shared store for anything big or that must change instantly.",
      },
      code: [
        "token = sign({'user': 'priya', 'exp': '18:00'}, SECRET)",
        "# any server:",
        "claims = verify(token, SECRET)  # no lookup needed",
      ],
      scene: {
        nodes: [{ ...priya, sub: "token: eyJ…" }, gate, ...trio],
        links: [both("priya", "gate", 2), ...trio.map((s) => both("gate", s.id, 1))],
      },
    },
    {
      kind: "case",
      short: "Local disk",
      title: "Case: files on a local disk",
      body: [
        "Priya uploads a picture for her profile. App A saves `avatar.png` to its own disk and shows it.",
        "Her next page comes from App B, which has no such file: a broken image. Files are state too.",
      ],
      callout: {
        kind: "watch",
        text: "Anything written to a server's own disk disappears for every other server, and for good when the server is replaced.",
      },
      scene: patch(base, {
        nodes: { sa: { badge: "avatar.png" }, sb: { badge: "404" } },
        links: [both("priya", "gate", 1), link("gate", "sa", "write"), both("gate", "sb", 1)],
      }),
    },
    {
      kind: "solution",
      short: "Object store",
      title: "Put files in object storage",
      body: [
        "Store files in shared **object storage** (Amazon S3, Google Cloud Storage, Azure Blob): practically unlimited, durable, and reachable from every server.",
        "App A writes the avatar there; B and C read the same file. Better still, browsers fetch images straight from storage through a CDN.",
      ],
      callout: {
        kind: "key",
        text: "Servers keep nothing that must outlive the request: sessions → a store or a token; files → object storage; data → the database.",
      },
      scene: {
        nodes: [
          priya,
          gate,
          ...trio,
          node("bucket", "storage", "Object storage", 4.6, 0, { sub: "avatars/" }),
        ],
        links: [
          both("priya", "gate", 1),
          ...trio.map((s) => both("gate", s.id, 1)),
          link("sa", "bucket", "write"),
          both("sb", "bucket", 1),
          both("sc", "bucket", 1),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "State in a server's memory pins learners to that server.",
        "Sticky sessions hide the problem until a server dies.",
        "Move state to a shared store, or carry it in a signed token.",
        "Files go to object storage, never to a server's own disk.",
        "Stateless servers can be added, removed and lost freely.",
      ],
      scene: {
        nodes: [priya, gate, ...trio, sessions],
        links: [
          both("priya", "gate", 1),
          ...trio.map((s) => both("gate", s.id, 1)),
          ...trio.map((s) => both(s.id, "sessions", 1)),
        ],
      },
    },
  ],
};

/* -------------------------------------- Caching -------------------------------------- */

const readers = node("readers", "user", "Learners", -3, 0, { sub: "8,000 reads/s" });
const app = node("app", "server", "App servers", 0, 0);
const lessonsDb = node("ldb", "db", "Lessons DB", 3.2, 1.2);
const redis = node("redis", "cache", "Cache", 3.2, -1.2, { sub: "in memory" });
const cached = (dbRate: number, extra: Partial<Record<string, Partial<SceneNode>>> = {}): Scene =>
  patch(
    {
      nodes: [readers, app, lessonsDb, redis],
      links: [both("readers", "app", 3), both("app", "redis", 3), both("app", "ldb", dbRate)],
    },
    { nodes: extra as Record<string, Partial<SceneNode>> },
  );

export const CACHING: Lesson = {
  id: "caching",
  title: "Caching",
  tagline: "Keep the answers people ask for most somewhere much faster than the database.",
  minutes: 13,
  level: "beginner",
  learn: [
    "Why a few items get most of the reads",
    "Cache-aside: check, miss, fetch, fill",
    "Hit rate, and why small changes in it matter a lot",
    "Keeping the cache fresh: invalidation and TTLs",
    "Stampedes, missing keys and LRU eviction",
  ],
  builtOn: [
    { label: "LRU cache", path: "/structures/lru-cache" },
    { label: "Bloom filter", path: "/structures/bloom-filter" },
    { label: "Hash table", path: "/structures/hash-table" },
  ],
  steps: [
    {
      kind: "problem",
      short: "Busy DB",
      title: "Every page hits the database",
      body: [
        "Every lesson page asks the database for the same things: the lesson text, its quiz and its examples. With 8,000 reads a second the database is 90% busy, and pages slow down.",
      ],
      metrics: [
        { label: "DB load", value: "8,000 reads/s" },
        { label: "DB busy", value: "90%", tone: "bad" },
        { label: "p95", value: "420 ms", tone: "bad" },
      ],
      scene: {
        nodes: [readers, app, { ...lessonsDb, state: "hot", queue: 6 }],
        links: [both("readers", "app", 3), both("app", "ldb", 4)],
      },
    },
    {
      kind: "insight",
      short: "Popular few",
      title: "The same few things, over and over",
      body: [
        "Look at what is actually read. The 50 most popular lessons (binary search, two pointers, BFS…) get about 80% of all reads. The database answers the same questions thousands of times a minute.",
        "Answers that are read often and change rarely are perfect to keep closer.",
      ],
      callout: {
        kind: "key",
        text: "Real traffic is lopsided: a small set of items gets most of the requests.",
      },
      metrics: [
        { label: "Top 50 lessons", value: "80% of reads" },
        { label: "Other 950", value: "20% of reads" },
      ],
      scene: {
        nodes: [readers, app, { ...lessonsDb, state: "hot", queue: 6 }],
        links: [both("readers", "app", 3), both("app", "ldb", 4)],
        notes: [{ x: 1.6, y: -1.4, text: "same 50 lessons again", tone: "bad" }],
      },
    },
    {
      kind: "solution",
      short: "Cache-aside",
      title: "Put a cache in front",
      body: [
        "Add an in-memory **cache** such as Redis or Memcached. The server checks it first: a **hit** returns in about a millisecond. On a **miss**, the server reads the database, then stores the answer in the cache for next time.",
        "This pattern is called **cache-aside**.",
      ],
      code: [
        "def get_lesson(id):",
        "    lesson = cache.get(id)",
        "    if lesson is None:            # miss",
        "        lesson = db.load(id)",
        "        cache.set(id, lesson, ttl=600)",
        "    return lesson",
      ],
      changes: [
        { op: "+", text: "Cache" },
        { op: "~", text: "DB load 8,000 → 800 reads/s" },
      ],
      metrics: [
        { label: "Hit rate", value: "90%", tone: "good" },
        { label: "DB load", value: "800 reads/s", tone: "good" },
        { label: "p95", value: "35 ms", tone: "good" },
      ],
      scene: cached(1),
    },
    {
      kind: "technique",
      short: "Hit rate",
      title: "Hit rate is everything",
      body: [
        "The share of reads answered by the cache is the **hit rate**. Misses are much slower and they are what reach the database, so small changes in hit rate matter a lot.",
        "Going from 90% to 99% hits doesn't sound like much, but it cuts database reads tenfold.",
      ],
      quiz: {
        question: "8,000 reads a second at a 95% hit rate. How many reach the database?",
        options: ["400", "800", "7,600"],
        answer: 0,
        why: "5% miss: 0.05 × 8,000 = 400. At 99% it would be 80.",
      },
      metrics: [
        { label: "90% hits", value: "800 to DB" },
        { label: "95% hits", value: "400 to DB" },
        { label: "99% hits", value: "80 to DB", tone: "good" },
      ],
      scene: cached(1),
    },
    {
      kind: "problem",
      short: "Stale",
      title: "The lesson changed; the cache didn't",
      body: [
        "An author fixes a mistake in the binary-search lesson. The database has the corrected text, but the cache still holds the old copy, and that is what learners see.",
        "A cache is a second copy of the data, and second copies drift.",
      ],
      callout: {
        kind: "watch",
        text: "Every cache must answer one question: how stale may this be?",
      },
      scene: cached(1, { redis: { badge: "old text", state: "hot" }, ldb: { badge: "fixed" } }),
    },
    {
      kind: "solution",
      short: "Invalidate",
      title: "Delete on write, and expire anyway",
      body: [
        "When a lesson changes, the server writes the database and **deletes** the cached copy. The next read misses and fetches the fresh version.",
        "As a safety net every entry also gets a **TTL** (time to live), say 10 minutes, so even a missed delete heals itself.",
      ],
      changes: [
        { op: "+", text: "On write: delete the cached copy" },
        { op: "+", text: "TTL 10 minutes on every entry" },
      ],
      scene: {
        nodes: [readers, app, lessonsDb, { ...redis, badge: "deleted" }],
        links: [
          both("readers", "app", 2),
          link("app", "ldb", "write"),
          link("app", "redis", { kind: "fail", rate: 1 }),
        ],
      },
    },
    {
      kind: "tradeoff",
      short: "Eviction",
      title: "Memory runs out: evict the least recently used",
      body: [
        "The cache can't hold everything; memory is expensive. When it is full, something must go. The usual rule is **LRU**: evict the entry that was used longest ago.",
        "AlgoVerse's own LRU cache player shows exactly how: a hash map finds any key in O(1), and a doubly linked list keeps keys in order of use.",
      ],
      callout: {
        kind: "good",
        text: 'Open "LRU cache" under Built on to step through evictions yourself.',
      },
      scene: cached(1, { redis: { badge: "full: evict LRU", queue: 8 } }),
    },
    {
      kind: "case",
      short: "Stampede",
      title: "Case: the cache stampede",
      body: [
        "The home page is the hottest key: 3,000 reads a second. Its TTL expires, and in the same instant all 3,000 requests miss and run the same heavy query on the database.",
        "Fix it with **request coalescing**: the first miss takes a short lock and refreshes the key; everyone else waits a few milliseconds for that one result. Refreshing hot keys a little before they expire, at random moments, avoids the cliff altogether.",
      ],
      callout: {
        kind: "watch",
        text: "A popular key expiring is a thundering herd waiting to happen.",
      },
      metrics: [
        { label: "DB queries", value: "3,000 at once", tone: "bad" },
        { label: "With a lock", value: "1", tone: "good" },
      ],
      scene: {
        nodes: [
          readers,
          app,
          { ...lessonsDb, state: "hot", queue: 9 },
          { ...redis, badge: "home: expired" },
        ],
        links: [
          both("readers", "app", 4),
          link("app", "redis", { kind: "fail", rate: 3 }),
          link("app", "ldb", { kind: "request", rate: 4 }),
        ],
      },
    },
    {
      kind: "case",
      short: "Missing keys",
      title: "Case: asking for things that don't exist",
      body: [
        "A scraper requests `/lesson/9100001`, `/lesson/9100002`… None exist, so every one misses the cache and hits the database, and nothing is cached because there is nothing to cache.",
        'Cache the **"not found"** too, with a short TTL. And a **Bloom filter** of all real lesson ids answers "definitely not here" from a few kilobytes of memory, before the database is even asked.',
      ],
      quiz: {
        question: 'A Bloom filter says "maybe" for lesson 9100003. What does that mean?',
        options: [
          "The lesson definitely exists",
          "It might exist; check the cache and database",
          "The lesson definitely does not exist",
        ],
        answer: 1,
        why: 'Bloom filters never give false "no"s, but they can give false "maybe"s. Only a "no" lets you skip the lookup.',
      },
      scene: {
        nodes: [
          { ...readers, label: "Scraper", kind: "browser" },
          app,
          lessonsDb,
          redis,
          node("bloom", "lock", "Bloom filter", 1.6, -2.4, { sub: "real lesson ids" }),
        ],
        links: [
          both("readers", "app", 3),
          link("app", "bloom", { kind: "request", rate: 3 }, { kind: "fail", back: true, rate: 2 }),
        ],
      },
    },
    {
      kind: "insight",
      short: "Layers",
      title: "Caches everywhere",
      body: [
        "The cache we built is one layer of many. A request may be answered by the browser's cache, a CDN edge, a small in-process cache on the server, a shared cache like Redis, or the database's own memory.",
        "Each layer is faster and smaller than the one behind it.",
      ],
      table: {
        head: ["Layer", "Typical time"],
        rows: [
          ["Browser cache", "0 ms (no request)"],
          ["CDN edge", "10–30 ms"],
          ["In-process memory", "< 0.1 ms"],
          ["Shared cache (Redis)", "≈ 1 ms"],
          ["Database", "5–50 ms"],
        ],
      },
      scene: cached(1),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Cache what is read often and changes rarely.",
        "Cache-aside: check the cache, fall back to the database, fill the cache.",
        "Hit rate drives both speed and database load.",
        "Delete on write and set TTLs; evict with LRU.",
        "Guard against stampedes and missing keys.",
      ],
      scene: cached(1),
    },
  ],
};

/* ----------------------------------- Content delivery ----------------------------------- */

const chennai = node("chennai", "phone", "Chennai", -3, -1.8);
const saopaulo = node("saopaulo", "phone", "São Paulo", -3, 1.8);
const origin = node("origin", "server", "Origin", 3.4, 0, { sub: "Frankfurt" });
const edgeIn = node("edgeIn", "cdn", "Edge: Chennai", -0.6, -1.8);
const edgeBr = node("edgeBr", "cdn", "Edge: São Paulo", -0.6, 1.8);
const far: Scene = {
  nodes: [chennai, saopaulo, origin],
  links: [
    link(
      "chennai",
      "origin",
      { kind: "request", rate: 2, speed: 3 },
      { kind: "response", back: true, rate: 2, speed: 3 },
    ),
    link(
      "saopaulo",
      "origin",
      { kind: "request", rate: 2, speed: 3 },
      { kind: "response", back: true, rate: 2, speed: 3 },
    ),
  ],
};
const edges = (originRate = 1): Scene => ({
  nodes: [chennai, saopaulo, edgeIn, edgeBr, origin],
  links: [
    both("chennai", "edgeIn", 3),
    both("saopaulo", "edgeBr", 3),
    link(
      "edgeIn",
      "origin",
      { kind: "request", rate: originRate },
      { kind: "response", back: true, rate: originRate },
    ),
    link(
      "edgeBr",
      "origin",
      { kind: "request", rate: originRate },
      { kind: "response", back: true, rate: originRate },
    ),
  ],
});

export const CDN: Lesson = {
  id: "cdn",
  title: "Content delivery networks",
  tagline:
    "Copy what everyone downloads to servers near your learners, and stop fighting the speed of light.",
  minutes: 10,
  level: "beginner",
  learn: [
    "Why distance hurts every page load",
    "Edge servers as pull-through caches",
    "Versioned file names: cache forever, update instantly",
    "How a CDN absorbs traffic spikes",
    "Never cache someone's private page",
  ],
  steps: [
    {
      kind: "problem",
      short: "Far away",
      title: "Learners are far from the servers",
      body: [
        "AlgoVerse's servers are in Frankfurt. A learner in Chennai waits about 140 ms per round trip; in São Paulo, about 200 ms. A lesson page needs many round trips, so they wait well over a second.",
      ],
      metrics: [
        { label: "Chennai load", value: "1.4 s", tone: "bad" },
        { label: "São Paulo load", value: "1.9 s", tone: "bad" },
      ],
      scene: far,
    },
    {
      kind: "insight",
      short: "Same bytes",
      title: "Most bytes are the same for everyone",
      body: [
        "Look inside a page load. The HTML greeting Priya by name is personal, but the lesson videos, scripts, stylesheets, fonts and diagrams are identical for every learner.",
        "Identical, rarely-changing files are perfect for copying close to people.",
      ],
      metrics: [
        { label: "Static bytes", value: "≈ 93%" },
        { label: "Personal bytes", value: "≈ 7%" },
      ],
      scene: far,
    },
    {
      kind: "solution",
      short: "Edges",
      title: "Put copies at the edge",
      body: [
        "A **CDN** (content delivery network) runs edge servers in hundreds of cities. Point AlgoVerse's static files at it, and each learner is served by the nearest edge.",
        "Chennai now gets videos and scripts from a few kilometres away instead of 7,000.",
      ],
      changes: [
        { op: "+", text: "CDN edges in Chennai and São Paulo" },
        { op: "~", text: "Chennai load 1.4 s → 0.4 s" },
      ],
      metrics: [
        { label: "Chennai load", value: "0.4 s", tone: "good" },
        { label: "São Paulo load", value: "0.5 s", tone: "good" },
      ],
      scene: edges(1),
    },
    {
      kind: "technique",
      short: "Pull-through",
      title: "First requests are misses",
      body: [
        "Edges are **pull-through** caches: they start empty. The first request for a file misses, the edge fetches it from the origin, keeps a copy and serves everyone after that.",
        "Popular files stay warm; rarely used ones are evicted and fetched again when needed.",
      ],
      quiz: {
        question: "A new lesson video goes live. Who waits for the trip to Frankfurt?",
        options: ["Every learner", "Only the first learner near each edge", "Nobody"],
        answer: 1,
        why: "The first request at each edge pulls the file from the origin; after that, everyone nearby gets the edge's copy.",
      },
      metrics: [
        { label: "Edge hit ratio", value: "96%", tone: "good" },
        { label: "Origin traffic", value: "4% of requests" },
      ],
      scene: edges(1),
    },
    {
      kind: "problem",
      short: "Stale file",
      title: "You ship a fix. Nobody gets it.",
      body: [
        "A bug fix replaces `app.js` on the origin. But edges cached the old file for a day, so learners keep running the buggy version, some in Chennai, some in São Paulo, for hours.",
        "You can ask the CDN to purge, but purges take time to spread and are easy to forget.",
      ],
      scene: patch(edges(1), {
        nodes: {
          edgeIn: { badge: "old app.js", state: "hot" },
          edgeBr: { badge: "old app.js", state: "hot" },
        },
      }),
    },
    {
      kind: "solution",
      short: "Fingerprints",
      title: "Give every version a new name",
      body: [
        "Put a fingerprint of the file's contents in its name: `app.3f9a.js`. A new version gets a new name, so it can never be confused with the old one.",
        "Such files can be cached for a year. Only the small HTML page, which lists the current names, needs a short TTL.",
      ],
      callout: {
        kind: "key",
        text: 'Versioned names turn "when do caches expire?" into "never mind".',
      },
      code: [
        '<script src="/assets/app.3f9a.js">   <!-- cache 1 year -->',
        "Cache-Control: max-age=31536000, immutable",
      ],
      scene: patch(edges(1), {
        nodes: { edgeIn: { badge: "app.7c21.js" }, edgeBr: { badge: "app.7c21.js" } },
      }),
    },
    {
      kind: "insight",
      short: "Spikes",
      title: "Spikes hit the edge, not you",
      body: [
        "A lesson goes viral and traffic jumps twentyfold. Almost all of it is answered by edges around the world; the origin barely notices.",
        "The same spread-out capacity helps absorb floods of junk traffic from attacks.",
      ],
      metrics: [
        { label: "Traffic", value: "× 20" },
        { label: "Origin load", value: "+ 6%", tone: "good" },
      ],
      scene: patch(edges(1), {
        links: [
          both("chennai", "edgeIn", 4),
          both("saopaulo", "edgeBr", 4),
          link("edgeIn", "origin", { kind: "request", rate: 1 }),
          link("edgeBr", "origin", { kind: "request", rate: 1 }),
        ],
      }),
    },
    {
      kind: "case",
      short: "Private page",
      title: "Case: never cache someone's progress page",
      body: [
        'A config change tells the CDN to cache every page for five minutes. Arjun opens "My progress"; the edge stores it. Priya opens hers a second later, and the edge serves her **Arjun\'s** page.',
        "Personal responses must say so: `Cache-Control: private, no-store`. Only shared, identical content belongs on a shared cache.",
      ],
      callout: {
        kind: "watch",
        text: "A CDN mistake can leak private data to strangers in seconds.",
      },
      scene: patch(edges(1), {
        nodes: { edgeIn: { badge: "Arjun's page!", state: "hot" }, chennai: { label: "Priya" } },
      }),
    },
    {
      kind: "technique",
      short: "Shield",
      title: "An origin shield",
      body: [
        "A real CDN has hundreds of edges. When a new file goes viral, every edge misses once, and hundreds of requests for the same file hit the origin together.",
        "An **origin shield** is one more cache layer in between: edges ask the shield, and only the shield asks the origin.",
      ],
      scene: {
        nodes: [
          chennai,
          saopaulo,
          edgeIn,
          edgeBr,
          node("shield", "cdn", "Origin shield", 1.4, 0),
          origin,
        ],
        links: [
          both("chennai", "edgeIn", 3),
          both("saopaulo", "edgeBr", 3),
          both("edgeIn", "shield", 1),
          both("edgeBr", "shield", 1),
          link(
            "shield",
            "origin",
            { kind: "request", rate: 1 },
            { kind: "response", back: true, rate: 1 },
          ),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Distance adds latency; edge servers move content close to learners.",
        "CDNs are pull-through caches filled from your origin.",
        "Versioned file names let you cache for a year and update instantly.",
        "Edges absorb spikes; personal pages must never be shared-cached.",
      ],
      scene: edges(1),
    },
  ],
};
