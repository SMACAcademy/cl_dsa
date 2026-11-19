import { useTranslation } from "react-i18next";
import { ArrayView, type CellState, type Marker } from "../ArrayView";
import type { Range } from "../RangeRow";
import { DsPlayer } from "./DsPlayer";
import { cmd, I, N, numbersOnly, type OpForm, type OpsError } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";

/** Starting values must be numbers in ascending order (two pointers needs sorted input). */
export function sortedNumbers(start: string[]): OpsError | null {
  const bad = numbersOnly(start);
  if (bad) return bad;
  if (start.length === 0) return { key: "emptyStart" };
  const nums = start.map(Number);
  return nums.every((v, i) => i === 0 || v >= (nums[i - 1] as number))
    ? null
    : { key: "notSorted" };
}

/** At least one number. */
export function someNumbers(start: string[]): OpsError | null {
  return start.length === 0 ? { key: "emptyStart" } : numbersOnly(start);
}

const sumOptions = (values: number[]) => choices(values.map(String));

/* ------------------------------ Two pointers ------------------------------ */

export const TWO_POINTERS_CODE: readonly string[] = [
  "def pair_with_sum(items, target):",
  "    left, right = 0, len(items) - 1",
  "    while left < right:",
  "        s = items[left] + items[right]",
  "        if s == target:",
  "            return left, right",
  "        if s < target:",
  "            left += 1",
  "        else:",
  "            right -= 1",
  "    return None",
];

export type PairOp = { kind: "pair"; target: number };

export const PAIR_FORMS: readonly OpForm<PairOp>[] = [
  { pattern: cmd(`pair ${N}`), build: (m) => ({ kind: "pair", target: Number(m[1]) }) },
];

export type ArrayStepState = {
  values: readonly number[];
  marks: Readonly<Record<number, CellState>>;
  markers: readonly Marker[];
  ranges: readonly Range[];
  /** A second row, e.g. the prefix sums (null = not computed yet). */
  extra: readonly (number | null)[] | null;
  extraMarks: Readonly<Record<number, CellState>>;
};

function arrayLog(values: number[]) {
  let marks: Record<number, CellState> = {};
  let markers: Marker[] = [];
  let ranges: Range[] = [];
  let extra: (number | null)[] | null = null;
  let extraMarks: Record<number, CellState> = {};
  const log = new StepLog<ArrayStepState>(() => ({
    values: [...values],
    marks: { ...marks },
    markers: [...markers],
    ranges: [...ranges],
    extra: extra ? [...extra] : null,
    extraMarks: { ...extraMarks },
  }));
  return {
    log,
    set(m: Record<number, CellState>, mk: Marker[] = [], r: Range[] = []) {
      marks = m;
      markers = mk;
      ranges = r;
    },
    setExtra(e: (number | null)[] | null, m: Record<number, CellState> = {}) {
      extra = e;
      extraMarks = m;
    },
  };
}

export function twoPointerSteps(start: readonly string[], ops: readonly PairOp[]) {
  const values = start.map(Number);
  const A = arrayLog(values);
  A.log.add(0, "start", { list: pyList(start), n: values.length });
  for (const op of ops) {
    let left = 0;
    let right = values.length - 1;
    A.set({}, [
      { index: left, label: "L" },
      { index: right, label: "R" },
    ]);
    A.log.add(2, "pointers", { target: op.target });
    let found = false;
    let checks = 0;
    while (left < right) {
      const a = values[left] as number;
      const b = values[right] as number;
      const s = a + b;
      checks++;
      const decision = s === op.target ? "=" : s < op.target ? "L →" : "← R";
      A.set({ [left]: "comparing", [right]: "comparing" }, [
        { index: left, label: "L" },
        { index: right, label: "R" },
      ]);
      const q = {
        say: { key: "qMove", vars: { a, b, target: op.target } },
        options: ["L →", "← R", "="],
        correct: decision,
      };
      if (s === op.target) {
        A.set({ [left]: "found", [right]: "found" }, [
          { index: left, label: "L" },
          { index: right, label: "R" },
        ]);
        A.log.add(6, "found", { a, b, s, target: op.target, checks }, q);
        found = true;
        break;
      }
      if (s < op.target) {
        A.log.add(8, "tooSmall", { a, b, s, target: op.target }, q);
        left++;
      } else {
        A.log.add(10, "tooBig", { a, b, s, target: op.target }, q);
        right--;
      }
    }
    if (!found) {
      A.set({});
      A.log.add(11, "none", { target: op.target, checks });
    }
  }
  A.set({});
  A.log.add(0, "end", { n: values.length });
  return A.log.steps;
}

/* ------------------------------ Sliding window ------------------------------ */

export const SLIDING_WINDOW_CODE: readonly string[] = [
  "def best_window(items, k):",
  "    window = sum(items[:k])",
  "    best = window",
  "    for i in range(k, len(items)):",
  "        window += items[i] - items[i - k]",
  "        best = max(best, window)",
  "    return best",
];

export type WindowOp = { kind: "window"; k: number };

export const WINDOW_FORMS: readonly OpForm<WindowOp>[] = [
  { pattern: cmd(`window ${I}`), build: (m) => ({ kind: "window", k: Number(m[1]) }) },
];

export function slidingWindowSteps(start: readonly string[], ops: readonly WindowOp[]) {
  const values = start.map(Number);
  const A = arrayLog(values);
  A.log.add(0, "start", { list: pyList(start) });
  for (const { k } of ops) {
    if (k < 1 || k > values.length) {
      A.set({});
      A.log.add(2, "badK", { k, n: values.length });
      continue;
    }
    let window = values.slice(0, k).reduce((x, y) => x + y, 0);
    let best = window;
    let bestAt = 0;
    const range = (i: number): Range[] => [{ from: i, to: i + k - 1, label: `window = ${window}` }];
    A.set({}, [], range(0));
    A.log.add(2, "first", { k, list: pyList(values.slice(0, k).map(String)), window });
    for (let i = k; i < values.length; i++) {
      const added = values[i] as number;
      const dropped = values[i - k] as number;
      const before = window;
      window += added - dropped;
      const improved = window > best;
      if (improved) {
        best = window;
        bestAt = i - k + 1;
      }
      A.set({ [i]: "found", [i - k]: "checked" }, [], range(i - k + 1));
      A.log.add(
        improved ? 6 : 5,
        improved ? "slideBest" : "slide",
        { dropped, added, before, window, best },
        {
          say: { key: "qWindow", vars: { before, dropped, added } },
          options: sumOptions([window, before, before + added, window + dropped]),
          correct: String(window),
        },
      );
    }
    A.set(
      Object.fromEntries(Array.from({ length: k }, (_, j) => [bestAt + j, "found" as CellState])),
      [],
      [{ from: bestAt, to: bestAt + k - 1, label: `best = ${best}` }],
    );
    A.log.add(7, "best", { k, best, from: bestAt, to: bestAt + k - 1, slides: values.length - k });
  }
  A.set({});
  A.log.add(0, "end", { n: values.length });
  return A.log.steps;
}

/* ------------------------------- Prefix sums ------------------------------- */

export const PREFIX_SUMS_CODE: readonly string[] = [
  "def build(items):",
  "    prefix = [0]",
  "    for x in items:",
  "        prefix.append(prefix[-1] + x)",
  "    return prefix",
  "",
  "def range_sum(prefix, l, r):",
  "    return prefix[r + 1] - prefix[l]",
];

export type RangeOp = { kind: "sum"; l: number; r: number };

export const RANGE_FORMS: readonly OpForm<RangeOp>[] = [
  {
    pattern: cmd(`sum ${I} ${I}`),
    build: (m) => ({ kind: "sum", l: Number(m[1]), r: Number(m[2]) }),
  },
];

export function prefixSumSteps(start: readonly string[], ops: readonly RangeOp[]) {
  const values = start.map(Number);
  const A = arrayLog(values);
  const prefix: (number | null)[] = [0, ...values.map(() => null)];
  A.setExtra(prefix, { 0: "found" });
  A.log.add(2, "start", { list: pyList(start) });
  values.forEach((x, i) => {
    const s = (prefix[i] as number) + x;
    prefix[i + 1] = s;
    A.set({ [i]: "comparing" });
    A.setExtra(prefix, { [i]: "used", [i + 1]: "found" });
    A.log.add(4, "build", { i, next: i + 1, prev: prefix[i] as number, x, s });
  });
  A.set({});
  A.setExtra(prefix);
  A.log.add(5, "built", { list: pyList(prefix.map(String)) });
  for (const { l, r } of ops) {
    if (l > r || r >= values.length) {
      A.set({});
      A.setExtra(prefix);
      A.log.add(8, "badRange", { l, r, last: values.length - 1 });
      continue;
    }
    const hi = prefix[r + 1] as number;
    const lo = prefix[l] as number;
    const total = hi - lo;
    A.set(
      Object.fromEntries(
        Array.from({ length: r - l + 1 }, (_, j) => [l + j, "found" as CellState]),
      ),
      [],
      [{ from: l, to: r, label: `sum = ${total}` }],
    );
    A.setExtra(prefix, { [r + 1]: "comparing", [l]: "comparing" });
    A.log.add(
      8,
      "query",
      { l, r, r1: r + 1, hi, lo, total },
      {
        say: { key: "qSum", vars: { l, r } },
        options: sumOptions([total, hi, lo, hi + lo, total + (values[l] as number)]),
        correct: String(total),
      },
    );
  }
  A.set({});
  A.setExtra(prefix);
  A.log.add(0, "end", { n: values.length });
  return A.log.steps;
}

/* --------------------------------- Players --------------------------------- */

function ArrayStage({ s, extraLabel }: { s: DsStep<ArrayStepState>; extraLabel?: string }) {
  const { t } = useTranslation();
  const st = s.state;
  return (
    <>
      <p className="text-center font-mono text-xs font-semibold text-muted">items</p>
      <ArrayView
        items={st.values}
        stateOf={(i) => st.marks[i] ?? "idle"}
        markers={st.markers}
        ranges={st.ranges}
        markerRow={st.markers.length > 0}
      />
      {st.extra && extraLabel && (
        <>
          <p className="mt-2 text-center font-mono text-xs font-semibold text-muted">
            {extraLabel}
          </p>
          <ArrayView
            label={t("viz.ds.prefix.prefixRow")}
            items={st.extra}
            stateOf={(i) => st.extraMarks[i] ?? "idle"}
            markerRow={false}
          />
        </>
      )}
    </>
  );
}

export function TwoPointersPlayer() {
  return (
    <DsPlayer
      prefix="twoPointers"
      code={TWO_POINTERS_CODE}
      startField="values"
      validateStart={sortedNumbers}
      presets={[
        { key: "tour", start: "1, 2, 4, 7, 11", ops: "pair 9" },
        { key: "none", start: "1, 3, 5, 7", ops: "pair 11, pair 9" },
        { key: "many", start: "2, 3, 4, 5, 6, 8, 9", ops: "pair 14, pair 5" },
      ]}
      forms={PAIR_FORMS}
      run={twoPointerSteps}
      stage={(s: DsStep<ArrayStepState>) => <ArrayStage s={s} />}
      vars={(s) => [
        { name: "left", value: s.state.markers.find((m) => m.label === "L")?.index ?? "—" },
        { name: "right", value: s.state.markers.find((m) => m.label === "R")?.index ?? "—" },
      ]}
    />
  );
}

export function SlidingWindowPlayer() {
  return (
    <DsPlayer
      prefix="window"
      code={SLIDING_WINDOW_CODE}
      startField="values"
      validateStart={someNumbers}
      presets={[
        { key: "tour", start: "2, 1, 5, 1, 3", ops: "window 3" },
        { key: "longer", start: "4, 2, 1, 7, 8, 1, 2, 8", ops: "window 2, window 4" },
        { key: "negative", start: "3, -2, 5, -1, 6", ops: "window 2" },
      ]}
      forms={WINDOW_FORMS}
      run={slidingWindowSteps}
      stage={(s: DsStep<ArrayStepState>) => <ArrayStage s={s} />}
      vars={(s) => [{ name: "window", value: s.state.ranges[0]?.label.replace(/^\D+/, "") ?? "—" }]}
    />
  );
}

export function PrefixSumsPlayer() {
  return (
    <DsPlayer
      prefix="prefix"
      code={PREFIX_SUMS_CODE}
      startField="values"
      validateStart={someNumbers}
      presets={[
        { key: "tour", start: "3, 1, 4, 1", ops: "sum 1 2" },
        { key: "many", start: "5, 2, 7, 1, 3, 6", ops: "sum 0 5, sum 2 4, sum 3 3" },
        { key: "negative", start: "4, -3, 2, -1", ops: "sum 0 3, sum 1 2" },
      ]}
      forms={RANGE_FORMS}
      run={prefixSumSteps}
      stage={(s: DsStep<ArrayStepState>) => <ArrayStage s={s} extraLabel="prefix" />}
      vars={(s) => [
        {
          name: "prefix",
          value: s.state.extra
            ? pyList(s.state.extra.map((v) => (v === null ? "_" : String(v))))
            : "—",
        },
      ]}
    />
  );
}
