import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import type { Trace } from "../ts/src/index.ts";

const load = (rel: string): unknown =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));

const schema = load("../schema/v1/trace.schema.json") as object;
const fixture = load("../fixtures/bubble-sort-5-1-4.trace.json");
const validate = new Ajv2020({ strict: true }).compile(schema);

describe("trace schema v1", () => {
  it("fixture validates with ajv", () => {
    expect(validate(fixture), JSON.stringify(validate.errors)).toBe(true);
  });

  it("fixture is assignable to Trace", () => {
    const t: Trace = fixture as Trace;
    expect(t.events).toHaveLength(7);
  });

  it("rejects an unknown event kind", () => {
    const bad = structuredClone(fixture) as { events: Record<string, unknown>[] };
    bad.events[0] = { seq: 0, kind: "teleport", depth: 0 };
    expect(validate(bad)).toBe(false);
  });
});
