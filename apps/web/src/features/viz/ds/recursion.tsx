import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { cmd, type OpForm } from "./ops";
import { choices, StepLog, type DsStep } from "./steps";

/* ------------------------------ Call stack ------------------------------ */

export const RECURSION_CODE: readonly string[] = [
  "def factorial(n):",
  "    if n <= 1:",
  "        return 1  # base case",
  "    return n * factorial(n - 1)",
  "",
  "def total(n):",
  "    if n == 0:",
  "        return 0  # base case",
  "    return n + total(n - 1)",
];

export type RecursionOp = { kind: "factorial" | "total"; n: number };

export const RECURSION_FORMS: readonly OpForm<RecursionOp>[] = (
  ["factorial", "total"] as const
).map((kind) => ({
  pattern: cmd(`${kind} (\\d{1,2})`),
  build: (m) => {
    const n = Number(m[1]);
    return n <= 10 ? { kind, n } : null;
  },
}));

export type Frame = {
  name: string;
  n: number;
  /** Set once the frame knows its answer. */
  value: number | null;
};

export type RecursionState = { frames: readonly Frame[]; maxDepth: number };

const FN = {
  factorial: {
    base: (n: number) => n <= 1,
    baseValue: () => 1,
    combine: (n: number, r: number) => n * r,
    op: "×",
    lines: [4, 3, 4],
  },
  total: {
    base: (n: number) => n === 0,
    baseValue: () => 0,
    combine: (n: number, r: number) => n + r,
    op: "+",
    lines: [9, 8, 9],
  },
} as const;

export function recursionSteps(_start: readonly string[], ops: readonly RecursionOp[]) {
  let frames: Frame[] = [];
  let maxDepth = 0;
  const log = new StepLog<RecursionState>(() => ({
    frames: frames.map((f) => ({ ...f })),
    maxDepth,
  }));

  log.add(0, "start");
  for (const op of ops) {
    frames = [];
    maxDepth = 0;
    const fn = FN[op.kind];
    const [callLine, baseLine, returnLine] = fn.lines;
    const call = (n: number): number => {
      const name = `${op.kind}(${n})`;
      frames.push({ name, n, value: null });
      maxDepth = Math.max(maxDepth, frames.length);
      if (fn.base(n)) {
        const v = fn.baseValue();
        (frames.at(-1) as Frame).value = v;
        log.add(baseLine, "base", { name, value: v, depth: frames.length });
        frames.pop();
        return v;
      }
      log.add(callLine, "call", { name, next: `${op.kind}(${n - 1})`, depth: frames.length });
      const r = call(n - 1);
      const v = fn.combine(n, r);
      (frames.at(-1) as Frame).value = v;
      log.add(
        returnLine,
        "return",
        { name, n, op: fn.op, r, value: v },
        {
          say: { key: "qReturn", vars: { name } },
          options: choices([String(v), String(n), String(r), String(n + r), String(n * r)]),
          correct: String(v),
        },
      );
      frames.pop();
      return v;
    };
    const result = call(op.n);
    log.add(0, "result", { name: `${op.kind}(${op.n})`, value: result, depth: maxDepth });
  }
  frames = [];
  log.add(0, "end");
  return log.steps;
}

function FramesView({ s }: { s: DsStep<RecursionState> }) {
  const { t } = useTranslation();
  const frames = s.state.frames;
  return (
    <div className="flex flex-col items-center py-2">
      <p className="mb-1 text-xs font-semibold text-muted">{t("viz.ds.recursion.stackTitle")}</p>
      <ol
        aria-label={t("viz.ds.recursion.stackTitle")}
        className="flex min-h-24 w-80 max-w-full flex-col-reverse gap-1 rounded-b-panel border-x-2 border-b-2 border-control p-2"
      >
        {frames.length === 0 && (
          <li className="py-6 text-center text-xs text-muted">{t("viz.ds.view.empty")}</li>
        )}
        {frames.map((f, i) => {
          const top = i === frames.length - 1;
          return (
            <li
              key={`${f.name}-${i}`}
              className={`flex items-center justify-between gap-4 rounded-control border-2 px-3 py-2 font-mono text-sm transition-all duration-300 ${
                f.value !== null
                  ? "border-found bg-found-soft text-found-ink"
                  : top
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-raised"
              }`}
            >
              <span className="font-semibold">{f.name}</span>
              <span className="text-right font-sans text-xs">
                {f.value !== null
                  ? t("viz.ds.recursion.frameReturns", { value: f.value })
                  : top
                    ? t("viz.ds.recursion.frameRunning")
                    : t("viz.ds.recursion.frameWaiting")}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RecursionPlayer() {
  return (
    <DsPlayer
      prefix="recursion"
      code={RECURSION_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "factorial 6" },
        { key: "deeper", start: "", ops: "factorial 10" },
        { key: "total", start: "", ops: "total 8" },
        { key: "card", start: "", ops: "factorial 3" },
      ]}
      forms={RECURSION_FORMS}
      run={recursionSteps}
      stage={(s: DsStep<RecursionState>) => <FramesView s={s} />}
      vars={(s) => [
        { name: "depth", value: s.state.frames.length },
        { name: "max depth", value: s.state.maxDepth },
      ]}
    />
  );
}

/* ------------------------------ Tower of Hanoi ------------------------------ */

export const HANOI_CODE: readonly string[] = [
  "def hanoi(n, source, target, spare):",
  "    if n == 0:",
  "        return",
  "    hanoi(n - 1, source, spare, target)",
  "    print(f'move disk {n}: {source} -> {target}')",
  "    hanoi(n - 1, spare, target, source)",
];

export type HanoiOp = { kind: "hanoi"; n: number };

export const HANOI_FORMS: readonly OpForm<HanoiOp>[] = [
  { pattern: cmd("hanoi ([1-5])"), build: (m) => ({ kind: "hanoi", n: Number(m[1]) }) },
];

const PEGS = ["A", "B", "C"] as const;
export type Peg = (typeof PEGS)[number];

export type HanoiState = {
  /** Disks on each peg, bottom to top (bigger numbers are bigger disks). */
  pegs: Readonly<Record<Peg, readonly number[]>>;
  moving: number | null;
  moves: number;
  call: string | null;
};

export function hanoiSteps(_start: readonly string[], ops: readonly HanoiOp[]) {
  let pegs: Record<Peg, number[]> = { A: [], B: [], C: [] };
  let moving: number | null = null;
  let moves = 0;
  let call: string | null = null;
  const log = new StepLog<HanoiState>(() => ({
    pegs: { A: [...pegs.A], B: [...pegs.B], C: [...pegs.C] },
    moving,
    moves,
    call,
  }));

  for (const op of ops) {
    pegs = { A: Array.from({ length: op.n }, (_, i) => op.n - i), B: [], C: [] };
    moving = null;
    moves = 0;
    call = `hanoi(${op.n}, A, C, B)`;
    log.add(1, "start", { n: op.n, min: 2 ** op.n - 1 });
    const solve = (n: number, source: Peg, target: Peg, spare: Peg) => {
      if (n === 0) return;
      solve(n - 1, source, spare, target);
      const disk = pegs[source].pop() as number;
      pegs[target].push(disk);
      moves++;
      moving = disk;
      call = `hanoi(${n}, ${source}, ${target}, ${spare})`;
      log.add(
        5,
        n === 1 ? "moveSmall" : "move",
        { disk, source, target, spare, below: n - 1, moves },
        { say: { key: "qPeg", vars: { disk, source } }, options: [...PEGS], correct: target },
      );
      solve(n - 1, spare, target, source);
    };
    solve(op.n, "A", "C", "B");
    moving = null;
    call = null;
    log.add(0, "done", { n: op.n, moves });
  }
  return log.steps;
}

const PEG_W = 120;
const DISK_H = 18;

function HanoiView({ s }: { s: DsStep<HanoiState> }) {
  const { t } = useTranslation();
  const { pegs, moving } = s.state;
  const total = PEGS.reduce((n, p) => n + pegs[p].length, 0);
  const height = Math.max(4, total) * DISK_H + 40;
  const where = new Map<number, { peg: number; level: number }>();
  PEGS.forEach((p, i) => pegs[p].forEach((d, level) => where.set(d, { peg: i, level })));
  const disks = [...where.keys()].sort((a, b) => a - b);
  return (
    <div className="w-full overflow-x-auto py-2">
      <div aria-hidden="true" className="relative mx-auto" style={{ width: PEG_W * 3, height }}>
        {PEGS.map((p, i) => (
          <div key={p}>
            <div
              className="absolute bottom-6 w-1.5 rounded-t bg-control"
              style={{ left: i * PEG_W + PEG_W / 2 - 3, height: height - 30 }}
            />
            <span
              className="absolute bottom-0 text-center font-mono text-xs font-semibold text-muted"
              style={{ left: i * PEG_W, width: PEG_W }}
            >
              {p}
            </span>
          </div>
        ))}
        <div className="absolute right-2 bottom-6 left-2 h-1 rounded bg-control" />
        {disks.map((d) => {
          const pos = where.get(d) as { peg: number; level: number };
          // Disk 5 (the largest allowed) is 116 px, just inside its 120 px peg slot.
          const w = 26 + d * 18;
          return (
            <div
              key={d}
              className={`absolute grid place-items-center rounded-control border-2 font-mono text-xs font-semibold transition-all duration-500 ease-in-out ${
                moving === d
                  ? "border-compare bg-compare-soft text-compare-ink"
                  : "border-accent bg-accent-soft text-accent-ink"
              }`}
              style={{
                width: w,
                height: DISK_H - 2,
                left: pos.peg * PEG_W + PEG_W / 2 - w / 2,
                bottom: 28 + pos.level * DISK_H,
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      <ol aria-label={t("viz.ds.hanoi.pegsLabel")} className="sr-only">
        {PEGS.map((p) => (
          <li key={p}>
            {t("viz.ds.hanoi.pegContents", {
              peg: p,
              disks: pegs[p].length ? pegs[p].join(", ") : t("viz.ds.view.empty"),
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HanoiPlayer() {
  return (
    <DsPlayer
      prefix="hanoi"
      code={HANOI_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "hanoi 3" },
        { key: "three", start: "", ops: "hanoi 4" },
        { key: "four", start: "", ops: "hanoi 5" },
        { key: "card", start: "", ops: "hanoi 2" },
      ]}
      forms={HANOI_FORMS}
      run={hanoiSteps}
      stage={(s: DsStep<HanoiState>) => <HanoiView s={s} />}
      vars={(s) => [
        { name: "call", value: s.state.call ?? "—" },
        { name: "moves", value: s.state.moves },
      ]}
    />
  );
}
