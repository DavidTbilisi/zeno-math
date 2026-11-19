// Practice: Area on a grid.
import { fill, r2 } from "../chart";
import { areaText, encodePoly, geoGridSvg, polyTask, polyTraps } from "../geoPlay";
import type { Gen, Trap } from "../practiceTypes";

/** An area given as twice itself, in LaTeX: 7 or 7\frac{1}{2}. */
const areaTex = (area2: number) => (area2 % 2 ? `${area2 > 1 ? (area2 - 1) / 2 : ""}\\frac{1}{2}` : String(area2 / 2));

const gen: Gen = (r, L, w) => {
  // A shape made on a dot grid by tapping: a rectangle, a triangle (half squares) or a shape on the grid lines with
  // an area and a perimeter. The answer is the shape's corners as text, marked in whole numbers (src/math/geoPlay.ts).
  const t = polyTask(L, r.next);
  const { goal } = t.play;
  const A = areaTex(goal.area2!);
  const lines =
    L === 1 ? [`${t.dims[0]} \\times ${t.dims[1]} = ${A}`]
    : L === 2 ? [`${t.dims[0]} \\times ${t.dims[1]} = ${t.dims[0] * t.dims[1]}`, `\\frac{1}{2} \\times ${t.dims[0] * t.dims[1]} = ${A}`]
    : [`${t.dims[0]} \\times ${t.dims[1]} - ${t.dims[2]} \\times ${t.dims[3]} = ${A}`, `P = 2 \\times (${t.dims[0]} + ${t.dims[1]}) = ${goal.perim}`];
  const prompt =
    L === 1 ? fill(w.prompts.shapeRect, { n: areaText(goal.area2!) })
    : L === 2 ? fill(w.prompts.shapeTriangle, { n: areaText(goal.area2!) })
    : fill(w.prompts.shapeAreaPerim, { a: areaText(goal.area2!), p: goal.perim! });
  const traps: Trap[] = polyTraps(t).map((p) => ({ id: p.id, a: { k: "poly", play: { ...t.play, goal: p.goal }, sample: encodePoly(p.sample) }, vars: p.vars }));
  const grid = geoGridSvg(t.play);
  return {
    prompt,
    q: L === 3 ? `A = ${A}, \\quad P = ${goal.perim}` : `A = ${A}`,
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${grid.body}</g>`, h: grid.h, w: grid.w },
    play: { kind: "grid", ...t.play },
    answer: { k: "poly", play: t.play, sample: encodePoly(t.sample), traps },
    show: lines.join(", \\quad "),
    plain: encodePoly(t.sample),
    format: "shape",
    solution: { kind: "shape", spec: { play: t.play, pts: t.sample, steps: lines } },
  };
};

export default gen;
