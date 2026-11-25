import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { recordVisit } from "../../lib/progress";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { findItem, itemPath, itemsOfKind, KIND_PATH, type CatalogKind } from "./catalog";
import { VISUALIZERS } from "../viz/registry";
import { InteractiveChip, LevelChip, StageChip } from "./chips";

const backLink =
  "inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline";

/** One catalog entry: what it is, what will be built, and a tiny worked example. */
export function CatalogDetail({ kind }: { kind: CatalogKind }) {
  const { t } = useTranslation();
  const { itemId = "" } = useParams();
  const found = findItem(itemId);
  const item = found?.kind === kind ? found : undefined;
  useDocumentTitle(item ? item.name : t("catalog.missing.title"));
  useEffect(() => {
    if (item) recordVisit({ path: itemPath(item), title: item.name, kind: item.kind });
  }, [item]);

  const listPath = KIND_PATH[kind];
  const back = (
    <Link to={listPath} className={backLink}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t(`catalog.${kind}.back`)}
    </Link>
  );

  if (!item) {
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("catalog.missing.body", { id: itemId })}</p>
      </div>
    );
  }

  const siblings = itemsOfKind(kind);
  const index = siblings.findIndex((s) => s.id === item.id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  const buildsOn = (item.buildsOn ?? []).map(findItem).filter((x) => x !== undefined);
  const Visualizer = VISUALIZERS[item.id];

  return (
    <article className="space-y-6">
      {back}
      <header className="space-y-2">
        <p className="text-sm text-muted">
          {item.group} · {t("catalog.tile", { tile: item.tile })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <p className="max-w-prose text-muted">{item.summary}</p>
        <p className="flex flex-wrap gap-2">
          <LevelChip level={item.level} />
          <StageChip stage={item.stage} />
          {Visualizer && <InteractiveChip />}
        </p>
      </header>

      {Visualizer && (
        <TryIt title={t("catalog.detail.tryIt", { name: item.name })}>
          <Visualizer />
        </TryIt>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("catalog.detail.example")}>
          <p className="text-sm">
            <span className="text-muted">{t("catalog.detail.input")} </span>
            <code className="font-mono">{item.example.input}</code>
          </p>
          <ol className="mt-3 space-y-2">
            {item.example.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-control border border-line bg-surface px-3 py-2 text-sm">
            <span className="text-muted">{t("catalog.detail.result")} </span>
            <strong className="font-medium">{item.example.result}</strong>
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel title={t("catalog.detail.visual")}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {item.visual.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Panel>

          <Panel title={t("catalog.detail.cost")}>
            <dl className="divide-y divide-line text-sm">
              {item.cost.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {buildsOn.length > 0 && (
            <Panel title={t("catalog.detail.buildsOn")}>
              <ul className="flex flex-wrap gap-2">
                {buildsOn.map((dep) => (
                  <li key={dep.id}>
                    <Link
                      to={itemPath(dep)}
                      className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-accent"
                    >
                      {dep.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <nav
        aria-label={t("catalog.detail.pager")}
        className="flex flex-wrap justify-between gap-3 border-t border-line pt-4"
      >
        {prev ? (
          <Link to={itemPath(prev)} className={backLink}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("catalog.detail.previous", { name: prev.name })}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={itemPath(next)} className={backLink}>
            {t("catalog.detail.next", { name: next.name })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </article>
  );
}

function TryIt({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-panel border border-accent/40 bg-surface p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-panel border border-line bg-raised p-4">
      <h2 id={headingId} className="text-sm font-semibold text-muted">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
