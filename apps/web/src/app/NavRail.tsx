import { Tooltip } from "radix-ui";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { BrandMark } from "../ui/BrandMark";
import { NAV_ITEMS } from "./nav";

/**
 * Left nav rail (UI_UX §2). At ≥ 1280 px it shows icons and labels; below that it collapses
 * to icons, the labels stay available to screen readers and appear as tooltips on hover/focus.
 */
export function NavRail() {
  const { t } = useTranslation();
  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-line bg-raised xl:w-64">
      <div className="flex h-14 shrink-0 items-center justify-center gap-2.5 border-b border-line xl:justify-start xl:px-5">
        <BrandMark className="size-7 shrink-0" />
        <span className="sr-only text-lg font-semibold tracking-tight xl:not-sr-only">
          {t("app.name")}
        </span>
      </div>
      <nav aria-label={t("nav.label")} className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col gap-1 px-2 xl:px-3">
          {NAV_ITEMS.map(({ id, path, labelKey, icon: Icon }) => {
            const label = t(labelKey);
            return (
              <li key={id}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <NavLink
                      to={path}
                      end={path === "/"}
                      // The tooltip repeats the link's own name; don't announce it twice.
                      aria-describedby={undefined}
                      className="group relative flex h-10 items-center justify-center gap-3 rounded-control text-sm text-muted transition-colors hover:bg-sunken hover:text-fg aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent-ink xl:justify-start xl:px-3"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute top-2 bottom-2 -left-2 w-1 rounded-r-full bg-accent opacity-0 transition-opacity group-aria-[current=page]:opacity-100 xl:-left-3"
                      />
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="sr-only xl:not-sr-only">{label}</span>
                    </NavLink>
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
      </nav>
    </aside>
  );
}
