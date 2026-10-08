// Copies Excalidraw's font files into public/ so the app works fully offline
// (by default Excalidraw would fetch them from the esm.sh CDN).
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
const dest = "public/fonts";
// Xiaolai is the hand-drawn font's Chinese, Japanese and Korean glyphs: 209 subsets, 12.7 MB, more than everything
// else in the build together. Zeno's languages don't use them; text in those scripts falls back to a system font.
const skip = ["Xiaolai"];

if (!existsSync(dest)) {
  cpSync(src, dest, { recursive: true });
  console.log(`copied ${src} -> ${dest}`);
}
for (const family of skip) {
  const dir = join(dest, family);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
    console.log(`left out ${dir}`);
  }
}
