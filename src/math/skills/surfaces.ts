// Practice: surfaces z = f(x, y). Easy finds a coefficient of the tangent plane z = Ax + By + C at a point (f itself
// for C, the shift's sign flipped, f_y for A, named); medium finds E, F or G of the first fundamental form (the 1 left
// off, 1 added to F, named) or the area element √(EG − F²) (the root left off, the 1 left out, named); hard finds the
// Gaussian curvature at the origin (the denominator not squared, the sign of f_xy² flipped, the coefficients for the
// second derivatives, named).
import { exact, type NumSlip } from "../calculusTwo";
import { gaussian, quadricAt, type Quadric } from "../higherGeometry";
import { F, coefTex, sumTex } from "../pdes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const neg = (v: number) => (v < 0 ? `(${v})` : String(v));
const fTex = (f: Quadric) =>
  `z = ${sumTex([coefTex(f.a, "x^{2}"), coefTex(f.b, "xy"), coefTex(f.c, "y^{2}"), coefTex(f.p, "x"), coefTex(f.q, "y"), f.d === 0 ? "" : String(f.d)])}`;
const partials = (f: Quadric) => [
  `f_{x} = ${sumTex([coefTex(2 * f.a, "x"), coefTex(f.b, "y"), f.p === 0 ? "" : String(f.p)])}`,
  `f_{y} = ${sumTex([coefTex(f.b, "x"), coefTex(2 * f.c, "y"), f.q === 0 ? "" : String(f.q)])}`,
];

/** A quadric without linear terms and a point where both partial derivatives are non-zero. */
function drawPoint(r: Rng) {
  let f: Quadric, x: number, y: number, at: ReturnType<typeof quadricAt>;
  do {
    f = { a: r.int(-3, 3), b: r.int(-3, 3), c: r.int(-3, 3), p: 0, q: 0, d: r.int(-5, 5) };
    x = r.int(-2, 2);
    y = r.int(-2, 2);
    at = quadricAt(f, x, y);
  } while (at.fx === 0 || at.fy === 0 || at.fx === at.fy || at.fx * x + at.fy * y === 0);
  return { f, x, y, ...at };
}

function tangentPart(r: Rng, w: PracticeWords): Part {
  const { f, x, y, z, fx, fy } = drawPoint(r);
  const C = z - fx * x - fy * y;
  const askC = r.next() < 0.6;
  return {
    prompt: fill(w.hg.prompt.tangentPlane, { x, y, c: askC ? "C" : "A" }),
    q: fTex(f),
    ...(askC ? exact(F(C), [["tangentPlaneNoShift", z], ["tangentPlaneSignSlip", z + fx * x + fy * y]]) : exact(F(fx), [["partialWrongVariable", fy]])),
    steps: [
      ...partials(f),
      `f(${x}, ${y}) = ${z}, \\quad f_{x}(${x}, ${y}) = ${fx}, \\quad f_{y}(${x}, ${y}) = ${fy}`,
      `z = ${z} + ${neg(fx)}(x - ${neg(x)}) + ${neg(fy)}(y - ${neg(y)}) = ${sumTex([coefTex(fx, "x"), coefTex(fy, "y"), C === 0 ? "" : String(C)])}`,
    ],
  };
}

function formPart(r: Rng, w: PracticeWords): Part {
  const { f, x, y, fx, fy } = drawPoint(r);
  const which = r.pick(["E", "F", "G"] as const);
  const v = which === "E" ? 1 + fx * fx : which === "F" ? fx * fy : 1 + fy * fy;
  const slips: NumSlip[] = which === "E" ? [["firstFormNoOne", fx * fx]] : which === "F" ? [["firstFormFOne", 1 + fx * fy]] : [["firstFormNoOne", fy * fy]];
  return {
    prompt: fill(w.hg.prompt.firstForm, { x, y, c: which }),
    q: fTex(f),
    ...exact(F(v), slips),
    steps: [
      ...partials(f),
      `f_{x}(${x}, ${y}) = ${fx}, \\quad f_{y}(${x}, ${y}) = ${fy}`,
      which === "E" ? `E = 1 + f_{x}^{2} = ${v}` : which === "F" ? `F = f_{x} f_{y} = ${v}` : `G = 1 + f_{y}^{2} = ${v}`,
    ],
  };
}

// Gradients (p, q) at the origin with 1 + p² + q² a square.
const SQUARE_GRADIENTS: [number, number, number][] = [[2, 2, 3], [4, 8, 9], [8, 4, 9]];

function areaPart(r: Rng, w: PracticeWords): Part {
  const [gp, gq, h] = r.pick(SQUARE_GRADIENTS);
  const p = r.next() < 0.5 ? -gp : gp;
  const q = r.next() < 0.5 ? -gq : gq;
  const f: Quadric = { a: r.int(-3, 3), b: r.int(-3, 3), c: r.int(-3, 3), p, q, d: 0 };
  return {
    prompt: w.hg.prompt.areaElement,
    q: fTex(f),
    ...exact(F(h), [["areaElementNoRoot", h * h], ["areaElementNoOne", Math.hypot(p, q)]]),
    steps: [
      `f_{x}(0, 0) = ${p}, \\quad f_{y}(0, 0) = ${q}`,
      `E = ${1 + p * p}, \\quad F = ${p * q}, \\quad G = ${1 + q * q}`,
      `\\sqrt{EG - F^{2}} = \\sqrt{1 + f_{x}^{2} + f_{y}^{2}} = \\sqrt{${h * h}} = ${h}`,
    ],
  };
}

function gaussianPart(r: Rng, w: PracticeWords): Part {
  const [p, q] = r.pick([[0, 0], [0, 0], [2, 2], [2, -2], [-2, 2], [-2, -2]]);
  let f: Quadric;
  do f = { a: r.int(-3, 3), b: r.int(-3, 3), c: r.int(-3, 3), p, q, d: 0 };
  while (4 * f.a * f.c - f.b * f.b === 0 || f.b === 0);
  const den = 1 + p * p + q * q;
  const top = 4 * f.a * f.c - f.b * f.b;
  const K = gaussian(f, p, q);
  return {
    prompt: w.hg.prompt.gaussian,
    q: fTex(f),
    ...exact(K, [["gaussianNotSquared", F(top, den)], ["gaussianMixedSign", F(4 * f.a * f.c + f.b * f.b, den * den)], ["hessianFromCoefficients", F(f.a * f.c - f.b * f.b, den * den)]]),
    steps: [
      `f_{x} = ${p}, \\quad f_{y} = ${q}, \\quad f_{xx} = ${2 * f.a}, \\quad f_{xy} = ${f.b}, \\quad f_{yy} = ${2 * f.c}`,
      `K = \\frac{f_{xx} f_{yy} - f_{xy}^{2}}{(1 + f_{x}^{2} + f_{y}^{2})^{2}} = \\frac{${2 * f.a} \\cdot ${neg(2 * f.c)} - ${neg(f.b)}^{2}}{${den}^{2}} = ${K.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? tangentPart(r, w) : L === 2 ? (r.next() < 0.6 ? formPart(r, w) : areaPart(r, w)) : gaussianPart(r, w));

export default gen;
