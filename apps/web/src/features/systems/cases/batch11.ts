import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Foundations ============ */

export const TAX_DEADLINE: CaseStudy = caseStudy(
  {
    id: "tax-deadline",
    title: "Tax-filing deadline night",
    tagline:
      "Millions of people file their tax returns in the last 48 hours. Each filing is big, slow and must not be lost.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["napkin-math", "latency-throughput", "request-journey"],
    learn: [
      "Estimate a deadline surge from last year's data",
      "Use Little's law to size concurrent work",
      "Separate quick steps from slow ones",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Midnight on the 31st",
      body: [
        "A tax portal receives 70 million returns a year. Last year, 18 million came in the final two days and 3 million in the last six hours. Each submission validates figures, checks them against employer and bank records, and produces an acknowledgement.",
      ],
      add: [
        node("filers", "browser", "Taxpayers", -4.4, 0),
        node("portal", "server", "Tax portal", 0, 0),
        node("records", "db", "Tax records", 3.4, 0),
      ],
      link: [both("filers", "portal", 3), both("portal", "records", 2)],
    },
    {
      kind: "technique",
      short: "Peak",
      uses: "napkin-math",
      title: "The last six hours",
      body: [
        "3,000,000 returns ÷ 21,600 s ≈ **140 submissions a second** on average, and the final hour is usually double: about **300 a second**. Each person also loads about 30 pages while filling the form: 9,000 page requests a second.",
      ],
      metrics: [
        { label: "Submissions, last hour", value: "≈ 300 /s", tone: "bad" },
        { label: "Page loads", value: "≈ 9,000 /s" },
      ],
    },
    {
      kind: "insight",
      short: "Trace",
      uses: "request-journey",
      title: "Where one submission spends its time",
      body: [
        "Tracing one submission: 60 ms of network, 40 ms of validation, then **6 seconds** waiting on cross-checks with employer and bank records. The user stares at a spinner the whole time.",
      ],
      table: {
        head: ["Step", "Time"],
        rows: [
          ["Network", "60 ms"],
          ["Validate the form", "40 ms"],
          ["Cross-check records", "6,000 ms"],
          ["Store and acknowledge", "50 ms"],
        ],
      },
    },
    {
      kind: "problem",
      short: "In flight",
      uses: "latency-throughput",
      title: "Little's law says 1,800 at once",
      body: [
        "300 submissions a second × 6 seconds each = **1,800 submissions in flight**. The portal's servers allow 400 concurrent requests. The rest wait, time out, and people press Submit again.",
      ],
      set: { portal: { state: "hot", badge: "1,800 in flight" } },
    },
    {
      kind: "solution",
      short: "Split",
      uses: "latency-throughput",
      title: "Accept fast, check later",
      body: [
        "Submission now does only the quick part: validate, store the return, and give an acknowledgement number in about 150 ms. Cross-checks run afterwards from a queue; problems arrive later as a notice. In flight: 300 × 0.15 s ≈ **45**.",
      ],
      quiz: {
        question: "Why is it safe to cross-check after acknowledging?",
        options: [
          "Cross-checks never find problems",
          "The legal deadline is about filing on time; mismatches are handled afterwards by notice, as they would be anyway",
          "It isn't safe",
        ],
        answer: 1,
        why: "The acknowledgement proves the return was filed before the deadline. Checking it is a separate step that doesn't need the user waiting.",
      },
      add: [node("checks", "worker", "Cross-checks", 3.4, 2.4, { sub: "after acknowledgement" })],
      link: [link("records", "checks", "request")],
      set: { portal: { state: "ok", badge: "≈ 45 in flight" } },
    },
    {
      kind: "insight",
      short: "Pages",
      uses: "napkin-math",
      title: "Page loads are the bigger load",
      body: [
        "9,000 page loads a second dwarf 300 submissions. Most pages (help text, form layout, scripts) are identical for everyone and can be served as static files, leaving servers for saving drafts and submitting.",
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Ready for the deadline",
      body: [
        "Last year's numbers predict ≈ 300 submissions a second at the peak.",
        "A trace showed 6 seconds of waiting inside each submission.",
        "Little's law: 1,800 in flight, far above the limit.",
        "Acknowledge in 150 ms, cross-check later: about 45 in flight.",
      ],
    },
  ],
);

/* ============ After Scaling ============ */

export const WEBINAR_SIGNUP: CaseStudy = caseStudy(
  {
    id: "webinar-signup",
    title: "A webinar sign-up page for 200,000",
    tagline:
      "A famous speaker posts the link. Two hundred thousand people sign up in ten minutes, and each one expects a confirmation.",
    minutes: 8,
    level: "beginner",
    tier: "combine",
    concepts: ["stateless", "load-balancing", "caching", "scale-up-out", "cdn"],
    learn: [
      "Serve the landing page from the edge",
      "Make sign-up servers interchangeable",
      "Count seats without a hot database row",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "One tweet, one page",
      body: [
        'A training company hosts free webinars. A sign-up page shows the topic, the speaker and "seats left", and takes a name and email. Usually 2,000 people sign up over a week. This time, a famous speaker shares the link.',
      ],
      add: [
        node("fans", "phone", "Visitors", -4.4, 0),
        node("app", "server", "Sign-up app", 0, 0, { sub: "one server" }),
        node("db", "db", "Registrations", 3.4, 0),
      ],
      link: [both("fans", "app", 3), both("app", "db", 2)],
    },
    {
      kind: "solution",
      short: "Edge",
      uses: "cdn",
      title: "The page itself is static",
      body: [
        "The landing page (text, photo, form) is the same for everyone. It's a static page on a CDN; only the form submission reaches the servers. 1.5 million page views become 200,000 sign-up requests.",
      ],
      add: [node("cdn", "cdn", "CDN", -2.4, -2.4, { sub: "landing page" })],
      link: [link("fans", "cdn", "request", { kind: "response", back: true, rate: 3 })],
    },
    {
      kind: "solution",
      short: "Pool",
      uses: "load-balancing",
      title: "A pool behind a balancer",
      body: [
        "Sign-ups go through a load balancer to a pool of identical servers, so one busy or failed server doesn't stop sign-ups.",
      ],
      add: [
        node("lb", "lb", "Load balancer", -2, 0.6),
        node("app2", "server", "Sign-up app ×N", 0, 2.4),
      ],
      unlink: ["fans>app"],
      link: [
        both("fans", "lb", 3),
        both("lb", "app", 2),
        both("lb", "app2", 2),
        both("app2", "db", 2),
      ],
    },
    {
      kind: "technique",
      short: "Stateless",
      uses: "stateless",
      title: "No session needed",
      body: [
        "A sign-up is one request with everything in it (name, email, webinar id, an anti-bot token). Servers keep nothing between requests, so the pool can grow from 2 to 20 in minutes.",
      ],
    },
    {
      kind: "problem",
      short: "Seats",
      uses: "caching",
      title: '"Seats left" on one hot row',
      body: [
        "Every sign-up decremented one `seats_left` row, and every page refresh read it. That single row became the bottleneck. The count now lives in an in-memory counter that's decremented atomically; the database stores the registrations, and the counter is rebuilt from them if lost.",
      ],
      quiz: {
        question: 'The page shows "seats left" from a 5-second cache. What\'s the risk?',
        options: [
          "None",
          "The displayed number lags a little; the atomic counter still decides who gets a seat",
          "People could register twice",
        ],
        answer: 1,
        why: "The display can be approximate; the decision (decrement and check) happens on the authoritative counter.",
      },
      add: [node("seats", "cache", "Seat counter", 3.4, -2.4, { sub: "atomic decrement" })],
      link: [both("app", "seats", 3), both("app2", "seats", 3)],
    },
    {
      kind: "solution",
      short: "Scale",
      uses: "scale-up-out",
      title: "Out, not up, and back down",
      body: [
        "Autoscaling adds servers when CPU passes 60% and removes them when the rush is over. Confirmation emails go through the email provider's batch API so they don't hold up sign-up responses.",
      ],
      metrics: [
        { label: "Sign-ups", value: "200,000 in 10 min" },
        { label: "Servers", value: "2 → 14 → 2" },
        { label: "p95 response", value: "120 ms", tone: "good" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "A spike, handled",
      body: ["Static page at the edge, stateless pool behind a balancer, counter in memory."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["1.5 M page views", "static page on a CDN", "CDNs"],
          ["Spread sign-ups", "balanced pool", "Load balancing"],
          ["Grow fast", "servers keep no state", "Stateless services"],
          ["Hot seat count", "atomic in-memory counter", "Caching"],
          ["Rush, then quiet", "autoscale out and back", "Scale up or out"],
        ],
      },
    },
  ],
);

/* ============ After Data & storage ============ */

export const JOB_SCHEDULER: CaseStudy = caseStudy(
  {
    id: "job-scheduler",
    title: "A job scheduler that runs each job once",
    tagline:
      "Thousands of scheduled jobs (invoices, reminders, cleanups) on several machines. Never skip one, never run one twice.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: ["consensus", "cap", "unique-ids", "replication", "transactions"],
    learn: [
      "Elect one scheduler leader",
      "Claim each run with a unique id",
      "Fence off a leader that thinks it's still in charge",
      "Make jobs safe to repeat anyway",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Cron, but for a whole company",
      body: [
        "A SaaS company runs 12,000 scheduled jobs: monthly invoices at 00:00 on the 1st, reminder emails every hour, nightly cleanups. One scheduler machine used to do it all, and when it died, invoices didn't go out.",
      ],
      add: [
        node("s1", "worker", "Scheduler A", -3, -1.6),
        node("s2", "worker", "Scheduler B", -3, 1.6),
        node("jobs", "db", "Job definitions", 1, 0),
        node("work", "service", "Job runners", 4.2, 0),
      ],
      link: [link("s1", "jobs", "request"), link("s2", "jobs", "request")],
    },
    {
      kind: "problem",
      short: "Twice",
      uses: "transactions",
      title: "Two schedulers, double invoices",
      body: [
        "Running two schedulers for safety means both fire the 00:00 invoice job. Customers are billed twice. Running one means a single machine failure skips the job. We need **exactly one active scheduler**, with a backup ready.",
      ],
      link: [link("s1", "work", "request"), link("s2", "work", "fail")],
    },
    {
      kind: "solution",
      short: "Leader",
      uses: "consensus",
      title: "Elect a leader with a lease",
      body: [
        "Schedulers compete for a lease in a small consensus-backed coordination store (three nodes). The winner holds the lease for 15 seconds and renews it every 5. If it stops renewing, the other takes over.",
      ],
      add: [node("coord", "lock", "Coordination store", -0.8, -3, { sub: "3 nodes, consensus" })],
      link: [both("s1", "coord", 1), both("s2", "coord", 1)],
      unlink: ["s2>work"],
      set: { s1: { badge: "leader" } },
    },
    {
      kind: "tradeoff",
      short: "Zombie",
      uses: "cap",
      title: "The leader that didn't know it was replaced",
      body: [
        "Scheduler A pauses for 20 seconds (a long garbage collection). Its lease expires; B becomes leader. A wakes up and, believing it's still leader, fires jobs. Both are running again.",
        "The fix is a **fencing token**: every lease comes with a number that only grows. Job runners reject requests carrying an older number than one they've seen.",
      ],
      quiz: {
        question:
          "Leader A holds token 41; B later gets token 42. A wakes up and sends a job with token 41. What happens?",
        options: [
          "The job runs, since A was leader",
          "The runner rejects it, because it has already seen token 42",
          "Both A and B's jobs run",
        ],
        answer: 1,
        why: "An always-increasing token lets the receiving side tell old leaders from new, even when the old one doesn't know it's old.",
      },
      set: { s1: { badge: "paused (token 41)", state: "dim" }, s2: { badge: "leader (token 42)" } },
      link: [link("s2", "work", "request"), link("s1", "work", "fail")],
    },
    {
      kind: "technique",
      short: "Run ids",
      uses: "unique-ids",
      title: "Each run has a unique id",
      body: [
        "A run's id is the job id plus its scheduled time: `invoices:2026-12-01T00:00`. Before running, the runner inserts the run id into a runs table with a unique constraint. A duplicate insert fails, so the job body never runs twice.",
      ],
      code: [
        "INSERT INTO runs (run_id, started_at) VALUES ('invoices:2026-12-01T00:00', now());",
        "-- unique violation: someone already ran it, so skip",
      ],
      add: [node("runs", "db", "Runs table", 4.2, 2.6, { sub: "unique run_id" })],
      link: [link("work", "runs", "write")],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Job definitions survive a failure",
      body: [
        "Job definitions and run history are replicated to a standby database. After a failure, the new leader reads which runs completed and catches up missed ones (a reminder that's an hour late is better than none).",
      ],
      add: [node("standby", "db", "Standby", 1, 2.6, { hue: "teal" })],
      link: [link("jobs", "standby", "copy")],
      set: { s1: { state: "ok", badge: "" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Once, and only once",
      body: ["One leader at a time, tokens to stop old leaders, ids to stop duplicate runs."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Avoid double runs", "a single active scheduler", "Transactions"],
          ["Pick the leader", "lease in a consensus store", "Consensus"],
          ["Old leader wakes up", "fencing tokens", "CAP"],
          ["Belt and braces", "unique run ids", "Unique IDs"],
          ["Catch up after failure", "replicated run history", "Replication"],
        ],
      },
    },
  ],
);

export const SHOPPING_LIST: CaseStudy = caseStudy(
  {
    id: "shopping-list",
    title: "A shared shopping list across devices",
    tagline:
      "A family edits one list on four phones, often in a supermarket with no signal. Every change must survive and merge.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["cap", "replication", "unique-ids", "sql-nosql"],
    learn: [
      "Work offline first, sync later",
      "Give items ids made on the device",
      "Merge concurrent edits without losing any",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Milk, eggs, and no signal",
      body: [
        "A family shares a shopping list. One parent adds items at home, the other ticks them off in a basement supermarket with no signal, a teenager adds snacks from school. The list must never lose an item or bring back a ticked one.",
      ],
      add: [
        node("p1", "phone", "Parent at home", -4.4, -1.8),
        node("p2", "phone", "Parent in shop", -4.4, 1.8, { badge: "offline" }),
        node("sync", "service", "Sync service", -0.6, 0),
        node("db", "db", "Lists DB", 3, 0),
      ],
      link: [both("p1", "sync", 1), link("sync", "db", "write")],
    },
    {
      kind: "tradeoff",
      short: "Offline",
      uses: "cap",
      title: "Choose availability",
      body: [
        "During a partition (no signal), the phone can refuse edits (consistent but useless in the shop) or accept them and sync later. A shopping list chooses **availability**: every phone keeps a full copy and always accepts edits.",
      ],
    },
    {
      kind: "technique",
      short: "Ids",
      uses: "unique-ids",
      title: "Items get ids on the phone",
      body: [
        'Items created offline can\'t wait for the server to number them. Each phone makes a random 128-bit id, so two people adding "milk" offline create two distinct items, which the app can show side by side and let them merge.',
      ],
    },
    {
      kind: "technique",
      short: "Changes",
      uses: "sql-nosql",
      title: "Store changes, not just the list",
      body: [
        "Each list is stored as items plus a log of small changes: add item, tick item, rename item, each with the item id and a timestamp. A document store keyed by list id holds this naturally; one read gets everything for a list.",
      ],
      code: [
        '{ list: "fam-21", items: { "a91…": { name: "Milk", ticked: true } },',
        '  log: [ { op: "tick", item: "a91…", at: "10:42:07", by: "phone-2" } ] }',
      ],
    },
    {
      kind: "solution",
      short: "Merge",
      uses: "replication",
      title: "Merging when the phone reconnects",
      body: [
        "Back in signal, the phone sends its changes since the last sync and receives everyone else's. Changes to different items simply combine. For the same field on the same item, the later timestamp wins; ticks and deletions are remembered as markers, so an old copy can't resurrect a ticked item.",
      ],
      quiz: {
        question:
          'Phone A (offline) ticks "bread". Phone B (online) renames it to "brown bread". After sync?',
        options: [
          "One change is lost",
          'Both apply: "brown bread", ticked, because they changed different fields',
          "The list is duplicated",
        ],
        answer: 1,
        why: 'Merging per field keeps both intentions. Only edits to the very same field need a rule like "latest wins".',
      },
      set: { p2: { badge: "synced" } },
      link: [both("p2", "sync", 1)],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Every phone and the server hold copies",
      body: [
        "The server keeps the merged list, replicated across two zones, and pushes changes to online phones within a second. A new phone downloads the whole list once, then only changes.",
      ],
      add: [
        node("p3", "phone", "Teenager", -4.4, 4.4),
        node("rep", "db", "Replica", 3, 2.6, { hue: "teal" }),
      ],
      link: [both("p3", "sync", 1), link("db", "rep", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Never lose a carton of milk",
      body: ["Available offline, ids from the device, changes merged per item and field."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Edit with no signal", "choose availability", "CAP"],
          ["Create items offline", "random ids made on the phone", "Unique IDs"],
          ["Store edits", "list document with a change log", "SQL and NoSQL"],
          ["Combine edits", "merge per field, remember ticks", "Replication"],
        ],
      },
    },
  ],
);

export const LEGAL_DOCUMENTS: CaseStudy = caseStudy(
  {
    id: "legal-documents",
    title: "Document storage for a law firm",
    tagline:
      "Twenty years of contracts and court filings, every version kept, found in seconds, and never lost.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["files-media", "indexes", "replication", "sql-nosql", "unique-ids"],
    learn: [
      "Keep files and their facts apart",
      "Keep every version without copying everything",
      "Find documents by client, case and date",
      "Store copies far apart",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Forty million documents",
      body: [
        "A law firm keeps 40 million documents (PDFs, scans, drafts) across 60,000 cases. Lawyers search by client, case, type and date. Rules require every version to be kept for 10 years after a case closes.",
      ],
      add: [
        node("lawyers", "browser", "Lawyers", -4.6, 0),
        node("docs", "service", "Document service", -1.2, 0),
      ],
      link: [both("lawyers", "docs", 2)],
    },
    {
      kind: "solution",
      short: "Split",
      uses: "files-media",
      title: "Files in storage, facts in a database",
      body: [
        "The documents themselves (300 TB) go to object storage. A relational database keeps the facts: client, case, type, author, date, and where the file is. Lawyers search the database and download from storage.",
      ],
      add: [
        node("store", "storage", "Document files", 2.4, -2.2, { sub: "300 TB" }),
        node("meta", "db", "Document records", 2.4, 2.2),
      ],
      link: [link("docs", "store", "write"), both("docs", "meta", 2)],
    },
    {
      kind: "technique",
      short: "Model",
      uses: "sql-nosql",
      title: "Clients, cases, documents, versions",
      body: [
        "The data is relational: a client has cases, a case has documents, a document has versions, and permissions follow the case. A relational database with foreign keys keeps it consistent.",
      ],
    },
    {
      kind: "technique",
      short: "Versions",
      uses: "unique-ids",
      title: "Every version keeps its own file",
      body: [
        "Each upload creates a new version with its own id; files are named by the hash of their content, so re-uploading an identical file stores nothing new. Old versions are never overwritten, only added to.",
      ],
      quiz: {
        question:
          "A lawyer uploads the same signed PDF to three cases. How many copies are stored?",
        options: ["Three", "One file, referenced by three document records", "None"],
        answer: 1,
        why: "Naming files by content hash means identical bytes share one stored file, while each case still has its own record.",
      },
    },
    {
      kind: "technique",
      short: "Find",
      uses: "indexes",
      title: "Indexes for how lawyers search",
      body: [
        'Most searches are "this client\'s documents, newest first" and "this case, by type". Indexes on `(client_id, filed_at)` and `(case_id, doc_type, filed_at)` make both instant. Full-text search inside documents is a separate search index, built from extracted text.',
      ],
      add: [node("search", "search", "Text search", -1.2, 2.6, { sub: "extracted text" })],
      link: [both("docs", "search", 1)],
    },
    {
      kind: "solution",
      short: "Copies",
      uses: "replication",
      title: "Copies in two cities",
      body: [
        "Storage keeps copies in two regions 800 km apart, and the records database replicates to a standby in the second region. Storage is set to write-once for closed cases, so nothing can be altered, even by an administrator.",
      ],
      add: [
        node("store2", "storage", "Second region", 5.4, -2.2, { hue: "teal" }),
        node("meta2", "db", "Standby", 5.4, 2.2, { hue: "teal" }),
      ],
      link: [link("store", "store2", "copy"), link("meta", "meta2", "copy")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every version, found fast, never lost",
      body: ["Bytes and facts stored apart, every version kept, indexes for real searches."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["300 TB of files", "object storage + records", "Files and media"],
          ["Related data", "relational model", "SQL and NoSQL"],
          ["Every version, no waste", "version ids, content-named files", "Unique IDs"],
          ["Fast searches", "(client, date), (case, type, date)", "Indexes"],
          ["Never lost", "two regions, write-once", "Replication"],
        ],
      },
    },
  ],
);

/* ============ After Communication ============ */

export const NEWSLETTER: CaseStudy = caseStudy(
  {
    id: "newsletter",
    title: "Sending a newsletter to 5 million readers",
    tagline:
      "Every Friday at 7 am, one email to 5 million people: personalised, on time, and only once each.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["queues", "pubsub", "apis", "unique-ids"],
    learn: [
      "Split a send into batches on a queue",
      "Send through a provider's API at its pace",
      "Never email anyone twice",
      "Handle bounces and unsubscribes",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Friday, 7 am",
      body: [
        'A news site\'s weekly newsletter goes to 5 million subscribers, each with a personalised "stories for you" section. It must finish within an hour so readers get it with breakfast.',
      ],
      add: [
        node("editor", "browser", "Editor", -4.6, 0),
        node("send", "service", "Send service", -1.2, 0),
        node("subs", "db", "Subscribers", -1.2, 2.6, { sub: "5 M" }),
        node("esp", "internet", "Email provider", 4.6, 0),
      ],
      link: [link("editor", "send", "request"), link("send", "subs", "request")],
    },
    {
      kind: "solution",
      short: "Batches",
      uses: "queues",
      title: "Five million emails, 1,000 at a time",
      body: [
        "The send service splits the list into 5,000 batches of 1,000 subscribers and puts them on a queue. Workers pick up batches, render each personalised email, and hand them to the provider. 5 million in an hour is about 1,400 a second, so 20 workers are plenty.",
      ],
      metrics: [
        { label: "Batches", value: "5,000 × 1,000" },
        { label: "Rate needed", value: "≈ 1,400 /s" },
      ],
      add: [
        node("q", "queue", "Batch queue", 1, 1.4, { queue: 7 }),
        node("workers", "worker", "Senders ×20", 2.8, 1.4),
      ],
      link: [link("send", "q", "event"), link("q", "workers", "event")],
    },
    {
      kind: "technique",
      short: "Provider",
      uses: "apis",
      title: "Send at the provider's pace",
      body: [
        "The email provider's API accepts 100 emails per call and allows 20 calls a second per account. Workers share a rate limit; when the provider answers `429 Too Many Requests`, they wait the time it says and retry that call.",
      ],
      link: [link("workers", "esp", { kind: "request", rate: 3 })],
    },
    {
      kind: "technique",
      short: "Once",
      uses: "unique-ids",
      title: "Never send the same issue twice",
      body: [
        "A worker crashes halfway through a batch; the batch is redelivered. Each message gets an id from issue and subscriber (`2026-w48:u_771`), passed to the provider as its idempotency key and recorded as sent. Repeats are skipped.",
      ],
      quiz: {
        question:
          "A batch of 1,000 is redelivered after 600 were sent. With per-message ids, how many duplicates go out?",
        options: ["600", "0, because the sent ids are skipped", "1,000"],
        answer: 1,
        why: "Recording each message id makes a redelivered batch safe: only the 400 not yet sent go out.",
      },
    },
    {
      kind: "solution",
      short: "Bounces",
      uses: "pubsub",
      title: "Bounces and unsubscribes come back as events",
      body: [
        "The provider calls back with **Bounced**, **Complained** and **Unsubscribed** events. They're published to the site's event bus; the subscriber service marks addresses, analytics counts opens, and the next issue skips bad addresses automatically.",
      ],
      add: [node("bus", "stream", "Event bus", 4.6, 2.6)],
      link: [link("esp", "bus", "event"), link("bus", "subs", "event")],
    },
    {
      kind: "case",
      short: "Typo",
      uses: "queues",
      title: "Case: a typo in the headline",
      body: [
        "Ten minutes in, the editor spots a wrong name in the headline. They press Pause: the queue stops handing out batches, the fixed version is approved, and the remaining batches use it. Already-sent emails can't be recalled, so a short correction goes only to those 800,000.",
      ],
      set: { q: { badge: "paused", state: "dim" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Five million, on time, once",
      body: ["Batches on a queue, the provider's pace respected, ids for safety, events back."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Finish in an hour", "5,000 batches, 20 workers", "Message queues"],
          ["Provider limits", "rate limit + Retry-After", "APIs"],
          ["No duplicates", "id per issue and subscriber", "Unique IDs"],
          ["Bounces, unsubscribes", "events to the subscriber list", "Pub/sub"],
        ],
      },
      set: { q: { badge: "", state: "ok" } },
    },
  ],
);

/* ============ After Reliability ============ */

export const SEARCH_DEPENDENCY: CaseStudy = caseStudy(
  {
    id: "search-dependency",
    title: "Search with a slow dependency",
    tagline:
      "A shop's search calls a pricing service for every result. When pricing slows down, search mustn't fall over with it.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["timeouts-retries", "caching", "observability", "redundancy"],
    learn: [
      "Bound every call with a timeout",
      "Stop calling a failing service with a circuit breaker",
      "Serve slightly stale prices from a cache",
      "See which dependency is hurting you",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Search needs prices",
      body: [
        "A shop's search shows 24 products per page, each with a live price from the pricing service (discounts, member prices). Search handles 3,000 queries a second; each makes one batched pricing call.",
      ],
      add: [
        node("shoppers", "browser", "Shoppers", -4.6, 0),
        node("search", "service", "Search", -1.2, 0),
        node("index", "search", "Search index", -1.2, 2.6),
        node("pricing", "service", "Pricing", 2.6, 0),
      ],
      link: [
        both("shoppers", "search", 3),
        both("search", "index", 2),
        both("search", "pricing", 3),
      ],
    },
    {
      kind: "problem",
      short: "Slow",
      uses: "timeouts-retries",
      title: "Pricing slows to 8 seconds",
      body: [
        "Pricing's database has a bad afternoon and replies take 8 seconds. Search waits; its threads fill up; search pages time out even though the search index is fine. One slow dependency took down a healthy service.",
      ],
      set: { pricing: { state: "hot", badge: "8 s" }, search: { state: "hot" } },
    },
    {
      kind: "solution",
      short: "Timeout",
      uses: "timeouts-retries",
      title: "A 150 ms timeout, then a circuit breaker",
      body: [
        "Search now waits at most 150 ms for prices. If more than half of recent calls fail or time out, a **circuit breaker** opens: search stops calling pricing for 30 seconds, then tries a few calls to see if it has recovered.",
      ],
      quiz: {
        question: "Why stop calling pricing entirely instead of just timing out each call?",
        options: [
          "To save money",
          "Calls that will almost certainly fail waste time and pile load on a service that's trying to recover",
          "Circuit breakers make prices more accurate",
        ],
        answer: 1,
        why: "Failing fast protects both sides: search stays quick, and pricing gets breathing room to recover.",
      },
      set: { search: { state: "ok" } },
      link: [link("search", "pricing", "fail")],
    },
    {
      kind: "solution",
      short: "Stale",
      uses: "caching",
      title: "Show the last known price",
      body: [
        'Search keeps a cache of recent prices (5 minutes). With the breaker open, results show cached prices with a small "price confirmed at checkout" note. Checkout always asks pricing directly.',
      ],
      add: [node("pcache", "cache", "Price cache", 2.6, 2.6, { sub: "5 min" })],
      link: [both("search", "pcache", 3)],
    },
    {
      kind: "solution",
      short: "Replica",
      uses: "redundancy",
      title: "A second pricing deployment",
      body: [
        "Pricing itself now runs in two zones with separate database replicas. A slow database in one zone sends traffic to the other instead of slowing everyone.",
      ],
      add: [node("pricing2", "service", "Pricing (zone B)", 5.4, 0)],
      link: [both("search", "pricing2", 2)],
    },
    {
      kind: "technique",
      short: "See it",
      uses: "observability",
      title: "Dependency dashboards",
      body: [
        "Search records the latency and error rate of every dependency call, plus breaker state. During the incident, one graph showed it immediately: pricing p99 at 8 s, breaker open, cached prices served for 6% of results.",
      ],
      metrics: [
        { label: "Search p95", value: "190 ms", tone: "good" },
        { label: "Results with cached prices", value: "6%" },
      ],
      add: [node("mon", "monitor", "Dependency dashboard", -4.6, -2.6)],
      link: [link("search", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "One slow service, no outage",
      body: ["Bound the wait, fail fast, fall back, and see it happen."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Don't wait forever", "150 ms timeout + circuit breaker", "Timeouts and retries"],
          ["Something to show", "5-minute price cache", "Caching"],
          ["Pricing resilience", "two zones", "Redundancy"],
          ["Know the cause", "per-dependency dashboards", "Observability"],
        ],
      },
      set: { pricing: { state: "ok", badge: "" } },
    },
  ],
);
