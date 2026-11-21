// Lets the board's paper (src/paper.ts) into Excalidraw. Excalidraw 0.18.1 draws its square grid in one place and rounds
// points to it in one function; these small edits make each of those places ask `globalThis.__zenoPaper` first, and
// do exactly what they did before when it isn't set:
//   draw  - paint the paper where the grid would go (on screen, and in a PNG export with its background)
//   svg   - add the paper to an SVG export with its background
//   snap  - round a point to the paper (isometric dots, polar rings and rays)
//   move  - round a dragged drawing's move to the paper (whole isometric dots, so a cube stays on them)
// Both builds are changed: dist/dev (vite dev) and dist/prod (the app's build). Runs on `npm install` (postinstall);
// running it again changes nothing. If Excalidraw's code doesn't match (after an upgrade), it stops with an error
// rather than leave the paper silently half working.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "node_modules/@excalidraw/excalidraw/dist";
const H = "globalThis.__zenoPaper";

const edits = {
  dev: [
    {
      name: "snap",
      find: "var getGridPoint = (x, y, gridSize) => {\n  if (gridSize) {",
      put: `var getGridPoint = (x, y, gridSize) => {\n  const zenoSnap = gridSize && ${H}?.snap?.(x, y, gridSize);\n  if (zenoSnap) return zenoSnap;\n  if (gridSize) {`,
    },
    {
      name: "move",
      find: "    const [nextGridX, nextGridY] = getGridPoint(\n      x + dragOffset.x,",
      put: `    const [nextGridX, nextGridY] = gridSize && ${H}?.move?.(x, y, dragOffset.x, dragOffset.y, gridSize) || getGridPoint(\n      x + dragOffset.x,`,
    },
    {
      name: "draw",
      find: "  context.scale(appState.zoom.value, appState.zoom.value);\n  if (renderGrid) {\n    strokeGrid(",
      put: `  context.scale(appState.zoom.value, appState.zoom.value);\n  if (!${H}?.draw?.(context, appState, renderGrid, isExporting, normalizedWidth / appState.zoom.value, normalizedHeight / appState.zoom.value) && renderGrid) {\n    strokeGrid(`,
    },
    {
      name: "svg",
      find: '    rect.setAttribute("fill", viewBackgroundColor);\n    svgRoot.appendChild(rect);\n',
      put: `    rect.setAttribute("fill", viewBackgroundColor);\n    svgRoot.appendChild(rect);\n    ${H}?.svg?.(svgRoot, appState, offsetX, offsetY, width, height);\n`,
    },
  ],
  prod: [
    {
      name: "snap",
      find: "Vr=(e,t,n)=>n?[Math.round(e/n)*n,Math.round(t/n)*n]:[e,t]",
      put: `Vr=(e,t,n)=>n&&${H}?.snap?.(e,t,n)||(n?[Math.round(e/n)*n,Math.round(t/n)*n]:[e,t])`,
    },
    {
      name: "move",
      find: "let[d,c]=Vr(o+t.x,i+t.y,r);",
      put: `let[d,c]=r&&${H}?.move?.(o,i,t.x,t.y,r)||Vr(o+t.x,i+t.y,r);`,
    },
    {
      name: "draw",
      find: "p.scale(a.zoom.value,a.zoom.value),d&&g7(p,",
      put: `p.scale(a.zoom.value,a.zoom.value),!${H}?.draw?.(p,a,d,c,l/a.zoom.value,U/a.zoom.value)&&d&&g7(p,`,
    },
    {
      name: "svg",
      find: 'B.setAttribute("fill",s),x.appendChild(B)}',
      put: `B.setAttribute("fill",s),x.appendChild(B),${H}?.svg?.(x,t,g,h,b,E)}`,
    },
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
let failed = false;
for (const [build, list] of Object.entries(edits)) {
  const dir = join(root, build);
  const files = readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => join(dir, f));
  const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
  const changed = new Set();
  for (const e of list) {
    const done = files.filter((f) => text.get(f).includes(e.put));
    const todo = files.filter((f) => count(text.get(f), e.find) > 0);
    // Done already (an edit may keep the text it found, so that text being there too proves nothing).
    if (done.length === 1 && count(text.get(done[0]), e.put) === 1) continue;
    if (done.length === 0 && todo.length === 1 && count(text.get(todo[0]), e.find) === 1) {
      text.set(todo[0], text.get(todo[0]).replace(e.find, e.put));
      changed.add(todo[0]);
      continue;
    }
    console.error(`patch-excalidraw: ${build}/${e.name} doesn't match this Excalidraw (found ${todo.length} places, ${done.length} already done).`);
    failed = true;
  }
  if (failed) break;
  for (const f of changed) writeFileSync(f, text.get(f));
  if (changed.size) console.log(`patch-excalidraw: paper hooks added to ${[...changed].join(", ")}`);
}
if (failed) {
  console.error("patch-excalidraw: the board paper (src/paper.ts) needs these hooks; update the edits in scripts/patch-excalidraw.mjs.");
  process.exit(1);
}
