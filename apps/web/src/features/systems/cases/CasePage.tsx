import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { LessonView } from "../LessonPage";
import { conceptLessons, findCase } from ".";

/** One case study: a real product built step by step from lessons already learned. */
export function CasePage() {
  const { t } = useTranslation();
  const { caseId = "" } = useParams();
  const found = findCase(caseId);
  useDocumentTitle(found ? found.cs.title : t("nav.systems"));

  if (!found) {
    return (
      <div className="space-y-4">
        <Link
          to="/systems"
          className="inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("systems.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("cases.missing", { id: caseId })}</p>
      </div>
    );
  }
  const { cs, index, count, checkpoint, prev, next } = found;
  return (
    <LessonView
      key={cs.id}
      lesson={cs}
      where={t("cases.where", {
        index: index + 1,
        count,
        tier: t(`cases.tier.${cs.tier}`),
        module: checkpoint.title,
      })}
      prev={prev}
      next={next}
      base="/systems/case"
      concepts={conceptLessons(cs)}
    />
  );
}
