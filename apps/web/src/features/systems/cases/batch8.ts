import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Reliability ============ */

export const LOGIN_ATTACK: CaseStudy = caseStudy(
  {
    id: "login-attack",
    title: "Sign-in under a password-guessing attack",
    tagline:
      "Bots try leaked passwords on a shopping site's sign-in page. Stop them without locking out real customers.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["rate-limiting", "observability", "caching", "load-balancing"],
    learn: [
      "Spot an attack from the metrics",
      "Limit by account, by address, and globally",
      "Keep counters in a shared cache",
      "Protect real users while slowing bots",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "A normal Tuesday, until 2 am",
      body: [
        "A shopping site normally sees 30 sign-ins a second. At 2 am it jumps to 4,000, and 99% fail. Someone is trying username–password pairs leaked from other sites.",
      ],
      add: [
        node("bots", "internet", "Bot network", -4.6, -1.6, { sub: "thousands of addresses" }),
        node("people", "user", "Customers", -4.6, 1.6),
        node("lb", "lb", "Load balancer", -1.8, 0),
        node("login", "service", "Sign-in service", 1, 0),
        node("users", "db", "Accounts DB", 3.8, 0),
      ],
      link: [
        link("bots", "lb", { kind: "request", rate: 4 }),
        both("people", "lb", 1),
        both("lb", "login", 3),
        both("login", "users", 3),
      ],
      set: { users: { state: "hot" } },
    },
    {
      kind: "insight",
      short: "Spot it",
      uses: "observability",
      title: "The dashboard that caught it",
      body: [
        "The sign-in failure rate is a key metric with an alert. Normally 5–8% of attempts fail; above 40% for five minutes, someone is paged. Logs show many usernames per address, each tried once or twice.",
      ],
      metrics: [
        { label: "Attempts", value: "4,000 /s", tone: "bad" },
        { label: "Failure rate", value: "99%", tone: "bad" },
      ],
      add: [node("mon", "monitor", "Sign-in dashboard", 1, -2.6)],
      link: [link("login", "mon", "event")],
    },
    {
      kind: "technique",
      short: "Limits",
      uses: "rate-limiting",
      title: "Three layers of limits",
      body: [
        "Per **account**: after 5 failures in 15 minutes, require a CAPTCHA (not a lockout, which would let attackers lock real people out). Per **network address**: 20 attempts a minute. **Globally**: if failures spike, every sign-in from an unfamiliar device needs an emailed code.",
      ],
      quiz: {
        question: "Why not lock an account for an hour after 5 wrong passwords?",
        options: [
          "Lockouts are too complicated",
          "Attackers could lock out any customer on purpose, just by guessing badly",
          "It wouldn't slow the attacker at all",
        ],
        answer: 1,
        why: "A hard lockout turns your defence into an attack on your users. A challenge slows bots without blocking people.",
      },
    },
    {
      kind: "solution",
      short: "Counters",
      uses: "caching",
      title: "Shared counters in a fast cache",
      body: [
        "Twenty sign-in servers must share the counts, or each would allow 20 attempts per address. Counters live in an in-memory cache with expiring keys, checked before the password hash is even computed.",
      ],
      add: [node("counters", "cache", "Attempt counters", 1, 2.6, { sub: "expire in 15 min" })],
      link: [both("login", "counters", 3)],
    },
    {
      kind: "solution",
      short: "At the door",
      uses: "load-balancing",
      title: "Drop obvious bots at the balancer",
      body: [
        "Addresses that blow past the limits are blocked for an hour at the load balancer itself, so they never reach the sign-in servers or the database.",
      ],
      link: [link("bots", "lb", { kind: "fail", rate: 4 })],
      set: { users: { state: "ok" }, lb: { badge: "blocking 3,100 addresses" } },
    },
    {
      kind: "case",
      short: "Real user",
      uses: "rate-limiting",
      title: "Case: a customer in a busy office",
      body: [
        "An office of 300 people shares one public address and hits the per-address limit. Successful sign-ins from that address raise its allowance, and known devices (a cookie from earlier sign-ins) skip the address limit entirely.",
      ],
    },
    {
      kind: "technique",
      short: "After",
      uses: "observability",
      title: "After the attack",
      body: [
        "Accounts that were successfully signed into from flagged addresses are listed; their sessions are ended and owners asked to reset passwords. The failure-rate alert stays, and a weekly report tracks blocked attempts.",
      ],
      metrics: [
        { label: "Attempts reaching DB", value: "↓ 97%", tone: "good" },
        { label: "Real users challenged", value: "0.4%", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Slow the bots, not the people",
      body: ["Watch the failure rate, limit in layers, and challenge rather than lock."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Notice the attack", "failure-rate alert", "Observability"],
          ["Slow guessing", "per account, per address, global", "Rate limiting"],
          ["Counts across servers", "shared expiring counters", "Caching"],
          ["Protect the back end", "block at the balancer", "Load balancing"],
        ],
      },
      set: { lb: { badge: "" } },
    },
  ],
);

/* ============ After Architecture ============ */

export const MONOLITH_SPLIT: CaseStudy = caseStudy(
  {
    id: "monolith-split",
    title: "Splitting a monolith, one piece at a time",
    tagline:
      "A ten-year-old shop application slows every team down. Carve out services without a risky rewrite.",
    minutes: 11,
    level: "advanced",
    tier: "integrate",
    concepts: ["microservices", "service-discovery", "pubsub", "sagas", "observability"],
    learn: [
      "Pick the first piece to split out",
      "Route traffic gradually to the new service",
      "Replace shared tables with events",
      "Trace requests across services",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One app, eight teams",
      body: [
        "An online shop's single application has 1.2 million lines of code. Eight teams share one deployment that happens every two weeks; a bug in returns can delay a fix in payments.",
      ],
      add: [
        node("web", "browser", "Shoppers", -4.6, 0),
        node("mono", "server", "Shop monolith", -0.8, 0, { size: 1.4, sub: "8 teams" }),
        node("db", "db", "One big DB", 3, 0),
      ],
      link: [both("web", "mono", 3), both("mono", "db", 3)],
    },
    {
      kind: "insight",
      short: "First piece",
      uses: "microservices",
      title: "Start with a piece that has clear edges",
      body: [
        "Not the biggest or the most tangled: the **product reviews** feature changes often, has its own team, and touches few tables. Splitting it first teaches the organisation how, at low risk.",
      ],
    },
    {
      kind: "solution",
      short: "Strangle",
      uses: "microservices",
      title: "Route one path at a time",
      body: [
        "A gateway sits in front. `/reviews/*` goes to the new Reviews service with its own database; everything else still goes to the monolith. Traffic shifts 1% → 10% → 100% while results are compared.",
      ],
      add: [
        node("gw", "gateway", "Gateway", -2.8, 0),
        node("reviews", "service", "Reviews service", 0.6, -2.6),
        node("rdb", "db", "Reviews DB", 3, -2.6, { size: 0.8 }),
      ],
      unlink: ["web>mono"],
      link: [
        both("web", "gw", 3),
        both("gw", "mono", 3),
        both("gw", "reviews", 1),
        both("reviews", "rdb", 1),
      ],
    },
    {
      kind: "technique",
      short: "Discovery",
      uses: "service-discovery",
      title: "Finding the new service",
      body: [
        "Reviews runs on several instances that come and go. Each registers itself with the service registry; the gateway asks the registry for healthy instances instead of using a fixed address list.",
      ],
      add: [node("reg", "registry", "Service registry", -2.8, -2.6)],
      link: [link("reviews", "reg", "request"), link("gw", "reg", "request")],
    },
    {
      kind: "problem",
      short: "Shared tables",
      uses: "pubsub",
      title: "The monolith still reads the reviews table",
      body: [
        "Product pages in the monolith show average ratings by reading the old reviews table directly. Instead, Reviews publishes **ReviewAdded**; the monolith subscribes and keeps its own small ratings summary. Then the old table can go.",
      ],
      quiz: {
        question: "Why not let the monolith keep reading the Reviews service's database?",
        options: [
          "It would be too slow",
          "Then Reviews couldn't change its own tables without breaking the monolith: the split would be in name only",
          "Databases can't be shared",
        ],
        answer: 1,
        why: "A service owns its data. Others get it through its API or its events, so each side can change independently.",
      },
      add: [node("bus", "stream", "Event bus", 0.6, 2.6)],
      link: [link("reviews", "bus", "event"), link("bus", "mono", "event")],
    },
    {
      kind: "technique",
      short: "Across",
      uses: "sagas",
      title: "Later: orders across services",
      body: [
        'When Payments and Inventory are split out too, "place order" spans three services. It becomes a saga: reserve stock, charge, confirm, with a compensation (release stock, refund) for each step if a later one fails.',
      ],
      add: [
        node("pay", "service", "Payments", 3, 2.6),
        node("inv", "service", "Inventory", 5.4, 1.2),
      ],
      link: [link("bus", "pay", "event"), link("bus", "inv", "event")],
    },
    {
      kind: "solution",
      short: "Tracing",
      uses: "observability",
      title: "One request, many services",
      body: [
        "Every request gets a trace id at the gateway that is passed along to each service and event. When checkout is slow, one trace shows which hop took the time instead of eight teams each checking their own logs.",
      ],
      add: [node("trace", "monitor", "Tracing", 5.4, -1.6)],
      link: [link("reviews", "trace", "event"), link("mono", "trace", "event")],
    },
    {
      kind: "case",
      short: "Results",
      uses: "microservices",
      title: "Case: a year later",
      body: [
        "Four services are out; the monolith is 40% smaller. The reviews team deploys ten times a day. Not everything should leave: rarely-changed admin pages stay in the monolith, which is fine.",
      ],
      metrics: [
        { label: "Reviews deploys", value: "10 / day", tone: "good" },
        { label: "Monolith deploys", value: "every 2 weeks → weekly" },
      ],
      set: { mono: { size: 1.1, sub: "40% smaller" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Split by edges, not by ambition",
      body: ["Route gradually, own your data, publish changes, trace everything."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Teams blocked by one deploy", "split out clear-edged pieces", "Microservices"],
          ["Instances come and go", "service registry", "Service discovery"],
          ["No shared tables", "events and local copies", "Pub/sub"],
          ["Cross-service orders", "saga with compensations", "Sagas"],
          ["Where did the time go?", "distributed tracing", "Observability"],
        ],
      },
    },
  ],
);

export const RECOMMENDATIONS: CaseStudy = caseStudy(
  {
    id: "recommendations",
    title: '"You might also like" recommendations',
    tagline:
      "A bookshop app suggests books to 8 million readers. Heavy learning at night, fresh reactions by day, answers in 20 ms.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["batch-stream", "caching", "pubsub", "storage-engines", "timeouts-retries"],
    learn: [
      "Precompute heavy results in batch",
      "Adjust with live signals from a stream",
      "Serve from a cache in milliseconds",
      "Fall back when recommendations are slow",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Suggestions on every screen",
      body: [
        'An e-book app shows "Because you read…" on the home screen, under each book, and in emails. 8 million readers, 2 million books. The home screen must load in under 200 ms.',
      ],
      add: [
        node("readers", "phone", "Readers", -4.6, 0),
        node("app", "server", "App back end", -1.4, 0),
        node("events", "stream", "Reading events", -1.4, 2.6),
      ],
      link: [both("readers", "app", 3), link("app", "events", "event")],
    },
    {
      kind: "technique",
      short: "Nightly",
      uses: "batch-stream",
      title: "The heavy part runs at night",
      body: [
        'Finding "readers who finished this also finished…" across billions of reading events is heavy. A nightly batch job computes, for each reader, a ranked list of 200 candidate books, and for each book, 50 similar books.',
      ],
      add: [
        node("lake", "storage", "Event archive", 1.8, 2.6),
        node("batch", "worker", "Nightly job", 4.6, 2.6, { sub: "ranks candidates" }),
      ],
      link: [link("events", "lake", "copy"), link("lake", "batch", "heavy")],
    },
    {
      kind: "technique",
      short: "Store",
      uses: "storage-engines",
      title: "Results in a key–value store",
      body: [
        'The output is simple lookups: reader → list, book → list. It\'s bulk-loaded each morning into a key–value store built for fast reads by key; no joins, no queries beyond "get this key".',
      ],
      add: [node("kv", "db", "Recommendations", 4.6, 0, { sub: "key → list" })],
      link: [link("batch", "kv", "write")],
    },
    {
      kind: "solution",
      short: "Fresh",
      uses: "pubsub",
      title: "React to what happened a minute ago",
      body: [
        "A reader finishes a thriller at lunch; last night's list doesn't know. A stream job subscribes to **BookFinished** and **BookAbandoned** and adjusts that reader's list: remove the finished book, boost its sequel, drop the abandoned author.",
      ],
      add: [node("live", "worker", "Stream job", 1.8, -2.4, { sub: "adjusts lists" })],
      link: [link("events", "live", { kind: "event", rate: 3 }), link("live", "kv", "write")],
    },
    {
      kind: "solution",
      short: "Serve",
      uses: "caching",
      title: "Home screen in milliseconds",
      body: [
        "The app reads the reader's list from the store, then book details (cover, title, price) from a cache shared by everyone: popular books are always in memory.",
      ],
      add: [node("cache", "cache", "Book details cache", 1.8, 0)],
      link: [both("app", "cache", 3), both("app", "kv", 2)],
    },
    {
      kind: "tradeoff",
      short: "Fallback",
      uses: "timeouts-retries",
      title: "If recommendations are slow, show something",
      body: [
        'Recommendations get a 50 ms timeout. If the store is slow, the home screen shows "Popular this week" (cached for everyone) instead of waiting. A worse suggestion beats a blank screen.',
      ],
      quiz: {
        question: "The recommendations store is down. What should the home screen do?",
        options: [
          "Show an error until it's back",
          "Retry until it answers",
          'Show a cached "popular" list and try personal ones next time',
        ],
        answer: 2,
        why: "Recommendations are nice to have. A quick, generic fallback keeps the main feature (reading) working.",
      },
      set: { kv: { state: "hot", badge: "slow" } },
    },
    {
      kind: "case",
      short: "New reader",
      uses: "batch-stream",
      title: "Case: a brand-new reader",
      body: [
        "A new reader has no history, so the batch job has nothing for them. They see popular books in the genres picked at sign-up; after three books the stream job starts personalising, and tonight's batch includes them.",
      ],
      set: { kv: { state: "ok", badge: "" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Heavy at night, fresh by day, fast always",
      body: ["Batch for depth, stream for freshness, cache for speed, fallback for safety."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Heavy ranking", "nightly batch", "Batch and stream"],
          ["Lookups by key", "key–value store", "Storage engines"],
          ["Today's reading", "stream job on events", "Pub/sub"],
          ["Fast pages", "shared book-details cache", "Caching"],
          ["Slow store", "50 ms timeout, popular fallback", "Timeouts and retries"],
        ],
      },
    },
  ],
);

/* ============ After Security ============ */

export const PASSWORD_MANAGER: CaseStudy = caseStudy(
  {
    id: "password-manager",
    title: "Syncing a password manager",
    tagline:
      "A vault of passwords on phone, laptop and browser, synced everywhere, and unreadable even to the company that stores it.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["encryption", "authentication", "replication", "cap", "unique-ids"],
    learn: [
      "Encrypt on the device, never on the server",
      "Sign in without sending the master password",
      "Sync offline edits without losing any",
      "Recover from a lost device",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Your passwords, everywhere",
      body: [
        "A password manager keeps each user's vault on their phone, laptop and browser extension, synced through the company's servers. The promise: the company can never read a vault, even if its servers are stolen.",
      ],
      add: [
        node("phone", "phone", "Phone", -4.6, -1.6),
        node("laptop", "browser", "Laptop", -4.6, 1.6),
        node("sync", "service", "Sync service", -1, 0),
        node("vaults", "db", "Vault store", 2.6, 0),
      ],
      link: [both("phone", "sync", 1), both("laptop", "sync", 1), link("sync", "vaults", "write")],
    },
    {
      kind: "technique",
      short: "On device",
      uses: "encryption",
      title: "Encrypt before anything leaves the device",
      body: [
        "A key is derived from the master password on the device (with a slow, salted function), and every item is encrypted there with AES-256. The server only ever stores and syncs ciphertext.",
      ],
      code: [
        "key = slow_kdf(master_password, salt, iterations=600_000)",
        "blob = aes_gcm_encrypt(key, item)   # only blob is uploaded",
      ],
      set: { vaults: { sub: "ciphertext only" } },
    },
    {
      kind: "technique",
      short: "Sign in",
      uses: "authentication",
      title: "Sign in without revealing the master password",
      body: [
        "The device derives two things from the master password: the encryption key (kept on the device) and a separate sign-in secret sent to the server. The server can check sign-ins without being able to decrypt the vault. Two-factor is required for new devices.",
      ],
      quiz: {
        question: "If the company's database is stolen, what do attackers get?",
        options: [
          "Everyone's passwords",
          "Encrypted vaults they'd have to crack one master password at a time, slowly",
          "The master passwords",
        ],
        answer: 1,
        why: "Encryption happens on devices with keys the server never sees; the slow key derivation makes guessing expensive.",
      },
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Every device is a full copy",
      body: [
        "Each device keeps the whole (encrypted) vault, and the server keeps one too, replicated across zones. Passwords work on a plane with no internet; changes sync when back online.",
      ],
      add: [node("rep", "db", "Vault replicas", 5.2, 0, { hue: "teal" })],
      link: [link("vaults", "rep", "copy")],
    },
    {
      kind: "tradeoff",
      short: "Offline edits",
      uses: "cap",
      title: "Edits on two offline devices",
      body: [
        "On a flight, the user changes the bank password on the laptop and, separately, on the phone. Devices choose availability: both edits are accepted offline. On sync, the newer edit wins and the older one is kept in the item's history, so nothing is silently lost.",
      ],
      set: { phone: { badge: "offline edit" }, laptop: { badge: "offline edit" } },
    },
    {
      kind: "technique",
      short: "Ids",
      uses: "unique-ids",
      title: "Item ids made on the device",
      body: [
        "New items are created offline, so ids can't come from the server. Each device generates random 128-bit ids; collisions are practically impossible, and sync matches items by id.",
      ],
      set: { phone: { badge: "" }, laptop: { badge: "" } },
    },
    {
      kind: "case",
      short: "Lost phone",
      uses: "authentication",
      title: "Case: the phone is stolen",
      body: [
        "From the laptop, the user removes the phone from trusted devices: its sync token stops working at once. The thief still needs the master password (or fingerprint) to open the vault on the phone itself.",
      ],
      set: { phone: { state: "down", badge: "removed" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Synced everywhere, readable nowhere else",
      body: ["The server is a careful courier for sealed envelopes."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Company can't read vaults", "encrypt on the device", "Encryption"],
          ["Sign in safely", "separate sign-in secret + 2FA", "Authentication"],
          ["Works offline", "full copy on every device", "Replication"],
          ["Offline conflicts", "accept both, newest wins, keep history", "CAP"],
          ["Create items offline", "random 128-bit ids", "Unique IDs"],
        ],
      },
    },
  ],
);

export const API_KEYS: CaseStudy = caseStudy(
  {
    id: "api-keys",
    title: "API keys for a developer platform",
    tagline:
      "Developers call a maps API millions of times a day. Issue keys, scope them, meter them, and survive a leaked one.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["authentication", "authorization", "rate-limiting", "observability", "caching"],
    learn: [
      "Store keys so a breach doesn't leak them",
      "Scope keys to what they may do",
      "Meter and limit per key",
      "Rotate a leaked key without downtime",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Keys for 40,000 developers",
      body: [
        "A maps company offers geocoding and routing APIs to 40,000 developers. Each app sends a key with every request; billing and limits depend on it.",
      ],
      add: [
        node("apps", "internet", "Developer apps", -4.6, 0),
        node("gw", "gateway", "API gateway", -1.4, 0),
        node("maps", "service", "Maps services", 2, 0),
        node("keys", "db", "Keys DB", -1.4, 2.6),
      ],
      link: [both("apps", "gw", 3), both("gw", "maps", 3), both("gw", "keys", 2)],
    },
    {
      kind: "technique",
      short: "Store",
      uses: "authentication",
      title: "Show the key once, store only a hash",
      body: [
        "A key like `mk_live_9fK2…` is shown once when created. The database stores its hash plus the first few characters for display. If the keys table leaks, the keys themselves don't.",
      ],
      quiz: {
        question: "A developer lost their key. What can support do?",
        options: [
          "Look it up and send it to them",
          "Nothing can be recovered: create a new key and revoke the old one",
          "Decrypt it from the database",
        ],
        answer: 1,
        why: "Only a hash is stored, by design. Lost keys are replaced, never revealed.",
      },
    },
    {
      kind: "solution",
      short: "Fast check",
      uses: "caching",
      title: "Check keys without a database trip",
      body: [
        "The gateway handles 50,000 requests a second; it can't query the database each time. Key details (owner, scopes, limits) are cached for 60 seconds, so a revoked key stops working within a minute.",
      ],
      add: [node("kcache", "cache", "Key cache", -3.2, -2.4, { sub: "60 s" })],
      link: [both("gw", "kcache", 3)],
    },
    {
      kind: "technique",
      short: "Scopes",
      uses: "authorization",
      title: "Keys do only what they're for",
      body: [
        "Each key has scopes (`geocode:read`, `routes:read`) and restrictions (only from these websites or app ids). A key embedded in a web page that's copied can't call the expensive routing API or be used from another site.",
      ],
    },
    {
      kind: "solution",
      short: "Limits",
      uses: "rate-limiting",
      title: "Limits and quotas per key",
      body: [
        "Free keys get 10 requests a second and 100,000 a month; paid plans more. The gateway answers 429 with `Retry-After` when a key is over its rate, and the developer is emailed at 80% of the monthly quota.",
      ],
      add: [node("limits", "cache", "Usage counters", 0.4, -2.4)],
      link: [both("gw", "limits", 3)],
    },
    {
      kind: "case",
      short: "Leaked",
      uses: "observability",
      title: "Case: a key appears on a public code site",
      body: [
        "Usage for one key jumps from 2,000 to 900,000 calls an hour from new countries. Per-key dashboards flag it; the platform emails the owner and, after an hour, restricts the key. The developer creates a new key, deploys it, then deletes the old one: two keys can be active during the switch.",
      ],
      add: [node("mon", "monitor", "Usage per key", 2, -2.4)],
      link: [link("gw", "mon", "event")],
      set: { apps: { state: "hot", badge: "1 key leaked" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Keys that are safe to hand out",
      body: ["Hash them, scope them, limit them, watch them."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Breach-proof storage", "store hashes only", "Authentication"],
          ["50,000 checks a second", "60-second key cache", "Caching"],
          ["Limit damage", "scopes and allowed origins", "Authorization"],
          ["Fair use and billing", "per-key rates and quotas", "Rate limiting"],
          ["Spot leaks", "per-key usage dashboards", "Observability"],
        ],
      },
      set: { apps: { state: "ok", badge: "" } },
    },
  ],
);

/* ============ After Shipping ============ */

export const DAILY_DEPLOYS: CaseStudy = caseStudy(
  {
    id: "daily-deploys",
    title: "From monthly releases to daily deploys",
    tagline:
      "A travel app ships once a month and every release night is scary. Get to many small, boring deploys a day.",
    minutes: 10,
    level: "intermediate",
    tier: "integrate",
    concepts: ["cicd", "testing", "observability", "redundancy", "load-balancing"],
    learn: [
      "Build a pipeline every change goes through",
      "Choose tests that catch real breakage fast",
      "Roll out gradually with automatic rollback",
      "Hide unfinished work behind flags",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Release night, once a month",
      body: [
        "A travel app's 60 developers merge for a month, then a release team deploys everything on a Saturday night. Half the releases are partly rolled back; nobody knows which of 400 changes broke search.",
      ],
      add: [
        node("devs", "user", "Developers", -4.6, 0, { sub: "60" }),
        node("repo", "storage", "Code repository", -1.8, 0),
        node("prod", "server", "Production", 2.6, 0),
      ],
      link: [link("devs", "repo", "write"), link("repo", "prod", { kind: "heavy", rate: 1 })],
      set: { prod: { badge: "400 changes at once", state: "hot" } },
    },
    {
      kind: "solution",
      short: "Pipeline",
      uses: "cicd",
      title: "Every merge goes through one pipeline",
      body: [
        "Each merge triggers the same steps: build, unit tests, integration tests, a staging deploy with smoke tests, then production. No manual steps, no special release nights.",
      ],
      add: [node("ci", "worker", "Pipeline", -0.2, -2.2, { sub: "build → test → deploy" })],
      unlink: ["repo>prod"],
      link: [link("repo", "ci", "event"), link("ci", "prod", "request")],
      set: { prod: { badge: "", state: "ok" } },
    },
    {
      kind: "technique",
      short: "Tests",
      uses: "testing",
      title: "Fast tests first, a few slow ones last",
      body: [
        "Thousands of unit tests run in 3 minutes; a few hundred integration tests against real databases in 8; ten end-to-end journeys (search → book → pay) on staging. A pipeline over 20 minutes gets skipped, so speed is a feature.",
      ],
      quiz: {
        question:
          "A flaky end-to-end test fails 1 run in 10 for no reason. What should the team do?",
        options: [
          "Re-run it until it passes",
          "Quarantine it, fix or replace it with a smaller reliable test",
          "Delete all end-to-end tests",
        ],
        answer: 1,
        why: "Flaky tests teach people to ignore red builds. Fix them quickly or replace them with focused, reliable tests.",
      },
    },
    {
      kind: "solution",
      short: "Canary",
      uses: "load-balancing",
      title: "Send 5% to the new version first",
      body: [
        "The new version starts beside the old one. The load balancer sends 5% of traffic to it for 15 minutes, then 25%, then everyone.",
      ],
      add: [
        node("lb", "lb", "Load balancer", 1.4, 1.8),
        node("canary", "server", "New version", 4, 2.6, { badge: "5%" }),
      ],
      link: [
        link("ci", "canary", "request"),
        link("lb", "prod", { kind: "request", rate: 3 }),
        link("lb", "canary", "request"),
      ],
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Automatic rollback on bad signals",
      body: [
        "During each step, the pipeline compares the canary to the old version: error rate, latency, bookings per minute. If bookings drop or errors climb, traffic goes back to the old version automatically.",
      ],
      metrics: [
        { label: "Canary errors", value: "0.3% vs 0.3%", tone: "good" },
        { label: "Bookings/min", value: "same", tone: "good" },
      ],
      add: [node("mon", "monitor", "Canary checks", 4, -1.2)],
      link: [link("canary", "mon", "event"), link("prod", "mon", "event")],
    },
    {
      kind: "technique",
      short: "Flags",
      uses: "cicd",
      title: "Unfinished features ship switched off",
      body: [
        "A new checkout takes six weeks. Its code merges daily behind a feature flag, off for customers and on for staff. Launch day is flipping a switch, and turning it off is the rollback.",
      ],
    },
    {
      kind: "solution",
      short: "Old copy",
      uses: "redundancy",
      title: "Keep the old version warm",
      body: [
        "For an hour after full rollout, the old version's servers stay running. Rolling back is switching traffic, which takes seconds rather than a fresh deploy.",
      ],
      set: { canary: { badge: "100%" }, prod: { label: "Previous version", state: "dim" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Small, boring, many times a day",
      body: ["Every change takes the same safe path, in small pieces, watched by numbers."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["No release nights", "one automatic pipeline; flags", "CI/CD"],
          ["Catch breakage fast", "fast tests first, few end-to-end", "Testing"],
          ["Limit the blast radius", "5% → 25% → 100%", "Load balancing"],
          ["Know it's healthy", "compare canary to old", "Observability"],
          ["Instant rollback", "old version kept warm", "Redundancy"],
        ],
      },
    },
  ],
);

/* ============ Whole systems ============ */

export const VIDEO_PLATFORM: CaseStudy = caseStudy(
  {
    id: "video-platform",
    title: "Capstone: a video-sharing platform",
    tagline:
      "Creators upload, viewers watch, everyone comments. Design the whole thing, from first upload to a billion views a day.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "hld-lld",
      "napkin-math",
      "files-media",
      "queues",
      "cdn",
      "sharding",
      "caching",
      "batch-stream",
      "authentication",
      "rate-limiting",
      "observability",
    ],
    learn: [
      "Start from requirements and numbers",
      "Upload and process video in the background",
      "Stream from the edge with adaptive quality",
      "Count views at scale",
      "Operate it safely",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "hld-lld",
      title: "Requirements first",
      body: [
        "Functional: creators upload videos; viewers watch on any device; likes, comments and view counts; a home feed of suggestions.",
        "Non-functional: playback starts within 2 seconds, uploads never lost, 99.9% available, cheap enough to show free videos.",
      ],
      add: [
        node("creators", "browser", "Creators", -4.6, -1.8),
        node("viewers", "phone", "Viewers", -4.6, 1.8),
        node("api", "server", "API", -1.4, 0),
        node("db", "db", "Metadata DB", 2, 0),
      ],
      link: [both("creators", "api", 1), both("viewers", "api", 3), both("api", "db", 2)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "How big?",
      body: [
        "500,000 uploads a day at 500 MB ≈ 250 TB of originals a day, more after making several qualities. 1 billion views a day at ~50 MB watched each ≈ 50 PB of video served a day, about 5 Tbit/s on average and double at peak.",
      ],
      metrics: [
        { label: "New originals", value: "≈ 250 TB / day" },
        { label: "Video served", value: "≈ 50 PB / day", tone: "bad" },
      ],
    },
    {
      kind: "solution",
      short: "Upload",
      uses: "files-media",
      title: "Uploads go straight to storage",
      body: [
        "The API returns a resumable upload URL; the creator's browser sends the file in chunks directly to object storage. A dropped connection resumes from the last chunk, and the API never handles video bytes.",
      ],
      add: [node("raw", "storage", "Original uploads", -1.4, -2.8)],
      link: [link("creators", "raw", { kind: "heavy", rate: 2 })],
    },
    {
      kind: "solution",
      short: "Process",
      uses: "queues",
      title: "Transcoding in the background",
      body: [
        "Each upload puts a job on a queue. Workers cut the video into 4-second segments in five qualities (240p to 4K) and make thumbnails; a 10-minute video is processed in parallel pieces in about 2 minutes.",
      ],
      add: [
        node("jobs", "queue", "Transcode jobs", 1, -2.8, { queue: 6 }),
        node("workers", "worker", "Transcoders", 3.4, -2.8, { sub: "×2,000" }),
        node("ready", "storage", "Playable segments", 5.6, -1.2),
      ],
      link: [
        link("raw", "jobs", "event"),
        link("jobs", "workers", "event"),
        link("workers", "ready", "heavy"),
      ],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "Stream from the edge, adapting quality",
      body: [
        "Players fetch segments from CDN edges close to viewers, switching quality every few seconds to match their connection. Popular videos are pushed to edges ahead of time; the long tail is fetched on first view.",
      ],
      quiz: {
        question: "Why cut videos into 4-second segments?",
        options: [
          "Smaller files are cheaper to store",
          "The player can switch quality between segments and edges can cache pieces",
          "Browsers can't play long files",
        ],
        answer: 1,
        why: "Segments let the player adapt to the network mid-video and let edges cache and serve pieces independently.",
      },
      add: [node("cdn", "cdn", "CDN edges", -1.4, 3, { sub: "≈ 10 Tbit/s peak" })],
      link: [link("ready", "cdn", "copy"), link("cdn", "viewers", { kind: "heavy", rate: 4 })],
    },
    {
      kind: "technique",
      short: "Shard",
      uses: "sharding",
      title: "Metadata sharded by video id",
      body: [
        "Billions of videos and comments don't fit one database. Video details and comments are sharded by video id, so a watch page reads one shard. Channel pages use a separate table sharded by channel id.",
      ],
      set: { db: { label: "Metadata shards", sub: "by video id" } },
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Hot watch pages from memory",
      body: [
        "A viral video gets 50,000 page loads a second. Title, description and the first page of comments are cached; the database sees a trickle.",
      ],
      add: [node("cache", "cache", "Watch-page cache", 2, 2.4)],
      link: [both("api", "cache", 3)],
    },
    {
      kind: "technique",
      short: "Views",
      uses: "batch-stream",
      title: "Counting a billion views",
      body: [
        "Every view is an event, not a database update. A stream job aggregates counts per video each few seconds and updates the shown count; a nightly batch job recounts precisely, removing bots and repeats, for creators' earnings.",
      ],
      add: [
        node("events", "stream", "View events", -3.6, 3.6),
        node("counter", "worker", "View counter", 0.4, 4.4),
      ],
      link: [
        link("viewers", "events", "event"),
        link("events", "counter", "event"),
        link("counter", "db", "write"),
      ],
    },
    {
      kind: "technique",
      short: "Who",
      uses: "authentication",
      title: "Who may upload and comment",
      body: [
        "Viewing needs no account. Uploading and commenting need sign-in; channel managers act on a creator's behalf with their own accounts and roles, never a shared password.",
      ],
    },
    {
      kind: "technique",
      short: "Abuse",
      uses: "rate-limiting",
      title: "Limits against spam and abuse",
      body: [
        "Comments are limited per account and per video; new accounts get lower limits. Uploads per day are limited per channel. View events from one address above a threshold aren't counted.",
      ],
    },
    {
      kind: "solution",
      short: "Operate",
      uses: "observability",
      title: "Watch what viewers feel",
      body: [
        "The key metrics are viewer-side: time to first frame, rebuffering per hour, upload success rate. Players report them; dashboards slice by country, device and CDN, and alerts fire on viewer pain, not just server CPU.",
      ],
      metrics: [
        { label: "Time to first frame, p95", value: "1.4 s", tone: "good" },
        { label: "Rebuffering", value: "0.3% of watch time", tone: "good" },
      ],
      add: [node("mon", "monitor", "Playback quality", 5.6, 2.2)],
      link: [link("viewers", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The whole platform",
      body: ["Requirements and numbers first; then each box answers one of them."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Know what to build", "requirements, then design", "HLD and LLD"],
          ["Size it", "≈ 50 PB served a day", "Napkin math"],
          ["Big uploads", "resumable, straight to storage", "Files and media"],
          ["Processing", "queued transcode jobs", "Message queues"],
          ["Smooth playback", "segments from CDN edges", "CDNs"],
          ["Billions of rows", "shard by video id", "Sharding"],
          ["Viral pages", "watch-page cache", "Caching"],
          ["View counts", "stream now, batch for accuracy", "Batch and stream"],
          ["Uploads and comments", "sign-in and roles", "Authentication"],
          ["Spam", "per-account limits", "Rate limiting"],
          ["Viewer experience", "playback metrics", "Observability"],
        ],
      },
    },
  ],
);
