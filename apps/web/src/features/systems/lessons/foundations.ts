import { link, node, patch, type Lesson, type Scene } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ----------------------------- How a request travels ----------------------------- */

const browser = node("browser", "browser", "Priya's laptop", -3, 0, { sub: "algoverse.dev" });
const dns = node("dns", "dns", "DNS resolver", -1, -2.4);
const web = node("web", "server", "Web server", 1, 0);
const db = node("db", "db", "Database", 3.4, 0);

const journeyAll: Scene = {
  nodes: [browser, dns, web, db],
  links: [both("browser", "web"), both("web", "db")],
};

export const REQUEST_JOURNEY: Lesson = {
  id: "request-journey",
  title: "How a request travels",
  tagline: "Follow one page load hop by hop, and find out where the time really goes.",
  minutes: 10,
  level: "beginner",
  learn: [
    "What DNS does, and why its answers are cached",
    "Why opening a connection costs round trips",
    "The path from browser to server to database and back",
    "Where page-load time actually goes",
    "Two cases: a slow query and a learner far away",
  ],
  steps: [
    {
      kind: "setup",
      short: "Press Enter",
      title: "Priya opens a lesson",
      body: [
        "Priya types `algoverse.dev/learn/binary-search` and presses Enter. About a sixth of a second later the lesson appears.",
        "A lot happens in between. Before we can make AlgoVerse faster, we need to know where those milliseconds go, so let's follow one request.",
      ],
      callout: {
        kind: "key",
        text: "A web request is a conversation between machines. Every hop costs time, and the costs add up.",
      },
      metrics: [{ label: "Elapsed", value: "0 ms" }],
      scene: { nodes: [browser, { ...web, state: "dim" }, { ...db, state: "dim" }] },
    },
    {
      kind: "technique",
      short: "DNS",
      title: "Step 1: find the address",
      body: [
        "Networks route by numeric IP address, not by name. So the browser first asks a **DNS resolver**: what is the address of `algoverse.dev`?",
        "The answer, `198.51.100.24`, comes back in about 25 ms.",
      ],
      callout: {
        kind: "good",
        text: "Answers carry a time-to-live (TTL). Until it expires, repeat visits skip this step entirely.",
      },
      changes: [
        { op: "+", text: "DNS resolver" },
        { op: "+", text: "Lookup: 25 ms" },
      ],
      metrics: [
        { label: "DNS", value: "25 ms" },
        { label: "Elapsed", value: "25 ms" },
      ],
      scene: {
        nodes: [browser, dns, { ...web, state: "dim" }, { ...db, state: "dim" }],
        links: [both("browser", "dns", 1)],
      },
    },
    {
      kind: "technique",
      short: "Connect",
      title: "Step 2: open a connection",
      body: [
        "Now the browser connects to `198.51.100.24`. A **TCP handshake** agrees to talk, and a **TLS handshake** sets up encryption. Each needs a **round trip**: a message there and an answer back.",
        "A round trip here takes 35 ms, so connecting costs 70 ms before a single byte of the lesson is requested.",
      ],
      quiz: {
        question: "The round-trip time doubles to 70 ms. How long do the two handshakes take now?",
        options: ["70 ms", "140 ms", "Still 70 ms: the server is just as fast"],
        answer: 1,
        why: "Two round trips at 70 ms each. Round-trip time is set by distance and the network, not by the server's speed.",
      },
      changes: [
        { op: "+", text: "Web server" },
        { op: "+", text: "Handshakes: 2 round trips = 70 ms" },
      ],
      metrics: [
        { label: "Round trip", value: "35 ms" },
        { label: "Elapsed", value: "95 ms" },
      ],
      scene: {
        nodes: [browser, { ...dns, state: "dim" }, web, { ...db, state: "dim" }],
        links: [both("browser", "web", 1)],
      },
    },
    {
      kind: "technique",
      short: "Request",
      title: "Step 3: send the request",
      body: [
        "Over the open connection the browser sends `GET /learn/binary-search`. The server reads it, checks Priya's session cookie and starts running AlgoVerse's code.",
        "That is one more round trip, plus about 8 ms of work on the server.",
      ],
      metrics: [
        { label: "Request", value: "35 ms + 8 ms" },
        { label: "Elapsed", value: "138 ms" },
      ],
      scene: {
        nodes: [
          browser,
          { ...dns, state: "dim" },
          { ...web, state: "lit" },
          { ...db, state: "dim" },
        ],
        links: [link("browser", "web", { kind: "request", rate: 1 })],
      },
    },
    {
      kind: "technique",
      short: "Database",
      title: "Step 4: the server asks the database",
      body: [
        "The lesson text, Priya's progress and her saved code don't live in the web server. They live in a **database**. The server sends queries and waits for the rows.",
        "Watch a request travel all the way in and the answer all the way back out.",
      ],
      callout: {
        kind: "good",
        text: "Keeping data in a database, not in the server, is what later lets us run many identical servers.",
      },
      changes: [
        { op: "+", text: "Database" },
        { op: "+", text: "Queries: 12 ms" },
      ],
      metrics: [
        { label: "Database", value: "12 ms" },
        { label: "Elapsed", value: "150 ms" },
      ],
      scene: journeyAll,
    },
    {
      kind: "solution",
      short: "Response",
      title: "Step 5: the answer comes home",
      body: [
        "The server turns the rows into HTML and sends it back. Downloading it takes about 15 ms, and the browser starts drawing the page **165 ms** after Priya pressed Enter.",
        "Only 20 ms of that was AlgoVerse's server and database actually working. The rest was messages crossing the network.",
      ],
      table: {
        head: ["Hop", "Time"],
        rows: [
          ["DNS lookup", "25 ms"],
          ["TCP + TLS handshakes", "70 ms"],
          ["Request round trip", "35 ms"],
          ["Server code", "8 ms"],
          ["Database", "12 ms"],
          ["Download", "15 ms"],
        ],
      },
      metrics: [
        { label: "Page ready", value: "165 ms", tone: "good" },
        { label: "Network share", value: "88%" },
      ],
      scene: journeyAll,
    },
    {
      kind: "technique",
      short: "More files",
      title: "One page, thirty more requests",
      body: [
        "The HTML is only the start. It points at stylesheets, scripts, fonts and images: about 30 more files.",
        "With old HTTP/1.1 each connection carried one request at a time, so browsers opened about six connections and queued the rest. **HTTP/2** sends them all at once over the connection we already opened.",
      ],
      callout: {
        kind: "good",
        text: "Fewer, smaller files still help: bundle scripts, compress text, use modern image formats, and lazy-load what is below the fold.",
      },
      changes: [
        { op: "+", text: "30 more requests (CSS, JS, fonts, images)" },
        { op: "~", text: "All multiplexed over one HTTP/2 connection" },
      ],
      metrics: [
        { label: "Requests", value: "31" },
        { label: "Fully loaded", value: "290 ms" },
      ],
      scene: patch(journeyAll, {
        links: [
          link(
            "browser",
            "web",
            { kind: "request", rate: 4 },
            { kind: "response", back: true, rate: 4 },
          ),
          both("web", "db", 1),
        ],
      }),
    },
    {
      kind: "case",
      short: "Slow query",
      title: "Case: one slow query",
      body: [
        'A new "recommended next lesson" box ships. Its query sorts every lesson by a score on every page view, and the database now takes 380 ms to answer.',
        "Same network, same handshakes, but the page jumps from 165 ms to over half a second. Requests now pile up at the database.",
      ],
      callout: {
        kind: "key",
        text: "Measure before optimising. Here the network is fine; the fix is in the database (see the Indexes lesson).",
      },
      changes: [
        { op: "+", text: "Recommendation query on every page" },
        { op: "~", text: "Database 12 ms → 380 ms" },
        { op: "~", text: "Page ready 165 ms → 533 ms" },
      ],
      metrics: [
        { label: "Database", value: "380 ms", tone: "bad" },
        { label: "Page ready", value: "533 ms", tone: "bad" },
      ],
      scene: patch(journeyAll, {
        nodes: { db: { state: "hot", queue: 5, badge: "380 ms" } },
      }),
    },
    {
      kind: "case",
      short: "Far away",
      title: "Case: a learner on another continent",
      body: [
        "Back to the fast query. Now Arjun opens the same lesson from Chennai, while AlgoVerse's servers are in Frankfurt. Every round trip takes about 140 ms instead of 35.",
        "Two handshakes plus the request cost 420 ms before the page even downloads. Same server, same code: about three times slower.",
      ],
      quiz: {
        question: "Which change helps Arjun the most?",
        options: [
          "A faster CPU in Frankfurt",
          "Fewer round trips, and content served from closer to Chennai",
          "A bigger database",
        ],
        answer: 1,
        why: "Arjun's time is almost all distance. Fewer round trips (TLS 1.3, HTTP/3, reused connections) and nearby copies (a CDN, a second region) attack it directly.",
      },
      changes: [
        { op: "~", text: "Round trip 35 ms → 140 ms" },
        { op: "~", text: "Page ready 165 ms → 480 ms" },
      ],
      metrics: [
        { label: "Round trip", value: "140 ms", tone: "bad" },
        { label: "Page ready", value: "480 ms", tone: "bad" },
      ],
      scene: patch(journeyAll, {
        nodes: { browser: { label: "Arjun's phone", kind: "phone", sub: "Chennai" } },
        links: [
          link(
            "browser",
            "web",
            { kind: "request", rate: 1, speed: 3 },
            { kind: "response", back: true, rate: 1, speed: 3 },
          ),
          both("web", "db"),
        ],
        notes: [{ x: -1, y: 0.6, text: "≈ 7,000 km", tone: "bad" }],
      }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap: where the time went",
      body: [
        "DNS turns names into addresses, and its answers are cached.",
        "Connections cost round trips, so reuse them.",
        "Server code is usually the smallest slice of the time, unless a slow query sneaks in.",
        "Distance multiplies every round trip.",
      ],
      callout: {
        kind: "key",
        text: "Next: what happens to those 165 ms when thousands of learners arrive at once.",
      },
      scene: journeyAll,
    },
  ],
};

/* ----------------------------- Latency and throughput ----------------------------- */

const crowd = node("crowd", "user", "Learners", -2.5, 0, { sub: "1,000 online" });
const api = node("api", "server", "Quiz API", 1.5, 0, { sub: "400 req/s max" });
const store = node("store", "db", "Database", 4, 0);

const flowing = (rate: number, extra: Partial<Scene> = {}): Scene => ({
  nodes: [crowd, api, store],
  links: [both("crowd", "api", rate), both("api", "store", 1)],
  ...extra,
});

export const LATENCY_THROUGHPUT: Lesson = {
  id: "latency-throughput",
  title: "Latency and throughput",
  tagline:
    "Two different questions about speed, and why busy servers slow down long before they are full.",
  minutes: 11,
  level: "beginner",
  learn: [
    "Tell latency and throughput apart",
    "Why latency explodes as a server nears 100% busy",
    "Read p50, p95 and p99 instead of averages",
    "Little's law: how much work is in flight",
    "Batching: more throughput for a little more latency",
  ],
  steps: [
    {
      kind: "setup",
      short: "Two numbers",
      title: "Two different questions",
      body: [
        "**Latency**: how long does one request take, from leaving Priya's laptop to the answer arriving?",
        "**Throughput**: how many requests does AlgoVerse finish every second?",
        "Think of a shop checkout. Latency is how long one customer waits; throughput is how many customers leave per hour. Opening more tills raises throughput, but on a quiet day nobody gets out faster.",
      ],
      metrics: [
        { label: "Load", value: "50 req/s" },
        { label: "Busy", value: "13%" },
        { label: "p50 latency", value: "35 ms" },
      ],
      scene: flowing(1),
    },
    {
      kind: "problem",
      short: "Busier",
      title: "More learners, same server",
      body: [
        "An exam week begins and traffic grows sixfold: 300 requests a second. The Quiz API can handle about 400, so it is now 75% busy.",
        "It still keeps up, but requests sometimes find it already working and have to **wait in a queue**. Waiting is latency too.",
      ],
      callout: { kind: "good", text: "Utilization is the share of time the server is busy." },
      changes: [
        { op: "~", text: "Load 50 → 300 req/s" },
        { op: "~", text: "Busy 13% → 75%" },
        { op: "+", text: "A short queue forms" },
      ],
      metrics: [
        { label: "Load", value: "300 req/s" },
        { label: "Busy", value: "75%" },
        { label: "p50 latency", value: "45 ms" },
        { label: "p99 latency", value: "320 ms" },
      ],
      scene: patch(flowing(3), { nodes: { api: { queue: 2 }, crowd: { sub: "6,000 online" } } }),
    },
    {
      kind: "problem",
      short: "The knee",
      title: "The hockey stick",
      body: [
        "Traffic grows by another quarter to 380 requests a second: 95% busy. Throughput barely rises, but the queue explodes and the slowest requests take seconds.",
        "Requests don't arrive evenly. With spare capacity, a burst drains quickly. With almost none, every burst piles up behind the last one.",
      ],
      quiz: {
        question: "The server handles 400 req/s. Which change hurts latency more?",
        options: [
          "Going from 200 to 300 req/s",
          "Going from 300 to 380 req/s",
          "Both hurt equally",
        ],
        answer: 1,
        why: "Latency grows slowly at first, then suddenly near 100% busy. That is why teams plan to run at about 60–70% at peak.",
      },
      changes: [
        { op: "~", text: "Busy 75% → 95%" },
        { op: "~", text: "p99 latency 320 ms → 3.4 s" },
      ],
      metrics: [
        { label: "Load", value: "380 req/s" },
        { label: "Busy", value: "95%", tone: "bad" },
        { label: "p50 latency", value: "210 ms", tone: "bad" },
        { label: "p99 latency", value: "3.4 s", tone: "bad" },
      ],
      scene: patch(flowing(4), {
        nodes: { api: { queue: 9, state: "hot", badge: "95%" }, crowd: { sub: "7,600 online" } },
      }),
    },
    {
      kind: "insight",
      short: "Percentiles",
      title: "Averages hide the pain",
      body: [
        "At 75% busy most requests are quick, but a few get stuck behind slow ones. The average, about 70 ms, blends them away and looks healthy.",
        "So we measure **percentiles**. p50 is the time half of all requests beat; p99 is the time only 1 request in 100 exceeds.",
      ],
      callout: {
        kind: "watch",
        text: "A page that makes 20 calls hits at least one p99 on about 1 load in 5 (1 − 0.99²⁰ ≈ 18%). Tail latency is what learners feel.",
      },
      metrics: [
        { label: "Average", value: "70 ms" },
        { label: "p50", value: "45 ms" },
        { label: "p99", value: "320 ms", tone: "bad" },
      ],
      scene: patch(flowing(3), {
        nodes: { api: { queue: 2 }, crowd: { sub: "6,000 online" } },
        links: [
          link(
            "crowd",
            "api",
            { kind: "request", rate: 3 },
            { kind: "heavy", rate: 1 },
            { kind: "response", back: true, rate: 3 },
          ),
          both("api", "store", 1),
        ],
      }),
    },
    {
      kind: "solution",
      short: "Headroom",
      title: "Buy back latency with headroom",
      body: [
        "Double the Quiz API's capacity and the same 300 requests a second are only 38% of what it can do. The queue drains, and both p50 and p99 fall.",
        "Throughput didn't change, because demand didn't change. What changed is the spare room to absorb bursts.",
      ],
      callout: {
        kind: "key",
        text: "To cut latency under load, lower utilization: more capacity, or less work per request.",
      },
      changes: [
        { op: "~", text: "Capacity 400 → 800 req/s" },
        { op: "~", text: "Busy 75% → 38%" },
        { op: "-", text: "Queue gone" },
      ],
      metrics: [
        { label: "Load", value: "300 req/s" },
        { label: "Busy", value: "38%", tone: "good" },
        { label: "p99 latency", value: "90 ms", tone: "good" },
      ],
      scene: patch(flowing(3), {
        nodes: { api: { sub: "800 req/s max", size: 1.25 }, crowd: { sub: "6,000 online" } },
      }),
    },
    {
      kind: "insight",
      short: "Physics",
      title: "Distance is latency too",
      body: [
        "Light in optical fibre covers about 200 km per millisecond. Chennai to Frankfurt is about 7,000 km, so a round trip can never be faster than 70 ms, and in practice it is nearer 140 ms.",
        "No server upgrade beats physics. To cut this latency you move the data closer: caches, CDNs, more regions.",
      ],
      metrics: [
        { label: "Fibre speed", value: "200 km/ms" },
        { label: "Best round trip", value: "70 ms" },
        { label: "Real round trip", value: "≈ 140 ms", tone: "bad" },
      ],
      scene: patch(flowing(2), {
        nodes: { crowd: { label: "Learners in Chennai", x: -4.5 } },
        links: [
          link(
            "crowd",
            "api",
            { kind: "request", rate: 2, speed: 3 },
            { kind: "response", back: true, rate: 2, speed: 3 },
          ),
          both("api", "store", 1),
        ],
        notes: [{ x: -1.5, y: 0.7, text: "7,000 km of fibre" }],
      }),
    },
    {
      kind: "insight",
      short: "Little's law",
      title: "Little's law: how much is in flight",
      body: [
        "One rule ties the numbers together: **requests in flight = throughput × latency**. At 300 requests a second taking 0.05 s each, about 15 are being worked on at any moment.",
        "Each one holds a thread, a database connection or some memory. If the database slows and latency becomes 1 second, 300 are in flight, and a pool sized for 50 runs dry.",
      ],
      quiz: {
        question: "300 req/s, and each now takes 0.4 s. How many are in flight?",
        options: ["30", "120", "750"],
        answer: 1,
        why: "300 × 0.4 = 120. Use this to size thread pools and connection pools, and to see why one slow dependency exhausts them.",
      },
      metrics: [
        { label: "Throughput", value: "300 /s" },
        { label: "Latency", value: "0.05 s" },
        { label: "In flight", value: "15" },
      ],
      scene: patch(flowing(3), { nodes: { api: { badge: "15 in flight" } } }),
    },
    {
      kind: "tradeoff",
      short: "Batching",
      title: "Batching: more throughput, a bit more latency",
      body: [
        "Every quiz answer is logged for analytics. Written one row at a time, the database manages about 1,500 inserts a second, mostly overhead per statement.",
        "Collect answers for up to 100 ms and write 200 rows in one statement. Throughput jumps more than twentyfold, while each answer waits at most 100 ms longer.",
      ],
      callout: {
        kind: "key",
        text: "Batching trades latency for throughput: great for logs and analytics, wrong for a learner waiting on a click.",
      },
      changes: [
        { op: "+", text: "Writes batched: 200 rows / 100 ms" },
        { op: "~", text: "1,500 → 35,000 rows/s" },
      ],
      metrics: [
        { label: "Rows/s", value: "35,000", tone: "good" },
        { label: "Extra wait", value: "≤ 100 ms" },
      ],
      scene: {
        nodes: [crowd, api, store],
        links: [
          both("crowd", "api", 3),
          link("api", "store", { kind: "write", rate: 1 }, { kind: "heavy", rate: 1 }),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Latency is time per request; throughput is requests per second.",
        "Latency explodes as utilization nears 100%, so keep headroom.",
        "Watch p99, not the average: the tail is what people feel.",
        "Distance adds latency no server can remove.",
        "In flight = throughput × latency; batching buys throughput with latency.",
      ],
      scene: flowing(2),
    },
  ],
};

/* ---------------------------------- Napkin math ---------------------------------- */

const learners = node("learners", "user", "5M learners / day", -3, 0);
const front = node("front", "lb", "Load balancer", -0.5, 0);
const appRow = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    node(`s${i}`, "server", `App ${i + 1}`, 2, -2 + (4 / Math.max(n - 1, 1)) * i),
  );

export const NAPKIN_MATH: Lesson = {
  id: "napkin-math",
  title: "Napkin math",
  tagline:
    'Turn "five million learners" into servers, terabytes and gigabits, with arithmetic that fits on a napkin.',
  minutes: 10,
  level: "beginner",
  learn: [
    "Turn daily users into requests per second",
    "Size for the peak, not the average",
    "Estimate servers, storage, bandwidth and memory",
    "Round boldly: orders of magnitude, not decimals",
    "A handful of numbers worth remembering",
  ],
  steps: [
    {
      kind: "problem",
      short: "How big?",
      title: "Will one server do?",
      body: [
        "AlgoVerse's sponsors expect **5 million learners a day** next year. Before choosing any technology we need a feel for the scale: is this one server, or a hundred?",
        "We don't need exact numbers, only the right order of magnitude. Napkin math gets there in minutes.",
      ],
      callout: {
        kind: "key",
        text: "Architects and interviewers both start here: rough numbers first, then a design that fits them.",
      },
      scene: { nodes: [learners, node("one", "server", "One server?", 1.5, 0, { badge: "?" })] },
    },
    {
      kind: "technique",
      short: "Per second",
      title: "From learners a day to requests a second",
      body: [
        "Start from what you know. 5M learners × about 40 requests each (pages, quiz answers, code runs) = **200 million requests a day**.",
        "A day has 86,400 seconds. Round it to 100,000: napkin math values speed over precision. 200M ÷ 100k = **2,000 requests a second** on average.",
      ],
      callout: {
        kind: "good",
        text: "Handy shortcut: 1 million requests a day ≈ 12 requests a second.",
      },
      metrics: [
        { label: "Per day", value: "200M" },
        { label: "Average", value: "2,000 /s" },
      ],
      scene: {
        nodes: [learners, node("one", "server", "One server?", 1.5, 0, { badge: "2,000/s" })],
        links: [both("learners", "one", 3)],
      },
    },
    {
      kind: "insight",
      short: "Peak",
      title: "Plan for the peak, not the average",
      body: [
        "Traffic isn't flat. Learners study in the evening and cram before exams; a typical peak is 2–3 times the daily average.",
        "Size for 3×, about **6,000 requests a second**, and a single server is clearly overwhelmed.",
      ],
      callout: {
        kind: "watch",
        text: "A system sized for its average falls over at exactly the moment most people are using it.",
      },
      metrics: [
        { label: "Average", value: "2,000 /s" },
        { label: "Peak (×3)", value: "6,000 /s", tone: "bad" },
      ],
      scene: {
        nodes: [
          learners,
          node("one", "server", "One server?", 1.5, 0, {
            state: "hot",
            queue: 8,
            badge: "6,000/s",
          }),
        ],
        links: [both("learners", "one", 4)],
      },
    },
    {
      kind: "solution",
      short: "Servers",
      title: "How many servers?",
      body: [
        "A load test shows one app server handles about **800 requests a second**. Keep 30% headroom for bursts and failures, so plan on 560 each.",
        "6,000 ÷ 560 ≈ 11 servers behind a load balancer. Notice we used a measured number, not a guess.",
      ],
      quiz: {
        question:
          "If a code change halves the work per request, roughly how many servers does the peak need?",
        options: ["About 6", "About 11", "About 22"],
        answer: 0,
        why: "Each server now handles about 1,600 req/s, 1,120 with headroom: 6,000 ÷ 1,120 ≈ 5.4, so about 6.",
      },
      changes: [
        { op: "+", text: "Load balancer" },
        { op: "+", text: "Web tier: 11 servers (6 drawn)" },
      ],
      metrics: [
        { label: "Peak", value: "6,000 /s" },
        { label: "Per server", value: "560 /s" },
        { label: "Servers", value: "≈ 11", tone: "good" },
      ],
      scene: {
        nodes: [learners, front, ...appRow(6)],
        links: [both("learners", "front", 3), ...appRow(6).map((s) => both("front", s.id, 1))],
      },
    },
    {
      kind: "technique",
      short: "Storage",
      title: "How much storage?",
      body: [
        "Code submissions are the big one: 2M a day × 4 KB = 8 GB a day, about **3 TB a year**.",
        "Data is usually kept in three copies so a dead disk loses nothing: plan for about 9 TB in year one. Lesson videos add a fixed 600 GB. Comfortable for one database cluster, but only because each submission is small.",
      ],
      callout: {
        kind: "key",
        text: "Storage grows every day and never resets. Requests come and go; bytes stay.",
      },
      metrics: [
        { label: "Per day", value: "8 GB" },
        { label: "Per year", value: "≈ 3 TB" },
        { label: "× 3 copies", value: "≈ 9 TB" },
      ],
      scene: {
        nodes: [
          learners,
          front,
          ...appRow(3),
          node("db", "db", "Database", 4.5, 0, { sub: "9 TB, 3 copies" }),
        ],
        links: [
          both("learners", "front", 2),
          ...appRow(3).map((s) => both("front", s.id, 1)),
          ...appRow(3).map((s) => link(s.id, "db", "write")),
        ],
      },
    },
    {
      kind: "technique",
      short: "Bandwidth",
      title: "How much network?",
      body: [
        "Say 30M page views a day, each about 1.5 MB once scripts, fonts and images are counted: 45 TB a day going out.",
        "45 TB ÷ 100,000 s ≈ 450 MB/s, about **3.6 Gbit/s** on average and three times that at peak. That is a job for a CDN, not for eleven app servers.",
      ],
      callout: {
        kind: "key",
        text: "Content-heavy apps are often limited by bandwidth before CPU. Estimate bytes out, not just requests.",
      },
      metrics: [
        { label: "Out per day", value: "45 TB" },
        { label: "Average", value: "3.6 Gbit/s" },
        { label: "Peak", value: "≈ 11 Gbit/s", tone: "bad" },
      ],
      scene: {
        nodes: [
          learners,
          front,
          ...appRow(3),
          node("cdn", "cdn", "CDN", -0.5, -2.6, { sub: "serves static files" }),
        ],
        links: [
          both("learners", "front", 1),
          ...appRow(3).map((s) => both("front", s.id, 1)),
          link(
            "learners",
            "cdn",
            { kind: "request", rate: 3 },
            { kind: "heavy", back: true, rate: 3 },
          ),
        ],
      },
    },
    {
      kind: "technique",
      short: "Memory",
      title: "Will the hot data fit in memory?",
      body: [
        "Every page needs the learner's profile and progress. 5M × 1 KB = 5 GB. Today's leaderboards and lesson metadata add under 1 GB.",
        "About 6 GB fits in the memory of a single cache server, with a second one as a spare. Nothing exotic needed.",
      ],
      callout: {
        kind: "good",
        text: 'Napkin math often says "smaller than you think". That is just as valuable as finding something huge.',
      },
      metrics: [
        { label: "Profiles", value: "5 GB" },
        { label: "Other hot data", value: "< 1 GB" },
        { label: "Cache", value: "1 server + spare", tone: "good" },
      ],
      scene: {
        nodes: [
          learners,
          front,
          ...appRow(3),
          node("cache", "cache", "Cache", 4.5, 0, { sub: "≈ 6 GB hot data" }),
        ],
        links: [
          both("learners", "front", 2),
          ...appRow(3).map((s) => both("front", s.id, 1)),
          ...appRow(3).map((s) => both(s.id, "cache", 1)),
        ],
      },
    },
    {
      kind: "insight",
      short: "Numbers",
      title: "Numbers worth remembering",
      body: [
        "A handful of numbers make almost every estimate possible. Learn the orders of magnitude, not the decimals.",
      ],
      table: {
        head: ["What", "Roughly"],
        rows: [
          ["Read from memory", "100 ns"],
          ["Read from an SSD", "100 µs"],
          ["Round trip in one data centre", "0.5 ms"],
          ["Round trip across a continent", "50–150 ms"],
          ["Seconds in a day", "≈ 100,000"],
          ["1 KB × 1 million", "1 GB"],
        ],
      },
      scene: {
        nodes: [
          learners,
          front,
          ...appRow(3),
          node("cache", "cache", "Cache", 4.5, -1.2),
          node("db", "db", "Database", 4.5, 1.2),
        ],
        links: [
          both("learners", "front", 2),
          ...appRow(3).map((s) => both("front", s.id, 1)),
          both("s0", "cache", 1),
          both("s2", "db", 1),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Users × actions ÷ 100,000 s gives the average requests per second.",
        "Multiply by 2–3 for the peak, and size for that.",
        "Servers = peak ÷ measured capacity per server, plus headroom.",
        "Storage = items a day × size × 365 × copies.",
        "Estimate bytes out and memory too: they often decide the design.",
      ],
      callout: {
        kind: "key",
        text: "Next module: what to do when the numbers say one machine won't do.",
      },
      scene: {
        nodes: [
          learners,
          front,
          ...appRow(3),
          node("cache", "cache", "Cache", 4.5, -1.2),
          node("db", "db", "Database", 4.5, 1.2),
        ],
        links: [
          both("learners", "front", 2),
          ...appRow(3).map((s) => both("front", s.id, 1)),
          both("s0", "cache", 1),
          both("s2", "db", 1),
        ],
      },
    },
  ],
};
