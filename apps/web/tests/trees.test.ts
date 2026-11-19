import { describe, expect, it } from "vitest";
import { avlInsert, avlSteps, balanceOf } from "../src/features/viz/ds/avl";
import { minHeapSteps } from "../src/features/viz/ds/binaryHeap";
import { emptyTree, heightOf, inorderKeys, type BTree } from "../src/features/viz/ds/binaryNodes";
import { levelOrderTree, traversalSteps, visitOrder } from "../src/features/viz/ds/binaryTree";
import { bstSteps, type BstOp } from "../src/features/viz/ds/bst";
import { segmentSteps } from "../src/features/viz/ds/segmentTree";
import { trieSteps } from "../src/features/viz/ds/trie";
import { layoutTree } from "../src/features/viz/ds/treeView";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const labels = (tree: BTree, ids: number[]) => ids.map((id) => tree.nodes[id]!.key);

describe("traversals", () => {
  const tree = levelOrderTree(["1", "2", "3", "4", "5"]);

  it("match the catalog example", () => {
    expect(labels(tree, visitOrder(tree, "preorder"))).toEqual(["1", "2", "4", "5", "3"]);
    expect(labels(tree, visitOrder(tree, "inorder"))).toEqual(["4", "2", "5", "1", "3"]);
    expect(labels(tree, visitOrder(tree, "postorder"))).toEqual(["4", "5", "2", "3", "1"]);
    expect(labels(tree, visitOrder(tree, "levelorder"))).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("visit every node once per traversal, asking which comes next", () => {
    const steps = traversalSteps(["1", "2", "3", "4", "5"], [{ kind: "inorder" }]);
    const visits = steps.filter((s) => s.say.key === "visit");
    expect(visits.map((s) => s.question?.correct)).toEqual(["4", "2", "5", "1", "3"]);
    expect(steps.at(-2)!.say).toEqual({
      key: "inorderResult",
      vars: { output: "[4, 2, 5, 1, 3]" },
    });
  });
});

describe("binary search tree", () => {
  it("builds 8, 3, 10, 1, 6 and finds 6 in 3 comparisons (the catalog example)", () => {
    const ops: BstOp[] = [
      ...[8, 3, 10, 1, 6].map((k): BstOp => ({ kind: "insert", k: String(k) })),
      { kind: "search", k: "6" },
    ];
    const steps = bstSteps([], ops);
    expect(steps).toHaveLength(16);
    expect(steps.at(-2)!.say).toEqual({ key: "searchHit", vars: { k: "6", comparisons: 3 } });
    expect(inorderKeys(steps.at(-1)!.state.tree)).toEqual(["1", "3", "6", "8", "10"]);
  });

  it("asks ← or → before each comparison", () => {
    const steps = bstSteps(["8"], [{ kind: "insert", k: "3" }]);
    expect(steps[1]!.question).toEqual({
      say: { key: "qSide", vars: { k: "3", v: "8" } },
      options: ["←", "→"],
      correct: "←",
    });
  });

  it("handles leaf, one-child and two-children deletes", () => {
    const steps = bstSteps(
      ["8", "3", "10", "1", "6", "14", "4", "7"],
      [
        { kind: "delete", k: "3" },
        { kind: "delete", k: "1" },
        { kind: "delete", k: "10" },
        { kind: "delete", k: "99" },
      ],
    );
    expect(keys(steps)).toEqual(
      expect.arrayContaining([
        "deleteLeaf",
        "deleteOneChild",
        "deleteTwo",
        "copySucc",
        "deleteMiss",
      ]),
    );
    expect(steps.find((s) => s.say.key === "copySucc")!.say.vars).toEqual({ k: "3", s: "4" });
    expect(inorderKeys(steps.at(-1)!.state.tree)).toEqual(["4", "6", "7", "8", "14"]);
  });

  it("sorted inserts make a chain as tall as the number of keys", () => {
    const steps = bstSteps(
      [],
      ["1", "2", "3", "4"].map((k) => ({ kind: "insert" as const, k })),
    );
    const last = steps.at(-1)!.state.tree;
    expect(heightOf(last, last.root)).toBe(4);
  });
});

describe("AVL tree", () => {
  it("rotates left after inserting 1, 2, 3 (the catalog example)", () => {
    const steps = avlSteps(
      [],
      ["1", "2", "3"].map((k) => ({ kind: "insert" as const, k })),
    );
    expect(keys(steps).slice(-4)).toEqual(["unbalanced", "caseRR", "rotatedLeft", "end"]);
    const tree = steps.at(-1)!.state.tree;
    expect(tree.nodes[tree.root!]!.key).toBe("2");
    expect(steps.find((s) => s.say.key === "unbalanced")!.say.vars).toEqual({ v: "1", b: "-2" });
  });

  it("uses a double rotation for the left-right case", () => {
    const steps = avlSteps(["30", "10"], [{ kind: "insert", k: "20" }]);
    expect(keys(steps)).toEqual(
      expect.arrayContaining(["caseLR", "rotatedChildLeft", "rotatedRight"]),
    );
    const tree = steps.at(-1)!.state.tree;
    expect(tree.nodes[tree.root!]!.key).toBe("20");
  });

  it("keeps every balance within ±1 for any insertion order of 1..7", () => {
    const orders = [
      [1, 2, 3, 4, 5, 6, 7],
      [7, 6, 5, 4, 3, 2, 1],
      [4, 2, 6, 1, 3, 5, 7],
      [3, 1, 7, 5, 2, 6, 4],
    ];
    for (const order of orders) {
      const tree = emptyTree();
      let id = 0;
      for (const k of order) avlInsert(tree, String(k), () => id++);
      expect(inorderKeys(tree)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
      for (const n of Object.values(tree.nodes))
        expect(Math.abs(balanceOf(tree, n.id))).toBeLessThanOrEqual(1);
      // 7 nodes: height 3 at best; AVL guarantees at most 4 (a plain BST could reach 7).
      expect(heightOf(tree, tree.root)).toBeLessThanOrEqual(4);
    }
  });
});

describe("binary heap", () => {
  it("insert 5, 3, 8, 1 gives [1, 3, 8, 5]; extract returns 1 (the catalog example)", () => {
    const steps = minHeapSteps(
      [],
      [
        { kind: "insert", x: "5" },
        { kind: "insert", x: "3" },
        { kind: "insert", x: "8" },
        { kind: "insert", x: "1" },
        { kind: "extract" },
      ],
    );
    const beforeExtract = steps.find((s) => s.say.key === "top")!;
    expect(beforeExtract.state.values).toEqual([1, 3, 8, 5]);
    expect(beforeExtract.question?.correct).toBe("1");
    expect(steps.at(-1)!.state.values).toEqual([3, 5, 8]);
  });

  it("predicts where an inserted value settles", () => {
    const steps = minHeapSteps(["2", "4", "6"], [{ kind: "insert", x: "3" }]);
    const settle = steps.find((s) => s.question?.say.key === "qSettle")!;
    expect(settle.question?.correct).toBe("1");
  });

  it("explains an empty heap", () => {
    expect(keys(minHeapSteps([], [{ kind: "extract" }, { kind: "peek" }]))).toEqual([
      "start",
      "empty",
      "empty",
      "end",
    ]);
  });
});

describe("trie", () => {
  it("car, cat and dog share prefixes (the catalog example)", () => {
    const steps = trieSteps(
      [],
      [
        { kind: "insert", word: "car" },
        { kind: "insert", word: "cat" },
        { kind: "insert", word: "dog" },
        { kind: "prefix", word: "ca" },
      ],
    );
    expect(steps.find((s) => s.say.key === "prefixWords")!.say.vars).toEqual({
      prefix: "ca",
      words: "['car', 'cat']",
      count: 2,
    });
    expect(steps.at(-1)!.say.vars).toEqual({ count: 3, nodes: 7, words: "['car', 'cat', 'dog']" });
  });

  it("tells a word from a prefix and a missing word", () => {
    const steps = trieSteps(
      [],
      [
        { kind: "insert", word: "tea" },
        { kind: "insert", word: "ten" },
        { kind: "search", word: "ten" },
        { kind: "search", word: "te" },
        { kind: "search", word: "to" },
      ],
    );
    expect(keys(steps)).toEqual(
      expect.arrayContaining(["searchHit", "searchPrefixOnly", "missing"]),
    );
  });
});

describe("segment tree", () => {
  it("sum 1..2 = 6, then set index 2 to 4 (the catalog example)", () => {
    const steps = segmentSteps(
      ["2", "1", "5", "3"],
      [
        { kind: "query", l: 1, r: 2 },
        { kind: "update", i: 2, x: 4 },
      ],
    );
    expect(steps[0]!.state.segs[1]!.sum).toBe(11);
    expect(steps.find((s) => s.say.key === "result")!.say.vars).toEqual({
      l: 1,
      r: 2,
      result: 6,
      used: 2,
    });
    const recomputed = steps.filter((s) => s.say.key === "recompute").map((s) => s.say.vars?.sum);
    expect(recomputed).toEqual([7, 10]);
    expect(steps).toHaveLength(15);
  });

  it("answers every range query correctly on eight values", () => {
    const values = [3, 1, 4, 1, 5, 9, 2, 6];
    for (let l = 0; l < 8; l++) {
      for (let r = l; r < 8; r++) {
        const steps = segmentSteps(values.map(String), [{ kind: "query", l, r }]);
        const expected = values.slice(l, r + 1).reduce((a, b) => a + b, 0);
        expect(steps.find((s) => s.say.key === "result")!.say.vars?.result).toBe(expected);
      }
    }
  });
});

describe("tree layout", () => {
  it("puts a lone right child to the right of its parent", () => {
    const pos = layoutTree(
      {
        root: 0,
        nodes: {
          0: { id: 0, label: "1", kids: [null, 1] },
          1: { id: 1, label: "2", kids: [null, null] },
        },
      },
      true,
    );
    expect(pos.get(1)!.x).toBeGreaterThan(pos.get(0)!.x);
  });
});
