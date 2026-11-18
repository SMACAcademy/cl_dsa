import type { RouteObject } from "react-router";
import { LessonPlaceholder } from "../features/lesson/LessonPlaceholder";
import { DashboardPlaceholder } from "../features/placeholder/DashboardPlaceholder";
import { NotFound } from "../features/placeholder/NotFound";
import { SectionPlaceholder } from "../features/placeholder/SectionPlaceholder";
import { SettingsPlaceholder } from "../features/placeholder/SettingsPlaceholder";
import { AppShell } from "./AppShell";
import { ErrorFallback, RouteErrorFallback } from "./ErrorBoundary";
import { NAV_ITEMS, SETTINGS_PATH } from "./nav";

const sectionRoutes: RouteObject[] = NAV_ITEMS.filter((item) => item.path !== "/").map((item) => ({
  path: item.path.slice(1),
  element: <SectionPlaceholder id={item.id} />,
}));

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
];
