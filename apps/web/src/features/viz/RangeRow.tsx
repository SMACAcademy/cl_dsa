/** A labelled bracket under a span of positions, e.g. "sorted part" or "≤ pivot". */
export type Range = { from: number; to: number; label: string };

const ROW_HEIGHT = 22;

/** Puts each range on the first row where it does not overlap an earlier one. */
function assignRows(ranges: readonly Range[]): number[] {
  const rows: Range[][] = [];
  return ranges.map((r) => {
    let row = rows.findIndex((taken) => taken.every((t) => r.from > t.to || r.to < t.from));
    if (row === -1) {
      row = rows.length;
      rows.push([]);
    }
    rows[row]?.push(r);
    return row;
  });
}

/** Brackets drawn under cells laid out at `slot` px intervals, each `cell` px wide. */
export function RangeRow({
  ranges,
  slot,
  cell,
  width,
}: {
  ranges: readonly Range[];
  slot: number;
  cell: number;
  width: number;
}) {
  const visible = ranges.filter((r) => r.to >= r.from);
  if (visible.length === 0) return null;
  const rowOf = assignRows(visible);
  const rowCount = Math.max(...rowOf) + 1;
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto"
      style={{ width, height: ROW_HEIGHT * rowCount }}
    >
      {visible.map((r, k) => (
        <div
          key={`${r.label}-${k}`}
          className="absolute flex flex-col items-center transition-all duration-300"
          style={{
            left: r.from * slot,
            width: (r.to - r.from) * slot + cell,
            top: (rowOf[k] ?? 0) * ROW_HEIGHT,
          }}
        >
          <span className="h-1.5 w-full rounded-b-sm border-x-2 border-b-2 border-control" />
          <span className="text-[11px] leading-4 whitespace-nowrap text-muted">{r.label}</span>
        </div>
      ))}
    </div>
  );
}
