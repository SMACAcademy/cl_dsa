import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarsView, type BarState } from "./BarsView";
import { INSERTION_SORT_CODE, insertionSortSteps, type InsertionSortStep } from "./insertionSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "4, 1, 3, 2" },
  { key: "reversed", values: "5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 4, 3, 5" },
  { key: "sorted", values: "1, 2, 3, 4" },
];

const DASH = "—";

/** Interactive insertion sort: lift a key and slide it left into the sorted part. */
export function InsertionSortPlayer() {
  const [items, setItems] = useState<number[]>([4, 1, 3, 2]);
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
      <InsertionSortStage key={run} items={items} />
    </div>
  );
}

function InsertionSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => insertionSortSteps(items), [items]);

  const stateAt =
    (s: InsertionSortStep) =>
    (position: number): BarState => {
      if (s.done) return "sorted";
      if (s.keyPos === position) return "key";
      if (s.j === position) return "comparing";
      return "idle";
    };

  const predictionBefore = (u: InsertionSortStep): Prediction | null => {
    if (u.j === null || u.shiftNeeded === null || u.keyPos === null) return null;
    return {
      prompt: t("viz.predict.shiftQuestion", {
        j: u.j,
        a: u.values[u.j],
        key: u.values[u.keyPos],
      }),
      options: [
        { id: "shift", label: t("viz.predict.shift") },
        { id: "stop", label: t("viz.predict.stop") },
      ],
      correct: u.shiftNeeded ? "shift" : "stop",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={INSERTION_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.insertion.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <p className="mb-2 text-center text-sm text-muted">
            {t("viz.insertion.counters", { comparisons: s.comparisons, shifts: s.shifts })}
          </p>
          <BarsView
            values={s.values}
            ids={s.ids}
            stateAt={stateAt(s)}
            markers={[
              ...(s.keyPos !== null ? [{ position: s.keyPos, label: "key" }] : []),
              ...(s.j !== null ? [{ position: s.j, label: "j" }] : []),
            ]}
            ranges={
              s.done ? [] : [{ from: 0, to: s.sortedUpTo - 1, label: t("viz.ranges.sortedPart") }]
            }
          />
        </>
      )}
      vars={(s) => [
        { name: "i", value: s.i ?? DASH },
        { name: "key", value: s.keyPos === null ? DASH : s.values[s.keyPos] },
        { name: "j", value: s.j ?? DASH },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.shifts"), value: s.shifts },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
