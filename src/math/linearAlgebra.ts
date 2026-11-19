// Linear algebra as a degree's first year takes it on from the matrix computations (Strang, Introduction to Linear
// Algebra; Axler, Linear Algebra Done Right; Hefferon, Linear Algebra): subspaces and spans, bases and dimension, rank
// and nullity, linear maps and change of basis, inner products and least squares, diagonalisation, and the singular
// value decomposition. The words, whole-number matrices of a chosen rank or with whole-number inverses, and the exact
// answers; the questions are in src/math/skills/{subspaces,basis,rankNullity,linearMaps,innerProducts,spectral,svd}.ts.
import { Frac } from "./fraction";
import { gaussJordan, type Mat, mul, texM } from "./matrix";
import type { MistakeId } from "./mistakes";
import { colTex, M, matPlain, plainFrac } from "./practiceKit";
import type { Answer, Format, Rng, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `linalg` block). */
export type LinAlgWords = {
  yes: string;
  no: string;
  independent: string;
  dependent: string;
  linear: string;
  notLinear: string;
  prompt: {
    isSubspace: string;
    combination: string;
    inSpan: string;
    spanDim: string;
    independent: string;
    coordinates: string;
    dimension: string;
    rank: string;
    nullity: string;
    nullVector: string;
    isLinear: string;
    matrixOf: string;
    changeBasis: string;
    orthogonalK: string;
    weighted: string;
    gramSchmidt: string;
    leastSquares: string;
    diagonalisable: string;
    diagonalD: string;
    power: string;
    singular: string;
    lowRankError: string;
    rankOne: string;
  };
};

export const fr = (n: number, d = 1) => new Frac(n, d);

// ---------- matrices ----------

export const identity = (n: number): Mat => M(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
export const transpose = (m: Mat): Mat => m[0].map((_, j) => m.map((row) => row[j]));
export const diag = (ls: number[]): Mat => M(ls.map((l, i) => ls.map((_, j) => (i === j ? l : 0))));
/** The reduced row echelon form of m, and its rank. */
export function rref(m: Mat): { R: Mat; rank: number } {
  const { result, pivots } = gaussJordan(m, m[0].length);
  return { R: result, rank: pivots.length };
}
export const rankOf = (m: Mat) => rref(m).rank;
/** The inverse of an invertible square matrix. */
export function inverse(P: Mat): Mat {
  const n = P.length;
  const I = identity(n);
  return gaussJordan(P.map((row, i) => [...row, ...I[i]]), n).result.map((row) => row.slice(n));
}
export const sameMat = (a: Mat, b: Mat) => a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((x, j) => x.sub(b[i][j]).isZero()));
export const matSub = (a: Mat, b: Mat): Mat => a.map((row, i) => row.map((x, j) => x.sub(b[i][j])));
export const scaleMat = (k: Frac, a: Mat): Mat => a.map((row) => row.map((x) => k.mul(x)));
export const small = (m: Mat, max: number) => m.flat().every((x) => x.isInt() && Math.abs(x.n) <= max);
export const matVec = (A: Mat, v: Frac[]): Frac[] => A.map((row) => row.reduce((s, x, j) => s.add(x.mul(v[j])), fr(0)));
/** The matrix whose columns are the vectors. */
export const fromCols = (vs: number[][]): Mat => transpose(M(vs));

/** A product of shears: det 1, whole-number entries and a whole-number inverse, not the identity. */
export function shears(r: Rng, n: number, max = 4): Mat {
  for (;;) {
    let P = identity(n);
    for (let s = 0; s <= n; s++) {
      const [i, j] = [r.int(0, n - 1), r.int(0, n - 1)];
      if (i === j) continue;
      const E = identity(n);
      E[i][j] = fr(r.nz(-2, 2));
      P = mul(P, E);
    }
    if (P.flat().filter((x) => !x.isZero()).length > n && small(P, max)) return P;
  }
}

/** n whole-number vectors of length d, each with a non-zero component, spanning a space of dimension k. */
export function vectorsOfRank(r: Rng, n: number, d: number, k: number, max = 4): number[][] {
  for (;;) {
    const base = Array.from({ length: k }, () => Array.from({ length: d }, () => r.int(-3, 3)));
    const vs: number[][] = [...base];
    while (vs.length < n) {
      const cs = base.map(() => r.int(-2, 2));
      vs.push(Array.from({ length: d }, (_, j) => base.reduce((s, b, i) => s + cs[i] * b[j], 0)));
    }
    if (vs.some((v) => v.every((x) => x === 0)) || vs.some((v) => v.some((x) => Math.abs(x) > max * 2))) continue;
    // No two of them the same up to a multiple, unless the space is a line.
    if (k > 1 && vs.some((v, i) => vs.some((u, j) => j > i && parallel(u, v)))) continue;
    if (rankOf(M(vs)) !== k) continue;
    return shuffle(r, vs);
  }
}
export const parallel = (u: number[], v: number[]) => u.every((x, i) => u.every((y, j) => x * v[j] === y * v[i]));
export function shuffle<T>(r: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---------- answers ----------

type Shown = { answer: Answer; show: string; plain: string; format: Format };
const rowsOf = (m: Mat) => m.map((row) => row.map((x) => x.toNumber()));
/** A matrix answer, with named slips that give another matrix (dropped when they give this one). */
export function matOf(m: Mat, slips: [MistakeId, Mat][] = []): Shown {
  const traps: Trap[] = slips.filter(([, s]) => !sameMat(s, m)).map(([id, s]) => ({ id, a: { k: "matrix", rows: rowsOf(s), tol: 1e-9 } }));
  return { answer: { k: "matrix", rows: rowsOf(m), tol: 1e-9, ...(traps.length ? { traps } : {}) }, show: texM(m), plain: matPlain(m), format: "matrix" };
}
/** A vector answer, with named slips (dropped when they give this vector). */
export function vecOf(v: Frac[], slips: [MistakeId, number[]][] = [], format: Format = "vector", names?: string[]): Shown {
  const vs = v.map((x) => x.toNumber());
  const traps: Trap[] = slips.filter(([, s]) => s.some((x, i) => Math.abs(x - vs[i]) > 1e-9)).map(([id, s]) => ({ id, a: { k: "tuple", vs: s, tol: 1e-9, ...(names ? { names } : {}) } }));
  return {
    answer: { k: "tuple", vs, tol: 1e-9, ...(names ? { names } : {}), ...(traps.length ? { traps } : {}) },
    show: names ? names.map((n, i) => `${n} = ${v[i].tex()}`).join(", \\; ") : colTex(v.map((x) => x.tex())),
    plain: `(${v.map(plainFrac).join("; ")})`,
    format,
  };
}

// ---------- written out ----------

/** (1, −2, 3) as LaTeX. */
export const tup = (v: (number | Frac)[]) => `(${v.map((x) => (typeof x === "number" ? String(x) : x.tex())).join(", ")})`;
/** a·x + b·y + c·z as LaTeX, terms with a 0 left out: 2x - y + 3z. */
export function linTex(cs: number[], vars = ["x", "y", "z"]): string {
  const terms = cs.map((c, i) => [c, vars[i]] as const).filter(([c]) => c !== 0);
  if (!terms.length) return "0";
  return terms
    .map(([c, v], i) => {
      const k = Math.abs(c) === 1 ? "" : String(Math.abs(c));
      return `${c < 0 ? (i ? "- " : "-") : i ? "+ " : ""}${k}${v}`;
    })
    .join(" ");
}
