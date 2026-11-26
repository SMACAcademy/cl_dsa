import { describe, expect, it } from "vitest";
import { findCase } from "../src/features/systems/cases";
import { bandOf, grade } from "../src/features/systems/lab/grade";
import { defaultMode, type Design, toScene } from "../src/features/systems/lab/model";
import { LAB_PROBLEMS } from "../src/features/systems/lab/problems";
import {
  behind,
  between,
  CLIENTS,
  COMPUTE,
  eachOwns,
  guarded,
  kinds,
  linked,
  linkedFrom,
  neverWaitsOn,
  noSharedStore,
  onlyVia,
  reaches,
  role,
} from "../src/features/systems/lab/rules";
import { findLesson } from "../src/features/systems/lessons";

const EMPTY: Design = { nodes: [], links: [] };

/** users → lb → s1, s2 → db; s1 → q (async) → w */
const SMALL: Design = {
  nodes: [
    { id: "u", kind: "browser", label: "Users", col: 0, row: 0 },
    { id: "lb", kind: "lb", label: "LB", col: 1, row: 0 },
    { id: "s1", kind: "server", label: "S1", col: 2, row: 0 },
    { id: "s2", kind: "server", label: "S2", col: 2, row: 1 },
    { id: "db", kind: "db", label: "DB", col: 3, row: 0 },
    { id: "q", kind: "queue", label: "Q", col: 3, row: 2 },
    { id: "w", kind: "worker", label: "W", col: 4, row: 2, role: "counter" },
  ],
  links: [
    { from: "u", to: "lb", mode: "sync" },
    { from: "lb", to: "s1", mode: "sync" },
    { from: "lb", to: "s2", mode: "sync" },
    { from: "s1", to: "db", mode: "sync" },
    { from: "s2", to: "db", mode: "sync" },
    { from: "s1", to: "q", mode: "async" },
    { from: "q", to: "w", mode: "async" },
  ],
};

describe("lab rules", () => {
  it("linked works in either direction and can require a mode", () => {
    expect(linked(SMALL, kinds("db"), kinds("server"))).toBe(true);
    expect(linked(SMALL, kinds("server"), kinds("queue"), "async")).toBe(true);
    expect(linked(SMALL, kinds("server"), kinds("queue"), "sync")).toBe(false);
    expect(linkedFrom(SMALL, kinds("db"), kinds("server"))).toBe(false);
    expect(linkedFrom(SMALL, kinds("server"), kinds("db"))).toBe(true);
  });

  it("guarded needs every path to pass the guard", () => {
    expect(guarded(SMALL, CLIENTS, COMPUTE, kinds("lb"))).toBe(true);
    expect(guarded(SMALL, CLIENTS, kinds("db"), COMPUTE)).toBe(true);
    const shortcut = {
      ...SMALL,
      links: [...SMALL.links, { from: "u", to: "s2", mode: "sync" as const }],
    };
    expect(guarded(shortcut, CLIENTS, COMPUTE, kinds("lb"))).toBe(false);
    expect(guarded(EMPTY, CLIENTS, COMPUTE, kinds("lb"))).toBe(false);
  });

  it("behind counts boxes linked to a front", () => {
    expect(behind(SMALL, kinds("server"), kinds("lb"), 2)).toBe(true);
    expect(behind(SMALL, kinds("server"), kinds("lb"), 3)).toBe(false);
  });

  it("noSharedStore spots a database shared by two owners", () => {
    expect(noSharedStore(SMALL, COMPUTE, kinds("db"))).toBe(false);
    const split: Design = {
      nodes: [...SMALL.nodes, { id: "db2", kind: "db", label: "DB2", col: 3, row: 1 }],
      links: SMALL.links.map((l) => (l.from === "s2" && l.to === "db" ? { ...l, to: "db2" } : l)),
    };
    expect(noSharedStore(split, COMPUTE, kinds("db"))).toBe(true);
    expect(eachOwns(split, COMPUTE, kinds("db"))).toBe(true);
    expect(noSharedStore(EMPTY, COMPUTE, kinds("db"))).toBe(false);
  });

  it("between, reaches, roles and neverWaitsOn", () => {
    expect(between(SMALL, kinds("lb"), CLIENTS, COMPUTE)).toBe(true);
    expect(reaches(SMALL, CLIENTS, role("counter"))).toBe(true);
    expect(neverWaitsOn(SMALL, COMPUTE, role("counter"))).toBe(true);
    expect(neverWaitsOn(EMPTY, COMPUTE, role("counter"))).toBe(false);
  });

  it("onlyVia needs every neighbour of the target to be allowed", () => {
    expect(onlyVia(SMALL, kinds("db"), COMPUTE)).toBe(true);
    expect(onlyVia(SMALL, kinds("lb"), COMPUTE)).toBe(false);
    expect(onlyVia(EMPTY, kinds("db"), COMPUTE)).toBe(false);
    const lonely: Design = {
      nodes: [{ id: "m", kind: "llm", label: "M", col: 0, row: 0 }],
      links: [],
    };
    expect(onlyVia(lonely, kinds("llm"), COMPUTE)).toBe(false);
  });

  it("queues and streams default to send-and-move-on", () => {
    expect(defaultMode("server", "queue")).toBe("async");
    expect(defaultMode("stream", "gateway")).toBe("async");
    expect(defaultMode("server", "db")).toBe("sync");
    expect(defaultMode("internet", "files")).toBe("async");
  });

  it("toScene draws sync links with replies and async links as events", () => {
    const scene = toScene(SMALL);
    expect(scene.nodes).toHaveLength(SMALL.nodes.length);
    const sync = scene.links?.find((l) => l.from === "u");
    const async = scene.links?.find((l) => l.from === "q");
    expect(sync?.flows?.map((f) => f.kind)).toEqual(["request", "response"]);
    expect(async?.flows?.map((f) => f.kind)).toEqual(["event"]);
  });
});

describe("grading", () => {
  it("scores by points and names the band", () => {
    const problem = {
      checks: [
        { id: "a", label: "a", hint: "", points: 30, pass: () => true },
        { id: "b", label: "b", hint: "", points: 70, pass: () => false },
      ],
    };
    const g = grade(problem, EMPTY);
    expect(g.score).toBe(30);
    expect(g.band).toBe("start");
    expect(g.results.map((r) => r.passed)).toEqual([true, false]);
    expect([bandOf(95), bandOf(75), bandOf(45), bandOf(10)]).toEqual([
      "excellent",
      "solid",
      "close",
      "start",
    ]);
  });

  it("a check that throws counts as missed", () => {
    const g = grade(
      {
        checks: [
          {
            id: "x",
            label: "x",
            hint: "",
            points: 10,
            pass: () => {
              throw new Error("bad");
            },
          },
        ],
      },
      EMPTY,
    );
    expect(g.score).toBe(0);
  });
});

describe("lab problems", () => {
  it("have unique ids", () => {
    const ids = LAB_PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(15);
  });

  it.each(LAB_PROBLEMS.map((p) => [p.id, p] as const))("%s is well formed", (_, p) => {
    // The model answer earns full marks; an empty canvas earns nothing.
    const full = grade(p, p.answer);
    expect(
      full.results.filter((r) => !r.passed).map((r) => r.check.id),
      "checks the answer misses",
    ).toEqual([]);
    expect(full.score).toBe(100);
    expect(grade(p, EMPTY).score).toBe(0);

    // Every box in the answer can be built from the palette.
    for (const node of p.answer.nodes) {
      const offered = p.palette.some((i) => i.kind === node.kind && i.role === node.role);
      expect(offered, `${node.id} (${node.kind}/${node.role ?? "-"})`).toBe(true);
    }
    // Answer boxes sit on distinct cells inside the grid, and links join real boxes.
    const cells = p.answer.nodes.map((nd) => `${nd.col},${nd.row}`);
    expect(new Set(cells).size).toBe(cells.length);
    for (const nd of p.answer.nodes) {
      expect(nd.col).toBeGreaterThanOrEqual(0);
      expect(nd.col).toBeLessThan(12);
      expect(nd.row).toBeGreaterThanOrEqual(0);
      expect(nd.row).toBeLessThan(8);
    }
    const ids = new Set(p.answer.nodes.map((nd) => nd.id));
    for (const l of p.answer.links) {
      expect(ids.has(l.from) && ids.has(l.to), `${l.from}→${l.to}`).toBe(true);
    }

    for (const c of p.concepts) expect(findLesson(c), c).toBeDefined();
    if (p.caseId) expect(findCase(p.caseId), p.caseId).toBeDefined();
    const points = p.checks.reduce((s, c) => s + c.points, 0);
    expect(points).toBe(100);
  });
});
