// Practice: The singular value decomposition. Easy gives the singular values of a 2 × 2 matrix with perpendicular
// columns (the eigenvalues of AᵀA given, the square root forgotten, named); medium is the Frobenius error of the best
// rank-k approximation from the singular values (the squares not rooted, or only the next singular value, named); hard
// writes the best rank-1 approximation σ₁u₁v₁ᵀ from U, Σ and Vᵀ (v₁u₁ᵀ given, named).
import { exact, F } from "../calculusTwo";
import { fill } from "../chart";
import { type Mat, mul, texM } from "../matrix";
import { diag, fromCols, matOf, scaleMat, sameMat, transpose } from "../linearAlgebra";
import { fr, M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

// Whole-number vectors of whole-number length: (p, q) with p² + q² = L².
const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]];

/** The singular values of a matrix with perpendicular columns. */
function valuesPart(r: Rng, w: PracticeWords): Part {
  const [p, q, L] = r.pick(TRIPLES);
  // Columns of different lengths, so the two singular values differ.
  const a = r.nz(-2, 2);
  const b = r.sign() * (3 - Math.abs(a));
  const c1 = [a * p, a * q];
  const c2 = [-b * q, b * p];
  const A = fromCols(r.next() < 0.5 ? [c1, c2] : [c2, c1]);
  const s = [Math.abs(a) * L, Math.abs(b) * L].sort((x, y) => y - x);
  const sq = s.map((x) => x * x);
  const AtA = mul(transpose(A), A);
  return {
    prompt: w.linalg.prompt.singular,
    q: `A = ${texM(A)}`,
    answer: { k: "set", vs: s, tol: 1e-9, traps: [{ id: "forgotSquareRoot", a: { k: "set", vs: sq, tol: 1e-9 } }] },
    show: `\\sigma = ${s.join(", \\; ")}`,
    plain: s.join("; "),
    format: "singular",
    steps: [`A^{T}A = ${texM(AtA)}`, `\\lambda = ${sq.join(", \\; ")}, \\quad \\sigma = \\sqrt{\\lambda} = ${s.join(", \\; ")}`],
  };
}

// Tails whose squares add up to a square, so the error is whole.
const TAILS = [[4, 3], [8, 6], [12, 5], [2, 2, 1], [6, 3, 2]];

/** The Frobenius error of the best rank-k approximation. */
function errorPart(r: Rng, w: PracticeWords): Part {
  const tail = r.pick(TAILS);
  const k = r.int(1, 2);
  const head: number[] = [];
  while (head.length < k) head.unshift((head[0] ?? tail[0]) + r.int(1, 5));
  const s = [...head, ...tail];
  const sq = tail.reduce((t, x) => t + x * x, 0);
  const e = Math.round(Math.sqrt(sq));
  return {
    prompt: fill(w.linalg.prompt.lowRankError, { k }),
    q: `\\sigma = ${s.join(", \\; ")}`,
    ...exact(F(e), [["forgotSquareRoot", sq], ["onlyNextValue", tail[0]]]),
    steps: [`\\|A - A_{${k}}\\|_F = \\sqrt{${tail.map((x) => `${x}^{2}`).join(" + ")}} = \\sqrt{${sq}} = ${e}`],
  };
}

/** σ₁u₁v₁ᵀ from U, Σ and Vᵀ. */
function rankOnePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const unit = (): Mat => {
      const [p, q] = r.pick([[3, 4], [4, 3]]);
      const s = r.sign();
      return M([[p, -s * q], [q, s * p]]).map((row) => row.map((x) => x.div(fr(5))));
    };
    const [U, V] = [unit(), unit()];
    const s1 = 5 * r.int(1, 3);
    const s2 = r.int(1, s1 - 1);
    const u1 = U.map((row) => [row[0]]);
    const v1t = [transpose(V)[0]];
    const A1 = scaleMat(fr(s1), mul(u1, v1t));
    const slip = transpose(A1);
    if (sameMat(A1, slip)) continue;
    return {
      prompt: w.linalg.prompt.rankOne,
      q: `A = U\\Sigma V^{T} = ${texM(U)}${texM(diag([s1, s2]))}${texM(transpose(V))}`,
      ...matOf(A1, [["outerProductOrder", slip]]),
      steps: [`A_1 = \\sigma_1\\mathbf{u}_1\\mathbf{v}_1^{T} = ${s1}${texM(u1)}${texM(v1t)} = ${texM(A1)}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? valuesPart(r, w) : L === 2 ? errorPart(r, w) : rankOnePart(r, w));

export default gen;
