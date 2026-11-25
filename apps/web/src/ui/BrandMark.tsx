/** The AlgoVerse pyramid mark (same geometry as public/icons/pyramid.svg). Decorative. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="30 60 452 393" aria-hidden="true" focusable="false" className={className}>
      <g fill="var(--accent)">
        <polygon
          points="256,66 366,256.5 146,256.5"
          transform="translate(256 193) scale(0.9) translate(-256 -193)"
        />
        <polygon
          points="146,256.5 256,447 36,447"
          transform="translate(146 383.5) scale(0.9) translate(-146 -383.5)"
        />
        <polygon
          points="366,256.5 476,447 256,447"
          transform="translate(366 383.5) scale(0.9) translate(-366 -383.5)"
        />
      </g>
      <polygon
        points="146,256.5 366,256.5 256,447"
        fill="var(--accent)"
        fillOpacity="0.45"
        transform="translate(256 320) scale(0.9) translate(-256 -320)"
      />
    </svg>
  );
}
