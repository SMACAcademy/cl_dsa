import {
  ArrowRight,
  BookMarked,
  FlaskConical,
  Network,
  Puzzle,
  Server,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { readLast, readPractice, readVisited } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { ALGORITHMS, itemPath, STRUCTURES, type CatalogItem } from "../catalog/catalog";
import { QUIZZES } from "../practice/quizzes";
import { LESSONS } from "../systems/lessons";
import { readDone } from "../systems/progress";

const primary =
  "inline-flex items-center gap-2 rounded-control bg-accent-solid px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90";
const secondary =
  "inline-flex items-center gap-2 rounded-control border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-accent";

/** The home page: what AlgoVerse is, where you left off, and what to do next. */
export function HomePage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.dashboard"));
  const [last] = useState(readLast);
  const [visited] = useState(readVisited);
  const [done] = useState(readDone);
  const [practice] = useState(readPractice);

  const opened = (items: readonly CatalogItem[]) =>
    items.filter((i) => visited.has(itemPath(i))).length;
  const nextLessons = LESSONS.filter((l) => !done.has(l.id)).slice(0, 3);
  const nextAlgorithms = ALGORITHMS.filter((a) => !visited.has(itemPath(a))).slice(0, 2);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.title")}</h1>
        <p className="max-w-prose text-lg text-muted">
          {t("home.lead", {
            algorithms: ALGORITHMS.length,
            structures: STRUCTURES.length,
            lessons: LESSONS.length,
          })}
        </p>
      </header>

      <section className="rounded-panel border border-accent/40 bg-raised p-5">
        {last ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{t("home.continue")}</p>
              <p className="text-lg font-semibold">{last.title}</p>
            </div>
            <Link to={last.path} className={primary}>
              {t("home.continueAction")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted">{t("home.continueEmpty")}</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/systems/request-journey" className={primary}>
                {t("home.startSystems")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link to="/algorithms/binary-search" className={secondary}>
                {t("home.startAlgo")}
              </Link>
            </div>
          </div>
        )}
      </section>

      <Section title={t("home.labs")}>
        <ul className="grid gap-3 md:grid-cols-3">
          <LabCard
            to="/algorithms"
            icon={FlaskConical}
            title={t("nav.algorithms")}
            body={t("home.lab.algorithms")}
            meter={t("home.opened", { done: opened(ALGORITHMS), total: ALGORITHMS.length })}
          />
          <LabCard
            to="/structures"
            icon={Network}
            title={t("nav.structures")}
            body={t("home.lab.structures")}
            meter={t("home.opened", { done: opened(STRUCTURES), total: STRUCTURES.length })}
          />
          <LabCard
            to="/systems"
            icon={Server}
            title={t("nav.systems")}
            body={t("home.lab.systems")}
            meter={t("home.finished", {
              done: LESSONS.filter((l) => done.has(l.id)).length,
              total: LESSONS.length,
            })}
          />
        </ul>
      </Section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title={t("home.next")} className="lg:col-span-2">
          <ul className="divide-y divide-line rounded-panel border border-line bg-raised">
            {[
              ...nextLessons.map((l) => ({
                to: `/systems/${l.id}`,
                title: l.title,
                sub: l.tagline,
              })),
              ...nextAlgorithms.map((a) => ({ to: itemPath(a), title: a.name, sub: a.summary })),
            ].map((s) => (
              <li key={s.to}>
                <Link to={s.to} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.title}</span>
                    <span className="block truncate text-sm text-muted">{s.sub}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <div className="space-y-4">
          <SideCard
            icon={Puzzle}
            title={t("home.practiceTitle")}
            body={`${t("home.practiceBody", { count: QUIZZES.length })}${
              practice.outOf > 0 ? ` ${t("home.practiceBest", practice)}` : ""
            }`}
            to="/problems"
            action={t("home.practiceAction")}
          />
          <SideCard
            icon={BookMarked}
            title={t("home.libraryTitle")}
            body={t("home.libraryBody")}
            to="/library"
            action={t("home.libraryAction")}
          />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`space-y-3 ${className}`}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function LabCard(props: {
  to: string;
  icon: LucideIcon;
  title: string;
  body: string;
  meter: string;
}) {
  const Icon = props.icon;
  return (
    <li>
      <Link
        to={props.to}
        className="flex h-full flex-col gap-2 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-accent"
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-panel bg-accent-soft text-accent-ink">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          {props.title}
        </span>
        <span className="text-sm text-muted">{props.body}</span>
        <span className="mt-auto pt-1 text-xs font-medium text-accent-ink">{props.meter}</span>
      </Link>
    </li>
  );
}

function SideCard(props: {
  icon: LucideIcon;
  title: string;
  body: string;
  to: string;
  action: string;
}) {
  const Icon = props.icon;
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="space-y-2 rounded-panel border border-line bg-raised p-4"
    >
      <h2 id={id} className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-accent-ink" aria-hidden="true" />
        {props.title}
      </h2>
      <p className="text-sm text-muted">{props.body}</p>
      <Link
        to={props.to}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline"
      >
        {props.action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
