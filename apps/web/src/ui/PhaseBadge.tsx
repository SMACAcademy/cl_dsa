import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PhaseBadge({ phase }: { phase: number }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
      <Clock className="size-3.5" aria-hidden="true" />
      {t("placeholder.comingInPhase", { phase })}
    </span>
  );
}
