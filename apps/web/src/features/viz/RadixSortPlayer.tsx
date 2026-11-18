import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "./ArrayView";
import { digitOf, RADIX_SORT_CODE, radixSortSteps, type RadixSortStep } from "./radixSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "21, 13, 32, 12" },
  { key: "twoDigits", values: "45, 7, 90, 23, 8, 61" },
  { key: "reversed", values: "50, 40, 30, 20, 10" },
];

const DASH = "—";

/** A value with the digit at `place` underlined, e.g. 2<u>1</u> for the ones pass. */
function WithDigit({ value, place }: { value: number; place: number }) {
  const text = String(value).padStart(place === 10 ? 2 : 1, "0");
  const at = text.length - (place === 1 ? 1 : 2);
  return (
    <span>
      {text.slice(0, at)}
      <span className="underline decoration-2 underline-offset-4">{text[at]}</span>
      {text.slice(at + 1)}
    </span>
  );
}

function Buckets({ s }: { s: RadixSortStep }) {
  const { t } = useTranslation();
  return (
    <ol
      aria-label={t("viz.radix.bucketsLabel")}
      className="mx-auto mt-2 grid max-w-xl grid-cols-5 gap-2 sm:grid-cols-10"
    >
      {s.buckets.map((bucket, d) => (
        <li
          key={d}
          className={`flex min-h-24 flex-col items-center gap-1 rounded-control border-2 p-1 transition-colors duration-300 ${
            s.bucket === d ? "border-compare bg-compare-soft" : "border-line bg-surface"
          }`}
        >
          <span className="text-xs font-semibold text-muted">{d}</span>
          {bucket.map((x, k) => (
            <span
              key={`${x}-${k}`}
              className="rounded-sm border border-line bg-raised px-1.5 font-mono text-sm"
            >
              {x}
            </span>
          ))}
          <span className="sr-only">
            {t("viz.radix.bucketContents", {
              d,
              values: bucket.length > 0 ? bucket.join(", ") : t("viz.radix.emptyBucket"),
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Interactive radix sort: drop values into digit buckets, collect, repeat. */
export function RadixSortPlayer() {
  const [items, setItems] = useState<number[]>([21, 13, 32, 12]);
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-4">
      <SortInputForm
        presets={PRESETS}
        constraint="nonNegative"
        onRun={(next) => {
          setItems(next);
          setRun((n) => n + 1);
        }}
      />
      <RadixSortStage key={run} items={items} />
    </div>
  );
}

function RadixSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => radixSortSteps(items), [items]);

  const itemState =
    (s: RadixSortStep) =>
    (index: number): CellState => {
      if (s.done) return "found";
      if (s.p === index) return "comparing";
      if (s.p !== null && index < s.p) return "used";
      return "idle";
    };

  const predictionBefore = (u: RadixSortStep): Prediction | null => {
    if (u.p === null || u.place === null || u.bucket === null) return null;
    return {
      prompt: t("viz.predict.bucketQuestion", { x: u.items[u.p] }),
      options: Array.from({ length: 10 }, (_, d) => ({ id: String(d), label: String(d) })),
      correct: String(u.bucket),
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={RADIX_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        if ("digit" in vars) {
          return t(`viz.radix.${key}`, { ...vars, digit: t(`viz.radix.digit.${vars.digit}`) });
        }
        return t(`viz.radix.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <ArrayView
            items={s.items}
            stateOf={itemState(s)}
            markerRow={false}
            renderValue={(v) => (s.place === null ? v : <WithDigit value={v} place={s.place} />)}
          />
          <Buckets s={s} />
        </>
      )}
      vars={(s) => [
        { name: "place", value: s.place ?? DASH },
        { name: "x", value: s.p === null ? DASH : s.items[s.p] },
        {
          name: "digit",
          value: s.p === null || s.place === null ? DASH : digitOf(s.items[s.p] as number, s.place),
        },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
