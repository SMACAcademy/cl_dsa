import { CASES } from "../systems/cases";
import { MODULES } from "../systems/lessons";
import type { Lesson, Quiz } from "../systems/model";

/** One self-check question, with where it comes from so a learner can review the step. */
export type PracticeQuestion = Quiz & {
  id: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  /** 1-based step number inside the lesson. */
  step: number;
  /** The page to review the step on. */
  path: string;
};

const fromLesson = (lesson: Lesson, moduleId: string, moduleTitle: string, base: string) =>
  lesson.steps.flatMap((s, i) =>
    s.quiz
      ? [
          {
            ...s.quiz,
            id: `${lesson.id}#${i + 1}`,
            moduleId,
            moduleTitle,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            step: i + 1,
            path: `${base}/${lesson.id}?step=${i + 1}`,
          },
        ]
      : [],
  );

/** Practice topics: every module, plus the case studies that combine them. */
export const TOPICS: readonly { id: string; title: string }[] = [
  ...MODULES.map((m) => ({ id: m.id, title: m.title })),
  { id: "cases", title: "Case studies" },
];

/** Every quiz in every lesson and case study, in teaching order. */
export const QUIZZES: readonly PracticeQuestion[] = [
  ...MODULES.flatMap((m) => m.lessons.flatMap((l) => fromLesson(l, m.id, m.title, "/systems"))),
  ...CASES.flatMap((c) => fromLesson(c, "cases", "Case studies", "/systems/case")),
];

/** A random order (Fisher–Yates), so every round is different. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
