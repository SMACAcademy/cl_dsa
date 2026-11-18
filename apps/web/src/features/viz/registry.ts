import type { ComponentType } from "react";
import { LinearSearchPlayer } from "./LinearSearchPlayer";

/** Catalog ids that already have an interactive visualization, one per build step. */
export const VISUALIZERS: Readonly<Record<string, ComponentType>> = {
  "linear-search": LinearSearchPlayer,
};

export function hasVisualizer(id: string): boolean {
  return Object.hasOwn(VISUALIZERS, id);
}
