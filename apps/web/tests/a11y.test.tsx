import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { ROUTE_PATHS } from "../src/app/routes";
import { applyTheme } from "../src/ui/theme";
import { renderRoute } from "./render";

// jsdom cannot compute colour contrast; tokens.test.ts checks the token pairs instead.
const PATHS = [...ROUTE_PATHS, "/no/such/page"];

describe.each(["light", "dark"] as const)("axe, %s theme", (theme) => {
  it.each(PATHS)("%s has no axe violations", async (path) => {
    applyTheme(theme);
    renderRoute(path);
    await screen.findByRole("heading", { level: 1 });
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe("menus", () => {
  it("the open theme menu has no axe violations and switches the theme", async () => {
    const user = userEvent.setup();
    renderRoute("/");
    await user.click(await screen.findByRole("button", { name: /^Theme:/ }));
    const dark = await screen.findByRole("menuitemradio", { name: "Dark" });
    expect(await axe(document.body)).toHaveNoViolations();
    await user.click(dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("the open account menu has no axe violations", async () => {
    const user = userEvent.setup();
    renderRoute("/");
    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await screen.findByRole("menuitem", { name: "Settings" });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("the settings theme radio group switches the theme", async () => {
    const user = userEvent.setup();
    renderRoute("/settings");
    await user.click(await screen.findByRole("radio", { name: /Light/ }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("radio", { name: /Light/ })).toBeChecked();
  });
});
