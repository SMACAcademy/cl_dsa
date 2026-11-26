import { MessagesSquare, Trophy } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { findCase } from "../systems/cases";
import { COMMUNITY, newDiscussionUrl, weeklyChallenge } from "./community";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** This week's open design question, shared by everyone and discussed on GitHub. */
export function WeeklyChallenge() {
  const { t } = useTranslation();
  const headingId = useId();
  const [challenge] = useState(() => weeklyChallenge());
  const found = findCase(challenge.caseId);
  if (!found) return null;
  const { cs } = found;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-panel border border-line bg-raised p-4 sm:flex-row sm:items-start"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink"
      >
        <Trophy className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 id={headingId} className="text-sm font-medium text-muted">
          {t("community.weekly", { number: challenge.number })}
        </h2>
        <p className="font-medium">{challenge.question}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            to={`/systems/case/${cs.id}`}
            className="text-accent-ink underline-offset-4 hover:underline"
          >
            {t("community.weeklyRead", { title: cs.title })}
          </Link>
          <a
            href={newDiscussionUrl(
              "q-a",
              t("community.weeklyTitle", {
                number: challenge.number,
                question: challenge.question,
              }),
              t("community.challengeBody", {
                question: challenge.question,
                page: typeof window === "undefined" ? "" : window.location.href.split("?")[0],
              }),
            )}
            {...external}
            className="inline-flex items-center gap-1.5 text-accent-ink underline-offset-4 hover:underline"
          >
            <MessagesSquare className="size-4" aria-hidden="true" />
            {t("community.shareAnswer")}
          </a>
          <a
            href={COMMUNITY.challenges}
            {...external}
            className="text-muted underline-offset-4 hover:underline"
          >
            {t("community.seeAnswers")}
          </a>
        </div>
      </div>
    </section>
  );
}
