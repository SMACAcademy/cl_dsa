import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { cmd, N, V, type OpForm, type OpsError } from "./ops";
import { validateCapacity } from "./ringBuffer";
import { choices, StepLog, type DsStep, type Question } from "./steps";
import { ChainView, type ChainNode, type NodeState } from "./views";

/* ---------------------------------- LRU cache ---------------------------------- */

export const LRU_CODE: readonly string[] = [
  "from collections import OrderedDict  # a dict + a doubly linked list",
  "class LRUCache:",
  "    def __init__(self, capacity):",
  "        self.cap, self.items = capacity, OrderedDict()",
  "    def get(self, key):",
  "        if key not in self.items:",
  "            return -1  # miss",
  "        self.items.move_to_end(key)  # now the most recent",
  "        return self.items[key]",
  "    def put(self, key, value):",
  "        if key in self.items:",
  "            self.items.move_to_end(key)",
  "        self.items[key] = value",
  "        if len(self.items) > self.cap:",
  "            self.items.popitem(last=False)  # evict the least recent",
];

export type LruOp = { kind: "put"; key: string; value: number } | { kind: "get"; key: string };

export const LRU_FORMS: readonly OpForm<LruOp>[] = [
  {
    pattern: cmd(`put ${V} ${N}`),
    build: (m) => ({ kind: "put", key: m[1] as string, value: Number(m[2]) }),
  },
  { pattern: cmd(`get ${V}`), build: (m) => ({ kind: "get", key: m[1] as string }) },
];

type Entry = { id: number; key: string; value: number };

export type LruState = {
  cap: number;
  /** Least recent first; an evicted entry stays for one step, marked "removed". */
  nodes: readonly ChainNode[];
  keys: readonly string[];
  marks: Readonly<Record<number, NodeState>>;
  pointers: Readonly<Record<number, readonly string[]>>;
};

export function lruSteps(start: readonly string[], ops: readonly LruOp[]) {
  const cap = Number(start[0]);
  const order: Entry[] = [];
  let ghost: Entry | null = null;
  let marks: Record<number, NodeState> = {};
  let nextId = 0;
  const log = new StepLog<LruState>(() => {
    const shown = ghost ? [ghost, ...order] : order;
    const pointers: Record<number, string[]> = {};
    const first = order[0];
    const last = order.at(-1);
    if (first) pointers[first.id] = ["LRU"];
    if (last) pointers[last.id] = [...(pointers[last.id] ?? []), "MRU"];
    return {
      cap,
      nodes: shown.map((e) => ({ id: e.id, value: `${e.key}:${e.value}` })),
      keys: order.map((e) => e.key).sort(),
      marks: { ...marks },
      pointers,
    };
  });
  log.add(4, "start", { cap });
  const toEnd = (e: Entry) => {
    order.splice(order.indexOf(e), 1);
    order.push(e);
  };
  for (const op of ops) {
    const e = order.find((x) => x.key === op.key);
    if (op.kind === "get") {
      const options = choices([...order.map((x) => String(x.value)), "-1"]);
      const q: Question | undefined =
        options.length > 1
          ? {
              say: { key: "qGet", vars: { k: op.key } },
              options,
              correct: e ? String(e.value) : "-1",
            }
          : undefined;
      if (e) {
        toEnd(e);
        marks = { [e.id]: "found" };
        log.add(9, "hit", { k: op.key, v: e.value }, q);
      } else {
        marks = {};
        log.add(7, "miss", { k: op.key }, q);
      }
      continue;
    }
    if (e) {
      const old = e.value;
      toEnd(e);
      e.value = op.value;
      marks = { [e.id]: "changed" };
      log.add(13, "update", { k: op.key, old, v: op.value });
    } else {
      const fresh = { id: nextId++, key: op.key, value: op.value };
      order.push(fresh);
      marks = { [fresh.id]: "new" };
      log.add(13, "add", { k: op.key, v: op.value, size: order.length, cap });
    }
    if (order.length > cap) {
      const options = choices(order.slice(0, -1).map((x) => x.key));
      ghost = order.shift() as Entry;
      marks = { [ghost.id]: "removed" };
      log.add(
        15,
        "evict",
        { k: ghost.key, v: ghost.value, cap },
        { say: { key: "qEvict", vars: { k: op.key } }, options, correct: ghost.key },
      );
      ghost = null;
    }
  }
  marks = {};
  log.add(2, "end", { list: order.map((x) => x.key).join(", ") || "—", n: order.length, cap });
  return log.steps;
}

function LruStage({ s }: { s: DsStep<LruState> }) {
  const { t } = useTranslation();
  const st = s.state;
  return (
    <>
      <p className="text-center text-xs font-semibold text-muted">{t("viz.ds.lru.listTitle")}</p>
      <ChainView
        nodes={st.nodes}
        doubly
        stateOf={(id) => st.marks[id] ?? "idle"}
        pointers={st.pointers}
      />
      <p className="text-center font-mono text-sm">
        {t("viz.ds.lru.map", {
          keys: st.keys.length ? st.keys.join(", ") : "—",
          n: st.keys.length,
          cap: st.cap,
        })}
      </p>
    </>
  );
}

export function LruCachePlayer() {
  return (
    <DsPlayer
      prefix="lru"
      code={LRU_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      presets={[
        {
          key: "tour",
          start: "4",
          ops: "put a 1, put b 2, put c 3, put d 4, get a, put e 5, get b, get c, put f 6, get d, get a",
        },
        {
          key: "update",
          start: "3",
          ops: "put a 1, put b 2, put c 3, put a 5, put d 4, get b, get a, put c 9, put e 7, get d",
        },
        {
          key: "three",
          start: "5",
          ops: "put a 1, put b 2, put c 3, put d 4, put e 5, get a, put f 6, get b, get c, put g 7, get d, get a",
        },
        { key: "card", start: "2", ops: "put a 1, put b 2, get a, put c 3, get b" },
      ]}
      forms={LRU_FORMS}
      run={lruSteps}
      stage={(s: DsStep<LruState>) => <LruStage s={s} />}
      vars={(s) => [
        { name: "len(items)", value: s.state.keys.length },
        { name: "cap", value: s.state.cap },
      ]}
    />
  );
}

/* --------------------------------- Bloom filter --------------------------------- */

export const BLOOM_CODE: readonly string[] = [
  "class BloomFilter:",
  "    def __init__(self, m):",
  "        self.m, self.bits = m, [0] * m",
  "    def hashes(self, word):  # two pretend hash functions",
  "        codes = [ord(ch) - 96 for ch in word]  # a = 1 … z = 26",
  "        h1 = sum(codes) % self.m",
  "        h2 = sum(c * (i + 1) for i, c in enumerate(codes)) % self.m",
  "        return h1, h2",
  "    def add(self, word):",
  "        for h in self.hashes(word):",
  "            self.bits[h] = 1",
  "    def might_contain(self, word):",
  "        return all(self.bits[h] for h in self.hashes(word))",
];

export type BloomOp = { kind: "add" | "query"; word: string };

export const BLOOM_FORMS: readonly OpForm<BloomOp>[] = [
  {
    pattern: cmd("(add|query) ([a-z]{1,8})"),
    build: (m) => ({
      kind: (m[1] as string).toLowerCase() as "add" | "query",
      word: (m[2] as string).toLowerCase(),
    }),
  },
];

/** Bits: one whole number from 4 to 16. */
export function validateBits(start: string[]): OpsError | null {
  const [b, ...rest] = start;
  const n = Number(b);
  return rest.length === 0 && /^\d{1,2}$/.test(b ?? "") && n >= 4 && n <= 32
    ? null
    : { key: "badBits" };
}

/** The two pretend hash functions, with the arithmetic written out. */
export function bloomHashes(word: string, m: number) {
  const codes = word.split("").map((ch) => ch.charCodeAt(0) - 96);
  const sum = codes.reduce((s, c) => s + c, 0);
  const weighted = codes.reduce((s, c, i) => s + c * (i + 1), 0);
  return {
    h1: sum % m,
    h2: weighted % m,
    h1expr: `(${codes.join(" + ")}) % ${m}`,
    h2expr: `(${codes.map((c, i) => `${c}·${i + 1}`).join(" + ")}) % ${m}`,
  };
}

export type BloomState = {
  bits: readonly number[];
  /** Bits touched by the current step. */
  touched: readonly number[];
  query: boolean;
  added: readonly string[];
};

export function bloomSteps(start: readonly string[], ops: readonly BloomOp[]) {
  const m = Number(start[0]);
  const bits = new Array<number>(m).fill(0);
  let touched: number[] = [];
  let query = false;
  const added: string[] = [];
  const log = new StepLog<BloomState>(() => ({
    bits: [...bits],
    touched: [...touched],
    query,
    added: [...added],
  }));
  log.add(3, "start", { m });
  let falseAlarms = 0;
  for (const { kind, word } of ops) {
    const h = bloomHashes(word, m);
    touched = [h.h1, h.h2];
    const vars = { w: word, a: h.h1, b: h.h2, h1expr: h.h1expr, h2expr: h.h2expr };
    if (kind === "add") {
      query = false;
      bits[h.h1] = 1;
      bits[h.h2] = 1;
      if (!added.includes(word)) added.push(word);
      log.add(11, "add", vars);
    } else {
      query = true;
      const maybe = bits[h.h1] === 1 && bits[h.h2] === 1;
      const really = added.includes(word);
      if (maybe && !really) falseAlarms++;
      const zero = bits[h.h1] === 0 ? h.h1 : h.h2;
      log.add(
        13,
        !maybe ? "no" : really ? "maybe" : "falsePositive",
        { ...vars, zero },
        {
          say: { key: "qQuery", vars: { w: word, a: h.h1, b: h.h2 } },
          options: ["maybe", "no"],
          correct: maybe ? "maybe" : "no",
        },
      );
    }
  }
  touched = [];
  query = false;
  log.add(1, "end", {
    set: bits.filter((b) => b === 1).length,
    m,
    words: added.length,
    alarms: falseAlarms,
  });
  return log.steps;
}

type BitState = "idle" | "found" | "checked";
const BIT: Record<BitState, string> = {
  idle: "border-line bg-raised",
  found: "border-found bg-found-soft text-found-ink ring-2 ring-found",
  checked: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
};
const BIT_GLYPH: Record<BitState, string> = { idle: "", found: "✓", checked: "✗" };

function BloomStage({ s }: { s: DsStep<BloomState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const stateOf = (i: number): BitState => {
    if (!st.touched.includes(i)) return "idle";
    if (!st.query) return "found";
    return st.bits[i] === 1 ? "found" : "checked";
  };
  return (
    <>
      <ol
        aria-label={t("viz.ds.bloom.bits")}
        className="mx-auto grid w-full max-w-sm grid-cols-8 gap-1.5 py-2"
      >
        {st.bits.map((bit, i) => {
          const state = stateOf(i);
          return (
            <li key={i} className="flex flex-col items-center gap-1">
              <span
                className={`relative grid aspect-square w-full place-items-center rounded-control border-2 font-mono text-base font-semibold transition-all duration-300 ${BIT[state]}`}
              >
                {bit}
                {BIT_GLYPH[state] && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full border border-current bg-raised text-[9px]"
                  >
                    {BIT_GLYPH[state]}
                  </span>
                )}
                <span className="sr-only">
                  {t("viz.array.cell", {
                    index: i,
                    value: bit,
                    state: t(`viz.array.state.${state}`),
                  })}
                </span>
              </span>
              <span aria-hidden="true" className="font-mono text-[10px] text-muted">
                {i}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-center font-mono text-sm">
        {t("viz.ds.bloom.added", { words: st.added.length ? st.added.join(", ") : "—" })}
      </p>
    </>
  );
}

export function BloomFilterPlayer() {
  return (
    <DsPlayer
      prefix="bloom"
      code={BLOOM_CODE}
      startField="bits"
      validateStart={validateBits}
      presets={[
        {
          key: "tour",
          start: "16",
          ops: "add cat, add dog, add eel, add fox, add owl, add bee, query bat, query cow, query ant, query cat",
        },
        {
          key: "bigger",
          start: "32",
          ops: "add cat, add dog, add eel, add fox, add owl, add bee, query bat, query cow, query ant, query cat",
        },
        {
          key: "crowded",
          start: "8",
          ops: "add cat, add dog, add eel, add fox, add owl, add bee, query bat, query cow, query ant, query cat",
        },
        { key: "card", start: "8", ops: "add cat, add dog, query bat, query cow" },
      ]}
      forms={BLOOM_FORMS}
      run={bloomSteps}
      stage={(s: DsStep<BloomState>) => <BloomStage s={s} />}
      vars={(s) => [{ name: "bits set", value: s.state.bits.filter((b) => b === 1).length }]}
    />
  );
}
