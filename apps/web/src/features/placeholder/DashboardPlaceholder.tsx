import { ArrowRight, BookOpen, Sparkles, Target, Triangle, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { MiniPyramid } from "../../ui/MiniPyramid";
import { PhaseBadge } from "../../ui/PhaseBadge";
import { SECTION_PHASE } from "./sections";

const DAILY_GOAL_XP = 50;

const TIER_LEGEND = [
  { key: "foundations", tier: 0 },
  { key: "core", tier: 2 },
  { key: "graphs", tier: 4 },
  { key: "advanced", tier: 6 },
  { key: "systems", tier: 7 },
  { key: "frontier", tier: 8 },
] as const;

function PreviewCard({
  title,
  icon: Icon,
  className = "",
  children,
}: {
  title: string;
  icon: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col rounded-panel border border-line bg-raised p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-accent-ink" aria-hidden="true" />
          {title}
        </h2>
        <span className="rounded-full border border-dashed border-control px-2 py-0.5 text-xs text-muted">
          {t("placeholder.preview")}
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Meter({
  label,
  value,
  max,
  text,
}: {
  label: string;
  value: number;
  max: number;
  text?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={text}
      className="h-2 overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${(100 * value) / max}%` }} />
    </div>
  );
}

/** Dashboard v0 preview for a guest learner. Real data arrives with Task 17 (M2.6). */
export function DashboardPlaceholder() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.dashboard"));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.greeting")}</h1>
          <p className="mt-2 max-w-prose text-muted">{t("dashboard.intro")}</p>
        </div>
        <PhaseBadge phase={SECTION_PHASE.dashboard} />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <PreviewCard
          title={t("dashboard.continue.title")}
          icon={BookOpen}
          className="lg:col-span-2"
        >
          <p className="text-sm text-muted">{t("dashboard.continue.body")}</p>
          <div className="mt-4">
            <Meter label={t("dashboard.continue.progressLabel")} value={0} max={100} />
          </div>
          <div className="mt-5">
            <Link
              to="/universe"
              className="inline-flex h-9 items-center gap-2 rounded-control bg-accent-solid px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
            >
              {t("dashboard.continue.action")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </PreviewCard>

        <PreviewCard title={t("dashboard.goal.title")} icon={Target}>
          <p className="text-2xl font-semibold tabular-nums">
            {t("dashboard.goal.value", { current: 0, target: DAILY_GOAL_XP })}
          </p>
          <div className="mt-3">
            <Meter
              label={t("dashboard.goal.progressLabel")}
              value={0}
              max={DAILY_GOAL_XP}
              text={t("dashboard.goal.value", { current: 0, target: DAILY_GOAL_XP })}
            />
          </div>
          <p className="mt-3 text-sm text-muted">{t("dashboard.goal.body")}</p>
        </PreviewCard>

        <PreviewCard title={t("dashboard.next.title")} icon={Sparkles} className="lg:col-span-2">
          <p className="text-sm text-muted">{t("dashboard.next.body")}</p>
          <ol aria-hidden="true" className="mt-4 space-y-3">
            {[0.62, 0.48, 0.55].map((width, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs text-muted">
                  {i + 1}
                </span>
                <span
                  className="h-2.5 rounded-full bg-sunken"
                  style={{ width: `${width * 100}%` }}
                />
              </li>
            ))}
          </ol>
        </PreviewCard>

        <PreviewCard title={t("dashboard.pyramid.title")} icon={Triangle}>
          <MiniPyramid className="mx-auto w-full max-w-56" />
          <p className="mt-3 text-sm text-muted">{t("dashboard.pyramid.body")}</p>
          <ul
            aria-label={t("dashboard.pyramid.legendLabel")}
            className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
          >
            {TIER_LEGEND.map(({ key, tier }) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: `var(--tier-${tier})` }}
                />
                {t(`tiers.${key}`)}
              </li>
            ))}
          </ul>
        </PreviewCard>
      </div>
    </div>
  );
}
