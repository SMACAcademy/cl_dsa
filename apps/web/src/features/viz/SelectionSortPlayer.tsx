import { useMemo, useState } from "react";
import { presetNumbers } from "./input";
import { useTranslation } from "react-i18next";
import { BarsView, type BarState } from "./BarsView";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { SELECTION_SORT_CODE, selectionSortSteps, type SelectionSortStep } from "./selectionSort";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "29, 10, 14, 37, 13, 5, 41, 22, 8, 33" },
  { key: "reversed", values: "10, 9, 8, 7, 6, 5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 3, 5, 4, 6, 7, 9, 8, 10" },
  { key: "sorted", values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10" },
  { key: "card", values: "3, 1, 4, 2" },
];

const DASH = "—";

/** Interactive selection sort: scan for the smallest value, then one swap per pass. */
export function SelectionSortPlayer() {
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
      <SelectionSortStage key={run} items={items} />
    </div>
  );
}

function SelectionSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => selectionSortSteps(items), [items]);

  const stateAt =
    (step: SelectionSortStep) =>
    (position: number): BarState => {
      if (step.swappedPair?.includes(position)) return "swapping";
      if (position < step.sortedUpTo) return "sorted";
      if (step.j === position && step.line === 6) return "comparing";
      if (step.smallest === position) return "minimum";
      return "idle";
    };

  const markersOf = (step: SelectionSortStep) => {
    const markers: { position: number; label: string }[] = [];
    if (step.i !== null) markers.push({ position: step.i, label: "i" });
    if (step.j !== null) markers.push({ position: step.j, label: "j" });
    return markers;
  };

  const predictionBefore = (upcoming: SelectionSortStep): Prediction | null => {
    if (upcoming.line !== 6 || upcoming.j === null || upcoming.smallest === null) return null;
    return {
      prompt: t("viz.predict.minQuestion", {
        j: upcoming.j,
        a: upcoming.values[upcoming.j],
        b: upcoming.values[upcoming.smallest],
      }),
      options: [
        { id: "yes", label: t("viz.predict.newMin") },
        { id: "no", label: t("viz.predict.notMin") },
      ],
      correct: upcoming.isNewMin ? "yes" : "no",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={SELECTION_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.selection.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <p className="mb-2 text-center text-sm text-muted">
            {t("viz.bubble.counters", { comparisons: s.comparisons, swaps: s.swaps })}
          </p>
          <BarsView values={s.values} ids={s.ids} stateAt={stateAt(s)} markers={markersOf(s)} />
        </>
      )}
      vars={(s) => [
        { name: "i", value: s.i ?? DASH },
        { name: "j", value: s.j ?? DASH },
        { name: "smallest", value: s.smallest ?? DASH },
        {
          name: "items[smallest]",
          value: s.smallest === null ? DASH : s.values[s.smallest],
        },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.swaps"), value: s.swaps },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
