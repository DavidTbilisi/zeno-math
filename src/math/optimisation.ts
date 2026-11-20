// Optimisation as a degree teaches it (Vanderbei, Linear Programming: Foundations and Extensions; Hillier &
// Lieberman, Introduction to Operations Research; Boyd & Vandenberghe, Convex Optimization): linear programmes in two
// variables solved at the corners of the feasible region, simplex tableaux, pivots and the dual, convex sets and
// functions, and the KKT conditions. The words, and the exact helpers the answers are made of; the questions are in
// src/math/skills/{linearProgramming,simplex,convex}.ts.
import { F } from "./calculusTwo";
import type { Frac } from "./fraction";
import type { Rng } from "./practiceTypes";

/** The words of these questions (the locale's `opt` block). */
export type OptimisationWords = {
  /** Whether a point satisfies every constraint. */
  feasible: { yes: string; no: string };
  /** Whether a function is convex, concave or neither. */
  shape: { convex: string; concave: string; neither: string };
  /** Whether a set is convex. */
  convexSet: { yes: string; no: string };
  prompt: {
    feasible: string;
    corner: string;
    graphical: string;
    workshop: string;
    diet: string;
    leaving: string;
    entering: string;
    pivotZ: string;
    pivotRow: string;
    shadowPrice: string;
    convexFn: string;
    convexSet: string;
    quadForm: string;
    largestB: string;
    kktMultiplier: string;
    kktValue: string;
  };
};

/**
 * Two constraints a₁x + b₁y (≤ or ≥) c₁ and a₂x + b₂y (≤ or ≥) c₂ through the whole-number corner (X, Y), the first
 * line steeper (a₁/b₁ > a₂/b₂), and an objective px + qy whose slope lies strictly between theirs, so that the
 * optimum, of max with ≤ or of min with ≥, is that corner and nowhere else.
 */
export type Lp = { a1: number; b1: number; c1: number; a2: number; b2: number; c2: number; X: number; Y: number; p: number; q: number };

export function drawLp(r: Rng): Lp {
  for (;;) {
    const [a1, b1, a2, b2] = [r.int(1, 5), r.int(1, 5), r.int(1, 5), r.int(1, 5)];
    if (a1 * b2 <= a2 * b1) continue;
    const X = r.int(1, 6);
    const Y = r.int(1, 6);
    const p = r.int(1, 8);
    const q = r.int(1, 8);
    // a₂/b₂ < p/q < a₁/b₁
    if (!(a2 * q < p * b2 && p * b1 < a1 * q)) continue;
    return { a1, b1, c1: a1 * X + b1 * Y, a2, b2, c2: a2 * X + b2 * Y, X, Y, p, q };
  }
}

export type Pt = [Frac, Frac];
export const value = (lp: Lp, [x, y]: Pt) => F(lp.p).mul(x).add(F(lp.q).mul(y));
/** The corners of the feasible region of max with ≤: the origin, the first line's x-intercept, the meet, the second's y-intercept. */
export const maxCorners = (lp: Lp): Pt[] => [[F(0), F(0)], [F(lp.c1, lp.a1), F(0)], [F(lp.X), F(lp.Y)], [F(0), F(lp.c2, lp.b2)]];
/** The corners of the feasible region of min with ≥ (unbounded): the first line's y-intercept, the meet, the second's x-intercept. */
export const minCorners = (lp: Lp): Pt[] => [[F(0), F(lp.c1, lp.b1)], [F(lp.X), F(lp.Y)], [F(lp.c2, lp.a2), F(0)]];
/** The intercepts that are not corners: of max, the first line's on the y-axis and the second's on the x-axis; of min, the reverse. */
export const otherIntercepts = (lp: Lp, max: boolean): Pt[] =>
  max ? [[F(0), F(lp.c1, lp.b1)], [F(lp.c2, lp.a2), F(0)]] : [[F(lp.c1, lp.a1), F(0)], [F(0), F(lp.c2, lp.b2)]];
export const fmax = (xs: Frac[]) => xs.reduce((m, x) => (x.toNumber() > m.toNumber() ? x : m));
export const fmin = (xs: Frac[]) => xs.reduce((m, x) => (x.toNumber() < m.toNumber() ? x : m));

/** The shadow prices of the two tight constraints: y solving a₁y₁ + a₂y₂ = p, b₁y₁ + b₂y₂ = q (Aᵀy = c). */
export function shadowPrices(lp: Lp, transposed = true): [Frac, Frac] {
  // transposed: [[a1, a2], [b1, b2]] y = (p, q); not: [[a1, b1], [a2, b2]] y = (p, q).
  const [m11, m12, m21, m22] = transposed ? [lp.a1, lp.a2, lp.b1, lp.b2] : [lp.a1, lp.b1, lp.a2, lp.b2];
  const det = m11 * m22 - m12 * m21;
  return [F(lp.p * m22 - m12 * lp.q, det), F(m11 * lp.q - m21 * lp.p, det)];
}

/** The minimum ratio test: of the rows with a positive coefficient in the entering column, the one with least b/a. */
export function ratioRow(col: number[], rhs: number[]): number {
  let best = -1;
  for (let i = 0; i < col.length; i++) if (col[i] > 0 && (best < 0 || rhs[i] * col[best] < rhs[best] * col[i])) best = i;
  return best;
}

/** min (x − a)² + (y − b)² subject to x + y ≤ c: the KKT multiplier max(0, a + b − c) and the least value λ²/2. */
export function kkt(a: number, b: number, c: number) {
  const lambda = Math.max(0, a + b - c);
  return { lambda, x: F(2 * a - lambda, 2), y: F(2 * b - lambda, 2), value: F(lambda * lambda, 2) };
}

/** ax² + bxy + cy²: convex when its Hessian [[2a, b], [b, 2c]] is positive semidefinite, concave when negative. 0 convex, 1 concave, 2 neither. */
export function quadShape(a: number, b: number, c: number): 0 | 1 | 2 {
  if (4 * a * c - b * b < 0) return 2;
  if (a >= 0 && c >= 0) return 0;
  return 1;
}
