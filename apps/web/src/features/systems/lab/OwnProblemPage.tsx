import { ArrowLeft, Copy, Eye, EyeOff, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { useDocumentTitle } from "../../../lib/useDocumentTitle";
import { backLink } from "./DesignLabPage";
import { button, DesignEditor, primary } from "./DesignEditor";
import { GENERAL_CHECKS } from "./general";
import type { Grade } from "./grade";
import { ALL_PALETTE } from "./kit";
import type { Design } from "./model";
import { deleteOwn, type OwnProblem, readOwn, requirementLines, saveOwn } from "./ownStorage";
import { buildReviewPrompt } from "./prompt";

const field = "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm";

/** A problem the learner wrote: their brief, any design, general checks and an AI review prompt. */
export function OwnProblemPage() {
  const { ownId = "" } = useParams();
  const { t } = useTranslation();
  const [problem] = useState(() => readOwn(ownId));
  useDocumentTitle(problem?.title.trim() || t("lab.own.untitled"));
  if (!problem) {
    return (
      <div className="space-y-4">
        <Link to="/systems/lab" className={backLink}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("lab.back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("catalog.missing.title")}</h1>
        <p className="text-muted">{t("lab.own.missing", { id: ownId })}</p>
      </div>
    );
  }
  return <OwnEditor key={problem.id} start={problem} />;
}

function OwnEditor({ start }: { start: OwnProblem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = useId();
  const [title, setTitle] = useState(start.title);
  const [brief, setBrief] = useState(start.brief);
  const [requirements, setRequirements] = useState(start.requirements);
  const [draft, setDraft] = useState<Design>(start.draft);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    saveOwn({ ...start, title, brief, requirements, draft });
  }, [start, title, brief, requirements, draft]);

  const onChange = useCallback((d: Design) => setDraft(d), []);

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteOwn(start.id);
    navigate("/systems/lab");
  }

  return (
    <article className="space-y-5">
      <Link to="/systems/lab" className={backLink}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("lab.back")}
      </Link>

      <header className="space-y-2">
        <p className="text-sm text-muted">{t("lab.own.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title.trim() || t("lab.own.untitled")}
        </h1>
      </header>

      <section
        aria-labelledby={`${id}-form`}
        className="space-y-4 rounded-panel border border-line bg-raised p-4"
      >
        <h2 id={`${id}-form`} className="font-semibold">
          {t("lab.own.form")}
        </h2>
        <div className="space-y-1">
          <label htmlFor={`${id}-title`} className="block text-sm font-medium">
            {t("lab.own.titleField")}
          </label>
          <input
            id={`${id}-title`}
            value={title}
            maxLength={120}
            placeholder={t("lab.own.titlePlaceholder")}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`${id}-brief`} className="block text-sm font-medium">
              {t("lab.own.brief")}
            </label>
            <textarea
              id={`${id}-brief`}
              value={brief}
              rows={6}
              maxLength={4000}
              placeholder={t("lab.own.briefPlaceholder")}
              onChange={(e) => setBrief(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-reqs`} className="block text-sm font-medium">
              {t("lab.own.requirements")}
            </label>
            <textarea
              id={`${id}-reqs`}
              value={requirements}
              rows={6}
              maxLength={4000}
              placeholder={t("lab.own.requirementsPlaceholder")}
              onChange={(e) => setRequirements(e.target.value)}
              className={field}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">{t("lab.own.savedNote")}</p>
          <button
            type="button"
            className={button}
            onClick={remove}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {confirmDelete ? t("lab.own.confirmDelete") : t("lab.own.delete")}
          </button>
        </div>
      </section>

      <DesignEditor
        palette={ALL_PALETTE}
        checks={GENERAL_CHECKS}
        initial={start.draft}
        onChange={onChange}
        resultExtra={() => <p className="text-sm text-muted">{t("lab.own.checksNote")}</p>}
        after={(design, result) => (
          <ReviewWithAI
            title={title}
            brief={brief}
            requirements={requirementLines({ requirements })}
            design={design}
            result={result}
          />
        )}
      />
    </article>
  );
}

function ReviewWithAI(props: {
  title: string;
  brief: string;
  requirements: readonly string[];
  design: Design;
  result: Grade | null;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("");
  const prompt = buildReviewPrompt(props, t);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus(t("lab.own.review.copied"));
    } catch {
      setShow(true);
      setStatus(t("lab.own.review.copyFailed"));
    }
  }

  return (
    <section
      aria-labelledby={`${id}-review`}
      className="space-y-3 rounded-panel border border-accent/40 bg-accent-soft/30 p-4"
    >
      <h2 id={`${id}-review`} className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-accent-ink" aria-hidden="true" />
        {t("lab.own.review.title")}
      </h2>
      <p className="max-w-prose text-sm">{t("lab.own.review.body")}</p>
      {!props.result && <p className="text-xs text-muted">{t("lab.own.review.tip")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} onClick={() => void copy()}>
          <Copy className="size-4" aria-hidden="true" />
          {t("lab.own.review.copy")}
        </button>
        <button
          type="button"
          className={button}
          aria-expanded={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
          {show ? t("lab.own.review.hide") : t("lab.own.review.show")}
        </button>
      </div>
      <p role="status" className="min-h-5 text-sm text-muted">
        {status}
      </p>
      {show && (
        <div className="space-y-1">
          <label htmlFor={`${id}-prompt`} className="block text-sm font-medium">
            {t("lab.own.review.label")}
          </label>
          <textarea
            id={`${id}-prompt`}
            readOnly
            value={prompt}
            rows={16}
            onFocus={(e) => e.currentTarget.select()}
            className={`${field} font-mono text-xs`}
          />
        </div>
      )}
    </section>
  );
}
