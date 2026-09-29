// Copies Excalidraw's font files into public/ so the app works fully offline
// (by default Excalidraw would fetch them from the esm.sh CDN).
import { cpSync, existsSync } from "node:fs";

const src = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
const dest = "public/fonts";

if (!existsSync(dest)) {
  cpSync(src, dest, { recursive: true });
  console.log(`copied ${src} -> ${dest}`);
}
