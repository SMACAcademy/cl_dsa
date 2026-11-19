import type { RouteObject } from "react-router";
import type { CatalogKind } from "../features/catalog/catalog";
import { CatalogDetail } from "../features/catalog/CatalogDetail";
import { CatalogList } from "../features/catalog/CatalogList";
import { LessonPlaceholder } from "../features/lesson/LessonPlaceholder";
import { DashboardPlaceholder } from "../features/placeholder/DashboardPlaceholder";
import { NotFound } from "../features/placeholder/NotFound";
import { SectionPlaceholder } from "../features/placeholder/SectionPlaceholder";
import { SettingsPlaceholder } from "../features/placeholder/SettingsPlaceholder";
import { AppShell } from "./AppShell";
import { ErrorFallback, RouteErrorFallback } from "./ErrorBoundary";
import { NAV_ITEMS, SETTINGS_PATH, type SectionId } from "./nav";

/** Sections whose list screen is the algorithm / data-structure catalog. */
const CATALOG_SECTIONS: Partial<Record<SectionId, CatalogKind>> = {
  algorithms: "algorithm",
  structures: "structure",
};

const sectionRoutes: RouteObject[] = NAV_ITEMS.filter((item) => item.path !== "/").flatMap(
  (item): RouteObject[] => {
    const kind = CATALOG_SECTIONS[item.id];
    if (!kind) return [{ path: item.path.slice(1), element: <SectionPlaceholder id={item.id} /> }];
    return [
      { path: item.path.slice(1), element: <CatalogList kind={kind} /> },
      { path: `${item.path.slice(1)}/:itemId`, element: <CatalogDetail kind={kind} /> },
    ];
  },
);

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    children: [
      {
        // Pathless layout route: a screen that throws renders the fallback inside the shell.
        errorElement: <RouteErrorFallback />,
        children: [
          { index: true, element: <DashboardPlaceholder /> },
          ...sectionRoutes,
          { path: SETTINGS_PATH.slice(1), element: <SettingsPlaceholder /> },
          { path: "learn/:conceptId", element: <LessonPlaceholder /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];

/** Every concrete route (with a sample concept id), used by the a11y suite. */
export const ROUTE_PATHS: readonly string[] = [
  ...NAV_ITEMS.map((item) => item.path),
  SETTINGS_PATH,
  "/learn/first-algorithms.binary-search",
  "/algorithms/binary-search",
  "/algorithms/linear-search",
  "/algorithms/bubble-sort",
  "/algorithms/insertion-sort",
  "/algorithms/merge-sort",
  "/algorithms/quick-sort",
  "/algorithms/heap-sort",
  "/algorithms/counting-sort",
  "/algorithms/radix-sort",
  "/algorithms/bfs",
  "/algorithms/topological-sort",
  "/algorithms/dijkstra",
  "/algorithms/kruskal",
  "/algorithms/recursion",
  "/algorithms/tower-of-hanoi",
  "/algorithms/two-pointers",
  "/algorithms/sliding-window",
  "/algorithms/prefix-sums",
  "/algorithms/activity-selection",
  "/algorithms/huffman-coding",
  "/algorithms/fibonacci-memo",
  "/algorithms/coin-change",
  "/algorithms/knapsack",
  "/algorithms/lcs",
  "/algorithms/edit-distance",
  "/algorithms/subsets",
  "/algorithms/n-queens",
  "/structures/hash-table",
  "/structures/array",
  "/structures/dynamic-array",
  "/structures/singly-linked-list",
  "/structures/doubly-linked-list",
  "/structures/stack",
  "/structures/queue",
  "/structures/circular-queue",
  "/structures/deque",
  "/structures/open-addressing",
  "/structures/hash-set",
  "/structures/binary-tree",
  "/structures/binary-search-tree",
  "/structures/avl-tree",
  "/structures/binary-heap",
  "/structures/trie",
  "/structures/segment-tree",
  "/structures/graph",
  "/structures/union-find",
  "/algorithms/no-such-item",
];
