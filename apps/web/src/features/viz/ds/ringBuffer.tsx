import { DsPlayer } from "./DsPlayer";
import { cmd, V, type OpForm, type OpsError } from "./ops";
import { choices, StepLog, type DsStep } from "./steps";
import { RingView, type NodeState } from "./views";

export const RING_CODE: readonly string[] = [
  "class RingBuffer:",
  "    def __init__(self, capacity):",
  "        self.slots = [None] * capacity",
  "        self.head = self.size = 0",
  "    def enqueue(self, x):",
  "        if self.size == len(self.slots):",
  "            raise OverflowError('full')",
  "        tail = (self.head + self.size) % len(self.slots)",
  "        self.slots[tail] = x",
  "        self.size += 1",
  "    def dequeue(self):",
  "        if self.size == 0:",
  "            raise IndexError('empty')",
  "        x = self.slots[self.head]",
  "        self.slots[self.head] = None",
  "        self.head = (self.head + 1) % len(self.slots)",
  "        self.size -= 1",
  "        return x",
];

export type RingOp = { kind: "enqueue"; x: string } | { kind: "dequeue" };

export const RING_FORMS: readonly OpForm<RingOp>[] = [
  { pattern: cmd(`enqueue ${V}`), build: (m) => ({ kind: "enqueue", x: m[1] as string }) },
  { pattern: cmd("dequeue"), build: () => ({ kind: "dequeue" }) },
];

/** The first field holds the capacity: one whole number from 2 to 8. */
export function validateCapacity(start: string[]): OpsError | null {
  const [c, ...rest] = start;
  const n = Number(c);
  return rest.length === 0 && Number.isInteger(n) && n >= 2 && n <= 12
    ? null
    : { key: "badCapacity" };
}

export type RingState = {
  slots: readonly (string | null)[];
  head: number;
  size: number;
  marks: Readonly<Record<number, NodeState>>;
};

export function ringSteps(start: readonly string[], ops: readonly RingOp[]) {
  const capacity = Number(start[0]);
  const slots: (string | null)[] = new Array<null>(capacity).fill(null);
  let head = 0;
  let size = 0;
  let marks: Record<number, NodeState> = {};
  const log = new StepLog<RingState>(() => ({
    slots: [...slots],
    head,
    size,
    marks: { ...marks },
  }));
  log.add(4, "start", { capacity });

  for (const op of ops) {
    marks = {};
    if (op.kind === "enqueue") {
      if (size === capacity) {
        log.add(7, "full", { x: op.x, capacity });
        continue;
      }
      const tail = (head + size) % capacity;
      marks = { [tail]: "current" };
      log.add(8, head + size >= capacity ? "tailWrap" : "tail", { head, size, capacity, tail });
      slots[tail] = op.x;
      size++;
      marks = { [tail]: "new" };
      log.add(9, "write", { x: op.x, tail, size });
    } else if (size === 0) {
      log.add(13, "empty");
    } else {
      const x = slots[head] as string;
      marks = { [head]: "found" };
      log.add(
        14,
        "read",
        { x, head },
        {
          say: { key: "qDequeue" },
          options: choices(slots.filter((v): v is string => v !== null)),
          correct: x,
        },
      );
      slots[head] = null;
      const old = head;
      head = (head + 1) % capacity;
      size--;
      marks = {};
      log.add(16, head < old ? "advanceWrap" : "advance", { x, head, size });
    }
  }
  marks = {};
  log.add(0, "end", { size, capacity });
  return log.steps;
}

export function RingBufferPlayer() {
  return (
    <DsPlayer
      prefix="ring"
      code={RING_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      presets={[
        {
          key: "tour",
          start: "8",
          ops: "enqueue 1, enqueue 2, enqueue 3, enqueue 4, enqueue 5, enqueue 6, dequeue, dequeue, enqueue 7, enqueue 8, enqueue 9, enqueue 10",
        },
        {
          key: "full",
          start: "6",
          ops: "enqueue A, enqueue B, enqueue C, enqueue D, enqueue E, enqueue F, enqueue G",
        },
        {
          key: "laps",
          start: "5",
          ops: "enqueue 1, enqueue 2, enqueue 3, dequeue, enqueue 4, enqueue 5, dequeue, enqueue 6, enqueue 7, dequeue, enqueue 8",
        },
        {
          key: "card",
          start: "4",
          ops: "enqueue 1, enqueue 2, enqueue 3, dequeue, enqueue 4, enqueue 5",
        },
      ]}
      forms={RING_FORMS}
      run={ringSteps}
      stage={(s: DsStep<RingState>) => (
        <RingView
          slots={s.state.slots}
          head={s.state.head}
          tail={(s.state.head + s.state.size) % s.state.slots.length}
          stateAt={(i) => s.state.marks[i] ?? "idle"}
        />
      )}
      vars={(s) => [
        { name: "head", value: s.state.head },
        { name: "size", value: s.state.size },
        { name: "tail", value: (s.state.head + s.state.size) % s.state.slots.length },
      ]}
    />
  );
}
