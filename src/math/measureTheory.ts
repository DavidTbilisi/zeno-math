// Measure theory and Lebesgue integration as a degree teaches them (Axler, Measure, Integration & Real Analysis,
// chapters 2–3): the outer measure of sets made of intervals and countable pieces, Cantor-type sets, countable
// additivity and continuity of measure; integrals of simple functions, functions equal almost everywhere and other
// measures; the monotone and dominated convergence theorems, mass that escapes, and Lᵖ norms. The words, and the
// small helpers the answers are made of; the questions are in
// src/math/skills/{lebesgueMeasure,simpleIntegrals,convergenceTheorems}.ts.
import { Frac } from "./fraction";

/** The words of these questions (the locale's `mt` block). */
export type MeasureWords = {
  prompt: {
    measure: string;
    cantorLeft: string;
    cantorRemoved: string;
    simple: string;
    ae: string;
    dirac: string;
    limInt: string;
    intLim: string;
    norm: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);

/** qⁿ for a fraction and a whole n ≥ 0. */
export function powF(q: Frac, n: number): Frac {
  let out = F(1);
  for (let i = 0; i < n; i++) out = out.mul(q);
  return out;
}

/** The length of a union of two intervals [a, b] and [c, d]. */
export function unionLength(a: number, b: number, c: number, d: number): number {
  if (c > b || a > d) return b - a + (d - c);
  return Math.max(b, d) - Math.min(a, c);
}

/** What is left of [0, L] after n steps that take the open middle q of every interval: L(1 − q)ⁿ. */
export const cantorLeft = (L: number, q: Frac, n: number) => F(L).mul(powF(F(1).sub(q), n));

/** The length removed if each step took the middle q of one interval only: Σ qL((1 − q)/2)ʲ⁻¹. */
export function oneGapRemoved(L: number, q: Frac, n: number): Frac {
  let out = F(0);
  for (let j = 1; j <= n; j++) out = out.add(F(L).mul(q).mul(powF(F(1).sub(q).div(F(2)), j - 1)));
  return out;
}

/** ∫₀ᵇ (c xᵏ + s) dx = c bᵏ⁺¹/(k + 1) + s b. */
export const polyIntegral = (c: number, k: number, s: number, b: number) => F(c * b ** (k + 1), k + 1).add(F(s * b));

/** c xᵏ + s as TeX (k ≥ 1). */
export function polyTex(c: number, k: number, s: number): string {
  const head = `${c === 1 ? "" : c}x${k === 1 ? "" : `^{${k}}`}`;
  return s === 0 ? head : `${head} + ${s}`;
}

/** A piecewise definition as TeX. */
export const cases = (rows: [string, string][]) => `\\begin{cases} ${rows.map(([v, when]) => `${v} & ${when}`).join(" \\\\ ")} \\end{cases}`;

/** The indicator of a set as TeX: \\chi_{[a, b)}. */
export const chi = (set: string) => `\\chi_{${set}}`;

/** Whole a, b ≥ 1 and lengths u, v ≥ 1 with a²u + b²v a perfect square and a ≠ b: an L² norm that comes out whole. */
export const SQUARE_NORMS: readonly [number, number, number, number][] = (() => {
  const out: [number, number, number, number][] = [];
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      for (let u = 1; u <= 4; u++)
        for (let v = 1; v <= 4; v++) {
          const s = a * a * u + b * b * v;
          if (a !== b && Number.isInteger(Math.sqrt(s))) out.push([a, b, u, v]);
        }
  return out;
})();
