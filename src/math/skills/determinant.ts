// Practice: Determinants and inverses.
import { det, texM } from "../matrix";
import { fr, ints, M, matAnswer, matCalc, matPlain, num, plainFrac } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
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

export default gen;
