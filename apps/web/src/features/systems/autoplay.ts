import type { AutoplaySpeed } from "../../lib/progress";
import type { LessonStep } from "./model";

const SPEED: Record<AutoplaySpeed, number> = { slow: 1.45, normal: 1, fast: 0.65 };

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * How long autoplay stays on a step: time to read its words (about 250 words a
 * minute), plus a moment to look at the diagram, plus thinking time for a quiz.
 */
export function dwellMs(step: LessonStep, speed: AutoplaySpeed = "normal"): number {
  const text = [
    step.title,
    ...step.body,
    step.callout?.text ?? "",
    ...(step.changes ?? []).map((c) => c.text),
    ...(step.table?.rows.flat() ?? []),
  ].join(" ");
  const reading = words(text) * 240 + (step.code?.length ?? 0) * 700;
  const quiz = step.quiz ? 9000 : 0;
  const base = Math.min(Math.max(4000 + reading, 7000), 32000) + quiz;
  return Math.round(base * SPEED[speed]);
}
