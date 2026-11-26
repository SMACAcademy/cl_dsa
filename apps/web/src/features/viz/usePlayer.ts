import { useCallback, useEffect, useState } from "react";

export const SPEEDS = [0.5, 1, 2, 3] as const;
export type Speed = (typeof SPEEDS)[number];
const BASE_DELAY_MS = 1000;
/** Players start at 2×: one step every half second. */
export const DEFAULT_SPEED: Speed = 2;

/**
 * Step-player state for a fixed list of steps: current index, play/pause and speed.
 * Playback holds on the last step, and on any step where `canAdvance` returns false
 * (e.g. a prediction question waiting for an answer); it resumes once allowed.
 * To start over with a new step list, remount the component (give it a new `key`).
 */
export function usePlayer(stepCount: number, canAdvance: (index: number) => boolean = () => true) {
  const [index, setIndex] = useState(0);
  const [wantsPlay, setWantsPlay] = useState(false);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const last = Math.max(0, stepCount - 1);
  const playing = wantsPlay && index < last && canAdvance(index);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last]);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(next, BASE_DELAY_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, index, speed, next]);

  const stopAnd = (f: () => void) => () => {
    setWantsPlay(false);
    f();
  };

  return {
    index,
    last,
    atStart: index === 0,
    atEnd: index >= last,
    playing,
    speed,
    setSpeed,
    play: () => setWantsPlay(true),
    pause: () => setWantsPlay(false),
    next: stopAnd(next),
    /** Advance without stopping playback (used after answering a prediction). */
    advance: next,
    prev: stopAnd(() => setIndex((i) => Math.max(i - 1, 0))),
    reset: stopAnd(() => setIndex(0)),
    replay: () => {
      setIndex(0);
      setWantsPlay(true);
    },
  };
}
