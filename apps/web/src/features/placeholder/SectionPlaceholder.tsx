import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PhaseBadge } from "../../ui/PhaseBadge";
import { TriangleLattice } from "../../ui/TriangleLattice";
import { SECTION_ICON, SECTION_PHASE, type PlaceholderId } from "./sections";

type Props = {
  id: PlaceholderId;
  /** Extra line(s) under the description, e.g. the concept id on the lesson screen. */
  subtitle?: ReactNode;
  /** Working pieces shown between the stage and the plan (e.g. the theme picker in Settings). */
  children?: ReactNode;
};

/** A section that is not built yet: what it will be, when it arrives, and what is planned. */
export function SectionPlaceholder({ id, subtitle, children }: Props) {
  const { t } = useTranslation();
  const plannedId = useId();
  const Icon = SECTION_ICON[id];
  const phase = SECTION_PHASE[id];
  const title = t(`nav.${id}`);
  const planned = t(`sections.${id}.planned`, { returnObjects: true });
  useDocumentTitle(title);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-prose text-muted">{t(`sections.${id}.description`)}</p>
            {subtitle}
          </div>
        </div>
        <PhaseBadge phase={phase} />
      </header>

      <div className="relative overflow-hidden rounded-panel border border-line bg-raised">
        <TriangleLattice className="absolute inset-0 text-accent opacity-[0.12]" />
        <div className="relative flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <span className="grid size-16 place-items-center rounded-full border border-line bg-surface text-accent-ink shadow-sm">
            <Icon className="size-8" aria-hidden="true" />
          </span>
          <p className="text-lg font-medium">{t("placeholder.stageTitle")}</p>
          <p className="max-w-md text-sm text-muted">{t("placeholder.stageBody", { phase })}</p>
        </div>
      </div>

      {children}

      <section
        aria-labelledby={plannedId}
        className="rounded-panel border border-line bg-raised p-6"
      >
        <h2 id={plannedId} className="text-sm font-semibold text-muted">
          {t("placeholder.planned")}
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {planned.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-control border border-line bg-surface p-4 text-sm"
            >
              <svg
                viewBox="0 0 10 9"
                aria-hidden="true"
                focusable="false"
                className="mt-1 size-2.5 shrink-0 fill-accent"
              >
                <polygon points="5,0 10,9 0,9" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
