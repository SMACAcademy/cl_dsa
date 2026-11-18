import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "../src/lib/i18n";
import { UpdatePrompt } from "../src/ui/UpdatePrompt";

const sw = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: vi.fn(async () => undefined),
}));

vi.mock("virtual:pwa-register/react", async () => {
  const { useState } = await import("react");
  return {
    useRegisterSW: () => ({
      needRefresh: useState(sw.needRefresh),
      offlineReady: useState(sw.offlineReady),
      updateServiceWorker: sw.updateServiceWorker,
    }),
  };
});

describe("UpdatePrompt", () => {
  it("renders nothing visible while no update is waiting", () => {
    sw.needRefresh = false;
    render(<UpdatePrompt />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("offers a reload when a new service worker is waiting", async () => {
    sw.needRefresh = true;
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    expect(screen.getByText("A new version of AlgoVerse is available.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("can be dismissed", async () => {
    sw.needRefresh = true;
    const user = userEvent.setup();
    render(<UpdatePrompt />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
