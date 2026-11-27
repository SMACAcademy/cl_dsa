import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaOptions } from "./pwa.config.ts";

/** Cross-origin isolation, required for SharedArrayBuffer in the Pyodide worker (ADR-003, S1). */
export const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

const API_TARGET = "http://127.0.0.1:8000";

/**
 * `server.headers` is missing from Vite's 304 revalidation responses, and WebKit then blocks
 * module workers on reload (spike S1). Setting the headers in the first middleware covers every
 * response, 304s included, on both the dev and the preview server.
 */
const isolationEverywhere = (): Plugin => {
  const setHeaders = (
    _req: unknown,
    res: { setHeader(name: string, value: string): void },
    next: () => void,
  ) => {
    for (const [name, value] of Object.entries(isolationHeaders)) res.setHeader(name, value);
    next();
  };
  return {
    name: "algoverse:isolation-everywhere",
    configureServer: (server) => void server.middlewares.use(setHeaders),
    configurePreviewServer: (server) => void server.middlewares.use(setHeaders),
  };
};

export default defineConfig({
  // "/" locally; "/<repo>/" when the GitHub Pages workflow builds the public site.
  base: process.env["VITE_BASE"] ?? "/",
  plugins: [isolationEverywhere(), react(), tailwindcss(), VitePWA(pwaOptions)],
  server: {
    port: 5173,
    strictPort: true,
    headers: isolationHeaders,
    proxy: { "/api": API_TARGET },
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: isolationHeaders,
    proxy: { "/api": API_TARGET },
  },
  worker: { format: "es" },
  build: {
    rolldownOptions: {
      output: {
        // Framework code changes rarely; a separate chunk keeps it cached across app updates.
        codeSplitting: {
          groups: [
            // Only the landing page's 3D world uses three.js; keep it out of the shared vendor chunk.
            { name: "three", test: /node_modules[\\/]three[\\/]/, priority: 3 },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
              priority: 2,
            },
            { name: "vendor", test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
});
