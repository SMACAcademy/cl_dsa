import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { cmd, type OpForm } from "./ops";
import { StepLog, type DsStep, type Question } from "./steps";
import { TreeView, type DrawNode, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

/* ---------------------------- Activity selection ---------------------------- */

export const ACTIVITY_CODE: readonly string[] = [
  "def select(meetings):",
  "    chosen, free_at = [], 0",
  "    for start, end in sorted(meetings, key=lambda m: m[1]):",
  "        if start >= free_at:",
  "            chosen.append((start, end))",
  "            free_at = end",
  "    return chosen",
];

export type Meeting = { id: number; start: number; end: number };
export type MeetingOp = { start: number; end: number };

export const MEETING_FORMS: readonly OpForm<MeetingOp>[] = [
  {
    pattern: cmd(String.raw`(\d{1,2})\s*[-–]\s*(\d{1,2})`),
    build: (m) => {
      const start = Number(m[1]);
      const end = Number(m[2]);
      return end > start && end <= 24 ? { start, end } : null;
    },
  },
];

export type ActivityState = {
  meetings: readonly Meeting[];
  chosen: readonly number[];
  skipped: readonly number[];
  current: number | null;
  freeAt: number;
};

const span = (m: { start: number; end: number }) => `${m.start}–${m.end}`;

export function activitySteps(_start: readonly string[], ops: readonly MeetingOp[]) {
  const meetings = ops
    .map((o, id) => ({ id, ...o }))
    .sort((a, b) => a.end - b.end || a.start - b.start);
  const chosen: number[] = [];
  const skipped: number[] = [];
  let current: number | null = null;
  let freeAt = 0;
  const log = new StepLog<ActivityState>(() => ({
    meetings,
    chosen: [...chosen],
    skipped: [...skipped],
    current,
    freeAt,
  }));
  log.add(3, "start", { order: meetings.map(span).join(", ") });
  for (const m of meetings) {
    current = m.id;
    const fits = m.start >= freeAt;
    const q: Question = {
      say: { key: "qTake", vars: { span: span(m), freeAt } },
      options: ["✓", "✗"],
      correct: fits ? "✓" : "✗",
    };
    if (fits) {
      chosen.push(m.id);
      const before = freeAt;
      freeAt = m.end;
      log.add(6, "take", { span: span(m), before, freeAt }, q);
    } else {
      skipped.push(m.id);
      log.add(4, "skip", { span: span(m), freeAt }, q);
    }
  }
  current = null;
  log.add(7, "end", {
    count: chosen.length,
    total: meetings.length,
    list: meetings
      .filter((m) => chosen.includes(m.id))
      .map(span)
      .join(", "),
  });
  return log.steps;
}

function Timeline({ s }: { s: DsStep<ActivityState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const max = Math.max(1, ...st.meetings.map((m) => m.end));
  const pct = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="mx-auto w-full max-w-lg py-2">
      <ol aria-label={t("viz.ds.activity.timeline")} className="space-y-1.5">
        {st.meetings.map((m) => {
          // The decision (chosen / skipped) shows at once; a ring marks the meeting just decided.
          const state = st.chosen.includes(m.id)
            ? "chosen"
            : st.skipped.includes(m.id)
              ? "skipped"
              : st.current === m.id
                ? "current"
                : "idle";
          const ring = st.current === m.id ? " ring-2 ring-compare ring-offset-1" : "";
          const cls = {
            current: "border-compare bg-compare-soft text-compare-ink",
            chosen: "border-found bg-found-soft text-found-ink",
            skipped: "border-dashed border-line bg-sunken text-muted opacity-60",
            idle: "border-line bg-raised",
          }[state];
          return (
            <li key={m.id} className="relative h-7">
              <span
                className={`absolute top-0 flex h-7 items-center justify-center rounded-control border-2 font-mono text-xs font-semibold transition-colors duration-300 ${cls}${ring}`}
                style={{ left: pct(m.start), width: `calc(${pct(m.end - m.start)} - 2px)` }}
              >
                {span(m)}
                {state === "chosen" && <span aria-hidden="true">&nbsp;✓</span>}
                {state === "skipped" && <span aria-hidden="true">&nbsp;✗</span>}
              </span>
              <span className="sr-only">
                {t("viz.ds.activity.meeting", {
                  span: span(m),
                  state: t(`viz.ds.activity.state.${state}`),
                })}
              </span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="relative mt-2 h-6 border-t-2 border-control">
        {Array.from({ length: max + 1 }, (_, x) => (
          <span
            key={x}
            className="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-muted"
            style={{ left: pct(x) }}
          >
            {x}
          </span>
        ))}
        <span
          className="absolute -top-2 h-3 w-0.5 -translate-x-1/2 bg-accent transition-all duration-300"
          style={{ left: pct(st.freeAt) }}
        />
      </div>
      <p className="text-center text-xs text-muted">
        {t("viz.ds.activity.freeAt", { t: st.freeAt })}
      </p>
    </div>
  );
}

export function ActivitySelectionPlayer() {
  return (
    <DsPlayer
      prefix="activity"
      code={ACTIVITY_CODE}
      startField={null}
      opsField="meetings"
      presets={[
        { key: "tour", start: "", ops: "1-3, 2-5, 4-6, 6-8" },
        { key: "long", start: "", ops: "0-10, 1-2, 3-4, 5-6, 7-8" },
        { key: "busy", start: "", ops: "1-4, 3-5, 0-6, 5-7, 3-9, 5-9, 6-10, 8-11" },
      ]}
      forms={MEETING_FORMS}
      run={activitySteps}
      stage={(s: DsStep<ActivityState>) => <Timeline s={s} />}
      vars={(s) => [
        { name: "free_at", value: s.state.freeAt },
        { name: "chosen", value: s.state.chosen.length },
      ]}
    />
  );
}

/* -------------------------------- Huffman coding -------------------------------- */

export const HUFFMAN_CODE: readonly string[] = [
  "import heapq",
  "from itertools import count",
  "",
  "def huffman(freq):",
  "    order = count()  # breaks ties, so subtrees are never compared",
  "    heap = [(f, next(order), ch) for ch, f in freq.items()]",
  "    heapq.heapify(heap)",
  "    while len(heap) > 1:",
  "        f1, _, a = heapq.heappop(heap)  # rarest",
  "        f2, _, b = heapq.heappop(heap)  # next rarest",
  "        heapq.heappush(heap, (f1 + f2, next(order), (b, a)))  # a goes right (1)",
  "    return heap[0][2]  # root of the code tree",
];

export type FreqOp = { ch: string; f: number };

export const FREQ_FORMS: readonly OpForm<FreqOp>[] = [
  {
    pattern: cmd(String.raw`([a-zA-Z])\s*[:=]?\s*(\d{1,2})`),
    build: (m) =>
      Number(m[2]) > 0 ? { ch: (m[1] as string).toLowerCase(), f: Number(m[2]) } : null,
  },
];

type HNode = {
  id: number;
  weight: number;
  ch: string | null;
  left: number | null;
  right: number | null;
};

export type HuffmanState = {
  nodes: Readonly<Record<number, HNode>>;
  /** Subtree roots still in the heap, in heap order (lightest first). */
  heap: readonly number[];
  marks: Readonly<Record<number, NodeState>>;
  codes: Readonly<Record<string, string>> | null;
};

const letters = (nodes: Readonly<Record<number, HNode>>, id: number): string => {
  const n = nodes[id] as HNode;
  return n.ch ?? letters(nodes, n.left as number) + letters(nodes, n.right as number);
};

export function huffmanSteps(_start: readonly string[], ops: readonly FreqOp[]) {
  const nodes: Record<number, HNode> = {};
  const seen = new Set<string>();
  let nextId = 0;
  for (const { ch, f } of ops) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    const id = nextId++;
    nodes[id] = { id, weight: f, ch, left: null, right: null };
  }
  /** Heap order: lighter first; ties go to the older subtree. */
  const order = (a: number, b: number) =>
    (nodes[a] as HNode).weight - (nodes[b] as HNode).weight || a - b;
  let heap = Object.keys(nodes).map(Number).sort(order);
  let marks: Record<number, NodeState> = {};
  let codes: Record<string, string> | null = null;
  const log = new StepLog<HuffmanState>(() => ({
    nodes: Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { ...n }])),
    heap: [...heap],
    marks: { ...marks },
    codes: codes ? { ...codes } : null,
  }));
  const label = (id: number) => `${letters(nodes, id)}:${(nodes[id] as HNode).weight}`;

  log.add(7, "start", { heap: heap.map(label).join(", ") });
  while (heap.length > 1) {
    const [a, b] = heap as [number, number];
    const q: Question = {
      say: { key: "qRarest" },
      options: heap.map(label),
      correct: label(a),
    };
    const id = nextId++;
    const wa = (nodes[a] as HNode).weight;
    const wb = (nodes[b] as HNode).weight;
    nodes[id] = { id, weight: wa + wb, ch: null, left: b, right: a };
    heap = [...heap.slice(2), id].sort(order);
    marks = { [id]: "new", [a]: "changed", [b]: "changed" };
    log.add(11, "merge", { a: label(a), b: label(b), w: wa + wb }, q);
  }

  // Read the codes off the tree: left edges are 0, right edges are 1.
  const root = heap[0];
  codes = {};
  const walk = (id: number, code: string) => {
    const n = nodes[id] as HNode;
    if (n.ch !== null) {
      (codes as Record<string, string>)[n.ch] = code || "0";
      return;
    }
    walk(n.left as number, `${code}0`);
    walk(n.right as number, `${code}1`);
  };
  if (root !== undefined) walk(root, "");
  marks = {};
  const leaves = Object.values(nodes).filter((n) => n.ch !== null);
  const bits = leaves.reduce(
    (sum, n) =>
      sum + n.weight * ((codes as Record<string, string>)[n.ch as string] as string).length,
    0,
  );
  const count = leaves.reduce((sum, n) => sum + n.weight, 0);
  const fixed = Math.max(1, Math.ceil(Math.log2(Math.max(leaves.length, 2)))) * count;
  log.add(12, "codes", {
    codes: leaves
      .sort((x, y) => (x.ch as string).localeCompare(y.ch as string))
      .map((n) => `${n.ch} = ${(codes as Record<string, string>)[n.ch as string]}`)
      .join(", "),
    bits,
    fixed,
  });
  return log.steps;
}

/** All current subtrees as one forest (under a hidden root), with 0/1 on the edges. */
function forest(st: HuffmanState): DrawTree {
  const HIDDEN = -1;
  const draw: Record<number, DrawNode> = {};
  const add = (id: number, edge?: string) => {
    const n = st.nodes[id] as HNode;
    draw[id] = {
      id,
      label: n.ch ?? String(n.weight),
      sub: n.ch ? String(n.weight) : undefined,
      kids: n.ch ? [] : [n.left, n.right],
      edge,
      ringed: n.ch !== null && st.codes !== null,
    };
    if (n.left !== null) add(n.left, "0");
    if (n.right !== null) add(n.right, "1");
  };
  st.heap.forEach((id) => add(id));
  draw[HIDDEN] = { id: HIDDEN, label: "", kids: [...st.heap] };
  return { root: HIDDEN, nodes: draw };
}

function HuffmanStage({ s }: { s: DsStep<HuffmanState> }) {
  const { t } = useTranslation();
  const st = s.state;
  return (
    <>
      <TreeView
        tree={forest(st)}
        binary={false}
        hideRoot
        stateOf={(id) => st.marks[id] ?? "idle"}
        label={t("viz.ds.view.tree")}
      />
      {st.codes && (
        <p className="text-center font-mono text-sm">
          {Object.entries(st.codes)
            .sort(([x], [y]) => x.localeCompare(y))
            .map(([ch, code]) => `${ch} = ${code}`)
            .join("   ")}
        </p>
      )}
    </>
  );
}

export function HuffmanPlayer() {
  return (
    <DsPlayer
      prefix="huffman"
      code={HUFFMAN_CODE}
      startField={null}
      opsField="freqs"
      presets={[
        { key: "tour", start: "", ops: "a 5, b 2, c 1" },
        { key: "word", start: "", ops: "a 3, b 1, n 2" },
        { key: "even", start: "", ops: "w 4, x 4, y 4, z 4" },
      ]}
      forms={FREQ_FORMS}
      run={huffmanSteps}
      stage={(s: DsStep<HuffmanState>) => <HuffmanStage s={s} />}
      vars={(s) => [{ name: "len(heap)", value: s.state.heap.length }]}
    />
  );
}
