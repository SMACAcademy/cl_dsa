import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CodePanel } from "./CodePanel";
import { button, primaryButton } from "./styles";
import { SPEEDS, usePlayer, type Speed } from "./usePlayer";

/** A multiple-choice question asked before a step is revealed. */
export type Prediction = {
  prompt: string;
  options: readonly { id: string; label: string }[];
  /** Id of the right option. */
  correct: string;
};

type Answer = { correct: boolean; correctLabel: string };

type Props<S> = {
  steps: readonly S[];
  code: readonly string[];
  line: (step: S) => number;
  narration: (step: S) => string;
  /** The picture for a step: array, markers, target… */
  stage: (step: S) => ReactNode;
  vars: (step: S) => readonly { name: string; value: ReactNode }[];
  /** Question to ask before `upcoming` is shown, or null for no question. */
  predictionBefore: (upcoming: S) => Prediction | null;
  /** Label of the prediction toggle (defaults to "Predict before each comparison"). */
  predictLabel?: string;
};

/**
 * The shared step-by-step player: stage + narration, controls, optional
 * predictions with a score, Python code with the active line, and variables.
 * Give it a new `key` to start over with a new input.
 */
export function StepPlayer<S>({
  steps,
  code,
  line,
  narration,
  stage,
  vars,
  predictionBefore,
  predictLabel,
}: Props<S>) {
  const { t } = useTranslation();
  const speedId = useId();
  const [predict, setPredict] = useState(false);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  const questionBefore = useCallback(
    (i: number): Prediction | null => {
      const upcoming = steps[i + 1];
      if (!predict || upcoming === undefined || answers[i + 1]) return null;
      return predictionBefore(upcoming);
    },
    [predict, steps, answers, predictionBefore],
  );
  const canAdvance = useCallback((i: number) => questionBefore(i) === null, [questionBefore]);
  const player = usePlayer(steps.length, canAdvance);
  const step = steps[player.index] as S;
  const question = questionBefore(player.index);
  const answerHere = answers[player.index];

  const answered = Object.values(answers);
  const correct = answered.filter((a) => a.correct).length;

  const answer = (id: string) => {
    if (!question) return;
    const right = question.options.find((o) => o.id === question.correct);
    setAnswers((a) => ({
      ...a,
      [player.index + 1]: { correct: id === question.correct, correctLabel: right?.label ?? "" },
    }));
    player.advance();
  };

  const playButton = player.atEnd ? (
    <button type="button" className={primaryButton} onClick={player.replay}>
      <RotateCcw className="size-4" aria-hidden="true" />
      {t("viz.controls.replay")}
    </button>
  ) : player.playing ? (
    <button type="button" className={primaryButton} onClick={player.pause}>
      <Pause className="size-4" aria-hidden="true" />
      {t("viz.controls.pause")}
    </button>
  ) : (
    <button
      type="button"
      className={primaryButton}
      onClick={player.play}
      disabled={question !== null}
    >
      <Play className="size-4" aria-hidden="true" />
      {t("viz.controls.play")}
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-panel border border-line bg-raised p-4">
          {stage(step)}
          <p
            aria-live="polite"
            className="mt-3 min-h-12 rounded-control bg-surface px-3 py-2 text-center text-sm"
          >
            {narration(step)}
          </p>
          {answerHere && (
            <p
              className={`mt-2 text-center text-sm font-medium ${answerHere.correct ? "text-found-ink" : "text-compare-ink"}`}
            >
              {answerHere.correct
                ? t("viz.predict.right")
                : t("viz.predict.wrong", { answer: answerHere.correctLabel })}
            </p>
          )}
        </div>

        {question && (
          <div
            role="group"
            aria-label={t("viz.predict.title")}
            className="rounded-panel border border-compare bg-compare-soft p-4 text-center"
          >
            <p className="text-sm font-medium text-compare-ink">{question.prompt}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {question.options.map((o) => (
                <button key={o.id} type="button" className={button} onClick={() => answer(o.id)}>
                  {o.label}
                </button>
              ))}
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
            {predictLabel ?? t("viz.predict.toggle")}
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

      <div className="min-w-0 space-y-4">
        <CodePanel lines={code} active={line(step)} />
        <section
          aria-label={t("viz.vars.title")}
          className="rounded-panel border border-line bg-raised p-4"
        >
          <h3 className="text-xs font-semibold text-muted">{t("viz.vars.title")}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
            {vars(step).map(({ name, value }) => (
              <div key={name} className="contents">
                <dt className="text-muted">{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
