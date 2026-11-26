import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CREATOR, hasCreator } from "../src/branding";
import { LESSONS } from "../src/features/systems/lessons";
import { renderRoute } from "./render";

describe("About page and branding", () => {
  it("/about explains the site and links into the labs", async () => {
    renderRoute("/about");
    expect(await screen.findByRole("heading", { level: 1, name: "About AlgoVerse" })).toBeVisible();
    const main = screen.getByRole("main");
    expect(within(main).getByText(String(LESSONS.length))).toBeVisible();
    expect(within(main).getByRole("link", { name: /Start the System Design Lab/ })).toHaveAttribute(
      "href",
      "/systems",
    );
    expect(within(main).getByRole("link", { name: "Source code on GitHub" })).toHaveAttribute(
      "href",
      CREATOR.github,
    );
  });

  it("the top bar links to About from every page", async () => {
    renderRoute("/algorithms");
    await screen.findByRole("heading", { level: 1, name: "Algorithm Lab" });
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("shows the creator card only when a name is filled in", async () => {
    renderRoute("/about");
    await screen.findByRole("heading", { level: 1, name: "About AlgoVerse" });
    const card = screen.queryByText("Built by");
    if (hasCreator()) expect(card).toBeVisible();
    else expect(card).toBeNull();
  });

  it("links the creator's name and the About card to LinkedIn", async () => {
    renderRoute("/about");
    await screen.findByRole("heading", { level: 1, name: "About AlgoVerse" });
    if (!CREATOR.linkedin) return;
    expect(CREATOR.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/?$/);
    const button = screen.getByRole("link", { name: "Connect on LinkedIn" });
    expect(button).toHaveAttribute("href", CREATOR.linkedin);
    expect(button).toHaveAttribute("rel", expect.stringContaining("noopener"));
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", { name: CREATOR.name })).toHaveAttribute(
      "href",
      CREATOR.linkedin,
    );
  });

  it("presents the creator's work, not a job search", async () => {
    renderRoute("/about");
    await screen.findByRole("heading", { level: 1, name: "About AlgoVerse" });
    if (!hasCreator()) return;
    expect(screen.getByText(CREATOR.headline)).toBeVisible();
    const focus = screen.getByRole("list", { name: "Areas of work" });
    expect(within(focus).getAllByRole("listitem")).toHaveLength(CREATOR.focus.length);
    expect(screen.queryByText(/new roles|hiring|job/i)).toBeNull();
  });
});
