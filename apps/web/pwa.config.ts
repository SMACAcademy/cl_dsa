import type { VitePWAOptions } from "vite-plugin-pwa";
import en from "./src/locales/en.json" with { type: "json" };

/** Dark `--surface` token (src/index.css); the installed app's splash and title bar colour. */
const DARK_SURFACE = "#0f1420";

/**
 * Installable PWA (ADR-020). Workbox precaches the app shell only; `/api/` is never served from
 * the cache. Precached responses are stored with the headers the server sent at install time, so
 * COOP/COEP (cross-origin isolation for Pyodide) survive when the service worker answers.
 */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "prompt",
  injectRegister: false, // registered by ui/UpdatePrompt.tsx through useRegisterSW
  includeAssets: ["icons/favicon.ico", "icons/pyramid.svg", "icons/apple-touch-icon-180x180.png"],
  manifest: {
    name: "AlgoVerse",
    short_name: "AlgoVerse",
    description: en.app.tagline,
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: DARK_SURFACE,
    background_color: DARK_SURFACE,
    icons: [
      { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
  },
};
