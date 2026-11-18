import { describe, expect, it } from "vitest";
import {
  bucketOf,
  chainingSteps,
  HASH_SET_FORMS,
  HASH_TABLE_FORMS,
  probingSteps,
  PROBING_FORMS,
  pyMod,
} from "../src/features/viz/ds/hashing";
import { parseOps } from "../src/features/viz/ds/ops";

const keys = (steps: { say: { key: string } }[]) => steps.map((s) => s.say.key);
const ops = <T>(text: string, forms: Parameters<typeof parseOps<T>>[1]) => {
  const parsed = parseOps<T>(text, forms);
  if (!parsed.ok) throw new Error(`bad ops: ${text}`);
  return parsed.value;
};

describe("hash function", () => {
  it("matches Python's % for negative keys and uses ord() for letters", () => {
    expect(pyMod(-3, 5)).toBe(2);
    expect(bucketOf("12", 5)).toBe(2);
    expect(bucketOf("-3", 5)).toBe(2);
    expect(bucketOf("a", 5)).toBe(2); // ord('a') = 97
    expect(bucketOf("b", 5)).toBe(3);
  });
});

describe("hash table with chaining", () => {
  it("12 and 7 collide in bucket 2 (the catalog example)", () => {
    const steps = chainingSteps(
      ["5"],
      ops("insert 12, insert 7, insert 9, lookup 7", HASH_TABLE_FORMS),
    );
    expect(keys(steps)).toEqual([
      "start",
      "hash",
      "storeEmpty",
      "hash",
      "scanNo",
      "collision",
      "hash",
      "storeEmpty",
      "hash",
      "scanNo",
      "lookupHit",
      "end",
    ]);
    expect(steps.at(-1)!.state.buckets).toEqual([[], [], ["12", "7"], [], ["9"]]);
    expect(steps[3]!.question?.correct).toBe("2");
    expect(steps.at(-1)!.say.vars).toEqual({ n: 3, m: 5, load: "0.60", longest: 2 });
  });

  it("does not store a key twice, and deletes without moving other keys", () => {
    const steps = chainingSteps(
      ["5"],
      ops("insert 1, insert 6, insert 1, delete 1, lookup 6, delete 4", HASH_TABLE_FORMS),
    );
    expect(keys(steps)).toContain("alreadyThere");
    expect(keys(steps)).toContain("deleted");
    expect(keys(steps)).toContain("deleteMiss");
    expect(steps.at(-1)!.state.buckets[1]).toEqual(["6"]);
  });

  it("a lookup only scans one bucket", () => {
    const steps = chainingSteps(
      ["4"],
      ops("insert 3, insert 7, insert 11, insert 15, lookup 11", HASH_TABLE_FORMS),
    );
    const hit = steps.find((s) => s.say.key === "lookupHit")!;
    expect(hit.say.vars).toEqual({ k: "11", b: 3, checks: 3 });
  });
});

describe("hash set", () => {
  it('add a, add b, add a, contains b → {"a", "b"} (the catalog example)', () => {
    const steps = chainingSteps(["5"], ops("add a, add b, add a, contains b", HASH_SET_FORMS));
    expect(keys(steps)).toEqual([
      "start",
      "hashLetter",
      "storeEmpty",
      "hashLetter",
      "storeEmpty",
      "hashLetter",
      "alreadyThere",
      "hashLetter",
      "lookupHit",
      "end",
    ]);
    expect(steps.at(-1)!.state.buckets.flat()).toEqual(["a", "b"]);
  });
});

describe("open addressing (linear probing)", () => {
  it("probes past taken slots (the catalog example)", () => {
    const steps = probingSteps(
      ["5"],
      ops("insert 10, insert 15, insert 21, lookup 15", PROBING_FORMS),
    );
    expect(keys(steps)).toEqual([
      "start",
      "home",
      "store",
      "home",
      "occupied",
      "store",
      "home",
      "occupied",
      "store",
      "home",
      "occupied",
      "lookupHit",
      "end",
    ]);
    expect(steps.at(-1)!.state.slots).toEqual(["10", "15", "21", null, null]);
  });

  it("stops at an empty slot when the key is missing", () => {
    const steps = probingSteps(["5"], ops("insert 10, lookup 5", PROBING_FORMS));
    expect(steps.at(-2)!.say).toEqual({ key: "lookupEmpty", vars: { k: "5", i: 1, probes: 2 } });
  });

  it("wraps around and reports a full table", () => {
    const steps = probingSteps(["3"], ops("insert 1, insert 4, insert 7, insert 2", PROBING_FORMS));
    expect(steps.find((s) => s.say.key === "store" && s.say.vars?.k === "7")!.say.vars?.i).toBe(0);
    expect(keys(steps).at(-2)).toBe("full");
  });

  it("only accepts whole-number keys", () => {
    expect(parseOps("insert a", PROBING_FORMS)).toMatchObject({ ok: false });
  });
});
