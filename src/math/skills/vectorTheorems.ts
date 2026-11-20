// Practice: The theorems of Green, Gauss and Stokes. Easy is a line integral round a rectangle or a circle by Green's
// theorem (∂P/∂y − ∂Q/∂x, the wrong way round, named); medium the flux out of a box or a ball by the divergence
// theorem (the surface area used for the volume, named); hard the circulation round a horizontal circle by Stokes'
// theorem (a sign slip in the curl, named).
import { exact, F, piTimes } from "../calculusTwo";
import { polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** ∮ P dx + Q dy round a rectangle or a disc, P = ay + ux², Q = bx + vy²: (b − a)·area. */
function greenPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  let b = r.nz(-3, 3);
  while (b === a) b = r.nz(-3, 3);
  const P = polyTex([term(a, 0, 1), term(r.nz(-2, 2), 2)]);
  const Q = polyTex([term(b, 1), term(r.nz(-2, 2), 0, 2)]);
  const head = `\\oint_{C} \\left(${P}\\right) dx + \\left(${Q}\\right) dy`;
  const curl = `\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${b} - ${a < 0 ? `(${a})` : a} = ${b - a}`;
  if (r.next() < 0.5) {
    const [x, y] = [r.int(1, 4), r.int(1, 4)];
    return {
      prompt: w.vcalc.prompt.green,
      q: `${head}, \\quad D = [0, ${x}] \\times [0, ${y}]`,
      ...exact(F((b - a) * x * y), [["greenOrderSwapped", (a - b) * x * y]]),
      steps: [curl, `\\iint_{D} ${b - a} \\, dA = ${b - a} \\cdot ${x * y} = ${(b - a) * x * y}`],
    };
  }
  const R = r.int(1, 3);
  return {
    prompt: w.vcalc.prompt.green,
    q: `${head}, \\quad D: x^{2} + y^{2} \\le ${R * R}`,
    ...piTimes(F((b - a) * R * R), [["greenOrderSwapped", (a - b) * R * R * Math.PI]]),
    steps: [curl, `\\iint_{D} ${b - a} \\, dA = ${b - a} \\cdot ${R * R}\\pi`],
  };
}

/** The flux of F out of a box or a ball, div F = a + b + c. */
function divergencePart(r: Rng, w: PracticeWords): Part {
  let [a, b, c] = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
  while (a + b + c === 0) [a, b, c] = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
  const s = a + b + c;
  const Fx = polyTex([term(a, 1), term(r.nz(-2, 2), 0, 2)]);
  const Fy = polyTex([term(b, 0, 1), term(r.nz(-2, 2), 0, 0, 2)]);
  const Fz = polyTex([term(c, 0, 0, 1), term(r.nz(-2, 2), 2)]);
  const head = `\\mathbf{F} = \\left(${Fx}, \\; ${Fy}, \\; ${Fz}\\right)`;
  const div = `\\nabla \\cdot \\mathbf{F} = ${a} + ${b < 0 ? `(${b})` : b} + ${c < 0 ? `(${c})` : c} = ${s}`;
  if (r.next() < 0.5) {
    const [x, y, z] = [r.int(1, 3), r.int(1, 3), r.int(1, 3)];
    return {
      prompt: w.vcalc.prompt.divergence,
      q: `${head}, \\quad E = [0, ${x}] \\times [0, ${y}] \\times [0, ${z}]`,
      ...exact(F(s * x * y * z), [["areaForVolume", s * 2 * (x * y + y * z + x * z)]]),
      steps: [div, `\\iiint_{E} ${s} \\, dV = ${s} \\cdot ${x * y * z} = ${s * x * y * z}`],
    };
  }
  const R = r.int(1, 3);
  const v = F(4 * s * R ** 3, 3);
  return {
    prompt: w.vcalc.prompt.divergence,
    q: `${head}, \\quad E: x^{2} + y^{2} + z^{2} \\le ${R * R}`,
    ...piTimes(v, [["areaForVolume", s * 4 * Math.PI * R * R]]),
    steps: [div, `\\iiint_{E} ${s} \\, dV = ${s} \\cdot \\frac{4}{3}\\pi \\cdot ${R ** 3}`],
  };
}

/** ∮ F · dr round x² + y² = R², z = h, F = (−py + z, qx + z², xy): (p + q)πR². */
function stokesPart(r: Rng, w: PracticeWords): Part {
  const [p, q, R, h] = [r.int(1, 3), r.int(1, 3), r.int(1, 3), r.int(1, 3)];
  const Fx = polyTex([term(-p, 0, 1), term(1, 0, 0, 1)]);
  const Fy = polyTex([term(q, 1), term(1, 0, 0, 2)]);
  return {
    prompt: w.vcalc.prompt.stokes,
    q: `\\mathbf{F} = \\left(${Fx}, \\; ${Fy}, \\; xy\\right), \\quad C: x^{2} + y^{2} = ${R * R}, \\; z = ${h}`,
    ...piTimes(F((p + q) * R * R), [["curlSignSlip", (q - p) * R * R * Math.PI]]),
    steps: [
      `(\\nabla \\times \\mathbf{F}) \\cdot \\mathbf{k} = \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${q} - (${-p}) = ${p + q}`,
      `\\iint_{S} ${p + q} \\, dA = ${p + q} \\cdot ${R * R}\\pi`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? greenPart(r, w) : L === 2 ? divergencePart(r, w) : stokesPart(r, w));

export default gen;
