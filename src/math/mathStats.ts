// Mathematical statistics as a degree teaches it (Wackerly, Mendenhall & Scheaffer, Mathematical Statistics with
// Applications; OpenIntro Statistics; Wasserman, All of Statistics; Casella & Berger, Statistical Inference), past the
// confidence intervals and z tests of src/math/skills/{ci,hypothesis}.ts: estimators and their bias and mean squared
// error, maximum likelihood, least-squares regression, χ² tests, one-way ANOVA and Bayesian updating. The words, and
// the exact sums the answers are made of; the questions are in
// src/math/skills/{estimators,mle,regression,chiSquared,anova,bayes}.ts.
import { Frac } from "./fraction";

/** The words of these questions (the locale's `st` block). */
export type StatWords = {
  consistent: string;
  notConsistent: string;
  prompt: {
    bias: string;
    mse: string;
    consistent: string;
    mle: string;
    slope: string;
    intercept: string;
    residual: string;
    rSquared: string;
    adjusted: string;
    expectedCell: string;
    df: string;
    chiStat: string;
    dfBetween: string;
    dfWithin: string;
    ssb: string;
    fStat: string;
    posteriorCoin: string;
    posteriorBeta: string;
    posteriorMean: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);
export const total = (xs: Frac[]) => xs.reduce((s, x) => s.add(x), F(0));
/** The mean of whole numbers, exactly. */
export const meanOf = (xs: number[]) => F(xs.reduce((s, x) => s + x, 0), xs.length);

/** Σ(x − x̄)², exactly. */
export function sxx(xs: number[]): Frac {
  const m = meanOf(xs);
  return total(xs.map((x) => F(x).sub(m).mul(F(x).sub(m))));
}

/** Σ(x − x̄)(y − ȳ), exactly. */
export function sxy(xs: number[], ys: number[]): Frac {
  const mx = meanOf(xs);
  const my = meanOf(ys);
  return total(xs.map((x, i) => F(x).sub(mx).mul(F(ys[i]).sub(my))));
}

/** The least-squares line y = a + bx: b = Sxy / Sxx, a = ȳ − b x̄. */
export function lsLine(xs: number[], ys: number[]): { a: Frac; b: Frac } {
  const b = sxy(xs, ys).div(sxx(xs));
  return { a: meanOf(ys).sub(b.mul(meanOf(xs))), b };
}

/** Σ (O − E)² / E, and the two slips: dividing by O, and not dividing at all. */
export function chiSquare(obs: number[], exp: Frac[]): { stat: Frac; byObserved: Frac; undivided: Frac } {
  const sq = obs.map((o, i) => F(o).sub(exp[i]).mul(F(o).sub(exp[i])));
  return {
    stat: total(sq.map((s, i) => s.div(exp[i]))),
    byObserved: total(sq.map((s, i) => s.div(F(obs[i])))),
    undivided: total(sq),
  };
}

/** The expected counts of a table under independence: row total × column total / grand total. */
export function expectedTable(t: number[][]): Frac[][] {
  const rows = t.map((r) => r.reduce((s, x) => s + x, 0));
  const cols = t[0].map((_, j) => t.reduce((s, r) => s + r[j], 0));
  const n = rows.reduce((s, x) => s + x, 0);
  return t.map((_, i) => cols.map((c) => F(rows[i] * c, n)));
}

/** A table of counts with its row and column totals. */
export function countTableTex(t: number[][], rowNames: string[], colNames: string[]): string {
  const rows = t.map((r) => r.reduce((s, x) => s + x, 0));
  const cols = t[0].map((_, j) => t.reduce((s, r) => s + r[j], 0));
  const n = rows.reduce((s, x) => s + x, 0);
  return `\\begin{array}{c|${"c".repeat(cols.length)}|c} & ${colNames.join(" & ")} & \\Sigma \\\\ \\hline ${t
    .map((r, i) => `${rowNames[i]} & ${r.join(" & ")} & ${rows[i]}`)
    .join(" \\\\ ")} \\\\ \\hline \\Sigma & ${cols.join(" & ")} & ${n} \\end{array}`;
}

/** The between-groups sum of squares Σ nᵢ (ȳᵢ − ȳ)², with ȳ weighted by the group sizes. */
export function ssBetween(ns: number[], means: number[]): Frac {
  const grand = total(ns.map((n, i) => F(n * means[i]))).div(F(ns.reduce((s, x) => s + x, 0)));
  return total(ns.map((n, i) => F(means[i]).sub(grand).mul(F(means[i]).sub(grand)).mul(F(n))));
}

/** The grand mean of groups of sizes ns with means ms. */
export const grandMean = (ns: number[], ms: number[]) => total(ns.map((n, i) => F(n * ms[i]))).div(F(ns.reduce((s, x) => s + x, 0)));

/** p^k (1 − p)^(n − k), exactly (the binomial coefficient cancels in a posterior). */
export function likelihood(p: Frac, k: number, n: number): Frac {
  let v = F(1);
  for (let i = 0; i < k; i++) v = v.mul(p);
  for (let i = 0; i < n - k; i++) v = v.mul(F(1).sub(p));
  return v;
}
