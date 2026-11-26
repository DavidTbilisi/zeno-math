// Practice: Matrix products. Since #734 half the questions are new kinds: easy (grade 10), a matrix times a number,
// a difference, an entry of a data matrix, a shop's takings from its sales and the prices, a point moved by a matrix
// and the matrix equation of a system; medium, a 3 × 3 or 4 × 4 matrix times a vector and the k that makes a matrix
// singular; hard, a system solved with the inverse. The number added instead of multiplied, the difference the
// wrong way, the entry's row and column swapped, the sums multiplied, the matrix turned, the coefficients written
// down the columns, a sign dropped, ad + bc for the determinant and the determinant not divided out are slips.
import { fill } from "../chart";
import { inverse, matOf, matVec, transpose, tup, vecOf } from "../linearAlgebra";
import { env, mul, texM } from "../matrix";
import type { MistakeId } from "../mistakes";
import { colTex, fr, ints, M, matAnswer, matCalc, matPlain, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
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

type Shown = { answer: Part["answer"]; show: string; plain: string; format: Part["format"] };
/** The traps of an answer, each given the working its hint fills in. */
export function withVars(shown: Shown, vars: Partial<Record<MistakeId, Record<string, string | number>>>): Shown {
  const a = shown.answer;
  if (!("traps" in a) || !a.traps) return shown;
  return { ...shown, answer: { ...a, traps: a.traps.map((t) => ({ ...t, vars: vars[t.id] ?? t.vars })) } as Part["answer"] };
}
/** A number to type, with its slips (dropped when they give the answer or an earlier slip). */
export function numWith(v: number, slips: [MistakeId, number, Record<string, string | number>][]): Shown {
  const seen = new Set([v]);
  const traps = slips.filter(([, x]) => !seen.has(x) && seen.add(x)).map(([id, x, vars]) => ({ id, a: num(x), vars }));
  return { answer: { ...num(v), traps }, show: String(v).replace("-", "−"), plain: String(v), format: "number" };
}
const sayM = (m: number[][]) => `[${m.map((row) => row.join(" ")).join("; ")}]`.replace(/-/g, "−");

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.matK;
  if (L === 1) {
    const t = r.pick(["scalar", "minus", "entry", "takings", "point", "system"] as const);
    if (t === "scalar") {
      const k = r.pick([2, 3, -2, -3]);
      const A = ints(r, 2, 2, -5, 6);
      const right = A.map((row) => row.map((x) => k * x));
      return { prompt: W.scalarQ, q: `${k} ${texM(M(A))}`, ...withVars(matOf(M(right), [["scalarAdded", M(A.map((row) => row.map((x) => k + x)))]]), { scalarAdded: { k, a: A[0][0], v: right[0][0] } }),
        steps: [`${k} ${texM(M(A))} = ${texM(M(right))}`] };
    }
    if (t === "minus") {
      const [A, B] = [ints(r, 2, 2, -5, 6), ints(r, 2, 2, -5, 6)];
      const right = A.map((row, i) => row.map((x, j) => x - B[i][j]));
      if (right.flat().every((x) => x === 0)) return more(r, L, w);
      return { prompt: W.minusQ, q: `${texM(M(A))} - ${texM(M(B))}`, ...withVars(matOf(M(right), [["matSubReversed", M(right.map((row) => row.map((x) => -x)))]]), { matSubReversed: { a: A[0][0], b: B[0][0] < 0 ? `(${B[0][0]})` : B[0][0], v: right[0][0] } }),
        steps: [`${texM(M(right))}`] };
    }
    if (t === "entry") {
      const A = ints(r, 3, 3, 1, 40);
      let [i, j] = [r.int(1, 3), r.int(1, 3)];
      if (i === j || A[i - 1][j - 1] === A[j - 1][i - 1]) [i, j] = [1, 2];
      if (A[0][1] === A[1][0]) A[0][1] += 1;
      return { prompt: fill(W.entryQ, { e: `a${"₀₁₂₃"[i]}${"₀₁₂₃"[j]}` }), q: `A = ${texM(M(A))}`,
        ...numWith(A[i - 1][j - 1], [["entryIndexSwapped", A[j - 1][i - 1], { i, j, v: A[i - 1][j - 1] }]]), steps: [`a_{${i}${j}}: \\text{${W.rowSay} ${i}, ${W.colSay} ${j}} \\Rightarrow ${A[i - 1][j - 1]}`] };
    }
    if (t === "takings") {
      const S = ints(r, 2, 3, 1, 9);
      const p = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
      const v = S[0].reduce((s, x, j) => s + x * p[j], 0);
      const sums = S[0].reduce((s, x) => s + x, 0) * p.reduce((s, x) => s + x, 0);
      return { prompt: W.takingsQ, q: `S = ${texM(M(S))}, \\quad \\mathbf{p} = ${colTex(p.map(String))}`,
        ...numWith(v, [["sumsMultiplied", sums, { s: S[0].join(" + "), p: p.join(" + "), v }]]), steps: [`${S[0].map((x, j) => `${x} \\cdot ${p[j]}`).join(" + ")} = ${v}`] };
    }
    if (t === "point") {
      const A = ints(r, 2, 2, -4, 5);
      const v = [r.nz(-4, 4), r.nz(-4, 4)];
      const right = matVec(M(A), v.map((x) => fr(x)));
      const slip = matVec(transpose(M(A)), v.map((x) => fr(x))).map((x) => x.toNumber());
      return { prompt: W.pointQ, q: `${texM(M(A))}, \\quad ${tup(v)}`, ...withVars(vecOf(right, [["transposeUsed", slip]]), { transposeUsed: { v: tup(right) } }),
        steps: [`${texM(M(A))}${colTex(v.map(String))} = ${colTex(right.map((x) => x.tex()))}`] };
    }
    // The equations of a system as a matrix: one coefficient negative so a dropped sign shows.
    const c = [r.int(1, 5), r.int(1, 5), r.int(1, 5), -r.int(1, 5)];
    const [e, f] = [r.int(-9, 12), r.int(-9, 12)];
    if (c[1] === c[2]) c[1] += 1;
    const sys = `${c[0]}x + ${c[1]}y = ${e}, \\quad ${c[2]}x - ${-c[3]}y = ${f}`;
    const eq = (m: number[][]) => `${sayM(m)} [x; y] = [${e}; ${f}]`.replace(/-/g, "−");
    const opts = [eq([[c[0], c[1]], [c[2], c[3]]]), eq([[c[0], c[2]], [c[1], c[3]]]), eq([[c[0], c[1]], [c[2], -c[3]]]), `${sayM([[c[0], c[1]], [c[2], c[3]]])} [${e}; ${f}] = [x; y]`.replace(/-/g, "−")];
    return { ...pickPart(r, opts, 0, [
      { id: "coefficientsByColumn", at: 1, vars: { v: opts[0] } },
      { id: "signDroppedInMatrix", at: 2, vars: { c: -c[3], v: opts[0] } },
    ], W.systemQ, [`${texM(M([[c[0], c[1]], [c[2], c[3]]]))}${colTex(["x", "y"])} = ${colTex([String(e), String(f)])}`]), q: sys };
  }
  if (L === 2) {
    if (r.next() < 0.5) {
      const n = r.pick([3, 4]);
      const A = ints(r, n, n, -3, 4);
      const v = Array.from({ length: n }, () => r.int(-3, 3));
      const right = matVec(M(A), v.map((x) => fr(x)));
      const slip = matVec(transpose(M(A)), v.map((x) => fr(x))).map((x) => x.toNumber());
      return { prompt: W.vecQ, q: `${texM(M(A))}${colTex(v.map(String))}`, ...withVars(vecOf(right, [["transposeUsed", slip]]), { transposeUsed: { v: tup(right) } }),
        steps: [`${colTex(A.map((row) => row.map((x, j) => `${x < 0 ? `(${x})` : x} \\cdot ${v[j] < 0 ? `(${v[j]})` : v[j]}`).join(" + ")))} = ${colTex(right.map((x) => x.tex()))}`] };
    }
    // [[k, b], [c, d]] is singular when kd = bc.
    const d = r.pick([1, 2, 3, -1, -2]);
    const k = r.nz(-5, 5);
    const b = r.nz(-4, 4);
    const c = (k * d) / b;
    if (!Number.isInteger(c) || c === 0) return more(r, L, w);
    return { prompt: W.singularQ, q: env([["k", String(b)], [String(c), String(d)]]),
      ...numWith(k, [["detPlusUsed", -k, { b, c, d, v: k }]]), steps: [`\\det = ${d}k - ${b < 0 ? `(${b})` : b} \\cdot ${c < 0 ? `(${c})` : c} = 0`, `k = ${b * c} \\div ${d} = ${k}`] };
  }
  // A system solved with the inverse: x = A⁻¹b, the determinant at least 2 so leaving it out shows.
  let A: number[][], det: number;
  do (A = ints(r, 2, 2, -5, 6)), (det = A[0][0] * A[1][1] - A[0][1] * A[1][0]);
  while (Math.abs(det) < 2 || Math.abs(det) > 9);
  const [x, y] = [r.int(-5, 5), r.int(-5, 5)];
  const [e, f] = [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y];
  const inv = inverse(M(A));
  return { prompt: W.solveQ, q: `${texM(M(A))}${colTex(["x", "y"])} = ${colTex([String(e), String(f)])}`,
    ...withVars(vecOf([fr(x), fr(y)], [["detNotDivided", [x * det, y * det]]], "pair", ["x", "y"]), { detNotDivided: { d: det, x, y } }),
    steps: [`A^{-1} = \\frac{1}{${det}}${texM(M([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]]))} = ${texM(inv)}`, `${colTex(["x", "y"])} = A^{-1}${colTex([String(e), String(f)])} = ${colTex([String(x), String(y)])}`] };
}

export default gen;
