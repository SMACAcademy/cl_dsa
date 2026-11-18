import type { ComponentType } from "react";
import { BinarySearchPlayer } from "./BinarySearchPlayer";
import { BubbleSortPlayer } from "./BubbleSortPlayer";
import { CountingSortPlayer } from "./CountingSortPlayer";
import { HeapSortPlayer } from "./HeapSortPlayer";
import { InsertionSortPlayer } from "./InsertionSortPlayer";
import { LinearSearchPlayer } from "./LinearSearchPlayer";
import { MergeSortPlayer } from "./MergeSortPlayer";
import { QuickSortPlayer } from "./QuickSortPlayer";
import { RadixSortPlayer } from "./RadixSortPlayer";
import { SelectionSortPlayer } from "./SelectionSortPlayer";

/** Catalog ids that already have an interactive visualization. */
export const VISUALIZERS: Readonly<Record<string, ComponentType>> = {
  "linear-search": LinearSearchPlayer,
  "binary-search": BinarySearchPlayer,
  "bubble-sort": BubbleSortPlayer,
  "selection-sort": SelectionSortPlayer,
  "insertion-sort": InsertionSortPlayer,
  "merge-sort": MergeSortPlayer,
  "quick-sort": QuickSortPlayer,
  "heap-sort": HeapSortPlayer,
  "counting-sort": CountingSortPlayer,
  "radix-sort": RadixSortPlayer,
};

export function hasVisualizer(id: string): boolean {
  return Object.hasOwn(VISUALIZERS, id);
}
