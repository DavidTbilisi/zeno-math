// Practice: Determinants and inverses. Since #734 half the easy and medium questions are new kinds: easy, the
// determinant of a triangular 3 × 3 or 4 × 4 matrix and the determinant after a row operation; medium, the area of a
// parallelogram from its two sides and the area of a shape after a map. The diagonal added, the swap's sign kept, a
// scaled row ignored, an added row taken to scale, the whole matrix's factor taken once, ad + bc and a negative
// area are slips.
import { fill } from "../chart";
import { det, texM } from "../matrix";
import { fr, ints, M, matAnswer, matCalc, matPlain, num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { numWith } from "./matrices";

const gen: Gen = (r, L, w) => {
  if (L < 3 && r.int(0, 9) >= 5) return more(r, L, w);
  if (L < 3) {
    const A = L === 1 ? ints(r, 2, 2, -9, 9) : ints(r, 3, 3, -4, 5);
    const d = det(M(A));
    return { prompt: w.prompts.matDet, q: texM(M(A), "vmatrix"), answer: num(d.toNumber()), show: d.tex(), plain: plainFrac(d), format: "number", solution: matCalc("det", A) };
  }
  let A: number[][], d: number;
  do (A = ints(r, 2, 2, -6, 7)), (d = det(M(A)).n);
  while (d === 0 || Math.abs(d) > 12);
  const inv = M([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]]).map((row) => row.map((x) => x.div(fr(d))));
  return { prompt: w.prompts.matInverse, q: `A = ${texM(M(A))}`, answer: matAnswer(inv), show: `A^{-1} = ${texM(inv)}`, plain: matPlain(inv), format: "matrix", solution: matCalc("inverse", A) };
};

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.detK;
  if (L === 1) {
    if (r.next() < 0.5) {
      // Upper triangular: the determinant is the product down the diagonal.
      const n = r.pick([3, 4]);
      const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j < i ? 0 : j === i ? r.nz(-3, 4) : r.int(-5, 5))));
      const dg = A.map((row, i) => row[i]);
      const v = dg.reduce((p, x) => p * x, 1);
      return { prompt: w.prompts.matDet, q: texM(M(A), "vmatrix"), ...numWith(v, [["diagonalAdded", dg.reduce((p, x) => p + x, 0), { d: dg.join(" · ").replace(/-/g, "−"), v }]]),
        steps: [`${dg.map((x) => (x < 0 ? `(${x})` : x)).join(" \\cdot ")} = ${v}`] };
    }
    const d = r.nz(-6, 9);
    const k = r.pick([2, 3, 4, -2]);
    const op = r.pick(["swap", "scale", "add", "whole"] as const);
    const v = op === "swap" ? -d : op === "scale" ? k * d : op === "add" ? d : k ** 3 * d;
    const slip: [Parameters<typeof numWith>[1][number][0], number] =
      op === "swap" ? ["swapSignKept", d] : op === "scale" ? ["rowScaleIgnored", d] : op === "add" ? ["rowAddScales", k * d] : ["wholeScaleOnce", k * d];
    const said = fill(op === "swap" ? W.opSwap : op === "scale" ? W.opScale : op === "add" ? W.opAdd : W.opWhole, { k });
    return { prompt: fill(W.rowQ, { d, op: said }), q: `\\det A = ${d}`, ...numWith(v, [[slip[0], slip[1], { k, d, v }]]),
      steps: [op === "swap" ? `\\det B = -${d < 0 ? `(${d})` : d} = ${v}` : op === "scale" ? `\\det B = ${k} \\cdot ${d < 0 ? `(${d})` : d} = ${v}` : op === "add" ? `\\det B = \\det A = ${d}` : `\\det B = ${k}^{3} \\cdot ${d < 0 ? `(${d})` : d} = ${v}`] };
  }
  // Two sides of a parallelogram, or a map's matrix: the area is |ad − bc| (times the shape's area).
  let A: number[][], dd: number;
  do (A = ints(r, 2, 2, -5, 6)), (dd = A[0][0] * A[1][1] - A[0][1] * A[1][0]);
  while (dd === 0 || A[0][1] * A[1][0] === 0 || (r.next() < 0.5 && dd > 0));
  const plus = A[0][0] * A[1][1] + A[0][1] * A[1][0];
  const cross = `${A[0][0]} \\cdot ${A[1][1] < 0 ? `(${A[1][1]})` : A[1][1]} - ${A[0][1] < 0 ? `(${A[0][1]})` : A[0][1]} \\cdot ${A[1][0] < 0 ? `(${A[1][0]})` : A[1][0]}`;
  if (r.next() < 0.5) {
    const u = [A[0][0], A[1][0]];
    const v = [A[0][1], A[1][1]];
    return { prompt: W.areaQ, q: `\\mathbf{u} = (${u.join(", ")}), \\quad \\mathbf{v} = (${v.join(", ")})`,
      ...numWith(Math.abs(dd), [["areaSignKept", dd, { d: dd, v: Math.abs(dd) }], ["detPlusUsed", Math.abs(plus), { b: A[0][1], c: A[1][0], d: A[1][1], v: Math.abs(dd) }]]),
      steps: [`\\det ${texM(M(A))} = ${cross} = ${dd}`, `\\text{${W.areaSay}} = |${dd}| = ${Math.abs(dd)}`] };
  }
  const S = r.pick([2, 3, 4, 5, 6]);
  return { prompt: fill(W.scaleQ, { s: S }), q: `A = ${texM(M(A))}`,
    ...numWith(Math.abs(dd) * S, [["areaSignKept", dd * S, { d: dd, v: Math.abs(dd) * S }], ["detPlusUsed", Math.abs(plus) * S, { b: A[0][1], c: A[1][0], d: A[1][1], v: Math.abs(dd) * S }]]),
    steps: [`\\det A = ${cross} = ${dd}`, `${S} \\cdot |${dd}| = ${Math.abs(dd) * S}`] };
}

export default gen;
