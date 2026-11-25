import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouteObject } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/app/App";
import { ErrorBoundary } from "../src/app/ErrorBoundary";
import { NAV_ITEMS } from "../src/app/nav";
import { appRoutes } from "../src/app/routes";
import i18n from "../src/lib/i18n";
import { renderRoute } from "./render";

const SPEC_ORDER = [
  "/",
  "/universe",
  "/curriculum",
  "/algorithms",
  "/structures",
  "/systems",
  "/playground",
  "/problems",
  "/projects",
  "/progress",
  "/library",
];

const navLinks = () =>
  within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");

describe("navigation", () => {
  it("renders 11 nav links in spec order", async () => {
    render(<App />);
    // The home page loads lazily; the shell appears once it has.
    await screen.findByRole("navigation", { name: "Main" });
    expect(navLinks().map((l) => l.getAttribute("href"))).toEqual(SPEC_ORDER);
  });

  it("NAV_ITEMS lists the 11 sections in spec order with translated labels", () => {
    expect(NAV_ITEMS.map((item) => item.path)).toEqual(SPEC_ORDER);
    for (const item of NAV_ITEMS) expect(i18n.exists(item.labelKey)).toBe(true);
  });

  it("nav link marks the active route with aria-current=page", () => {
    renderRoute("/curriculum");
    const current = navLinks().filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.getAttribute("href"))).toEqual(["/curriculum"]);
  });

  it("clicking a rail link routes to that section and moves aria-current", async () => {
    const user = userEvent.setup();
    renderRoute("/");
    await user.click(await screen.findByRole("link", { name: "Algorithm Lab" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Algorithm Lab" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Algorithm Lab" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("the skip-to-content link is the first focusable element and targets main", async () => {
    const user = userEvent.setup();
    renderRoute("/universe");
    await user.tab();
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("settings is reachable from the account menu", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/");
    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Settings" }));
    expect(router.state.location.pathname).toBe("/settings");
    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });
});

describe("placeholder screens", () => {
  it.each([
    ["/universe", "Learning Universe", 2],
    ["/curriculum", "Curriculum", 2],
    ["/algorithms", "Algorithm Lab", 4],
    ["/structures", "Data Structure Lab", 5],
    ["/playground", "Python Playground", 4],
    ["/projects", "Real-World Projects", 9],
  ])("%s shows its title and when it arrives", async (path, title, phase) => {
    renderRoute(path);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(screen.getAllByText(`Coming in phase ${phase}`).length).toBeGreaterThan(0);
  });

  it("/learn/:conceptId renders the lesson placeholder with the concept id", async () => {
    renderRoute("/learn/first-algorithms.binary-search");
    expect(await screen.findByRole("heading", { level: 1, name: "Lesson player" })).toBeVisible();
    expect(screen.getByText("first-algorithms.binary-search")).toBeVisible();
  });

  it("unknown paths render a not-found page that links home", async () => {
    renderRoute("/no/such/page");
    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to the dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("sets the document title from the section name", async () => {
    renderRoute("/library");
    await screen.findByRole("heading", { level: 1, name: "Knowledge Library" });
    expect(document.title).toBe("Knowledge Library · AlgoVerse");
  });
});

describe("error boundary", () => {
  it("shows a friendly fallback instead of a blank screen", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error("boom");
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reload" })).toBeVisible();
    spy.mockRestore();
  });

  it("a crashing route keeps the shell and shows the fallback inside it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error("boom");
    };
    const withBoom = (route: RouteObject): RouteObject =>
      route.errorElement && !route.path
        ? ({
            ...route,
            children: [{ path: "boom", element: <Boom /> }, ...(route.children ?? [])],
          } as RouteObject)
        : ({ ...route, children: route.children?.map(withBoom) } as RouteObject);
    const routes = appRoutes.map(withBoom);
    renderRoute("/boom", routes);
    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeVisible();
    spy.mockRestore();
  });
});
