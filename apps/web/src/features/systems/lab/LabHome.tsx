import { ArrowLeft, Check, PencilRuler } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { PASS_SCORE } from "./grade";
import { LAB_PROBLEMS } from "./problems";
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
    </div>
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
