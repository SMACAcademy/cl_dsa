import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const PHOTO_CONTEST: CaseStudy = caseStudy(
  {
    id: "photo-contest",
    title: "A national photo contest",
    tagline:
      "A magazine invites everyone to submit photos for a week, then the public votes. Size the storage, the uploads and the voting day.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "latency-throughput", "request-journey"],
    learn: [
      "Estimate storage from entries and file sizes",
      "Size upload bandwidth for the last day",
      "See why voting is a different kind of load",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One week to enter, one day to vote",
      body: [
        "A magazine runs a photo contest. Anyone can submit up to 3 photos during one week; then on voting day the public browses finalists and votes. Last year 80,000 people entered.",
      ],
      add: [
        node("entrants", "phone", "Entrants", -4.4, 0),
        node("site", "server", "Contest site", 0, 0),
        node("store", "storage", "Photo storage", 3.4, 0),
      ],
      link: [both("entrants", "site", 2), link("site", "store", "heavy")],
    },
    {
      kind: "technique",
      short: "Storage",
      uses: "napkin-math",
      title: "How much storage?",
      body: [
        "Expect 100,000 entrants this year × 2.5 photos × 8 MB (full-resolution) = **2 TB** of originals. Thumbnails and web-sized copies add about 10%. That's modest: the cost is a few dollars a month in object storage.",
      ],
      metrics: [
        { label: "Photos", value: "≈ 250,000" },
        { label: "Storage", value: "≈ 2.2 TB" },
      ],
    },
    {
      kind: "problem",
      short: "Last day",
      uses: "latency-throughput",
      title: "Everyone uploads on the last evening",
      body: [
        "Like every deadline, 40% of entries arrive in the final 6 hours: 100,000 photos × 8 MB = 800 GB in 21,600 s ≈ **37 MB/s**, about 300 Mbit/s, much higher in the last hour. The site's 100 Mbit/s link was the bottleneck last year.",
      ],
      set: { site: { state: "hot", badge: "link full" } },
    },
    {
      kind: "insight",
      short: "One upload",
      uses: "request-journey",
      title: "Trace one upload",
      body: [
        "An 8 MB photo over a typical 10 Mbit/s home upload takes about **6.4 seconds** of transfer. If it passes through the site's server on the way to storage, the server holds that connection the whole time, and also pays for the bytes twice.",
      ],
      quiz: {
        question: "Why not just buy a faster link for the contest site?",
        options: [
          "Faster links don't exist",
          "The server would still sit in the middle of every upload; sending photos straight to storage removes the bottleneck entirely",
          "Uploads don't use bandwidth",
        ],
        answer: 1,
        why: "Direct uploads to storage take the server out of the byte path; it only hands out upload permissions.",
      },
    },
    {
      kind: "solution",
      short: "Direct",
      uses: "request-journey",
      title: "Photos go straight to storage",
      body: [
        "The site gives each entrant a short-lived upload link; the phone sends the photo directly to object storage, which handles any number of parallel uploads. The site only records the entry: a tiny request.",
      ],
      unlink: ["site>store"],
      link: [link("entrants", "store", { kind: "heavy", rate: 3 }), link("site", "store", "write")],
      set: { site: { state: "ok", badge: "" } },
    },
    {
      kind: "technique",
      short: "Voting",
      uses: "latency-throughput",
      title: "Voting day is many tiny requests",
      body: [
        "Voting is the opposite shape: 500,000 visitors browse 200 finalists and each casts a vote. Pages are image-heavy (served as resized copies), but each vote is a few hundred bytes. The limit is requests per second, not bandwidth: at 1,000 votes a second, each vote must take well under a millisecond of database work.",
      ],
      metrics: [
        { label: "Votes at peak", value: "≈ 1,000 /s" },
        { label: "Bytes per vote", value: "≈ 300" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Two very different weeks",
      body: [
        "Storage is small: ≈ 2.2 TB for the whole contest.",
        "The last evening needs ≈ 300 Mbit/s of uploads.",
        "Tracing one upload showed the server shouldn't carry the bytes: upload straight to storage.",
        "Voting day is about requests per second, not bandwidth.",
      ],
    },
  ],
);

/* ============ After Scaling ============ */

export const RESTAURANT_REVIEWS: CaseStudy = caseStudy(
  {
    id: "restaurant-reviews",
    title: "A restaurant reviews site",
    tagline:
      "Millions read reviews, few write them. Make the pages fast and cheap, and still show a new review within a minute.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["caching", "cdn", "load-balancing", "stateless"],
    learn: [
      "Spot a read-heavy workload",
      "Cache whole pages and bust them on change",
      "Serve photos from the edge",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Two hundred reads for every review",
      body: [
        "A city restaurant guide has 40,000 restaurant pages, each with photos, ratings and reviews. 6 million page views a day, but only 30,000 new reviews: 200 reads for every write.",
      ],
      add: [
        node("diners", "phone", "Diners", -4.4, 0),
        node("web", "server", "Web server", 0, 0),
        node("db", "db", "Reviews DB", 3.4, 0, { state: "hot" }),
      ],
      link: [both("diners", "web", 3), both("web", "db", 3)],
    },
    {
      kind: "solution",
      short: "Page cache",
      uses: "caching",
      title: "Cache the whole restaurant page",
      body: [
        "Building a page takes 6 queries (details, rating, latest reviews, photos, hours, nearby). The rendered page is cached for 10 minutes; 95% of views are served from memory and the database relaxes.",
      ],
      add: [node("cache", "cache", "Page cache", 0, -2.4, { sub: "10 min" })],
      link: [both("web", "cache", 3)],
      set: { db: { state: "ok" } },
      metrics: [{ label: "Cache hit rate", value: "≈ 95%", tone: "good" }],
    },
    {
      kind: "technique",
      short: "Fresh",
      uses: "caching",
      title: "New review? Clear that one page",
      body: [
        "A reviewer expects to see their review straight away. When a review is saved, that restaurant's cached page is deleted, so the next visitor rebuilds it with the new review. Other restaurants' pages keep their cache.",
      ],
      quiz: {
        question:
          "Why delete the cached page instead of shortening every page's cache time to 10 seconds?",
        options: [
          "Deleting is faster to code",
          "Only one page changed; a short time for all pages would rebuild 40,000 pages constantly for nothing",
          "Short cache times are not allowed",
        ],
        answer: 1,
        why: "Targeted invalidation keeps the cache long for everything that didn't change and fresh for what did.",
      },
    },
    {
      kind: "solution",
      short: "Photos",
      uses: "cdn",
      title: "Photos from the edge",
      body: [
        "Food photos are 85% of each page's bytes. They're resized once into a few sizes and served by a CDN with versioned URLs.",
      ],
      add: [node("cdn", "cdn", "Photo CDN", -2.4, -2.4)],
      link: [link("diners", "cdn", "request", { kind: "heavy", back: true, rate: 3 })],
    },
    {
      kind: "solution",
      short: "Pool",
      uses: "load-balancing",
      title: "Two web servers, then more",
      body: [
        "A load balancer spreads traffic over two web servers, so one can be updated or fail without downtime. Friday evening's dinner rush gets a third.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -2, 0.8),
        node("web2", "server", "Web server 2", 0, 2.4),
      ],
      unlink: ["diners>web"],
      link: [
        both("diners", "lb", 3),
        both("lb", "web", 2),
        both("lb", "web2", 2),
        both("web2", "cache", 3),
        both("web2", "db", 1),
      ],
    },
    {
      kind: "technique",
      short: "Stateless",
      uses: "stateless",
      title: "Signed-in users on any server",
      body: [
        "A reviewer's session is a signed cookie, and their draft review is autosaved to the database, not kept in one server's memory. Any server can handle any request.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Read-heavy, done right",
      body: [
        "Cache what everyone reads, clear exactly what changed, keep servers interchangeable.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["200 reads per write", "10-minute page cache", "Caching"],
          ["New reviews show at once", "clear that page on write", "Caching"],
          ["Heavy photos", "CDN with versioned URLs", "CDNs"],
          ["No single server", "balanced pool", "Load balancing"],
          ["Any server, any user", "signed cookies, saved drafts", "Stateless services"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const HOTEL_ROOMS: CaseStudy = caseStudy(
  {
    id: "hotel-rooms",
    title: "Hotel room availability across dates",
    tagline:
      "A booking covers several nights. Every night must be free, or none are booked. Thousands of hotels, millions of searches.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["transactions", "sharding", "caching", "cap", "indexes"],
    learn: [
      "Book several nights atomically",
      "Shard inventory by hotel",
      "Search from cached availability, book from the truth",
      "Choose what to do during a partition",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Three nights in Jaipur",
      body: [
        'A booking site lists 30,000 hotels. A guest searches "Jaipur, 12–15 Dec, 2 adults" and books a deluxe room for three nights. Each hotel has a fixed number of rooms of each type per night.',
      ],
      add: [
        node("guests", "browser", "Guests", -4.6, 0),
        node("app", "service", "Booking service", -1.2, 0),
        node("inv", "db", "Room inventory", 2.4, 0),
      ],
      link: [both("guests", "app", 3), both("app", "inv", 2)],
    },
    {
      kind: "technique",
      short: "All nights",
      uses: "transactions",
      title: "All three nights, or none",
      body: [
        'Inventory is one row per hotel, room type and night. A booking decrements three rows in **one transaction**; if any night has no rooms left, the whole booking rolls back and the guest sees "not available for all your dates".',
      ],
      code: [
        "BEGIN;",
        "UPDATE rooms SET left = left - 1",
        "WHERE hotel = 81 AND type = 'deluxe' AND night IN ('12-12','12-13','12-14') AND left > 0;",
        "-- 3 rows updated → COMMIT;  fewer → ROLLBACK",
      ],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by hotel",
      body: [
        "A booking always involves one hotel, so inventory is sharded by hotel id. The multi-night transaction stays on one shard; no distributed transaction is needed.",
      ],
      add: [node("inv2", "db", "Inventory shard 2", 2.4, 2.4, { size: 0.85 })],
      set: { inv: { label: "Inventory shard 1", size: 0.85 } },
      link: [both("app", "inv2", 2)],
    },
    {
      kind: "solution",
      short: "Search",
      uses: "caching",
      title: "Search from a cached availability view",
      body: [
        'Searches outnumber bookings 300 to 1. A search service keeps a cached summary ("hotel 81 has deluxe rooms on these nights, from ₹6,200"), refreshed every minute. The booking itself always checks the shard.',
      ],
      add: [
        node("avail", "cache", "Availability cache", -1.2, -2.6, { sub: "refreshed every minute" }),
      ],
      link: [both("app", "avail", 3), link("inv", "avail", "copy"), link("inv2", "avail", "copy")],
    },
    {
      kind: "technique",
      short: "Index",
      uses: "indexes",
      title: "Find hotels by city and date",
      body: [
        'The availability view is indexed by `(city, night)`, so "Jaipur on 12, 13 and 14 December" reads three small slices and intersects the hotel lists, instead of checking 30,000 hotels.',
      ],
      quiz: {
        question: 'Search showed a room, but booking says "sold out". Is the system broken?',
        options: [
          "Yes, search should never be wrong",
          "No: search uses a cache up to a minute old; the booking checks the truth and the guest is offered alternatives",
          "Yes, the transaction failed",
        ],
        answer: 1,
        why: "Search trades a little freshness for speed; the booking transaction keeps correctness.",
      },
    },
    {
      kind: "tradeoff",
      short: "Partition",
      uses: "cap",
      title: "When a shard is unreachable",
      body: [
        'If shard 2 is cut off, its hotels can still appear in search (from cache), but booking them is refused with "try again in a few minutes" rather than risking an overbooking. Hotels on other shards are unaffected.',
      ],
      set: { inv2: { state: "down", badge: "unreachable" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every night, or no night",
      body: ["One transaction per booking, one shard per hotel, a cache for searching."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["All nights together", "multi-row transaction", "Transactions"],
          ["Scale inventory", "shard by hotel", "Sharding"],
          ["300 searches per booking", "minute-fresh availability cache", "Caching"],
          ["Fast city search", "(city, night) index", "Indexes"],
          ["Shard unreachable", "refuse bookings, keep search", "CAP"],
        ],
      },
      set: { inv2: { state: "ok", badge: "" } },
    },
  ],
);

export const NEARBY_SEARCH: CaseStudy = caseStudy(
  {
    id: "nearby-search",
    title: '"Pharmacies near me"',
    tagline:
      "Find open shops within 2 km of a phone, sorted by distance, from 3 million listings, in under 100 ms.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["indexes", "sharding", "caching", "sql-nosql"],
    learn: [
      "Turn a location into a searchable key",
      "Index places by grid cell",
      "Shard by region",
      "Cache busy neighbourhoods",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Open now, within 2 km",
      body: [
        'A local-search app lists 3 million shops, clinics and pharmacies with their location and opening hours. A user taps "Pharmacies near me" at 11 pm and expects the nearest open ones instantly.',
      ],
      add: [
        node("users", "phone", "Users", -4.4, 0),
        node("api", "service", "Search API", -1, 0),
        node("places", "db", "Places DB", 2.6, 0),
      ],
      link: [both("users", "api", 3), both("api", "places", 2)],
    },
    {
      kind: "problem",
      short: "Slow",
      uses: "indexes",
      title: "Distance can't use a normal index",
      body: [
        '"Distance from me < 2 km" depends on the user\'s position, so an ordinary index on latitude or longitude only narrows one direction. The first version computed distance for every pharmacy in the country: 900 ms.',
      ],
      set: { places: { state: "hot", badge: "900 ms" } },
    },
    {
      kind: "solution",
      short: "Grid",
      uses: "indexes",
      title: "Cut the map into cells",
      body: [
        "The map is divided into a grid of cells (about 1 km across), each with a short code. Every place stores its cell code, and an index on `(category, cell)` finds pharmacies in the user's cell and the 8 around it. Only those few hundred get exact distances.",
      ],
      quiz: {
        question: "Why also search the 8 neighbouring cells?",
        options: [
          "To show more results",
          "The user may be near a cell edge; the nearest pharmacy could be just across it",
          "Cells overlap anyway",
        ],
        answer: 1,
        why: "A circle around the user crosses cell boundaries; checking neighbours avoids missing close places.",
      },
      add: [node("grid", "search", "Cell index", 2.6, -2.4, { sub: "(category, cell)" })],
      link: [both("api", "grid", 3)],
      set: { places: { state: "ok", badge: "" } },
    },
    {
      kind: "technique",
      short: "Model",
      uses: "sql-nosql",
      title: "Hours as data, not text",
      body: [
        '"Open now" needs opening hours as structured rows (day, opens, closes), not free text. Filtering by open-now happens after the cell lookup, on the few hundred candidates.',
      ],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Shard by region",
      body: [
        "Searches are local, so places are sharded by region (a set of cells). A search touches one shard, or two near a regional border. Busy cities can get their own shard.",
      ],
      add: [node("places2", "db", "Region shard 2", 2.6, 2.4)],
      set: { places: { label: "Region shard 1" } },
      link: [both("api", "places2", 1)],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache by cell and category",
      body: [
        'Many people search "pharmacy" in the same few cells of a city centre. Results for (cell, category) are cached for 5 minutes; the API only sorts them by each user\'s exact distance.',
      ],
      add: [node("cache", "cache", "Cell results cache", -1, -2.6, { sub: "5 min" })],
      link: [both("api", "cache", 3)],
      metrics: [
        { label: "Search p95", value: "38 ms", tone: "good" },
        { label: "Cache hit rate", value: "≈ 70%" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Nearby, open, fast",
      body: ["Turn space into cells, index the cells, shard by region, cache busy cells."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Distance queries", "grid cells + (category, cell) index", "Indexes"],
          ["Open now", "structured opening hours", "SQL and NoSQL"],
          ["3 M places", "shard by region", "Sharding"],
          ["Busy centres", "cache per cell and category", "Caching"],
        ],
      },
    },
  ],
);

/* ============ After Communication ============ */

export const RIDE_TRIP: CaseStudy = caseStudy(
  {
    id: "ride-trip",
    title: "A ride-sharing trip, start to finish",
    tagline:
      "Request, match, pick up, ride, pay, rate. Every step changes the trip's state and several apps must hear about it.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["pubsub", "realtime", "transactions", "queues", "apis"],
    learn: [
      "Model a trip as a state machine",
      "Match exactly one driver to a trip",
      "Push trip updates to rider and driver",
      "Let other services react without coupling",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One trip, many moments",
      body: [
        "A rider requests a car; nearby drivers get an offer; one accepts; the car arrives; the trip starts and ends; payment and ratings follow. Each moment must show on both phones within a second.",
      ],
      add: [
        node("rider", "phone", "Rider", -4.6, -1.8),
        node("driver", "phone", "Driver", -4.6, 1.8),
        node("trips", "service", "Trip service", -1, 0),
        node("tdb", "db", "Trips DB", 2.4, 0),
      ],
      link: [both("rider", "trips", 1), both("driver", "trips", 1), link("trips", "tdb", "write")],
    },
    {
      kind: "technique",
      short: "States",
      uses: "apis",
      title: "A trip is a state machine",
      body: [
        "A trip moves through fixed states: requested → offered → accepted → arrived → in progress → completed (or cancelled). The API only allows valid moves: you can't complete a trip that never started.",
      ],
      code: [
        "POST /trips/{id}/accept   # offered → accepted",
        "POST /trips/{id}/start    # arrived → in_progress",
        "POST /trips/{id}/complete # in_progress → completed",
      ],
    },
    {
      kind: "technique",
      short: "One driver",
      uses: "transactions",
      title: "Exactly one driver accepts",
      body: [
        'The offer goes to three drivers. Two tap Accept within the same second. A conditional update (only if the trip is still "offered") lets the first win; the second sees "trip taken".',
      ],
      code: [
        "UPDATE trips SET state = 'accepted', driver = :d",
        "WHERE id = :t AND state = 'offered';   -- 1 row: you got it",
      ],
      quiz: {
        question: "Without the condition on state, what could happen?",
        options: [
          "Nothing different",
          "Both drivers would be recorded in turn, and both would drive to the rider",
          "The rider would pay twice",
        ],
        answer: 1,
        why: 'Checking the state inside the same update makes acceptance atomic: only one driver can move the trip out of "offered".',
      },
    },
    {
      kind: "solution",
      short: "Push",
      uses: "realtime",
      title: "Both phones update live",
      body: [
        'Rider and driver apps hold a live connection to a gateway. Every state change (and the driver\'s position every few seconds) is pushed to the right phones: "Ravi is 3 minutes away".',
      ],
      add: [node("gw", "gateway", "Live gateway", -2.8, -3.2)],
      link: [link("gw", "rider", "event"), link("gw", "driver", "event")],
    },
    {
      kind: "solution",
      short: "Events",
      uses: "pubsub",
      title: "Other services subscribe",
      body: [
        "Each change is published: **TripAccepted**, **TripCompleted**, **TripCancelled**. The gateway pushes to phones, Payments charges on completion, Ratings asks both sides, and Safety watches for unusual stops.",
      ],
      add: [
        node("bus", "stream", "Trip events", 0.6, -3.2),
        node("pay", "service", "Payments", 4.2, -3.2),
        node("ratings", "service", "Ratings", 4.2, -1.2),
      ],
      link: [
        link("trips", "bus", "event"),
        link("bus", "gw", "event"),
        link("bus", "pay", "event"),
        link("bus", "ratings", "event"),
      ],
    },
    {
      kind: "solution",
      short: "Payment",
      uses: "queues",
      title: "Payment runs from a queue",
      body: [
        'Charging the card can be slow or fail. **TripCompleted** puts a payment job on a queue; a worker charges with an idempotency key, retries on failure, and the rider sees "payment processing" rather than a spinner.',
      ],
      add: [node("payq", "queue", "Payment jobs", 4.2, 1.2, { queue: 3 })],
      link: [link("pay", "payq", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A trip everyone can follow",
      body: [
        "A strict state machine, atomic acceptance, live pushes, and events for everything else.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Valid steps only", "state-machine API", "APIs"],
          ["One driver", "conditional update", "Transactions"],
          ["Live phones", "pushed state and position", "Real-time updates"],
          ["Payments, ratings, safety", "trip events", "Pub/sub"],
          ["Reliable charging", "payment job queue", "Message queues"],
        ],
      },
    },
  ],
);

export const MOBILE_GATEWAY: CaseStudy = caseStudy(
  {
    id: "mobile-gateway",
    title: "One API for a mobile app's home screen",
    tagline:
      "The home screen calls nine services one after another on a slow network. Give the app one fast call instead.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["apis", "caching", "replication", "load-balancing", "timeouts-retries"],
    learn: [
      "Combine many calls into one for mobile",
      "Call services in parallel with deadlines",
      "Cache the parts that don't change per user",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Nine calls before anything shows",
      body: [
        "A shopping app's home screen needs the user's profile, cart count, banners, recommendations, recent orders, offers, categories, notifications and app config: nine calls to nine services, made one after another over mobile data.",
      ],
      add: [
        node("app", "phone", "Mobile app", -4.6, 0),
        node("s1", "service", "Profile", 1.6, -2.6, { size: 0.8 }),
        node("s2", "service", "Cart", 1.6, -0.9, { size: 0.8 }),
        node("s3", "service", "Recommendations", 1.6, 0.9, { size: 0.8 }),
        node("s4", "service", "Orders", 1.6, 2.6, { size: 0.8 }),
      ],
      link: [
        both("app", "s1", 1),
        both("app", "s2", 1),
        both("app", "s3", 1),
        both("app", "s4", 1),
      ],
      metrics: [{ label: "Home screen on 4G", value: "≈ 2.8 s", tone: "bad" }],
    },
    {
      kind: "solution",
      short: "One call",
      uses: "apis",
      title: "A home-screen endpoint",
      body: [
        "A gateway offers `GET /home`, which returns exactly what the home screen shows, shaped for the app. One round trip over the mobile network instead of nine.",
      ],
      add: [node("gw", "gateway", "Mobile gateway", -1.4, 0)],
      relink: [
        both("app", "gw", 2),
        both("gw", "s1", 1),
        both("gw", "s2", 1),
        both("gw", "s3", 1),
        both("gw", "s4", 1),
      ],
    },
    {
      kind: "technique",
      short: "Parallel",
      uses: "timeouts-retries",
      title: "Call services in parallel, with a deadline",
      body: [
        "Inside the data centre the gateway calls all nine services at once, each with a 150 ms deadline. If recommendations are slow, the response goes without them (the app shows popular items) instead of making everyone wait.",
      ],
      quiz: {
        question: "Recommendations take 2 seconds today. What does the home screen show?",
        options: [
          "Nothing until all nine answer",
          "Everything else on time; a fallback where recommendations would be",
          "An error",
        ],
        answer: 1,
        why: "Per-call deadlines and optional sections keep one slow service from delaying the whole screen.",
      },
      set: { s3: { state: "hot", badge: "slow" } },
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache what isn't personal",
      body: [
        "Banners, categories and app config are the same for everyone in a city and change a few times a day: cached for 5 minutes in the gateway. Only profile, cart and orders are fetched per user.",
      ],
      add: [node("cache", "cache", "Shared sections", -1.4, -2.6, { sub: "5 min" })],
      link: [both("gw", "cache", 3)],
      set: { s3: { state: "ok", badge: "" } },
    },
    {
      kind: "solution",
      short: "Replicas",
      uses: "replication",
      title: "Read recent orders from a replica",
      body: [
        "The home screen only shows the last three orders. They're read from an orders replica, so heavy home-screen traffic never competes with checkout on the orders primary.",
      ],
      add: [node("orep", "db", "Orders replica", 4.4, 2.6, { hue: "teal" })],
      link: [both("s4", "orep", 2)],
    },
    {
      kind: "solution",
      short: "Pool",
      uses: "load-balancing",
      title: "Gateways behind a balancer",
      body: [
        "Every app launch hits the gateway, so it runs as a pool behind a load balancer and scales with traffic. It holds no state, so any instance can serve any user.",
      ],
      add: [node("lb", "lb", "Load balancer", -3, 1.6)],
      unlink: ["app>gw"],
      link: [both("app", "lb", 2), both("lb", "gw", 2)],
      metrics: [{ label: "Home screen on 4G", value: "≈ 0.6 s", tone: "good" }],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "One fast call",
      body: ["Shape the API for the screen, fan out in parallel, cache shared parts."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Too many round trips", "one GET /home", "APIs"],
          ["One slow service", "parallel calls with deadlines", "Timeouts and retries"],
          ["Shared sections", "5-minute gateway cache", "Caching"],
          ["Protect checkout", "orders read from a replica", "Replication"],
          ["Every launch", "gateway pool behind a balancer", "Load balancing"],
        ],
      },
    },
  ],
);
