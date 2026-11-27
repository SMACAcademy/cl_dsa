import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CREATOR, hasCreator } from "../branding";
import { COMMUNITY } from "../features/community/community";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const quiet = "underline-offset-4 hover:text-fg hover:underline";

/** A small, quiet footer on every page: who made it, and where to join in. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-line px-4 py-4 text-xs text-muted sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        {hasCreator() && (
          <span>
            {t("footer.madeBy")}{" "}
            {CREATOR.linkedin ? (
              <a href={CREATOR.linkedin} {...external} className={`${quiet} text-fg`}>
                {CREATOR.name}
              </a>
            ) : (
              <Link to="/about" className={`${quiet} text-fg`}>
                {CREATOR.name}
              </Link>
            )}
          </span>
        )}
        {hasCreator() && <span aria-hidden="true">·</span>}
        <a href={CREATOR.github} {...external} className={quiet}>
          {t("footer.source")}
        </a>
        <span aria-hidden="true">·</span>
        <a href={COMMUNITY.discussions} {...external} className={quiet}>
          {t("footer.discussions")}
        </a>
        <span aria-hidden="true">·</span>
        <a href={COMMUNITY.contributing} {...external} className={quiet}>
          {t("footer.contribute")}
        </a>
        <span aria-hidden="true">·</span>
        <Link to="/disclaimer" className={quiet}>
          {t("footer.disclaimer")}
        </Link>
      </div>
    </footer>
  );
}
