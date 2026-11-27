// Single-variable calculus as a degree's first year takes it on from school (Spivak, Calculus; Stewart, Calculus;
// Apostol, Calculus I): limits worked out rather than read off, implicit differentiation and related rates, the
// techniques of integration, improper integrals, what integrals measure (area, volume, length), Taylor polynomials,
// power series and the tests for convergence. The words, the answers built exactly, and the integrals each question
// is made from; the questions are in src/math/skills/{limits,implicit,intTechniques,improper,intApplications,taylor,
// powerSeries,convergence}.ts.
import { Frac } from "./fraction";
import type { MistakeId } from "./mistakes";
import { num, plainFrac, polyStr } from "./practiceKit";
import type { Answer, Format, Rng, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `calc2` block). */
export type CalcTwoWords = {
  converges: string;
  diverges: string;
  dne: string;
  absolutely: string;
  conditionally: string;
  tests: { ratio: string; comparison: string; alternating: string; integral: string };
  prompt: {
    limit: string;
    limitSide: string;
    slopeAt: string;
    ladder: string;
    ripple: string;
    substitute: string;
    parts: string;
    partial: string;
    doubleAngle: string;
    converge: string;
    improperValue: string;
    area: string;
    volume: string;
    arc: string;
    coefficients: string;
    approximate: string;
    taylorCoefficient: string;
    radius: string;
    radiusPick: string;
    interval: string;
    series: string;
    whichTest: string;
    howConverges: string;
  };
};

// ---------- exact answers ----------

export const F = (n: number, d = 1) => new Frac(n, d);
const val = (x: Frac | number) => (typeof x === "number" ? x : x.toNumber());

/** A named slip whose answer is a number, kept only when it is not the right answer. */
export type NumSlip = [MistakeId, Frac | number, Record<string, string | number>?];
export function numTraps(v: number, slips: NumSlip[]): Trap[] {
  const out: Trap[] = [];
  for (const [id, x, vars] of slips) {
    const t = val(x);
    if (!Number.isFinite(t) || Math.abs(t - v) < 1e-9 || out.some((o) => o.a.k === "num" && Math.abs(o.a.v - t) < 1e-9)) continue;
    out.push({ id, a: num(t), ...(vars ? { vars } : {}) });
  }
  return out;
}

type Shown = { answer: Answer; show: string; plain: string; format: Format };
/** An exact number: whole or a fraction. */
export function exact(v: Frac, slips: NumSlip[] = []): Shown {
  const traps = numTraps(v.toNumber(), slips);
  return { answer: { ...num(v.toNumber()), ...(traps.length ? { traps } : {}) }, show: v.tex(), plain: plainFrac(v), format: v.d === 1 ? "number" : "exact" };
}
/** A rational multiple of π. */
export function piTimes(q: Frac, slips: NumSlip[] = []): Shown {
  const v = q.toNumber() * Math.PI;
  const traps = numTraps(v, slips);
  const top = q.n === 1 ? "\\pi" : q.n === -1 ? "-\\pi" : `${q.n}\\pi`;
  const plainTop = q.n === 1 ? "pi" : q.n === -1 ? "-pi" : `${q.n}pi`;
  return {
    answer: { ...num(v), ...(traps.length ? { traps } : {}) },
    show: q.d === 1 ? top : `\\frac{${top}}{${q.d}}`,
    plain: q.d === 1 ? plainTop : `${plainTop}/${q.d}`,
    format: "exact",
  };
}

/** An option of a pick question: shown in LaTeX, typed as plain text. */
export type Opt = { text: string; plain: string; tex: string };
export const word = (text: string): Opt => ({ text, plain: text, tex: `\\text{${text}}` });
export const sym = (tex: string, plain: string, text = plain): Opt => ({ text, plain, tex });
/** A pick question's answer: the right option, and the named slips that pick another. */
export function pickOf(options: Opt[], right: number, slips: [MistakeId, number, Record<string, string | number>?][] = []): Shown {
  const traps: Trap[] = slips.filter(([, i]) => i !== right).map(([id, i, vars]) => ({ id, a: { k: "pick", options, right: i }, ...(vars ? { vars } : {}) }));
  return { answer: { k: "pick", options, right, ...(traps.length ? { traps } : {}) }, show: options[right].tex, plain: options[right].plain, format: "pick" };
}
/** A pick question with its options in a random order, the right one and the slips' places followed. */
export function shuffled(r: { next: () => number }, options: Opt[], right: number, slips: [MistakeId, number][]): Shown {
  const order = options.map((_, i) => i).sort(() => r.next() - 0.5);
  return pickOf(order.map((i) => options[i]), order.indexOf(right), slips.map(([id, at]) => [id, order.indexOf(at)]));
}

// ---------- written out ----------

/** "x − 3", "x + 2", "x" for x − a. */
export const minusA = (a: number, v = "x") => (a === 0 ? v : a > 0 ? `${v} - ${a}` : `${v} + ${-a}`);
/** The same with a true minus, for words. */
export const minusAWords = (a: number, v = "x") => minusA(a, v).replace(" - ", " − ");
/** s divided by d, as typed (nothing for d = 1). */
export const over = (s: string, d: number) => (d === 1 ? s : `${s}/${d}`);
/** k·s as typed: s, -s, 3s. */
export const times = (k: number, s: string) => (k === 1 ? s : k === -1 ? `-${s}` : `${k}${s}`);
/** A rational power as LaTeX: 2, \frac{1}{2}. */
export const powTex = (p: Frac) => (p.d === 1 ? String(p.n) : `\\frac{${p.n}}{${p.d}}`);
/** 1/xᵖ as LaTeX: \frac{1}{\sqrt{x}}, \frac{1}{x^{3}}. */
export const overXp = (p: Frac, x = "x") =>
  p.n === 1 && p.d === 1 ? `\\frac{1}{${x}}` : p.n === 1 && p.d === 2 ? `\\frac{1}{\\sqrt{${x}}}` : `\\frac{1}{${x}^{${powTex(p)}}}`;
/** The powers p of 1/xᵖ the integrals and series are asked about. */
export const POWERS: readonly Frac[] = [F(1, 3), F(1, 2), F(2, 3), F(1), F(3, 2), F(2), F(3)];

// ---------- integrals made from their answers ----------

/** An integrand, an antiderivative (as typed), and an antiderivative a named slip gives. */
export type Integral = { f: string; F: string; slip?: { id: MistakeId; F: string } };

/** u-substitution: the derivative of the inside is there, up to a whole number. */
export function substitution(r: Rng): Integral {
  const [n, c, a] = [r.int(2, 5), r.nz(-6, 6), r.int(2, 4)];
  const inner2 = `x^2 ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
  const inner3 = `x^3 ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
  const sinA = a === 1 ? "sin(x)" : `sin(${a}x)`;
  const cosA = a === 1 ? "cos(x)" : `cos(${a}x)`;
  return r.pick<Integral>([
    { f: `x(${inner2})^${n}`, F: `(${inner2})^${n + 1}/${2 * (n + 1)}`, slip: { id: "forgotInnerFactor", F: `(${inner2})^${n + 1}/${n + 1}` } },
    { f: `x^2*(${inner3})^${n}`, F: `(${inner3})^${n + 1}/${3 * (n + 1)}`, slip: { id: "forgotInnerFactor", F: `(${inner3})^${n + 1}/${n + 1}` } },
    { f: `x e^(${a}x^2)`, F: `e^(${a}x^2)/${2 * a}`, slip: { id: "forgotInnerFactor", F: `e^(${a}x^2)` } },
    { f: `${cosA} ${sinA}^${n}`, F: `${sinA}^${n + 1}/${a * (n + 1)}`, slip: { id: "forgotInnerFactor", F: `${sinA}^${n + 1}/${n + 1}` } },
  ]);
}

/** By parts, once: x times an exponential or a sine, or a logarithm. */
export function byParts(r: Rng): Integral {
  const a = r.int(1, 3);
  const ax = a === 1 ? "x" : `${a}x`;
  const [e, s, c] = [`e^(${ax})`, `sin(${ax})`, `cos(${ax})`];
  const both = (first: string, sign: "+" | "-", second: string) => ({ F: `${first} ${sign} ${second}`, slip: `${first} ${sign === "+" ? "-" : "+"} ${second}` });
  const pick = r.pick([
    { f: `x ${e}`, ...both(over(`x ${e}`, a), "-", over(e, a * a)) },
    { f: `x ${s}`, ...both(`-${over(`x ${c}`, a)}`, "+", over(s, a * a)) },
    { f: `x ${c}`, ...both(over(`x ${s}`, a), "+", over(c, a * a)) },
    { f: "x ln(x)", ...both("x^2 ln(x)/2", "-", "x^2/4") },
    { f: "ln(x)", ...both("x ln(x)", "-", "x") },
  ]);
  return { f: pick.f, F: pick.F, slip: { id: "partsSignSlip", F: pick.slip } };
}

/** A ln|x − a| term as typed: 2ln|x - 3|, -ln|x + 1|. */
const lnTerm = (k: number, a: number) => `${k === 1 ? "" : k === -1 ? "-" : k}ln|${minusA(a)}|`;
const sumTerms = (ts: string[]) => ts.join(" + ").replace(/\+ -/g, "- ");

/** Partial fractions over two different linear factors, or a square of a sine or cosine by the double angle. */
export function partialOrTrig(r: Rng): Integral {
  if (r.next() < 0.6) {
    // a and b at most 1, so ln(x − a) without the bars is still read on most of the line.
    const a = r.int(-4, 1);
    let b = r.int(-4, 1);
    while (b === a) b = r.int(-4, 1);
    const A = r.nz(-4, 4);
    let B = r.nz(-4, 4);
    while (B === A) B = r.nz(-4, 4);
    const [p, q] = [A + B, -(A * b + B * a)];
    const top = p === 0 ? String(q) : `${p === 1 ? "" : p === -1 ? "-" : p}x${q ? ` ${q < 0 ? "-" : "+"} ${Math.abs(q)}` : ""}`;
    const bottom = polyStr([a * b, -(a + b), 1]);
    return { f: `(${top})/(${bottom})`, F: sumTerms([lnTerm(A, a), lnTerm(B, b)]), slip: { id: "coverUpSwapped", F: sumTerms([lnTerm(B, a), lnTerm(A, b)]) } };
  }
  const a = r.int(1, 3);
  const [ax, twoAx] = [a === 1 ? "x" : `${a}x`, `${2 * a}x`];
  const sinSq = r.next() < 0.5;
  const sign = sinSq ? "-" : "+";
  return {
    f: `${sinSq ? "sin" : "cos"}(${ax})^2`,
    F: `x/2 ${sign} sin(${twoAx})/${4 * a}`,
    slip: { id: "forgotInnerFactor", F: `x/2 ${sign} sin(${twoAx})/2` },
  };
}
