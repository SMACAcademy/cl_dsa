import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  MAX_VALUES,
  parseInput,
  parseValues,
  RANDOM_COUNT,
  randomValues,
  type InputError,
  type SearchInput,
  type ValueConstraint,
} from "./input";
import { primaryButton } from "./styles";

export type PresetKey =
  | "middle"
  | "first"
  | "missing"
  | "left"
  | "right"
  | "mixed"
  | "reversed"
  | "nearlySorted"
  | "sorted"
  | "fewKeys"
  | "twoDigits"
  | "card";
export type Preset = { key: PresetKey; values: string; target?: string };
type Presets = readonly [Preset, ...Preset[]];

/** Values + target fields for the search players. The first preset is the default. */
export function SearchInputForm({
  presets,
  requireSorted = false,
  onRun,
}: {
  presets: Presets;
  /** Binary search needs ascending values. */
  requireSorted?: boolean;
  onRun: (input: SearchInput) => void;
}) {
  return (
    <InputForm
      presets={presets}
      withTarget
      random={() => {
        const items = randomValues(RANDOM_COUNT, { unique: true, sorted: requireSorted });
        // Usually a value from the list; sometimes one that isn't there.
        const pick = Math.random() < 0.75;
        let target = items[Math.floor(Math.random() * items.length)] as number;
        if (!pick) {
          do target = 1 + Math.floor(Math.random() * 99);
          while (items.includes(target));
        }
        return { values: items.join(", "), target: String(target) };
      }}
      valuesLabel={requireSorted ? "viz.input.sortedValues" : "viz.input.values"}
      parse={(values, target) => {
        const parsed = parseInput(values, target, { requireSorted });
        if (!parsed.ok) return parsed.error;
        onRun({ items: parsed.items, target: parsed.target });
        return null;
      }}
    />
  );
}

/** A values-only field for the sorting players. The first preset is the default. */
export function SortInputForm({
  presets,
  constraint,
  onRun,
}: {
  presets: Presets;
  /** Counting sort needs digits 0..9; radix sort needs non-negative values. */
  constraint?: ValueConstraint;
  onRun: (items: number[]) => void;
}) {
  return (
    <InputForm
      presets={presets}
      withTarget={false}
      random={() => ({
        values: randomValues(
          RANDOM_COUNT,
          constraint === "digits" ? { min: 0, max: 9 } : { min: constraint ? 0 : 1, max: 99 },
        ).join(", "),
      })}
      valuesLabel={
        constraint === "digits"
          ? "viz.input.digitValues"
          : constraint === "nonNegative"
            ? "viz.input.nonNegativeValues"
            : "viz.input.values"
      }
      parse={(values) => {
        const parsed = parseValues(values, constraint);
        if (!parsed.ok) return parsed.error;
        onRun(parsed.items);
        return null;
      }}
    />
  );
}

function InputForm({
  presets,
  withTarget,
  valuesLabel,
  parse,
  random,
}: {
  presets: Presets;
  withTarget: boolean;
  /** Makes a fresh random input for the Random button. */
  random: () => { values: string; target?: string };
  valuesLabel:
    | "viz.input.values"
    | "viz.input.sortedValues"
    | "viz.input.digitValues"
    | "viz.input.nonNegativeValues";
  /** Validates and runs the input; returns an error, or null on success. */
  parse: (values: string, target: string) => InputError | null;
}) {
  const { t } = useTranslation();
  const valuesId = useId();
  const targetId = useId();
  const errorId = useId();
  const [valuesText, setValuesText] = useState(presets[0].values);
  const [targetText, setTargetText] = useState(presets[0].target ?? "");
  const [error, setError] = useState<InputError | null>(null);

  const apply = (values: string, target: string) => setError(parse(values, target));

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
            {t(valuesLabel, { max: MAX_VALUES })}
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
        {withTarget && (
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
        )}
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
              setTargetText(p.target ?? "");
              apply(p.values, p.target ?? "");
            }}
          >
            {t(`viz.input.preset.${p.key}`)}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full border border-accent bg-surface px-3 py-1 text-accent-ink hover:bg-accent-soft"
          onClick={() => {
            const r = random();
            setValuesText(r.values);
            setTargetText(r.target ?? "");
            apply(r.values, r.target ?? "");
          }}
        >
          {t("viz.input.random", { count: RANDOM_COUNT })}
        </button>
      </div>
    </div>
  );
}
