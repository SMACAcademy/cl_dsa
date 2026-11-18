import { useId } from "react";

const SIDE = 48;
const HEIGHT = (SIDE * Math.sqrt(3)) / 2;

/** A faint triangular grid, the brand motif, drawn in `currentColor`. Decorative. */
export function TriangleLattice({ className }: { className?: string }) {
  const id = `lattice-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const h = HEIGHT.toFixed(2);
  const h2 = (2 * HEIGHT).toFixed(2);
  return (
    <svg aria-hidden="true" focusable="false" className={className} width="100%" height="100%">
      <defs>
        <pattern id={id} width={SIDE} height={2 * HEIGHT} patternUnits="userSpaceOnUse">
          <path
            d={`M0 0H${SIDE} M0 ${h}H${SIDE} M0 0L${SIDE} ${h2} M${SIDE} 0L0 ${h2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
