import type { DrawTree } from "./treeView";

/** A binary tree kept as a map of nodes, so snapshots are cheap to copy. */
export type BNode = { id: number; key: string; left: number | null; right: number | null };
export type BTree = { root: number | null; nodes: Record<number, BNode> };

export const emptyTree = (): BTree => ({ root: null, nodes: {} });

export function cloneTree(t: BTree): BTree {
  return {
    root: t.root,
    nodes: Object.fromEntries(Object.entries(t.nodes).map(([k, n]) => [k, { ...n }])),
  };
}

/** Compares keys as numbers (all ordered structures here use whole numbers). */
export const cmp = (a: string, b: string) => Number(a) - Number(b);

export function heightOf(t: BTree, id: number | null): number {
  if (id == null) return 0;
  const n = t.nodes[id] as BNode;
  return 1 + Math.max(heightOf(t, n.left), heightOf(t, n.right));
}

export function sizeOf(t: BTree, id: number | null = t.root): number {
  if (id == null) return 0;
  const n = t.nodes[id] as BNode;
  return 1 + sizeOf(t, n.left) + sizeOf(t, n.right);
}

export function inorderKeys(t: BTree, id: number | null = t.root): string[] {
  if (id == null) return [];
  const n = t.nodes[id] as BNode;
  return [...inorderKeys(t, n.left), n.key, ...inorderKeys(t, n.right)];
}

/** Converts to the drawable form, with an optional sub-label per node. */
export function toDraw(t: BTree, sub?: (id: number) => string | undefined): DrawTree {
  return {
    root: t.root,
    nodes: Object.fromEntries(
      Object.values(t.nodes).map((n) => [
        n.id,
        { id: n.id, label: n.key, kids: [n.left, n.right], sub: sub?.(n.id) },
      ]),
    ),
  };
}

/** Plain BST insert without steps, used to build the starting tree. */
export function bstInsertQuiet(t: BTree, key: string, newId: () => number): void {
  if (t.root == null) {
    const id = newId();
    t.nodes[id] = { id, key, left: null, right: null };
    t.root = id;
    return;
  }
  let cur = t.nodes[t.root] as BNode;
  for (;;) {
    const c = cmp(key, cur.key);
    if (c === 0) return;
    const side = c < 0 ? "left" : "right";
    const next = cur[side];
    if (next == null) {
      const id = newId();
      t.nodes[id] = { id, key, left: null, right: null };
      cur[side] = id;
      return;
    }
    cur = t.nodes[next] as BNode;
  }
}
