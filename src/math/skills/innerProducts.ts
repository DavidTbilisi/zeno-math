// Practice: Inner products and least squares. Easy finds k that makes two vectors orthogonal, or a weighted inner
// product (the plain dot product given, named); medium is the second Gram–Schmidt vector (the projection divided by the
// length of u₁ and not its square, named); hard is the least-squares line y = ax + b through three or four points (the
// line through the first and last point given, named).
import { exact, F } from "../calculusTwo";
import { dot, tup, vecOf } from "../linearAlgebra";
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

const gen: Gen = (r, L, w) => (L === 1 ? orthogonalPart(r, w) : L === 2 ? gramSchmidtPart(r, w) : leastSquaresPart(r, w));

export default gen;
