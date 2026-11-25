import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });
const withExtra = (nodes: SceneNode[], extra: Record<string, Partial<SceneNode>>) =>
  nodes.map((n) => ({ ...n, ...(extra[n.id] ?? {}) }));

/* -------------------------------------------- HLD and LLD -------------------------------------------- */

const contestants = node("contestants", "user", "Contestants", -4.4, 0);
const cgw = node("cgw", "gateway", "API gateway", -2, 0);
const contest = node("contest", "service", "Contest service", 0.6, -1.8);
const submit = node("submit", "service", "Submissions", 0.6, 0.6);
const cq = node("cq", "queue", "Grading queue", 3, 0.6);
const graders = node("graders", "worker", "Graders", 5.2, 0.6, { sub: "sandboxed" });
const board = node("board", "cache", "Leaderboard", 3, -1.8, { sub: "sorted set" });
const hld = (extra: Record<string, Partial<SceneNode>> = {}): Scene => ({
  nodes: withExtra([contestants, cgw, contest, submit, cq, graders, board], extra),
  links: [
    both("contestants", "cgw", 2),
    both("cgw", "contest", 1),
    both("cgw", "submit", 2),
    link("submit", "cq", "event"),
    link("cq", "graders", "event"),
    link("graders", "board", "write"),
    both("contest", "board", 1),
  ],
});

export const HLD_LLD: Lesson = {
  id: "hld-lld",
  title: "High-level and low-level design",
  tagline:
    "The same system at two zoom levels: the map of services, and the inside of one of them.",
  minutes: 8,
  level: "beginner",
  learn: [
    "What a high-level design decides",
    "What a low-level design decides",
    "Where the two meet: contracts",
    "Picking the right level for the question",
  ],
  builtOn: [
    { label: "Binary heap", path: "/structures/binary-heap" },
    { label: "Hash table", path: "/structures/hash-table" },
  ],
  steps: [
    {
      kind: "setup",
      short: "Two zooms",
      title: "One system, two zoom levels",
      body: [
        "AlgoVerse hosts weekly coding contests: 30,000 contestants, problems released at 18:00, submissions graded live, a leaderboard everyone refreshes.",
        "From far away it is a handful of services. Up close, each service is code, tables and algorithms. Designing it means working at both levels.",
      ],
      scene: hld(),
    },
    {
      kind: "technique",
      short: "HLD",
      title: "High-level design: the map",
      body: [
        "**HLD** decides what the parts are and how they connect: which services exist and what each owns, how they talk (a call or an event), where each kind of data lives, and how it scales and fails.",
        "Here: submissions go through a queue to sandboxed graders; results update a leaderboard cache; the contest service owns problems and timing.",
      ],
      scene: hld(),
    },
    {
      kind: "tradeoff",
      short: "HLD choices",
      title: "HLD decisions are trade-offs",
      body: [
        "Submitting shouldn't wait for grading, so Submissions enqueues and returns at once (see Message queues). The leaderboard must be fast to read by thousands, so it lives in memory as a sorted set, rebuilt from stored results if lost.",
        "Each arrow on the map is a choice with a cost, and the design document says why.",
      ],
      scene: hld({ cq: { queue: 4 } }),
    },
    {
      kind: "solution",
      short: "LLD",
      title: "Low-level design: inside one box",
      body: [
        "Now open the Contest service. **LLD** decides how one component is built: its modules or classes, the interfaces between them, its tables and indexes, its algorithms and its edge cases.",
        'For example: the leaderboard ranks by (solved desc, penalty asc); "top 100" and "my rank" must both be fast, so a sorted set (or a balanced tree) beats sorting on every request.',
      ],
      code: [
        "class Leaderboard:",
        "    def record(self, user, solved, penalty): ...   # O(log n)",
        "    def top(self, k): ...                          # O(k + log n)",
        "    def rank_of(self, user): ...                   # O(log n)",
      ],
      scene: {
        nodes: [
          { ...contest, x: 0, y: 0, size: 1.4, state: "lit" },
          { ...board, x: 3, y: 0 },
        ],
        links: [both("contest", "board", 2)],
      },
    },
    {
      kind: "technique",
      short: "States",
      title: "LLD decisions: states, schemas, edge cases",
      body: [
        "A submission moves through states, and LLD pins down which moves are allowed: queued → running → passed or failed; running → queued again if a grader dies.",
        "It also settles the edge cases: what if the same submission is graded twice? (Idempotent: same id, one result.) What if it arrives one second after the deadline? (Rejected, with the server's clock as the judge.)",
      ],
      table: {
        head: ["From", "To", "When"],
        rows: [
          ["queued", "running", "a grader takes it"],
          ["running", "passed / failed", "tests finish"],
          ["running", "queued", "grader died, no ack"],
        ],
      },
      scene: {
        nodes: [
          { ...submit, x: 0, y: 0, size: 1.3, state: "lit" },
          { ...cq, x: 2.8, y: 0 },
        ],
        links: [link("submit", "cq", "event")],
      },
    },
    {
      kind: "insight",
      short: "Contracts",
      title: "Where they meet: contracts",
      body: [
        "The two levels meet at the edges of each box. HLD fixes what a component **promises**: its API and the events it publishes. LLD decides **how** it keeps that promise.",
        "That split lets teams change the inside of a service freely without touching anyone else.",
      ],
      scene: hld(),
    },
    {
      kind: "case",
      short: "Wrong level",
      title: "Case: designing at the wrong level",
      body: [
        "Asked to design this contest platform in an interview, one candidate spends twenty minutes on class diagrams and never notices that 30,000 people submit in the last minute, so grading needs a queue and many workers.",
        "Another draws boxes for an hour and can't say how the leaderboard finds someone's rank. Start high, agree the map, then zoom into the parts that matter most.",
      ],
      quiz: {
        question: "You have 45 minutes to design a system. What comes first?",
        options: [
          "Class diagrams for each service",
          "Requirements and numbers, then the high-level map",
          "The database's index choices",
        ],
        answer: 1,
        why: "Napkin numbers and the map decide which parts deserve a low-level deep-dive.",
      },
      scene: hld({ cq: { queue: 8, state: "hot" } }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: ["Start with requirements and numbers, sketch the map, then go deep where it matters."],
      table: {
        head: ["", "HLD", "LLD"],
        rows: [
          ["Zoom", "whole system", "one component"],
          ["Parts", "services, stores, queues", "classes, tables, states"],
          ["Decides", "what talks to what, where data lives", "how each part works inside"],
          ["Changes", "rarely", "often"],
        ],
      },
      scene: hld(),
    },
  ],
};

/* ------------------------------------------- Link shortener ------------------------------------------- */

const sharer = node("sharer", "browser", "Learner sharing", -4.4, -1.6);
const clicker = node("clicker", "phone", "Friend clicking", -4.4, 1.6);
const sapi = node("sapi", "server", "Shortener API", -1.4, 0);
const kvs = node("kvs", "db", "Links store", 2.4, 1, { sub: "key–value" });
const linkCache = node("linkCache", "cache", "Cache", 2.4, -1.6, { sub: "hot codes" });
const clicks = node("clicks", "stream", "Click events", 0.8, 3, { sub: "→ analytics" });
const shortener = (
  extra: Record<string, Partial<SceneNode>> = {},
  more: SceneNode[] = [],
  links?: Scene["links"],
): Scene => ({
  nodes: [...withExtra([sharer, clicker, sapi, kvs], extra), ...more],
  links: links ?? [
    link("sharer", "sapi", "request", { kind: "response", back: true }),
    both("clicker", "sapi", 3),
    link("sapi", "kvs", "write"),
    both("sapi", "kvs", 1),
  ],
});

export const URL_SHORTENER: Lesson = {
  id: "url-shortener",
  title: "Design a link shortener",
  tagline:
    "A first end-to-end design: from a one-line brief to a service that handles billions of redirects.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "Turning a brief into numbers",
    "Generating short codes: hashing versus counting",
    "Caching a read-heavy workload",
    "301 versus 302 redirects",
    "Partitioning, click counting and abuse",
  ],
  builtOn: [
    { label: "Hash table", path: "/structures/hash-table" },
    { label: "LRU cache", path: "/structures/lru-cache" },
  ],
  steps: [
    {
      kind: "setup",
      short: "The brief",
      title: "The brief: short links to solutions",
      body: [
        "Learners want to share their solutions: paste a long AlgoVerse URL, get `algo.link/x7Kp2Q`, and anyone who opens it lands on the solution.",
        "Links must be short, work for years, open fast anywhere, and not be guessable for private solutions.",
      ],
      scene: shortener(),
    },
    {
      kind: "setup",
      short: "Numbers",
      title: "Put numbers on it",
      body: [
        "Napkin math first. Say 50 million new links a month: about 20 writes a second. Each link is opened about 100 times: 2,000 redirects a second on average, perhaps 10,000 at peak.",
        "Over five years, 3 billion links at about 500 bytes each is 1.5 TB. Reads outnumber writes 100 to 1.",
      ],
      metrics: [
        { label: "Writes", value: "≈ 20 /s" },
        { label: "Redirects", value: "2,000 /s (peak 10k)" },
        { label: "5-year data", value: "≈ 1.5 TB" },
      ],
      scene: shortener(),
    },
    {
      kind: "solution",
      short: "Simplest",
      title: "The simplest thing that works",
      body: [
        "Two endpoints: `POST /links` stores a URL and returns a code; `GET /x7Kp2Q` looks the code up and answers with a redirect. One table: code (the key), long URL, owner, created.",
        'Every query is "get this one code": no joins, no ranges.',
      ],
      scene: shortener(),
    },
    {
      kind: "problem",
      short: "Hash it?",
      title: "Where do codes come from? Try a hash",
      body: [
        "First idea: hash the long URL and keep the first six characters. No coordination, and the same URL always gives the same code.",
        "But six characters can't hold a whole hash, so different URLs will eventually collide on the same code, and every insert must check and retry.",
      ],
      scene: shortener({ kvs: { badge: "collision!", state: "hot" } }),
    },
    {
      kind: "solution",
      short: "Base 62",
      title: "Count, then encode",
      body: [
        "Better: give every link a unique number (see Unique IDs) and write it in **base 62**: digits, lowercase and uppercase letters. A unique number in means a unique code out, with no checks.",
        "62⁷ is about 3.5 trillion: seven characters last a very long time.",
      ],
      code: [
        "ALPHABET = '0-9a-zA-Z'   # 62 symbols",
        "def encode(n):",
        "    s = ''",
        "    while n: n, r = divmod(n, 62); s = ALPHABET[r] + s",
        "    return s or '0'",
      ],
      quiz: {
        question: "About how many links can 6 base-62 characters represent?",
        options: ["≈ 57 million", "≈ 57 billion", "≈ 3.5 trillion"],
        answer: 1,
        why: "62⁶ ≈ 56.8 billion: plenty for years at 50 million a month.",
      },
      scene: shortener({ sapi: { badge: "#125,000,071 → 8rRb3" } }),
    },
    {
      kind: "case",
      short: "Guessable",
      title: "Case: codes you can count",
      body: [
        "Counter codes come out in order: `8rRb3`, `8rRb4`, `8rRb5`. Anyone can walk the whole space and harvest every link, including links to private solutions.",
        "Scramble the number before encoding with a reversible shuffle, so neighbours look unrelated, and use longer random codes for anything private. Private still means checking permission (see Authorization).",
      ],
      scene: shortener(
        {},
        [node("crawler", "user", "Crawler", -4.4, 3.4, { hue: "rose" })],
        [both("crawler", "sapi", 3), both("sapi", "kvs", 2)],
      ),
    },
    {
      kind: "solution",
      short: "Cache",
      title: "Reads dominate: cache them",
      body: [
        "A small share of links gets most clicks (today's viral solution, not last year's), and a link never changes once created. That is the ideal cache: high hit rate, no invalidation.",
        "An in-memory cache in front of the store answers most redirects in a millisecond.",
      ],
      metrics: [
        { label: "Cache hit rate", value: "≈ 95%", tone: "good" },
        { label: "Store reads", value: "≈ 500 /s at peak", tone: "good" },
      ],
      scene: shortener(
        {},
        [linkCache],
        [
          link("sharer", "sapi", "request"),
          both("clicker", "sapi", 3),
          both("sapi", "linkCache", 3),
          both("sapi", "kvs", 1),
        ],
      ),
    },
    {
      kind: "tradeoff",
      short: "301 or 302",
      title: "Which redirect: 301 or 302?",
      body: [
        "**301 Moved Permanently** lets the browser remember the answer, so the next click never reaches you: the cheapest request there is. But you can no longer count those clicks or change the target.",
        "**302 Found** asks the browser to check every time. More load, but every click is seen. Most shorteners that show click counts use 302.",
      ],
      scene: shortener({}, [linkCache], [both("clicker", "sapi", 3), both("sapi", "linkCache", 3)]),
    },
    {
      kind: "solution",
      short: "Partition",
      title: "Billions of keys: spread them out",
      body: [
        'Three billion rows won\'t stay comfortable on one machine forever. But every query is "get one code", so a **key–value store partitioned by a hash of the code** (see Sharding and Consistent hashing) fits perfectly, with replicas for safety.',
      ],
      scene: {
        nodes: [
          clicker,
          sapi,
          linkCache,
          node("p0", "db", "Partition 0", 2.6, 0.4, { size: 0.8 }),
          node("p1", "db", "Partition 1", 3.6, 1.6, { size: 0.8 }),
          node("p2", "db", "Partition 2", 1.6, 1.8, { size: 0.8 }),
        ],
        links: [
          both("clicker", "sapi", 3),
          both("sapi", "linkCache", 2),
          both("sapi", "p0", 1),
          both("sapi", "p1", 1),
          both("sapi", "p2", 1),
        ],
      },
    },
    {
      kind: "technique",
      short: "Clicks",
      title: "Counting clicks without slowing them",
      body: [
        "Learners want to see how many people opened their link. `UPDATE links SET clicks = clicks + 1` on every redirect turns cheap reads into writes, all hammering the hottest rows.",
        "Instead, publish a click event to a stream and answer the redirect at once. A stream processor adds up counts per minute and writes them in batches.",
      ],
      scene: shortener(
        {},
        [linkCache, clicks],
        [both("clicker", "sapi", 3), both("sapi", "linkCache", 3), link("sapi", "clicks", "event")],
      ),
    },
    {
      kind: "case",
      short: "Abuse",
      title: "Case: spammers love shorteners",
      body: [
        "A short link hides where it goes, which is perfect for phishing. A script starts creating thousands of links a minute to fake login pages, and soon `algo.link` lands on blocklists.",
        "Require sign-in to create links, rate-limit creation, check targets against known-bad lists, and let people preview where a link goes.",
      ],
      scene: shortener(
        { sharer: { label: "Spam script", state: "hot" } },
        [],
        [
          link(
            "sharer",
            "sapi",
            { kind: "request", rate: 4 },
            { kind: "fail", back: true, rate: 3 },
          ),
        ],
      ),
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: ["Every decision traces back to the numbers and the brief."],
      table: {
        head: ["Question", "Decision", "Because"],
        rows: [
          ["Codes", "scrambled counter, base 62", "unique with no checks"],
          ["Reads", "cache + 302", "100 reads per write"],
          ["Storage", "key–value, hash-partitioned", "one-key lookups only"],
          ["Clicks", "events + batched counts", "keep redirects fast"],
          ["Abuse", "sign-in, rate limits, URL checks", "shorteners attract spam"],
        ],
      },
      scene: shortener(
        {},
        [linkCache, clicks],
        [
          link("sharer", "sapi", "request"),
          both("clicker", "sapi", 3),
          both("sapi", "linkCache", 3),
          both("sapi", "kvs", 1),
          link("sapi", "clicks", "event"),
        ],
      ),
    },
  ],
};

/* ------------------------------------------- Activity feed ------------------------------------------- */

const reader = node("reader", "phone", "Priya opens her feed", -4.4, 0);
const feedApi = node("feedApi", "server", "Feed API", -1.6, 0);
const posts = node("posts", "db", "Activity store", 2, 2.2, { sub: "by author, time" });
const graph = node("graph", "db", "Follow graph", 2, -2.2, {
  sub: "who follows whom",
  hue: "teal",
});
const feedCache = node("feedCache", "cache", "Feed lists", 2.6, 0, { sub: "post ids per learner" });
const fanout = node("fanout", "worker", "Fan-out workers", 4.8, -1, {});
const author = node("author", "browser", "Ana solves a problem", 5.6, 2.2);
const feed = (
  extra: Record<string, Partial<SceneNode>> = {},
  more: SceneNode[] = [],
  links?: Scene["links"],
): Scene => ({
  nodes: [...withExtra([reader, feedApi, posts, graph], extra), ...more],
  links: links ?? [
    both("reader", "feedApi", 1),
    both("feedApi", "graph", 1),
    both("feedApi", "posts", 3),
  ],
});
const pushScene = (extra: Record<string, Partial<SceneNode>> = {}): Scene =>
  feed(
    extra,
    [feedCache, fanout, author],
    [
      both("reader", "feedApi", 2),
      both("feedApi", "feedCache", 2),
      both("feedApi", "posts", 1),
      link("author", "posts", "write"),
      link("posts", "fanout", "event"),
      both("fanout", "graph", 1),
      link("fanout", "feedCache", { kind: "write", rate: 3 }),
    ],
  );

export const NEWS_FEED: Lesson = {
  id: "news-feed",
  title: "Design an activity feed",
  tagline:
    "What everyone you follow solved today, in 200 ms, and the question of when to do the work.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "Fan-out on read versus fan-out on write",
    "Storing ids, not copies",
    "The celebrity problem and the hybrid fix",
    "Skipping inactive learners",
    "Cursors, and rebuilding derived data",
  ],
  builtOn: [
    { label: "Binary heap", path: "/structures/binary-heap" },
    { label: "Merge sort", path: "/algorithms/merge-sort" },
  ],
  steps: [
    {
      kind: "setup",
      short: "The brief",
      title: "The brief: a home feed",
      body: [
        'Learners follow friends and teachers. The home screen shows their recent activity, newest first: "Ana solved Two Sum", "Mr Rao posted a new problem set".',
        "What matters: opening the feed must feel instant, around 200 ms.",
      ],
      scene: feed(),
    },
    {
      kind: "setup",
      short: "Numbers",
      title: "Put numbers on it",
      body: [
        "20 million learners a day open the feed about 8 times: 160 million feed loads, about 2,000 a second, 6,000 at peak. They create 10 million activities a day: about 120 a second.",
        "Feed reads outnumber posts more than 10 to 1. Each learner follows about 150 accounts.",
      ],
      metrics: [
        { label: "Feed reads", value: "2,000 /s (6k peak)" },
        { label: "New activity", value: "120 /s" },
        { label: "Following", value: "≈ 150 each" },
      ],
      scene: feed(),
    },
    {
      kind: "solution",
      short: "On read",
      title: "First draft: build the feed when asked",
      body: [
        "Store activities in a table indexed by (author, time). To build Priya's feed: look up the 150 accounts she follows, fetch the latest activity of each, merge by time, keep the top 50.",
        "Simple, and always up to date.",
      ],
      scene: feed(),
    },
    {
      kind: "problem",
      short: "Slow reads",
      title: "The work lands on the wrong side",
      body: [
        "Every feed load fans out to 150 authors spread over many shards and waits for the slowest answer (the fan-out tail from Latency and throughput). At 6,000 loads a second that is 900,000 lookups a second, mostly repeating work done a moment ago.",
      ],
      metrics: [
        { label: "Lookups", value: "900,000 /s", tone: "bad" },
        { label: "Feed p95", value: "1.2 s", tone: "bad" },
      ],
      scene: feed(
        { posts: { state: "hot", queue: 8 } },
        [],
        [
          both("reader", "feedApi", 1),
          both("feedApi", "graph", 1),
          link("feedApi", "posts", { kind: "request", rate: 4 }),
        ],
      ),
    },
    {
      kind: "solution",
      short: "On write",
      title: "Flip it: deliver activity when it happens",
      body: [
        "Give every learner a ready-made feed: a list in a cache, newest first. When Ana solves a problem, a **fan-out worker** looks up her followers and adds the activity to each of their lists.",
        "Reading a feed is now one fast lookup. The work moved from reads (many) to writes (few).",
      ],
      metrics: [{ label: "Feed p95", value: "60 ms", tone: "good" }],
      scene: pushScene(),
    },
    {
      kind: "technique",
      short: "Ids only",
      title: "Store ids, not copies",
      body: [
        "Each feed list holds only activity **ids**, a few bytes each, and only the newest 500 or so. When a feed is read, the API fetches the activities themselves in one batch.",
        "One copy of each activity, so edits and deletions show up everywhere at once.",
      ],
      scene: pushScene({ feedCache: { badge: "≤ 500 ids each" } }),
    },
    {
      kind: "case",
      short: "Celebrity",
      title: "Case: two million followers",
      body: [
        "A famous teacher with 2 million followers posts a new problem set. That one post becomes 2 million list writes. Even at 100,000 writes a second, delivery takes 20 seconds and delays everyone else's activity.",
      ],
      scene: pushScene({
        author: { label: "Famous teacher", sub: "2M followers", state: "hot" },
        fanout: { state: "hot", queue: 8 },
      }),
    },
    {
      kind: "solution",
      short: "Hybrid",
      title: "Hybrid: push for most, pull for the famous",
      body: [
        "Treat the two kinds of account differently. Ordinary learners keep fan-out on write. Accounts above a threshold, say 50,000 followers, are not fanned out.",
        "When Priya opens her feed, the API reads her ready-made list **and** pulls the latest posts of the few famous accounts she follows, then merges them: a few extra lookups instead of millions of writes.",
      ],
      callout: {
        kind: "key",
        text: "Neither pure strategy survives real data. The hybrid uses each where it is cheap.",
      },
      scene: pushScene({ author: { label: "Famous teacher", sub: "pulled at read time" } }),
    },
    {
      kind: "tradeoff",
      short: "Idle readers",
      title: "Case: feeds nobody reads",
      body: [
        "Of everyone following Ana, perhaps a third opened the app this month. Fanning out to the rest fills memory with lists nobody will look at.",
        "Fan out only to recently active learners. When someone returns after weeks, build their feed on read once, then keep it warm again.",
      ],
      scene: pushScene(),
    },
    {
      kind: "technique",
      short: "Cursors",
      title: "Scrolling: cursors, not page numbers",
      body: [
        'Priya scrolls for more. "Page 2" would mean "skip 20, take 20", but three new activities arrived at the top since page 1, so she would see three items twice.',
        'Use a **cursor**: "the 20 after activity 9f3c". New items at the top don\'t shift what comes next.',
      ],
      scene: pushScene(),
    },
    {
      kind: "insight",
      short: "Rebuild",
      title: "Case: the feed cache is wiped",
      body: [
        "A bad deploy flushes the feed cache. Every feed is gone, and nothing of value is lost: activities and the follow graph are the source of truth; feed lists are **derived data** that can be rebuilt (on read at first, by background jobs after).",
      ],
      quiz: {
        question: "Which data must be backed up carefully?",
        options: [
          "The feed lists in the cache",
          "The activities and the follow graph",
          "Both equally",
        ],
        answer: 1,
        why: "Feed lists are derived from activities + follows and can be recomputed; losing the source of truth is unrecoverable.",
      },
      scene: pushScene({ feedCache: { state: "down", badge: "wiped" } }),
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "Do the work where it is cheapest: on write for most, on read for the famous and the inactive.",
      ],
      table: {
        head: ["Question", "Decision", "Because"],
        rows: [
          ["Build feeds", "on write (push)", "10+ reads per post"],
          ["Famous accounts", "pull, merged at read", "millions of writes per post"],
          ["Feed entries", "ids, capped at 500", "one copy of each activity"],
          ["Inactive learners", "skip; rebuild on return", "don't fill memory"],
          ["Paging", "cursors", "stable while new items arrive"],
        ],
      },
      scene: pushScene(),
    },
  ],
};

/* ----------------------------------------------- Chat ----------------------------------------------- */

const priyaC = node("priyaC", "phone", "Priya", -4.6, -1.6);
const arjun = node("arjun", "phone", "Arjun", -4.6, 1.6);
const g1 = node("g1", "gateway", "Gateway 1", -1.8, -1.6, { sub: "holds sockets" });
const g2 = node("g2", "gateway", "Gateway 2", -1.8, 1.6, { sub: "holds sockets" });
const chatSvc = node("chatSvc", "service", "Chat service", 1, 0, { sub: "stateless" });
const where = node("where", "cache", "Who is where", 1, -2.8, { sub: "user → gateway" });
const msgStore = node("msgStore", "db", "Message store", 3.8, 0, { sub: "per conversation" });
const pushSvc = node("pushSvc", "service", "Push notifications", 3.8, 2.6);
const chat = (
  extra: Record<string, Partial<SceneNode>> = {},
  more: SceneNode[] = [],
  links?: Scene["links"],
): Scene => ({
  nodes: [...withExtra([priyaC, arjun, g1, g2, chatSvc, where, msgStore], extra), ...more],
  links: links ?? [
    link("priyaC", "g1", "event"),
    link("g1", "chatSvc", "event"),
    link("chatSvc", "msgStore", "write"),
    both("chatSvc", "where", 1),
    link("chatSvc", "g2", "event"),
    link("g2", "arjun", "event"),
  ],
});

export const CHAT: Lesson = {
  id: "chat",
  title: "Design a study-group chat",
  tagline:
    "A million open connections, and a promise: every message arrives, in order, exactly once.",
  minutes: 13,
  level: "advanced",
  learn: [
    "WebSocket gateways and a stateless chat service",
    "Finding which gateway holds a learner",
    "Store first, then deliver; sequence numbers",
    "Offline learners, duplicates and groups",
    "Presence, and surviving a gateway crash",
  ],
  builtOn: [
    { label: "Hash table", path: "/structures/hash-table" },
    { label: "Queue", path: "/structures/queue" },
  ],
  steps: [
    {
      kind: "setup",
      short: "The brief",
      title: "The brief: study-group chat",
      body: [
        "Learners chat one-to-one and in study groups of up to 50. Messages appear instantly when the other person is online, wait for them when they aren't, never get lost, and arrive in order.",
      ],
      scene: chat(),
    },
    {
      kind: "setup",
      short: "Numbers",
      title: "Put numbers on it",
      body: [
        "5 million learners a day send about 30 messages each: 150 million a day, about 1,700 a second, several times that in the evening. Messages are small (≈ 200 bytes), so storage grows about 30 GB a day.",
        "The hard number is connections: up to **1 million open sockets** at once.",
      ],
      metrics: [
        { label: "Messages", value: "1,700 /s" },
        { label: "Storage", value: "≈ 30 GB / day" },
        { label: "Open sockets", value: "1,000,000", tone: "bad" },
      ],
      scene: chat(),
    },
    {
      kind: "solution",
      short: "Draft",
      title: "First draft: one server, two sockets",
      body: [
        "From Real-time updates: each phone opens a **WebSocket**, a long-lived connection the server can push down at any moment. Priya sends; the server pushes to Arjun's socket.",
        "One server can hold maybe 50,000 sockets. We need about twenty.",
      ],
      scene: {
        nodes: [priyaC, arjun, { ...chatSvc, label: "Chat server", sub: "" }],
        links: [link("priyaC", "chatSvc", "event"), link("chatSvc", "arjun", "event")],
      },
    },
    {
      kind: "problem",
      short: "Where is he?",
      title: "Twenty servers: where is Arjun?",
      body: [
        "Split the roles: **gateways** do nothing but hold sockets, and a stateless **chat service** behind them holds the logic. But Priya's socket is on Gateway 1 and Arjun's on Gateway 2. How does the chat service know where to deliver?",
      ],
      scene: chat(
        { chatSvc: { badge: "Arjun is…?" } },
        [],
        [
          link("priyaC", "g1", "event"),
          link("g1", "chatSvc", "event"),
          link("g2", "arjun", { dashed: true }),
        ],
      ),
    },
    {
      kind: "solution",
      short: "Registry",
      title: "A registry of who is connected where",
      body: [
        "When a phone connects, its gateway writes `arjun → gateway 2` into a fast in-memory store, with a short TTL that heartbeats keep refreshing. The chat service looks it up and forwards the message to the right gateway.",
      ],
      scene: chat({ where: { badge: "arjun → g2" } }),
    },
    {
      kind: "solution",
      short: "Store first",
      title: "Write it down before passing it on",
      body: [
        "So far a message lives only in memory while travelling; a crash mid-delivery loses it. The rule: **store first, then deliver**. The chat service writes each message to the store, under the conversation, with the next **sequence number**, then pushes it.",
        "Sequence numbers per conversation give every member the same order.",
      ],
      scene: chat({ msgStore: { badge: "conv 42: #1041" } }),
    },
    {
      kind: "case",
      short: "Offline",
      title: "Case: Arjun is on a train",
      body: [
        "Arjun loses signal. His registry entry expires, so the chat service doesn't try to push. The message is already safe in the store, and a push notification goes out instead.",
        'When Arjun reconnects, his app says "the last message I have in conversation 42 is #1040" and fetches everything after it.',
      ],
      scene: chat(
        { arjun: { state: "down" }, where: { badge: "arjun: expired" } },
        [pushSvc],
        [
          link("priyaC", "g1", "event"),
          link("g1", "chatSvc", "event"),
          link("chatSvc", "msgStore", "write"),
          link("chatSvc", "pushSvc", "event"),
        ],
      ),
    },
    {
      kind: "case",
      short: "Duplicates",
      title: "Case: sent twice, shown once",
      body: [
        'Priya hits send in a lift. The message is stored, but the "sent ✓" reply is lost. Her app can\'t tell, so it retries, and the server receives the same message twice.',
        "The app gives every message a **client id** when it is written. The server stores each client id once and simply re-confirms a repeat.",
      ],
      quiz: {
        question: "Why can't the server use its own sequence number to spot the duplicate?",
        options: [
          "Sequence numbers are too small",
          "The retry looks like a new message; only the client's id says it is the same one",
          "The server never retries",
        ],
        answer: 1,
        why: "The server would assign the retry a fresh sequence number. The client id, created before the first send, is what links the two attempts.",
      },
      scene: chat({
        priyaC: { badge: "retry: msg c7f1" },
        msgStore: { badge: "c7f1 already stored" },
      }),
    },
    {
      kind: "technique",
      short: "Groups",
      title: "Group chats: store once, deliver to many",
      body: [
        "A group message is stored once, in the group's conversation. Then the chat service looks up the members, finds each one's gateway, and delivers a copy to those online; offline members catch up by sequence number later.",
        "Capping groups at 50 keeps this cheap; huge broadcast channels use the feed's pull approach instead.",
      ],
      scene: chat(
        {},
        [node("third", "phone", "Lena", -4.6, 3.4)],
        [
          link("priyaC", "g1", "event"),
          link("g1", "chatSvc", "event"),
          link("chatSvc", "msgStore", "write"),
          link("chatSvc", "g2", { kind: "event", rate: 3 }),
          link("g2", "arjun", "event"),
          link("g2", "third", "event"),
        ],
      ),
    },
    {
      kind: "tradeoff",
      short: "Presence",
      title: '"Online" and "typing…" play by other rules',
      body: [
        "Presence and typing indicators are surprisingly expensive: every change may need to reach every contact. But losing one doesn't matter: the next heartbeat or keystroke fixes it.",
        "So they are best-effort: in memory only, never stored, sent only to people with the chat open, and dropped first under load.",
      ],
      scene: chat({ where: { sub: "presence: best effort" } }),
    },
    {
      kind: "case",
      short: "Gateway dies",
      title: "Case: a gateway dies",
      body: [
        "Gateway 2 crashes and 50,000 sockets drop at once. No message is lost (everything was stored first), but 50,000 phones now try to reconnect in the same second.",
        "Phones reconnect with **exponential backoff and jitter**, spreading the stampede over a minute, and resume from their last sequence number.",
      ],
      scene: chat(
        { g2: { state: "down" }, arjun: { badge: "reconnect in 7 s" } },
        [],
        [
          link("priyaC", "g1", "event"),
          link("g1", "chatSvc", "event"),
          link("chatSvc", "msgStore", "write"),
          link("arjun", "g1", { kind: "request", rate: 1 }),
        ],
      ),
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: ["Connections are a fast path; the store is the truth."],
      table: {
        head: ["Question", "Decision", "Because"],
        rows: [
          ["Transport", "WebSockets on dumb gateways", "server must push; 1M sockets"],
          ["Routing", "registry: learner → gateway", "connections are stateful"],
          ["Durability", "store first, then deliver", "crashes mid-delivery"],
          ["Order", "sequence numbers per conversation", "same order for everyone"],
          ["Duplicates", "client message ids", "retries after lost acks"],
          ["Presence", "best effort, in memory", "cheap to lose, costly to store"],
        ],
      },
      scene: chat(),
    },
  ],
};
