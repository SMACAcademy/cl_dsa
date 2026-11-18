/** Tiny, validated inputs for the search players. */

export const MAX_VALUES = 8;
export const VALUE_RANGE = { min: -99, max: 99 } as const;

export type SearchInput = { items: number[]; target: number };

export type InputError =
  "empty" | "tooMany" | "notInteger" | "outOfRange" | "targetMissing" | "notSorted";

export type ParsedInput = ({ ok: true } & SearchInput) | { ok: false; error: InputError };

export type ParsedValues = { ok: true; items: number[] } | { ok: false; error: InputError };

const INTEGER = /^-?\d+$/;
const inRange = (n: number) => n >= VALUE_RANGE.min && n <= VALUE_RANGE.max;

/** Parses "4, 8, 1, 9" (commas and/or spaces) into at most MAX_VALUES small integers. */
export function parseValues(valuesText: string): ParsedValues {
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
