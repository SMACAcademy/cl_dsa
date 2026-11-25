import { useMemo, useState } from "react";
import { presetNumbers } from "./input";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState, type Marker } from "./ArrayView";
import { MERGE_SORT_CODE, mergeSortSteps, type MergeSortStep } from "./mergeSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "29, 10, 14, 37, 13, 5, 41, 22, 8, 33, 17, 2" },
  { key: "reversed", values: "12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1" },
  { key: "nearlySorted", values: "1, 2, 3, 5, 4, 6, 7, 9, 8, 10" },
  { key: "sorted", values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10" },
  { key: "card", values: "6, 2, 5, 1" },
];

const DASH = "—";

/** Interactive merge sort: split into halves, then merge with two fingers. */
export function MergeSortPlayer() {
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
      <MergeSortStage key={run} items={items} />
    </div>
  );
}

function MergeSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => mergeSortSteps(items), [items]);

  const stateOf =
    (s: MergeSortStep) =>
    (index: number): CellState => {
      if (s.done) return "found";
      if (s.lo === null || s.hi === null || s.mid === null) return "idle";
      if (index < s.lo || index >= s.hi) return "outside";
      if (s.justMerged) return "found";
      if (s.merging) {
        // A value already taken into the result is "used", even if it was just compared.
        const usedLeft = index < s.mid && index - s.lo < s.i;
        const usedRight = index >= s.mid && index - s.mid < s.j;
        if (usedLeft || usedRight) return "used";
      }
      if (s.compared?.includes(index)) return "comparing";
      return "idle";
    };

  const markersOf = (s: MergeSortStep): Marker[] => {
    if (!s.merging || s.lo === null || s.mid === null || s.hi === null) return [];
    const markers: Marker[] = [];
    if (s.lo + s.i < s.mid) markers.push({ index: s.lo + s.i, label: "i" });
    if (s.mid + s.j < s.hi) markers.push({ index: s.mid + s.j, label: "j" });
    return markers;
  };

  const rangesOf = (s: MergeSortStep) => {
    if (s.done || s.lo === null || s.mid === null || s.hi === null) return [];
    if (s.justMerged) return [{ from: s.lo, to: s.hi - 1, label: t("viz.ranges.merged") }];
    return [
      { from: s.lo, to: s.mid - 1, label: t("viz.ranges.left") },
      { from: s.mid, to: s.hi - 1, label: t("viz.ranges.right") },
    ];
  };

  const predictionBefore = (u: MergeSortStep): Prediction | null => {
    if (u.compared === null) return null;
    // The main array is only rewritten when a merge finishes, so the pair is still in place.
    const [pa, pb] = u.compared;
    const a = u.values[pa] as number;
    const b = u.values[pb] as number;
    return {
      prompt: t("viz.predict.mergeQuestion", { a, b }),
      options: [
        { id: "left", label: t("viz.predict.takeLeft", { value: a }) },
        { id: "right", label: t("viz.predict.takeRight", { value: b }) },
      ],
      correct: u.narration.key === "takeLeft" ? "left" : "right",
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={MERGE_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.merge.${key}`, vars);
      }}
      stage={(s) => {
        const size = s.lo !== null && s.hi !== null ? s.hi - s.lo : 0;
        return (
          <>
            <p className="mb-1 text-center text-sm text-muted">
              {t("viz.merge.counters", { comparisons: s.comparisons })}
            </p>
            <ArrayView
              items={s.values}
              stateOf={stateOf(s)}
              markers={markersOf(s)}
              ranges={rangesOf(s)}
            />
            {s.merging && (
              <div className="mt-2">
                <p className="text-center text-xs font-semibold text-muted">
                  {t("viz.merge.resultLabel")}
                </p>
                <ArrayView
                  label={t("viz.merge.resultLabel")}
                  items={Array.from({ length: size }, (_, k) => s.result[k] ?? null)}
                  stateOf={() => "idle"}
                  showIndex={false}
                  markerRow={false}
                  sizeFor={s.values.length}
                />
              </div>
            )}
          </>
        );
      }}
      vars={(s) => [
        {
          name: "left",
          value:
            s.lo === null || s.mid === null ? DASH : `[${s.values.slice(s.lo, s.mid).join(", ")}]`,
        },
        {
          name: "right",
          value:
            s.mid === null || s.hi === null ? DASH : `[${s.values.slice(s.mid, s.hi).join(", ")}]`,
        },
        { name: "i", value: s.merging ? s.i : DASH },
        { name: "j", value: s.merging ? s.j : DASH },
        { name: "result", value: s.merging ? `[${s.result.join(", ")}]` : DASH },
        { name: t("viz.vars.comparisons"), value: s.comparisons },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
