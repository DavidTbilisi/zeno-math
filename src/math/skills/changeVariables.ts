// Practice: Changing variables in an integral. Easy integrates a power of the distance over a disc in polar
// coordinates (dA taken as dr dθ, the r left out, named), or finds the area element of a linear change of variables
// (the determinant's sign kept, or its minus read as plus, named); medium is the volume under a paraboloid in
// cylindrical coordinates (the same r left out, named), or an integral over a parallelogram that becomes a rectangle
// in u and v (the factor left out, or turned upside down, named); hard integrates a power of the distance over a ball
// in spherical coordinates (the sin φ left out, or the ρ², named).
import { exact, F, piTimes } from "../calculusTwo";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { fill } from "../text";
import { par, polyTex, term } from "../vectorCalculus";

/** (x² + y²)^{p/2} as LaTeX, and r^p. */
const RADIAL: Record<number, string> = { 1: "\\sqrt{x^{2} + y^{2}}", 2: "x^{2} + y^{2}", 4: "\\left(x^{2} + y^{2}\\right)^{2}" };
const BALL: Record<number, string> = { 0: "1", 1: "\\sqrt{x^{2} + y^{2} + z^{2}}", 2: "x^{2} + y^{2} + z^{2}" };
/** qπ as LaTeX. */
const piTex = (q: Frac) => {
  const top = q.n === 1 ? "\\pi" : `${q.n}\\pi`;
  return q.d === 1 ? top : `\\frac{${top}}{${q.d}}`;
};
const rp = (v: string, p: number) => (p === 0 ? "" : p === 1 ? v : `${v}^{${p}}`);

/** ∬ over x² + y² ≤ R² of (x² + y²)^{p/2}: 2πR^{p+2}/(p + 2). */
function polarPart(r: Rng, w: PracticeWords): Part {
  const p = r.pick([1, 2, 4]);
  const R = r.int(1, 3);
  const v = F(2 * R ** (p + 2), p + 2);
  return {
    prompt: w.vcalc.prompt.polar,
    q: `\\iint_{x^{2} + y^{2} \\le ${R * R}} ${RADIAL[p]} \\, dA`,
    ...piTimes(v, [["forgotJacobianR", (2 * Math.PI * R ** (p + 1)) / (p + 1)]]),
    steps: [
      `x = r\\cos\\theta, \\; y = r\\sin\\theta, \\quad dA = r \\, dr \\, d\\theta: \\quad \\int_{0}^{2\\pi} \\int_{0}^{${R}} ${rp("r", p)} \\cdot r \\, dr \\, d\\theta`,
      `= 2\\pi \\cdot \\frac{${R}^{${p + 2}}}{${p + 2}} = ${piTex(v)}`,
    ],
  };
}

/** The volume under z = c(R² − x² − y²) above z = 0: πcR⁴/2. */
function cylinderPart(r: Rng, w: PracticeWords): Part {
  const [c, R] = [r.int(1, 3), r.int(1, 3)];
  const v = F(c * R ** 4, 2);
  const cc = c === 1 ? "" : String(c);
  return {
    prompt: w.vcalc.prompt.cylinder,
    q: `z = ${cc}\\left(${R * R} - x^{2} - y^{2}\\right)`,
    ...piTimes(v, [["forgotJacobianR", (4 * Math.PI * c * R ** 3) / 3]]),
    steps: [
      `z = 0 \\text{ at } r = ${R}: \\quad V = \\int_{0}^{2\\pi} \\int_{0}^{${R}} ${cc}\\left(${R * R} - r^{2}\\right) r \\, dr \\, d\\theta`,
      `= 2\\pi \\cdot ${cc}\\left(\\frac{${R ** 4}}{2} - \\frac{${R ** 4}}{4}\\right) = ${piTex(v)}`,
    ],
  };
}

/** ∭ over the ball ρ ≤ R of ρᵏ: 4πR^{k+3}/(k + 3). */
function spherePart(r: Rng, w: PracticeWords): Part {
  const k = r.int(0, 2);
  const R = r.int(1, 3);
  const v = F(4 * R ** (k + 3), k + 3);
  return {
    prompt: w.vcalc.prompt.sphere,
    q: `\\iiint_{x^{2} + y^{2} + z^{2} \\le ${R * R}} ${BALL[k]} \\, dV`,
    ...piTimes(v, [
      ["forgotSinPhi", (2 * Math.PI ** 2 * R ** (k + 3)) / (k + 3)],
      ["sphericalNoRhoSquared", (4 * Math.PI * R ** (k + 1)) / (k + 1)],
    ]),
    steps: [
      `dV = \\rho^{2} \\sin\\varphi \\, d\\rho \\, d\\varphi \\, d\\theta: \\quad \\int_{0}^{2\\pi} \\int_{0}^{\\pi} \\int_{0}^{${R}} ${rp("\\rho", k)} \\rho^{2} \\sin\\varphi \\, d\\rho \\, d\\varphi \\, d\\theta`,
      `= 2\\pi \\cdot 2 \\cdot \\frac{${R}^{${k + 3}}}{${k + 3}} = ${piTex(v)}`,
    ],
  };
}

/** x = au + bv, y = cu + dv: dA = |ad − bc| du dv. */
function areaElementPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a, b, c, e] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
    const det = a * e - b * c;
    if (det === 0) continue;
    const uv = ["u", "v"];
    return {
      prompt: w.mvK.areaElQ,
      q: `x = ${polyTex([term(a, 1), term(b, 0, 1)], uv)}, \\quad y = ${polyTex([term(c, 1), term(e, 0, 1)], uv)}`,
      ...exact(F(Math.abs(det)), [["areaSignKept", det, { d: det, v: Math.abs(det) }], ["detPlusUsed", Math.abs(a * e + b * c), { b, c, v: Math.abs(det) }]]),
      steps: [
        `\\frac{\\partial(x, y)}{\\partial(u, v)} = \\det\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${e} \\end{pmatrix} = ${a} \\cdot ${par(e)} - ${par(b)} \\cdot ${par(c)} = ${det}`,
        `dA = \\left|${det}\\right| du \\, dv = ${Math.abs(det)} \\, du \\, dv`,
      ],
    };
  }
}

/** ∬ (x + ky) dA over a ≤ x + ky ≤ b, c ≤ x − y ≤ e: in u = x + ky, v = x − y, dA = du dv/(k + 1). */
function parallelogramPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const k = r.int(1, 3);
    const a = r.int(-2, 1);
    const b = a + r.int(1, 3);
    const c = r.int(-2, 1);
    const e = c + r.int(1, 3);
    if (b * b === a * a) continue;
    const top = (b * b - a * a) * (e - c);
    const u = k === 1 ? "x + y" : `x + ${k}y`;
    const v = F(top, 2 * (k + 1));
    return {
      prompt: fill(w.mvK.boundQ, { u }),
      q: `\\iint_{R} (${u}) \\, dA, \\quad R: ${a} \\le ${u} \\le ${b}, \\; ${c} \\le x - y \\le ${e}`,
      ...exact(v, [["jacobianFactorLeftOut", top / 2], ["jacobianInverted", (top * (k + 1)) / 2]]),
      steps: [
        `\\frac{\\partial(u, v)}{\\partial(x, y)} = \\det\\begin{pmatrix} 1 & ${k} \\\\ 1 & -1 \\end{pmatrix} = ${-1 - k}, \\quad dA = \\frac{1}{${k + 1}} \\, du \\, dv`,
        `\\int_{${c}}^{${e}} \\int_{${a}}^{${b}} \\frac{u}{${k + 1}} \\, du \\, dv = \\frac{\\left(${b}^{2} - ${par(a)}^{2}\\right) \\cdot ${e - c}}{${2 * (k + 1)}} = ${v.tex()}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? (r.int(0, 9) >= 5 ? areaElementPart(r, w) : polarPart(r, w)) : L === 2 ? (r.int(0, 9) >= 5 ? parallelogramPart(r, w) : cylinderPart(r, w)) : spherePart(r, w));

export default gen;
