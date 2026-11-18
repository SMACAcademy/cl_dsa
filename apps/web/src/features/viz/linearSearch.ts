/**
 * Linear search as a list of steps. Each step is a full snapshot of what the
 * learner should see (state-derived, not a diff), so stepping backwards is free.
 * Inputs are deliberately tiny: at most MAX_VALUES values.
 */

export const MAX_VALUES = 8;
export const VALUE_RANGE = { min: -99, max: 99 } as const;

/** The Python shown beside the visualization. Line numbers below are 1-based. */
export const LINEAR_SEARCH_CODE: readonly string[] = [
  "def linear_search(items, target):",
  "    for i in range(len(items)):",
  "        if items[i] == target:",
  "            return i",
  "    return -1",
];

export type Narration =
  | { key: "start"; target: number; count: number }
  | { key: "move"; i: number }
  | { key: "compareNo"; i: number; value: number; target: number }
  | { key: "compareYes"; i: number; value: number; target: number }
  | { key: "found"; i: number; comparisons: number }
  | { key: "notFound"; target: number; comparisons: number };

export type LinearSearchStep = {
  /** Highlighted line in LINEAR_SEARCH_CODE (1-based). */
  line: number;
  /** The loop variable i, or null before the loop starts / after it ends. */
  i: number | null;
  /** Index being compared in this step, if any. */
  comparing: number | null;
  /** Indices already compared and found not equal. */
  checked: readonly number[];
  /** Index where the target was found, once known. */
  found: number | null;
  comparisons: number;
  /** Set on the final step: the function's return value. */
  result: number | null;
  narration: Narration;
};

export function linearSearchSteps(items: readonly number[], target: number): LinearSearchStep[] {
  const steps: LinearSearchStep[] = [];
  const checked: number[] = [];
  let comparisons = 0;

  steps.push({
    line: 1,
    i: null,
    comparing: null,
    checked: [],
    found: null,
    comparisons,
    result: null,
    narration: { key: "start", target, count: items.length },
  });

  for (let i = 0; i < items.length; i++) {
    const value = items[i] as number;
    steps.push({
      line: 2,
      i,
      comparing: null,
      checked: [...checked],
      found: null,
      comparisons,
      result: null,
      narration: { key: "move", i },
    });
    comparisons++;
    if (value === target) {
      steps.push({
        line: 3,
        i,
        comparing: i,
        checked: [...checked],
        found: null,
        comparisons,
        result: null,
        narration: { key: "compareYes", i, value, target },
      });
      steps.push({
        line: 4,
        i,
        comparing: null,
        checked: [...checked],
        found: i,
        comparisons,
        result: i,
        narration: { key: "found", i, comparisons },
      });
      return steps;
    }
    steps.push({
      line: 3,
      i,
      comparing: i,
      checked: [...checked],
      found: null,
      comparisons,
      result: null,
      narration: { key: "compareNo", i, value, target },
    });
    checked.push(i);
  }

  steps.push({
    line: 5,
    i: null,
    comparing: null,
    checked: [...checked],
    found: null,
    comparisons,
    result: -1,
    narration: { key: "notFound", target, comparisons },
  });
  return steps;
}

export type ParsedInput =
  | { ok: true; items: number[]; target: number }
  | {
      ok: false;
      error: "empty" | "tooMany" | "notInteger" | "outOfRange" | "targetMissing";
    };

const INTEGER = /^-?\d+$/;

/** Parses "4, 8, 1, 9" and a target such as "1". Accepts commas and/or spaces. */
export function parseInput(valuesText: string, targetText: string): ParsedInput {
  const parts = valuesText
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length === 0) return { ok: false, error: "empty" };
  if (parts.length > MAX_VALUES) return { ok: false, error: "tooMany" };
  if (!parts.every((p) => INTEGER.test(p))) return { ok: false, error: "notInteger" };
  const items = parts.map(Number);
  const t = targetText.trim();
  if (t === "") return { ok: false, error: "targetMissing" };
  if (!INTEGER.test(t)) return { ok: false, error: "notInteger" };
  const target = Number(t);
  const inRange = (n: number) => n >= VALUE_RANGE.min && n <= VALUE_RANGE.max;
  if (!items.every(inRange) || !inRange(target)) return { ok: false, error: "outOfRange" };
  return { ok: true, items, target };
}
