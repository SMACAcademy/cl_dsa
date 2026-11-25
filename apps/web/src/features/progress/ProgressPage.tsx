import { ArrowRight, ChartPie, RotateCcw } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { readLast, readPractice, readVisited, resetProgress } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { ALGORITHMS, itemPath, STRUCTURES } from "../catalog/catalog";
import { LESSONS, MODULES } from "../systems/lessons";
import { readDone } from "../systems/progress";

function snapshot() {
  return { last: readLast(), visited: readVisited(), done: readDone(), practice: readPractice() };
}

/** My Progress: everything this browser remembers, and a way to forget it. */
export function ProgressPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.progress"));
  const [data, setData] = useState(snapshot);
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const { last, visited, done, practice } = data;
  const algorithms = ALGORITHMS.filter((a) => visited.has(itemPath(a))).length;
  const structures = STRUCTURES.filter((s) => visited.has(itemPath(s))).length;
  const lessons = LESSONS.filter((l) => done.has(l.id)).length;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <ChartPie className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.progress")}</h1>
          <p className="max-w-prose text-muted">{t("progressPage.intro")}</p>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("progressPage.lessons")}
          value={t("progressPage.ofTotal", { done: lessons, total: LESSONS.length })}
          share={lessons / LESSONS.length}
        />
        <Tile
          label={t("progressPage.algorithms")}
          value={t("progressPage.ofTotal", { done: algorithms, total: ALGORITHMS.length })}
          share={algorithms / ALGORITHMS.length}
        />
        <Tile
          label={t("progressPage.structures")}
          value={t("progressPage.ofTotal", { done: structures, total: STRUCTURES.length })}
          share={structures / STRUCTURES.length}
        />
        <Tile
          label={t("progressPage.practice")}
          value={
            practice.outOf > 0
              ? t("progressPage.ofTotal", { done: practice.best, total: practice.outOf })
              : t("progressPage.practiceNone")
          }
          share={practice.outOf > 0 ? practice.best / practice.outOf : 0}
        />
      </ul>

      <Panel title={t("progressPage.last")}>
        {last ? (
          <Link
            to={last.path}
            className="inline-flex items-center gap-2 font-medium text-accent-ink hover:underline"
          >
            {last.title}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-sm text-muted">{t("progressPage.none")}</p>
        )}
      </Panel>

      <Panel title={t("progressPage.byModule")}>
        <ul className="space-y-3">
          {MODULES.map((m) => {
            const finished = m.lessons.filter((l) => done.has(l.id)).length;
            return (
              <li
                key={m.id}
                className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm"
              >
                <Link to="/systems" className="truncate hover:underline">
                  <span className="mr-1.5 font-mono text-muted">{m.number}</span>
                  {m.title}
                </Link>
                <span
                  role="progressbar"
                  aria-label={m.title}
                  aria-valuemin={0}
                  aria-valuemax={m.lessons.length}
                  aria-valuenow={finished}
                  className="h-2 overflow-hidden rounded-full bg-sunken"
                >
                  <span
                    className="block h-full rounded-full bg-found"
                    style={{ width: `${(finished / m.lessons.length) * 100}%` }}
                  />
                </span>
                <span className="font-mono text-xs text-muted">
                  {finished}/{m.lessons.length}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="space-y-2">
        {cleared && (
          <p role="status" className="text-sm font-medium text-found-ink">
            {t("progressPage.cleared")}
          </p>
        )}
        {confirming ? (
          <div
            role="alertdialog"
            aria-label={t("progressPage.reset")}
            className="space-y-3 rounded-panel border border-compare bg-compare-soft p-4"
          >
            <p className="text-sm">{t("progressPage.confirm")}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-control bg-compare px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  resetProgress();
                  setData(snapshot());
                  setConfirming(false);
                  setCleared(true);
                }}
              >
                {t("progressPage.yes")}
              </button>
              <button
                type="button"
                className="rounded-control border border-line bg-raised px-4 py-2 text-sm"
                onClick={() => setConfirming(false)}
              >
                {t("progressPage.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-control border border-line bg-raised px-4 py-2 text-sm hover:border-compare"
            onClick={() => {
              setCleared(false);
              setConfirming(true);
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("progressPage.reset")}
          </button>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <li className="space-y-2 rounded-panel border border-line bg-raised p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-sunken">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
    </li>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-panel border border-line bg-raised p-5"
    >
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
