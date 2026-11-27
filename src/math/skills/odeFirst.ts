// Practice: First-order differential equations. Easy separates the variables of y′ = kxⁿy with an initial value (the
// constant added after taking e^, named); medium is y′ + ay = be^(cx) by an integrating factor (e^(−ax) for e^(ax),
// named); hard finds the potential ψ of an exact equation (∫M dx and ∫N dy added, their shared terms counted twice,
// named).
import { exact, F, pickOf, shuffled, sym, type NumSlip } from "../calculusTwo";
import { fill } from "../chart";
import type { MistakeId } from "../mistakes";
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

// ---------- since #752: equations written from a story, which ones separate, implicit solutions, where a solution
// lives, a slip in a worked solution, homogeneous equations, and Newton's law of cooling ----------

const neg = (v: number | string) => String(v).replace("-", "−");

/** L1: which equation a story says: growth, cooling towards a room's temperature, or a rumour reaching a town. */
function writePart(r: Rng, w: PracticeWords): Part {
  const K = w.ofK;
  const k = r.pick([0.1, 0.2, 0.3, 0.5]);
  const kind = r.int(0, 2);
  const eq = (tex: string, plain: string) => sym(tex, plain);
  if (kind === 0) {
    const opts = [eq(`P' = ${k}P`, `P' = ${k}P`), eq(`P' = ${k}t`, `P' = ${k}t`), eq(`P' = -${k}P`, `P' = -${k}P`), eq(`P' = ${k}`, `P' = ${k}`)];
    return {
      prompt: fill(K.growthQ, { k }),
      q: `\\frac{dP}{dt} = \\; ?`,
      ...shuffled(r, opts, 0, [["rateProportionalToTime", 1], ["rateSignFlipped", 2], ["rateOfWrongAmount", 3]]),
      steps: [`\\frac{dP}{dt} = k \\cdot P = ${k}P`],
    };
  }
  if (kind === 1) {
    const A = r.pick([18, 20, 22]);
    const opts = [eq(`T' = -${k}(T - ${A})`, `T' = -${k}(T - ${A})`), eq(`T' = ${k}(T - ${A})`, `T' = ${k}(T - ${A})`), eq(`T' = -${k}T`, `T' = -${k}T`), eq(`T' = -${k}(T + ${A})`, `T' = -${k}(T + ${A})`)];
    return {
      prompt: fill(K.coolQ, { k, A }),
      q: `\\frac{dT}{dt} = \\; ?`,
      ...shuffled(r, opts, 0, [["rateSignFlipped", 1], ["rateOfWrongAmount", 2], ["rateSignFlipped", 3]]),
      steps: [`\\frac{dT}{dt} = -k(T - ${A}) = -${k}(T - ${A})`],
    };
  }
  const N = r.pick([500, 1000, 2000]);
  const opts = [eq(`y' = ${k}(${N} - y)`, `y' = ${k}(${N} - y)`), eq(`y' = ${k}y`, `y' = ${k}y`), eq(`y' = ${k}(y - ${N})`, `y' = ${k}(y - ${N})`), eq(`y' = ${k}t`, `y' = ${k}t`)];
  return {
    prompt: fill(K.rumourQ, { k, N }),
    q: `\\frac{dy}{dt} = \\; ?`,
    ...shuffled(r, opts, 0, [["rateOfWrongAmount", 1], ["rateSignFlipped", 2], ["rateProportionalToTime", 3]]),
    steps: [`\\frac{dy}{dt} = k(${N} - y) = ${k}(${N} - y)`],
  };
}

/** L1: which of four equations separates into f(x)·g(y). */
function separablePick(r: Rng, w: PracticeWords): Part {
  const a = r.int(2, 4);
  const rights = [
    sym(`y' = x^{${a}}y`, `y' = x^${a}y`),
    sym(`y' = \\frac{x + ${a}}{y}`, `y' = (x + ${a})/y`),
    sym(`y' = e^{x + y}`, `y' = e^(x + y)`),
    sym(`y' = xy + ${a}x`, `y' = xy + ${a}x`),
  ];
  const why = [`x^{${a}} \\cdot y`, `(x + ${a}) \\cdot \\frac{1}{y}`, `e^{x} \\cdot e^{y}`, `x(y + ${a})`];
  const i = r.int(0, 3);
  const inside = r.next() < 0.5 ? sym(`y' = \\sin(xy)`, `y' = sin(xy)`) : sym(`y' = \\ln(x + y)`, `y' = ln(x + y)`);
  const opts = [rights[i], sym(`y' = ${a}x + y`, `y' = ${a}x + y`), inside, sym(`y' = xy + ${a}`, `y' = xy + ${a}`)];
  return {
    prompt: w.ofK.separableQ,
    q: `\\frac{dy}{dx} = f(x) \\, g(y) \\; ?`,
    ...shuffled(r, opts, 0, [["sumTakenAsSeparable", 1], ["insideFunctionTaken", 2], ["constantTermIgnored", 3]]),
    steps: [`${rights[i].tex} = ${why[i]}`],
  };
}

/** L2: y′ = a²x/y, y(0) = ±b: y² = a²x² + b², y = ±√(a²x² + b²) at x = c, a Pythagorean triple. */
function implicitPart(r: Rng, w: PracticeWords): Part {
  const [p, b, h] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]] as const);
  const a = p % 2 === 0 && r.next() < 0.5 ? 2 : 1;
  const c = p / a;
  const s = r.sign();
  const y0 = s * b;
  const a2 = a * a;
  const rhs = `${a2 === 1 ? "" : a2}x² + ${b * b}`;
  const slips: NumSlip[] = [["rootTakenTermwise", p + y0, { rhs, y0: neg(y0), C: b * b, a2x: `${a2 === 1 ? "" : a2}x` }]];
  if (s < 0) slips.push(["implicitBranchSign", h, { rhs, y0: neg(y0) }]);
  const ax = a2 === 1 ? "x" : `${a2}x`;
  return {
    prompt: fill(w.ofK.implicitQ, { c }),
    q: `y' = \\frac{${ax}}{y}, \\quad y(0) = ${y0}`,
    ...exact(F(s * h), slips),
    steps: [
      `y \\, dy = ${ax} \\, dx: \\quad \\frac{y^{2}}{2} = \\frac{${a2 === 1 ? "" : a2}x^{2}}{2} + C`,
      `y^{2} = ${a2 === 1 ? "" : a2}x^{2} + ${b * b}, \\quad y = ${s < 0 ? "-" : ""}\\sqrt{${a2 === 1 ? "" : a2}x^{2} + ${b * b}}`,
      `y(${c}) = ${s < 0 ? "-" : ""}\\sqrt{${a2 * c * c} + ${b * b}} = ${s * h}`,
    ],
  };
}

/** L2: y′ = ay², y(0) = k: y = k/(1 − akx), which lives up to x = 1/(ak). */
function domainPart(r: Rng, w: PracticeWords): Part {
  const a = r.pick([1, 1, 2, 3]);
  const k = r.nz(-3, 3);
  const ak = a * k;
  const end = F(1, ak);
  return {
    prompt: w.ofK.domainQ,
    q: `y' = ${a === 1 ? "" : a}y^{2}, \\quad y(0) = ${k}`,
    ...exact(end, [["domainEndpointSign", end.neg(), { k: neg(k), ak: neg(ak) }], ["domainEndpointInverted", ak, { k: neg(k), ak: neg(ak) }]]),
    steps: [
      `\\frac{dy}{y^{2}} = ${a === 1 ? "" : `${a} \\, `}dx: \\quad -\\frac{1}{y} = ${a === 1 ? "" : a}x + C, \\quad C = ${F(-1, k).tex()}`,
      `y = \\frac{${k}}{${linTex([[1, ""], [-ak, "x"]])}}`,
      `${linTex([[1, ""], [-ak, "x"]])} = 0: \\quad x = ${end.tex()}`,
    ],
  };
}

/** L2: a worked solution of y′ = kxy, y(1) = y₀ with one wrong line; which is it? */
function errorPart(r: Rng, w: PracticeWords): Part {
  const k = r.pick([2, 4, 6]);
  const h = k / 2;
  const y0 = r.int(2, 5);
  const bad = r.int(0, 3);
  const hx = `${h === 1 ? "" : h}x^{2}`;
  const right = [`\\frac{dy}{y} = ${k}x \\, dx`, `\\ln|y| = ${hx} + C`, `y = Ae^{${hx}}`, `y = ${y0}e^{${hx} - ${h}}`];
  const lines = [
    [`y \\, dy = ${k}x \\, dx`, `\\frac{y^{2}}{2} = ${hx} + C`, `y = \\sqrt{${k}x^{2} + B}`, `y = \\sqrt{${k}x^{2} + ${y0 * y0 - k}}`],
    [right[0], `\\ln|y| = ${k}x + C`, `y = Ae^{${k}x}`, `y = ${y0}e^{${k}x - ${k}}`],
    [right[0], right[1], `y = e^{${hx}} + C`, `y = e^{${hx}} + ${y0} - e^{${h}}`],
    [right[0], right[1], right[2], `y = ${y0}e^{${hx}}`],
  ][bad];
  const opts = [1, 2, 3, 4].map((n) => sym(`(${n})`, String(n)));
  const blamed: [MistakeId, number, Record<string, string | number>][] = [0, 1, 2, 3].filter((i) => i !== bad).map((i) => ["correctLineBlamed", i, { n: i + 1, m: bad + 1 }]);
  return {
    prompt: w.ofK.errorQ,
    q: `\\begin{array}{l} y' = ${k}xy, \\quad y(1) = ${y0} \\\\ \\hline ${lines.map((l, i) => `(${i + 1}) \\; ${l}`).join(" \\\\ ")} \\end{array}`,
    ...pickOf(opts, bad, blamed),
    steps: [`(${bad + 1}) \\; ${right[bad]}`, ...right.slice(bad + 1).map((l, i) => `(${bad + i + 2}) \\; ${l}`)],
  };
}

/** L2: y′ = (ax + by)/x, y(1) = c, by y = vx: xv′ = a + (b − 1)v, y = −ax/(b − 1) + Cxᵇ. */
function homogeneousPart(r: Rng, w: PracticeWords): Part {
  const b = r.pick([2, 3]);
  const a = r.nz(-3, 3);
  const c = r.int(-3, 3);
  const lam = F(-a, b - 1);
  const C = F(c).sub(lam);
  const y = sumOf([[lam, "x"], [C, `x^${b}`]]);
  const v = sumOf([[lam, ""], [C, b === 2 ? "x" : `x^${b - 1}`]]);
  return {
    prompt: w.ofK.homogeneousQ,
    q: `y' = \\frac{${linTex([[a, "x"], [b, "y"]])}}{x}, \\quad y(1) = ${c}`,
    ...fnOf(y, [["homogeneousNoX", v]]),
    steps: [
      `y = vx, \\; y' = v + xv': \\quad v + xv' = ${linTex([[a, ""], [b, "v"]])}, \\quad xv' = ${linTex([[a, ""], [b - 1, "v"]])}`,
      `\\frac{dv}{${linTex([[a, ""], [b - 1, "v"]])}} = \\frac{dx}{x}: \\quad v = ${lam.tex()} + K${b === 2 ? "x" : `x^{${b - 1}}`}`,
      `y = vx, \\; y(1) = ${c}: \\quad y = ${T(y)}`,
    ],
  };
}

/** L3, a new setting: Newton's law of cooling; T − A shrinks by the factor q every t₁ minutes. */
function coolingPart(r: Rng, w: PracticeWords): Part {
  const A = r.pick([18, 20, 22]);
  const [D, q] = r.pick([[64, F(1, 2)], [64, F(3, 4)], [80, F(1, 2)]] as const);
  const t1 = r.pick([5, 10]);
  const m = r.int(2, 3);
  const T0 = A + D;
  const T1 = q.mul(F(D)).add(F(A));
  const rest = q.mul(q).mul(m === 3 ? q : F(1)).mul(F(D));
  const at = rest.add(F(A));
  const qs = `${q.n}/${q.d}`;
  return {
    prompt: fill(w.ofK.coolingQ, { T0, A, t1, T1: T1.toNumber(), t2: m * t1 }),
    q: `\\frac{dT}{dt} = -k(T - ${A}), \\quad T(0) = ${T0}, \\; T(${t1}) = ${T1.toNumber()}`,
    ...exact(at, [
      ["ambientLeftOut", rest, { A, t1, D, q: qs }],
      ["linearCooling", T0 - m * (T0 - T1.toNumber()), { A, t1, q: qs }],
    ]),
    steps: [
      `T - ${A} = ${D}e^{-kt}`,
      `e^{-${t1}k} = \\frac{${T1.toNumber() - A}}{${D}} = ${q.tex()}`,
      `T(${m * t1}) = ${A} + ${D}\\left(${q.tex()}\\right)^{${m}} = ${A} + ${rest.tex()} = ${at.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) {
    if (L === 1) return r.next() < 0.5 ? writePart(r, w) : separablePick(r, w);
    if (L === 2) return [implicitPart, domainPart, errorPart, homogeneousPart][r.int(0, 3)](r, w);
    return coolingPart(r, w);
  }
  return L === 1 ? separablePart(r, w) : L === 2 ? linearPart(r, w) : exactPart(r, w);
};

export default gen;
