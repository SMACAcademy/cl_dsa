import { useTranslation } from "react-i18next";
import { DsPlayer, useDynamicT } from "./DsPlayer";
import { cmd, type OpForm, type OpsError } from "./ops";
import { choices, pyList, StepLog, type DsStep, type Question } from "./steps";
import { TreeView, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

/* ----------------------------------- Subsets ----------------------------------- */

export const SUBSETS_CODE: readonly string[] = [
  "def subsets(items, target=None):",
  "    out, picked = [], []",
  "    def go(i, total):",
  "        if target is not None and total > target:",
  "            return  # prune: this branch is already too big",
  "        if i == len(items):",
  "            if target is None or total == target:",
  "                out.append(picked[:])  # one leaf = one subset",
  "            return",
  "        go(i + 1, total)  # skip items[i]",
  "        picked.append(items[i])",
  "        go(i + 1, total + items[i])  # take items[i]",
  "        picked.pop()  # undo the choice: backtrack",
  "    go(0, 0)",
  "    return out",
];

export type SubsetOp = { kind: "all" } | { kind: "sum"; target: number };

export const SUBSET_FORMS: readonly OpForm<SubsetOp>[] = [
  { pattern: cmd("all"), build: () => ({ kind: "all" }) },
  {
    pattern: cmd("sum (\\d{1,2})"),
    build: (m) => ({ kind: "sum", target: Number(m[1]) }),
  },
];

export const MAX_ITEMS = 4;

/** Items: 1 to 4 whole numbers from 1 to 99 (positive, so pruning by sum is safe). */
export function validateItems(start: string[]): OpsError | null {
  if (start.length === 0) return { key: "emptyStart" };
  if (start.length > MAX_ITEMS) return { key: "tooManyStart", max: MAX_ITEMS };
  const bad = start.find((t) => !/^\d{1,2}$/.test(t) || Number(t) < 1);
  return bad === undefined ? null : { key: "badPositive", token: bad };
}

type Status = "open" | "found" | "miss" | "pruned";
type MNode = { id: number; label: string; sub?: string; edge?: string; kids: (number | null)[] };

export type SubsetState = {
  tree: DrawTree;
  status: Readonly<Record<number, Status>>;
  current: number | null;
  picked: readonly string[];
  out: readonly string[];
};

/** Compact set text for under a leaf, e.g. {1,2}. */
const compact = (values: readonly string[]) => `{${values.join(",")}}`;

export function subsetSteps(start: readonly string[], ops: readonly SubsetOp[]) {
  const items = start.map(Number);
  const n = items.length;
  let nodes: Record<number, MNode> = {};
  let status: Record<number, Status> = {};
  let current: number | null = null;
  let picked: number[] = [];
  let out: string[] = [];
  let nextId = 0;
  const log = new StepLog<SubsetState>(() => ({
    tree: {
      root: 0 in nodes ? 0 : null,
      nodes: Object.fromEntries(
        Object.entries(nodes).map(([k, v]) => [k, { ...v, kids: [...v.kids] }]),
      ),
    },
    status: { ...status },
    current,
    picked: picked.map(String),
    out: [...out],
  }));

  for (const op of ops) {
    const target = op.kind === "sum" ? op.target : null;
    nodes = {};
    status = {};
    picked = [];
    out = [];
    nextId = 0;
    let pruned = 0;

    const pickedIdx: number[] = [];
    /** Options: this leaf, its sibling (last choice flipped), the complement and everything. */
    const leafQuestion = (): Question => {
      const subset = (idx: readonly number[]) =>
        pyList(items.filter((_, k) => idx.includes(k)).map(String));
      const sibling = pickedIdx.includes(n - 1)
        ? pickedIdx.filter((k) => k !== n - 1)
        : [...pickedIdx, n - 1];
      const complement = items.map((_, k) => k).filter((k) => !pickedIdx.includes(k));
      const options = choices([
        subset(pickedIdx),
        subset(sibling),
        subset(complement),
        subset(items.map((_, k) => k)),
      ]).sort((a, b) => a.length - b.length || a.localeCompare(b));
      return { say: { key: "qLeaf" }, options, correct: subset(pickedIdx) };
    };

    const go = (i: number, total: number, parent: number | null, slot: 0 | 1, x: number) => {
      const id = nextId++;
      const node: MNode = { id, label: String(total), kids: [null, null] };
      nodes[id] = node;
      if (parent !== null) {
        (nodes[parent] as MNode).kids[slot] = id;
        node.edge = `${slot === 0 ? "−" : "+"}${x}`;
      }
      status[id] = "open";
      current = id;
      const list = pyList(picked.map(String));
      if (target !== null && total > target) {
        status[id] = "pruned";
        pruned++;
        log.add(5, "prune", { total, target });
        return;
      }
      if (i === n) {
        node.sub = compact(picked.map(String));
        const q = leafQuestion();
        if (target === null || total === target) {
          status[id] = "found";
          out.push(list);
          log.add(8, "leaf", { subset: list, count: out.length }, q);
        } else {
          status[id] = "miss";
          log.add(7, "miss", { subset: list, total, target: target as number }, q);
        }
        return;
      }
      if (parent === null) {
        log.add(14, target === null ? "start" : "startSum", {
          items: pyList(items.map(String)),
          target: target ?? "",
        });
      } else {
        log.add(slot === 0 ? 10 : 12, slot === 0 ? "skip" : "take", { x, picked: list });
      }
      const item = items[i] as number;
      go(i + 1, total, id, 0, item);
      picked.push(item);
      pickedIdx.push(i);
      go(i + 1, total + item, id, 1, item);
      picked.pop();
      pickedIdx.pop();
      current = id;
      log.add(13, "undo", { x: item, picked: pyList(picked.map(String)) });
    };

    go(0, 0, null, 0, 0);
    current = null;
    const listText = out.length ? out.join(", ") : "—";
    if (target === null) log.add(15, "end", { count: out.length, n, list: listText });
    else log.add(15, "endSum", { count: out.length, target, list: listText, pruned });
  }
  return log.steps;
}

function SubsetStage({ s }: { s: DsStep<SubsetState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const stateOf = (id: number): NodeState => {
    if (st.current === id) return "current";
    const k = st.status[id];
    return k === "found" ? "found" : k === "miss" || k === "pruned" ? "removed" : "idle";
  };
  return (
    <>
      <p className="text-center text-xs font-semibold text-muted">
        {t("viz.ds.subsets.treeTitle")}
      </p>
      <TreeView tree={st.tree} stateOf={stateOf} label={t("viz.ds.subsets.treeTitle")} />
      <p className="text-center font-mono text-sm">picked = {pyList(st.picked)}</p>
      <p className="text-center font-mono text-sm break-words">out = [{st.out.join(", ")}]</p>
    </>
  );
}

export function SubsetsPlayer() {
  return (
    <DsPlayer
      prefix="subsets"
      code={SUBSETS_CODE}
      startField="values"
      validateStart={validateItems}
      presets={[
        { key: "tour", start: "1, 2, 3", ops: "all" },
        { key: "three", start: "1, 2, 3, 4", ops: "all" },
        { key: "sum", start: "2, 3, 5, 7", ops: "sum 10" },
        { key: "card", start: "1, 2", ops: "all" },
      ]}
      forms={SUBSET_FORMS}
      run={subsetSteps}
      stage={(s: DsStep<SubsetState>) => <SubsetStage s={s} />}
      vars={(s) => [
        { name: "picked", value: pyList(s.state.picked) },
        { name: "len(out)", value: s.state.out.length },
      ]}
    />
  );
}

/* ----------------------------------- N-Queens ----------------------------------- */

export const QUEENS_CODE: readonly string[] = [
  "def solve(n):",
  "    cols = []  # cols[i] = column of the queen in row i + 1",
  "    def safe(r, c):",
  "        return all(c != q and abs(c - q) != r - i",
  "                   for i, q in enumerate(cols, start=1))",
  "    def place(r):",
  "        if r > n:",
  "            return True  # every row has a queen",
  "        for c in range(1, n + 1):",
  "            if safe(r, c):",
  "                cols.append(c)  # try a queen here",
  "                if place(r + 1):",
  "                    return True",
  "                cols.pop()  # dead end below: lift it off",
  "        return False  # no safe square in this row",
  "    return place(1)",
];

export type QueensOp = { n: number };

export const QUEENS_FORMS: readonly OpForm<QueensOp>[] = [
  {
    pattern: cmd("queens (\\d)"),
    build: (m) => (Number(m[1]) >= 1 && Number(m[1]) <= 8 ? { n: Number(m[1]) } : null),
  },
];

export type QueensState = {
  n: number;
  /** cols[r - 1] = column of the queen in row r (1-based). */
  cols: readonly number[];
  row: number | null;
  lifted: { r: number; c: number } | null;
  solved: boolean;
};

/** Is (r, c) attacked by a queen already on the board (rows above r)? */
export function attacked(cols: readonly number[], r: number, c: number): boolean {
  return cols.some((q, i) => i + 1 !== r && (q === c || Math.abs(c - q) === Math.abs(r - (i + 1))));
}

export function queensSteps(_start: readonly string[], ops: readonly QueensOp[]) {
  let n = 0;
  let cols: number[] = [];
  let row: number | null = null;
  let lifted: { r: number; c: number } | null = null;
  let solved = false;
  const log = new StepLog<QueensState>(() => ({
    n,
    cols: [...cols],
    row,
    lifted: lifted ? { ...lifted } : null,
    solved,
  }));

  for (const op of ops) {
    n = op.n;
    cols = [];
    row = null;
    lifted = null;
    solved = false;
    log.add(2, "start", { n });

    const safe = (r: number, c: number) =>
      cols.every((q, i) => c !== q && Math.abs(c - q) !== r - (i + 1));
    const question = (r: number, from: number, answer: number | null): Question | undefined => {
      if (from > n) return undefined;
      const options = Array.from({ length: n - from + 1 }, (_, k) => String(from + k));
      return {
        say: { key: "qColumn", vars: { row: r, from } },
        options: [...options, "none"],
        correct: answer === null ? "none" : String(answer),
      };
    };

    const place = (r: number): boolean => {
      if (r > n) {
        row = null;
        lifted = null;
        solved = true;
        log.add(8, "solved", { cols: cols.join(", ") });
        return true;
      }
      let from = 1;
      for (;;) {
        let c: number | null = null;
        for (let k = from; k <= n && c === null; k++) if (safe(r, k)) c = k;
        row = r;
        const q = question(r, from, c);
        if (c === null) {
          log.add(15, from === 1 ? "dead" : from > n ? "deadEnd" : "deadFrom", { row: r, from }, q);
          return false;
        }
        cols.push(c);
        lifted = null;
        log.add(11, "place", { row: r, col: c }, q);
        if (place(r + 1)) return true;
        cols.pop();
        lifted = { r, c };
        row = r;
        log.add(14, "lift", { row: r, col: c });
        from = c + 1;
      }
    };

    if (!place(1)) {
      row = null;
      lifted = null;
      log.add(16, "none", { n });
    }
  }
  return log.steps;
}

type Square = "queen" | "lifted" | "attacked" | "free";

const SQUARE: Record<Square, string> = {
  queen: "bg-found-soft text-found-ink",
  lifted: "bg-compare-soft text-compare-ink",
  attacked: "bg-sunken text-muted",
  free: "bg-raised",
};

function Board({ st }: { st: QueensState }) {
  const { t } = useTranslation();
  const tx = useDynamicT();
  const range = Array.from({ length: st.n }, (_, k) => k + 1);
  const squareOf = (r: number, c: number): Square =>
    st.cols[r - 1] === c
      ? "queen"
      : st.lifted?.r === r && st.lifted.c === c
        ? "lifted"
        : attacked(st.cols, r, c)
          ? "attacked"
          : "free";
  return (
    <div className="w-full overflow-x-auto py-2">
      <table className="mx-auto border-collapse font-mono text-sm">
        <caption className="mb-1 font-sans text-xs font-semibold text-muted">
          {t("viz.ds.queens.caption", { n: st.n })}
        </caption>
        <thead>
          <tr>
            <td />
            {range.map((c) => (
              <th key={c} scope="col" className="px-1 text-xs font-semibold text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {range.map((r) => (
            <tr key={r}>
              <th
                scope="row"
                className={`px-2 text-xs font-semibold ${st.row === r ? "text-accent-ink" : "text-muted"}`}
              >
                {st.row === r ? `▶ ${r}` : r}
              </th>
              {range.map((c) => {
                const sq = squareOf(r, c);
                return (
                  <td
                    key={c}
                    className={`size-10 border border-line text-center text-lg transition-colors duration-300 ${SQUARE[sq]} ${
                      st.row === r ? "outline-2 -outline-offset-2 outline-accent" : ""
                    }`}
                  >
                    <span aria-hidden="true">
                      {sq === "queen" ? "♛" : sq === "lifted" ? "↑" : sq === "attacked" ? "·" : ""}
                    </span>
                    <span className="sr-only">{tx(`viz.ds.queens.square.${sq}`)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NQueensPlayer() {
  return (
    <DsPlayer
      prefix="queens"
      code={QUEENS_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "queens 6" },
        { key: "five", start: "", ops: "queens 8" },
        { key: "none", start: "", ops: "queens 3" },
        { key: "card", start: "", ops: "queens 4" },
      ]}
      forms={QUEENS_FORMS}
      run={queensSteps}
      stage={(s: DsStep<QueensState>) => <Board st={s.state} />}
      vars={(s) => [
        { name: "cols", value: `[${s.state.cols.join(", ")}]` },
        { name: "r", value: s.state.row ?? "—" },
      ]}
    />
  );
}
