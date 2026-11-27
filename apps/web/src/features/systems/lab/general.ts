/*
 * General checks for problems learners write themselves. They look only at the shape of a
 * design, so each says when it applies; a check that doesn't fit the design is left out of the
 * score. Whether the design actually solves the problem is a question for a reviewer.
 */
import type { NodeKind } from "../model";
import { check, either } from "./kit";
import type { Check, Design } from "./model";
import {
  CLIENTS,
  COMPUTE,
  count,
  guarded,
  has,
  kinds,
  linked,
  matches,
  MESSAGING,
  noSharedStore,
  onlyVia,
} from "./rules";

const DATA = kinds("db", "storage", "search", "vector");
const CODE = kinds("server", "service", "worker", "agent");
const FRONT = kinds("lb", "gateway", "cdn");

/** Every box has at least one link, and there are at least two boxes. */
function allConnected(d: Design): boolean {
  if (d.nodes.length < 2) return false;
  const linkedIds = new Set(d.links.flatMap((l) => [l.from, l.to]));
  return d.nodes.every((n) => linkedIds.has(n.id));
}

/** Every box of `kind` is fed by a queue, stream or file drop over a send-and-move-on link. */
function eachFedAsync(d: Design, kind: NodeKind): boolean {
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const own = d.nodes.filter((n) => n.kind === kind);
  return (
    own.length > 0 &&
    own.every((w) =>
      d.links.some((l) => {
        if (l.mode !== "async") return false;
        const other = l.from === w.id ? byId.get(l.to) : l.to === w.id ? byId.get(l.from) : null;
        return !!other && matches(other, MESSAGING);
      }),
    )
  );
}

export const GENERAL_CHECKS: readonly Check[] = [
  check(
    "connected",
    "Every box is connected",
    "A box with no connections does nothing. Connect it, or remove it.",
    15,
    allConnected,
  ),
  check(
    "users",
    "Someone uses the system",
    "Add the people or apps that use the system (users, a mobile app or a web browser) and connect them.",
    10,
    (d) => has(d, CLIENTS) && linked(d, CLIENTS, { kinds: d.nodes.map((n) => n.kind) }),
  ),
  {
    ...check(
      "front",
      "Users reach your servers through a front door",
      "Put a load balancer, an API gateway or a CDN between users and your servers, so you can add servers, limit traffic and check requests in one place.",
      15,
      (d) => guarded(d, CLIENTS, COMPUTE, FRONT),
    ),
    applies: (d) => has(d, COMPUTE),
  },
  {
    ...check(
      "spare",
      "More than one copy of the app",
      "With a single server or service, one failure stops everything. Run at least two.",
      15,
      (d) => count(d, COMPUTE) >= 2,
    ),
    applies: (d) => has(d, COMPUTE),
  },
  {
    ...check(
      "data",
      "Users reach stored data only through your code",
      "Users should never talk to a database or file store directly. Route them through a server, service, worker or agent.",
      15,
      (d) => guarded(d, CLIENTS, DATA, CODE),
    ),
    applies: (d) => has(d, DATA),
  },
  {
    ...check(
      "async",
      "Background workers take work from a queue",
      "Feed each worker from a queue, stream or file drop with a send-and-move-on link, so slow work never holds up a user.",
      10,
      (d) => eachFedAsync(d, "worker"),
    ),
    applies: (d) => has(d, kinds("worker")),
  },
  {
    ...check(
      "shared",
      "Services don't share a database",
      "Give each service its own database, and share data through APIs or events instead.",
      10,
      (d) => noSharedStore(d, kinds("service"), kinds("db")),
    ),
    applies: (d) => count(d, kinds("service")) >= 2 && has(d, kinds("db")),
  },
  {
    ...check(
      "ai",
      "The AI model is reached only through a gateway",
      "Connect the AI model only to a gateway, which holds the keys, limits use and logs every call.",
      10,
      (d) => onlyVia(d, kinds("llm"), kinds("gateway")),
    ),
    applies: (d) => has(d, kinds("llm")),
  },
  {
    ...check(
      "legacy",
      "The mainframe sits behind one door",
      "Connect the mainframe only to a service, worker, queue or file drop, never to users or many apps directly.",
      10,
      (d) =>
        onlyVia(
          d,
          kinds("mainframe"),
          either(kinds("service", "server", "worker", "files"), MESSAGING),
        ),
    ),
    applies: (d) => has(d, kinds("mainframe")),
  },
  check(
    "watch",
    "Monitoring is connected",
    "Add monitoring and connect it to the parts you most need to watch.",
    10,
    (d) => linked(d, kinds("monitor"), { kinds: d.nodes.map((n) => n.kind) }),
  ),
];
