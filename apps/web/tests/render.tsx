import { render, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { AppProviders } from "../src/app/App";
import { appRoutes } from "../src/app/routes";

export function renderRoute(path: string, routes: RouteObject[] = appRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, router };
}

/**
 * Switches a player to its small "Card example" preset, when it has one.
 * The players open on bigger inputs; the card example is the small one the
 * step-by-step page tests were written against.
 */
export async function startFromCard(user: UserEvent) {
  const card = screen.queryByRole("button", { name: "Card example (small)" });
  if (card) await user.click(card);
}
