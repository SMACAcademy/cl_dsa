import { Tooltip } from "radix-ui";
import { useState, type ReactNode } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import "../lib/i18n";
import { ErrorBoundary } from "./ErrorBoundary";
import { appRoutes } from "./routes";

/** App-wide providers, shared by the real app and the tests. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
    </ErrorBoundary>
  );
}

export function App() {
  // On GitHub Pages the site lives under /<repo>/; BASE_URL carries that prefix.
  const [router] = useState(() =>
    createBrowserRouter(appRoutes, {
      basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
    }),
  );
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
