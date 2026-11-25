import { Triangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { readVisited } from "../../lib/progress";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { readDone } from "../systems/progress";
import { PYRAMID, topicProgress, type Topic } from "./topics";

const W = 120; // tile width
const H = 104; // tile height
const ROW_TIER = [0, 2, 4, 6, 7];

export function useSeen() {
  const [visited] = useState(readVisited);
  const [done] = useState(readDone);
  return (path: string) =>
    path.startsWith("/systems/") ? done.has(path.slice("/systems/".length)) : visited.has(path);
}

/** The Learning Universe: every topic as a triangle on one pyramid, filling in with progress. */
export function UniversePage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.universe"));
  const navigate = useNavigate();
  const seen = useSeen();
  const rows = PYRAMID.length;
  const width = rows * W;
  const height = rows * H;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <Triangle className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.universe")}</h1>
          <p className="max-w-prose text-muted">{t("universe.intro")}</p>
        </div>
      </header>

      <div className="rounded-panel border border-line bg-raised p-3 sm:p-6">
        <svg
          aria-hidden="true"
          viewBox={`-4 -4 ${width + 8} ${height + 8}`}
          className="mx-auto w-full max-w-3xl"
        >
          {PYRAMID.map((row, r) =>
            row.map((topic, k) => {
              const x0 = width / 2 - ((r + 1) * W) / 2 + (k * W) / 2;
              const y = r * H;
              const up = k % 2 === 0;
              const pts = up
                ? `${x0},${y + H} ${x0 + W / 2},${y} ${x0 + W},${y + H}`
                : `${x0},${y} ${x0 + W},${y} ${x0 + W / 2},${y + H}`;
              const share = topicProgress(topic, seen);
              const ty = up ? y + H * 0.68 : y + H * 0.32;
              const words = topic.short.split(" ");
              return (
                <g
                  key={topic.id}
                  className="cursor-pointer"
                  onClick={() => void navigate(topic.path)}
                >
                  <polygon
                    points={pts}
                    fill={`var(--tier-${ROW_TIER[r] ?? 8})`}
                    fillOpacity={0.22 + share * 0.6}
                    className="stroke-raised transition-[fill-opacity] hover:fill-opacity-90"
                    strokeWidth={3}
                  />
                  {words.length > 1 && topic.short.length > 10 ? (
                    <text
                      x={x0 + W / 2}
                      y={ty - 6}
                      textAnchor="middle"
                      className="fill-fg text-[11px] font-semibold"
                    >
                      <tspan x={x0 + W / 2}>
                        {words.slice(0, Math.ceil(words.length / 2)).join(" ")}
                      </tspan>
                      <tspan x={x0 + W / 2} dy={13}>
                        {words.slice(Math.ceil(words.length / 2)).join(" ")}
                      </tspan>
                    </text>
                  ) : (
                    <text
                      x={x0 + W / 2}
                      y={ty}
                      textAnchor="middle"
                      className="fill-fg text-[11px] font-semibold"
                    >
                      {topic.short}
                    </text>
                  )}
                  {share > 0 && (
                    <text
                      x={x0 + W / 2}
                      y={up ? ty + 22 : ty - 16}
                      textAnchor="middle"
                      className="fill-fg font-mono text-[10px]"
                    >
                      {share === 1 ? "✓" : `${Math.round(share * 100)}%`}
                    </text>
                  )}
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <section aria-labelledby="universe-list" className="space-y-3">
        <h2 id="universe-list" className="text-lg font-semibold tracking-tight">
          {t("universe.listTitle")}
        </h2>
        <ol className="space-y-3">
          {PYRAMID.map((row, r) => (
            <li key={r} className="rounded-panel border border-line bg-raised p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-[3px]"
                  style={{ background: `var(--tier-${ROW_TIER[r] ?? 8})` }}
                />
                {t("universe.row", { n: r + 1 })}
              </p>
              <ul className="flex flex-wrap gap-2">
                {row.map((topic) => (
                  <TopicChip key={topic.id} topic={topic} seen={seen} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function TopicChip({ topic, seen }: { topic: Topic; seen: (path: string) => boolean }) {
  const { t } = useTranslation();
  const total = topic.pages.length;
  const done = topic.pages.filter((p) => seen(p.path)).length;
  return (
    <li>
      <Link
        to={topic.path}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-accent"
      >
        {topic.title}
        {total > 0 && (
          <span className="font-mono text-xs text-muted">
            {t("universe.done", { done, total })}
          </span>
        )}
      </Link>
    </li>
  );
}
