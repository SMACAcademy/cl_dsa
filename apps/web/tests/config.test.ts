// @vitest-environment node
import { existsSync } from "node:fs";
import type { UserConfig } from "vite";
import { describe, expect, it } from "vitest";
import { pwaOptions } from "../pwa.config.ts";
import viteConfig, { isolationHeaders } from "../vite.config.ts";

const config = viteConfig as UserConfig;

describe("PWA (ADR-020)", () => {
  const manifest = pwaOptions.manifest;
  if (!manifest) throw new Error("manifest missing");

  it("manifest declares name, standalone display and 3 icons; start_url follows the base", () => {
    expect(manifest.name).toBe("AlgoVerse");
    expect(manifest.short_name).toBe("AlgoVerse");
    // Left unset so vite-plugin-pwa fills start_url and scope from Vite's base path.
    expect(manifest.start_url).toBeUndefined();
    expect(manifest.scope).toBeUndefined();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons?.map((i) => [i.sizes, i.purpose ?? "any"])).toEqual([
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ]);
  });

  it("theme and background colours come from the dark surface token", () => {
    expect(manifest.theme_color).toBe("#0f1420");
    expect(manifest.background_color).toBe("#0f1420");
  });

  it("every manifest icon exists in public/", () => {
    for (const icon of manifest.icons ?? []) {
      expect(icon.src.startsWith("/"), `${icon.src} is relative`).toBe(false);
      expect(existsSync(new URL(`../public/${icon.src}`, import.meta.url)), icon.src).toBe(true);
    }
  });

  it("installs updates automatically and precaches only the app shell", () => {
    expect(pwaOptions.registerType).toBe("autoUpdate");
    expect(pwaOptions.workbox?.skipWaiting).toBe(true);
    expect(pwaOptions.workbox?.clientsClaim).toBe(true);
    expect(pwaOptions.workbox?.navigateFallback).toBe("index.html");
    // The per-page HTML copies written for GitHub Pages are not precached; index.html is.
    const globs = pwaOptions.workbox?.globPatterns ?? [];
    expect(globs).toContain("index.html");
    expect(globs.some((g) => /html/.test(g) && g !== "index.html")).toBe(false);
    expect(pwaOptions.workbox?.runtimeCaching ?? []).toEqual([]);
  });
});

describe("public site on GitHub Pages", () => {
  it("serves from / unless VITE_BASE says otherwise", () => {
    expect(config.base).toBe(process.env["VITE_BASE"] ?? "/");
  });
});

describe("dev and preview servers (ruling B8)", () => {
  it("send COOP/COEP so the page is cross-origin isolated", () => {
    expect(isolationHeaders).toEqual({
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });
    expect(config.server?.headers).toEqual(isolationHeaders);
    expect(config.preview?.headers).toEqual(isolationHeaders);
  });

  it("need no back-end: nothing is proxied to a server", () => {
    expect(config.server?.proxy).toBeUndefined();
    expect(config.preview?.proxy).toBeUndefined();
  });

  it("write a real page for every public route after the build", () => {
    const names = (config.plugins ?? []).flat().map((p) => (p && "name" in p ? p.name : ""));
    expect(names).toContain("algoverse:static-pages");
  });
});
