import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "../ArrayView";
import { DsPlayer } from "./DsPlayer";
import { cmd, pick, randomNumbers, V, type OpForm } from "./ops";
import { validateCapacity } from "./ringBuffer";
import { StepLog, type DsStep } from "./steps";
import { Box, type NodeState } from "./views";

/* ------------------------------ Hash function ------------------------------ */

/** Python's %: the result has the sign of the divisor, so it is never negative here. */
export const pyMod = (a: number, m: number) => ((a % m) + m) % m;
const isLetter = (k: string) => /^[A-Za-z]$/.test(k);
/** Numbers hash to themselves; a letter hashes to its character code, like ord(). */
export const hashCode = (k: string) => (isLetter(k) ? k.charCodeAt(0) : Number(k));
export const bucketOf = (k: string, m: number) => pyMod(hashCode(k), m);

const bucketQuestion = (k: string, m: number, b: number) => ({
  say: { key: "qBucket", vars: { k } },
  options: Array.from({ length: m }, (_, i) => String(i)),
  correct: String(b),
});

/* --------------------------- Chaining (table + set) --------------------------- */

export const HASH_TABLE_CODE: readonly string[] = [
  "class HashTable:",
  "    def __init__(self, m):",
  "        self.buckets = [[] for _ in range(m)]",
  "    def _index(self, key):",
  "        h = ord(key) if isinstance(key, str) else key",
  "        return h % len(self.buckets)",
  "    def insert(self, key):",
  "        chain = self.buckets[self._index(key)]",
  "        if key not in chain:",
  "            chain.append(key)",
  "    def lookup(self, key):",
  "        chain = self.buckets[self._index(key)]",
  "        return key in chain",
  "    def delete(self, key):",
  "        chain = self.buckets[self._index(key)]",
  "        if key in chain:",
  "            chain.remove(key)",
];

export const HASH_SET_CODE: readonly string[] = [
  "class HashSet:",
  "    def __init__(self, m):",
  "        self.buckets = [[] for _ in range(m)]",
  "    def _index(self, x):",
  "        h = ord(x) if isinstance(x, str) else x",
  "        return h % len(self.buckets)",
  "    def add(self, x):",
  "        bucket = self.buckets[self._index(x)]",
  "        if x not in bucket:",
  "            bucket.append(x)",
  "    def contains(self, x):",
  "        bucket = self.buckets[self._index(x)]",
  "        return x in bucket",
  "    def remove(self, x):",
  "        bucket = self.buckets[self._index(x)]",
  "        if x in bucket:",
  "            bucket.remove(x)",
];

export type ChainOp = { kind: "insert" | "lookup" | "delete"; k: string };

const chainForms = (insert: string, lookup: string, del: string): OpForm<ChainOp>[] => [
  { pattern: cmd(`${insert} ${V}`), build: (m) => ({ kind: "insert", k: m[1] as string }) },
  { pattern: cmd(`${lookup} ${V}`), build: (m) => ({ kind: "lookup", k: m[1] as string }) },
  { pattern: cmd(`${del} ${V}`), build: (m) => ({ kind: "delete", k: m[1] as string }) },
];

export const HASH_TABLE_FORMS = chainForms("insert", "lookup", "delete");
export const HASH_SET_FORMS = chainForms("add", "contains", "remove");

export type ChainState = {
  buckets: readonly (readonly string[])[];
  /** Highlighted bucket, if any. */
  bucket: number | null;
  /** Highlighted entries, by "bucket:position". */
  marks: Readonly<Record<string, NodeState>>;
};

/** Code lines per operation: [hash, scan, change]. Hashing happens in _index (line 6). */
const LINES = { insert: [6, 9, 10], lookup: [6, 13, 13], delete: [6, 16, 17] } as const;

export function chainingSteps(start: readonly string[], ops: readonly ChainOp[]) {
  const m = Number(start[0]);
  const buckets: string[][] = Array.from({ length: m }, () => []);
  let bucket: number | null = null;
  let marks: Record<string, NodeState> = {};
  const log = new StepLog<ChainState>(() => ({
    buckets: buckets.map((b) => [...b]),
    bucket,
    marks: { ...marks },
  }));
  const count = () => buckets.reduce((n, b) => n + b.length, 0);

  log.add(3, "start", { m });
  for (const op of ops) {
    const { k } = op;
    const b = bucketOf(k, m);
    const chain = buckets[b] as string[];
    const [hashLine, scanLine, changeLine] = LINES[op.kind];
    bucket = b;
    marks = {};
    log.add(
      hashLine,
      isLetter(k) ? "hashLetter" : "hash",
      { k, code: hashCode(k), m, b },
      bucketQuestion(k, m, b),
    );
    let at = -1;
    for (let p = 0; p < chain.length; p++) {
      if (chain[p] === k) {
        at = p;
        break;
      }
      marks = { [`${b}:${p}`]: "current" };
      log.add(scanLine, "scanNo", { e: chain[p] as string, k });
    }
    if (op.kind === "insert") {
      if (at >= 0) {
        marks = { [`${b}:${at}`]: "found" };
        log.add(scanLine, "alreadyThere", { k, b });
      } else {
        const before = chain.length;
        chain.push(k);
        marks = { [`${b}:${chain.length - 1}`]: "new" };
        log.add(changeLine, before === 0 ? "storeEmpty" : "collision", {
          k,
          b,
          size: chain.length,
        });
      }
    } else if (op.kind === "lookup") {
      if (at >= 0) marks = { [`${b}:${at}`]: "found" };
      else marks = {};
      log.add(scanLine, at >= 0 ? "lookupHit" : "lookupMiss", {
        k,
        b,
        checks: at >= 0 ? at + 1 : chain.length,
      });
    } else if (at >= 0) {
      marks = { [`${b}:${at}`]: "removed" };
      log.add(scanLine, "deleteFound", { k, b });
      chain.splice(at, 1);
      marks = {};
      log.add(changeLine, "deleted", { k, b });
    } else {
      marks = {};
      log.add(scanLine, "deleteMiss", { k, b });
    }
  }
  bucket = null;
  marks = {};
  const n = count();
  log.add(0, "end", {
    n,
    m,
    load: (n / m).toFixed(2),
    longest: Math.max(...buckets.map((x) => x.length)),
  });
  return log.steps;
}

function BucketsView({ s }: { s: DsStep<ChainState> }) {
  const { t } = useTranslation();
  return (
    <ol aria-label={t("viz.ds.view.buckets")} className="mx-auto flex w-max flex-col gap-1.5 py-2">
      {s.state.buckets.map((chain, b) => (
        <li
          key={b}
          className={`flex min-h-14 items-center gap-2 rounded-control border-2 px-2 py-1 transition-colors duration-300 ${
            s.state.bucket === b ? "border-compare bg-compare-soft/40" : "border-transparent"
          }`}
        >
          <span className="w-6 text-right font-mono text-xs font-semibold text-muted">{b}</span>
          <span aria-hidden="true" className="text-muted">
            │
          </span>
          {chain.length === 0 && <span className="font-mono text-xs text-muted">[ ]</span>}
          {chain.map((v, p) => (
            <span key={`${v}-${p}`} className="flex items-center gap-1">
              {p > 0 && (
                <span aria-hidden="true" className="text-muted">
                  →
                </span>
              )}
              <Box value={v} state={s.state.marks[`${b}:${p}`] ?? "idle"} />
            </span>
          ))}
          <span className="sr-only">
            {t("viz.ds.view.bucket", {
              b,
              values: chain.length > 0 ? chain.join(", ") : t("viz.ds.view.emptySlot"),
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}

const chainVars = (s: DsStep<ChainState>) => {
  const n = s.state.buckets.reduce((sum, b) => sum + b.length, 0);
  const m = s.state.buckets.length;
  return [
    { name: "m", value: m },
    { name: "n", value: n },
    { name: "n / m", value: (n / m).toFixed(2) },
  ];
};

export function HashTablePlayer() {
  return (
    <DsPlayer
      prefix="hashTable"
      code={HASH_TABLE_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      presets={[
        {
          key: "tour",
          start: "7",
          ops: "insert 12, insert 7, insert 9, insert 23, insert 15, insert 30, insert 41, insert 5, insert 19, lookup 23, lookup 8",
        },
        {
          key: "collide",
          start: "4",
          ops: "insert 3, insert 7, insert 11, insert 15, insert 19, insert 2, insert 6, insert 10, lookup 11",
        },
        {
          key: "delete",
          start: "5",
          ops: "insert 1, insert 6, insert 11, insert 3, insert 8, delete 6, lookup 11, delete 4",
        },
        { key: "card", start: "5", ops: "insert 12, insert 7, insert 9, lookup 7" },
      ]}
      random={() => {
        const keys = randomNumbers(9);
        return {
          start: "7",
          ops: [...keys.map((k) => `insert ${k}`), `lookup ${pick(keys)}`, "lookup 0"].join(", "),
        };
      }}
      forms={HASH_TABLE_FORMS}
      run={chainingSteps}
      stage={(s: DsStep<ChainState>) => <BucketsView s={s} />}
      vars={chainVars}
    />
  );
}

export function HashSetPlayer() {
  return (
    <DsPlayer
      prefix="hashSet"
      code={HASH_SET_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      presets={[
        {
          key: "tour",
          start: "5",
          ops: "add a, add b, add c, add a, add d, add b, add e, contains b, contains z",
        },
        {
          key: "dedupe",
          start: "4",
          ops: "add 3, add 7, add 3, add 7, add 2, add 9, add 2, add 12, add 9, add 3",
        },
        {
          key: "remove",
          start: "5",
          ops: "add x, add y, add z, add w, remove x, contains x, contains y",
        },
        { key: "card", start: "5", ops: "add a, add b, add a, contains b" },
      ]}
      forms={HASH_SET_FORMS}
      run={chainingSteps}
      stage={(s: DsStep<ChainState>) => <BucketsView s={s} />}
      vars={chainVars}
    />
  );
}

/* --------------------------- Open addressing --------------------------- */

export const PROBING_CODE: readonly string[] = [
  "class LinearProbing:",
  "    def __init__(self, m):",
  "        self.slots = [None] * m",
  "    def insert(self, key):",
  "        m = len(self.slots)",
  "        for step in range(m):",
  "            i = (key + step) % m",
  "            if self.slots[i] is None or self.slots[i] == key:",
  "                self.slots[i] = key",
  "                return i",
  "        raise OverflowError('table is full')",
  "    def lookup(self, key):",
  "        m = len(self.slots)",
  "        for step in range(m):",
  "            i = (key + step) % m",
  "            if self.slots[i] is None:",
  "                return -1",
  "            if self.slots[i] == key:",
  "                return i",
  "        return -1",
];

export type ProbeOp = { kind: "insert" | "lookup"; k: string };

/** Numbers only: the probing code adds `step` to the key, which needs a number. */
const N = String.raw`(-?\d{1,2})`;

export const PROBING_FORMS: readonly OpForm<ProbeOp>[] = [
  { pattern: cmd(`insert ${N}`), build: (m) => ({ kind: "insert", k: m[1] as string }) },
  { pattern: cmd(`lookup ${N}`), build: (m) => ({ kind: "lookup", k: m[1] as string }) },
];

export type ProbeState = {
  slots: readonly (string | null)[];
  marks: Readonly<Record<number, CellState>>;
  probe: number | null;
  probes: number;
};

export function probingSteps(start: readonly string[], ops: readonly ProbeOp[]) {
  const m = Number(start[0]);
  const slots: (string | null)[] = new Array<null>(m).fill(null);
  let marks: Record<number, CellState> = {};
  let probe: number | null = null;
  let probes = 0;
  const log = new StepLog<ProbeState>(() => ({
    slots: [...slots],
    marks: { ...marks },
    probe,
    probes,
  }));

  log.add(3, "start", { m });
  for (const op of ops) {
    const { k } = op;
    const home = bucketOf(k, m);
    const insert = op.kind === "insert";
    marks = {};
    probe = home;
    probes = 0;
    log.add(
      insert ? 7 : 15,
      isLetter(k) ? "homeLetter" : "home",
      { k, code: hashCode(k), m, b: home },
      bucketQuestion(k, m, home),
    );
    let done = false;
    for (let step = 0; step < m && !done; step++) {
      const i = (home + step) % m;
      const v = slots[i] ?? null;
      probe = i;
      probes = step + 1;
      if (insert && (v === null || v === k)) {
        slots[i] = k;
        marks = { [i]: "found" };
        log.add(9, v === k ? "alreadyThere" : "store", { k, i, probes: step + 1 });
        done = true;
      } else if (!insert && v === null) {
        marks = { [i]: "checked" };
        log.add(17, "lookupEmpty", { k, i, probes: step + 1 });
        done = true;
      } else if (!insert && v === k) {
        marks = { [i]: "found" };
        log.add(19, "lookupHit", { k, i, probes: step + 1 });
        done = true;
      } else {
        marks = { [i]: "comparing" };
        log.add(insert ? 8 : 18, "occupied", { i, v: v as string, k, next: (i + 1) % m });
      }
    }
    if (!done) {
      marks = {};
      probe = null;
      log.add(insert ? 11 : 20, insert ? "full" : "lookupFullMiss", { k, m });
    }
  }
  marks = {};
  probe = null;
  const n = slots.filter((x) => x !== null).length;
  log.add(0, "end", { n, m, load: (n / m).toFixed(2) });
  return log.steps;
}

export function OpenAddressingPlayer() {
  return (
    <DsPlayer
      prefix="probing"
      code={PROBING_CODE}
      startField="capacity"
      validateStart={validateCapacity}
      presets={[
        {
          key: "tour",
          start: "11",
          ops: "insert 10, insert 15, insert 21, insert 32, insert 4, insert 26, insert 43, insert 8, lookup 32, lookup 5",
        },
        {
          key: "cluster",
          start: "7",
          ops: "insert 3, insert 10, insert 17, insert 4, insert 24, insert 11, lookup 4, lookup 18",
        },
        {
          key: "full",
          start: "5",
          ops: "insert 1, insert 6, insert 11, insert 16, insert 21, insert 2",
        },
        { key: "card", start: "5", ops: "insert 10, insert 15, insert 21, lookup 15" },
      ]}
      random={() => {
        const keys = randomNumbers(8);
        return {
          start: "11",
          ops: [...keys.map((k) => `insert ${k}`), `lookup ${pick(keys)}`, "lookup 0"].join(", "),
        };
      }}
      forms={PROBING_FORMS}
      run={probingSteps}
      stage={(s: DsStep<ProbeState>) => (
        <ArrayView
          label="slots"
          items={s.state.slots}
          stateOf={(i) => s.state.marks[i] ?? "idle"}
          markers={s.state.probe === null ? [] : [{ index: s.state.probe, label: "i" }]}
        />
      )}
      vars={(s) => {
        const n = s.state.slots.filter((x) => x !== null).length;
        return [
          { name: "i", value: s.state.probe ?? "—" },
          { name: "probes", value: s.state.probes },
          { name: "n / m", value: (n / s.state.slots.length).toFixed(2) },
        ];
      }}
    />
  );
}
