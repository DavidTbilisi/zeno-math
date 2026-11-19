// Practice: Implicit differentiation. Easy is the gradient of a circle or an ellipse at a point; medium a curve with
// an xy term, whose derivative needs the product rule (the x·dy/dx part left out, named); hard is related rates: a
// ladder sliding down a wall (both ends taken to move at the same speed, named) or a spreading ripple (the rate dr/dt
// left out of dA/dt, named).
import { exact, F, piTimes } from "../calculusTwo";
import { fill } from "../chart";
import { minus } from "../logicSets";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const coef = (k: number, v: string) => `${k === 1 ? "" : k === -1 ? "-" : k}${v}`;

/** The gradient of a circle or an ellipse at a point on it. */
function conicPart(r: Rng, w: PracticeWords): Part {
  let a = 1;
  let b = 1;
  let p: number;
  let q: number;
  if (r.next() < 0.5) {
    const [u, v] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15]] as const);
    [p, q] = r.next() < 0.5 ? [u, v] : [v, u];
    [p, q] = [p * r.sign(), q * r.sign()];
  } else {
    a = r.int(2, 4);
    b = r.int(1, 4);
    while (b === a) b = r.int(1, 4);
    [p, q] = [r.nz(-3, 3), r.nz(-3, 3)];
  }
  const c = a * p * p + b * q * q;
  const v = F(-a * p, b * q);
  return {
    prompt: fill(w.calc2.prompt.slopeAt, { x: minus(p), y: minus(q) }),
    q: `${coef(a, "x^{2}")} + ${coef(b, "y^{2}")} = ${c}`,
    ...exact(v),
    steps: [`${2 * a}x + ${2 * b}y\\frac{dy}{dx} = 0`, `\\frac{dy}{dx} = -\\frac{${coef(a, "x")}}{${coef(b, "y")}} = -\\frac{${a * p}}{${b * q}} = ${v.tex()}`],
  };
}

/** x² + axy + y² = C at a point: the xy term by the product rule. */
function productPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  let [p, q] = [r.nz(-4, 4), r.nz(-4, 4)];
  while (a * p + 2 * q === 0 || 2 * p + a * q === 0) [p, q] = [r.nz(-4, 4), r.nz(-4, 4)];
  const C = p * p + a * p * q + q * q;
  const v = F(-(2 * p + a * q), a * p + 2 * q);
  const axy = `${a < 0 ? "-" : "+"} ${Math.abs(a) === 1 ? "" : Math.abs(a)}xy`;
  return {
    prompt: fill(w.calc2.prompt.slopeAt, { x: minus(p), y: minus(q) }),
    q: `x^{2} ${axy} + y^{2} = ${C}`,
    ...exact(v, [["droppedProductTerm", F(-(2 * p + a * q), 2 * q)]]),
    steps: [
      `2x ${a < 0 ? "-" : "+"} ${Math.abs(a) === 1 ? "" : Math.abs(a)}\\left(y + x\\frac{dy}{dx}\\right) + 2y\\frac{dy}{dx} = 0`,
      `\\frac{dy}{dx} = -\\frac{2x ${a < 0 ? "-" : "+"} ${Math.abs(a)}y}{${coef(a, "x")} + 2y} = -\\frac{${2 * p + a * q}}{${a * p + 2 * q}} = ${v.tex()}`,
    ],
  };
}

/** Related rates: a ladder sliding down a wall, or a ripple spreading. */
function ratesPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const [u, v0] = r.pick([[3, 4], [6, 8], [5, 12], [8, 15], [7, 24]] as const);
    const [x, y] = r.next() < 0.5 ? [u, v0] : [v0, u];
    const L = Math.hypot(x, y);
    const v = r.int(1, 4);
    const ans = F(x * v, y);
    return {
      prompt: fill(w.calc2.prompt.ladder, { L, v, x }),
      q: `x^{2} + y^{2} = ${L}^{2}, \\quad \\frac{dx}{dt} = ${v}`,
      ...exact(ans, [["sameRateBothEnds", v, { v }]]),
      steps: [
        `2x\\frac{dx}{dt} + 2y\\frac{dy}{dt} = 0`,
        `x = ${x}: \\quad y = \\sqrt{${L * L} - ${x * x}} = ${y}`,
        `\\frac{dy}{dt} = -\\frac{x}{y}\\frac{dx}{dt} = -\\frac{${x} \\cdot ${v}}{${y}} = ${ans.neg().tex()}`,
      ],
    };
  }
  const [rad, v] = [r.int(2, 10), r.int(2, 5)];
  return {
    prompt: fill(w.calc2.prompt.ripple, { v, r: rad }),
    q: `A = \\pi r^{2}, \\quad \\frac{dr}{dt} = ${v}`,
    ...piTimes(F(2 * rad * v), [["forgotRateFactor", 2 * rad * Math.PI, { v }]]),
    steps: [`\\frac{dA}{dt} = 2\\pi r \\frac{dr}{dt}`, `= 2\\pi \\cdot ${rad} \\cdot ${v} = ${2 * rad * v}\\pi`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? conicPart(r, w) : L === 2 ? productPart(r, w) : ratesPart(r, w));

export default gen;
