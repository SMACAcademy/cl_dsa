const ROWS = 9;
const SIDE = 24;
const HEIGHT = (SIDE * Math.sqrt(3)) / 2;
const WIDTH = ROWS * SIDE;
const PYRAMID_I_ROWS = 2;

type Tile = { key: string; row: number; points: string };

/** Triangular grid geometry (PYRAMID_MODEL §2): row r has 2r+1 tiles, even columns upright. */
function tiles(): Tile[] {
  const out: Tile[] = [];
  const cx = WIDTH / 2;
  for (let row = 0; row < ROWS; row++) {
    const top = row * HEIGHT;
    const bottom = top + HEIGHT;
    for (let col = 0; col <= 2 * row; col++) {
      const k = Math.floor(col / 2);
      const x = cx + (k - row / 2) * SIDE;
      const pts =
        col % 2 === 0
          ? [
              [x, top],
              [x - SIDE / 2, bottom],
              [x + SIDE / 2, bottom],
            ]
          : [
              [x, top],
              [x + SIDE, top],
              [x + SIDE / 2, bottom],
            ];
      out.push({
        key: `${row}-${col}`,
        row,
        points: pts.map(([px, py]) => `${px!.toFixed(1)},${py!.toFixed(1)}`).join(" "),
      });
    }
  }
  return out;
}

const TILES = tiles();
const PYRAMID_I_OUTLINE = [
  [WIDTH / 2, 0],
  [WIDTH / 2 - SIDE, PYRAMID_I_ROWS * HEIGHT],
  [WIDTH / 2 + SIDE, PYRAMID_I_ROWS * HEIGHT],
]
  .map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`)
  .join(" ");

/** The 81-tile learning universe in miniature, coloured by tier. Pyramid I is highlighted. */
export function MiniPyramid({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`-2 -2 ${WIDTH + 4} ${ROWS * HEIGHT + 4}`}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {TILES.map((tile) => (
        <polygon
          key={tile.key}
          points={tile.points}
          fill={`var(--tier-${tile.row})`}
          fillOpacity={tile.row < PYRAMID_I_ROWS ? 0.95 : 0.3}
          stroke="var(--surface-raised)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ))}
      <polygon
        points={PYRAMID_I_OUTLINE}
        fill="none"
        stroke="var(--tier-0)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
