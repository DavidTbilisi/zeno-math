// Practice: Linear maps. Easy asks whether a map of ℝ² is linear: a matrix map, one shifted by a constant (called
// linear, named), or one with a square, an absolute value or a product; medium writes the matrix of T from T(e₁) and
// T(e₂) (the images written as rows, named); hard is the matrix of T in another basis, P⁻¹AP (PAP⁻¹ given, named).
import { pickOf, word } from "../calculusTwo";
import { texM, mul } from "../matrix";
import { inverse, linTex, matOf, sameMat, shears, small, transpose, tup } from "../linearAlgebra";
import { colTex, M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const map = (a: string, b: string) => `T(x, y) = (${a}, \\ ${b})`;

/** Is a map of ℝ² linear? */
function linearPart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  const options = [word(W.linear), word(W.notLinear)];
  const [a, b, c, d] = [r.nz(-4, 4), r.int(-4, 4), r.int(-4, 4), r.nz(-4, 4)];
  const k = r.nz(-5, 5);
  const add = (s: string) => `${s} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
  const kinds = [
    { q: map(linTex([a, b], ["x", "y"]), linTex([c, d], ["x", "y"])), right: 0, steps: [`T(x, y) = ${texM(M([[a, b], [c, d]]))}${colTex(["x", "y"])}`] },
    { q: map(linTex([a, b], ["x", "y"]), linTex([0, d], ["x", "y"])), right: 0, steps: [`T(\\mathbf{u} + \\mathbf{v}) = T(\\mathbf{u}) + T(\\mathbf{v}), \\ T(c\\mathbf{u}) = cT(\\mathbf{u})`] },
    { q: map(add(linTex([a, b], ["x", "y"])), linTex([c, d], ["x", "y"])), right: 1, slip: true, steps: [`T(0, 0) = (${k}, 0) \\ne (0, 0)`] },
    { q: map(`x^{2}`, linTex([c, d], ["x", "y"])), right: 1, steps: ["T(2, 0) \\ne 2T(1, 0): \\ 4 \\ne 2"] },
    { q: map(`|x|`, "y"), right: 1, steps: ["T(-1, 0) = (1, 0) \\ne -T(1, 0) = (-1, 0)"] },
    { q: map(`xy`, linTex([a], ["x"])), right: 1, steps: ["T(2, 2) = (4, \\ldots) \\ne 2T(1, 1) = (2, \\ldots)"] },
  ];
  const s = r.next() < 0.35 ? kinds[r.int(0, 1)] : r.next() < 0.5 ? kinds[2] : r.pick(kinds.slice(3));
  return { prompt: W.prompt.isLinear, q: s.q, ...pickOf(options, s.right, s.slip ? [["affineAsLinear", 0]] : []), steps: s.steps };
}

/** The matrix of T from the images of e₁ and e₂. */
function matrixPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const rows = r.next() < 0.5 ? 2 : 3;
    const e1 = Array.from({ length: rows }, () => r.int(-4, 4));
    const e2 = Array.from({ length: rows }, () => r.int(-4, 4));
    if (e1.every((x) => x === 0) || e2.every((x) => x === 0)) continue;
    const A = transpose(M([e1, e2]));
    const slip = M([e1, e2]);
    if (rows === 2 && sameMat(A, slip)) continue;
    return {
      prompt: w.linalg.prompt.matrixOf,
      q: `T(\\mathbf{e}_1) = ${tup(e1)}, \\quad T(\\mathbf{e}_2) = ${tup(e2)}`,
      ...matOf(A, rows === 2 ? [["imagesAsRows", slip]] : []),
      steps: [`A = \\begin{pmatrix} T(\\mathbf{e}_1) & T(\\mathbf{e}_2) \\end{pmatrix} = ${texM(A)}`],
    };
  }
}

/** The matrix of T in the basis of P's columns: P⁻¹AP. */
function changeBasisPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P = shears(r, 2, 3);
    const A = M([[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]]);
    const Pi = inverse(P);
    const B = mul(mul(Pi, A), P);
    const slip = mul(mul(P, A), Pi);
    if (sameMat(B, slip) || !small(B, 15) || sameMat(B, A)) continue;
    const [b1, b2] = [0, 1].map((j) => P.map((row) => row[j].n));
    return {
      prompt: w.linalg.prompt.changeBasis,
      q: `A = ${texM(A)}, \\quad \\mathbf{b}_1 = ${tup(b1)}, \\quad \\mathbf{b}_2 = ${tup(b2)}`,
      ...matOf(B, [["conjugatedWrongWay", slip]]),
      steps: [`P = ${texM(P)}, \\quad P^{-1} = ${texM(Pi)}`, `[T]_B = P^{-1}AP = ${texM(B)}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? linearPart(r, w) : L === 2 ? matrixPart(r, w) : changeBasisPart(r, w));

export default gen;
