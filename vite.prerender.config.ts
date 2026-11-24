// The second half of npm run build:landing: src/topic-prerender.tsx built for Node (dist-prerender/), which
// scripts/landing-layout.mjs then runs to write the topic pages into dist-landing/.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: "src/topic-prerender.tsx",
    outDir: "dist-prerender",
    emptyOutDir: true,
    copyPublicDir: false,
  },
});
