// The server's answer checker as one file with mathjs and MathJax inside (server/checker.ts), for the Docker image,
// which has no node_modules: npm run build:checker writes dist-server/checker.js.
import { defineConfig } from "vite";

export default defineConfig({
  define: { "process.env.IS_PREACT": JSON.stringify("false") },
  ssr: { noExternal: true },
  build: {
    ssr: "server/checker.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "node24",
  },
});
