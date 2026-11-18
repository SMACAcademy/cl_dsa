import { DsPlayer } from "./DsPlayer";
import { cmd, V, type OpForm } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";
import { ChainView, type ChainNode, type NodeState } from "./views";

export const SINGLY_CODE: readonly string[] = [
  "class Node:",
  "    def __init__(self, value, next=None):",
  "        self.value, self.next = value, next",
  "",
  "def insert_after(node, x):",
  "    new = Node(x, node.next)",
  "    node.next = new",
  "",
  "def add_first(head, x):",
  "    return Node(x, head)",
  "",
  "def delete(head, x):",
  "    if head.value == x:",
  "        return head.next",
  "    prev = head",
  "    while prev.next and prev.next.value != x:",
  "        prev = prev.next",
  "    if prev.next:",
  "        prev.next = prev.next.next",
  "    return head",
  "",
  "def find(head, x):",
  "    cur = head",
  "    while cur and cur.value != x:",
  "        cur = cur.next",
  "    return cur",
];

export const DOUBLY_CODE: readonly string[] = [
  "class Node:",
  "    def __init__(self, value):",
  "        self.value = value",
  "        self.prev = self.next = None",
  "",
  "def delete(node):",
  "    if node.prev:",
  "        node.prev.next = node.next",
  "    if node.next:",
  "        node.next.prev = node.prev",
  "",
  "def add_last(tail, x):",
  "    new = Node(x)",
  "    new.prev, tail.next = tail, new",
  "    return new",
  "",
  "def add_first(head, x):",
  "    new = Node(x)",
  "    new.next, head.prev = head, new",
  "    return new",
];

export type ListOp =
  | { kind: "addFirst"; x: string }
  | { kind: "addLast"; x: string }
  | { kind: "insertAfter"; x: string; y: string }
  | { kind: "delete"; x: string }
  | { kind: "find"; x: string };

export const SINGLY_FORMS: readonly OpForm<ListOp>[] = [
  { pattern: cmd(`add-first ${V}`), build: (m) => ({ kind: "addFirst", x: m[1] as string }) },
  {
    pattern: cmd(`insert ${V} after ${V}`),
    build: (m) => ({ kind: "insertAfter", x: m[1] as string, y: m[2] as string }),
  },
  { pattern: cmd(`delete ${V}`), build: (m) => ({ kind: "delete", x: m[1] as string }) },
  { pattern: cmd(`find ${V}`), build: (m) => ({ kind: "find", x: m[1] as string }) },
];

export const DOUBLY_FORMS: readonly OpForm<ListOp>[] = [
  { pattern: cmd(`add-first ${V}`), build: (m) => ({ kind: "addFirst", x: m[1] as string }) },
  { pattern: cmd(`add-last ${V}`), build: (m) => ({ kind: "addLast", x: m[1] as string }) },
  { pattern: cmd(`delete ${V}`), build: (m) => ({ kind: "delete", x: m[1] as string }) },
];

export type ListState = {
  nodes: readonly ChainNode[];
  marks: Readonly<Record<number, NodeState>>;
  pointers: Readonly<Record<number, readonly string[]>>;
  pending: { value: string; next: string | null; prev?: string | null } | null;
};

/** Shared bookkeeping for both list kinds. */
function makeList(start: readonly string[]) {
  let nextId = 0;
  const nodes: ChainNode[] = start.map((value) => ({ id: nextId++, value }));
  let marks: Record<number, NodeState> = {};
  let pointers: Record<number, string[]> = {};
  let pending: ListState["pending"] = null;
  const log = new StepLog<ListState>(() => ({
    nodes: nodes.map((n) => ({ ...n })),
    marks: { ...marks },
    pointers: Object.fromEntries(Object.entries(pointers).map(([k, v]) => [k, [...v]])),
    pending: pending ? { ...pending } : null,
  }));
  return {
    nodes,
    log,
    newId: () => nextId++,
    set(m: Record<number, NodeState>, p: Record<number, string[]> = {}, pend = pending) {
      marks = m;
      pointers = p;
      pending = pend;
    },
    clear() {
      marks = {};
      pointers = {};
      pending = null;
    },
    values: () => nodes.map((n) => n.value),
  };
}

const valueOrNone = (n: ChainNode | undefined) => n?.value ?? "None";

export function singlyListSteps(start: readonly string[], ops: readonly ListOp[]) {
  const L = makeList(start);
  const { nodes, log } = L;
  log.add(0, "start", { list: pyList(L.values()) });

  /** Walks from the head looking for x; returns its index or -1. */
  const walk = (x: string, line: number): number => {
    for (let k = 0; k < nodes.length; k++) {
      const node = nodes[k] as ChainNode;
      const hit = node.value === x;
      L.set({ [node.id]: hit ? "found" : "current" }, { [node.id]: ["cur"] });
      log.add(line, hit ? "walkHit" : "walkMiss", { value: node.value, x });
      if (hit) return k;
    }
    return -1;
  };

  for (const op of ops) {
    L.clear();
    if (op.kind === "addFirst") {
      const head = nodes[0];
      L.set({}, {}, { value: op.x, next: valueOrNone(head) });
      log.add(10, "createFirst", { x: op.x, next: valueOrNone(head) });
      const id = L.newId();
      nodes.unshift({ id, value: op.x });
      L.set({ [id]: "new" }, {}, null);
      log.add(10, "linkHead", { x: op.x, list: pyList(L.values()) });
    } else if (op.kind === "insertAfter") {
      const k = walk(op.y, 24);
      if (k < 0) {
        L.clear();
        log.add(26, "afterMissing", { y: op.y });
        continue;
      }
      const node = nodes[k] as ChainNode;
      const next = valueOrNone(nodes[k + 1]);
      L.set({ [node.id]: "current" }, { [node.id]: ["node"] }, { value: op.x, next });
      log.add(6, "create", { x: op.x, next });
      const id = L.newId();
      nodes.splice(k + 1, 0, { id, value: op.x });
      L.set({ [node.id]: "changed", [id]: "new" }, { [node.id]: ["node"] }, null);
      log.add(7, "link", { y: op.y, x: op.x, list: pyList(L.values()) });
    } else if (op.kind === "delete" || op.kind === "find") {
      if (nodes.length === 0) {
        log.add(op.kind === "delete" ? 13 : 24, "emptyList", { x: op.x });
        continue;
      }
      if (op.kind === "find") {
        const k = walk(op.x, 24);
        L.clear();
        if (k >= 0) {
          const node = nodes[k] as ChainNode;
          L.set({ [node.id]: "found" }, { [node.id]: ["cur"] });
          log.add(26, "findHit", { x: op.x, steps: k + 1 });
        } else {
          log.add(26, "findMiss", { x: op.x, steps: nodes.length });
        }
        continue;
      }
      const head = nodes[0] as ChainNode;
      if (head.value === op.x) {
        L.set({ [head.id]: "removed" }, { [head.id]: ["head"] });
        log.add(13, "headMatch", { x: op.x });
        nodes.shift();
        L.clear();
        log.add(14, "headRemoved", { x: op.x, list: pyList(L.values()) });
        continue;
      }
      let p = 0;
      L.set({ [head.id]: "current" }, { [head.id]: ["prev"] });
      log.add(15, "prevStart", { value: head.value, x: op.x });
      while (p + 1 < nodes.length && (nodes[p + 1] as ChainNode).value !== op.x) {
        p++;
        const prev = nodes[p] as ChainNode;
        L.set({ [prev.id]: "current" }, { [prev.id]: ["prev"] });
        log.add(17, "prevMove", { value: prev.value, x: op.x });
      }
      const prev = nodes[p] as ChainNode;
      const target = nodes[p + 1];
      if (!target) {
        L.set({ [prev.id]: "current" }, { [prev.id]: ["prev"] });
        log.add(18, "deleteMissing", { x: op.x });
        continue;
      }
      const after = valueOrNone(nodes[p + 2]);
      L.set({ [prev.id]: "current", [target.id]: "removed" }, { [prev.id]: ["prev"] });
      log.add(18, "found", { x: op.x, prev: prev.value });
      nodes.splice(p + 1, 1);
      L.set({ [prev.id]: "changed" }, { [prev.id]: ["prev"] });
      log.add(
        19,
        "unlink",
        { prev: prev.value, x: op.x, next: after, list: pyList(L.values()) },
        {
          say: { key: "qNext", vars: { prev: prev.value, x: op.x } },
          options: choices([...L.values(), op.x, "None"]),
          correct: after,
        },
      );
    }
  }
  L.clear();
  log.add(0, "end", { list: pyList(L.values()) });
  return log.steps;
}

export function doublyListSteps(start: readonly string[], ops: readonly ListOp[]) {
  const L = makeList(start);
  const { nodes, log } = L;
  log.add(0, "start", { list: pyList(L.values()) });

  for (const op of ops) {
    L.clear();
    if (op.kind === "addLast" || op.kind === "addFirst") {
      const last = op.kind === "addLast";
      const end = last ? nodes.at(-1) : nodes[0];
      const line = last ? 13 : 18;
      L.set(
        {},
        {},
        last
          ? { value: op.x, prev: valueOrNone(end), next: null }
          : { value: op.x, prev: null, next: valueOrNone(end) },
      );
      log.add(line, "create", { x: op.x });
      const id = L.newId();
      if (last) nodes.push({ id, value: op.x });
      else nodes.unshift({ id, value: op.x });
      L.set({ [id]: "new", ...(end ? { [end.id]: "changed" } : {}) }, {}, null);
      if (!end) log.add(line + 1, "linkEmpty", { x: op.x });
      else
        log.add(line + 1, last ? "linkLast" : "linkFirst", {
          x: op.x,
          end: end.value,
          list: pyList(L.values()),
        });
    } else if (op.kind === "delete") {
      const k = nodes.findIndex((n) => n.value === op.x);
      if (k < 0) {
        log.add(6, "missing", { x: op.x });
        continue;
      }
      const node = nodes[k] as ChainNode;
      const prev = nodes[k - 1];
      const next = nodes[k + 1];
      L.set({ [node.id]: "current" }, { [node.id]: ["node"] });
      log.add(6, "deleteFind", { x: op.x });
      if (prev) {
        L.set({ [node.id]: "removed", [prev.id]: "changed" }, { [node.id]: ["node"] });
        log.add(
          8,
          "linkPrev",
          { prev: prev.value, next: valueOrNone(next) },
          {
            say: { key: "qPrevNext", vars: { prev: prev.value } },
            options: choices([...L.values(), "None"]),
            correct: valueOrNone(next),
          },
        );
      } else {
        L.set({ [node.id]: "removed" }, { [node.id]: ["node"] });
        log.add(7, "noPrev", { x: op.x, next: valueOrNone(next) });
      }
      nodes.splice(k, 1);
      if (next) {
        L.set({ [next.id]: "changed" }, {});
        log.add(10, "linkNext", {
          next: next.value,
          prev: valueOrNone(prev),
          list: pyList(L.values()),
        });
      } else {
        L.clear();
        log.add(9, "noNext", { x: op.x, prev: valueOrNone(prev), list: pyList(L.values()) });
      }
    }
  }
  L.clear();
  log.add(0, "end", { list: pyList(L.values()) });
  return log.steps;
}

const stage = (doubly: boolean) => (s: DsStep<ListState>) => (
  <ChainView
    nodes={s.state.nodes}
    doubly={doubly}
    stateOf={(id) => s.state.marks[id] ?? "idle"}
    pointers={s.state.pointers}
    pending={s.state.pending}
  />
);

const vars = (s: DsStep<ListState>) => [
  { name: "length", value: s.state.nodes.length },
  { name: "list", value: pyList(s.state.nodes.map((n) => n.value)) },
];

export function SinglyLinkedListPlayer() {
  return (
    <DsPlayer
      prefix="singly"
      code={SINGLY_CODE}
      startField="values"
      presets={[
        { key: "tour", start: "3, 8, 5", ops: "insert 4 after 3, delete 8" },
        { key: "front", start: "2, 9", ops: "add-first 1, add-first 0" },
        { key: "find", start: "6, 1, 7, 4", ops: "find 7, find 5" },
      ]}
      forms={SINGLY_FORMS}
      run={singlyListSteps}
      stage={stage(false)}
      vars={vars}
    />
  );
}

export function DoublyLinkedListPlayer() {
  return (
    <DsPlayer
      prefix="doubly"
      code={DOUBLY_CODE}
      startField="values"
      presets={[
        { key: "tour", start: "2, 6, 9", ops: "delete 6" },
        { key: "ends", start: "5", ops: "add-last 7, add-first 3, delete 3, delete 7" },
        { key: "build", start: "", ops: "add-last 1, add-last 2, add-first 0" },
      ]}
      forms={DOUBLY_FORMS}
      run={doublyListSteps}
      stage={stage(true)}
      vars={vars}
    />
  );
}
