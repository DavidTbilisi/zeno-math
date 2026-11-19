// Practice: Colouring graphs.
import { r2 } from "../chart";
import { colourQuestion, colourSvg, colourTraps } from "../colouring";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The fewest colours for the vertices so no edge joins two alike (src/math/colouring.ts).
  const t = colourQuestion(L, r.next);
  const pic = colourSvg(t.g, [], [], { scale: 0.8 });
  return {
    prompt: w.prompts.colouring,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.k), traps: colourTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: { v: t.k } })) },
    show: String(t.k),
    plain: String(t.k),
    format: "number",
    solution: { kind: "colour", spec: { task: t, steps: [] } },
  };
};

export default gen;
