import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates the PWA icons once from the brand mark (ruling B15). The PNGs are committed;
// re-run `pnpm --filter @algoverse/web generate-pwa-assets` only when pyramid.svg changes.
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: "#0f1420" } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: "#0f1420" } },
  },
  images: ["public/icons/pyramid.svg"],
});
