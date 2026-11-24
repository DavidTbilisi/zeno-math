// Direct and inverse proportion (Think Mathematics workbook 2A ch. 7; AoPS Prealgebra ch. 7): word problems where two
// quantities grow together (books and the stack's height) or one shrinks as the other grows (workers and days), worked
// through the amount for one or the product that stays the same (easy); y = kx and y = k/x from one pair of values,
// a table that shows which of the two it is, and a graph through the origin or a curve (medium); y in proportion to
// x², x³, √x or 1/x², x found back from y, and how y changes when x is scaled (hard). The usual slips are the answers:
// an inverse case worked as direct, a direct one as inverse, the power left out, and the square root forgotten.
//
// The word problems are told in sentences (WORD_STORY), so they can be marked before they are solved (wordMarks.ts,
// issue #582): what each says follows from the working, the amount for one or the product that stays the same.
import { C, esc, FONT, r2 } from "./chart";
import { markSentences, usesOf, type Clause, type MarkedSentence } from "./wordMarks";

type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
/** A number as the working shows it: to 2 decimal places, trailing zeros dropped. */
const dp = (v: number, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d);

export type ProportionMistake = "inverseAsDirect" | "directAsInverse" | "powerIgnored" | "noSquareRoot";
export type Trap = { id: ProportionMistake; v: number; vars: Record<string, string | number> };
export type Pic = { body: string; w: number; h: number };

/** The prompts, one per kind of question (the locale's `proportion` block); a word problem's in its sentences (WORD_STORY). */
export type ProportionWords = {
  books: readonly string[];
  dumplings: readonly string[];
  fuel: readonly string[];
  workers: readonly string[];
  pipes: readonly string[];
  speed: readonly string[];
  kDirect: string;
  kInverse: string;
  direct: string;
  inverse: string;
  table: string;
  graph: string;
  power: string;
  inversePower: string;
  findX: string;
  scaleDirect: string;
  scaleInverse: string;
};
export type ProportionKind = keyof ProportionWords;

export type ProportionQuestion = {
  kind: ProportionKind;
  vars: Record<string, string | number>;
  /** TeX under the prompt: the table, or "" when the prompt says it all. */
  q: string;
  /** The graph y against x through the marked point, on the graph questions. */
  graph: GraphFig | null;
  v: number;
  /** The answer as a fraction n/d in lowest terms (y scaled down by 1/4), else a number. */
  frac?: [number, number];
  traps: Trap[];
  steps: string[];
};

const keep = (v: number, traps: Trap[]) => traps.filter((t) => Number.isFinite(t.v) && t.v > 0 && Math.abs(t.v - v) > 0.02);
const divisorsIn = (n: number, lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((d) => n % d === 0);

/** Inverse worked as direct: y scaled by c/b as if it grew with x. */
const asDirect = (a: number, b: number, c: number, v: number): Trap => ({ id: "inverseAsDirect", v: (a * c) / b, vars: { x: dp((a * c) / b), p: `${b} × ${a}`, k: b * a, v: dp(v) } });
/** Direct worked as inverse: the product b × a divided by c. */
const asInverse = (a: number, b: number, c: number, v: number): Trap => ({ id: "directAsInverse", v: (a * b) / c, vars: { x: dp((a * b) / c), p: `${a} ÷ ${b}`, k: dp(a / b), v: dp(v) } });

// ---------- the graph ----------

/** y against x: a line through the origin (direct) or the curve y = k/x (inverse), through the marked point (b, a). */
export type GraphFig = { inverse: boolean; b: number; a: number };

function label(x: number, y: number, s: string, color: string = C.ink, anchor = "middle", size = 13) {
  return `<text x="${r2(x)}" y="${r2(y + size * 0.35)}" ${FONT} font-size="${size}" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
}

export function graphSvg(f: GraphFig): Pic {
  const [w, h] = [300, 240];
  const [ox, oy] = [44, 206];
  const [W, H] = [232, 180];
  // The marked point sits about two fifths of the way along each axis.
  const [xmax, ymax] = [f.b * 2.4, f.a * 2.4];
  const X = (x: number) => ox + (x / xmax) * W;
  const Y = (y: number) => oy - (y / ymax) * H;
  const k = f.inverse ? f.a * f.b : f.a / f.b;
  const parts = [
    `<path d="M${ox},${oy} H${ox + W + 8} M${ox},${oy} V${oy - H - 8}" stroke="${C.ink}" stroke-width="1.8" fill="none"/>`,
    `<path d="M${ox + W + 8},${oy} l-7,-4 v8 z M${ox},${oy - H - 8} l-4,7 h8 z" fill="${C.ink}"/>`,
    label(ox + W + 10, oy + 14, "x", C.ink, "middle", 14),
    label(ox - 12, oy - H - 8, "y", C.ink, "middle", 14),
    label(ox - 10, oy + 12, "O", C.ink, "middle", 12),
  ];
  if (f.inverse) {
    // From where the curve enters the top of the box to the right-hand end.
    const x0 = k / ymax;
    const pts = Array.from({ length: 61 }, (_, i) => x0 + ((xmax - x0) * i) / 60).map((x) => `${r2(X(x))},${r2(Y(k / x))}`);
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${C.blue}" stroke-width="2.6" stroke-linejoin="round"/>`);
  } else {
    const xEnd = Math.min(xmax, ymax / k);
    parts.push(`<path d="M${ox},${oy} L${r2(X(xEnd))},${r2(Y(k * xEnd))}" stroke="${C.blue}" stroke-width="2.6"/>`);
  }
  const [px, py] = [X(f.b), Y(f.a)];
  parts.push(`<path d="M${r2(px)},${oy} V${r2(py)} H${ox}" stroke="${C.grey}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>`);
  parts.push(`<circle cx="${r2(px)}" cy="${r2(py)}" r="4.5" fill="${C.orange}"/>`);
  parts.push(label(px, oy + 14, String(f.b)), label(ox - 6, py, String(f.a), C.ink, "end"));
  // Beside the point, off the line: below it on a rising line, above it on the falling curve.
  parts.push(label(px + 9, py + (f.inverse ? -12 : 13), `(${f.b}, ${f.a})`, C.orange, "start"));
  return { body: parts.join(""), w, h };
}

// ---------- level 1: in words ----------

export const WORD_KINDS = ["books", "dumplings", "fuel", "workers", "pipes", "speed"] as const;
export type WordKind = (typeof WORD_KINDS)[number];
/** Two quantities that grow together; the others are inverse. */
const DIRECT_WORDS: readonly WordKind[] = ["books", "dumplings", "fuel"];
/** Every word problem's sentences: n of one go with t of the other; m of the first go with how many? */
export const WORD_STORY: readonly Clause[] = [{ says: ["n", "t"] }, { asks: true, says: ["m"] }];
export const isWordKind = (k: ProportionKind): k is WordKind => (WORD_KINDS as readonly string[]).includes(k);

/** A word problem's answer from its numbers: through the amount for one (direct) or the product that stays the same. */
export const wordAnswer = (kind: WordKind, v: Record<string, number>): number => (DIRECT_WORDS.includes(kind) ? (v.t / v.n) * v.m : (v.n * v.t) / v.m);

/** A word problem's sentences filled in, each with its right mark (wordMarks.ts). */
export function wordSentences(q: ProportionQuestion, words: ProportionWords, fill: (template: string) => string): MarkedSentence[] {
  if (!isWordKind(q.kind)) return [];
  const kind = q.kind;
  const vars = q.vars as Record<string, number>;
  return markSentences(WORD_STORY, words[kind].map(fill), usesOf((v) => wordAnswer(kind, v), vars));
}

/** Level 1: a word problem, direct (the amount for one, then times) or inverse (the product, then divided). */
export function wordQuestion(next: Next): ProportionQuestion {
  const int = intOf(next);
  const kind = WORD_KINDS[int(0, 5)];
  if (kind === "books" || kind === "dumplings" || kind === "fuel") {
    // n of one for t of the other; m of the first for? The amount for one, u, is whole.
    const [n, u] = kind === "books" ? [int(5, 30), int(2, 4)] : kind === "dumplings" ? [int(2, 6), int(3, 9)] : [int(2, 8), int(8, 16)];
    let m: number;
    do m = kind === "books" ? int(5, 40) : int(3, 20);
    while (m === n);
    const [t, v] = [u * n, u * m];
    return { kind, vars: { n, t, m }, q: "", graph: null, v, traps: keep(v, [asInverse(t, n, m, v)]), steps: [`${t} \\div ${n} = ${u}`, `${u} \\times ${m} = ${v}`] };
  }
  // Inverse: n of one take t of the other, so m take n × t ÷ m (a whole number).
  for (;;) {
    const [n, t] = kind === "workers" ? [int(2, 12), int(2, 12)] : kind === "pipes" ? [int(2, 8), int(10, 60)] : [10 * int(3, 9), int(2, 6)];
    const P = n * t;
    const ms = (kind === "speed" ? divisorsIn(P, 3, 12).map((d) => 10 * d).filter((m) => P % m === 0) : divisorsIn(P, 2, kind === "pipes" ? 12 : 20)).filter((m) => m !== n);
    if (!ms.length) continue;
    const m = ms[int(0, ms.length - 1)];
    const v = P / m;
    return { kind, vars: { n, t, m }, q: "", graph: null, v, traps: keep(v, [asDirect(t, n, m, v)]), steps: [`${n} \\times ${t} = ${P}`, `${P} \\div ${m} = ${v}`] };
  }
}

// ---------- level 2: y = kx and y = k/x ----------

/** An inverse pair: k = a × b with y whole at x = c (c ≠ b). */
function inversePair(int: (lo: number, hi: number) => number) {
  for (;;) {
    const [b, a] = [int(2, 12), int(2, 12)];
    const K = a * b;
    const cs = divisorsIn(K, 2, 24).filter((c) => c !== b && c !== a);
    if (cs.length) return { a, b, K, c: cs[int(0, cs.length - 1)] };
  }
}
/** A direct pair: k whole, x = b and c different. */
function directPair(int: (lo: number, hi: number) => number) {
  const k = int(2, 9);
  const b = int(2, 12);
  let c: number;
  do c = int(2, 15);
  while (c === b);
  return { k, b, a: k * b, c };
}

/** Level 2: k, or y at another x, from one pair; from a table that shows which proportion it is; from a graph. */
export function algebraQuestion(next: Next): ProportionQuestion {
  const int = intOf(next);
  const kind = (["kDirect", "kInverse", "direct", "inverse", "table", "graph"] as const)[int(0, 5)];
  const inverse = kind === "kInverse" || kind === "inverse" ? true : kind === "kDirect" || kind === "direct" ? false : next() < 0.5;
  const pair = inverse ? inversePair(int) : directPair(int);
  const { a, b, c } = pair;
  const k = inverse ? a * b : a / b;
  const kLine = inverse ? `k = xy = ${b} \\times ${a} = ${k}` : `k = \\frac{y}{x} = \\frac{${a}}{${b}} = ${k}`;
  if (kind === "kDirect" || kind === "kInverse") {
    // k the wrong way: y ÷ x for an inverse case, x × y for a direct one.
    const traps = inverse ? [{ id: "inverseAsDirect" as const, v: a / b, vars: { x: dp(a / b), p: `${b} × ${a}`, k, v: k } }] : [{ id: "directAsInverse" as const, v: a * b, vars: { x: a * b, p: `${a} ÷ ${b}`, k, v: k } }];
    return { kind, vars: { a, b }, q: "", graph: null, v: k, traps: keep(k, traps), steps: [kLine] };
  }
  const v = inverse ? k / c : k * c;
  const yLine = inverse ? `y = \\frac{k}{x} = \\frac{${k}}{${c}} = ${v}` : `y = kx = ${k} \\times ${c} = ${v}`;
  const traps = keep(v, [inverse ? asDirect(a, b, c, v) : asInverse(a, b, c, v)]);
  if (kind === "table") {
    // Two pairs show which it is: y ÷ x the same (direct) or x × y the same (inverse). The third y is missing.
    let b2: number;
    do b2 = inverse ? divisorsIn(k, 1, 30)[int(0, divisorsIn(k, 1, 30).length - 1)] : int(1, 15);
    while (b2 === b || b2 === c);
    const a2 = inverse ? k / b2 : k * b2;
    const cols = [[b, a], [b2, a2], [c, "?"]].sort((p, q) => Number(p[0]) - Number(q[0]));
    const q = `\\begin{array}{c|ccc} x & ${cols.map((p) => p[0]).join(" & ")} \\\\ \\hline y & ${cols.map((p) => p[1]).join(" & ")} \\end{array}`;
    const check = inverse ? `${b} \\times ${a} = ${b2} \\times ${a2} = ${k}` : `\\frac{${a}}{${b}} = \\frac{${a2}}{${b2}} = ${k}`;
    return { kind, vars: { c }, q, graph: null, v, traps, steps: [check, yLine] };
  }
  if (kind === "graph") return { kind, vars: { c }, q: "", graph: { inverse, b, a }, v, traps, steps: [kLine, yLine] };
  return { kind, vars: { a, b, c }, q: "", graph: null, v, traps, steps: [kLine, yLine] };
}

// ---------- level 3: other forms ----------

const POWERS = { sq: { tex: "x^2", plain: "x²", f: (x: number) => x * x }, cube: { tex: "x^3", plain: "x³", f: (x: number) => x ** 3 }, root: { tex: "\\sqrt{x}", plain: "√x", f: Math.sqrt } };

/** Level 3: y in proportion to x², x³ or √x, or to 1/x²; x back from y; y's factor when x is scaled. */
export function powerQuestion(next: Next): ProportionQuestion {
  const int = intOf(next);
  const kind = (["power", "inversePower", "findX", "scaleDirect", "scaleInverse"] as const)[int(0, 4)];
  if (kind === "power") {
    const which = (["sq", "cube", "root"] as const)[int(0, 2)];
    const P = POWERS[which];
    // √x on perfect squares; x³ on small numbers.
    const xs = which === "root" ? [1, 4, 9, 16, 25, 36, 49, 64, 81, 100] : which === "cube" ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const k = int(2, which === "cube" ? 4 : 9);
    const b = xs[int(0, xs.length - 1)];
    let c: number;
    do c = xs[int(0, xs.length - 1)];
    while (c === b);
    const [a, v] = [k * P.f(b), k * P.f(c)];
    const fb = which === "root" ? `\\sqrt{${b}}` : `${b}^${which === "sq" ? 2 : 3}`;
    const fc = which === "root" ? `\\sqrt{${c}}` : `${c}^${which === "sq" ? 2 : 3}`;
    const traps = keep(v, [{ id: "powerIgnored", v: (a * c) / b, vars: { x: dp((a * c) / b), f: P.plain, v } }]);
    return { kind, vars: { f: P.plain, a, b, c }, q: "", graph: null, v, traps, steps: [`k = \\frac{y}{${P.tex}} = \\frac{${a}}{${fb}} = ${k}`, `y = k${P.tex} = ${k} \\times ${fc} = ${v}`] };
  }
  if (kind === "inversePower") {
    // k = a b² = v c²: a = c² m, v = b² m.
    const b = int(1, 6);
    let c: number;
    do c = int(1, 6);
    while (c === b);
    const m = int(1, 3);
    const [a, v, k] = [c * c * m, b * b * m, b * b * c * c * m];
    const traps = keep(v, [
      { id: "powerIgnored", v: (a * b) / c, vars: { x: dp((a * b) / c), f: "x²", v } },
      { id: "inverseAsDirect", v: (a * c * c) / (b * b), vars: { x: dp((a * c * c) / (b * b)), p: `${b}² × ${a}`, k, v } },
    ]);
    return { kind, vars: { a, b, c }, q: "", graph: null, v, traps, steps: [`k = x^2 y = ${b}^2 \\times ${a} = ${k}`, `y = \\frac{k}{x^2} = \\frac{${k}}{${c}^2} = ${v}`] };
  }
  if (kind === "findX") {
    // y = k x²: a at x = b, d at the x asked (c, positive).
    const k = int(2, 6);
    const b = int(1, 9);
    let c: number;
    do c = int(2, 12);
    while (c === b);
    const [a, d] = [k * b * b, k * c * c];
    const traps = keep(c, [
      { id: "noSquareRoot", v: c * c, vars: { x: c * c, v: c } },
      { id: "powerIgnored", v: (d * b) / a, vars: { x: dp((d * b) / a), f: "x²", v: c } },
    ]);
    return { kind, vars: { a, b, d }, q: "", graph: null, v: c, traps, steps: [`k = \\frac{y}{x^2} = \\frac{${a}}{${b}^2} = ${k}`, `x^2 = \\frac{${d}}{${k}} = ${c * c}`, `x = \\sqrt{${c * c}} = ${c}`] };
  }
  // x multiplied by s: y by s^n (direct) or 1/s^n (inverse).
  const inverse = kind === "scaleInverse";
  const sq = inverse || next() < 0.6;
  const n = sq ? 2 : 3;
  const s = inverse ? int(2, 5) : sq ? int(2, 5) : int(2, 3);
  const f = n === 2 ? "x²" : "x³";
  const big = s ** n;
  const v = inverse ? 1 / big : big;
  const steps = inverse ? [`y = \\frac{k}{(${s}x)^2} = \\frac{k}{${big}x^2} = \\frac{1}{${big}} \\cdot \\frac{k}{x^2}`] : [`y = k(${s}x)^${n} = ${big}\\,kx^${n}`];
  const traps = keep(v, [
    { id: "powerIgnored", v: inverse ? 1 / s : s, vars: { x: inverse ? `1/${s}` : s, f, v: inverse ? `1/${big}` : big } },
    ...(inverse ? [{ id: "inverseAsDirect" as const, v: big, vars: { x: big, p: `x² × y`, k: "k", v: `1/${big}` } }] : []),
  ]);
  // Fractions stay fractions (1/4 is not typed as 0.25 by everyone, and 1/9 has no short decimal).
  return { kind, vars: { f, s }, q: "", graph: null, v, frac: inverse ? [1, big] : undefined, traps, steps };
}
