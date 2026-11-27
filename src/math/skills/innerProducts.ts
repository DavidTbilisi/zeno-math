// Practice: Inner products and least squares. Easy finds k that makes two vectors orthogonal, or a weighted inner
// product (the plain dot product given, named), or the coordinates of x in an orthonormal basis of ℝ² (the basis not
// divided by its length, or x's own coordinates, named), or the vector that spans the orthogonal complement of a plane
// (a vector of the plane, or one perpendicular to only one of its vectors, named); medium is the second Gram–Schmidt
// vector (the projection divided by the length of u₁ and not its square, named), or the projection of x onto a plane
// with an orthogonal basis (only one basis vector used, or the part in V⊥ given, named), or the matrix of the
// projection onto a line (aaᵀ not divided by aᵀa, or the projection onto the complement, named); hard is the
// least-squares line y = ax + b through three or four points (the line through the first and last point given, named),
// or the projection matrix onto the column space of a 3 × 2 matrix (onto the normal instead, or AAᵀ without (AᵀA)⁻¹,
// named), or the inverse of an orthogonal matrix (Q itself, or the adjugate not divided by det Q = −1, named).
import { exact, F, shuffled, sym } from "../calculusTwo";
import { gcd } from "../practiceKit";
import { det, type Mat, texM } from "../matrix";
import type { Frac } from "../fraction";
import { cross, dot, matOf, tup, vecOf } from "../linearAlgebra";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** k that makes u ⊥ v, or ⟨u, v⟩ for a weighted inner product. */
function orthogonalPart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  for (;;) {
    const u = [r.int(-4, 4), r.int(-4, 4), r.nz(-4, 4)];
    const v = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)];
    if (r.next() < 0.5) {
      const s = u[0] * v[0] + u[1] * v[1];
      if (s === 0) continue;
      const k = F(-s, u[2]);
      return {
        prompt: W.prompt.orthogonalK,
        q: `\\mathbf{u} = ${tup(u)}, \\quad \\mathbf{v} = (${v[0]}, ${v[1]}, k)`,
        ...exact(k),
        steps: [`\\mathbf{u} \\cdot \\mathbf{v} = ${s} ${u[2] < 0 ? "-" : "+"} ${Math.abs(u[2]) === 1 ? "" : Math.abs(u[2])}k = 0`, `k = ${k.tex()}`],
      };
    }
    const ws = [r.int(1, 4), r.int(1, 4), r.int(1, 4)];
    if (ws.every((x) => x === 1)) continue;
    const v2 = ws.reduce((s, c, i) => s + c * u[i] * v[i], 0);
    const plain = dot(u, v);
    if (v2 === plain) continue;
    return {
      prompt: W.prompt.weighted,
      q: `\\langle \\mathbf{u}, \\mathbf{v} \\rangle = ${ws.map((c, i) => `${c === 1 ? "" : c}u_${i + 1}v_${i + 1}`).join(" + ")}, \\quad \\mathbf{u} = ${tup(u)}, \\quad \\mathbf{v} = ${tup(v)}`,
      ...exact(F(v2), [["standardInnerProduct", plain]]),
      steps: [ws.map((c, i) => `${c} \\cdot ${u[i] < 0 ? `(${u[i]})` : u[i]} \\cdot ${v[i] < 0 ? `(${v[i]})` : v[i]}`).join(" + ") + ` = ${v2}`],
    };
  }
}

// Vectors whose length is a whole number, so dividing by the length (the slip) stays rational.
const WHOLE = [[1, 2, 2], [2, 1, 2], [2, 2, 1], [3, 4, 0], [0, 3, 4], [4, 0, 3], [2, 3, 6], [6, 2, 3]];

/** The second Gram–Schmidt vector. */
function gramSchmidtPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const base = r.pick(WHOLE);
    const u1 = base.map((x) => x * r.sign());
    const v2 = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)];
    const p = dot(v2, u1);
    const len2 = dot(u1, u1);
    if (p === 0 || v2.every((x, i) => x * len2 === p * u1[i])) continue;
    const len = Math.round(Math.sqrt(len2));
    const u2 = v2.map((x, i) => F(x).sub(F(p * u1[i], len2)));
    if (u2.some((x) => x.d > 9)) continue;
    const slip = v2.map((x, i) => x - (p * u1[i]) / len);
    return {
      prompt: w.linalg.prompt.gramSchmidt,
      q: `\\mathbf{v}_1 = ${tup(u1)}, \\quad \\mathbf{v}_2 = ${tup(v2)}`,
      ...vecOf(u2, [["dividedByLength", slip]]),
      steps: [
        `\\mathbf{u}_1 = \\mathbf{v}_1, \\quad \\mathbf{v}_2 \\cdot \\mathbf{u}_1 = ${p}, \\quad \\mathbf{u}_1 \\cdot \\mathbf{u}_1 = ${len2}`,
        `\\mathbf{u}_2 = \\mathbf{v}_2 - \\frac{${p}}{${len2}}\\mathbf{u}_1 = ${tup(u2)}`,
      ],
    };
  }
}

/** The least-squares line y = ax + b. */
function leastSquaresPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.int(3, 4);
    const x0 = r.int(-2, 1);
    const xs = Array.from({ length: n }, (_, i) => x0 + i);
    const ys = xs.map(() => r.int(-3, 6));
    const [sx, sy] = [xs.reduce((s, x) => s + x, 0), ys.reduce((s, y) => s + y, 0)];
    const sxx = xs.reduce((s, x) => s + x * x, 0);
    const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const a = F(n * sxy - sx * sy, n * sxx - sx * sx);
    const b = F(sy).sub(a.mul(F(sx))).div(F(n));
    // The points not all on one line, and the answer a fraction with a small denominator.
    if (ys.every((y, i) => F(y).sub(a.mul(F(xs[i]))).sub(b).isZero()) || a.d > 10 || b.d > 10) continue;
    const a2 = F(ys[n - 1] - ys[0], xs[n - 1] - xs[0]);
    const b2 = F(ys[0]).sub(a2.mul(F(xs[0])));
    return {
      prompt: w.linalg.prompt.leastSquares,
      q: xs.map((x, i) => `(${x}, ${ys[i]})`).join(", \\; "),
      ...vecOf([a, b], [["lineThroughTwoPoints", [a2.toNumber(), b2.toNumber()]]], "pair", ["a", "b"]),
      steps: [
        `\\begin{pmatrix} ${sxx} & ${sx} \\\\ ${sx} & ${n} \\end{pmatrix}\\begin{pmatrix} a \\\\ b \\end{pmatrix} = \\begin{pmatrix} ${sxy} \\\\ ${sy} \\end{pmatrix}`,
        `a = ${a.tex()}, \\quad b = ${b.tex()}`,
      ],
    };
  }
}

/** A whole vector made as short as it goes, its first non-zero part positive. */
function short(v: number[]): number[] {
  const g = v.reduce((a, x) => gcd(a, x), 0) * Math.sign(v.find((x) => x !== 0) ?? 1) || 1;
  return v.map((x) => x / g || 0);
}
const outer = (a: number[], b: number[], k: Frac = F(1)): Mat => a.map((x) => b.map((y) => F(x * y).mul(k)));
const minus = (A: Mat, B: Mat): Mat => A.map((row, i) => row.map((x, j) => x.sub(B[i][j])));
const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => F(i === j ? 1 : 0)));
const par = (x: number) => (x < 0 ? `(${x})` : String(x));
const coef = (k: Frac) => (k.n === 1 && k.d === 1 ? "" : k.n === -1 && k.d === 1 ? "-" : k.tex());
const fracTup = (v: Frac[]) => `\\left(${v.map((x) => x.tex()).join(", ")}\\right)`;

// (a, b, c) with a² + b² = c², for orthonormal bases and orthogonal matrices whose parts are fractions.
const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13]];

/** The coordinates of x in the orthonormal basis (a, b)/c, (−b, a)/c. */
function coordPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a0, b0, c] = r.pick(TRIPLES);
    const [a, b] = [a0 * r.sign(), b0 * r.sign()];
    const x = [r.nz(-6, 6), r.int(-6, 6)];
    const p = [x[0] * a + x[1] * b, -x[0] * b + x[1] * a];
    if (p.some((t) => t === 0)) continue;
    const co = p.map((t) => F(t, c));
    return {
      prompt: w.ipK.coordQ,
      q: `\\mathbf{u}_1 = \\tfrac{1}{${c}}(${a}, ${b}), \\quad \\mathbf{u}_2 = \\tfrac{1}{${c}}(${-b}, ${a}), \\quad \\mathbf{x} = ${tup(x)}`,
      ...vecOf(co, [["coordsUnnormalised", p], ["standardCoordinatesKept", x]], "pair", ["c_1", "c_2"]),
      steps: [
        `c_1 = \\mathbf{x} \\cdot \\mathbf{u}_1 = \\tfrac{1}{${c}}(${par(x[0])} \\cdot ${par(a)} + ${par(x[1])} \\cdot ${par(b)}) = ${co[0].tex()}`,
        `c_2 = \\mathbf{x} \\cdot \\mathbf{u}_2 = \\tfrac{1}{${c}}(${par(x[0])} \\cdot ${par(-b)} + ${par(x[1])} \\cdot ${par(a)}) = ${co[1].tex()}`,
      ],
    };
  }
}

/** The vector that spans V⊥ for the plane V = span{v₁, v₂} in ℝ³. */
function complementPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const v1 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    const v2 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    const n = short(cross(v1, v2));
    if (n.every((x) => x === 0) || n.some((x) => Math.abs(x) > 9)) continue;
    // Perpendicular to v₁ but not to v₂.
    const half = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => short(cross(v1, e))).find((u) => u.some((x) => x !== 0) && dot(u, v2) !== 0);
    if (!half || v1.every((x) => x === 0)) continue;
    const opt = (v: number[]) => sym(tup(v), `(${v.join(", ")})`);
    return {
      prompt: w.ipK.compQ,
      q: `\\mathbf{v}_1 = ${tup(v1)}, \\quad \\mathbf{v}_2 = ${tup(v2)}`,
      ...shuffled(r, [opt(n), opt(v1), opt(half)], 0, [["subspaceForComplement", 1], ["complementOneVectorOnly", 2]]),
      steps: [`\\mathbf{v}_1 \\times \\mathbf{v}_2 = ${tup(cross(v1, v2))}`, `${tup(n)} \\cdot \\mathbf{v}_1 = 0, \\quad ${tup(n)} \\cdot \\mathbf{v}_2 = 0`],
    };
  }
}

/** The projection of x onto the plane spanned by orthogonal u₁, u₂. */
function projPlanePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const u1 = [r.int(-2, 2), r.int(-2, 2), r.nz(-2, 2)];
    const v = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
    const u2 = short(v.map((x, i) => dot(u1, u1) * x - dot(v, u1) * u1[i]));
    if (u2.every((x) => x === 0) || u2.some((x) => Math.abs(x) > 5)) continue;
    const x = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)];
    const [k1, k2] = [F(dot(x, u1), dot(u1, u1)), F(dot(x, u2), dot(u2, u2))];
    if (k1.isZero() || k2.isZero()) continue;
    const one = u1.map((t) => k1.mul(F(t)));
    const p = one.map((t, i) => t.add(k2.mul(F(u2[i]))));
    if (p.some((t) => t.d > 12)) continue;
    const rest = x.map((t, i) => F(t).sub(p[i]));
    if (rest.every((t) => t.isZero())) continue;
    return {
      prompt: w.ipK.projPlaneQ,
      q: `\\mathbf{u}_1 = ${tup(u1)}, \\quad \\mathbf{u}_2 = ${tup(u2)}, \\quad \\mathbf{x} = ${tup(x)}`,
      ...vecOf(p, [["projectionOneVectorOnly", one.map((t) => t.toNumber())], ["projectionAsComplement", rest.map((t) => t.toNumber())]]),
      steps: [
        `\\operatorname{proj}_V \\mathbf{x} = \\frac{\\mathbf{x} \\cdot \\mathbf{u}_1}{\\mathbf{u}_1 \\cdot \\mathbf{u}_1}\\mathbf{u}_1 + \\frac{\\mathbf{x} \\cdot \\mathbf{u}_2}{\\mathbf{u}_2 \\cdot \\mathbf{u}_2}\\mathbf{u}_2 = ${coef(k1)}\\mathbf{u}_1 ${k2.n < 0 ? "-" : "+"} ${coef(k2.abs())}\\mathbf{u}_2`,
        `= ${fracTup(p)}`,
      ],
    };
  }
}

/** The matrix aaᵀ / aᵀa of the projection onto the line spanned by a. */
function projLinePart(r: Rng, w: PracticeWords): Part {
  const a = r.next() < 0.5 ? [r.nz(-3, 3), r.nz(-3, 3)] : [r.nz(-2, 2), r.int(-2, 2), r.nz(-2, 2)];
  const aa = dot(a, a);
  const P = outer(a, a, F(1, aa));
  return {
    prompt: w.ipK.projLineQ,
    q: `\\mathbf{a} = ${tup(a)}`,
    ...matOf(P, [["projMatrixNotDivided", outer(a, a)], ["projMatrixOntoComplement", minus(eye(a.length), P)]]),
    steps: [`\\mathbf{a}^{T}\\mathbf{a} = ${aa}`, `P = \\frac{\\mathbf{a}\\mathbf{a}^{T}}{\\mathbf{a}^{T}\\mathbf{a}} = \\frac{1}{${aa}}${texM(outer(a, a))}`],
  };
}

/** P = A(AᵀA)⁻¹Aᵀ onto the plane C(A) in ℝ³, as I − nnᵀ / nᵀn. */
function projMatrixPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = [r.int(-2, 2), r.int(-2, 2), r.nz(-2, 2)];
    if (n.filter((x) => x === 0).length > 1) continue;
    const [i, j] = r.pick([[0, 1], [0, 2], [1, 2]]);
    const e = (k: number) => [0, 1, 2].map((t) => (t === k ? 1 : 0));
    const [c1, c2] = [short(cross(n, e(i))), short(cross(n, e(j)))];
    if (c1.every((x) => x === 0) || c2.every((x) => x === 0) || cross(c1, c2).every((x) => x === 0)) continue;
    const A = [0, 1, 2].map((t) => [c1[t], c2[t]]);
    const nn = dot(n, n);
    const onN = outer(n, n, F(1, nn));
    const P = minus(eye(3), onN);
    const AAt = A.map((row) => A.map((col) => F(row[0] * col[0] + row[1] * col[1])));
    return {
      prompt: w.ipK.projMatQ,
      q: `A = ${texM(A.map((row) => row.map((x) => F(x))))}`,
      ...matOf(P, [["projMatrixOntoComplement", onN], ["projNotInverted", AAt]]),
      steps: [
        `\\mathbf{n} = ${tup(n)} \\perp C(A), \\quad \\mathbf{n}^{T}\\mathbf{n} = ${nn}`,
        `P = A(A^{T}A)^{-1}A^{T} = I - \\frac{\\mathbf{n}\\mathbf{n}^{T}}{\\mathbf{n}^{T}\\mathbf{n}} = ${texM(P)}`,
      ],
    };
  }
}

// An orthogonal 3 × 3 matrix with whole parts over 3; its rows are permuted and their signs changed.
const THIRDS = [[1, 2, 2], [2, 1, -2], [2, -2, 1]];

/** Q⁻¹ = Qᵀ for an orthogonal Q. */
function orthoInversePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    let Q: Mat;
    if (r.next() < 0.5) {
      const [a, b, c] = r.pick(TRIPLES);
      const s = r.sign();
      Q = [[F(a, c), F(-s * b, c)], [F(s * b, c), F(a, c)]];
    } else {
      const order = r.pick([[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [1, 0, 2], [2, 1, 0]]);
      Q = order.map((k) => { const s = r.sign(); return THIRDS[k].map((x) => F(s * x, 3)); });
    }
    const T = Q[0].map((_, j) => Q.map((row) => row[j]));
    // Not symmetric, so Q itself is a slip.
    if (Q.every((row, i) => row.every((x, j) => x.sub(T[i][j]).isZero()))) continue;
    const d = det(Q);
    return {
      prompt: w.ipK.orthoInvQ,
      q: `Q = ${texM(Q)}`,
      ...matOf(T, [["orthoInverseAsQ", Q], ["adjugateNotDivided", T.map((row) => row.map((x) => x.mul(d)))]]),
      steps: [`Q^{T}Q = I \\;\\Rightarrow\\; Q^{-1} = Q^{T} = ${texM(T)}`, `\\det Q = ${d.tex()}, \\quad |Q\\mathbf{x}| = |\\mathbf{x}|`],
    };
  }
}

const gen: Gen = (r, L, w) => {
  const more = r.int(0, 9) >= 5;
  if (L === 1) return !more ? orthogonalPart(r, w) : r.next() < 0.5 ? coordPart(r, w) : complementPart(r, w);
  if (L === 2) return !more ? gramSchmidtPart(r, w) : r.next() < 0.5 ? projPlanePart(r, w) : projLinePart(r, w);
  return !more ? leastSquaresPart(r, w) : r.next() < 0.5 ? projMatrixPart(r, w) : orthoInversePart(r, w);
};

export default gen;
