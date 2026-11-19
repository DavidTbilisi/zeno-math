// Practice: Missing angles.
import { r2 } from "../chart";
import { huntSteps, huntSvg, huntTask, huntTraps } from "../missingAngle";
import { num } from "../practiceKit";
import type { Gen, Trap } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // An angle to find from the others, the figure drawn to size (src/math/missingAngle.ts): on a line, in a right
  // angle, around a point, in a triangle, an isosceles triangle or a quadrilateral.
  const t = huntTask(L, r.next);
  const pic = huntSvg(t.fig);
  const traps: Trap[] = huntTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: x.vars }));
  return {
    prompt: w.prompts.missingAngle,
    q: "",
    pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(t.v), traps },
    show: `? = ${t.v}^\\circ`,
    plain: String(t.v),
    format: "number",
    solution: { kind: "angles", spec: { task: t, steps: huntSteps(t) } },
  };
};

export default gen;
