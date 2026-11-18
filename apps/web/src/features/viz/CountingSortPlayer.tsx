import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrayView, type CellState } from "./ArrayView";
import { COUNTING_SORT_CODE, countingSortSteps, type CountingSortStep } from "./countingSort";
import { SortInputForm, type Preset } from "./SearchInputForm";
import { StepPlayer, type Prediction } from "./StepPlayer";

const PRESETS: readonly [Preset, ...Preset[]] = [
  { key: "mixed", values: "2, 0, 2, 1" },
  { key: "fewKeys", values: "3, 1, 3, 3, 1, 0" },
  { key: "reversed", values: "5, 4, 3, 2, 1" },
];

const DASH = "—";

function RowTitle({ children }: { children: string }) {
  return <p className="mt-2 text-center text-xs font-semibold text-muted">{children}</p>;
}

/** Interactive counting sort: tally each key, then write the keys out in order. */
export function CountingSortPlayer() {
  const [items, setItems] = useState<number[]>([2, 0, 2, 1]);
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-4">
      <SortInputForm
        presets={PRESETS}
        constraint="digits"
        onRun={(next) => {
          setItems(next);
          setRun((n) => n + 1);
        }}
      />
      <CountingSortStage key={run} items={items} />
    </div>
  );
}

function CountingSortStage({ items }: { items: number[] }) {
  const { t } = useTranslation();
  const steps = useMemo(() => countingSortSteps(items), [items]);
  const k = Math.max(...items);

  const itemState =
    (s: CountingSortStep) =>
    (index: number): CellState => {
      if (s.p !== null) return s.p === index ? "comparing" : index < s.p ? "used" : "idle";
      // Once every value has been tallied (writing out, or done), the input is used up.
      return s.line >= 8 ? "used" : "idle";
    };

  const predictionBefore = (u: CountingSortStep): Prediction | null => {
    if (u.p === null || u.key === null) return null;
    return {
      prompt: t("viz.predict.countQuestion", { p: u.p, x: items[u.p] }),
      options: Array.from({ length: k + 1 }, (_, v) => ({ id: String(v), label: `count[${v}]` })),
      correct: String(u.key),
    };
  };

  return (
    <StepPlayer
      steps={steps}
      code={COUNTING_SORT_CODE}
      line={(s) => s.line}
      narration={(s) => {
        const { key, ...vars } = s.narration;
        return t(`viz.counting.${key}`, vars);
      }}
      stage={(s) => (
        <>
          <RowTitle>{t("viz.counting.itemsRow")}</RowTitle>
          <ArrayView items={items} stateOf={itemState(s)} markerRow={false} />
          {s.counts.length > 0 && (
            <>
              <RowTitle>{t("viz.counting.countRow")}</RowTitle>
              <ArrayView
                label={t("viz.counting.countRow")}
                items={s.counts}
                stateOf={(v) => (s.key === v ? "comparing" : "idle")}
                markerRow={false}
              />
            </>
          )}
          <RowTitle>{t("viz.counting.resultRow")}</RowTitle>
          <ArrayView
            label={t("viz.counting.resultRow")}
            items={Array.from({ length: items.length }, (_, i) => s.result[i] ?? null)}
            stateOf={() => (s.done ? "found" : "idle")}
            markerRow={false}
          />
        </>
      )}
      vars={(s) => [
        { name: "k", value: s.counts.length > 0 ? k : DASH },
        { name: "x", value: s.p === null ? DASH : items[s.p] },
        { name: "count", value: s.counts.length > 0 ? `[${s.counts.join(", ")}]` : DASH },
        { name: "result", value: `[${s.result.join(", ")}]` },
      ]}
      predictionBefore={predictionBefore}
    />
  );
}
