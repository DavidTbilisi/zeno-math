// Practice: Linear maps. Easy asks whether a map of ℝ² is linear: a matrix map, one shifted by a constant (called
// linear, named), or one with a square, an absolute value or a product; medium writes the matrix of T from T(e₁) and
// T(e₂) (the images written as rows, named); hard is the matrix of T in another basis, P⁻¹AP (PAP⁻¹ given, named).
// Since #734 half the questions are new kinds: easy, the matrix of a reflection, a stretch or a quarter, half or
// three-quarter turn; medium, a quarter turn about the x-axis in ℝ³, a projection onto a line and a matrix read
// from a picture of where e₁ and e₂ land; hard, a composition, the kernel and the image of a rank-one matrix and
// whether a map is onto. The other axis, the other direction of a stretch or a turn, the projection not divided by
// u · u, the composition in the wrong order, a row taken for the kernel or the image, the sign lost, the whole plane
// for the image, and "onto" judged by the size alone are slips.
import { pickOf, word } from "../calculusTwo";
import { fill } from "../chart";
import { texM, mul } from "../matrix";
import { dot, inverse, linTex, matOf, sameMat, shears, small, transpose, tup, vecOf } from "../linearAlgebra";
import { colTex, fr, ints, M } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";
import { withVars } from "./matrices";

const map = (a: string, b: string) => `T(x, y) = (${a}, \\ ${b})`;

/** Is a map of ℝ² linear? */
function linearPart(r: Rng, w: PracticeWords): Part {
  const W = w.linalg;
  const options = [word(W.linear), word(W.notLinear)];
  const [a, b, c, d] = [r.nz(-4, 4), r.int(-4, 4), r.int(-4, 4), r.nz(-4, 4)];
  const k = r.nz(-5, 5);
  const add = (s: string) => `${s} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
  const kinds = [
    { q: map(linTex([a, b], ["x", "y"]), linTex([c, d], ["x", "y"])), right: 0, steps: [`T(x, y) = ${texM(M([[a, b], [c, d]]))}${colTex(["x", "y"])}`] },
    { q: map(linTex([a, b], ["x", "y"]), linTex([0, d], ["x", "y"])), right: 0, steps: [`T(\\mathbf{u} + \\mathbf{v}) = T(\\mathbf{u}) + T(\\mathbf{v}), \\ T(c\\mathbf{u}) = cT(\\mathbf{u})`] },
    { q: map(add(linTex([a, b], ["x", "y"])), linTex([c, d], ["x", "y"])), right: 1, slip: true, steps: [`T(0, 0) = (${k}, 0) \\ne (0, 0)`] },
    { q: map(`x^{2}`, linTex([c, d], ["x", "y"])), right: 1, steps: ["T(2, 0) \\ne 2T(1, 0): \\ 4 \\ne 2"] },
    { q: map(`|x|`, "y"), right: 1, steps: ["T(-1, 0) = (1, 0) \\ne -T(1, 0) = (-1, 0)"] },
    { q: map(`xy`, linTex([a], ["x"])), right: 1, steps: ["T(2, 2) = (4, \\ldots) \\ne 2T(1, 1) = (2, \\ldots)"] },
  ];
  const s = r.next() < 0.35 ? kinds[r.int(0, 1)] : r.next() < 0.5 ? kinds[2] : r.pick(kinds.slice(3));
  return { prompt: W.prompt.isLinear, q: s.q, ...pickOf(options, s.right, s.slip ? [["affineAsLinear", 0]] : []), steps: s.steps };
}

/** The matrix of T from the images of e₁ and e₂. */
function matrixPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const rows = r.next() < 0.5 ? 2 : 3;
    const e1 = Array.from({ length: rows }, () => r.int(-4, 4));
    const e2 = Array.from({ length: rows }, () => r.int(-4, 4));
    if (e1.every((x) => x === 0) || e2.every((x) => x === 0)) continue;
    const A = transpose(M([e1, e2]));
    const slip = M([e1, e2]);
    if (rows === 2 && sameMat(A, slip)) continue;
    return {
      prompt: w.linalg.prompt.matrixOf,
      q: `T(\\mathbf{e}_1) = ${tup(e1)}, \\quad T(\\mathbf{e}_2) = ${tup(e2)}`,
      ...matOf(A, rows === 2 ? [["imagesAsRows", slip]] : []),
      steps: [`A = \\begin{pmatrix} T(\\mathbf{e}_1) & T(\\mathbf{e}_2) \\end{pmatrix} = ${texM(A)}`],
    };
  }
}

/** The matrix of T in the basis of P's columns: P⁻¹AP. */
function changeBasisPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const P = shears(r, 2, 3);
    const A = M([[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]]);
    const Pi = inverse(P);
    const B = mul(mul(Pi, A), P);
    const slip = mul(mul(P, A), Pi);
    if (sameMat(B, slip) || !small(B, 15) || sameMat(B, A)) continue;
    const [b1, b2] = [0, 1].map((j) => P.map((row) => row[j].n));
    return {
      prompt: w.linalg.prompt.changeBasis,
      q: `A = ${texM(A)}, \\quad \\mathbf{b}_1 = ${tup(b1)}, \\quad \\mathbf{b}_2 = ${tup(b2)}`,
      ...matOf(B, [["conjugatedWrongWay", slip]]),
      steps: [`P = ${texM(P)}, \\quad P^{-1} = ${texM(Pi)}`, `[T]_B = P^{-1}AP = ${texM(B)}`],
    };
  }
}

const gen: Gen = (r, L, w) => (r.int(0, 9) >= 5 ? more(r, L, w) : L === 1 ? linearPart(r, w) : L === 2 ? matrixPart(r, w) : changeBasisPart(r, w));

const ROT: Record<number, number[][]> = { 90: [[0, -1], [1, 0]], 180: [[-1, 0], [0, -1]], 270: [[0, 1], [-1, 0]] };
const sayV = (v: number[]) => `(${v.join(", ")})`.replace(/-/g, "−");

/** Where e₁ (green) and e₂ (orange) land, drawn on a grid with the unit square and its image. */
function landSvg(e1: number[], e2: number[]): { body: string; w: number; h: number } {
  const [U, R] = [22, 4];
  const X = (x: number) => 20 + (x + R) * U;
  const Y = (y: number) => 14 + (R - y) * U;
  const out: string[] = [];
  for (let v = -R; v <= R; v++)
    out.push(`<line x1="${X(v)}" y1="${Y(R)}" x2="${X(v)}" y2="${Y(-R)}" stroke="${v ? "#e9ecef" : "#212529"}" stroke-width="${v ? 1 : 1.5}"/>`,
      `<line x1="${X(-R)}" y1="${Y(v)}" x2="${X(R)}" y2="${Y(v)}" stroke="${v ? "#e9ecef" : "#212529"}" stroke-width="${v ? 1 : 1.5}"/>`);
  const quad = (a: number[], b: number[]) => `${X(0)},${Y(0)} ${X(a[0])},${Y(a[1])} ${X(a[0] + b[0])},${Y(a[1] + b[1])} ${X(b[0])},${Y(b[1])}`;
  out.push(`<polygon points="${quad([1, 0], [0, 1])}" fill="#868e96" fill-opacity="0.2" stroke="#868e96" stroke-dasharray="4 3"/>`);
  out.push(`<polygon points="${quad(e1, e2)}" fill="#1971c2" fill-opacity="0.12" stroke="#1971c2"/>`);
  for (const [v, c] of [[e1, "#2f9e44"], [e2, "#e8590c"]] as const) {
    out.push(`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(v[0])}" y2="${Y(v[1])}" stroke="${c}" stroke-width="3"/>`, `<circle cx="${X(v[0])}" cy="${Y(v[1])}" r="4.5" fill="${c}"/>`);
  }
  return { body: out.join(""), w: 2 * R * U + 40, h: 2 * R * U + 28 };
}

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.lmK;
  if (L === 1) {
    const t = r.pick(["reflect", "stretch", "turn"] as const);
    if (t === "reflect") {
      const k = r.int(0, 3);
      const mats = [[[1, 0], [0, -1]], [[-1, 0], [0, 1]], [[0, 1], [1, 0]], [[0, -1], [-1, 0]]];
      const names = [W.lineX, W.lineY, W.lineYX, W.lineYmX];
      const other = k ^ 1;
      return { prompt: fill(W.reflectQ, { l: names[k] }), q: "", ...withVars(matOf(M(mats[k]), [["reflectAxisSwapped", M(mats[other])]]), { reflectAxisSwapped: { l: names[other], v: texPlain(mats[k]) } }),
        steps: [`\\mathbf{e}_1 \\mapsto ${tup(mats[k].map((row) => row[0]))}, \\quad \\mathbf{e}_2 \\mapsto ${tup(mats[k].map((row) => row[1]))}`, texM(M(mats[k]))] };
    }
    if (t === "stretch") {
      const k = r.pick([2, 3, 4, 5]);
      const inX = r.next() < 0.5;
      const right = inX ? [[k, 0], [0, 1]] : [[1, 0], [0, k]];
      return { prompt: fill(inX ? W.stretchXQ : W.stretchYQ, { k }), q: "", ...withVars(matOf(M(right), [["stretchAxisSwapped", M(inX ? [[1, 0], [0, k]] : [[k, 0], [0, 1]])]]), { stretchAxisSwapped: { v: texPlain(right) } }),
        steps: [`\\mathbf{e}_1 \\mapsto ${tup(right.map((row) => row[0]))}, \\quad \\mathbf{e}_2 \\mapsto ${tup(right.map((row) => row[1]))}`, texM(M(right))] };
    }
    const a = r.pick([90, 180, 270]);
    return { prompt: fill(W.turnQ, { t: a }), q: "", ...withVars(matOf(M(ROT[a]), [["rotationClockwise", transpose(M(ROT[a]))]]), { rotationClockwise: { t: a, v: texPlain(ROT[a]) } }),
      steps: [`\\begin{pmatrix} \\cos ${a}° & -\\sin ${a}° \\\\ \\sin ${a}° & \\cos ${a}° \\end{pmatrix} = ${texM(M(ROT[a]))}`] };
  }
  if (L === 2) {
    const t = r.pick(["rot3", "proj", "picture"] as const);
    if (t === "rot3") {
      const v = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
      const right = [v[0], -v[2], v[1]];
      return { prompt: W.rot3Q, q: tup(v), ...withVars(vecOf(right.map((x) => fr(x)), [["rotationClockwise", [v[0], v[2], -v[1]]]]), { rotationClockwise: { t: 90, v: sayV(right) } }),
        steps: [`${texM(M([[1, 0, 0], [0, 0, -1], [0, 1, 0]]))}${colTex(v.map(String))} = ${colTex(right.map(String))}`] };
    }
    if (t === "proj") {
      const u = r.pick([[1, 2], [2, 1], [1, 1], [1, -1], [3, 4], [1, 3]]);
      let v = [r.int(-5, 5), r.int(-5, 5)];
      if (dot(u, v) === 0) v = [v[0] + 1, v[1]];
      const k = fr(dot(u, v), dot(u, u));
      const right = u.map((x) => k.mul(fr(x)));
      return { prompt: W.projQ, q: `\\mathbf{u} = ${tup(u)}, \\quad \\mathbf{v} = ${tup(v)}`,
        ...withVars(vecOf(right, [["projNotNormalized", u.map((x) => x * dot(u, v))]]), { projNotNormalized: { d: dot(u, v), uu: dot(u, u) } }),
        steps: [`\\frac{\\mathbf{v} \\cdot \\mathbf{u}}{\\mathbf{u} \\cdot \\mathbf{u}} \\mathbf{u} = \\frac{${dot(u, v)}}{${dot(u, u)}} ${tup(u)} = ${tup(right)}`] };
    }
    let e1: number[], e2: number[];
    do (e1 = [r.int(-3, 3), r.int(-3, 3)]), (e2 = [r.int(-3, 3), r.int(-3, 3)]);
    while (e1[0] * e2[1] - e1[1] * e2[0] === 0 || e1[1] === e2[0]);
    const pic = landSvg(e1, e2);
    const A = transpose(M([e1, e2]));
    return { prompt: W.pictureQ, q: "", pic: { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${pic.body}</g>`, w: pic.w, h: pic.h },
      ...matOf(A, [["imagesAsRows", M([e1, e2])]]), steps: [`T(\\mathbf{e}_1) = ${tup(e1)}, \\quad T(\\mathbf{e}_2) = ${tup(e2)}`, `A = ${texM(A)}`] };
  }
  const t = r.pick(["compose", "kernel", "image", "onto"] as const);
  if (t === "compose") {
    let A: number[][], B: number[][];
    do (A = ints(r, 2, 2, -3, 4)), (B = ints(r, 2, 2, -3, 4));
    while (sameMat(mul(M(B), M(A)), mul(M(A), M(B))));
    const BA = mul(M(B), M(A));
    return { prompt: W.composeQ, q: `A = ${texM(M(A))}, \\quad B = ${texM(M(B))}`, ...matOf(BA, [["matCompositionOrder", mul(M(A), M(B))]]),
      steps: [`(S \\circ T)(\\mathbf{x}) = B(A\\mathbf{x}) = (BA)\\mathbf{x}`, `BA = ${texM(BA)}`] };
  }
  // A rank-one matrix [[a, b], [ka, kb]]: its kernel is along (−b, a), its image along (1, k).
  let a: number, b: number, k: number;
  do (a = r.nz(-4, 4)), (b = r.nz(-4, 4)), (k = r.pick([2, 3, -2, -1]));
  // No tile may also lie in the kernel or along the image, and no two tiles may read the same.
  while (Math.abs(a) === Math.abs(b) || a * k === b || b * k === a || b * k === -a);
  const A = [[a, b], [k * a, k * b]];
  const g = (x: number, y: number): number => (y ? g(y, x % y) : Math.abs(x));
  const h = g(a, b);
  const ker = [-b / h, a / h];
  if (t === "kernel") {
    const opts = [sayV(ker), sayV([a / h, b / h]), sayV([1, k]), sayV([b / h, a / h])];
    return { ...pickPart(r, opts, 0, [
      { id: "kernelAsRow", at: 1, vars: { v: opts[0] } },
      { id: "kernelAsImage", at: 2, vars: { v: opts[0] } },
      { id: "kernelSignLost", at: 3, vars: { v: opts[0] } },
    ], W.kernelQ, [`${a}x + ${b < 0 ? `(${b})` : b}y = 0`, `(x, y) = t${tup(ker)}`]), q: `A = ${texM(M(A))}` };
  }
  if (t === "image") {
    const opts = [fill(W.imgLine, { v: sayV([1, k]) }), W.imgPlane, fill(W.imgLine, { v: sayV([a / h, b / h]) }), W.imgZero];
    return { ...pickPart(r, opts, 0, [
      { id: "imageAllPlane", at: 1, vars: { v: opts[0] } },
      { id: "imageAsRow", at: 2, vars: { v: opts[0] } },
    ], W.imageQ, [`A${colTex(["x", "y"])} = (${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}y)${colTex(["1", String(k)])}`]), q: `A = ${texM(M(A))}` };
  }
  // Onto: a 2 × 3 matrix of rank 2 or rank 1, or a 3 × 2 one, which never reaches all of ℝ³.
  const tall = r.next() < 0.3;
  const top = [r.nz(-3, 3), r.int(-3, 3), r.int(-3, 3)];
  const rank1 = !tall && r.next() < 0.5;
  let low = rank1 ? top.map((x) => x * k) : [r.int(-3, 3), r.nz(-3, 3), r.int(-3, 3)];
  if (!rank1 && top[0] * low[1] === top[1] * low[0]) low = [low[0] + 1, low[1], low[2]];
  const T = tall ? transpose(M([top, low])) : M([top, low]);
  const right = !tall && !rank1 ? 0 : 1;
  return { ...pickPart(r, [W.yes, W.no], right, right ? [{ id: tall ? "ontoTooFewColumns" : "ontoRankIgnored", at: 0, vars: { k } }] : [], fill(W.ontoQ, { m: tall ? "³" : "²" }),
    [tall ? W.whyTall : rank1 ? fill(W.whyRank1, { k }) : W.whyRank2]), q: `A = ${texM(T)}` };
}

/** A matrix as read in a hint: [1 0; 0 −1]. */
const texPlain = (m: number[][]) => `[${m.map((row) => row.join(" ")).join("; ")}]`.replace(/-/g, "−");

export default gen;
