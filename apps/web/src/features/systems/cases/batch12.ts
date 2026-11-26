import { link, node, type CaseStudy } from "../model";
import { caseStudy } from "./builder";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ============ After Reliability ============ */

export const ONCALL_ALERTS: CaseStudy = caseStudy(
  {
    id: "oncall-alerts",
    title: "Alerts that don't wake people for nothing",
    tagline:
      "An on-call engineer was paged 40 times last week, 38 for nothing. Redesign alerting so every page matters.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["observability", "redundancy", "queues", "rate-limiting"],
    learn: [
      "Alert on what users feel, not on every metric",
      "Use error budgets to decide what's urgent",
      "Group and deduplicate alerts",
      "Make the alerting system itself reliable",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Forty pages in a week",
      body: [
        "A delivery company's platform team has 600 alert rules: CPU above 80%, disk above 70%, any error logged. The on-call engineer was woken 40 times last week; 38 needed no action. Real problems are now ignored too.",
      ],
      add: [
        node("services", "service", "Services", -4.6, 0),
        node("metrics", "monitor", "Metrics", -1.4, 0),
        node("pager", "phone", "On-call phone", 3.4, 0, { badge: "40 pages", state: "hot" }),
      ],
      link: [
        link("services", "metrics", "event"),
        link("metrics", "pager", { kind: "event", rate: 4 }),
      ],
    },
    {
      kind: "insight",
      short: "Symptoms",
      uses: "observability",
      title: "Alert on symptoms, not causes",
      body: [
        "High CPU is a cause that may never hurt anyone. Users feel symptoms: failed orders, slow tracking pages. Pages are now based on a few user-facing measures: order success rate, tracking latency, courier app errors.",
      ],
      table: {
        head: ["Old alert", "New alert"],
        rows: [
          ["CPU > 80%", "(dashboard only)"],
          ["Any error logged", "Order success < 99.5% for 10 min"],
          ["Disk > 70%", "Disk full within 24 h (ticket, not page)"],
        ],
      },
    },
    {
      kind: "technique",
      short: "Budget",
      uses: "observability",
      title: "Error budgets decide urgency",
      body: [
        "The goal is 99.9% of orders succeed each month: a budget of 0.1% failures. A page fires when the budget is burning fast (at this rate it'll be gone in two days); a slow burn opens a ticket for working hours instead.",
      ],
      quiz: {
        question: "Errors rise to 0.2% for an hour at 3 am, then return to normal. Page or ticket?",
        options: [
          "Page immediately, any error rise is urgent",
          "Probably a ticket: it used a little budget and stopped; page only if the burn rate would exhaust the budget soon",
          "Ignore it",
        ],
        answer: 1,
        why: "Burn-rate alerts page for fast, sustained damage and let small blips wait for daylight.",
      },
    },
    {
      kind: "solution",
      short: "Group",
      uses: "queues",
      title: "Group, deduplicate, then route",
      body: [
        "Alerts go to an alert queue first. A router groups alerts with the same cause (one database down triggers 30 service alerts: that's one incident), suppresses repeats for an hour, and routes by severity: page, chat message or ticket.",
      ],
      add: [
        node("aq", "queue", "Alert queue", 0.6, 1.8, { queue: 5 }),
        node("router", "worker", "Alert router", 2.2, 1.8, { sub: "group, dedupe, route" }),
        node("tickets", "browser", "Tickets & chat", 3.4, 3.6),
      ],
      unlink: ["metrics>pager"],
      link: [
        link("metrics", "aq", "event"),
        link("aq", "router", "event"),
        link("router", "pager", "event"),
        link("router", "tickets", "event"),
      ],
    },
    {
      kind: "technique",
      short: "Limit",
      uses: "rate-limiting",
      title: "A ceiling on pages",
      body: [
        "Even grouped, a storm of alerts can flood a phone. The router allows at most one page per incident every 15 minutes and a few per hour overall; extra alerts are added to the open incident instead of paging again.",
      ],
      set: { pager: { badge: "3 pages", state: "ok" } },
    },
    {
      kind: "solution",
      short: "Watch the watcher",
      uses: "redundancy",
      title: "Who alerts when alerting is down?",
      body: [
        "If the metrics system itself fails, no alerts fire, and silence looks like health. A separate checker in another region sends a heartbeat through the whole alert pipeline every minute and pages by SMS directly if the heartbeat doesn't arrive.",
      ],
      add: [node("dead", "clock", "Heartbeat checker", -1.4, -2.6, { sub: "other region" })],
      link: [link("dead", "aq", "event"), link("dead", "pager", "fail")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Every page matters",
      body: [
        "Symptoms over causes, budgets for urgency, grouping and limits, and a watcher for the watchers.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Pages that matter", "user-facing symptoms + error budgets", "Observability"],
          ["One incident, one page", "alert queue with grouping", "Message queues"],
          ["No alert storms", "page limits per incident", "Rate limiting"],
          ["Alerting fails silently", "independent heartbeat", "Redundancy"],
        ],
      },
    },
  ],
);

/* ============ After Architecture ============ */

export const SERVICE_MESH: CaseStudy = caseStudy(
  {
    id: "service-mesh",
    title: "Fifty services talking to each other",
    tagline:
      "An insurance platform has grown to 50 services. Every team re-implements retries, timeouts and tracing, each slightly differently.",
    minutes: 10,
    level: "advanced",
    tier: "integrate",
    concepts: [
      "service-discovery",
      "timeouts-retries",
      "observability",
      "microservices",
      "encryption",
    ],
    learn: [
      "Find services through a registry",
      "Move retries and timeouts into a sidecar",
      "Encrypt service-to-service traffic",
      "Trace calls across every hop",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Fifty services, fifty ways",
      body: [
        "An insurer's platform has 50 services written in four languages. Each team wrote its own HTTP client: some retry three times, some never; some time out after 1 second, some after 60. An outage in one service cascades unpredictably.",
      ],
      add: [
        node("quote", "service", "Quotes", -3.6, -1.6),
        node("policy", "service", "Policies", -3.6, 1.6),
        node("pricing", "service", "Pricing", 0, -1.6),
        node("customer", "service", "Customers", 0, 1.6),
        node("claims", "service", "Claims", 3.6, 0),
      ],
      link: [
        both("quote", "pricing", 2),
        both("quote", "customer", 1),
        both("policy", "customer", 1),
        both("policy", "pricing", 1),
        both("claims", "customer", 1),
      ],
    },
    {
      kind: "technique",
      short: "Registry",
      uses: "service-discovery",
      title: "Find services by name",
      body: [
        'Instances register themselves with a service registry and send health checks. Callers ask for "pricing" and get the healthy instances, never a hard-coded address.',
      ],
      add: [node("reg", "registry", "Service registry", 0, -4)],
      link: [link("pricing", "reg", "request"), link("customer", "reg", "request")],
    },
    {
      kind: "solution",
      short: "Sidecar",
      uses: "microservices",
      title: "A sidecar proxy next to every service",
      body: [
        "Each service talks only to a small proxy running beside it. The proxies handle discovery, load balancing, retries and timeouts, the same way for every language. Teams delete their home-made clients.",
      ],
      set: {
        quote: { badge: "+ proxy" },
        policy: { badge: "+ proxy" },
        pricing: { badge: "+ proxy" },
        customer: { badge: "+ proxy" },
        claims: { badge: "+ proxy" },
      },
    },
    {
      kind: "technique",
      short: "Policies",
      uses: "timeouts-retries",
      title: "One place to set timeouts and retries",
      body: [
        "Policies are set centrally per route: Pricing gets a 300 ms timeout and one retry with jitter; Claims' slow reports get 5 seconds and no retry. A retry budget (no more than 10% extra calls) stops retries from multiplying load during an outage.",
      ],
      quiz: {
        question: "Why cap retries at 10% of normal traffic?",
        options: [
          "Retries are expensive to configure",
          "During an outage every caller retrying multiplies load on the struggling service; a budget prevents a retry storm",
          "Proxies can't retry more",
        ],
        answer: 1,
        why: "Unlimited retries turn a slow service into a dead one. A budget keeps retries helpful, not harmful.",
      },
      add: [
        node("control", "monitor", "Mesh control plane", 3.6, -3.4, { sub: "routes, policies" }),
      ],
      link: [link("control", "pricing", "event"), link("control", "claims", "event")],
    },
    {
      kind: "technique",
      short: "Encrypt",
      uses: "encryption",
      title: "Every call encrypted and identified",
      body: [
        "Proxies talk to each other over mutual TLS: each service has a short-lived certificate proving its identity. Traffic inside the data centre is encrypted, and Claims can allow calls only from services that should call it.",
      ],
    },
    {
      kind: "solution",
      short: "Tracing",
      uses: "observability",
      title: "Every hop traced",
      body: [
        "Proxies add and pass on trace headers automatically, and report latency and errors for every call. A slow quote can be followed through Quotes → Pricing → Customers in one view, with no code changes in the services.",
      ],
      add: [node("traces", "monitor", "Tracing", 3.6, 3.4)],
      link: [link("quote", "traces", "event"), link("pricing", "traces", "event")],
      metrics: [
        { label: "Services with tracing", value: "8 → 50", tone: "good" },
        { label: "Retry policies", value: "50 variants → 6" },
      ],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Consistent calls everywhere",
      body: ["Move the plumbing out of the services and into a shared, centrally managed layer."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Find each other", "service registry", "Service discovery"],
          ["One behaviour for all languages", "sidecar proxies", "Microservices"],
          ["Sane timeouts and retries", "central policies + retry budget", "Timeouts and retries"],
          ["Trust inside the network", "mutual TLS identities", "Encryption"],
          ["See every hop", "automatic tracing", "Observability"],
        ],
      },
    },
  ],
);

export const DATA_WAREHOUSE: CaseStudy = caseStudy(
  {
    id: "data-warehouse",
    title: "A nightly data warehouse",
    tagline:
      "Finance wants yesterday's sales by region, product and channel by 7 am. Pull from twelve systems without slowing any of them.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["batch-stream", "storage-engines", "sql-nosql", "replication"],
    learn: [
      "Extract from replicas, not production",
      "Store analytics data in columns",
      "Load in stages you can re-run",
      "Model data for questions, not for apps",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Twelve systems, one report",
      body: [
        "A retailer's sales live in the online shop, the store tills, the marketplace feed and nine other systems. Finance wants one set of numbers every morning, and analysts want to ask new questions without asking engineers.",
      ],
      add: [
        node("shop", "db", "Online shop DB", -4.6, -2),
        node("tills", "db", "Store tills DB", -4.6, 0),
        node("market", "internet", "Marketplace feed", -4.6, 2),
        node("analysts", "browser", "Finance & analysts", 4.8, 0),
      ],
    },
    {
      kind: "technique",
      short: "Replicas",
      uses: "replication",
      title: "Read from replicas at night",
      body: [
        "Extract jobs read from each system's read replica, never the primary, so a big nightly scan can't slow checkout. Only rows changed since the last run are copied.",
      ],
      add: [
        node("shopRep", "db", "Shop replica", -2.4, -2, { hue: "teal", size: 0.8 }),
        node("tillRep", "db", "Tills replica", -2.4, 0, { hue: "teal", size: 0.8 }),
      ],
      link: [link("shop", "shopRep", "copy"), link("tills", "tillRep", "copy")],
    },
    {
      kind: "solution",
      short: "Stages",
      uses: "batch-stream",
      title: "Extract, load, transform, in stages",
      body: [
        "At 1 am, raw rows land in a staging area exactly as received. Transform jobs then clean and join them into tidy tables. Each stage writes to a new dated partition, so a failed step can be re-run from the last good stage without duplicates.",
      ],
      add: [
        node("staging", "storage", "Raw staging", 0, 0, { sub: "by date" }),
        node("transform", "worker", "Transform jobs", 0, 2.4),
      ],
      link: [
        link("shopRep", "staging", "heavy"),
        link("tillRep", "staging", "heavy"),
        link("market", "staging", "heavy"),
        link("staging", "transform", "request"),
      ],
    },
    {
      kind: "technique",
      short: "Columns",
      uses: "storage-engines",
      title: "A column store for analytics",
      body: [
        '"Sales by region last year" reads 3 columns of 2 billion rows. A column-oriented warehouse stores each column together and compressed, so it reads only those 3 columns, often 20× less data than a row store.',
      ],
      quiz: {
        question: 'Why is a column store faster for "total sales by region"?',
        options: [
          "It has more indexes",
          "It reads only the region and amount columns, compressed, instead of every column of every row",
          "It caches every query",
        ],
        answer: 1,
        why: "Analytics queries touch few columns over many rows; storing by column matches that shape.",
      },
      add: [node("dw", "db", "Column warehouse", 2.6, 0, { sub: "2 B sales rows" })],
      link: [link("transform", "dw", "write"), both("analysts", "dw", 1)],
    },
    {
      kind: "technique",
      short: "Model",
      uses: "sql-nosql",
      title: "Facts and dimensions",
      body: [
        'The warehouse is modelled for questions: one big **sales fact** table (date, store, product, channel, amount) and small **dimension** tables describing stores, products and dates. Any "by X and Y" question becomes a simple join and group-by.',
      ],
      code: [
        "SELECT s.region, d.month, SUM(f.amount)",
        "FROM sales f JOIN stores s USING (store_id) JOIN dates d USING (date_id)",
        "GROUP BY s.region, d.month;",
      ],
    },
    {
      kind: "case",
      short: "Late feed",
      uses: "batch-stream",
      title: "Case: the marketplace feed is late",
      body: [
        'The marketplace feed arrives at 6:40 instead of 1 am. The report at 7 am shows marketplace numbers as "pending" rather than silently zero; when the feed lands, only that day\'s partition is re-transformed and the report updates.',
      ],
      set: { market: { state: "hot", badge: "late" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "One set of numbers by 7 am",
      body: ["Copy quietly, stage everything, store by column, model for questions."],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Don't slow production", "extract from replicas", "Replication"],
          ["Re-runnable loads", "dated staging, staged jobs", "Batch and stream"],
          ["Fast analytics", "column store", "Storage engines"],
          ["Easy questions", "facts and dimensions", "SQL and NoSQL"],
        ],
      },
      set: { market: { state: "ok", badge: "" } },
    },
  ],
);

/* ============ After Security ============ */

export const ADMIN_ROLES: CaseStudy = caseStudy(
  {
    id: "admin-roles",
    title: "Admin access for a multi-tenant product",
    tagline:
      "Customer admins manage their own users; support staff sometimes need to look inside. Nobody should see more than their job needs.",
    minutes: 9,
    level: "advanced",
    tier: "integrate",
    concepts: ["authorization", "authentication", "sharding", "observability"],
    learn: [
      "Separate customer admins from company staff",
      "Grant support access temporarily, with consent",
      "Enforce tenant boundaries in every query",
      "Audit every privileged action",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "Who can see what?",
      body: [
        "An HR product serves 8,000 companies. Each company has its own admins who manage employees and payroll settings. The product's support team occasionally needs to see a customer's settings to fix a problem.",
      ],
      add: [
        node("custAdmin", "browser", "Customer admins", -4.6, -1.6),
        node("support", "browser", "Support staff", -4.6, 1.6),
        node("app", "service", "HR app", -1, 0),
        node("data", "db", "Tenant data", 2.6, 0),
      ],
      link: [both("custAdmin", "app", 2), both("support", "app", 1), both("app", "data", 3)],
    },
    {
      kind: "technique",
      short: "Sign-in",
      uses: "authentication",
      title: "Two different front doors",
      body: [
        "Customer admins sign in through their company's single sign-on. Support staff sign in through the company's own identity provider with a hardware key. Their tokens say which kind of user they are, so the two can never be confused.",
      ],
    },
    {
      kind: "technique",
      short: "Roles",
      uses: "authorization",
      title: "Roles inside each tenant",
      body: [
        "Within a company: Owner (everything), Payroll admin (pay settings), People admin (employee records), Viewer. Permissions are checked on the server for every action, never just by hiding buttons.",
      ],
      table: {
        head: ["Role", "Employees", "Payroll", "Billing"],
        rows: [
          ["Owner", "edit", "edit", "edit"],
          ["Payroll admin", "view", "edit", "none"],
          ["People admin", "edit", "none", "none"],
          ["Viewer", "view", "none", "none"],
        ],
      },
    },
    {
      kind: "solution",
      short: "Boundary",
      uses: "sharding",
      title: "Tenant id in every query, data on tenant shards",
      body: [
        "Every row carries a tenant id and the data layer adds `WHERE tenant_id = :current` to every query automatically; data is sharded by tenant. A bug in one screen can't return another company's employees.",
      ],
      add: [node("data2", "db", "Tenant shard 2", 2.6, 2.4)],
      set: { data: { label: "Tenant shard 1" } },
      link: [both("app", "data2", 2)],
    },
    {
      kind: "solution",
      short: "Break-glass",
      uses: "authorization",
      title: "Support access is temporary and approved",
      body: [
        "Support staff have no standing access to any customer. To help, they request access to one tenant for a reason and a time limit; the customer's owner approves in their admin screen. Access is read-only by default and expires automatically.",
      ],
      quiz: {
        question:
          "A support engineer needs to see a customer's payroll settings. What's the right flow?",
        options: [
          "Log in with a shared super-admin account",
          "Request read-only access to that tenant for 2 hours, approved by the customer, and logged",
          "Ask the customer for their password",
        ],
        answer: 1,
        why: "Just-in-time, approved, limited and logged access gives support what it needs without permanent risk.",
      },
      add: [node("grants", "lock", "Access grants", -1, -2.6, { sub: "expiring" })],
      link: [both("app", "grants", 1)],
    },
    {
      kind: "technique",
      short: "Audit",
      uses: "observability",
      title: "Every privileged action is recorded",
      body: [
        "Role changes, support access, exports and payroll edits go to an append-only audit log. Customers can see their own audit trail; unusual patterns (a support engineer opening many tenants in an hour) alert the security team.",
      ],
      add: [node("audit", "monitor", "Audit log", 2.6, -2.6, { sub: "append-only" })],
      link: [link("app", "audit", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Least access, always visible",
      body: [
        "Separate identities, roles per tenant, hard tenant boundaries, temporary support access, full audit.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Customers vs staff", "separate identity providers", "Authentication"],
          ["Admins with limits", "roles checked on the server", "Authorization"],
          ["No cross-tenant leaks", "tenant id everywhere, tenant shards", "Sharding"],
          ["Support without standing access", "approved, expiring grants", "Authorization"],
          ["Accountability", "append-only audit log", "Observability"],
        ],
      },
    },
  ],
);

/* ============ After Shipping ============ */

export const RISKY_LAUNCH: CaseStudy = caseStudy(
  {
    id: "risky-launch",
    title: "Launching a risky feature with flags",
    tagline:
      "A new pricing engine changes what every customer pays. Release it to 1%, compare, and be able to switch it off in seconds.",
    minutes: 9,
    level: "intermediate",
    tier: "integrate",
    concepts: ["cicd", "testing", "observability", "caching"],
    learn: [
      "Ship code dark, behind a flag",
      "Run old and new side by side and compare",
      "Roll out by percentage with guardrails",
      "Remove the flag when done",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      title: "A new way to price every order",
      body: [
        "A grocery delivery company rewrites how delivery fees are calculated: by distance, demand and basket size. A mistake could overcharge thousands of customers or lose money on every order.",
      ],
      add: [
        node("customers", "phone", "Customers", -4.6, 0),
        node("checkout", "service", "Checkout", -1.2, 0),
        node("oldp", "service", "Old pricing", 2.4, -1.6),
        node("newp", "service", "New pricing", 2.4, 1.6, { state: "dim", badge: "off" }),
      ],
      link: [both("customers", "checkout", 3), both("checkout", "oldp", 3)],
    },
    {
      kind: "technique",
      short: "Dark",
      uses: "cicd",
      title: "Deploy dark, release later",
      body: [
        "The new engine is merged and deployed through the normal pipeline weeks before launch, switched off by a flag. Deploying (code in production) and releasing (customers affected) become separate decisions.",
      ],
      add: [node("flags", "cache", "Flags", -1.2, -2.6, { sub: "cached in each service" })],
      link: [link("flags", "checkout", "event")],
    },
    {
      kind: "technique",
      short: "Shadow",
      uses: "testing",
      title: "Shadow mode: compute both, use the old",
      body: [
        "For a week, checkout calls both engines but charges with the old one. Every difference is logged. The team finds that new fees are 40% higher for orders in one city because a map distance was in metres, not kilometres.",
      ],
      quiz: {
        question: "What does shadow mode catch that unit tests may miss?",
        options: [
          "Nothing; unit tests cover everything",
          "Differences on real orders with real data, like unit mix-ups in one city's map data",
          "Only performance problems",
        ],
        answer: 1,
        why: "Comparing old and new on live traffic tests against reality, without any customer seeing the new result.",
      },
      set: { newp: { state: "ok", badge: "shadow" } },
      link: [link("checkout", "newp", "request")],
    },
    {
      kind: "solution",
      short: "1%",
      uses: "observability",
      title: "1% → 10% → 50% → 100%, with guardrails",
      body: [
        "The flag sends 1% of customers (chosen consistently by customer id) to the new engine. Dashboards compare the two groups: average fee, conversion, cancellations, complaints. Guardrails switch the flag off automatically if conversion drops by more than 2%.",
      ],
      metrics: [
        { label: "Fee vs old", value: "+1.8%" },
        { label: "Conversion vs old", value: "−0.3%", tone: "good" },
      ],
      add: [node("mon", "monitor", "Rollout dashboard", 5.2, 0)],
      link: [link("checkout", "mon", "event")],
      set: { newp: { badge: "1%" } },
    },
    {
      kind: "technique",
      short: "Fast off",
      uses: "caching",
      title: "Turning it off takes seconds",
      body: [
        "Flags are cached inside each checkout server and updated by a push within two seconds. Switching off needs no deploy and no restart, so the decision to roll back is cheap and nobody hesitates to use it.",
      ],
    },
    {
      kind: "case",
      short: "Clean up",
      uses: "cicd",
      title: "Case: after 100%",
      body: [
        "Two weeks at 100% with no problems. The old engine, the flag and the comparison code are removed in a normal pull request; a flag left in place forever is a hidden branch nobody tests.",
      ],
      remove: ["oldp"],
      set: { newp: { badge: "100%" } },
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Big change, small risk",
      body: [
        "Deploy dark, compare in shadow, roll out by percentage, switch off in seconds, clean up.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["Separate deploy and release", "dark launch behind a flag", "CI/CD"],
          ["Catch real-world bugs", "shadow comparison", "Testing"],
          ["Know it's better", "cohort dashboards + guardrails", "Observability"],
          ["Instant rollback", "flags cached and pushed", "Caching"],
        ],
      },
    },
  ],
);

/* ============ Whole systems ============ */

export const MAPS_NAVIGATION: CaseStudy = caseStudy(
  {
    id: "maps-navigation",
    title: "Capstone: a maps and navigation service",
    tagline:
      "Maps for a whole country, live traffic, and turn-by-turn routes for millions of drivers. Design it from tiles to traffic.",
    minutes: 16,
    level: "advanced",
    tier: "capstone",
    concepts: [
      "hld-lld",
      "napkin-math",
      "cdn",
      "caching",
      "sharding",
      "batch-stream",
      "realtime",
      "pubsub",
      "apis",
      "redundancy",
      "observability",
    ],
    learn: [
      "Serve the map as cached tiles",
      "Shard road data by region",
      "Turn driver pings into live traffic",
      "Compute routes fast and reroute on the way",
    ],
  },
  [
    {
      kind: "setup",
      short: "The brief",
      uses: "hld-lld",
      title: "Requirements",
      body: [
        "Functional: browse a map at any zoom, search places, get a route with an arrival time, follow turn-by-turn directions, reroute around traffic.",
        "Non-functional: the map scrolls smoothly on mobile data; routes in under a second; traffic no more than 2 minutes old; works for 20 million daily users.",
      ],
      add: [
        node("drivers", "phone", "Drivers & riders", -4.6, 0, { sub: "20 M daily" }),
        node("api", "gateway", "Maps API", -1.4, 0),
      ],
      link: [both("drivers", "api", 3)],
    },
    {
      kind: "technique",
      short: "Numbers",
      uses: "napkin-math",
      title: "How big?",
      body: [
        "Map tiles: a country at 18 zoom levels is billions of possible tiles, but people look at a few million. Traffic: 2 million drivers navigating at peak, each sending a location every 5 seconds = **400,000 pings a second**.",
      ],
      metrics: [
        { label: "Pings", value: "≈ 400,000 /s" },
        { label: "Route requests", value: "≈ 5,000 /s at peak" },
      ],
    },
    {
      kind: "solution",
      short: "Tiles",
      uses: "cdn",
      title: "The map is a grid of tiles at the edge",
      body: [
        "The map is cut into square tiles per zoom level, each a small file with its own address (`/tiles/14/11702/7380`). Tiles change rarely, so they're served from CDN edges near users; the phone only fetches tiles it doesn't already have.",
      ],
      add: [
        node("cdn", "cdn", "Tile CDN", -3, -2.6),
        node("tiles", "storage", "Pre-rendered tiles", 0.6, -2.6),
      ],
      link: [
        link("drivers", "cdn", "request", { kind: "heavy", back: true, rate: 3 }),
        link("tiles", "cdn", "copy"),
      ],
    },
    {
      kind: "technique",
      short: "Regions",
      uses: "sharding",
      title: "Road data sharded by region",
      body: [
        "The road graph (junctions and road segments) is split into geographic cells. Each routing server holds a few neighbouring cells in memory; long routes use a smaller highway-only graph to connect regions, then detailed cells at each end.",
      ],
      add: [node("graph", "db", "Road graph shards", 2.6, 0, { sub: "by region cell" })],
      link: [both("api", "graph", 2)],
    },
    {
      kind: "solution",
      short: "Pings",
      uses: "pubsub",
      title: "Driver pings onto a stream",
      body: [
        "Navigating phones send their location and speed every 5 seconds (anonymised). Pings are published to a stream partitioned by region cell, so each cell's traffic is processed together.",
      ],
      add: [node("pings", "stream", "Location stream", -1.4, 2.6, { sub: "by region cell" })],
      link: [link("drivers", "pings", { kind: "event", rate: 4 })],
    },
    {
      kind: "technique",
      short: "Traffic",
      uses: "batch-stream",
      title: "Live traffic from the stream, typical traffic from batch",
      body: [
        "A stream job turns pings into the current speed on each road segment, updated every minute. A nightly batch job computes typical speeds by hour and weekday from months of history, used to predict arrival times for trips later in the day.",
      ],
      quiz: {
        question:
          "A trip starts now and takes 2 hours. Which speeds should the last hour of it use?",
        options: [
          "Live speeds only",
          "A blend: live speeds near the start, typical speeds for that hour further along",
          "Speed limits",
        ],
        answer: 1,
        why: "Live traffic is accurate now but says little about roads you'll reach in 90 minutes; historical patterns fill that gap.",
      },
      add: [
        node("live", "worker", "Live traffic job", 1.6, 2.6),
        node("speeds", "cache", "Segment speeds", 4.2, 2.6, { sub: "updated every minute" }),
      ],
      link: [
        link("pings", "live", { kind: "event", rate: 3 }),
        link("live", "speeds", "write"),
        link("speeds", "graph", "request"),
      ],
    },
    {
      kind: "technique",
      short: "Routes",
      uses: "apis",
      title: "A route API built for phones",
      body: [
        "`POST /routes` returns two or three alternatives, each with the path, arrival time and turn instructions, compressed into a few kilobytes. The phone keeps the route and only asks again if the driver leaves it or traffic changes.",
      ],
    },
    {
      kind: "solution",
      short: "Cache",
      uses: "caching",
      title: "Cache popular routes and places",
      body: [
        '"Airport to city centre" is requested thousands of times an hour. Popular routes are cached for a minute with current traffic applied; place search results ("petrol near me") are cached per area.',
      ],
      add: [node("rcache", "cache", "Route cache", -1.4, -4.2, { sub: "1 min" })],
      link: [both("api", "rcache", 3)],
    },
    {
      kind: "solution",
      short: "Reroute",
      uses: "realtime",
      title: "Rerouting on the way",
      body: [
        'While navigating, the phone keeps a connection open. When traffic on the driver\'s upcoming roads gets much worse, the server pushes "faster route available, saves 8 minutes" without the phone polling.',
      ],
      link: [link("api", "drivers", { kind: "event", rate: 1 })],
    },
    {
      kind: "solution",
      short: "Offline",
      uses: "redundancy",
      title: "When the network or a region fails",
      body: [
        "Phones keep tiles and the current route offline, so navigation continues through tunnels and dead zones. Routing servers run in two regions with the same graph data; if one fails, routes come from the other with slightly older traffic.",
      ],
    },
    {
      kind: "technique",
      short: "Watch",
      uses: "observability",
      title: "Measure arrival-time accuracy",
      body: [
        "The most important number is how close predicted arrival times are to actual ones. It's tracked by city and hour; a sudden drop in one city usually means bad traffic data or a road change not yet in the map.",
      ],
      metrics: [
        { label: "Arrival within ±10%", value: "91%", tone: "good" },
        { label: "Route p95", value: "420 ms", tone: "good" },
      ],
      add: [node("mon", "monitor", "Accuracy dashboard", 4.2, -2.6)],
      link: [link("api", "mon", "event")],
    },
    {
      kind: "recap",
      short: "Recap",
      title: "The whole maps service",
      body: [
        "Tiles at the edge, roads by region, traffic from streams and history, routes that adapt.",
      ],
      table: {
        head: ["Need", "Decision", "Lesson"],
        rows: [
          ["What to build", "requirements first", "HLD and LLD"],
          ["Size", "≈ 400,000 pings a second", "Napkin math"],
          ["Smooth map", "tiles on a CDN", "CDNs"],
          ["Road graph", "sharded by region cell", "Sharding"],
          ["Pings in", "location stream by cell", "Pub/sub"],
          ["Traffic", "live stream + nightly history", "Batch and stream"],
          ["Routes for phones", "compact route API", "APIs"],
          ["Popular trips", "route and place caches", "Caching"],
          ["Reroute", "server push", "Real-time updates"],
          ["Failures", "offline data, two regions", "Redundancy"],
          ["Quality", "arrival-time accuracy", "Observability"],
        ],
      },
    },
  ],
);
