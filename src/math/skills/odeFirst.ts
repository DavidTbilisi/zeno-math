// Practice: First-order differential equations. Easy separates the variables of y′ = kxⁿy with an initial value (the
// constant added after taking e^, named); medium is y′ + ay = be^(cx) by an integrating factor (e^(−ax) for e^(ax),
// named); hard finds the potential ψ of an exact equation (∫M dx and ∫N dy added, their shared terms counted twice,
// named).
import { F } from "../calculusTwo";
import { coef, ex, fnOf, linTex, sumOf, T } from "../odes";
import { d, type Poly, polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** y′ = (n + 1)c xⁿ y, y(0) = y₀: y = y₀e^(c x^(n+1)). */
function separablePart(r: Rng, w: PracticeWords): Part {
  const n = r.int(0, 2);
  const c = n === 2 ? r.sign() : r.nz(-2, 2);
  let y0 = r.nz(-3, 4);
  while (y0 === 1) y0 = r.nz(-3, 4);
  const k = (n + 1) * c;
  const power = coef(c, n === 0 ? "x" : `x^${n + 1}`);
  const powerTex = polyTex([term(c, n + 1)]);
  return {
    prompt: w.ode.prompt.separable,
    q: `y' = ${polyTex([term(k, n, 1)])}, \\quad y(0) = ${y0}`,
    ...fnOf(coef(y0, `e^(${power})`), [["constantAddedAfterExp", sumOf([[1, `e^(${power})`], [y0 - 1, ""]])]]),
    steps: [
      `\\frac{dy}{y} = ${polyTex([term(k, n)])} \\, dx`,
      `\\ln|y| = ${powerTex} + C, \\quad y = Ae^{${powerTex}}`,
      `A = y(0) = ${y0}: \\quad y = ${T(coef(y0, `e^(${power})`))}`,
    ],
  };
}

/** y′ + ay = be^(cx), y(0) = y₀: y = ke^(cx) + (y₀ − k)e^(−ax), k = b/(a + c). */
function linearPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  let c = r.int(-2, 2);
  while (c === a || c === -a) c = r.int(-2, 2);
  const k = r.nz(-3, 3);
  const b = k * (a + c);
  let y0 = r.int(-3, 4);
  while (y0 === k) y0 = r.int(-3, 4);
  const rhs = T(coef(b, ex(c)));
  // e^(−ax) for e^(ax): (e^(−ax)y)′ is not e^(−ax)(y′ + ay), and the answer comes out with b/(c − a) and e^(ax).
  const k2 = F(b, c - a);
  const slip = sumOf([[k2, ex(c)], [F(y0).sub(k2), ex(a)]]);
  const mu = `e^{${polyTex([term(a, 1)])}}`;
  return {
    prompt: w.ode.prompt.linearFirst,
    q: `${linTex([[1, "y'"], [a, "y"]])} = ${rhs}, \\quad y(0) = ${y0}`,
    ...fnOf(sumOf([[k, ex(c)], [y0 - k, ex(-a)]]), [["integratingFactorSign", slip]]),
    steps: [
      `\\mu = e^{\\int ${a} \\, dx} = ${mu}: \\quad \\left(${mu} y\\right)' = ${T(coef(b, ex(a + c)))}`,
      `${mu} y = ${T(sumOf([[k, ex(a + c)]]))} + C, \\quad y = ${T(sumOf([[k, ex(c)]]))} + Ce^{${polyTex([term(-a, 1)])}}`,
      `C = ${y0} - ${k < 0 ? `(${k})` : k} = ${y0 - k}: \\quad y = ${T(sumOf([[k, ex(c)], [y0 - k, ex(-a)]]))}`,
    ],
  };
}

/** (Mₓ) dx + (N) dy = 0 with M = ψₓ, N = ψ_y, ψ = ax²y + dxy + bx + cy². */
function exactPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c, e] = [r.nz(-3, 3), r.nz(-4, 4), r.nz(-3, 3), r.int(-3, 3)];
  const psi: Poly = [term(a, 2, 1), term(e, 1, 1), term(b, 1), term(c, 0, 2)];
  const [M, N] = [d(psi, 0), d(psi, 1)];
  const plain = (p: Poly) => sumOf(p.map((t) => [t.c, `${t.p[0] ? (t.p[0] === 1 ? "x" : `x^${t.p[0]}`) : ""}${t.p[1] ? (t.p[1] === 1 ? "y" : `y^${t.p[1]}`) : ""}`]));
  // ∫M dx + ∫N dy: the terms in x and y come from both.
  const both: Poly = [term(2 * a, 2, 1), term(2 * e, 1, 1), term(b, 1), term(c, 0, 2)];
  const fromM: Poly = [term(a, 2, 1), term(e, 1, 1), term(b, 1)];
  return {
    prompt: w.ode.prompt.exact,
    q: `\\left(${polyTex(M)}\\right) dx + \\left(${polyTex(N)}\\right) dy = 0`,
    ...fnOf(plain(psi), [["exactAddedBoth", plain(both)]], ["y"], "potential", true),
    steps: [
      `\\frac{\\partial M}{\\partial y} = ${polyTex(d(M, 1))} = \\frac{\\partial N}{\\partial x}`,
      `\\psi = \\int M \\, dx = ${polyTex(fromM)} + g(y)`,
      `\\frac{\\partial \\psi}{\\partial y} = ${polyTex(d(fromM, 1))} + g'(y) = N: \\quad g'(y) = ${polyTex([term(2 * c, 0, 1)])}, \\; g(y) = ${polyTex([term(c, 0, 2)])}`,
      `\\psi(x, y) = ${polyTex(psi)}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? separablePart(r, w) : L === 2 ? linearPart(r, w) : exactPart(r, w));

export default gen;
