// Practice: Sets. Easy lists a union, an intersection, a difference or a complement read off a Venn diagram of A and B
// in U = {1, …, 10} (union and intersection swapped, the difference taken the other way, the complement without what
// is outside both circles, named); medium counts |A ∪ B| from |A|, |B| and |A ∩ B| (the overlap counted twice), the
// pairs in A × B (added instead of multiplied) or the subsets of A (2n instead of 2ⁿ); hard counts |A ∪ B ∪ C| (the
// part in all three not added back), or the subsets of A × B.
import { esc, setTex } from "../logicSets";
import type { Answer, Exercise, Gen, Part, PracticeWords, Trap } from "../practiceTypes";

type Rng = Parameters<Gen>[0];
type Region = "a" | "ab" | "b" | "out";
const REGIONS: readonly Region[] = ["a", "ab", "b", "out"];
export const UNIVERSE = Array.from({ length: 10 }, (_, i) => i + 1);

/** A and B in U, each part of the diagram holding 1 to 4 numbers (up to 6 outside both). */
export function venn(r: Rng): { A: number[]; B: number[] } {
  for (;;) {
    const reg = UNIVERSE.map(() => r.pick(REGIONS));
    const count = (g: Region) => reg.filter((x) => x === g).length;
    if ((["a", "ab", "b"] as const).every((g) => count(g) >= 1 && count(g) <= 4) && count("out") >= 1 && count("out") <= 6)
      return { A: UNIVERSE.filter((_, i) => reg[i] === "a" || reg[i] === "ab"), B: UNIVERSE.filter((_, i) => reg[i] === "b" || reg[i] === "ab") };
  }
}

/** U as a box and A, B as circles, each number in its part. */
function vennPic(A: readonly number[], B: readonly number[]): Exercise["pic"] {
  const parts: Record<Region, number[]> = { a: [], ab: [], b: [], out: [] };
  for (const x of UNIVERSE) parts[A.includes(x) ? (B.includes(x) ? "ab" : "a") : B.includes(x) ? "b" : "out"].push(x);
  const column = (xs: number[], cx: number) => xs.map((x, i) => `<text x="${cx}" y="${100 + (i - (xs.length - 1) / 2) * 22}" text-anchor="middle" font-size="15" fill="#1e1e1e">${x}</text>`).join("");
  const corners = [
    [22, 26],
    [338, 26],
    [22, 176],
    [338, 176],
    [22, 100],
    [338, 100],
  ];
  const outside = parts.out.map((x, i) => `<text x="${corners[i][0]}" y="${corners[i][1]}" text-anchor="middle" font-size="15" fill="#1e1e1e">${x}</text>`).join("");
  const svg =
    `<rect x="1" y="1" width="358" height="188" rx="6" fill="#fff" stroke="#495057"/>` +
    `<text x="346" y="182" text-anchor="end" font-size="13" font-style="italic" fill="#495057">${esc("U")}</text>` +
    `<circle cx="145" cy="95" r="72" fill="#a5d8ff" fill-opacity="0.35" stroke="#1971c2" stroke-width="2"/>` +
    `<circle cx="215" cy="95" r="72" fill="#ffc9c9" fill-opacity="0.35" stroke="#e03131" stroke-width="2"/>` +
    `<text x="88" y="30" font-size="15" font-weight="700" fill="#1971c2">A</text><text x="264" y="30" font-size="15" font-weight="700" fill="#e03131">B</text>` +
    column(parts.a, 108) +
    column(parts.ab, 180) +
    column(parts.b, 252) +
    outside;
  return { svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${svg}</g>`, h: 192, w: 362 };
}

export type SetOp = "union" | "inter" | "diffAB" | "diffBA" | "compA";
export const SET_OPS: readonly SetOp[] = ["union", "inter", "diffAB", "diffBA", "compA"];
const OP_TEX: Record<SetOp, string> = { union: "A \\cup B", inter: "A \\cap B", diffAB: "A \\setminus B", diffBA: "B \\setminus A", compA: "A^{c}" };
export function setOf(op: SetOp, A: readonly number[], B: readonly number[]): number[] {
  const inA = (x: number) => A.includes(x);
  const inB = (x: number) => B.includes(x);
  const keep = { union: (x: number) => inA(x) || inB(x), inter: (x: number) => inA(x) && inB(x), diffAB: (x: number) => inA(x) && !inB(x), diffBA: (x: number) => inB(x) && !inA(x), compA: (x: number) => !inA(x) }[op];
  return UNIVERSE.filter(keep);
}

/** A set read off the diagram. */
export function vennPart(A: number[], B: number[], op: SetOp, w: PracticeWords): Part {
  const vs = setOf(op, A, B);
  const slip = (other: SetOp, id: Trap["id"], vars?: Trap["vars"]): Trap => ({ id, a: { k: "set", vs: setOf(other, A, B), tol: 1e-9 }, vars });
  const outside = UNIVERSE.filter((x) => !A.includes(x) && !B.includes(x));
  const traps: Trap[] = {
    union: [slip("inter", "unionIntersect")],
    inter: [slip("union", "unionIntersect")],
    diffAB: [slip("diffBA", "differenceOrder")],
    diffBA: [slip("diffAB", "differenceOrder")],
    compA: [slip("diffBA", "complementInsideOnly", { x: outside.join(", ") })],
  }[op];
  return {
    prompt: w.logic.prompt.venn,
    q: OP_TEX[op],
    pic: vennPic(A, B),
    answer: { k: "set", vs, tol: 1e-9, listed: true, traps },
    show: setTex(vs),
    plain: vs.join("; "),
    format: "elements",
    steps: [`A = ${setTex(A)},\\ B = ${setTex(B)}`, `${OP_TEX[op]} = ${setTex(vs)}`],
  };
}

const num = (v: number, traps: Trap[] = []): Answer => ({ k: "num", v, tol: 1e-9, traps });
const countPart = (w: PracticeWords, q: string, v: number, steps: string[], traps: Trap[] = []): Part => ({
  prompt: w.logic.prompt.count,
  q,
  answer: num(v, traps),
  show: `${v}`,
  plain: `${v}`,
  format: "number",
  steps,
});

/** |A ∪ B| from the sizes and the overlap. */
export function unionCount(r: Rng, w: PracticeWords): Part {
  const c = r.int(2, 8);
  const [a, b] = [c + r.int(2, 12), c + r.int(2, 12)];
  const v = a + b - c;
  return countPart(w, `|A| = ${a},\\ |B| = ${b},\\ |A \\cap B| = ${c}.\\qquad |A \\cup B| = \\,?`, v, [`|A \\cup B| = |A| + |B| - |A \\cap B| = ${a} + ${b} - ${c} = ${v}`], [
    { id: "doubleCounted", a: num(a + b), vars: { c } },
  ]);
}
/** The pairs in A × B. */
export function productCount(r: Rng, w: PracticeWords): Part {
  const [m, n] = [r.int(3, 9), r.int(3, 9)];
  return countPart(w, `|A| = ${m},\\ |B| = ${n}.\\qquad |A \\times B| = \\,?`, m * n, [`|A \\times B| = |A| \\cdot |B| = ${m} \\cdot ${n} = ${m * n}`], [
    { id: "productAsSum", a: num(m + n), vars: { m, n } },
  ]);
}
/** The subsets of A. */
export function powerCount(r: Rng, w: PracticeWords): Part {
  const n = r.int(3, 7);
  const v = 2 ** n;
  return countPart(w, `|A| = ${n}.\\qquad |\\mathcal{P}(A)| = \\,?`, v, [`|\\mathcal{P}(A)| = 2^{${n}} = ${v}`], [{ id: "powerSetDouble", a: num(2 * n), vars: { n, v } }]);
}
/** |A ∪ B ∪ C| by inclusion and exclusion. */
export function union3Count(r: Rng, w: PracticeWords): Part {
  const [a, b, c, ab, ac, bc, abc] = Array.from({ length: 7 }, () => r.int(1, 6));
  const [A, B, C] = [a + ab + ac + abc, b + ab + bc + abc, c + ac + bc + abc];
  const [AB, AC, BC] = [ab + abc, ac + abc, bc + abc];
  const v = A + B + C - AB - AC - BC + abc;
  return countPart(
    w,
    `|A| = ${A},\\ |B| = ${B},\\ |C| = ${C},\\ |A \\cap B| = ${AB},\\ |A \\cap C| = ${AC},\\ |B \\cap C| = ${BC},\\ |A \\cap B \\cap C| = ${abc}.\\qquad |A \\cup B \\cup C| = \\,?`,
    v,
    [`|A \\cup B \\cup C| = |A| + |B| + |C| - |A \\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|`, `= ${A} + ${B} + ${C} - ${AB} - ${AC} - ${BC} + ${abc} = ${v}`],
    [{ id: "tripleMissed", a: num(v - abc), vars: { t: abc } }],
  );
}
/** The subsets of A × B. */
export function powerProductCount(r: Rng, w: PracticeWords): Part {
  const [m, n] = r.pick([
    [2, 2],
    [2, 3],
    [3, 2],
    [1, 4],
  ] as const);
  const v = 2 ** (m * n);
  return countPart(w, `|A| = ${m},\\ |B| = ${n}.\\qquad |\\mathcal{P}(A \\times B)| = \\,?`, v, [`|A \\times B| = ${m} \\cdot ${n} = ${m * n}`, `|\\mathcal{P}(A \\times B)| = 2^{${m * n}} = ${v}`]);
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const { A, B } = venn(r);
    return vennPart(A, B, r.pick(SET_OPS), w);
  }
  if (L === 2) {
    const k = r.int(0, 2);
    return k === 0 ? unionCount(r, w) : k === 1 ? productCount(r, w) : powerCount(r, w);
  }
  return r.next() < 0.7 ? union3Count(r, w) : powerProductCount(r, w);
};

export default gen;
