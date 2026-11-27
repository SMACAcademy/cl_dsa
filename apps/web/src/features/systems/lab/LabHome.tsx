import { ArrowLeft, Check, FilePlus2, PencilRuler } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { PASS_SCORE } from "./grade";
import { LAB_PROBLEMS } from "./problems";
import { button, primary } from "./DesignEditor";
import { createOwn, listOwn } from "./ownStorage";
import { readBest } from "./storage";

/** The Design Lab: every problem, with the best score from this browser. */
export function LabHome() {
  const { t } = useTranslation();
  useDocumentTitle(t("lab.title"));
  const [best] = useState(() => new Map(LAB_PROBLEMS.map((p) => [p.id, readBest(p.id)])));

  return (
    <div className="space-y-6">
      <Link
        to="/systems"
        className="inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("systems.back")}
      </Link>
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <PencilRuler className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("lab.title")}</h1>
          <p className="max-w-prose text-muted">{t("lab.intro")}</p>
        </div>
      </header>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LAB_PROBLEMS.map((p) => {
          const score = best.get(p.id);
          return (
            <li key={p.id}>
              <Link
                to={`/systems/lab/${p.id}`}
                className="flex h-full flex-col gap-2 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-accent"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{p.title}</span>
                  {score !== undefined && score >= PASS_SCORE && (
                    <Check
                      className="size-4 shrink-0 text-found-ink"
                      aria-label={t("systems.done")}
                    />
                  )}
                </span>
                <span className="text-sm text-muted">{p.tagline}</span>
                <span className="mt-auto flex flex-wrap gap-2 pt-1 text-xs text-muted">
                  <span>{t(`catalog.level.${p.level}`)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("lab.checks", { count: p.checks.length })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{score === undefined ? t("lab.notTried") : t("lab.best", { score })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <OwnProblems />
    </div>
  );
}

/** Start a problem of your own, blank or from a lab problem's brief, and reopen earlier ones. */
function OwnProblems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = useId();
  const [mine] = useState(listOwn);
  const [from, setFrom] = useState(LAB_PROBLEMS[0]?.id ?? "");

  const open = (start?: (typeof LAB_PROBLEMS)[number]) => {
    const p = createOwn(
      start
        ? {
            title: start.title,
            brief: start.brief.join("\n\n"),
            requirements: start.requirements.join("\n"),
          }
        : {},
    );
    navigate(`/systems/lab/own/${p.id}`);
  };

  return (
    <section
      aria-labelledby={`${id}-own`}
      className="space-y-4 rounded-panel border border-accent/40 bg-accent-soft/30 p-4"
    >
      <div className="space-y-1">
        <h2 id={`${id}-own`} className="text-lg font-semibold">
          {t("lab.own.title")}
        </h2>
        <p className="max-w-prose text-sm text-muted">{t("lab.own.intro")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className={primary} onClick={() => open()}>
          <FilePlus2 className="size-4" aria-hidden="true" />
          {t("lab.own.blank")}
        </button>
        <div className="space-y-1">
          <label htmlFor={`${id}-from`} className="block text-sm font-medium">
            {t("lab.own.startFrom")}
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id={`${id}-from`}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-control border border-line bg-raised px-2 py-1.5 text-sm"
            >
              {LAB_PROBLEMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={button}
              onClick={() => open(LAB_PROBLEMS.find((p) => p.id === from))}
            >
              {t("lab.own.startFromButton")}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("lab.own.yours")}</h3>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">{t("lab.own.none")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {mine.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/systems/lab/own/${p.id}`}
                  className="block rounded-control border border-line bg-raised px-3 py-2 text-sm font-medium hover:border-accent"
                >
                  {p.title.trim() || t("lab.own.untitled")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** The card on the System Design home that leads into the lab. */
export function LabCard() {
  const { t } = useTranslation();
  return (
    <Link
      to="/systems/lab"
      className="flex items-start gap-4 rounded-panel border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:border-accent"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-panel bg-raised text-accent-ink">
        <PencilRuler className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block font-semibold">{t("lab.cardTitle")}</span>
        <span className="block text-sm text-muted">
          {t("lab.cardBody", { count: LAB_PROBLEMS.length })}
        </span>
      </span>
    </Link>
  );
}
