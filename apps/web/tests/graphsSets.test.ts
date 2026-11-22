import { describe, expect, it } from "vitest";
import { GRAPH_FORMS, graphSteps, type GraphOp } from "../src/features/viz/ds/graph";
import { parseOps } from "../src/features/viz/ds/ops";
import {
  UF_FORMS,
  unionFindSteps,
  validateCount,
  type UfOp,
} from "../src/features/viz/ds/unionFind";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const graphOps = (text: string) => {
  const p = parseOps<GraphOp>(text, GRAPH_FORMS);
  if (!p.ok) throw new Error(text);
  return p.value;
};
const ufOps = (text: string) => {
  const p = parseOps<UfOp>(text, UF_FORMS);
  if (!p.ok) throw new Error(text);
  return p.value;
};

describe("graph", () => {
  it("edges A–B, A–C, B–D (the catalog example)", () => {
    const steps = graphSteps(
      [],
      graphOps("add A B, add A C, add B D, has B D, has C D, neighbours A"),
    );
    expect(keys(steps)).toEqual([
      "start",
      "addNew",
      "addNew",
      "addNew",
      "matrixYes",
      "listYes",
      "matrixNo",
      "listNo",
      "neighbours",
      "end",
    ]);
    expect(steps.at(-1)!.state.adj).toEqual({ A: ["B", "C"], B: ["A", "D"], C: ["A"], D: ["B"] });
    expect(steps[4]!.question?.correct).toBe("✓");
    expect(steps[6]!.question?.correct).toBe("✗");
    expect(steps.at(-1)!.say.vars).toEqual({ n: 4, e: 3, listSize: 10, matrixSize: 16 });
  });

  it("counts list checks: B's neighbours [A, D] need 2 checks to find D", () => {
    const steps = graphSteps([], graphOps("add A B, add B D, has B D"));
    expect(steps.find((s) => s.say.key === "listYes")!.say.vars).toMatchObject({ checks: 2 });
  });

  it("removes edges from both sides, and refuses self-loops and duplicates", () => {
    const steps = graphSteps([], graphOps("add 1 2, add 1 2, add 3 3, remove 1 2, remove 1 2"));
    expect(keys(steps)).toEqual([
      "start",
      "addNew",
      "already",
      "selfLoop",
      "removed",
      "removeMissing",
      "end",
    ]);
    expect(steps.at(-1)!.state.adj).toEqual({ 1: [], 2: [] });
  });

  it("accepts American spelling for neighbors", () => {
    expect(graphOps("neighbors A")).toEqual([{ kind: "neighbours", u: "A" }]);
  });
});

describe("union–find", () => {
  it("unions 0–1, 3–4, 1–4: 3 and 0 are connected, 2 is alone (the catalog example)", () => {
    const steps = unionFindSteps(
      ["5"],
      ufOps("union 0 1, union 3 4, union 1 4, connected 3 0, connected 2 0"),
    );
    const answers = steps.filter((s) => s.question).map((s) => [s.say.key, s.question?.correct]);
    expect(answers).toEqual([
      ["connectedYes", "✓"],
      ["connectedNo", "✗"],
    ]);
    expect(steps.at(-1)!.say.vars).toEqual({ n: 5, sets: 2 });
    expect(steps).toHaveLength(20);
  });

  it("attaches the smaller group under the bigger one", () => {
    const steps = unionFindSteps(["4"], ufOps("union 0 1, union 2 0"));
    expect(steps.filter((s) => s.say.key === "attach").map((s) => s.say.vars)).toEqual([
      { small: 1, big: 0, size: 2 },
      { small: 2, big: 0, size: 3 },
    ]);
  });

  it("path compression points a long path straight at the root", () => {
    const steps = unionFindSteps(
      ["6"],
      ufOps("union 0 1, union 2 3, union 0 2, union 4 5, union 0 4, find 5"),
    );
    const compress = steps.filter((s) => s.say.key === "compress").at(-1)!;
    expect(compress.say.vars).toEqual({ nodes: "5", root: 0 });
    expect(steps.at(-1)!.state.parent[5]).toBe(0);
  });

  it("explains joining items that are already together, and unknown items", () => {
    const steps = unionFindSteps(["3"], ufOps("union 0 1, union 1 0, find 7"));
    expect(keys(steps)).toContain("sameSet");
    expect(keys(steps)).toContain("badItem");
  });

  it("needs 2 to 12 items", () => {
    expect(validateCount(["5"])).toBeNull();
    expect(validateCount(["1"])).toEqual({ key: "badCount" });
    expect(validateCount(["13"])).toEqual({ key: "badCount" });
  });
});
