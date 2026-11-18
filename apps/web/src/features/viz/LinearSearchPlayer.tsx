import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useId, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "./ArrayView";
import { CodePanel } from "./CodePanel";
import {
  LINEAR_SEARCH_CODE,
  linearSearchSteps,
  MAX_VALUES,
  parseInput,
  type LinearSearchStep,
  type ParsedInput,
} from "./linearSearch";
import { SPEEDS, usePlayer, type Speed } from "./usePlayer";

type Input = { items: number[]; target: number };

const DEFAULT = { values: "4, 8, 1, 9", target: "1" };
const PRESETS: { key: "middle" | "first" | "missing"; values: string; target: string }[] = [
  { key: "middle", ...DEFAULT },
  { key: "first", values: "6, 2, 7, 3", target: "6" },
  { key: "missing", values: "5, 3, 8", target: "4" },
];

const button =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-control bg-raised px-3 text-sm font-medium transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent-solid px-4 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** Interactive linear search: choose a tiny input, then step, play or predict. */
export function LinearSearchPlayer() {
  const { t } = useTranslation();
  const valuesId = useId();
  const targetId = useId();
  const errorId = useId();
  const [valuesText, setValuesText] = useState(DEFAULT.values);
  const [targetText, setTargetText] = useState(DEFAULT.target);
  const [error, setError] = useState<Extract<ParsedInput, { ok: false }>["error"] | null>(null);
  const [input, setInput] = useState<Input>({ items: [4, 8, 1, 9], target: 1 });
  const [run, setRun] = useState(0);

  const apply = (values: string, target: string) => {
    const parsed = parseInput(values, target);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setInput({ items: parsed.items, target: parsed.target });
    setRun((n) => n + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    apply(valuesText, targetText);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor={valuesId} className="text-sm font-medium">
            {t("viz.input.values", { max: MAX_VALUES })}
          </label>
          <input
            id={valuesId}
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            aria-invalid={error !== null && error !== "targetMissing"}
            aria-describedby={error ? errorId : undefined}
            className="h-9 rounded-control border border-control bg-raised px-3 font-mono text-sm"
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
            className="h-9 rounded-control border border-control bg-raised px-3 font-mono text-sm"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <button type="submit" className={primary}>
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
        {PRESETS.map((p) => (
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

      <LinearSearchStage key={run} items={input.items} target={input.target} />
    </div>
  );
}

type Answer = { guess: boolean; correct: boolean };

function LinearSearchStage({ items, target }: Input) {
  const { t } = useTranslation();
  const speedId = useId();
  const steps = useMemo(() => linearSearchSteps(items, target), [items, target]);
  const [predict, setPredict] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  /** A prediction is due before step `i + 1` if that step is a comparison not yet answered. */
  const questionBefore = useCallback(
    (i: number): LinearSearchStep | null => {
      const upcoming = steps[i + 1];
      if (!predict || !upcoming || upcoming.comparing === null || answers[i + 1]) return null;
      return upcoming;
    },
    [predict, steps, answers],
  );
  const canAdvance = useCallback((i: number) => questionBefore(i) === null, [questionBefore]);
  const player = usePlayer(steps.length, canAdvance);
  const step = steps[player.index] as LinearSearchStep;
  const question = questionBefore(player.index);
  const answerHere = answers[player.index];

  const answered = Object.values(answers);
  const correct = answered.filter((a) => a.correct).length;

  const answer = (guess: boolean) => {
    if (!question) return;
    const isMatch = question.narration.key === "compareYes";
    setAnswers((a) => ({ ...a, [player.index + 1]: { guess, correct: guess === isMatch } }));
    player.advance();
  };

  const stateOf = (index: number): CellState => {
    if (step.found === index) return "found";
    if (step.comparing === index) return "comparing";
    if (step.checked.includes(index)) return "checked";
    return "idle";
  };

  const playButton = player.atEnd ? (
    <button type="button" className={primary} onClick={player.replay}>
      <RotateCcw className="size-4" aria-hidden="true" />
      {t("viz.controls.replay")}
    </button>
  ) : player.playing ? (
    <button type="button" className={primary} onClick={player.pause}>
      <Pause className="size-4" aria-hidden="true" />
      {t("viz.controls.pause")}
    </button>
  ) : (
    <button type="button" className={primary} onClick={player.play} disabled={question !== null}>
      <Play className="size-4" aria-hidden="true" />
      {t("viz.controls.play")}
    </button>
  );

  const { key: narrationKey, ...narrationVars } = step.narration;
  const value = step.i !== null ? items[step.i] : undefined;
  const dash = "—";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <div className="rounded-panel border border-line bg-raised p-4">
          <p className="mb-2 text-center text-sm">
            <span className="text-muted">{t("viz.stage.lookingFor")} </span>
            <strong className="font-mono text-base">{target}</strong>
          </p>
          <ArrayView items={items} stateOf={stateOf} pointer={step.i} />
          <p
            aria-live="polite"
            className="mt-3 min-h-12 rounded-control bg-surface px-3 py-2 text-center text-sm"
          >
            {t(`viz.linear.${narrationKey}`, narrationVars)}
          </p>
          {answerHere && (
            <p
              className={`mt-2 text-center text-sm font-medium ${answerHere.correct ? "text-found-ink" : "text-compare-ink"}`}
            >
              {answerHere.correct
                ? t("viz.predict.right")
                : t("viz.predict.wrong", {
                    answer: t(answerHere.guess ? "viz.predict.no" : "viz.predict.yes"),
                  })}
            </p>
          )}
        </div>

        {question && (
          <div
            role="group"
            aria-label={t("viz.predict.title")}
            className="rounded-panel border border-compare bg-compare-soft p-4 text-center"
          >
            <p className="text-sm font-medium text-compare-ink">
              {t("viz.predict.question", {
                i: question.i,
                value: items[question.i as number],
                target,
              })}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" className={button} onClick={() => answer(true)}>
                {t("viz.predict.yes")}
              </button>
              <button type="button" className={button} onClick={() => answer(false)}>
                {t("viz.predict.no")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={button} onClick={player.reset} disabled={player.atStart}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("viz.controls.reset")}
          </button>
          <button type="button" className={button} onClick={player.prev} disabled={player.atStart}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            {t("viz.controls.back")}
          </button>
          {playButton}
          <button
            type="button"
            className={button}
            onClick={player.next}
            disabled={player.atEnd || question !== null}
          >
            {t("viz.controls.next")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span className="ml-auto text-sm text-muted">
            {t("viz.controls.step", { current: player.index + 1, total: steps.length })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={predict}
              onChange={(e) => setPredict(e.target.checked)}
              className="size-4 accent-accent"
            />
            {t("viz.predict.toggle")}
          </label>
          <span className="inline-flex items-center gap-2">
            <label htmlFor={speedId}>{t("viz.controls.speed")}</label>
            <select
              id={speedId}
              value={player.speed}
              onChange={(e) => player.setSpeed(Number(e.target.value) as Speed)}
              className="h-8 rounded-control border border-control bg-raised px-2"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </span>
          {answered.length > 0 && (
            <span className="font-medium">
              {t("viz.predict.score", { correct, total: answered.length })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <CodePanel lines={LINEAR_SEARCH_CODE} active={step.line} />
        <section
          aria-label={t("viz.vars.title")}
          className="rounded-panel border border-line bg-raised p-4"
        >
          <h3 className="text-xs font-semibold text-muted">{t("viz.vars.title")}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
            <dt className="text-muted">i</dt>
            <dd>{step.i ?? dash}</dd>
            <dt className="text-muted">items[i]</dt>
            <dd>{value ?? dash}</dd>
            <dt className="text-muted">target</dt>
            <dd>{target}</dd>
            <dt className="text-muted">{t("viz.vars.comparisons")}</dt>
            <dd>{step.comparisons}</dd>
            <dt className="text-muted">{t("viz.vars.returned")}</dt>
            <dd>{step.result ?? dash}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
