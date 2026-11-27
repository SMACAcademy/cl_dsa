import type { ReactNode } from "react";
import type { FlowKind } from "./model";

/**
 * The shape each kind of moving data takes, centred on (0, 0) and about 12 units across:
 * requests and responses are dots, writes are data blocks, events are envelopes, files are
 * documents, copies are stacked pages, model output is a stream of token sparks, heavy work is
 * a crate. Shapes differ as well as colours, so meaning never relies on colour alone.
 */
export function FlowGlyph({ kind, children }: { kind: FlowKind; children?: ReactNode }) {
  const cls = `scene-dot-${kind}`;
  switch (kind) {
    case "event":
      return (
        <g className={cls}>
          <rect x={-7} y={-5} width={14} height={10} rx={1.5} />
          <path d="M-6.2 -4 L0 0.8 L6.2 -4" className="scene-glyph-line" />
          {children}
        </g>
      );
    case "file":
      return (
        <g className={cls}>
          <path d="M-4.5 -6.5 H2 L5 -3.5 V6.5 H-4.5 Z" />
          <path d="M-2.5 -1 H3 M-2.5 1.5 H3 M-2.5 4 H1.5" className="scene-glyph-line" />
          {children}
        </g>
      );
    case "copy":
      return (
        <g className={cls}>
          <rect x={-5} y={-6} width={8} height={10} rx={1} opacity={0.55} />
          <rect x={-3} y={-4} width={8} height={10} rx={1} />
          {children}
        </g>
      );
    case "token":
      return (
        <g className={cls}>
          <path d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" />
          {children}
        </g>
      );
    case "write":
      return (
        <g className={cls}>
          <rect x={-4.5} y={-4.5} width={9} height={9} rx={1.5} />
          {children}
        </g>
      );
    case "heavy":
      return (
        <g className={cls}>
          <rect x={-6.5} y={-6.5} width={13} height={13} rx={2} />
          <path d="M-6.5 -1 H6.5 M-1 -6.5 V6.5" className="scene-glyph-line" />
          {children}
        </g>
      );
    default:
      return (
        <g className={cls}>
          <circle r={4.5} />
          {children}
        </g>
      );
  }
}
