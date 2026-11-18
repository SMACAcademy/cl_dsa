/** LSD radix sort in base 10 for values 0..99, as full-state snapshots. No comparisons. */

export const RADIX_SORT_CODE: readonly string[] = [
  "def radix_sort(items):",
  "    place = 1",
  "    while place <= max(items):",
  "        buckets = [[] for _ in range(10)]",
  "        for x in items:",
  "            buckets[(x // place) % 10].append(x)",
  "        items = [x for b in buckets for x in b]",
  "        place *= 10",
  "    return items",
];

export type DigitName = "ones" | "tens";

export type RadixNarration =
  | { key: "start"; count: number }
  | { key: "pass"; digit: DigitName; place: number }
  | { key: "drop"; x: number; digit: DigitName; d: number }
  | { key: "collect"; list: string }
  | { key: "done"; place: number; max: number; list: string };

export type RadixSortStep = {
  line: number;
  items: readonly number[];
  /** Current digit place (1 or 10), while a pass is running. */
  place: number | null;
  buckets: readonly (readonly number[])[];
  /** Input position being dropped, if any; positions before it are already dropped. */
  p: number | null;
  /** Bucket receiving a value in this step, if any. */
  bucket: number | null;
  done: boolean;
  narration: RadixNarration;
};

export const digitOf = (x: number, place: number) => Math.floor(x / place) % 10;
const digitName = (place: number): DigitName => (place === 1 ? "ones" : "tens");
const emptyBuckets = () => Array.from({ length: 10 }, () => [] as number[]);

export function radixSortSteps(input: readonly number[]): RadixSortStep[] {
  const steps: RadixSortStep[] = [];
  let items = [...input];
  let buckets = emptyBuckets();
  const max = Math.max(...items);

  const snap = (
    line: number,
    narration: RadixNarration,
    extra: Partial<Pick<RadixSortStep, "place" | "p" | "bucket" | "done">> = {},
  ) => {
    steps.push({
      line,
      items: [...items],
      place: null,
      buckets: buckets.map((b) => [...b]),
      p: null,
      bucket: null,
      done: false,
      narration,
      ...extra,
    });
  };

  snap(1, { key: "start", count: items.length });
  let place = 1;
  while (place <= max) {
    buckets = emptyBuckets();
    const digit = digitName(place);
    snap(4, { key: "pass", digit, place }, { place });
    items.forEach((x, p) => {
      const d = digitOf(x, place);
      buckets[d]?.push(x);
      snap(6, { key: "drop", x, digit, d }, { place, p, bucket: d });
    });
    items = buckets.flat();
    snap(7, { key: "collect", list: `[${items.join(", ")}]` }, { place });
    place *= 10;
  }
  buckets = emptyBuckets();
  snap(9, { key: "done", place, max, list: `[${items.join(", ")}]` }, { done: true });
  return steps;
}
