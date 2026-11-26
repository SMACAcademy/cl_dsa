import type { NodeKind } from "../model";
import type { Check, DesignLink, DesignNode, LabProblem, PaletteItem } from "./model";
import {
  behind,
  CLIENTS,
  COMPUTE,
  count,
  eachOwns,
  guarded,
  has,
  kinds,
  linked,
  linkedFrom,
  MESSAGING,
  neverWaitsOn,
  noSharedStore,
  reaches,
  role,
  type Sel,
} from "./rules";

/* ---------- small builders ---------- */

const n = (id: string, kind: NodeKind, label: string, col: number, row: number, r?: string) =>
  ({ id, kind, label, col, row, ...(r ? { role: r } : {}) }) satisfies DesignNode;
const s = (from: string, to: string): DesignLink => ({ from, to, mode: "sync" });
const a = (from: string, to: string): DesignLink => ({ from, to, mode: "async" });
const check = (
  id: string,
  label: string,
  hint: string,
  points: number,
  pass: Check["pass"],
): Check => ({ id, label, hint, points, pass });

const P: Record<string, PaletteItem> = {
  user: { kind: "user", label: "Users", hint: "People using the system" },
  phone: { kind: "phone", label: "Mobile app", hint: "The app on people's phones" },
  browser: { kind: "browser", label: "Web browser", hint: "People on the website" },
  lb: { kind: "lb", label: "Load balancer", hint: "Spreads requests across servers" },
  gateway: {
    kind: "gateway",
    label: "API gateway",
    hint: "One front door: checks, routing, limits",
  },
  server: { kind: "server", label: "App server", hint: "Runs your code; add several for capacity" },
  service: { kind: "service", label: "Service", hint: "One part of the system with its own job" },
  worker: { kind: "worker", label: "Worker", hint: "Does background jobs" },
  db: { kind: "db", label: "Database", hint: "Keeps records safely" },
  cache: { kind: "cache", label: "Cache", hint: "Fast copies of popular answers, in memory" },
  cdn: { kind: "cdn", label: "CDN", hint: "Serves files from servers near the user" },
  queue: { kind: "queue", label: "Queue", hint: "Holds jobs until a worker takes them" },
  stream: { kind: "stream", label: "Event stream", hint: "Events that many readers can follow" },
  storage: { kind: "storage", label: "File storage", hint: "Big files: photos, videos, exports" },
  search: { kind: "search", label: "Search index", hint: "Finds records by words, fast" },
  monitor: { kind: "monitor", label: "Monitoring", hint: "Metrics, logs and alerts" },
  internet: { kind: "internet", label: "Outside service", hint: "A system run by someone else" },
};

const pal = (...keys: (keyof typeof P)[]): PaletteItem[] => keys.map((k) => P[k] as PaletteItem);
const named = (kind: NodeKind, r: string, label: string, hint: string): PaletteItem => ({
  kind,
  role: r,
  label,
  hint,
  max: 1,
});

const SERVERS: Sel = kinds("server");
const DB: Sel = kinds("db");
const either = (...sels: Sel[]): Sel => ({
  kinds: sels.flatMap((x) => x.kinds ?? []),
  roles: sels.flatMap((x) => x.roles ?? []),
});

/* ---------- problems ---------- */

const LINK_SHORTENER: LabProblem = {
  id: "link-shortener",
  title: "A link shortener",
  tagline: "Turn long links into short ones, and redirect millions of clicks a day.",
  level: "beginner",
  minutes: 12,
  brief: [
    "People paste a long link and get a short one like ex.am/7Kq2. Anyone who opens the short link is redirected to the long one.",
    "Links are created rarely but opened very often: about 100 redirects for every new link. The owner of a link wants to see how many clicks it got.",
  ],
  requirements: [
    "Redirects must be fast and survive one server failing",
    "Popular links are opened millions of times",
    "Counting clicks must never slow a redirect down",
  ],
  palette: pal(
    "browser",
    "lb",
    "server",
    "cache",
    "db",
    "queue",
    "stream",
    "worker",
    "cdn",
    "monitor",
  ),
  checks: [
    check(
      "front",
      "Visitors reach the servers through a load balancer",
      "Put a load balancer between the visitors and the app servers, so no visitor talks to a server directly.",
      15,
      (d) => guarded(d, CLIENTS, COMPUTE, kinds("lb")),
    ),
    check(
      "two",
      "At least two app servers behind the load balancer",
      "One server is a single point of failure. Connect two or more servers to the load balancer.",
      15,
      (d) => behind(d, SERVERS, kinds("lb"), 2),
    ),
    check(
      "cache",
      "Servers check a cache before the database",
      "Popular links are read again and again. Connect the servers to a cache as well as to the database.",
      20,
      (d) => linked(d, COMPUTE, kinds("cache")) && linked(d, COMPUTE, DB),
    ),
    check(
      "db",
      "Only the servers talk to the database",
      "Visitors should never reach the database except through your servers.",
      15,
      (d) => guarded(d, CLIENTS, DB, COMPUTE),
    ),
    check(
      "clicks",
      "Clicks are counted in the background",
      "Have servers send click events to a queue or stream, and let a worker count them.",
      20,
      (d) => linkedFrom(d, COMPUTE, MESSAGING) && linked(d, MESSAGING, kinds("worker")),
    ),
    check(
      "nowait",
      "Redirects never wait for the counting",
      "Remove any 'waits for a reply' link from a server to the counting worker.",
      15,
      (d) => neverWaitsOn(d, COMPUTE, kinds("worker")),
    ),
  ],
  answer: {
    nodes: [
      n("users", "browser", "Visitors", 0, 3),
      n("lb", "lb", "Load balancer", 2, 3),
      n("s1", "server", "App server 1", 4, 2),
      n("s2", "server", "App server 2", 4, 4),
      n("cache", "cache", "Link cache", 7, 1),
      n("db", "db", "Links", 7, 3),
      n("q", "queue", "Click events", 6, 6),
      n("w", "worker", "Click counter", 8, 6),
      n("stats", "db", "Click counts", 10, 6),
    ],
    links: [
      s("users", "lb"),
      s("lb", "s1"),
      s("lb", "s2"),
      s("s1", "cache"),
      s("s2", "cache"),
      s("s1", "db"),
      s("s2", "db"),
      a("s1", "q"),
      a("s2", "q"),
      a("q", "w"),
      s("w", "stats"),
    ],
  },
  explain: [
    "Two or more stateless servers behind a load balancer keep redirects going when one fails.",
    "Reads outnumber writes 100 to 1, so a cache answers most redirects without touching the database.",
    "Each click becomes an event on a queue; a worker counts them later, so redirects stay fast even when counting is slow.",
  ],
  concepts: ["url-shortener", "load-balancing", "caching", "queues"],
};

const RESULTS_DAY: LabProblem = {
  id: "results-day",
  title: "Exam results day",
  tagline: "Two million students check their results within the same hour.",
  level: "beginner",
  minutes: 12,
  brief: [
    "A school board publishes exam results at 10:00. Two million students open the results page and type their roll number, most of them in the first 15 minutes.",
    "The results never change once published. The page itself (logo, styles, scripts) is the same for everyone.",
  ],
  requirements: [
    "The page must load even with 50,000 visitors a second",
    "One failed server must not stop anyone",
    "The database must not be swamped by identical reads",
  ],
  palette: pal("browser", "phone", "cdn", "lb", "server", "cache", "db", "monitor"),
  checks: [
    check(
      "cdn",
      "Students get the page from a CDN",
      "The page is the same for everyone. Connect the students to a CDN.",
      15,
      (d) => linked(d, CLIENTS, kinds("cdn")),
    ),
    check(
      "front",
      "Result lookups reach servers through a load balancer",
      "Every path from students to the servers should pass a load balancer.",
      15,
      (d) => guarded(d, CLIENTS, COMPUTE, kinds("lb")),
    ),
    check(
      "two",
      "At least two app servers",
      "Connect two or more app servers to the load balancer.",
      15,
      (d) => behind(d, SERVERS, kinds("lb"), 2),
    ),
    check(
      "cache",
      "Results are cached",
      "Results never change; connect the servers to a cache so repeated lookups skip the database.",
      20,
      (d) => linked(d, COMPUTE, kinds("cache")),
    ),
    check(
      "db",
      "Only the servers reach the database",
      "Students should reach the database only through the servers.",
      15,
      (d) => guarded(d, CLIENTS, DB, COMPUTE),
    ),
    check(
      "replica",
      "A read copy of the database",
      "Add a second database connected to the first as a read replica.",
      20,
      (d) => count(d, DB) >= 2 && linked(d, DB, DB),
    ),
  ],
  answer: {
    nodes: [
      n("students", "phone", "Students", 0, 3),
      n("cdn", "cdn", "CDN", 2, 1),
      n("lb", "lb", "Load balancer", 2, 4),
      n("s1", "server", "Server 1", 4, 3),
      n("s2", "server", "Server 2", 4, 5),
      n("cache", "cache", "Results cache", 7, 2),
      n("db", "db", "Results", 7, 4),
      n("rep", "db", "Read replica", 9, 5),
    ],
    links: [
      s("students", "cdn"),
      s("students", "lb"),
      s("lb", "s1"),
      s("lb", "s2"),
      s("s1", "cache"),
      s("s2", "cache"),
      s("s1", "db"),
      s("s2", "rep"),
      a("db", "rep"),
    ],
  },
  explain: [
    "The CDN serves the page itself, so only the roll-number lookups reach your servers.",
    "Results never change, so each is read from the database once and then served from the cache.",
    "A read replica shares the remaining reads and is ready to take over if the main database fails.",
  ],
  concepts: ["cdn", "load-balancing", "caching", "replication"],
  caseId: "exam-results-scaled",
};

const PHOTO_UPLOADS: LabProblem = {
  id: "photo-uploads",
  title: "Photo uploads",
  tagline:
    "People upload photos from their phones; friends see them in seconds, in the right size.",
  level: "intermediate",
  minutes: 15,
  brief: [
    "A photo app lets people upload photos of up to 20 MB. Each photo is shown in three sizes: a thumbnail, a feed size and full screen.",
    "Photos are viewed all over the world, many times each.",
  ],
  requirements: [
    "Big uploads must not tie up the app servers",
    "Resizing can take a few seconds and must not make the upload wait",
    "Photos load quickly far from where they are stored",
  ],
  palette: pal("phone", "gateway", "server", "storage", "db", "queue", "worker", "cdn", "monitor"),
  checks: [
    check(
      "direct",
      "The app uploads photos straight to file storage",
      "Connect the mobile app to file storage, so 20 MB uploads skip the app servers.",
      20,
      (d) => linked(d, CLIENTS, kinds("storage")),
    ),
    check(
      "meta",
      "Servers record photo details in a database",
      "Connect the app servers to a database, and keep the database behind them.",
      15,
      (d) => linked(d, COMPUTE, DB) && guarded(d, CLIENTS, DB, COMPUTE),
    ),
    check(
      "bg",
      "Resizing runs as a background job",
      "Send a job to a queue (from storage or a server) and connect a worker to the queue.",
      20,
      (d) =>
        linked(d, MESSAGING, kinds("worker")) &&
        (linked(d, kinds("storage"), MESSAGING) || linked(d, COMPUTE, MESSAGING)),
    ),
    check(
      "sizes",
      "The worker saves the sizes back to storage",
      "Connect the resizing worker to file storage.",
      15,
      (d) => linked(d, kinds("worker"), kinds("storage")),
    ),
    check(
      "cdn",
      "A CDN serves the photos",
      "Connect file storage to a CDN, and the CDN to the app.",
      20,
      (d) => linked(d, kinds("cdn"), kinds("storage")) && linked(d, kinds("cdn"), CLIENTS),
    ),
    check(
      "nowait",
      "Nothing waits for resizing",
      "Remove any 'waits for a reply' link from a server to the worker.",
      10,
      (d) => neverWaitsOn(d, COMPUTE, kinds("worker")),
    ),
  ],
  answer: {
    nodes: [
      n("app", "phone", "Mobile app", 0, 3),
      n("gw", "gateway", "API gateway", 2, 5),
      n("api", "server", "App servers", 4, 5),
      n("db", "db", "Photo details", 6, 6),
      n("store", "storage", "Photo storage", 4, 2),
      n("q", "queue", "Resize jobs", 7, 2),
      n("w", "worker", "Resizer", 9, 2),
      n("cdn", "cdn", "CDN", 2, 0),
    ],
    links: [
      s("app", "store"),
      s("app", "gw"),
      s("gw", "api"),
      s("api", "db"),
      a("store", "q"),
      a("q", "w"),
      s("w", "store"),
      s("cdn", "store"),
      s("app", "cdn"),
    ],
  },
  explain: [
    "The app sends the photo bytes straight to storage (with a short-lived upload link from the server), so servers only handle small requests.",
    "A new file in storage puts a resize job on a queue; workers make the three sizes in the background.",
    "Every size has a fixed address served through the CDN, so each popular photo is fetched from storage once per region.",
  ],
  concepts: ["files-media", "queues", "cdn"],
  caseId: "photo-backup",
};

const ORDER_NOTIFICATIONS: LabProblem = {
  id: "order-notifications",
  title: "Order notifications",
  tagline: "Tell shoppers when their order ships, without slowing down the order itself.",
  level: "intermediate",
  minutes: 12,
  brief: [
    "A shopping app sends a push notification when an order is placed, packed and shipped. The push provider is an outside service that is sometimes slow.",
    "Placing an order must stay fast even when notifications are delayed.",
  ],
  requirements: [
    "Orders are saved reliably",
    "A slow push provider never slows down ordering",
    "More features (emails, loyalty points) will listen to orders later",
  ],
  palette: [
    ...pal("phone", "gateway", "db", "queue", "stream", "monitor"),
    named("service", "orders", "Orders service", "Takes and saves orders"),
    named("worker", "notifier", "Notification sender", "Sends push notifications"),
    named("internet", "push", "Push provider", "The outside service that delivers pushes"),
  ],
  checks: [
    check(
      "reach",
      "Shoppers reach the orders service",
      "Connect the app to the orders service (directly or through a gateway).",
      10,
      (d) => reaches(d, CLIENTS, role("orders")),
    ),
    check(
      "own",
      "The orders service saves orders in its database",
      "Connect the orders service to a database.",
      15,
      (d) => linked(d, role("orders"), DB),
    ),
    check(
      "publish",
      "Orders publishes an event for each change",
      "Draw a link from the orders service to a queue or event stream.",
      20,
      (d) => linkedFrom(d, role("orders"), MESSAGING),
    ),
    check(
      "consume",
      "The notification sender reads those events",
      "Connect the queue or stream to the notification sender.",
      20,
      (d) => linked(d, MESSAGING, role("notifier")),
    ),
    check(
      "nowait",
      "Orders never waits on notifications",
      "The orders service should not call the sender or the push provider directly.",
      20,
      (d) =>
        neverWaitsOn(d, role("orders"), role("notifier")) &&
        !linked(d, role("orders"), role("push")),
    ),
    check(
      "push",
      "The sender delivers through the push provider",
      "Connect the notification sender to the push provider.",
      15,
      (d) => linked(d, role("notifier"), role("push")),
    ),
  ],
  answer: {
    nodes: [
      n("app", "phone", "Shoppers", 0, 3),
      n("gw", "gateway", "API gateway", 2, 3),
      n("orders", "service", "Orders service", 4, 3, "orders"),
      n("db", "db", "Orders", 4, 6),
      n("events", "stream", "Order events", 7, 3),
      n("notify", "worker", "Notification sender", 9, 3, "notifier"),
      n("push", "internet", "Push provider", 9, 6, "push"),
    ],
    links: [
      s("app", "gw"),
      s("gw", "orders"),
      s("orders", "db"),
      a("orders", "events"),
      a("events", "notify"),
      s("notify", "push"),
    ],
  },
  explain: [
    "The orders service saves the order and publishes an event; its job ends there.",
    "The notification sender follows the events at its own pace and retries when the push provider is slow.",
    "Emails or loyalty points later become new readers of the same events, with no change to ordering.",
  ],
  concepts: ["queues", "pubsub"],
  caseId: "push-notifications",
};

const FANS: Sel = kinds("phone", "browser");

const LIVE_SCORES: LabProblem = {
  id: "live-scores",
  title: "Live scores",
  tagline: "A scorer at the ground taps each ball; five million fans see it within a second.",
  level: "intermediate",
  minutes: 15,
  brief: [
    "During a cricket final, a scorer at the ground enters every ball. Fans keep the app open and expect the score to update by itself.",
    "The match page (team photos, styles, scripts) is the same for everyone.",
  ],
  requirements: [
    "Updates reach fans in about a second, without them refreshing",
    "Millions of open connections, spread over many machines",
    "Every ball is stored",
  ],
  palette: [
    ...pal(
      "phone",
      "browser",
      "cdn",
      "lb",
      "gateway",
      "service",
      "db",
      "stream",
      "cache",
      "monitor",
    ),
    {
      kind: "user",
      role: "scorer",
      label: "Scorer",
      hint: "The person entering each ball at the ground",
      max: 1,
    },
  ],
  checks: [
    check(
      "connect",
      "Fans keep a connection open to realtime gateways",
      "Connect the fans' app to gateways that push updates.",
      20,
      (d) => linked(d, FANS, kinds("gateway")),
    ),
    check(
      "many",
      "At least two gateways",
      "Millions of connections need several gateways. Connect two or more to the fans.",
      15,
      (d) => behind(d, kinds("gateway"), FANS, 2),
    ),
    check(
      "store",
      "The scorer's updates are saved by a service",
      "Connect the scorer to a service, and the service to a database.",
      15,
      (d) => linked(d, role("scorer"), COMPUTE) && linked(d, COMPUTE, DB),
    ),
    check(
      "publish",
      "Each ball is published to an event stream",
      "Draw a link from the service to an event stream.",
      15,
      (d) => linkedFrom(d, COMPUTE, MESSAGING),
    ),
    check(
      "subscribe",
      "Every gateway follows the stream",
      "Connect each gateway to the event stream, so an update reaches all of them.",
      20,
      (d) => behind(d, kinds("gateway"), MESSAGING, 2),
    ),
    check(
      "cdn",
      "The match page comes from a CDN",
      "Connect the fans to a CDN for the parts of the page that are the same for everyone.",
      15,
      (d) => linked(d, FANS, kinds("cdn")),
    ),
  ],
  answer: {
    nodes: [
      n("fans", "phone", "Fans", 0, 4),
      n("cdn", "cdn", "CDN", 0, 1),
      n("g1", "gateway", "Realtime gateway 1", 3, 3),
      n("g2", "gateway", "Realtime gateway 2", 3, 6),
      n("events", "stream", "Ball-by-ball events", 6, 4),
      n("score", "service", "Score service", 9, 4),
      n("db", "db", "Balls", 9, 7),
      n("scorer", "user", "Scorer", 11, 1, "scorer"),
    ],
    links: [
      s("fans", "cdn"),
      s("fans", "g1"),
      s("fans", "g2"),
      a("events", "g1"),
      a("events", "g2"),
      s("scorer", "score"),
      s("score", "db"),
      a("score", "events"),
    ],
  },
  explain: [
    "Fans hold one open connection to a gateway; nothing polls.",
    "The score service saves each ball and publishes it once; every gateway follows the stream and pushes it to its own fans.",
    "The CDN carries the heavy, identical parts of the page.",
  ],
  concepts: ["cdn", "pubsub", "realtime"],
  caseId: "cricket-scores",
};

const SECURE_SIGN_IN: LabProblem = {
  id: "secure-sign-in",
  title: "Sign-in for a banking app",
  tagline: "Customers sign in once, and every request to their accounts is checked.",
  level: "intermediate",
  minutes: 15,
  brief: [
    "A bank's app shows balances and payments. Customers sign in with a password and a one-time code, and stay signed in for 15 minutes of activity.",
    "Account data is private: no request may reach it without a valid session.",
  ],
  requirements: [
    "One front door that checks every request",
    "Sign-in data kept apart from account data",
    "Suspicious activity is noticed",
  ],
  palette: [
    ...pal("phone", "browser", "gateway", "lb", "db", "cache", "monitor"),
    named("service", "auth", "Sign-in service", "Checks passwords and issues sessions"),
    named("service", "accounts", "Accounts service", "Balances and payments"),
  ],
  checks: [
    check(
      "door",
      "Every request passes the API gateway",
      "Customers should reach the services only through the gateway.",
      20,
      (d) => guarded(d, CLIENTS, COMPUTE, kinds("gateway")),
    ),
    check(
      "auth",
      "The gateway checks sessions with the sign-in service",
      "Connect the gateway to the sign-in service.",
      20,
      (d) => linked(d, kinds("gateway"), role("auth")),
    ),
    check(
      "authstore",
      "The sign-in service has its own store",
      "Connect the sign-in service to a database or cache for users and sessions.",
      15,
      (d) => eachOwns(d, role("auth"), kinds("db", "cache")),
    ),
    check(
      "accounts",
      "The gateway routes to the accounts service",
      "Connect the gateway to the accounts service.",
      15,
      (d) => linked(d, kinds("gateway"), role("accounts")) && eachOwns(d, role("accounts"), DB),
    ),
    check(
      "separate",
      "Services don't share a database",
      "Give the sign-in service and the accounts service separate stores.",
      15,
      (d) => has(d, COMPUTE, 2) && noSharedStore(d, COMPUTE, kinds("db", "cache")),
    ),
    check(
      "watch",
      "Sign-ins and requests are monitored",
      "Connect monitoring to the gateway or the services.",
      15,
      (d) => linked(d, kinds("monitor"), either(kinds("gateway"), COMPUTE)),
    ),
  ],
  answer: {
    nodes: [
      n("app", "phone", "Customers", 0, 3),
      n("gw", "gateway", "API gateway", 3, 3),
      n("auth", "service", "Sign-in service", 6, 1, "auth"),
      n("sessions", "cache", "Sessions", 9, 0),
      n("users", "db", "Users", 9, 2),
      n("acc", "service", "Accounts service", 6, 5, "accounts"),
      n("accdb", "db", "Accounts", 9, 5),
      n("mon", "monitor", "Monitoring", 3, 7),
    ],
    links: [
      s("app", "gw"),
      s("gw", "auth"),
      s("auth", "sessions"),
      s("auth", "users"),
      s("gw", "acc"),
      s("acc", "accdb"),
      a("gw", "mon"),
    ],
  },
  explain: [
    "The gateway is the only way in; it asks the sign-in service to validate the session on every request.",
    "Users and sessions live with the sign-in service, account data with the accounts service, so a bug in one can't expose the other's store.",
    "The gateway reports every sign-in and request to monitoring, where unusual patterns raise alerts.",
  ],
  concepts: ["authentication", "authorization", "service-discovery", "observability"],
  caseId: "banking-sessions",
};

const ORDER_SAGA: LabProblem = {
  id: "order-saga",
  title: "Checkout across services",
  tagline:
    "Orders, payments and stock are separate services. Keep checkout correct when one fails.",
  level: "advanced",
  minutes: 18,
  brief: [
    "An online shop has three teams: orders, payments and stock, each with its own service. Checkout must take payment and reserve stock, or do neither.",
    "Any one service can be down for a minute without losing orders.",
  ],
  requirements: [
    "Each service owns its own data",
    "Services coordinate without waiting on each other",
    "A failure in one step can be undone",
  ],
  palette: [
    ...pal("browser", "gateway", "db", "queue", "stream", "monitor"),
    named("service", "orders", "Orders service", "Runs checkout"),
    named("service", "payments", "Payments service", "Takes payments"),
    named("service", "stock", "Stock service", "Reserves items"),
  ],
  checks: [
    check(
      "door",
      "Shoppers reach the services through a gateway",
      "Put an API gateway between the shoppers and the services.",
      15,
      (d) => guarded(d, CLIENTS, COMPUTE, kinds("gateway")),
    ),
    check(
      "own",
      "Each service has its own database",
      "Connect orders, payments and stock each to a database.",
      20,
      (d) =>
        count(d, role("orders", "payments", "stock")) === 3 &&
        eachOwns(d, role("orders", "payments", "stock"), DB),
    ),
    check(
      "noshare",
      "No database is shared",
      "Two services connected to the same database are tied together. Give each its own.",
      20,
      (d) => has(d, COMPUTE, 3) && noSharedStore(d, COMPUTE, DB),
    ),
    check(
      "events",
      "The services coordinate through messages",
      "Connect all three services to a queue or event stream.",
      25,
      (d) =>
        linked(d, role("orders"), MESSAGING) &&
        linked(d, role("payments"), MESSAGING) &&
        linked(d, role("stock"), MESSAGING),
    ),
    check(
      "nowait",
      "Orders doesn't wait on payments or stock",
      "Remove 'waits for a reply' links from orders to payments or stock; use messages instead.",
      20,
      (d) =>
        neverWaitsOn(d, role("orders"), role("payments")) &&
        neverWaitsOn(d, role("orders"), role("stock")),
    ),
  ],
  answer: {
    nodes: [
      n("shop", "browser", "Shoppers", 0, 3),
      n("gw", "gateway", "API gateway", 2, 3),
      n("orders", "service", "Orders service", 4, 3, "orders"),
      n("odb", "db", "Orders", 4, 6),
      n("bus", "stream", "Checkout events", 7, 3),
      n("pay", "service", "Payments service", 9, 1, "payments"),
      n("pdb", "db", "Payments", 11, 0),
      n("stock", "service", "Stock service", 9, 5, "stock"),
      n("sdb", "db", "Stock", 11, 6),
    ],
    links: [
      s("shop", "gw"),
      s("gw", "orders"),
      s("orders", "odb"),
      a("orders", "bus"),
      a("bus", "pay"),
      a("bus", "stock"),
      a("pay", "bus"),
      a("stock", "bus"),
      s("pay", "pdb"),
      s("stock", "sdb"),
    ],
  },
  explain: [
    "Each service owns its database, so teams can change their data without breaking the others.",
    "Checkout is a saga: orders publishes “checkout started”, payments and stock react and publish their results, and orders completes or undoes the steps.",
    "If payments is down for a minute, its messages wait in the stream; nothing is lost and orders is not blocked.",
  ],
  concepts: ["microservices", "queues", "sagas"],
  caseId: "marketplace-checkout",
};

const JOB_SEARCH: LabProblem = {
  id: "job-search",
  title: "Search that stays in sync",
  tagline: "Job ads are edited all day. Search results should show changes within seconds.",
  level: "intermediate",
  minutes: 15,
  brief: [
    "A job board stores ads in a database. Job seekers search by words, place and salary, and expect closed ads to disappear quickly.",
    "Searching the main database with text queries is too slow and would hurt the people posting ads.",
  ],
  requirements: [
    "Fast text search that doesn't load the main database",
    "Changes appear in search within seconds",
    "Indexing can fall behind briefly without losing changes",
  ],
  palette: [
    ...pal("browser", "gateway", "db", "stream", "queue", "search", "monitor"),
    named("service", "jobs", "Jobs service", "Creates and edits ads"),
    named("service", "searcher", "Search service", "Answers search queries"),
    named("worker", "indexer", "Indexer", "Keeps the search index up to date"),
  ],
  checks: [
    check(
      "save",
      "The jobs service saves ads in the database",
      "Connect the jobs service to a database.",
      15,
      (d) => linked(d, role("jobs"), DB),
    ),
    check(
      "changes",
      "Every change becomes an event",
      "Connect the jobs service (or its database) to an event stream or queue.",
      20,
      (d) => linked(d, either(role("jobs"), DB), MESSAGING),
    ),
    check(
      "index",
      "An indexer reads the events",
      "Connect the stream or queue to the indexer.",
      20,
      (d) => linked(d, MESSAGING, role("indexer")),
    ),
    check(
      "write",
      "The indexer updates the search index",
      "Connect the indexer to the search index.",
      20,
      (d) => linked(d, role("indexer"), kinds("search")),
    ),
    check(
      "read",
      "Search reads the index, not the database",
      "Connect the search service to the search index, and not to the database.",
      15,
      (d) => linked(d, role("searcher"), kinds("search")) && !linked(d, role("searcher"), DB),
    ),
    check(
      "reach",
      "Users reach both services",
      "Connect the website to the jobs and search services (for example through a gateway).",
      10,
      (d) => reaches(d, CLIENTS, role("jobs")) && reaches(d, CLIENTS, role("searcher")),
    ),
  ],
  answer: {
    nodes: [
      n("users", "browser", "Job seekers & employers", 0, 3),
      n("gw", "gateway", "API gateway", 2, 3),
      n("jobs", "service", "Jobs service", 4, 1, "jobs"),
      n("db", "db", "Jobs", 7, 0),
      n("changes", "stream", "Job changes", 7, 2),
      n("idx", "worker", "Indexer", 9, 3, "indexer"),
      n("search", "search", "Search index", 7, 5),
      n("sq", "service", "Search service", 4, 5, "searcher"),
    ],
    links: [
      s("users", "gw"),
      s("gw", "jobs"),
      s("gw", "sq"),
      s("jobs", "db"),
      a("jobs", "changes"),
      a("changes", "idx"),
      s("idx", "search"),
      s("sq", "search"),
    ],
  },
  explain: [
    "The database stays the source of truth; every change is also published as an event.",
    "The indexer follows the events and updates the search index within seconds. If it falls behind, events wait in the stream.",
    "Searches never touch the main database, so posting ads stays fast.",
  ],
  concepts: ["indexes", "pubsub", "batch-stream"],
  caseId: "search-indexing",
};

const PUBLIC_API: LabProblem = {
  id: "public-api",
  title: "A public API",
  tagline: "Thousands of developers call your API. Keep it fair, fast and watched.",
  level: "intermediate",
  minutes: 15,
  brief: [
    "A weather company sells an API. Each developer has a key and a plan: 10 calls a second on the free plan, 500 on the paid one.",
    "One customer's runaway script must not slow down everyone else.",
  ],
  requirements: [
    "Every call is checked for a valid key",
    "Limits per key, enforced across all servers",
    "Enough capacity for one server to fail",
    "You notice errors and abuse quickly",
  ],
  palette: [
    ...pal("browser", "gateway", "lb", "server", "db", "cache", "monitor"),
    {
      kind: "db",
      role: "keys",
      label: "API keys",
      hint: "Developers' keys and plans",
      max: 1,
    },
  ],
  checks: [
    check(
      "door",
      "Every call passes an API gateway",
      "Developers' apps should reach your servers only through the gateway.",
      20,
      (d) => guarded(d, CLIENTS, COMPUTE, kinds("gateway")),
    ),
    check(
      "keys",
      "The gateway checks API keys",
      "Connect the gateway to the API keys store.",
      15,
      (d) => linked(d, kinds("gateway"), role("keys")),
    ),
    check(
      "limits",
      "Limit counters live in a shared cache",
      "Connect the gateway to a cache that counts calls per key.",
      20,
      (d) => linked(d, kinds("gateway"), kinds("cache")),
    ),
    check(
      "two",
      "At least two app servers",
      "Connect two or more servers to the gateway or a load balancer.",
      15,
      (d) => behind(d, SERVERS, kinds("gateway", "lb"), 2),
    ),
    check(
      "data",
      "Servers read the forecasts from a database",
      "Connect the app servers to a database.",
      10,
      (d) => linked(d, SERVERS, DB),
    ),
    check(
      "watch",
      "The gateway reports to monitoring",
      "Connect the gateway to monitoring.",
      20,
      (d) => linked(d, kinds("gateway"), kinds("monitor")),
    ),
  ],
  answer: {
    nodes: [
      n("devs", "browser", "Developers' apps", 0, 3),
      n("gw", "gateway", "API gateway", 3, 3),
      n("keys", "db", "API keys", 3, 0, "keys"),
      n("limits", "cache", "Limit counters", 5, 0),
      n("s1", "server", "Server 1", 6, 2),
      n("s2", "server", "Server 2", 6, 4),
      n("db", "db", "Forecasts", 9, 3),
      n("mon", "monitor", "Monitoring", 3, 6),
    ],
    links: [
      s("devs", "gw"),
      s("gw", "keys"),
      s("gw", "limits"),
      s("gw", "s1"),
      s("gw", "s2"),
      s("s1", "db"),
      s("s2", "db"),
      a("gw", "mon"),
    ],
  },
  explain: [
    "The gateway checks the key and the plan, then counts the call in a shared cache, so limits hold no matter which gateway or server is used.",
    "Calls over the limit get a quick “429 Too many requests” at the door and never reach the servers.",
    "Monitoring gets every call's outcome, so a spike in errors or one key's sudden burst raises an alert.",
  ],
  concepts: ["apis", "rate-limiting", "authentication", "observability"],
  caseId: "public-api",
};

const CHAT: LabProblem = {
  id: "chat",
  title: "Group chat",
  tagline: "Study groups chat in real time on phones and laptops, even when someone is offline.",
  level: "advanced",
  minutes: 18,
  brief: [
    "Learners join study groups of up to 200 people. Messages appear instantly for everyone online; people who are offline get a notification and see the history when they return.",
    "The app shows who is online.",
  ],
  requirements: [
    "Messages delivered in under a second to everyone online",
    "Members connected to different machines still see each other's messages",
    "History kept; offline members notified",
  ],
  palette: [
    ...pal(
      "phone",
      "browser",
      "lb",
      "gateway",
      "db",
      "cache",
      "stream",
      "queue",
      "worker",
      "monitor",
    ),
    named("service", "chat", "Chat service", "Saves and routes messages"),
    named("internet", "push", "Push provider", "Delivers phone notifications"),
  ],
  checks: [
    check(
      "gateways",
      "Members connect to at least two realtime gateways",
      "Connect the apps to two or more gateways that keep connections open.",
      15,
      (d) => behind(d, kinds("gateway"), CLIENTS, 2),
    ),
    check(
      "pubsub",
      "Gateways share messages through an event stream",
      "Connect every gateway to an event stream or queue, so a message reaches members on other gateways.",
      20,
      (d) => behind(d, kinds("gateway"), MESSAGING, 2),
    ),
    check(
      "history",
      "The chat service saves messages",
      "Connect the gateways to the chat service, and the chat service to a database.",
      15,
      (d) => linked(d, kinds("gateway"), role("chat")) && linked(d, role("chat"), DB),
    ),
    check(
      "presence",
      "Who's online is kept in a cache",
      "Connect the gateways or the chat service to a cache for presence.",
      15,
      (d) => linked(d, either(kinds("gateway"), role("chat")), kinds("cache")),
    ),
    check(
      "offline",
      "Offline members are notified by a background worker",
      "Connect a queue or stream to a worker, and the worker to the push provider.",
      20,
      (d) => linked(d, MESSAGING, kinds("worker")) && linked(d, kinds("worker"), role("push")),
    ),
    check(
      "nowait",
      "Sending never waits for notifications",
      "Gateways and the chat service shouldn't call the push provider or the worker directly.",
      15,
      (d) =>
        has(d, kinds("worker")) &&
        !linked(d, either(kinds("gateway"), role("chat")), kinds("worker"), "sync") &&
        !linked(d, either(kinds("gateway"), role("chat")), role("push")),
    ),
  ],
  answer: {
    nodes: [
      n("members", "phone", "Members", 0, 3),
      n("g1", "gateway", "Gateway 1", 3, 1),
      n("g2", "gateway", "Gateway 2", 3, 5),
      n("bus", "stream", "Group messages", 6, 3),
      n("chat", "service", "Chat service", 6, 0, "chat"),
      n("db", "db", "History", 9, 0),
      n("presence", "cache", "Who's online", 6, 6),
      n("w", "worker", "Notifier", 9, 3),
      n("push", "internet", "Push provider", 11, 5, "push"),
    ],
    links: [
      s("members", "g1"),
      s("members", "g2"),
      s("g1", "chat"),
      s("chat", "db"),
      a("chat", "bus"),
      a("bus", "g1"),
      a("bus", "g2"),
      s("g2", "presence"),
      s("g1", "presence"),
      a("bus", "w"),
      s("w", "push"),
    ],
  },
  explain: [
    "Each member keeps one open connection to a gateway. A message is saved by the chat service and published to the group's stream.",
    "Every gateway follows the stream and delivers to its own members; the notifier reads the same stream and pushes to members who are offline.",
    "Presence lives in a fast cache that every gateway updates as people connect and leave.",
  ],
  concepts: ["chat", "realtime", "pubsub", "caching"],
  caseId: "messaging-app",
};

/** Every lab problem, easiest first. */
export const LAB_PROBLEMS: readonly LabProblem[] = [
  LINK_SHORTENER,
  RESULTS_DAY,
  ORDER_NOTIFICATIONS,
  PHOTO_UPLOADS,
  LIVE_SCORES,
  JOB_SEARCH,
  PUBLIC_API,
  SECURE_SIGN_IN,
  ORDER_SAGA,
  CHAT,
];

export function findProblem(id: string): LabProblem | undefined {
  return LAB_PROBLEMS.find((p) => p.id === id);
}
