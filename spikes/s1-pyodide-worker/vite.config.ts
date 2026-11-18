import { defineConfig, type Plugin } from "vite";

const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

// Vite's `server.headers` is missing from 304 (revalidation) responses, and WebKit then
// refuses the module worker on reload ("blocked by Cross-Origin-Embedder-Policy").
// Setting the headers in the first middleware covers every response, 304 included.
const isolationEverywhere = (): Plugin => ({
  name: "isolation-everywhere",
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      for (const [k, v] of Object.entries(isolation)) res.setHeader(k, v);
      next();
    });
  },
});

export default defineConfig({
  server: { headers: isolation, port: 5171, strictPort: true },
  preview: { headers: isolation },
  worker: { format: "es" },
  plugins: [isolationEverywhere()],
});
