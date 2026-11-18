/** Counting sort for small keys (0..9), as full-state snapshots. No comparisons are made. */

export const COUNTING_SORT_CODE: readonly string[] = [
  "def counting_sort(items):",
  "    k = max(items)",
  "    count = [0] * (k + 1)",
  "    for x in items:",
  "        count[x] += 1",
  "    result = []",
  "    for value in range(k + 1):",
  "        result += [value] * count[value]",
  "    return result",
];

export type CountingNarration =
  | { key: "start"; count: number }
  | { key: "makeCounts"; k: number; size: number }
  | { key: "tally"; p: number; x: number; c: number }
  | { key: "write"; value: number; c: number; list: string }
  | { key: "done"; list: string; n: number };

export type CountingSortStep = {
  line: number;
  items: readonly number[];
  counts: readonly number[];
  result: readonly number[];
  /** Input position being counted, if any. */
  p: number | null;
  /** Counter being read or updated, if any. */
  key: number | null;
  done: boolean;
  narration: CountingNarration;
};

export function countingSortSteps(items: readonly number[]): CountingSortStep[] {
  const steps: CountingSortStep[] = [];
  const k = Math.max(...items);
  const counts: number[] = [];
  const result: number[] = [];

  const snap = (
    line: number,
    narration: CountingNarration,
    extra: Partial<Pick<CountingSortStep, "p" | "key" | "done">> = {},
  ) => {
    steps.push({
      line,
      items,
      counts: [...counts],
      result: [...result],
      p: null,
      key: null,
      done: false,
      narration,
      ...extra,
    });
  };

  snap(1, { key: "start", count: items.length });
  counts.push(...new Array<number>(k + 1).fill(0));
  snap(3, { key: "makeCounts", k, size: k + 1 });
  items.forEach((x, p) => {
    counts[x] = (counts[x] as number) + 1;
    snap(5, { key: "tally", p, x, c: counts[x] as number }, { p, key: x });
  });
  counts.forEach((c, value) => {
    if (c === 0) return;
    result.push(...new Array<number>(c).fill(value));
    snap(8, { key: "write", value, c, list: `[${result.join(", ")}]` }, { key: value });
  });
  snap(9, { key: "done", list: `[${result.join(", ")}]`, n: items.length }, { done: true });
  return steps;
}
