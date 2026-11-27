import { link, node, type Lesson, type Scene, type SceneLink, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/** Builds a scene from a fixed cast of boxes, with per-step changes. */
const cast =
  (nodes: readonly SceneNode[], links: readonly SceneLink[]) =>
  (
    extra: Record<string, Partial<SceneNode>> = {},
    swap?: readonly SceneLink[],
    hide: readonly string[] = [],
  ): Scene => {
    const shown = nodes.filter((n) => !hide.includes(n.id));
    const ids = new Set(shown.map((n) => n.id));
    return {
      nodes: shown.map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
      links: (swap ?? links).filter((l) => ids.has(l.from) && ids.has(l.to)),
    };
  };

/* ------------------------------------------ Mainframes ------------------------------------------ */

const core = cast(
  [
    node("app", "phone", "Mobile app", -4.2, -1.6, { sub: "5 million customers" }),
    node("branch", "browser", "Branch screens", -4.2, 1.6),
    node("mf", "mainframe", "Core banking", 0.4, 0, { sub: "30 million accounts", size: 1.4 }),
    node("batch", "clock", "Nightly batch", 3.4, -2, { sub: "23:00–05:00" }),
    node("out", "files", "Files to partners", 3.4, 2),
  ],
  [both("branch", "mf", 2), link("batch", "mf", "heavy"), link("mf", "out", "file")],
);

export const MAINFRAMES: Lesson = {
  id: "mainframes",
  title: "Mainframes and the core system",
  tagline:
    "The old machine in the basement that still holds every account. What it is good at, and why new systems must work with it.",
  minutes: 11,
  level: "beginner",
  learn: [
    "What a mainframe is and what runs on it",
    "Online transactions and the nightly batch",
    "Why the core is the system of record",
    "Why access, not the machine, is the problem",
    "The four ways new systems connect to it",
  ],
  steps: [
    {
      kind: "setup",
      short: "The core",
      title: "A bank with a forty-year-old heart",
      body: [
        "A bank opened its first computer centre in the 1980s. Today 30 million accounts still live there: every deposit, every interest calculation, every statement. Branch staff use screens that talk to it directly.",
        "Now the bank has a mobile app with 5 million customers, and the app wants balances and payments too.",
      ],
      scene: core({ app: { state: "dim" } }),
    },
    {
      kind: "insight",
      short: "Mainframe",
      title: "What a mainframe is",
      body: [
        "A **mainframe** is a very large, very reliable computer built to run enormous numbers of small transactions, for years, with almost no downtime. Parts can be swapped while it runs.",
        "The programs on it are often decades old, many written in COBOL. A transaction monitor runs each short request (check a balance, post a payment) in a few milliseconds, against a database on the same machine.",
      ],
      callout: {
        kind: "key",
        text: "The core is the **system of record**: when it and any other system disagree about a balance, the core is right.",
      },
      scene: core({ mf: { state: "lit" } }),
    },
    {
      kind: "technique",
      short: "Two modes",
      title: "Day: transactions. Night: batch.",
      body: [
        "During the day the core answers **online transactions** one at a time. At night it runs the **batch**: long jobs that work through every account, adding interest, producing statements and writing files for partners.",
        "While the batch runs, some online features are read-only, so the batch sees a stable picture.",
      ],
      table: {
        head: ["Mode", "When", "Example"],
        rows: [
          ["Online", "All day", "Check a balance, pay a bill"],
          ["Batch", "23:00–05:00", "Interest for 30 million accounts"],
          ["Files", "After batch", "Card payments sent to the card network"],
        ],
      },
      scene: core({ batch: { state: "lit" }, out: { state: "lit" } }),
    },
    {
      kind: "problem",
      short: "Cost",
      title: "Every lookup costs money",
      body: [
        "Mainframe use is often billed by how much processing it does. Branches look up about 3 million balances a day. A mobile app opened 20 times a day by 5 million people would ask for 100 million.",
        "Pointing the app straight at the core could multiply the bill and use up capacity the branches need.",
      ],
      metrics: [
        { label: "Branch lookups / day", value: "3 million" },
        { label: "App lookups / day", value: "100 million", tone: "bad" },
      ],
      scene: core({ app: { state: "hot" }, mf: { state: "hot", badge: "33× load" } }, [
        both("branch", "mf", 1),
        both("app", "mf", 4),
        link("batch", "mf", "heavy"),
        link("mf", "out", "file"),
      ]),
    },
    {
      kind: "problem",
      short: "Old formats",
      title: "It speaks an older language",
      body: [
        "The core's records have fixed positions and old conventions: amounts in cents with no decimal point, dates as `20261127`, text in an older character set, and status codes like `07`, which means “dormant” to the three people who remember.",
        "Few people know the code well, so even a small change needs months of careful testing.",
      ],
      code: ["ACCT 0004417723  BAL 000001250075  ST 07  OPENED 19940312"],
      scene: core({ mf: { badge: "ST 07?" } }),
    },
    {
      kind: "tradeoff",
      short: "Replace it?",
      title: "Why not just rewrite it?",
      body: [
        "Rewriting a core in one go takes years, costs a fortune, and has to reproduce thousands of rules nobody wrote down. If the switch-over goes wrong, money goes missing.",
        "The mainframe itself works well. What hurts is how hard it is to reach. Fix the access first; replace pieces later, one at a time (see the strangler-fig lesson).",
      ],
      quiz: {
        question: "What is usually the real problem with a decades-old core system?",
        options: [
          "It loses data every week",
          "It is slow at small transactions",
          "New systems find it hard and expensive to connect to",
        ],
        answer: 2,
        why: "Cores are typically fast and reliable at what they were built for. The pain is old formats, rare skills and costly capacity when new channels connect directly.",
      },
      scene: core(),
    },
    {
      kind: "technique",
      short: "Ways in",
      title: "Four ways in",
      body: [
        "New systems can reach a core in four ways, from worst to best for most uses. **Screen scraping** drives the old terminal screens by program: quick to start, breaks when a screen changes. **Files** are swapped on a schedule: simple, but a day late. **Message queues**, which many cores support well, carry requests reliably without waiting. **APIs** expose transactions as web calls, either on the core itself or through a layer in front.",
      ],
      table: {
        head: ["Way in", "Speed", "Risk"],
        rows: [
          ["Screen scraping", "Live", "Breaks when a screen changes"],
          ["Files", "Next day", "Late data, missing files"],
          ["Message queue", "Seconds", "Needs care with replies"],
          ["API", "Live", "Load must be controlled"],
        ],
      },
      scene: core({ out: { state: "lit" } }),
    },
    {
      kind: "solution",
      short: "A layer",
      title: "A modern layer in front",
      body: [
        "The plan: new channels never talk to the core directly. A thin modern layer sits in front. It answers reads from a cache, sends writes through a queue, and translates old codes into clear ones in one place.",
        "The next lessons build each piece: files, the API façade, gradual replacement and change capture.",
      ],
      scene: {
        nodes: [
          node("app", "phone", "Mobile app", -4.2, -1.6),
          node("branch", "browser", "Branch screens", -4.2, 1.6),
          node("api", "service", "Accounts API", -1.6, -1.6, { state: "lit", sub: "new layer" }),
          node("cache", "cache", "Balance cache", -1.6, -4),
          node("mq", "queue", "Payment queue", 0.6, -2.6),
          node("mf", "mainframe", "Core banking", 1.6, 0.4, { size: 1.4 }),
        ],
        links: [
          both("app", "api", 3),
          both("api", "cache", 3),
          both("api", "mf", 1),
          link("api", "mq", "event"),
          link("mq", "mf", "event"),
          both("branch", "mf", 2),
        ],
      },
    },
    {
      kind: "case",
      short: "Late batch",
      title: "Case: the batch that ran late",
      body: [
        "At month end the batch had twice the usual work and finished at 07:30 instead of 05:00. Until then, the app showed yesterday's balances as if they were current, and customers called in.",
        "Now every balance carries an “as of” time, each batch job has an expected finish time, and an alert fires at 05:00 if the batch isn't done.",
      ],
      scene: core({ batch: { state: "hot", badge: "07:30" } }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A mainframe runs huge numbers of small transactions reliably and is the system of record.",
        "Days are for online transactions, nights for batch; some features pause during the batch.",
        "Capacity costs money and the formats are old, so direct access from new apps hurts.",
        "Fix the access before replacing anything: files, queues and APIs through a modern layer.",
      ],
      scene: core(),
    },
  ],
};

/* ------------------------------------------ Files ------------------------------------------ */

const intake = cast(
  [
    node("partner", "internet", "Partner garages", -4.4, 0, { sub: "40 files a night" }),
    node("drop", "files", "Drop folder", -1.8, 0, { sub: "secure transfer" }),
    node("loader", "worker", "Loader", 0.8, 0),
    node("archive", "storage", "Archive", 0.8, -2.6, { sub: "originals, untouched" }),
    node("db", "db", "Claims DB", 3.6, 0),
    node("rejects", "queue", "Rejected rows", 3.2, 2.6, { sub: "for a person" }),
    node("mon", "monitor", "File watch", -1.8, 2.8),
  ],
  [
    link("partner", "drop", "file"),
    link("drop", "loader", "event"),
    link("loader", "archive", "copy"),
    link("loader", "db", "write"),
    link("loader", "rejects", "event"),
    link("loader", "mon", "event"),
  ],
);

export const FILE_BATCH: Lesson = {
  id: "file-batch",
  title: "Files and the nightly batch",
  tagline:
    "Partners still send files every night. Load them so that half files, reruns and missing files never cause harm.",
  minutes: 11,
  level: "beginner",
  learn: [
    "Why files are still everywhere",
    "Fixed-width records and control totals",
    "Land, check, then load",
    "Reruns that never count twice",
    "Noticing the file that never came",
  ],
  steps: [
    {
      kind: "setup",
      short: "Every night",
      title: "Forty files before breakfast",
      body: [
        "An insurer works with 40 partner garages. Every night at 01:00 each garage sends a file of the repair claims it handled that day. A loader reads them into the claims database before staff arrive at 08:00.",
      ],
      scene: intake({}, undefined, ["archive", "rejects", "mon"]),
    },
    {
      kind: "insight",
      short: "Why files",
      title: "Why files are still everywhere",
      body: [
        "Between organisations, files are still the most common way to share data. Every partner, from a three-person garage to a bank, can produce one. There is no live connection to keep up, and the file itself is a record of what was sent.",
        "Files usually travel over an encrypted file transfer into a **drop folder** that the receiver watches.",
      ],
      scene: intake({ drop: { state: "lit" } }, undefined, ["archive", "rejects", "mon"]),
    },
    {
      kind: "technique",
      short: "Records",
      title: "Fixed-width records and a trailer",
      body: [
        "Many files use **fixed-width** records: characters 1–10 are the claim number, 11–18 the date, 19–30 the amount in pence. The first line is a header saying who sent the file and when. The last is a **trailer** with the number of records and the total amount.",
        "These **control totals** let the receiver check that it got the whole file and nothing extra.",
      ],
      code: [
        "HDR GARAGE-0417 20261126 SEQ 0183",
        "C000918273202611260000004512500",
        "C000918274202611260000000098000",
        "TRL COUNT 0000002 TOTAL 000000461050",
      ],
      scene: intake({ drop: { badge: "HDR…TRL" } }, undefined, ["archive", "rejects", "mon"]),
    },
    {
      kind: "problem",
      short: "Half a file",
      title: "The loader read half a file",
      body: [
        "One night a big file was still arriving when the loader found it. It loaded 3,000 of 8,000 claims, marked the file done, and the other 5,000 never appeared.",
      ],
      scene: intake({ loader: { state: "hot" }, drop: { badge: "still arriving" } }, undefined, [
        "archive",
        "rejects",
        "mon",
      ]),
    },
    {
      kind: "solution",
      short: "Done marker",
      title: "Only pick up finished files",
      body: [
        "Partners now upload to a temporary name and rename the file when it is complete, or send a small “done” file after it. The loader only looks at finished names.",
        "Before loading, it counts the records and adds the amounts. If they don't match the trailer, the file is held and the partner is asked to resend.",
      ],
      scene: intake({ drop: { badge: ".done ✓" } }, undefined, ["archive", "rejects", "mon"]),
    },
    {
      kind: "solution",
      short: "Land first",
      title: "Land, check, then load",
      body: [
        "Every file is first copied, untouched, to an **archive**. That copy is evidence of what the partner sent, and it lets you load again later.",
        "Then each record is checked. Good records load; bad ones (a date of 31 February, an unknown policy) go to a **rejects queue** where a person fixes them. One bad row never stops 7,999 good ones.",
      ],
      scene: intake({ archive: { state: "lit" }, rejects: { state: "lit", queue: 3 } }, undefined, [
        "mon",
      ]),
    },
    {
      kind: "problem",
      short: "Rerun",
      title: "The rerun that paid twice",
      body: [
        "The loader crashed halfway through a file. Someone ran it again from the start, and the first 4,000 claims were loaded twice. Some were nearly paid twice.",
      ],
      scene: intake({ db: { state: "hot", badge: "4,000 twice" } }, undefined, ["mon"]),
    },
    {
      kind: "solution",
      short: "Safe rerun",
      title: "Loading the same file twice changes nothing",
      body: [
        "Each file has an identity: partner, date and sequence number from the header. The loader records which files it has finished. Each claim is written by its claim number, so writing it again replaces it instead of adding a copy.",
        "Now a rerun, by accident or on purpose, is always safe.",
      ],
      code: [
        "if already_loaded(file_id): skip",
        "for claim in records: upsert(claim.number, claim)",
        "mark_loaded(file_id)",
      ],
      quiz: {
        question: "What makes rerunning a half-loaded file safe?",
        options: [
          "Running it faster the second time",
          "Writing each record by its own key, so a repeat replaces instead of adding",
          "Deleting the archive copy first",
        ],
        answer: 1,
        why: "When each write is keyed by the record's identity, doing it twice gives the same result as doing it once.",
      },
      scene: intake({}, undefined, ["mon"]),
    },
    {
      kind: "technique",
      short: "Missing",
      title: "The file that never came",
      body: [
        "The most dangerous file is the one that doesn't arrive: nothing fails, so nothing complains. A watcher now expects each partner's file by 02:00 and raises an alert if it's missing, or if it has far fewer records than usual.",
      ],
      scene: intake({ mon: { state: "lit", badge: "garage 12: late" } }),
    },
    {
      kind: "tradeoff",
      short: "Speed",
      title: "Daily files are a day late",
      body: [
        "A claim handled at 09:00 isn't seen until the next morning. Partners who can send smaller files every 15 minutes cut the delay without changing much else. Live events cut it further, but need both sides to change.",
      ],
      table: {
        head: ["Style", "Delay", "Effort for the partner"],
        rows: [
          ["Daily file", "Up to a day", "Lowest"],
          ["File every 15 minutes", "Minutes", "Low"],
          ["Live events or API", "Seconds", "Highest"],
        ],
      },
      scene: intake(),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Files are how many organisations share data; expect them and load them well.",
        "Pick up only finished files and check the counts against the trailer.",
        "Archive the original, load good rows, send bad rows to people.",
        "Key every write so reruns are safe, and alert on files that don't arrive.",
      ],
      scene: intake(),
    },
  ],
};

/* ------------------------------------------ API façade ------------------------------------------ */

const facade = cast(
  [
    node("app", "phone", "Mobile app", -4.4, 0),
    node("gw", "gateway", "API gateway", -2.2, 0, { sub: "limits per customer" }),
    node("api", "service", "Accounts API", 0.2, 0, { sub: "the façade" }),
    node("cache", "cache", "Balance cache", 0.2, -2.6, { sub: "30 s" }),
    node("mq", "queue", "Payment queue", 2, 2.4),
    node("mf", "mainframe", "Core banking", 3.6, -0.4, { size: 1.4 }),
  ],
  [
    both("app", "gw", 3),
    both("gw", "api", 3),
    both("api", "cache", 3),
    both("api", "mf", 1),
    link("api", "mq", "event"),
    link("mq", "mf", "event"),
  ],
);

export const API_FACADE: Lesson = {
  id: "api-facade",
  title: "API façade and anti-corruption layer",
  tagline:
    "One clean modern API in front of the old system: it translates, caches, queues and protects, so nobody else has to.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why every app calling the core directly hurts",
    "A façade: the only door to the old system",
    "Translating old codes into a clean model",
    "Cached reads and queued writes",
    "Protecting the core's capacity",
  ],
  steps: [
    {
      kind: "setup",
      short: "Six apps",
      title: "Six teams want the core",
      body: [
        "The mobile app needs balances, recent transactions and payments. So do the website, the chat assistant, the call-centre tool, the fraud team and the rewards programme. Each team plans to call the core directly.",
      ],
      scene: facade({}, [both("app", "mf", 2)], ["gw", "api", "cache", "mq"]),
    },
    {
      kind: "problem",
      short: "Leaks",
      title: "The old model leaks everywhere",
      body: [
        "Every team that calls the core directly has to learn its record layouts, its codes and its quirks. Status `07` ends up hard-coded in six apps. When the core team changes a field, six apps break.",
        "Nobody controls the total load either: six teams, six sets of retries, one core.",
      ],
      scene: facade(
        { mf: { state: "hot", badge: "6 callers" } },
        [both("app", "mf", 4)],
        ["gw", "api", "cache", "mq"],
      ),
    },
    {
      kind: "solution",
      short: "Façade",
      title: "One door: the façade",
      body: [
        "A single new service, the **façade**, is the only thing allowed to talk to the core. It offers a clean modern API, such as `GET /accounts/{id}/balance` returning JSON, and every other app uses that.",
        "The old system's knowledge now lives in one place, owned by one team.",
      ],
      scene: facade(
        { api: { state: "lit" } },
        [both("app", "api", 3), both("api", "mf", 1)],
        ["gw", "cache", "mq"],
      ),
    },
    {
      kind: "technique",
      short: "Translate",
      title: "An anti-corruption layer",
      body: [
        "The façade translates in both directions, so the old model never leaks into new code. This translating part is called an **anti-corruption layer**: it keeps the new system's ideas clean even though the old one is odd.",
      ],
      table: {
        head: ["Core says", "API says"],
        rows: [
          ["BAL 000001250075", '"balance": 12500.75, "currency": "INR"'],
          ["ST 07", '"status": "dormant"'],
          ["OPENED 19940312", '"opened": "1994-03-12"'],
        ],
      },
      scene: facade(
        { api: { badge: "07 → dormant" } },
        [both("app", "api", 3), both("api", "mf", 1)],
        ["gw", "cache", "mq"],
      ),
    },
    {
      kind: "technique",
      short: "Cache",
      title: "Reads from a cache",
      body: [
        "Most calls are “what's my balance?”, asked again and again. The façade keeps balances in a cache for 30 seconds and always returns an “as of” time. After a payment it clears that customer's entry.",
        "Nine in ten reads never reach the core.",
      ],
      metrics: [
        { label: "Reads from cache", value: "90%", tone: "good" },
        { label: "Core lookups / day", value: "10 million", tone: "good" },
      ],
      scene: facade({ cache: { state: "lit" } }, undefined, ["gw", "mq"]),
    },
    {
      kind: "technique",
      short: "Writes",
      title: "Writes through a queue",
      body: [
        "Payments are sent as messages on a queue that the core reads. Many cores have handled queues reliably for decades. The façade replies “accepted” with a reference at once, and the app shows the payment as pending until the core confirms.",
        "Each payment carries a unique key, so if the app retries, the core still pays only once.",
      ],
      scene: facade({ mq: { state: "lit", queue: 4 } }, undefined, ["gw"]),
    },
    {
      kind: "solution",
      short: "Protect",
      title: "Protect the core",
      body: [
        "The façade allows at most a set number of calls per second to the core. Above that it answers from the cache or says “try again shortly”. If the core slows down, a circuit breaker stops calls for a few seconds instead of piling on.",
        "In front, an API gateway limits each customer, so one buggy app can't use the whole budget.",
      ],
      scene: facade({ gw: { state: "lit" } }),
    },
    {
      kind: "case",
      short: "Batch hours",
      title: "Case: the core during the batch",
      body: [
        "Between 01:00 and 03:00 the core is read-only while the batch runs. The façade keeps answering balances from its cache, marked with their time, and queues payments with the note “will be processed after 03:00”. Customers see a working app instead of an error.",
      ],
      scene: facade({ mf: { state: "dim", badge: "batch" }, mq: { queue: 8 } }, [
        both("app", "gw", 3),
        both("gw", "api", 3),
        both("api", "cache", 3),
        link("api", "mq", "event"),
      ]),
    },
    {
      kind: "tradeoff",
      short: "Keep thin",
      title: "Don't build a new monolith",
      body: [
        "A façade can slowly collect every feature until it becomes the next big system nobody dares to change. Keep it thin: translate, cache, queue and protect. Business features belong in the services that use it.",
        "It holds no state of its own besides the cache, so you can run several copies behind a load balancer.",
      ],
      quiz: {
        question: "Why route every app through one façade instead of letting each call the core?",
        options: [
          "So the old formats, load limits and quirks are handled in one place",
          "Because the core cannot accept more than one connection",
          "So that the core can be switched off",
        ],
        answer: 0,
        why: "One team owns the translation and protection. Apps get a clean API, and the core gets one well-behaved caller.",
      },
      scene: facade(),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "One façade is the only door to the old system.",
        "Its anti-corruption layer turns old codes and formats into a clean model.",
        "Reads come from a cache with an “as of” time; writes go through a queue with unique keys.",
        "It limits and breaks calls to protect the core, and stays thin.",
      ],
      scene: facade(),
    },
  ],
};

/* ------------------------------------------ Strangler fig ------------------------------------------ */

const strangler = cast(
  [
    node("users", "browser", "Shoppers", -4.4, 0),
    node("proxy", "gateway", "Routing proxy", -2, 0),
    node("old", "server", "Old order system", 0.6, -1.8, { sub: "20 years old" }),
    node("olddb", "db", "Old database", 3.4, -1.8),
    node("new", "service", "New orders service", 0.6, 1.8),
    node("newdb", "db", "New database", 3.4, 1.8),
    node("mon", "monitor", "Compare & watch", -2, 2.8),
  ],
  [
    both("users", "proxy", 3),
    both("proxy", "old", 3),
    both("old", "olddb", 2),
    both("new", "newdb", 1),
  ],
);

export const STRANGLER_FIG: Lesson = {
  id: "strangler-fig",
  title: "Replacing a system piece by piece",
  tagline:
    "Grow the new system around the old one, one route at a time, until the old one can be switched off quietly.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why big-bang rewrites fail",
    "A routing proxy in front of old and new",
    "Choosing the first slice",
    "Shadow traffic and comparing answers",
    "Shifting traffic, rolling back and retiring",
  ],
  steps: [
    {
      kind: "setup",
      short: "The old one",
      title: "Twenty years of orders",
      body: [
        "A retailer's order system is one big application with one database, changed by hundreds of people over twenty years. It works, but every change is slow and risky, so the company wants a new one.",
      ],
      scene: strangler(
        {},
        [both("users", "old", 3), both("old", "olddb", 2)],
        ["proxy", "new", "newdb", "mon"],
      ),
    },
    {
      kind: "problem",
      short: "Big bang",
      title: "The big-bang plan",
      body: [
        "Plan A: rebuild everything for two years, then switch over in one weekend. On Monday the new system is missing dozens of rules nobody wrote down: special delivery zones, a discount for one old customer group. Orders are already flowing, so going back is nearly impossible.",
      ],
      scene: strangler(
        { new: { state: "down", badge: "Monday" } },
        [both("users", "new", 3)],
        ["proxy", "old", "mon"],
      ),
    },
    {
      kind: "insight",
      short: "The fig",
      title: "Grow around it",
      body: [
        "A strangler fig starts as a vine on a tree, grows around it, and eventually stands on its own. The **strangler fig pattern** does the same: the new system takes over one piece at a time while the old one keeps running, until nothing is left for the old one to do.",
      ],
      callout: {
        kind: "key",
        text: "Every step is small, live and reversible. You are never more than one change away from safety.",
      },
      scene: strangler({}, undefined, ["mon"]),
    },
    {
      kind: "solution",
      short: "Proxy",
      title: "First, a proxy in front",
      body: [
        "Before writing any new feature, put a **routing proxy** in front of the old system and send it 100% of traffic. Nothing changes for shoppers, but now you decide where each request goes.",
      ],
      scene: strangler({ proxy: { state: "lit", badge: "100% old" } }, undefined, [
        "new",
        "newdb",
        "mon",
      ]),
    },
    {
      kind: "technique",
      short: "First slice",
      title: "Pick a slice with clear edges",
      body: [
        "Start with something useful, low-risk and well-bounded: **order tracking**, which only reads. Build it in the new service and route `/orders/*/status` there. Everything else still goes to the old system.",
      ],
      scene: strangler({ proxy: { badge: "status → new" } }, [
        both("users", "proxy", 3),
        both("proxy", "old", 2),
        both("proxy", "new", 1),
        both("old", "olddb", 2),
        both("new", "newdb", 1),
      ]),
    },
    {
      kind: "technique",
      short: "Shadow",
      title: "Shadow traffic: compare before switching",
      body: [
        "Before shoppers see the new code, the proxy sends a copy of each real request to it as well, and throws the answer away. A checker compares old and new answers.",
        "99.2% match. The other 0.8% reveal an undocumented rule: the old system rounds tax per line, not per order. Fix it before any shopper is affected.",
      ],
      metrics: [{ label: "Answers that match", value: "99.2%" }],
      scene: strangler({ mon: { state: "lit", badge: "0.8% differ" } }, [
        both("users", "proxy", 3),
        both("proxy", "old", 3),
        link("proxy", "new", "copy"),
        both("old", "olddb", 2),
        both("new", "newdb", 1),
        link("new", "mon", "event"),
        link("old", "mon", "event"),
      ]),
    },
    {
      kind: "technique",
      short: "Data",
      title: "The new service needs the data",
      body: [
        "The new service keeps its own database and never reads the old one directly, or the two would be tied together for ever. Changes in the old database are copied across as they happen, using change data capture (the next lesson).",
      ],
      scene: strangler({}, [
        both("users", "proxy", 3),
        both("proxy", "old", 3),
        both("old", "olddb", 2),
        link("olddb", "newdb", "copy"),
        both("new", "newdb", 1),
      ]),
    },
    {
      kind: "solution",
      short: "Shift",
      title: "Shift traffic a little at a time",
      body: [
        "The proxy moves tracking traffic in steps: 1%, 10%, 50%, 100%, watching errors and speed at each one. If anything looks wrong, rolling back is a routing change that takes seconds, not a weekend.",
      ],
      quiz: {
        question: "What makes rolling back cheap with this approach?",
        options: [
          "The new system is always faster",
          "The old system still runs, so the proxy can send traffic back at once",
          "Both systems share one database",
        ],
        answer: 1,
        why: "The old path stays alive until the new one has proven itself. Undoing a step is just a routing change.",
      },
      scene: strangler({ proxy: { badge: "10% → new" }, mon: { state: "lit" } }, [
        both("users", "proxy", 3),
        both("proxy", "old", 3),
        both("proxy", "new", 1),
        both("old", "olddb", 2),
        both("new", "newdb", 1),
        link("proxy", "mon", "event"),
      ]),
    },
    {
      kind: "case",
      short: "Back door",
      title: "Case: the caller who skipped the proxy",
      body: [
        "After tracking moved, the finance team's nightly report started to drift. It read the old database directly, so it never went through the proxy and nobody had listed it.",
        "Before each slice moves, check the database's own connection logs for every program that reads the tables, not just the traffic at the front door.",
      ],
      scene: strangler({ olddb: { state: "hot", badge: "unknown reader" } }),
    },
    {
      kind: "solution",
      short: "Retire",
      title: "Retire the old system",
      body: [
        "Slice by slice (tracking, returns, checkout, invoicing) the routes move over. When the old system has had no traffic for a month, it is switched off and its data archived. No big weekend, no all-night war room.",
      ],
      scene: strangler(
        { old: { state: "dim", badge: "0%" }, olddb: { state: "dim" } },
        [both("users", "proxy", 3), both("proxy", "new", 3), both("new", "newdb", 2)],
        ["mon"],
      ),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Big-bang rewrites hide missing rules until it's too late to go back.",
        "Put a routing proxy in front first; then move one well-bounded slice at a time.",
        "Use shadow traffic to compare answers before anyone relies on the new code.",
        "Shift traffic in small steps, find every hidden caller, and retire the old system last.",
      ],
      scene: strangler(),
    },
  ],
};

/* ------------------------------------------ Change data capture ------------------------------------------ */

const cdc = cast(
  [
    node("old", "server", "Old order system", -4.2, -1.4),
    node("db", "db", "Orders DB", -1.8, -1.4, { sub: "change log" }),
    node("cap", "worker", "Change capture", -1.8, 1.6, { sub: "reads the log" }),
    node("stream", "stream", "Order changes", 0.8, 1.6),
    node("search", "search", "Search", 3.6, -1.4),
    node("neworders", "service", "New orders service", 3.6, 1.6),
    node("stats", "worker", "Analytics", 3, 4),
  ],
  [
    both("old", "db", 2),
    link("db", "cap", "copy"),
    link("cap", "stream", "event"),
    link("stream", "search", "event"),
    link("stream", "neworders", "event"),
    link("stream", "stats", "event"),
  ],
);

export const CHANGE_DATA_CAPTURE: Lesson = {
  id: "change-data-capture",
  title: "Change data capture",
  tagline:
    "Turn every change in an old database into an event, without touching the old code, and keep new systems in step.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why polling and dual writes go wrong",
    "The database's own change log",
    "Publishing changes as ordered events",
    "Snapshots, replays and the outbox",
    "Translating raw rows into business events",
  ],
  steps: [
    {
      kind: "setup",
      short: "Who changed",
      title: "Three systems need to know",
      body: [
        "The old order system writes to its database. Three new systems need to know whenever an order changes: search, the new orders service and analytics.",
      ],
      scene: cdc({}, [both("old", "db", 2)], ["cap", "stream"]),
    },
    {
      kind: "problem",
      short: "Polling",
      title: "Asking every minute",
      body: [
        "Each new system asks the database every minute: “which orders changed since last time?” This adds load, and it misses things: deleted orders leave no row to find, and one old code path never updates the “changed at” column.",
      ],
      code: ["SELECT * FROM orders WHERE updated_at > :last_seen"],
      scene: cdc(
        { db: { state: "hot" } },
        [
          both("old", "db", 2),
          both("search", "db", 1),
          both("neworders", "db", 1),
          both("stats", "db", 1),
        ],
        ["cap", "stream"],
      ),
    },
    {
      kind: "problem",
      short: "Dual write",
      title: "Change the old code to send events?",
      body: [
        "Another idea: change the old system to write to the database and also send an event. That means touching fragile old code. And if it saves the order and then crashes before sending, the database and the event disagree, with no easy way to notice.",
      ],
      scene: cdc(
        { old: { state: "hot", badge: "crash" } },
        [both("old", "db", 2), link("old", "stream", "fail")],
        ["cap"],
      ),
    },
    {
      kind: "insight",
      short: "The log",
      title: "The database already writes it down",
      body: [
        "Every serious database keeps a **change log** for its own recovery and copies: every insert, update and delete, in the order they were committed. Replicas stay in sync by reading it.",
        "If a replica can read it, so can we.",
      ],
      scene: cdc({ db: { state: "lit" } }, [both("old", "db", 2)], ["cap", "stream"]),
    },
    {
      kind: "solution",
      short: "Capture",
      title: "Change data capture",
      body: [
        "A **change capture** tool reads the log the way a replica would and publishes each change as an event on a stream. The old application is not changed at all, and nothing that commits is missed, deletes included.",
      ],
      code: [
        '{"table": "orders", "op": "update", "key": 88211,',
        ' "before": {"status": "PACKED"}, "after": {"status": "SHIPPED"}}',
      ],
      scene: cdc({ cap: { state: "lit" } }),
    },
    {
      kind: "technique",
      short: "Order",
      title: "Keep each order's changes in order",
      body: [
        "Events are keyed by order number, so all changes to one order land in the same partition of the stream and arrive in the order they happened. “Shipped” never arrives before “packed”.",
        "Each reader remembers its position in the stream. After a restart it carries on from there.",
      ],
      scene: cdc({ stream: { badge: "by order no." } }),
    },
    {
      kind: "technique",
      short: "Snapshot",
      title: "Start with a snapshot",
      body: [
        "A new reader also needs the orders that existed before it started. The tool first takes a **snapshot** of the table, then continues from the log position the snapshot was taken at, so nothing is lost or doubled.",
        "If a reader's data is ever damaged, it can rebuild by replaying the stream.",
      ],
      scene: cdc({ search: { badge: "snapshot + log" } }),
    },
    {
      kind: "technique",
      short: "Outbox",
      title: "In new services: the outbox",
      body: [
        "In code you own, you can do better than raw rows. In the same transaction that saves the order, write a clean business event to an **outbox** table. Capture publishes the outbox. The event can never disagree with the data, because both were saved together or neither was.",
      ],
      code: ["with transaction():", "    save(order)", '    outbox.add("OrderShipped", order.id)'],
      scene: cdc({ neworders: { state: "lit", badge: "outbox" } }),
    },
    {
      kind: "tradeoff",
      short: "Raw rows",
      title: "Raw rows carry old habits",
      body: [
        "Captured events mirror the old tables exactly, odd column names and codes included. If every reader decodes `ST=07` itself, they are all tied to the old design again.",
        "Put one translator after capture that turns raw changes into clear business events (“OrderShipped”), the same anti-corruption idea as the façade.",
      ],
      quiz: {
        question: "Why is change data capture safer than changing the old app to also send events?",
        options: [
          "It reads changes the database has already committed, so it never disagrees with it and needs no change to old code",
          "It is always faster than the old app",
          "It removes the need for a database",
        ],
        answer: 0,
        why: "The log is the database's own record of committed changes. Reading it avoids dual writes and leaves the fragile old code alone.",
      },
      scene: cdc(),
    },
    {
      kind: "case",
      short: "Lag",
      title: "Case: month end, 4 million updates",
      body: [
        "At month end the batch updates 4 million orders in an hour, and search falls 20 minutes behind. A dashboard now shows how far behind each reader is. Search runs more readers, one per partition, and the site says “updated a few minutes ago” when it's behind.",
      ],
      metrics: [{ label: "Search lag", value: "20 min → 40 s", tone: "good" }],
      scene: cdc({ search: { state: "hot", badge: "20 min behind" }, stream: { queue: 8 } }),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Polling misses deletes and loads the database; dual writes can disagree.",
        "Change capture reads the database's own log and publishes every committed change.",
        "Key events so each record stays in order; snapshot first, replay when needed.",
        "Use an outbox in new code, and translate raw rows into business events.",
      ],
      scene: cdc(),
    },
  ],
};
