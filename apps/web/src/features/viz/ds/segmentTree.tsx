import { useTranslation } from "react-i18next";
import { ArrayView } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, I, N, numbersOnly, pick, randomNumbers, type OpForm, type OpsError } from "./ops";
import { StepLog, type DsStep } from "./steps";
import { TreeView, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

export const SEGMENT_TREE_CODE: readonly string[] = [
  "def query(node, lo, hi, l, r):",
  "    if r < lo or hi < l:",
  "        return 0  # no overlap",
  "    if l <= lo and hi <= r:",
  "        return tree[node]  # full overlap",
  "    mid = (lo + hi) // 2",
  "    return (query(2 * node, lo, mid, l, r)",
  "            + query(2 * node + 1, mid + 1, hi, l, r))",
  "",
  "def update(node, lo, hi, i, x):",
  "    if lo == hi:",
  "        tree[node] = x",
  "        return",
  "    mid = (lo + hi) // 2",
  "    if i <= mid:",
  "        update(2 * node, lo, mid, i, x)",
  "    else:",
  "        update(2 * node + 1, mid + 1, hi, i, x)",
  "    tree[node] = tree[2 * node] + tree[2 * node + 1]",
];

export type SegOp =
  { kind: "query"; l: number; r: number } | { kind: "update"; i: number; x: number };

export const SEGMENT_FORMS: readonly OpForm<SegOp>[] = [
  {
    pattern: cmd(`sum ${I} ${I}`),
    build: (m) => ({ kind: "query", l: Number(m[1]), r: Number(m[2]) }),
  },
  {
    pattern: cmd(`set ${I} ${N}`),
    build: (m) => ({ kind: "update", i: Number(m[1]), x: Number(m[2]) }),
  },
];

/** Segment trees need 1..8 starting numbers. */
export function validateSegmentStart(start: string[]): OpsError | null {
  if (start.length === 0) return { key: "emptyStart" };
  return numbersOnly(start);
}

type Seg = { lo: number; hi: number; sum: number };

export type SegState = {
  values: readonly number[];
  segs: Readonly<Record<number, Seg>>;
  marks: Readonly<Record<number, NodeState>>;
  total: number | null;
};

export function segmentSteps(start: readonly string[], ops: readonly SegOp[]) {
  const values = start.map(Number);
  const n = values.length;
  const segs: Record<number, Seg> = {};
  const build = (node: number, lo: number, hi: number): number => {
    if (lo === hi) {
      segs[node] = { lo, hi, sum: values[lo] as number };
    } else {
      const mid = Math.floor((lo + hi) / 2);
      segs[node] = { lo, hi, sum: build(2 * node, lo, mid) + build(2 * node + 1, mid + 1, hi) };
    }
    return (segs[node] as Seg).sum;
  };
  build(1, 0, n - 1);
  let marks: Record<number, NodeState> = {};
  let total: number | null = null;
  const log = new StepLog<SegState>(() => ({
    values: [...values],
    segs: Object.fromEntries(Object.entries(segs).map(([k, s]) => [k, { ...s }])),
    marks: { ...marks },
    total,
  }));
  const mark = (node: number, state: NodeState) => {
    marks = { ...marks, [node]: state };
  };

  log.add(0, "start", { n, total: (segs[1] as Seg).sum });
  for (const op of ops) {
    marks = {};
    total = null;
    if (op.kind === "query") {
      const { l, r } = op;
      if (l > r || r >= n) {
        log.add(1, "badRange", { l, r, last: n - 1 });
        continue;
      }
      let used = 0;
      const query = (node: number): number => {
        const s = segs[node] as Seg;
        if (r < s.lo || s.hi < l) {
          mark(node, "removed");
          log.add(3, "skip", { lo: s.lo, hi: s.hi, l, r });
          return 0;
        }
        if (l <= s.lo && s.hi <= r) {
          used++;
          mark(node, "found");
          total = (total ?? 0) + s.sum;
          log.add(5, "take", { lo: s.lo, hi: s.hi, l, r, sum: s.sum, total });
          return s.sum;
        }
        mark(node, "current");
        log.add(7, "split", { lo: s.lo, hi: s.hi, l, r });
        return query(2 * node) + query(2 * node + 1);
      };
      const result = query(1);
      log.add(8, "result", { l, r, result, used });
    } else {
      const { i, x } = op;
      if (i >= n) {
        log.add(11, "badIndex", { i, last: n - 1 });
        continue;
      }
      const path: number[] = [];
      let node = 1;
      for (;;) {
        const s = segs[node] as Seg;
        path.push(node);
        if (s.lo === s.hi) break;
        const mid = Math.floor((s.lo + s.hi) / 2);
        mark(node, "current");
        log.add(i <= mid ? 16 : 18, i <= mid ? "goLeft" : "goRight", { lo: s.lo, hi: s.hi, i });
        node = i <= mid ? 2 * node : 2 * node + 1;
      }
      const leaf = segs[node] as Seg;
      const old = leaf.sum;
      leaf.sum = x;
      values[i] = x;
      marks = { [node]: "changed" };
      log.add(12, "setLeaf", { i, old, x });
      for (const p of path.slice(0, -1).reverse()) {
        const s = segs[p] as Seg;
        const a = (segs[2 * p] as Seg).sum;
        const b = (segs[2 * p + 1] as Seg).sum;
        const before = s.sum;
        s.sum = a + b;
        mark(p, "changed");
        log.add(19, "recompute", { lo: s.lo, hi: s.hi, a, b, sum: s.sum, before });
      }
    }
  }
  marks = {};
  total = null;
  log.add(0, "end", { total: (segs[1] as Seg).sum });
  return log.steps;
}

function toDraw(segs: Readonly<Record<number, Seg>>): DrawTree {
  return {
    root: 1,
    nodes: Object.fromEntries(
      Object.entries(segs).map(([k, s]) => {
        const id = Number(k);
        return [
          id,
          {
            id,
            label: String(s.sum),
            sub: s.lo === s.hi ? `[${s.lo}]` : `[${s.lo}..${s.hi}]`,
            kids: [segs[2 * id] ? 2 * id : null, segs[2 * id + 1] ? 2 * id + 1 : null],
          },
        ];
      }),
    ),
  };
}

function SegStage({ s }: { s: DsStep<SegState> }) {
  const { t } = useTranslation();
  return (
    <>
      <TreeView
        tree={toDraw(s.state.segs)}
        stateOf={(id) => s.state.marks[id] ?? "idle"}
        label={t("viz.ds.view.tree")}
      />
      <ArrayView label="values" items={s.state.values} stateOf={() => "idle"} markerRow={false} />
    </>
  );
}

export function SegmentTreePlayer() {
  return (
    <DsPlayer
      prefix="segment"
      code={SEGMENT_TREE_CODE}
      startField="values"
      validateStart={validateSegmentStart}
      presets={[
        {
          key: "tour",
          start: "2, 1, 5, 3, 7, 4, 6, 8, 3, 2",
          ops: "sum 1 4, set 2 9, sum 0 9, sum 5 7",
        },
        {
          key: "wide",
          start: "3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8",
          ops: "sum 2 6, sum 0 11, sum 7 10",
        },
        {
          key: "update",
          start: "5, 5, 5, 5, 5, 5, 5, 5",
          ops: "set 0 1, sum 0 1, set 7 9, sum 4 7",
        },
        { key: "card", start: "2, 1, 5, 3", ops: "sum 1 2, set 2 4" },
      ]}
      random={() => {
        const values = randomNumbers(10, { min: 1, max: 20, unique: false });
        const l = pick([0, 1, 2, 3]);
        const r = pick([6, 7, 8, 9]);
        return {
          start: values.join(", "),
          ops: `sum ${l} ${r}, set ${pick([2, 4, 5])} ${pick([1, 12, 20])}, sum ${l} ${r}, sum 0 9`,
        };
      }}
      forms={SEGMENT_FORMS}
      run={segmentSteps}
      stage={(s: DsStep<SegState>) => <SegStage s={s} />}
      vars={(s) => [
        { name: "tree[1]", value: s.state.segs[1]?.sum ?? "—" },
        { name: "running sum", value: s.state.total ?? "—" },
      ]}
    />
  );
}
