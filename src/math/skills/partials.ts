// Practice: Partial derivatives. Easy is the gradient of a polynomial in x and y at a point (a term with the other
// letter taken as 0 rather than as a constant, or the two parts swapped, named); medium the directional derivative
// towards a vector that is not of length 1 (not divided by its length, named); hard the tangent plane z = ax + by + c
// (c taken as f(a, b), named).
import { exact, F } from "../calculusTwo";
import { vecOf, tup } from "../linearAlgebra";
import { fill } from "../text";
import { at, d, par, type Poly, polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** A polynomial with an x²y-type term, an xy²-type term and a term in one letter. */
function poly(r: Rng): Poly {
  return [term(r.nz(-3, 3), r.int(1, 2), 1), term(r.nz(-3, 3), 1, r.int(1, 2)), r.next() < 0.5 ? term(r.nz(-4, 4), r.int(2, 3), 0) : term(r.nz(-4, 4), 0, r.int(2, 3))];
}

/** The gradient with the other letter taken as 0: only the terms in x alone (or y alone) survive. */
const alone = (f: Poly, v: 0 | 1): Poly => f.filter((t) => t.p[1 - v] === 0);

/** The gradient of f at a point. */
function gradientPart(r: Rng, w: PracticeWords): Part {
  const f = poly(r);
  const [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const [fx, fy] = [d(f, 0), d(f, 1)];
  const g = [at(fx, x, y), at(fy, x, y)];
  return {
    prompt: fill(w.vcalc.prompt.gradient, { x, y }),
    q: `f(x, y) = ${polyTex(f)}`,
    ...vecOf(g.map((v) => F(v)), [
      ["otherVariableZero", [at(d(alone(f, 0), 0), x, y), at(d(alone(f, 1), 1), x, y)]],
      ["partialsSwapped", [g[1], g[0]]],
    ]),
    steps: [
      `\\frac{\\partial f}{\\partial x} = ${polyTex(fx)}, \\quad \\frac{\\partial f}{\\partial y} = ${polyTex(fy)}`,
      `\\nabla f(${x}, ${y}) = ${tup(g)}`,
    ],
  };
}

const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]] as const;

/** The directional derivative towards v = (a, b), |v| ≠ 1. */
function directionalPart(r: Rng, w: PracticeWords): Part {
  const f = poly(r);
  const [p, q, L] = r.pick(TRIPLES);
  const [a, b] = (r.next() < 0.5 ? [p, q] : [q, p]).map((c) => c * r.sign());
  let [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const dot = () => at(d(f, 0), x, y) * a + at(d(f, 1), x, y) * b;
  while (dot() === 0) [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const [gx, gy] = [at(d(f, 0), x, y), at(d(f, 1), x, y)];
  const v = F(dot(), L);
  return {
    prompt: fill(w.vcalc.prompt.directional, { x, y, a, b }),
    q: `f(x, y) = ${polyTex(f)}`,
    ...exact(v, [["directionNotUnit", dot(), { L }]]),
    steps: [
      `\\nabla f(${x}, ${y}) = ${tup([gx, gy])}, \\quad |\\mathbf{v}| = \\sqrt{${par(a)}^{2} + ${par(b)}^{2}} = ${L}`,
      `D_{\\mathbf{u}}f = \\nabla f \\cdot \\frac{\\mathbf{v}}{|\\mathbf{v}|} = \\frac{${gx} \\cdot ${par(a)} + ${par(gy)} \\cdot ${par(b)}}{${L}} = ${v.tex()}`,
    ],
  };
}

/** The tangent plane z = ax + by + c to z = f(x, y) at a point. */
function planePart(r: Rng, w: PracticeWords): Part {
  const f = poly(r);
  let [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const slopes = () => [at(d(f, 0), x, y), at(d(f, 1), x, y)];
  while (slopes()[0] * x + slopes()[1] * y === 0) [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const [a, b] = slopes();
  const z0 = at(f, x, y);
  const c = z0 - a * x - b * y;
  return {
    prompt: fill(w.vcalc.prompt.tangentPlane, { x, y }),
    q: `f(x, y) = ${polyTex(f)}`,
    ...vecOf([F(a), F(b), F(c)], [["planeNotThroughPoint", [a, b, z0]]], "plane", ["a", "b", "c"]),
    steps: [
      `f(${x}, ${y}) = ${z0}, \\quad f_{x}(${x}, ${y}) = ${a}, \\quad f_{y}(${x}, ${y}) = ${b}`,
      `z = ${z0} + ${par(a)}(x - ${par(x)}) + ${par(b)}(y - ${par(y)}) = ${polyTex([term(a, 1), term(b, 0, 1), term(c, 0)])}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? gradientPart(r, w) : L === 2 ? directionalPart(r, w) : planePart(r, w));

export default gen;
