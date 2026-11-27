import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * After a production build, writes the app's HTML once per public page (src/app/staticPages.ts)
 * with that page's title, as both `<path>.html` and `<path>/index.html`. GitHub Pages then
 * answers every deep link with a real page (HTTP 200) instead of its 404 fallback, so search
 * engines index the pages and link previews show the right title. With VITE_SITE_URL set (the
 * Pages workflow sets it), it also writes sitemap.xml.
 */
const staticPages = (): Plugin => {
  let root = process.cwd();
  let outDir = "dist";
  let done = false;
  return {
    name: "algoverse:static-pages",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      if (done) return;
      done = true;
      // Load the page list with Vite itself, so TypeScript, TSX and JSON imports just work.
      const { createServer } = await import("vite");
      const server = await createServer({
        root,
        configFile: false,
        logLevel: "error",
        appType: "custom",
        server: { middlewareMode: true, hmr: false },
        // Only data modules are loaded; there is nothing to pre-bundle.
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [react()],
      });
      try {
        const mod = await server.ssrLoadModule("/src/app/staticPages.ts");
        const pages = (mod.staticPages as () => { path: string; title: string }[])();
        const site = process.env["VITE_SITE_URL"] ?? "";
        const shell = await readFile(join(outDir, "index.html"), "utf8");
        for (const page of pages) {
          if (page.path === "/") continue;
          const url = site ? `${site}${page.path.slice(1)}` : "";
          const html = shell
            .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
            .replace(/(property="og:title" content=")[^"]*"/, `$1${escapeHtml(page.title)}"`)
            .replace(/(property="og:url" content=")[^"]*"/, (m, start: string) =>
              url ? `${start}${url}"` : m,
            );
          for (const file of [`${page.path}.html`, `${page.path}/index.html`]) {
            const target = join(outDir, file);
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, html);
          }
        }
        if (site) {
          const urls = pages
            .map((p) => `  <url><loc>${escapeHtml(site + p.path.slice(1))}</loc></url>`)
            .join("\n");
          await writeFile(
            join(outDir, "sitemap.xml"),
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          );
        }
      } finally {
        await server.close();
      }
    },
  };
};

export default defineConfig({
  // "/" locally; "/<repo>/" when the GitHub Pages workflow builds the public site.
  base: process.env["VITE_BASE"] ?? "/",
  plugins: [isolationEverywhere(), react(), tailwindcss(), VitePWA(pwaOptions), staticPages()],
  server: {
    port: 5173,
    strictPort: true,
    headers: isolationHeaders,
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: isolationHeaders,
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
