import { link, node, patch, type Lesson, type Scene } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ------------------------------------ SQL vs NoSQL ------------------------------------ */

const appS = node("app", "server", "AlgoVerse app", -2, 0);
const sql = node("sql", "db", "PostgreSQL", 1.5, 0, { sub: "tables" });
const docs = node("docs", "db", "Document store", 1.5, -2.4, {
  sub: "lessons as JSON",
  hue: "violet",
});
const kv = node("kv", "cache", "Key–value store", 1.5, 2.4, { sub: "sessions, streaks" });
const search = node("search", "search", "Search index", 4.2, -1, { sub: "inverted index" });
const oneDb: Scene = { nodes: [appS, sql], links: [both("app", "sql")] };
const polyglot: Scene = {
  nodes: [appS, sql, docs, kv],
  links: [both("app", "sql"), both("app", "docs"), both("app", "kv", 3)],
};

export const SQL_NOSQL: Lesson = {
  id: "sql-nosql",
  title: "SQL and NoSQL",
  tagline:
    "Tables, documents or plain keys: what each kind of database is good at, and what it gives up.",
  minutes: 11,
  level: "beginner",
  learn: [
    "Tables, keys and joins",
    "Transactions: all or nothing",
    "Documents for records of many shapes",
    "Key–value stores for lookups by id",
    "Choosing per kind of data, and adding a search index",
  ],
  builtOn: [
    { label: "Hash table", path: "/structures/hash-table" },
    { label: "Trie", path: "/structures/trie" },
  ],
  steps: [
    {
      kind: "setup",
      short: "Tables",
      title: "Data in tables",
      body: [
        "AlgoVerse starts with a relational database, PostgreSQL. Data lives in **tables** with a fixed set of columns: `learners`, `lessons`, `attempts`.",
        "Tables point at each other with keys, and a **join** combines them in one query: \"every attempt today, with the learner's name and the lesson's title\".",
      ],
      code: [
        "SELECT l.name, s.title, a.score",
        "FROM attempts a",
        "JOIN learners l ON l.id = a.learner_id",
        "JOIN lessons s  ON s.id = a.lesson_id",
        "WHERE a.day = today();",
      ],
      callout: {
        kind: "key",
        text: "Relational databases have decades of tooling behind them. When unsure, they are a safe default.",
      },
      scene: oneDb,
    },
    {
      kind: "technique",
      short: "Transactions",
      title: "All or nothing: transactions",
      body: [
        "When Priya finishes a course, AlgoVerse adds 500 XP **and** awards a badge. If the server crashes between the two updates she gets one without the other.",
        "A **transaction** groups them: both happen or neither does. Relational databases guarantee this (the ACID properties).",
      ],
      table: {
        head: ["Letter", "Promise"],
        rows: [
          ["A — atomic", "all of the changes, or none"],
          ["C — consistent", "rules (constraints) still hold"],
          ["I — isolated", "others don't see half-done work"],
          ["D — durable", "committed means saved, even after a crash"],
        ],
      },
      scene: patch(oneDb, {
        links: [link("app", "sql", "write", { kind: "response", back: true })],
      }),
    },
    {
      kind: "problem",
      short: "Many shapes",
      title: "Growing pains: records of many shapes",
      body: [
        "Lesson content keeps growing new kinds: quizzes have options, coding exercises have test cases, videos have chapters, diagrams have layers. The `lessons` table sprouts dozens of mostly empty columns.",
        "Every new kind means a schema migration on a big table, and all writes still go through one database server.",
      ],
      callout: {
        kind: "watch",
        text: "Rigid schemas and a single write server are the classic pains of relational databases at scale.",
      },
      scene: patch(oneDb, { nodes: { sql: { state: "hot", badge: "86 columns" } } }),
    },
    {
      kind: "solution",
      short: "Documents",
      title: "Documents: each record its own shape",
      body: [
        "A **document store** (MongoDB, Firestore) keeps each record as a self-contained JSON document. A quiz and a coding exercise can have completely different fields, with no migration.",
        "Everything about one lesson lives together, so showing it is a single fetch, and documents spread naturally across many servers.",
      ],
      callout: {
        kind: "watch",
        text: "Your code must now cope with every document shape it has ever written.",
      },
      code: [
        '{ "id": "binary-search", "kind": "exercise",',
        '  "tests": [[[1,3,5], 3, 1], [[2,4], 5, -1]] }',
      ],
      scene: { nodes: [appS, sql, docs], links: [both("app", "sql", 1), both("app", "docs", 2)] },
    },
    {
      kind: "technique",
      short: "Key–value",
      title: "Key–value: just look it up",
      body: [
        "The simplest store of all maps a **key** to a **value** (Redis, DynamoDB). No queries and no joins: get and set by key, in about a millisecond.",
        "Because each key stands alone, the data splits across many machines almost for free. Perfect for sessions, streak counters and feature flags.",
      ],
      quiz: {
        question: "Which data suits a key–value store best?",
        options: [
          '"All attempts this week, grouped by lesson"',
          "Priya's session, fetched by its id",
          "A report joining learners and badges",
        ],
        answer: 1,
        why: "Key–value stores shine when you always fetch by one id. Grouping and joining are what SQL is for.",
      },
      scene: polyglot,
    },
    {
      kind: "tradeoff",
      short: "Costs",
      title: "What NoSQL gives up",
      body: [
        "Document and key–value stores scale out easily largely because they give things up: joins across records, transactions across many records, and often strict consistency.",
        "These are defaults, not laws. PostgreSQL stores JSON documents; several NoSQL stores now offer multi-record transactions; distributed SQL databases scale writes while keeping joins, at a cost in latency.",
      ],
      table: {
        head: ["", "SQL", "NoSQL"],
        rows: [
          ["Shape", "fixed tables", "flexible"],
          ["Joins", "yes", "in your code"],
          ["Transactions", "across rows", "usually one record"],
          ["Scaling writes", "hard", "built in"],
        ],
      },
      scene: polyglot,
    },
    {
      kind: "solution",
      short: "Mix",
      title: "Use each where it fits",
      body: [
        "Real systems mix them, which is called **polyglot persistence**. AlgoVerse keeps XP, badges and payments relational for transactions, lesson content as documents, and sessions in a key–value store.",
        "Start with one database, and add another only when a kind of data clearly wants it.",
      ],
      callout: {
        kind: "key",
        text: "Ask what the data needs: relations, flexible shapes, or raw lookup speed.",
      },
      scene: polyglot,
    },
    {
      kind: "case",
      short: "Search",
      title: 'Case: "binary tree rotation"',
      body: [
        "Learners type free text into a search box. In SQL that becomes `WHERE text LIKE '%rotation%'` over every lesson: slow, no ranking, no typo tolerance.",
        "A **search engine** (Elasticsearch, OpenSearch) builds an **inverted index**: for every word, the list of lessons that contain it. It is fed from the main databases by a stream of changes.",
      ],
      callout: {
        kind: "good",
        text: "The search index is a copy, not the source of truth. It can always be rebuilt.",
      },
      scene: {
        nodes: [appS, sql, docs, kv, search],
        links: [
          both("app", "sql", 1),
          both("app", "docs", 1),
          both("app", "kv", 1),
          both("app", "search", 2),
          link("docs", "search", "copy"),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "SQL: tables, joins and transactions, a safe default.",
        "Documents: flexible, self-contained records that scale out.",
        "Key–value: the fastest and simplest, lookups by id only.",
        "Choose per kind of data; specialists like search are copies fed from the source of truth.",
      ],
      scene: polyglot,
    },
  ],
};

/* --------------------------------------- Indexes --------------------------------------- */

const login = node("login", "server", "Login service", -3, 0);
const table = node("table", "db", "learners table", 2.8, 0.4, { sub: "40M rows", size: 1.3 });
const root = node("root", "search", "Root", -0.6, 0, { size: 0.7, sub: "a … z" });
const br1 = node("br1", "search", "a–m", 0.6, -1.3, { size: 0.6 });
const br2 = node("br2", "search", "n–z", 0.6, 1.3, { size: 0.6 });
const leaf = node("leaf", "search", "priya@…", 1.7, 1.4, { size: 0.55 });
const btree: Scene = {
  nodes: [login, root, br1, br2, leaf, table],
  links: [
    link("login", "root", "request"),
    link("root", "br1", { dashed: true }),
    link("root", "br2", "request"),
    link("br2", "leaf", "request"),
    link("leaf", "table", "request", { kind: "response", back: true }),
  ],
};

export const INDEXES: Lesson = {
  id: "indexes",
  title: "Indexes",
  tagline: "Why the same query can take two seconds or two milliseconds.",
  minutes: 12,
  level: "beginner",
  learn: [
    "What a full table scan costs",
    "How a B-tree index finds a row in a few reads",
    "Why every index slows writes down",
    "Composite indexes and column order",
    "When an index can't help, and how to check",
  ],
  builtOn: [
    { label: "Binary search", path: "/algorithms/binary-search" },
    { label: "Binary search tree", path: "/structures/binary-search-tree" },
    { label: "AVL tree", path: "/structures/avl-tree" },
  ],
  steps: [
    {
      kind: "problem",
      short: "Slow login",
      title: "Finding one learner takes two seconds",
      body: [
        "Signing in looks up a learner by email. With 40 million learners it takes almost two seconds, and it gets slower every week.",
        "With nothing to guide it, the database does a **full table scan**: it reads every page of the table and checks every row.",
      ],
      callout: {
        kind: "watch",
        text: "Scans grow with the table: fine at a thousand rows, painful at forty million.",
      },
      metrics: [
        { label: "Rows read", value: "40,000,000", tone: "bad" },
        { label: "Login query", value: "1.9 s", tone: "bad" },
      ],
      scene: {
        nodes: [login, { ...table, state: "hot", queue: 8 }],
        links: [
          link(
            "login",
            "table",
            { kind: "request", rate: 1, speed: 3 },
            { kind: "response", back: true, rate: 1, speed: 3 },
          ),
        ],
      },
    },
    {
      kind: "insight",
      short: "Dictionary",
      title: "How a dictionary does it",
      body: [
        "Nobody reads a dictionary page by page. Because it is sorted, you open the middle, see whether your word comes before or after, and throw away half. Repeat.",
        "Halving 40 million entries takes only about 25 steps. That is binary search.",
      ],
      callout: {
        kind: "key",
        text: "An index is a sorted copy of one column, with a pointer back to each full row.",
      },
      metrics: [{ label: "log₂(40M)", value: "≈ 25 steps", tone: "good" }],
      scene: {
        nodes: [login, table],
        notes: [{ x: 0, y: 0, text: "25 halvings, not 40 million rows", tone: "good" }],
      },
    },
    {
      kind: "solution",
      short: "B-tree",
      title: "Add an index",
      body: [
        "`CREATE INDEX ON learners (email)` builds a **B-tree**: a shallow tree of sorted keys. The root says which branch holds the email, the branch says which leaf, and the leaf points at the row.",
        "A few page reads instead of forty million rows: the lookup drops to about 2 ms.",
      ],
      changes: [
        { op: "+", text: "B-tree index on email" },
        { op: "~", text: "Login query 1.9 s → 2 ms" },
      ],
      metrics: [
        { label: "Pages read", value: "4", tone: "good" },
        { label: "Login query", value: "2 ms", tone: "good" },
      ],
      scene: btree,
    },
    {
      kind: "technique",
      short: "Shallow",
      title: "Why B-trees stay shallow",
      body: [
        "Each tree node is one disk page holding hundreds of keys, so every level multiplies the reach by hundreds. With 300 keys per page, three levels reach 27 million rows and four levels reach 8 billion.",
        "The top levels are used so often that they stay in memory.",
      ],
      quiz: {
        question:
          "With about 300 keys per page, how many levels does an index over 40 million rows need?",
        options: ["2", "4", "25"],
        answer: 1,
        why: "300² = 90,000 and 300³ = 27 million are too few, 300⁴ = 8.1 billion is enough: 4 levels. That is why an indexed lookup costs about the same at a million rows as at a billion.",
      },
      scene: btree,
    },
    {
      kind: "tradeoff",
      short: "Write cost",
      title: "Every index makes writes slower",
      body: [
        "When a learner signs up, the row goes into the table **and** into every index on it, keeping each one sorted.",
        "Indexes also take disk space and memory. Index what you query, not everything.",
      ],
      callout: {
        kind: "watch",
        text: "A table with 5 indexes does 6 writes per insert. Unused indexes are pure cost.",
      },
      metrics: [
        { label: "Indexes", value: "5" },
        { label: "Writes per insert", value: "6", tone: "bad" },
      ],
      scene: patch(btree, {
        links: [
          link("login", "root", "write"),
          link("root", "br2", "write"),
          link("br2", "leaf", "write"),
          link("login", "table", "write"),
        ],
      }),
    },
    {
      kind: "technique",
      short: "Composite",
      title: "Composite indexes: order matters",
      body: [
        "An index can cover several columns, like `(country, city)`. It is sorted by country first, then by city within each country, like a phone book sorted by surname, then first name.",
        "It speeds up queries on country, or country + city. A query on city alone can't use it.",
      ],
      quiz: {
        question: "Index on (country, city). Which query can use it?",
        options: ["WHERE city = 'Pune'", "WHERE country = 'IN' AND city = 'Pune'", "Neither"],
        answer: 1,
        why: "Indexes help from the left. Without the country, the cities are scattered across the whole index.",
      },
      scene: btree,
    },
    {
      kind: "case",
      short: "Can't help",
      title: "Case: queries an index can't help",
      body: [
        "Marketing wants every Gmail learner: `WHERE email LIKE '%@gmail.com'`. The index is sorted by the start of each email, and this pattern says nothing about the start: a full scan again.",
        "The same happens with `WHERE LOWER(email) = …` and with filters that match a huge share of rows, such as `country = 'IN'` for 45% of learners, where reading the table directly is faster.",
      ],
      callout: {
        kind: "good",
        text: "Fixes: an index on the expression LOWER(email), a stored domain column with its own index, or a search engine for free text.",
      },
      scene: {
        nodes: [login, { ...table, state: "hot", queue: 8 }, root, br1, br2],
        links: [
          link("login", "table", { kind: "request", rate: 1, speed: 3 }),
          link("root", "br1", { dashed: true }),
          link("root", "br2", { dashed: true }),
        ],
        notes: [{ x: -0.6, y: 1.6, text: "index skipped", tone: "bad" }],
      },
    },
    {
      kind: "technique",
      short: "EXPLAIN",
      title: "Ask the database: EXPLAIN",
      body: [
        "Don't guess. Put `EXPLAIN` in front of a query and the database shows its plan: which index it will use and how many rows it expects to read. `EXPLAIN ANALYZE` runs it and reports real timings.",
        '"Index Scan" on a few rows is good news; "Seq Scan" on a big table is the red flag. The slow-query log lists the queries actually costing you time.',
      ],
      code: [
        "EXPLAIN SELECT * FROM learners WHERE email = 'priya@…';",
        "→ Index Scan using learners_email_idx (rows=1)",
      ],
      scene: btree,
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Without an index, a lookup scans every row.",
        "A B-tree index finds any row in a handful of page reads.",
        "Every index adds work to every write: index what you query.",
        "Composite indexes work from the leftmost column.",
        "Leading wildcards, functions and unselective filters defeat indexes; check with EXPLAIN.",
      ],
      scene: btree,
    },
  ],
};

/* ------------------------------------ Storage engines ------------------------------------ */

const writer = node("writer", "server", "XP service", -3, 0);
const mem = node("mem", "cache", "Memory", 0, -1.4, { sub: "fast, forgets" });
const disk = node("disk", "storage", "Disk", 0, 1.6, { sub: "slow, survives" });
const wal = node("wal", "stream", "Write-ahead log", 2.6, 1.6, { sub: "append only" });
const memtable = node("memtable", "cache", "Memtable", 0, -1.4, { sub: "sorted, in memory" });
const sst = (i: number) =>
  node(`sst${i}`, "storage", `SSTable ${i}`, 3, -2 + i * 1.3, { size: 0.75 });

export const STORAGE_ENGINES: Lesson = {
  id: "storage-engines",
  title: "Storage engines",
  tagline:
    "What a database actually does with your write, and why some are built for reads and others for writes.",
  minutes: 14,
  level: "intermediate",
  learn: [
    'Why "saved" must survive a power cut',
    "The write-ahead log, and how often to sync it",
    "B-trees: update pages in place",
    "LSM-trees: append, then compact",
    "Row stores for apps, column stores for analytics",
  ],
  builtOn: [
    { label: "Bloom filter", path: "/structures/bloom-filter" },
    { label: "Merge sort", path: "/algorithms/merge-sort" },
    { label: "Binary search tree", path: "/structures/binary-search-tree" },
  ],
  steps: [
    {
      kind: "setup",
      short: "Two places",
      title: "Memory and disk",
      body: [
        "A database has two places for data. **Memory** is fast, but everything in it vanishes when the process stops. **Disk** survives a crash or a power cut, but forcing a write all the way to the device (an `fsync`) is thousands of times slower.",
        "A **storage engine** decides what goes where, and when.",
      ],
      callout: {
        kind: "key",
        text: "Tables are stored as fixed-size pages (often 8 KB). The engine keeps recently used pages in memory.",
      },
      scene: {
        nodes: [writer, mem, disk],
        links: [both("writer", "mem", 2), link("mem", "disk", "write")],
      },
    },
    {
      kind: "problem",
      short: "Power cut",
      title: "Fast and wrong",
      body: [
        'The simplest engine changes the page in memory, replies "saved", and copies changed pages to disk every few seconds. Writes are blazing fast.',
        "Then the power fails. Everything since the last copy is gone, including XP that learners were told they had earned. A page that was half-written is now garbage: a **torn page**.",
      ],
      callout: {
        kind: "watch",
        text: '"Saved" has to mean "survives a crash". That is the D in ACID.',
      },
      scene: {
        nodes: [writer, { ...mem, state: "down", badge: "power cut" }, disk],
        links: [link("writer", "mem", "fail")],
      },
    },
    {
      kind: "solution",
      short: "WAL",
      title: "Write it down first: the write-ahead log",
      body: [
        "Instead of rewriting a whole 8 KB page for a 100-byte change, describe the change in a few bytes and **append** it to a log file, forcing that to disk before replying. Appending to the end of one file is the fastest thing a disk can do.",
        "The pages are changed in memory and copied out later. After a crash the engine replays the log and rebuilds exactly what it promised.",
      ],
      callout: {
        kind: "key",
        text: "The log is the truth; the pages are a convenient summary of it.",
      },
      scene: {
        nodes: [writer, mem, disk, wal],
        links: [
          link("writer", "wal", "write"),
          link("writer", "mem", "write"),
          link("mem", "disk", { kind: "write", rate: 1 }),
        ],
      },
    },
    {
      kind: "tradeoff",
      short: "Sync dial",
      title: 'How sure is "saved"?',
      body: [
        "Forcing the log to disk takes a fraction of a millisecond on an SSD. At thousands of commits a second that one step becomes the limit.",
        '**Group commit** lets transactions arriving together share one fsync. Beyond that there is a dial: sync every 100 ms or every second for far more throughput, accepting that a crash loses the last moments of "saved" writes.',
      ],
      quiz: {
        question: "A database syncs its log once a second. The power fails. What can be lost?",
        options: ["Nothing", "Up to about a second of confirmed writes", "The whole database"],
        answer: 1,
        why: "Writes confirmed since the last sync were only in memory. Know where your database's dial is set.",
      },
      scene: {
        nodes: [writer, mem, disk, wal],
        links: [link("writer", "wal", { kind: "write", rate: 4 }), link("mem", "disk", "write")],
      },
    },
    {
      kind: "insight",
      short: "B-tree",
      title: "The classic engine: pages updated in place",
      body: [
        "That is the design inside PostgreSQL, MySQL's InnoDB and SQL Server. Data lives in pages found through B-trees; to change a row, the engine finds its page and modifies it **in place**, with the log for safety.",
        "Reads are excellent and predictable: any row is a few page reads away, and neighbouring keys sit on neighbouring pages.",
      ],
      scene: {
        nodes: [writer, mem, disk, wal],
        links: [
          both("writer", "mem", 2),
          link("writer", "wal", "write"),
          link("mem", "disk", "write"),
        ],
      },
    },
    {
      kind: "problem",
      short: "Firehose",
      title: "Case: a firehose of small writes",
      body: [
        "AlgoVerse starts recording every keystroke in the code editor for replay: 150,000 tiny writes a second, each for a different key. Every one lands on a different page, and each page must eventually be rewritten whole.",
        "The log keeps up; the scattered page writes don't. This is **write amplification**: 100 bytes stored costs a log record plus an 8 KB page write.",
      ],
      metrics: [
        { label: "Writes", value: "150,000 /s" },
        { label: "Disk busy", value: "100%", tone: "bad" },
      ],
      scene: {
        nodes: [writer, mem, { ...disk, state: "hot", queue: 8 }, wal],
        links: [
          link("writer", "mem", { kind: "write", rate: 4 }),
          link("writer", "wal", { kind: "write", rate: 4 }),
          link("mem", "disk", { kind: "heavy", rate: 3 }),
        ],
      },
    },
    {
      kind: "solution",
      short: "LSM-tree",
      title: "Never update in place: the LSM-tree",
      body: [
        "A different design drops the idea that each row has one home. A write goes to the log and into a sorted structure in memory, the **memtable**. That is all.",
        "When the memtable fills, it is written to disk in one go as an immutable, sorted **SSTable**. Every disk write is sequential. This is the **log-structured merge tree**, inside Cassandra, RocksDB and ScyllaDB.",
      ],
      callout: {
        kind: "good",
        text: "An update is just a newer entry for the same key; a delete is a marker called a tombstone.",
      },
      scene: {
        nodes: [writer, memtable, wal, sst(0), sst(1), sst(2)],
        links: [
          link("writer", "memtable", { kind: "write", rate: 4 }),
          link("writer", "wal", { kind: "write", rate: 3 }),
          link("memtable", "sst2", "heavy"),
        ],
      },
    },
    {
      kind: "technique",
      short: "Compaction",
      title: "Reads and compaction",
      body: [
        'Reading is now the hard part: the newest value may be in the memtable or in any SSTable. Each SSTable carries a **Bloom filter** that says "definitely not here" without touching the disk, so a lookup usually reads one file.',
        "In the background, **compaction** merge-sorts a few SSTables into one, keeping only the newest value of each key and dropping tombstones.",
      ],
      callout: {
        kind: "watch",
        text: "If writes outrun compaction, files pile up, reads slow down and the disk fills. Watch the compaction backlog.",
      },
      scene: {
        nodes: [
          writer,
          memtable,
          sst(0),
          sst(1),
          sst(2),
          node("merged", "storage", "Merged", 5.4, -0.7, { size: 0.9, state: "lit" }),
        ],
        links: [
          both("writer", "memtable", 2),
          link("sst0", "merged", "copy"),
          link("sst1", "merged", "copy"),
          link("sst2", "merged", "copy"),
        ],
      },
    },
    {
      kind: "insight",
      short: "Columns",
      title: "Case: rows or columns?",
      body: [
        "Both engines keep each row together, ideal for fetching whole records. But `SELECT AVG(score) FROM attempts` over two billion rows must read all 30 columns of every row to use one.",
        "A **column store** keeps each column in its own file. The query reads only `score`, about a thirtieth of the data, and similar values side by side compress very well. That is how analytics warehouses scan billions of rows in seconds.",
      ],
      table: {
        head: ["", "B-tree", "LSM-tree"],
        rows: [
          ["Writes", "scattered page updates", "sequential appends"],
          ["Reads", "a few pages, predictable", "several files, filters help"],
          ["Background work", "checkpoints", "compaction"],
          ["Found in", "PostgreSQL, MySQL", "Cassandra, RocksDB"],
        ],
      },
      scene: {
        nodes: [writer, memtable, sst(0), sst(1), sst(2)],
        links: [both("writer", "memtable", 2)],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        'The write-ahead log makes "saved" true: append, fsync, then reply.',
        "How often you fsync is a durability dial.",
        "B-trees update pages in place: predictable reads, scattered writes.",
        "LSM-trees only append: fast writes, paid for with compaction.",
        "Column stores serve analytics by reading only the columns a query needs.",
      ],
      scene: {
        nodes: [writer, mem, disk, wal],
        links: [
          link("writer", "wal", "write"),
          link("writer", "mem", "write"),
          link("mem", "disk", "write"),
        ],
      },
    },
  ],
};

/* -------------------------------------- Replication -------------------------------------- */

const appR = node("appR", "server", "App servers", -3, 0);
const leader = node("leader", "db", "Leader", 0.4, -1.4, { sub: "takes writes" });
const f1 = node("f1", "db", "Follower 1", 3, 0, { hue: "teal" });
const f2 = node("f2", "db", "Follower 2", 0.4, 1.8, { hue: "teal" });
const replicated: Scene = {
  nodes: [appR, leader, f1, f2],
  links: [
    link("appR", "leader", "write", { kind: "response", back: true, rate: 1 }),
    link("leader", "f1", "copy"),
    link("leader", "f2", "copy"),
    both("appR", "f2", 2),
  ],
};

export const REPLICATION: Lesson = {
  id: "replication",
  title: "Replication",
  tagline: "Keep copies of the database on several machines, for more reads and for survival.",
  minutes: 12,
  level: "beginner",
  learn: [
    "Leaders, followers and the replication log",
    "Scaling reads with followers",
    "Replication lag, and reading your own writes",
    "Failover when the leader dies",
    "Why replicas are not backups",
  ],
  steps: [
    {
      kind: "problem",
      short: "One DB",
      title: "One database doing everything",
      body: [
        "Every read and every write goes to one database server. It is 88% busy, mostly with reads: lesson pages, profiles, leaderboards.",
        "It is also a single point of failure: if it dies, AlgoVerse dies.",
      ],
      callout: {
        kind: "key",
        text: "Most apps read far more than they write: often 10 to 100 reads per write.",
      },
      metrics: [
        { label: "DB busy", value: "88%", tone: "bad" },
        { label: "Reads : writes", value: "40 : 1" },
      ],
      scene: {
        nodes: [appR, { ...leader, label: "Database", sub: "", state: "hot" }],
        links: [both("appR", "leader", 4)],
      },
    },
    {
      kind: "solution",
      short: "Followers",
      title: "Keep copies: a leader and followers",
      body: [
        "Add two **followers** (replicas). The **leader** still takes every write and streams each change to the followers through a **replication log**.",
        "Each follower replays the changes in order and ends up with the same data.",
      ],
      callout: {
        kind: "good",
        text: "Built into PostgreSQL, MySQL, MongoDB and most other databases.",
      },
      scene: {
        nodes: [appR, leader, f1, f2],
        links: [
          both("appR", "leader", 3),
          link("leader", "f1", "copy"),
          link("leader", "f2", "copy"),
        ],
      },
    },
    {
      kind: "solution",
      short: "Read scaling",
      title: "Send reads to the followers",
      body: [
        "Now the app sends reads to followers and only writes to the leader. Two machines do nothing but reads, and the leader cools down.",
        "Need more reads? Add another follower. This doesn't help write-heavy apps: every write still goes through one leader.",
      ],
      changes: [
        { op: "~", text: "Reads → followers" },
        { op: "~", text: "Leader busy 88% → 25%" },
      ],
      metrics: [
        { label: "Leader busy", value: "25%", tone: "good" },
        { label: "Read capacity", value: "× 3", tone: "good" },
      ],
      scene: {
        nodes: [appR, leader, f1, f2],
        links: [
          link("appR", "leader", "write"),
          link("leader", "f1", "copy"),
          link("leader", "f2", "copy"),
          both("appR", "f1", 2),
          both("appR", "f2", 2),
        ],
      },
    },
    {
      kind: "problem",
      short: "Lag",
      title: "Copies lag behind",
      body: [
        "Replication is usually **asynchronous**: the leader confirms a write at once and ships it to followers a moment later.",
        "Priya changes her display name and reloads her profile. The read lands on a follower that hasn't caught up, she sees her old name, and thinks the save failed.",
      ],
      callout: {
        kind: "watch",
        text: "Lag is normally milliseconds, but under load it can grow to seconds or minutes.",
      },
      metrics: [{ label: "Follower 2 lag", value: "2.4 s", tone: "bad" }],
      scene: patch(replicated, {
        nodes: { f2: { badge: "old name", state: "hot" }, leader: { badge: "new name" } },
      }),
    },
    {
      kind: "technique",
      short: "Your writes",
      title: "Read your own writes",
      body: [
        "A common fix: for a few seconds after someone writes, send **their** reads to the leader. Everyone else keeps reading from followers.",
        'Or make replication **synchronous**: the leader waits for a follower to confirm before saying "saved". No lag, but slower writes, which stall if that follower is down.',
      ],
      quiz: {
        question:
          "Why do many teams keep exactly one follower synchronous and the rest asynchronous?",
        options: [
          "To make every read faster",
          "So a confirmed write always exists on two machines, while most followers stay fast",
          "Because databases allow only one synchronous follower",
        ],
        answer: 1,
        why: "One synchronous copy protects against losing confirmed writes; the asynchronous ones keep writes from waiting on every replica.",
      },
      scene: {
        nodes: [appR, leader, f1, f2],
        links: [
          both("appR", "leader", 2),
          link("leader", "f1", "copy"),
          link("leader", "f2", "copy"),
          both("appR", "f1", 2),
        ],
      },
    },
    {
      kind: "problem",
      short: "Leader dies",
      title: "The leader dies",
      body: [
        "The leader crashes. Reads keep working, because the followers still have the data, but every write fails: nobody can sign up, submit code or earn XP.",
      ],
      metrics: [
        { label: "Reads", value: "OK", tone: "good" },
        { label: "Writes", value: "failing", tone: "bad" },
      ],
      scene: {
        nodes: [appR, { ...leader, state: "down" }, f1, f2],
        links: [
          link("appR", "leader", "fail", { cut: true }),
          both("appR", "f1", 2),
          both("appR", "f2", 2),
        ],
      },
    },
    {
      kind: "solution",
      short: "Failover",
      title: "Failover: promote a follower",
      body: [
        "The most up-to-date follower is **promoted** to leader, the app sends writes there, and the other follower replicates from it. Writes resume within seconds to a minute.",
        "The hard part is being sure the old leader is really dead. If it was only cut off, you could end up with two leaders both accepting writes: **split brain**. Doing this safely needs a majority vote (see Consensus).",
      ],
      scene: {
        nodes: [
          appR,
          { ...leader, state: "down", sub: "old leader" },
          { ...f1, label: "New leader", state: "lit", hue: "green" },
          f2,
        ],
        links: [
          link("appR", "f1", "write", { kind: "response", back: true, rate: 1 }),
          link("f1", "f2", "copy"),
          both("appR", "f2", 2),
        ],
      },
    },
    {
      kind: "case",
      short: "Bad write",
      title: "Case: the update with no WHERE",
      body: [
        "A migration runs `UPDATE learners SET xp = 0` with a missing `WHERE`. The leader obeys, and replication faithfully copies the mistake to every follower within a second.",
        "Replicas protect you from a machine failing, not from a bad write. For that you need **backups**: nightly snapshots plus the archived log, which together can rebuild the database as it was at any moment (**point-in-time recovery**).",
      ],
      callout: {
        kind: "watch",
        text: "A backup you have never restored is a hope, not a backup. Rehearse restores.",
      },
      scene: patch(replicated, {
        nodes: {
          leader: { badge: "xp = 0", state: "hot" },
          f1: { badge: "xp = 0", state: "hot" },
          f2: { badge: "xp = 0", state: "hot" },
        },
      }),
    },
    {
      kind: "insight",
      short: "Three ways",
      title: "Three ways to replicate",
      body: [
        "Everything so far was **single-leader**: one writer, many readers. It is simple, and what most SQL databases do.",
        "**Multi-leader** puts a leader in each region so writes stay local, at the cost of conflicts when two regions edit the same row. **Leaderless** systems (Cassandra, Riak) write to several copies at once and read from several, using quorums (see CAP).",
      ],
      callout: {
        kind: "key",
        text: "Prefer single-leader until you have a concrete reason to handle conflicts.",
      },
      scene: replicated,
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A leader takes writes and streams them to followers.",
        "Followers scale reads and survive losing a machine.",
        "Asynchronous followers lag: route a user's reads to the leader right after they write.",
        "When the leader dies, fail over to a follower, carefully.",
        "Replicas are not backups: keep snapshots and rehearse restoring them.",
      ],
      scene: replicated,
    },
  ],
};
