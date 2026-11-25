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

  it("manifest declares name, start_url, standalone display and 3 icons", () => {
    expect(manifest.name).toBe("AlgoVerse");
    expect(manifest.short_name).toBe("AlgoVerse");
    expect(manifest.start_url).toBe("/");
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
      expect(existsSync(new URL(`../public${icon.src}`, import.meta.url)), icon.src).toBe(true);
    }
  });

  it("prompts for updates and precaches the app shell, never /api/", () => {
    expect(pwaOptions.registerType).toBe("prompt");
    expect(pwaOptions.workbox?.navigateFallback).toBe("/index.html");
    const deny = pwaOptions.workbox?.navigateFallbackDenylist ?? [];
    expect(deny.some((re) => re.test("/api/v1/me"))).toBe(true);
    expect(pwaOptions.workbox?.runtimeCaching ?? []).toEqual([]);
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

  it("proxy /api to the local API on both servers", () => {
    expect(config.server?.proxy?.["/api"]).toBe("http://127.0.0.1:8000");
    expect(config.preview?.proxy?.["/api"]).toBe("http://127.0.0.1:8000");
  });
});
