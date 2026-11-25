import { Check, Circle, ListTree } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { STAGES } from "./topics";
import { useSeen } from "./UniversePage";

type Show = "all" | "todo" | "done";

/** The Curriculum: the whole course in learning order, with time estimates and status. */
export function CurriculumPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.curriculum"));
  const seen = useSeen();
  const [show, setShow] = useState<Show>("all");
  const allPages = STAGES.flatMap((s) => s.topics.flatMap((tp) => tp.pages));
  const hours = Math.round(allPages.reduce((sum, p) => sum + p.minutes, 0) / 60);
  const doneCount = allPages.filter((p) => seen(p.path)).length;
  const keep = (path: string) => show === "all" || (show === "done") === seen(path);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <ListTree className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.curriculum")}</h1>
          <p className="max-w-prose text-muted">{t("curriculum.intro")}</p>
          <p className="text-sm text-muted">
            {t("curriculum.summary", { pages: allPages.length, hours, done: doneCount })}
          </p>
        </div>
      </header>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mr-2 text-sm font-semibold">{t("curriculum.show")}</legend>
        {(["all", "todo", "done"] as const).map((value) => (
          <label
            key={value}
            className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-ink"
          >
            <input
              type="radio"
              name="show"
              value={value}
              checked={show === value}
              onChange={() => setShow(value)}
              className="sr-only"
            />
            {t(`curriculum.filter.${value}`)}
          </label>
        ))}
      </fieldset>

      {STAGES.map((stage, i) => (
        <Stage key={stage.key} index={i} stage={stage} seen={seen} keep={keep} />
      ))}
    </div>
  );
}

function Stage({
  index,
  stage,
  seen,
  keep,
}: {
  index: number;
  stage: (typeof STAGES)[number];
  seen: (path: string) => boolean;
  keep: (path: string) => boolean;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const key = stage.key as "stage1" | "stage2" | "stage3" | "stage4";
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          <span className="mr-2 font-mono text-muted">{index + 1}</span>
          {t(`curriculum.${key}.title`)}
        </h2>
        <p className="text-sm text-muted">{t(`curriculum.${key}.blurb`)}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {stage.topics.map((topic) => {
          const pages = topic.pages.filter((p) => keep(p.path));
          if (pages.length === 0) return null;
          const minutes = topic.pages.reduce((sum, p) => sum + p.minutes, 0);
          return (
            <article key={topic.id} className="rounded-panel border border-line bg-raised p-4">
              <h3 className="flex items-baseline justify-between gap-2">
                <Link to={topic.path} className="font-semibold text-accent-ink hover:underline">
                  {topic.title}
                </Link>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {t("curriculum.time", { count: topic.pages.length, minutes })}
                </span>
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {pages.map((p) => {
                  const done = seen(p.path);
                  return (
                    <li key={p.path} className="flex items-center gap-2">
                      {done ? (
                        <Check className="size-4 shrink-0 text-found-ink" aria-hidden="true" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted" aria-hidden="true" />
                      )}
                      <Link to={p.path} className="hover:underline">
                        {p.title}
                      </Link>
                      <span className="sr-only">
                        {done ? t("curriculum.statusDone") : t("curriculum.statusTodo")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
