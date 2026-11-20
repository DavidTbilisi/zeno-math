// Complex analysis as a degree's third year takes it (Needham, Visual Complex Analysis; Brown & Churchill, Complex
// Variables and Applications; Stein & Shakarchi, Complex Analysis): the Cauchy–Riemann equations and harmonic
// conjugates, contour integrals, Cauchy's theorem and integral formula, Laurent series and singularities, residues and
// real integrals by residues. The words and the exact helpers; the questions are in
// src/math/skills/{analytic,contour,laurent,residueCalc}.ts.
import { cadd, cmul, cx } from "./complexPractice";
import type { MistakeId } from "./mistakes";
import type { CxVal, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `ca` block). */
export type ComplexAnalysisWords = {
  prompt: {
    crK: string;
    derivative: string;
    conjugate: string;
    path: string;
    loop: string;
    kind: string;
    coefficient: string;
    annulus: string;
    residue: string;
    real: string;
  };
  /** The kinds of an isolated singularity; {m} is the order of a pole. */
  kind: { removable: string; simple: string; pole: string; essential: string };
};

/** A polynomial in z with complex coefficients, lowest power first, at a point. */
export function cpoly(cs: CxVal[], z: CxVal): CxVal {
  let out = cx(0);
  for (let k = cs.length - 1; k >= 0; k--) out = cadd(cmul(out, z), cs[k]);
  return out;
}
/** The derivative's coefficients. */
export const cderiv = (cs: CxVal[]): CxVal[] => cs.slice(1).map((c, k) => cx(c.re * (k + 1), c.im * (k + 1)));
/** n! */
export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

/** A sum of terms c·m (m a monomial like "x^{2}", "xy" or ""), as LaTeX: 3x^{2} - xy + 2. */
export function termsTex(terms: [number, string][]): string {
  let out = "";
  for (const [c, m] of terms) {
    if (!c) continue;
    const a = Math.abs(c);
    const body = m ? `${a === 1 ? "" : a}${m}` : String(a);
    out += out ? (c < 0 ? ` - ${body}` : ` + ${body}`) : c < 0 ? `-${body}` : body;
  }
  return out || "0";
}

/** kπ as LaTeX and as typed: \pi, -2\pi, 3\pi i. */
function piPart(k: number, i: boolean): { tex: string; plain: string } {
  const a = Math.abs(k);
  const tex = `${a === 1 ? "" : a}\\pi${i ? " i" : ""}`;
  const plain = `${a === 1 ? "" : a}pi${i ? " i" : ""}`;
  return { tex, plain };
}
/** π(p + qi) for whole p and q, as a value, LaTeX and typed: -4\pi + 6\pi i, 2\pi i, 0. */
export function piCx(p: number, q: number): { v: CxVal; tex: string; plain: string } {
  const v = cx(p * Math.PI, q * Math.PI);
  if (!p && !q) return { v, tex: "0", plain: "0" };
  const re = p ? piPart(p, false) : null;
  const im = q ? piPart(q, true) : null;
  if (!im) return { v, tex: `${p < 0 ? "-" : ""}${re!.tex}`, plain: `${p < 0 ? "-" : ""}${re!.plain}` };
  if (!re) return { v, tex: `${q < 0 ? "-" : ""}${im.tex}`, plain: `${q < 0 ? "-" : ""}${im.plain}` };
  return { v, tex: `${p < 0 ? "-" : ""}${re.tex} ${q < 0 ? "-" : "+"} ${im.tex}`, plain: `${p < 0 ? "-" : ""}${re.plain} ${q < 0 ? "-" : "+"} ${im.plain}` };
}
/** 2πi · w for a Gaussian integer w = a + bi: π(−2b + 2ai). */
export const twoPiI = (w: CxVal) => piCx(-2 * w.im, 2 * w.re);

/** An answer that is π(p + qi), with named slips (values), dropped when they give the answer or an earlier slip. */
export function piAnswer(p: number, q: number, slips: [MistakeId, CxVal][] = []) {
  const { v, tex, plain } = piCx(p, q);
  const traps: Trap[] = [];
  const same = (a: CxVal, b: CxVal) => Math.abs(a.re - b.re) < 1e-9 && Math.abs(a.im - b.im) < 1e-9;
  for (const [id, s] of slips) {
    if (same(s, v) || traps.some((t) => t.a.k === "complex" && same(t.a.vs[0], s))) continue;
    traps.push({ id, a: { k: "complex", vs: [s], tol: 1e-6 } });
  }
  return { answer: { k: "complex" as const, vs: [v], tol: 1e-6, ...(traps.length ? { traps } : {}) }, show: tex, plain, format: "complex" as const };
}

const SUP: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
/** zᵏ for words: z⁻², z⁻¹, z⁰, z, z³. */
export const zPow = (k: number) => (k === 0 ? "z⁰" : k === 1 ? "z" : `z${String(k).replace(/[-\d]/g, (c) => SUP[c])}`);
/** zᵏ as LaTeX: z^{-2}, z. */
export const zPowTex = (k: number) => (k === 0 ? "1" : k === 1 ? "z" : `z^{${k}}`);

/**
 * The coefficient of zᵏ of 1/((z − a)(z − b)) on the annulus |a| < |z| < |b|: 1/(z − a) is expanded in powers of 1/z
 * and −1/(z − b) in powers of z, each over a − b.
 */
export function annulusCoefficient(a: number, b: number, k: number): [number, number] {
  return k < 0 ? [a ** (-k - 1), a - b] : [1, (a - b) * b ** (k + 1)];
}
