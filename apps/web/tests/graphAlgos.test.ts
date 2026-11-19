import { describe, expect, it } from "vitest";
import {
  bfsSteps,
  buildGraph,
  dfsSteps,
  dijkstraSteps,
  DIRECTED_FORMS,
  kruskalSteps,
  topoSteps,
  UNDIRECTED_FORMS,
  validateVertex,
  WEIGHTED_FORMS,
  type EdgeOp,
} from "../src/features/viz/ds/graphAlgos";
import { parseOps, type OpForm } from "../src/features/viz/ds/ops";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const edges = (text: string, forms: readonly OpForm<EdgeOp>[]) => {
  const p = parseOps<EdgeOp>(text, forms);
  if (!p.ok) throw new Error(text);
  return p.value;
};
const plain = (t: string) => edges(t, UNDIRECTED_FORMS);
const weighted = (t: string) => edges(t, WEIGHTED_FORMS);
const directed = (t: string) => edges(t, DIRECTED_FORMS);
const visits = (
  steps: { say: { key: string; vars?: Record<string, string | number> } }[],
  k = "visit",
) => steps.filter((s) => s.say.key === k).map((s) => s.say.vars?.v);

describe("edge input", () => {
  it("accepts 'A B', 'A-B' and weights; directed edges use '>'", () => {
    expect(plain("A B, C-D")).toEqual([
      { u: "A", w: "B", weight: 1 },
      { u: "C", w: "D", weight: 1 },
    ]);
    expect(weighted("A B 4")).toEqual([{ u: "A", w: "B", weight: 4 }]);
    expect(directed("wake > dress, x->y")).toEqual([
      { u: "wake", w: "dress", weight: 1 },
      { u: "x", w: "y", weight: 1 },
    ]);
  });

  it("ignores self-loops and repeated edges, and sorts neighbours", () => {
    const g = buildGraph(plain("B A, A C, A B, C C"), false, false);
    expect(g.adj).toEqual({ A: ["B", "C"], B: ["A"], C: ["A"] });
    expect(g.edges).toHaveLength(2);
  });

  it("needs exactly one start vertex", () => {
    expect(validateVertex(["A"])).toBeNull();
    expect(validateVertex([])).toEqual({ key: "badVertex" });
    expect(validateVertex(["A", "B"])).toEqual({ key: "badVertex" });
  });
});

describe("BFS and DFS", () => {
  it("BFS visits A, B, C, D ring by ring (the catalog example)", () => {
    const steps = bfsSteps(["A"], plain("A B, A C, B D, C D"));
    expect(visits(steps)).toEqual(["A", "B", "C", "D"]);
    expect(steps).toHaveLength(14);
    expect(steps.at(-1)!.say.key).toBe("endAll");
  });

  it("DFS visits A, B, D, C going deep first (the catalog example)", () => {
    const steps = dfsSteps(["A"], plain("A B, A C, B D, C D"));
    expect(visits(steps)).toEqual(["A", "B", "D", "C"]);
    expect(keys(steps)).toContain("back");
    expect(steps).toHaveLength(18);
  });

  it("both report vertices they can't reach", () => {
    expect(bfsSteps(["A"], plain("A B, B C, D E")).at(-1)!.say).toMatchObject({
      key: "endSome",
      vars: { missed: "D, E" },
    });
    expect(dfsSteps(["A"], plain("A B, D E")).at(-1)!.say.key).toBe("endSome");
  });

  it("explain a start vertex that isn't in the graph", () => {
    expect(keys(bfsSteps(["Z"], plain("A B")))).toEqual(["missingStart"]);
  });
});

describe("topological sort", () => {
  it("wake, dress, eat, leave (the catalog example)", () => {
    const steps = topoSteps([], directed("wake > dress, wake > eat, dress > leave, eat > leave"));
    expect(visits(steps, "output")).toEqual(["wake", "dress", "eat", "leave"]);
    expect(steps).toHaveLength(10);
  });

  it("detects a cycle", () => {
    const steps = topoSteps([], directed("a > b, b > c, c > a, c > d"));
    expect(keys(steps)).toEqual(["start", "cycle"]);
    expect(steps.at(-1)!.say.vars?.left).toBe("a, b, c, d");
  });
});

describe("Dijkstra", () => {
  it("finds A 0, C 1, B 3, D 4 (the catalog example)", () => {
    const steps = dijkstraSteps(["A"], weighted("A B 4, A C 1, C B 2, B D 1"));
    expect(visits(steps, "settle")).toEqual(["A", "C", "B", "D"]);
    expect(keys(steps)).toContain("stale");
    expect(steps.at(-1)!.say.vars?.dists).toBe("A 0, B 3, C 1, D 4");
    expect(steps).toHaveLength(15);
  });

  it("prefers a cheap detour over a direct edge", () => {
    const steps = dijkstraSteps(["S"], weighted("S A 7, S B 2, B C 2, C A 1, A T 1, C T 6"));
    expect(steps.at(-1)!.say.vars?.dists).toBe("A 5, B 2, C 4, S 0, T 6");
  });
});

describe("Kruskal", () => {
  it("takes A–B 1, B–C 2, skips A–C 3, takes C–D 4: total 7 (the catalog example)", () => {
    const steps = kruskalSteps([], weighted("A B 1, B C 2, A C 3, C D 4"));
    expect(keys(steps).filter((k) => k === "take" || k === "skip")).toEqual([
      "take",
      "take",
      "skip",
      "take",
    ]);
    expect(steps.at(-1)!.say).toEqual({ key: "end", vars: { total: 7, count: 3, n: 4 } });
    expect(steps).toHaveLength(10);
  });

  it("asks before each decision and finds the minimum total for a square with a diagonal", () => {
    const steps = kruskalSteps([], weighted("A B 3, B C 1, C D 4, D A 2, A C 5"));
    expect(steps.filter((s) => s.question).map((s) => s.question?.correct)).toEqual([
      "✓",
      "✓",
      "✓",
      "✗",
      "✗",
    ]);
    expect(steps.at(-1)!.say.vars?.total).toBe(6);
  });

  it("reports a forest when the graph is not connected", () => {
    expect(kruskalSteps([], weighted("A B 2, C D 1")).at(-1)!.say.key).toBe("endForest");
  });
});
