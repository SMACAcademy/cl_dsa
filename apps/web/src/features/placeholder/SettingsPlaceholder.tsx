import { Monitor, Moon, Sun } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { isThemePref, setThemePref, THEME_PREFS, type ThemePref } from "../../ui/theme";
import { useThemePref } from "../../ui/useThemePref";
import { SectionPlaceholder } from "./SectionPlaceholder";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } satisfies Record<ThemePref, unknown>;

/** Settings: the theme picker works today; everything else is planned. */
export function SettingsPlaceholder() {
  const { t } = useTranslation();
  const pref = useThemePref();
  const headingId = useId();

  return (
    <SectionPlaceholder id="settings">
      <section
        aria-labelledby={headingId}
        className="rounded-panel border border-line bg-raised p-6"
      >
        <h2 id={headingId} className="font-semibold">
          {t("settings.appearance")}
        </h2>
        <RadioGroup.Root
          aria-label={t("settings.themeLegend")}
          value={pref}
          onValueChange={(value) => {
            if (isThemePref(value)) setThemePref(value);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          {THEME_PREFS.map((option) => {
            const Icon = THEME_ICON[option];
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-control border border-line bg-surface p-4 text-sm transition-colors hover:border-control has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent-soft"
              >
                <RadioGroup.Item
                  value={option}
                  className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-control data-[state=checked]:border-accent-solid"
                >
                  <RadioGroup.Indicator className="size-2.5 rounded-full bg-accent-solid" />
                </RadioGroup.Item>
                <Icon className="size-4 text-muted" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-medium">{t(`theme.${option}`)}</span>
                  {option === "system" && (
                    <span className="text-xs text-muted">{t("theme.systemHint")}</span>
                  )}
                </span>
              </label>
            );
          })}
        </RadioGroup.Root>
        <p className="mt-4 text-sm text-muted">{t("theme.shortcutHint")}</p>
      </section>
    </SectionPlaceholder>
  );
}
