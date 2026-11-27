// Practice: Rank and nullity. Easy is the rank of a 3 × 3 or 3 × 4 matrix (its non-zero rows counted before reducing,
// named), or whether b lies in the column space (a row of A taken for a column, or only the columns themselves
// counted, named); medium is the nullity of a 3 × 4 or 3 × 5 matrix by rank–nullity (the rows taken for the columns,
// named), or the rank of Aᵀ, the dimension of the row space or of the left null space (the rows counted, or the null
// space of A given, named); hard is a vector of the null space of a 3 × 3 matrix of rank 2, any non-zero multiple (a
// row of the matrix given, named), or which columns make a basis of the column space (the columns of R, a dependent
// pair, or the rows of R, named).
import { exact, F, pickOf, shuffled, word } from "../calculusTwo";
import { gaussJordan, texM } from "../matrix";
import { cross, rref, vectorsOfRank } from "../linearAlgebra";
import type { MistakeId } from "../mistakes";
import { fill } from "../text";
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

const column = (A: number[][], j: number) => A.map((row) => row[j]);
const withColumn = (A: number[][], b: number[]) => A.map((row, i) => [...row, b[i]]);

/** Is b in C(A), for a 3 × 3 matrix of rank 2? */
function columnSpacePart(r: Rng, w: PracticeWords): Part {
  const W = w.lsK;
  for (;;) {
    const A = vectorsOfRank(r, 3, 3, 2);
    const inside = (b: number[]) => rref(M(withColumn(A, b))).rank === 2;
    const options = [word(W.yes), word(W.no)];
    if (r.next() < 0.5) {
      const [p, q] = [r.nz(-2, 2), r.nz(-2, 2)];
      const b = column(A, 0).map((x, i) => p * x + q * column(A, 1)[i]);
      if (rref(M(A.map((row) => row.slice(0, 2)))).rank < 2 || A.some((_, j) => column(A, j).every((x, i) => x === b[i]))) continue;
      return {
        prompt: W.colSpaceQ,
        q: `A = ${texM(M(A))}, \\quad \\mathbf{b} = ${colTex(b.map(String))}`,
        ...pickOf(options, 0, [["onlyColumnsInSpan", 1]]),
        steps: [`\\mathbf{b} = ${p}\\mathbf{a}_1 ${q < 0 ? "-" : "+"} ${Math.abs(q)}\\mathbf{a}_2`, `\\text{${W.yes}}`],
      };
    }
    const k = [0, 1, 2].find((i) => !inside(A[i]));
    if (k === undefined) continue;
    const b = A[k];
    return {
      prompt: W.colSpaceQ,
      q: `A = ${texM(M(A))}, \\quad \\mathbf{b} = ${colTex(b.map(String))}`,
      ...pickOf(options, 1, [["rowTakenForColumn", 0, { k: k + 1 }]]),
      steps: [`\\left[A \\mid \\mathbf{b}\\right] \\to ${texM(rref(M(withColumn(A, b))).R)}`, `\\operatorname{rank}\\left[A \\mid \\mathbf{b}\\right] = 3 > \\operatorname{rank} A = 2`, `\\text{${W.no}}`],
    };
  }
}

/** The rank of Aᵀ, the dimension of the row space, or of the left null space. */
function fourSpacesPart(r: Rng, w: PracticeWords): Part {
  const W = w.lsK;
  const cols = r.pick([4, 5]);
  const k = r.pick([1, 2, 2]);
  const A = M(vectorsOfRank(r, 3, cols, k));
  const ask = r.pick(["rankT", "rowDim", "leftNull"] as const);
  const v = ask === "leftNull" ? 3 - k : k;
  const slips: [MistakeId, number][] = ask === "leftNull" ? [["leftNullAsNull", cols - k]] : [["rankFromNonzeroRows", 3]];
  return {
    prompt: ask === "rankT" ? W.rankTQ : ask === "rowDim" ? W.rowDimQ : W.leftNullQ,
    q: `A = ${texM(A)}`,
    ...exact(F(v), slips),
    steps: [
      `${texM(A)} \\to ${texM(rref(A).R)}, \\quad \\operatorname{rank} A = ${k}`,
      ask === "leftNull" ? `\\dim N(A^{T}) = 3 - \\operatorname{rank} A = 3 - ${k} = ${v}` : `\\operatorname{rank} A^{T} = \\dim C(A^{T}) = \\operatorname{rank} A = ${k}`,
    ],
  };
}

/** Which columns make a basis of C(A), read off the pivots of R? */
function pivotPart(r: Rng, w: PracticeWords): Part {
  const W = w.lsK;
  for (;;) {
    const c0 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    const c1 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    const [t, s, p, q] = [r.nz(-2, 2), r.nz(-2, 2), r.nz(-2, 2), r.nz(-2, 2)];
    const comb = (a: number, b: number) => c0.map((x, i) => a * x + b * c1[i]);
    const pattern = r.int(0, 2);
    // The pivot columns, and a pair of columns where one is a multiple of the other.
    const [cols, piv, dep] =
      pattern === 0 ? [[c0, c1, comb(t, 0), comb(p, q)], [0, 1], [0, 2]] : pattern === 1 ? [[c0, comb(t, 0), c1, comb(p, q)], [0, 2], [0, 1]] : [[c0, comb(t, 0), comb(s, 0), c1], [0, 3], [0, 1]];
    const A = M([0, 1, 2].map((i) => cols.map((c) => c[i])));
    const { result: R, pivots } = gaussJordan(A, 4);
    if (pivots.length !== 2 || pivots[0] !== piv[0] || pivots[1] !== piv[1] || A.flat().filter((x) => x.isZero()).length > 4) continue;
    const [i, j] = piv.map((x) => x + 1);
    const options = [
      word(fill(W.colsOfA, { i, j })),
      word(fill(W.colsOfR, { i, j })),
      word(fill(W.colsOfA, { i: dep[0] + 1, j: dep[1] + 1 })),
      word(W.rowsOfR),
    ];
    return {
      prompt: W.pivotQ,
      q: `A = ${texM(A)}, \\quad R = ${texM(R)}`,
      ...shuffled(r, options, 0, [["rrefColumnsAsBasis", 1], ["dependentColumnsTaken", 2], ["rowsAsColumnBasis", 3]]),
      steps: [`\\text{${fill(W.pivotWhy, { i, j })}}`, `\\text{${options[0].text}}`],
    };
  }
}

const gen: Gen = (r, L, w) => {
  const more = r.int(0, 9) >= 5;
  if (L === 1) return more ? columnSpacePart(r, w) : rankPart(r, w);
  if (L === 2) return more ? fourSpacesPart(r, w) : nullityPart(r, w);
  return more ? pivotPart(r, w) : nullVectorPart(r, w);
};

export default gen;
