import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ Checkpoint after Foundations ============ */

export const EXAM_RESULTS_DAY: CaseStudy = caseStudy(
  {
    id: "exam-results-day",
    title: "Results day, part 1: will it hold?",
    tagline:
      "A state exam board publishes 1.8 million results at 10:00. Before building anything, find out what is coming.",
    minutes: 9,
    level: "beginner",
    tier: "combine",
    concepts: ["request-journey", "latency-throughput", "napkin-math"],
    learn: [
      "Turn a launch moment into a peak request rate",
      "Trace one request to see where its time goes",
      "Spot the utilization knee before it happens",
      "Estimate bandwidth, not just requests",
    ],
    builtOn: [{ label: "Binary search", path: "/algorithms/binary-search" }],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "1.8 million students, one moment",
      body: [
        "The state exam board publishes Class 12 results at exactly 10:00. Today one web server and one database serve the results site; on a normal day a result page takes about 120 ms.",
        "Every student, parent and teacher will press refresh at 10:00:00. What is coming, and will it hold?",
      ],
      metrics: [
        { label: "Students", value: "1.8 M" },
        { label: "Servers", value: "1" },
        { label: "Normal page", value: "120 ms", tone: "good" },
      ],
      add: [
        node("students", "user", "Students & parents", -4.4, 0),
        node("web", "server", "Results server", 0, 0, { sub: "900 req/s max" }),
        node("db", "db", "Results DB", 3.2, 0),
      ],
      link: [both("students", "web", 1), both("web", "db", 1)],
    },
    {
      kind: "technique",
      short: "The peak",
      uses: "napkin-math",
      title: "Napkin math: the first fifteen minutes",
      body: [
        "Each student loads about 6 pages (sign in, results, refresh, marksheet, share): about 11 million requests. Spread over a day that is only 130 a second, but 70% arrive in the first 15 minutes.",
        "11M × 0.7 ÷ 900 s ≈ **8,500 requests a second**: nearly ten times what the server can do.",
      ],
      quiz: {
        question: "Which number should the design be sized for?",
        options: [
          "The daily average: 130 req/s",
          "The first-15-minutes peak: ≈ 8,500 req/s",
          "The server's current 900 req/s",
        ],
        answer: 1,
        why: "A launch moment concentrates the whole day into minutes. Size for the peak, or the site is down exactly when everyone looks.",
      },
      metrics: [
        { label: "Requests", value: "≈ 11 M" },
        { label: "Daily average", value: "130 /s" },
        { label: "Peak", value: "≈ 8,500 /s", tone: "bad" },
      ],
      set: { students: { sub: "70% in 15 min" } },
      link: [both("students", "web", 3)],
    },
    {
      kind: "insight",
      short: "One request",
      uses: "request-journey",
      title: "Trace one result page",
      body: [
        "One page costs a DNS lookup, two handshake round trips, the request, about 15 ms of database time and a 200 KB marksheet. Most of the 120 ms is network, and the stylesheets, scripts and logo are identical for every student.",
        "That tells us where to aim later: keep identical bytes away from the server, and keep each request's server work tiny.",
      ],
      table: {
        head: ["Hop", "Time"],
        rows: [
          ["DNS + 2 handshakes", "70 ms"],
          ["Request round trip", "30 ms"],
          ["Database", "15 ms"],
          ["Server code", "5 ms"],
        ],
      },
      add: [node("dns", "dns", "DNS", -2.4, -2.4)],
      link: [both("students", "dns", 1)],
    },
    {
      kind: "problem",
      short: "The knee",
      uses: "latency-throughput",
      title: "10:00:30: past the knee",
      body: [
        "Thirty seconds in, 8,500 requests a second meet a server that can finish 900. Utilization would be over 900%: the queue grows without limit, the p99 passes 30 seconds, and browsers give up.",
        "Latency doesn't rise gently. Past about 70% busy it turns into a cliff.",
      ],
      metrics: [
        { label: "Busy", value: "100%", tone: "bad" },
        { label: "Queue", value: "growing", tone: "bad" },
        { label: "p99", value: "> 30 s", tone: "bad" },
      ],
      set: { web: { state: "hot", queue: 9, badge: "100%" } },
      link: [link("students", "web", { kind: "request", rate: 4 }, { kind: "fail", rate: 2 })],
    },
    {
      kind: "insight",
      short: "In flight",
      uses: "latency-throughput",
      title: "Little's law empties the connection pool",
      body: [
        "Requests in flight = throughput × latency. At 8,500 a second and 2 seconds each, 17,000 requests are open at once, but the database allows 500 connections.",
        "So the database refuses connections too, and errors spread even to requests the server could have handled.",
      ],
      quiz: {
        question:
          "If each request took 0.1 s instead of 2 s, how many would be in flight at 8,500 req/s?",
        options: ["85", "850", "17,000"],
        answer: 1,
        why: "8,500 × 0.1 = 850. Faster requests hold resources for less time, which is why cutting per-request work matters as much as adding servers.",
      },
      metrics: [
        { label: "In flight", value: "17,000", tone: "bad" },
        { label: "DB connections", value: "500 max", tone: "bad" },
      ],
      set: { db: { state: "hot", badge: "pool full" } },
      link: [link("web", "db", "request", "fail")],
    },
    {
      kind: "technique",
      short: "Bandwidth",
      uses: "napkin-math",
      title: "And the bytes: 3 gigabits a second",
      body: [
        "1.8M marksheets × 200 KB = 360 GB, most of it in 15 minutes: about 400 MB/s, or **3.2 Gbit/s**. The server's network link is 1 Gbit/s.",
        "Even with infinite CPU, the pipe is too narrow. Bandwidth is its own bottleneck.",
      ],
      metrics: [
        { label: "Marksheets", value: "360 GB" },
        { label: "Needed", value: "3.2 Gbit/s", tone: "bad" },
        { label: "Server link", value: "1 Gbit/s", tone: "bad" },
      ],
      link: [link("web", "students", { kind: "heavy", rate: 3 })],
      notes: [{ x: -2, y: 1, text: "3.2 Gbit/s needed, 1 Gbit/s available", tone: "bad" }],
    },
    {
      kind: "recap",
      short: "Verdict",
      title: "Verdict: it will not hold, and now we know why",
      body: [
        "Peak load is ≈ 8,500 req/s against 900: about 14 servers at a healthy 70%.",
        "Each request must hold resources for less time, or the connection pools run dry.",
        "Identical bytes (scripts, images) must stay off the server, and marksheets need a plan of their own.",
        "Part 2 (after the Scaling module) builds the design that survives 10:00.",
      ],
      set: { web: { state: "ok", queue: 0, badge: "" }, db: { state: "ok", badge: "" } },
      relink: [both("students", "web", 2), both("web", "db", 1), both("students", "dns", 1)],
    },
  ],
);

/* ============ Checkpoint after Scaling ============ */

export const RECIPE_BLOG: CaseStudy = caseStudy(
  {
    id: "recipe-blog",
    title: "A recipe blog hits the front page",
    tagline:
      "A home cook's blog on one tiny server meets 40,000 visitors in an hour. Five ideas, applied in order.",
    minutes: 10,
    level: "beginner",
    tier: "integrate",
    concepts: ["scale-up-out", "cdn", "caching", "stateless", "load-balancing"],
    learn: [
      "Remove the biggest bottleneck first",
      "Use a CDN for photos and a page cache for HTML",
      "Why a second server forces statelessness",
      "Health checks so one dead server doesn't matter",
    ],
    builtOn: [{ label: "LRU cache", path: "/structures/lru-cache" }],
  },
  [
    {
      kind: "setup",
      short: "Tiny blog",
      title: "One small server, a few hundred readers",
      body: [
        "Meera writes a recipe blog on a $10 virtual machine: a web app and its database on one box. About 300 visits a day, each page with 25 photos.",
      ],
      metrics: [
        { label: "Visits", value: "300 / day" },
        { label: "CPU", value: "3%", tone: "good" },
      ],
      add: [
        node("readers", "user", "Readers", -4.4, 0),
        node("blog", "server", "Blog server", 0.4, 0, { sub: "app + DB" }),
      ],
      link: [both("readers", "blog", 1)],
    },
    {
      kind: "problem",
      short: "Front page",
      title: "40,000 visitors in an hour",
      body: [
        "Her mango pickle recipe reaches the front page of a big social site. Peaks of 120 page views a second, each pulling 3 MB of photos: about 3 Gbit/s. The CPU pins at 100% and the network link saturates.",
      ],
      metrics: [
        { label: "Views", value: "120 /s" },
        { label: "Photos", value: "3 Gbit/s", tone: "bad" },
        { label: "CPU", value: "100%", tone: "bad" },
      ],
      set: { blog: { state: "hot", queue: 8, badge: "100%" }, readers: { sub: "40k this hour" } },
      link: [
        link(
          "readers",
          "blog",
          { kind: "request", rate: 4 },
          { kind: "heavy", back: true, rate: 3 },
          { kind: "fail", rate: 1 },
        ),
      ],
    },
    {
      kind: "solution",
      short: "Photos → CDN",
      uses: "cdn",
      title: "Biggest bytes first: photos go to a CDN",
      body: [
        "95% of the bytes are photos that are identical for every reader. Serve them from a CDN with versioned file names, cached for a year. The server now sends only the HTML.",
      ],
      changes: [
        { op: "+", text: "CDN for photos" },
        { op: "~", text: "Server bandwidth −95%" },
      ],
      metrics: [
        { label: "Server bandwidth", value: "150 Mbit/s", tone: "good" },
        { label: "CPU", value: "85%", tone: "bad" },
      ],
      add: [node("cdn", "cdn", "CDN", -2, -2.4, { sub: "photos, 1-year cache" })],
      set: { blog: { queue: 4, badge: "85%" } },
      link: [
        both("readers", "blog", 3),
        link(
          "readers",
          "cdn",
          { kind: "request", rate: 3 },
          { kind: "heavy", back: true, rate: 3 },
        ),
      ],
    },
    {
      kind: "solution",
      short: "Page cache",
      uses: "caching",
      title: "Render once, serve a thousand times",
      body: [
        "Every reader sees the same recipe page. Cache the rendered HTML for 60 seconds: the database renders it about once a minute instead of 120 times a second.",
      ],
      quiz: {
        question: "Why is a 60-second TTL acceptable here?",
        options: [
          "Recipes never change",
          "A new comment showing up a minute later is fine for a blog",
          "Caches can't use shorter TTLs",
        ],
        answer: 1,
        why: "Staleness is a product decision. For a blog, one minute is invisible; for a bank balance it would not be.",
      },
      changes: [{ op: "+", text: "Page cache, 60 s TTL" }],
      metrics: [
        { label: "Hit rate", value: "99%", tone: "good" },
        { label: "CPU", value: "25%", tone: "good" },
      ],
      add: [node("pcache", "cache", "Page cache", 2.8, -1.6, { sub: "HTML, 60 s" })],
      set: { blog: { state: "ok", queue: 0, badge: "25%" } },
      link: [both("blog", "pcache", 3)],
    },
    {
      kind: "solution",
      short: "Two servers",
      uses: "scale-up-out",
      title: "A second server, just in case",
      body: [
        "Things are calm, but one machine is a single point of failure, and a second wave is coming tonight. Meera adds a second blog server with the same code.",
        "Scaling out is cheap now that the heavy work is cached. But something breaks immediately.",
      ],
      add: [node("blog2", "server", "Blog server 2", 0.4, 2, { sub: "app" })],
      set: { blog: { sub: "app" } },
      link: [both("blog2", "pcache", 2)],
    },
    {
      kind: "problem",
      short: "Logged out",
      uses: "stateless",
      title: "Commenters keep getting logged out",
      body: [
        "Logged-in commenters' sessions live in server 1's memory. When a request lands on server 2, they are signed out mid-comment.",
        "The fix: move sessions to a shared store, so the servers remember nothing between requests and either can serve anyone.",
      ],
      changes: [{ op: "+", text: "Shared session store" }],
      add: [
        node("db", "db", "Database", 4.6, 0.8),
        node("sessions", "cache", "Session store", 2.8, 3.2),
      ],
      link: [
        both("blog", "sessions", 1),
        both("blog2", "sessions", 1),
        both("blog", "db", 1),
        both("blog2", "db", 1),
      ],
    },
    {
      kind: "solution",
      short: "Front door",
      uses: "load-balancing",
      title: "A load balancer with health checks",
      body: [
        "A load balancer becomes the one address readers use, spreading requests over both servers and probing `/health`. That night server 2 runs out of disk and is taken out of the pool; nobody notices.",
      ],
      metrics: [
        { label: "Healthy servers", value: "1 of 2" },
        { label: "Errors", value: "0%", tone: "good" },
      ],
      add: [node("lb", "lb", "Load balancer", -1.8, 0.6)],
      set: { blog2: { state: "down" } },
      unlink: ["readers>blog"],
      link: [
        both("readers", "lb", 3),
        both("lb", "blog", 2),
        link("lb", "blog2", { dashed: true }),
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Five ideas, in the order they paid off",
      body: [
        "Fix the biggest bottleneck first: here, bytes; then repeated work; then single points of failure.",
      ],
      table: {
        head: ["Step", "Idea", "Effect"],
        rows: [
          ["1", "CDN for photos", "−95% server bandwidth"],
          ["2", "Page cache", "CPU 85% → 25%"],
          ["3", "Second server", "no single server to lose"],
          ["4", "Shared sessions", "servers become stateless"],
          ["5", "Load balancer", "dead servers drop out"],
        ],
      },
      set: { blog2: { state: "ok" } },
      link: [both("lb", "blog2", 2)],
    },
  ],
);

export const EXAM_RESULTS_SCALED: CaseStudy = caseStudy(
  {
    id: "exam-results-scaled",
    title: "Results day, part 2: the design that holds",
    tagline:
      "Back to 1.8 million students at 10:00. Now we have the tools: caches, CDNs, stateless servers and a balancer.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: [
      "napkin-math",
      "cdn",
      "caching",
      "stateless",
      "load-balancing",
      "scale-up-out",
      "latency-throughput",
    ],
    learn: [
      "Pre-warm a cache for a known read-only spike",
      "Change the product when it beats changing the system",
      "Pre-scale instead of autoscaling",
      "Check the design against the numbers",
    ],
  },
  [
    {
      kind: "setup",
      short: "The numbers",
      uses: "napkin-math",
      title: "What part 1 told us",
      body: [
        "≈ 8,500 requests a second at peak against 900 per server, 17,000 requests in flight at 2 s each, and 3.2 Gbit/s of marksheets.",
        "One more fact changes everything: results are **read-only** after 10:00. Nobody writes anything.",
      ],
      metrics: [
        { label: "Peak", value: "8,500 /s" },
        { label: "Writes", value: "0 after 10:00", tone: "good" },
      ],
      add: [
        node("students", "user", "Students", -4.6, 0),
        node("web", "server", "Results server", 0, 0, { state: "hot" }),
        node("db", "db", "Results DB", 3.4, 0.6),
      ],
      link: [
        link("students", "web", { kind: "request", rate: 4 }, { kind: "fail", rate: 1 }),
        both("web", "db", 2),
      ],
    },
    {
      kind: "solution",
      short: "Static → CDN",
      uses: "cdn",
      title: "Everything identical goes to the edge",
      body: [
        "The page's scripts, styles and logo are the same for everyone: they go to a CDN with versioned names. The result itself becomes a 2 KB JSON answer the page fills in.",
      ],
      changes: [
        { op: "+", text: "CDN for the app shell" },
        { op: "~", text: "Result: 2 KB JSON, not a whole page" },
      ],
      add: [node("cdn", "cdn", "CDN", -2.2, -2.6, { sub: "app shell" })],
      link: [
        link(
          "students",
          "cdn",
          { kind: "request", rate: 3 },
          { kind: "response", back: true, rate: 3 },
        ),
      ],
    },
    {
      kind: "solution",
      short: "Warm cache",
      uses: "caching",
      title: "Load every result into memory the night before",
      body: [
        "Read-only data is a cache's dream. At 02:00 a job loads all 1.8M results into the cache, keyed by roll number: 1.8M × 2 KB = **3.6 GB**, comfortably in memory with a replica.",
        "At 10:00 the hit rate is essentially 100% and the database has nothing to do.",
      ],
      quiz: {
        question: "Why warm the cache in advance instead of filling it on misses?",
        options: [
          "Misses are free",
          "At 10:00 every key would miss at once: a stampede onto the database",
          "Caches can only be filled at night",
        ],
        answer: 1,
        why: "A cold cache at a launch moment sends the whole peak to the database. Pre-warming turns the spike into pure hits.",
      },
      metrics: [
        { label: "Cache", value: "3.6 GB" },
        { label: "Hit rate", value: "≈ 100%", tone: "good" },
        { label: "DB load", value: "≈ 0", tone: "good" },
      ],
      add: [node("cache", "cache", "Results cache", 3.4, -1.8, { sub: "warmed at 02:00" })],
      set: { web: { state: "ok" } },
      link: [
        both("web", "cache", 3),
        link("web", "db", { dashed: true }),
        link("db", "cache", "copy"),
      ],
    },
    {
      kind: "insight",
      short: "Product fix",
      title: "The marksheet problem is a product question",
      body: [
        "3.2 Gbit/s of marksheet PDFs in 15 minutes is expensive to serve. But nobody needs the PDF at 10:00:01; they need the result.",
        "So the board shows marks instantly and opens PDF downloads at 12:00, spread over the afternoon. Sometimes the best scaling fix is a product decision.",
      ],
      metrics: [{ label: "Peak bandwidth", value: "0.2 Gbit/s", tone: "good" }],
    },
    {
      kind: "solution",
      short: "Pre-scale",
      uses: "scale-up-out",
      title: "Fourteen servers, started at 09:30",
      body: [
        "Each request is now a cache lookup, so a server handles about 1,500 a second. At 70% busy that is ≈ 8 servers; run 14 for headroom and a zone failure.",
        "Autoscaling would react minutes too late, so the servers are started on a schedule at 09:30 and warmed with test traffic.",
      ],
      add: [
        node("web2", "server", "Results server ×13", 0, 2.2, { sub: "identical" }),
        node("lb", "lb", "Load balancer", -2, 0.8),
      ],
      unlink: ["students>web"],
      link: [
        both("students", "lb", 4),
        both("lb", "web", 2),
        both("lb", "web2", 3),
        both("web2", "cache", 3),
      ],
    },
    {
      kind: "technique",
      short: "No sessions",
      uses: "stateless",
      title: "No sessions at all",
      body: [
        "There is nothing to sign into: each request carries roll number and date of birth, checked against the cached record. The servers keep no state, so any server answers any request and the balancer can spread load freely.",
      ],
    },
    {
      kind: "case",
      short: "10:02",
      uses: "load-balancing",
      title: "10:02: a server dies",
      body: [
        "One of the fourteen crashes. Its health checks fail, the balancer takes it out within seconds, and the other thirteen absorb its share at about 65% busy.",
      ],
      metrics: [
        { label: "Healthy", value: "13 of 14" },
        { label: "Busy", value: "65%", tone: "good" },
        { label: "Errors", value: "0.01%", tone: "good" },
      ],
      set: { web: { state: "down" } },
      link: [link("lb", "web", { dashed: true })],
    },
    {
      kind: "recap",
      short: "Check",
      uses: "latency-throughput",
      title: "Check the design against the numbers",
      body: ["p99 stays at 80 ms through the peak, because utilization never passes 70%."],
      table: {
        head: ["Problem (part 1)", "Fix", "Now"],
        rows: [
          ["8,500 req/s vs 900", "14 servers, cache lookups", "≈ 65% busy"],
          ["17,000 in flight", "requests take 5 ms", "≈ 45 in flight"],
          ["DB connection pool", "warm cache", "DB idle"],
          ["3.2 Gbit/s of PDFs", "downloads from 12:00", "0.2 Gbit/s"],
        ],
      },
      set: { web: { state: "ok" } },
      link: [both("lb", "web", 2)],
    },
  ],
);

/* ============ Checkpoint after Data & storage ============ */

export const LIBRARY_CATALOGUE: CaseStudy = caseStudy(
  {
    id: "library-catalogue",
    title: "A city library catalogue",
    tagline:
      "Two million books, 300,000 members, and a search box. Tables, indexes, a search engine, replicas and caches working together.",
    minutes: 11,
    level: "intermediate",
    tier: "integrate",
    concepts: ["sql-nosql", "indexes", "replication", "caching", "cdn"],
    learn: [
      "Keep loans relational and searches in a search index",
      "Pick indexes for the real queries",
      "Read from replicas, but borrow from the leader",
      "Cache the popular pages and serve covers from the edge",
    ],
    builtOn: [
      { label: "Binary search tree", path: "/structures/binary-search-tree" },
      { label: "Trie", path: "/structures/trie" },
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Search, borrow, reserve",
      body: [
        "The city library wants one site for its 42 branches: search 2 million books, see which branch has a copy, borrow, return and reserve. Searches outnumber loans 60 to 1.",
      ],
      metrics: [
        { label: "Books", value: "2 M" },
        { label: "Members", value: "300 k" },
        { label: "Reads : writes", value: "60 : 1" },
      ],
      add: [
        node("members", "user", "Members", -4.6, 0),
        node("app", "server", "Catalogue app", -1.2, 0),
        node("db", "db", "PostgreSQL", 2.4, 0, { sub: "books, copies, loans" }),
      ],
      link: [both("members", "app", 2), both("app", "db", 2)],
    },
    {
      kind: "technique",
      short: "Tables",
      uses: "sql-nosql",
      title: "Loans belong in tables",
      body: [
        "Borrowing must be all-or-nothing: mark the copy as on loan **and** create the loan row, or neither. That is a transaction, so books, copies, members and loans live in a relational database.",
      ],
      code: [
        "BEGIN;",
        "UPDATE copies SET status = 'on_loan' WHERE id = 7 AND status = 'on_shelf';",
        "INSERT INTO loans (copy_id, member_id, due) VALUES (7, 42, today() + 21);",
        "COMMIT;",
      ],
    },
    {
      kind: "problem",
      short: "Indexes",
      uses: "indexes",
      title: '"My loans" takes three seconds',
      body: [
        '`SELECT … FROM loans WHERE member_id = 42` scans 9 million loan rows. An index on `member_id` makes it instant. Browsing "books by this author, A–Z" needs a composite index on `(author, title)`.',
      ],
      quiz: {
        question: "With an index on (author, title), which query is fast?",
        options: [
          'Books titled "Wings of Fire" by any author',
          'Books by "R. K. Narayan", sorted by title',
          "Books published in 1958",
        ],
        answer: 1,
        why: "The index is sorted by author first, then title: perfect for one author's books in title order. Title alone or year can't use it.",
      },
      metrics: [{ label: "My loans", value: "3 s → 2 ms", tone: "good" }],
      set: { db: { badge: "+2 indexes" } },
    },
    {
      kind: "solution",
      short: "Search",
      uses: "sql-nosql",
      title: "Free-text search goes to a search engine",
      body: [
        "Members type \"harry poter goblet\": typos, partial titles, authors and subjects mixed. `LIKE '%…%'` can't rank or forgive. A search index (an inverted index of every word) handles it, fed by a stream of changes from the database.",
      ],
      add: [node("search", "search", "Search index", 2.2, -2.6, { sub: "typo-tolerant" })],
      link: [both("app", "search", 3), link("db", "search", "copy")],
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Read from replicas, borrow from the leader",
      body: [
        "Book pages and availability are read constantly. Two read replicas take them; the leader handles borrowing, returns and reservations.",
        'Right after a member borrows, their "My loans" page reads from the leader for a few seconds, so they always see their own loan.',
      ],
      changes: [
        { op: "+", text: "2 read replicas" },
        { op: "~", text: "Leader busy 80% → 20%" },
      ],
      add: [
        node("r1", "db", "Replica 1", 4.6, -1, { hue: "teal" }),
        node("r2", "db", "Replica 2", 4.6, 1.2, { hue: "teal" }),
      ],
      set: { db: { sub: "leader: loans" } },
      link: [
        link("db", "r1", "copy"),
        link("db", "r2", "copy"),
        both("app", "r1", 2),
        both("app", "r2", 2),
        link("app", "db", "write", { kind: "response", back: true, rate: 1 }),
      ],
    },
    {
      kind: "case",
      short: "Lag",
      uses: "replication",
      title: "Case: the copy that wasn't there",
      body: [
        'A replica lags two seconds. Anita sees "1 copy on shelf at Central" for a book Ravi borrowed a moment ago, and taps Reserve.',
        "The reservation runs on the leader inside a transaction, which re-checks the copy's real status. Reads may be slightly stale; decisions never are.",
      ],
      callout: { kind: "key", text: "Show from replicas, decide on the leader." },
      set: { r1: { badge: "2 s behind", state: "hot" } },
    },
    {
      kind: "solution",
      short: "Cache + CDN",
      uses: "caching",
      title: "Cache the popular pages, covers at the edge",
      body: [
        '"New arrivals" and the top 500 book pages get most views: they are cached for five minutes and deleted when a copy changes. Cover images (40 KB each) go to a CDN.',
      ],
      changes: [
        { op: "+", text: "Page cache" },
        { op: "+", text: "CDN for covers" },
      ],
      metrics: [
        { label: "Cache hit rate", value: "88%", tone: "good" },
        { label: "Replica load", value: "−85%", tone: "good" },
      ],
      add: [
        node("cache", "cache", "Cache", -0.4, -2.6),
        node("cdn", "cdn", "CDN", -3.2, -2.4, { sub: "covers" }),
      ],
      set: { r1: { state: "ok", badge: "" } },
      link: [
        both("app", "cache", 3),
        link("members", "cdn", "request", { kind: "heavy", back: true }),
      ],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: ["Each store does one job it is good at."],
      table: {
        head: ["Need", "Where", "Lesson"],
        rows: [
          ["Borrow / return / reserve", "PostgreSQL leader, transactions", "SQL and NoSQL"],
          ['"My loans", author lists', "B-tree indexes", "Indexes"],
          ["Free-text search", "search index fed by changes", "SQL and NoSQL"],
          ["Book pages, availability", "read replicas", "Replication"],
          ["Hot pages, covers", "cache, CDN", "Caching, CDNs"],
        ],
      },
    },
  ],
);

export const TRAIN_BOOKING: CaseStudy = caseStudy(
  {
    id: "train-booking",
    title: "Instant train-ticket booking",
    tagline:
      "Booking for tomorrow's trains opens at 10:00 and half a million people try in five minutes. No seat may ever be sold twice.",
    minutes: 12,
    level: "advanced",
    tier: "integrate",
    concepts: ["transactions", "sharding", "replication", "caching", "cap", "unique-ids"],
    learn: [
      "Hold a seat with a short transaction",
      "Shard so one booking touches one shard",
      "Separate the read path from the write path",
      "Choose consistency for bookings, availability for searches",
      "Booking references that don't leak",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "10:00, half a million people, a few thousand seats",
      body: [
        "Next-day booking opens at 10:00 sharp. About 500,000 people try to book in the first five minutes, across 9,000 trains. Searches outnumber bookings 50 to 1. One rule is absolute: **never sell one seat twice**.",
      ],
      metrics: [
        { label: "Booking attempts", value: "≈ 1,700 /s" },
        { label: "Searches", value: "≈ 85,000 /s" },
      ],
      add: [
        node("people", "user", "Travellers", -4.6, 0),
        node("app", "server", "Booking app", -1.4, 0),
        node("db", "db", "Seats DB", 2.2, 0),
      ],
      link: [both("people", "app", 3), both("app", "db", 3)],
    },
    {
      kind: "technique",
      short: "Hold a seat",
      uses: "transactions",
      title: "Hold, pay, confirm",
      body: [
        "Selecting a seat runs one short transaction: an atomic UPDATE that marks it **held** for 8 minutes, only if it is still free. Payment happens outside any transaction; a second transaction marks it **booked**. A cleanup job frees expired holds.",
      ],
      code: [
        "UPDATE seats SET state = 'held', hold_until = now() + interval '8 min', user_id = :u",
        "WHERE train = :t AND day = :d AND seat = :s AND state = 'free';   -- 1 row = yours",
      ],
      quiz: {
        question: "Why not keep the transaction open while the traveller pays?",
        options: [
          "Payments are fast enough",
          "A lock held for minutes blocks everyone else and exhausts connections",
          "Databases can't hold locks",
        ],
        answer: 1,
        why: "Hold a reservation, never a lock, while waiting on something slow.",
      },
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by train and day",
      body: [
        "One database can't take it, so seats are sharded by **(train, day)**: every seat of one train on one day lives on one shard. A booking touches exactly one shard, so it never needs a cross-shard transaction.",
      ],
      add: [
        node("s1", "db", "Shard 1", 2.6, -1.8, { size: 0.85 }),
        node("s2", "db", "Shard 2", 3.4, 0, { size: 0.85 }),
        node("s3", "db", "Shard 3", 2.6, 1.8, { size: 0.85 }),
      ],
      remove: ["db"],
      link: [both("app", "s1", 2), both("app", "s2", 2), both("app", "s3", 2)],
    },
    {
      kind: "problem",
      short: "Hot train",
      uses: "sharding",
      title: "Case: the Friday express",
      body: [
        "The Friday evening express to the coast gets 30% of all attempts, all on shard 2. Hashing spreads keys, not popularity.",
        "Seats are separate rows, so attempts on different seats don't block each other; the danger is the shard's total load. That train-day gets its own dedicated shard for the morning rush.",
      ],
      set: { s2: { state: "hot", queue: 7, badge: "Friday express" } },
      link: [link("app", "s2", { kind: "write", rate: 4 })],
    },
    {
      kind: "solution",
      short: "Read path",
      uses: "replication",
      title: "Searches never touch the seat shards",
      body: [
        '"Which trains have seats?" is 50× more common than booking. Each shard streams changes to replicas, and a cache holds seat counts per train for 5 seconds.',
        'Search results say **"about 23 left"**: honest, slightly stale, and cheap.',
      ],
      add: [
        node("counts", "cache", "Seat counts", -1, -2.8, { sub: "5 s TTL" }),
        node("rep", "db", "Replicas", 5.4, 0, { hue: "teal" }),
      ],
      set: { s2: { state: "ok", queue: 1, badge: "" } },
      link: [
        both("app", "counts", 4),
        link("s1", "rep", "copy"),
        link("s2", "rep", "copy"),
        link("s3", "rep", "copy"),
        link("rep", "counts", "copy"),
      ],
    },
    {
      kind: "tradeoff",
      short: "CAP",
      uses: "cap",
      title: "Two answers to a partition",
      body: [
        "If a shard is cut off from its replicas: **booking chooses consistency** (refuse rather than risk a double sale), while **search chooses availability** (show the last known counts).",
        "One system, two promises, picked per operation.",
      ],
      table: {
        head: ["Operation", "During a partition", "Because"],
        rows: [
          ["Book a seat", "refuse", "a double sale is unacceptable"],
          ["Search trains", "answer, maybe stale", '"about 23" is fine'],
        ],
      },
    },
    {
      kind: "technique",
      short: "PNR",
      uses: "unique-ids",
      title: "Booking references that don't leak",
      body: [
        "Every booking gets a 10-character reference printed on the ticket. Sequential numbers would reveal sales volume and let anyone walk other people's bookings.",
        "References come from a Snowflake-style 64-bit id (time + shard + sequence), scrambled reversibly and encoded in base 32. And looking one up still requires the traveller's name.",
      ],
      code: ["ref = base32(scramble(snowflake(shard_id)))   # e.g. 'K7Q2-M9XD-4T'"],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "The write path is small, sharded and strict; the read path is wide, cached and relaxed.",
      ],
      table: {
        head: ["Concern", "Decision", "Lesson"],
        rows: [
          ["No double sale", "atomic hold, then confirm", "Transactions"],
          ["Write volume", "shard by (train, day)", "Sharding"],
          ["Search volume", "replicas + 5 s cached counts", "Replication, Caching"],
          ["Partitions", "book: consistent; search: available", "CAP"],
          ["References", "scrambled Snowflake ids", "Unique IDs"],
        ],
      },
    },
  ],
);

export const RIDE_LOCATIONS: CaseStudy = caseStudy(
  {
    id: "ride-locations",
    title: "Live driver locations for a ride app",
    tagline:
      '300,000 drivers report their position every 4 seconds. Riders ask "which cars are near me?". A write-heavy design.',
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: [
      "storage-engines",
      "sharding",
      "consistent-hashing",
      "caching",
      "cap",
      "replication",
    ],
    learn: [
      "Pick an engine for a firehose of small writes",
      "Shard by place, not by driver",
      "Grow the fleet with consistent hashing",
      "Split hot cells, and accept stale locations",
    ],
    builtOn: [
      { label: "Hash table", path: "/structures/hash-table" },
      { label: "Graph", path: "/structures/graph" },
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "75,000 location updates a second",
      body: [
        '300,000 drivers send a GPS point every 4 seconds: **75,000 writes a second**, each tiny. Riders search "cars within 2 km" about 20,000 times a second. A location older than 10 seconds is useless.',
      ],
      metrics: [
        { label: "Writes", value: "75,000 /s", tone: "bad" },
        { label: "Searches", value: "20,000 /s" },
      ],
      add: [
        node("drivers", "phone", "Drivers", -4.6, -1.4),
        node("riders", "phone", "Riders", -4.6, 1.6),
        node("loc", "server", "Location service", -1.2, 0),
        node("db", "db", "Locations DB", 2.4, 0, { sub: "B-tree" }),
      ],
      link: [
        link("drivers", "loc", { kind: "write", rate: 4 }),
        both("riders", "loc", 2),
        link("loc", "db", { kind: "write", rate: 4 }),
      ],
    },
    {
      kind: "problem",
      short: "Engine",
      uses: "storage-engines",
      title: "A B-tree drowns in tiny updates",
      body: [
        "Updating a row in place for every GPS point means scattered page writes: the disk saturates and checkpoints fall behind. And we don't even need old points for matching.",
        "So the live position lives **in memory** (a hash map per area), and the trail for receipts and safety goes to an append-only, LSM-based store in batches.",
      ],
      add: [node("trail", "storage", "Trip trails", 2.4, 2.4, { sub: "LSM, batched" })],
      set: { db: { label: "Live positions", kind: "cache", sub: "in memory" } },
      link: [link("loc", "trail", { kind: "write", rate: 1 })],
    },
    {
      kind: "technique",
      short: "By place",
      uses: "sharding",
      title: "Shard by map cell, not by driver",
      body: [
        '"Cars near me" is a question about a **place**. Divide the city into cells of about 1 km and shard by cell: a search reads the rider\'s cell and its neighbours, never the whole fleet.',
        "When a driver crosses a cell boundary, their entry moves to the next cell.",
      ],
      add: [
        node("c1", "cache", "Cells A", 3.2, -2, { size: 0.8 }),
        node("c2", "cache", "Cells B", 4.2, -0.2, { size: 0.8 }),
        node("c3", "cache", "Cells C", 3.2, 1.6, { size: 0.8 }),
      ],
      remove: ["db"],
      link: [both("loc", "c1", 2), both("loc", "c2", 2), both("loc", "c3", 2)],
      zones: [{ label: "City cells", x1: 2.4, y1: -2.8, x2: 5, y2: 2.4, hue: "amber" }],
    },
    {
      kind: "technique",
      short: "Ring",
      uses: "consistent-hashing",
      title: "Festival week: add servers, move few cells",
      body: [
        "A festival triples traffic in one city, so two servers join. With `cell % N`, almost every cell would move and every cached position would be lost at once.",
        "With cells placed on a consistent-hash ring (with virtual nodes), each new server takes over only its share of cells.",
      ],
      quiz: {
        question:
          "Going from 3 to 5 location servers with consistent hashing, roughly what share of cells move?",
        options: ["About 40%", "About 80%", "All of them"],
        answer: 0,
        why: "Each new server takes about 1/5 of the ring: two of them take about 40%. With % N it would be about 80%.",
      },
      add: [node("c4", "cache", "Cells D", 5.4, 1.4, { size: 0.8, state: "lit" })],
      link: [both("loc", "c4", 1)],
    },
    {
      kind: "case",
      short: "Stadium",
      title: "Case: the stadium empties",
      body: [
        "A cricket match ends and 40,000 people open the app in one cell, while 2,000 drivers converge on it. That one cell is now hotter than whole cities.",
        "Busy cells are **split** into four smaller ones (and merged back later), so no single cell outgrows a server.",
      ],
      set: { c2: { state: "hot", queue: 6, badge: "stadium" } },
      link: [link("loc", "c2", { kind: "request", rate: 4 })],
    },
    {
      kind: "tradeoff",
      short: "CAP",
      uses: "cap",
      title: "Locations choose availability; trips choose consistency",
      body: [
        "If a cell server is unreachable, showing positions a few seconds stale is far better than showing no cars. Locations are **available, eventually consistent**.",
        "Accepting a trip is different: two drivers must never both get the same rider. That assignment runs as a consistent transaction elsewhere.",
      ],
      set: { c2: { state: "ok", queue: 0, badge: "split ×4" } },
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "A copy of every cell in another zone",
      body: [
        "Each cell server replicates asynchronously to a follower in another zone. Losing a few seconds of positions is harmless (drivers resend every 4 s), so asynchronous copies are the right trade.",
      ],
      add: [node("follower", "cache", "Followers", 6.2, -1.6, { hue: "teal", sub: "other zone" })],
      link: [
        link("c1", "follower", "copy"),
        link("c2", "follower", "copy"),
        link("c4", "follower", "copy"),
      ],
    },
    {
      kind: "recap",
      short: "Design",
      title: "The finished design",
      body: [
        "Every choice follows from two facts: the data is tiny and constant, and only the latest point matters.",
      ],
      table: {
        head: ["Question", "Decision", "Lesson"],
        rows: [
          ["Where positions live", "memory; trails in an LSM store", "Storage engines"],
          ["How to split", "by map cell", "Sharding"],
          ["Growing the fleet", "cells on a hash ring", "Consistent hashing"],
          ["Hot spots", "split busy cells", "Sharding"],
          ["Failures", "stale positions OK; async followers", "CAP, Replication"],
        ],
      },
    },
  ],
);
