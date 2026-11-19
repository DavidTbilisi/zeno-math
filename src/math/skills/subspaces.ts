// Practice: Subspaces and spans. Easy asks whether a set is a subspace: a line or plane through 0, one moved off it
// (taken for a subspace though 0 is not in it, named), or a set with 0 that is not closed (x ≥ 0, xy ≥ 0, y = x²,
// named); medium writes w as a v₁ + b v₂ (a and b swapped, named) or asks whether w is in the span at all (the
// coefficients found from two components and the third not checked, named); hard is the dimension of the span of three
// or four vectors (the number of vectors given instead, named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { fill } from "../chart";
import { texM } from "../matrix";
import { fromCols, linTex, rankOf, rref, tup, vecOf, vectorsOfRank } from "../linearAlgebra";
import { M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const set = (vars: string, rule: string) => `\\{(${vars}) : ${rule}\\}`;

/** Is the set a subspace? */
function subspacePart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  const options = [word(W.yes), word(W.no)];
  const [a, b, c] = [r.nz(-4, 4), r.nz(-4, 4), r.nz(-5, 5)];
  const yes = [
    () => ({ n: 2, q: set("x, y", `y = ${linTex([a])}`) }),
    () => ({ n: 3, q: set("x, y, z", `${linTex([a, b, 1])} = 0`) }),
    () => ({ n: 3, q: set("x, y, z", `x = ${linTex([a], ["y"])}, \\ z = 0`) }),
  ];
  const closed = ["\\mathbf{0} \\in S", "\\mathbf{u}, \\mathbf{v} \\in S,\\ c \\in \\mathbb{R} \\;\\Rightarrow\\; \\mathbf{u} + \\mathbf{v} \\in S,\\ c\\mathbf{u} \\in S"];
  if (r.next() < 0.4) {
    const s = r.pick(yes)();
    return { prompt: fill(W.prompt.isSubspace, { n: s.n === 2 ? "²" : "³" }), q: s.q, ...pickOf(options, 0), steps: closed };
  }
  const no = [
    { n: 2, q: set("x, y", `y = ${linTex([a])} ${c < 0 ? "-" : "+"} ${Math.abs(c)}`), slip: "missesZero" as const, why: `(0, 0) \\notin S: \\ 0 \\ne ${c}` },
    { n: 3, q: set("x, y, z", `${linTex([a, b, 1])} = ${c}`), slip: "missesZero" as const, why: `(0, 0, 0) \\notin S: \\ 0 \\ne ${c}` },
    { n: 2, q: set("x, y", "x \\ge 0"), slip: "notClosed" as const, why: "(1, 0) \\in S, \\ -1 \\cdot (1, 0) = (-1, 0) \\notin S" },
    { n: 2, q: set("x, y", "xy \\ge 0"), slip: "notClosed" as const, why: "(1, 0), (0, -1) \\in S, \\ (1, 0) + (0, -1) = (1, -1) \\notin S" },
    { n: 2, q: set("x, y", "y = x^{2}"), slip: "notClosed" as const, why: "(1, 1) \\in S, \\ 2 \\cdot (1, 1) = (2, 2) \\notin S" },
  ];
  const s = r.pick(no);
  return { prompt: fill(W.prompt.isSubspace, { n: s.n === 2 ? "²" : "³" }), q: s.q, ...pickOf(options, 1, [[s.slip, 0]]), steps: [s.why] };
}

/** w as a combination of v₁ and v₂, or whether it is one at all. */
function spanPart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  for (;;) {
    const [v1, v2] = vectorsOfRank(r, 2, 3, 2);
    // The first two components alone decide a and b.
    const d = v1[0] * v2[1] - v1[1] * v2[0];
    if (d === 0) continue;
    const [a, b] = [r.nz(-3, 3), r.nz(-3, 3)];
    const u = v1.map((x, i) => a * x + b * v2[i]);
    const q = `\\mathbf{v}_1 = ${tup(v1)}, \\quad \\mathbf{v}_2 = ${tup(v2)}, \\quad \\mathbf{w} = ${tup(u)}`;
    const solve = `${tup(u.slice(0, 2))} = a${tup(v1.slice(0, 2))} + b${tup(v2.slice(0, 2))} \\;\\Rightarrow\\; a = ${a}, \\ b = ${b}`;
    if (r.next() < 0.5) {
      if (a === b) continue;
      return { prompt: W.prompt.combination, q, ...vecOf([F(a), F(b)], [["coefficientsSwapped", [b, a]]], "pair", ["a", "b"]), steps: [solve] };
    }
    if (r.next() < 0.4) {
      return { prompt: W.prompt.inSpan, q, ...pickOf([word(W.yes), word(W.no)], 0), steps: [solve, `${a} \\cdot ${v1[2]} + ${b} \\cdot ${v2[2]} = ${u[2]} \\;\\checkmark`] };
    }
    const off = r.nz(-3, 3);
    const u2 = [u[0], u[1], u[2] + off];
    if (rankOf(fromCols([v1, v2, u2])) !== 3) continue;
    return {
      prompt: W.prompt.inSpan,
      q: `\\mathbf{v}_1 = ${tup(v1)}, \\quad \\mathbf{v}_2 = ${tup(v2)}, \\quad \\mathbf{w} = ${tup(u2)}`,
      ...pickOf([word(W.yes), word(W.no)], 1, [["firstTwoRowsOnly", 0]]),
      steps: [solve, `${a} \\cdot ${v1[2]} + ${b} \\cdot ${v2[2]} = ${u[2]} \\ne ${u2[2]}`],
    };
  }
}

/** The dimension of the span of three or four vectors in ℝ³. */
function dimPart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([3, 3, 4]);
  const k = n === 4 ? r.int(2, 3) : r.pick([1, 2, 2, 3]);
  const vs = vectorsOfRank(r, n, 3, k);
  const { R } = rref(M(vs));
  return {
    prompt: w.linalg.prompt.spanDim,
    q: vs.map((v, i) => `\\mathbf{v}_${i + 1} = ${tup(v)}`).join(", \\quad "),
    ...exact(F(k), [["countedVectors", n]]),
    steps: [`${texM(M(vs))} \\to ${texM(R)}`, `\\dim = ${k}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? subspacePart(r, w) : L === 2 ? spanPart(r, w) : dimPart(r, w));

export default gen;
