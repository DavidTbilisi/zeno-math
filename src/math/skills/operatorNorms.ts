// Practice: operator norms. Easy finds the 1-norm (largest column sum) or ∞-norm (largest row sum) of a matrix (rows
// for columns, the signs kept, named); medium finds the 2-norm of [[p, q], [q, p]], the largest |eigenvalue| (the
// largest signed eigenvalue, the largest entry, named) or of [[p, q], [−q, p]], √(p² + q²) (the largest entry, the
// square root left off, named); hard finds the norm of an integral operator on C[0, 1] with kernel c·xᵃyᵇ (the
// kernel's supremum, the integral in x, named) or of multiplication by a + b x on L²[0, 1] (the signed supremum,
// named).
import { exact } from "../calculusTwo";
import { F } from "../measureTheory";
import { colNorm, colSigned, matTex, rowNorm, rowSigned } from "../functionalAnalysis";
import type { NumSlip } from "../calculusTwo";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function sumsPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.int(2, 3);
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => r.int(-6, 6)));
    const one = r.next() < 0.5;
    const v = one ? colNorm(A) : rowNorm(A);
    const other = one ? rowNorm(A) : colNorm(A);
    const signed = one ? colSigned(A) : rowSigned(A);
    if (other === v || signed === v || A.flat().every((x) => x >= 0)) continue;
    const p = one ? "1" : "\\infty";
    const sums = one
      ? A[0].map((_, j) => `${A.map((row) => `|${row[j]}|`).join(" + ")} = ${A.reduce((s, row) => s + Math.abs(row[j]), 0)}`)
      : A.map((row) => `${row.map((x) => `|${x}|`).join(" + ")} = ${row.reduce((s, x) => s + Math.abs(x), 0)}`);
    const slips: NumSlip[] = [["rowsForColumns", other], ["signedSums", signed]];
    return {
      prompt: fill(w.fa.prompt.matrixNorm, { p: one ? "1" : "∞" }),
      q: `A = ${matTex(A)}, \\quad \\|A\\|_{${p}}`,
      ...exact(F(v), slips),
      steps: [...sums, `\\|A\\|_{${p}} = ${v}`],
    };
  }
}

const TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]] as const;

function spectralPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    for (;;) {
      const p = r.nz(-6, 6);
      const q = r.nz(-6, 6);
      const l1 = p + q;
      const l2 = p - q;
      const v = Math.max(Math.abs(l1), Math.abs(l2));
      const signed = Math.max(l1, l2);
      const big = Math.max(Math.abs(p), Math.abs(q));
      if (signed === v || Math.abs(p) === Math.abs(q)) continue;
      return {
        prompt: fill(w.fa.prompt.matrixNorm, { p: "2" }),
        q: `A = ${matTex([[p, q], [q, p]])}, \\quad \\|A\\|_2`,
        ...exact(F(v), [["eigenvalueSigned", signed], ["largestEntry", big]]),
        steps: [`A = A^{\\mathsf T}, \\quad \\lambda = ${p} \\pm ${Math.abs(q)} = ${l1}, \\ ${l2}`, `\\|A\\|_2 = \\max |\\lambda| = ${v}`],
      };
    }
  }
  const [a, b, c] = r.pick(TRIPLES);
  const p = r.sign() * a;
  const q = r.sign() * b;
  return {
    prompt: fill(w.fa.prompt.matrixNorm, { p: "2" }),
    q: `A = ${matTex([[p, q], [-q, p]])}, \\quad \\|A\\|_2`,
    ...exact(F(c), [["largestEntry", Math.max(a, b)], ["squaresNoRoot", c * c]]),
    steps: [`A^{\\mathsf T}A = ${matTex([[c * c, 0], [0, c * c]])}`, `\\|A\\|_2 = \\sqrt{${c * c}} = ${c}`],
  };
}

function operatorPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.6) {
    const c = r.int(2, 9);
    let a = r.int(1, 4);
    const b = r.int(1, 4);
    if (a === b) a = b + 1;
    return {
      prompt: w.fa.prompt.operatorNorm,
      q: `(Tf)(x) = \\int_0^1 ${c}x^{${a}}y^{${b}} f(y) \\, dy \\text{ on } \\left(C[0, 1], \\|\\cdot\\|_\\infty\\right)`,
      ...exact(F(c, b + 1), [["kernelSup", c], ["integratedInX", F(c, a + 1)]]),
      steps: [
        `\\|T\\| = \\max_{x \\in [0, 1]} \\int_0^1 |${c}x^{${a}}y^{${b}}| \\, dy = \\max_x \\frac{${c}x^{${a}}}{${b + 1}}`,
        `= ${F(c, b + 1).tex()} \\text{ at } x = 1, \\text{ attained by } f \\equiv 1`,
      ],
    };
  }
  for (;;) {
    const a = r.nz(-6, 6);
    const b = r.nz(-9, 9);
    const end = a + b;
    const v = Math.max(Math.abs(a), Math.abs(end));
    const signed = Math.max(a, end);
    if (signed === v) continue;
    const g = `${a} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x`;
    return {
      prompt: w.fa.prompt.operatorNorm,
      q: `(Mf)(x) = (${g}) f(x) \\text{ on } L^2[0, 1]`,
      ...exact(F(v), [["signedSup", signed]]),
      steps: [`\\|M\\| = \\sup_{[0, 1]} |${g}| = \\max(|${a}|, |${end}|) = ${v}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? sumsPart(r, w) : L === 2 ? spectralPart(r, w) : operatorPart(r, w));

export default gen;
