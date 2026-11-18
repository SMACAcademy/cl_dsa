import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  readThemePref,
  resolveTheme,
  setThemePref,
  THEME_STORAGE_KEY,
  writeThemePref,
} from "../src/ui/theme";

function stubSystemDark(dark: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: dark && query.includes("dark"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyTheme", () => {
  it("applyTheme('dark') sets data-theme", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("applyTheme('light') sets data-theme", () => {
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("resolves 'system' through matchMedia", () => {
    stubSystemDark(true);
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    stubSystemDark(false);
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("falls back to light when matchMedia throws", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(() => {
      throw new Error("no matchMedia");
    });
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("readThemePref", () => {
  it("defaults to 'system'", () => {
    expect(readThemePref()).toBe("system");
  });

  it("reads a stored preference from av.theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(THEME_STORAGE_KEY).toBe("av.theme");
    expect(readThemePref()).toBe("dark");
  });

  it("ignores an invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(readThemePref()).toBe("system");
  });

  it("readThemePref survives a throwing localStorage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readThemePref()).toBe("system");
  });

  it("survives localStorage itself being inaccessible", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readThemePref()).toBe("system");
    expect(() => writeThemePref("dark")).not.toThrow();
  });
});

describe("setThemePref", () => {
  it("persists, applies and survives a throwing setItem", () => {
    setThemePref("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => setThemePref("light")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
