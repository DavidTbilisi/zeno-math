// Functional analysis as a degree teaches it (Kreyszig, Introductory Functional Analysis with Applications,
// chapters 2–3): the 1-, 2- and ∞-norms of vectors and of functions on [0, 1] and the constants that make them
// equivalent; the norms of matrices and of integral and multiplication operators; orthogonal projection, best
// approximation and Parseval in a Hilbert space. The words, and the small helpers the answers are made of; the
// questions are in src/math/skills/{norms,operatorNorms,hilbertSpaces}.ts.

/** The words of these questions (the locale's `fa` block). */
export type FunctionalWords = {
  prompt: {
    vectorNorm: string;
    functionNorm: string;
    equivalence: string;
    matrixNorm: string;
    operatorNorm: string;
    projection: string;
    parseval: string;
    bestConstant: string;
    distance: string;
  };
};

/** Vectors whose 2-norm is whole: entries ≥ 0 and the norm. */
export const WHOLE_NORM: readonly [number[], number][] = [
  [[1, 2, 2], 3],
  [[2, 3, 6], 7],
  [[1, 4, 8], 9],
  [[4, 4, 7], 9],
  [[2, 6, 9], 11],
  [[6, 6, 7], 11],
  [[1, 2, 2, 4], 5],
  [[2, 4, 5, 6], 9],
  [[1, 1, 3, 5], 6],
];

/** ‖x‖₁, ‖x‖₂², ‖x‖∞. */
export const norm1 = (x: readonly number[]) => x.reduce((s, v) => s + Math.abs(v), 0);
export const norm2sq = (x: readonly number[]) => x.reduce((s, v) => s + v * v, 0);
export const normInf = (x: readonly number[]) => Math.max(...x.map(Math.abs));

/** The 1-norm of a matrix is its largest absolute column sum, the ∞-norm its largest absolute row sum. */
export const colNorm = (A: readonly (readonly number[])[]) => Math.max(...A[0].map((_, j) => A.reduce((s, row) => s + Math.abs(row[j]), 0)));
export const rowNorm = (A: readonly (readonly number[])[]) => Math.max(...A.map((row) => norm1(row)));
/** The same with the signs kept: a learner's slip. */
export const colSigned = (A: readonly (readonly number[])[]) => Math.max(...A[0].map((_, j) => A.reduce((s, row) => s + row[j], 0)));
export const rowSigned = (A: readonly (readonly number[])[]) => Math.max(...A.map((row) => row.reduce((s, v) => s + v, 0)));

/** ∫₀¹ |a − b x| dx for b > a > 0, where the line crosses 0 at a/b: a²/(2b) + (b − a)²/(2b). */
export const absLineIntegral = (a: number, b: number): [number, number] => [a * a + (b - a) * (b - a), 2 * b];

/** A vector as TeX: (1, -2, 2). */
export const vecTex = (x: readonly number[]) => `\\left(${x.join(", ")}\\right)`;
/** A matrix as TeX. */
export const matTex = (A: readonly (readonly number[])[]) => `\\begin{pmatrix} ${A.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
