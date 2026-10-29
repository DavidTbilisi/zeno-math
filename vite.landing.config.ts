// The front page for schools on its own, for GitHub Pages (.github/workflows/pages.yml): npm run build:landing writes
// dist-landing/, served at https://davidtbilisi.github.io/zeno-math/. Only landing.html and what it imports; the
// app's public/ (Excalidraw's fonts) stays out, landing-public/ (the link preview image) goes in.
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/zeno-math/",
  publicDir: "landing-public",
  build: {
    outDir: "dist-landing",
    emptyOutDir: true,
    rollupOptions: { input: { index: resolve(import.meta.dirname, "landing.html") } },
  },
});
