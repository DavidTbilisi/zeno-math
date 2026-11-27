// Practice: Applications of integration. Easy is the area between a parabola and a line that cuts it twice (the
// area under the line alone, named); medium the volume when the region under y = kx, √(kx) or x² is turned about the
// x-axis (π left out, and the integral squared instead of y, named); hard the length of a curve made so that
// 1 + (y′)² is a perfect square (the 1 + left out, so the length is just the rise, named). Since #749 half the seeds
// ask the areas and volumes beyond one disc: an area integrated in y, a region whose top edge changes, two curves that
// cross three times (L1); a solid of square, semicircle or triangle cross-sections, a washer about the x-axis (L2); a
// disc or washer about another line, what an integral means in a setting and how much leaks from a tank (L3).
import { exact, F, piTimes, type NumSlip } from "../calculusTwo";
import { fill } from "../chart";
import type { Frac } from "../fraction";
import { limitPic } from "../limitGraph";
import { dp, num, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

/** The area between y = cx² and the line through the points where x = r₁ and x = r₂. */
function areaPart(r: Rng, w: PracticeWords): Part {
  const r1 = r.int(-3, 2);
  const gap = r.int(1, 4);
  const r2 = r1 + gap;
  const c = r.int(1, 2);
  const [m, b] = [r1 + r2, -r1 * r2];
  const line = polyStr([c * b, c * m]);
  const v = F(c * gap ** 3, 6);
  const under = F(c * (m * (r2 * r2 - r1 * r1) + 2 * b * (r2 - r1)), 2);
  const par = `${c === 1 ? "" : c}x^{2}`;
  return {
    prompt: w.calc2.prompt.area,
    q: `y = ${par}, \\quad y = ${T(line)}`,
    ...exact(v, [["onlyTopCurve", under]]),
    steps: [
      `${par} = ${T(line)} \\Rightarrow x = ${r1}, \\ x = ${r2}`,
      `\\int_{${r1}}^{${r2}} \\left(${T(line)} - ${par}\\right) dx = ${v.tex()}`,
    ],
  };
}

/** The volume when the region under y = f(x), 0 ≤ x ≤ h, is turned about the x-axis. */
function volumePart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  const k = r.int(1, 3);
  const h = kind === 2 ? r.int(1, 2) : r.int(1, 3);
  const c = kind === 0
    ? { y: `${k === 1 ? "" : k}x`, sq: `${k * k === 1 ? "" : k * k}x^{2}`, v: F(k * k * h ** 3, 3), int: F(k * h * h, 2) }
    : kind === 1
      ? { y: `\\sqrt{${k === 1 ? "" : k}x}`, sq: `${k === 1 ? "" : k}x`, v: F(k * h * h, 2), int: null }
      : { y: "x^{2}", sq: "x^{4}", v: F(h ** 5, 5), int: F(h ** 3, 3) };
  // ∫√(kx) dx = (2/3)√k x^(3/2): its square is (4/9)k h³.
  const squared = c.int ? c.int.mul(c.int).toNumber() : (4 * k * h ** 3) / 9;
  return {
    prompt: w.calc2.prompt.volume,
    q: `y = ${c.y}, \\quad 0 \\le x \\le ${h}`,
    ...piTimes(c.v, [["forgotPi", c.v], ["squaredAfterIntegrating", squared * Math.PI]]),
    steps: [`V = \\pi \\int_{0}^{${h}} y^{2} \\, dx = \\pi \\int_{0}^{${h}} ${c.sq} \\, dx`, `= ${c.v.tex()}\\pi`],
  };
}

/** The length of y = (2/3)x^(3/2) or (1/3)(x² + 2)^(3/2) from x = 0 to b. */
function arcPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const s = r.int(2, 5);
    const b = s * s - 1;
    const v = F(2 * (s ** 3 - 1), 3);
    return {
      prompt: w.calc2.prompt.arc,
      q: `y = \\frac{2}{3}x^{\\frac{3}{2}}, \\quad 0 \\le x \\le ${b}`,
      ...exact(v, [["forgotOnePlus", (2 / 3) * b ** 1.5]]),
      steps: [`y' = \\sqrt{x}, \\quad 1 + (y')^{2} = 1 + x`, `L = \\int_{0}^{${b}} \\sqrt{1 + x} \\, dx = \\left[\\frac{2}{3}(1 + x)^{\\frac{3}{2}}\\right]_{0}^{${b}} = \\frac{2}{3}\\left(${s ** 3} - 1\\right) = ${v.tex()}`],
    };
  }
  const b = r.int(1, 3);
  const v = F(b ** 3 + 3 * b, 3);
  return {
    prompt: w.calc2.prompt.arc,
    q: `y = \\frac{1}{3}\\left(x^{2} + 2\\right)^{\\frac{3}{2}}, \\quad 0 \\le x \\le ${b}`,
    ...exact(v, [["forgotOnePlus", ((b * b + 2) ** 1.5 - 2 ** 1.5) / 3]]),
    steps: [`y' = x\\sqrt{x^{2} + 2}, \\quad 1 + (y')^{2} = \\left(x^{2} + 1\\right)^{2}`, `L = \\int_{0}^{${b}} \\left(x^{2} + 1\\right) dx = \\frac{${b ** 3}}{3} + ${b} = ${v.tex()}`],
  };
}

/** ∫ from a to b of the polynomial c (constant first), exactly. */
function intPoly(c: readonly number[], a: number, b: number): Frac {
  let v = F(0);
  c.forEach((k, i) => {
    v = v.add(F(k * (b ** (i + 1) - a ** (i + 1)), i + 1));
  });
  return v;
}

/** m·v + b written out, with v the variable. */
/** A number or expression for a hint, its minus signs written as −. */
const neg = (v: number | string) => String(v).replace(/-/g, "−");

const lin = (m: number, b: number, v: string) => {
  const head = m === 0 ? "" : `${m === 1 ? "" : m === -1 ? "-" : m}${v}`;
  return head ? `${head}${b ? ` ${b < 0 ? "-" : "+"} ${Math.abs(b)}` : ""}` : String(b);
};

/** The areas between curves left out before (#749). */
function areaMore(r: Rng, w: PracticeWords): Part {
  const K = w.iaK;
  const kind = r.int(0, 2);
  if (kind === 0) {
    // x = y² and the line x = m y + b, which crosses it at y = r1 and y = r2: integrate right minus left in y.
    const r1 = r.int(-3, 1);
    const gap = r.int(1, 4);
    const r2 = r1 + gap;
    const [m, b] = [r1 + r2, -r1 * r2];
    const line = lin(m, b, "y");
    const v = F(gap ** 3, 6);
    const [lo, hi] = [Math.min(r1 * r1, r2 * r2), Math.max(r1 * r1, r2 * r2)];
    return {
      prompt: K.horizQ,
      q: `x = y^{2}, \\quad x = ${line}`,
      ...exact(v, [["rightMinusLeftSwapped", v.neg(), { line: neg(line) }], ...(lo !== hi ? [["xValuesAsLimits", intPoly([b, m, -1], lo, hi), { r1: neg(r1), r2: neg(r2) }] as NumSlip] : [])]),
      steps: [`y^{2} = ${line} \\Rightarrow y = ${r1}, \\ y = ${r2}`, `\\int_{${r1}}^{${r2}} \\left(${line} - y^{2}\\right) dy = ${v.tex()}`],
    };
  }
  if (kind === 1) {
    // Under y = c x² up to x = p, then under the line from (p, c p²) down to (p + d, 0).
    const [c, p] = r.pick([[1, 1], [2, 1], [3, 1], [1, 2]] as const);
    const d = r.int(1, 4);
    const h = c * p * p;
    const e = p + d;
    const curve = F(c * p ** 3, 3);
    const v = curve.add(F(h * d, 2));
    const par = `${c === 1 ? "" : c}x^{2}`;
    return {
      prompt: fill(K.compositeQ, { p, e }),
      q: `y = ${par} \\ \\ (0 \\le x \\le ${p})`,
      pic: limitPic({ pieces: [{ f: (x: number) => c * x * x, from: 0, to: p }, { f: (x: number) => (h * (e - x)) / d, from: p, to: e }], closed: [[0, 0], [p, h], [e, 0]] }),
      ...exact(v, [["oneRegionOnly", curve, { p, e }], ["curveThroughout", F(c * e ** 3, 3), { p }]]),
      steps: [`\\int_{0}^{${p}} ${par}\\,dx = ${curve.tex()}`, `\\tfrac{1}{2} \\cdot ${d} \\cdot ${h} = ${F(h * d, 2).tex()}`, `${curve.tex()} + ${F(h * d, 2).tex()} = ${v.tex()}`],
    };
  }
  // y = k x³ and y = k a² x cross at −a, 0 and a: two loops of equal area.
  const a = r.int(1, 3);
  const k = r.int(1, 2);
  const loop = F(k * a ** 4, 4);
  const v = loop.add(loop);
  return {
    prompt: K.loopsQ,
    q: `y = ${k === 1 ? "" : k}x^{3}, \\quad y = ${k * a * a === 1 ? "" : k * a * a}x`,
    ...exact(v, [["loopsCancel", 0], ["oneLoopOnly", loop, { a }]]),
    steps: [`${k === 1 ? "" : k}x^{3} = ${k * a * a === 1 ? "" : k * a * a}x \\Rightarrow x = -${a}, \\ 0, \\ ${a}`, `2\\int_{0}^{${a}} \\left(${k * a * a === 1 ? "" : k * a * a}x - ${k === 1 ? "" : k}x^{3}\\right) dx = 2 \\cdot ${loop.tex()} = ${v.tex()}`],
  };
}

/** The volumes beyond one disc (#749): cross-sections and a washer. */
function volumeMore(r: Rng, w: PracticeWords): Part {
  const K = w.iaK;
  if (r.int(0, 2) < 2) {
    // The base is under y = f on [0, h]; the cross-sections across x are squares, semicircles or triangles on y.
    const kind = r.int(0, 2);
    const k = r.int(1, 3);
    const h = kind === 2 ? r.int(2, 4) : r.int(1, 3);
    const f = kind === 0
      ? { y: `${k === 1 ? "" : k}x`, sq: `${k * k === 1 ? "" : k * k}x^{2}`, S: F(k * k * h ** 3, 3), one: (k * h * h) / 2 }
      : kind === 1
        ? { y: `\\sqrt{${k === 1 ? "" : k}x}`, sq: `${k === 1 ? "" : k}x`, S: F(k * h * h, 2), one: (2 / 3) * Math.sqrt(k) * h ** 1.5 }
        : { y: `${h} - x`, sq: `(${h} - x)^{2}`, S: F(h ** 3, 3), one: (h * h) / 2 };
    const q = `y = ${f.y}, \\quad 0 \\le x \\le ${h}`;
    const shape = r.int(0, 2);
    const base = `\\int_{0}^{${h}} ${f.sq} \\, dx = ${f.S.tex()}`;
    if (shape === 0)
      return { prompt: fill(K.squareQ, { h }), q, ...exact(f.S, [["sideNotSquared", f.one], ["piForSquares", f.S.toNumber() * Math.PI]]), steps: [`A(x) = y^{2}`, `V = ${base}`] };
    if (shape === 1) {
      const v = f.S.div(F(8));
      return { prompt: fill(K.semiQ, { h }), q, ...piTimes(v, [["semicircleRadiusAsDiameter", f.S.div(F(2)).toNumber() * Math.PI]]), steps: [`A(x) = \\tfrac{1}{2}\\pi\\left(\\tfrac{y}{2}\\right)^{2} = \\tfrac{\\pi}{8}y^{2}`, `V = \\tfrac{\\pi}{8} \\cdot ${f.S.tex()} = ${v.tex()}\\pi`] };
    }
    const v = f.S.div(F(2));
    return { prompt: fill(K.triangleQ, { h }), q, ...exact(v, [["triangleHalfLeftOut", f.S]]), steps: [`A(x) = \\tfrac{1}{2}y^{2}`, `V = \\tfrac{1}{2} \\cdot ${f.S.tex()} = ${v.tex()}`] };
  }
  // The region between y = c x (above) and y = x² on [0, c], turned about the x-axis.
  const c = r.int(1, 3);
  const v = F(2 * c ** 5, 15);
  const cx = `${c === 1 ? "" : c}x`;
  return {
    prompt: K.washerQ,
    q: `y = ${cx}, \\quad y = x^{2}`,
    ...piTimes(v, [["differenceSquared", (c ** 5 / 30) * Math.PI], ["innerLeftOut", (c ** 5 / 3) * Math.PI]]),
    steps: [`${cx} = x^{2} \\Rightarrow x = 0, \\ ${c}`, `V = \\pi \\int_{0}^{${c}} \\left(${c * c === 1 ? "" : c * c}x^{2} - x^{4}\\right) dx = ${v.tex()}\\pi`],
  };
}

/** A value to three places with named slips at the same tolerance. */
function approx(v: number, show: string, slips: [Trap["id"], number, Record<string, string | number>?][]): Pick<Part, "answer" | "show" | "plain" | "format"> {
  const traps: Trap[] = slips.filter(([, t]) => Math.abs(t - v) > 0.01).map(([id, t, vars]) => ({ id, a: num(t, 0.0006), ...(vars ? { vars } : {}) }));
  return { answer: { ...num(v, 0.0006), traps }, show: `${show} \\approx ${dp(v, 3)}`, plain: dp(v, 6), format: "dp3" };
}

/** Other axes and settings (#749): a disc or washer about another line, what an integral means, a leaking tank. */
function contextMore(r: Rng, w: PracticeWords): Part {
  const K = w.iaK;
  const kind = r.int(0, 3);
  if (kind === 0) {
    // The region between y = x² and y = c², turned about y = c²: discs of radius c² − x².
    const c = r.int(1, 2);
    const top = c * c;
    const v = F(16 * c ** 5, 15);
    return {
      prompt: fill(K.axisQ, { axis: `y = ${top}` }),
      q: `y = x^{2}, \\quad y = ${top}`,
      ...piTimes(v, [["axisDistanceLeftOut", F(8 * c ** 5, 5).toNumber() * Math.PI, { h: top }]]),
      steps: [`r = ${top} - x^{2}, \\quad -${c} \\le x \\le ${c}`, `V = \\pi \\int_{-${c}}^{${c}} \\left(${top} - x^{2}\\right)^{2} dx = ${v.tex()}\\pi`],
    };
  }
  if (kind === 1) {
    // The region between y = c x and y = x², turned about y = −d: R = c x + d, r = x² + d.
    const c = r.int(1, 2);
    const d = r.int(1, 3);
    const v = F(2 * c ** 5, 15).add(F(d * c ** 3, 3));
    const cx = `${c === 1 ? "" : c}x`;
    const [R, rr] = [`${cx} + ${d}`, `x² + ${d}`];
    return {
      prompt: fill(K.axisQ, { axis: `y = −${d}` }),
      q: `y = ${cx}, \\quad y = x^{2}`,
      ...piTimes(v, [["axisShiftLeftOut", F(2 * c ** 5, 15).toNumber() * Math.PI, { d, R, r: rr }], ["shiftSubtracted", F(2 * c ** 5, 15).sub(F(d * c ** 3, 3)).toNumber() * Math.PI, { d }], ["differenceSquared", (c ** 5 / 30) * Math.PI]]),
      steps: [`R = ${cx} + ${d}, \\quad r = x^{2} + ${d}`, `V = \\pi \\int_{0}^{${c}} \\left((${cx} + ${d})^{2} - (x^{2} + ${d})^{2}\\right) dx = ${v.tex()}\\pi`],
    };
  }
  if (kind === 2) {
    // What ∫ₐᵇ of a rate means: the change over [a, b], not a rate, an amount at b or an average.
    const set = r.pick(["water", "car", "town"] as const);
    // From a ≥ 1 on, so "the amount at b" is never the change since the start.
    const a = r.int(1, 4);
    const b = a + r.int(2, 5);
    const v = r.int(3, 12) * 10;
    const f = { water: "r", car: "v", town: "p" }[set];
    const say = (part: "Given" | "Right" | "Rate" | "Amount" | "Average") => K[`${set}${part}`];
    const vars = { a, b, v };
    const opts = (["Right", "Rate", "Amount", "Average"] as const).map((t) => fill(say(t), vars));
    return {
      ...pickPart(r, opts, 0, [{ id: "integralAsRate", at: 1 }, { id: "integralAsAmount", at: 2 }, { id: "integralAsAverage", at: 3, vars: { w: b - a } }], fill(K.meaningQ, { given: say("Given") }), [`\\int_{${a}}^{${b}} ${f}(t)\\,dt = ${f === "r" ? "W" : f === "v" ? "s" : "P"}(${b}) - ${f === "r" ? "W" : f === "v" ? "s" : "P"}(${a})`]),
      q: `\\int_{${a}}^{${b}} ${f}(t)\\,dt = ${v}`,
    };
  }
  // A tank leaks at a e^(−t/m) litres an hour: the amount in the first T hours is a m (1 − e^(−T/m)).
  const a = r.int(2, 9);
  const m = r.pick([2, 4, 5] as const);
  const T = r.int(2, 6);
  const am = a * m;
  const tail = Math.exp(-T / m);
  return {
    prompt: fill(K.leakQ, { T }),
    q: `r(t) = ${a}e^{-t/${m}}`,
    ...approx(am * (1 - tail), `${am}\\left(1 - e^{-${T}/${m}}\\right)`, [["rateAtTimeGiven", a * tail, { T }], ["lowerLimitLeftOut", -am * tail, { am, m, T }], ["divisorLeftOut", a * (1 - tail), { m }]]),
    steps: [`\\int_{0}^{${T}} ${a}e^{-t/${m}}\\,dt = \\left[-${am}e^{-t/${m}}\\right]_{0}^{${T}}`, `= ${am}\\left(1 - e^{-${T}/${m}}\\right)`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return L === 1 ? areaMore(r, w) : L === 2 ? volumeMore(r, w) : contextMore(r, w);
  return L === 1 ? areaPart(r, w) : L === 2 ? volumePart(r, w) : arcPart(r, w);
};

export default gen;
