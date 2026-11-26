import type { Check, Design, LabProblem } from "./model";

export type Band = "excellent" | "solid" | "close" | "start";

export type Grade = {
  score: number;
  band: Band;
  results: readonly { check: Check; passed: boolean }[];
};

/** The score a learner needs for the problem to count as done. */
export const PASS_SCORE = 70;

export function bandOf(score: number): Band {
  if (score >= 90) return "excellent";
  if (score >= PASS_SCORE) return "solid";
  if (score >= 40) return "close";
  return "start";
}

export function grade(problem: Pick<LabProblem, "checks">, design: Design): Grade {
  const results = problem.checks.map((check) => {
    let passed: boolean;
    try {
      passed = check.pass(design);
    } catch {
      passed = false;
    }
    return { check, passed };
  });
  const total = results.reduce((s, r) => s + r.check.points, 0);
  const won = results.reduce((s, r) => s + (r.passed ? r.check.points : 0), 0);
  const score = total === 0 ? 0 : Math.round((100 * won) / total);
  return { score, band: bandOf(score), results };
}
