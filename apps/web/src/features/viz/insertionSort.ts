/**
 * Insertion sort as full-state snapshots. The lifted `key` is drawn moving
 * left through the gap while larger values shift right, so the picture never
 * shows the temporary duplicate the Python list holds mid-shift.
 */

export const INSERTION_SORT_CODE: readonly string[] = [
  "def insertion_sort(items):",
  "    for i in range(1, len(items)):",
  "        key = items[i]",
  "        j = i - 1",
  "        while j >= 0 and items[j] > key:",
  "            items[j + 1] = items[j]",
  "            j -= 1",
  "        items[j + 1] = key",
  "    return items",
];

export type InsertionNarration =
  | { key: "start"; count: number }
  | { key: "pick"; pass: number; i: number; value: number; last: number }
  | { key: "compareShift"; j: number; a: number; value: number }
  | { key: "compareStop"; j: number; a: number; value: number }
  | { key: "reachedStart"; value: number }
  | { key: "shift"; a: number; gap: number }
  | { key: "insert"; value: number; pos: number; list: string }
  | { key: "done"; comparisons: number; shifts: number };

export type InsertionSortStep = {
  line: number;
  values: readonly number[];
  ids: readonly number[];
  i: number | null;
  /** Position of the lifted key (the gap), while a pass is running. */
  keyPos: number | null;
  /** Position compared with the key in this step, if any. */
  j: number | null;
  /** For a comparison step: whether items[j] is bigger than the key. */
  shiftNeeded: boolean | null;
  /** Positions < sortedUpTo form the sorted part (not yet final). */
  sortedUpTo: number;
  done: boolean;
  comparisons: number;
  shifts: number;
  narration: InsertionNarration;
};

export function insertionSortSteps(input: readonly number[]): InsertionSortStep[] {
  const values = [...input];
  const ids = input.map((_, k) => k);
  const n = values.length;
  const steps: InsertionSortStep[] = [];
  let comparisons = 0;
  let shifts = 0;
  let sortedUpTo = Math.min(1, n);

  type Extra = Partial<Pick<InsertionSortStep, "i" | "keyPos" | "j" | "shiftNeeded" | "done">>;
  const snap = (line: number, narration: InsertionNarration, extra: Extra = {}) => {
    steps.push({
      line,
      values: [...values],
      ids: [...ids],
      i: null,
      keyPos: null,
      j: null,
      shiftNeeded: null,
      sortedUpTo,
      done: false,
      comparisons,
      shifts,
      narration,
      ...extra,
    });
  };

  snap(1, { key: "start", count: n });

  for (let i = 1; i < n; i++) {
    const key = values[i] as number;
    let pos = i;
    snap(3, { key: "pick", pass: i, i, value: key, last: i - 1 }, { i, keyPos: pos });
    while (true) {
      const j = pos - 1;
      if (j < 0) {
        snap(5, { key: "reachedStart", value: key }, { i, keyPos: pos });
        break;
      }
      const a = values[j] as number;
      comparisons++;
      const shiftNeeded = a > key;
      snap(
        5,
        shiftNeeded
          ? { key: "compareShift", j, a, value: key }
          : { key: "compareStop", j, a, value: key },
        { i, keyPos: pos, j, shiftNeeded },
      );
      if (!shiftNeeded) break;
      // Visually: the bigger value moves right into the gap, the key moves left.
      [values[j], values[pos]] = [key, a];
      [ids[j], ids[pos]] = [ids[pos] as number, ids[j] as number];
      shifts++;
      pos = j;
      snap(6, { key: "shift", a, gap: pos }, { i, keyPos: pos });
    }
    sortedUpTo = i + 1;
    snap(8, { key: "insert", value: key, pos, list: `[${values.join(", ")}]` }, { i, keyPos: pos });
  }

  sortedUpTo = n;
  snap(9, { key: "done", comparisons, shifts }, { done: true });
  return steps;
}
