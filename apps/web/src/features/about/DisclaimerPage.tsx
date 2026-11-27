import { FileWarning } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CREATOR } from "../../branding";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { COMMUNITY } from "../community/community";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const link = "text-accent-ink underline underline-offset-2";

/** What AlgoVerse is and isn't responsible for, and how to get a mistake corrected. */
export function DisclaimerPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("disclaimer.title"));
  const sections = ["learning", "mistakes", "asIs", "examples", "data"] as const;

  return (
    <article className="max-w-prose space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <FileWarning className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("disclaimer.title")}</h1>
          <p className="text-lg text-muted">{t("disclaimer.lead")}</p>
        </div>
      </header>

      {sections.map((key) => (
        <section key={key} aria-labelledby={`disclaimer-${key}`} className="space-y-2">
          <h2 id={`disclaimer-${key}`} className="text-xl font-semibold">
            {t(`disclaimer.${key}.title`)}
          </h2>
          <p>{t(`disclaimer.${key}.body`)}</p>
        </section>
      ))}

      <section
        aria-labelledby="disclaimer-fix"
        className="space-y-3 rounded-panel border border-accent/40 bg-accent-soft/30 p-4"
      >
        <h2 id="disclaimer-fix" className="text-xl font-semibold">
          {t("disclaimer.fix.title")}
        </h2>
        <p>{t("disclaimer.fix.body")}</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <a href={COMMUNITY.contentFix} {...external} className={link}>
              {t("disclaimer.fix.issue")}
            </a>{" "}
            {t("disclaimer.fix.issueBody")}
          </li>
          <li>
            <a href={COMMUNITY.contributing} {...external} className={link}>
              {t("disclaimer.fix.pr")}
            </a>{" "}
            {t("disclaimer.fix.prBody")}
          </li>
          <li>{t("disclaimer.fix.review")}</li>
        </ol>
        <p className="text-sm text-muted">{t("disclaimer.fix.evidence")}</p>
      </section>

      <section aria-labelledby="disclaimer-code" className="space-y-2">
        <h2 id="disclaimer-code" className="text-xl font-semibold">
          {t("disclaimer.code.title")}
        </h2>
        <p>
          {t("disclaimer.code.body")}{" "}
          <a href={`${CREATOR.github}/blob/main/LICENSE`} {...external} className={link}>
            {t("disclaimer.code.license")}
          </a>
        </p>
      </section>

      <p className="text-sm text-muted">{t("disclaimer.updated")}</p>
    </article>
  );
}
