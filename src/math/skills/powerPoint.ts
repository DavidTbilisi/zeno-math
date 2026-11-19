// Practice: Power of a point: chords, secants, tangents.
import { fill, r2 } from "../chart";
import { circleFigure } from "../euclid";
import { chordsQuestion, secantsQuestion, tangentQuestion } from "../sidesAndSecants";
import { num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  // Power of a point (src/math/sidesAndSecants.ts): crossing chords (easy), two secants (medium), a tangent and a
  // secant (hard), drawn and worked by the circle theorems tool.
  const q = L === 1 ? chordsQuestion(r.next) : L === 2 ? secantsQuestion(r.next) : tangentQuestion(r.next);
  const full = `${q.src}; find ${q.ask}`;
  const fig = circleFigure(full);
  return {
    prompt: fill(w.prompts.circleFind, { a: q.ask }),
    q: q.given,
    pic: fig ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${fig.svg}</g>`, h: fig.h, w: fig.w } : undefined,
    answer: { ...num(q.v, 1e-6), traps: q.traps.map((t) => ({ id: t.id, a: num(t.v, Number.isInteger(t.v) ? 1e-9 : 0.006), vars: t.vars })) },
    show: String(q.v),
    plain: String(q.v),
    format: "number",
    solution: { kind: "euclid", spec: { topic: "circle", src: full } },
  };
};

export default gen;
