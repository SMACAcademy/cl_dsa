import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StepPlayer, type Prediction } from "../StepPlayer";
import { primaryButton } from "../styles";
import {
  MAX_OPS,
  MAX_START,
  parseOps,
  parseStart,
  type OpForm,
  type OpsError,
  type Parsed,
} from "./ops";
import type { DsStep, Vars } from "./steps";

export type DsPreset = { key: string; start: string; ops: string };

type Props<S, Op> = {
  /** Translation prefix under `viz.ds`, e.g. "stack". */
  prefix: string;
  code: readonly string[];
  presets: readonly [DsPreset, ...DsPreset[]];
  /** What the first field holds: starting values, a capacity, or nothing. */
  startField: "values" | "capacity" | "count" | null;
  /** Extra check on the starting values (e.g. capacity 2..8). */
  validateStart?: (start: string[]) => OpsError | null;
  forms: readonly OpForm<Op>[];
  run: (start: string[], ops: Op[]) => DsStep<S>[];
  stage: (step: DsStep<S>) => ReactNode;
  vars: (step: DsStep<S>) => readonly { name: string; value: ReactNode }[];
};

/** Translates a key that is only known at runtime (missing keys fail the test suite). */
export function useDynamicT() {
  const { t } = useTranslation();
  return (key: string, vars?: Vars) => (t as unknown as (k: string, o?: Vars) => string)(key, vars);
}

/**
 * The shared data-structure player: a starting state and a short list of
 * operations, run step by step on the shared StepPlayer.
 */
export function DsPlayer<S, Op>(props: Props<S, Op>) {
  const { prefix, presets, startField, validateStart, forms } = props;
  const { t } = useTranslation();
  const tx = useDynamicT();
  const startId = useId();
  const opsId = useId();
  const errorId = useId();
  const first = presets[0];
  const [startText, setStartText] = useState(first.start);
  const [opsText, setOpsText] = useState(first.ops);
  const [error, setError] = useState<OpsError | null>(null);
  const [input, setInput] = useState<{ start: string[]; ops: Op[] } | null>(() => {
    const start = parseStart(first.start);
    const ops = parseOps(first.ops, forms);
    return start.ok && ops.ok ? { start: start.value, ops: ops.value } : null;
  });
  const [run, setRun] = useState(0);

  const apply = (s: string, o: string) => {
    const start: Parsed<string[]> = startField ? parseStart(s) : { ok: true, value: [] };
    if (!start.ok) return setError(start.error);
    const extra = validateStart?.(start.value) ?? null;
    if (extra) return setError(extra);
    const ops = parseOps(o, forms);
    if (!ops.ok) return setError(ops.error);
    setError(null);
    setInput({ start: start.value, ops: ops.value });
    setRun((n) => n + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(startText, opsText);
  };

  const field = "h-9 rounded-control border border-control bg-raised px-3 font-mono text-sm";
  const { key: errorKey, ...errorVars } = error ?? { key: "" };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-3">
        {startField && (
          <div className="flex w-48 flex-col gap-1">
            <label htmlFor={startId} className="text-sm font-medium">
              {startField === "values"
                ? t("viz.ds.form.start", { max: MAX_START })
                : startField === "capacity"
                  ? t("viz.ds.form.capacity")
                  : t("viz.ds.form.count")}
            </label>
            <input
              id={startId}
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              aria-describedby={error ? errorId : undefined}
              className={field}
              autoComplete="off"
            />
          </div>
        )}
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor={opsId} className="text-sm font-medium">
            {t("viz.ds.form.ops", { max: MAX_OPS })}
          </label>
          <input
            id={opsId}
            value={opsText}
            onChange={(e) => setOpsText(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            className={field}
            autoComplete="off"
          />
        </div>
        <button type="submit" className={primaryButton}>
          {t("viz.input.apply")}
        </button>
        <p className="w-full text-xs text-muted">
          {t("viz.ds.form.commands")} <code>{tx(`viz.ds.${prefix}.help`)}</code>
        </p>
        {error && (
          <p id={errorId} role="alert" className="w-full text-sm text-compare-ink">
            {tx(`viz.ds.error.${errorKey}`, {
              ...(errorVars as Vars),
              help: tx(`viz.ds.${prefix}.help`),
            })}
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
              setStartText(p.start);
              setOpsText(p.ops);
              apply(p.start, p.ops);
            }}
          >
            {tx(`viz.ds.${prefix}.preset.${p.key}`)}
          </button>
        ))}
      </div>

      {input && <DsStage key={run} {...props} start={input.start} ops={input.ops} />}
    </div>
  );
}

function DsStage<S, Op>({
  prefix,
  code,
  run,
  stage,
  vars,
  start,
  ops,
}: Props<S, Op> & { start: string[]; ops: Op[] }) {
  const { t } = useTranslation();
  const tx = useDynamicT();
  const steps = useMemo(() => run(start, ops), [run, start, ops]);
  const predictionBefore = (u: DsStep<S>): Prediction | null =>
    u.question
      ? {
          prompt: tx(`viz.ds.${prefix}.${u.question.say.key}`, u.question.say.vars),
          options: u.question.options.map((o) => ({ id: o, label: o })),
          correct: u.question.correct,
        }
      : null;

  return (
    <StepPlayer
      steps={steps}
      code={code}
      line={(s) => s.line}
      narration={(s) => tx(`viz.ds.${prefix}.${s.say.key}`, s.say.vars)}
      stage={stage}
      vars={vars}
      predictionBefore={predictionBefore}
      predictLabel={t("viz.ds.form.predict")}
    />
  );
}
