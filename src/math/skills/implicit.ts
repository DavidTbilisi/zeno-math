// Practice: Implicit differentiation. Easy is the gradient of a circle or an ellipse at a point; medium a curve with
// an xy term, whose derivative needs the product rule (the x·dy/dx part left out, named); hard is related rates: a
// ladder sliding down a wall (both ends taken to move at the same speed, named) or a spreading ripple (the rate dr/dt
// left out of dA/dt, named). Since #745 half the seeds ask about inverses instead: the derivative of an inverse
// function at a point from values of f (L1), the derivatives of arcsin, arccos and arctan of kx (L2), and the second
// derivative of a circle at a point (L3).
import { exact, F, piTimes } from "../calculusTwo";
import { fill } from "../chart";
import { minus } from "../logicSets";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

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

/** Inverses (#745): an inverse function's derivative, inverse trigonometry, a circle's second derivative. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.imK;
  if (L === 1) {
    const a = r.int(-3, 4);
    const b = a + r.nz(-4, 5);
    const [d, e] = [r.nz(-6, 6), r.nz(-6, 6)];
    return {
      prompt: fill(K.inverseQ, { b: minus(b) }), q: `f(${a}) = ${b}, \\quad f'(${a}) = ${d}, \\quad f'(${b}) = ${e}`,
      ...exact(F(1, d), [["inverseDerivNotFlipped", F(d), { a: minus(a), b: minus(b) }], ["inverseDerivWrongPoint", F(1, e), { a: minus(a), b: minus(b) }]]),
      steps: [`g(${b}) = ${a}`, `g'(${b}) = \\frac{1}{f'(g(${b}))} = \\frac{1}{f'(${a})} = ${F(1, d).tex()}`],
    };
  }
  if (L === 2) {
    const fn = r.pick(["arcsin", "arccos", "arctan"] as const);
    const k = r.int(1, 4);
    const u = k === 1 ? "x" : `${k}x`;
    const u2 = k === 1 ? "x²" : `${k * k}x²`;
    const root = (c: number) => `${c < 0 ? "−" : ""}${Math.abs(c)} ÷ √(1 − ${u2})`;
    const over = (c: number) => `${c < 0 ? "−" : ""}${Math.abs(c)} ÷ (1 + ${u2})`;
    const sign = fn === "arccos" ? -1 : 1;
    const right = fn === "arctan" ? over(k) : root(sign * k);
    const opts = [right, fn === "arctan" ? over(-k) : root(-sign * k), fn === "arctan" ? root(k) : over(sign * k), ...(k > 1 ? [fn === "arctan" ? over(1) : root(sign)] : [])];
    const tx = { arcsin: "\\arcsin", arccos: "\\arccos", arctan: "\\arctan" }[fn];
    const rule = { arcsin: "\\frac{1}{\\sqrt{1 - u^{2}}}", arccos: "-\\frac{1}{\\sqrt{1 - u^{2}}}", arctan: "\\frac{1}{1 + u^{2}}" }[fn];
    return pickPart(r, opts, 0, [{ id: "inverseTrigSign", at: 1 }, { id: "inverseTrigFormsMixed", at: 2 }, ...(k > 1 ? [{ id: "chainInsideLost" as const, at: 3, vars: { k, u } }] : [])],
      fill(w.dvK.whichQ, { f: `${fn}(${u})` }), [`\\frac{d}{du}${tx}\\,u = ${rule}`, `u = ${u}: \\quad \\frac{du}{dx} = ${k}`]);
  }
  const [s0, t0] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15]] as const);
  const [p, q] = (r.next() < 0.5 ? [s0, t0] : [t0, s0]).map((v) => v * r.sign());
  const c = p * p + q * q;
  const v = F(-c, q ** 3);
  return {
    prompt: fill(K.secondQ, { x: minus(p), y: minus(q) }), q: `x^{2} + y^{2} = ${c}`,
    ...exact(v, [["implicitSecondYConstant", F(-1, q)]]),
    steps: [`\\frac{dy}{dx} = -\\frac{x}{y}`, `\\frac{d^{2}y}{dx^{2}} = -\\frac{y - x\\frac{dy}{dx}}{y^{2}} = -\\frac{y^{2} + x^{2}}{y^{3}} = -\\frac{${c}}{y^{3}}`, `= -\\frac{${c}}{${q < 0 ? `(${q})` : q}^{3}} = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  return L === 1 ? conicPart(r, w) : L === 2 ? productPart(r, w) : ratesPart(r, w);
};

export default gen;
