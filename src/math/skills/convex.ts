// Practice: convex sets, convex functions and the KKT conditions. Easy says whether a function of one variable is
// convex, concave or neither (the two swapped, a corner taken to spoil convexity, an inflection point ignored, named)
// or whether a set in the plane is convex (a circle or ring taken for a disc, a union taken to be convex, the regions
// above and below a graph swapped, named); medium reads the Hessian of ax² + bxy + cy² + px + qy (the diagonal alone,
// its entries not doubled, convex and concave swapped, named) or finds the largest b that keeps it convex (not
// doubled, not rooted, named); hard minimises the squared distance to (a, b) over x + y ≤ c and finds the KKT
// multiplier (halved, complementary slackness ignored, named) or the least value (the constraint ignored, not halved,
// named).
import { F, exact, minusA, pickOf, word } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { kkt, quadShape } from "../optimisation";
import { coefTex, sumTex } from "../pdes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

type Slips = [MistakeId, number][];
/** f, where it lives, 0 convex, 1 concave, 2 neither, the named slips, and why. */
const FUNCTIONS: { f: string; shape: 0 | 1 | 2; slips: Slips; why: string }[] = [
  { f: "x^{2}, \\quad x \\in \\mathbb{R}", shape: 0, slips: [["convexConcaveSwapped", 1]], why: "f''(x) = 2 \\ge 0" },
  { f: "-x^{2}, \\quad x \\in \\mathbb{R}", shape: 1, slips: [["convexConcaveSwapped", 0]], why: "f''(x) = -2 \\le 0" },
  { f: "e^{x}, \\quad x \\in \\mathbb{R}", shape: 0, slips: [["convexConcaveSwapped", 1]], why: "f''(x) = e^{x} > 0" },
  { f: "-e^{x}, \\quad x \\in \\mathbb{R}", shape: 1, slips: [["convexConcaveSwapped", 0]], why: "f''(x) = -e^{x} < 0" },
  { f: "\\ln x, \\quad x > 0", shape: 1, slips: [["convexConcaveSwapped", 0]], why: "f''(x) = -\\frac{1}{x^{2}} < 0" },
  { f: "\\sqrt{x}, \\quad x > 0", shape: 1, slips: [["convexConcaveSwapped", 0]], why: "f''(x) = -\\frac{1}{4x^{3/2}} < 0" },
  { f: "\\frac{1}{x}, \\quad x > 0", shape: 0, slips: [["convexConcaveSwapped", 1]], why: "f''(x) = \\frac{2}{x^{3}} > 0" },
  { f: "x^{4}, \\quad x \\in \\mathbb{R}", shape: 0, slips: [["convexConcaveSwapped", 1]], why: "f''(x) = 12x^{2} \\ge 0" },
  { f: "|x|, \\quad x \\in \\mathbb{R}", shape: 0, slips: [["nonSmoothNotConvex", 2]], why: "|tu + (1 - t)v| \\le t|u| + (1 - t)|v|" },
  { f: "-|x|, \\quad x \\in \\mathbb{R}", shape: 1, slips: [["nonSmoothNotConvex", 2]], why: "-|tu + (1 - t)v| \\ge -t|u| - (1 - t)|v|" },
  { f: "\\max(x, 2 - x), \\quad x \\in \\mathbb{R}", shape: 0, slips: [["nonSmoothNotConvex", 2]], why: "\\max(\\ell_{1}, \\ell_{2}), \\quad \\ell_{1}, \\ell_{2} \\ \\mathrm{linear}" },
  { f: "x^{3}, \\quad x \\in \\mathbb{R}", shape: 2, slips: [["inflectionIgnored", 0]], why: "f''(x) = 6x, \\quad f''(-1) < 0 < f''(1)" },
  { f: "\\sin x, \\quad x \\in \\mathbb{R}", shape: 2, slips: [["inflectionIgnored", 0]], why: "f''(x) = -\\sin x, \\quad f''\\left(\\frac{\\pi}{2}\\right) < 0 < f''\\left(-\\frac{\\pi}{2}\\right)" },
  { f: "x^{3}, \\quad x \\ge 0", shape: 0, slips: [["convexConcaveSwapped", 1]], why: "f''(x) = 6x \\ge 0" },
];

/** A set in the plane, whether it is convex, the named slips (0 yes, 1 no), and why. */
const SETS: { s: string; convex: boolean; slips: Slips; why: string }[] = [
  { s: "\\{(x, y) : x^{2} + y^{2} \\le 4\\}", convex: true, slips: [], why: "\\|tu + (1 - t)v\\| \\le t\\|u\\| + (1 - t)\\|v\\| \\le 2" },
  { s: "\\{(x, y) : x^{2} + y^{2} = 4\\}", convex: false, slips: [["circleAsDisc", 0]], why: "(2, 0), (-2, 0) \\to (0, 0), \\quad 0 \\ne 4" },
  { s: "\\{(x, y) : 1 \\le x^{2} + y^{2} \\le 4\\}", convex: false, slips: [["circleAsDisc", 0]], why: "\\left(\\frac{3}{2}, 0\\right), \\left(-\\frac{3}{2}, 0\\right) \\to (0, 0), \\quad 0 < 1" },
  { s: "\\{x^{2} + y^{2} \\le 1\\} \\cup \\{(x - 3)^{2} + y^{2} \\le 1\\}", convex: false, slips: [["unionConvex", 0]], why: "(0, 0), (3, 0) \\to \\left(\\frac{3}{2}, 0\\right)" },
  { s: "\\{(x, y) : x \\le 0\\} \\cup \\{(x, y) : y \\le 0\\}", convex: false, slips: [["unionConvex", 0]], why: "(-1, 2), (2, -1) \\to \\left(\\frac{1}{2}, \\frac{1}{2}\\right)" },
  { s: "\\{(x, y) : x + y \\le 2, \\ x \\ge 0, \\ y \\ge 0\\}", convex: true, slips: [], why: "\\{x + y \\le 2\\} \\cap \\{x \\ge 0\\} \\cap \\{y \\ge 0\\}" },
  { s: "\\{(x, y) : y \\ge x^{2}\\}", convex: true, slips: [["epigraphSwapped", 1]], why: "f(x) = x^{2}, \\quad f'' = 2 \\ge 0" },
  { s: "\\{(x, y) : y \\le x^{2}\\}", convex: false, slips: [["epigraphSwapped", 0]], why: "(-2, 3), (2, 3) \\to (0, 3), \\quad 3 > 0" },
  { s: "\\{(x, y) : y \\le -x^{2}\\}", convex: true, slips: [["epigraphSwapped", 1]], why: "f(x) = -x^{2}, \\quad f'' = -2 \\le 0" },
  { s: "\\{(x, y) : xy \\ge 1, \\ x > 0\\}", convex: true, slips: [], why: "y \\ge \\frac{1}{x}, \\quad \\left(\\frac{1}{x}\\right)'' = \\frac{2}{x^{3}} > 0" },
];

function functionPart(r: Rng, w: PracticeWords): Part {
  const f = r.pick(FUNCTIONS);
  const options = [word(w.opt.shape.convex), word(w.opt.shape.concave), word(w.opt.shape.neither)];
  return { prompt: w.opt.prompt.convexFn, q: `f(x) = ${f.f}`, ...pickOf(options, f.shape, f.slips), steps: [f.why] };
}

function setPart(r: Rng, w: PracticeWords): Part {
  const s = r.pick(SETS);
  const options = [word(w.opt.convexSet.yes), word(w.opt.convexSet.no)];
  return { prompt: w.opt.prompt.convexSet, q: `S = ${s.s}`, ...pickOf(options, s.convex ? 0 : 1, s.slips), steps: [s.why] };
}

const quadTex = (a: number, b: string | number, c: number, p = 0, q = 0) =>
  sumTex([coefTex(a, "x^{2}"), typeof b === "string" ? `${b}xy` : coefTex(b, "xy"), coefTex(c, "y^{2}"), coefTex(p, "x"), coefTex(q, "y")]);

function quadPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  let a: number, b: number, c: number;
  for (;;) {
    a = r.int(1, 4);
    c = r.int(1, 4);
    b = r.int(1, 8) * r.sign();
    // 0: convex although b² > ac (the Hessian's entries not doubled would say neither); 1: neither though a, c > 0; 2: concave.
    if (kind === 0 && b * b > a * c && b * b <= 4 * a * c) break;
    if (kind === 1 && b * b > 4 * a * c) break;
    if (kind === 2 && b * b <= 4 * a * c) {
      a = -a;
      c = -c;
      break;
    }
  }
  const shape = quadShape(a, b, c);
  const det = 4 * a * c - b * b;
  const slips: Slips = kind === 0 ? [["hessianNotDoubled", 2]] : kind === 1 ? [["diagonalOnlyConvex", 0]] : [["convexConcaveSwapped", 0]];
  const options = [word(w.opt.shape.convex), word(w.opt.shape.concave), word(w.opt.shape.neither)];
  return {
    prompt: w.opt.prompt.quadForm,
    q: `f(x, y) = ${quadTex(a, b, c, r.int(-3, 3), r.int(-3, 3))}`,
    ...pickOf(options, shape, slips),
    steps: [
      `H = \\begin{pmatrix} ${2 * a} & ${b} \\\\ ${b} & ${2 * c} \\end{pmatrix}, \\quad \\det H = ${2 * a} \\cdot ${2 * c} - ${b < 0 ? `(${b})` : b}^{2} = ${det}`,
      det < 0 ? `\\det H < 0` : a > 0 ? `${2 * a} > 0, \\quad \\det H \\ge 0` : `${2 * a} < 0, \\quad \\det H \\ge 0`,
    ],
  };
}

const SQUARES: [number, number][] = [[1, 1], [1, 4], [4, 1], [2, 2], [1, 9], [9, 1], [2, 8], [8, 2], [3, 3], [4, 4], [4, 9], [9, 4], [3, 12]];

function largestBPart(r: Rng, w: PracticeWords): Part {
  const [a, c] = r.pick(SQUARES);
  const root = Math.round(Math.sqrt(a * c));
  return {
    prompt: w.opt.prompt.largestB,
    q: `f(x, y) = ${quadTex(a, "b", c)}`,
    ...exact(F(2 * root), [["hessianNotDoubled", root], ["boundNotRooted", 4 * a * c]]),
    steps: [`H = \\begin{pmatrix} ${2 * a} & b \\\\ b & ${2 * c} \\end{pmatrix}, \\quad \\det H = ${4 * a * c} - b^{2} \\ge 0`, `b^{2} \\le ${4 * a * c}, \\quad b \\le ${2 * root}`],
  };
}

/** (x − a)², or x² when a is 0; and 2(x − a), or 2x. */
const sq = (a: number, v: string) => (a === 0 ? `${v}^{2}` : `(${minusA(a, v)})^{2}`);
const twice = (a: number, v: string) => (a === 0 ? `2${v}` : `2(${minusA(a, v)})`);
const stationarity = (a: number, b: number) => `${twice(a, "x")} + \\lambda = 0, \\quad ${twice(b, "y")} + \\lambda = 0`;

function kktQ(a: number, b: number, c: number) {
  return `\\min\\ ${sq(a, "x")} + ${sq(b, "y")}, \\quad x + y \\le ${c}`;
}

function multiplierPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-2, 5);
  const b = r.int(-2, 5);
  const active = r.next() < 0.7;
  const c = active ? a + b - r.int(1, 6) : a + b + r.int(1, 4);
  const k = kkt(a, b, c);
  return {
    prompt: w.opt.prompt.kktMultiplier,
    q: kktQ(a, b, c),
    ...(active
      ? exact(F(k.lambda), [["kktHalfMultiplier", F(k.lambda, 2)]])
      : exact(F(0), [["slacknessIgnored", a + b - c]])),
    steps: active
      ? [stationarity(a, b), `x + y = ${a + b} - \\lambda = ${c}`, `\\lambda = ${k.lambda} \\ge 0`]
      : [`(${a}, ${b}): \\ ${a} + ${b < 0 ? `(${b})` : b} = ${a + b} < ${c}`, `\\lambda (x + y - ${c < 0 ? `(${c})` : c}) = 0 \\implies \\lambda = 0`],
  };
}

function valuePart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-2, 5);
  const b = r.int(-2, 5);
  const c = a + b - r.int(1, 6);
  const k = kkt(a, b, c);
  return {
    prompt: w.opt.prompt.kktValue,
    q: kktQ(a, b, c),
    ...exact(k.value, [["kktUnconstrained", 0], ["projectionNotHalved", k.lambda * k.lambda]]),
    steps: [
      stationarity(a, b),
      `\\lambda = ${a + b} - ${c < 0 ? `(${c})` : c} = ${k.lambda}, \\quad x = ${k.x.tex()}, \\quad y = ${k.y.tex()}`,
      `\\left(${k.x.sub(F(a)).tex()}\\right)^{2} + \\left(${k.y.sub(F(b)).tex()}\\right)^{2} = ${k.value.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? functionPart(r, w) : setPart(r, w);
  if (L === 2) return r.next() < 0.5 ? quadPart(r, w) : largestBPart(r, w);
  return r.next() < 0.5 ? multiplierPart(r, w) : valuePart(r, w);
};

export default gen;
