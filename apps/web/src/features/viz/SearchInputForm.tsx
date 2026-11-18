import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MAX_VALUES, parseInput, type InputError, type SearchInput } from "./input";
import { primaryButton } from "./styles";

export type PresetKey = "middle" | "first" | "missing" | "left" | "right";
export type Preset = { key: PresetKey; values: string; target: string };

type Props = {
  presets: readonly [Preset, ...Preset[]];
  /** Binary search needs ascending values. */
  requireSorted?: boolean;
  onRun: (input: SearchInput) => void;
};

/** Values + target fields with validation and one-click presets. The first preset is the default. */
export function SearchInputForm({ presets, requireSorted = false, onRun }: Props) {
  const { t } = useTranslation();
  const valuesId = useId();
  const targetId = useId();
  const errorId = useId();
  const [valuesText, setValuesText] = useState(presets[0].values);
  const [targetText, setTargetText] = useState(presets[0].target);
  const [error, setError] = useState<InputError | null>(null);

  const apply = (values: string, target: string) => {
    const parsed = parseInput(values, target, { requireSorted });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onRun({ items: parsed.items, target: parsed.target });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(valuesText, targetText);
  };

  const field = "h-9 rounded-control border border-control bg-raised px-3 font-mono text-sm";

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor={valuesId} className="text-sm font-medium">
            {t(requireSorted ? "viz.input.sortedValues" : "viz.input.values", { max: MAX_VALUES })}
          </label>
          <input
            id={valuesId}
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            aria-invalid={error !== null && error !== "targetMissing"}
            aria-describedby={error ? errorId : undefined}
            className={field}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label htmlFor={targetId} className="text-sm font-medium">
            {t("viz.input.target")}
          </label>
          <input
            id={targetId}
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
            aria-invalid={error === "targetMissing"}
            aria-describedby={error ? errorId : undefined}
            className={field}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <button type="submit" className={primaryButton}>
          {t("viz.input.apply")}
        </button>
        {error && (
          <p id={errorId} role="alert" className="w-full text-sm text-compare-ink">
            {t(`viz.input.error.${error}`, { max: MAX_VALUES })}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t("viz.input.presets")}</span>
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            className="rounded-full border border-line bg-surface px-3 py-1 hover:border-accent"
            onClick={() => {
              setValuesText(p.values);
              setTargetText(p.target);
              apply(p.values, p.target);
            }}
          >
            {t(`viz.input.preset.${p.key}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
