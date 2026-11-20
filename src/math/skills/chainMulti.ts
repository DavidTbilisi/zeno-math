// Practice: The multivariable chain rule. Easy is dz/dt when x and y both depend on t (the term through y left out,
// named); medium the Jacobian matrix of a map of the plane at a point (its transpose, named); hard ∂z/∂s when x and y
// depend on s and t (the t-derivatives used, or a term left out, named).
import { exact, F } from "../calculusTwo";
import { matOf } from "../linearAlgebra";
import { M } from "../practiceKit";
import { fill } from "../text";
import { at, d, par, type Poly, polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** z = f(x, y): a cross term and a square. */
const zOf = (r: Rng): Poly => [term(r.nz(-3, 3), 1, 1), r.next() < 0.5 ? term(r.nz(-3, 3), 2, 0) : term(r.nz(-3, 3), 0, 2), term(r.nz(-4, 4), 0, 1)];

/** dz/dt with x = at + b, y = ctᵏ. */
function tPart(r: Rng, w: PracticeWords): Part {
  // Drawn again until both terms count, so leaving one out is a different answer.
  for (;;) {
    const z = zOf(r);
    const [a, b, c, k] = [r.nz(-3, 3), r.int(-3, 3), r.nz(-2, 2), r.int(2, 3)];
    const t = r.pick([1, -1, 2]);
    const [x, y] = [a * t + b, c * t ** k];
    const [first, second] = [at(d(z, 0), x, y) * a, at(d(z, 1), x, y) * c * k * t ** (k - 1)];
    if (first !== 0 && second !== 0) return tPartOf(w, z, a, b, c, k, t, first, second);
  }
}

function tPartOf(w: PracticeWords, z: Poly, a: number, b: number, c: number, k: number, t: number, first: number, second: number): Part {
  const [x, y] = [a * t + b, c * t ** k];
  const v = F(first + second);
  const xt = polyTex([term(a, 1), term(b, 0)], ["t"]);
  const yt = polyTex([term(c, k)], ["t"]);
  return {
    prompt: fill(w.vcalc.prompt.chainT, { t }),
    q: `z = ${polyTex(z)}, \\quad x = ${xt}, \\quad y = ${yt}`,
    ...exact(v, [["chainOneTermOnly", first]]),
    steps: [
      `\\frac{dz}{dt} = \\frac{\\partial z}{\\partial x}\\frac{dx}{dt} + \\frac{\\partial z}{\\partial y}\\frac{dy}{dt} = \\left(${polyTex(d(z, 0))}\\right) \\cdot ${par(a)} + \\left(${polyTex(d(z, 1))}\\right) \\cdot \\left(${polyTex([term(c * k, k - 1)], ["t"])}\\right)`,
      `t = ${t}: \\quad x = ${x}, \\; y = ${y}, \\quad \\frac{dz}{dt} = ${first} + ${par(second)} = ${v.tex()}`,
    ],
  };
}

/** The Jacobian of (u, v) = (f(x, y), g(x, y)) at a point. */
function jacobianPart(r: Rng, w: PracticeWords): Part {
  const u: Poly = [term(r.nz(-3, 3), 2, 0), term(r.nz(-3, 3), 1, 1)];
  const v: Poly = [term(r.nz(-3, 3), 1, 0), term(r.nz(-3, 3), 0, 2), term(r.nz(-2, 2), 1, 1)];
  let [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const J = () => [[at(d(u, 0), x, y), at(d(u, 1), x, y)], [at(d(v, 0), x, y), at(d(v, 1), x, y)]];
  while (J()[0][1] === J()[1][0]) [x, y] = [r.nz(-2, 2), r.nz(-2, 2)];
  const rows = J();
  return {
    prompt: fill(w.vcalc.prompt.jacobian, { x, y }),
    q: `\\mathbf{F}(x, y) = \\left(${polyTex(u)}, \\; ${polyTex(v)}\\right)`,
    ...matOf(M(rows), [["jacobianTransposed", M([[rows[0][0], rows[1][0]], [rows[0][1], rows[1][1]]])]]),
    steps: [
      `J = \\begin{pmatrix} \\partial u / \\partial x & \\partial u / \\partial y \\\\ \\partial v / \\partial x & \\partial v / \\partial y \\end{pmatrix} = \\begin{pmatrix} ${polyTex(d(u, 0))} & ${polyTex(d(u, 1))} \\\\ ${polyTex(d(v, 0))} & ${polyTex(d(v, 1))} \\end{pmatrix}`,
      `J(${x}, ${y}) = \\begin{pmatrix} ${rows[0][0]} & ${rows[0][1]} \\\\ ${rows[1][0]} & ${rows[1][1]} \\end{pmatrix}`,
    ],
  };
}

/** ∂z/∂s with x = as + bt, y = st. */
function sPart(r: Rng, w: PracticeWords): Part {
  const z = zOf(r);
  const [a, b] = [r.nz(-3, 3), r.nz(-3, 3)];
  let [s, t] = [r.nz(-2, 2), r.nz(-2, 2)];
  const vals = () => {
    const [x, y] = [a * s + b * t, s * t];
    const [zx, zy] = [at(d(z, 0), x, y), at(d(z, 1), x, y)];
    return { x, y, zx, zy, right: zx * a + zy * t, wrongVar: zx * b + zy * s };
  };
  while (vals().zx * a === 0 || vals().zy * t === 0 || vals().right === vals().wrongVar) [s, t] = [r.nz(-2, 2), r.nz(-2, 2)];
  const { x, y, zx, zy, right, wrongVar } = vals();
  return {
    prompt: fill(w.vcalc.prompt.chainS, { s, t }),
    q: `z = ${polyTex(z)}, \\quad x = ${polyTex([term(a, 1), term(b, 0, 1)], ["s", "t"])}, \\quad y = st`,
    ...exact(F(right), [["chainWrongVariable", wrongVar], ["chainOneTermOnly", zx * a]]),
    steps: [
      `\\frac{\\partial z}{\\partial s} = \\frac{\\partial z}{\\partial x}\\frac{\\partial x}{\\partial s} + \\frac{\\partial z}{\\partial y}\\frac{\\partial y}{\\partial s} = \\left(${polyTex(d(z, 0))}\\right) \\cdot ${par(a)} + \\left(${polyTex(d(z, 1))}\\right) \\cdot t`,
      `x = ${x}, \\; y = ${y}: \\quad ${zx} \\cdot ${par(a)} + ${par(zy)} \\cdot ${par(t)} = ${right}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? tPart(r, w) : L === 2 ? jacobianPart(r, w) : sPart(r, w));

export default gen;
