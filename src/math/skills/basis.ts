// Practice: Bases and dimension. Easy asks whether three vectors are independent (no two of them parallel and yet
// dependent: called independent, named); medium gives the coordinates of w in a basis (w's own components given, as if
// the basis were the standard one, named); hard is the dimension of a space of polynomials or matrices: Pₙ (the degree
// given, named), the polynomials of Pₙ with p(a) = 0, or the symmetric, trace-zero or upper-triangular n × n matrices
// (the condition ignored, named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { det, texM } from "../matrix";
import { fromCols, rankOf, rref, tup, vecOf, vectorsOfRank } from "../linearAlgebra";
import type { MistakeId } from "../mistakes";
import { M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** Three vectors in ℝ³: independent, or dependent though no two are parallel. */
function independentPart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  const k = r.next() < 0.5 ? 3 : 2;
  const vs = vectorsOfRank(r, 3, 3, k);
  const D = det(fromCols(vs)).toNumber();
  return {
    prompt: W.prompt.independent,
    q: vs.map((v, i) => `\\mathbf{v}_${i + 1} = ${tup(v)}`).join(", \\quad "),
    ...pickOf([word(W.independent), word(W.dependent)], k === 3 ? 0 : 1, k === 3 ? [] : [["pairwiseMeansIndependent", 0]]),
    steps: [`\\det\\begin{pmatrix} \\mathbf{v}_1 & \\mathbf{v}_2 & \\mathbf{v}_3 \\end{pmatrix} = ${D}`, `${texM(M(vs))} \\to ${texM(rref(M(vs)).R)}`],
  };
}

/** The coordinates of w in a basis of ℝ² or ℝ³. */
function coordinatesPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.next() < 0.5 ? 2 : 3;
    const bs = vectorsOfRank(r, n, n, n, 3);
    const c = Array.from({ length: n }, () => r.int(-3, 3));
    if (c.every((x) => x === 0)) continue;
    const u = bs[0].map((_, j) => bs.reduce((s, b, i) => s + c[i] * b[j], 0));
    if (u.every((x, i) => x === c[i]) || u.some((x) => Math.abs(x) > 15) || rankOf(M(bs)) !== n) continue;
    const names = bs.map((_, i) => `\\mathbf{b}_${i + 1}`);
    return {
      prompt: w.linalg.prompt.coordinates,
      q: `${bs.map((b, i) => `${names[i]} = ${tup(b)}`).join(", \\quad ")}, \\quad \\mathbf{w} = ${tup(u)}`,
      ...vecOf(c.map((x) => F(x)), [["coordsStandardBasis", u]]),
      steps: [`\\mathbf{w} = ${c.map((x, i) => `${x < 0 ? `(${x})` : x}${names[i]}`).join(" + ")}`, `[\\mathbf{w}]_B = ${tup(c)}`],
    };
  }
}

/** The dimension of a space of polynomials or matrices. */
function dimensionPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(2, 4);
  const a = r.nz(-3, 3);
  const kinds = [
    { q: `P_{${n}}`, v: n + 1, steps: [`1, x, \\ldots, x^{${n}}`, `\\dim = ${n + 1}`], slip: "degreeNotDimension" as MistakeId, x: n },
    { q: `\\{p \\in P_{${n}} : p(${a}) = 0\\}`, v: n, steps: [`\\dim P_{${n}} = ${n + 1}`, `p(${a}) = 0: \\ ${n + 1} - 1 = ${n}`], slip: "constraintIgnored" as MistakeId, x: n + 1 },
    { q: `\\{A \\in \\mathbb{R}^{${n} \\times ${n}} : A^{T} = A\\}`, v: (n * (n + 1)) / 2, steps: [`${n} + ${(n * (n - 1)) / 2} = ${(n * (n + 1)) / 2}`], slip: "constraintIgnored" as MistakeId, x: n * n },
    { q: `\\{A \\in \\mathbb{R}^{${n} \\times ${n}} : \\operatorname{tr} A = 0\\}`, v: n * n - 1, steps: [`${n * n} - 1 = ${n * n - 1}`], slip: "constraintIgnored" as MistakeId, x: n * n },
    { q: `\\{A \\in \\mathbb{R}^{${n} \\times ${n}} : a_{ij} = 0 \\text{ for } i > j\\}`, v: (n * (n + 1)) / 2, steps: [`${Array.from({ length: n }, (_, i) => n - i).join(" + ")} = ${(n * (n + 1)) / 2}`], slip: "constraintIgnored" as MistakeId, x: n * n },
  ];
  const s = r.pick(kinds);
  return { prompt: w.linalg.prompt.dimension, q: s.q, ...exact(F(s.v), [[s.slip, s.x]]), steps: s.steps };
}

const gen: Gen = (r, L, w) => (L === 1 ? independentPart(r, w) : L === 2 ? coordinatesPart(r, w) : dimensionPart(r, w));

export default gen;
