import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { findCase } from "../cases";
import { findLesson } from "../lessons";
import { markDone } from "../progress";
import { button, DesignEditor, Scene3D } from "./DesignEditor";
import { type Grade, PASS_SCORE } from "./grade";
import { type Design, type LabProblem, toScene } from "./model";
import { findProblem } from "./problems";
import { readBest, readDraft, saveBest, saveDraft } from "./storage";

export const backLink =
  "inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline";

export function DesignLabPage() {
  const { problemId = "" } = useParams();
  const problem = findProblem(problemId);
  const { t } = useTranslation();
  useDocumentTitle(problem ? problem.title : t("lab.title"));
  if (!problem) {
    return (
      <div className="space-y-4">
        <Link to="/systems/lab" className={backLink}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("lab.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("lab.missing", { id: problemId })}</p>
      </div>
    );
  }
  return <SetProblem key={problem.id} problem={problem} />;
}

/** One of the Design Lab's own problems: a brief, checks written for it and a model answer. */
function SetProblem({ problem }: { problem: LabProblem }) {
  const { t } = useTranslation();
  const [initial] = useState(() => readDraft(problem.id));
  const [best, setBest] = useState(() => readBest(problem.id));
  const [showAnswer, setShowAnswer] = useState(false);
  const answerScene = useMemo(() => toScene(problem.answer), [problem.answer]);
  const caseStudy = problem.caseId ? findCase(problem.caseId)?.cs : undefined;

  const onChange = useCallback((d: Design) => saveDraft(problem.id, d), [problem.id]);
  const onChecked = useCallback(
    (g: Grade) => {
      saveBest(problem.id, g.score);
      setBest(readBest(problem.id) ?? g.score);
      if (g.score >= PASS_SCORE) markDone(`lab:${problem.id}`);
    },
    [problem.id],
  );

  return (
    <article className="space-y-5">
      <Link to="/systems/lab" className={backLink}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("lab.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-sm text-muted">{t("lab.title")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{problem.title}</h1>
        <p className="max-w-prose text-muted">{problem.tagline}</p>
        <p className="flex flex-wrap gap-2 text-xs text-muted">
          <span>{t(`catalog.level.${problem.level}`)}</span>
          <span aria-hidden="true">·</span>
          <span>{t("systems.minutes", { count: problem.minutes })}</span>
          <span aria-hidden="true">·</span>
          <span>{best === undefined ? t("lab.notTried") : t("lab.best", { score: best })}</span>
        </p>
      </header>

      <section className="grid gap-4 rounded-panel border border-line bg-raised p-4 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">{t("lab.brief")}</h2>
          {problem.brief.map((p) => (
            <p key={p} className="text-sm">
              {p}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">{t("lab.requirements")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {problem.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="pt-1 text-sm text-muted">
            {t("lab.practises")}{" "}
            {problem.concepts.map((c, i) => {
              const lesson = findLesson(c)?.lesson;
              if (!lesson) return null;
              return (
                <span key={c}>
                  {i > 0 && ", "}
                  <Link
                    to={`/systems/${c}`}
                    className="text-accent-ink underline underline-offset-2"
                  >
                    {lesson.title}
                  </Link>
                </span>
              );
            })}
          </p>
        </div>
      </section>

      <DesignEditor
        palette={problem.palette}
        checks={problem.checks}
        initial={initial}
        onChange={onChange}
        onChecked={onChecked}
        resultExtra={(mine) => (
          <>
            <button type="button" className={button} onClick={() => setShowAnswer((s) => !s)}>
              {showAnswer ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              {showAnswer ? t("lab.hideAnswer") : t("lab.showAnswer")}
            </button>
            {showAnswer && (
              <div className="space-y-3">
                <h3 className="font-semibold">{t("lab.why")}</h3>
                {problem.explain.map((p) => (
                  <p key={p} className="text-sm">
                    {p}
                  </p>
                ))}
                <div className="grid gap-3 md:grid-cols-2">
                  <Scene3D title={t("lab.yours")} scene={mine} />
                  <Scene3D title={t("lab.answer")} scene={answerScene} />
                </div>
                {caseStudy && (
                  <p className="text-sm">
                    <Link
                      to={`/systems/case/${caseStudy.id}`}
                      className="text-accent-ink underline underline-offset-2"
                    >
                      {t("lab.readCase", { title: caseStudy.title })}
                    </Link>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      />
    </article>
  );
}
