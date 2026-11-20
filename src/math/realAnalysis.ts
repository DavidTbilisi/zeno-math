// Real analysis as a degree's second year teaches it (Abbott, Understanding Analysis; Lebl, Basic Analysis; Bartle
// and Sherbert, Introduction to Real Analysis; Rudin, Principles of Mathematical Analysis): suprema and infima, limits
// of sequences by ε and N, continuity by ε and δ, the mean value theorem and Taylor's remainder, the Riemann integral
// by Darboux sums, and pointwise against uniform convergence. The words, and the exact numbers the answers are made
// of; the questions are in src/math/skills/{supInf,seqLimits,epsilonDelta,mvt,riemann,uniform}.ts.
import { Frac } from "./fraction";
import type { MistakeId } from "./mistakes";
import { num, plainFrac } from "./practiceKit";
import type { Answer, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `real` block). */
export type RealWords = {
  maxMin: { both: string; maxOnly: string; minOnly: string; neither: string };
  uniformlyContinuous: string;
  notUniformlyContinuous: string;
  convergesUniformly: string;
  notUniformly: string;
  integrable: string;
  notIntegrable: string;
  why: { compact: string; countable: string; unbounded: string };
  prompt: {
    supInf: string;
    maxMin: string;
    approximate: string;
    epsilonN: string;
    recursion: string;
    subsequences: string;
    deltaLinear: string;
    deltaSquare: string;
    uniformlyContinuous: string;
    mvtPoint: string;
    mvtLargest: string;
    mvtSmallest: string;
    remainder: string;
    upperSum: string;
    lowerSum: string;
    sumsWithin: string;
    integrable: string;
    pointwise: string;
    supNorm: string;
    uniform: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);

/** ε = 1/k as LaTeX: a decimal for 1/10, 1/100, 1/1000, a fraction otherwise. */
export const epsTex = (k: number) => `\\varepsilon = ${[10, 100, 1000].includes(k) ? String(1 / k) : `\\frac{1}{${k}}`}`;

/** The smallest whole n ≥ 1 with ok(n) (NaN when there is none up to max). */
export function firstN(ok: (n: number) => boolean, max = 1e6): number {
  for (let n = 1; n <= max; n++) if (ok(n)) return n;
  return NaN;
}

/** The upper (or lower) Darboux sum of a monotone f on [a, b] cut into n equal parts: on each piece the largest
 *  (smallest) value is at one of its ends. */
export function darboux(f: (x: Frac) => Frac, a: Frac, b: Frac, n: number, upper: boolean): Frac {
  const h = b.sub(a).div(F(n));
  let s = F(0);
  for (let i = 0; i < n; i++) {
    const [l, r] = [f(a.add(h.mul(F(i)))), f(a.add(h.mul(F(i + 1))))];
    s = s.add(upper === l.toNumber() > r.toNumber() ? l : r);
  }
  return s.mul(h);
}

/** A sequence term c + b/nᵖ as LaTeX: "3 + \frac{2}{n}", "-\frac{5}{n^{2}}". */
export function termTex(c: number, b: Frac, power = 1, alternating = false): string {
  const nP = power === 1 ? "n" : `n^{${power}}`;
  const top = Math.abs(b.n);
  const frac = b.d === 1 ? `\\frac{${top}}{${nP}}` : `\\frac{${top}}{${b.d}${nP}}`;
  const sgn = alternating ? "(-1)^{n}" : "";
  const body = `${sgn}${frac}`;
  if (c === 0) return `${b.isNeg() ? "-" : ""}${body}`;
  return `${c} ${b.isNeg() ? "-" : "+"} ${body}`;
}

/** A set given by a rule: \left\{ … : n \in \mathbb{N} \right\}. */
export const setTex = (body: string, v = "n", where = "\\mathbb{N}") => `\\left\\{ ${body} : ${v} \\in ${where} \\right\\}`;

type Shown = { answer: Answer; show: string; plain: string; format: Format };

/** Two exact numbers in order (sup then inf), with named slips that give another pair. */
export function pairOf(vs: [Frac, Frac], slips: [MistakeId, [Frac, Frac]][], format: Format): Shown {
  const ns = vs.map((v) => v.toNumber());
  const traps: Trap[] = [];
  for (const [id, s] of slips) {
    const t = s.map((v) => v.toNumber());
    if (t.every((x, i) => Math.abs(x - ns[i]) < 1e-9) || traps.some((o) => o.a.k === "tuple" && o.a.vs.every((x, i) => Math.abs(x - t[i]) < 1e-9))) continue;
    traps.push({ id, a: { k: "tuple", vs: t, tol: 1e-9 } });
  }
  return {
    answer: { k: "tuple", vs: ns, tol: 1e-9, ...(traps.length ? { traps } : {}) },
    show: vs.map((v) => v.tex()).join(", \\; "),
    plain: vs.map(plainFrac).join("; "),
    format,
  };
}

/** Every value of a finite set of exact numbers, in any order, with named slips that give another set. */
export function valuesOf(vs: Frac[], slips: [MistakeId, Frac[]][], format: Format): Shown {
  const sorted = (xs: Frac[]) => [...xs].sort((x, y) => x.toNumber() - y.toNumber());
  const key = (xs: Frac[]) => sorted(xs).map(plainFrac).join(";");
  const right = sorted(vs);
  const traps: Trap[] = [];
  const seen = new Set([key(vs)]);
  for (const [id, s] of slips) {
    if (seen.has(key(s))) continue;
    seen.add(key(s));
    traps.push({ id, a: { k: "set", vs: sorted(s).map((x) => x.toNumber()), tol: 1e-9, listed: true } });
  }
  return {
    answer: { k: "set", vs: right.map((x) => x.toNumber()), tol: 1e-9, listed: true, ...(traps.length ? { traps } : {}) },
    show: right.map((x) => x.tex()).join(", \\; "),
    plain: right.map(plainFrac).join("; "),
    format,
  };
}

/** A whole-number answer with named slips (kept only when they differ from it and from each other). */
export function wholeOf(v: number, slips: [MistakeId, number][]): Shown {
  const traps: Trap[] = [];
  for (const [id, s] of slips) if (s !== v && s > 0 && !traps.some((o) => o.a.k === "num" && o.a.v === s)) traps.push({ id, a: num(s) });
  return { answer: { ...num(v), ...(traps.length ? { traps } : {}) }, show: String(v), plain: String(v), format: "number" };
}

/** n! */
export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
