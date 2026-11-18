import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "./ArrayView";
import type { SearchInput } from "./input";
import { LINEAR_SEARCH_CODE, linearSearchSteps, type LinearSearchStep } from "./linearSearch";
import { SearchInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";
import { TargetLine } from "./TargetLine";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "middle", values: "4, 8, 1, 9", target: "1" },
  { key: "first", values: "6, 2, 7, 3", target: "6" },
  { key: "missing", values: "5, 3, 8", target: "4" },
];

const DASH = "—";

/** Interactive linear search: choose a tiny input, then step, play or predict. */
export function LinearSearchPlayer() {
  const [input, setInput] = useState<SearchInput>({ items: [4, 8, 1, 9], target: 1 });
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-4">
      <SearchInputForm
        presets={PRESETS}
        onRun={(next) => {
          setInput(next);
          setRun((n) => n + 1);
        }}
      />
      <LinearSearchStage key={run} {...input} />
    </div>
  );
}

function LinearSearchStage({ items, target }: SearchInput) {
  const { t } = useTranslation();
  const steps = useMemo(() => linearSearchSteps(items, target), [items, target]);

  const stateOf =
    (step: LinearSearchStep) =>
    (index: number): CellState => {
      if (step.found === index) return "found";
      if (step.comparing === index) return "comparing";
      if (step.checked.includes(index)) return "checked";
      return "idle";
    };

  const predictionBefore = (upcoming: LinearSearchStep): Prediction | null => {
    if (upcoming.comparing === null) return null;
    return {
      prompt: t("viz.predict.question", {
        i: upcoming.comparing,
        value: items[upcoming.comparing],
        target,
      }),
      options: [
        { id: "yes", label: t("viz.predict.yes") },
        { id: "no", label: t("viz.predict.no") },
      ],
      correct: upcoming.narration.key === "compareYes" ? "yes" : "no",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={LINEAR_SEARCH_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.linear.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <TargetLine target={target} />
          <ArrayView
            items={items}
            stateOf={stateOf(s)}
            markers={s.i === null ? [] : [{ index: s.i, label: "i" }]}
          />
        </>
      )}
      vars={(s) => [
        { name: "i", value: s.i ?? DASH },
        { name: "items[i]", value: s.i === null ? DASH : items[s.i] },
        { name: "target", value: target },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
        { name: t("viz.vars.returned"), value: s.result ?? DASH },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
