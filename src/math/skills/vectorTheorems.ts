// Practice: The theorems of Green, Gauss and Stokes. Easy is a line integral round a rectangle or a circle by Green's
// theorem (∂P/∂y − ∂Q/∂x, the wrong way round, named), the outward flux across a rectangle by its normal form (the
// circulation form used, named), or a picture of a curve to call simple and closed or not (corners taken to break it,
// a crossing curve called simple, an open one called closed, named); medium the flux out of a box or a ball by the
// divergence theorem (the surface area used for the volume, named), or Green's theorem round a clockwise boundary (the
// orientation ignored, named); hard the circulation round a horizontal circle by Stokes' theorem (a sign slip in the
// curl, named).
import { exact, F, piTimes, shuffled, word } from "../calculusTwo";
import { type CurveKind, curveSvg, picOf } from "../fieldPics";
import { par, polyTex, term } from "../vectorCalculus";
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

/** The outward flux ∮ F · n ds across the edge of [0, X] × [0, Y], F = (ax + uy², by + vx²): (a + b)XY. */
function fluxPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a, b, u, v] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-2, 2), r.nz(-2, 2)];
    const [X, Y] = [r.int(1, 3), r.int(1, 3)];
    const circ = v * X * X * Y - u * X * Y * Y;
    if (a + b === 0 || circ === (a + b) * X * Y) continue;
    return {
      prompt: w.mvK.fluxQ,
      q: `\\mathbf{F} = \\left(${polyTex([term(a, 1), term(u, 0, 2)])}, \\; ${polyTex([term(b, 0, 1), term(v, 2)])}\\right), \\quad D = [0, ${X}] \\times [0, ${Y}]`,
      ...exact(F((a + b) * X * Y), [["greenCirculationForFlux", circ]]),
      steps: [
        `\\oint_{C} \\mathbf{F} \\cdot \\mathbf{n} \\, ds = \\iint_{D} \\left(\\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y}\\right) dA, \\quad \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} = ${a} + ${par(b)} = ${a + b}`,
        `\\iint_{D} ${a + b} \\, dA = ${a + b} \\cdot ${X * Y} = ${(a + b) * X * Y}`,
      ],
    };
  }
}

/** Green's theorem round [0, X] × [0, Y] the clockwise way: −(b − a)XY. */
function orientPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  let b = r.nz(-3, 3);
  while (b === a) b = r.nz(-3, 3);
  const [X, Y] = [r.int(1, 4), r.int(1, 4)];
  const P = polyTex([term(a, 0, 1), term(r.nz(-2, 2), 2)]);
  const Q = polyTex([term(b, 1), term(r.nz(-2, 2), 0, 2)]);
  return {
    prompt: w.mvK.orientQ,
    q: `\\oint_{C} \\left(${P}\\right) dx + \\left(${Q}\\right) dy, \\quad D = [0, ${X}] \\times [0, ${Y}]`,
    ...exact(F((a - b) * X * Y), [["orientationIgnored", (b - a) * X * Y]]),
    steps: [
      `\\text{clockwise: } \\oint_{C} = -\\iint_{D} \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dA, \\quad \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${b} - ${par(a)} = ${b - a}`,
      `-${par(b - a)} \\cdot ${X * Y} = ${(a - b) * X * Y}`,
    ],
  };
}

const CURVES: readonly CurveKind[] = ["square", "circle", "eight", "arc"];

/** A curve to call simple and closed, closed but not simple, or not closed. */
function curveKindPart(r: Rng, w: PracticeWords): Part {
  const W = w.mvK;
  const kind = r.pick(CURVES);
  const right = kind === "eight" ? 1 : kind === "arc" ? 2 : 0;
  const options = [word(W.simpleClosed), word(W.closedNotSimple), word(W.notClosed)];
  const why = { square: W.squareWhy, circle: W.circleWhy, eight: W.eightWhy, arc: W.arcWhy }[kind];
  return {
    prompt: W.curveQ,
    q: "",
    pic: picOf(curveSvg(kind)),
    ...shuffled(r, options, right, kind === "square" ? [["cornersBreakCurve", 2]] : kind === "eight" ? [["selfCrossingCalledSimple", 0]] : kind === "arc" ? [["openCurveCalledClosed", 0]] : []),
    steps: [`\\text{${why}}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 3) return stokesPart(r, w);
  const k = r.int(0, 9);
  if (L === 1) return k >= 8 ? curveKindPart(r, w) : k >= 5 ? fluxPart(r, w) : greenPart(r, w);
  return k >= 5 ? orientPart(r, w) : divergencePart(r, w);
};

export default gen;
