import { Check, ChevronRight, FlaskConical, Layers } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { WeeklyChallenge } from "../community/WeeklyChallenge";
import { useScrollToHash } from "../../lib/slug";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { SECTION_ICON } from "../placeholder/sections";
import { casesAfter } from "./cases";
import { LabCard } from "./lab/LabHome";
import { LESSONS, MODULES } from "./lessons";
import type { Module } from "./model";
import { readDone } from "./progress";

/** The System Design Lab home: every module and lesson, with progress from this browser. */
export function SystemsHome() {
  const { t } = useTranslation();
  const title = t("nav.systems");
  const Icon = SECTION_ICON.systems;
  const [done] = useState(readDone);
  const finished = LESSONS.filter((l) => done.has(l.id)).length;
  useDocumentTitle(title);
  useScrollToHash();

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-prose text-muted">{t("systems.intro")}</p>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span aria-hidden="true" className="h-2 w-40 overflow-hidden rounded-full bg-sunken">
              <span
                className="block h-full rounded-full bg-found"
                style={{ width: `${(finished / Math.max(LESSONS.length, 1)) * 100}%` }}
              />
            </span>
            {t("systems.progress", { done: finished, total: LESSONS.length })}
          </div>
        </div>
      </header>

      <WeeklyChallenge />

      <LabCard />

      {MODULES.map((m) => (
        <ModuleSection key={m.id} module={m} done={done} />
      ))}
    </div>
  );
}

function ModuleSection({ module, done }: { module: Module; done: ReadonlySet<string> }) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section id={module.id} aria-labelledby={headingId} className="scroll-mt-20">
      <h2 id={headingId} className="text-lg font-semibold tracking-tight">
        <span className="mr-2 font-mono text-muted">{module.number}</span>
        {module.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{module.blurb}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {module.lessons.map((lesson, i) => (
          <li key={lesson.id}>
            <Link
              to={`/systems/${lesson.id}`}
              className="group flex h-full flex-col gap-2 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-accent"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  <span className="mr-1.5 font-mono text-xs text-muted">
                    {module.number}.{i + 1}
                  </span>
                  {lesson.title}
                </span>
                {done.has(lesson.id) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-found-ink">
                    <Check className="size-3.5" aria-hidden="true" />
                    {t("systems.done")}
                  </span>
                ) : (
                  <ChevronRight
                    className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="text-sm text-muted">{lesson.tagline}</span>
              <span className="mt-auto flex flex-wrap gap-2 pt-1 text-xs text-muted">
                <span>{t("systems.minutes", { count: lesson.minutes })}</span>
                <span aria-hidden="true">·</span>
                <span>{t(`catalog.level.${lesson.level}`)}</span>
                <span aria-hidden="true">·</span>
                <span>{t("systems.steps", { count: lesson.steps.length })}</span>
                {lesson.lab && (
                  <span className="inline-flex items-center gap-1 text-accent-ink">
                    <FlaskConical className="size-3.5" aria-hidden="true" />
                    {t("systems.lab")}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Checkpoint moduleId={module.id} done={done} />
    </section>
  );
}

/** After a module: case studies that combine everything learned up to here. */
function Checkpoint({ moduleId, done }: { moduleId: string; done: ReadonlySet<string> }) {
  const { t } = useTranslation();
  const headingId = useId();
  const cases = casesAfter(moduleId);
  if (cases.length === 0) return null;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="mt-4 rounded-panel border border-accent/40 bg-accent-soft/40 p-4"
    >
      <h3 id={headingId} className="flex items-center gap-2 font-semibold">
        <Layers className="size-4 text-accent-ink" aria-hidden="true" />
        {t("cases.checkpoint")}
      </h3>
      <p className="mt-1 text-sm text-muted">{t("cases.checkpointBlurb")}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              to={`/systems/case/${c.id}`}
              className="flex h-full flex-col gap-2 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-accent"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.title}</span>
                {done.has(c.id) && (
                  <Check
                    className="size-4 shrink-0 text-found-ink"
                    aria-label={t("systems.done")}
                  />
                )}
              </span>
              <span className="text-sm text-muted">{c.tagline}</span>
              <span className="mt-auto flex flex-wrap gap-2 pt-1 text-xs text-muted">
                <span className="rounded-full border border-accent/50 px-2 text-accent-ink">
                  {t(`cases.tier.${c.tier}`)}
                </span>
                <span>{t("cases.concepts", { count: c.concepts.length })}</span>
                <span aria-hidden="true">·</span>
                <span>{t("systems.minutes", { count: c.minutes })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
