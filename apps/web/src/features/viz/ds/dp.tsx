import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "../ArrayView";
import { DpGrid, type GridCell } from "./dpGrid";
import { DsPlayer } from "./DsPlayer";
import { cmd, type OpForm, type OpsError } from "./ops";

/** A word for LCS / edit distance: 1 to 8 letters. */
const WORD = "([a-zA-Z]{1,8})";
import { useDynamicT } from "./DsPlayer";
import { validateCapacity } from "./ringBuffer";
import { choices, StepLog, type DsStep, type Question } from "./steps";
import { TreeView, type DrawNode, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

const numberQuestion = (
  key: string,
  vars: Record<string, string | number>,
  correct: number,
  others: number[],
): Question => ({
  say: { key, vars },
  options: choices(
    [correct, ...others].filter((x) => Number.isFinite(x) && x >= 0).map(String),
  ).sort((a, b) => Number(a) - Number(b)),
  correct: String(correct),
});

/* ------------------------------ Memoized Fibonacci ------------------------------ */

export const FIB_CODE: readonly string[] = [
  "memo = {}",
  "def fib(n):",
  "    if n in memo:",
  "        return memo[n]  # already solved",
  "    if n < 2:",
  "        return n  # base case",
  "    memo[n] = fib(n - 1) + fib(n - 2)",
  "    return memo[n]",
];

export type FibOp = { kind: "fib"; n: number };

export const FIB_FORMS: readonly OpForm<FibOp>[] = [
  {
    pattern: cmd("fib (\\d{1,2})"),
    build: (m) => (Number(m[1]) <= 10 ? { kind: "fib", n: Number(m[1]) } : null),
  },
];

type CallNode = {
  id: number;
  n: number;
  value: number | null;
  kind: "call" | "hit" | "base";
  kids: number[];
};

export type FibState = {
  calls: Readonly<Record<number, CallNode>>;
  memo: readonly (number | null)[];
  current: number | null;
  callCount: number;
};

const naiveCalls = (n: number): number => (n < 2 ? 1 : 1 + naiveCalls(n - 1) + naiveCalls(n - 2));

export function fibSteps(_start: readonly string[], ops: readonly FibOp[]) {
  let calls: Record<number, CallNode> = {};
  let memo: (number | null)[] = [];
  let current: number | null = null;
  let nextId = 0;
  const log = new StepLog<FibState>(() => ({
    calls: Object.fromEntries(
      Object.entries(calls).map(([k, c]) => [k, { ...c, kids: [...c.kids] }]),
    ),
    memo: [...memo],
    current,
    callCount: Object.keys(calls).length,
  }));
  log.add(1, "start");
  for (const { n } of ops) {
    calls = {};
    memo = new Array<number | null>(n + 1).fill(null);
    nextId = 0;
    const fib = (k: number, parent: number | null): number => {
      const id = nextId++;
      calls[id] = { id, n: k, value: null, kind: "call", kids: [] };
      if (parent !== null) calls[parent]?.kids.push(id);
      current = id;
      const node = calls[id] as CallNode;
      const known = memo[k];
      if (known !== null && known !== undefined) {
        node.kind = "hit";
        node.value = known;
        log.add(4, "hit", { k, value: known });
        return known;
      }
      if (k < 2) {
        node.kind = "base";
        node.value = k;
        memo[k] = k;
        log.add(6, "base", { k });
        return k;
      }
      log.add(7, "call", { k, a: k - 1, b: k - 2 });
      const a = fib(k - 1, id);
      const b = fib(k - 2, id);
      memo[k] = a + b;
      node.value = a + b;
      current = id;
      log.add(
        7,
        "store",
        { k, a, b, value: a + b },
        numberQuestion("qFib", { k }, a + b, [a, b, a * b, a + b + 1]),
      );
      return a + b;
    };
    const result = fib(n, null);
    current = null;
    log.add(8, "result", {
      n,
      value: result,
      calls: Object.keys(calls).length,
      naive: naiveCalls(n),
    });
  }
  return log.steps;
}

function fibTree(st: FibState): DrawTree {
  const nodes: Record<number, DrawNode> = {};
  for (const c of Object.values(st.calls)) {
    nodes[c.id] = {
      id: c.id,
      label: String(c.n),
      sub: c.value === null ? undefined : `= ${c.value}`,
      kids: c.kids,
      ringed: c.kind === "hit",
    };
  }
  return { root: 0 in st.calls ? 0 : null, nodes };
}

function FibStage({ s }: { s: DsStep<FibState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const stateOf = (id: number): NodeState => {
    const c = st.calls[id];
    if (!c) return "idle";
    if (st.current === id) return "current";
    if (c.kind === "hit") return "found";
    return c.value === null ? "changed" : "idle";
  };
  return (
    <>
      <p className="text-center text-xs font-semibold text-muted">{t("viz.ds.fib.treeTitle")}</p>
      <TreeView
        tree={fibTree(st)}
        binary={false}
        stateOf={stateOf}
        label={t("viz.ds.fib.treeTitle")}
      />
      <p className="text-center font-mono text-xs font-semibold text-muted">memo</p>
      <ArrayView
        label="memo"
        items={st.memo}
        stateOf={(i): CellState =>
          st.current !== null && st.calls[st.current]?.n === i ? "comparing" : "idle"
        }
        markerRow={false}
      />
    </>
  );
}

export function FibonacciMemoPlayer() {
  return (
    <DsPlayer
      prefix="fib"
      code={FIB_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "fib 8" },
        { key: "small", start: "", ops: "fib 5" },
        { key: "big", start: "", ops: "fib 10" },
      ]}
      forms={FIB_FORMS}
      run={fibSteps}
      stage={(s: DsStep<FibState>) => <FibStage s={s} />}
      vars={(s) => [{ name: "calls", value: s.state.callCount }]}
    />
  );
}

/* --------------------------------- Coin change --------------------------------- */

export const COIN_CODE: readonly string[] = [
  "def min_coins(coins, amount):",
  "    best = [0] + [inf] * amount",
  "    for a in range(1, amount + 1):",
  "        for c in coins:",
  "            if c <= a and best[a - c] + 1 < best[a]:",
  "                best[a] = best[a - c] + 1",
  "    return best[amount]",
];

export type MakeOp = { kind: "make"; amount: number };

export const MAKE_FORMS: readonly OpForm<MakeOp>[] = [
  {
    pattern: cmd("make (\\d{1,2})"),
    build: (m) =>
      Number(m[1]) >= 1 && Number(m[1]) <= 20 ? { kind: "make", amount: Number(m[1]) } : null,
  },
];

/** Coins: positive whole numbers (1 to 99). */
export function validateCoins(start: string[]): OpsError | null {
  if (start.length === 0) return { key: "emptyStart" };
  const bad = start.find((c) => !/^\d{1,2}$/.test(c) || Number(c) < 1);
  return bad === undefined ? null : { key: "badCoin", token: bad };
}

export type CoinState = {
  best: readonly (number | null)[];
  /** Amounts used to compute the current cell. */
  sources: readonly number[];
  current: number | null;
};

const INF = Number.POSITIVE_INFINITY;
const show = (x: number) => (x === INF ? "∞" : String(x));

export function coinSteps(start: readonly string[], ops: readonly MakeOp[]) {
  const coins = [...new Set(start.map(Number))].sort((a, b) => a - b);
  let best: number[] = [];
  let sources: number[] = [];
  let current: number | null = null;
  let filled = 0;
  const log = new StepLog<CoinState>(() => ({
    best: best.map((v, i) => (i <= filled ? v : null)),
    sources: [...sources],
    current,
  }));
  log.add(2, "start", { coins: coins.join(", ") });
  for (const { amount } of ops) {
    best = [0, ...new Array<number>(amount).fill(INF)];
    const used: (number | null)[] = new Array<number | null>(amount + 1).fill(null);
    filled = 0;
    current = 0;
    sources = [];
    log.add(2, "base", { amount });
    for (let a = 1; a <= amount; a++) {
      const options = coins
        .filter((c) => c <= a)
        .map((c) => ({ c, v: (best[a - c] as number) + 1 }));
      for (const o of options) {
        if (o.v < (best[a] as number)) {
          best[a] = o.v;
          used[a] = o.c;
        }
      }
      filled = a;
      current = a;
      sources = options.map((o) => a - o.c);
      const list = options
        .map((o) => `best[${a - o.c}] + 1 = ${show(o.v)} (coin ${o.c})`)
        .join(", ");
      const value = best[a] as number;
      log.add(
        value === INF ? 5 : 6,
        value === INF ? "unreachable" : "fill",
        { a, list: list || "—", value: show(value), coin: used[a] ?? "—" },
        value === INF
          ? undefined
          : numberQuestion("qBest", { a }, value, options.map((o) => o.v).concat([value + 1])),
      );
    }
    current = null;
    sources = [];
    const answer = best[amount] as number;
    const pieces: number[] = [];
    for (let a = amount; a > 0 && used[a] !== null; a -= used[a] as number)
      pieces.push(used[a] as number);
    // What "biggest coin first" would do, for comparison.
    let rest = amount;
    const greedy: number[] = [];
    for (const c of [...coins].reverse())
      while (rest >= c) {
        greedy.push(c);
        rest -= c;
      }
    log.add(7, answer === INF ? "impossible" : rest === 0 ? "answer" : "answerStuck", {
      amount,
      value: show(answer),
      pieces: pieces.join(" + "),
      greedy: `${greedy.length} (${greedy.join(" + ")})`,
      rest,
    });
  }
  return log.steps;
}

function CoinStage({ s }: { s: DsStep<CoinState> }) {
  const st = s.state;
  return (
    <>
      <p className="text-center font-mono text-xs font-semibold text-muted">best[a]</p>
      <ArrayView
        label="best"
        items={st.best.map((v) => (v === null ? null : show(v)))}
        stateOf={(i): CellState =>
          i === st.current ? "found" : st.sources.includes(i) ? "comparing" : "idle"
        }
        markerRow={false}
      />
    </>
  );
}

export function CoinChangePlayer() {
  return (
    <DsPlayer
      prefix="coins"
      code={COIN_CODE}
      startField="coins"
      validateStart={validateCoins}
      presets={[
        { key: "tour", start: "1, 5, 6, 9", ops: "make 20" },
        { key: "us", start: "1, 5, 10", ops: "make 18" },
        { key: "gap", start: "3, 5", ops: "make 7, make 19" },
        { key: "card", start: "1, 3, 4", ops: "make 6" },
      ]}
      forms={MAKE_FORMS}
      run={coinSteps}
      stage={(s: DsStep<CoinState>) => <CoinStage s={s} />}
      vars={(s) => [{ name: "a", value: s.state.current ?? "—" }]}
    />
  );
}

/* --------------------------------- 0/1 knapsack --------------------------------- */

export const KNAPSACK_CODE: readonly string[] = [
  "def knapsack(items, W):",
  "    dp = [[0] * (W + 1) for _ in range(len(items) + 1)]",
  "    for i, (w, v) in enumerate(items, start=1):",
  "        for c in range(W + 1):",
  "            dp[i][c] = dp[i - 1][c]  # skip item i",
  "            if w <= c:",
  "                dp[i][c] = max(dp[i][c], dp[i - 1][c - w] + v)  # take it",
  "    return dp[len(items)][W]",
];

export type ItemOp = { name: string; w: number; v: number };

export const ITEM_FORMS: readonly OpForm<ItemOp>[] = [
  {
    pattern: cmd(String.raw`([A-Za-z])\s+(\d)\s+(\d{1,2})`),
    build: (m) =>
      Number(m[2]) >= 1
        ? { name: (m[1] as string).toUpperCase(), w: Number(m[2]), v: Number(m[3]) }
        : null,
  },
];

export type KnapState = {
  items: readonly ItemOp[];
  dp: readonly (readonly (number | null)[])[];
  row: number | null;
  path: readonly string[];
  taken: readonly string[];
};

export function knapsackSteps(start: readonly string[], ops: readonly ItemOp[]) {
  const W = Number(start[0]);
  const items = ops;
  const n = items.length;
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, (_, i) =>
    new Array<number | null>(W + 1).fill(i === 0 ? 0 : null),
  );
  let row: number | null = 0;
  const path: string[] = [];
  let taken: string[] = [];
  const log = new StepLog<KnapState>(() => ({
    items,
    dp: dp.map((r) => [...r]),
    row,
    path: [...path],
    taken: [...taken],
  }));
  log.add(2, "start", { W, n });
  items.forEach((it, idx) => {
    const i = idx + 1;
    const prev = dp[i - 1] as number[];
    const cur = dp[i] as (number | null)[];
    const takes: number[] = [];
    for (let c = 0; c <= W; c++) {
      const skip = prev[c] as number;
      const take = it.w <= c ? (prev[c - it.w] as number) + it.v : -1;
      cur[c] = Math.max(skip, take);
      if (take > skip) takes.push(c);
    }
    row = i;
    log.add(
      7,
      "row",
      {
        name: it.name,
        w: it.w,
        v: it.v,
        takes: takes.length ? takes.join(", ") : "—",
        best: cur[W] as number,
      },
      numberQuestion("qRow", { name: it.name, W }, cur[W] as number, [
        prev[W] as number,
        (prev[W] as number) + it.v,
      ]),
    );
  });
  row = null;
  // Walk back from the bottom-right cell to see which items were taken.
  let c = W;
  for (let i = n; i >= 1; i--) {
    const it = items[i - 1] as ItemOp;
    path.push(`${i},${c}`);
    if (dp[i]?.[c] !== dp[i - 1]?.[c]) {
      taken = [it.name, ...taken];
      log.add(8, "tookItem", { name: it.name, i, c, w: it.w });
      c -= it.w;
    } else {
      log.add(8, "skippedItem", { name: it.name, i, c });
    }
  }
  path.push(`0,${c}`);
  log.add(8, "answer", { best: dp[n]?.[W] as number, taken: taken.join(" + ") || "—", W });
  return log.steps;
}

function KnapStage({ s }: { s: DsStep<KnapState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const W = (st.dp[0]?.length ?? 1) - 1;
  const stateOf = (r: number, c: number): GridCell =>
    st.path.includes(`${r},${c}`)
      ? "path"
      : st.row === r
        ? "row"
        : st.row !== null && r === st.row - 1
          ? "source"
          : "filled";
  return (
    <DpGrid
      caption={t("viz.ds.knapsack.caption")}
      colLabels={Array.from({ length: W + 1 }, (_, c) => String(c))}
      rowLabels={["—", ...st.items.map((it) => `${it.name} (w${it.w}, v${it.v})`)]}
      cells={st.dp}
      stateOf={stateOf}
    />
  );
}

export function KnapsackPlayer() {
  return (
    <DsPlayer
      prefix="knapsack"
      code={KNAPSACK_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      opsField="items"
      presets={[
        { key: "tour", start: "10", ops: "A 2 3, B 3 4, C 4 5, D 5 8, E 9 10" },
        { key: "four", start: "7", ops: "A 1 1, B 3 4, C 4 5, D 5 7" },
        { key: "greedyFails", start: "10", ops: "A 6 30, B 5 20, C 5 20" },
        { key: "card", start: "4", ops: "A 1 1, B 3 5, C 4 5" },
      ]}
      forms={ITEM_FORMS}
      run={knapsackSteps}
      stage={(s: DsStep<KnapState>) => <KnapStage s={s} />}
      vars={(s) => [{ name: "taken", value: s.state.taken.join(" + ") || "—" }]}
    />
  );
}

/* ----------------------- LCS and edit distance (string grids) ----------------------- */

export const LCS_CODE: readonly string[] = [
  "def lcs(a, b):",
  "    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]",
  "    for i in range(1, len(a) + 1):",
  "        for j in range(1, len(b) + 1):",
  "            if a[i - 1] == b[j - 1]:",
  "                dp[i][j] = dp[i - 1][j - 1] + 1  # match: extend the diagonal",
  "            else:",
  "                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])",
  "    return dp[len(a)][len(b)]",
];

export const EDIT_CODE: readonly string[] = [
  "def edit_distance(a, b):",
  "    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]",
  "    for i in range(len(a) + 1):",
  "        dp[i][0] = i  # delete everything",
  "    for j in range(len(b) + 1):",
  "        dp[0][j] = j  # insert everything",
  "    for i in range(1, len(a) + 1):",
  "        for j in range(1, len(b) + 1):",
  "            same = a[i - 1] == b[j - 1]",
  "            dp[i][j] = min(dp[i - 1][j] + 1,  # delete",
  "                           dp[i][j - 1] + 1,  # insert",
  "                           dp[i - 1][j - 1] + (0 if same else 1))  # keep or replace",
  "    return dp[len(a)][len(b)]",
];

export type WordsOp = { a: string; b: string };

const wordsForm = (verb: string): OpForm<WordsOp>[] => [
  {
    pattern: cmd(`${verb} ${WORD} ${WORD}`),
    build: (m) => ({ a: (m[1] as string).toUpperCase(), b: (m[2] as string).toUpperCase() }),
  },
];
export const LCS_FORMS = wordsForm("lcs");
export const EDIT_FORMS = wordsForm("edit");

export type WordGridState = {
  a: string;
  b: string;
  dp: readonly (readonly (number | null)[])[];
  row: number | null;
  path: readonly string[];
};

function wordLog(a: string, b: string) {
  const dp: (number | null)[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number | null>(b.length + 1).fill(null),
  );
  let row: number | null = null;
  let path: string[] = [];
  const log = new StepLog<WordGridState>(() => ({
    a,
    b,
    dp: dp.map((r) => [...r]),
    row,
    path: [...path],
  }));
  return {
    dp,
    log,
    setRow: (r: number | null) => {
      row = r;
    },
    setPath: (p: string[]) => {
      path = p;
    },
  };
}

export function lcsSteps(_start: readonly string[], ops: readonly WordsOp[]) {
  const all: DsStep<WordGridState>[] = [];
  for (const { a, b } of ops) {
    const G = wordLog(a, b);
    const { dp } = G;
    for (let i = 0; i <= a.length; i++) (dp[i] as (number | null)[])[0] = 0;
    for (let j = 0; j <= b.length; j++) (dp[0] as (number | null)[])[j] = 0;
    G.log.add(2, "start", { a, b });
    for (let i = 1; i <= a.length; i++) {
      const matches: number[] = [];
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          (dp[i] as number[])[j] = (dp[i - 1]?.[j - 1] as number) + 1;
          matches.push(j);
        } else {
          (dp[i] as number[])[j] = Math.max(dp[i - 1]?.[j] as number, dp[i]?.[j - 1] as number);
        }
      }
      G.setRow(i);
      const ch = a[i - 1] as string;
      G.log.add(
        matches.length ? 6 : 8,
        matches.length ? "rowMatch" : "rowNoMatch",
        { ch, cols: matches.map((j) => b[j - 1]).join(", "), best: dp[i]?.[b.length] as number },
        numberQuestion("qRow", { ch, b }, dp[i]?.[b.length] as number, [
          dp[i - 1]?.[b.length] as number,
          (dp[i - 1]?.[b.length] as number) + 1,
        ]),
      );
    }
    G.setRow(null);
    // Walk back from the bottom-right corner, collecting matched letters.
    const path: string[] = [];
    const letters: string[] = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
      path.push(`${i},${j}`);
      if (a[i - 1] === b[j - 1]) {
        letters.unshift(a[i - 1] as string);
        i--;
        j--;
      } else if ((dp[i - 1]?.[j] as number) >= (dp[i]?.[j - 1] as number)) i--;
      else j--;
    }
    G.setPath(path);
    G.log.add(9, "answer", { a, b, lcs: letters.join(""), len: letters.length });
    all.push(...G.log.steps);
  }
  return all;
}

export function editSteps(_start: readonly string[], ops: readonly WordsOp[]) {
  const all: DsStep<WordGridState>[] = [];
  for (const { a, b } of ops) {
    const G = wordLog(a, b);
    const { dp } = G;
    G.log.add(2, "start", { a, b });
    for (let i = 0; i <= a.length; i++) (dp[i] as number[])[0] = i;
    for (let j = 0; j <= b.length; j++) (dp[0] as number[])[j] = j;
    G.log.add(6, "borders", { a, b });
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const same = a[i - 1] === b[j - 1];
        (dp[i] as number[])[j] = Math.min(
          (dp[i - 1]?.[j] as number) + 1,
          (dp[i]?.[j - 1] as number) + 1,
          (dp[i - 1]?.[j - 1] as number) + (same ? 0 : 1),
        );
      }
      G.setRow(i);
      const ch = a[i - 1] as string;
      G.log.add(
        10,
        "row",
        { ch, i, best: dp[i]?.[b.length] as number },
        numberQuestion("qRow", { ch, b }, dp[i]?.[b.length] as number, [
          dp[i - 1]?.[b.length] as number,
          (dp[i - 1]?.[b.length] as number) + 1,
        ]),
      );
    }
    G.setRow(null);
    // Walk back to list the edits.
    const path: string[] = [];
    const edits: string[] = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      path.push(`${i},${j}`);
      const here = dp[i]?.[j] as number;
      if (
        i > 0 &&
        j > 0 &&
        here === (dp[i - 1]?.[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1)
      ) {
        edits.unshift(a[i - 1] === b[j - 1] ? `keep ${a[i - 1]}` : `${a[i - 1]}→${b[j - 1]}`);
        i--;
        j--;
      } else if (i > 0 && here === (dp[i - 1]?.[j] as number) + 1) {
        edits.unshift(`−${a[i - 1]}`);
        i--;
      } else {
        edits.unshift(`+${b[j - 1]}`);
        j--;
      }
    }
    path.push("0,0");
    G.setPath(path);
    G.log.add(13, "answer", {
      a,
      b,
      d: dp[a.length]?.[b.length] as number,
      edits: edits.join(", "),
    });
    all.push(...G.log.steps);
  }
  return all;
}

function WordGrid({ s, kind }: { s: DsStep<WordGridState>; kind: "lcs" | "edit" }) {
  const tx = useDynamicT();
  const st = s.state;
  const stateOf = (r: number, c: number): GridCell =>
    st.path.includes(`${r},${c}`)
      ? "path"
      : st.row === r
        ? "row"
        : st.row !== null && r === st.row - 1
          ? "source"
          : "filled";
  return (
    <DpGrid
      caption={tx(`viz.ds.${kind}.caption`, { a: st.a, b: st.b })}
      colLabels={["ε", ...st.b.split("")]}
      rowLabels={["ε", ...st.a.split("")]}
      cells={st.dp}
      stateOf={stateOf}
    />
  );
}

export function LcsPlayer() {
  return (
    <DsPlayer
      prefix="lcs"
      code={LCS_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "lcs ABCBDAB BDCABA" },
        { key: "dna", start: "", ops: "lcs GATTACA GCATGCA" },
        { key: "none", start: "", ops: "lcs ABCDEF UVWXYZ" },
        { key: "card", start: "", ops: "lcs ABCB BDCB" },
      ]}
      forms={LCS_FORMS}
      run={lcsSteps}
      stage={(s: DsStep<WordGridState>) => <WordGrid s={s} kind="lcs" />}
      vars={(s) => [{ name: "row", value: s.state.row ?? "—" }]}
    />
  );
}

export function EditDistancePlayer() {
  return (
    <DsPlayer
      prefix="edit"
      code={EDIT_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "edit SUNDAY SATURDAY" },
        { key: "kitten", start: "", ops: "edit KITTEN SITTING" },
        { key: "insert", start: "", ops: "edit FLAW LAWN" },
        { key: "card", start: "", ops: "edit CAT CUT" },
      ]}
      forms={EDIT_FORMS}
      run={editSteps}
      stage={(s: DsStep<WordGridState>) => <WordGrid s={s} kind="edit" />}
      vars={(s) => [{ name: "row", value: s.state.row ?? "—" }]}
    />
  );
}
