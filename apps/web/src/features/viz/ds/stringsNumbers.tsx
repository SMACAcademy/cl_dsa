import { useTranslation } from "react-i18next";
import { DsPlayer, useDynamicT } from "./DsPlayer";
import { cmd, type OpForm } from "./ops";
import { choices, StepLog, type DsStep, type Question } from "./steps";

/* --------------------------------- Letter rows --------------------------------- */

export type LetterState = "idle" | "current" | "match" | "miss" | "faded";

const LETTER: Record<LetterState, string> = {
  idle: "border-line bg-raised",
  current: "border-compare bg-compare-soft text-compare-ink ring-2 ring-compare",
  match: "border-found bg-found-soft text-found-ink",
  miss: "border-line bg-sunken text-muted line-through",
  faded: "border-line bg-sunken text-muted opacity-50",
};
const LETTER_GLYPH: Record<LetterState, string> = {
  idle: "",
  current: "?",
  match: "✓",
  miss: "✗",
  faded: "",
};

/** One row of letter boxes; `offset` shifts the row right so a pattern can sit under the text. */
function Letters({
  label,
  letters,
  offset = 0,
  slots,
  stateOf,
}: {
  label: string;
  letters: readonly (string | null)[];
  offset?: number;
  slots: number;
  stateOf: (i: number) => LetterState;
}) {
  const tx = useDynamicT();
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="w-10 shrink-0 text-right font-mono text-xs text-muted">
        {label}
      </span>
      <ol aria-label={label} className="flex gap-1">
        {Array.from({ length: slots }, (_, k) => {
          const i = k - offset;
          if (i < 0 || i >= letters.length) {
            return <li key={k} aria-hidden="true" className="size-8 shrink-0" />;
          }
          const ch = letters[i];
          const state = ch === null ? "idle" : stateOf(i);
          return (
            <li
              key={k}
              className={`relative grid size-8 shrink-0 place-items-center rounded-control border-2 font-mono text-sm font-semibold transition-all duration-300 ${
                ch === null ? "border-dashed border-line" : LETTER[state]
              }`}
            >
              {ch ?? ""}
              {ch !== null && LETTER_GLYPH[state] && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full border border-current bg-raised text-[10px] no-underline"
                >
                  {LETTER_GLYPH[state]}
                </span>
              )}
              <span className="sr-only">
                {tx("viz.ds.str.cell", {
                  i,
                  ch: ch ?? "",
                  state: tx(`viz.ds.str.state.${state}`),
                })}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function IndexRow({ slots }: { slots: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      <span className="w-10 shrink-0" />
      <div className="flex gap-1">
        {Array.from({ length: slots }, (_, k) => (
          <span key={k} className="w-8 shrink-0 text-center font-mono text-[10px] text-muted">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Naive matching ------------------------------- */

export const NAIVE_CODE: readonly string[] = [
  "def find_all(text, pat):",
  "    n, m = len(text), len(pat)",
  "    found = []",
  "    for s in range(n - m + 1):  # each starting position",
  "        j = 0",
  "        while j < m and text[s + j] == pat[j]:",
  "            j += 1",
  "        if j == m:",
  "            found.append(s)",
  "    return found",
];

export type FindOp = { pat: string; text: string };

export const FIND_FORMS: readonly OpForm<FindOp>[] = [
  {
    pattern: cmd("find ([a-z]{1,8}) in ([a-z]{1,20})"),
    build: (m) => ({ pat: (m[1] as string).toLowerCase(), text: (m[2] as string).toLowerCase() }),
  },
];

export type NaiveState = {
  text: string;
  pat: string;
  s: number | null;
  /** Result of comparing pattern[j] at the current position. */
  results: readonly ("eq" | "ne" | null)[];
  found: readonly number[];
  compares: number;
};

const yesNo = (key: string, vars: Record<string, string | number>, yes: boolean): Question => ({
  say: { key, vars },
  options: ["✓", "✗"],
  correct: yes ? "✓" : "✗",
});

export function naiveSteps(_start: readonly string[], ops: readonly FindOp[]) {
  let text = "";
  let pat = "";
  let s: number | null = null;
  let results: ("eq" | "ne" | null)[] = [];
  let found: number[] = [];
  let compares = 0;
  const log = new StepLog<NaiveState>(() => ({
    text,
    pat,
    s,
    results: [...results],
    found: [...found],
    compares,
  }));
  for (const op of ops) {
    ({ text, pat } = op);
    const n = text.length;
    const m = pat.length;
    s = null;
    results = [];
    found = [];
    compares = 0;
    log.add(2, "start", { pat, text, count: Math.max(0, n - m + 1) });
    for (let pos = 0; pos + m <= n; pos++) {
      s = pos;
      results = new Array<"eq" | "ne" | null>(m).fill(null);
      const matches = text.slice(pos, pos + m) === pat;
      for (let j = 0; j < m; j++) {
        const a = text[pos + j] as string;
        const b = pat[j] as string;
        compares++;
        const eq = a === b;
        results[j] = eq ? "eq" : "ne";
        log.add(
          6,
          eq ? "eq" : "ne",
          { s: pos, i: pos + j, j, a, b },
          j === 0 ? yesNo("qPos", { s: pos }, matches) : undefined,
        );
        if (!eq) break;
      }
      if (matches) {
        found.push(pos);
        log.add(9, "match", { s: pos, m });
      }
    }
    s = null;
    results = [];
    if (found.length) log.add(10, "end", { list: found.join(", "), compares });
    else log.add(10, "endNone", { compares });
  }
  return log.steps;
}

function NaiveStage({ s }: { s: DsStep<NaiveState> }) {
  const st = s.state;
  const offset = st.s ?? 0;
  const slots = Math.max(st.text.length, offset + st.pat.length);
  const resultState = (r: "eq" | "ne" | null | undefined): LetterState =>
    r === "eq" ? "match" : r === "ne" ? "miss" : "idle";
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="mx-auto w-max space-y-1">
        <IndexRow slots={slots} />
        <Letters
          label="text"
          letters={st.text.split("")}
          slots={slots}
          stateOf={(i) => (st.s === null ? "idle" : resultState(st.results[i - st.s]))}
        />
        <Letters
          label="pat"
          letters={st.pat.split("")}
          offset={offset}
          slots={slots}
          stateOf={(j) => resultState(st.results[j])}
        />
      </div>
    </div>
  );
}

export function NaiveMatchPlayer() {
  return (
    <DsPlayer
      prefix="naive"
      code={NAIVE_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "find abc in aabcbabcabcab" },
        { key: "overlap", start: "", ops: "find aa in aaaaaaaa" },
        { key: "slow", start: "", ops: "find aaab in aaaaaaaaaab" },
        { key: "card", start: "", ops: "find ab in aab" },
      ]}
      forms={FIND_FORMS}
      run={naiveSteps}
      stage={(s: DsStep<NaiveState>) => <NaiveStage s={s} />}
      vars={(s) => [
        { name: "s", value: s.state.s ?? "—" },
        { name: "found", value: `[${s.state.found.join(", ")}]` },
      ]}
    />
  );
}

/* ------------------------------------- KMP ------------------------------------- */

export const KMP_CODE: readonly string[] = [
  "def kmp(text, pat):",
  "    fail = [0] * len(pat)  # fail[i]: longest prefix of pat[:i+1] that is also its suffix",
  "    k = 0",
  "    for i in range(1, len(pat)):",
  "        while k > 0 and pat[i] != pat[k]:",
  "            k = fail[k - 1]",
  "        if pat[i] == pat[k]:",
  "            k += 1",
  "        fail[i] = k",
  "    found, j = [], 0",
  "    for i, ch in enumerate(text):",
  "        while j > 0 and ch != pat[j]:",
  "            j = fail[j - 1]  # jump: keep the overlap",
  "        if ch == pat[j]:",
  "            j += 1",
  "        if j == len(pat):",
  "            found.append(i - j + 1)",
  "            j = fail[j - 1]",
  "    return found",
];

export type KmpState = {
  phase: "table" | "search" | "done";
  text: string;
  pat: string;
  fail: readonly (number | null)[];
  /** Table phase: the pattern index being filled. Search phase: the text index just read. */
  i: number | null;
  /** Table phase: k (overlap length). Search phase: matched length after reading text[i]. */
  j: number;
  found: readonly number[];
  compares: number;
};

/** The KMP prefix ("fail") table. */
export function failTable(pat: string): number[] {
  const fail = new Array<number>(pat.length).fill(0);
  let k = 0;
  for (let i = 1; i < pat.length; i++) {
    while (k > 0 && pat[i] !== pat[k]) k = fail[k - 1] as number;
    if (pat[i] === pat[k]) k++;
    fail[i] = k;
  }
  return fail;
}

const rangeOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, k) => String(from + k));

export function kmpSteps(_start: readonly string[], ops: readonly FindOp[]) {
  let st: KmpState = {
    phase: "table",
    text: "",
    pat: "",
    fail: [],
    i: null,
    j: 0,
    found: [],
    compares: 0,
  };
  const log = new StepLog<KmpState>(() => ({ ...st, fail: [...st.fail], found: [...st.found] }));
  for (const { pat, text } of ops) {
    const m = pat.length;
    const full = failTable(pat);
    const fail: (number | null)[] = new Array<number | null>(m).fill(null);
    fail[0] = 0;
    st = { phase: "table", text, pat, fail, i: 0, j: 0, found: [], compares: 0 };
    log.add(2, "start", { pat, text });
    for (let i = 1; i < m; i++) {
      const k = full[i] as number;
      fail[i] = k;
      st = { ...st, i, j: k };
      log.add(
        9,
        k ? "fill" : "fillZero",
        { i, prefix: pat.slice(0, i + 1), k, part: pat.slice(0, k) },
        {
          say: { key: "qFill", vars: { i, prefix: pat.slice(0, i + 1) } },
          options: rangeOptions(0, i),
          correct: String(k),
        },
      );
    }
    st = { ...st, phase: "search", i: null, j: 0 };
    log.add(10, "search", { table: full.join(", "), n: text.length });
    let j = 0;
    let compares = 0;
    const found: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i] as string;
      const before = j;
      const chain = [j];
      while (j > 0 && ch !== pat[j]) {
        compares++;
        j = full[j - 1] as number;
        chain.push(j);
      }
      compares++;
      const matched = ch === pat[j];
      if (matched) j++;
      const jumped = chain.length > 1;
      st = { ...st, i, j, compares, found: [...found] };
      log.add(
        jumped ? 13 : matched ? 15 : 14,
        jumped ? (matched ? "jumpMatch" : "jumpMiss") : matched ? "match" : "miss",
        {
          i,
          ch,
          j: before,
          pj: pat[before] ?? "",
          len: j,
          chain: chain.join(" → "),
          p0: pat[0] as string,
        },
        {
          say: { key: "qLen", vars: { i, ch } },
          options: rangeOptions(0, m),
          correct: String(j),
        },
      );
      if (j === m) {
        found.push(i - m + 1);
        st = { ...st, found: [...found] };
        const to = full[m - 1] as number;
        log.add(17, "found", { pos: i - m + 1, to });
        j = to;
      }
    }
    st = { ...st, phase: "done", i: null, j: 0, found: [...found], compares };
    if (found.length) log.add(19, "end", { list: found.join(", "), n: text.length, compares });
    else log.add(19, "endNone", { n: text.length, compares });
  }
  return log.steps;
}

function KmpStage({ s }: { s: DsStep<KmpState> }) {
  const st = s.state;
  const m = st.pat.length;
  if (st.phase === "table") {
    const i = st.i ?? 0;
    const k = st.j;
    const patState = (x: number): LetterState =>
      x === i ? "current" : x < k || (x > i - k && x <= i) ? "match" : x > i ? "faded" : "idle";
    return (
      <div className="w-full overflow-x-auto py-2">
        <div className="mx-auto w-max space-y-1">
          <IndexRow slots={m} />
          <Letters label="pat" letters={st.pat.split("")} slots={m} stateOf={patState} />
          <Letters
            label="fail"
            letters={st.fail.map((v) => (v === null ? null : String(v)))}
            slots={m}
            stateOf={(x) => (x === i ? "match" : "idle")}
          />
        </div>
      </div>
    );
  }
  const i = st.i;
  const offset = i === null ? 0 : i - st.j + 1;
  const slots = Math.max(st.text.length, offset + m);
  const textState = (x: number): LetterState => {
    if (i === null) return st.found.some((p) => x >= p && x < p + m) ? "match" : "idle";
    if (x > i) return "idle";
    if (x === i) return st.j > 0 ? "match" : "miss";
    return x > i - st.j ? "match" : "faded";
  };
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="mx-auto w-max space-y-1">
        <IndexRow slots={slots} />
        <Letters label="text" letters={st.text.split("")} slots={slots} stateOf={textState} />
        <Letters
          label="pat"
          letters={st.pat.split("")}
          offset={i === null ? 0 : offset}
          slots={slots}
          stateOf={(x) => (i !== null && x < st.j ? "match" : "idle")}
        />
        <Letters
          label="fail"
          letters={st.fail.map((v) => (v === null ? null : String(v)))}
          offset={i === null ? 0 : offset}
          slots={slots}
          stateOf={() => "idle"}
        />
      </div>
    </div>
  );
}

export function KmpPlayer() {
  return (
    <DsPlayer
      prefix="kmp"
      code={KMP_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "find abab in abacabababcabab" },
        { key: "slow", start: "", ops: "find aaab in aaaaaaaaaab" },
        { key: "table", start: "", ops: "find aabaab in aabaabaabaab" },
        { key: "card", start: "", ops: "find abab in abacababab" },
      ]}
      forms={FIND_FORMS}
      run={kmpSteps}
      stage={(s: DsStep<KmpState>) => <KmpStage s={s} />}
      vars={(s) => [
        { name: s.state.phase === "table" ? "k" : "j", value: s.state.j },
        { name: "found", value: `[${s.state.found.join(", ")}]` },
      ]}
    />
  );
}

/* ------------------------------------- GCD ------------------------------------- */

export const GCD_CODE: readonly string[] = [
  "def gcd(a, b):",
  "    while b != 0:",
  "        a, b = b, a % b  # a mod b",
  "    return a",
];

export type GcdOp = { a: number; b: number };

export const GCD_FORMS: readonly OpForm<GcdOp>[] = [
  {
    pattern: cmd("gcd (\\d{1,3}) (\\d{1,3})"),
    build: (m) =>
      Number(m[1]) >= 1 && Number(m[2]) >= 1 ? { a: Number(m[1]), b: Number(m[2]) } : null,
  },
];

type Rect = { x: number; y: number; w: number; h: number };
type Sq = { x: number; y: number; size: number; step: number };

export type GcdState = {
  width: number;
  height: number;
  a: number;
  b: number;
  squares: readonly Sq[];
  region: Rect;
  step: number;
  done: boolean;
};

export function gcdSteps(_start: readonly string[], ops: readonly GcdOp[]) {
  let st: GcdState = {
    width: 1,
    height: 1,
    a: 0,
    b: 0,
    squares: [],
    region: { x: 0, y: 0, w: 1, h: 1 },
    step: 0,
    done: false,
  };
  const log = new StepLog<GcdState>(() => ({
    ...st,
    squares: [...st.squares],
    region: { ...st.region },
  }));
  for (const op of ops) {
    let { a, b } = op;
    const squares: Sq[] = [];
    const region: Rect = { x: 0, y: 0, w: a, h: b };
    let step = 0;
    st = { width: a, height: b, a, b, squares, region, step, done: false };
    log.add(1, "start", { a, b });
    while (b !== 0) {
      const q = Math.floor(a / b);
      const r = a % b;
      step++;
      // Cut q squares of side b off the side of length a.
      for (let k = 0; k < q; k++) {
        if (region.w === a) squares.push({ x: region.x + k * b, y: region.y, size: b, step });
        else squares.push({ x: region.x, y: region.y + k * b, size: b, step });
      }
      if (q > 0) {
        if (region.w === a) {
          region.x += q * b;
          region.w = r;
        } else {
          region.y += q * b;
          region.h = r;
        }
      }
      st = { ...st, a: b, b: r, squares, region, step };
      const options = choices([r, q, b - r, a - b, r + 1].filter((x) => x >= 0).map(String)).sort(
        (x, y) => Number(x) - Number(y),
      );
      log.add(
        3,
        q === 0 ? "swap" : "mod",
        { a, b, r, q },
        { say: { key: "qMod", vars: { a, b } }, options, correct: String(r) },
      );
      a = b;
      b = r;
    }
    st = { ...st, done: true };
    log.add(4, "done", { g: a, steps: step });
  }
  return log.steps;
}

function GcdStage({ s }: { s: DsStep<GcdState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const scale = 280 / Math.max(st.width, st.height);
  const W = st.width * scale;
  const H = st.height * scale;
  const g = st.a;
  return (
    <div className="w-full overflow-x-auto py-2">
      <p className="text-center font-mono text-lg font-semibold">
        gcd({st.a}, {st.b})
      </p>
      <svg
        aria-hidden="true"
        viewBox={`-2 -2 ${W + 4} ${H + 4}`}
        className="mx-auto mt-2 block"
        style={{ width: W + 4, maxWidth: "none" }}
      >
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          className="fill-raised stroke-control"
          strokeWidth={1.5}
        />
        {st.squares.map((q, k) => {
          const fresh = q.step === st.step && !st.done;
          const final = st.done && q.size === g;
          const cls = final
            ? "fill-found-soft stroke-found"
            : fresh
              ? "fill-compare-soft stroke-compare"
              : "fill-sunken stroke-line";
          const side = q.size * scale;
          return (
            <g key={k}>
              <rect
                x={q.x * scale}
                y={q.y * scale}
                width={side}
                height={side}
                className={cls}
                strokeWidth={1.5}
              />
              {side >= 20 && (
                <text
                  x={q.x * scale + side / 2}
                  y={q.y * scale + side / 2}
                  dy="0.35em"
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${final ? "fill-found-ink" : fresh ? "fill-compare-ink" : "fill-muted"}`}
                >
                  {q.size}
                </text>
              )}
            </g>
          );
        })}
        {!st.done && st.region.w > 0 && st.region.h > 0 && (
          <rect
            x={st.region.x * scale}
            y={st.region.y * scale}
            width={st.region.w * scale}
            height={st.region.h * scale}
            className="fill-none stroke-accent"
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        )}
      </svg>
      <p className="mt-2 text-center text-xs text-muted">
        {t("viz.ds.gcd.legend", { w: st.width, h: st.height })}
      </p>
    </div>
  );
}

export function GcdPlayer() {
  return (
    <DsPlayer
      prefix="gcd"
      code={GCD_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "gcd 462 252" },
        { key: "coprime", start: "", ops: "gcd 89 55" },
        { key: "swap", start: "", ops: "gcd 192 270" },
        { key: "card", start: "", ops: "gcd 48 18" },
      ]}
      forms={GCD_FORMS}
      run={gcdSteps}
      stage={(s: DsStep<GcdState>) => <GcdStage s={s} />}
      vars={(s) => [
        { name: "a", value: s.state.a },
        { name: "b", value: s.state.b },
      ]}
    />
  );
}

/* ------------------------------------ Sieve ------------------------------------ */

export const SIEVE_CODE: readonly string[] = [
  "def primes_up_to(n):",
  "    is_prime = [True] * (n + 1)",
  "    is_prime[0] = is_prime[1] = False",
  "    p = 2",
  "    while p * p <= n:",
  "        if is_prime[p]:",
  "            for m in range(p * p, n + 1, p):",
  "                is_prime[m] = False  # cross out multiples",
  "        p += 1",
  "    return [i for i in range(n + 1) if is_prime[i]]",
];

export type SieveOp = { n: number };

export const SIEVE_FORMS: readonly OpForm<SieveOp>[] = [
  {
    pattern: cmd("sieve (\\d{1,3})"),
    build: (m) => (Number(m[1]) >= 2 && Number(m[1]) <= 100 ? { n: Number(m[1]) } : null),
  },
];

export type SieveState = {
  n: number;
  /** crossed[v] = the prime that first crossed v out. */
  crossed: Readonly<Record<number, number>>;
  p: number | null;
  fresh: readonly number[];
  done: boolean;
};

export function sieveSteps(_start: readonly string[], ops: readonly SieveOp[]) {
  let st: SieveState = { n: 0, crossed: {}, p: null, fresh: [], done: false };
  const log = new StepLog<SieveState>(() => ({
    ...st,
    crossed: { ...st.crossed },
    fresh: [...st.fresh],
  }));
  for (const { n } of ops) {
    const crossed: Record<number, number> = {};
    st = { n, crossed, p: null, fresh: [], done: false };
    log.add(3, "start", { n });
    let p = 2;
    for (; p * p <= n; p++) {
      if (crossed[p] !== undefined) {
        st = { ...st, p, fresh: [] };
        log.add(6, "skip", { p, by: crossed[p] as number });
        continue;
      }
      const fresh: number[] = [];
      for (let v = p * p; v <= n; v += p) {
        if (crossed[v] === undefined) crossed[v] = p;
        fresh.push(v);
      }
      st = { ...st, p, fresh };
      const options = choices([p, 2 * p, p * p].map(String)).sort((x, y) => Number(x) - Number(y));
      log.add(
        8,
        "cross",
        { p, list: fresh.join(", "), sq: p * p },
        { say: { key: "qFirst", vars: { p } }, options, correct: String(p * p) },
      );
    }
    const primes: number[] = [];
    for (let v = 2; v <= n; v++) if (crossed[v] === undefined) primes.push(v);
    st = { ...st, p, fresh: [], done: true };
    log.add(10, "stop", { p, sq: p * p, n, list: primes.join(", "), count: primes.length });
  }
  return log.steps;
}

type NumState = "none" | "unknown" | "current" | "fresh" | "crossed" | "prime";

const NUM: Record<NumState, string> = {
  none: "border-dashed border-line text-muted opacity-50",
  unknown: "border-line bg-raised",
  current: "border-accent bg-accent-soft text-accent-ink ring-2 ring-accent",
  fresh: "border-compare bg-compare-soft text-compare-ink line-through",
  crossed: "border-line bg-sunken text-muted line-through",
  prime: "border-found bg-found-soft text-found-ink",
};
const NUM_GLYPH: Record<NumState, string> = {
  none: "",
  unknown: "",
  current: "●",
  fresh: "✗",
  crossed: "",
  prime: "✓",
};

function SieveStage({ s }: { s: DsStep<SieveState> }) {
  const { t } = useTranslation();
  const tx = useDynamicT();
  const st = s.state;
  const stateOf = (v: number): NumState => {
    if (v < 2) return "none";
    if (st.fresh.includes(v)) return "fresh";
    if (st.crossed[v] !== undefined) return "crossed";
    if (v === st.p && !st.done) return "current";
    if (st.done || (st.p !== null && v < st.p)) return "prime";
    return "unknown";
  };
  return (
    <ol
      aria-label={t("viz.ds.sieve.grid", { n: st.n })}
      className="mx-auto grid w-full max-w-md grid-cols-10 gap-1 py-2"
    >
      {Array.from({ length: st.n }, (_, k) => k + 1).map((v) => {
        const state = stateOf(v);
        return (
          <li
            key={v}
            className={`relative grid aspect-square place-items-center rounded-control border-2 font-mono text-xs font-semibold transition-all duration-300 sm:text-sm ${NUM[state]}`}
          >
            {v}
            {NUM_GLYPH[state] && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full border border-current bg-raised text-[9px] no-underline"
              >
                {NUM_GLYPH[state]}
              </span>
            )}
            <span className="sr-only">{tx(`viz.ds.sieve.state.${state}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function SievePlayer() {
  return (
    <DsPlayer
      prefix="sieve"
      code={SIEVE_CODE}
      startField={null}
      presets={[
        { key: "tour", start: "", ops: "sieve 50" },
        { key: "thirty", start: "", ops: "sieve 30" },
        { key: "sixty", start: "", ops: "sieve 100" },
        { key: "card", start: "", ops: "sieve 10" },
      ]}
      forms={SIEVE_FORMS}
      run={sieveSteps}
      stage={(s: DsStep<SieveState>) => <SieveStage s={s} />}
      vars={(s) => [{ name: "p", value: s.state.p ?? "—" }]}
    />
  );
}
