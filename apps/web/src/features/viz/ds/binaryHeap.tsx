import { ArrayView, type CellState } from "../ArrayView";
import type { BarState } from "../BarsView";
import { HeapTree } from "../HeapTree";
import { DsPlayer } from "./DsPlayer";
import { cmd, N, numbersOnly, type OpForm } from "./ops";
import { choices, pyList, StepLog, type DsStep } from "./steps";

export const MIN_HEAP_CODE: readonly string[] = [
  "def push(heap, x):",
  "    heap.append(x)",
  "    i = len(heap) - 1",
  "    while i > 0 and heap[(i - 1) // 2] > heap[i]:",
  "        p = (i - 1) // 2",
  "        heap[i], heap[p] = heap[p], heap[i]",
  "        i = p",
  "",
  "def pop(heap):",
  "    top, last = heap[0], heap.pop()",
  "    if heap:",
  "        heap[0] = last",
  "        i = 0",
  "        while 2 * i + 1 < len(heap):",
  "            c = 2 * i + 1",
  "            if c + 1 < len(heap) and heap[c + 1] < heap[c]:",
  "                c += 1",
  "            if heap[i] <= heap[c]:",
  "                break",
  "            heap[i], heap[c] = heap[c], heap[i]",
  "            i = c",
  "    return top",
  "",
  "def peek(heap):",
  "    return heap[0]",
];

export type HeapOp = { kind: "insert"; x: string } | { kind: "extract" } | { kind: "peek" };

export const HEAP_FORMS: readonly OpForm<HeapOp>[] = [
  { pattern: cmd(`insert ${N}`), build: (m) => ({ kind: "insert", x: m[1] as string }) },
  { pattern: cmd("extract"), build: () => ({ kind: "extract" }) },
  { pattern: cmd("peek"), build: () => ({ kind: "peek" }) },
];

export type HeapState = { values: readonly number[]; marks: Readonly<Record<number, BarState>> };

/** Builds a min-heap by pushing values one at a time (no steps). */
function pushQuiet(heap: number[], x: number) {
  heap.push(x);
  let i = heap.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if ((heap[p] as number) <= (heap[i] as number)) break;
    [heap[i], heap[p]] = [heap[p] as number, heap[i] as number];
    i = p;
  }
}

export function minHeapSteps(start: readonly string[], ops: readonly HeapOp[]) {
  const heap: number[] = [];
  for (const v of start) pushQuiet(heap, Number(v));
  let marks: Record<number, BarState> = {};
  const log = new StepLog<HeapState>(() => ({ values: [...heap], marks: { ...marks } }));
  const list = () => pyList(heap.map(String));
  const indexOptions = () => Array.from({ length: heap.length }, (_, i) => String(i));

  log.add(0, "start", { list: list() });
  for (const op of ops) {
    marks = {};
    if (op.kind === "insert") {
      const x = Number(op.x);
      heap.push(x);
      let i = heap.length - 1;
      marks = { [i]: "key" };
      log.add(2, "append", { x, i });
      // Where x ends up, for the prediction asked before the last step of this push.
      const copy = [...heap];
      let settle = i;
      while (settle > 0 && (copy[Math.floor((settle - 1) / 2)] as number) > x) {
        const p = Math.floor((settle - 1) / 2);
        [copy[settle], copy[p]] = [copy[p] as number, copy[settle] as number];
        settle = p;
      }
      for (;;) {
        if (i === 0) {
          marks = { 0: "minimum" };
          log.add(
            4,
            "reachedTop",
            { x },
            {
              say: { key: "qSettle", vars: { x } },
              options: indexOptions(),
              correct: String(settle),
            },
          );
          break;
        }
        const p = Math.floor((i - 1) / 2);
        const pv = heap[p] as number;
        if (pv > x) {
          [heap[i], heap[p]] = [pv, x];
          marks = { [i]: "swapping", [p]: "swapping" };
          log.add(6, "swapUp", { x, pv, p });
          i = p;
        } else {
          marks = { [i]: "key", [p]: "comparing" };
          log.add(
            4,
            "stayUp",
            { x, pv, i },
            {
              say: { key: "qSettle", vars: { x } },
              options: indexOptions(),
              correct: String(settle),
            },
          );
          break;
        }
      }
    } else if (heap.length === 0) {
      log.add(op.kind === "extract" ? 10 : 25, "empty");
    } else if (op.kind === "peek") {
      marks = { 0: "minimum" };
      log.add(
        25,
        "peek",
        { top: heap[0] as number },
        { say: { key: "qTop" }, options: choices(heap.map(String)), correct: String(heap[0]) },
      );
    } else {
      const top = heap[0] as number;
      const options = choices(heap.map(String));
      marks = { 0: "minimum" };
      log.add(10, "top", { top }, { say: { key: "qTop" }, options, correct: String(top) });
      const last = heap.pop() as number;
      if (heap.length > 0) {
        heap[0] = last;
        marks = { 0: "key" };
        log.add(12, "moveLast", { last });
        let i = 0;
        while (2 * i + 1 < heap.length) {
          let c = 2 * i + 1;
          if (c + 1 < heap.length && (heap[c + 1] as number) < (heap[c] as number)) c += 1;
          const cv = heap[c] as number;
          const iv = heap[i] as number;
          if (iv <= cv) {
            marks = { [i]: "key", [c]: "comparing" };
            log.add(19, "stayDown", { v: iv, c: cv });
            break;
          }
          [heap[i], heap[c]] = [cv, iv];
          marks = { [i]: "swapping", [c]: "swapping" };
          log.add(20, "swapDown", { v: iv, c: cv });
          i = c;
        }
      }
      marks = {};
      log.add(22, "extracted", { top, list: list() });
    }
  }
  marks = {};
  log.add(0, "end", { list: list() });
  return log.steps;
}

const toCell: Record<BarState, CellState> = {
  idle: "idle",
  minimum: "found",
  key: "comparing",
  pivot: "comparing",
  comparing: "comparing",
  swapping: "comparing",
  sorted: "found",
  outside: "outside",
};

export function MinHeapPlayer() {
  return (
    <DsPlayer
      prefix="heap"
      code={MIN_HEAP_CODE}
      startField="values"
      validateStart={numbersOnly}
      presets={[
        { key: "tour", start: "", ops: "insert 5, insert 3, insert 8, insert 1, extract" },
        { key: "pq", start: "4, 9, 2, 7", ops: "peek, extract, extract, peek" },
        { key: "sink", start: "1, 2, 3, 4, 5, 6, 7", ops: "extract" },
      ]}
      forms={HEAP_FORMS}
      run={minHeapSteps}
      stage={(s: DsStep<HeapState>) => (
        <>
          <HeapTree
            values={s.state.values}
            heapSize={s.state.values.length}
            stateAt={(i) => s.state.marks[i] ?? "idle"}
          />
          <ArrayView
            label="heap"
            items={s.state.values}
            stateOf={(i) => toCell[s.state.marks[i] ?? "idle"]}
            markerRow={false}
          />
        </>
      )}
      vars={(s) => [
        { name: "len(heap)", value: s.state.values.length },
        { name: "heap[0]", value: s.state.values[0] ?? "—" },
      ]}
    />
  );
}
