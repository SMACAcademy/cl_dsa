import { Hammer, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PROJECTS } from "./projects";

/** Real-World Projects: small systems to build in the playground, each tied to its lessons. */
export function ProjectsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.projects"));

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <Hammer className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.projects")}</h1>
          <p className="max-w-prose text-muted">{t("projects.intro")}</p>
        </div>
      </header>

      <ul className="grid gap-4 lg:grid-cols-2">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            <article className="flex h-full flex-col gap-3 rounded-panel border border-line bg-raised p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                  {t(`catalog.level.${p.level}`)}
                </span>
              </div>
              <p className="text-sm text-muted">{p.summary}</p>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {t("projects.steps")}
                </h3>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
                  {p.milestones.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {t("projects.challenges")}
                </h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  {p.challenges.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-muted">{t("projects.uses")}</span>
                {p.uses.map((u) => (
                  <Link
                    key={u.path}
                    to={u.path}
                    className="rounded-full border border-line bg-surface px-2.5 py-0.5 hover:border-accent"
                  >
                    {u.label}
                  </Link>
                ))}
              </div>
              <Link
                to={`/playground?example=${p.id}`}
                className="mt-auto inline-flex w-fit items-center gap-2 rounded-control bg-accent-solid px-4 py-2 text-sm font-medium text-on-accent"
              >
                <Play className="size-4" aria-hidden="true" />
                {t("projects.open")}
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
