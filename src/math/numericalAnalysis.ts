// Numerical analysis as a degree teaches it (Burden & Faires, Numerical Analysis; Süli & Mayers, An Introduction to
// Numerical Analysis; Trefethen & Bau, Numerical Linear Algebra), past the Newton step and the trapezium and Simpson
// rules of src/math/skills/{numroots,numint}.ts: rounding error and conditioning, polynomial interpolation, one-step
// methods for y′ = f(x, y), LU factorisation and the Jacobi and Gauss–Seidel iterations, and orders of convergence.
// The words, and the exact arithmetic the answers are made of; the questions are in
// src/math/skills/{floatingPoint,interpolation,numericalOde,linearSolvers,convergenceOrder}.ts.
import { Frac } from "./fraction";

/** The words of these questions (the locale's `na` block). */
export type NumAnalysisWords = {
  converges: string;
  diverges: string;
  methods: { euler: string; heun: string; rk4: string; jacobi: string; seidel: string };
  prompt: {
    absError: string;
    relError: string;
    condition: string;
    condMatrix: string;
    basis: string;
    interp: string;
    divided: string;
    interpError: string;
    euler: string;
    heun: string;
    rk4: string;
    errorScale: string;
    lu: string;
    iterate: string;
    radius: string;
    converges: string;
    bisection: string;
    newtonRate: string;
    fixedRate: string;
    fixedConverges: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);

/** The Lagrange basis polynomial Lᵢ of the nodes, at x: Π_{j ≠ i} (x − xⱼ)/(xᵢ − xⱼ). */
export function lagrangeBasis(nodes: number[], i: number, x: Frac): Frac {
  let v = F(1);
  nodes.forEach((xj, j) => {
    if (j !== i) v = v.mul(x.sub(F(xj))).div(F(nodes[i] - xj));
  });
  return v;
}

/** The value at x of the polynomial of least degree through (nodes[i], ys[i]). */
export const interpolate = (nodes: number[], ys: number[], x: Frac): Frac =>
  nodes.reduce((s, _, i) => s.add(F(ys[i]).mul(lagrangeBasis(nodes, i, x))), F(0));

/** The divided differences f[x₀, x₁], f[x₁, x₂] and f[x₀, x₁, x₂]. */
export function dividedDifferences(xs: number[], ys: number[]): { d01: Frac; d12: Frac; d012: Frac } {
  const d01 = F(ys[1] - ys[0], xs[1] - xs[0]);
  const d12 = F(ys[2] - ys[1], xs[2] - xs[1]);
  return { d01, d12, d012: d12.sub(d01).div(F(xs[2] - xs[0])) };
}

/** y′ = f(x, y), exactly. */
export type Slope = (x: Frac, y: Frac) => Frac;

/** One step of Euler's method: y₀ + h f(x₀, y₀). */
export const eulerStep = (f: Slope, x0: Frac, y0: Frac, h: Frac) => y0.add(h.mul(f(x0, y0)));

/** One step of the improved Euler (Heun) method, with its two slopes. */
export function heunStep(f: Slope, x0: Frac, y0: Frac, h: Frac): { k1: Frac; k2: Frac; y1: Frac } {
  const k1 = f(x0, y0);
  const k2 = f(x0.add(h), y0.add(h.mul(k1)));
  return { k1, k2, y1: y0.add(h.mul(k1.add(k2)).div(F(2))) };
}

/** One step of the classical Runge–Kutta method, with its four slopes. */
export function rk4Step(f: Slope, x0: Frac, y0: Frac, h: Frac): { k: Frac[]; y1: Frac } {
  const half = h.div(F(2));
  const k1 = f(x0, y0);
  const k2 = f(x0.add(half), y0.add(half.mul(k1)));
  const k3 = f(x0.add(half), y0.add(half.mul(k2)));
  const k4 = f(x0.add(h), y0.add(h.mul(k3)));
  return { k: [k1, k2, k3, k4], y1: y0.add(h.mul(k1.add(k2.mul(F(2))).add(k3.mul(F(2))).add(k4)).div(F(6))) };
}

/** The Doolittle factorisation A = LU (L unit lower triangular), when no pivot is zero. */
export function doolittle(a: number[][]): { L: Frac[][]; U: Frac[][] } | null {
  const n = a.length;
  const L = a.map((_, i) => a.map((__, j) => F(i === j ? 1 : 0)));
  const U = a.map((row) => row.map(() => F(0)));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = F(a[i][j]);
      for (let k = 0; k < i; k++) s = s.sub(L[i][k].mul(U[k][j]));
      U[i][j] = s;
    }
    if (U[i][i].isZero()) return null;
    for (let j = i + 1; j < n; j++) {
      let s = F(a[j][i]);
      for (let k = 0; k < i; k++) s = s.sub(L[j][k].mul(U[k][i]));
      L[j][i] = s.div(U[i][i]);
    }
  }
  return { L, U };
}

/** ‖A‖∞, the largest row sum of absolute values, and ‖A‖₁, the largest column sum. */
export const normInf = (a: Frac[][]) => a.map((row) => row.reduce((s, x) => s.add(x.abs()), F(0))).reduce((m, x) => (x.toNumber() > m.toNumber() ? x : m));
export const norm1 = (a: Frac[][]) => normInf(a[0].map((_, j) => a.map((row) => row[j])));

/** The inverse of a 2 × 2 matrix of whole numbers. */
export function inverse2(a: number[][]): Frac[][] {
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  return [
    [F(a[1][1], det), F(-a[0][1], det)],
    [F(-a[1][0], det), F(a[0][0], det)],
  ];
}

/** A matrix of exact numbers. */
export const matTex = (m: (Frac | number)[][]) =>
  `\\begin{pmatrix} ${m.map((row) => row.map((c) => (typeof c === "number" ? String(c) : c.tex())).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;

/** The fewest bisection steps n that shrink a bracket of length len to at most 10⁻ᵏ: len · 10ᵏ ≤ 2ⁿ. */
export function bisectionSteps(len: number, k: number): number {
  let n = 0;
  while (2 ** n < len * 10 ** k) n++;
  return n;
}
