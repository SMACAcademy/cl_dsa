import { useTranslation } from "react-i18next";

/** "Looking for 7" above the array. */
export function TargetLine({ target }: { target: number }) {
  const { t } = useTranslation();
  return (
    <p className="mb-2 text-center text-sm">
      <span className="text-muted">{t("viz.stage.lookingFor")} </span>
      <strong className="font-mono text-base">{target}</strong>
    </p>
  );
}
