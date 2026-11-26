import { Flame, Info, Star, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CREATOR, hasCreator } from "../branding";
import { LinkedInMark } from "../ui/LinkedInMark";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AccountMenu } from "./AccountMenu";

// A new guest starts here; real values arrive with gamification (M4.3).
const GUEST_STATS = { streak: 0, xp: 0, level: 1 };

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-sm tabular-nums";

export function TopBar() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <p className="hidden min-w-0 items-center gap-2 text-sm md:flex">
        <span className="rounded-full border border-dashed border-control px-2 py-0.5 text-xs font-medium text-muted">
          {t("topbar.previewBadge")}
        </span>
        <a
          href={CREATOR.github}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 truncate rounded-full px-2 py-0.5 font-medium text-accent-ink hover:bg-accent-soft"
        >
          <Star className="size-4" aria-hidden="true" />
          {t("topbar.previewHint")}
        </a>
      </p>
      <Link
        to="/about"
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-accent-ink hover:bg-accent-soft"
      >
        <Info className="size-4" aria-hidden="true" />
        {t("topbar.about")}
      </Link>
      {hasCreator() && CREATOR.linkedin && (
        <a
          href={CREATOR.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-8 items-center gap-1.5 rounded-full bg-[#0a66c2] px-3 text-sm font-medium text-white lg:inline-flex"
        >
          <LinkedInMark />
          {t("topbar.builtBy", { name: CREATOR.name })}
        </a>
      )}

      <div className="ml-auto flex items-center gap-2">
        <ul aria-label={t("topbar.statsLabel")} className="hidden items-center gap-2 sm:flex">
          <li className={chip}>
            <Flame className="size-4 text-tier-7" aria-hidden="true" />
            <span aria-hidden="true">{GUEST_STATS.streak}</span>
            <span className="sr-only">{t("topbar.streak", { count: GUEST_STATS.streak })}</span>
          </li>
          <li className={chip}>
            <Zap className="size-4 text-tier-0" aria-hidden="true" />
            {t("topbar.xp", { count: GUEST_STATS.xp })}
          </li>
          <li className={chip}>
            <span aria-hidden="true">{t("topbar.levelShort", { level: GUEST_STATS.level })}</span>
            <span className="sr-only">{t("topbar.level", { level: GUEST_STATS.level })}</span>
          </li>
        </ul>
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
