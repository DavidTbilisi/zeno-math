// Practice: Gradients and tangents.
import { fill } from "../chart";
import { derive } from "../derive";
import { evalE, fromPoly, parseE, simp, tex } from "../expr";
import { exprPart, num, numPart, plainFrac, polyStr, toFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  let src: string;
  let at: number;
  if (L === 2) {
    const pick = r.int(0, 2);
    if (pick === 0) [src, at] = [`sqrt(x)`, r.pick([1, 4, 9, 16])];
    else if (pick === 1) [src, at] = [`${r.int(1, 6)}/x`, r.pick([1, 2, 3, -1, -2])];
    else [src, at] = [`x^3 - ${r.int(1, 9)}x`, r.int(-3, 3)];
  } else {
    src = polyStr([r.int(-6, 6), r.int(-6, 6), r.nz(-4, 4), r.next() < 0.5 ? r.nz(-2, 2) : 0]);
    at = r.int(-3, 3);
  }
  const f = parseE(src);
  const d = derive(f);
  const m = evalE(d, at);
  const y0 = evalE(f, at);
  const mF = toFrac(m);
  // dy/dx, then (for the tangent) its value and y's at the point; the last step is the question.
  const derivative = exprPart(w.prompts.stepDiff, `y = ${tex(f)}: \\quad \\frac{dy}{dx}`, simp(d));
  if (L < 3)
    return {
      prompt: fill(w.prompts.gradient, { a: at }), q: `y = ${tex(f)}`, answer: num(m), show: `\\frac{dy}{dx}\\Big|_{x = ${at}} = ${mF.tex()}`, plain: plainFrac(mF), format: "exact",
      solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } }, worked: [derivative],
    };
  const c = toFrac(y0 - m * at);
  const e = fromPoly([c, mF]);
  return {
    prompt: fill(w.prompts.tangent, { a: at }), q: `y = ${tex(f)}`, answer: { k: "expr", e, mode: "line" }, show: `y = ${tex(e)}`, plain: `y = (${plainFrac(mF)})x + (${plainFrac(c)})`, format: "line",
    solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } },
    worked: [derivative, numPart(w.prompts.stepWork, `\\frac{dy}{dx}\\Big|_{x = ${at}}`, m), numPart(w.prompts.stepWork, `y\\Big|_{x = ${at}}`, y0)],
  };
};

export default gen;
