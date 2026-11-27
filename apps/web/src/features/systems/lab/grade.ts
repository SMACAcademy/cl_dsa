import type { Check, Design, LabProblem } from "./model";

export type Band = "excellent" | "solid" | "close" | "start";

export type Grade = {
  score: number;
  band: Band;
  /** `applies` is false for checks that don't fit this design; they don't count. */
  results: readonly { check: Check; passed: boolean; applies: boolean }[];
};

/** The score a learner needs for the problem to count as done. */
export const PASS_SCORE = 70;

export function bandOf(score: number): Band {
  if (score >= 90) return "excellent";
  if (score >= PASS_SCORE) return "solid";
  if (score >= 40) return "close";
  return "start";
}

/** A check that throws counts as false. */
function safely(test: () => boolean): boolean {
  try {
    return test();
  } catch {
    return false;
  }
}

export function grade(problem: Pick<LabProblem, "checks">, design: Design): Grade {
  const results = problem.checks.map((check) => {
    const applies = safely(() => check.applies?.(design) ?? true);
    const passed = applies && safely(() => check.pass(design));
    return { check, passed, applies };
  });
  const counted = results.filter((r) => r.applies);
  const total = counted.reduce((s, r) => s + r.check.points, 0);
  const won = counted.reduce((s, r) => s + (r.passed ? r.check.points : 0), 0);
  const score = total === 0 ? 0 : Math.round((100 * won) / total);
  return { score, band: bandOf(score), results };
}
