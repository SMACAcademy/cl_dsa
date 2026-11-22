import { useTranslation } from "react-i18next";
import {
  cloneTree,
  cmp,
  emptyTree,
  heightOf,
  inorderKeys,
  sizeOf,
  toDraw,
  type BNode,
  type BTree,
} from "./binaryNodes";
import { sideQuestion } from "./bst";
import { DsPlayer } from "./DsPlayer";
import { cmd, N, numbersOnly, randomNumbers, type OpForm } from "./ops";
import { pyList, StepLog, type DsStep, type Vars } from "./steps";
import { TreeView } from "./treeView";
import type { NodeState } from "./views";

export const AVL_CODE: readonly string[] = [
  "def height(n):",
  "    return n.height if n else 0",
  "",
  "def rotate_right(y):",
  "    x = y.left",
  "    y.left, x.right = x.right, y",
  "    update(y); update(x)",
  "    return x",
  "",
  "def rotate_left(x):",
  "    y = x.right",
  "    x.right, y.left = y.left, x",
  "    update(x); update(y)",
  "    return y",
  "",
  "def insert(node, key):",
  "    if node is None:",
  "        return Node(key)",
  "    if key < node.key:",
  "        node.left = insert(node.left, key)",
  "    elif key > node.key:",
  "        node.right = insert(node.right, key)",
  "    else:",
  "        return node  # no duplicates",
  "    update(node)  # height = 1 + max(child heights)",
  "    balance = height(node.left) - height(node.right)",
  "    if balance > 1 and key < node.left.key:",
  "        return rotate_right(node)",
  "    if balance < -1 and key > node.right.key:",
  "        return rotate_left(node)",
  "    if balance > 1:",
  "        node.left = rotate_left(node.left)",
  "        return rotate_right(node)",
  "    if balance < -1:",
  "        node.right = rotate_right(node.right)",
  "        return rotate_left(node)",
  "    return node",
];

export type AvlOp = { kind: "insert"; k: string };

export const AVL_FORMS: readonly OpForm<AvlOp>[] = [
  { pattern: cmd(`insert ${N}`), build: (m) => ({ kind: "insert", k: m[1] as string }) },
];

export type AvlState = {
  tree: BTree;
  marks: Readonly<Record<number, NodeState>>;
};

export const balanceOf = (t: BTree, id: number) => {
  const n = t.nodes[id] as BNode;
  return heightOf(t, n.left) - heightOf(t, n.right);
};
const signed = (b: number) => (b > 0 ? `+${b}` : String(b));

type Emit = (
  line: number,
  key: string,
  vars?: Vars,
  marks?: Record<number, NodeState>,
  q?: boolean,
) => void;

/** AVL insert. With `emit`, every comparison, balance check and rotation becomes a step. */
export function avlInsert(tree: BTree, k: string, newId: () => number, emit?: Emit): void {
  const path: number[] = [];
  let id = tree.root;
  while (id != null) {
    const node = tree.nodes[id] as BNode;
    const c = cmp(k, node.key);
    if (c === 0) {
      emit?.(24, "duplicate", { k }, { [id]: "found" });
      return;
    }
    emit?.(
      c < 0 ? 20 : 22,
      c < 0 ? "goLeft" : "goRight",
      { k, v: node.key },
      { [id]: "current" },
      true,
    );
    path.push(id);
    id = c < 0 ? node.left : node.right;
  }
  const created = newId();
  tree.nodes[created] = { id: created, key: k, left: null, right: null };
  const parent = path.at(-1);
  if (parent == null) tree.root = created;
  else {
    const p = tree.nodes[parent] as BNode;
    p[cmp(k, p.key) < 0 ? "left" : "right"] = created;
  }
  emit?.(18, "create", { k }, { [created]: "new" });

  const attach = (parentId: number | null, oldChild: number, newChild: number) => {
    if (parentId == null) tree.root = newChild;
    else {
      const p = tree.nodes[parentId] as BNode;
      if (p.left === oldChild) p.left = newChild;
      else p.right = newChild;
    }
  };
  const rotateRight = (y: number) => {
    const yn = tree.nodes[y] as BNode;
    const x = yn.left as number;
    const xn = tree.nodes[x] as BNode;
    yn.left = xn.right;
    xn.right = y;
    return x;
  };
  const rotateLeft = (x: number) => {
    const xn = tree.nodes[x] as BNode;
    const y = xn.right as number;
    const yn = tree.nodes[y] as BNode;
    xn.right = yn.left;
    yn.left = x;
    return y;
  };

  for (let i = path.length - 1; i >= 0; i--) {
    const a = path[i] as number;
    const above = i > 0 ? (path[i - 1] as number) : null;
    const an = tree.nodes[a] as BNode;
    const b = balanceOf(tree, a);
    if (Math.abs(b) <= 1) {
      emit?.(26, "balanced", { v: an.key, b: signed(b) }, { [a]: "current" });
      continue;
    }
    emit?.(26, "unbalanced", { v: an.key, b: signed(b) }, { [a]: "changed" });
    if (b > 1) {
      const L = an.left as number;
      if (cmp(k, (tree.nodes[L] as BNode).key) < 0) {
        emit?.(27, "caseLL", { v: an.key }, { [a]: "changed" });
        const top = rotateRight(a);
        attach(above, a, top);
        emit?.(28, "rotatedRight", { top: (tree.nodes[top] as BNode).key }, { [top]: "found" });
      } else {
        emit?.(
          31,
          "caseLR",
          { v: an.key, c: (tree.nodes[L] as BNode).key },
          { [a]: "changed", [L]: "changed" },
        );
        an.left = rotateLeft(L);
        emit?.(
          32,
          "rotatedChildLeft",
          { top: (tree.nodes[an.left] as BNode).key },
          { [an.left]: "changed" },
        );
        const top = rotateRight(a);
        attach(above, a, top);
        emit?.(33, "rotatedRight", { top: (tree.nodes[top] as BNode).key }, { [top]: "found" });
      }
    } else {
      const R = an.right as number;
      if (cmp(k, (tree.nodes[R] as BNode).key) > 0) {
        emit?.(29, "caseRR", { v: an.key }, { [a]: "changed" });
        const top = rotateLeft(a);
        attach(above, a, top);
        emit?.(30, "rotatedLeft", { top: (tree.nodes[top] as BNode).key }, { [top]: "found" });
      } else {
        emit?.(
          34,
          "caseRL",
          { v: an.key, c: (tree.nodes[R] as BNode).key },
          { [a]: "changed", [R]: "changed" },
        );
        an.right = rotateRight(R);
        emit?.(
          35,
          "rotatedChildRight",
          { top: (tree.nodes[an.right] as BNode).key },
          { [an.right]: "changed" },
        );
        const top = rotateLeft(a);
        attach(above, a, top);
        emit?.(36, "rotatedLeft", { top: (tree.nodes[top] as BNode).key }, { [top]: "found" });
      }
    }
    return; // one (single or double) rotation rebalances an insertion
  }
}

export function avlSteps(start: readonly string[], ops: readonly AvlOp[]) {
  const tree = emptyTree();
  let nextId = 0;
  const newId = () => nextId++;
  for (const k of start) avlInsert(tree, k, newId);
  let marks: Record<number, NodeState> = {};
  const log = new StepLog<AvlState>(() => ({ tree: cloneTree(tree), marks: { ...marks } }));
  log.add(0, "start", { n: sizeOf(tree), h: heightOf(tree, tree.root) });
  for (const op of ops) {
    avlInsert(tree, op.k, newId, (line, key, vars, m = {}, ask = false) => {
      marks = m;
      log.add(
        line,
        key,
        vars,
        ask && vars ? sideQuestion(String(vars.k), String(vars.v)) : undefined,
      );
    });
  }
  marks = {};
  log.add(0, "end", {
    n: sizeOf(tree),
    h: heightOf(tree, tree.root),
    list: pyList(inorderKeys(tree)),
  });
  return log.steps;
}

function AvlStage({ s }: { s: DsStep<AvlState> }) {
  const { t } = useTranslation();
  return (
    <TreeView
      tree={toDraw(s.state.tree, (id) => signed(balanceOf(s.state.tree, id)))}
      stateOf={(id) => s.state.marks[id] ?? "idle"}
      label={t("viz.ds.view.tree")}
    />
  );
}

export function AvlTreePlayer() {
  return (
    <DsPlayer
      prefix="avl"
      code={AVL_CODE}
      startField="values"
      validateStart={numbersOnly}
      presets={[
        {
          key: "tour",
          start: "",
          ops: "insert 10, insert 20, insert 30, insert 40, insert 50, insert 25, insert 35, insert 5, insert 3, insert 45",
        },
        { key: "zigzag", start: "30, 10", ops: "insert 20" },
        {
          key: "sorted",
          start: "",
          ops: "insert 1, insert 2, insert 3, insert 4, insert 5, insert 6, insert 7, insert 8, insert 9, insert 10, insert 11, insert 12",
        },
        { key: "card", start: "", ops: "insert 1, insert 2, insert 3" },
      ]}
      random={() => ({
        start: "",
        ops: randomNumbers(10)
          .map((v) => `insert ${v}`)
          .join(", "),
      })}
      forms={AVL_FORMS}
      run={avlSteps}
      stage={(s: DsStep<AvlState>) => <AvlStage s={s} />}
      vars={(s) => [
        { name: "n", value: sizeOf(s.state.tree) },
        { name: "height", value: heightOf(s.state.tree, s.state.tree.root) },
      ]}
    />
  );
}
