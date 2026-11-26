import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Scaling ============ */

export const MARATHON_TRACKING: CaseStudy = caseStudy(
  {
    id: "marathon-tracking",
    title: "Live runner tracking for a city marathon",
    tagline:
      "40,000 runners wear timing chips. 600,000 friends and families want to know where their runner is, right now.",
    minutes: 8,
    level: "beginner",
    tier: "integrate",
    concepts: ["napkin-math", "stateless", "load-balancing", "caching", "cdn"],
    learn: [
      "Notice when reads dwarf writes",
      "Spread a burst over many stateless servers",
      "Let a cache and the edge answer the crowd",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Where is my runner?",
      body: [
        "A city marathon has 40,000 runners. A chip on each bib is read by timing mats every 5 km and at the finish. Families open the tracking page, type a bib number and see the runner's last split and expected finish time.",
      ],
      add: [
        node("mats", "worker", "Timing mats", -4.4, -2.4, { sub: "9 along the course" }),
        node("app", "server", "Tracking server", -0.6, 0),
        node("db", "db", "Splits", 2.8, -2.4),
        node("fans", "phone", "Families & friends", -4.4, 2.6, { sub: "600,000" }),
      ],
      link: [link("mats", "app", "write"), link("app", "db", "write"), both("fans", "app", 2)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "Writes are tiny, reads are huge",
      body: [
        "Writes: 40,000 runners × 9 mats = 360,000 splits over six hours, about 17 a second (a few hundred a second when a wave of runners crosses a mat).",
        "Reads: 600,000 people refreshing every 30 seconds is **20,000 requests a second**, a thousand times the writes. The design is about reads.",
      ],
      metrics: [
        { label: "Splits written", value: "≈ 17 /s" },
        { label: "Page reads", value: "≈ 20,000 /s", tone: "bad" },
      ],
    },
    {
      kind: "problem",
      short: "One box",
      title: "Race start: one server melts",
      body: [
        "At 7:00 the start gun fires and everyone opens the page at once. The single server queues requests, pages take 15 seconds, and refreshing makes it worse.",
      ],
      set: { app: { state: "hot", badge: "15 s" } },
      link: [both("fans", "app", 4)],
    },
    {
      kind: "solution",
      short: "Many servers",
      uses: "stateless",
      title: "Make the servers interchangeable",
      body: [
        "The tracking server keeps nothing between requests: the bib number is in the URL and the data is in the database. Any copy can answer any request, so we can run ten copies on race day and two on other days.",
      ],
      remove: ["app"],
      add: [
        node("app1", "server", "Server 1", -0.6, -1.2),
        node("app2", "server", "Server 2", -0.6, 0.2),
        node("app3", "server", "Server 3", -0.6, 1.6, { sub: "… ×10" }),
      ],
      link: [
        link("mats", "app1", "write"),
        link("app1", "db", "write"),
        link("app2", "db", "request"),
        link("app3", "db", "request"),
      ],
    },
    {
      kind: "solution",
      short: "Balancer",
      uses: "load-balancing",
      title: "A load balancer in front",
      body: [
        "Families' requests go to a load balancer that spreads them across the servers and stops sending to any server that fails its health check.",
      ],
      add: [node("lb", "lb", "Load balancer", -2.6, 1.2)],
      link: [
        both("fans", "lb", 3),
        both("lb", "app1", 1),
        both("lb", "app2", 1),
        both("lb", "app3", 1),
      ],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache each runner's card",
      body: [
        "Many people follow the same runner, and a runner's splits change only every 25 minutes or so. Each runner's card is cached; a new split from a mat replaces that runner's entry. The database sees only the cache misses.",
      ],
      add: [node("cache", "cache", "Runner cards", 1.4, 0.6, { sub: "updated on each split" })],
      link: [
        link("app2", "cache", "request"),
        link("app3", "cache", "request"),
        link("app1", "cache", "write"),
      ],
      metrics: [{ label: "Cache hit rate", value: "≈ 95%", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "The leaderboard from the edge",
      body: [
        "The page itself, the course map and the top-10 leaderboard are the same for everyone. They are served by a CDN; the leaderboard is refreshed every 5 seconds, so each edge asks the origin for it at most once per 5 seconds.",
      ],
      add: [node("cdn", "cdn", "CDN", -4.4, 0)],
      link: [link("lb", "cdn", "copy"), link("cdn", "fans", { kind: "heavy", rate: 3 })],
      quiz: {
        question:
          "Why can the leaderboard go through the CDN but a runner's card goes to the servers?",
        options: [
          "The leaderboard is bigger",
          "Everyone sees the same leaderboard, while each card depends on the bib number asked for",
          "CDNs cannot serve numbers",
        ],
        answer: 1,
        why: "Shared, identical content is ideal for the edge. Per-runner cards are many small, different answers, so a server-side cache suits them better.",
      },
    },
    {
      kind: "case",
      short: "Winner",
      uses: "cdn",
      title: "Case: the winner crosses the line",
      body: [
        "Two hours in, 200,000 people refresh the leaderboard within a minute. The CDN answers almost all of them; the origin sees one request per edge every 5 seconds and stays calm.",
      ],
      set: {
        app1: { state: "ok" },
        app2: { state: "ok" },
        app3: { state: "ok" },
      },
      metrics: [
        { label: "Leaderboard views", value: "≈ 3,300 /s" },
        { label: "Reaching our servers", value: "a few /s", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every runner, found in a second",
      body: [
        "Counting first showed that reads were the whole problem. Stateless servers, a balancer, a per-runner cache and a CDN each removed part of it.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Know the load", "reads are 1,000× writes", "Napkin math"],
          ["Grow on race day", "servers that keep no state", "Stateless services"],
          ["Spread requests", "load balancer with health checks", "Load balancing"],
          ["Popular runners", "cached runner cards", "Caching"],
          ["Shared pages", "leaderboard at the edge", "Content delivery networks"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const USERNAME_SIGNUP: CaseStudy = caseStudy(
  {
    id: "username-signup",
    title: "Unique usernames for 100 million accounts",
    tagline:
      'As you type a username, the sign-up form says "available" or "taken". Two people must never get the same name.',
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["napkin-math", "indexes", "transactions", "sharding", "caching"],
    learn: [
      "Find one name among 100 million quickly",
      "Let the database settle races",
      "Treat a fast check as a hint, not a promise",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Is “asha” free?",
      body: [
        "A social app has 100 million accounts. On sign-up, the form checks the username as you type. Names are unique regardless of case: “Asha”, “ASHA” and “asha” are the same name.",
      ],
      add: [
        node("people", "browser", "Sign-up form", -4.4, 0),
        node("api", "server", "Accounts API", -1.2, 0),
        node("db", "db", "Accounts", 2.2, 0, { sub: "100 M rows" }),
      ],
      link: [both("people", "api", 2), both("api", "db", 2)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "How many checks?",
      body: [
        "At a marketing peak 500 people a second sign up, and each makes about 6 availability checks while typing: **3,000 checks a second**, all short lookups. 100 million names of about 20 bytes is only 2 GB, small enough to keep in memory.",
      ],
      metrics: [
        { label: "Availability checks", value: "≈ 3,000 /s" },
        { label: "All names", value: "≈ 2 GB", tone: "good" },
      ],
    },
    {
      kind: "problem",
      short: "Scan",
      title: "Without help, each check reads every row",
      body: [
        "A query for one username on an unindexed table reads all 100 million rows, about a second each time. At 3,000 checks a second the database is buried.",
      ],
      set: { db: { state: "hot", badge: "1 s per check" } },
    },
    {
      kind: "solution",
      short: "Index",
      uses: "indexes",
      title: "A unique index on the normalized name",
      body: [
        "Store each name twice: as typed (for display) and normalized: lower-cased, with look-alike characters folded together. A unique B-tree index on the normalized column finds any name in about 27 comparisons.",
      ],
      set: { db: { state: "ok", badge: "unique index" } },
      code: [
        "normalized = fold_lookalikes(name.lower())",
        "CREATE UNIQUE INDEX ON accounts (normalized_name)",
      ],
    },
    {
      kind: "technique",
      short: "Race",
      uses: "transactions",
      title: "Two people claim “rahul” at once",
      body: [
        "Check-then-insert has a gap: both checks say free, then both insert. Instead the sign-up simply inserts the row. The unique index makes the database accept exactly one; the other gets a duplicate-key error, and the form says “just taken, try another”.",
      ],
      add: [node("p2", "browser", "Another sign-up", -4.4, 2.4)],
      link: [both("p2", "api", 1)],
      quiz: {
        question:
          "Why is “insert and let the unique index decide” safer than “check, then insert”?",
        options: [
          "It is faster to type",
          "The check and the claim become one atomic step inside the database, so no one can slip in between",
          "Indexes never fail",
        ],
        answer: 1,
        why: "Only the database sees both attempts in order. Making the claim itself the check removes the race window.",
      },
    },
    {
      kind: "solution",
      short: "Shard",
      uses: "sharding",
      title: "Shard the name table by name",
      body: [
        "Accounts are sharded by user id, but a uniqueness check must find a name in one place. A separate small table maps normalized name → user id and is sharded by a hash of the name, so every check and every claim touches exactly one shard.",
      ],
      remove: ["db"],
      add: [
        node("names1", "db", "Names A", 2.2, -1.6, { sub: "hash(name)" }),
        node("names2", "db", "Names B", 2.2, 0.4, { sub: "hash(name)" }),
        node("accounts", "db", "Accounts", 4.6, 2.4, { sub: "by user id" }),
      ],
      link: [both("api", "names1", 1), both("api", "names2", 1), link("api", "accounts", "write")],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Answer keystrokes from memory",
      body: [
        "Keystroke checks read a cache of taken names, refreshed as accounts are created. A cache answer is only a hint: the final click on “Create account” always goes to the name shard, where the unique index has the last word.",
      ],
      add: [node("cache", "cache", "Taken names", -1.2, -2.6, { sub: "2 GB in memory" })],
      link: [both("api", "cache", 3)],
      metrics: [
        { label: "Checks served by cache", value: "≈ 99%", tone: "good" },
        { label: "Database checks", value: "≈ 30 /s", tone: "good" },
      ],
    },
    {
      kind: "case",
      short: "Mismatch",
      uses: "transactions",
      title: "Case: “available”, then “taken”",
      body: [
        "Priya sees “available” while typing, but someone claims the name a second before she submits. Her insert fails on the unique index and she is offered three close alternatives. Rare, harmless, and never a duplicate.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "One name, one owner",
      body: ["The fast path guides people; the database guarantees the rule."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Size it", "3,000 checks/s, 2 GB of names", "Napkin math"],
          ["Find a name fast", "unique index on the normalized name", "Indexes"],
          ["No duplicates", "insert and let the index decide", "Transactions and isolation"],
          ["One place per name", "name table sharded by name hash", "Sharding"],
          ["Instant feedback", "taken-names cache as a hint", "Caching"],
        ],
      },
    },
  ],
);

export const LOYALTY_POINTS: CaseStudy = caseStudy(
  {
    id: "loyalty-points",
    title: "Loyalty points for a coffee chain",
    tagline:
      "12 million members earn points on every coffee and spend them at any of 3,000 stores. Points must never appear or vanish by mistake.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["sql-nosql", "transactions", "unique-ids", "sharding", "replication"],
    learn: [
      "Keep points as a ledger of entries",
      "Stop double spending and double earning",
      "Split years of history without splitting a member",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Earn on every coffee, spend anywhere",
      body: [
        "Each purchase earns 10 points per coffee; 300 points buy a free drink. Store tills record earning and spending; the phone app shows the balance and history.",
      ],
      add: [
        node("tills", "server", "Store tills", -4.4, -1.6, { sub: "3,000 stores" }),
        node("app", "phone", "Members' app", -4.4, 2.2, { sub: "12 M members" }),
        node("api", "service", "Points service", -1.2, 0),
      ],
      link: [both("tills", "api", 2), both("app", "api", 1)],
    },
    {
      kind: "solution",
      short: "Ledger",
      uses: "sql-nosql",
      title: "A ledger in a relational database",
      body: [
        "Points behave like money, so they live in a relational database with transactions. Every change is a ledger row (+10 earned, −300 spent). A balance row per member is updated in the same transaction, so reading a balance is instant and the ledger can always re-check it.",
      ],
      add: [node("db", "db", "Points ledger", 2.2, 0, { sub: "SQL" })],
      link: [both("api", "db", 2)],
      code: [
        "ledger(entry_id UNIQUE, member, change, store, at)",
        "balances(member PRIMARY KEY, points)",
      ],
    },
    {
      kind: "problem",
      short: "Twice",
      title: "Two stores, one balance",
      body: [
        "A member with 400 points and a shared account tries to redeem a free drink at two stores at the same moment. Both tills read 400, both approve, and the balance ends at −200.",
      ],
      set: { db: { state: "hot", badge: "−200" } },
    },
    {
      kind: "technique",
      short: "Atomic",
      uses: "transactions",
      title: "Check and spend in one step",
      body: [
        "Spending is one conditional update inside a transaction, with the ledger row written alongside. The database applies the two redemptions one at a time; the second finds only 100 points and changes nothing.",
      ],
      code: [
        "UPDATE balances SET points = points - 300",
        "  WHERE member = :m AND points >= 300",
        "-- 0 rows changed → not enough points",
      ],
      set: { db: { state: "ok", badge: "" } },
      quiz: {
        question: "Why put the “points >= 300” test inside the UPDATE instead of reading first?",
        options: [
          "It saves typing",
          "The test and the change happen atomically, so a second redemption can't use a balance that is about to change",
          "Reading balances is forbidden",
        ],
        answer: 1,
        why: "A separate read leaves a gap in which another redemption can act on the same balance. One conditional update closes it.",
      },
    },
    {
      kind: "technique",
      short: "Retries",
      uses: "unique-ids",
      title: "A till retries; points don't double",
      body: [
        "Store networks blip, so tills retry. Each purchase gets an id made by the till itself: store number, till number and a counter. The ledger's unique constraint on that id turns a retried earn into a harmless no-op.",
      ],
      notes: [{ x: -2.8, y: -3, text: "S0412-T3-000918 used once", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Shards",
      uses: "sharding",
      title: "Years of history, sharded by member",
      body: [
        "4 million purchases a day for five years is over 7 billion ledger rows. The ledger is sharded by member id: a member's balance and all their entries sit on the same shard, so every spend is still a single-shard transaction.",
      ],
      remove: ["db"],
      add: [
        node("s1", "db", "Shard 1", 2.2, -1.4, { sub: "members A" }),
        node("s2", "db", "Shard 2", 2.2, 0.6, { sub: "members B" }),
      ],
      link: [both("api", "s1", 1), both("api", "s2", 1)],
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Replicas for the app, leaders for the tills",
      body: [
        "Most traffic is members opening the app to look. Those reads go to replicas of each shard. Tills always read and write the leader. A balance in the app may be a second old, so it says “updated just now” rather than promising the exact second.",
      ],
      add: [
        node("r1", "db", "Replica 1", 4.8, -1.4, { hue: "teal" }),
        node("r2", "db", "Replica 2", 4.8, 0.6, { hue: "teal" }),
      ],
      link: [link("s1", "r1", "copy"), link("s2", "r2", "copy"), link("app", "r1", "request")],
    },
    {
      kind: "case",
      short: "Offline",
      uses: "unique-ids",
      title: "Case: a store loses its internet for an hour",
      body: [
        "The tills keep selling and store each earn with its id. When the link returns they upload the hour's 180 purchases; three had already reached us before the outage, and their ids make those duplicates disappear.",
      ],
      set: { tills: { badge: "180 queued" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Points you can trust",
      body: ["A ledger, one atomic spend, ids from the till, and shards that keep a member whole."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Money-like data", "ledger in a relational database", "SQL and NoSQL"],
          ["No double spend", "conditional update in a transaction", "Transactions and isolation"],
          ["No double earn", "till-made purchase ids, unique", "Unique IDs at scale"],
          ["Billions of rows", "sharded by member", "Sharding"],
          ["Busy app", "reads from replicas", "Replication"],
        ],
      },
    },
  ],
);

export const AUTOCOMPLETE: CaseStudy = caseStudy(
  {
    id: "autocomplete",
    title: "Search suggestions as you type",
    tagline:
      "A shopping site suggests searches after every keystroke. Suggestions must appear in under 100 ms for millions of shoppers.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["napkin-math", "indexes", "caching", "cdn"],
    learn: [
      "Count requests per keystroke",
      "Precompute the answers in a prefix tree",
      "Serve the common prefixes from the edge",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Type “sho”, see “shoes for men”",
      body: [
        "Shoppers type in the search box; after each letter the site shows the ten most popular searches starting with what they typed. The suggestions must feel instant: under 100 ms.",
      ],
      add: [
        node("shoppers", "browser", "Shoppers", -4.4, 0),
        node("api", "server", "Suggest API", -1.2, 0),
        node("db", "db", "Product titles", 2.2, 0, { sub: "5 M products" }),
      ],
      link: [both("shoppers", "api", 3), both("api", "db", 2)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "One search, six requests",
      body: [
        "2 million searches an hour at peak, each about 6 keystrokes, is 12 million suggestion requests an hour: **≈ 3,300 a second**, rising to 10,000 during a sale. Each needs an answer in well under 100 ms, including the network.",
      ],
      metrics: [
        { label: "Suggestion requests", value: "3,300–10,000 /s" },
        { label: "Time budget", value: "< 100 ms" },
      ],
    },
    {
      kind: "problem",
      short: "LIKE",
      title: "Searching titles on every keystroke",
      body: [
        "A query like “title LIKE 'sho%' ordered by popularity” scans thousands of matches and sorts them, about 400 ms. Shoppers type faster than that, and the database is at 100% CPU.",
      ],
      set: { db: { state: "hot", badge: "400 ms" } },
    },
    {
      kind: "solution",
      short: "Trie",
      uses: "indexes",
      title: "A prefix tree with the answers inside",
      body: [
        "Every hour a job builds a prefix tree (trie) from the last week's top million searches and their counts. Each node stores its own top-10 completions, so answering “sho” means walking three letters and reading a ready list. No sorting at request time.",
      ],
      remove: ["db"],
      add: [
        node("trie", "search", "Prefix tree", 2.2, 0, { sub: "top 10 per node" }),
        node("logs", "storage", "Search logs", 2.2, 2.8),
        node("build", "worker", "Hourly build", 4.8, 1.4),
      ],
      link: [both("api", "trie", 3), link("logs", "build", "copy"), link("build", "trie", "write")],
      code: ["node = root", "for ch in prefix: node = node.children[ch]", "return node.top10"],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Short prefixes are few and hot",
      body: [
        "There are only 26 one-letter and 676 two-letter prefixes, and they get most of the traffic. Their answers are kept in the API servers' memory; the tree is asked only for longer, rarer prefixes.",
      ],
      add: [node("mem", "cache", "Hot prefixes", -1.2, -2.6, { sub: "in memory" })],
      link: [both("api", "mem", 3)],
      metrics: [{ label: "Answered from memory", value: "≈ 70%", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "The same answer for everyone, at the edge",
      body: [
        "Suggestions are not personal, so the reply for a prefix can be cached by a CDN for 10 minutes and by the browser too. The page also waits 100 ms after a keystroke before asking, skipping letters typed in a quick burst.",
      ],
      add: [node("cdn", "cdn", "CDN", -2.8, 2.6)],
      unlink: ["shoppers>api"],
      link: [both("shoppers", "cdn", 3), both("cdn", "api", 1)],
      quiz: {
        question: "Which change would stop suggestions from being cached at the CDN?",
        options: [
          "Making suggestions personal to each shopper",
          "Rebuilding the tree every hour",
          "Showing 10 suggestions instead of 8",
        ],
        answer: 0,
        why: "A CDN shares one answer among everyone who asks the same URL. Personal answers differ per shopper, so they must come from the servers.",
      },
    },
    {
      kind: "case",
      short: "Launch",
      uses: "indexes",
      title: "Case: a new phone launches at noon",
      body: [
        "Searches for “nova 9” jump from zero to 50,000 an hour, but the hourly tree doesn't know them yet. A small overlay of trending searches from the last 10 minutes is merged into answers until the next build catches up.",
      ],
      add: [node("trend", "cache", "Trending (10 min)", 4.8, -1.4)],
      link: [link("logs", "trend", "event"), link("trend", "api", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Suggestions in a blink",
      body: ["Precompute, then answer from the nearest copy."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Size it", "≈ 3,300 requests/s, < 100 ms", "Napkin math"],
          ["Fast lookups", "prefix tree with top-10 per node", "Indexes"],
          ["Hot prefixes", "kept in server memory", "Caching"],
          ["Same for all", "CDN and browser caching", "Content delivery networks"],
        ],
      },
    },
  ],
);

/* ============ After Communication ============ */

export const PARCEL_TRACKING: CaseStudy = caseStudy(
  {
    id: "parcel-tracking",
    title: "Parcel tracking for a courier",
    tagline:
      "3 million parcels a day, each scanned eight times. Customers, shops and drivers all want to know where things are.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["queues", "sql-nosql", "indexes", "pubsub"],
    learn: [
      "Absorb scan bursts with a queue",
      "Store events by tracking number",
      "Fan one scan out to everyone who cares",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Every scan tells a story",
      body: [
        "Parcels are scanned at pickup, at each hub, onto a van and at the door. Customers check “where is my parcel”, shops see all their parcels, and the customer gets a message when the parcel is out for delivery.",
      ],
      add: [
        node("scanners", "phone", "Handheld scanners", -4.4, -1.6, { sub: "hubs & vans" }),
        node("api", "server", "Tracking API", -1.2, 0),
        node("customers", "browser", "Customers & shops", -4.4, 2.4),
      ],
      link: [link("scanners", "api", "write"), both("customers", "api", 2)],
      metrics: [
        { label: "Scans a day", value: "≈ 24 M" },
        { label: "Evening hub peak", value: "≈ 2,000 /s" },
      ],
    },
    {
      kind: "solution",
      short: "Queue",
      uses: "queues",
      title: "Scans go into a queue",
      body: [
        "In the evening sort, hubs scan 2,000 parcels a second. Scanners put each scan on a queue and move on; the tracking workers save scans at a steady pace. Vans out of signal keep scans on the device and send them when they reconnect.",
      ],
      add: [
        node("q", "queue", "Scan queue", -1.2, -2.6, { queue: 6 }),
        node("workers", "worker", "Scan workers", 1.8, -2.6),
      ],
      unlink: ["scanners>api"],
      link: [link("scanners", "q", "write"), link("q", "workers", "event")],
    },
    {
      kind: "solution",
      short: "Store",
      uses: "sql-nosql",
      title: "Events stored by tracking number",
      body: [
        "Scans are only ever added, never changed, and are almost always read by tracking number. A wide-column store keyed by tracking number, with each parcel's scans sorted by time, gives “the whole journey” in one read and spreads writes evenly.",
      ],
      add: [node("events", "db", "Scan events", 1.8, 0, { sub: "by tracking no." })],
      link: [link("workers", "events", "write"), both("api", "events", 2)],
      quiz: {
        question: "Why is “tracking number” a good key for the scan store?",
        options: [
          "Tracking numbers are short",
          "Nearly every read asks for one parcel's journey, and keys spread writes across the cluster",
          "It sorts parcels by weight",
        ],
        answer: 1,
        why: "Choose the key from the most common read. One parcel's scans together make the main page a single lookup.",
      },
    },
    {
      kind: "problem",
      short: "Shops",
      title: "Shops ask a different question",
      body: [
        "A shop asks: “which of my 4,000 parcels from yesterday are not yet delivered?” The scan store is keyed by parcel, so answering means reading every parcel of the day.",
      ],
      set: { events: { state: "hot", badge: "full scan" } },
    },
    {
      kind: "solution",
      short: "Index",
      uses: "indexes",
      title: "A current-status table with an index",
      body: [
        "Workers also keep one row per parcel with its latest status in a relational table, indexed on (shop, date, status). The shop's question becomes an index range read of a few hundred rows.",
      ],
      set: { events: { state: "ok", badge: "" } },
      add: [node("status", "db", "Latest status", 4.6, -1.2, { sub: "index: shop, date, status" })],
      link: [link("workers", "status", "write"), both("api", "status", 1)],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Publish each scan for whoever needs it",
      body: [
        "Workers publish “parcel scanned” events. The messaging service texts customers on “out for delivery”, the ETA service updates delivery windows, and shops' webhooks get updates. Adding a new subscriber never touches the scanners.",
      ],
      add: [
        node("bus", "stream", "Parcel events", 4.6, -3.6),
        node("sms", "service", "Messages", 2, -4.2),
        node("eta", "service", "ETA service", 5.2, 1.8),
      ],
      link: [
        link("workers", "bus", "event"),
        link("bus", "sms", "event"),
        link("bus", "eta", "event"),
      ],
    },
    {
      kind: "case",
      short: "Twice",
      uses: "queues",
      title: "Case: a driver scans the same parcel twice",
      body: [
        "Queues deliver at least once, and drivers double-scan. Each scan carries the device id and a counter, and workers skip a scan id they've already stored, so customers don't get two “out for delivery” texts.",
      ],
      notes: [{ x: -1.2, y: -4, text: "duplicate scan skipped", tone: "good" }],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every parcel accounted for",
      body: ["Queue the scans, store them the way they're read, and announce them once."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Evening bursts", "scans into a queue", "Message queues"],
          ["A parcel's journey", "wide-column store by tracking no.", "SQL and NoSQL"],
          ["Shop views", "status table with an index", "Indexes"],
          ["Texts, ETAs, webhooks", "published scan events", "Pub/sub and events"],
        ],
      },
    },
  ],
);

export const LIVE_COMMENTS: CaseStudy = caseStudy(
  {
    id: "live-comments",
    title: "Live comments under a streamed concert",
    tagline:
      "Two million people watch a concert online and comment as it happens. Everyone should see the comments scroll by within a second.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["realtime", "pubsub", "caching", "stateless"],
    learn: [
      "Push to millions of open connections",
      "Spread each comment to every server",
      "Show a readable sample, not a firehose",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Two million viewers, one comment feed",
      body: [
        "A band streams a concert. Under the video, comments scroll by. At the peak, 20,000 comments arrive a minute.",
      ],
      add: [
        node("viewers", "phone", "Viewers", -4.4, 0, { sub: "2 M" }),
        node("api", "server", "Comments API", -1.2, 0),
        node("db", "db", "Comments", 2.2, 0),
      ],
      link: [both("viewers", "api", 3), link("api", "db", "write")],
    },
    {
      kind: "problem",
      short: "Polling",
      title: "Asking every two seconds",
      body: [
        "If each viewer asks “any new comments?” every 2 seconds, that is a million requests a second, almost all answered “a few, same as everyone else got”.",
      ],
      set: { api: { state: "hot", badge: "1 M req/s" } },
      metrics: [{ label: "Polling load", value: "1,000,000 /s", tone: "bad" }],
    },
    {
      kind: "solution",
      short: "Push",
      uses: "realtime",
      title: "Keep a connection open and push",
      body: [
        "Each viewer opens one WebSocket to a fleet of connection servers. New comments are pushed down the open connections, and nothing is asked again and again. At 50,000 connections per server, 40 servers hold everyone.",
      ],
      remove: ["api"],
      add: [
        node("c1", "gateway", "Connection server 1", -1.2, -1.2),
        node("c2", "gateway", "Connection server 2", -1.2, 1.2, { sub: "… ×40" }),
      ],
      link: [
        link("c1", "viewers", { kind: "event", rate: 3 }),
        link("c2", "viewers", { kind: "event", rate: 3 }),
        link("viewers", "c1", "write"),
      ],
    },
    {
      kind: "solution",
      short: "Fan-out",
      uses: "pubsub",
      title: "One topic per stream",
      body: [
        "A comment arrives at one connection server, but its viewers are spread over forty. The server publishes it on the concert's topic; every connection server subscribes and forwards it to its own viewers.",
      ],
      add: [node("topic", "stream", "Concert topic", 2.2, 0)],
      link: [
        link("c1", "topic", "event"),
        link("topic", "c1", "event"),
        link("topic", "c2", "event"),
        link("topic", "db", "write"),
      ],
      quiz: {
        question: "Why can't a connection server just send the comment to its own viewers?",
        options: [
          "Comments must be stored first",
          "Most viewers are connected to other servers; the topic carries the comment to all of them",
          "WebSockets only work one way",
        ],
        answer: 1,
        why: "Each server knows only its own connections. Publishing to a shared topic reaches every server that has viewers of this stream.",
      },
    },
    {
      kind: "insight",
      short: "Sample",
      uses: "realtime",
      title: "No one can read 333 comments a second",
      body: [
        "Sending every comment to every viewer would be 333 messages a second each, unreadable and costly. Each viewer gets a sample of about 5 a second, plus every comment from friends and the band's own posts.",
      ],
      metrics: [
        { label: "Comments arriving", value: "≈ 333 /s" },
        { label: "Shown per viewer", value: "≈ 5 /s", tone: "good" },
      ],
    },
    {
      kind: "solution",
      short: "Recent",
      uses: "caching",
      title: "Newcomers get the last 50 from a cache",
      body: [
        "Someone joining mid-song should see recent comments at once. The last 50 comments per stream are kept in a cache; joining reads them in one step instead of querying the database.",
      ],
      add: [node("recent", "cache", "Last 50 comments", 2.2, -2.6)],
      link: [link("topic", "recent", "write"), link("recent", "c2", "copy")],
    },
    {
      kind: "case",
      short: "Crash",
      uses: "stateless",
      title: "Case: a connection server dies",
      body: [
        "Server 1 restarts. Its 50,000 viewers reconnect, through the load balancer, to the other servers within seconds and load the last 50 comments from the cache. Because the servers keep nothing but open sockets, nothing is lost.",
      ],
      set: { c1: { state: "down", badge: "restarting" } },
      add: [node("lb", "lb", "Load balancer", -4.4, -2.6)],
      link: [link("viewers", "lb", "request"), link("lb", "c2", "request")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Comments that keep up with the music",
      body: ["Push instead of poll, a topic to reach every server, and a readable sample."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["No polling storm", "WebSockets and push", "Real-time updates"],
          ["Reach every server", "one topic per stream", "Pub/sub and events"],
          ["Join mid-show", "last 50 comments cached", "Caching"],
          ["Survive restarts", "servers that hold only sockets", "Stateless services"],
        ],
      },
    },
  ],
);

/* ============ After Reliability ============ */

export const PARTNER_API_LIMITS: CaseStudy = caseStudy(
  {
    id: "partner-api-limits",
    title: "Calling a partner API with a strict limit",
    tagline:
      "A travel site gets flight prices from an airline that allows 50 calls a second. Go over, and you are blocked for an hour.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["caching", "rate-limiting", "queues", "timeouts-retries"],
    learn: [
      "Limit your own outgoing calls",
      "Save the budget for people who are waiting",
      "Back off politely when told to",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "50 calls a second, no more",
      body: [
        "Every flight search asks the airline's price API. The contract allows 50 calls a second per key; above that the API answers 429 “Too many requests”, and repeated breaches block the key for an hour.",
      ],
      add: [
        node("users", "browser", "Travellers", -4.4, 0),
        node("search", "server", "Search servers", -1.2, 0, { sub: "×8" }),
        node("airline", "internet", "Airline price API", 2.6, 0, { sub: "50 calls/s" }),
      ],
      link: [both("users", "search", 3), both("search", "airline", 2)],
    },
    {
      kind: "problem",
      short: "Blocked",
      title: "Sale day: retries make it worse",
      body: [
        "A fare sale brings 200 searches a second. Calls fail with 429, each server retries at once, the airline sees 400 calls a second, and blocks the key. For an hour no one can search that airline.",
      ],
      set: { airline: { state: "down", badge: "blocked 1 h" }, search: { state: "hot" } },
      link: [link("search", "airline", "fail")],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Popular routes from a cache",
      body: [
        "Many travellers search the same routes and dates. Prices are cached for 2 minutes per route and date, shown with “prices checked 1 minute ago” and re-confirmed at booking. Calls fall from 200 to about 60 a second.",
      ],
      set: { airline: { state: "ok", badge: "" }, search: { state: "ok" } },
      add: [node("cache", "cache", "Price cache", -1.2, -2.6, { sub: "2 min" })],
      link: [both("search", "cache", 3), both("search", "airline", 2)],
      metrics: [{ label: "Calls to airline", value: "200 → 60 /s" }],
    },
    {
      kind: "solution",
      short: "Bucket",
      uses: "rate-limiting",
      title: "Our own token bucket, shared by all servers",
      body: [
        "Before calling, a server takes a token from a shared bucket refilled at 45 a second (keeping headroom under 50). With no token, it waits up to 200 ms or answers from the cache. The airline never sees more than we allowed ourselves.",
      ],
      add: [node("bucket", "lock", "Token bucket", 1, -2.6, { sub: "45 /s" })],
      link: [both("search", "bucket", 2)],
    },
    {
      kind: "solution",
      short: "Priority",
      uses: "queues",
      title: "Background calls wait their turn",
      body: [
        "Price alerts and overnight refreshes are not urgent. They go on a queue that a worker drains using only the tokens travellers aren't using, so a person waiting always comes first.",
      ],
      add: [
        node("bgq", "queue", "Background calls", 1, 2.6, { queue: 5 }),
        node("bg", "worker", "Background worker", 3.8, 2.6),
      ],
      link: [link("bgq", "bg", "event"), link("bg", "bucket", "request")],
    },
    {
      kind: "technique",
      short: "Back off",
      uses: "timeouts-retries",
      title: "Retry slowly, and only a little",
      body: [
        "If a 429 still arrives, servers honour the Retry-After header, then retry at most twice with growing, randomized waits. Calls time out after 2 seconds, so a slow airline doesn't tie up our servers.",
      ],
      code: ["wait = retry_after or base * 2 ** attempt", "sleep(wait + random(0, wait / 2))"],
      quiz: {
        question: "Why add a random part to each server's wait before retrying?",
        options: [
          "To make the code harder to read",
          "So the eight servers don't all retry at the same instant and hit the limit together again",
          "Random waits are always shorter",
        ],
        answer: 1,
        why: "Without jitter, failures that happened together retry together. Spreading the retries out keeps them under the limit.",
      },
    },
    {
      kind: "case",
      short: "Slow",
      uses: "timeouts-retries",
      title: "Case: the airline answers in 5 seconds",
      body: [
        "The airline's API slows down. Calls hit the 2-second timeout, and travellers see cached prices marked “from 3 minutes ago, confirmed at booking”. Searches stay fast, and we stay inside the limit.",
      ],
      set: { airline: { state: "hot", badge: "5 s" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A good neighbour to the airline",
      body: ["Ask less, limit yourself, queue what can wait, and back off when told."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Fewer calls", "2-minute price cache", "Caching"],
          ["Stay under 50/s", "shared token bucket at 45/s", "Rate limiting"],
          ["People first", "background calls on a queue", "Message queues"],
          ["Polite failures", "Retry-After, jitter, 2 s timeout", "Timeouts and retries"],
        ],
      },
    },
  ],
);
