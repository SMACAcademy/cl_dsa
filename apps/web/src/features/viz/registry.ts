import type { ComponentType } from "react";
import { BinarySearchPlayer } from "./BinarySearchPlayer";
import { BubbleSortPlayer } from "./BubbleSortPlayer";
import { CountingSortPlayer } from "./CountingSortPlayer";
import { ArrayPlayer } from "./ds/array";
import { DynamicArrayPlayer } from "./ds/dynamicArray";
import { AvlTreePlayer } from "./ds/avl";
import { MinHeapPlayer } from "./ds/binaryHeap";
import { BinaryTreePlayer } from "./ds/binaryTree";
import { BinarySearchTreePlayer } from "./ds/bst";
import { GraphPlayer } from "./ds/graph";
import {
  BfsPlayer,
  DfsPlayer,
  DijkstraPlayer,
  KruskalPlayer,
  TopoSortPlayer,
} from "./ds/graphAlgos";
import { ActivitySelectionPlayer, HuffmanPlayer } from "./ds/greedy";
import { HashSetPlayer, HashTablePlayer, OpenAddressingPlayer } from "./ds/hashing";
import { PrefixSumsPlayer, SlidingWindowPlayer, TwoPointersPlayer } from "./ds/patterns";
import { HanoiPlayer, RecursionPlayer } from "./ds/recursion";
import { SegmentTreePlayer } from "./ds/segmentTree";
import { TriePlayer } from "./ds/trie";
import { UnionFindPlayer } from "./ds/unionFind";
import { DoublyLinkedListPlayer, SinglyLinkedListPlayer } from "./ds/linkedList";
import { RingBufferPlayer } from "./ds/ringBuffer";
import { DequePlayer, QueuePlayer, StackPlayer } from "./ds/stackQueue";
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
  bfs: BfsPlayer,
  dfs: DfsPlayer,
  "topological-sort": TopoSortPlayer,
  dijkstra: DijkstraPlayer,
  kruskal: KruskalPlayer,
  recursion: RecursionPlayer,
  "tower-of-hanoi": HanoiPlayer,
  "two-pointers": TwoPointersPlayer,
  "sliding-window": SlidingWindowPlayer,
  "prefix-sums": PrefixSumsPlayer,
  "activity-selection": ActivitySelectionPlayer,
  "huffman-coding": HuffmanPlayer,
  // Data structures
  array: ArrayPlayer,
  "dynamic-array": DynamicArrayPlayer,
  "singly-linked-list": SinglyLinkedListPlayer,
  "doubly-linked-list": DoublyLinkedListPlayer,
  stack: StackPlayer,
  queue: QueuePlayer,
  "circular-queue": RingBufferPlayer,
  deque: DequePlayer,
  "hash-table": HashTablePlayer,
  "open-addressing": OpenAddressingPlayer,
  "hash-set": HashSetPlayer,
  "binary-tree": BinaryTreePlayer,
  "binary-search-tree": BinarySearchTreePlayer,
  "avl-tree": AvlTreePlayer,
  "binary-heap": MinHeapPlayer,
  trie: TriePlayer,
  "segment-tree": SegmentTreePlayer,
  graph: GraphPlayer,
  "union-find": UnionFindPlayer,
};

export function hasVisualizer(id: string): boolean {
  return Object.hasOwn(VISUALIZERS, id);
}
