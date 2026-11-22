import { useMemo, useState } from "react";
import { presetNumbers } from "./input";
import { useTranslation } from "react-i18next";
import { BarsView, type BarState } from "./BarsView";
import { QUICK_SORT_CODE, quickSortSteps, type QuickSortStep } from "./quickSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "29, 10, 14, 37, 13, 5, 41, 22, 8, 33" },
  { key: "reversed", values: "10, 9, 8, 7, 6, 5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 3, 5, 4, 6, 7, 9, 8, 10" },
  { key: "sorted", values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10" },
  { key: "card", values: "3, 6, 1, 5, 2" },
];

const DASH = "—";

/** Interactive quick sort: partition around a pivot, then sort each side. */
export function QuickSortPlayer() {
  const [items, setItems] = useState<number[]>(() => presetNumbers(PRESETS[0].values));
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-4">
      <SortInputForm
        presets={PRESETS}
        onRun={(next) => {
          setItems(next);
          setRun((n) => n + 1);
        }}
      />
      <QuickSortStage key={run} items={items} />
    </div>
  );
}

function QuickSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => quickSortSteps(items), [items]);

  const stateAt =
    (s: QuickSortStep) =>
    (position: number): BarState => {
      if (s.done) return "sorted";
      if (s.swappedPair?.includes(position)) return "swapping";
      if (s.final.includes(position)) return "sorted";
      if (s.pivotPos === position) return "pivot";
      if (s.j === position) return "comparing";
      if (s.lo !== null && s.hi !== null && (position < s.lo || position > s.hi)) {
        return "outside";
      }
      return "idle";
    };

  const rangesOf = (s: QuickSortStep) => {
    if (s.pivotPos === null || s.lo === null || s.i === null) return [];
    const scanned = s.j ?? s.lo - 1;
    return [
      { from: s.lo, to: s.i, label: t("viz.ranges.small") },
      { from: s.i + 1, to: scanned, label: t("viz.ranges.big") },
    ];
  };

  const markersOf = (s: QuickSortStep) => {
    const markers: { position: number; label: string }[] = [];
    if (s.pivotPos !== null && s.i !== null && s.i >= 0 && s.lo !== null && s.i >= s.lo) {
      markers.push({ position: s.i, label: "i" });
    }
    if (s.j !== null) markers.push({ position: s.j, label: "j" });
    return markers;
  };

  const predictionBefore = (u: QuickSortStep): Prediction | null => {
    if (u.line !== 14 || u.j === null || u.small === null || u.pivotPos === null) return null;
    return {
      prompt: t("viz.predict.pivotQuestion", { a: u.values[u.j], pivot: u.values[u.pivotPos] }),
      options: [
        { id: "small", label: t("viz.predict.smallSide") },
        { id: "big", label: t("viz.predict.bigSide") },
      ],
      correct: u.small ? "small" : "big",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={QUICK_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.quick.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <p className="mb-2 text-center text-sm text-muted">
            {t("viz.bubble.counters", { comparisons: s.comparisons, swaps: s.swaps })}
          </p>
          <BarsView
            values={s.values}
            ids={s.ids}
            stateAt={stateAt(s)}
            markers={markersOf(s)}
            ranges={rangesOf(s)}
          />
        </>
      )}
      vars={(s) => [
        { name: "lo", value: s.lo ?? DASH },
        { name: "hi", value: s.hi ?? DASH },
        { name: "pivot", value: s.pivotPos === null ? DASH : s.values[s.pivotPos] },
        { name: "i", value: s.i ?? DASH },
        { name: "j", value: s.j ?? DASH },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.swaps"), value: s.swaps },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
