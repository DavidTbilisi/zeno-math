// Practice: Extrema in several variables. Easy finds the critical point of a quadratic in x and y (the xy term left
// out of both derivatives, named); medium classifies a critical point by the second-derivative test (the sign of fₓₓ
// read before D, or max and min swapped, named), or the Hessian matrix at a point (the mixed entries doubled, or the
// cubic terms read at the origin, named); hard is a largest value under a constraint by Lagrange multipliers
// (λ given for the value, or the smallest value, named).
import { exact, pickOf, word, F } from "../calculusTwo";
import { matOf, tup, vecOf } from "../linearAlgebra";
import { M } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import { fill } from "../text";
import { par, type Poly, polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** ax² + bxy + cy² + dx + ey with its critical point at (p, q). */
function quadratic(a: number, b: number, c: number, p: number, q: number): Poly {
  return [term(a, 2), term(b, 1, 1), term(c, 0, 2), term(-(2 * a * p + b * q), 1), term(-(b * p + 2 * c * q), 0, 1)];
}

/** The critical point. */
function criticalPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a, b, c, p, q] = [r.nz(-3, 3), r.nz(-4, 4), r.nz(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    if (4 * a * c === b * b) continue;
    const [dx, ey] = [-(2 * a * p + b * q), -(b * p + 2 * c * q)];
    // The xy term left out: 2ax + d = 0 and 2cy + e = 0.
    const slip = [-dx / (2 * a), -ey / (2 * c)];
    if (slip[0] === p && slip[1] === q) continue;
    return {
      prompt: w.vcalc.prompt.critical,
      q: `f(x, y) = ${polyTex(quadratic(a, b, c, p, q))}`,
      ...vecOf([F(p), F(q)], [["otherVariableZero", slip]], "point"),
      show: tup([p, q]),
      steps: [
        `f_{x} = ${polyTex([term(2 * a, 1), term(b, 0, 1), term(dx, 0)])} = 0, \\quad f_{y} = ${polyTex([term(b, 1), term(2 * c, 0, 1), term(ey, 0)])} = 0`,
        `(x, y) = ${tup([p, q])}`,
      ],
    };
  }
}

// D = 4ac − b² = 0 for these: the test does not decide.
const FLAT: [number, number, number][] = [[1, 2, 1], [1, -2, 1], [1, 4, 4], [2, 4, 2], [-1, 2, -1], [-1, -2, -1], [4, 4, 1], [-4, 4, -1]];

/** A critical point classified by D = fₓₓf_yy − fₓᵧ². */
function classifyPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 3); // 0 min, 1 max, 2 saddle, 3 the test fails
  let [a, b, c] = [0, 0, 0];
  if (kind === 3) [a, b, c] = r.pick(FLAT);
  else
    for (;;) {
      [a, b, c] = [r.nz(-3, 3), r.nz(-4, 4), r.nz(-3, 3)];
      const D = 4 * a * c - b * b;
      if (kind === 2 ? D < 0 : D > 0 && (kind === 0) === a > 0) break;
    }
  const [p, q] = [r.int(-2, 2), r.int(-2, 2)];
  const k = w.vcalc.kinds;
  const options = [word(k.min), word(k.max), word(k.saddle), word(k.inconclusive)];
  const byFxx = a > 0 ? 0 : 1;
  const slips: [MistakeId, number][] =
    kind === 0 ? [["hessianSignsSwapped", 1]] : kind === 1 ? [["hessianSignsSwapped", 0]] : [["fxxAloneDecides", byFxx]];
  const D = 4 * a * c - b * b;
  return {
    prompt: fill(w.vcalc.prompt.classify, { x: p, y: q }),
    q: `f(x, y) = ${polyTex(quadratic(a, b, c, p, q))}`,
    ...pickOf(options, kind, slips),
    steps: [
      `f_{xx} = ${2 * a}, \\quad f_{yy} = ${2 * c}, \\quad f_{xy} = ${b}`,
      `D = f_{xx}f_{yy} - f_{xy}^{2} = ${2 * a} \\cdot ${par(2 * c)} - ${par(b)}^{2} = ${D}${D < 0 ? " < 0" : D === 0 ? "" : ` > 0, \\; f_{xx} ${a > 0 ? ">" : "<"} 0`}`,
      `\\text{${options[kind].text}}`,
    ],
  };
}

const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13]] as const;

/** The largest value of ax + by on a circle, or of xy on a line. */
function lagrangePart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.6) {
    const [u, v, L] = r.pick(TRIPLES);
    const [a, b] = (r.next() < 0.5 ? [u, v] : [v, u]).map((x) => x * r.sign());
    const R = r.int(1, 3);
    const lambda = F(L, 2 * R);
    return {
      prompt: w.vcalc.prompt.lagrange,
      q: `f(x, y) = ${polyTex([term(a, 1), term(b, 0, 1)])}, \\quad x^{2} + y^{2} = ${R * R}`,
      ...exact(F(L * R), [["gaveLambda", lambda], ["minForMax", -L * R]]),
      steps: [
        `\\nabla f = \\lambda \\nabla g: \\quad ${a} = 2\\lambda x, \\quad ${b} = 2\\lambda y`,
        `x = \\frac{${a}}{2\\lambda}, \\; y = \\frac{${b}}{2\\lambda}, \\quad x^{2} + y^{2} = \\frac{${L * L}}{4\\lambda^{2}} = ${R * R} \\Rightarrow \\lambda = ${lambda.tex()}`,
        `f = ${a}x + ${par(b)}y = \\frac{${L * L}}{2\\lambda} = ${L * R}`,
      ],
    };
  }
  let [p, q, k] = [r.int(1, 3), r.int(1, 3), r.int(1, 3)];
  while (p * q * k === 1) [p, q, k] = [r.int(1, 3), r.int(1, 3), r.int(1, 3)];
  const c = 2 * p * q * k;
  return {
    prompt: w.vcalc.prompt.lagrange,
    q: `f(x, y) = xy, \\quad ${polyTex([term(p, 1), term(q, 0, 1)])} = ${c}`,
    ...exact(F(p * q * k * k), [["gaveLambda", k]]),
    steps: [
      `\\nabla f = \\lambda \\nabla g: \\quad y = ${p === 1 ? "" : p}\\lambda, \\quad x = ${q === 1 ? "" : q}\\lambda`,
      `${p === 1 ? "" : p}x + ${q === 1 ? "" : q}y = ${2 * p * q}\\lambda = ${c} \\Rightarrow \\lambda = ${k}, \\quad x = ${q * k}, \\; y = ${p * k}`,
      `f = ${q * k} \\cdot ${p * k} = ${p * q * k * k}`,
    ],
  };
}

/** The Hessian of px³ + ax² + bxy + cy² + qy³ at a point. */
function hessianPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [p, a, b, c, q] = [r.nz(-2, 2), r.nz(-3, 3), r.nz(-4, 4), r.nz(-3, 3), r.nz(-2, 2)];
    const [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
    const [fxx, fyy] = [6 * p * x + 2 * a, 6 * q * y + 2 * c];
    if (fxx === 2 * a && fyy === 2 * c) continue;
    const f: Poly = [term(p, 3), term(a, 2), term(b, 1, 1), term(c, 0, 2), term(q, 0, 3)];
    return {
      prompt: fill(w.mvK.hessianQ, { x, y }),
      q: `f(x, y) = ${polyTex(f)}`,
      ...matOf(M([[fxx, b], [b, fyy]]), [["hessianMixedDoubled", M([[fxx, 2 * b], [2 * b, fyy]])], ["hessianAtOrigin", M([[2 * a, b], [b, 2 * c]])]]),
      steps: [
        `f_{xx} = ${polyTex([term(6 * p, 1), term(2 * a, 0)])}, \\quad f_{xy} = ${b}, \\quad f_{yy} = ${polyTex([term(6 * q, 0, 1), term(2 * c, 0)])}`,
        `H(${x}, ${y}) = \\begin{pmatrix} ${fxx} & ${b} \\\\ ${b} & ${fyy} \\end{pmatrix}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? criticalPart(r, w) : L === 2 ? (r.int(0, 9) >= 5 ? hessianPart(r, w) : classifyPart(r, w)) : lagrangePart(r, w));

export default gen;
