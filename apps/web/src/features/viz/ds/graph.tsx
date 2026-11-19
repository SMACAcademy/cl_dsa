import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { GraphPicture, undirectedEdges } from "./graphPicture";
import { cmd, V, type OpForm } from "./ops";
import { pyList, StepLog, type DsStep, type Question } from "./steps";

export const GRAPH_CODE: readonly string[] = [
  "graph = {}  # adjacency list: vertex -> list of neighbours",
  "def add_edge(u, v):",
  "    graph.setdefault(u, []).append(v)",
  "    graph.setdefault(v, []).append(u)",
  "",
  "def has_edge_list(u, v):",
  "    return v in graph.get(u, [])  # scans u's neighbours",
  "",
  "def has_edge_matrix(m, i, j):",
  "    return m[i][j] == 1  # one lookup",
  "",
  "def remove_edge(u, v):",
  "    graph[u].remove(v)",
  "    graph[v].remove(u)",
  "",
  "def neighbours(u):",
  "    return graph[u]",
];

export type GraphOp =
  { kind: "add" | "remove" | "has"; u: string; v: string } | { kind: "neighbours"; u: string };

export const GRAPH_FORMS: readonly OpForm<GraphOp>[] = [
  {
    pattern: cmd(`add ${V} ${V}`),
    build: (m) => ({ kind: "add", u: m[1] as string, v: m[2] as string }),
  },
  {
    pattern: cmd(`remove ${V} ${V}`),
    build: (m) => ({ kind: "remove", u: m[1] as string, v: m[2] as string }),
  },
  {
    pattern: cmd(`has ${V} ${V}`),
    build: (m) => ({ kind: "has", u: m[1] as string, v: m[2] as string }),
  },
  { pattern: cmd(`neighbours ${V}`), build: (m) => ({ kind: "neighbours", u: m[1] as string }) },
  { pattern: cmd(`neighbors ${V}`), build: (m) => ({ kind: "neighbours", u: m[1] as string }) },
];

/** What to highlight: vertices, one edge, list entries ("u:k"), matrix cells ("u,v"). */
export type GraphHighlight = {
  vertices: readonly string[];
  edge: readonly [string, string] | null;
  listCells: readonly string[];
  matrixCells: readonly string[];
};

export type GraphState = {
  adj: Readonly<Record<string, readonly string[]>>;
  hl: GraphHighlight;
};

const NONE: GraphHighlight = { vertices: [], edge: null, listCells: [], matrixCells: [] };
const yesNo = (u: string, v: string, yes: boolean): Question => ({
  say: { key: "qHas", vars: { u, v } },
  options: ["✓", "✗"],
  correct: yes ? "✓" : "✗",
});

export const sortedVertices = (adj: Readonly<Record<string, readonly string[]>>) =>
  Object.keys(adj).sort((a, b) =>
    /^-?\d+$/.test(a) && /^-?\d+$/.test(b) ? Number(a) - Number(b) : a.localeCompare(b),
  );

export function graphSteps(_start: readonly string[], ops: readonly GraphOp[]) {
  const adj: Record<string, string[]> = {};
  let hl: GraphHighlight = NONE;
  const log = new StepLog<GraphState>(() => ({
    adj: Object.fromEntries(Object.entries(adj).map(([k, v]) => [k, [...v]])),
    hl,
  }));
  const edgeCount = () => Object.values(adj).reduce((n, l) => n + l.length, 0) / 2;

  log.add(1, "start");
  for (const op of ops) {
    hl = NONE;
    const { u } = op;
    if (op.kind === "neighbours") {
      const list = adj[u];
      if (!list) {
        log.add(17, "noVertex", { u });
        continue;
      }
      hl = {
        vertices: [u, ...list],
        edge: null,
        listCells: list.map((_, k) => `${u}:${k}`),
        matrixCells: sortedVertices(adj).map((w) => `${u},${w}`),
      };
      log.add(17, "neighbours", {
        u,
        list: pyList(list),
        deg: list.length,
        n: Object.keys(adj).length,
      });
      continue;
    }
    const { v } = op;
    if (u === v) {
      log.add(op.kind === "add" ? 3 : 7, "selfLoop", { u });
      continue;
    }
    const has = (adj[u] ?? []).includes(v);
    if (op.kind === "add") {
      if (has) {
        hl = { ...NONE, vertices: [u, v], edge: [u, v] };
        log.add(3, "already", { u, v });
        continue;
      }
      const fresh = [u, v].filter((x) => !adj[x]);
      (adj[u] ??= []).push(v);
      (adj[v] ??= []).push(u);
      hl = {
        vertices: [u, v],
        edge: [u, v],
        listCells: [
          `${u}:${(adj[u] as string[]).length - 1}`,
          `${v}:${(adj[v] as string[]).length - 1}`,
        ],
        matrixCells: [`${u},${v}`, `${v},${u}`],
      };
      log.add(4, fresh.length > 0 ? "addNew" : "add", { u, v, fresh: fresh.join(", ") });
    } else if (op.kind === "has") {
      hl = { ...NONE, vertices: [u, v], matrixCells: [`${u},${v}`] };
      log.add(10, has ? "matrixYes" : "matrixNo", { u, v }, yesNo(u, v, has));
      const list = adj[u] ?? [];
      const at = list.indexOf(v);
      const checks = at >= 0 ? at + 1 : list.length;
      hl = {
        ...NONE,
        vertices: [u, v],
        edge: has ? [u, v] : null,
        listCells: list.slice(0, checks).map((_, k) => `${u}:${k}`),
      };
      log.add(7, has ? "listYes" : "listNo", { u, v, checks, list: pyList(list) });
    } else {
      if (!has) {
        log.add(13, "removeMissing", { u, v });
        continue;
      }
      adj[u] = (adj[u] as string[]).filter((x) => x !== v);
      adj[v] = (adj[v] as string[]).filter((x) => x !== u);
      hl = { ...NONE, vertices: [u, v], matrixCells: [`${u},${v}`, `${v},${u}`] };
      log.add(14, "removed", { u, v });
    }
  }
  hl = NONE;
  const n = Object.keys(adj).length;
  const e = edgeCount();
  log.add(0, "end", { n, e, listSize: n + 2 * e, matrixSize: n * n });
  return log.steps;
}

function GraphStage({ s }: { s: DsStep<GraphState> }) {
  const { t } = useTranslation();
  const { adj, hl } = s.state;
  const vs = sortedVertices(adj);
  const cell = "border border-line px-1.5 py-0.5 text-center";
  if (vs.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{t("viz.ds.graph.emptyGraph")}</p>;
  }
  return (
    <div className="grid items-start gap-4 md:grid-cols-3">
      <GraphPicture
        vertices={vs}
        edges={undirectedEdges(adj, vs)}
        vertexState={(v) => (hl.vertices.includes(v) ? "current" : "idle")}
        edgeState={(u, w) =>
          hl.edge !== null &&
          ((hl.edge[0] === u && hl.edge[1] === w) || (hl.edge[0] === w && hl.edge[1] === u))
            ? "on"
            : "idle"
        }
      />
      <div>
        <p className="mb-1 text-center text-xs font-semibold text-muted">
          {t("viz.ds.graph.listTitle")}
        </p>
        <ul aria-label={t("viz.ds.graph.listTitle")} className="space-y-1 font-mono text-sm">
          {vs.map((u) => (
            <li key={u} className="flex flex-wrap items-center gap-1">
              <span className="w-6 font-semibold">{u}:</span>
              {(adj[u] ?? []).length === 0 && <span className="text-muted">[ ]</span>}
              {(adj[u] ?? []).map((w, k) => (
                <span
                  key={`${w}-${k}`}
                  className={`rounded-sm border px-1.5 ${
                    hl.listCells.includes(`${u}:${k}`)
                      ? "border-compare bg-compare-soft text-compare-ink"
                      : "border-line bg-raised"
                  }`}
                >
                  {w}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse font-mono text-sm">
          <caption className="mb-1 text-xs font-semibold text-muted">
            {t("viz.ds.graph.matrixTitle")}
          </caption>
          <thead>
            <tr>
              <td className="px-1.5" />
              {vs.map((w) => (
                <th key={w} scope="col" className="px-1.5 font-semibold">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vs.map((u) => (
              <tr key={u}>
                <th scope="row" className="px-1.5 font-semibold">
                  {u}
                </th>
                {vs.map((w) => {
                  const on = (adj[u] ?? []).includes(w);
                  const lit = hl.matrixCells.includes(`${u},${w}`);
                  return (
                    <td
                      key={w}
                      className={`${cell} ${lit ? "bg-compare-soft text-compare-ink" : on ? "bg-found-soft text-found-ink" : "text-muted"}`}
                    >
                      {on ? 1 : 0}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GraphPlayer() {
  return (
    <DsPlayer
      prefix="graph"
      code={GRAPH_CODE}
      startField={null}
      presets={[
        {
          key: "tour",
          start: "",
          ops: "add A B, add A C, add B D, has B D, has C D, neighbours A",
        },
        {
          key: "square",
          start: "",
          ops: "add 1 2, add 2 3, add 3 4, add 4 1, remove 1 2, neighbours 1",
        },
        {
          key: "star",
          start: "",
          ops: "add H A, add H B, add H C, add H D, neighbours H, has A B",
        },
      ]}
      forms={GRAPH_FORMS}
      run={graphSteps}
      stage={(s: DsStep<GraphState>) => <GraphStage s={s} />}
      vars={(s) => {
        const n = Object.keys(s.state.adj).length;
        const e = Object.values(s.state.adj).reduce((sum, l) => sum + l.length, 0) / 2;
        return [
          { name: "V", value: n },
          { name: "E", value: e },
        ];
      }}
    />
  );
}
