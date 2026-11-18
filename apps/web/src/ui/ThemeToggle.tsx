import { Check, Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTranslation } from "react-i18next";
import { isThemePref, setThemePref, THEME_PREFS, type ThemePref } from "./theme";
import { useThemePref } from "./useThemePref";

const ICONS = { light: Sun, dark: Moon, system: Monitor } satisfies Record<ThemePref, unknown>;

export const iconButtonClass =
  "grid size-9 place-items-center rounded-control text-muted transition-colors hover:bg-sunken hover:text-fg data-[state=open]:bg-sunken data-[state=open]:text-fg";

export const menuContentClass =
  "z-50 min-w-48 rounded-panel border border-line bg-raised p-1 text-sm text-fg shadow-lg shadow-black/10";

export const menuItemClass =
  "flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 outline-none select-none data-[highlighted]:bg-sunken";

/** Light / Dark / System picker in the top bar. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const pref = useThemePref();
  const CurrentIcon = ICONS[pref];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={iconButtonClass}
        aria-label={t("theme.menuLabel", { theme: t(`theme.${pref}`) })}
      >
        <CurrentIcon className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" sideOffset={6} className={menuContentClass}>
        <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted">
          {t("theme.label")}
        </DropdownMenu.Label>
        <DropdownMenu.RadioGroup
          value={pref}
          onValueChange={(value) => {
            if (isThemePref(value)) setThemePref(value);
          }}
        >
          {THEME_PREFS.map((option) => {
            const Icon = ICONS[option];
            return (
              <DropdownMenu.RadioItem key={option} value={option} className={menuItemClass}>
                <Icon className="size-4 text-muted" aria-hidden="true" />
                <span className="flex-1">{t(`theme.${option}`)}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="size-4 text-accent-ink" aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            );
          })}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
