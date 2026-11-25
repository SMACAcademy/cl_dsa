import { useTranslation } from "react-i18next";
import { toDraw, type BTree } from "./binaryNodes";
import { DsPlayer } from "./DsPlayer";
import { cmd, randomNumbers, type OpForm } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";
import { TreeView } from "./treeView";
import type { NodeState } from "./views";

export const TRAVERSAL_CODE: readonly string[] = [
  "def preorder(node):",
  "    if node:",
  "        visit(node)",
  "        preorder(node.left)",
  "        preorder(node.right)",
  "",
  "def inorder(node):",
  "    if node:",
  "        inorder(node.left)",
  "        visit(node)",
  "        inorder(node.right)",
  "",
  "def postorder(node):",
  "    if node:",
  "        postorder(node.left)",
  "        postorder(node.right)",
  "        visit(node)",
  "",
  "def level_order(root):",
  "    queue = deque([root])",
  "    while queue:",
  "        node = queue.popleft()",
  "        visit(node)",
  "        queue.extend(c for c in (node.left, node.right) if c)",
];

export type Order = "preorder" | "inorder" | "postorder" | "levelorder";
export type TraversalOp = { kind: Order };

export const TRAVERSAL_FORMS: readonly OpForm<TraversalOp>[] = (
  ["preorder", "inorder", "postorder", "levelorder"] as const
).map((kind) => ({ pattern: cmd(kind), build: () => ({ kind }) }));

/** Code lines per order: [start, visit]. */
const LINES: Record<Order, [number, number]> = {
  preorder: [1, 3],
  inorder: [7, 10],
  postorder: [13, 17],
  levelorder: [20, 23],
};

/** Builds the complete binary tree whose level order is `values` (children of i: 2i+1, 2i+2). */
export function levelOrderTree(values: readonly string[]): BTree {
  const tree: BTree = { root: values.length > 0 ? 0 : null, nodes: {} };
  values.forEach((key, i) => {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    tree.nodes[i] = {
      id: i,
      key,
      left: l < values.length ? l : null,
      right: r < values.length ? r : null,
    };
  });
  return tree;
}

/** The visit order for each traversal, as node ids. */
export function visitOrder(tree: BTree, order: Order): number[] {
  const out: number[] = [];
  const rec = (id: number | null) => {
    if (id == null) return;
    const n = tree.nodes[id];
    if (!n) return;
    if (order === "preorder") out.push(id);
    rec(n.left);
    if (order === "inorder") out.push(id);
    rec(n.right);
    if (order === "postorder") out.push(id);
  };
  if (order === "levelorder") {
    const queue = tree.root == null ? [] : [tree.root];
    while (queue.length > 0) {
      const id = queue.shift() as number;
      out.push(id);
      const n = tree.nodes[id];
      if (n?.left != null) queue.push(n.left);
      if (n?.right != null) queue.push(n.right);
    }
  } else {
    rec(tree.root);
  }
  return out;
}

export type TraversalState = {
  tree: BTree;
  visited: readonly number[];
  current: number | null;
  output: readonly string[];
};

export function traversalSteps(start: readonly string[], ops: readonly TraversalOp[]) {
  const tree = levelOrderTree(start);
  let visited: number[] = [];
  let current: number | null = null;
  let output: string[] = [];
  const log = new StepLog<TraversalState>(() => ({
    tree,
    visited: [...visited],
    current,
    output: [...output],
  }));
  const labels = Object.values(tree.nodes).map((n) => n.key);

  log.add(0, "start", { count: start.length });
  for (const op of ops) {
    const [startLine, visitLine] = LINES[op.kind];
    visited = [];
    current = null;
    output = [];
    log.add(startLine, `${op.kind}Start`);
    for (const id of visitOrder(tree, op.kind)) {
      const key = tree.nodes[id]?.key as string;
      current = id;
      output.push(key);
      log.add(
        visitLine,
        "visit",
        { value: key, output: pyList(output) },
        { say: { key: "qNext" }, options: choices(labels), correct: key },
      );
      visited.push(id);
    }
    current = null;
    log.add(visitLine, `${op.kind}Result`, { output: pyList(output) });
  }
  visited = [];
  output = [];
  log.add(0, "end", { count: start.length });
  return log.steps;
}

function TraversalStage({ s }: { s: DsStep<TraversalState> }) {
  const { t } = useTranslation();
  const stateOf = (id: number): NodeState =>
    s.state.current === id ? "current" : s.state.visited.includes(id) ? "found" : "idle";
  return (
    <>
      <TreeView tree={toDraw(s.state.tree)} stateOf={stateOf} label={t("viz.ds.view.tree")} />
      <p className="text-center font-mono text-sm">
        <span className="text-muted">{t("viz.ds.traversal.outputLabel")} </span>
        {pyList(s.state.output)}
      </p>
    </>
  );
}

export function BinaryTreePlayer() {
  return (
    <DsPlayer
      prefix="traversal"
      code={TRAVERSAL_CODE}
      startField="values"
      presets={[
        {
          key: "tour",
          start: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12",
          ops: "preorder, inorder, postorder, levelorder",
        },
        {
          key: "inorder",
          start: "8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15",
          ops: "inorder",
        },
        { key: "letters", start: "A, B, C, D, E, F, G, H, I, J", ops: "preorder, postorder" },
        { key: "card", start: "1, 2, 3, 4, 5", ops: "preorder, inorder, postorder, levelorder" },
      ]}
      random={() => ({
        start: randomNumbers(12).join(", "),
        ops: "preorder, inorder, postorder, levelorder",
      })}
      forms={TRAVERSAL_FORMS}
      run={traversalSteps}
      stage={(s: DsStep<TraversalState>) => <TraversalStage s={s} />}
      vars={(s) => [
        {
          name: "node",
          value: s.state.current == null ? "—" : (s.state.tree.nodes[s.state.current]?.key ?? "—"),
        },
        { name: "visited", value: s.state.output.length },
      ]}
    />
  );
}
