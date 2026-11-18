import { useTranslation } from "react-i18next";

/** Python source with line numbers; the line being executed is highlighted. */
export function CodePanel({ lines, active }: { lines: readonly string[]; active: number }) {
  const { t } = useTranslation();
  return (
    <figure className="overflow-hidden rounded-panel border border-line bg-raised">
      <figcaption className="border-b border-line px-4 py-2 text-xs font-semibold text-muted">
        {t("viz.code.caption")}
      </figcaption>
      {/* Ligatures off: learners must see `<=` exactly as they would type it, not `≤`. */}
      <ol className="overflow-x-auto py-2 font-mono text-sm [font-variant-ligatures:none]">
        {lines.map((line, i) => {
          const isActive = i + 1 === active;
          return (
            <li
              key={i}
              aria-current={isActive ? "step" : undefined}
              className={`flex gap-3 px-4 py-0.5 whitespace-pre transition-colors duration-300 ${isActive ? "bg-accent-soft text-accent-ink" : ""}`}
            >
              <span aria-hidden="true" className="w-4 shrink-0 text-right text-muted select-none">
                {i + 1}
              </span>
              <code>{line}</code>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
