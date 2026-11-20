// Practice: Second-order linear equations with constant coefficients. Easy is an initial value problem whose
// characteristic equation has two whole roots (the roots taken with the wrong sign, named); medium has a repeated root
// (the x·e^(rx) solution left out, named) or complex roots α ± βi (the e^(αx) left out, named); hard is the
// particular solution of y″ + py′ + qy = g(x) for g an exponential or a line, by undetermined coefficients (only the
// qy term matched, named).
import { F, minusA } from "../calculusTwo";
import { coef, eTex, ex, fnOf, linTex, sumOf, T } from "../odes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const lhs = (p: number, q: number) => linTex([[1, "y''"], [p, "y'"], [q, "y"]]);
const charEq = (p: number, q: number) => `${linTex([[1, "r^{2}"], [p, "r"], [q, ""]])} = 0`;
const factor = (a: number) => `\\left(${minusA(a, "r")}\\right)`;

/** Two whole roots r₁ ≠ r₂: y = Ae^(r₁x) + Be^(r₂x). */
function distinctPart(r: Rng, w: PracticeWords): Part {
  const r1 = r.int(-3, 3);
  let r2 = r.int(-3, 3);
  while (r2 === r1) r2 = r.int(-3, 3);
  const [A, B] = [r.nz(-3, 3), r.nz(-3, 3)];
  const [p, q] = [-(r1 + r2), r1 * r2];
  const [y0, y1] = [A + B, A * r1 + B * r2];
  // The roots −r₁, −r₂ fitted to the same initial values.
  const A2 = F(y1 + r2 * y0, r2 - r1);
  const slip = sumOf([[A2, ex(-r1)], [F(y0).sub(A2), ex(-r2)]]);
  const y = sumOf([[A, ex(r1)], [B, ex(r2)]]);
  return {
    prompt: w.ode.prompt.secondIvp,
    q: `${lhs(p, q)} = 0, \\quad y(0) = ${y0}, \\; y'(0) = ${y1}`,
    ...fnOf(y, [["rootsSignFlipped", slip]]),
    steps: [
      `${charEq(p, q)}: \\quad ${factor(r1)}${factor(r2)} = 0, \\; r = ${r1}, ${r2}`,
      `y = C_1${eTex(r1)} + C_2${eTex(r2)}: \\quad C_1 + C_2 = ${y0}, \\; ${linTex([[r1, "C_1"], [r2, "C_2"]])} = ${y1}`,
      `C_1 = ${A}, \\; C_2 = ${B}: \\quad y = ${T(y)}`,
    ],
  };
}

/** A repeated root m: y = (A + Bx)e^(mx); or α ± βi: y = e^(αx)(A cos βx + B sin βx). */
function repeatedOrComplexPart(r: Rng, w: PracticeWords): Part {
  const [A, B] = [r.nz(-3, 3), r.nz(-3, 3)];
  if (r.next() < 0.5) {
    const m = r.nz(-3, 3);
    const [p, q] = [-2 * m, m * m];
    const y = `(${sumOf([[A, ""], [B, "x"]])})${ex(m)}`;
    return {
      prompt: w.ode.prompt.secondIvp,
      q: `${lhs(p, q)} = 0, \\quad y(0) = ${A}, \\; y'(0) = ${m * A + B}`,
      ...fnOf(y, [["repeatedRootNoX", coef(A, ex(m))]]),
      steps: [
        `${charEq(p, q)}: \\quad ${factor(m)}^{2} = 0, \\; r = ${m} \\text{ twice}`,
        `y = \\left(C_1 + C_2 x\\right)${eTex(m)}: \\quad C_1 = ${A}, \\; ${linTex([[m, "C_1"], [1, "C_2"]])} = ${m * A + B}, \\; C_2 = ${B}`,
        `y = ${T(y)}`,
      ],
    };
  }
  const al = r.int(-2, 2);
  const be = r.int(1, 3);
  const [p, q] = [-2 * al, al * al + be * be];
  const trig = sumOf([[A, `cos(${coef(be, "x")})`], [B, `sin(${coef(be, "x")})`]]);
  const y = al === 0 ? trig : `${ex(al)}(${trig})`;
  return {
    prompt: w.ode.prompt.secondIvp,
    q: `${lhs(p, q)} = 0, \\quad y(0) = ${A}, \\; y'(0) = ${al * A + be * B}`,
    ...fnOf(y, [["forgotExpFactor", trig]]),
    steps: [
      `${charEq(p, q)}: \\quad r = ${al === 0 ? "" : al} \\pm ${be === 1 ? "" : be}i`,
      `y = ${eTex(al)}\\left(C_1\\cos ${be === 1 ? "" : be}x + C_2\\sin ${be === 1 ? "" : be}x\\right): \\quad C_1 = ${A}, \\; ${linTex([[al, "C_1"], [be, "C_2"]])} = ${al * A + be * B}`,
      `C_2 = ${B}: \\quad y = ${T(y)}`,
    ],
  };
}

/** yₚ for g = Ke^(mx) (m not a root) or g = ax + d (q ≠ 0, p ≠ 0). */
function particularPart(r: Rng, w: PracticeWords): Part {
  const r1 = r.nz(-3, 3);
  let r2 = r.nz(-3, 3);
  while (r2 === r1 || r2 === -r1) r2 = r.nz(-3, 3);
  const [p, q] = [-(r1 + r2), r1 * r2];
  if (r.next() < 0.5) {
    let m = r.nz(-2, 2);
    while (m === r1 || m === r2) m = r.nz(-2, 2);
    const Pm = m * m + p * m + q;
    const k = r.nz(-3, 3);
    const K = k * Pm;
    const y = coef(k, ex(m));
    return {
      prompt: w.ode.prompt.particular,
      q: `${lhs(p, q)} = ${T(coef(K, ex(m)))}`,
      ...fnOf(y, [["undeterminedNoDerivatives", coef(F(K, q), ex(m))]]),
      steps: [
        `y_p = A${eTex(m)}: \\quad \\left(${m * m} ${p * m < 0 ? "-" : "+"} ${Math.abs(p * m)} ${q < 0 ? "-" : "+"} ${Math.abs(q)}\\right)A = ${K}`,
        `A = ${k}: \\quad y_p = ${T(y)}`,
      ],
    };
  }
  const [u, v] = [r.nz(-3, 3), r.int(-3, 3)];
  const [a, dd] = [q * u, p * u + q * v];
  const y = sumOf([[u, "x"], [v, ""]]);
  return {
    prompt: w.ode.prompt.particular,
    q: `${lhs(p, q)} = ${T(sumOf([[a, "x"], [dd, ""]]))}`,
    ...fnOf(y, [["undeterminedNoDerivatives", sumOf([[u, "x"], [F(dd, q), ""]])]]),
    steps: [
      `y_p = Ax + B: \\quad ${linTex([[q, "Ax"], [p, "A"], [q, "B"]])} = ${T(sumOf([[a, "x"], [dd, ""]]))}`,
      `${q}A = ${a}, \\; ${linTex([[p, "A"], [q, "B"]])} = ${dd}: \\quad A = ${u}, \\; B = ${v}`,
      `y_p = ${T(y)}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? distinctPart(r, w) : L === 2 ? repeatedOrComplexPart(r, w) : particularPart(r, w));

export default gen;
