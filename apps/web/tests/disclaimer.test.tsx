import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "./render";

describe("disclaimer", () => {
  it("says what the site is and isn't responsible for, and how to get a mistake fixed", async () => {
    renderRoute("/disclaimer");
    expect(await screen.findByRole("heading", { level: 1, name: "Disclaimer" })).toBeVisible();
    for (const name of [
      "For learning only",
      "Mistakes can happen",
      "Provided as is",
      "Examples are invented",
      "Your data",
      "Found a mistake? Help us fix it",
      "The code",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    expect(screen.getByText(/without warranty of any kind/)).toBeVisible();
    expect(screen.getByText(/written with the help of AI tools/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Report it" })).toHaveAttribute(
      "href",
      "https://github.com/SMACAcademy/cl_dsa/issues/new?template=content-fix.yml",
    );
    expect(screen.getByRole("link", { name: /pull request/ })).toHaveAttribute(
      "href",
      "https://github.com/SMACAcademy/cl_dsa/blob/main/CONTRIBUTING.md",
    );
    expect(screen.getByRole("link", { name: "Read the licence" })).toHaveAttribute(
      "href",
      "https://github.com/SMACAcademy/cl_dsa/blob/main/LICENSE",
    );
  });

  it("is linked from the footer of the app and of the landing page", async () => {
    renderRoute("/home");
    const footer = await screen.findByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Disclaimer" })).toHaveAttribute(
      "href",
      "/disclaimer",
    );
  });

  it("is linked from the landing page", async () => {
    renderRoute("/");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("link", { name: "Disclaimer" })).toHaveAttribute("href", "/disclaimer");
  });
});
