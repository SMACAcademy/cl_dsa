import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { readAutoplay, readMotion, recordVisit } from "../../lib/progress";
import { dwellMs } from "./autoplay";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { button, primaryButton } from "../viz/styles";
import { IsoScene, sceneBounds } from "./IsoScene";
import { findLesson } from "./lessons";
import type { FlowKind, Lesson, LessonStep, StepKind } from "./model";
import { markDone } from "./progress";

const backLink =
  "inline-flex items-center gap-1.5 text-sm text-accent-ink underline-offset-4 hover:underline";

/** One system design lesson: the animated scene beside the step-by-step story. */
export function LessonPage() {
  const { t } = useTranslation();
  const { lessonId = "" } = useParams();
  const found = findLesson(lessonId);
  useDocumentTitle(found ? found.lesson.title : t("nav.systems"));

  if (!found) {
    return (
      <div className="space-y-4">
        <Link to="/systems" className={backLink}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("systems.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("systems.missing", { id: lessonId })}</p>
      </div>
    );
  }
  const { lesson, module, index, count, prev, next } = found;
  return (
    <LessonView
      key={lesson.id}
      lesson={lesson}
      where={t("systems.where", {
        number: module.number,
        module: module.title,
        index: index + 1,
        count,
      })}
      prev={prev}
      next={next}
      base="/systems"
    />
  );
}

export type LessonViewProps = {
  lesson: Lesson;
  /** The line above the title, e.g. "02. Scaling · Lesson 4 of 5". */
  where: string;
  prev: Lesson | undefined;
  next: Lesson | undefined;
  /** Where this kind of page lives: "/systems" for lessons, "/systems/case" for case studies. */
  base: string;
  /** Lessons whose ideas this page combines (case studies). */
  concepts?: readonly Lesson[];
};

const KIND_STYLE: Record<StepKind, string> = {
  setup: "border-line bg-sunken text-muted",
  problem: "border-compare bg-compare-soft text-compare-ink",
  insight: "border-accent bg-accent-soft text-accent-ink",
  technique: "border-accent bg-accent-soft text-accent-ink",
  solution: "border-found bg-found-soft text-found-ink",
  tradeoff: "border-compare bg-compare-soft text-compare-ink",
  case: "border-line bg-surface text-fg",
  recap: "border-found bg-found-soft text-found-ink",
};

export function LessonView({ lesson, where, prev, next, base, concepts = [] }: LessonViewProps) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const total = lesson.steps.length;
  const requested = Number(params.get("step") ?? "1");
  const at = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), total) - 1 : 0;
  const step = lesson.steps[at] as LessonStep;
  const [paused, setPaused] = useState(() => readMotion() === "still");
  const [autoplay] = useState(readAutoplay);
  const [auto, setAuto] = useState(autoplay.on);
  const dwell = dwellMs(step, autoplay.speed);
  const advancing = auto && at < total - 1;
  const [replay, setReplay] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const bounds = useMemo(() => sceneBounds(lesson.steps.map((s) => s.scene)), [lesson]);
  const flowKinds = useMemo(() => usedFlows(lesson), [lesson]);
  const previousScene = at > 0 ? lesson.steps[at - 1]?.scene : undefined;
  const fresh = new Set(
    step.scene.nodes
      .filter((n) => !previousScene?.nodes.some((p) => p.id === n.id))
      .map((n) => n.id),
  );

  const go = (i: number) => {
    const target = Math.min(Math.max(i, 0), total - 1);
    setParams(target === 0 ? {} : { step: String(target + 1) }, { replace: true });
  };

  useEffect(() => {
    if (at === total - 1) markDone(lesson.id);
    recordVisit({
      path: `${base}/${lesson.id}${at > 0 ? `?step=${at + 1}` : ""}`,
      title: lesson.title,
      kind: "lesson",
    });
  }, [at, total, base, lesson.id, lesson.title]);

  // Autoplay: move on after the step's reading time; wait while the tab is hidden.
  useEffect(() => {
    if (!advancing) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = (ms: number) => {
      timer = setTimeout(() => {
        if (typeof document !== "undefined" && document.hidden) arm(1500);
        else go(at + 1);
      }, ms);
    };
    arm(dwell);
    return () => clearTimeout(timer);
    // go() is recreated each render; the step index and timing are what matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancing, at, dwell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input, textarea, select, [contenteditable='true'], form")) return;
      if (e.key === "ArrowRight") go(at + 1);
      else if (e.key === "ArrowLeft") go(at - 1);
      else if (e.key.toLowerCase() === "r") setReplay((n) => n + 1);
      else if (e.key.toLowerCase() === "a") setAuto((a) => !a);
      else if (e.key === " " && !el?.closest("button, a")) {
        e.preventDefault();
        setPaused((p) => !p);
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextStep = lesson.steps[at + 1];
  const learnedUpTo = Math.round(((at + 1) / total) * lesson.learn.length);

  return (
    <article className="space-y-5">
      <Link to="/systems" className={backLink}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("systems.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-sm text-muted">{where}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
        <p className="max-w-prose text-muted">{lesson.tagline}</p>
        <p className="flex flex-wrap gap-2 text-xs font-medium">
          <Chip>{t("systems.minutes", { count: lesson.minutes })}</Chip>
          <Chip>{t(`catalog.level.${lesson.level}`)}</Chip>
          <Chip>{t("systems.steps", { count: total })}</Chip>
          {lesson.lab && <Chip accent>{t("systems.lab")}</Chip>}
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-label={t("systems.diagram")}
          className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-3"
        >
          {step.metrics && step.metrics.length > 0 && (
            <dl aria-label={t("systems.metrics")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {step.metrics.map((m) => (
                <div
                  key={`${at}-${m.label}`}
                  className={`scene-flash rounded-control border px-2 py-1 ${
                    m.tone === "bad"
                      ? "border-compare"
                      : m.tone === "good"
                        ? "border-found"
                        : "border-line"
                  }`}
                >
                  <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                    {m.label}
                  </dt>
                  <dd
                    className={`font-mono text-sm font-semibold ${
                      m.tone === "bad"
                        ? "text-compare-ink"
                        : m.tone === "good"
                          ? "text-found-ink"
                          : ""
                    }`}
                  >
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-control bg-surface">
            <IsoScene
              key={`${replay}`}
              scene={step.scene}
              bounds={bounds}
              fresh={fresh}
              paused={paused}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="sr-only">{t("systems.legend")}</span>
            {flowKinds.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <svg aria-hidden="true" viewBox="-6 -6 12 12" className="size-3">
                  {k === "heavy" || k === "write" ? (
                    <rect
                      x={-5}
                      y={-5}
                      width={10}
                      height={10}
                      rx={2}
                      className={`scene-dot-${k}`}
                    />
                  ) : (
                    <circle r={5} className={`scene-dot-${k}`} />
                  )}
                </svg>
                {t(`systems.flow.${k}`)}
              </span>
            ))}
            <span className="ml-auto flex gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setReplay((n) => n + 1)}
                aria-label={t("systems.replay")}
                title={t("systems.replay")}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={button}
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? t("systems.play") : t("systems.pause")}
                title={paused ? t("systems.play") : t("systems.pause")}
              >
                {paused ? (
                  <Play className="size-4" aria-hidden="true" />
                ) : (
                  <Pause className="size-4" aria-hidden="true" />
                )}
              </button>
            </span>
          </div>
          <SceneText step={step} />
        </section>

        <StepPanel
          step={step}
          at={at}
          total={total}
          nextShort={nextStep?.short}
          answer={answers[at]}
          onAnswer={(i) => setAnswers((a) => ({ ...a, [at]: i }))}
          onPrev={() => go(at - 1)}
          onNext={() => go(at + 1)}
          nextLesson={next}
          auto={auto}
          onToggleAuto={() => setAuto((a) => !a)}
          dwell={dwell}
          nextPath={(l) => `${base}/${l.id}`}
        />
      </div>

      <nav aria-label={t("systems.timeline")} className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-start gap-1">
          {lesson.steps.map((s, i) => (
            <li key={`${s.short}-${i}`} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === at ? "step" : undefined}
                aria-label={`${i + 1}. ${s.title}`}
                className="group flex w-20 flex-col items-center gap-1 rounded-control px-1 py-1 text-[11px] hover:bg-sunken"
              >
                <span
                  className={`grid size-7 place-items-center rounded-full border-2 font-mono text-xs font-semibold ${
                    i === at
                      ? "border-accent bg-accent-solid text-on-accent"
                      : i < at
                        ? "border-found bg-found-soft text-found-ink"
                        : "border-line bg-raised text-muted"
                  }`}
                >
                  {i < at ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className={i === at ? "font-semibold text-fg" : "text-muted"}>{s.short}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t("systems.learn")}>
          <ul className="space-y-1.5 text-sm">
            {lesson.learn.map((item, i) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${
                    i < learnedUpTo ? "border-found bg-found-soft text-found-ink" : "border-line"
                  }`}
                >
                  {i < learnedUpTo && <Check className="size-3" />}
                </span>
                <span className={i < learnedUpTo ? "" : "text-muted"}>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>
        {concepts.length > 0 && (
          <Panel title={t("cases.combines")}>
            <ul className="flex flex-wrap gap-2">
              {concepts.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/systems/${c.id}`}
                    className="inline-flex rounded-full border border-accent/50 bg-accent-soft px-3 py-1 text-sm text-accent-ink hover:border-accent"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {lesson.builtOn && lesson.builtOn.length > 0 && (
          <Panel title={t("systems.builtOn")}>
            <ul className="flex flex-wrap gap-2">
              {lesson.builtOn.map((b) => (
                <li key={b.path}>
                  <Link
                    to={b.path}
                    className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-accent"
                  >
                    {b.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {lesson.lab && <Lab lab={lesson.lab} title={t("systems.tryIt")} />}

      <nav
        aria-label={t("systems.pager")}
        className="flex flex-wrap justify-between gap-3 border-t border-line pt-4"
      >
        {prev ? (
          <Link to={`${base}/${prev.id}`} className={backLink}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("systems.previousLesson", { title: prev.title })}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`${base}/${next.id}`} className={backLink}>
            {t("systems.nextLesson", { title: next.title })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </article>
  );
}

function StepPanel({
  step,
  at,
  total,
  nextShort,
  answer,
  onAnswer,
  onPrev,
  onNext,
  nextLesson,
  auto,
  onToggleAuto,
  dwell,
  nextPath = (l: Lesson) => `/systems/${l.id}`,
}: {
  step: LessonStep;
  at: number;
  total: number;
  nextShort: string | undefined;
  answer: number | undefined;
  onAnswer: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  nextLesson: Lesson | undefined;
  auto: boolean;
  onToggleAuto: () => void;
  dwell: number;
  nextPath?: (lesson: Lesson) => string;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const quiz = step.quiz;
  const counting = auto && at < total - 1;
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-raised p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted">
          {t("systems.stepOf", { current: at + 1, total })}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${KIND_STYLE[step.kind]}`}
        >
          {t(`systems.kind.${step.kind}`)}
        </span>
      </div>
      <h2 id={titleId} className="text-lg leading-snug font-semibold tracking-tight">
        {step.title}
      </h2>
      {step.uses && (
        <p className="-mt-1 text-xs">
          <span className="text-muted">{t("cases.concept")} </span>
          <Link
            to={`/systems/${step.uses}`}
            className="font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            {findLesson(step.uses)?.lesson.title ?? step.uses}
          </Link>
        </p>
      )}
      <div aria-live="polite" className="space-y-2.5 text-sm leading-relaxed">
        {step.body.map((p) => (
          <p key={p}>
            <Rich text={p} />
          </p>
        ))}
      </div>

      {step.table && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr>
                {step.table.head.map((h, i) => (
                  <th key={`${h}-${i}`} className="border-b border-line px-2 py-1.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {step.table.rows.map((row, r) => (
                <tr key={r} className="border-b border-line last:border-0">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-2 py-1.5 align-top ${c === 0 ? "font-semibold" : "text-muted"}`}
                    >
                      <Rich text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {step.code && (
        <pre className="overflow-x-auto rounded-control border border-line bg-surface p-3 font-mono text-xs leading-relaxed">
          {step.code.join("\n")}
        </pre>
      )}

      {step.callout && (
        <aside
          className={`rounded-control border-l-4 px-3 py-2 text-sm ${
            step.callout.kind === "watch"
              ? "border-compare bg-compare-soft"
              : step.callout.kind === "good"
                ? "border-found bg-found-soft"
                : "border-accent bg-accent-soft"
          }`}
        >
          <p className="text-[11px] font-semibold tracking-wide uppercase">
            {t(`systems.callout.${step.callout.kind}`)}
          </p>
          <p className="mt-0.5">
            <Rich text={step.callout.text} />
          </p>
        </aside>
      )}

      {quiz && (
        <div
          role="group"
          aria-label={t("systems.quiz")}
          className="rounded-control border border-accent/50 bg-surface p-3"
        >
          <p className="text-[11px] font-semibold tracking-wide text-accent-ink uppercase">
            {t("systems.quiz")}
          </p>
          <p className="mt-1 text-sm font-medium">{quiz.question}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {quiz.options.map((o, i) => {
              const chosen = answer === i;
              const show = answer !== undefined;
              const right = i === quiz.answer;
              return (
                <button
                  key={o}
                  type="button"
                  disabled={show}
                  onClick={() => onAnswer(i)}
                  className={`rounded-control border px-3 py-1.5 text-left text-sm transition-colors ${
                    show && right
                      ? "border-found bg-found-soft text-found-ink"
                      : show && chosen
                        ? "border-compare bg-compare-soft text-compare-ink"
                        : "border-line bg-raised hover:border-accent disabled:opacity-70"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {answer !== undefined && (
            <p className="mt-2 text-sm">
              <strong className={answer === quiz.answer ? "text-found-ink" : "text-compare-ink"}>
                {answer === quiz.answer
                  ? t("systems.right")
                  : t("systems.wrong", { answer: quiz.options[quiz.answer] ?? "" })}
              </strong>{" "}
              {quiz.why}
            </p>
          )}
        </div>
      )}

      {step.changes && step.changes.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            {t("systems.changed")}
          </p>
          <ul className="mt-1 space-y-0.5 font-mono text-xs">
            {step.changes.map((c) => (
              <li key={`${c.op}${c.text}`} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className={
                    c.op === "+"
                      ? "text-found-ink"
                      : c.op === "-"
                        ? "text-compare-ink"
                        : "text-accent-ink"
                  }
                >
                  {c.op === "-" ? "−" : c.op}
                </span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <button type="button" className={button} onClick={onPrev} disabled={at === 0}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("systems.prev")}
        </button>
        {nextShort !== undefined ? (
          <button type="button" className={primaryButton} onClick={onNext}>
            {t("systems.next", { short: nextShort })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : nextLesson ? (
          <Link to={nextPath(nextLesson)} className={primaryButton}>
            {t("systems.nextLesson", { title: nextLesson.title })}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-sm font-medium text-found-ink">{t("systems.finished")}</span>
        )}
        <button
          type="button"
          className={`${button} ml-auto`}
          onClick={onToggleAuto}
          aria-pressed={auto}
          title={t("systems.autoplayHint")}
        >
          {auto ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {t("systems.autoplay")}
        </button>
      </div>
      {counting && (
        <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-sunken">
          <div
            key={at}
            className="autoplay-bar h-full rounded-full bg-accent"
            style={{ animationDuration: `${dwell}ms` }}
          />
        </div>
      )}
      <p className="hidden text-xs text-muted lg:block">{t("systems.keys")}</p>
    </section>
  );
}

/** Renders `code` and **bold** inside lesson text. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") ? (
          <code key={i} className="rounded bg-sunken px-1 py-0.5 text-[0.9em]">
            {p.slice(1, -1)}
          </code>
        ) : p.startsWith("**") ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function SceneText({ step }: { step: LessonStep }) {
  const { t } = useTranslation();
  const byId = new Map(step.scene.nodes.map((n) => [n.id, n]));
  return (
    <div className="sr-only">
      <p>{t("systems.sceneDescription")}</p>
      <ul>
        {step.scene.nodes.map((n) => (
          <li key={n.id}>
            {t("systems.sceneNode", {
              label: n.label,
              sub: n.sub ? `, ${n.sub}` : "",
              state: n.state && n.state !== "ok" ? t(`systems.nodeState.${n.state}`) : "",
            })}
          </li>
        ))}
        {(step.scene.links ?? [])
          .filter((l) => (l.flows ?? []).length > 0)
          .map((l) => (
            <li key={`${l.from}-${l.to}`}>
              {t("systems.sceneLink", {
                from: byId.get(l.from)?.label ?? l.from,
                to: byId.get(l.to)?.label ?? l.to,
                flows: (l.flows ?? []).map((f) => t(`systems.flow.${f.kind}`)).join(", "),
              })}
            </li>
          ))}
      </ul>
    </div>
  );
}

function usedFlows(lesson: Lesson): FlowKind[] {
  const order: FlowKind[] = ["request", "response", "write", "heavy", "event", "copy", "fail"];
  const seen = new Set<FlowKind>();
  for (const s of lesson.steps)
    for (const l of s.scene.links ?? []) for (const f of l.flows ?? []) seen.add(f.kind);
  return order.filter((k) => seen.has(k));
}

function Chip({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 ${
        accent ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-raised text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-panel border border-line bg-raised p-4">
      <h2 id={headingId} className="text-sm font-semibold text-muted">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Lab({ lab: LabComponent, title }: { lab: NonNullable<Lesson["lab"]>; title: string }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-panel border border-accent/40 bg-surface p-4 sm:p-6"
    >
      <h2 id={headingId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <LabComponent />
    </section>
  );
}
