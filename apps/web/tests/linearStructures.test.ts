import { describe, expect, it } from "vitest";
import { ARRAY_FORMS, arraySteps, type ArrayOp } from "../src/features/viz/ds/array";
import { dynamicArraySteps } from "../src/features/viz/ds/dynamicArray";
import { doublyListSteps, singlyListSteps } from "../src/features/viz/ds/linkedList";
import { parseOps, parseStart } from "../src/features/viz/ds/ops";
import { ringSteps, validateCapacity } from "../src/features/viz/ds/ringBuffer";
import { dequeSteps, queueSteps, STACK_FORMS, stackSteps } from "../src/features/viz/ds/stackQueue";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);

describe("command parsing", () => {
  it("parses commands case-insensitively, with extra spaces", () => {
    expect(parseOps(" push 4,POP ,  peek ", STACK_FORMS)).toEqual({
      ok: true,
      value: [{ kind: "push", x: "4" }, { kind: "pop" }, { kind: "peek" }],
    });
  });

  it("names the command it does not understand", () => {
    expect(parseOps("push 4, jump 3", STACK_FORMS)).toEqual({
      ok: false,
      error: { key: "unknown", command: "jump 3" },
    });
    expect(parseOps("push 100", STACK_FORMS)).toMatchObject({ ok: false });
  });

  it("limits operations and starting values (12 and 16)", () => {
    expect(parseOps(Array(13).fill("pop").join(","), STACK_FORMS)).toEqual({
      ok: false,
      error: { key: "tooManyOps", max: 12 },
    });
    expect(parseStart("1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17")).toEqual({
      ok: false,
      error: { key: "tooManyStart", max: 16 },
    });
    expect(parseStart("3, AB")).toEqual({ ok: false, error: { key: "badStart", token: "AB" } });
    expect(parseStart("")).toEqual({ ok: true, value: [] });
  });
});

describe("array", () => {
  const run = (start: string, ops: string) => {
    const parsed = parseOps<ArrayOp>(ops, ARRAY_FORMS);
    if (!parsed.ok) throw new Error("bad ops");
    return arraySteps(start.split(", "), parsed.value);
  };

  it("reads by index in one step, at the computed address", () => {
    const read = run("7, 3, 9, 4", "read 2")[1]!;
    expect(read.say).toEqual({ key: "read", vars: { i: 2, addr: 108, value: "9" } });
    expect(read.question?.correct).toBe("9");
  });

  it("inserting at index 1 shifts the 3 later values right (the catalog example)", () => {
    const steps = run("7, 3, 9, 4", "insert 5 at 1");
    expect(keys(steps)).toEqual([
      "start",
      "grow",
      "shiftRight",
      "shiftRight",
      "shiftRight",
      "write",
      "end",
    ]);
    expect(steps.at(-1)!.state.values).toEqual(["7", "5", "3", "9", "4"]);
  });

  it("deleting index 0 shifts every later value left", () => {
    const steps = run("7, 5, 3, 9, 4", "delete 0");
    expect(keys(steps).filter((k) => k === "shiftLeft")).toHaveLength(4);
    expect(steps.at(-1)!.state.values).toEqual(["5", "3", "9", "4"]);
  });

  it("explains out-of-range indexes instead of crashing", () => {
    expect(keys(run("1, 2", "read 5, delete 2, insert 9 at 3"))).toEqual([
      "start",
      "indexError",
      "indexError",
      "insertError",
      "end",
    ]);
  });

  it("the tour preset takes 18 steps and searches successfully", () => {
    const steps = run("7, 3, 9, 4", "read 2, insert 5 at 1, delete 0, search 9");
    expect(steps).toHaveLength(18);
    expect(steps.at(-2)!.say).toEqual({ key: "found", vars: { x: "9", i: 2, checks: 3 } });
  });
});

describe("dynamic array", () => {
  it("doubles from 2 to 4 slots on the third append, copying 2 values", () => {
    const steps = dynamicArraySteps(
      [],
      [
        { kind: "append", x: "1" },
        { kind: "append", x: "2" },
        { kind: "append", x: "3" },
      ],
    );
    expect(keys(steps)).toEqual([
      "start",
      "write",
      "write",
      "full",
      "allocate",
      "copy",
      "copy",
      "switch",
      "write",
      "end",
    ]);
    expect(steps.at(-1)!.state).toMatchObject({ slots: ["1", "2", "3", null], size: 3, copies: 2 });
  });

  it("five appends from empty copy 2 + 4 = 6 values and end with capacity 8", () => {
    const ops = ["1", "2", "3", "4", "5"].map((x) => ({ kind: "append" as const, x }));
    const last = dynamicArraySteps([], ops).at(-1)!;
    expect(last.state.slots).toHaveLength(8);
    expect(last.state).toMatchObject({ size: 5, copies: 6, appends: 5 });
  });

  it("pop keeps the capacity and refuses an empty array", () => {
    const steps = dynamicArraySteps(["4"], [{ kind: "pop" }, { kind: "pop" }]);
    expect(keys(steps)).toEqual(["start", "pop", "popEmpty", "end"]);
    expect(steps[1]!.state).toMatchObject({ slots: [null, null], size: 0 });
  });
});

describe("linked lists", () => {
  it("singly: insert 4 after 3, then delete 8 (the catalog example)", () => {
    const steps = singlyListSteps(
      ["3", "8", "5"],
      [
        { kind: "insertAfter", x: "4", y: "3" },
        { kind: "delete", x: "8" },
      ],
    );
    expect(keys(steps)).toEqual([
      "start",
      "walkHit",
      "create",
      "link",
      "prevStart",
      "prevMove",
      "found",
      "unlink",
      "end",
    ]);
    expect(steps.find((s) => s.say.key === "link")!.state.nodes.map((n) => n.value)).toEqual([
      "3",
      "4",
      "8",
      "5",
    ]);
    const unlink = steps.find((s) => s.say.key === "unlink")!;
    expect(unlink.question?.correct).toBe("5");
    expect(unlink.state.nodes.map((n) => n.value)).toEqual(["3", "4", "5"]);
  });

  it("singly: deleting the head, a missing value, and finding", () => {
    const steps = singlyListSteps(
      ["6", "1", "7"],
      [
        { kind: "delete", x: "6" },
        { kind: "delete", x: "9" },
        { kind: "find", x: "7" },
      ],
    );
    expect(keys(steps)).toContain("headRemoved");
    expect(keys(steps)).toContain("deleteMissing");
    expect(steps.at(-2)!.say).toEqual({ key: "findHit", vars: { x: "7", steps: 2 } });
    expect(steps.at(-1)!.state.nodes.map((n) => n.value)).toEqual(["1", "7"]);
  });

  it("doubly: deleting 6 relinks both neighbours", () => {
    const steps = doublyListSteps(["2", "6", "9"], [{ kind: "delete", x: "6" }]);
    expect(keys(steps)).toEqual(["start", "deleteFind", "linkPrev", "linkNext", "end"]);
    expect(steps[2]!.question?.correct).toBe("9");
    expect(steps.at(-1)!.state.nodes.map((n) => n.value)).toEqual(["2", "9"]);
  });

  it("doubly: building from empty and removing both ends", () => {
    const steps = doublyListSteps(
      [],
      [
        { kind: "addLast", x: "1" },
        { kind: "addLast", x: "2" },
        { kind: "addFirst", x: "0" },
        { kind: "delete", x: "0" },
        { kind: "delete", x: "2" },
      ],
    );
    expect(keys(steps)).toContain("linkEmpty");
    expect(keys(steps)).toContain("noPrev");
    expect(keys(steps)).toContain("noNext");
    expect(steps.at(-1)!.state.nodes.map((n) => n.value)).toEqual(["1"]);
  });
});

describe("stack, queue, deque", () => {
  it("stack: push 4, 7, 1, pop → 1, peek → 7", () => {
    const steps = stackSteps(
      [],
      [
        { kind: "push", x: "4" },
        { kind: "push", x: "7" },
        { kind: "push", x: "1" },
        { kind: "pop" },
        { kind: "peek" },
      ],
    );
    expect(steps[4]!.question).toEqual({
      say: { key: "qPop" },
      options: ["4", "7", "1"],
      correct: "1",
    });
    expect(steps[5]!.say).toEqual({ key: "peek", vars: { x: "7" } });
    expect(steps.at(-1)!.state.items).toEqual(["4", "7"]);
  });

  it("stack: popping an empty stack is explained", () => {
    expect(keys(stackSteps(["5"], [{ kind: "pop" }, { kind: "pop" }, { kind: "peek" }]))).toEqual([
      "start",
      "pop",
      "popEmpty",
      "peekEmpty",
      "end",
    ]);
  });

  it("queue: enqueue A, B, C, dequeue → A, front → B", () => {
    const steps = queueSteps(
      [],
      [
        { kind: "enqueue", x: "A" },
        { kind: "enqueue", x: "B" },
        { kind: "enqueue", x: "C" },
        { kind: "dequeue" },
        { kind: "front" },
      ],
    );
    expect(steps[4]!.question?.correct).toBe("A");
    expect(steps[5]!.question?.correct).toBe("B");
    expect(steps.at(-1)!.state.items).toEqual(["B", "C"]);
  });

  it("deque: both ends (the catalog example)", () => {
    const steps = dequeSteps(
      [],
      [
        { kind: "pushBack", x: "2" },
        { kind: "pushFront", x: "1" },
        { kind: "pushBack", x: "3" },
        { kind: "popFront" },
        { kind: "popBack" },
      ],
    );
    expect(steps[3]!.state.items).toEqual(["1", "2", "3"]);
    expect(steps[4]!.question?.correct).toBe("1");
    expect(steps[5]!.question?.correct).toBe("3");
    expect(steps.at(-1)!.state.items).toEqual(["2"]);
  });
});

describe("ring buffer", () => {
  const tour = [
    { kind: "enqueue" as const, x: "1" },
    { kind: "enqueue" as const, x: "2" },
    { kind: "enqueue" as const, x: "3" },
    { kind: "dequeue" as const },
    { kind: "enqueue" as const, x: "4" },
    { kind: "enqueue" as const, x: "5" },
  ];

  it("wraps the tail to slot 0 (the catalog example)", () => {
    const steps = ringSteps(["4"], tour);
    expect(steps).toHaveLength(14);
    expect(keys(steps).filter((k) => k === "tailWrap")).toHaveLength(1);
    expect(steps.at(-1)!.state).toMatchObject({ slots: ["5", "2", "3", "4"], head: 1, size: 4 });
  });

  it("refuses to overfill and to dequeue when empty", () => {
    const steps = ringSteps(
      ["2"],
      [
        { kind: "enqueue", x: "A" },
        { kind: "enqueue", x: "B" },
        { kind: "enqueue", x: "C" },
        { kind: "dequeue" },
        { kind: "dequeue" },
        { kind: "dequeue" },
      ],
    );
    expect(keys(steps)).toContain("full");
    expect(keys(steps)).toContain("advanceWrap");
    expect(keys(steps).at(-2)).toBe("empty");
  });

  it("checks the capacity is 2..8", () => {
    expect(validateCapacity(["4"])).toBeNull();
    expect(validateCapacity(["13"])).toEqual({ key: "badCapacity" });
    expect(validateCapacity(["1"])).toEqual({ key: "badCapacity" });
    expect(validateCapacity(["4", "5"])).toEqual({ key: "badCapacity" });
    expect(validateCapacity([])).toEqual({ key: "badCapacity" });
  });
});
