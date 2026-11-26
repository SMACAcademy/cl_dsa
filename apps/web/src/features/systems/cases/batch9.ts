import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const CYCLONE_WARNING: CaseStudy = caseStudy(
  {
    id: "cyclone-warning",
    title: "A weather app during a cyclone warning",
    tagline:
      "A cyclone is 300 km from the coast. Twelve million people open the same app on slow, crowded mobile networks.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "request-journey", "latency-throughput"],
    learn: [
      "Estimate a surge from a population",
      "See what a slow network does to each request",
      "Make the critical answer small and fast",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Warning issued at 6 pm",
      body: [
        "A state weather service's app shows the cyclone's track, warnings by district, and shelter locations. When the warning goes out, people along the coast open it again and again; mobile networks are crowded and some towers are already on battery.",
      ],
      add: [
        node("people", "phone", "Coastal residents", -4.4, 0, { sub: "12 M" }),
        node("api", "server", "Weather app API", 0, 0),
        node("model", "db", "Forecast data", 3.4, 0),
      ],
      link: [both("people", "api", 3), both("api", "model", 2)],
    },
    {
      kind: "technique",
      short: "Surge",
      uses: "napkin-math",
      title: "How many requests?",
      body: [
        "Say 4 million phones open the app in the first hour and refresh every 5 minutes: 4,000,000 × 12 refreshes ÷ 3,600 s ≈ **13,000 requests a second**, on a service that normally sees 40.",
      ],
      metrics: [
        { label: "Normal", value: "40 /s" },
        { label: "Warning hour", value: "≈ 13,000 /s", tone: "bad" },
      ],
      set: { api: { state: "hot" } },
    },
    {
      kind: "insight",
      short: "Slow network",
      uses: "request-journey",
      title: "A crowded tower changes everything",
      body: [
        "On a congested 3G link, one round trip takes 800 ms. The app's home screen makes 6 calls one after another (warnings, track, shelters, map tiles…): nearly **5 seconds** before anything useful appears, and many people give up and retry, adding load.",
      ],
      table: {
        head: ["Network", "Round trip", "6 calls in a row"],
        rows: [
          ["Home Wi-Fi", "30 ms", "0.2 s"],
          ["Crowded 3G", "800 ms", "4.8 s"],
        ],
      },
    },
    {
      kind: "solution",
      short: "One call",
      uses: "request-journey",
      title: "One request for what matters",
      body: [
        "A single `/warning/{district}` call returns everything needed to act: alert level, expected landfall time, nearest three shelters. It's 3 KB. One round trip, even on a bad network: under a second.",
      ],
      code: [
        "GET /warning/chennai",
        '{ "level": "red", "landfall": "02:00", "shelters": [ … 3 nearest … ] }',
      ],
    },
    {
      kind: "technique",
      short: "Bytes",
      uses: "latency-throughput",
      title: "Small answers serve more people",
      body: [
        "The old home screen was 1.2 MB. 13,000 × 1.2 MB ≈ 15 GB a second; the 3 KB warning is about 40 MB a second. On a shared tower, a smaller answer means more people get theirs.",
      ],
      quiz: {
        question: "Why does shrinking the answer help people on the same crowded tower?",
        options: [
          "Smaller answers are more accurate",
          "The tower's capacity is shared; fewer bytes per person means more people served per second",
          "It doesn't; only the server matters",
        ],
        answer: 1,
        why: "Throughput is shared. Cutting bytes per request raises how many requests the link can complete.",
      },
      metrics: [{ label: "Bandwidth", value: "15 GB/s → 40 MB/s", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Precompute",
      uses: "latency-throughput",
      title: "Precompute per district",
      body: [
        "There are only 38 districts. A job builds the 38 warning answers whenever the forecast updates (every 15 minutes), so each request is a file read: no queries, a few milliseconds each.",
      ],
      add: [
        node("builder", "worker", "Warning builder", 3.4, -2.2, { sub: "38 files, every 15 min" }),
      ],
      unlink: ["api>model"],
      link: [link("model", "builder", "request"), link("builder", "api", "write")],
      set: { api: { state: "ok" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast when it matters most",
      body: [
        "≈ 13,000 requests a second from a normally quiet service.",
        "Slow networks punish many round trips: one call carries what matters.",
        "Small answers let a shared network serve more people.",
        "38 precomputed answers instead of millions of queries.",
      ],
    },
  ],
);

/* ============ After Scaling ============ */

export const PODCAST_HIT: CaseStudy = caseStudy(
  {
    id: "podcast-hit",
    title: "A podcast host with one hit episode",
    tagline:
      "A small podcast host's episode goes viral overnight. Three million downloads, one origin server, and a bandwidth bill.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "cdn", "caching", "scale-up-out"],
    learn: [
      "Turn downloads into bandwidth and cost",
      "Serve big files from a CDN",
      "Cache feeds that apps poll constantly",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Two thousand shows on one server",
      body: [
        "A hosting service for 2,000 small podcasts runs on one server with attached storage. Podcast apps check each show's RSS feed every hour and download new episodes. Then a true-crime episode is shared by a famous actor.",
      ],
      add: [
        node("apps", "phone", "Podcast apps", -4.4, 0),
        node("origin", "server", "Host server", 0, 0, { sub: "feeds + audio" }),
        node("disk", "storage", "Episode files", 3.2, 0),
      ],
      link: [both("apps", "origin", 3), both("origin", "disk", 2)],
    },
    {
      kind: "technique",
      short: "Bandwidth",
      uses: "napkin-math",
      title: "What three million downloads means",
      body: [
        "The episode is 60 MB. 3,000,000 × 60 MB = **180 TB** in two days, about 8 Gbit/s on average and much more in the first hours. The server has a 1 Gbit/s link.",
      ],
      metrics: [
        { label: "Data", value: "180 TB" },
        { label: "Needed", value: "≈ 8 Gbit/s avg", tone: "bad" },
        { label: "Server link", value: "1 Gbit/s", tone: "bad" },
      ],
      set: { origin: { state: "down", badge: "link saturated" } },
    },
    {
      kind: "solution",
      short: "CDN",
      uses: "cdn",
      title: "Audio files from the edge",
      body: [
        "Episode files never change once published, so they're served through a CDN with a long cache time. The first listener in a city pulls the file to the nearby edge; everyone after gets it from there.",
      ],
      add: [node("cdn", "cdn", "CDN edges", -2, -2.4, { sub: "audio, 1 year" })],
      link: [
        link("apps", "cdn", "request", { kind: "heavy", back: true, rate: 3 }),
        link("cdn", "origin", "request"),
      ],
      set: { origin: { state: "ok", badge: "" } },
    },
    {
      kind: "technique",
      short: "Feeds",
      uses: "caching",
      title: "Millions of feed checks",
      body: [
        'Every app checks every subscribed feed hourly, and most answers are "nothing new". Feeds are cached for 5 minutes at the edge, and the server answers `304 Not Modified` when the app already has the latest version: a few hundred bytes instead of the whole feed.',
      ],
      quiz: {
        question: "A new episode is published. How long until apps see it?",
        options: [
          "Up to an hour",
          "Up to 5 minutes plus the app's own check interval",
          "Instantly",
        ],
        answer: 1,
        why: "The edge copy may be up to 5 minutes old, and each app only checks on its own schedule. A short TTL keeps that delay small.",
      },
    },
    {
      kind: "insight",
      short: "Cost",
      uses: "napkin-math",
      title: "The bill",
      body: [
        "At about $0.02 per GB from a CDN, 180 TB costs around **$3,600**. From the old server it would have cost nothing and served almost nobody. A price per GB lets the host charge popular shows fairly.",
      ],
    },
    {
      kind: "solution",
      short: "Origin",
      uses: "scale-up-out",
      title: "A small origin is enough",
      body: [
        "With audio and feeds at the edge, the origin only handles uploads, cache misses and the dashboard. Instead of a bigger server, files move to object storage and two small servers sit behind it for redundancy.",
      ],
      add: [node("origin2", "server", "Host server 2", 0, 2.2)],
      link: [both("origin2", "disk", 1), link("cdn", "origin2", "request")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Viral, and still up",
      body: ["Big unchanging files belong at the edge; the origin stays small."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Size the spike", "180 TB, ≈ 8 Gbit/s", "Napkin math"],
          ["Serve audio", "CDN with long cache", "CDNs"],
          ["Hourly feed checks", "5-minute edge cache + 304", "Caching"],
          ["Keep the origin small", "two small servers, not one big one", "Scale up or out"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const PRODUCT_CATALOGUE: CaseStudy = caseStudy(
  {
    id: "product-catalogue",
    title: "An e-commerce product catalogue",
    tagline:
      "Two million products with wildly different attributes, filtered by shoppers in milliseconds. Choose the model, the indexes and the caches.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["sql-nosql", "indexes", "caching", "cdn", "replication"],
    learn: [
      "Model products with shared and varying attributes",
      "Index for the filters shoppers use",
      "Cache pages, not just rows",
      "Serve images from the edge",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Phones, saris and garden hoses",
      body: [
        "An online store lists 2 million products. A phone has storage and screen size; a sari has fabric and length; a hose has diameter. Shoppers filter by brand, price, rating and these attributes, and expect results instantly.",
      ],
      add: [
        node("shoppers", "browser", "Shoppers", -4.6, 0),
        node("web", "server", "Store web", -1.4, 0),
        node("db", "db", "Catalogue DB", 2.2, 0),
      ],
      link: [both("shoppers", "web", 3), both("web", "db", 3)],
    },
    {
      kind: "technique",
      short: "Model",
      uses: "sql-nosql",
      title: "Fixed columns plus a flexible part",
      body: [
        "Every product has the same core: id, title, brand, category, price, rating, stock. Those are ordinary columns. Category-specific attributes go in a JSON column, validated per category, instead of hundreds of mostly empty columns or a table per category.",
      ],
      code: [
        "products(id, title, brand, category, price, rating, attrs JSONB)",
        '-- attrs for a phone: { "storage_gb": 256, "screen_in": 6.1 }',
      ],
    },
    {
      kind: "technique",
      short: "Indexes",
      uses: "indexes",
      title: "Index what shoppers filter on",
      body: [
        'Most browsing is "category, sorted by popularity or price": an index on `(category, price)` and one on `(category, rating)`. The JSON attributes get a general index, so "phones with 256 GB" doesn\'t scan every phone.',
      ],
      quiz: {
        question: 'Shoppers in "Phones" sort by price. Which index helps most?',
        options: ["(price)", "(category, price)", "(title)"],
        answer: 1,
        why: "Filter column first, sort column second: the database jumps to Phones and reads them already in price order.",
      },
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Reads go to replicas",
      body: [
        "Browsing is 99% reads. The primary takes price and stock updates from sellers; two replicas serve shoppers. A few seconds of delay on a rating is fine; checkout reads stock from the primary.",
      ],
      add: [node("rep", "db", "Read replicas", 2.2, 2.6, { hue: "teal" })],
      link: [link("db", "rep", "copy"), both("web", "rep", 3)],
    },
    {
      kind: "solution",
      short: "Page cache",
      uses: "caching",
      title: "Cache whole listing pages",
      body: [
        '"Phones, page 1, sorted by popularity" is requested 50,000 times an hour with identical results. The rendered result list is cached for 60 seconds; personal parts (cart, recently viewed) are added in the browser.',
      ],
      add: [node("cache", "cache", "Listing cache", -1.4, -2.4, { sub: "60 s" })],
      link: [both("web", "cache", 3)],
      metrics: [{ label: "Listing hit rate", value: "≈ 92%", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Images",
      uses: "cdn",
      title: "Product images from the edge",
      body: [
        "Each product has 6 photos, resized to 4 sizes. Images are 80% of the bytes on a listing page; they're served by a CDN with versioned URLs, so a new photo gets a new address.",
      ],
      add: [node("cdn", "cdn", "Image CDN", -4.6, -2.4)],
      link: [link("shoppers", "cdn", "request", { kind: "heavy", back: true, rate: 3 })],
    },
    {
      kind: "case",
      short: "Price drop",
      uses: "caching",
      title: "Case: a price is wrong",
      body: [
        "A seller lists a laptop at ₹4,999 instead of ₹49,999. They fix it within a minute, but listings cached for 60 seconds still show the old price. Checkout always reads the current price, so nobody pays the wrong one; the cache entry for that category is also cleared on price changes.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Flexible products, fast filters",
      body: [
        "A stable core, flexible attributes, indexes for real filters, caches for repeated pages.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Varied attributes", "core columns + JSON", "SQL and NoSQL"],
          ["Fast filters", "(category, price/rating) indexes", "Indexes"],
          ["Read-heavy", "read replicas", "Replication"],
          ["Repeated listings", "60-second page cache", "Caching"],
          ["Heavy images", "CDN with versioned URLs", "CDNs"],
        ],
      },
    },
  ],
);

export const GAME_LEADERBOARD: CaseStudy = caseStudy(
  {
    id: "game-leaderboard",
    title: "Leaderboards for a mobile game",
    tagline:
      "Thirty million players, a global top 100, a rank for everyone, and weekly resets. Fast ranks without scanning millions of scores.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["caching", "sharding", "indexes", "sql-nosql", "replication"],
    learn: [
      "Rank players with a sorted set",
      "Split leaderboards so none grows too large",
      "Keep the true scores in a database",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: '"You are #48,213 in the world"',
      body: [
        "A puzzle game shows the global top 100, each player's own rank, and their friends' ranks. 30 million players finish about 2,000 games a second. Scores reset every Monday.",
      ],
      add: [
        node("players", "phone", "Players", -4.4, 0, { sub: "30 M" }),
        node("game", "service", "Game service", -1, 0),
        node("db", "db", "Scores DB", 2.6, 0),
      ],
      link: [both("players", "game", 3), link("game", "db", "write")],
    },
    {
      kind: "problem",
      short: "Rank query",
      uses: "indexes",
      title: '"What\'s my rank?" is expensive',
      body: [
        "With an index on score, the top 100 is quick. But a player's rank means counting everyone with a higher score: for a mid-table player that's 15 million rows counted, for every request.",
      ],
      code: [
        "SELECT COUNT(*) FROM scores WHERE week = :w AND score > :mine;   -- millions of rows",
      ],
      set: { db: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Sorted set",
      uses: "caching",
      title: "Ranks from an in-memory sorted set",
      body: [
        "An in-memory sorted set keeps every player ordered by score. Adding a score and finding a player's rank both take about log₂(30 M) ≈ 25 steps, under a millisecond. The top 100 is a range read.",
      ],
      quiz: {
        question: 'Why is a sorted set fast for "what\'s my rank"?',
        options: [
          "It keeps a count in each part of its ordered structure, so rank is found by walking down, not by counting everyone",
          "It caches the answer for each player",
          "It only stores the top 100",
        ],
        answer: 0,
        why: "Ordered structures like skip lists or balanced trees can track sizes as they go, turning a count of millions into a few dozen steps.",
      },
      add: [node("board", "cache", "Leaderboard", -1, -2.6, { sub: "sorted set" })],
      link: [both("game", "board", 3)],
      set: { db: { state: "ok" } },
    },
    {
      kind: "technique",
      short: "Source",
      uses: "sql-nosql",
      title: "The database stays the source of truth",
      body: [
        "Every game result is also written to the scores database. If the in-memory leaderboard is lost, it's rebuilt from this week's scores in a few minutes. Rewards at the end of the week are paid from the database, not the cache.",
      ],
    },
    {
      kind: "technique",
      short: "Split",
      uses: "sharding",
      title: "Split boards by region and league",
      body: [
        "One set of 30 million is fine for memory, but every write hits one machine. Players are also ranked in their region and league (100 players each), which most care about more. Regional boards are spread across machines; the global board keeps only scores above a threshold.",
      ],
      add: [node("boardEU", "cache", "Region boards", 2.6, -2.6, { sub: "one per region" })],
      link: [link("game", "boardEU", "write")],
    },
    {
      kind: "solution",
      short: "Reset",
      uses: "replication",
      title: "Monday reset without a gap",
      body: [
        "Each week's board has its own key (`board:2026-w48`). On Monday a new key starts empty while last week's stays readable for results; the old key is copied to the database archive and expired after a week.",
      ],
      add: [node("archive", "db", "Weekly archive", 5.2, 0, { hue: "teal" })],
      link: [link("db", "archive", "copy")],
    },
    {
      kind: "case",
      short: "Cheater",
      uses: "indexes",
      title: "Case: an impossible score",
      body: [
        "A player posts a score ten times the record. Scores above a plausibility limit are held for review instead of entering the board; an index on `(week, score)` lets moderators list the top suspicious ones in a moment.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Ranks in a millisecond",
      body: ["Memory for ranking, the database for truth, keys per week, boards per region."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Counting is slow", "an index can't count fast enough", "Indexes"],
          ["Any player's rank", "in-memory sorted set", "Caching"],
          ["Survive a lost board", "scores in the database", "SQL and NoSQL"],
          ["Spread the writes", "regional and league boards", "Sharding"],
          ["Weekly reset", "a key per week, archived", "Replication"],
        ],
      },
    },
  ],
);

export const FEATURE_FLAGS: CaseStudy = caseStudy(
  {
    id: "feature-flags",
    title: "A feature-flag configuration store",
    tagline:
      'Three hundred services ask "is this feature on?" thousands of times a second. Changes must be safe, fast and consistent.',
    minutes: 9,
    level: "advanced",
    tier: "integrate",
    concepts: ["consensus", "replication", "caching", "cap"],
    learn: [
      "Keep config in a consensus-backed store",
      "Push changes to local caches",
      "Decide what happens when the store is unreachable",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Switches for every feature",
      body: [
        'A company turns features on and off without deploying: "new checkout for 10% of users in India", "kill switch for recommendations". 300 services check flags on almost every request.',
      ],
      add: [
        node("admins", "browser", "Flag dashboard", -4.6, -1.6),
        node("services", "service", "300 services", -4.6, 1.6),
        node("store", "db", "Flag store", 0, 0),
      ],
      link: [link("admins", "store", "write"), both("services", "store", 3)],
    },
    {
      kind: "technique",
      short: "Consensus",
      uses: "consensus",
      title: "A small store that agrees on every change",
      body: [
        "Flags are few (a few thousand) but must never disagree between machines. They live in a three-node store that uses consensus: a change is committed once a majority accepts it, and every node applies changes in the same order.",
      ],
      add: [
        node("n2", "db", "Flag store 2", 2.4, -1.6, { size: 0.8 }),
        node("n3", "db", "Flag store 3", 2.4, 1.6, { size: 0.8 }),
      ],
      link: [link("store", "n2", "copy"), link("store", "n3", "copy")],
      set: { store: { label: "Flag store 1", badge: "leader" } },
    },
    {
      kind: "problem",
      short: "Too many reads",
      uses: "caching",
      title: "Millions of checks a second",
      body: [
        "300 services × thousands of checks a second each would swamp a three-node store built for safe writes, not huge read volume. Each service keeps **all flags in memory** and evaluates them locally: a check costs microseconds.",
      ],
      add: [node("local", "cache", "Local flag copy", -2.2, 2.6, { sub: "in each service" })],
      unlink: ["services>store"],
      link: [both("services", "local", 4)],
    },
    {
      kind: "solution",
      short: "Push",
      uses: "replication",
      title: "Changes are streamed out",
      body: [
        "Each service subscribes to the store's change stream. When a flag changes, every service gets the new version within a second or two. On start-up, a service loads a full snapshot first.",
      ],
      link: [link("store", "local", { kind: "event", rate: 2 })],
      quiz: {
        question: "A service restarts while the flag store is down. What should it do?",
        options: [
          "Refuse to start",
          "Start with the last snapshot saved on disk (or safe defaults), and update when the store returns",
          "Turn every feature on",
        ],
        answer: 1,
        why: "Flags should fail safe: a slightly stale configuration is better than an outage or every risky feature switched on.",
      },
    },
    {
      kind: "tradeoff",
      short: "Partition",
      uses: "cap",
      title: "When the store is unreachable",
      body: [
        "For **writes** the store chooses consistency: without a majority, it refuses changes rather than letting two halves disagree. For **reads**, services choose availability: they keep using their local copy, which may be stale.",
      ],
      set: { n3: { state: "down" } },
    },
    {
      kind: "case",
      short: "Kill switch",
      uses: "replication",
      title: "Case: switching off a bad feature",
      body: [
        "New recommendations are crashing the mobile app. An engineer flips the kill switch; within two seconds all 300 services see it, without a deploy. The change and who made it are recorded.",
      ],
      set: { n3: { state: "ok" }, admins: { badge: "kill switch: on" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Safe to change, fast to read",
      body: ["Consensus for the few writes, local memory for the many reads."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Never disagree", "three-node consensus store", "Consensus"],
          ["Microsecond checks", "all flags in each service's memory", "Caching"],
          ["Changes in seconds", "change stream + snapshots", "Replication"],
          ["Store unreachable", "refuse writes, read local copy", "CAP"],
        ],
      },
      set: { admins: { badge: "" } },
    },
  ],
);

/* ============ After Communication ============ */

export const STOCK_TICKER: CaseStudy = caseStudy(
  {
    id: "stock-ticker",
    title: "Live stock prices on a million screens",
    tagline:
      "Prices change hundreds of times a second during market hours. Every open app should show them live without melting the servers.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["realtime", "pubsub", "caching", "cdn", "load-balancing"],
    learn: [
      "Fan out price ticks to subscribed screens",
      "Send only what each screen watches",
      "Throttle updates people can't see anyway",
      "Serve charts from caches",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "9:15 am, market open",
      body: [
        "An investing app shows live prices for 5,000 listed shares. At market open, a million people have the app open, each watching a watchlist of about 20 shares.",
      ],
      add: [
        node("exchange", "internet", "Exchange feed", -4.6, -2),
        node("ingest", "service", "Price ingest", -1.6, -2),
        node("users", "phone", "App users", -4.6, 2, { sub: "1 M" }),
      ],
      link: [link("exchange", "ingest", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Topics",
      uses: "pubsub",
      title: "One topic per share",
      body: [
        "Ingest publishes each tick on a topic named after the share (`price.TCS`). Anything interested in a share subscribes to its topic; ingest doesn't need to know who's listening.",
      ],
      add: [node("bus", "stream", "Price topics", 1.2, -2, { sub: "5,000 topics" })],
      link: [link("ingest", "bus", { kind: "event", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Push",
      uses: "realtime",
      title: "WebSockets for the watchlist",
      body: [
        "Each app opens a WebSocket to a gateway and says which 20 shares it watches. The gateway subscribes to those topics and pushes each new price to that app.",
      ],
      add: [node("ws", "gateway", "Live gateways", 1.2, 2, { sub: "WebSockets" })],
      link: [
        link("bus", "ws", { kind: "event", rate: 3 }),
        link("ws", "users", { kind: "event", rate: 4 }),
      ],
    },
    {
      kind: "technique",
      short: "Throttle",
      uses: "realtime",
      title: "No more than 4 updates a second per share",
      body: [
        "A busy share can tick 200 times a second, but nobody can read that fast. Gateways send at most 4 updates a second per share, always the latest price. That cuts traffic by up to 50 times with no visible difference.",
      ],
      quiz: {
        question: "Throttled to 4 updates a second, which price does the user see?",
        options: [
          "The first tick in each quarter-second",
          "The latest price at each quarter-second",
          "An average",
        ],
        answer: 1,
        why: "For a live display, only the most recent value matters; intermediate ticks can be skipped safely.",
      },
    },
    {
      kind: "solution",
      short: "Spread",
      uses: "load-balancing",
      title: "A million connections over many gateways",
      body: [
        "Each gateway holds about 50,000 connections, so 20 gateways sit behind a load balancer. Long-lived connections are balanced by count, not by requests, and a reconnecting app may land on any gateway.",
      ],
      add: [node("lb", "lb", "Load balancer", -1.6, 2)],
      unlink: ["ws>users"],
      link: [
        link("ws", "lb", { kind: "event", rate: 3 }),
        link("lb", "users", { kind: "event", rate: 4 }),
      ],
    },
    {
      kind: "solution",
      short: "Charts",
      uses: "caching",
      title: "Charts from caches",
      body: [
        "Opening a share shows today's chart: thousands of points. One-minute candles are computed once and cached; the chart loads from cache and live ticks extend it. Historical charts (1 year, 5 years) are static files on a CDN.",
      ],
      add: [
        node("candles", "cache", "Candle cache", 4, -2),
        node("cdn", "cdn", "History on CDN", 4, 2),
      ],
      link: [link("bus", "candles", "event"), link("cdn", "users", "heavy")],
    },
    {
      kind: "case",
      short: "Halt",
      uses: "cdn",
      title: "Case: trading is halted",
      body: [
        'The exchange halts trading for an hour. Prices stop; apps show "Trading halted" from a status message pushed on a special topic. History charts keep loading from the CDN, so the app stays useful.',
      ],
      set: { exchange: { state: "dim", badge: "halted" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A million live screens",
      body: ["Topics per share, sockets per watchlist, throttled to what eyes can read."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Who gets which price", "a topic per share", "Pub/sub"],
          ["Live on screen", "WebSocket per app", "Real-time updates"],
          ["1 M connections", "20 gateways behind a balancer", "Load balancing"],
          ["Today's chart", "cached candles", "Caching"],
          ["Long history", "static files on a CDN", "CDNs"],
        ],
      },
      set: { exchange: { state: "ok", badge: "" } },
    },
  ],
);
