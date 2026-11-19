// Practice: Matrix products.
import { env, mul, texM } from "../matrix";
import { ints, M, matAnswer, matCalc, matPlain } from "../practiceKit";
import type { Gen } from "../practiceTypes";

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const [A, B] = [ints(r, 2, 2, -5, 6), ints(r, 2, 2, -5, 6)];
    const P = mul(M(A), M(B));
    return { prompt: w.prompts.matProduct, q: `${texM(M(A))} ${texM(M(B))}`, answer: matAnswer(P), show: texM(P), plain: matPlain(P), format: "matrix", solution: matCalc("mul", A, B) };
  }
  if (L === 2) {
    // AᵀB with A and B both 3 × 2: the product is only defined once A is turned.
    const [A, B] = [ints(r, 3, 2, -4, 5), ints(r, 3, 2, -4, 5)];
    const At = M(A[0].map((_, j) => A.map((row) => row[j])));
    const P = mul(At, M(B));
    return {
      prompt: w.prompts.matTranspose,
      q: `A = ${texM(M(A))}, \\quad B = ${texM(M(B))}`,
      answer: matAnswer(P),
      show: texM(P),
      plain: matPlain(P),
      format: "matrix",
      steps: [`A^{T} = ${texM(At)}`, `A^{T}B = ${texM(At)} ${texM(M(B))} = ${texM(P)}`],
    };
  }
  // A² = aA + bI: off the diagonal only a counts, so a comes from there and b from the diagonal (a = tr A, b = −det A).
  let A: number[][];
  do A = ints(r, 2, 2, -5, 5);
  while (A[0][1] === 0);
  const A2 = mul(M(A), M(A));
  const [a, b] = [A[0][0] + A[1][1], A[0][1] * A[1][0] - A[0][0] * A[1][1]];
  /** c·a, with + b on the diagonal: 3a + b, -a, b. */
  const lin = (c: number, diag: boolean) => {
    const t = c === 0 ? "" : c === 1 ? "a" : c === -1 ? "-a" : `${c}a`;
    return diag ? (t ? `${t} + b` : "b") : t || "0";
  };
  return {
    prompt: w.prompts.matIdentity,
    q: `A = ${texM(M(A))}`,
    answer: { k: "tuple", vs: [a, b], tol: 1e-9, names: ["a", "b"] },
    show: `a = ${a}, \\; b = ${b}`,
    plain: `a = ${a}; b = ${b}`,
    format: "pair",
    steps: [
      `A^{2} = ${texM(M(A))} ${texM(M(A))} = ${texM(A2)}`,
      `aA + bI = ${env([[lin(A[0][0], true), lin(A[0][1], false)], [lin(A[1][0], false), lin(A[1][1], true)]])}`,
      A[0][1] === 1 ? `a = ${a}` : `${lin(A[0][1], false)} = ${A2[0][1].tex()} \\;\\Rightarrow\\; a = ${a}`,
      `${lin(A[0][0], true)} = ${A2[0][0].tex()} \\;\\Rightarrow\\; b = ${b}`,
      `a = \\operatorname{tr} A, \\quad b = -\\det A`,
    ],
  };
};

export default gen;
