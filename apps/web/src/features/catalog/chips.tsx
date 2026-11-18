import { useTranslation } from "react-i18next";
import type { Level } from "./catalog";

const chip =
  "inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs";

export function LevelChip({ level }: { level: Level }) {
  const { t } = useTranslation();
  return <span className={chip}>{t(`catalog.level.${level}`)}</span>;
}

export function StageChip({ stage }: { stage: number }) {
  const { t } = useTranslation();
  return <span className={chip}>{t("catalog.stage", { stage })}</span>;
}
