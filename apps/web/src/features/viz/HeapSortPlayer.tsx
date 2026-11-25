import { useMemo, useState } from "react";
import { presetNumbers } from "./input";
import { useTranslation } from "react-i18next";
import { BarsView, type BarState } from "./BarsView";
import { HEAP_SORT_CODE, heapSortSteps, type HeapSortStep } from "./heapSort";
import { HeapTree } from "./HeapTree";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "29, 10, 14, 37, 13, 5, 41, 22, 8, 33" },
  { key: "reversed", values: "10, 9, 8, 7, 6, 5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 3, 5, 4, 6, 7, 9, 8, 10" },
  { key: "sorted", values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10" },
  { key: "card", values: "4, 1, 3" },
];

const DASH = "—";

/** Interactive heap sort: the array as a max-heap tree, then max-to-the-end. */
export function HeapSortPlayer() {
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
      <HeapSortStage key={run} items={items} />
    </div>
  );
}

function HeapSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => heapSortSteps(items), [items]);

  const stateAt =
    (s: HeapSortStep) =>
    (position: number): BarState => {
      if (s.done) return "sorted";
      if (s.swappedPair?.includes(position)) return "swapping";
      if (position >= s.heapSize) return "sorted";
      if (s.root === position || s.child === position) return "comparing";
      return "idle";
    };

  const predictionBefore = (u: HeapSortStep): Prediction | null => {
    if (u.swapNeeded === null || u.root === null || u.child === null) return null;
    // Read the pair before the swap: on a swap step the two values have traded places.
    const v = u.swapNeeded ? u.values[u.child] : u.values[u.root];
    const c = u.swapNeeded ? u.values[u.root] : u.values[u.child];
    return {
      prompt: t("viz.predict.heapQuestion", { v, c }),
      options: [
        { id: "swap", label: t("viz.predict.swap") },
        { id: "stop", label: t("viz.predict.heapStop") },
      ],
      correct: u.swapNeeded ? "swap" : "stop",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={HEAP_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.heap.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <p className="mb-2 text-center text-sm text-muted">
            {t("viz.bubble.counters", { comparisons: s.comparisons, swaps: s.swaps })}
          </p>
          <HeapTree values={s.values} heapSize={s.done ? 0 : s.heapSize} stateAt={stateAt(s)} />
          <BarsView
            values={s.values}
            ids={s.ids}
            stateAt={stateAt(s)}
            markers={[
              ...(s.root !== null ? [{ position: s.root, label: "root" }] : []),
              ...(s.child !== null ? [{ position: s.child, label: "child" }] : []),
            ]}
            ranges={
              s.done || s.heapSize === 0
                ? []
                : [{ from: 0, to: s.heapSize - 1, label: t("viz.ranges.heap") }]
            }
          />
        </>
      )}
      vars={(s) => [
        { name: "size", value: s.done ? 0 : s.heapSize },
        { name: "root", value: s.root ?? DASH },
        { name: "child", value: s.child ?? DASH },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.swaps"), value: s.swaps },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
