// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_COLORS } from "../src/ui/theme";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]!]),
  );
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const themes = { light: block(":root"), dark: block(':root[data-theme="dark"]') };

describe("design tokens", () => {
  it("the brand accent is #5b6cff", () => {
    expect(themes.light.accent).toBe("#5b6cff");
    expect(themes.dark.accent).toBe("#5b6cff");
  });

  it("tier colours match the pyramid-universe legend (UI_UX §1)", () => {
    const legend = [
      "#f5b942",
      "#f5b942",
      "#3cb4a0",
      "#3cb4a0",
      "#4c8bf5",
      "#4c8bf5",
      "#8b6cf0",
      "#f07a4c",
      "#9aa3ad",
    ];
    expect(legend.map((_, i) => themes.light[`tier-${i}`])).toEqual(legend);
  });

  it("the dark-system media block repeats the dark tokens exactly", () => {
    expect(block(':root:not([data-theme="light"])')).toEqual(themes.dark);
  });

  it("theme.ts browser-chrome colours match the surface tokens", () => {
    expect(THEME_COLORS.light).toBe(themes.light.surface);
    expect(THEME_COLORS.dark).toBe(themes.dark.surface);
  });

  describe.each(Object.entries(themes))("%s theme contrast (WCAG 2.2 AA)", (_name, t) => {
    const text: [string, string][] = [
      ["text", "surface"],
      ["text", "surface-raised"],
      ["text", "surface-sunken"],
      ["muted", "surface"],
      ["muted", "surface-raised"],
      ["muted", "surface-sunken"],
      ["accent-ink", "surface"],
      ["accent-ink", "surface-raised"],
      ["accent-ink", "accent-soft"],
      ["on-accent", "accent-solid"],
      ["viz-compare-ink", "viz-compare-soft"],
      ["viz-compare-ink", "surface"],
      ["viz-compare-ink", "surface-raised"],
      ["viz-found-ink", "viz-found-soft"],
      ["viz-found-ink", "surface"],
      ["viz-found-ink", "surface-raised"],
    ];
    it.each(text)("%s on %s is at least 4.5:1", (fg, bg) => {
      expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
    });

    const ui: [string, string][] = [
      ["focus-ring", "surface"],
      ["focus-ring", "surface-raised"],
      ["control-border", "surface-raised"],
      ["viz-compare", "surface-raised"],
      ["viz-found", "surface-raised"],
    ];
    it.each(ui)("%s on %s is at least 3:1", (fg, bg) => {
      expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3);
    });
  });
});
