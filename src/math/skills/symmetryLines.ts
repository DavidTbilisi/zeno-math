// Practice: Lines of symmetry.
import { r2 } from "../chart";
import { falseDiagonals, mirrorsOf, symSvg, symTask } from "../symmetry";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // How many lines a shape folds onto itself along (src/math/symmetry.ts); a quadrilateral's diagonals that only
  // halve it, counted as well, are the slip named.
  const t = symTask(L, r.next);
  const n = mirrorsOf(t).length;
  const extra = falseDiagonals(t);
  const pic = symSvg(t, 220);
  return {
    prompt: w.prompts.symmetryLines,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(n), traps: extra ? [{ id: "diagonalMirror", a: num(n + extra), vars: { v: n } }] : [] },
    show: String(n),
    plain: String(n),
    format: "number",
    solution: { kind: "mirror", spec: { task: t, steps: [] } },
  };
};

export default gen;
