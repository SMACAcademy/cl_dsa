import { ArrayView, type CellState } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, V, type OpForm } from "./ops";
import { choices, StepLog, type DsStep } from "./steps";

export const DYNAMIC_ARRAY_CODE: readonly string[] = [
  "class DynamicArray:",
  "    def __init__(self):",
  "        self.size, self.capacity = 0, 2",
  "        self.slots = [None] * 2",
  "    def append(self, x):",
  "        if self.size == self.capacity:",
  "            self.resize(2 * self.capacity)",
  "        self.slots[self.size] = x",
  "        self.size += 1",
  "    def resize(self, new_capacity):",
  "        new_slots = [None] * new_capacity",
  "        for i in range(self.size):",
  "            new_slots[i] = self.slots[i]",
  "        self.slots, self.capacity = new_slots, new_capacity",
  "    def pop(self):",
  "        self.size -= 1",
  "        x = self.slots[self.size]",
  "        self.slots[self.size] = None",
  "        return x",
];

export type DynamicOp = { kind: "append"; x: string } | { kind: "pop" };

export const DYNAMIC_FORMS: readonly OpForm<DynamicOp>[] = [
  { pattern: cmd(`append ${V}`), build: (m) => ({ kind: "append", x: m[1] as string }) },
  { pattern: cmd("pop"), build: () => ({ kind: "pop" }) },
];

export type DynamicState = {
  slots: readonly (string | null)[];
  size: number;
  /** The bigger block being filled during a resize, if any. */
  newSlots: readonly (string | null)[] | null;
  marks: Readonly<Record<number, CellState>>;
  newMarks: Readonly<Record<number, CellState>>;
  appends: number;
  copies: number;
};

export function dynamicArraySteps(start: readonly string[], ops: readonly DynamicOp[]) {
  let capacity = 2;
  while (capacity < start.length) capacity *= 2;
  let slots: (string | null)[] = [...start, ...new Array<null>(capacity - start.length).fill(null)];
  let size = start.length;
  let newSlots: (string | null)[] | null = null;
  let marks: Record<number, CellState> = {};
  let newMarks: Record<number, CellState> = {};
  let appends = 0;
  let copies = 0;
  const log = new StepLog<DynamicState>(() => ({
    slots: [...slots],
    size,
    newSlots: newSlots ? [...newSlots] : null,
    marks: { ...marks },
    newMarks: { ...newMarks },
    appends,
    copies,
  }));

  log.add(3, "start", { size, capacity, spare: capacity - size });
  for (const op of ops) {
    marks = {};
    newMarks = {};
    if (op.kind === "append") {
      if (size === capacity) {
        log.add(6, "full", { size, capacity });
        newSlots = new Array<null>(capacity * 2).fill(null);
        log.add(11, "allocate", { capacity: capacity * 2 });
        for (let i = 0; i < size; i++) {
          newSlots[i] = slots[i] ?? null;
          copies++;
          marks = { [i]: "used" };
          newMarks = { [i]: "found" };
          log.add(13, "copy", { i, value: slots[i] as string });
        }
        slots = newSlots;
        newSlots = null;
        capacity *= 2;
        marks = {};
        newMarks = {};
        log.add(14, "switch", { capacity });
      }
      slots[size] = op.x;
      marks = { [size]: "found" };
      size++;
      appends++;
      log.add(8, "write", { x: op.x, i: size - 1, size, capacity });
    } else if (size === 0) {
      log.add(16, "popEmpty");
    } else {
      const x = slots[size - 1] as string;
      const options = choices(slots.filter((v): v is string => v !== null));
      slots[size - 1] = null;
      size--;
      log.add(17, "pop", { x, size, capacity }, { say: { key: "qPop" }, options, correct: x });
    }
  }
  marks = {};
  log.add(0, "end", { appends, copies });
  return log.steps;
}

function RowCaption({ children }: { children: string }) {
  return <p className="mt-1 text-center font-mono text-xs font-semibold text-muted">{children}</p>;
}

const stage = (s: DsStep<DynamicState>) => (
  <>
    <RowCaption>{`self.slots  # len ${s.state.slots.length}`}</RowCaption>
    <ArrayView
      label="slots"
      items={s.state.slots}
      stateOf={(i) => s.state.marks[i] ?? (i < s.state.size ? "idle" : "empty")}
      markerRow={false}
    />
    {s.state.newSlots && <RowCaption>{`new_slots  # len ${s.state.newSlots.length}`}</RowCaption>}
    {s.state.newSlots && (
      <ArrayView
        label="new_slots"
        items={s.state.newSlots}
        stateOf={(i) => s.state.newMarks[i] ?? "idle"}
        markerRow={false}
      />
    )}
  </>
);

export function DynamicArrayPlayer() {
  return (
    <DsPlayer
      prefix="dynamic"
      code={DYNAMIC_ARRAY_CODE}
      startField="values"
      presets={[
        { key: "grow", start: "", ops: "append 1, append 2, append 3" },
        { key: "doubling", start: "", ops: "append 1, append 2, append 3, append 4, append 5" },
        { key: "pop", start: "4, 8, 15", ops: "pop, append 16, append 23" },
      ]}
      forms={DYNAMIC_FORMS}
      run={dynamicArraySteps}
      stage={stage}
      vars={(s) => [
        { name: "size", value: s.state.size },
        { name: "capacity", value: s.state.slots.length },
        { name: "appends", value: s.state.appends },
        { name: "copies", value: s.state.copies },
      ]}
    />
  );
}
