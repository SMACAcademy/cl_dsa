/** Tiny, validated inputs for the search players. */

export const MAX_VALUES = 16;
/** The numbers of a preset such as "4, 8, 1" (presets are always valid). */
export function presetNumbers(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .filter((p) => p !== "")
    .map(Number);
}

/** How many values the Random button picks. */
export const RANDOM_COUNT = 12;

/** Whole numbers from `min` to `max`, chosen at random; optionally distinct and/or ascending. */
export function randomValues(
  count: number,
  { min = 1, max = 99, unique = false, sorted = false } = {},
  random: () => number = Math.random,
): number[] {
  const span = max - min + 1;
  const n = unique ? Math.min(count, span) : count;
  const out: number[] = [];
  while (out.length < n) {
    const v = min + Math.floor(random() * span);
    if (!unique || !out.includes(v)) out.push(v);
  }
  return sorted ? out.sort((a, b) => a - b) : out;
}
export const VALUE_RANGE = { min: -99, max: 99 } as const;

export type SearchInput = { items: number[]; target: number };

export type InputError =
  | "empty"
  | "tooMany"
  | "notInteger"
  | "outOfRange"
  | "targetMissing"
  | "notSorted"
  | "notDigits"
  | "negative";

export type ParsedInput = ({ ok: true } & SearchInput) | { ok: false; error: InputError };

export type ParsedValues = { ok: true; items: number[] } | { ok: false; error: InputError };

const INTEGER = /^-?\d+$/;
const inRange = (n: number) => n >= VALUE_RANGE.min && n <= VALUE_RANGE.max;

/** Extra rules some algorithms need: counting sort uses keys 0..9, radix sort no negatives. */
export type ValueConstraint = "digits" | "nonNegative";

/** Parses "4, 8, 1, 9" (commas and/or spaces) into at most MAX_VALUES small integers. */
export function parseValues(valuesText: string, constraint?: ValueConstraint): ParsedValues {
  const parsed = parseRawValues(valuesText);
  if (!parsed.ok) return parsed;
  if (constraint === "digits" && parsed.items.some((v) => v < 0 || v > 9)) {
    return { ok: false, error: "notDigits" };
  }
  if (constraint === "nonNegative" && parsed.items.some((v) => v < 0)) {
    return { ok: false, error: "negative" };
  }
  return parsed;
}

function parseRawValues(valuesText: string): ParsedValues {
  const parts = valuesText
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length === 0) return { ok: false, error: "empty" };
  if (parts.length > MAX_VALUES) return { ok: false, error: "tooMany" };
  if (!parts.every((p) => INTEGER.test(p))) return { ok: false, error: "notInteger" };
  const items = parts.map(Number);
  if (!items.every(inRange)) return { ok: false, error: "outOfRange" };
  return { ok: true, items };
}

/**
 * Parses values plus a target such as "1".
 * With `requireSorted`, values must be in ascending order (ties allowed).
 */
export function parseInput(
  valuesText: string,
  targetText: string,
  { requireSorted = false }: { requireSorted?: boolean } = {},
): ParsedInput {
  const values = parseValues(valuesText);
  if (!values.ok) return values;
  const { items } = values;
  const t = targetText.trim();
  if (t === "") return { ok: false, error: "targetMissing" };
  if (!INTEGER.test(t)) return { ok: false, error: "notInteger" };
  const target = Number(t);
  if (!inRange(target)) return { ok: false, error: "outOfRange" };
  if (requireSorted && items.some((v, i) => i > 0 && v < (items[i - 1] as number))) {
    return { ok: false, error: "notSorted" };
  }
  return { ok: true, items, target };
}
