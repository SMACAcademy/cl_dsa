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
  // New content ships often: a new version installs itself and the page reloads to it, so
  // returning visitors never see an old copy (no "Reload" notice to click).
  registerType: "autoUpdate",
  injectRegister: false, // registered by ui/UpdatePrompt.tsx through useRegisterSW
  includeAssets: ["icons/favicon.ico", "icons/pyramid.svg", "icons/apple-touch-icon-180x180.png"],
  manifest: {
    name: "AlgoVerse",
    short_name: "AlgoVerse",
    description: en.app.tagline,
    lang: "en",
    // start_url and scope are left out on purpose: the plugin fills both with Vite's `base`,
    // so the app installs correctly at "/" locally and at "/<repo>/" on GitHub Pages.
    display: "standalone",
    theme_color: DARK_SURFACE,
    background_color: DARK_SURFACE,
    // Relative to the manifest, so they work under any base path.
    icons: [
      { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
    navigateFallback: "index.html", // relative to the service worker, so it follows `base`
    navigateFallbackDenylist: [/^\/api\//],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
  },
};
