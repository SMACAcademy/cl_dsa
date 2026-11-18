/**
 * Shared step format for the data-structure players. Each operation (push,
 * insert, delete…) becomes one or more full-state steps with a line in the
 * Python code, a narration key under `viz.ds.<prefix>`, and optionally a
 * prediction question asked before the step is revealed.
 */

export type Vars = Record<string, string | number>;

/** A narration: translation key (relative to `viz.ds.<prefix>`) plus its values. */
export type Say = { key: string; vars?: Vars };

/** A question asked before a step: the options are values, `correct` is one of them. */
export type Question = { say: Say; options: readonly string[]; correct: string };

export type DsStep<S> = {
  line: number;
  say: Say;
  state: S;
  question?: Question;
};

/** Collects steps; `S` is copied by the caller so later mutations do not leak in. */
export class StepLog<S> {
  readonly steps: DsStep<S>[] = [];
  private readonly snapshot: () => S;

  constructor(snapshot: () => S) {
    this.snapshot = snapshot;
  }

  add(line: number, key: string, vars?: Vars, question?: Question): void {
    const step: DsStep<S> = { line, say: { key, vars }, state: this.snapshot() };
    if (question) step.question = question;
    this.steps.push(step);
  }
}

/** Distinct values, in order: the answer options for "which value…?" questions. */
export function choices(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Formats a list of values as Python would print it, e.g. [4, 7] or ['A', 'B']. */
export function pyList(values: readonly string[]): string {
  return `[${values.map(pyValue).join(", ")}]`;
}

/** A value as Python would print it: numbers bare, letters quoted. */
export function pyValue(v: string): string {
  return /^-?\d+$/.test(v) ? v : `'${v}'`;
}
