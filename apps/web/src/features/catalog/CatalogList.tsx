import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { slug, useScrollToHash } from "../../lib/slug";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PhaseBadge } from "../../ui/PhaseBadge";
import { SECTION_ICON, SECTION_PHASE } from "../placeholder/sections";
import { groupItems, itemPath, itemsOfKind, type CatalogItem, type CatalogKind } from "./catalog";
import { hasVisualizer } from "../viz/registry";
import { InteractiveChip, LevelChip, StageChip } from "./chips";

const SECTION_OF: Record<CatalogKind, "algorithms" | "structures"> = {
  algorithm: "algorithms",
  structure: "structures",
};

/** The full list of algorithms or data structures, grouped, each linking to its plan. */
export function CatalogList({ kind }: { kind: CatalogKind }) {
  const { t } = useTranslation();
  const section = SECTION_OF[kind];
  const Icon = SECTION_ICON[section];
  const title = t(`nav.${section}`);
  const items = itemsOfKind(kind);
  const groups = groupItems(items);
  useDocumentTitle(title);
  useScrollToHash();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-prose text-muted">{t(`catalog.${kind}.intro`)}</p>
            <p className="mt-2 text-sm text-muted">
              {t(`catalog.${kind}.count`, { count: items.length, groups: groups.length })}
            </p>
          </div>
        </div>
        <PhaseBadge phase={SECTION_PHASE[section]} />
      </header>

      <p className="rounded-panel border border-line bg-raised px-4 py-3 text-sm text-muted">
        {t("catalog.stageHint")}
      </p>

      {groups.map(({ group, items: groupList }) => (
        <CatalogGroup key={group} title={group} items={groupList} />
      ))}
    </div>
  );
}

function CatalogGroup({ title, items }: { title: string; items: CatalogItem[] }) {
  const headingId = useId();
  return (
    <section id={slug(title)} aria-labelledby={headingId} className="scroll-mt-20">
      <h2 id={headingId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={itemPath(item)}
              className="group flex h-full flex-col gap-2 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-accent"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">{item.name}</span>
                <ChevronRight
                  className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm text-muted">{item.summary}</span>
              <span className="mt-auto flex flex-wrap gap-2 pt-1">
                <LevelChip level={item.level} />
                <StageChip stage={item.stage} />
                {hasVisualizer(item.id) && <InteractiveChip />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
