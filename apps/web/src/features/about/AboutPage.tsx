import {
  ArrowRight,
  Code2,
  FlaskConical,
  FolderGit2,
  Network,
  Server,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CREATOR, hasCreator } from "../../branding";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { LinkedInMark } from "../../ui/LinkedInMark";
import { ALGORITHMS, STRUCTURES } from "../catalog/catalog";
import { LESSONS } from "../systems/lessons";
import { VISUALIZERS } from "../viz/registry";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** The public landing page for visitors: what AlgoVerse is, who built it, where the code is. */
export function AboutPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("about.title"));
  const players = Object.keys(VISUALIZERS).length;

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("about.title")}</h1>
        <p className="max-w-prose text-lg text-muted">{t("about.lead")}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to="/systems"
            className="inline-flex items-center gap-2 rounded-control bg-accent-solid px-4 py-2 text-sm font-medium text-on-accent"
          >
            {t("about.startSystems")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            to="/algorithms"
            className="inline-flex items-center gap-2 rounded-control border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-accent"
          >
            {t("about.startAlgorithms")}
          </Link>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<FlaskConical className="size-5" />}
          value={ALGORITHMS.length}
          label={t("about.stat.algorithms")}
        />
        <Stat
          icon={<Network className="size-5" />}
          value={STRUCTURES.length}
          label={t("about.stat.structures")}
        />
        <Stat icon={<Code2 className="size-5" />} value={players} label={t("about.stat.players")} />
        <Stat
          icon={<Server className="size-5" />}
          value={LESSONS.length}
          label={t("about.stat.lessons")}
        />
      </ul>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-panel border border-line bg-raised p-5">
          <h2 className="text-lg font-semibold">{t("about.howTitle")}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            <li>{t("about.how.steps")}</li>
            <li>{t("about.how.predict")}</li>
            <li>{t("about.how.systems")}</li>
            <li>{t("about.how.bridge")}</li>
          </ul>
        </div>
        <div className="space-y-2 rounded-panel border border-line bg-raised p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <WifiOff className="size-5 text-muted" aria-hidden="true" />
            {t("about.privacyTitle")}
          </h2>
          <p className="text-sm text-muted">{t("about.privacy")}</p>
        </div>
      </section>

      {hasCreator() && (
        <section className="flex flex-col gap-4 rounded-panel border border-accent/40 bg-surface p-5 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-solid text-2xl font-semibold text-on-accent"
          >
            {CREATOR.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t("about.builtBy")}</p>
            <h2 className="text-xl font-semibold">{CREATOR.name}</h2>
            {CREATOR.headline && <p className="text-sm text-muted">{CREATOR.headline}</p>}
          </div>
          {CREATOR.linkedin && (
            <a
              href={CREATOR.linkedin}
              {...external}
              className="inline-flex items-center gap-2 rounded-control bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white"
            >
              <LinkedInMark />
              {t("about.connect")}
            </a>
          )}
        </section>
      )}

      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <FolderGit2 className="size-4" aria-hidden="true" />
        <a
          href={CREATOR.github}
          {...external}
          className="text-accent-ink underline-offset-4 hover:underline"
        >
          {t("about.source")}
        </a>
        <span aria-hidden="true">·</span>
        {t("about.stack")}
      </p>
    </article>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-panel border border-line bg-raised p-4">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-panel bg-accent-soft text-accent-ink"
      >
        {icon}
      </span>
      <span>
        <span className="block text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
    </li>
  );
}
