// Practice: Differentiation.
import { diffParts } from "../calcSteps";
import { derive } from "../derive";
import { type E, parseE, simp, tex } from "../expr";
import { exprPart, plainE, polyStr } from "../practiceKit";
import type { Gen, Part, PracticeWords } from "../practiceTypes";

/** The steps of differentiating f: each term of a sum, u′ and v′ of a product or quotient, or the inside's derivative. */
function diffSteps(f: E, w: PracticeWords): Part[] {
  const p = diffParts(f);
  const d = (name: string, e: E) => exprPart(w.prompts.stepDiff, `${name} = ${tex(e)}: \\quad \\frac{d${name}}{dx}`, simp(derive(e)));
  if (!p) return [];
  if (p.kind === "sum") return p.terms.map((t) => exprPart(w.prompts.stepDiff, `\\frac{d}{dx}\\left(${tex(t)}\\right)`, simp(derive(t))));
  return p.kind === "chain" ? [d("u", p.inner)] : [d("u", p.u), d("v", p.v)];
}

const gen: Gen = (r, L, w) => {
  let src: string;
  if (L === 1) {
    const n = r.int(3, 5);
    const cs = Array.from({ length: n + 1 }, (_, k) => (k === n ? r.nz(-6, 6) : r.next() < 0.6 ? r.int(-9, 9) : 0));
    src = polyStr(cs);
  } else if (L === 2) {
    const [a, b, k, n] = [r.int(2, 5), r.nz(-6, 6), r.nz(-4, 4), r.int(2, 5)];
    src = r.pick([`(${polyStr([b, a])})^${n}`, `e^(${k}x)`, `sin(${a}x)`, `cos(${a}x)`, `${a}x^2 + ${Math.abs(b)}/x`, `${a}sqrt(x)`, `${a}e^(${k}x) + x^${n}`]);
  } else {
    const [a, n] = [r.int(1, 5), r.int(2, 4)];
    src = r.pick([`x^${n} e^x`, `x^${n} sin x`, `x cos(${a}x)`, `ln(x^2 + ${a})`, `x/(x + ${a})`, `(x^2 + ${a})^${n}`, `e^(x^2)`, `(x^2 + 1)/(x - ${a})`, `x ln x`, `e^(${a}x) sin x`]);
  }
  const f = parseE(src);
  const d = simp(derive(f));
  return {
    prompt: w.prompts.differentiate, q: `y = ${tex(f)}`, answer: { k: "expr", e: d }, show: `\\frac{dy}{dx} = ${tex(d)}`, plain: plainE(d), format: "expr",
    solution: { kind: "deriv", spec: { topic: "rules", src, at: "" } }, worked: diffSteps(f, w),
  };
};

export default gen;
