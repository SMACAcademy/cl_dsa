import { Monitor, Moon, Pause, Play, Settings, Sun } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { readMotion, writeMotion, type MotionPref } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { isThemePref, setThemePref, THEME_PREFS, type ThemePref } from "../../ui/theme";
import { useThemePref } from "../../ui/useThemePref";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } satisfies Record<ThemePref, unknown>;

const option =
  "flex cursor-pointer items-center gap-3 rounded-control border border-line bg-surface p-4 text-sm transition-colors hover:border-control has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent-soft";
const dot =
  "grid size-5 shrink-0 place-items-center rounded-full border-2 border-control data-[state=checked]:border-accent-solid";

/** Settings: theme, animations, and where your data lives. */
export function SettingsPlaceholder() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.settings"));
  const pref = useThemePref();
  const [motion, setMotion] = useState<MotionPref>(readMotion);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <Settings className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.settings")}</h1>
          <p className="max-w-prose text-muted">{t("settings.intro")}</p>
        </div>
      </header>

      <Card title={t("settings.appearance")}>
        <RadioGroup.Root
          aria-label={t("settings.themeLegend")}
          value={pref}
          onValueChange={(value) => {
            if (isThemePref(value)) setThemePref(value);
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {THEME_PREFS.map((choice) => {
            const Icon = THEME_ICON[choice];
            return (
              <label key={choice} className={option}>
                <RadioGroup.Item value={choice} className={dot}>
                  <RadioGroup.Indicator className="size-2.5 rounded-full bg-accent-solid" />
                </RadioGroup.Item>
                <Icon className="size-4 text-muted" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-medium">{t(`theme.${choice}`)}</span>
                  {choice === "system" && (
                    <span className="text-xs text-muted">{t("theme.systemHint")}</span>
                  )}
                </span>
              </label>
            );
          })}
        </RadioGroup.Root>
        <p className="mt-4 text-sm text-muted">{t("theme.shortcutHint")}</p>
      </Card>

      <Card title={t("settings.motion")}>
        <RadioGroup.Root
          aria-label={t("settings.motionLegend")}
          value={motion}
          onValueChange={(value) => {
            const next: MotionPref = value === "still" ? "still" : "animate";
            writeMotion(next);
            setMotion(next);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {(
            [
              ["animate", Play, t("settings.motionAnimate"), t("settings.motionAnimateHint")],
              ["still", Pause, t("settings.motionStill"), t("settings.motionStillHint")],
            ] as const
          ).map(([value, Icon, label, hint]) => (
            <label key={value} className={option}>
              <RadioGroup.Item value={value} className={dot}>
                <RadioGroup.Indicator className="size-2.5 rounded-full bg-accent-solid" />
              </RadioGroup.Item>
              <Icon className="size-4 text-muted" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup.Root>
        <p className="mt-4 text-sm text-muted">{t("settings.motionNote")}</p>
      </Card>

      <Card title={t("settings.data")}>
        <p className="text-sm text-muted">{t("settings.dataBody")}</p>
        <Link
          to="/progress"
          className="mt-3 inline-block text-sm font-medium text-accent-ink hover:underline"
        >
          {t("nav.progress")}
        </Link>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-panel border border-line bg-raised p-6">
      <h2 id={id} className="mb-4 font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
