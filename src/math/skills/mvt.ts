// Practice: The mean value theorem and Taylor's remainder. Easy finds the c the mean value theorem promises (the
// slope given for c, the midpoint for a cubic, named); medium bounds f(b) from bounds on f′ (the other bound used, the
// length of the interval forgotten, named); hard bounds the error of a Maclaurin polynomial by Lagrange's remainder
// (no factorial, the power and factorial of degree n instead of n + 1, named).
import { exact, numTraps } from "../calculusTwo";
import { num } from "../practiceKit";
import { F, fact } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** αx² + βx + γ as LaTeX. */
function quadTex(al: number, be: number, ga: number): string {
  const head = al === 1 ? "x^{2}" : al === -1 ? "-x^{2}" : `${al}x^{2}`;
  const term = (c: number, v: string) => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c) === 1 && v ? "" : Math.abs(c)}${v}`);
  return head + term(be, "x") + term(ga, "");
}

/** The c of the mean value theorem: (p + q)/2 for a quadratic, b/√3 for x³ on [0, b]. */
function pointPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.65) {
    const [al, be, ga] = [r.nz(-3, 3), r.int(-5, 5), r.int(-5, 5)];
    const p = r.int(-3, 2);
    const q = p + r.int(1, 5);
    const slope = al * (p + q) + be;
    const c = F(p + q, 2);
    return {
      prompt: fill(w.real.prompt.mvtPoint, { p, q }),
      q: `f(x) = ${quadTex(al, be, ga)}, \\quad [${p}, ${q}]`,
      ...exact(c, [["slopeAsC", slope]]),
      steps: [`\\frac{f(${q}) - f(${p})}{${q} - ${p < 0 ? `(${p})` : p}} = ${slope}`, `f'(c) = ${al * 2}c${be === 0 ? "" : ` ${be < 0 ? "-" : "+"} ${Math.abs(be)}`} = ${slope} \\implies c = ${c.tex()}`],
    };
  }
  const b = r.int(2, 6);
  const c = b / Math.sqrt(3);
  const traps = numTraps(c, [["slopeAsC", b * b], ["midpointAsC", F(b, 2)]]);
  return {
    prompt: fill(w.real.prompt.mvtPoint, { p: 0, q: b }),
    q: `f(x) = x^{3}, \\quad [0, ${b}]`,
    answer: { ...num(c), traps },
    show: `\\frac{${b}}{\\sqrt{3}}`,
    plain: `${b}/sqrt(3)`,
    format: "exact",
    steps: [`\\frac{f(${b}) - f(0)}{${b}} = ${b * b}`, `3c^{2} = ${b * b} \\implies c = \\frac{${b}}{\\sqrt{3}} \\approx ${c.toFixed(3)}`],
  };
}

/** f(a) = A and m ≤ f′ ≤ M on [a, b]: f(b) lies between A + m(b − a) and A + M(b − a). */
function boundPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-2, 2);
  const b = a + r.int(2, 5);
  const [A, m] = [r.int(-5, 5), r.int(-3, 1)];
  const M = m + r.int(1, 4);
  const largest = r.next() < 0.5;
  const [use, other] = largest ? [M, m] : [m, M];
  const v = A + use * (b - a);
  return {
    prompt: fill(largest ? w.real.prompt.mvtLargest : w.real.prompt.mvtSmallest, { b }),
    q: `f(${a}) = ${A}, \\quad ${m} \\le f'(x) \\le ${M} \\;\\; (${a} \\le x \\le ${b})`,
    ...exact(F(v), [["boundWrongEnd", A + other * (b - a)], ["forgotIntervalLength", A + use]]),
    steps: [`f(${b}) - f(${a}) = f'(c)\\,(${b - a}), \\quad ${a} < c < ${b}`, `f(${b}) ${largest ? "\\le" : "\\ge"} ${A} ${use < 0 ? "-" : "+"} ${Math.abs(use)} \\cdot ${b - a} = ${v}`],
  };
}

const FNS = [
  { tex: "\\sin x", d: "|f^{(n+1)}(\\xi)| \\le 1" },
  { tex: "\\cos x", d: "|f^{(n+1)}(\\xi)| \\le 1" },
  { tex: "e^{-x}", d: "|f^{(n+1)}(\\xi)| = e^{-\\xi} \\le 1" },
];

/** Lagrange: |Rₙ(x)| ≤ |x|ⁿ⁺¹/(n + 1)! when every derivative is at most 1. */
function remainderPart(r: Rng, w: PracticeWords): Part {
  const f = r.pick(FNS);
  const [n, k] = [r.int(2, 4), r.int(1, 3)];
  const x = F(1, k);
  const bound = F(1, k ** (n + 1) * fact(n + 1));
  const xT = x.tex();
  const pw = k === 1 ? "1" : `\\left(${xT}\\right)^{${n + 1}}`;
  return {
    prompt: w.real.prompt.remainder,
    q: `f(x) = ${f.tex}, \\quad n = ${n}, \\quad x = ${xT}`,
    ...exact(bound, [["remainderNoFactorial", F(1, k ** (n + 1))], ["remainderWrongPower", F(1, k ** n * fact(n))]]),
    steps: [`R_{${n}}(x) = \\frac{f^{(${n + 1})}(\\xi)}{${n + 1}!}\\,x^{${n + 1}}, \\quad ${f.d}`, `|R_{${n}}(${xT})| \\le \\frac{${pw}}{${n + 1}!} = ${bound.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? pointPart(r, w) : L === 2 ? boundPart(r, w) : remainderPart(r, w));

export default gen;
