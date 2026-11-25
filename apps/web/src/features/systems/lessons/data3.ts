import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ------------------------------------ Consensus ------------------------------------ */

const ca = node("ca", "service", "Node A", 0, -2, { sub: "leader · term 1" });
const cb = node("cb", "service", "Node B", 2.4, 0.6, { sub: "follower" });
const cc = node("cc", "service", "Node C", -0.6, 2.2, { sub: "follower" });
const app1 = node("app1", "server", "App 1", -3.4, -2);
const app2 = node("app2", "server", "App 2", -3.4, 1.4);
const cluster = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => {
  const nodes = [app1, app2, ca, cb, cc].map((n) => ({ ...n, ...(extra[n.id] ?? {}) }));
  return {
    nodes,
    links: links ?? [
      both("app1", "ca", 1),
      link("ca", "cb", "copy", { label: "heartbeat" }),
      link("ca", "cc", "copy"),
    ],
  };
};

export const CONSENSUS: Lesson = {
  id: "consensus",
  title: "Consensus and leader election",
  tagline:
    "How a group of servers agrees on one leader and one history, even when some can't be reached.",
  minutes: 14,
  level: "advanced",
  learn: [
    "Why a timeout can't tell dead from unreachable",
    "Majorities: elections and commits need more than half",
    "Terms, votes and stepping down (Raft)",
    "How many nodes to run, and why not four",
    "Fencing tokens for leaders that wake up late",
  ],
  steps: [
    {
      kind: "setup",
      short: "Leader",
      title: "One leader, two followers",
      body: [
        'AlgoVerse awards a "first solver" badge when a new problem is published: exactly one learner may get it. A small three-node cluster records who won. Node A is the leader; every write goes through it and is copied to B and C.',
        "If the leader dies, a follower takes over. That sentence hides one of the hardest questions in distributed systems: who decides the leader is dead, and what if they are wrong?",
      ],
      callout: {
        kind: "key",
        text: "From outside, a crashed server, a slow server and an unreachable server all look the same: silence.",
      },
      scene: cluster(),
    },
    {
      kind: "problem",
      short: "Two leaders",
      title: "Two leaders at once",
      body: [
        "A network fault cuts A off from B and C. A is alive and still serving App 1. But B hears nothing, decides A is dead, and makes itself leader.",
        "Now two leaders accept writes. Through A, the badge goes to Lena; through B, to Ravi. Two histories that can't be merged: **split brain**.",
      ],
      callout: {
        kind: "watch",
        text: "A timeout tells you a server is unreachable. It can never tell you the server is dead.",
      },
      scene: cluster(
        {
          ca: { badge: "badge → Lena" },
          cb: { sub: "leader too!", badge: "badge → Ravi", state: "hot" },
        },
        [
          both("app1", "ca", 1),
          both("app2", "cb", 1),
          link("ca", "cb", { cut: true }),
          link("ca", "cc", { cut: true }),
          link("cb", "cc", "copy"),
        ],
      ),
    },
    {
      kind: "solution",
      short: "Majority",
      title: "The rule: nothing counts without a majority",
      body: [
        "One rule fixes it. A leader is elected, and a write is confirmed, only when **more than half** of all nodes agree. With three nodes, that is two.",
        "Cut off, A reaches only itself: 1 of 3. It can confirm nothing, so App 1's writes wait and time out. B and C are 2 of 3, so they may elect a leader and carry on. Any two majorities share a node, so two leaders can never both win.",
      ],
      scene: cluster(
        {
          ca: { state: "dim", sub: "1 of 3: can't commit" },
          cb: { sub: "leader · term 2", state: "lit" },
        },
        [
          link("app1", "ca", "fail"),
          both("app2", "cb", 1),
          link("ca", "cb", { cut: true }),
          link("ca", "cc", { cut: true }),
          link("cb", "cc", "copy"),
        ],
      ),
    },
    {
      kind: "technique",
      short: "Election",
      title: "How a leader gets elected",
      body: [
        "This is the **Raft** algorithm. The leader sends regular heartbeats. Each follower runs a timer of **random** length; if it fires with no heartbeat, that follower becomes a candidate.",
        "B's timer fires first. It starts **term 2**, votes for itself and asks the others. A node gives one vote per term, and only to a candidate whose log is at least as complete as its own. C agrees: 2 of 3, so B leads term 2.",
      ],
      callout: {
        kind: "good",
        text: "Random timeouts make it unlikely that two followers stand for election at the same moment.",
      },
      scene: cluster({ ca: { state: "dim" }, cb: { sub: "candidate · term 2", state: "lit" } }, [
        link("cb", "cc", { kind: "request", rate: 1 }, { kind: "response", back: true, rate: 1 }),
        link("ca", "cb", { cut: true }),
      ]),
    },
    {
      kind: "technique",
      short: "Commit",
      title: "A write is committed by a majority",
      body: [
        'App 2 asks the leader to award the badge to Ravi. B appends it to its log and sends it to the followers. As soon as a majority has stored it (B and C), the entry is **committed**, and only then does B answer "saved".',
        "Every node applies the same log entries in the same order, so every node ends up in the same state.",
      ],
      scene: cluster(
        { ca: { state: "dim" }, cb: { sub: "leader · term 2" }, cc: { badge: "logged" } },
        [both("app2", "cb", 1), link("cb", "cc", "copy"), link("ca", "cb", { cut: true })],
      ),
    },
    {
      kind: "solution",
      short: "Step down",
      title: "The old leader steps down",
      body: [
        "The network heals. A still believes it leads term 1, then receives a heartbeat stamped **term 2**. A higher term always wins: A becomes a follower at once.",
        "A's log holds one entry that never reached a majority, Lena's badge, which App 1 was never told had succeeded. A discards it and copies B's log. Nothing that was confirmed has been lost.",
      ],
      scene: cluster({ ca: { sub: "follower · term 2" }, cb: { sub: "leader · term 2" } }, [
        both("app2", "cb", 1),
        link("cb", "ca", "copy"),
        link("cb", "cc", "copy"),
      ]),
    },
    {
      kind: "insight",
      short: "How many",
      title: "How many nodes?",
      body: [
        "A cluster of N nodes needs ⌊N/2⌋ + 1 votes, so it keeps working with ⌊(N − 1)/2⌋ nodes down. Three survive one failure; five survive two.",
        "Put each node in a different zone, so one outage can't take a majority with it.",
      ],
      quiz: {
        question: "How many failures can a 4-node cluster survive?",
        options: ["1", "2", "3"],
        answer: 0,
        why: "A majority of 4 is 3, so losing 2 stops it. Four nodes survive no more than three do, with one more machine that can fail. Use odd sizes.",
      },
      scene: cluster(),
    },
    {
      kind: "case",
      short: "Paused",
      title: "Case: the leader that paused",
      body: [
        "Leader B freezes for twenty seconds (a long garbage-collection pause). A and C elect C for term 3. Then B wakes up, unaware any time passed, and finishes writing a file to shared storage, straight over C's work.",
        "The fix: every request a leader sends carries its term as a **fencing token**, and the storage remembers the highest token it has seen. C already wrote with 3; B's write carries 2, so the storage refuses it.",
      ],
      callout: {
        kind: "watch",
        text: "A node can't know it was paused. Make the resource reject stale leaders.",
      },
      scene: {
        nodes: [
          { ...cb, sub: "woke up · term 2", state: "hot" },
          { ...cc, sub: "leader · term 3" },
          ca,
          node("store", "storage", "Shared storage", 4.4, 2.4, { sub: "highest token: 3" }),
        ],
        links: [
          link("cc", "store", "write"),
          link("cb", "store", "fail"),
          link("cc", "ca", "copy"),
        ],
      },
    },
    {
      kind: "tradeoff",
      short: "Cost",
      title: "What consensus costs",
      body: [
        "Every write waits for a round trip to a majority: a millisecond or two in one data centre, 50–150 ms across regions. All writes pass through one leader, so throughput is capped by one machine. And with no majority, the cluster accepts no writes at all, on purpose.",
        "So nobody runs Raft for everything. You run a small consensus cluster (etcd, ZooKeeper, Consul) and keep only the critical facts in it: who leads, the configuration, who holds which lock.",
      ],
      callout: {
        kind: "good",
        text: "Kubernetes keeps all its cluster state in etcd; Kafka elects its controllers with Raft.",
      },
      scene: cluster(),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "A timeout can't tell dead from unreachable: naive failover risks split brain.",
        "Majority rule: elections and commits need more than half the nodes.",
        "A higher term wins; a stale leader steps down and drops uncommitted entries.",
        "Run 3 or 5 nodes across zones, and fence anything outside the log.",
      ],
      scene: cluster(),
    },
  ],
};

/* ----------------------------------- Transactions ----------------------------------- */

const ana = node("ana", "browser", "Lena", -3.4, -1.6);
const ravi = node("ravi", "browser", "Ravi", -3.4, 1.6);
const svc1 = node("svc1", "server", "App 1", -0.6, -1.6);
const svc2 = node("svc2", "server", "App 2", -0.6, 1.6);
const seatsDb = node("seats", "db", "Database", 2.6, 0, { sub: "mentor slots" });
const race = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [ana, ravi, svc1, svc2, seatsDb].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [
    both("ana", "svc1", 1),
    both("ravi", "svc2", 1),
    both("svc1", "seats", 1),
    both("svc2", "seats", 1),
  ],
});

export const TRANSACTIONS: Lesson = {
  id: "transactions",
  title: "Transactions and isolation",
  tagline:
    "Two learners, one mentoring slot, the same millisecond. How databases keep concurrent changes correct.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "Race conditions and lost updates",
    "Row locks, atomic updates and version checks",
    "Isolation levels and what they prevent",
    "Deadlocks and constraints",
    "Never hold a lock while waiting on something slow",
  ],
  steps: [
    {
      kind: "setup",
      short: "Last slot",
      title: "One slot left",
      body: [
        'A mentor offers one live session, and one slot is left. Lena and Ravi click "book" at the same moment; their requests land on different app servers sharing one database.',
        "The booking code looks fine: read how many slots are left, and if there is one, write the booking.",
      ],
      callout: {
        kind: "key",
        text: "Each request alone is correct. The trouble only appears when two run at once.",
      },
      code: [
        "left = db.query('SELECT left FROM slots WHERE id = 7')",
        "if left > 0:",
        "    db.execute('UPDATE slots SET left = left - 1 WHERE id = 7')",
        "    book(learner)",
      ],
      scene: race({ seats: { badge: "left: 1" } }),
    },
    {
      kind: "problem",
      short: "Race",
      title: "Both of them get it",
      body: [
        'Both servers read "1 slot left" before either writes. Both book, and both send a confirmation. One slot, two learners.',
        "This is a **race condition**, here a **lost update**: one write silently overwrote the other's decision.",
      ],
      callout: {
        kind: "watch",
        text: "Races are rare in testing and common in production, exactly when it is busiest.",
      },
      scene: race({ seats: { badge: "2 bookings!", state: "hot" } }),
    },
    {
      kind: "insight",
      short: "Isolation",
      title: "A transaction alone doesn't stop it",
      body: [
        "Wrapping it in `BEGIN … COMMIT` makes the booking all-or-nothing, but it can still be sold twice. Under the default isolation level of most databases (**read committed**), each read just sees the latest committed value: 1.",
        "**Isolation** is the part of ACID that says what concurrent transactions can see of each other. The default is deliberately weak, for speed.",
      ],
      scene: race({ seats: { badge: "both read 1" } }),
    },
    {
      kind: "solution",
      short: "Lock row",
      title: "Lock the row while you decide",
      body: [
        "Read with `SELECT … FOR UPDATE`. Lena's transaction locks the slot row; when Ravi's tries to read it, the database makes him **wait** until Lena commits. Then Ravi reads 0 and gets a polite \"fully booked\".",
      ],
      callout: {
        kind: "watch",
        text: "Locks are held until COMMIT, so keep these transactions short.",
      },
      scene: race({ seats: { badge: "locked by Lena" }, svc2: { queue: 1 } }, [
        both("ana", "svc1", 1),
        both("ravi", "svc2", 1),
        both("svc1", "seats", 1),
        link("svc2", "seats", { kind: "request", rate: 1 }),
      ]),
    },
    {
      kind: "technique",
      short: "One step",
      title: "Or do it in one statement",
      body: [
        "Often you don't need to read first at all. Let the database check and change in one atomic step, then look at how many rows changed: 1 means you got the slot, 0 means it was gone.",
      ],
      code: [
        "UPDATE slots SET left = left - 1",
        "WHERE id = 7 AND left > 0;   -- 1 row: booked, 0 rows: full",
      ],
      quiz: {
        question:
          "Two of these UPDATEs run at the same moment on a slot with left = 1. What happens?",
        options: [
          "Both change 1 row",
          "One changes 1 row, the other changes 0",
          "The database crashes",
        ],
        answer: 1,
        why: "The row is updated atomically; the second statement re-checks left > 0 and finds 0.",
      },
      scene: race(),
    },
    {
      kind: "technique",
      short: "Versions",
      title: "Optimistic: check a version number",
      body: [
        "Locks are **pessimistic**: they assume conflict and make others wait. **Optimistic** concurrency assumes conflicts are rare: read the row with its version, then write `… WHERE id = 7 AND version = 8`, bumping it to 9.",
        "If someone got there first, the version no longer matches, 0 rows change, and you reload and retry. Nobody waits.",
      ],
      callout: {
        kind: "good",
        text: "Ideal when people edit something for a while, like a lesson draft in the editor.",
      },
      scene: race({ seats: { badge: "version 9" } }),
    },
    {
      kind: "insight",
      short: "Levels",
      title: "Isolation levels",
      body: [
        "Stronger isolation prevents more anomalies, but makes transactions wait or abort more often.",
      ],
      table: {
        head: ["Level", "Prevents", "Cost"],
        rows: [
          ["Read committed", "dirty reads", "lowest"],
          ["Snapshot / repeatable read", "+ reads changing mid-transaction", "some aborts"],
          ["Serializable", "everything: as if one at a time", "most aborts, retry"],
        ],
      },
      scene: race(),
    },
    {
      kind: "case",
      short: "Deadlock",
      title: "Case: the deadlock",
      body: [
        "Lena swaps her slot with Ravi's: she locks slot 7, then asks for slot 9. At the same instant Ravi swaps the other way: he locks slot 9, then asks for slot 7. Each waits for the other, forever.",
        "The database detects the cycle and aborts one transaction, which must retry. Prevent it by always taking locks in the same order, for example lowest id first.",
      ],
      scene: race({
        svc1: { badge: "has 7, wants 9", state: "hot" },
        svc2: { badge: "has 9, wants 7", state: "hot" },
      }),
    },
    {
      kind: "solution",
      short: "Constraint",
      title: "Constraints: the last line of defence",
      body: [
        "Code changes, and someday someone writes a booking path that forgets the lock. So let the database enforce the rule: a **unique constraint** on `(session, slot)` in the bookings table.",
        "A second booking is rejected with a duplicate-key error, whatever the application code does.",
      ],
      callout: {
        kind: "key",
        text: "Encode invariants as constraints: unique, foreign key, check (left ≥ 0).",
      },
      scene: race({ seats: { badge: "UNIQUE(session, slot)" } }),
    },
    {
      kind: "case",
      short: "Slow call",
      title: "Case: a lock held during a payment",
      body: [
        "Paid sessions arrive. Someone moves the card payment inside the booking transaction: lock the slot, call the payment provider, commit. The provider takes 3 seconds, and every other request for that slot waits, each holding a database connection. On launch day the pool runs dry.",
        "Split it: transaction 1 marks the slot **held** for Lena until 18:10 and commits at once; she pays outside any transaction; transaction 2 marks it booked. A cleanup job releases expired holds.",
      ],
      callout: {
        kind: "watch",
        text: "Never wait on anything slow while holding a lock: a user, a payment API, an email.",
      },
      scene: {
        nodes: [
          ana,
          svc1,
          seatsDb,
          node("pay", "service", "Payment provider", 1, -3.4, { sub: "≈ 3 s" }),
        ],
        links: [
          both("ana", "svc1", 1),
          both("svc1", "seats", 1),
          link(
            "svc1",
            "pay",
            { kind: "request", rate: 1, speed: 3 },
            { kind: "response", back: true, rate: 1, speed: 3 },
          ),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Read-then-write under concurrency causes races and lost updates.",
        "Fix with row locks, one atomic UPDATE, or version checks.",
        "Isolation levels trade correctness for waiting and retries.",
        "Lock in a consistent order; back rules with constraints.",
        "Hold a reservation, never a lock, while waiting on payments.",
      ],
      scene: race(),
    },
  ],
};

/* ----------------------------------- Files and media ----------------------------------- */

const creator = node("creator", "phone", "Mentor's phone", -3.6, 0, { sub: "1.8 GB video" });
const apiF = node("apiF", "server", "App", -0.6, -1.6);
const meta = node("meta", "db", "Database", 2.2, -1.6, { sub: "facts about files" });
const bucket = node("bucket", "storage", "Object storage", 1, 1.8, { sub: "the bytes" });
const queueF = node("queueF", "queue", "Queue", 3.6, 0.4);
const workers = node("workers", "worker", "Workers", 5.6, 0.4, { sub: "transcode, thumbnails" });
const cdnF = node("cdnF", "cdn", "CDN", -1.6, 3.6, { sub: "serves videos" });

export const FILES_MEDIA: Lesson = {
  id: "files-media",
  title: "Files and media",
  tagline:
    "Videos and images don't belong in your database: where they go, and how they get there and back.",
  minutes: 13,
  level: "intermediate",
  learn: [
    "Bytes in object storage, facts in the database",
    "Direct uploads with presigned URLs",
    "Multipart uploads that resume",
    "Processing in the background, serving from the edge",
    "Keeping the two stores in sync, and buckets private",
  ],
  builtOn: [{ label: "Queue", path: "/structures/queue" }],
  steps: [
    {
      kind: "setup",
      short: "BLOBs",
      title: "Videos in the database",
      body: [
        "Mentors can now upload recorded walkthroughs. The first version saves each video as a **BLOB**, a binary column, right next to its title and owner. One database, one backup, simple.",
      ],
      scene: {
        nodes: [creator, apiF, { ...meta, sub: "rows + videos" }],
        links: [link("creator", "apiF", "heavy"), link("apiF", "meta", "heavy")],
      },
    },
    {
      kind: "problem",
      short: "Too big",
      title: "A terabyte a day",
      body: [
        "Uploads grow to a terabyte a day. The database, its replicas and its backups all grow by that much; restores take days and new replicas copy everything.",
        "Every view also streams through the app servers and the database, crowding out the small queries everything else needs.",
      ],
      metrics: [
        { label: "Growth", value: "1 TB / day", tone: "bad" },
        { label: "Restore time", value: "3 days", tone: "bad" },
      ],
      scene: {
        nodes: [creator, apiF, { ...meta, sub: "rows + videos", state: "hot", size: 1.4 }],
        links: [link("creator", "apiF", "heavy"), link("apiF", "meta", { kind: "heavy", rate: 3 })],
      },
    },
    {
      kind: "solution",
      short: "Object store",
      title: "Bytes in object storage, facts in the database",
      body: [
        "Move the bytes to **object storage** (S3, Google Cloud Storage, Azure Blob): a huge key → file store. Put a file under a key like `videos/9f2c.mp4`, get it back by the key. It keeps copies across several data centres and costs a fraction of database disk.",
        "The database keeps only the facts: title, owner, size, status, and the object's key.",
      ],
      scene: {
        nodes: [creator, apiF, meta, bucket],
        links: [
          link("creator", "apiF", "heavy"),
          link("apiF", "bucket", "heavy"),
          link("apiF", "meta", "write"),
        ],
      },
    },
    {
      kind: "solution",
      short: "Presigned",
      title: "Upload straight to storage",
      body: [
        "Even so, a 1.8 GB upload through the app server ties up a connection for minutes just to pass bytes along.",
        "Instead the app hands out **permission**: the phone asks to upload, the app checks the mentor, writes a `pending` row, and replies with a **presigned URL**, a link signed with the app's key that allows one upload, to one key, for 15 minutes. The phone sends the bytes straight to storage.",
      ],
      callout: {
        kind: "key",
        text: "The app server handles the decision; storage handles the bytes.",
      },
      scene: {
        nodes: [creator, apiF, meta, bucket],
        links: [
          both("creator", "apiF", 1),
          link("apiF", "meta", "write"),
          link("creator", "bucket", { kind: "heavy", rate: 3 }),
        ],
      },
    },
    {
      kind: "technique",
      short: "Multipart",
      title: "Big files: upload in parts",
      body: [
        "One 1.8 GB request over a phone network rarely makes it in one piece. A **multipart upload** splits the file into parts, say 10 MB each, sent in parallel, each with its own presigned URL.",
        "A failed part is simply sent again, and a dropped connection resumes from the last part that arrived.",
      ],
      quiz: {
        question: "The connection drops at 70% of a multipart upload. What happens next?",
        options: [
          "Start again from 0%",
          "Resume with the parts that didn't arrive",
          "The video is lost",
        ],
        answer: 1,
        why: "Storage keeps the parts it received; the client sends only the missing ones and then asks storage to assemble the file.",
      },
      scene: {
        nodes: [creator, apiF, meta, bucket],
        links: [both("creator", "apiF", 1), link("creator", "bucket", { kind: "heavy", rate: 4 })],
      },
    },
    {
      kind: "technique",
      short: "Processing",
      title: "Make the versions people actually watch",
      body: [
        'An original is rarely what learners download. Each "upload complete" event goes on a **queue**, and workers make what the app needs: several resolutions, a thumbnail, captions, a malware scan, and the location data stripped from images.',
        "When they finish, the row flips from `pending` to `ready`.",
      ],
      scene: {
        nodes: [creator, apiF, meta, bucket, queueF, workers],
        links: [
          link("bucket", "queueF", "event"),
          link("queueF", "workers", "event"),
          link("workers", "bucket", "write"),
          link("workers", "meta", "write"),
        ],
      },
    },
    {
      kind: "solution",
      short: "Edge",
      title: "Serve them from the edge",
      body: [
        "Views far outnumber uploads, so they must not come through the app either. Videos are served by a **CDN** with the bucket as its origin, cut into short segments at several qualities so the player can switch as the connection changes.",
        "Give each version a key that changes when the file changes, and edges can cache it for a year.",
      ],
      scene: {
        nodes: [creator, apiF, meta, bucket, cdnF, node("viewers", "user", "Learners", -4.4, 3.6)],
        links: [
          both("viewers", "cdnF", 3),
          link(
            "cdnF",
            "bucket",
            { kind: "request", rate: 1 },
            { kind: "heavy", back: true, rate: 1 },
          ),
        ],
      },
    },
    {
      kind: "case",
      short: "Out of sync",
      title: "Case: rows without files, files without rows",
      body: [
        "Two stores can disagree. A phone gets its presigned URL and then loses signal: the row says `pending` forever. A mentor deletes a video: the row goes, but the files stay, still costing money and still reachable by anyone who kept the link.",
        "Treat it like any two-system update: every row has a status, and a cleanup job removes stale pending rows and files no row points to.",
      ],
      scene: {
        nodes: [
          apiF,
          { ...meta, badge: "pending forever", state: "hot" },
          { ...bucket, badge: "orphan files", state: "hot" },
          node("janitor", "worker", "Cleanup job", 3.8, 0.2),
        ],
        links: [link("janitor", "meta", "request"), link("janitor", "bucket", "request")],
      },
    },
    {
      kind: "case",
      short: "Public bucket",
      title: "Case: the bucket anyone can list",
      body: [
        'A developer makes the bucket public "to get videos showing". Months later someone discovers they can **list** it and download every upload ever made, including private session recordings.',
        "Keep buckets private. Serve through the CDN with signed or time-limited links, and let only the app's identity write.",
      ],
      callout: { kind: "watch", text: "Leaky buckets are among the most common cloud breaches." },
      scene: {
        nodes: [
          { ...bucket, state: "hot", badge: "public!" },
          node("stranger", "user", "Anyone", -3, 1.8),
        ],
        links: [
          link(
            "stranger",
            "bucket",
            { kind: "request", rate: 2 },
            { kind: "heavy", back: true, rate: 3 },
          ),
        ],
      },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Bytes in object storage, metadata in the database, joined by the object's key.",
        "Clients upload directly with presigned URLs; big files go in resumable parts.",
        "Workers make the versions learners need; a CDN serves them.",
        "Clean up mismatches between the two stores, and keep buckets private.",
      ],
      scene: {
        nodes: [creator, apiF, meta, bucket, queueF, workers, cdnF],
        links: [
          both("creator", "apiF", 1),
          link("creator", "bucket", "heavy"),
          link("bucket", "queueF", "event"),
          link("queueF", "workers", "event"),
          link("cdnF", "bucket", "request"),
        ],
      },
    },
  ],
};
