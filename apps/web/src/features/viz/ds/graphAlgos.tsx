import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { sortedVertices } from "./graph";
import { GraphPicture, type EdgeState, type PictureEdge, type VertexState } from "./graphPicture";
import { cmd, V, type OpForm, type OpsError } from "./ops";
import { pyList, StepLog, type DsStep, type Question } from "./steps";

/* ------------------------------ Shared input ------------------------------ */

export type EdgeOp = { u: string; w: string; weight: number };

const SEP = String.raw`(?:\s*[-–]\s*|\s+)`;
/** Vertex names for directed graphs may be short words ("wake", "dress"). */
const VW = String.raw`([A-Za-z]{1,6}|\d{1,2})`;

export const UNDIRECTED_FORMS: readonly OpForm<EdgeOp>[] = [
  {
    pattern: cmd(`${V}${SEP}${V}`),
    build: (m) => ({ u: m[1] as string, w: m[2] as string, weight: 1 }),
  },
];
export const WEIGHTED_FORMS: readonly OpForm<EdgeOp>[] = [
  {
    pattern: cmd(String.raw`${V}${SEP}${V}\s+(\d{1,2})`),
    build: (m) => ({ u: m[1] as string, w: m[2] as string, weight: Number(m[3]) }),
  },
];
export const DIRECTED_FORMS: readonly OpForm<EdgeOp>[] = [
  {
    pattern: cmd(String.raw`${VW}\s*(?:->|>|→)\s*${VW}`),
    build: (m) => ({ u: m[1] as string, w: m[2] as string, weight: 1 }),
  },
];

/** The start field holds exactly one vertex. */
export function validateVertex(start: string[]): OpsError | null {
  return start.length === 1 ? null : { key: "badVertex" };
}

type Graph = {
  vertices: string[];
  adj: Record<string, string[]>;
  weight: Record<string, number>;
  edges: PictureEdge[];
};

const key = (u: string, w: string) => [u, w].sort().join("|");

/** Builds a graph from edge ops; neighbours are kept sorted so runs are predictable. */
export function buildGraph(ops: readonly EdgeOp[], directed: boolean, weighted: boolean): Graph {
  const adj: Record<string, string[]> = {};
  const weight: Record<string, number> = {};
  const edges: PictureEdge[] = [];
  for (const { u, w, weight: wt } of ops) {
    if (u === w) continue;
    adj[u] ??= [];
    adj[w] ??= [];
    const k = directed ? `${u}>${w}` : key(u, w);
    if (k in weight) continue;
    weight[k] = wt;
    (adj[u] as string[]).push(w);
    if (!directed) (adj[w] as string[]).push(u);
    edges.push({ u, w, label: weighted ? String(wt) : undefined });
  }
  const order = sortedVertices(adj);
  for (const v of order) (adj[v] as string[]).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { vertices: order, adj, weight, edges };
}

const vertexQuestion = (g: Graph, correct: string, say: string): Question => ({
  say: { key: say },
  options: g.vertices,
  correct,
});

type Highlight = {
  current: string | null;
  checking: readonly [string, string] | null;
};

const sameEdge = (c: readonly [string, string] | null, u: string, w: string, directed = false) =>
  c !== null && ((c[0] === u && c[1] === w) || (!directed && c[0] === w && c[1] === u));

function Chips({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1 font-mono text-sm">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {values.length === 0 && <span className="text-muted">[ ]</span>}
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="rounded-sm border border-line bg-raised px-1.5">
          {v}
        </span>
      ))}
    </p>
  );
}

/* ----------------------------------- BFS ----------------------------------- */

export const BFS_CODE: readonly string[] = [
  "from collections import deque",
  "",
  "def bfs(graph, start):",
  "    seen = {start}",
  "    queue = deque([start])",
  "    order = []",
  "    while queue:",
  "        v = queue.popleft()",
  "        order.append(v)",
  "        for w in graph[v]:",
  "            if w not in seen:",
  "                seen.add(w)",
  "                queue.append(w)",
  "    return order",
];

export type TraverseState = Highlight & {
  graph: Graph;
  seen: readonly string[];
  /** BFS: the queue. DFS: the recursion path (call stack). */
  waiting: readonly string[];
  order: readonly string[];
};

export function bfsSteps(start: readonly string[], ops: readonly EdgeOp[]) {
  const g = buildGraph(ops, false, false);
  const s = start[0] as string;
  const seen: string[] = [];
  const queue: string[] = [];
  const order: string[] = [];
  let hl: Highlight = { current: null, checking: null };
  const log = new StepLog<TraverseState>(() => ({
    graph: g,
    seen: [...seen],
    waiting: [...queue],
    order: [...order],
    ...hl,
  }));
  if (!g.adj[s]) {
    log.add(3, "missingStart", { s });
    return log.steps;
  }
  seen.push(s);
  queue.push(s);
  log.add(5, "start", { s });
  while (queue.length > 0) {
    const v = queue.shift() as string;
    order.push(v);
    hl = { current: v, checking: null };
    log.add(9, "visit", { v, order: pyList(order) }, vertexQuestion(g, v, "qNext"));
    for (const w of g.adj[v] ?? []) {
      hl = { current: v, checking: [v, w] };
      if (seen.includes(w)) {
        log.add(11, "seen", { v, w });
      } else {
        seen.push(w);
        queue.push(w);
        log.add(13, "enqueue", { v, w, queue: pyList(queue) });
      }
    }
  }
  hl = { current: null, checking: null };
  const missed = g.vertices.filter((v) => !seen.includes(v));
  log.add(14, missed.length ? "endSome" : "endAll", {
    order: pyList(order),
    missed: missed.join(", "),
  });
  return log.steps;
}

/* ----------------------------------- DFS ----------------------------------- */

export const DFS_CODE: readonly string[] = [
  "def dfs(graph, v, seen=None, order=None):",
  "    if seen is None:",
  "        seen, order = set(), []",
  "    seen.add(v)",
  "    order.append(v)",
  "    for w in graph[v]:",
  "        if w not in seen:",
  "            dfs(graph, w, seen, order)",
  "    return order",
];

export function dfsSteps(start: readonly string[], ops: readonly EdgeOp[]) {
  const g = buildGraph(ops, false, false);
  const s = start[0] as string;
  const seen: string[] = [];
  const path: string[] = [];
  const order: string[] = [];
  let hl: Highlight = { current: null, checking: null };
  const log = new StepLog<TraverseState>(() => ({
    graph: g,
    seen: [...seen],
    waiting: [...path],
    order: [...order],
    ...hl,
  }));
  if (!g.adj[s]) {
    log.add(1, "missingStart", { s });
    return log.steps;
  }
  log.add(1, "start", { s });
  const visit = (v: string) => {
    seen.push(v);
    order.push(v);
    path.push(v);
    hl = { current: v, checking: null };
    log.add(5, "visit", { v, order: pyList(order) }, vertexQuestion(g, v, "qNext"));
    for (const w of g.adj[v] ?? []) {
      hl = { current: v, checking: [v, w] };
      if (seen.includes(w)) {
        log.add(7, "seen", { v, w });
      } else {
        log.add(8, "deeper", { v, w });
        visit(w);
        hl = { current: v, checking: null };
      }
    }
    path.pop();
    const parent = path.at(-1);
    hl = { current: parent ?? null, checking: null };
    if (parent) log.add(9, "back", { v, parent });
    else log.add(9, "doneRoot", { v });
  };
  visit(s);
  const missed = g.vertices.filter((v) => !seen.includes(v));
  log.add(9, missed.length ? "endSome" : "endAll", {
    order: pyList(order),
    missed: missed.join(", "),
  });
  return log.steps;
}

function TraverseStage({ s, kind }: { s: DsStep<TraverseState>; kind: "bfs" | "dfs" }) {
  const { t } = useTranslation();
  const st = s.state;
  const vertexState = (v: string): VertexState =>
    st.current === v
      ? "current"
      : st.order.includes(v)
        ? "found"
        : st.seen.includes(v) || st.waiting.includes(v)
          ? "queued"
          : "idle";
  const edgeState = (u: string, w: string): EdgeState =>
    sameEdge(st.checking, u, w) ? "on" : "idle";
  return (
    <>
      <GraphPicture
        vertices={st.graph.vertices}
        edges={st.graph.edges}
        vertexState={vertexState}
        edgeState={edgeState}
      />
      <Chips label={t(`viz.ds.${kind}.waitingLabel`)} values={st.waiting} />
      <Chips label={t("viz.ds.graphAlgo.orderLabel")} values={st.order} />
    </>
  );
}

/* ---------------------------- Topological sort ---------------------------- */

export const TOPO_CODE: readonly string[] = [
  "from collections import deque",
  "",
  "def topo_sort(graph, indegree):",
  "    ready = deque(v for v in graph if indegree[v] == 0)",
  "    order = []",
  "    while ready:",
  "        v = ready.popleft()",
  "        order.append(v)",
  "        for w in graph[v]:",
  "            indegree[w] -= 1",
  "            if indegree[w] == 0:",
  "                ready.append(w)",
  "    return order  # shorter than the graph? there was a cycle",
];

export type TopoState = Highlight & {
  graph: Graph;
  indegree: Readonly<Record<string, number>>;
  ready: readonly string[];
  order: readonly string[];
};

export function topoSteps(_start: readonly string[], ops: readonly EdgeOp[]) {
  const g = buildGraph(ops, true, false);
  const indegree: Record<string, number> = Object.fromEntries(g.vertices.map((v) => [v, 0]));
  for (const v of g.vertices)
    for (const w of g.adj[v] ?? []) indegree[w] = (indegree[w] as number) + 1;
  const ready = g.vertices.filter((v) => indegree[v] === 0);
  const order: string[] = [];
  let hl: Highlight = { current: null, checking: null };
  const log = new StepLog<TopoState>(() => ({
    graph: g,
    indegree: { ...indegree },
    ready: [...ready],
    order: [...order],
    ...hl,
  }));
  log.add(4, "start", { ready: pyList(ready) });
  while (ready.length > 0) {
    const v = ready.shift() as string;
    order.push(v);
    hl = { current: v, checking: null };
    log.add(8, "output", { v, order: pyList(order) }, vertexQuestion(g, v, "qNext"));
    for (const w of g.adj[v] ?? []) {
      indegree[w] = (indegree[w] as number) - 1;
      hl = { current: v, checking: [v, w] };
      if (indegree[w] === 0) {
        ready.push(w);
        log.add(12, "nowReady", { v, w });
      } else {
        log.add(10, "decrement", { v, w, d: indegree[w] as number });
      }
    }
  }
  hl = { current: null, checking: null };
  const left = g.vertices.filter((v) => !order.includes(v));
  log.add(13, left.length ? "cycle" : "endAll", { order: pyList(order), left: left.join(", ") });
  return log.steps;
}

function TopoStage({ s }: { s: DsStep<TopoState> }) {
  const { t } = useTranslation();
  const st = s.state;
  return (
    <>
      <GraphPicture
        vertices={st.graph.vertices}
        edges={st.graph.edges}
        directed
        vertexState={(v) =>
          st.current === v
            ? "current"
            : st.order.includes(v)
              ? "found"
              : st.ready.includes(v)
                ? "queued"
                : "idle"
        }
        edgeState={(u, w) =>
          sameEdge(st.checking, u, w, true) ? "on" : st.order.includes(u) ? "rejected" : "idle"
        }
        vertexSub={(v) =>
          st.order.includes(v) ? undefined : t("viz.ds.topo.indegree", { d: st.indegree[v] ?? 0 })
        }
      />
      <Chips label={t("viz.ds.topo.readyLabel")} values={st.ready} />
      <Chips label={t("viz.ds.graphAlgo.orderLabel")} values={st.order} />
    </>
  );
}

/* --------------------------------- Dijkstra --------------------------------- */

export const DIJKSTRA_CODE: readonly string[] = [
  "import heapq",
  "",
  "def dijkstra(graph, start):",
  "    dist = {v: float('inf') for v in graph}",
  "    dist[start] = 0",
  "    heap = [(0, start)]",
  "    while heap:",
  "        d, v = heapq.heappop(heap)",
  "        if d > dist[v]:",
  "            continue  # stale entry",
  "        for w, weight in graph[v]:",
  "            if d + weight < dist[w]:",
  "                dist[w] = d + weight",
  "                heapq.heappush(heap, (dist[w], w))",
  "    return dist",
];

export type DijkstraState = Highlight & {
  graph: Graph;
  dist: Readonly<Record<string, number | null>>;
  settled: readonly string[];
  heap: readonly (readonly [number, string])[];
};

const INF = "∞";
const show = (d: number | null) => (d === null ? INF : String(d));

export function dijkstraSteps(start: readonly string[], ops: readonly EdgeOp[]) {
  const g = buildGraph(ops, false, true);
  const s = start[0] as string;
  const dist: Record<string, number | null> = Object.fromEntries(g.vertices.map((v) => [v, null]));
  const settled: string[] = [];
  const heap: [number, string][] = [];
  const push = (d: number, v: string) => {
    heap.push([d, v]);
    heap.sort((a, b) => a[0] - b[0] || g.vertices.indexOf(a[1]) - g.vertices.indexOf(b[1]));
  };
  let hl: Highlight = { current: null, checking: null };
  const log = new StepLog<DijkstraState>(() => ({
    graph: g,
    dist: { ...dist },
    settled: [...settled],
    heap: heap.map(([d, v]) => [d, v] as const),
    ...hl,
  }));
  if (!(s in dist)) {
    log.add(3, "missingStart", { s });
    return log.steps;
  }
  dist[s] = 0;
  push(0, s);
  log.add(6, "start", { s });
  while (heap.length > 0) {
    const [d, v] = heap.shift() as [number, string];
    if (d > (dist[v] as number)) {
      hl = { current: v, checking: null };
      log.add(10, "stale", { v, d, best: dist[v] as number });
      continue;
    }
    settled.push(v);
    hl = { current: v, checking: null };
    log.add(8, "settle", { v, d }, vertexQuestion(g, v, "qNext"));
    for (const w of g.adj[v] ?? []) {
      const weight = g.weight[key(v, w)] as number;
      const nd = d + weight;
      const old = dist[w] ?? null;
      hl = { current: v, checking: [v, w] };
      if (old === null || nd < old) {
        dist[w] = nd;
        push(nd, w);
        log.add(13, "improve", { v, w, d, weight, nd, old: show(old) });
      } else {
        log.add(12, "keep", { v, w, d, weight, nd, old: show(old) });
      }
    }
  }
  hl = { current: null, checking: null };
  log.add(15, "end", { dists: g.vertices.map((v) => `${v} ${show(dist[v] ?? null)}`).join(", ") });
  return log.steps;
}

function DijkstraStage({ s }: { s: DsStep<DijkstraState> }) {
  const { t } = useTranslation();
  const st = s.state;
  return (
    <>
      <GraphPicture
        vertices={st.graph.vertices}
        edges={st.graph.edges}
        vertexState={(v) =>
          st.current === v ? "current" : st.settled.includes(v) ? "found" : "idle"
        }
        edgeState={(u, w) => (sameEdge(st.checking, u, w) ? "on" : "idle")}
        vertexSub={(v) => show(st.dist[v] ?? null)}
      />
      <Chips
        label={t("viz.ds.dijkstra.heapLabel")}
        values={st.heap.map(([d, v]) => `(${d}, ${v})`)}
      />
    </>
  );
}

/* --------------------------------- Kruskal --------------------------------- */

export const KRUSKAL_CODE: readonly string[] = [
  "def kruskal(vertices, edges):",
  "    parent = {v: v for v in vertices}",
  "    def find(v):",
  "        while parent[v] != v:",
  "            v = parent[v]",
  "        return v",
  "    tree = []",
  "    for weight, u, v in sorted(edges):",
  "        ru, rv = find(u), find(v)",
  "        if ru != rv:",
  "            parent[rv] = ru",
  "            tree.append((u, v, weight))",
  "    return tree",
];

export type KruskalState = {
  graph: Graph;
  sorted: readonly PictureEdge[];
  taken: readonly string[];
  rejected: readonly string[];
  considering: string | null;
  total: number;
};

export function kruskalSteps(_start: readonly string[], ops: readonly EdgeOp[]) {
  const g = buildGraph(ops, false, true);
  const sorted = [...g.edges].sort(
    (a, b) => (g.weight[key(a.u, a.w)] as number) - (g.weight[key(b.u, b.w)] as number),
  );
  const parent: Record<string, string> = Object.fromEntries(g.vertices.map((v) => [v, v]));
  const find = (v: string) => {
    let r = v;
    while (parent[r] !== r) r = parent[r] as string;
    return r;
  };
  const taken: string[] = [];
  const rejected: string[] = [];
  let considering: string | null = null;
  let total = 0;
  const log = new StepLog<KruskalState>(() => ({
    graph: g,
    sorted,
    taken: [...taken],
    rejected: [...rejected],
    considering,
    total,
  }));
  const label = (e: PictureEdge) => `${e.u}–${e.w} ${g.weight[key(e.u, e.w)]}`;
  log.add(8, "start", { sorted: sorted.map(label).join(", ") });
  for (const e of sorted) {
    const k = key(e.u, e.w);
    const weight = g.weight[k] as number;
    const ru = find(e.u);
    const rv = find(e.w);
    considering = k;
    const q: Question = {
      say: { key: "qTake", vars: { u: e.u, w: e.w } },
      options: ["✓", "✗"],
      correct: ru !== rv ? "✓" : "✗",
    };
    log.add(9, "consider", { u: e.u, w: e.w, weight });
    if (ru !== rv) {
      parent[rv] = ru;
      taken.push(k);
      total += weight;
      considering = null;
      log.add(12, "take", { u: e.u, w: e.w, weight, total }, q);
    } else {
      rejected.push(k);
      considering = null;
      log.add(10, "skip", { u: e.u, w: e.w, weight }, q);
    }
  }
  const complete = taken.length === g.vertices.length - 1;
  log.add(13, complete ? "end" : "endForest", { total, count: taken.length, n: g.vertices.length });
  return log.steps;
}

function KruskalStage({ s }: { s: DsStep<KruskalState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const stateOf = (u: string, w: string): EdgeState => {
    const k = key(u, w);
    return st.considering === k
      ? "on"
      : st.taken.includes(k)
        ? "taken"
        : st.rejected.includes(k)
          ? "rejected"
          : "idle";
  };
  const inTree = new Set(st.taken.flatMap((k) => k.split("|")));
  return (
    <>
      <GraphPicture
        vertices={st.graph.vertices}
        edges={st.graph.edges}
        vertexState={(v) => (inTree.has(v) ? "found" : "idle")}
        edgeState={stateOf}
      />
      <Chips
        label={t("viz.ds.kruskal.sortedLabel")}
        values={st.sorted.map((e) => {
          const k = key(e.u, e.w);
          const mark = st.taken.includes(k) ? "✓ " : st.rejected.includes(k) ? "✗ " : "";
          return `${mark}${e.u}–${e.w} ${st.graph.weight[k]}`;
        })}
      />
    </>
  );
}

/* --------------------------------- Players --------------------------------- */

export function BfsPlayer() {
  return (
    <DsPlayer
      prefix="bfs"
      code={BFS_CODE}
      startField="vertex"
      validateStart={validateVertex}
      opsField="edges"
      presets={[
        { key: "tour", start: "A", ops: "A B, A C, B D, B E, C F, C G, D H, E H, F I, G I" },
        { key: "card", start: "A", ops: "A B, A C, B D, C D" },
        { key: "rings", start: "A", ops: "A B, A C, B D, B E, C F, E F, D G, F H, G H" },
        { key: "island", start: "A", ops: "A B, B C, A D, D E, F G, G H" },
      ]}
      forms={UNDIRECTED_FORMS}
      run={bfsSteps}
      stage={(s: DsStep<TraverseState>) => <TraverseStage s={s} kind="bfs" />}
      vars={(s) => [
        { name: "v", value: s.state.current ?? "—" },
        { name: "queue", value: pyList(s.state.waiting) },
      ]}
    />
  );
}

export function DfsPlayer() {
  return (
    <DsPlayer
      prefix="dfs"
      code={DFS_CODE}
      startField="vertex"
      validateStart={validateVertex}
      opsField="edges"
      presets={[
        { key: "tour", start: "A", ops: "A B, A C, B D, B E, C F, C G, D H, E H, F I, G I" },
        { key: "deep", start: "A", ops: "A B, B C, C D, D E, E F, A G, G H, H I, C J" },
        { key: "island", start: "A", ops: "A B, B C, A D, D E, F G, G H" },
        { key: "card", start: "A", ops: "A B, A C, B D, C D" },
      ]}
      forms={UNDIRECTED_FORMS}
      run={dfsSteps}
      stage={(s: DsStep<TraverseState>) => <TraverseStage s={s} kind="dfs" />}
      vars={(s) => [
        { name: "v", value: s.state.current ?? "—" },
        { name: "depth", value: s.state.waiting.length },
      ]}
    />
  );
}

export function TopoSortPlayer() {
  return (
    <DsPlayer
      prefix="topo"
      code={TOPO_CODE}
      startField={null}
      opsField="edges"
      presets={[
        {
          key: "tour",
          start: "",
          ops: "wake > shower, wake > eat, shower > dress, eat > brush, brush > dress, dress > shoes, dress > bag, shoes > leave, bag > leave, eat > coffee, coffee > leave",
        },
        {
          key: "courses",
          start: "",
          ops: "intro > data, intro > algo, data > algo, algo > ai, math > algo, math > stats, stats > ai, data > db, db > web, algo > web",
        },
        { key: "cycle", start: "", ops: "a > b, b > c, c > d, d > e, e > c, a > f, f > g" },
        {
          key: "card",
          start: "",
          ops: "wake > dress, wake > eat, dress > leave, eat > leave",
        },
      ]}
      forms={DIRECTED_FORMS}
      run={topoSteps}
      stage={(s: DsStep<TopoState>) => <TopoStage s={s} />}
      vars={(s) => [
        { name: "ready", value: pyList(s.state.ready) },
        { name: "order", value: pyList(s.state.order) },
      ]}
    />
  );
}

export function DijkstraPlayer() {
  return (
    <DsPlayer
      prefix="dijkstra"
      code={DIJKSTRA_CODE}
      startField="vertex"
      validateStart={validateVertex}
      opsField="edges"
      presets={[
        {
          key: "tour",
          start: "A",
          ops: "A B 4, A C 1, C B 2, B D 1, C E 5, D E 1, D F 6, E F 2, E G 7, F G 1",
        },
        {
          key: "detour",
          start: "S",
          ops: "S A 7, S B 2, B C 2, C A 1, A T 1, C T 6, S D 3, D E 4, E T 2, B E 9",
        },
        { key: "tie", start: "A", ops: "A B 1, A C 1, B D 1, C D 1, D E 2, D F 2, E G 1, F G 1" },
        { key: "card", start: "A", ops: "A B 4, A C 1, C B 2, B D 1" },
      ]}
      forms={WEIGHTED_FORMS}
      run={dijkstraSteps}
      stage={(s: DsStep<DijkstraState>) => <DijkstraStage s={s} />}
      vars={(s) => [
        { name: "v", value: s.state.current ?? "—" },
        { name: "settled", value: pyList(s.state.settled) },
      ]}
    />
  );
}

export function KruskalPlayer() {
  return (
    <DsPlayer
      prefix="kruskal"
      code={KRUSKAL_CODE}
      startField={null}
      opsField="edges"
      presets={[
        {
          key: "tour",
          start: "",
          ops: "A B 4, A C 3, B C 1, B D 2, C D 4, C E 5, D E 7, D F 6, E F 3, E G 8, F G 2",
        },
        {
          key: "square",
          start: "",
          ops: "A B 3, B C 1, C D 4, D A 2, A C 5, B D 6, D E 2, E F 3, F A 7",
        },
        { key: "forest", start: "", ops: "A B 2, B C 1, D E 3, E F 2, G H 4" },
        { key: "card", start: "", ops: "A B 1, B C 2, A C 3, C D 4" },
      ]}
      forms={WEIGHTED_FORMS}
      run={kruskalSteps}
      stage={(s: DsStep<KruskalState>) => <KruskalStage s={s} />}
      vars={(s) => [
        { name: "edges taken", value: s.state.taken.length },
        { name: "total", value: s.state.total },
      ]}
    />
  );
}
