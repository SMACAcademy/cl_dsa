import type { ComponentType } from "react";
import { BinarySearchPlayer } from "./BinarySearchPlayer";
import { BubbleSortPlayer } from "./BubbleSortPlayer";
import { LinearSearchPlayer } from "./LinearSearchPlayer";

/** Catalog ids that already have an interactive visualization, one per build step. */
export const VISUALIZERS: Readonly<Record<string, ComponentType>> = {
  "linear-search": LinearSearchPlayer,
  "binary-search": BinarySearchPlayer,
  "bubble-sort": BubbleSortPlayer,
};

export function hasVisualizer(id: string): boolean {
  return Object.hasOwn(VISUALIZERS, id);
}
