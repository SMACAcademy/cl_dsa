import { defineConfig, type Plugin } from "vite";

const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

// Same fix as S1: set the headers in the first middleware so 304 responses carry them too.
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
  server: { headers: isolation, port: 5172, strictPort: true },
  build: { rollupOptions: { input: "bench.html" } },
  worker: { format: "es" },
  plugins: [isolationEverywhere()],
});
