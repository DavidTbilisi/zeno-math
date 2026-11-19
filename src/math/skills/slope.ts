// Practice: Gradient of a line.
import { r2 } from "../chart";
import { signed } from "../plotPoint";
import { gradTex, gradText, runOverRise, slopeQuestion, slopeQuestionSvg, slopeSteps } from "../slope";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // The gradient of a line drawn through two points of a grid (src/math/slope.ts): up (or down) over along.
  const q = slopeQuestion(L, r.next);
  const [dx, dy] = [q.q[0] - q.p[0], q.q[1] - q.p[1]];
  const m = dy / dx;
  const pic = slopeQuestionSvg(q);
  const flip = runOverRise(q);
  return {
    prompt: w.prompts.slope,
    q: "",
    pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
    answer: { ...num(m, 1e-9, { lowest: true }), traps: Math.abs(m) !== 1 ? [{ id: "runOverRise", a: num(flip), vars: { dx, dy: signed(dy), v: gradText(dy, dx), u: gradText(dx, dy) } }] : [] },
    show: `m = ${gradTex(dy, dx)}`,
    plain: gradText(dy, dx).replace("−", "-"),
    format: Number.isInteger(m) ? "number" : "fraction",
    solution: { kind: "slope", spec: { q, steps: slopeSteps(q) } },
  };
};

export default gen;
