import { useTranslation } from "react-i18next";
import {
  bstInsertQuiet,
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
import { DsPlayer } from "./DsPlayer";
import { cmd, N, numbersOnly, pick, randomNumbers, type OpForm } from "./ops";
import { pyList, StepLog, type DsStep, type Question } from "./steps";
import { TreeView } from "./treeView";
import type { NodeState } from "./views";

export const BST_CODE: readonly string[] = [
  "def insert(node, key):",
  "    if node is None:",
  "        return Node(key)",
  "    if key < node.key:",
  "        node.left = insert(node.left, key)",
  "    elif key > node.key:",
  "        node.right = insert(node.right, key)",
  "    return node",
  "",
  "def search(node, key):",
  "    while node and node.key != key:",
  "        node = node.left if key < node.key else node.right",
  "    return node",
  "",
  "def delete(node, key):",
  "    if node is None:",
  "        return None",
  "    if key < node.key:",
  "        node.left = delete(node.left, key)",
  "    elif key > node.key:",
  "        node.right = delete(node.right, key)",
  "    else:",
  "        if node.left is None:",
  "            return node.right",
  "        if node.right is None:",
  "            return node.left",
  "        succ = node.right",
  "        while succ.left:",
  "            succ = succ.left",
  "        node.key = succ.key",
  "        node.right = delete(node.right, succ.key)",
  "    return node",
];

export type BstOp = { kind: "insert" | "search" | "delete"; k: string };

export const BST_FORMS: readonly OpForm<BstOp>[] = (["insert", "search", "delete"] as const).map(
  (kind) => ({ pattern: cmd(`${kind} ${N}`), build: (m) => ({ kind, k: m[1] as string }) }),
);

export type BstState = {
  tree: BTree;
  marks: Readonly<Record<number, NodeState>>;
  pointers: Readonly<Record<number, readonly string[]>>;
};

/** The ← / → question asked before each comparison. */
export const sideQuestion = (k: string, v: string): Question => ({
  say: { key: "qSide", vars: { k, v } },
  options: ["←", "→"],
  correct: cmp(k, v) < 0 ? "←" : "→",
});

export function bstSteps(start: readonly string[], ops: readonly BstOp[]) {
  let tree = emptyTree();
  let nextId = 0;
  const newId = () => nextId++;
  for (const k of start) bstInsertQuiet(tree, k, newId);
  let marks: Record<number, NodeState> = {};
  let pointers: Record<number, string[]> = {};
  const log = new StepLog<BstState>(() => ({
    tree: cloneTree(tree),
    marks: { ...marks },
    pointers: { ...pointers },
  }));
  const set = (m: Record<number, NodeState>, p: Record<number, string[]> = {}) => {
    marks = m;
    pointers = p;
  };

  /** Walks from the root toward k, one step per comparison. Returns the path (ids). */
  const descend = (k: string, lineFor: (c: number) => number) => {
    const path: number[] = [];
    let id = tree.root;
    while (id != null) {
      const node = tree.nodes[id] as BNode;
      path.push(id);
      const c = cmp(k, node.key);
      if (c === 0) break;
      set({ [id]: "current" }, { [id]: ["node"] });
      log.add(
        lineFor(c),
        c < 0 ? "goLeft" : "goRight",
        { k, v: node.key },
        sideQuestion(k, node.key),
      );
      id = c < 0 ? node.left : node.right;
    }
    return { path, found: id };
  };

  log.add(0, "start", { list: pyList(inorderKeys(tree)), n: sizeOf(tree) });
  for (const op of ops) {
    set({});
    const { k } = op;
    if (op.kind === "insert") {
      const { path, found } = descend(k, (c) => (c < 0 ? 5 : 7));
      if (found != null) {
        set({ [found]: "found" });
        log.add(8, "duplicate", { k });
        continue;
      }
      const id = newId();
      tree.nodes[id] = { id, key: k, left: null, right: null };
      const parent = path.at(-1);
      if (parent == null) tree.root = id;
      else {
        const p = tree.nodes[parent] as BNode;
        p[cmp(k, p.key) < 0 ? "left" : "right"] = id;
      }
      set({ [id]: "new" });
      if (parent == null) log.add(3, "createRoot", { k });
      else
        log.add(3, cmp(k, (tree.nodes[parent] as BNode).key) < 0 ? "createLeft" : "createRight", {
          k,
          parent: (tree.nodes[parent] as BNode).key,
          depth: path.length,
        });
    } else if (op.kind === "search") {
      const { path, found } = descend(k, () => 12);
      if (found != null) {
        set({ [found]: "found" }, { [found]: ["node"] });
        log.add(13, "searchHit", { k, comparisons: path.length });
      } else {
        set({});
        log.add(13, "searchMiss", { k, comparisons: path.length });
      }
    } else {
      const { path, found } = descend(k, (c) => (c < 0 ? 19 : 21));
      if (found == null) {
        set({});
        log.add(17, "deleteMiss", { k });
        continue;
      }
      const node = tree.nodes[found] as BNode;
      const parentId = path.length > 1 ? (path.at(-2) as number) : null;
      const replace = (child: number | null) => {
        if (parentId == null) tree.root = child;
        else {
          const p = tree.nodes[parentId] as BNode;
          if (p.left === found) p.left = child;
          else p.right = child;
        }
        delete tree.nodes[found];
      };
      if (node.left == null || node.right == null) {
        const child = node.left ?? node.right;
        set({ [found]: "removed" });
        log.add(node.left == null ? 24 : 26, child == null ? "deleteLeaf" : "deleteOneChild", {
          k,
          child: child == null ? "None" : (tree.nodes[child] as BNode).key,
        });
        replace(child);
        set(child == null ? {} : { [child]: "changed" });
        log.add(32, "deleted", { k, list: pyList(inorderKeys(tree)) });
        continue;
      }
      set({ [found]: "current" }, { [found]: ["node"] });
      log.add(27, "deleteTwo", { k });
      let succId = node.right as number;
      let succParent = found;
      set({ [found]: "current", [succId]: "changed" }, { [found]: ["node"], [succId]: ["succ"] });
      log.add(27, "succStart", { s: (tree.nodes[succId] as BNode).key });
      while ((tree.nodes[succId] as BNode).left != null) {
        succParent = succId;
        succId = (tree.nodes[succId] as BNode).left as number;
        set({ [found]: "current", [succId]: "changed" }, { [found]: ["node"], [succId]: ["succ"] });
        log.add(29, "succLeft", { s: (tree.nodes[succId] as BNode).key });
      }
      const succ = tree.nodes[succId] as BNode;
      node.key = succ.key;
      set({ [found]: "changed", [succId]: "removed" }, { [succId]: ["succ"] });
      log.add(30, "copySucc", { k, s: succ.key });
      const sp = tree.nodes[succParent] as BNode;
      if (sp.left === succId) sp.left = succ.right;
      else sp.right = succ.right;
      delete tree.nodes[succId];
      set({ [found]: "found" });
      log.add(31, "removeSucc", { s: succ.key, list: pyList(inorderKeys(tree)) });
    }
  }
  tree = cloneTree(tree);
  set({});
  log.add(0, "end", { n: sizeOf(tree), h: heightOf(tree, tree.root) });
  return log.steps;
}

function BstStage({ s }: { s: DsStep<BstState> }) {
  const { t } = useTranslation();
  return (
    <TreeView
      tree={toDraw(s.state.tree)}
      stateOf={(id) => s.state.marks[id] ?? "idle"}
      pointers={s.state.pointers}
      label={t("viz.ds.view.tree")}
    />
  );
}

export function BinarySearchTreePlayer() {
  return (
    <DsPlayer
      prefix="bst"
      code={BST_CODE}
      startField="values"
      validateStart={numbersOnly}
      presets={[
        {
          key: "tour",
          start: "50, 30, 70, 20, 40, 60, 80, 10, 35, 65",
          ops: "insert 45, insert 75, search 35, search 55, delete 30",
        },
        {
          key: "delete",
          start: "8, 3, 10, 1, 6, 14, 4, 7, 13, 12, 2, 5",
          ops: "delete 3, delete 1, delete 10",
        },
        {
          key: "chain",
          start: "",
          ops: "insert 1, insert 2, insert 3, insert 4, insert 5, insert 6, insert 7, insert 8, search 8",
        },
        {
          key: "card",
          start: "",
          ops: "insert 8, insert 3, insert 10, insert 1, insert 6, search 6",
        },
      ]}
      random={() => {
        // 11 distinct numbers: 10 in the tree, 1 kept aside to insert.
        const values = randomNumbers(11);
        const fresh = values.pop() as number;
        return {
          start: values.join(", "),
          ops: `insert ${fresh}, search ${pick(values)}, delete ${pick(values)}`,
        };
      }}
      forms={BST_FORMS}
      run={bstSteps}
      stage={(s: DsStep<BstState>) => <BstStage s={s} />}
      vars={(s) => [
        { name: "n", value: sizeOf(s.state.tree) },
        { name: "height", value: heightOf(s.state.tree, s.state.tree.root) },
        { name: "in order", value: pyList(inorderKeys(s.state.tree)) },
      ]}
    />
  );
}
