import {
  ArrowRight,
  ChartPie,
  Code2,
  Hammer,
  MousePointerClick,
  PencilRuler,
  Play,
  Puzzle,
  SquareTerminal,
  StepForward,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CREATOR, hasCreator } from "../../branding";
import { readLast } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { BrandMark } from "../../ui/BrandMark";
import { ALGORITHMS, STRUCTURES } from "../catalog/catalog";
import { COMMUNITY } from "../community/community";
import { CASES, casesAfter } from "../systems/cases";
import { LAB_PROBLEMS } from "../systems/lab/problems";
import { LESSONS, MODULES } from "../systems/lessons";
import { AlgoWorld } from "./AlgoWorld";
import "./landing.css";
import {
  CAMERA_END_Z,
  CAMERA_START_Z,
  WORLD_OBJECTS,
  ZONES,
  zoneCameraZ,
  type Zone,
} from "./objects";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const primary =
  "lw-lift inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--lw-accent)] px-6 text-base font-bold text-[#0b1020] shadow-lg shadow-[color-mix(in_srgb,var(--lw-accent)_30%,transparent)] hover:brightness-110";
const secondary =
  "glass lw-lift inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-base font-bold text-[var(--lw-text)]";
const eyebrow = "text-xs font-bold tracking-[0.2em] text-[var(--lw-muted)] uppercase";

/** Modules that belong to the AI and integration zone rather than classic system design. */
const FRONTIER = new Set(["legacy", "ai"]);

type Stat = { value: number; label: string };
type ZoneLink = { to: string; label: string };

/**
 * The front door: a glass page over a 3D world of data structures, algorithms and systems.
 * Scrolling flies the camera through the zones; each section's `data-world-z` says where the
 * camera should be while it is on screen.
 */
export function Landing() {
  const { t } = useTranslation();
  useDocumentTitle(t("landing.title"));
  const [last] = useState(readLast);
  const start = last
    ? { to: last.path, label: t("landing.hero.continue") }
    : { to: "/home", label: t("landing.hero.start") };

  const frontier = MODULES.filter((m) => FRONTIER.has(m.id));
  const frontierLessons = frontier.reduce((n, m) => n + m.lessons.length, 0);
  const frontierCases = frontier.reduce((n, m) => n + casesAfter(m.id).length, 0);
  const stats: Record<Zone, Stat[]> = {
    structures: [{ value: STRUCTURES.length, label: t("landing.stat.structures") }],
    algorithms: [{ value: ALGORITHMS.length, label: t("landing.stat.algorithms") }],
    systems: [
      { value: LESSONS.length - frontierLessons, label: t("landing.stat.lessons") },
      { value: CASES.length - frontierCases, label: t("landing.stat.cases") },
      { value: LAB_PROBLEMS.length, label: t("landing.stat.labProblems") },
    ],
    ai: [
      { value: frontierLessons, label: t("landing.stat.lessons") },
      { value: frontierCases, label: t("landing.stat.cases") },
    ],
  };
  const links: Record<Zone, ZoneLink[]> = {
    structures: [{ to: "/structures", label: t("landing.zones.structures.cta") }],
    algorithms: [{ to: "/algorithms", label: t("landing.zones.algorithms.cta") }],
    systems: [
      { to: "/systems", label: t("landing.zones.systems.cta") },
      { to: "/systems/lab", label: t("landing.zones.systems.cta2") },
    ],
    ai: [
      { to: "/systems#ai", label: t("landing.zones.ai.cta") },
      { to: "/systems#legacy", label: t("landing.zones.ai.cta2") },
    ],
  };

  return (
    <div className="landing">
      <AlgoWorld />
      <div className="relative z-10">
        <header className="fixed inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6">
          <nav
            aria-label={t("landing.nav.label")}
            className="glass mx-auto flex max-w-6xl items-center gap-1 rounded-2xl px-3 py-2 sm:px-4"
          >
            <Link
              to="/"
              className="mr-auto flex items-center gap-2 text-lg font-extrabold tracking-tight"
            >
              <BrandMark className="size-6" />
              {t("app.name")}
            </Link>
            {ZONES.map((z) => (
              <a
                key={z}
                href={`#${z}`}
                className="hidden rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--lw-muted)] transition hover:text-[var(--lw-text)] lg:inline-block"
              >
                {t(`landing.zones.${z}.name`)}
              </a>
            ))}
            <a
              href="#how"
              className="hidden rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--lw-muted)] transition hover:text-[var(--lw-text)] md:inline-block"
            >
              {t("landing.how.title")}
            </a>
            <Link
              to="/home"
              className="ml-1 rounded-xl bg-[var(--lw-accent)] px-4 py-2 text-sm font-bold text-[#0b1020] transition hover:brightness-110"
            >
              {t("landing.nav.open")}
            </Link>
          </nav>
        </header>

        <main>
          <section
            data-world-z={CAMERA_START_Z}
            aria-labelledby="hero-title"
            className="flex min-h-svh items-center px-4 pt-28 pb-16 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <div className="glass max-w-2xl rounded-[2rem] p-6 sm:p-10">
                <p className={eyebrow}>{t("landing.hero.eyebrow")}</p>
                <h1
                  id="hero-title"
                  className="mt-4 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl"
                >
                  {t("landing.hero.titleStart")}{" "}
                  <span className="lw-gradient">{t("landing.hero.titleEnd")}</span>
                </h1>
                <p className="mt-5 max-w-xl text-base text-[var(--lw-muted)] sm:text-lg">
                  {t("landing.hero.pitch")}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to={start.to} className={primary}>
                    {start.label}
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                  <a href="#structures" className={secondary}>
                    {t("landing.hero.fly")}
                  </a>
                </div>
                <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--lw-line)] pt-6">
                  <HeroStat
                    value={ALGORITHMS.length + STRUCTURES.length}
                    label={t("landing.hero.statCatalog")}
                  />
                  <HeroStat value={LESSONS.length} label={t("landing.hero.statLessons")} />
                  <HeroStat value={CASES.length} label={t("landing.hero.statCases")} />
                </dl>
              </div>
              <p className={`${eyebrow} mt-8 flex items-center gap-2`}>
                <span
                  aria-hidden="true"
                  className="inline-block h-8 w-5 rounded-full border-2 border-current p-1"
                >
                  <span className="block h-1.5 w-1 animate-bounce rounded-full bg-current motion-reduce:animate-none" />
                </span>
                {t("landing.hero.scroll")}
              </p>
            </div>
          </section>

          {ZONES.map((zone, i) => (
            <ZoneSection
              key={zone}
              zone={zone}
              side={i % 2 === 0 ? "left" : "right"}
              stats={stats[zone]}
              links={links[zone]}
            />
          ))}

          <HowItWorks />
          <Practise />

          <section
            data-world-z={CAMERA_END_Z}
            aria-labelledby="final-title"
            className="px-4 py-24 sm:px-6"
          >
            <div className="glass-strong mx-auto max-w-3xl rounded-[2rem] p-8 text-center sm:p-12">
              <h2 id="final-title" className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                {t("landing.final.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[var(--lw-muted)]">
                {t("landing.final.body")}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link to={start.to} className={primary}>
                  {start.label}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
                <a href={CREATOR.github} {...external} className={secondary}>
                  {t("landing.final.source")}
                </a>
              </div>
            </div>
          </section>
        </main>

        <footer className="px-4 pb-8 text-center text-xs text-[var(--lw-muted)] sm:px-6">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {hasCreator() && (
              <span>
                {t("footer.madeBy")}{" "}
                <a
                  href={CREATOR.linkedin}
                  {...external}
                  className="text-[var(--lw-text)] underline-offset-4 hover:underline"
                >
                  {CREATOR.name}
                </a>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <a href={COMMUNITY.discussions} {...external} className="hover:underline">
              {t("footer.discussions")}
            </a>
            <span aria-hidden="true">·</span>
            <a href={COMMUNITY.contributing} {...external} className="hover:underline">
              {t("footer.contribute")}
            </a>
            <span aria-hidden="true">·</span>
            <Link to="/disclaimer" className="hover:underline">
              {t("footer.disclaimer")}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{t("landing.footer.privacy")}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: Stat) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-3xl font-extrabold tracking-tight sm:text-4xl">{value}</dd>
      <dd aria-hidden="true" className="mt-1 text-xs leading-tight text-[var(--lw-muted)]">
        {label}
      </dd>
    </div>
  );
}

function ZoneSection({
  zone,
  side,
  stats,
  links,
}: {
  zone: Zone;
  side: "left" | "right";
  stats: Stat[];
  links: ZoneLink[];
}) {
  const { t } = useTranslation();
  const color = `var(--lw-${zone})`;
  const points = t(`landing.zones.${zone}.points`, { returnObjects: true }) as string[];
  const objects = WORLD_OBJECTS.filter((o) => o.zone === zone);
  return (
    <section
      id={zone}
      data-world-z={zoneCameraZ(zone)}
      aria-labelledby={`${zone}-title`}
      className="flex min-h-svh scroll-mt-24 items-center px-4 py-24 sm:px-6"
    >
      <div className={`mx-auto flex w-full max-w-6xl ${side === "right" ? "justify-end" : ""}`}>
        <div
          className="glass w-full max-w-md rounded-[2rem] p-6 sm:p-8"
          style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
        >
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color }}>
            {t(`landing.zones.${zone}.role`)}
          </p>
          <h2 id={`${zone}-title`} className="mt-2 text-3xl font-extrabold tracking-tight">
            {t(`landing.zones.${zone}.name`)}
          </h2>
          <p className="mt-3 text-[var(--lw-muted)]">{t(`landing.zones.${zone}.promise`)}</p>
          <ul className="mt-5 space-y-2 text-sm">
            {points.map((point) => (
              <li key={point} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {point}
              </li>
            ))}
          </ul>
          <dl className="mt-6 flex flex-wrap gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="min-w-24 flex-1 rounded-2xl border border-[var(--lw-line)] px-3 py-2"
              >
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-extrabold">{s.value}</dd>
                <dd aria-hidden="true" className="text-[11px] text-[var(--lw-muted)] uppercase">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
          <p className={`${eyebrow} mt-6`}>{t("landing.floating")}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {objects.map((o) => (
              <li key={o.kind} className="rounded-full border border-[var(--lw-line)] px-2.5 py-1">
                {o.title}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center gap-1.5 text-sm font-bold"
                style={{ color }}
              >
                {l.label}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS: { key: "watch" | "step" | "code" | "design"; icon: LucideIcon }[] = [
  { key: "watch", icon: Play },
  { key: "step", icon: StepForward },
  { key: "code", icon: Code2 },
  { key: "design", icon: PencilRuler },
];

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section
      id="how"
      data-world-z={CAMERA_END_Z + 30}
      aria-labelledby="how-title"
      className="scroll-mt-24 px-4 py-24 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>{t("landing.how.eyebrow")}</p>
        <h2 id="how-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("landing.how.title")}
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <li key={key} className="glass rounded-[1.5rem] p-6">
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl border border-[var(--lw-line)] text-[var(--lw-accent)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold text-[var(--lw-muted)]">0{i + 1}</span>
              </span>
              <h3 className="mt-4 text-lg font-bold">{t(`landing.how.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-[var(--lw-muted)]">{t(`landing.how.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PRACTISE: {
  key: "problems" | "playground" | "projects" | "progress";
  to: string;
  icon: LucideIcon;
}[] = [
  { key: "problems", to: "/problems", icon: Puzzle },
  { key: "playground", to: "/playground", icon: SquareTerminal },
  { key: "projects", to: "/projects", icon: Hammer },
  { key: "progress", to: "/progress", icon: ChartPie },
];

function Practise() {
  const { t } = useTranslation();
  return (
    <section
      id="practise"
      data-world-z={CAMERA_END_Z + 15}
      aria-labelledby="practise-title"
      className="scroll-mt-24 px-4 py-24 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>{t("landing.practise.eyebrow")}</p>
        <h2 id="practise-title" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("landing.practise.title")}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTISE.map(({ key, to, icon: Icon }) => (
            <li key={key}>
              <Link to={to} className="glass lw-lift block h-full rounded-[1.5rem] p-6">
                <Icon className="size-6 text-[var(--lw-accent)]" aria-hidden="true" />
                <span className="mt-4 flex items-center gap-1.5 text-lg font-bold">
                  {t(`landing.practise.${key}.title`)}
                  <MousePointerClick className="size-4 opacity-60" aria-hidden="true" />
                </span>
                <span className="mt-2 block text-sm text-[var(--lw-muted)]">
                  {t(`landing.practise.${key}.body`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
