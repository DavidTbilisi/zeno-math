// Practice: the projective line and plane. Easy turns homogeneous coordinates [a : b : c] into a point (x, y) (not
// divided by c, divided the wrong way, named); medium finds where two lines meet by the cross product of their
// homogeneous coordinates (not divided by the last entry, a sign slip, named) or the cross-ratio of four points on a
// line (upside down, the pairs swapped, named); hard finds the harmonic conjugate (the midpoint, C reflected in it,
// named) or the image of a point under a projective map of the line (extrapolated as if the map were affine, named).
import { exact, type NumSlip } from "../calculusTwo";
import { crossRatio, harmonicConjugate, meet, projectivity } from "../higherGeometry";
import { F, coefTex, sumTex } from "../pdes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const nonzero = (r: Rng, lo: number, hi: number) => {
  let v: number;
  do v = r.int(lo, hi);
  while (v === 0);
  return v;
};
const neg = (v: number) => (v < 0 ? `(${v})` : String(v));
/** Distinct whole numbers in [lo, hi]. */
function distinct(r: Rng, k: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (out.length < k) {
    const v = r.int(lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function homogeneousPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick([-4, -3, -2, 2, 3, 4]);
  let a: number, b: number;
  do {
    a = nonzero(r, -9, 9);
    b = nonzero(r, -9, 9);
  } while (Math.abs(a) === Math.abs(c) || Math.abs(b) === Math.abs(c));
  const askX = r.next() < 0.5;
  const top = askX ? a : b;
  const v = F(top, c);
  return {
    prompt: fill(w.hg.prompt.homogeneous, { v: askX ? "x" : "y" }),
    q: `[${a} : ${b} : ${c}]`,
    ...exact(v, [["homogeneousNotDivided", top], ["homogeneousDividedWrong", F(c, top)]]),
    steps: [`(x, y) = \\left(\\frac{${a}}{${c}}, \\frac{${b}}{${c}}\\right) = \\left(${F(a, c).tex()}, ${F(b, c).tex()}\\right)`],
  };
}

const lineTex = ([a, b, c]: [number, number, number]) => `${sumTex([coefTex(a, "x"), coefTex(b, "y"), c === 0 ? "" : String(c)])} = 0`;

function meetPart(r: Rng, w: PracticeWords): Part {
  let l: [number, number, number], m: [number, number, number], X: number, Y: number, Z: number;
  do {
    l = [r.int(-4, 4), r.int(-4, 4), r.int(-5, 5)];
    m = [r.int(-4, 4), r.int(-4, 4), r.int(-5, 5)];
    [X, Y, Z] = meet(l, m);
  } while (Z === 0 || X === 0 || Math.abs(Z) === 1 || l[0] * l[1] * m[0] * m[1] === 0);
  const x = F(X, Z);
  return {
    prompt: w.hg.prompt.meet,
    q: `${lineTex(l)}, \\quad ${lineTex(m)}`,
    ...exact(x, [["homogeneousNotDivided", X], ["crossProductSignSlip", x.neg()]]),
    steps: [
      `[${l.join(" : ")}] \\times [${m.join(" : ")}] = [${X} : ${Y} : ${Z}]`,
      `x = \\frac{${X}}{${Z}} = ${x.tex()}`,
    ],
  };
}

function crossPart(r: Rng, w: PracticeWords): Part {
  let pts: number[], v: ReturnType<typeof crossRatio>;
  do {
    pts = distinct(r, 4, -6, 6);
    v = crossRatio(F(pts[0]), F(pts[1]), F(pts[2]), F(pts[3]));
  } while (Math.abs(v.toNumber()) === 1);
  const [a, b, c, d] = pts;
  const slips: NumSlip[] = [["crossRatioInverted", F(1).div(v)], ["crossRatioPairsSwapped", F(1).sub(v)]];
  return {
    prompt: w.hg.prompt.crossRatio,
    q: `A = ${a}, \\quad B = ${b}, \\quad C = ${c}, \\quad D = ${d}`,
    ...exact(v, slips),
    steps: [
      `(A, B; C, D) = \\frac{(c - a)(d - b)}{(c - b)(d - a)} = \\frac{(${c} - ${neg(a)})(${d} - ${neg(b)})}{(${c} - ${neg(b)})(${d} - ${neg(a)})} = \\frac{${(c - a) * (d - b)}}{${(c - b) * (d - a)}} = ${v.tex()}`,
    ],
  };
}

function harmonicPart(r: Rng, w: PracticeWords): Part {
  let pts: number[];
  do pts = distinct(r, 3, -6, 6);
  while (2 * pts[2] === pts[0] + pts[1]);
  const [a, b, c] = pts;
  const d = harmonicConjugate(F(a), F(b), F(c));
  return {
    prompt: w.hg.prompt.harmonic,
    q: `A = ${a}, \\quad B = ${b}, \\quad C = ${c}`,
    ...exact(d, [["harmonicMidpoint", F(a + b, 2)], ["harmonicReflection", a + b - c]]),
    steps: [
      `\\frac{(c - a)(d - b)}{(c - b)(d - a)} = -1`,
      `d = \\frac{a(c - b) + b(c - a)}{2c - a - b} = \\frac{${a * (c - b) + b * (c - a)}}{${2 * c - a - b}} = ${d.tex()}`,
    ],
  };
}

function projectivityPart(r: Rng, w: PracticeWords): Part {
  let pts: number[], x: number, map: ReturnType<typeof projectivity>;
  do {
    pts = distinct(r, 3, -5, 5);
    x = r.pick([2, 3, -1]);
    map = projectivity(F(pts[0]), F(pts[1]), F(pts[2]));
  } while (map.t.mul(F(x)).add(F(1)).isZero());
  const [p, q, s] = pts;
  const v = map.at(F(x));
  return {
    prompt: fill(w.hg.prompt.projectivity, { x }),
    q: `0 \\mapsto ${p}, \\quad 1 \\mapsto ${q}, \\quad \\infty \\mapsto ${s}`,
    ...exact(v, [["projectivityLinear", p + x * (q - p)]]),
    steps: [
      `f(x) = \\frac{${s}tx + ${neg(p)}}{tx + 1}, \\quad f(1) = ${q}: \\quad t = \\frac{${q} - ${neg(p)}}{${s} - ${neg(q)}} = ${map.t.tex()}`,
      `f(${x}) = ${v.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return homogeneousPart(r, w);
  if (L === 2) return r.next() < 0.4 ? meetPart(r, w) : crossPart(r, w);
  return r.next() < 0.5 ? harmonicPart(r, w) : projectivityPart(r, w);
};

export default gen;
