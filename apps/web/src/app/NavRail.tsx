import { Tooltip } from "radix-ui";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { BrandMark } from "../ui/BrandMark";
import { currentMenuPath, MENU_GROUPS } from "./nav";

/**
 * Left nav rail, in four labelled groups. At >= 1280 px it shows icons, labels and group names;
 * below that it collapses to icons with dividers between groups. Labels stay available to
 * screen readers and appear as tooltips on hover and focus.
 */
export function NavRail() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = currentMenuPath(pathname);
  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-line bg-raised xl:w-64">
      <Link
        to="/"
        aria-label={t("nav.landing")}
        className="flex h-14 shrink-0 items-center justify-center gap-2.5 border-b border-line xl:justify-start xl:px-5"
      >
        <BrandMark className="size-7 shrink-0" />
        <span aria-hidden="true" className="hidden text-lg font-semibold tracking-tight xl:inline">
          {t("app.name")}
        </span>
      </Link>
      <nav aria-label={t("nav.label")} className="flex-1 overflow-y-auto py-3">
        {MENU_GROUPS.map((group, g) => (
          <div
            key={group.id}
            className={g > 0 ? "mt-2 border-t border-line pt-2 xl:mt-3 xl:pt-3" : ""}
          >
            <h2
              id={`nav-group-${group.id}`}
              className="sr-only px-6 pb-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase xl:not-sr-only xl:block"
            >
              {t(group.labelKey)}
            </h2>
            <ul
              aria-labelledby={`nav-group-${group.id}`}
              className="flex flex-col gap-1 px-2 xl:px-3"
            >
              {group.links.map(({ key, path, labelKey, icon: Icon }) => {
                const label = t(labelKey);
                return (
                  <li key={key}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Link
                          to={path}
                          aria-current={path === current ? "page" : undefined}
                          // The tooltip repeats the link's own name; do not announce it twice.
                          aria-describedby={undefined}
                          className="group relative flex h-10 items-center justify-center gap-3 rounded-control text-sm text-muted transition-colors hover:bg-sunken hover:text-fg aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent-ink xl:justify-start xl:px-3"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute top-2 bottom-2 -left-2 w-1 rounded-r-full bg-accent opacity-0 transition-opacity group-aria-[current=page]:opacity-100 xl:-left-3"
                          />
                          <Icon className="size-5 shrink-0" aria-hidden="true" />
                          <span className="sr-only xl:not-sr-only">{label}</span>
                        </Link>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="right"
                          sideOffset={10}
                          aria-hidden="true"
                          className="z-50 rounded-control bg-fg px-2.5 py-1.5 text-xs font-medium text-surface shadow-md xl:hidden"
                        >
                          {label}
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
