// Probability theory as a degree teaches it (Ross, A First Course in Probability; Blitzstein & Hwang, Introduction to
// Probability; Grinstead & Snell, Introduction to Probability; Norris, Markov Chains), past the discrete
// distributions of src/math/skills/distributions.ts: densities and distribution functions, joint distributions,
// moment generating functions, the law of large numbers and the central limit theorem, Markov chains. The words, and
// the exact maths the answers are made of; the questions are in
// src/math/skills/{densities,jointDist,mgf,limitTheorems,markov}.ts.
import { numTraps, type NumSlip } from "./calculusTwo";
import { Frac } from "./fraction";
import { normCdf } from "./inference";
import { dp, num } from "./practiceKit";
import type { Answer, Format } from "./practiceTypes";

/** The words of these questions (the locale's `pt` block). */
export type ProbWords = {
  yes: string;
  no: string;
  prompt: {
    constant: string;
    probability: string;
    mean: string;
    marginal: string;
    conditional: string;
    covariance: string;
    independent: string;
    mgfMean: string;
    mgfVar: string;
    combo: string;
    sumParameter: string;
    meanVar: string;
    meanSd: string;
    cltMean: string;
    cltSum: string;
    binomApprox: string;
    twoStep: string;
    oneStep: string;
    stationary: string;
    returnTime: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);
export const sum = (xs: Frac[]) => xs.reduce((s, x) => s.add(x), F(0));

/** P(Z ≤ z) for a standard normal Z. */
export const Phi = (z: number) => normCdf(z);

type Shown = { answer: Answer; show: string; plain: string; format: Format };
/** A probability to three decimal places, with named slips kept only when they are clearly another number. */
export function dp3Of(v: number, tex: string, slips: NumSlip[]): Shown {
  const traps = numTraps(v, slips)
    .filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 0.01)
    .map((t) => ({ ...t, a: num((t.a as { v: number }).v, 0.00051) }));
  return { answer: { ...num(v, 0.00051), ...(traps.length ? { traps } : {}) }, show: `${tex} \\approx ${dp(v, 3)}`, plain: dp(v, 3), format: "dp3" };
}

/** A table of P(X = i, Y = j), X down the side and Y along the top. */
export const jointTex = (cells: Frac[][], ys: number[], xs: number[]) =>
  `\\begin{array}{c|${"c".repeat(ys.length)}} & ${ys.map((y) => `Y = ${y}`).join(" & ")} \\\\ \\hline ${cells
    .map((row, i) => `X = ${xs[i]} & ${row.map((c) => c.tex()).join(" & ")}`)
    .join(" \\\\ ")} \\end{array}`;

/** A matrix of exact numbers. */
export const matTex = (m: Frac[][]) => `\\begin{pmatrix} ${m.map((row) => row.map((c) => c.tex()).join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;

/** The product of two square matrices of exact numbers. */
export const matMul = (a: Frac[][], b: Frac[][]) => a.map((row) => b[0].map((_, j) => sum(row.map((x, k) => x.mul(b[k][j])))));

/** The row vector v times the matrix m. */
export const rowTimes = (v: Frac[], m: Frac[][]) => m[0].map((_, j) => sum(v.map((x, k) => x.mul(m[k][j]))));

/** The stationary distribution (b/(a + b), a/(a + b)) of the two-state chain that leaves state 1 with a, state 2 with b. */
export const stationaryTwo = (a: Frac, b: Frac): [Frac, Frac] => [b.div(a.add(b)), a.div(a.add(b))];
