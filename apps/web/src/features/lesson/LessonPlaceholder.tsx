import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { SectionPlaceholder } from "../placeholder/SectionPlaceholder";

const SECTION_LETTERS = "ABCDEFGHIJKL".split("");

/** `/learn/:conceptId` until the lesson engine exists (ruling B16; Task 17 replaces it). */
export function LessonPlaceholder() {
  const { t } = useTranslation();
  const { conceptId = "" } = useParams();

  return (
    <SectionPlaceholder
      id="lesson"
      subtitle={
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("lesson.concept")}
          </span>
          <code className="rounded-control bg-sunken px-2 py-0.5 text-fg">{conceptId}</code>
        </p>
      }
    >
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
        <ol aria-label={t("lesson.sectionsLabel")} className="flex flex-wrap gap-1.5">
          {SECTION_LETTERS.map((letter) => (
            <li
              key={letter}
              className="grid size-8 place-items-center rounded-control border border-line bg-surface font-mono text-sm text-muted"
            >
              {letter}
            </li>
          ))}
        </ol>
        <Link
          to="/curriculum"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent-ink hover:underline sm:self-auto"
        >
          {t("lesson.backToCurriculum")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </SectionPlaceholder>
  );
}
