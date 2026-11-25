import { Play, RotateCcw, Square, SquareTerminal } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { PROJECTS } from "../projects/projects";
import { EXAMPLES, type Example } from "./examples";
import type { FromWorker, ToWorker } from "./python.worker";

const ALL: readonly Example[] = [
  ...EXAMPLES,
  ...PROJECTS.map((p) => ({ id: p.id, title: `Project: ${p.title}`, code: p.code })),
];

type Line = { kind: "out" | "err" | "info"; text: string };
type Status = "idle" | "loading" | "running";

const button =
  "inline-flex h-9 items-center gap-2 rounded-control border border-line bg-raised px-3 text-sm hover:border-accent disabled:opacity-50";

/** The Python Playground: real Python (Pyodide) in a worker, with examples and project starters. */
export function PlaygroundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t("nav.playground"));
  const [params, setParams] = useSearchParams();
  const initial = ALL.find((e) => e.id === params.get("example")) ?? (ALL[0] as Example);
  const [exampleId, setExampleId] = useState(initial.id);
  const [code, setCode] = useState(initial.code);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const worker = useRef<Worker | null>(null);
  const runId = useRef(0);
  const editorId = useId();
  const pickId = useId();
  const supported = typeof Worker !== "undefined";

  useEffect(() => () => worker.current?.terminate(), []);

  const ensureWorker = () => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (event: MessageEvent<FromWorker>) => {
      const m = event.data;
      if (m.id !== runId.current) return;
      switch (m.type) {
        case "status":
          setStatus(m.text);
          break;
        case "out":
        case "err": {
          const line: Line = { kind: m.type, text: m.text };
          setLines((l) => [...l, line]);
          break;
        }
        case "error": {
          const line: Line = { kind: "err", text: m.text };
          setLines((l) => [...l, line]);
          setStatus("idle");
          break;
        }
        case "done": {
          const line: Line = {
            kind: "info",
            text: t("playground.finished", { ms: Math.round(m.ms) }),
          };
          setLines((l) => [...l, line]);
          setStatus("idle");
          break;
        }
      }
    };
    worker.current = w;
    return w;
  };

  const run = () => {
    if (!supported || status !== "idle") return;
    runId.current += 1;
    setLines([]);
    setStatus("running");
    ensureWorker().postMessage({ id: runId.current, code } satisfies ToWorker);
  };

  const stop = () => {
    worker.current?.terminate();
    worker.current = null;
    runId.current += 1;
    setStatus("idle");
    setLines((l) => [...l, { kind: "info", text: t("playground.stopped") }]);
  };

  const pick = (id: string) => {
    const ex = ALL.find((e) => e.id === id);
    if (!ex) return;
    setExampleId(id);
    setCode(ex.code);
    setLines([]);
    setParams({ example: id }, { replace: true });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      const next = `${code.slice(0, s)}    ${code.slice(end)}`;
      setCode(next);
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-accent-soft text-accent-ink">
          <SquareTerminal className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.playground")}</h1>
          <p className="max-w-prose text-muted">{t("playground.intro")}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={pickId} className="text-sm font-medium">
            {t("playground.example")}
          </label>
          <select
            id={pickId}
            value={exampleId}
            onChange={(e) => pick(e.target.value)}
            className="h-9 rounded-control border border-control bg-raised px-2 text-sm"
          >
            {ALL.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!supported || status !== "idle"}
          className="inline-flex h-9 items-center gap-2 rounded-control bg-accent-solid px-4 text-sm font-medium text-on-accent disabled:opacity-50"
        >
          <Play className="size-4" aria-hidden="true" />
          {t("playground.run")}
        </button>
        <button type="button" onClick={stop} disabled={status === "idle"} className={button}>
          <Square className="size-4" aria-hidden="true" />
          {t("playground.stop")}
        </button>
        <button type="button" onClick={() => pick(exampleId)} className={button}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("playground.reset")}
        </button>
        <span className="text-xs text-muted">{t("playground.shortcut")}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={editorId} className="text-sm font-medium">
            {t("playground.editor")}
          </label>
          <textarea
            id={editorId}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="min-h-96 flex-1 resize-y rounded-panel border border-control bg-raised p-3 font-mono text-sm leading-relaxed"
          />
        </div>
        <section aria-label={t("playground.output")} className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("playground.output")}</p>
          <pre
            aria-live="polite"
            className="min-h-96 flex-1 overflow-auto rounded-panel border border-line bg-sunken p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap"
          >
            {!supported && <span className="text-compare-ink">{t("playground.unsupported")}</span>}
            {status === "loading" && <span className="text-muted">{t("playground.loading")}</span>}
            {lines.length === 0 && status === "idle" && supported && (
              <span className="text-muted">{t("playground.empty")}</span>
            )}
            {lines.map((l, i) => (
              <span
                key={i}
                className={`block ${l.kind === "err" ? "text-compare-ink" : l.kind === "info" ? "text-muted italic" : ""}`}
              >
                {l.text}
              </span>
            ))}
          </pre>
        </section>
      </div>
      <p className="text-xs text-muted">{t("playground.note")}</p>
    </div>
  );
}
