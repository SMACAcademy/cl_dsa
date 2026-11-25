import { LibraryBig, Search } from "lucide-react";
import { useDeferredValue, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { CATALOG, itemPath } from "../catalog/catalog";
import { Rich } from "../systems/LessonPage";
import { MODULES } from "../systems/lessons";
import { GLOSSARY, NUMBERS } from "./glossary";

const has = (q: string, ...texts: readonly string[]) =>
  q === "" || texts.some((t) => t.toLowerCase().includes(q));

/** The Knowledge Library: cheat sheets and a glossary on one searchable page. */
export function LibraryPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.library"));
  const inputId = useId();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query).trim().toLowerCase();

  const items = CATALOG.filter((i) =>
    has(q, i.name, i.group, ...i.cost.flatMap((c) => [c.label, c.value])),
  );
  const numbers = NUMBERS.filter(([what, value]) => has(q, what, value));
  const lessons = MODULES.flatMap((m) =>
    m.lessons.map((l) => ({ module: m, lesson: l, recap: l.steps.at(-1) })),
  ).filter(({ lesson, recap, module }) =>
    has(
      q,
      lesson.title,
      module.title,
      ...(recap?.body ?? []),
      ...(recap?.table?.rows.flat() ?? []),
    ),
  );
  const terms = GLOSSARY.filter((g) => has(q, g.term, g.text));
  const empty = items.length + numbers.length + lessons.length + terms.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <LibraryBig className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.library")}</h1>
          <p className="max-w-prose text-muted">{t("library.intro")}</p>
        </div>
      </header>

      <div className="sticky top-14 z-10 -mx-1 space-y-2 bg-surface px-1 py-2">
        <label htmlFor={inputId} className="sr-only">
          {t("library.search")}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("library.placeholder")}
            className="h-10 w-full rounded-control border border-control bg-raised pr-3 pl-9 text-sm"
            autoComplete="off"
          />
        </div>
        <nav aria-label={t("library.contents")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#complexity" className="text-accent-ink hover:underline">
            {t("library.complexity")}
          </a>
          <a href="#numbers" className="text-accent-ink hover:underline">
            {t("library.numbers")}
          </a>
          <a href="#systems" className="text-accent-ink hover:underline">
            {t("library.systems")}
          </a>
          <a href="#glossary" className="text-accent-ink hover:underline">
            {t("library.glossary")}
          </a>
        </nav>
      </div>

      {empty && <p className="text-muted">{t("library.noMatch", { q: query })}</p>}

      {items.length > 0 && (
        <Block id="complexity" title={t("library.complexity")}>
          <div className="overflow-x-auto rounded-panel border border-line bg-raised">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-sunken text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("library.item")}</th>
                  <th className="px-3 py-2 font-semibold">{t("library.group")}</th>
                  <th className="px-3 py-2 font-semibold">{t("library.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-line align-top">
                    <td className="px-3 py-2">
                      <Link
                        to={itemPath(i)}
                        className="font-medium text-accent-ink hover:underline"
                      >
                        {i.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{i.group}</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-0.5">
                        {i.cost.map((c) => (
                          <li key={c.label}>
                            <span className="text-muted">{c.label}: </span>
                            <span className="font-mono">{c.value}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {numbers.length > 0 && (
        <Block id="numbers" title={t("library.numbers")}>
          <dl className="grid gap-2 sm:grid-cols-2">
            {numbers.map(([what, value]) => (
              <div
                key={what}
                className="flex justify-between gap-3 rounded-control border border-line bg-raised px-3 py-2 text-sm"
              >
                <dt className="text-muted">{what}</dt>
                <dd className="font-mono font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      {lessons.length > 0 && (
        <Block id="systems" title={t("library.systems")}>
          <div className="grid gap-3 md:grid-cols-2">
            {lessons.map(({ module, lesson, recap }) => (
              <article
                key={lesson.id}
                className="space-y-2 rounded-panel border border-line bg-raised p-4"
              >
                <p className="text-xs text-muted">
                  {module.number} · {module.title}
                </p>
                <h3 className="font-semibold">
                  <Link to={`/systems/${lesson.id}`} className="text-accent-ink hover:underline">
                    {lesson.title}
                  </Link>
                </h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(recap?.body ?? []).map((line) => (
                    <li key={line}>
                      <Rich text={line} />
                    </li>
                  ))}
                  {(recap?.table?.rows ?? []).map((row) => (
                    <li key={row.join("|")}>
                      <strong className="font-medium">{row[0]}:</strong> {row.slice(1).join(" · ")}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Block>
      )}

      {terms.length > 0 && (
        <Block id="glossary" title={t("library.glossary")}>
          <dl className="grid gap-2 md:grid-cols-2">
            {terms.map((g) => (
              <div key={g.term} className="rounded-control border border-line bg-raised px-3 py-2">
                <dt>
                  <Link to={g.path} className="font-semibold text-accent-ink hover:underline">
                    {g.term}
                  </Link>
                </dt>
                <dd className="text-sm text-muted">{g.text}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 space-y-3">
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
