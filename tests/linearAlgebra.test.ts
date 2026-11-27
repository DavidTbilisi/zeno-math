// Linear algebra (#380): the helpers reduce, invert and build matrices exactly, and every answer asked is right for the
// question it was asked with, read back from what the student sees: a·v₁ + b·v₂ is w, Ax = 0, the change of basis
// and A = PDP⁻¹ hold, Gram–Schmidt gives a vector orthogonal to the first, the least-squares line solves the normal
// equations, and the singular values square to the eigenvalues of AᵀA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { type Mat, det, mul } from "../src/math/matrix.ts";
import { exercise } from "../src/math/practice.ts";
import { fr, M, rngOf } from "../src/math/practiceKit.ts";
import type { Frac } from "../src/math/fraction.ts";
import { cross, dot, identity, inverse, parallel, rankOf, rref, sameMat, shears, transpose, vectorsOfRank } from "../src/math/linearAlgebra.ts";

const w = en.pracWords;
const SEEDS = 60;

/** A number as the question writes it: 3, -2, \frac{3}{5}, -\frac{3}{5}. */
const num = (s: string): Frac => {
  const t = s.trim();
  const f = /^(-?)\\frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  return f ? fr((f[1] ? -1 : 1) * Number(f[2]), Number(f[3])) : fr(Number(t));
};
/** Every matrix in a question, in order. */
const matrices = (q: string): Mat[] =>
  [...q.matchAll(/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/g)].map((m) => m[1].split("\\\\").map((row) => row.split("&").map(num)));
/** Every tuple (1, -2, 3) in a question, in order. */
const tuples = (q: string): number[][] => [...q.matchAll(/\((-?\d+(?:, -?\d+)+)\)/g)].map((m) => m[1].split(", ").map(Number));
const asMat = (rows: number[][]): Mat => rows.map((r) => r.map((x) => toFrac(x)));
const toFrac = (x: number): Frac => {
  for (let d = 1; d <= 200; d++) if (Math.abs(Math.round(x * d) - x * d) < 1e-9) return fr(Math.round(x * d), d);
  throw new Error(`${x} is not a small fraction`);
};
const each = (skill: Parameters<typeof exercise>[0], level: 1 | 2 | 3, f: (ex: ReturnType<typeof exercise>, where: string) => void) => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const ex = exercise(skill, level, seed, w);
    f(ex, `${skill} ${level} #${seed}: ${ex.q}`);
  }
};

test("row reduction, rank and inverse are exact", () => {
  const A = M([[1, 2, 3], [2, 4, 6], [1, 0, 1]]);
  assert.equal(rankOf(A), 2);
  assert.ok(sameMat(rref(A).R, M([[1, 0, 1], [0, 1, 1], [0, 0, 0]])));
  const P = M([[2, 1], [1, 1]]);
  assert.ok(sameMat(mul(P, inverse(P)), identity(2)));
  assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  assert.ok(parallel([1, -2, 3], [-2, 4, -6]) && !parallel([1, 2, 3], [1, 2, 4]));
});

test("shears are whole, invertible with whole inverses, and vectors come with the rank asked", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = rngOf(seed);
    const n = 2 + (seed % 2);
    const P = shears(r, n, 3);
    assert.equal(det(P).toNumber(), 1);
    assert.ok(inverse(P).flat().every((x) => x.isInt()));
    const k = 1 + (seed % 3);
    const vs = vectorsOfRank(r, 3, 3, k, 3);
    assert.equal(rankOf(M(vs)), k);
    assert.ok(vs.every((v) => v.some((x) => x !== 0)));
    if (k > 1) for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(!parallel(vs[i], vs[j]), `seed ${seed}`);
  }
});

test("subspaces: a·v₁ + b·v₂ is w; the dimension asked is the rank of the vectors", () => {
  each("subspaces", 2, (ex, where) => {
    if (ex.answer.k !== "tuple") return;
    const [v1, v2, wv] = tuples(ex.q);
    const [a, b] = ex.answer.vs;
    assert.deepEqual(v1.map((x, i) => a * x + b * v2[i]), wv, where);
  });
  each("subspaces", 3, (ex, where) => {
    assert.equal(ex.answer.k === "num" && ex.answer.v, rankOf(M(tuples(ex.q))), where);
  });
});

test("bases: the coordinates rebuild w", () => {
  each("basis", 2, (ex, where) => {
    if (ex.answer.k !== "tuple") throw new Error(where);
    const ts = tuples(ex.q);
    const [wv] = ts.slice(-1);
    const c = ex.answer.vs;
    assert.deepEqual(wv.map((_, i) => ts.slice(0, -1).reduce((s, b, j) => s + c[j] * b[i], 0)), wv, where);
  });
});

test("rank and nullity agree with row reduction, and the null vector is killed by A", () => {
  // Since #754 half the questions are other kinds (tests/subspacesDepth.test.ts); these are the first ones.
  each("rankNullity", 1, (ex, where) => ex.prompt === w.linalg.prompt.rank && assert.equal(ex.answer.k === "num" && ex.answer.v, rankOf(matrices(ex.q)[0]), where));
  each("rankNullity", 2, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.nullity) return;
    const [A] = matrices(ex.q);
    assert.equal(ex.answer.k === "num" && ex.answer.v, A[0].length - rankOf(A), where);
  });
  each("rankNullity", 3, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.nullVector) return;
    const [A] = matrices(ex.q);
    if (ex.answer.k !== "dir") throw new Error(where);
    const x = ex.answer.vs;
    assert.ok(x.some((v) => v !== 0), where);
    assert.ok(A.every((row) => row.reduce((s, a, j) => s + a.toNumber() * x[j], 0) === 0), where);
  });
});

test("linear maps: the matrix has the images as its columns, and [T]_B = P⁻¹AP", () => {
  // Since #734 half the questions are other kinds (tests/matricesMore.test.ts); these are the ones from the images.
  each("linearMaps", 2, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.matrixOf) return;
    if (ex.answer.k !== "matrix") throw new Error(where);
    const [e1, e2] = tuples(ex.q);
    assert.deepEqual(ex.answer.rows, e1.map((x, i) => [x, e2[i]]), where);
  });
  each("linearMaps", 3, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.changeBasis) return;
    if (ex.answer.k !== "matrix") throw new Error(where);
    const [A] = matrices(ex.q);
    const [b1, b2] = tuples(ex.q);
    const P = transpose(M([b1, b2]));
    assert.ok(sameMat(mul(P, asMat(ex.answer.rows)), mul(A, P)), where);
  });
});

test("inner products: k makes u ⊥ v, u₂ is orthogonal to v₁, and (a, b) solves the normal equations", () => {
  each("innerProducts", 1, (ex, where) => {
    if (ex.answer.k !== "num" || !ex.q.includes("k)")) return;
    const [u] = tuples(ex.q);
    const v = /\\mathbf\{v\} = \((-?\d+), (-?\d+), k\)/.exec(ex.q)!.slice(1).map(Number);
    assert.ok(Math.abs(u[0] * v[0] + u[1] * v[1] + u[2] * ex.answer.v) < 1e-9, where);
  });
  // Since #754 half the questions are other kinds (tests/subspacesDepth.test.ts).
  each("innerProducts", 2, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.gramSchmidt) return;
    if (ex.answer.k !== "tuple") throw new Error(where);
    const [v1, v2] = tuples(ex.q);
    const u2 = ex.answer.vs;
    assert.ok(Math.abs(dot(u2, v1)) < 1e-9, where);
    // u₂ − v₂ is a multiple of v₁.
    const d = u2.map((x, i) => x - v2[i]);
    assert.ok(v1.every((x, i) => v1.every((y, j) => Math.abs(d[i] * y - d[j] * x) < 1e-9)), where);
  });
  each("innerProducts", 3, (ex, where) => {
    if (ex.prompt !== w.linalg.prompt.leastSquares) return;
    if (ex.answer.k !== "tuple") throw new Error(where);
    const pts = [...ex.q.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const [a, b] = ex.answer.vs;
    const res = pts.map(([x, y]) => y - a * x - b);
    assert.ok(Math.abs(res.reduce((s, e) => s + e, 0)) < 1e-9, where);
    assert.ok(Math.abs(res.reduce((s, e, i) => s + e * pts[i][0], 0)) < 1e-9, where);
  });
});

test("diagonalisation: AP = PD, and Aⁿ is A multiplied n times", () => {
  each("spectral", 2, (ex, where) => {
    if (ex.answer.k !== "matrix") throw new Error(where);
    const [A, P] = matrices(ex.q);
    assert.ok(sameMat(mul(A, P), mul(P, asMat(ex.answer.rows))), where);
  });
  each("spectral", 3, (ex, where) => {
    if (ex.answer.k !== "matrix") throw new Error(where);
    const [A] = matrices(ex.q);
    const n = Number(/n = (\d)/.exec(ex.prompt)![1]);
    let An = A;
    for (let i = 1; i < n; i++) An = mul(An, A);
    assert.ok(sameMat(An, asMat(ex.answer.rows)), where);
  });
});

test("the SVD: the singular values square to the eigenvalues of AᵀA, and the rank-1 part leaves σ₂ behind", () => {
  each("svd", 1, (ex, where) => {
    if (ex.answer.k !== "set") throw new Error(where);
    const [A] = matrices(ex.q);
    const AtA = mul(transpose(A), A);
    const [s1, s2] = ex.answer.vs;
    assert.equal(s1 * s1 + s2 * s2, AtA[0][0].add(AtA[1][1]).toNumber(), where);
    assert.equal(s1 * s2, Math.abs(det(A).toNumber()), where);
  });
  each("svd", 3, (ex, where) => {
    if (ex.answer.k !== "matrix") throw new Error(where);
    const [U, S, Vt] = matrices(ex.q);
    const A = mul(mul(U, S), Vt);
    const A1 = asMat(ex.answer.rows);
    assert.equal(rankOf(A1), 1, where);
    const E = A.map((row, i) => row.map((x, j) => x.sub(A1[i][j]).toNumber()));
    const err2 = E.flat().reduce((s, x) => s + x * x, 0);
    assert.ok(Math.abs(err2 - S[1][1].toNumber() ** 2) < 1e-9, where);
  });
});
