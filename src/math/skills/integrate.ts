// Practice: Integration.
import { antiderivative } from "../applied";
import { intParts } from "../calcSteps";
import { derive } from "../derive";
import { type E, parseE, simp, tex } from "../expr";
import { exprPart, plainE, polyStr } from "../practiceKit";
import type { Gen, Part, PracticeWords } from "../practiceTypes";

/** The steps of integrating f: each term of a sum (any constant will do), or the derivative of a linear inside. */
function intSteps(f: E, w: PracticeWords): Part[] {
  const p = intParts(f);
  if (!p) return [];
  if (p.kind === "linear") return [exprPart(w.prompts.stepDiff, `u = ${tex(p.inner)}: \\quad \\frac{du}{dx}`, simp(derive(p.inner)))];
  const Fs = p.terms.map(antiderivative);
  return Fs.every(Boolean) ? p.terms.map((t, i) => exprPart(w.prompts.stepInt, `\\int ${tex(t)} \\, dx`, Fs[i]!, true)) : [];
}

const gen: Gen = (r, L, w) => {
  let src: string;
  if (L === 1) {
    const n = r.int(2, 4);
    const cs = Array.from({ length: n + 1 }, (_, k) => (k === n || r.next() < 0.6 ? r.nz(-5, 5) * (k + 1) : 0));
    src = polyStr(cs);
  } else if (L === 2) {
    const [a, k] = [r.int(1, 6), r.nz(-3, 3)];
    src = r.pick([`${a}/x^2`, `${3 * a}sqrt(x)`, `e^(${k}x)`, `${a}/x`, `x^2 + ${a}/x^2`, `${2 * a}x + e^x`]);
  } else {
    const [a, b, n] = [r.int(2, 5), r.nz(-5, 5), r.int(2, 4)];
    src = r.pick([`sin(${a}x)`, `cos(${a}x)`, `(${polyStr([b, a])})^${n}`, `e^(${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)})`, `${a}cos x - sin(${a}x)`, `1/(${polyStr([b, a])})`]);
  }
  const f = parseE(src);
  const Fe = antiderivative(f)!;
  return {
    prompt: w.prompts.integrate,
    q: `\\int ${tex(f)} \\, dx`,
    answer: { k: "expr", e: Fe, mode: "plusC" },
    show: `${tex(Fe)} + C`,
    plain: `${plainE(Fe)} + C`,
    format: "antiderivative",
    steps: [`\\int ${tex(f)} \\, dx = ${tex(Fe)} + C`, `\\frac{d}{dx}\\left(${tex(Fe)}\\right) = ${tex(simp(derive(Fe)))}`],
    worked: intSteps(f, w),
  };
};

export default gen;
