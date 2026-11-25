import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState, type Marker } from "./ArrayView";
import {
  BINARY_SEARCH_CODE,
  binarySearchSteps,
  isDiscarded,
  type BinarySearchStep,
} from "./binarySearch";
import { presetNumbers, type SearchInput } from "./input";
import { SearchInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";
import { TargetLine } from "./TargetLine";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "right", values: "1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23", target: "17" },
  { key: "left", values: "2, 4, 6, 8, 10, 12, 14, 16, 18, 20", target: "4" },
  { key: "missing", values: "2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24", target: "15" },
  { key: "card", values: "1, 3, 5, 7, 9, 11", target: "7" },
];

const DASH = "—";

/** Interactive binary search on a sorted tiny array, with lo / mid / hi markers. */
export function BinarySearchPlayer() {
  const [input, setInput] = useState<SearchInput>(() => ({
    items: presetNumbers(PRESETS[0].values),
    target: Number(PRESETS[0].target),
  }));
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-4">
      <SearchInputForm
        presets={PRESETS}
        requireSorted
        onRun={(next) => {
          setInput(next);
          setRun((n) => n + 1);
        }}
      />
      <BinarySearchStage key={run} {...input} />
    </div>
  );
}

function BinarySearchStage({ items, target }: SearchInput) {
  const { t } = useTranslation();
  const steps = useMemo(() => binarySearchSteps(items, target), [items, target]);

  const stateOf =
    (step: BinarySearchStep) =>
    (index: number): CellState => {
      if (step.found === index) return "found";
      if (step.comparing === index) return "comparing";
      if (isDiscarded(step, index)) return "discarded";
      return "idle";
    };

  const markersOf = (step: BinarySearchStep): Marker[] => {
    const markers: Marker[] = [];
    if (step.lo !== null) markers.push({ index: step.lo, label: "lo" });
    if (step.mid !== null) markers.push({ index: step.mid, label: "mid" });
    if (step.hi !== null) markers.push({ index: step.hi, label: "hi" });
    return markers;
  };

  const predictionBefore = (upcoming: BinarySearchStep): Prediction | null => {
    if (upcoming.comparing === null || upcoming.direction === null) return null;
    return {
      prompt: t("viz.predict.binaryQuestion", {
        mid: upcoming.comparing,
        value: items[upcoming.comparing],
        target,
      }),
      options: [
        { id: "left", label: t("viz.predict.direction.left") },
        { id: "found", label: t("viz.predict.direction.here") },
        { id: "right", label: t("viz.predict.direction.right") },
      ],
      correct: upcoming.direction,
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={BINARY_SEARCH_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.binary.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <TargetLine target={target} />
          <ArrayView items={items} stateOf={stateOf(s)} markers={markersOf(s)} />
        </>
      )}
      vars={(s) => [
        { name: "lo", value: s.lo ?? DASH },
        { name: "hi", value: s.hi ?? DASH },
        { name: "mid", value: s.mid ?? DASH },
        { name: "items[mid]", value: s.mid === null ? DASH : items[s.mid] },
        { name: "target", value: target },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.returned"), value: s.result ?? DASH },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
