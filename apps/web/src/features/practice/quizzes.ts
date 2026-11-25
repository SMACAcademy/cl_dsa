import { MODULES } from "../systems/lessons";
import type { Quiz } from "../systems/model";

/** One self-check question, with where it comes from so a learner can review the step. */
export type PracticeQuestion = Quiz & {
  id: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  /** 1-based step number inside the lesson. */
  step: number;
};

/** Every quiz in every system design lesson, in teaching order. */
export const QUIZZES: readonly PracticeQuestion[] = MODULES.flatMap((m) =>
  m.lessons.flatMap((lesson) =>
    lesson.steps.flatMap((s, i) =>
      s.quiz
        ? [
            {
              ...s.quiz,
              id: `${lesson.id}#${i + 1}`,
              moduleId: m.id,
              moduleTitle: m.title,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              step: i + 1,
            },
          ]
        : [],
    ),
  ),
);

/** A random order (Fisher–Yates), so every round is different. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
