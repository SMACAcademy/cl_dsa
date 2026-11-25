import { link, node, patch, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* --------------------------------------- Sharding --------------------------------------- */

const router = node("router", "gateway", "Shard router", -0.5, 0);
const appD = node("appD", "server", "App servers", -3.2, 0);
const shard = (i: number, sub: string, extra: Partial<SceneNode> = {}) =>
  node(`sh${i}`, "db", `Shard ${String.fromCharCode(65 + i)}`, 2.6, -2.4 + i * 1.6, {
    sub,
    ...extra,
  });
const shards4 = (subs: readonly string[], extra: Record<number, Partial<SceneNode>> = {}) =>
  subs.map((s, i) => shard(i, s, extra[i] ?? {}));
const sharded = (nodes: SceneNode[], rates: readonly number[] = [1, 1, 1, 1]): Scene => ({
  nodes: [appD, router, ...nodes],
  links: [
    both("appD", "router", 3),
    ...nodes.map((n, i) => link("router", n.id, { kind: "write", rate: rates[i] ?? 1 })),
  ],
});
const RANGES = ["ids 1–10M", "ids 10–20M", "ids 20–30M", "ids 30M+"];
const HASHED = ["hash % 4 = 0", "hash % 4 = 1", "hash % 4 = 2", "hash % 4 = 3"];

export const SHARDING: Lesson = {
  id: "sharding",
  title: "Sharding",
  tagline: "When the data or the writes outgrow one machine, split them across many.",
  minutes: 11,
  level: "intermediate",
  learn: [
    "Why replication can't scale writes",
    "Shard keys: ranges versus hashes",
    "Hot spots and the celebrity key",
    "Queries that must ask every shard",
    "Why hash % N makes adding shards painful",
  ],
  builtOn: [{ label: "Hash table", path: "/structures/hash-table" }],
  steps: [
    {
      kind: "problem",
      short: "Too big",
      title: "Too big for one machine",
      body: [
        "The `attempts` table holds every quiz answer and code run: 30 TB, growing by 50,000 writes a second. Followers would help with reads, but every write still goes through one leader, and all the data must fit on its disks.",
        "It already runs on the biggest machine, and every backup or new replica takes most of a day to copy.",
      ],
      callout: {
        kind: "watch",
        text: "Replication copies all the data everywhere. To scale writes and storage, the data itself must be split.",
      },
      metrics: [
        { label: "Size", value: "30 TB", tone: "bad" },
        { label: "Writes", value: "50,000 /s", tone: "bad" },
      ],
      scene: {
        nodes: [appD, node("big", "db", "attempts", 2, 0, { size: 1.6, state: "hot", queue: 8 })],
        links: [link("appD", "big", { kind: "write", rate: 4 })],
      },
    },
    {
      kind: "solution",
      short: "Split",
      title: "Split the data: sharding",
      body: [
        "**Sharding** splits one big database into several smaller ones, called shards. Each holds part of the data and takes part of the writes. A **shard key** decides where each row lives; here, the learner id, in ranges.",
        "The app (or a router) looks up the range and sends each query to the right shard.",
      ],
      callout: {
        kind: "good",
        text: "Each shard is usually replicated too: shards scale writes, followers inside each shard scale reads.",
      },
      scene: sharded(shards4(RANGES)),
    },
    {
      kind: "problem",
      short: "Hot range",
      title: "Ranges create hot spots",
      body: [
        "Learner ids grow over time, so every new sign-up lands in the last range, and new learners are also the most active. Shard D takes most of the writes while A sits idle.",
        "Dates and alphabetical names do the same: data that arrives in order piles onto one shard.",
      ],
      metrics: [
        { label: "Shard A", value: "4% of writes" },
        { label: "Shard D", value: "71% of writes", tone: "bad" },
      ],
      scene: sharded(
        shards4(RANGES, { 0: { state: "dim" }, 3: { state: "hot", queue: 6 } }),
        [1, 1, 1, 4],
      ),
    },
    {
      kind: "solution",
      short: "Hash it",
      title: "Hash the key",
      body: [
        "Instead of ranges, run the key through a hash function and take the remainder: `shard = hash(learner_id) % 4`. Consecutive ids scatter to unrelated shards, so new learners spread evenly.",
        'The price: range queries such as "learners 1 to 1,000" now touch every shard. Usually a fine trade.',
      ],
      quiz: {
        question:
          "hash(id) gives 4,215 for one learner. With 4 shards, which shard (0–3) holds their rows?",
        options: ["0", "3", "1"],
        answer: 1,
        why: "4,215 % 4 = 3 (4,212 is divisible by 4, remainder 3).",
      },
      scene: sharded(shards4(HASHED), [2, 2, 2, 2]),
    },
    {
      kind: "case",
      short: "Celebrity",
      title: "Case: the celebrity course",
      body: [
        'A famous instructor publishes a course on AlgoVerse and a million learners enrol in a day. Hashing spreads keys evenly, not traffic: every view and every "like" of that course hits the one shard holding its key.',
        "For read-hot keys, put a cache (or several replicas) in front. For write-hot keys such as the like counter, split it: write to `likes:course42#0` … `#7` at random, and add them up when reading.",
      ],
      callout: {
        kind: "watch",
        text: "No shard key fixes a single key that is more popular than one machine can handle.",
      },
      scene: sharded(
        shards4(HASHED, { 2: { state: "hot", queue: 8, badge: "course 42" } }),
        [1, 1, 4, 1],
      ),
    },
    {
      kind: "tradeoff",
      short: "Every shard",
      title: "Queries that span every shard",
      body: [
        'Looking up one learner is fast: hash the id, ask one shard. But "top 10 learners by XP this week" isn\'t keyed by learner, so the router must ask every shard and merge the answers.',
        "These **scatter–gather** queries are as slow as the slowest shard, and joins across shards are hard.",
      ],
      callout: {
        kind: "key",
        text: "Pick a shard key that matches your most important queries, so they touch only one shard.",
      },
      scene: {
        nodes: [appD, router, ...shards4(HASHED)],
        links: [both("appD", "router", 1), ...shards4(HASHED).map((n) => both("router", n.id, 1))],
      },
    },
    {
      kind: "problem",
      short: "Add a shard",
      title: "Adding a shard moves almost everything",
      body: [
        "The shards fill up, so you add a fifth. But `hash % 4` becomes `hash % 5`, and for about 80% of learners the remainder changes. Terabytes must move between shards while the site keeps running.",
      ],
      quiz: {
        question: "Going from hash % 4 to hash % 5, roughly what share of keys change shard?",
        options: ["About 20%", "About 50%", "About 80%"],
        answer: 2,
        why: "A key stays only when hash % 4 equals hash % 5, which happens for about 1 key in 5. The next lesson fixes exactly this.",
      },
      scene: {
        nodes: [
          appD,
          router,
          ...shards4(HASHED),
          node("sh4", "db", "Shard E", 5, 0, { sub: "new", state: "lit" }),
        ],
        links: [
          both("appD", "router", 1),
          ...shards4(HASHED).map((n) => link(n.id, "sh4", { kind: "copy", rate: 2 })),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Sharding splits data and writes across machines.",
        "The shard key decides where rows live; it must spread the load.",
        "Ranges make hot spots; hashes spread load but scatter range queries.",
        "A single hot key needs caching or splitting.",
        "Queries off the shard key hit every shard; resharding with % N moves most data.",
      ],
      scene: sharded(shards4(HASHED), [2, 2, 2, 2]),
    },
  ],
};

/* ---------------------------------- Consistent hashing ---------------------------------- */

const R = 2.6;
const at = (deg: number, r = R) => ({
  x: +(r * Math.cos((deg * Math.PI) / 180)).toFixed(2),
  y: +(r * Math.sin((deg * Math.PI) / 180)).toFixed(2),
});
const srv = (id: string, deg: number, extra: Partial<SceneNode> = {}) => {
  const p = at(deg);
  return node(id, "server", `Server ${id.toUpperCase()}`, p.x, p.y, { sub: `${deg}°`, ...extra });
};
type Placed = { id: string; deg: number; node: SceneNode };
type Key = { name: string; deg: number };
const place = (id: string, deg: number, extra: Partial<SceneNode> = {}): Placed => ({
  id,
  deg,
  node: srv(id, deg, extra),
});
const keyNode = (k: Key) => {
  const p = at(k.deg, R - 1.15);
  return node(`k-${k.name}`, "lock", k.name, p.x, p.y, { size: 0.45, hue: "slate" });
};
const ringLinks = (servers: readonly SceneNode[]) =>
  servers.map((s, i) =>
    link(s.id, (servers[(i + 1) % servers.length] as SceneNode).id, { dashed: true }),
  );
const KEYS: Key[] = [
  { name: "k1", deg: 60 },
  { name: "k2", deg: 150 },
  { name: "k3", deg: 175 },
  { name: "k4", deg: 250 },
  { name: "k5", deg: 330 },
];
const ownerOf = (deg: number, sorted: readonly Placed[]) =>
  (sorted.find((s) => s.deg >= deg) ?? sorted[0])?.id ?? "";
const ringScene = (servers: readonly Placed[], keys: readonly Key[] = KEYS): Scene => {
  const sorted = [...servers].sort((p, q) => p.deg - q.deg);
  return {
    nodes: [...sorted.map((s) => s.node), ...keys.map(keyNode)],
    links: [
      ...ringLinks(sorted.map((s) => s.node)),
      ...keys.map((k) => link(`k-${k.name}`, ownerOf(k.deg, sorted), { kind: "request", rate: 1 })),
    ],
  };
};
const [PA, PB, PC, PD] = [
  place("a", 20),
  place("b", 110),
  place("c", 200),
  place("d", 290),
] as const;
const FOUR: Placed[] = [PA, PB, PC, PD];
const RING = FOUR.map((p) => p.node);

export const CONSISTENT_HASHING: Lesson = {
  id: "consistent-hashing",
  title: "Consistent hashing",
  tagline: "Add or remove servers and move only a sliver of the data.",
  minutes: 10,
  level: "intermediate",
  learn: [
    "Why hash % N breaks when N changes",
    "Servers and keys on a hash ring",
    "Adding or removing a server moves one arc",
    "Virtual nodes even out the load",
    "Replicas on the next servers clockwise",
  ],
  builtOn: [
    { label: "Binary search", path: "/algorithms/binary-search" },
    { label: "Hash table", path: "/structures/hash-table" },
  ],
  steps: [
    {
      kind: "problem",
      short: "% N breaks",
      title: "hash % N breaks when N changes",
      body: [
        "The last lesson ended badly: with `shard = hash(key) % N`, going from 4 to 5 servers moves about 80% of the keys.",
        "We want a scheme where adding a server moves only the keys that server should take over: about 1/N of them.",
      ],
      callout: { kind: "key", text: "The trick is to stop tying placement to N at all." },
      scene: { nodes: RING },
    },
    {
      kind: "technique",
      short: "The ring",
      title: "Bend the hash space into a ring",
      body: [
        "Hash values run from 0 to 2³²−1. Join the ends and you get a **ring**, drawn here in degrees. Hash each server's name too, and place it on the ring at that point.",
        "Servers land wherever their hashes put them, not evenly spaced.",
      ],
      scene: { nodes: RING, links: ringLinks(RING) },
    },
    {
      kind: "technique",
      short: "Clockwise",
      title: "Each key belongs to the next server clockwise",
      body: [
        "Hash each key onto the same ring. A key belongs to the **first server clockwise** from it. k1 at 60° walks to B at 110°; k5 at 330° wraps past 360° to A at 20°.",
        "Clients keep the servers' positions in a sorted list and find the owner with a binary search.",
      ],
      quiz: {
        question: "A key hashes to 205°. Servers are at 20°, 110°, 200° and 290°. Who owns it?",
        options: ["Server C (200°)", "Server D (290°)", "Server A (20°)"],
        answer: 1,
        why: "Walk clockwise from 205°: the first server reached is D at 290°.",
      },
      scene: ringScene(FOUR),
    },
    {
      kind: "solution",
      short: "Add one",
      title: "Adding a server moves one arc",
      body: [
        "Server E joins at 160°, between B and C. It takes over only the keys in the arc just before it (k2 at 150°), which used to walk on to C. Every other key stays exactly where it was.",
        "Adding a fifth server moves about a fifth of the keys: the minimum possible.",
      ],
      changes: [
        { op: "+", text: "Server E at 160°" },
        { op: "~", text: "k2 moves C → E; nothing else moves" },
      ],
      scene: ringScene([...FOUR, place("e", 160, { state: "lit" })]),
    },
    {
      kind: "technique",
      short: "Remove one",
      title: "Removing a server moves one arc too",
      body: [
        "Back to four servers, and now C dies. Its keys (k2 and k3) simply continue clockwise to D. No other key is affected.",
        "Compare that with % N, where losing one server reshuffles almost everything.",
      ],
      callout: {
        kind: "good",
        text: "Amazon's Dynamo, Cassandra and many caches and CDNs place data this way.",
      },
      scene: ringScene([PA, PB, PD]),
    },
    {
      kind: "problem",
      short: "Uneven",
      title: "Random positions, uneven arcs",
      body: [
        "Servers land wherever their hash puts them, so arcs are uneven. With C gone, D owns a huge stretch of the ring and gets far more keys and traffic than A or B.",
        "With only a few servers, luck alone can leave one doing twice the work of another.",
      ],
      metrics: [
        { label: "Server D share", value: "47%", tone: "bad" },
        { label: "Server A share", value: "22%" },
      ],
      scene: ringScene([PA, PB, { ...PD, node: { ...PD.node, state: "hot" } }]),
    },
    {
      kind: "solution",
      short: "Virtual nodes",
      title: "Virtual nodes even it out",
      body: [
        "Give each server many positions on the ring by hashing `A#1`, `A#2`, …: **virtual nodes**. Each server owns many small arcs instead of one big one.",
        "Shares even out, and when a server leaves, its keys spread across all the others instead of dumping on one neighbour. Stronger servers can get more virtual nodes.",
      ],
      callout: {
        kind: "good",
        text: "Real systems use from 16 to a few hundred virtual nodes per server.",
      },
      metrics: [{ label: "Largest share", value: "27%", tone: "good" }],
      scene: {
        nodes: [
          srv("a", 20),
          srv("b", 110),
          srv("d", 290),
          srv("a2", 160, { label: "A#2", size: 0.7 }),
          srv("b2", 245, { label: "B#2", size: 0.7 }),
          srv("d2", 65, { label: "D#2", size: 0.7 }),
        ],
        links: ringLinks([
          srv("a", 20),
          srv("d2", 65),
          srv("b", 110),
          srv("a2", 160),
          srv("b2", 245),
          srv("d", 290),
        ]),
      },
    },
    {
      kind: "technique",
      short: "Replicas",
      title: "Copies on the next servers clockwise",
      body: [
        "One copy per key isn't enough: a dead server would lose its data. So each key is stored on the next **three** distinct servers clockwise: its owner plus the next two.",
        "If the owner dies, the other two still have the key, and the next server along takes over its share.",
      ],
      scene: {
        nodes: [...RING, keyNode({ name: "k1", deg: 60 })],
        links: [
          ...ringLinks(RING),
          link("k-k1", "b", "write"),
          link("b", "c", "copy"),
          link("c", "d", "copy"),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Put servers and keys on a hash ring; a key belongs to the next server clockwise.",
        "Adding or removing a server moves only one arc, about 1/N of the keys.",
        "Virtual nodes even out shares and spread the load when servers leave.",
        "Store each key on the next few servers clockwise for redundancy.",
      ],
      scene: ringScene(FOUR),
    },
  ],
};

/* ---------------------------------------- Unique IDs ---------------------------------------- */

const writerA = node("wa", "server", "App 1", -2.6, -1.2);
const writerB = node("wb", "server", "App 2", -2.6, 1.2);
const dbA = node("dba", "db", "Shard A", 1.6, -1.2, { sub: "counter" });
const dbB = node("dbb", "db", "Shard B", 1.6, 1.2, { sub: "counter" });
const ticket = node("ticket", "clock", "Ticket server", -0.4, -2.8, { sub: "next = 1005" });

export const UNIQUE_IDS: Lesson = {
  id: "unique-ids",
  title: "Unique IDs at scale",
  tagline:
    "Give every row a name nobody else will ever use, without one counter everyone queues for.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Why a database counter stops being unique when you shard",
    "Ticket servers, and handing out blocks",
    "Random UUIDs, and what they do to an index",
    "Time-ordered ids: UUID v7 and Snowflake",
    "What ids give away, and why they are not access control",
  ],
  builtOn: [{ label: "Binary search tree", path: "/structures/binary-search-tree" }],
  steps: [
    {
      kind: "setup",
      short: "Every row",
      title: "Every row needs a name",
      body: [
        "Every submission needs an id that is unique forever: other tables point at it, URLs contain it, support staff read it out.",
        "With one database this is free: an auto-increment column hands out 1001, 1002, 1003… and never repeats.",
      ],
      callout: {
        kind: "key",
        text: "A counter gives more than uniqueness: small ids, and sorting by id sorts by creation time.",
      },
      scene: {
        nodes: [writerA, { ...dbA, label: "Database", sub: "counter: 1003" }],
        links: [link("wa", "dba", "write")],
      },
    },
    {
      kind: "problem",
      short: "Two counters",
      title: "Two shards, two counters",
      body: [
        "The submissions table gets sharded. Each shard is its own database with its own counter, and both just handed out 1004. Two submissions now share an id.",
        "A link to `/submissions/1004`, a cache entry, a regrade request: each could mean either one.",
      ],
      callout: {
        kind: "watch",
        text: "Uniqueness must hold across the whole system, not just inside one machine.",
      },
      scene: {
        nodes: [
          writerA,
          writerB,
          { ...dbA, badge: "1004" },
          { ...dbB, badge: "1004", state: "hot" },
        ],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
      },
    },
    {
      kind: "solution",
      short: "Ticket server",
      title: "One counter for everyone, in blocks",
      body: [
        "Move the counter into a small **ticket server**. Before each insert, an app asks it for the next number: unique again. But every insert costs an extra round trip, and if it is down nobody can create anything.",
        "So apps reserve a **block** of 1,000 ids at a time and hand them out from memory: one round trip per thousand inserts. Ids then only roughly follow creation time, and a crash leaves gaps.",
      ],
      scene: {
        nodes: [writerA, writerB, dbA, dbB, ticket],
        links: [
          both("wa", "ticket", 1),
          both("wb", "ticket", 1),
          link("wa", "dba", "write"),
          link("wb", "dbb", "write"),
        ],
      },
    },
    {
      kind: "solution",
      short: "UUID v4",
      title: "Pick a number nobody else will",
      body: [
        "Or drop coordination entirely. A **UUID v4** is 122 random bits: any server, phone or script can make one without asking anyone.",
        "Collisions are possible in theory; in practice you would need to make a billion a second for about 85 years to reach a 50% chance of one repeat. The cost is size: 128 bits, copied into every index and foreign key.",
      ],
      code: ["import uuid", "uuid.uuid4()  # 'f47ac10b-58cc-4372-a567-0e02b2c3d479'"],
      scene: {
        nodes: [writerA, writerB, dbA, dbB],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
        notes: [{ x: -1.8, y: 0, text: "no coordination", tone: "good" }],
      },
    },
    {
      kind: "problem",
      short: "Index churn",
      title: "Case: random ids and the index",
      body: [
        "The primary key lives in a B-tree sorted by id. Counter ids always land on the last page, which stays in memory. Random ids land on a random page every time.",
        "Once the index is bigger than memory, most inserts must first read a cold page from disk, and pages split all over the tree. Insert speed can drop several times over.",
      ],
      metrics: [
        { label: "Insert rate", value: "÷ 4", tone: "bad" },
        { label: "Index pages in RAM", value: "12%", tone: "bad" },
      ],
      scene: {
        nodes: [writerA, { ...dbA, state: "hot", queue: 6 }],
        links: [link("wa", "dba", { kind: "write", rate: 4 })],
      },
    },
    {
      kind: "solution",
      short: "Time first",
      title: "Put the time in front",
      body: [
        "Keep the randomness, but lead with a timestamp. **UUID v7** (and its cousin ULID) starts with 48 bits of milliseconds, then random bits. New ids are always larger than old ones, so inserts return to the right-hand edge of the index.",
        "Twitter's **Snowflake** does the same in 64 bits: milliseconds + machine id + a sequence number within the millisecond.",
      ],
      table: {
        head: ["Id", "Size", "Time-sorted", "Needs"],
        rows: [
          ["DB counter", "64 bits", "yes", "one database"],
          ["Ticket blocks", "64 bits", "roughly", "a ticket service"],
          ["UUID v4", "128 bits", "no", "nothing"],
          ["UUID v7", "128 bits", "yes", "a clock"],
          ["Snowflake", "64 bits", "yes", "machine ids + clock"],
        ],
      },
      scene: {
        nodes: [writerA, writerB, dbA, dbB],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
      },
    },
    {
      kind: "case",
      short: "Clock steps",
      title: "Case: the clock steps back",
      body: [
        "Time-based ids are unique only if a machine never reuses a millisecond. But time sync notices App 1 is two seconds fast and sets its clock back. For two seconds it would stamp ids with times it already used.",
        "The guard: remember the last timestamp issued; if the clock now reads earlier, wait until time catches up.",
      ],
      quiz: {
        question: "Why does Snowflake include a machine id?",
        options: [
          "So two machines in the same millisecond can't produce the same id",
          "To make ids shorter",
          "So ids sort by machine",
        ],
        answer: 0,
        why: "Timestamp + sequence is unique on one machine; the machine id keeps different machines apart.",
      },
      scene: {
        nodes: [{ ...writerA, badge: "clock −2 s", state: "hot" }, writerB, dbA, dbB],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
      },
    },
    {
      kind: "tradeoff",
      short: "Leaky ids",
      title: "What an id gives away",
      body: [
        "Ids end up in URLs, and people read them. Sequential ids reveal volume (submission 1,004 on Monday, 9,250 on Tuesday) and are easy to walk: change `/certificates/1004` to `/1005` and see what comes back.",
        "Show a separate random public id if volume is secret. And always check that the caller may see the object (see Authorization): an unguessable id is not a permission.",
      ],
      callout: { kind: "watch", text: "Never treat ids as access control." },
      scene: {
        nodes: [writerA, writerB, dbA, dbB],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A per-database counter stops being unique the moment you shard.",
        "A ticket server restores it; blocks remove the round trip per insert.",
        "UUID v4 needs nobody but scatters inserts; UUID v7 puts time first.",
        "Snowflake: time + machine id + sequence in 64 bits; guard against clocks stepping back.",
        "Ids leak volume and timing; they are never access control.",
      ],
      scene: {
        nodes: [writerA, writerB, dbA, dbB],
        links: [link("wa", "dba", "write"), link("wb", "dbb", "write")],
      },
    },
  ],
};

/* ------------------------------------------ CAP ------------------------------------------ */

const eu = node("eu", "db", "EU copy", -1.4, -1.6, { sub: "Frankfurt" });
const asia = node("asia", "db", "Asia copy", 2.2, 1.4, { sub: "Mumbai" });
const euUser = node("euU", "user", "Lena (Berlin)", -4, -1.6);
const asiaUser = node("asiaU", "user", "Ravi (Pune)", 4.6, 1.4);
const regions = (cut = false, extra: Partial<Record<string, Partial<SceneNode>>> = {}): Scene =>
  patch(
    {
      nodes: [euUser, eu, asia, asiaUser],
      links: [
        both("euU", "eu", 2),
        both("asiaU", "asia", 2),
        cut
          ? link("eu", "asia", { cut: true })
          : link("eu", "asia", "copy", { kind: "copy", back: true }),
      ],
      zones: [
        { label: "Europe", x1: -5, y1: -2.6, x2: -0.4, y2: -0.6, hue: "blue" },
        { label: "Asia", x1: 1.2, y1: 0.4, x2: 5.6, y2: 2.4, hue: "amber" },
      ],
    },
    { nodes: extra as Record<string, Partial<SceneNode>> },
  );

export const CAP: Lesson = {
  id: "cap",
  title: "CAP and consistency",
  tagline:
    "When the network splits, copies of your data must choose between being right and being reachable.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "What a network partition is",
    "Choosing consistency or availability during one",
    "Eventual consistency and resolving conflicts",
    'Why wall clocks can\'t decide "last"',
    "Quorums: tuning the trade-off per request",
  ],
  steps: [
    {
      kind: "setup",
      short: "Two regions",
      title: "Copies in two regions",
      body: [
        "AlgoVerse runs a weekly contest with **one** prize slot left for the finals. The data is copied in Frankfurt and Mumbai so each region's learners get fast answers; every write is replicated to the other side.",
        "Both copies agree: 1 slot left.",
      ],
      callout: {
        kind: "key",
        text: "Copies in many regions buy speed and survival, and open the question this lesson is about.",
      },
      metrics: [{ label: "Slots left", value: "1 (both copies)" }],
      scene: regions(false, { eu: { badge: "slots: 1" }, asia: { badge: "slots: 1" } }),
    },
    {
      kind: "problem",
      short: "Partition",
      title: "The network splits",
      body: [
        "A fault on an undersea cable cuts the link between regions. Both regions are healthy and their learners can reach them, but the regions can't reach each other. This is a **network partition**.",
        'Ravi in Pune clicks "claim the last slot". The Mumbai copy can\'t check with Frankfurt. What should it do?',
      ],
      callout: {
        kind: "watch",
        text: "Partitions aren't rare: cables, routers, misconfiguration and overload all cause them.",
      },
      scene: regions(true, { eu: { badge: "slots: 1" }, asia: { badge: "slots: 1" } }),
    },
    {
      kind: "technique",
      short: "Consistent",
      title: "Option 1: stay consistent",
      body: [
        "Refuse what can't be confirmed. Frankfurt holds the primary copy, so it keeps serving; Mumbai rejects writes (and reads that might be stale) until the link is back.",
        "Nobody ever sees a wrong answer, but Ravi gets an error for as long as the partition lasts.",
      ],
      callout: {
        kind: "good",
        text: "Choose consistency where wrong answers cost money or trust: payments, balances, limited slots.",
      },
      scene: regions(true, { asia: { state: "dim", badge: "read-only" } }),
    },
    {
      kind: "technique",
      short: "Available",
      title: "Option 2: stay available",
      body: [
        'Answer with what you have. Both sides keep accepting writes. Lena in Berlin claims the last slot; Ravi in Pune claims the last slot. Everyone gets a "yes", and the copies now disagree.',
      ],
      callout: {
        kind: "good",
        text: "Choose availability where a brief disagreement is fine: likes, view counts, streaks, feeds.",
      },
      scene: regions(true, { eu: { badge: "slot → Lena" }, asia: { badge: "slot → Ravi" } }),
    },
    {
      kind: "technique",
      short: "Heal",
      title: "Healing: eventual consistency",
      body: [
        "The cable is repaired and the copies exchange what they missed. Left alone they **converge**: eventual consistency. But someone must decide what to do about two winners for one slot.",
        '"Last write wins" is simple and silently drops one claim. Or the app merges: keep both, offer one of them an extra slot, and apologise.',
      ],
      callout: {
        kind: "watch",
        text: '"Last write wins" is the default in many databases. It loses data quietly.',
      },
      scene: regions(false, {
        eu: { badge: "2 claims!", state: "hot" },
        asia: { badge: "2 claims!", state: "hot" },
      }),
    },
    {
      kind: "case",
      short: "Whose clock?",
      title: 'Case: "last" by whose clock?',
      body: [
        "Last write wins needs to know which write was last, and each server stamps writes with its own clock. Clocks drift. Mumbai's clock runs 3 seconds fast.",
        "Ravi updates his email in Mumbai, then corrects it two seconds later through Frankfurt. The correction is newer, but its timestamp is smaller, so the sync keeps the old email and throws the fix away.",
      ],
      callout: {
        kind: "key",
        text: "Systems that must order events use logical clocks or version vectors, not wall-clock time.",
      },
      scene: regions(false, { asia: { badge: "clock +3 s", state: "hot" } }),
    },
    {
      kind: "insight",
      short: "CAP",
      title: "What CAP actually says",
      body: [
        "The **CAP theorem**: when a network **P**artition happens, a replicated system must give up either **C**onsistency (every read sees the latest write) or **A**vailability (every working server answers).",
        'It isn\'t "pick two of three". Partitions will happen; the real choice is what to do when they do.',
      ],
      scene: regions(true),
    },
    {
      kind: "technique",
      short: "Quorums",
      title: "Quorums: tune it per request",
      body: [
        "Many databases let you choose per request. With **N = 3** copies, a write waits for **W** copies to confirm and a read asks **R** copies, using the newest answer.",
        "If **W + R > N**, every read overlaps at least one copy that saw the latest write. W = 2, R = 2 is the classic balance.",
      ],
      quiz: {
        question: "N = 3. Which setting guarantees a read sees the latest confirmed write?",
        options: ["W = 1, R = 1", "W = 2, R = 2", "W = 1, R = 2"],
        answer: 1,
        why: "2 + 2 = 4 > 3, so the read set and the write set must share a copy. With 1 + 1 or 1 + 2 they can miss each other.",
      },
      scene: {
        nodes: [
          node("cl", "server", "App", -3, 0),
          node("r1", "db", "Copy 1", 1, -2, { badge: "v2" }),
          node("r2", "db", "Copy 2", 1.6, 0, { badge: "v2" }),
          node("r3", "db", "Copy 3", 1, 2, { badge: "v1", state: "dim" }),
        ],
        links: [
          link("cl", "r1", "write", "request"),
          link("cl", "r2", "write", "request"),
          link("cl", "r3", { dashed: true }),
        ],
      },
    },
    {
      kind: "insight",
      short: "Spectrum",
      title: "Consistency is a spectrum",
      body: [
        "Between the strongest promise (everyone sees the latest write) and eventual consistency sit useful middle grounds: **read-your-writes** (you always see your own changes), **monotonic reads** (time never goes backwards for you), and **causal** consistency (a reply never appears before the message it answers).",
        "Weaker promises are cheaper and more available. Pick the weakest one your learners won't notice.",
      ],
      scene: regions(false),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A partition splits copies that can each still serve users.",
        "During one, choose consistency (refuse) or availability (answer, maybe stale).",
        "Available systems converge later and must resolve conflicts without trusting wall clocks.",
        "Quorums (W + R > N) tune the trade-off per request.",
      ],
      scene: regions(false),
    },
  ],
};
