/* Design Lab problems for the legacy-integration and AI-systems modules. */
import { a, check, DB, either, n, named, pal, s } from "./kit";
import type { LabProblem } from "./model";
import {
  CLIENTS,
  guarded,
  kinds,
  linked,
  linkedFrom,
  MESSAGING,
  onlyVia,
  reaches,
  role,
} from "./rules";

const MAINFRAME = kinds("mainframe");
const MODEL = kinds("llm");
const MONITOR = kinds("monitor");

/* ---------- Balances from the mainframe ---------- */

const ACCOUNTS = role("accounts");

const MAINFRAME_BALANCES: LabProblem = {
  id: "mainframe-balances",
  title: "Balances from the mainframe",
  tagline: "A new mobile app for five million customers, on a core that can't take much more load.",
  level: "intermediate",
  minutes: 14,
  brief: [
    "A bank's accounts live on a mainframe that also serves every branch. The bank is launching a mobile app: customers will check balances many times a day and make payments.",
    "The core team allows the app a fixed number of transactions a second. The core uses old record formats and status codes that new apps should never see.",
  ],
  requirements: [
    "Customers never talk to the core directly",
    "Only one service knows the core's formats",
    "Most balance checks must not reach the core",
    "Payments must not be lost or paid twice, even while the core is busy",
  ],
  palette: [
    ...pal("phone", "browser", "gateway", "server"),
    named("service", "accounts", "Accounts API", "The one service allowed to call the core"),
    ...pal("cache", "queue", "mainframe", "db", "worker", "monitor"),
  ],
  checks: [
    check(
      "front",
      "Customers reach the core only through the gateway",
      "Put an API gateway between the apps and everything behind them.",
      15,
      (d) => guarded(d, CLIENTS, MAINFRAME, kinds("gateway")),
    ),
    check(
      "facade",
      "Only the Accounts API (or its queue) talks to the core",
      "Connect the mainframe only to the Accounts API and to a queue the Accounts API feeds.",
      20,
      (d) => onlyVia(d, MAINFRAME, either(ACCOUNTS, MESSAGING)) && reaches(d, ACCOUNTS, MAINFRAME),
    ),
    check(
      "gw",
      "Apps reach the Accounts API through the gateway",
      "Link the gateway to the Accounts API, so per-customer limits and sign-in checks apply.",
      15,
      (d) => guarded(d, CLIENTS, ACCOUNTS, kinds("gateway")),
    ),
    check(
      "cache",
      "Balances are cached next to the Accounts API",
      "Connect a cache to the Accounts API so repeat balance checks never reach the core.",
      20,
      (d) => linked(d, ACCOUNTS, kinds("cache")),
    ),
    check(
      "queue",
      "Payments travel to the core through a queue",
      "Have the Accounts API send payments to a queue (send and move on), and the core read from it.",
      20,
      (d) => linked(d, ACCOUNTS, MESSAGING, "async") && linked(d, MESSAGING, MAINFRAME, "async"),
    ),
    check(
      "watch",
      "Monitoring watches the Accounts API",
      "Connect monitoring to the Accounts API to track core calls against the budget.",
      10,
      (d) => linked(d, MONITOR, ACCOUNTS),
    ),
  ],
  answer: {
    nodes: [
      n("app", "phone", "Mobile app", 0, 3),
      n("gw", "gateway", "API gateway", 2, 3),
      n("acc", "service", "Accounts API", 5, 3, "accounts"),
      n("cache", "cache", "Balance cache", 5, 1),
      n("q", "queue", "Payment queue", 7, 5),
      n("core", "mainframe", "Core banking", 9, 3),
      n("mon", "monitor", "Core budget", 4, 6),
    ],
    links: [
      s("app", "gw"),
      s("gw", "acc"),
      s("acc", "cache"),
      s("acc", "core"),
      a("acc", "q"),
      a("q", "core"),
      a("acc", "mon"),
    ],
  },
  explain: [
    "The Accounts API is a façade: the only caller of the core, and the only code that knows its formats.",
    "A short-lived balance cache answers most checks, so the core stays within its budget.",
    "Payments go through the core's queue with unique keys, so they wait safely during the nightly batch and are never paid twice.",
    "The gateway signs customers in and limits each one; monitoring shows core calls against the budget.",
  ],
  concepts: ["mainframes", "api-facade", "caching", "rate-limiting"],
  caseId: "mobile-banking-core",
};

/* ---------- Nightly files from partners ---------- */

const LOADER = role("loader");

const PARTNER_FILES: LabProblem = {
  id: "partner-files",
  title: "Nightly files from partners",
  tagline: "Forty garages send claim files every night. Load them safely, every time.",
  level: "beginner",
  minutes: 10,
  brief: [
    "An insurer's partner garages each send a file of repair claims every night. The files must be loaded into the claims database before staff arrive.",
    "Files sometimes arrive half-written, get sent twice, contain bad rows, or don't arrive at all.",
  ],
  requirements: [
    "Partners never write to the database themselves",
    "The original files are kept exactly as received",
    "One bad row must not stop the rest of the file",
    "Someone hears about a missing or late file",
  ],
  palette: [
    { kind: "internet", label: "Partners", hint: "The garages sending files" },
    ...pal("files"),
    named("worker", "loader", "Loader", "Picks up each finished file, checks it and loads it"),
    ...pal("db", "storage", "queue", "stream", "service", "monitor"),
  ],
  checks: [
    check(
      "drop",
      "Partners send files to a drop folder",
      "Link the partners to a file drop: they leave files there and move on.",
      15,
      (d) => linkedFrom(d, kinds("internet"), kinds("files")),
    ),
    check(
      "loader",
      "A loader picks files up from the drop",
      "Connect the file drop to the loader.",
      15,
      (d) => linked(d, kinds("files"), LOADER),
    ),
    check(
      "guard",
      "Partners reach the database only through the loader",
      "Make sure every path from the partners to the database passes the loader.",
      20,
      (d) => guarded(d, kinds("internet"), DB, LOADER),
    ),
    check(
      "archive",
      "Original files are archived",
      "Copy each file, untouched, to file storage before loading it.",
      15,
      (d) => linked(d, either(kinds("files"), LOADER), kinds("storage")),
    ),
    check(
      "rejects",
      "Bad rows go to a queue for people to fix",
      "Have the loader send bad rows to a queue, so the good rows still load.",
      15,
      (d) => linkedFrom(d, LOADER, kinds("queue")),
    ),
    check(
      "watch",
      "Monitoring watches the files and the loader",
      "Connect monitoring to the loader or the drop, to alert on late or short files.",
      20,
      (d) => linked(d, MONITOR, either(LOADER, kinds("files"))),
    ),
  ],
  answer: {
    nodes: [
      n("partners", "internet", "Partners", 0, 3),
      n("drop", "files", "Drop folder", 3, 3),
      n("loader", "worker", "Loader", 6, 3, "loader"),
      n("db", "db", "Claims DB", 9, 3),
      n("arch", "storage", "Archive", 6, 1),
      n("rej", "queue", "Rows to fix", 8, 5),
      n("mon", "monitor", "File watch", 5, 6),
    ],
    links: [
      a("partners", "drop"),
      a("drop", "loader"),
      s("loader", "arch"),
      s("loader", "db"),
      a("loader", "rej"),
      a("loader", "mon"),
    ],
  },
  explain: [
    "Partners only ever drop files; the loader is the one thing that writes to the database.",
    "Each original is archived before loading, as evidence and so a file can be loaded again.",
    "Writes are keyed by claim number, so reloading a file is harmless; bad rows wait in a queue for a person.",
    "A watcher expects each partner's file by a set time and alerts when it's late or much smaller than usual.",
  ],
  concepts: ["file-batch", "queues", "observability"],
  caseId: "claims-files",
};

/* ---------- Swap the order system, gradually ---------- */

const ROUTER = role("router");
const LEGACY = role("legacy");
const OLD_DB = role("olddb");
const ORDERS = role("orders");
const NEW_DB = role("newdb");
const CAPTURE = role("capture");

const STRANGLER_ORDERS: LabProblem = {
  id: "strangler-orders",
  title: "Swap the order system, gradually",
  tagline: "Replace a 20-year-old order system without ever switching everything at once.",
  level: "advanced",
  minutes: 15,
  brief: [
    "A retailer wants to replace its old order system with new services, one feature at a time, starting with order tracking.",
    "The old system can't be changed safely, and the new service must not share the old database.",
  ],
  requirements: [
    "Each request can be sent to the old or the new system, and switched back in seconds",
    "The new service has its own database",
    "Changes in the old database reach the new service without changing old code",
    "You can compare old and new while traffic moves",
  ],
  palette: [
    ...pal("browser"),
    named("gateway", "router", "Routing proxy", "Decides which system handles each request"),
    named("server", "legacy", "Old order system", "The system being replaced"),
    named("db", "olddb", "Old database", "The old system's database"),
    named("service", "orders", "New orders service", "The new service, one feature at a time"),
    named("db", "newdb", "New orders DB", "The new service's own database"),
    named("worker", "capture", "Change capture", "Reads the old database's change log"),
    ...pal("stream", "queue", "monitor"),
  ],
  checks: [
    check(
      "front",
      "Shoppers reach both systems only through the routing proxy",
      "Put the routing proxy in front, and remove any direct link from shoppers to either system.",
      20,
      (d) => guarded(d, CLIENTS, either(LEGACY, ORDERS), ROUTER),
    ),
    check(
      "both",
      "The proxy can route to old and new",
      "Link the routing proxy to the old order system and to the new orders service.",
      15,
      (d) => linked(d, ROUTER, LEGACY) && linked(d, ROUTER, ORDERS),
    ),
    check(
      "owns",
      "The new service owns its own database",
      "Link the new service to the new database only, and keep the old system away from it.",
      15,
      (d) => linked(d, ORDERS, NEW_DB) && !linked(d, ORDERS, OLD_DB) && !linked(d, LEGACY, NEW_DB),
    ),
    check(
      "capture",
      "Old database changes are captured onto a stream",
      "Connect change capture to the old database, and have it send events to a stream.",
      20,
      (d) => linked(d, CAPTURE, OLD_DB) && linked(d, CAPTURE, MESSAGING, "async"),
    ),
    check(
      "reads",
      "The new service reads the stream",
      "Link the stream to the new orders service, as send-and-move-on.",
      15,
      (d) => linked(d, MESSAGING, ORDERS, "async"),
    ),
    check(
      "watch",
      "Monitoring watches the routing proxy",
      "Connect monitoring to the proxy to compare errors and speed as traffic shifts.",
      15,
      (d) => linked(d, MONITOR, ROUTER),
    ),
  ],
  answer: {
    nodes: [
      n("shop", "browser", "Shoppers", 0, 3),
      n("proxy", "gateway", "Routing proxy", 2, 3, "router"),
      n("old", "server", "Old order system", 5, 1, "legacy"),
      n("odb", "db", "Old database", 8, 1, "olddb"),
      n("orders", "service", "New orders service", 5, 5, "orders"),
      n("ndb", "db", "New orders DB", 8, 5, "newdb"),
      n("cap", "worker", "Change capture", 10, 2, "capture"),
      n("stream", "stream", "Order changes", 10, 4),
      n("mon", "monitor", "Compare & watch", 2, 6),
    ],
    links: [
      s("shop", "proxy"),
      s("proxy", "old"),
      s("proxy", "orders"),
      s("old", "odb"),
      s("orders", "ndb"),
      s("cap", "odb"),
      a("cap", "stream"),
      a("stream", "orders"),
      a("proxy", "mon"),
    ],
  },
  explain: [
    "The routing proxy goes in first, so every feature can move to the new service, and back, with a setting.",
    "The new service keeps its own database; nothing new reads the old tables directly.",
    "Change capture reads the old database's log and publishes each change, so the old code is untouched.",
    "Monitoring at the proxy compares old and new while traffic moves in small steps.",
  ],
  concepts: ["strangler-fig", "change-data-capture", "microservices"],
  caseId: "orders-strangler",
};

/* ---------- A help assistant with sources ---------- */

const ASSISTANT = role("assistant");
const LLM_GW = role("llmgw");
const INDEXER = role("indexer");

const HELP_ASSISTANT: LabProblem = {
  id: "help-assistant",
  title: "A help assistant with sources",
  tagline: "Answer customers from your own help articles, and show where each answer came from.",
  level: "intermediate",
  minutes: 14,
  brief: [
    "A software company wants an assistant on its website that answers questions from its 2,000 help articles, citing the articles it used.",
    "Articles change every week. Model calls cost money and need keys, limits and logs.",
  ],
  requirements: [
    "Answers come from the help articles, not the model's memory",
    "Edited articles are reflected within minutes",
    "Every model call is controlled and logged in one place",
    "Customers never reach the model directly",
  ],
  palette: [
    ...pal("browser", "gateway"),
    named("service", "assistant", "Assistant", "Takes each question and builds the answer"),
    named("gateway", "llmgw", "LLM gateway", "Keys, limits, logs and fallbacks for model calls"),
    ...pal("llm", "vector"),
    { kind: "storage", label: "Help articles", hint: "The articles the answers must come from" },
    named(
      "worker",
      "indexer",
      "Indexer",
      "Splits articles into chunks and stores their embeddings",
    ),
    ...pal("cache", "queue", "db", "monitor"),
  ],
  checks: [
    check(
      "gw",
      "The model is called only through the LLM gateway",
      "Connect the AI model to the LLM gateway and nothing else.",
      20,
      (d) => onlyVia(d, MODEL, LLM_GW),
    ),
    check(
      "users",
      "Customers reach the model only through the assistant",
      "Make every path from customers to the model pass through the assistant.",
      15,
      (d) => guarded(d, CLIENTS, MODEL, ASSISTANT),
    ),
    check(
      "retrieve",
      "The assistant searches a vector database",
      "Link the assistant to a vector database to fetch the relevant chunks before asking the model.",
      20,
      (d) => linked(d, ASSISTANT, kinds("vector")),
    ),
    check(
      "index",
      "An indexer reads the articles and writes the vectors",
      "Connect the indexer to the help articles, and from the indexer to the vector database.",
      25,
      (d) => linked(d, INDEXER, kinds("storage")) && linkedFrom(d, INDEXER, kinds("vector")),
    ),
    check(
      "cache",
      "Repeat questions can be answered from a cache",
      "Connect a cache to the assistant or the LLM gateway.",
      10,
      (d) => linked(d, either(ASSISTANT, LLM_GW), kinds("cache")),
    ),
    check(
      "watch",
      "Monitoring tracks cost and speed at the LLM gateway",
      "Connect monitoring to the LLM gateway.",
      10,
      (d) => linked(d, MONITOR, LLM_GW),
    ),
  ],
  answer: {
    nodes: [
      n("cust", "browser", "Customers", 0, 3),
      n("asst", "service", "Assistant", 3, 3, "assistant"),
      n("cache", "cache", "Answer cache", 3, 1),
      n("llmgw", "gateway", "LLM gateway", 6, 3, "llmgw"),
      n("model", "llm", "AI model", 9, 3),
      n("mon", "monitor", "Cost & speed", 6, 1),
      n("vec", "vector", "Article index", 3, 6),
      n("idx", "worker", "Indexer", 6, 6, "indexer"),
      n("docs", "storage", "Help articles", 9, 6),
    ],
    links: [
      s("cust", "asst"),
      s("asst", "cache"),
      s("asst", "llmgw"),
      s("llmgw", "model"),
      a("llmgw", "mon"),
      s("asst", "vec"),
      s("idx", "docs"),
      s("idx", "vec"),
    ],
  },
  explain: [
    "The assistant retrieves the best chunks from the vector database and asks the model to answer only from them, with citations.",
    "An indexer keeps the vector database in step with the articles, re-embedding what changed.",
    "Every model call goes through the LLM gateway, which holds keys, limits each team, logs cost and falls back if a model fails.",
    "A cache answers repeat questions, keyed by the article versions the answer used.",
  ],
  concepts: ["rag", "llm-calls", "caching"],
  caseId: "help-centre-assistant",
};

/* ---------- An agent that books ---------- */

const TOOLS = role("tools");
const FLIGHTS = role("flights");
const PAYMENTS = role("payments");
const APPROVAL = role("approval");
const AGENT = kinds("agent");

const BOOKING_AGENT: LabProblem = {
  id: "booking-agent",
  title: "An agent that books",
  tagline: "An AI agent that finds and books flights, safely, with the traveller in control.",
  level: "advanced",
  minutes: 15,
  brief: [
    "A travel app adds an agent: travellers describe what they want, and the agent searches flights, holds seats and books them.",
    "The agent decides what to do using an AI model. Booking charges the traveller's card and can't be undone by the agent.",
  ],
  requirements: [
    "The agent reaches other systems only through tools it is given",
    "Nothing is charged without the traveller confirming",
    "Model calls are controlled and logged in one place",
    "Every tool call can be reviewed later",
  ],
  palette: [
    ...pal("phone", "gateway", "agent"),
    named("gateway", "llmgw", "LLM gateway", "Keys, limits, logs and fallbacks for model calls"),
    ...pal("llm"),
    named(
      "service",
      "tools",
      "Tool server",
      "Offers the agent's tools through one standard protocol",
    ),
    named("service", "flights", "Flights", "Searches flights and seats"),
    named("service", "payments", "Payments", "Charges the traveller's card"),
    named("service", "approval", "Approval step", "Waits for the traveller to confirm"),
    ...pal("db", "queue", "monitor"),
  ],
  checks: [
    check(
      "model",
      "The agent uses the model through the LLM gateway",
      "Link the agent to the LLM gateway, and the model only to the gateway.",
      15,
      (d) => onlyVia(d, MODEL, LLM_GW) && linked(d, AGENT, LLM_GW),
    ),
    check(
      "tools",
      "The agent reaches flights and payments only through the tool server",
      "Put the tool server between the agent and the systems it acts on.",
      20,
      (d) => guarded(d, AGENT, either(FLIGHTS, PAYMENTS), TOOLS),
    ),
    check(
      "approve",
      "Payments happen only after the approval step",
      "Route every path to Payments through the approval step.",
      20,
      (d) => guarded(d, AGENT, PAYMENTS, APPROVAL),
    ),
    check(
      "front",
      "Travellers reach the agent through the API gateway",
      "Put an API gateway between the app and the agent.",
      15,
      (d) => guarded(d, CLIENTS, AGENT, kinds("gateway")),
    ),
    check(
      "memory",
      "The agent saves its progress",
      "Connect the agent to a database so an interrupted task can resume.",
      10,
      (d) => linked(d, AGENT, DB),
    ),
    check("audit", "Every tool call is logged", "Connect monitoring to the tool server.", 20, (d) =>
      linked(d, MONITOR, TOOLS),
    ),
  ],
  answer: {
    nodes: [
      n("app", "phone", "Travel app", 0, 3),
      n("gw", "gateway", "API gateway", 2, 3),
      n("agent", "agent", "Booking agent", 4, 3),
      n("llmgw", "gateway", "LLM gateway", 4, 1, "llmgw"),
      n("model", "llm", "AI model", 7, 1),
      n("state", "db", "Task state", 2, 6),
      n("tools", "service", "Tool server", 7, 4, "tools"),
      n("flights", "service", "Flights", 10, 3, "flights"),
      n("ok", "service", "Approval step", 9, 6, "approval"),
      n("pay", "service", "Payments", 11, 6, "payments"),
      n("log", "monitor", "Audit log", 6, 7),
    ],
    links: [
      s("app", "gw"),
      s("gw", "agent"),
      s("agent", "llmgw"),
      s("llmgw", "model"),
      s("agent", "state"),
      s("agent", "tools"),
      s("tools", "flights"),
      s("tools", "ok"),
      s("ok", "pay"),
      a("tools", "log"),
    ],
  },
  explain: [
    "The agent only chooses; the tool server runs each tool, so it decides what the agent is allowed to do.",
    "Anything that charges money passes an approval step that the traveller confirms, which the model can't skip.",
    "Model calls go through the LLM gateway for keys, budgets and fallbacks; task state is saved after each step.",
    "Every tool call is logged with its inputs, result and approval, so any booking can be explained later.",
  ],
  concepts: ["ai-agents", "guardrails", "llm-calls"],
  caseId: "rebooking-agent",
};

export const INTEGRATION_PROBLEMS: readonly LabProblem[] = [
  MAINFRAME_BALANCES,
  PARTNER_FILES,
  STRANGLER_ORDERS,
  HELP_ASSISTANT,
  BOOKING_AGENT,
];
