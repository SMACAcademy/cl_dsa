// Minimal tween engine: matches by id, linear interpolation with ease-out, rAF-driven.
export type Attrs = { id: string; x: number; y: number; h: number };

export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t);

/** Pure interpolation at eased progress `e` (0..1). Output order follows `to`; ids missing from `from` are taken from `to` as-is. */
export function interpolate(from: Attrs[], to: Attrs[], e: number): Attrs[] {
  const f = new Map(from.map((a) => [a.id, a]));
  return to.map((b) => {
    const a = f.get(b.id) ?? b;
    return { id: b.id, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, h: a.h + (b.h - a.h) * e };
  });
}

export function animate(
  from: Attrs[],
  to: Attrs[],
  durationMs: number,
  onFrame: (attrs: Attrs[]) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let start: number | undefined;
    const tick = (now: number) => {
      try {
        start ??= now;
        const t = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs);
        if (t >= 1) {
          onFrame(to.map((b) => ({ ...b })));
          resolve();
          return;
        }
        onFrame(interpolate(from, to, easeOut(t)));
        requestAnimationFrame(tick);
      } catch (e) {
        reject(e);
      }
    };
    requestAnimationFrame(tick);
  });
}
