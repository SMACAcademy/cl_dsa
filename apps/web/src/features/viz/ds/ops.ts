/**
 * A tiny command language for the data-structure players, e.g.
 * "push 4, push 7, pop" or "insert 4 after 3, delete 8". Values are small
 * integers (-99..99) or single letters, so examples stay readable.
 */

export const MAX_OPS = 8;
export const MAX_START = 8;

const VALUE = /^(-?\d{1,2}|[A-Za-z])$/;

export function isValue(token: string): boolean {
  return VALUE.test(token);
}

/** One command pattern: a regex over the whole command and how to build the op. */
export type OpForm<Op> = { pattern: RegExp; build: (m: RegExpMatchArray) => Op | null };

export type OpsError =
  | { key: "empty" }
  | { key: "tooManyOps"; max: number }
  | { key: "unknown"; command: string }
  | { key: "badStart"; token: string }
  | { key: "tooManyStart"; max: number }
  | { key: "badCapacity" };

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: OpsError };

/** Parses "a, b, c" into ops using the given forms (matched case-insensitively). */
export function parseOps<Op>(text: string, forms: readonly OpForm<Op>[]): Parsed<Op[]> {
  const commands = text
    .split(",")
    .map((c) => c.trim().replace(/\s+/g, " "))
    .filter((c) => c !== "");
  if (commands.length === 0) return { ok: false, error: { key: "empty" } };
  if (commands.length > MAX_OPS) return { ok: false, error: { key: "tooManyOps", max: MAX_OPS } };
  const ops: Op[] = [];
  for (const command of commands) {
    let op: Op | null = null;
    for (const form of forms) {
      const m = command.match(form.pattern);
      if (m) {
        op = form.build(m);
        if (op) break;
      }
    }
    if (!op) return { ok: false, error: { key: "unknown", command } };
    ops.push(op);
  }
  return { ok: true, value: ops };
}

/** Parses the starting values, e.g. "3, 8, 5" (may be empty). */
export function parseStart(text: string): Parsed<string[]> {
  const tokens = text
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t !== "");
  if (tokens.length > MAX_START) {
    return { ok: false, error: { key: "tooManyStart", max: MAX_START } };
  }
  const bad = tokens.find((t) => !isValue(t));
  if (bad !== undefined) return { ok: false, error: { key: "badStart", token: bad } };
  return { ok: true, value: tokens };
}

/** Regex fragment for one value token. */
export const V = "(-?\\d{1,2}|[A-Za-z])";
/** Regex fragment for an index. */
export const I = "(\\d{1,2})";

/** Builds a whole-command, case-insensitive pattern from a template like `push ${V}`. */
export function cmd(source: string): RegExp {
  return new RegExp(`^${source}$`, "i");
}
