// Stochastic processes as a degree's elective teaches them (Ross, Introduction to Probability Models; Grimmett &
// Stirzaker, Probability and Random Processes), past the Markov chains of src/math/skills/markov.ts: the simple random
// walk and the gambler's ruin, the Poisson process with its exponential gaps, splitting and merging, and Brownian
// motion with its covariance, drift and the reflection principle. The words, and the exact maths the answers are made
// of; the questions are in src/math/skills/{randomWalks,poissonProcess,brownian}.ts.
import type { NumSlip } from "./calculusTwo";
import { Frac } from "./fraction";
import { normCdf } from "./distributions";

/** The words of these questions (the locale's `sp` block). */
export type StochasticWords = {
  prompt: {
    walkProb: string;
    walkMean: string;
    walkVar: string;
    ruinWin: string;
    ruinLose: string;
    ruinDuration: string;
    biasedWin: string;
    biasedLose: string;
    biasedDuration: string;
    poissonCount: string;
    expTail: string;
    memoryless: string;
    nthArrival: string;
    split: string;
    firstFrom: string;
    firstEither: string;
    bmCov: string;
    bmVar: string;
    bmProb: string;
    bmMax: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);
/** x to a whole power n ≥ 0. */
export const pow = (x: Frac, n: number) => Array.from({ length: n }, () => x).reduce((s, y) => s.mul(y), F(1));
export const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
export const choose = (n: number, k: number): number => (k < 0 || k > n ? 0 : factorial(n) / (factorial(k) * factorial(n - k)));

/** The number of up steps of a walk that is at k after n steps, or null when it cannot be there. */
export const upSteps = (n: number, k: number) => (Math.abs(k) > n || (n + k) % 2 !== 0 ? null : (n + k) / 2);

/** P(Sₙ = k) for the walk from 0 that steps +1 with probability p and −1 otherwise. */
export function walkProb(n: number, k: number, p: Frac): Frac {
  const u = upSteps(n, k);
  if (u === null) return F(0);
  return F(choose(n, u)).mul(pow(p, u)).mul(pow(F(1).sub(p), n - u));
}

/** P(reach N before 0 from i) for a gambler who wins each bet of 1 with probability p. */
export function ruinWin(i: number, N: number, p: Frac): Frac {
  const q = F(1).sub(p);
  if (p.sub(q).isZero()) return F(i, N);
  const r = q.div(p);
  return F(1).sub(pow(r, i)).div(F(1).sub(pow(r, N)));
}

/** The expected number of bets until the gambler reaches 0 or N from i. */
export function ruinDuration(i: number, N: number, p: Frac): Frac {
  const q = F(1).sub(p);
  if (p.sub(q).isZero()) return F(i * (N - i));
  return F(i).sub(F(N).mul(ruinWin(i, N, p))).div(q.sub(p));
}

/** P(N = k) for N Poisson with mean mu. */
export const poissonPmf = (k: number, mu: number) => (Math.exp(-mu) * mu ** k) / factorial(k);

/** The slips of a probability v to 3 places, without those that round to 0.000 (nobody types 3 × 10⁻⁷) or that the
 *  checker would take for a rounding slip of v. */
export const seen = (v: number, slips: NumSlip[]): NumSlip[] => slips.filter(([, x]) => typeof x !== "number" || (x >= 0.001 && Math.abs(x - v) >= 0.02));

/** P(Z > z) for a standard normal Z. */
export const upper = (z: number) => 1 - normCdf(z);
