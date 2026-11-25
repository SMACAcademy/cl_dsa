import { ArrayView, type CellState } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, I, pick, randomNumbers, V, type OpForm } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";

export const ARRAY_CODE: readonly string[] = [
  "def read(a, i):",
  "    return a[i]  # address = base + i * size",
  "",
  "def insert(a, i, x):",
  "    a.append(None)  # make room at the end",
  "    for k in range(len(a) - 1, i, -1):",
  "        a[k] = a[k - 1]  # shift right",
  "    a[i] = x",
  "",
  "def delete(a, i):",
  "    for k in range(i, len(a) - 1):",
  "        a[k] = a[k + 1]  # shift left",
  "    a.pop()",
  "",
  "def search(a, x):",
  "    for i in range(len(a)):",
  "        if a[i] == x:",
  "            return i",
  "    return -1",
];

export type ArrayOp =
  | { kind: "read"; i: number }
  | { kind: "insert"; x: string; i: number }
  | { kind: "delete"; i: number }
  | { kind: "search"; x: string };

export const ARRAY_FORMS: readonly OpForm<ArrayOp>[] = [
  { pattern: cmd(`read ${I}`), build: (m) => ({ kind: "read", i: Number(m[1]) }) },
  {
    pattern: cmd(`insert ${V} at ${I}`),
    build: (m) => ({ kind: "insert", x: m[1] as string, i: Number(m[2]) }),
  },
  { pattern: cmd(`delete ${I}`), build: (m) => ({ kind: "delete", i: Number(m[1]) }) },
  { pattern: cmd(`search ${V}`), build: (m) => ({ kind: "search", x: m[1] as string }) },
];

export type ArrayState = {
  values: readonly (string | null)[];
  marks: Readonly<Record<number, CellState>>;
};

export const BASE_ADDRESS = 100;
export const CELL_BYTES = 4;
const address = (i: number) => BASE_ADDRESS + CELL_BYTES * i;

export function arraySteps(start: readonly string[], ops: readonly ArrayOp[]) {
  const values: (string | null)[] = [...start];
  let marks: Record<number, CellState> = {};
  const log = new StepLog<ArrayState>(() => ({ values: [...values], marks: { ...marks } }));
  const at = (line: number, key: string, vars?: Record<string, string | number>) =>
    log.add(line, key, vars);

  at(0, "start", { count: values.length, list: pyList(values as string[]) });

  for (const op of ops) {
    marks = {};
    const n = values.length;
    if (op.kind === "read") {
      if (op.i >= n) {
        at(2, "indexError", { i: op.i, last: n - 1 });
        continue;
      }
      marks = { [op.i]: "found" };
      log.add(
        2,
        "read",
        { i: op.i, addr: address(op.i), value: values[op.i] as string },
        {
          say: { key: "qRead", vars: { i: op.i } },
          options: choices(values as string[]),
          correct: values[op.i] as string,
        },
      );
    } else if (op.kind === "insert") {
      if (op.i > n) {
        at(5, "insertError", { i: op.i, n });
        continue;
      }
      values.push(null);
      at(5, "grow", { n: n + 1 });
      for (let k = n; k > op.i; k--) {
        const v = values[k - 1] as string;
        values[k] = v;
        values[k - 1] = null;
        marks = { [k]: "comparing" };
        at(7, "shiftRight", { value: v, from: k - 1, to: k });
      }
      values[op.i] = op.x;
      marks = { [op.i]: "found" };
      at(8, "write", { x: op.x, i: op.i, moved: n - op.i });
    } else if (op.kind === "delete") {
      if (op.i >= n) {
        at(11, "indexError", { i: op.i, last: n - 1 });
        continue;
      }
      const removed = values[op.i] as string;
      marks = { [op.i]: "checked" };
      at(11, "deleteStart", { i: op.i, value: removed });
      values[op.i] = null;
      for (let k = op.i; k < n - 1; k++) {
        const v = values[k + 1] as string;
        values[k] = v;
        values[k + 1] = null;
        marks = { [k]: "comparing" };
        at(12, "shiftLeft", { value: v, from: k + 1, to: k });
      }
      values.pop();
      marks = {};
      at(13, "shrink", { moved: n - 1 - op.i, list: pyList(values as string[]) });
    } else {
      let found = -1;
      for (let i = 0; i < n; i++) {
        const hit = values[i] === op.x;
        marks = {
          ...Object.fromEntries([...Array(i).keys()].map((k) => [k, "checked"])),
          [i]: "comparing",
        };
        at(17, hit ? "compareYes" : "compareNo", { i, value: values[i] as string, x: op.x });
        if (hit) {
          found = i;
          break;
        }
      }
      marks = found >= 0 ? { [found]: "found" } : {};
      if (found >= 0) at(18, "found", { x: op.x, i: found, checks: found + 1 });
      else at(19, "notFound", { x: op.x, checks: n });
    }
  }
  marks = {};
  at(0, "end", { list: pyList(values as string[]) });
  return log.steps;
}

const stage = (s: DsStep<ArrayState>) => (
  <ArrayView
    items={s.state.values}
    stateOf={(i) => s.state.marks[i] ?? "idle"}
    markerRow={false}
    subLabel={(i) => `@${address(i)}`}
  />
);

export function ArrayPlayer() {
  return (
    <DsPlayer
      prefix="array"
      code={ARRAY_CODE}
      startField="values"
      presets={[
        {
          key: "tour",
          start: "7, 3, 9, 4, 12, 5, 8, 1, 6, 10",
          ops: "read 2, insert 11 at 1, delete 0, search 6",
        },
        { key: "front", start: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", ops: "insert 0 at 0" },
        { key: "end", start: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", ops: "insert 11 at 10" },
        { key: "card", start: "7, 3, 9, 4", ops: "read 2, insert 5 at 1, delete 0, search 9" },
      ]}
      random={() => {
        // 11 distinct numbers: 10 to start with, 1 kept aside to insert.
        const values = randomNumbers(11);
        const fresh = values.pop() as number;
        return {
          start: values.join(", "),
          ops: `read ${pick([0, 3, 7])}, insert ${fresh} at ${pick([1, 5, 9])}, delete ${pick([0, 4, 8])}, search ${pick(values)}`,
        };
      }}
      forms={ARRAY_FORMS}
      run={arraySteps}
      stage={stage}
      vars={(s) => [
        { name: "len(a)", value: s.state.values.filter((v) => v !== null).length },
        { name: "a", value: pyList(s.state.values.map((v) => v ?? "_")) },
      ]}
    />
  );
}
