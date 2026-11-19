// Practice: Diagonalisation. Easy asks whether a matrix is diagonalisable: two different eigenvalues, a repeated one
// with a whole plane of eigenvectors (called not diagonalisable, named), or a repeated one with only a line of them
// (called diagonalisable from the eigenvalues counted twice, named); medium writes D for A = PDP⁻¹ from a given P (the
// eigenvalues in the wrong order, named); hard is Aⁿ through PDⁿP⁻¹ (each entry raised to the n, named).
import { pickOf, word } from "../calculusTwo";
import { fill } from "../chart";
import { type Mat, mul, texM } from "../matrix";
import { diag, identity, inverse, matOf, matSub, rankOf, sameMat, scaleMat, shears, small } from "../linearAlgebra";
import { fr, M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const conj = (P: Mat, D: Mat) => mul(mul(P, D), inverse(P));
/** Not triangular, so the eigenvalues can't be read off the diagonal. */
const mixed = (A: Mat) => A.some((row, i) => row.some((x, j) => j > i && !x.isZero())) && A.some((row, i) => row.some((x, j) => j < i && !x.isZero()));

/** Diagonalisable or not. */
function diagonalisablePart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  const options = [word(W.yes), word(W.no)];
  for (;;) {
    const kind = r.pick(["distinct", "plane", "plane", "jordan", "jordan"]);
    const l = r.nz(-3, 4);
    const m = r.nz(-3, 4);
    if (kind !== "jordan" && l === m) continue;
    const n = kind === "distinct" ? 2 : 3;
    const P = shears(r, n, 3);
    const J = kind === "distinct" ? diag([l, m]) : kind === "plane" ? diag([l, l, m]) : M([[l, 1, 0], [0, l, 0], [0, 0, m]]);
    if (kind === "jordan" && l === m) continue;
    const A = conj(P, J);
    if (!small(A, 12) || !mixed(A)) continue;
    const ls = kind === "distinct" ? [l, m] : [l, l, m];
    const geo = n - rankOf(matSub(A, scaleMat(fr(l), identity(n))));
    const right = kind === "jordan" ? 1 : 0;
    const steps = [`\\lambda = ${ls.join(", \\; ")}`, `\\dim \\ker(A - ${l < 0 ? `(${l})` : l}I) = ${n} - \\operatorname{rank}(A - ${l < 0 ? `(${l})` : l}I) = ${geo}`];
    return {
      prompt: fill(W.prompt.diagonalisable, { ls: ls.join(", ") }),
      q: `A = ${texM(A)}`,
      ...pickOf(options, right, kind === "plane" ? [["repeatedMeansNot", 1]] : kind === "jordan" ? [["countedEigenvalues", 0]] : []),
      steps,
    };
  }
}

/** A 2 × 2 matrix A = PDP⁻¹ with two different whole-number eigenvalues, or null when none small came up. */
function make(r: Rng, ls: number[], max: number) {
  for (let tries = 0; tries < 60; tries++) {
    const P = shears(r, 2, 3);
    const A = conj(P, diag(ls));
    if (small(A, max) && mixed(A)) return { A, P };
  }
  return null;
}

/** D from A and P. */
function diagonalPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    // Eigenvalues at most 3 apart, so PDP⁻¹ stays small.
    const l = r.int(-3, 4);
    const ls = [l, l + r.nz(-3, 3)];
    const made = make(r, ls, 12);
    if (!made) continue;
    const { A, P } = made;
    const D = diag(ls);
    return {
      prompt: w.linalg.prompt.diagonalD,
      q: `A = ${texM(A)}, \\quad P = ${texM(P)}`,
      ...matOf(D, [["eigenvaluesOutOfOrder", diag([ls[1], ls[0]])]]),
      steps: [`AP = ${texM(mul(A, P))} = P${texM(D)}`, `D = P^{-1}AP = ${texM(D)}`],
    };
  }
}

/** Aⁿ through PDⁿP⁻¹. */
function powerPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const ls = [r.pick([-1, 0, 1, 2, -2]), r.pick([-1, 0, 1, 2, -2, 3])];
    if (ls[0] === ls[1]) continue;
    const n = r.int(3, 5);
    const made = make(r, ls, 8);
    if (!made) continue;
    const { A, P } = made;
    const An = conj(P, diag(ls.map((l) => l ** n)));
    const slip = A.map((row) => row.map((x) => fr(x.n ** n)));
    // Eigenvalues of 0 and ±1 alone give Aⁿ = A (or A²): nothing to compute.
    if (!small(An, 999) || sameMat(An, slip) || sameMat(An, A) || sameMat(An, mul(A, A))) continue;
    return {
      prompt: fill(w.linalg.prompt.power, { n }),
      q: `A = ${texM(A)}, \\quad P = ${texM(P)}`,
      ...matOf(An, [["poweredEntries", slip]]),
      steps: [`D = P^{-1}AP = ${texM(diag(ls))}`, `A^{${n}} = PD^{${n}}P^{-1} = ${texM(P)}${texM(diag(ls.map((l) => l ** n)))}${texM(inverse(P))} = ${texM(An)}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? diagonalisablePart(r, w) : L === 2 ? diagonalPart(r, w) : powerPart(r, w));

export default gen;
