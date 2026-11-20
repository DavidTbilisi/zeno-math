// Practice: Linear systems x′ = Ax. Easy finds the eigenvalues of A, the growth rates of its solutions (the diagonal
// entries taken for them, named); medium names the equilibrium at the origin from the trace and the determinant:
// node, saddle, spiral or centre, stable or not (stability the wrong way round, a saddle called a node, a spiral
// called a node, named); hard solves an initial value problem from the eigenvalues and eigenvectors and asks for
// x₁(t) (the initial vector used as the coefficients, named).
import { pickOf, word } from "../calculusTwo";
import { inverse, shears, small } from "../linearAlgebra";
import { det, type Mat, mul, texM } from "../matrix";
import type { MistakeId } from "../mistakes";
import { colTex, M } from "../practiceKit";
import { fill } from "../text";
import { eTex, ex, fnOf, linTex, sumOf, T } from "../odes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const tr = (A: Mat) => A[0][0].add(A[1][1]).toNumber();
/** P·B·P⁻¹ with P of whole shears (det 1), kept when small and not triangular (its diagonal would give the
 *  eigenvalues away). */
function conjugate(r: Rng, B: Mat, max: number): Mat {
  for (;;) {
    const P = shears(r, 2, 3);
    const A = mul(mul(P, B), inverse(P));
    if (small(A, max) && !A[0][1].isZero() && !A[1][0].isZero()) return A;
  }
}
const twoDistinct = (r: Rng, lo: number, hi: number) => {
  const a = r.int(lo, hi);
  let b = r.int(lo, hi);
  while (b === a) b = r.int(lo, hi);
  return [a, b].sort((x, y) => x - y);
};

/** The eigenvalues of A = PDP⁻¹. */
function eigenvaluesPart(r: Rng, w: PracticeWords): Part {
  // At most 4 apart: a non-triangular PDP⁻¹ has an off-diagonal entry of at least 2(λ₂ − λ₁).
  let ls = twoDistinct(r, -3, 3);
  while (ls[1] - ls[0] > 4) ls = twoDistinct(r, -3, 3);
  const A = conjugate(r, M([[ls[0], 0], [0, ls[1]]]), 9);
  const diagonal = [A[0][0].toNumber(), A[1][1].toNumber()].sort((x, y) => x - y);
  const [t, D] = [tr(A), det(A).toNumber()];
  return {
    prompt: w.ode.prompt.eigenvalues,
    q: `\\mathbf{x}' = A\\mathbf{x}, \\quad A = ${texM(A)}`,
    answer: { k: "set", vs: ls, tol: 1e-9, traps: [{ id: "diagonalAsEigenvalues", a: { k: "set", vs: diagonal, tol: 1e-9 } }] },
    show: `\\lambda = ${ls.join(", \\; ")}`,
    plain: ls.join("; "),
    format: "roots",
    steps: [
      `\\operatorname{tr} A = ${t}, \\; \\det A = ${D}: \\quad ${linTex([[1, "\\lambda^{2}"], [-t, "\\lambda"], [D, ""]])} = 0`,
      `\\lambda = ${ls.join(", \\; ")}: \\quad \\mathbf{x}(t) = c_1${eTex(ls[0], "t")}\\mathbf{v}_1 + c_2${eTex(ls[1], "t")}\\mathbf{v}_2`,
    ],
  };
}

const KINDS = ["stableNode", "unstableNode", "saddle", "stableSpiral", "unstableSpiral", "centre"] as const;

/** Node, saddle, spiral or centre at the origin, from A's trace and determinant. */
function classifyPart(r: Rng, w: PracticeWords): Part {
  const right = r.int(0, KINDS.length - 1);
  const kind = KINDS[right];
  let B: Mat;
  let lam: string;
  if (kind === "stableNode" || kind === "unstableNode" || kind === "saddle") {
    const [a, b] = kind === "saddle" ? [-r.int(1, 3), r.int(1, 3)] : twoDistinct(r, 1, 3).map((x) => (kind === "stableNode" ? -x : x));
    B = M([[a, 0], [0, b]]);
    lam = `\\lambda = ${[a, b].sort((x, y) => x - y).join(", \\; ")}`;
  } else {
    const al = kind === "centre" ? 0 : r.int(1, 2) * (kind === "stableSpiral" ? -1 : 1);
    const be = r.int(1, 2);
    B = M([[al, -be], [be, al]]);
    lam = `\\lambda = ${al === 0 ? "" : al} \\pm ${be === 1 ? "" : be}i`;
  }
  const A = conjugate(r, B, 12);
  const [t, D] = [tr(A), det(A).toNumber()];
  const options = KINDS.map((k) => word(w.ode.kinds[k]));
  const swap: Record<string, number> = { stableNode: 1, unstableNode: 0, stableSpiral: 4, unstableSpiral: 3 };
  const slips: [MistakeId, number][] = [];
  if (kind in swap) slips.push(["stabilitySignSwapped", swap[kind]]);
  if (kind === "saddle" && t !== 0) slips.push(["saddleAsNode", t < 0 ? 0 : 1]);
  if (kind === "stableSpiral" || kind === "unstableSpiral") slips.push(["spiralAsNode", kind === "stableSpiral" ? 0 : 1]);
  return {
    prompt: w.ode.prompt.classify,
    q: `A = ${texM(A)}`,
    ...pickOf(options, right, slips),
    steps: [
      `\\operatorname{tr} A = ${t}, \\; \\det A = ${D}, \\; (\\operatorname{tr} A)^{2} - 4\\det A = ${t * t - 4 * D}`,
      `${lam}: \\quad \\text{${options[right].text}}`,
    ],
  };
}

/** x′ = Ax, x(0) = x₀ with A = PDP⁻¹: x₁(t) = P₁₁c₁e^(λ₁t) + P₁₂c₂e^(λ₂t), where Pc = x₀. */
function ivpPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P = shears(r, 2, 3);
    if (P[0][0].isZero() || P[0][1].isZero()) continue;
    const ls = twoDistinct(r, -3, 3);
    const A = mul(mul(P, M([[ls[0], 0], [0, ls[1]]])), inverse(P));
    if (!small(A, 9)) continue;
    const c = [r.nz(-2, 2), r.nz(-2, 2)];
    const x0 = [0, 1].map((i) => P[i][0].toNumber() * c[0] + P[i][1].toNumber() * c[1]);
    const [p0, p1] = [P[0][0].toNumber(), P[0][1].toNumber()];
    const y = sumOf([[p0 * c[0], ex(ls[0], "t")], [p1 * c[1], ex(ls[1], "t")]]);
    const slip = sumOf([[p0 * x0[0], ex(ls[0], "t")], [p1 * x0[1], ex(ls[1], "t")]]);
    const v = (j: number) => `(${P[0][j].toNumber()}, ${P[1][j].toNumber()})`;
    const col = (j: number) => colTex([P[0][j].tex(), P[1][j].tex()]);
    return {
      prompt: fill(w.ode.prompt.systemIvp, { l1: ls[0], v1: v(0), l2: ls[1], v2: v(1) }),
      q: `\\mathbf{x}' = ${texM(A)}\\mathbf{x}, \\quad \\mathbf{x}(0) = ${colTex(x0.map(String))}`,
      ...fnOf(y, [["initialAsCoefficients", slip]], ["t"], "exprT"),
      steps: [
        `\\mathbf{x}(t) = c_1${eTex(ls[0], "t")}${col(0)} + c_2${eTex(ls[1], "t")}${col(1)}`,
        `c_1${col(0)} + c_2${col(1)} = ${colTex(x0.map(String))}: \\quad c_1 = ${c[0]}, \\; c_2 = ${c[1]}`,
        `x_1(t) = ${T(y, ["t"])}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? eigenvaluesPart(r, w) : L === 2 ? classifyPart(r, w) : ivpPart(r, w));

export default gen;
