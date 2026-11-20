// Practice: Fourier series on (−π, π) with f = a₀/2 + Σ (aₙ cos nx + bₙ sin nx). Easy reads a coefficient off
// p + q cos²(kx) or p + q sin²(kx) by the double-angle formula (the half missed, a₀ not doubled, the sign of sin² kept,
// named), or says which terms an even, odd or neither function can have (even and odd swapped, the parity missed or
// assumed, named); medium finds bₙ of a square wave or of cx (only half the period integrated, cos nπ taken as 1, the
// alternating sign dropped, named); hard finds where the series converges at a jump (one side's value, named) or
// (1/π)∫f² by Parseval (the constant's weight, the coefficients not squared, named).
import { exact, pickOf, word, type NumSlip } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { F, coefTex, piPow, sumTex } from "../pdes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const SUB: Record<string, string> = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
const sub = (n: number) => String(n).replace(/\d/g, (c) => SUB[c]);
const nonzero = (r: Rng, lo: number, hi: number) => {
  let v: number;
  do v = r.int(lo, hi);
  while (v === 0);
  return v;
};
const kx = (k: number) => (k === 1 ? "x" : `${k}x`);

function squarePart(r: Rng, w: PracticeWords): Part {
  const p = r.int(-3, 3);
  const q = nonzero(r, -4, 4);
  const k = r.int(1, 3);
  const isSin = r.next() < 0.5;
  const sign = isSin ? -1 : 1;
  const half = F(q, 2);
  const mean = F(p).add(half);
  const f = sumTex([p === 0 ? "" : String(p), coefTex(q, `\\${isSin ? "sin" : "cos"}^{2}(${kx(k)})`)]);
  const identity = `\\${isSin ? "sin" : "cos"}^{2}(${kx(k)}) = \\frac{1 ${isSin ? "-" : "+"} \\cos(${kx(2 * k)})}{2}`;
  const series = `f(x) = ${sumTex([mean.isZero() ? "" : mean.tex(), coefTex(1, `${half.mul(F(sign)).tex()}\\cos(${kx(2 * k)})`)])}`;
  if (r.next() < 0.5)
    return {
      prompt: fill(w.pde.prompt.coefficient, { c: "a₀" }),
      q: `f(x) = ${f}`,
      ...exact(mean.mul(F(2)), [["constantTermNotDoubled", mean]]),
      steps: [identity, series, `\\frac{a_0}{2} = ${mean.tex()}`, `a_0 = ${mean.mul(F(2)).tex()}`],
    };
  const m = 2 * k;
  const v = half.mul(F(sign));
  const slips: NumSlip[] = [["doubleAngleNotHalved", F(q * sign)]];
  if (isSin) slips.push(["sinSquaredSignKept", half]);
  return {
    prompt: fill(w.pde.prompt.coefficient, { c: `a${sub(m)}` }),
    q: `f(x) = ${f}`,
    ...exact(v, slips),
    steps: [identity, series, `a_{${m}} = ${v.tex()}`],
  };
}

// f(−x) worked out: 0 even (only cosines), 1 odd (only sines), 2 neither (both).
const PARITY: { f: string; why: string; kind: 0 | 1 | 2 }[] = [
  { f: "x^{2}", why: "(-x)^{2} = x^{2}", kind: 0 },
  { f: "|x|", why: "|-x| = |x|", kind: 0 },
  { f: "x \\sin x", why: "(-x)\\sin(-x) = x \\sin x", kind: 0 },
  { f: "e^{-x^{2}}", why: "e^{-(-x)^{2}} = e^{-x^{2}}", kind: 0 },
  { f: "x^{4} - 3x^{2}", why: "(-x)^{4} - 3(-x)^{2} = x^{4} - 3x^{2}", kind: 0 },
  { f: "x", why: "f(-x) = -x", kind: 1 },
  { f: "x^{3} - x", why: "(-x)^{3} - (-x) = -(x^{3} - x)", kind: 1 },
  { f: "x \\cos x", why: "(-x)\\cos(-x) = -x \\cos x", kind: 1 },
  { f: "x|x|", why: "(-x)|-x| = -x|x|", kind: 1 },
  { f: "\\sin(2x) + x", why: "\\sin(-2x) - x = -(\\sin(2x) + x)", kind: 1 },
  { f: "x + x^{2}", why: "-x + x^{2} \\ne \\pm(x + x^{2})", kind: 2 },
  { f: "e^{x}", why: "e^{-x} \\ne \\pm e^{x}", kind: 2 },
  { f: "x^{2} + \\sin x", why: "x^{2} - \\sin x \\ne \\pm(x^{2} + \\sin x)", kind: 2 },
  { f: "(x + 1)^{2}", why: "(1 - x)^{2} \\ne \\pm(x + 1)^{2}", kind: 2 },
];

function parityPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(PARITY);
  const options = [word(w.pde.parity.cosOnly), word(w.pde.parity.sinOnly), word(w.pde.parity.both)];
  const slips: [MistakeId, number][] =
    c.kind === 0 ? [["evenOddSwapped", 1], ["parityMissed", 2]] : c.kind === 1 ? [["evenOddSwapped", 0], ["parityMissed", 2]] : [["parityAssumed", 0], ["parityAssumed", 1]];
  return {
    prompt: w.pde.prompt.parity,
    q: `f(x) = ${c.f}`,
    ...pickOf(options, c.kind, slips),
    steps: [`f(-x) = ${c.why}`, c.kind === 0 ? "b_n = 0" : c.kind === 1 ? "a_n = 0" : "a_n, \\ b_n"],
  };
}

function sinePart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    // The square wave −c on (−π, 0), c on (0, π): bₙ = 2c(1 − cos nπ)/(nπ) = 4c/(nπ) for odd n.
    const c = r.int(1, 4);
    const n = r.pick([1, 3, 5]);
    return {
      prompt: fill(w.pde.prompt.sineCoefficient, { n }),
      q: `f(x) = \\begin{cases} ${-c}, & -\\pi < x < 0 \\\\ ${c}, & 0 < x < \\pi \\end{cases}`,
      ...piPow(F(4 * c, n), -1, [["fourierHalfPeriod", (2 * c) / (n * Math.PI)], ["cosNPiAsOne", 0]]),
      steps: [
        `b_{${n}} = \\frac{1}{\\pi}\\int_{-\\pi}^{\\pi} f(x)\\sin(${kx(n)})\\,dx = \\frac{2}{\\pi}\\int_{0}^{\\pi} ${c}\\sin(${kx(n)})\\,dx`,
        `= \\frac{${2 * c}}{${n === 1 ? "" : n}\\pi}\\left(1 - \\cos(${n === 1 ? "" : n}\\pi)\\right), \\quad \\cos(${n === 1 ? "" : n}\\pi) = -1`,
        `b_{${n}} = \\frac{${4 * c}}{${n === 1 ? "" : n}\\pi}`,
      ],
    };
  }
  // f(x) = cx on (−π, π): bₙ = 2c(−1)ⁿ⁺¹/n.
  const c = nonzero(r, -3, 3);
  const n = r.int(1, 5);
  const alt = n % 2 === 1 ? 1 : -1;
  const v = F(2 * c * alt, n);
  return {
    prompt: fill(w.pde.prompt.sineCoefficient, { n }),
    q: `f(x) = ${coefTex(c, "x")}, \\quad -\\pi < x < \\pi`,
    ...exact(v, [["alternatingSignDropped", F(2 * c, n)], ["fourierHalfPeriod", F(c * alt, n)]]),
    steps: [
      `b_{${n}} = \\frac{2}{\\pi}\\int_{0}^{\\pi} ${coefTex(c, "x")}\\sin(${kx(n)})\\,dx`,
      `\\int_{0}^{\\pi} x\\sin(${kx(n)})\\,dx = \\frac{-\\pi\\cos(${n === 1 ? "" : n}\\pi)}{${n}} = ${alt === 1 ? "" : "-"}\\frac{\\pi}{${n}}`,
      `b_{${n}} = ${v.tex()}`,
    ],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  const pick = r.next();
  if (pick < 1 / 3) {
    // A step from p to q: the series converges to the average at x = 0 (and at x = π).
    const p = r.int(-4, 4);
    let q: number;
    do q = r.int(-4, 4);
    while (q === p);
    const at = r.next() < 0.5 ? 0 : 1;
    const avg = F(p + q, 2);
    return {
      prompt: fill(w.pde.prompt.jump, { x: at === 0 ? "0" : "π" }),
      q: `f(x) = \\begin{cases} ${p}, & -\\pi < x < 0 \\\\ ${q}, & 0 < x < \\pi \\end{cases}`,
      ...exact(avg, [["jumpOneSidedValue", at === 0 ? q : p]]),
      steps: [at === 0 ? `f(0^-) = ${p}, \\quad f(0^+) = ${q}` : `f(\\pi^-) = ${q}, \\quad f(-\\pi^+) = ${p}`, `\\frac{${p} + ${q < 0 ? `(${q})` : q}}{2} = ${avg.tex()}`],
    };
  }
  if (pick < 2 / 3) {
    // f = cx + d on (−π, π), extended 2π-periodically: at x = π the series gives (f(π⁻) + f(−π⁺))/2 = d.
    const c = nonzero(r, -3, 3);
    const d = r.int(-4, 4);
    return {
      prompt: fill(w.pde.prompt.jump, { x: "π" }),
      q: `f(x) = ${sumTex([coefTex(c, "x"), d === 0 ? "" : String(d)])}, \\quad -\\pi < x < \\pi`,
      ...exact(F(d), [["jumpOneSidedValue", c * Math.PI + d]]),
      steps: [`f(\\pi^-) = ${sumTex([coefTex(c, "\\pi"), d === 0 ? "" : String(d)])}, \\quad f(-\\pi^+) = ${sumTex([coefTex(-c, "\\pi"), d === 0 ? "" : String(d)])}`, `\\frac{f(\\pi^-) + f(-\\pi^+)}{2} = ${d}`],
    };
  }
  // Parseval: (1/π)∫f² = a₀²/2 + Σ(aₙ² + bₙ²) for f = a + b cos mx + c sin nx.
  const a = nonzero(r, -3, 3);
  const b = nonzero(r, -4, 4);
  const c = nonzero(r, -4, 4);
  const m = r.int(1, 3);
  const n = r.int(1, 3);
  const v = 2 * a * a + b * b + c * c;
  return {
    prompt: w.pde.prompt.parseval,
    q: `f(x) = ${sumTex([String(a), coefTex(b, `\\cos(${kx(m)})`), coefTex(c, `\\sin(${kx(n)})`)])}`,
    ...exact(F(v), [["parsevalConstantWeight", a * a + b * b + c * c], ["parsevalNotSquared", 2 * Math.abs(a) + Math.abs(b) + Math.abs(c)]]),
    steps: [`a_0 = ${2 * a}, \\quad a_{${m}} = ${b}, \\quad b_{${n}} = ${c}`, `\\frac{a_0^{2}}{2} + a_{${m}}^{2} + b_{${n}}^{2} = ${2 * a * a} + ${b * b} + ${c * c} = ${v}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? (r.next() < 0.5 ? squarePart(r, w) : parityPart(r, w)) : L === 2 ? sinePart(r, w) : hardPart(r, w));

export default gen;
