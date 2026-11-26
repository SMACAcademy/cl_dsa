import { ArrowRight, Puzzle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { readPractice, recordPractice, type PracticeRecord } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { QUIZZES, shuffled, TOPICS, type PracticeQuestion } from "./quizzes";

const ROUND = 10;
const primary =
  "inline-flex items-center gap-2 rounded-control bg-accent-solid px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50";

/** Practice: shuffled rounds of the self-check questions from every lesson. */
export function PracticePage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.problems"));
  const [topic, setTopic] = useState("all");
  const [round, setRound] = useState<PracticeQuestion[] | null>(null);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [record, setRecord] = useState<PracticeRecord>(readPractice);
  const [finished, setFinished] = useState(false);

  const pool = topic === "all" ? QUIZZES : QUIZZES.filter((q) => q.moduleId === topic);
  const size = Math.min(ROUND, pool.length);
  const score = round ? answers.filter((a, i) => a === round[i]?.answer).length : 0;

  const start = () => {
    setRound(shuffled(pool).slice(0, size));
    setAt(0);
    setAnswers([]);
    setFinished(false);
  };

  const q = round?.[at];
  const answered = answers[at] !== undefined;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <Puzzle className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.problems")}</h1>
          <p className="max-w-prose text-muted">{t("practice.intro")}</p>
          {record.outOf > 0 && <p className="text-sm text-muted">{t("practice.best", record)}</p>}
        </div>
      </header>

      {!round && (
        <section className="space-y-4 rounded-panel border border-line bg-raised p-5">
          <fieldset>
            <legend className="text-sm font-semibold">{t("practice.topics")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[{ id: "all", title: t("practice.all") }, ...TOPICS].map((m) => (
                <label
                  key={m.id}
                  className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-ink"
                >
                  <input
                    type="radio"
                    name="topic"
                    value={m.id}
                    checked={topic === m.id}
                    onChange={() => setTopic(m.id)}
                    className="sr-only"
                  />
                  {m.title}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-muted">{t("practice.available", { count: pool.length })}</p>
          <button type="button" className={primary} onClick={start} disabled={pool.length === 0}>
            {t("practice.start", { count: size })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </section>
      )}

      {round && q && !finished && (
        <section
          aria-label={t("practice.question", { current: at + 1, total: round.length })}
          className="space-y-4 rounded-panel border border-line bg-raised p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-mono font-semibold text-muted">
              {t("practice.question", { current: at + 1, total: round.length })}
            </span>
            <span className="font-medium">{t("practice.score", { score })}</span>
          </div>
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full bg-accent" style={{ width: `${(at / round.length) * 100}%` }} />
          </div>
          <p className="text-xs text-muted">{t("practice.from", { lesson: q.lessonTitle })}</p>
          <h2 className="text-lg font-semibold">{q.question}</h2>
          <div role="group" aria-label={q.question} className="flex flex-col gap-2">
            {q.options.map((o, i) => {
              const right = i === q.answer;
              const chosen = answers[at] === i;
              return (
                <button
                  key={o}
                  type="button"
                  disabled={answered}
                  onClick={() => setAnswers((a) => Object.assign([...a], { [at]: i }))}
                  className={`rounded-control border px-4 py-2 text-left text-sm ${
                    answered && right
                      ? "border-found bg-found-soft text-found-ink"
                      : answered && chosen
                        ? "border-compare bg-compare-soft text-compare-ink"
                        : "border-line bg-surface hover:border-accent disabled:opacity-70"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong
                  className={answers[at] === q.answer ? "text-found-ink" : "text-compare-ink"}
                >
                  {answers[at] === q.answer
                    ? t("systems.right")
                    : t("systems.wrong", { answer: q.options[q.answer] ?? "" })}
                </strong>{" "}
                {q.why}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={primary}
                  onClick={() => {
                    if (at + 1 < round.length) setAt(at + 1);
                    else {
                      setRecord(recordPractice(score, round.length));
                      setFinished(true);
                    }
                  }}
                >
                  {at + 1 < round.length ? t("practice.next") : t("practice.finish")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <Link
                  to={q.path}
                  className="text-sm text-accent-ink underline-offset-4 hover:underline"
                >
                  {t("practice.review")}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {round && finished && (
        <section
          className="space-y-3 rounded-panel border border-accent/40 bg-raised p-5"
          aria-live="polite"
        >
          <h2 className="text-xl font-semibold">
            {t("practice.done", { score, total: round.length })}
          </h2>
          <p className="text-muted">
            {score / round.length >= 0.8
              ? t("practice.doneGreat")
              : score / round.length >= 0.5
                ? t("practice.doneGood")
                : t("practice.doneLow")}
          </p>
          <p className="text-sm text-muted">{t("practice.best", record)}</p>
          <button type="button" className={primary} onClick={() => setRound(null)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("practice.again")}
          </button>
        </section>
      )}
    </div>
  );
}
