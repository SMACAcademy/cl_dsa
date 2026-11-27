import type { RouteObject } from "react-router";
import type { CatalogKind } from "../features/catalog/catalog";
import { CatalogDetail } from "../features/catalog/CatalogDetail";
import { CatalogList } from "../features/catalog/CatalogList";
import { LessonPlaceholder } from "../features/lesson/LessonPlaceholder";
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

type LazyPage = NonNullable<RouteObject["lazy"]>;

/** Built sections, each loaded on first visit to keep the main bundle small. */
const PAGES: Partial<Record<SectionId, LazyPage>> = {
  universe: async () => ({
    Component: (await import("../features/map/UniversePage")).UniversePage,
  }),
  curriculum: async () => ({
    Component: (await import("../features/map/CurriculumPage")).CurriculumPage,
  }),
  playground: async () => ({
    Component: (await import("../features/playground/PlaygroundPage")).PlaygroundPage,
  }),
  projects: async () => ({
    Component: (await import("../features/projects/ProjectsPage")).ProjectsPage,
  }),
  problems: async () => ({
    Component: (await import("../features/practice/PracticePage")).PracticePage,
  }),
  library: async () => ({
    Component: (await import("../features/library/LibraryPage")).LibraryPage,
  }),
  progress: async () => ({
    Component: (await import("../features/progress/ProgressPage")).ProgressPage,
  }),
};

const sectionRoutes: RouteObject[] = NAV_ITEMS.filter((item) => item.id !== "dashboard").flatMap(
  (item): RouteObject[] => {
    if (item.id === "systems") {
      // The 40 lessons are loaded on first visit, keeping them out of the main bundle.
      return [
        {
          path: "systems",
          lazy: async () => ({
            Component: (await import("../features/systems/SystemsHome")).SystemsHome,
          }),
        },
        {
          path: "systems/lab",
          lazy: async () => ({
            Component: (await import("../features/systems/lab/LabHome")).LabHome,
          }),
        },
        {
          path: "systems/lab/:problemId",
          lazy: async () => ({
            Component: (await import("../features/systems/lab/DesignLabPage")).DesignLabPage,
          }),
        },
        {
          path: "systems/case/:caseId",
          lazy: async () => ({
            Component: (await import("../features/systems/cases/CasePage")).CasePage,
          }),
        },
        {
          path: "systems/:lessonId",
          lazy: async () => ({
            Component: (await import("../features/systems/LessonPage")).LessonPage,
          }),
        },
      ];
    }
    const page = PAGES[item.id];
    if (page) return [{ path: item.path.slice(1), lazy: page }];
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
    errorElement: <ErrorFallback />,
    // Shown for a moment when the first page is a lazily loaded one.
    hydrateFallbackElement: <div aria-busy="true" className="min-h-dvh bg-surface" />,
    children: [
      {
        // The landing page: full screen, outside the app shell. three.js loads only here.
        index: true,
        lazy: async () => ({
          Component: (await import("../features/landing/Landing")).Landing,
        }),
      },
      {
        element: <AppShell />,
        children: [
          {
            // Pathless layout route: a screen that throws renders the fallback inside the shell.
            errorElement: <RouteErrorFallback />,
            children: [
              {
                path: "home",
                lazy: async () => ({
                  Component: (await import("../features/home/HomePage")).HomePage,
                }),
              },
              ...sectionRoutes,
              { path: SETTINGS_PATH.slice(1), element: <SettingsPlaceholder /> },
              {
                path: "about",
                lazy: async () => ({
                  Component: (await import("../features/about/AboutPage")).AboutPage,
                }),
              },
              { path: "learn/:conceptId", element: <LessonPlaceholder /> },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];

/** Every concrete route (with a sample concept id), used by the a11y suite. */
export const ROUTE_PATHS: readonly string[] = [
  "/",
  ...NAV_ITEMS.map((item) => item.path),
  SETTINGS_PATH,
  "/about",
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
  "/algorithms/string-matching",
  "/algorithms/kmp",
  "/algorithms/gcd",
  "/algorithms/sieve",
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
  "/structures/lru-cache",
  "/structures/bloom-filter",
  "/systems/load-balancing",
  "/systems/load-balancing?step=4",
  "/systems/lab",
  "/systems/lab/link-shortener",
  "/systems/rag",
  "/systems/lab/booking-agent",
  "/systems/no-such-lesson",
  "/algorithms/no-such-item",
];
