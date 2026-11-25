import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, I, type OpForm, type OpsError } from "./ops";
import { StepLog, type DsStep, type Question } from "./steps";
import { TreeView, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

export const UNION_FIND_CODE: readonly string[] = [
  "parent = list(range(n))",
  "size = [1] * n",
  "",
  "def find(x):",
  "    root = x",
  "    while parent[root] != root:",
  "        root = parent[root]",
  "    while parent[x] != root:  # path compression",
  "        parent[x], x = root, parent[x]",
  "    return root",
  "",
  "def union(a, b):",
  "    ra, rb = find(a), find(b)",
  "    if ra == rb:",
  "        return False",
  "    if size[ra] < size[rb]:",
  "        ra, rb = rb, ra",
  "    parent[rb] = ra",
  "    size[ra] += size[rb]",
  "    return True",
  "",
  "def connected(a, b):",
  "    return find(a) == find(b)",
];

export type UfOp =
  { kind: "union" | "connected"; a: number; b: number } | { kind: "find"; a: number };

export const UF_FORMS: readonly OpForm<UfOp>[] = [
  {
    pattern: cmd(`union ${I} ${I}`),
    build: (m) => ({ kind: "union", a: Number(m[1]), b: Number(m[2]) }),
  },
  {
    pattern: cmd(`connected ${I} ${I}`),
    build: (m) => ({ kind: "connected", a: Number(m[1]), b: Number(m[2]) }),
  },
  { pattern: cmd(`find ${I}`), build: (m) => ({ kind: "find", a: Number(m[1]) }) },
];

/** The first field holds how many items there are: a whole number from 2 to 8. */
export function validateCount(start: string[]): OpsError | null {
  const [c, ...rest] = start;
  const n = Number(c);
  return rest.length === 0 && Number.isInteger(n) && n >= 2 && n <= 12 ? null : { key: "badCount" };
}

export type UfState = {
  parent: readonly number[];
  size: readonly number[];
  marks: Readonly<Record<number, NodeState>>;
};

export function unionFindSteps(start: readonly string[], ops: readonly UfOp[]) {
  const n = Number(start[0]);
  const parent = Array.from({ length: n }, (_, i) => i);
  const size = new Array<number>(n).fill(1);
  let marks: Record<number, NodeState> = {};
  const log = new StepLog<UfState>(() => ({
    parent: [...parent],
    size: [...size],
    marks: { ...marks },
  }));
  const rootOf = (x: number) => {
    let r = x;
    while (parent[r] !== r) r = parent[r] as number;
    return r;
  };

  /** find(x) with a step per hop and one for path compression. */
  const find = (x: number): number => {
    let root = x;
    marks = { [x]: "current" };
    while (parent[root] !== root) {
      const p = parent[root] as number;
      marks = { ...marks, [root]: "current", [p]: "current" };
      log.add(7, "hop", { x: root, p });
      root = p;
    }
    marks = { ...marks, [root]: "found" };
    log.add(10, "root", { x, root });
    const path: number[] = [];
    let y = x;
    while (parent[y] !== root) {
      path.push(y);
      const next = parent[y] as number;
      parent[y] = root;
      y = next;
    }
    if (path.length > 0) {
      marks = { ...Object.fromEntries(path.map((v) => [v, "changed"])), [root]: "found" };
      log.add(9, "compress", { nodes: path.join(", "), root });
    }
    return root;
  };

  const valid = (...xs: number[]) => xs.every((x) => x < n);

  log.add(1, "start", { n, last: n - 1 });
  for (const op of ops) {
    marks = {};
    if (op.kind === "find") {
      if (!valid(op.a)) {
        log.add(4, "badItem", { x: op.a, last: n - 1 });
        continue;
      }
      find(op.a);
      continue;
    }
    const { a, b } = op;
    if (!valid(a, b)) {
      log.add(op.kind === "union" ? 13 : 23, "badItem", { x: Math.max(a, b), last: n - 1 });
      continue;
    }
    const sameAnswer = rootOf(a) === rootOf(b);
    const ra = find(a);
    const rb = find(b);
    if (op.kind === "connected") {
      marks = { [ra]: "found", [rb]: "found", [a]: "current", [b]: "current" };
      const q: Question = {
        say: { key: "qConnected", vars: { a, b } },
        options: ["✓", "✗"],
        correct: sameAnswer ? "✓" : "✗",
      };
      log.add(23, ra === rb ? "connectedYes" : "connectedNo", { a, b, ra, rb }, q);
      continue;
    }
    if (ra === rb) {
      marks = { [ra]: "found" };
      log.add(15, "sameSet", { a, b, root: ra });
      continue;
    }
    let big = ra;
    let small = rb;
    if ((size[big] as number) < (size[small] as number)) [big, small] = [small, big];
    parent[small] = big;
    size[big] = (size[big] as number) + (size[small] as number);
    marks = { [big]: "found", [small]: "changed" };
    log.add(18, "attach", { small, big, size: size[big] as number });
  }
  marks = {};
  const sets = new Set(parent.map((_, i) => rootOf(i))).size;
  log.add(0, "end", { n, sets });
  return log.steps;
}

/** One drawable forest: a hidden super-root whose children are the set roots. */
function forest(parent: readonly number[]): DrawTree {
  const HIDDEN = -1;
  const kids = new Map<number, number[]>();
  parent.forEach((p, i) => {
    const key = p === i ? HIDDEN : p;
    kids.set(key, [...(kids.get(key) ?? []), i]);
  });
  const nodes: DrawTree["nodes"] = Object.fromEntries(
    parent.map((_, i) => [i, { id: i, label: String(i), kids: kids.get(i) ?? [] }]),
  );
  return {
    root: HIDDEN,
    nodes: { ...nodes, [HIDDEN]: { id: HIDDEN, label: "", kids: kids.get(HIDDEN) ?? [] } },
  };
}

function UfStage({ s }: { s: DsStep<UfState> }) {
  const { t } = useTranslation();
  const toCell: Record<NodeState, CellState> = {
    idle: "idle",
    current: "comparing",
    changed: "comparing",
    found: "found",
    new: "found",
    removed: "outside",
  };
  return (
    <>
      <TreeView
        tree={forest(s.state.parent)}
        binary={false}
        hideRoot
        stateOf={(id) => s.state.marks[id] ?? "idle"}
        label={t("viz.ds.view.tree")}
      />
      <p className="text-center font-mono text-xs font-semibold text-muted">parent</p>
      <ArrayView
        label="parent"
        items={s.state.parent}
        stateOf={(i) => toCell[s.state.marks[i] ?? "idle"]}
        markerRow={false}
      />
    </>
  );
}

export function UnionFindPlayer() {
  return (
    <DsPlayer
      prefix="unionFind"
      code={UNION_FIND_CODE}
      startField="count"
      validateStart={validateCount}
      presets={[
        {
          key: "tour",
          start: "10",
          ops: "union 0 1, union 2 3, union 4 5, union 1 3, union 6 7, union 8 9, union 5 7, connected 0 2, connected 4 6, connected 0 9",
        },
        {
          key: "compress",
          start: "10",
          ops: "union 0 1, union 2 3, union 0 2, union 4 5, union 6 7, union 4 6, union 0 4, union 8 9, union 9 0, find 7",
        },
        { key: "same", start: "4", ops: "union 0 1, union 1 2, union 2 0" },
        {
          key: "card",
          start: "5",
          ops: "union 0 1, union 3 4, union 1 4, connected 3 0, connected 2 0",
        },
      ]}
      forms={UF_FORMS}
      run={unionFindSteps}
      stage={(s: DsStep<UfState>) => <UfStage s={s} />}
      vars={(s) => [
        { name: "parent", value: `[${s.state.parent.join(", ")}]` },
        { name: "size", value: `[${s.state.size.join(", ")}]` },
      ]}
    />
  );
}
