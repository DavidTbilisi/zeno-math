// Practice: Rank and nullity. Easy is the rank of a 3 × 3 or 3 × 4 matrix (its non-zero rows counted before reducing,
// named); medium is the nullity of a 3 × 4 or 3 × 5 matrix by rank–nullity (the rows taken for the columns, named);
// hard is a vector of the null space of a 3 × 3 matrix of rank 2, any non-zero multiple (a row of the matrix given,
// named).
import { exact, F } from "../calculusTwo";
import { texM } from "../matrix";
import { cross, rref, vectorsOfRank } from "../linearAlgebra";
import { colTex, gcd, M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** The rank of a matrix whose rows span a space of a chosen dimension. */
function rankPart(r: Rng, w: PracticeWords): Part {
  const cols = r.pick([3, 4]);
  const k = r.pick([1, 2, 2, 3]);
  const A = M(vectorsOfRank(r, 3, cols, Math.min(k, cols)));
  return {
    prompt: w.linalg.prompt.rank,
    q: `A = ${texM(A)}`,
    ...exact(F(k), [["rankFromNonzeroRows", 3]]),
    steps: [`${texM(A)} \\to ${texM(rref(A).R)}`, `\\operatorname{rank} A = ${k}`],
  };
}

/** The nullity of a wide matrix, from its rank. */
function nullityPart(r: Rng, w: PracticeWords): Part {
  const cols = r.pick([4, 5]);
  const k = r.pick([1, 2, 2, 3]);
  const A = M(vectorsOfRank(r, 3, cols, k));
  const v = cols - k;
  return {
    prompt: w.linalg.prompt.nullity,
    q: `A = ${texM(A)}`,
    ...exact(F(v), [["nullityFromRows", 3 - k]]),
    steps: [`${texM(A)} \\to ${texM(rref(A).R)}`, `\\operatorname{rank} A = ${k}`, `\\operatorname{null} A = ${cols} - ${k} = ${v}`],
  };
}

/** A vector of the null space of a 3 × 3 matrix of rank 2. */
function nullVectorPart(r: Rng, w: PracticeWords): Part {
  const rows = vectorsOfRank(r, 3, 3, 2, 3);
  // No two rows are parallel, so the cross product of two of them spans the null space.
  const c = cross(rows[0], rows[1]);
  const g = gcd(gcd(c[0], c[1]), c[2]) * Math.sign(c.find((x) => x !== 0)!);
  const u = c.map((x) => x / g || 0);
  const A = M(rows);
  return {
    prompt: w.linalg.prompt.nullVector,
    q: `A = ${texM(A)}`,
    answer: { k: "dir", vs: u, traps: [{ id: "rowNotNull", a: { k: "dir", vs: rows[0] } }] },
    show: colTex(u.map(String)),
    plain: `(${u.join("; ")})`,
    format: "nullvec",
    steps: [`${texM(A)} \\to ${texM(rref(A).R)}`, `A\\mathbf{x} = \\mathbf{0}: \\quad \\mathbf{x} = t${colTex(u.map(String))}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? rankPart(r, w) : L === 2 ? nullityPart(r, w) : nullVectorPart(r, w));

export default gen;
