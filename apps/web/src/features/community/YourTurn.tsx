import { Lightbulb, MessagesSquare, PenLine } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { CHALLENGES, newDiscussionUrl, newIssueUrl } from "./community";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const button =
  "inline-flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent";

/**
 * The end of a lesson or case study: an open design question to argue about on GitHub,
 * plus ways to improve the page or propose the next case study.
 */
export function YourTurn({ id, title, isCase }: { id: string; title: string; isCase: boolean }) {
  const { t } = useTranslation();
  const headingId = useId();
  const question = isCase ? CHALLENGES[id] : undefined;
  const page = typeof window === "undefined" ? "" : window.location.href.split("?")[0];

  const discussTitle = question
    ? `${title}: ${question}`
    : t("community.lessonDiscussTitle", { title });
  const discussBody = question
    ? t("community.challengeBody", { question, page })
    : t("community.lessonBody", { page });

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-panel border border-accent/40 bg-accent-soft/40 p-4"
    >
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
        <Lightbulb className="size-5 text-accent-ink" aria-hidden="true" />
        {question ? t("community.yourTurn") : t("community.questions")}
      </h2>
      <p className="max-w-prose text-sm">{question ?? t("community.lessonPrompt")}</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={newDiscussionUrl("q-a", discussTitle, discussBody)}
          {...external}
          className="inline-flex items-center gap-2 rounded-control bg-accent-solid px-3 py-1.5 text-sm font-medium text-on-accent"
        >
          <MessagesSquare className="size-4" aria-hidden="true" />
          {question ? t("community.shareAnswer") : t("community.ask")}
        </a>
        <a href={newIssueUrl("content-fix.yml", `[${id}] `)} {...external} className={button}>
          <PenLine className="size-4" aria-hidden="true" />
          {t("community.improve")}
        </a>
        {isCase && (
          <a
            href={newIssueUrl("case-study-idea.yml", t("community.ideaTitle"))}
            {...external}
            className={button}
          >
            {t("community.proposeCase")}
          </a>
        )}
      </div>
      <p className="text-xs text-muted">{t("community.githubNote")}</p>
    </section>
  );
}
