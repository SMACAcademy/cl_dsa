import { ArrayView, type CellState } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, V, type OpForm } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";
import { StackView, type NodeState } from "./views";

/* ---------------------------------- Stack --------------------------------- */

export const STACK_CODE: readonly string[] = [
  "class Stack:",
  "    def __init__(self):",
  "        self.items = []",
  "    def push(self, x):",
  "        self.items.append(x)",
  "    def pop(self):",
  "        return self.items.pop()",
  "    def peek(self):",
  "        return self.items[-1]",
];

export type StackOp = { kind: "push"; x: string } | { kind: "pop" } | { kind: "peek" };

export const STACK_FORMS: readonly OpForm<StackOp>[] = [
  { pattern: cmd(`push ${V}`), build: (m) => ({ kind: "push", x: m[1] as string }) },
  { pattern: cmd("pop"), build: () => ({ kind: "pop" }) },
  { pattern: cmd("peek"), build: () => ({ kind: "peek" }) },
];

export type StackState = {
  items: readonly string[];
  marks: Readonly<Record<number, NodeState>>;
  leaving: string | null;
};

export function stackSteps(start: readonly string[], ops: readonly StackOp[]) {
  const items = [...start];
  let marks: Record<number, NodeState> = {};
  let leaving: string | null = null;
  const log = new StepLog<StackState>(() => ({ items: [...items], marks: { ...marks }, leaving }));
  log.add(3, "start", { list: pyList(items) });
  for (const op of ops) {
    marks = {};
    leaving = null;
    const top = items.at(-1);
    if (op.kind === "push") {
      items.push(op.x);
      marks = { [items.length - 1]: "new" };
      log.add(5, "push", { x: op.x, size: items.length });
    } else if (top === undefined) {
      log.add(op.kind === "pop" ? 7 : 9, op.kind === "pop" ? "popEmpty" : "peekEmpty");
    } else if (op.kind === "pop") {
      const options = choices(items);
      items.pop();
      leaving = top;
      log.add(
        7,
        "pop",
        { x: top, list: pyList(items) },
        { say: { key: "qPop" }, options, correct: top },
      );
    } else {
      marks = { [items.length - 1]: "found" };
      log.add(
        9,
        "peek",
        { x: top },
        { say: { key: "qPeek" }, options: choices(items), correct: top },
      );
    }
  }
  marks = {};
  leaving = null;
  log.add(0, "end", { list: pyList(items) });
  return log.steps;
}

export function StackPlayer() {
  return (
    <DsPlayer
      prefix="stack"
      code={STACK_CODE}
      startField="values"
      presets={[
        { key: "tour", start: "", ops: "push 4, push 7, push 1, pop, peek" },
        { key: "undo", start: "A, B, C", ops: "pop, pop, push D" },
        { key: "empty", start: "5", ops: "pop, pop" },
      ]}
      forms={STACK_FORMS}
      run={stackSteps}
      stage={(s: DsStep<StackState>) => (
        <StackView
          items={s.state.items}
          stateAt={(i) => s.state.marks[i] ?? "idle"}
          leaving={s.state.leaving}
        />
      )}
      vars={(s) => [
        { name: "items", value: pyList(s.state.items) },
        { name: "len(items)", value: s.state.items.length },
      ]}
    />
  );
}

/* --------------------------- Queue and deque (shared) --------------------------- */

export type LineState = {
  items: readonly string[];
  marks: Readonly<Record<number, CellState>>;
  leaving: string | null;
};

const lineStage = (s: DsStep<LineState>) => (
  <>
    <ArrayView
      items={s.state.items.length > 0 ? s.state.items : [null]}
      stateOf={(i) => s.state.marks[i] ?? "idle"}
      markers={
        s.state.items.length === 0
          ? []
          : s.state.items.length === 1
            ? [{ index: 0, label: "front/back" }]
            : [
                { index: 0, label: "front" },
                { index: s.state.items.length - 1, label: "back" },
              ]
      }
    />
    <p className="text-center text-sm text-muted" aria-live="off">
      {s.state.leaving !== null ? `← ${s.state.leaving}` : " "}
    </p>
  </>
);

const lineVars = (s: DsStep<LineState>) => [
  { name: "items", value: pyList(s.state.items) },
  { name: "len(items)", value: s.state.items.length },
];

/* ---------------------------------- Queue --------------------------------- */

export const QUEUE_CODE: readonly string[] = [
  "from collections import deque",
  "",
  "class Queue:",
  "    def __init__(self):",
  "        self.items = deque()",
  "    def enqueue(self, x):",
  "        self.items.append(x)",
  "    def dequeue(self):",
  "        return self.items.popleft()",
  "    def front(self):",
  "        return self.items[0]",
];

export type QueueOp = { kind: "enqueue"; x: string } | { kind: "dequeue" } | { kind: "front" };

export const QUEUE_FORMS: readonly OpForm<QueueOp>[] = [
  { pattern: cmd(`enqueue ${V}`), build: (m) => ({ kind: "enqueue", x: m[1] as string }) },
  { pattern: cmd("dequeue"), build: () => ({ kind: "dequeue" }) },
  { pattern: cmd("front"), build: () => ({ kind: "front" }) },
];

export function queueSteps(start: readonly string[], ops: readonly QueueOp[]) {
  const items = [...start];
  let marks: Record<number, CellState> = {};
  let leaving: string | null = null;
  const log = new StepLog<LineState>(() => ({ items: [...items], marks: { ...marks }, leaving }));
  log.add(5, "start", { list: pyList(items) });
  for (const op of ops) {
    marks = {};
    leaving = null;
    const front = items[0];
    if (op.kind === "enqueue") {
      items.push(op.x);
      marks = { [items.length - 1]: "found" };
      log.add(7, "enqueue", { x: op.x, size: items.length });
    } else if (front === undefined) {
      log.add(
        op.kind === "dequeue" ? 9 : 11,
        op.kind === "dequeue" ? "dequeueEmpty" : "frontEmpty",
      );
    } else if (op.kind === "dequeue") {
      const options = choices(items);
      items.shift();
      leaving = front;
      log.add(
        9,
        "dequeue",
        { x: front, list: pyList(items) },
        { say: { key: "qDequeue" }, options, correct: front },
      );
    } else {
      marks = { 0: "comparing" };
      log.add(
        11,
        "front",
        { x: front },
        { say: { key: "qFront" }, options: choices(items), correct: front },
      );
    }
  }
  marks = {};
  leaving = null;
  log.add(0, "end", { list: pyList(items) });
  return log.steps;
}

export function QueuePlayer() {
  return (
    <DsPlayer
      prefix="queue"
      code={QUEUE_CODE}
      startField="values"
      presets={[
        { key: "tour", start: "", ops: "enqueue A, enqueue B, enqueue C, dequeue, front" },
        { key: "line", start: "1, 2, 3", ops: "dequeue, enqueue 4, dequeue" },
        { key: "empty", start: "", ops: "enqueue X, dequeue, dequeue" },
      ]}
      forms={QUEUE_FORMS}
      run={queueSteps}
      stage={lineStage}
      vars={lineVars}
    />
  );
}

/* ---------------------------------- Deque --------------------------------- */

export const DEQUE_CODE: readonly string[] = [
  "from collections import deque",
  "d = deque()",
  "d.append(x)      # push_back",
  "d.appendleft(x)  # push_front",
  "d.pop()          # pop_back",
  "d.popleft()      # pop_front",
];

export type DequeOp =
  | { kind: "pushBack"; x: string }
  | { kind: "pushFront"; x: string }
  | { kind: "popBack" }
  | { kind: "popFront" };

export const DEQUE_FORMS: readonly OpForm<DequeOp>[] = [
  { pattern: cmd(`push_back ${V}`), build: (m) => ({ kind: "pushBack", x: m[1] as string }) },
  { pattern: cmd(`push_front ${V}`), build: (m) => ({ kind: "pushFront", x: m[1] as string }) },
  { pattern: cmd("pop_back"), build: () => ({ kind: "popBack" }) },
  { pattern: cmd("pop_front"), build: () => ({ kind: "popFront" }) },
];

export function dequeSteps(start: readonly string[], ops: readonly DequeOp[]) {
  const items = [...start];
  let marks: Record<number, CellState> = {};
  let leaving: string | null = null;
  const log = new StepLog<LineState>(() => ({ items: [...items], marks: { ...marks }, leaving }));
  log.add(2, "start", { list: pyList(items) });
  for (const op of ops) {
    marks = {};
    leaving = null;
    if (op.kind === "pushBack") {
      items.push(op.x);
      marks = { [items.length - 1]: "found" };
      log.add(3, "pushBack", { x: op.x, list: pyList(items) });
    } else if (op.kind === "pushFront") {
      items.unshift(op.x);
      marks = { 0: "found" };
      log.add(4, "pushFront", { x: op.x, list: pyList(items) });
    } else if (items.length === 0) {
      log.add(op.kind === "popBack" ? 5 : 6, "popEmpty");
    } else {
      const back = op.kind === "popBack";
      const options = choices(items);
      const x = (back ? items.pop() : items.shift()) as string;
      leaving = x;
      log.add(
        back ? 5 : 6,
        back ? "popBack" : "popFront",
        { x, list: pyList(items) },
        { say: { key: back ? "qPopBack" : "qPopFront" }, options, correct: x },
      );
    }
  }
  marks = {};
  leaving = null;
  log.add(0, "end", { list: pyList(items) });
  return log.steps;
}

export function DequePlayer() {
  return (
    <DsPlayer
      prefix="deque"
      code={DEQUE_CODE}
      startField="values"
      presets={[
        {
          key: "tour",
          start: "",
          ops: "push_back 2, push_front 1, push_back 3, pop_front, pop_back",
        },
        { key: "window", start: "4, 5, 6", ops: "push_back 7, pop_front, push_back 8, pop_front" },
        {
          key: "palindrome",
          start: "R, A, C, E, C, A, R",
          ops: "pop_front, pop_back, pop_front, pop_back",
        },
      ]}
      forms={DEQUE_FORMS}
      run={dequeSteps}
      stage={lineStage}
      vars={lineVars}
    />
  );
}
