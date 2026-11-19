// Practice: Coordinates.
import { r2 } from "../chart";
import { plotSteps, plotSvg, plotTask, ptText, swapped } from "../plotPoint";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // A point drawn on a grid, its coordinates to read (src/math/plotPoint.ts); at the hard level the fourth corner of
  // a rectangle whose other three are drawn.
  const t = plotTask(L, r.next);
  const [x, y] = t.p;
  const pic = plotSvg(t, { asked: true, cell: 26 });
  return {
    prompt: L === 3 ? w.prompts.coordCorner : w.prompts.coordinates,
    q: "",
    pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { k: "tuple", vs: [x, y], tol: 1e-9, traps: x !== y ? [{ id: "swappedXY", a: { k: "tuple", vs: swapped(t.p), tol: 1e-9 }, vars: { x, y, p: ptText(t.p), s: ptText(swapped(t.p)) } }] : [] },
    show: `(${x}, \\; ${y})`,
    plain: `(${x}, ${y})`,
    format: "point",
    solution: { kind: "plot", spec: { task: t, steps: plotSteps(t) } },
  };
};

export default gen;
