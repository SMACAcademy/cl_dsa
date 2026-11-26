import { DEFAULT_AUTOPLAY_SPEED, type AutoplaySpeed } from "../../lib/progress";
import type { LessonStep } from "./model";

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * How long autoplay stays on a step. At 1× that is time to read its words (about
 * 250 words a minute), plus a moment to look at the diagram, plus thinking time for
 * a quiz; 2× and 3× divide it.
 */
export function dwellMs(step: LessonStep, speed: AutoplaySpeed = DEFAULT_AUTOPLAY_SPEED): number {
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
  return Math.round(base / speed);
}
