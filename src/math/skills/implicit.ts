// Practice: Implicit differentiation. Easy is the gradient of a circle or an ellipse at a point; medium a curve with
// an xy term, whose derivative needs the product rule (the x·dy/dx part left out, named); hard is related rates: a
// ladder sliding down a wall (both ends taken to move at the same speed, named) or a spreading ripple (the rate dr/dt
// left out of dA/dt, named). Since #745 half the seeds ask about inverses instead: the derivative of an inverse
// function at a point from values of f (L1), the derivatives of arcsin, arccos and arctan of kx (L2), and the second
// derivative of a circle at a point (L3). Since #747 another three in ten are related rates: a rectangle's area with
// two rates, an equation differentiated in t and the tangent line to an implicit curve (L1); two cars from a crossroads,
// which expression is dQ/dt and which equation links the quantities (L2); a filling cone, a lamp's shadow and a balloon
// (L3).
import { exact, F, numTraps, piTimes, type NumSlip } from "../calculusTwo";
import { fill } from "../chart";
import { fromPoly, tex } from "../expr";
import type { Frac } from "../fraction";
import { minus } from "../logicSets";
import { num, plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
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

const piUnder = (q: Frac) => `\\frac{${q.n}}{${q.d === 1 ? "" : q.d}\\pi}`;
/** A rational number over π, such as 3/(4π). */
function overPi(q: Frac, slips: NumSlip[] = []): Pick<Part, "answer" | "show" | "plain" | "format"> {
  const v = q.toNumber() / Math.PI;
  const traps = numTraps(v, slips);
  return {
    answer: { ...num(v), ...(traps.length ? { traps } : {}) },
    show: piUnder(q),
    plain: q.d === 1 ? `${q.n}/pi` : `${q.n}/(${q.d}pi)`,
    format: "exact",
  };
}

const sup = (n: number) => ["", "", "²", "³"][n];
const lineTex = (m: Frac, c: Frac) => `y = ${tex(fromPoly([c, m]))}`;

/** Related rates (#747). */
function rates(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.rrK;
  const kind = r.int(0, 2);
  if (L === 1 && kind === 0) {
    // A rectangle: the length grows, the width shrinks; dA/dt = l·dw/dt + w·dl/dt.
    const [ll, bb, a] = [r.int(4, 12), r.int(3, 10), r.int(1, 4)];
    let c = r.int(1, 3);
    while (bb * a === ll * c) c = r.int(1, 3);
    const ans = bb * a - ll * c;
    const vars = { l: ll, a, b: bb, c };
    return {
      prompt: fill(K.rectQ, vars), q: `A = l \\cdot w, \\quad \\frac{dl}{dt} = ${a}, \\quad \\frac{dw}{dt} = -${c}`,
      ...exact(F(ans), [["productRateOneTerm", -ll * c, vars], ["productRateOneTerm", bb * a, vars], ["ratesMultiplied", -a * c], ["decreasingRatePositive", bb * a + ll * c, { c }]]),
      steps: [`\\frac{dA}{dt} = l\\frac{dw}{dt} + w\\frac{dl}{dt}`, `= ${ll} \\cdot (-${c}) + ${bb} \\cdot ${a} = ${ans}`],
    };
  }
  if (L === 1 && kind === 1) {
    // Differentiate a x^m + b y^n = c in t: each term gets its own rate.
    const [a, b, m, n] = [r.int(1, 3), r.int(1, 3), r.int(2, 3), r.int(2, 3)];
    const c = r.int(5, 40);
    const term = (k: number, v: string, p: number) => `${k === 1 ? "" : k}${v}^{${p}}`;
    const dterm = (k: number, v: string, p: number) => `${k * p}${v}${p - 1 > 1 ? sup(p - 1) : ""}`;
    const [X, Y] = [dterm(a, "x", m), dterm(b, "y", n)];
    const opts = [`${X}·dx/dt + ${Y}·dy/dt = 0`, `${X} + ${Y} = 0`, `${X} + ${Y}·dy/dt = 0`, `${X}·dx/dt + ${Y}·dy/dt = ${c}`];
    const part = pickPart(r, opts, 0, [{ id: "rateFactorsDropped", at: 1 }, { id: "oneRateOnly", at: 2 }, { id: "constantRateKept", at: 3 }], K.diffQ,
      [`\\frac{d}{dt}\\,x^{${m}} = ${m}x^{${m - 1}}\\frac{dx}{dt}, \\quad \\frac{d}{dt}\\,y^{${n}} = ${n}y^{${n - 1}}\\frac{dy}{dt}`, `\\frac{d}{dt}\\,${c} = 0`]);
    return { ...part, q: `${term(a, "x", m)} + ${term(b, "y", n)} = ${c}` };
  }
  if (L === 1) {
    // The tangent line to a x² + b y² = c at a point on it.
    let [a, b] = [1, 1];
    let [p, q] = [3, 4];
    if (r.next() < 0.5) {
      const [u, v] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15]] as const);
      [p, q] = (r.next() < 0.5 ? [u, v] : [v, u]).map((t) => t * r.sign());
    } else {
      [a, b] = [r.int(2, 4), r.int(1, 4)];
      while (b === a) b = r.int(1, 4);
      [p, q] = [r.nz(-3, 3), r.nz(-3, 3)];
      while (a * p * a * p === b * q * b * q) q = r.nz(-3, 3);
    }
    const c = a * p * p + b * q * q;
    const line = (m: Frac) => ({ m, c: F(q).sub(m.mul(F(p))) });
    const right = line(F(-a * p, b * q));
    const slips: [Trap["id"], Frac][] = [["normalForTangent", F(b * q, a * p)], ["implicitSlopeFlipped", F(-b * q, a * p)]];
    const ms = plainFrac(right.m).replace("-", "−");
    return {
      prompt: fill(K.tangentQ, { x: minus(p), y: minus(q) }), q: `${coef(a, "x^{2}")} + ${coef(b, "y^{2}")} = ${c}`,
      answer: { k: "expr", e: fromPoly([right.c, right.m]), mode: "line", traps: slips.map(([id, m]) => ({ id, a: { k: "expr" as const, e: fromPoly([line(m).c, line(m).m]), mode: "line" as const }, vars: { m: ms } })) },
      show: lineTex(right.m, right.c), plain: `y = (${plainFrac(right.m)})x + (${plainFrac(right.c)})`, format: "line",
      steps: [`${2 * a}x + ${2 * b}y\\frac{dy}{dx} = 0: \\quad \\frac{dy}{dx} = -\\frac{${coef(a, "x")}}{${coef(b, "y")}} = ${right.m.tex()}`, `y - ${q < 0 ? `(${q})` : q} = ${right.m.tex()}\\left(x - ${p < 0 ? `(${p})` : p}\\right)`, lineTex(right.m, right.c)],
    };
  }
  if (L === 2 && kind === 0) {
    // Two cars from a crossroads: D² = x² + y², dD/dt = (x·dx/dt + y·dy/dt)/D.
    const [u, v0, d0] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]] as const);
    const [x, y] = r.next() < 0.5 ? [u, v0] : [v0, u];
    const toward = r.next() < 0.5;
    const a = r.int(4, 12) * 5;
    const sa = toward ? -a : a;
    let bb = r.int(4, 12) * 5;
    while (x * sa + y * bb === 0) bb += 5;
    const top = x * sa + y * bb;
    const ans = F(top, d0);
    const vars = { x, a, y, b: bb };
    return {
      prompt: fill(toward ? K.carsTowardQ : K.carsAwayQ, vars), q: `D^{2} = x^{2} + y^{2}`,
      ...exact(ans, [["distanceRateAsSum", a + bb], ["distanceNotDividedOut", top, { d: d0 }], ...(toward ? [["decreasingRatePositive", F(x * a + y * bb, d0), { c: a }] as NumSlip] : [])]),
      steps: [`2D\\frac{dD}{dt} = 2x\\frac{dx}{dt} + 2y\\frac{dy}{dt}`, `D = \\sqrt{${x}^{2} + ${y}^{2}} = ${d0}`, `\\frac{dD}{dt} = \\frac{${x} \\cdot ${sa < 0 ? `(${sa})` : sa} + ${y} \\cdot ${bb}}{${d0}} = ${ans.tex()}`],
    };
  }
  if (L === 2 && kind === 1) {
    // Which expression is dQ/dt for Q = c·v^n.
    const [Q, v, qTex, cText, ncText, n] = r.pick([
      ["A", "s", "A = s^{2}", "", "2", 2], ["V", "s", "V = s^{3}", "", "3", 3], ["A", "r", "A = \\pi r^{2}", "π", "2π", 2],
      ["V", "r", "V = \\frac{4}{3}\\pi r^{3}", "(4/3)π", "4π", 3], ["S", "r", "S = 4\\pi r^{2}", "4π", "8π", 2], ["S", "s", "S = 6s^{2}", "6", "12", 2],
    ] as const);
    const low = `${v}${n - 1 > 1 ? sup(n - 1) : ""}`;
    const opts = [`${ncText}${low}·d${v}/dt`, `${ncText}${low}`, `${cText}(d${v}/dt)${sup(n)}`, `${cText}${v}${sup(n)}·d${v}/dt`];
    const part = pickPart(r, opts, 0, [{ id: "rateFactorLeftOut", at: 1, vars: { v } }, { id: "rateForVariable", at: 2, vars: { v } }, { id: "powerKeptInRate", at: 3, vars: { v } }],
      fill(K.exprQ, { v, Q }), [`\\frac{d${Q}}{dt} = \\frac{d${Q}}{d${v}} \\cdot \\frac{d${v}}{dt}`, `\\frac{d${Q}}{d${v}} = ${ncText.replace("π", "\\pi ")}${v}${n - 1 > 1 ? `^{${n - 1}}` : ""}`]);
    return { ...part, q: qTex };
  }
  if (L === 2) {
    // Which equation links the quantities: a ladder, or water in a cone.
    if (r.next() < 0.5) {
      const Ld = r.pick([5, 10, 13, 6, 8]);
      return pickPart(r, [`x² + y² = ${Ld * Ld}`, `x + y = ${Ld}`, `x² + y² = ${Ld}`], 0, [{ id: "pythagorasAsSum", at: 1 }, { id: "lengthNotSquared", at: 2, vars: { L: Ld } }],
        fill(K.eqLadderQ, { L: Ld }), [`x^{2} + y^{2} = ${Ld}^{2} = ${Ld * Ld}`]);
    }
    const R = r.int(2, 6);
    let H = r.int(3, 12);
    while (H === R) H = r.int(3, 12);
    return pickPart(r, [`V = (1/3)π(${R}h/${H})²·h`, `V = (1/3)π·${R}²·h`, `V = (1/3)π(${H}h/${R})²·h`], 0, [{ id: "coneRadiusConstant", at: 1 }, { id: "similarRatioFlipped", at: 2 }],
      fill(K.eqConeQ, { R, H }), [`\\frac{r}{h} = \\frac{${R}}{${H}}: \\quad r = \\frac{${R}h}{${H}}`, `V = \\frac{1}{3}\\pi r^{2} h`]);
  }
  if (kind === 0) {
    // A cone filling, point down: r = R h / H, dV/dt = π r² dh/dt.
    const R = r.int(2, 6);
    const k = r.int(2, 3);
    const H = R * k;
    const h = r.int(2, H - 1);
    const q = r.int(2, 12) * 3;
    const ans = F(q * k * k, h * h);
    return {
      prompt: fill(K.coneQ, { R, H, q, h }), q: `V = \\frac{1}{3}\\pi r^{2} h, \\quad \\frac{r}{h} = \\frac{${R}}{${H}}`,
      ...overPi(ans, [["coneRadiusConstant", q / (Math.PI * R * R)]]),
      steps: [`r = \\frac{h}{${k}}: \\quad V = \\frac{\\pi}{${3 * k * k}}h^{3}`, `\\frac{dV}{dt} = \\frac{\\pi}{${k * k}}h^{2}\\frac{dh}{dt}`, `\\frac{dh}{dt} = \\frac{${q} \\cdot ${k * k}}{\\pi \\cdot ${h * h}} = ${piUnder(ans)}`],
    };
  }
  if (kind === 1) {
    // A child walking from a lamp: s/p = (s + d)/Lp, so ds/dt = p·v/(Lp − p) and the tip moves at Lp·v/(Lp − p).
    const Lp = r.int(4, 8);
    const p = r.pick([1, 1.5, 2].filter((t) => t < Lp - 1));
    const v = r.int(1, 3);
    const tip = F(Lp * v * 2, (Lp - p) * 2);
    const len = F(p * v * 2, (Lp - p) * 2);
    const askTip = r.next() < 0.5;
    const ans = askTip ? tip : len;
    return {
      prompt: fill(askTip ? K.shadowTipQ : K.shadowLenQ, { L: Lp, p: String(p), v }), q: `\\frac{s}{${p}} = \\frac{s + d}{${Lp}}, \\quad \\frac{dd}{dt} = ${v}`,
      ...exact(ans, [askTip ? ["shadowLengthForTip", len] : ["shadowTipForLength", tip]]),
      steps: [`${Lp}s = ${p}(s + d): \\quad s = \\frac{${p}}{${Lp - p}}d`, `\\frac{ds}{dt} = \\frac{${p}}{${Lp - p}} \\cdot ${v} = ${len.tex()}`, ...(askTip ? [`\\frac{d(s + d)}{dt} = ${len.tex()} + ${v} = ${tip.tex()}`] : [])],
    };
  }
  // A balloon: dV/dt = 4πr² dr/dt.
  const rad = r.int(2, 10);
  const q = r.int(2, 20) * 10;
  const ans = F(q, 4 * rad * rad);
  return {
    prompt: fill(K.balloonQ, { q, r: rad }), q: `V = \\frac{4}{3}\\pi r^{3}`,
    ...overPi(ans, [["dividedByVolume", (3 * q) / (4 * Math.PI * rad ** 3)]]),
    steps: [`\\frac{dV}{dt} = 4\\pi r^{2}\\frac{dr}{dt}`, `\\frac{dr}{dt} = \\frac{${q}}{4\\pi \\cdot ${rad * rad}} = ${piUnder(ans)}`],
  };
}

const gen: Gen = (r, L, w) => {
  const g = r.int(0, 9);
  if (g >= 7) return more(r, L, w);
  if (g >= 4) return rates(r, L, w);
  return L === 1 ? conicPart(r, w) : L === 2 ? productPart(r, w) : ratesPart(r, w);
};

export default gen;
