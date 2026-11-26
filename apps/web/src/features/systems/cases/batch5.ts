import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const COURSE_REGISTRATION: CaseStudy = caseStudy(
  {
    id: "course-registration",
    title: "University course registration opens",
    tagline:
      "At 9:00 sharp, 30,000 students try to grab seats in popular courses. Size the rush before it happens.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "latency-throughput", "request-journey"],
    learn: [
      "Estimate a burst from a deadline",
      "Spot the slow part of one request",
      "Predict queueing before it happens",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Everyone at 9:00",
      body: [
        "A university opens course registration at 9:00. 30,000 students want seats; the popular electives fill in minutes. Last year the portal froze for 40 minutes.",
      ],
      add: [
        node("students", "user", "Students", -4.4, 0, { sub: "30,000" }),
        node("portal", "server", "Registration portal", 0, 0, { sub: "2 servers" }),
        node("db", "db", "Courses DB", 3.2, 0),
      ],
      link: [both("students", "portal", 2), both("portal", "db", 2)],
    },
    {
      kind: "technique",
      short: "The burst",
      uses: "napkin-math",
      title: "30,000 students in 3 minutes",
      body: [
        "Each student does about 15 actions (sign in, search, add three courses, swap, confirm). 30,000 × 15 = 450,000 requests, and most arrive in the first three minutes: 450,000 ÷ 180 s ≈ **2,500 a second**.",
        "The two servers handle about 600 a second together.",
      ],
      quiz: {
        question:
          "If the same 450,000 requests were spread over a whole day, what rate would that be?",
        options: ["About 5 a second", "About 50 a second", "About 500 a second"],
        answer: 0,
        why: "450,000 ÷ ~100,000 s ≈ 4.5 a second. The deadline compresses a trivial daily load into a burst 500 times bigger.",
      },
      metrics: [
        { label: "Peak", value: "≈ 2,500 /s", tone: "bad" },
        { label: "Capacity", value: "≈ 600 /s", tone: "bad" },
      ],
      set: { portal: { state: "hot", queue: 8 } },
    },
    {
      kind: "insight",
      short: "Slow part",
      uses: "request-journey",
      title: 'Trace one "add course" click',
      body: [
        'One click takes 40 ms of network, 5 ms of code, and **350 ms in the database**: the "check prerequisites" query scans the student\'s whole transcript every time.',
        "The network isn't the problem here: the database is.",
      ],
      table: {
        head: ["Hop", "Time"],
        rows: [
          ["Network round trips", "40 ms"],
          ["Server code", "5 ms"],
          ["Prerequisite query", "350 ms"],
        ],
      },
      set: { db: { state: "hot", badge: "350 ms query" } },
    },
    {
      kind: "problem",
      short: "In flight",
      uses: "latency-throughput",
      title: "Little's law at 9:00:30",
      body: [
        "2,500 requests a second × 0.4 s each = **1,000 requests in flight**, but the database allows 200 connections. The rest queue; waiting adds latency, which adds more requests in flight. A spiral.",
      ],
      metrics: [
        { label: "In flight", value: "1,000", tone: "bad" },
        { label: "DB connections", value: "200", tone: "bad" },
      ],
    },
    {
      kind: "insight",
      short: "Faster query",
      uses: "latency-throughput",
      title: "Shorter requests shrink everything",
      body: [
        "If the prerequisite check took 20 ms instead of 350 (precomputed per student overnight), each request would take about 65 ms: 2,500 × 0.065 ≈ **160 in flight**, under the connection limit.",
        "Making each request shorter can matter as much as adding servers.",
      ],
      metrics: [
        { label: "Per request", value: "65 ms", tone: "good" },
        { label: "In flight", value: "≈ 160", tone: "good" },
      ],
      set: { db: { state: "ok", badge: "precomputed" } },
    },
    {
      kind: "technique",
      short: "Headroom",
      uses: "napkin-math",
      title: "How many servers?",
      body: [
        "With the faster query, one server handles about 800 a second. 2,500 ÷ (800 × 0.7) ≈ 4.5, so run **six** for headroom and a failure, started before 8:45.",
      ],
      set: { portal: { state: "ok", queue: 0, sub: "6 servers from 8:45" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The plan for 9:00",
      body: [
        "The deadline turns a tiny daily load into ≈ 2,500 req/s.",
        "Tracing one click showed the database query was the slow part.",
        "Shorter requests keep in-flight work under the connection limit.",
        "Six servers at about 70% busy, started early.",
      ],
    },
  ],
);

/* ============ After Scaling ============ */

export const DOCS_SITE: CaseStudy = caseStudy(
  {
    id: "docs-site",
    title: "Documentation read around the world",
    tagline:
      "An open-source project's docs get readers on every continent. Make every page fast everywhere, cheaply.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["cdn", "caching", "request-journey"],
    learn: [
      "Serve a static site from the edge",
      "Cache forever with versioned file names",
      "Publish updates instantly",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Docs on one server in Frankfurt",
      body: [
        "An open-source library's documentation (300 pages, diagrams, search) is served from one server in Frankfurt. Readers in Sydney and São Paulo wait almost two seconds per page.",
      ],
      add: [
        node("readers", "user", "Readers worldwide", -4.6, 0),
        node("origin", "server", "Docs server", 2, 0, { sub: "Frankfurt" }),
      ],
      link: [
        link(
          "readers",
          "origin",
          { kind: "request", rate: 2, speed: 3 },
          { kind: "response", back: true, rate: 2, speed: 3 },
        ),
      ],
    },
    {
      kind: "insight",
      short: "Why slow",
      uses: "request-journey",
      title: "Every page costs four long round trips",
      body: [
        "DNS, two handshakes and the request, each about 300 ms round trip from Sydney, before any bytes arrive. The server is idle; distance is the whole problem.",
      ],
      metrics: [{ label: "Sydney page load", value: "1.9 s", tone: "bad" }],
    },
    {
      kind: "solution",
      short: "Static",
      uses: "cdn",
      title: "Build static pages, serve from the edge",
      body: [
        "Docs only change when a new version is released, so every page is built as static HTML in CI and served by a CDN. Sydney now talks to an edge 20 ms away.",
      ],
      metrics: [{ label: "Sydney page load", value: "220 ms", tone: "good" }],
      add: [node("cdn", "cdn", "CDN edges", -1.6, -1.8, { sub: "worldwide" })],
      unlink: ["readers>origin"],
      link: [both("readers", "cdn", 3), link("cdn", "origin", { kind: "request", rate: 1 })],
    },
    {
      kind: "technique",
      short: "Forever",
      uses: "caching",
      title: "Assets cached for a year",
      body: [
        "Stylesheets, scripts and diagrams get content-hashed names (`docs.a91f.css`) and are cached for a year by browsers and edges. HTML pages get a short TTL of five minutes.",
      ],
      quiz: {
        question: "A diagram is fixed and re-published. How do readers get the new one at once?",
        options: [
          "Purge every edge and wait",
          "The new file gets a new hashed name, and the HTML (5-minute TTL) points to it",
          "Ask readers to clear their cache",
        ],
        answer: 1,
        why: "Versioned names make old copies irrelevant; only the short-lived HTML needs to change.",
      },
    },
    {
      kind: "solution",
      short: "Search",
      uses: "caching",
      title: "Search without a search server",
      body: [
        "At build time a small search index (a JSON file of words → pages) is generated and cached at the edge like any asset. Search runs in the reader's browser: no server, nothing to scale.",
      ],
      add: [node("index", "search", "Search index file", -1.6, 1.8, { sub: "built in CI" })],
      link: [link("readers", "index", "request")],
    },
    {
      kind: "case",
      short: "Release",
      uses: "cdn",
      title: "Case: release day",
      body: [
        "A major version ships and Hacker News sends 50,000 readers in an hour. The edges absorb it: the origin sees a few hundred requests in total, all for HTML that just changed.",
      ],
      metrics: [
        { label: "Readers", value: "50,000 / hour" },
        { label: "Origin requests", value: "≈ 400", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Fast everywhere, nearly free",
      body: ["Static files at the edge make distance and spikes disappear."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Readers far away", "CDN edges", "CDNs"],
          ["Updates show at once", "hashed asset names, short HTML TTL", "Caching"],
          ["Search", "prebuilt index, runs in the browser", "Caching"],
          ["Why it was slow", "round trips over distance", "How a request travels"],
        ],
      },
    },
  ],
);

export const GAME_LAUNCH: CaseStudy = caseStudy(
  {
    id: "game-launch",
    title: "Launch day for a mobile game",
    tagline:
      "A new puzzle game is featured in the app stores. Two million downloads in a day, all signing in at once.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["scale-up-out", "load-balancing", "stateless", "cdn", "caching"],
    learn: [
      "Keep big downloads off the game servers",
      "Stateless game APIs behind a balancer",
      "Cache the level data, not the player data",
      "Autoscale with a warm floor",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Featured in the store tomorrow",
      body: [
        "The game is featured in the app stores. Expect two million new players in a day: each downloads 300 MB of levels and art, signs in, and plays sessions of a few minutes.",
      ],
      add: [
        node("players", "phone", "Players", -4.6, 0),
        node("api", "server", "Game API", 0, 0),
        node("db", "db", "Player DB", 3.2, 0),
      ],
      link: [both("players", "api", 2), both("api", "db", 2)],
    },
    {
      kind: "solution",
      short: "Downloads",
      uses: "cdn",
      title: "300 MB per player goes through a CDN",
      body: [
        "Two million × 300 MB = 600 TB in a day. That must never touch the game servers: level packs and art are versioned files served by a CDN.",
      ],
      metrics: [
        { label: "Downloads", value: "600 TB / day" },
        { label: "From game servers", value: "0", tone: "good" },
      ],
      add: [node("cdn", "cdn", "CDN", -1.8, -2.4, { sub: "level packs" })],
      link: [link("players", "cdn", "request", { kind: "heavy", back: true, rate: 3 })],
    },
    {
      kind: "solution",
      short: "Pool",
      uses: "load-balancing",
      title: "A pool of game servers",
      body: [
        "Sign-in, saving progress and leaderboards go through a load balancer to a pool of API servers, with health checks so a crashed server drops out in seconds.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -2, 0.6),
        node("api2", "server", "Game API ×N", 0, 2.2),
      ],
      unlink: ["players>api"],
      link: [
        both("players", "lb", 3),
        both("lb", "api", 2),
        both("lb", "api2", 3),
        both("api2", "db", 2),
      ],
    },
    {
      kind: "technique",
      short: "Stateless",
      uses: "stateless",
      title: "No player state in server memory",
      body: [
        "A player's session is a signed token; their progress lives in the database. Any server can serve any request, so servers can be added, removed or replaced mid-session without anyone noticing.",
      ],
    },
    {
      kind: "solution",
      short: "Level cache",
      uses: "caching",
      title: "Cache level definitions, not player data",
      body: [
        "Every player fetches the same daily-puzzle definition: it is cached in memory for a day. Each player's own progress is different for everyone and is not shared-cached.",
      ],
      quiz: {
        question: "Which is a good candidate for a shared cache?",
        options: [
          "Today's daily puzzle",
          "A player's coins balance",
          "A player's purchase history",
        ],
        answer: 0,
        why: "The daily puzzle is identical for everyone and changes once a day; balances and purchases are personal and must be exact.",
      },
      add: [node("cache", "cache", "Level cache", 3.2, -2.2)],
      link: [both("api", "cache", 3), both("api2", "cache", 3)],
    },
    {
      kind: "solution",
      short: "Autoscale",
      uses: "scale-up-out",
      title: "Autoscaling with a warm floor",
      body: [
        "The feature goes live at midnight in each time zone, a wave around the globe. Autoscaling follows the wave, but a floor of 20 warm servers is kept all day so a sudden spike never waits for new servers to boot.",
      ],
      metrics: [
        { label: "Servers", value: "20 → 85 → 30" },
        { label: "Sign-in p95", value: "180 ms", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Launch day, survived",
      body: [
        "Heavy bytes at the edge, stateless servers behind a balancer, caches only for shared data.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["600 TB of downloads", "CDN", "CDNs"],
          ["Spread sign-ins", "balancer + health checks", "Load balancing"],
          ["Servers come and go", "tokens, state in the DB", "Stateless services"],
          ["Daily puzzle reads", "shared cache", "Caching"],
          ["A wave across time zones", "autoscaling with a warm floor", "Scale up or out"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const PHOTO_BACKUP: CaseStudy = caseStudy(
  {
    id: "photo-backup",
    title: "A phone photo-backup service",
    tagline:
      "Every photo from millions of phones, kept forever and never duplicated. Files, ids, shards and copies.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["files-media", "unique-ids", "sharding", "replication", "indexes"],
    learn: [
      "Upload files straight to storage, resumably",
      "Skip duplicates with content hashes",
      "Shard metadata by user",
      "Never lose a photo",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Back up every photo, forever",
      body: [
        "An app backs up phone photos: 5 million users, about 40 new photos each per week at 4 MB. Users browse by date and search by place. Losing one photo is unforgivable.",
      ],
      metrics: [
        { label: "New photos", value: "≈ 30 M / day" },
        { label: "New bytes", value: "≈ 120 TB / day" },
      ],
      add: [
        node("phones", "phone", "Phones", -4.6, 0),
        node("api", "server", "Backup API", -1.4, 0),
      ],
      link: [both("phones", "api", 2)],
    },
    {
      kind: "solution",
      short: "Upload",
      uses: "files-media",
      title: "Photos go straight to object storage",
      body: [
        "The API hands each phone presigned URLs; photos upload directly to object storage in parts and resume after a dropped connection. The API only records the facts about each photo.",
      ],
      add: [
        node("bucket", "storage", "Object storage", 1.6, -2.4, { sub: "photos" }),
        node("meta", "db", "Photo metadata", 1.6, 1.2),
      ],
      link: [link("phones", "bucket", { kind: "heavy", rate: 3 }), link("api", "meta", "write")],
    },
    {
      kind: "technique",
      short: "Dedupe",
      uses: "unique-ids",
      title: "The photo's content is its id",
      body: [
        "The phone computes a hash of each photo's bytes before uploading. If that hash already exists for this user, the upload is skipped: re-installing the app doesn't upload 10,000 photos again.",
        'Each photo\'s database row also gets a time-sortable id, so "newest first" is a simple index scan.',
      ],
      quiz: {
        question: "A user re-installs the app. How does the service avoid re-uploading everything?",
        options: [
          "It compares file names",
          "The phone sends content hashes first; known hashes are skipped",
          "It uploads everything and deletes duplicates later",
        ],
        answer: 1,
        why: "Identical bytes give an identical hash, whatever the file is called. Checking hashes first saves the upload entirely.",
      },
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard metadata by user",
      body: [
        "Billions of photo rows don't fit one database. Every query is about one user's library, so metadata is sharded by **user id**: each library lives entirely on one shard.",
      ],
      add: [node("meta2", "db", "Metadata shard 2", 3.8, 0.4, { size: 0.85 })],
      set: { meta: { label: "Metadata shard 1", size: 0.85 } },
      link: [link("api", "meta2", "write")],
    },
    {
      kind: "technique",
      short: "Index",
      uses: "indexes",
      title: "Browse by date, search by place",
      body: [
        'Within a shard, an index on `(user_id, taken_at)` makes scrolling a timeline instant, and `(user_id, place)` answers "photos in Goa" without scanning the library.',
      ],
    },
    {
      kind: "solution",
      short: "Never lose",
      uses: "replication",
      title: "Never lose a photo",
      body: [
        "Object storage keeps copies in several data centres. Each metadata shard has a follower in another zone, and nightly backups make point-in-time recovery possible, because replicas faithfully copy mistakes too.",
      ],
      add: [node("follower", "db", "Followers", 6, 0.4, { hue: "teal", size: 0.85 })],
      link: [link("meta", "follower", "copy"), link("meta2", "follower", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every photo, once, forever",
      body: [
        "Bytes in storage, facts in sharded tables, duplicates skipped by content, copies everywhere.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["120 TB a day", "direct, resumable uploads", "Files and media"],
          ["No duplicates", "content hashes; time-sortable ids", "Unique IDs"],
          ["Billions of rows", "shard by user", "Sharding"],
          ["Timeline and places", "(user, date) and (user, place) indexes", "Indexes"],
          ["Never lose one", "replicas + backups", "Replication"],
        ],
      },
    },
  ],
);

export const WAREHOUSE_INVENTORY: CaseStudy = caseStudy(
  {
    id: "warehouse-inventory",
    title: "Inventory across 200 warehouses",
    tagline:
      "An online store sells from 200 warehouses. Never sell what isn't there, and keep the site fast while stock changes.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["transactions", "sharding", "cap", "caching", "replication"],
    learn: [
      "Reserve stock with an atomic update",
      "Shard stock by warehouse",
      "Show approximate stock, decide on exact stock",
      "Handle a warehouse that goes offline",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One store, 200 warehouses",
      body: [
        'A store sells 2 million products from 200 warehouses. Product pages show "in stock near you"; checkout reserves units from a specific warehouse. Overselling costs refunds and trust.',
      ],
      add: [
        node("shoppers", "user", "Shoppers", -4.6, 0),
        node("app", "server", "Store app", -1.4, 0),
        node("stock", "db", "Stock DB", 2.2, 0),
      ],
      link: [both("shoppers", "app", 3), both("app", "stock", 2)],
    },
    {
      kind: "technique",
      short: "Reserve",
      uses: "transactions",
      title: "Reserve with one atomic update",
      body: [
        "Checkout reserves units with a single conditional update: decrement only if enough units remain. Two shoppers racing for the last unit can't both succeed.",
      ],
      code: [
        "UPDATE stock SET available = available - :qty",
        "WHERE warehouse = :w AND sku = :sku AND available >= :qty;   -- 0 rows: sold out",
      ],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard stock by warehouse",
      body: [
        "Each warehouse's stock lives on one shard. A reservation touches one warehouse, so it never needs a cross-shard transaction; a big sale at one warehouse can't slow the others.",
      ],
      add: [
        node("s1", "db", "Warehouses 1–100", 3.4, -1.4, { size: 0.85 }),
        node("s2", "db", "Warehouses 101–200", 3.4, 1.4, { size: 0.85 }),
      ],
      remove: ["stock"],
      link: [both("app", "s1", 2), both("app", "s2", 2)],
    },
    {
      kind: "solution",
      short: "Show approx",
      uses: "caching",
      title: "Product pages show cached stock",
      body: [
        'Product pages are viewed 200 times for every purchase. They show stock from a cache refreshed every 30 seconds: "in stock", "only 3 left". Checkout always reserves against the shard itself.',
      ],
      quiz: {
        question:
          'The page said "in stock" but the reservation fails. What should the shopper see?',
        options: [
          "An error page",
          '"Just sold out here, available from another warehouse in 2 days"',
          "Nothing: complete the order anyway",
        ],
        answer: 1,
        why: "Cached displays can be slightly stale; the reservation is the truth, and the app offers the next-best option.",
      },
      add: [node("cache", "cache", "Stock display cache", -1.4, -2.6, { sub: "30 s" })],
      link: [both("app", "cache", 4)],
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Reports and search read replicas",
      body: [
        '"Which warehouses have this item?" and nightly stock reports read from replicas of each shard, keeping reservation shards free for checkout.',
      ],
      add: [node("rep", "db", "Replicas", 5.6, 0, { hue: "teal" })],
      link: [link("s1", "rep", "copy"), link("s2", "rep", "copy"), link("rep", "cache", "copy")],
    },
    {
      kind: "tradeoff",
      short: "Offline",
      uses: "cap",
      title: "Case: a warehouse's link goes down",
      body: [
        'A warehouse\'s local system loses its connection for an hour. The store **stops reserving** from that warehouse (consistency) but keeps selling from the others (availability for the store as a whole). Its products show "ships from another warehouse".',
      ],
      set: { s2: { state: "hot", badge: "warehouse 141 offline" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Never oversell, stay fast",
      body: ["Exact where money changes hands, approximate everywhere else."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Never oversell", "atomic conditional reserve", "Transactions"],
          ["Scale writes", "shard by warehouse", "Sharding"],
          ["Fast product pages", "30-second display cache", "Caching"],
          ["Reports and search", "replicas", "Replication"],
          ["Partitions", "refuse per warehouse, sell from others", "CAP"],
        ],
      },
      set: { s2: { state: "ok", badge: "" } },
    },
  ],
);

export const SAAS_TENANTS: CaseStudy = caseStudy(
  {
    id: "saas-tenants",
    title: "A multi-tenant SaaS database",
    tagline:
      "Ten thousand small companies and three giants share one product. Keep everyone fast and nobody's data visible to anyone else.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["sharding", "indexes", "replication", "sql-nosql", "consistent-hashing"],
    learn: [
      "Put the tenant id in every key and index",
      "Shard by tenant, with special homes for giants",
      "Move tenants between shards without downtime",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One product, ten thousand companies",
      body: [
        "A project-management product serves 10,000 companies. Most have 10 users; three have 20,000 each. All share the same code and, so far, one PostgreSQL database.",
      ],
      add: [
        node("small", "browser", "Small tenants", -4.6, -1.4),
        node("giant", "browser", "Giant tenants", -4.6, 1.4),
        node("app", "server", "SaaS app", -1.4, 0),
        node("db", "db", "PostgreSQL", 2.2, 0),
      ],
      link: [both("small", "app", 2), both("giant", "app", 2), both("app", "db", 3)],
    },
    {
      kind: "technique",
      short: "Tenant key",
      uses: "sql-nosql",
      title: "Every table starts with tenant_id",
      body: [
        "Each row carries `tenant_id`, every query filters on it, and primary keys are `(tenant_id, id)`. Tenants share tables but never rows, and a tenant's data can later be moved as one unit.",
      ],
    },
    {
      kind: "technique",
      short: "Indexes",
      uses: "indexes",
      title: "Indexes lead with the tenant",
      body: [
        "\"Open tasks for this project\" uses an index on `(tenant_id, project_id, status)`. With `tenant_id` first, a small tenant's query touches only its own corner of the index, never the giants' millions of rows.",
      ],
      quiz: {
        question: "Why put tenant_id first in a composite index?",
        options: [
          "It is the shortest column",
          "Every query filters by tenant, and indexes help from the left",
          "PostgreSQL requires it",
        ],
        answer: 1,
        why: "Leading with the column every query uses lets the index jump straight to that tenant's rows.",
      },
    },
    {
      kind: "problem",
      short: "Noisy",
      uses: "sharding",
      title: "One giant slows everyone down",
      body: [
        "A giant tenant runs a huge import and the shared database's CPU hits 95%. Ten thousand small companies see slow pages because of one neighbour.",
        "The fix: shard by tenant. Small tenants are packed many to a shard; each giant gets a shard of its own.",
      ],
      add: [
        node("shardS", "db", "Shared shards", 3.6, -1.6, { sub: "many small tenants" }),
        node("shardG", "db", "Dedicated shards", 3.6, 1.6, { sub: "one giant each" }),
      ],
      remove: ["db"],
      link: [both("app", "shardS", 3), both("app", "shardG", 2)],
    },
    {
      kind: "technique",
      short: "Directory",
      uses: "consistent-hashing",
      title: "Find a tenant's shard",
      body: [
        "Small tenants are placed with consistent hashing, so adding a shard moves only a slice of them. Giants are pinned through a small directory (`tenant 17 → shard G2`). The app checks the directory first, then the ring.",
      ],
      add: [node("dir", "registry", "Tenant directory", -1.4, -2.6)],
      link: [both("app", "dir", 1)],
    },
    {
      kind: "solution",
      short: "Move",
      uses: "replication",
      title: "Moving a tenant without downtime",
      body: [
        "A fast-growing tenant must move to its own shard. Its rows are copied to the new shard, then changes are replicated until it catches up; writes pause for a second while the directory switches, then continue on the new shard.",
      ],
      set: { shardG: { badge: "+1 tenant moved" } },
      link: [link("shardS", "shardG", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Shared code, separated data",
      body: ["Tenant first in every key, every index and every routing decision."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Tenants never mix", "tenant_id in every key", "SQL and NoSQL"],
          ["Fast per-tenant queries", "indexes start with tenant_id", "Indexes"],
          ["Noisy neighbours", "shard by tenant; giants alone", "Sharding"],
          ["Find the shard", "ring for small, directory for giants", "Consistent hashing"],
          ["Move a tenant", "copy, replicate, switch", "Replication"],
        ],
      },
    },
  ],
);
