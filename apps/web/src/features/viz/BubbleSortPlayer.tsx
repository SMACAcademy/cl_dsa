import { useMemo, useState } from "react";
import { presetNumbers } from "./input";
import { useTranslation } from "react-i18next";
import { BarsView, type BarState } from "./BarsView";
import { BUBBLE_SORT_CODE, bubbleSortSteps, type BubbleSortStep } from "./bubbleSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "29, 10, 14, 37, 13, 5, 41, 22, 8, 33" },
  { key: "reversed", values: "10, 9, 8, 7, 6, 5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 3, 5, 4, 6, 7, 9, 8, 10" },
  { key: "sorted", values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10" },
  { key: "card", values: "5, 1, 4, 2" },
];

const DASH = "—";

/** Interactive bubble sort: bars swap places, the sorted tail turns green. */
export function BubbleSortPlayer() {
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
      <BubbleSortStage key={run} items={items} />
    </div>
  );
}

function BubbleSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => bubbleSortSteps(items), [items]);

  const stateAt =
    (step: BubbleSortStep) =>
    (position: number): BarState => {
      if (step.comparing?.includes(position)) return step.justSwapped ? "swapping" : "comparing";
      if (position >= step.sortedFrom) return "sorted";
      return "idle";
    };

  const predictionBefore = (upcoming: BubbleSortStep): Prediction | null => {
    if (upcoming.line !== 6 || upcoming.comparing === null || upcoming.needsSwap === null) {
      return null;
    }
    const [j, k] = upcoming.comparing;
    return {
      prompt: t("viz.predict.swapQuestion", {
        j,
        k,
        a: upcoming.values[j],
        b: upcoming.values[k],
      }),
      options: [
        { id: "swap", label: t("viz.predict.swap") },
        { id: "keep", label: t("viz.predict.keep") },
      ],
      correct: upcoming.needsSwap ? "swap" : "keep",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={BUBBLE_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.bubble.${key}`, vars);
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
            markers={
              s.comparing
                ? [
                    { position: s.comparing[0], label: "j" },
                    { position: s.comparing[1], label: "j+1" },
                  ]
                : []
            }
          />
        </>
      )}
      vars={(s) => [
        { name: "pass", value: s.pass ?? DASH },
        { name: "end", value: s.end ?? DASH },
        { name: "j", value: s.j ?? DASH },
        { name: "items[j]", value: s.j === null ? DASH : s.values[s.j] },
        { name: "items[j+1]", value: s.j === null ? DASH : s.values[s.j + 1] },
        { name: "swapped", value: s.swapped === null ? DASH : s.swapped ? "True" : "False" },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.swaps"), value: s.swaps },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
