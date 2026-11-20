// Practice: what kind of PDE it is. Easy gives a PDE's order (the highest power or the number of variables taken for
// it, named) or whether it is linear homogeneous, linear inhomogeneous or nonlinear (variable coefficients taken as
// nonlinear, a source term missed, a product or power of u missed, named); medium classifies a u_xx + b u_xy + c u_yy
// by b² − 4ac (the sign read backwards, the 4 left out, named); hard classifies a variable-coefficient PDE at a point
// (the same slips) or finds the larger slope of the straight characteristics a m² − b m + c = 0 (the sign of b
// flipped, the slopes inverted, named).
import { exact, pickOf, word, type NumSlip } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { F, coefTex, discriminant, sumTex, typeOf } from "../pdes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { wholeOf } from "../realAnalysis";

// kind: 0 linear homogeneous, 1 linear inhomogeneous, 2 nonlinear; power: the highest power of a derivative or of u;
// vars: the number of independent variables; slips: the kinds a slip picks.
const PDES: { tex: string; order: number; power: number; vars: number; kind: 0 | 1 | 2; why: string; slips: [MistakeId, number][] }[] = [
  { tex: "u_{t} = u_{xx}", order: 2, power: 1, vars: 2, kind: 0, why: "u_{xx}", slips: [] },
  { tex: "u_{t} + u u_{x} = 0", order: 1, power: 1, vars: 2, kind: 2, why: "u u_{x}", slips: [["productNonlinearMissed", 0]] },
  { tex: "u_{tt} - u_{xx} = \\sin x", order: 2, power: 1, vars: 2, kind: 1, why: "\\sin x", slips: [["sourceTermHomogeneous", 0]] },
  { tex: "u_{xx} + u_{yy} + u_{zz} = 0", order: 2, power: 1, vars: 3, kind: 0, why: "u_{xx}", slips: [] },
  { tex: "(u_{x})^{3} + u_{y} = 0", order: 1, power: 3, vars: 2, kind: 2, why: "(u_{x})^{3}", slips: [["productNonlinearMissed", 0]] },
  { tex: "x^{2} u_{xx} + y u_{y} = 0", order: 2, power: 1, vars: 2, kind: 0, why: "x^{2} u_{xx}", slips: [["variableCoefficientNonlinear", 2]] },
  { tex: "u_{tt} + u_{xxxx} = 0", order: 4, power: 1, vars: 2, kind: 0, why: "u_{xxxx}", slips: [] },
  { tex: "u_{t} = u_{xx} + e^{-t}", order: 2, power: 1, vars: 2, kind: 1, why: "e^{-t}", slips: [["sourceTermHomogeneous", 0]] },
  { tex: "u_{xx} + u_{yy} = u^{3}", order: 2, power: 3, vars: 2, kind: 2, why: "u^{3}", slips: [["productNonlinearMissed", 0]] },
  { tex: "u_{x} + e^{x} u_{y} = xy", order: 1, power: 1, vars: 2, kind: 1, why: "xy", slips: [["sourceTermHomogeneous", 0], ["variableCoefficientNonlinear", 2]] },
  { tex: "u_{t} + u_{xxx} + 6u u_{x} = 0", order: 3, power: 1, vars: 2, kind: 2, why: "u u_{x}", slips: [["productNonlinearMissed", 0]] },
  { tex: "u_{t} = x u_{xx} + t u_{x}", order: 2, power: 1, vars: 2, kind: 0, why: "x u_{xx}", slips: [["variableCoefficientNonlinear", 2]] },
  { tex: "u_{x} u_{y} = 1", order: 1, power: 1, vars: 2, kind: 2, why: "u_{x} u_{y}", slips: [["productNonlinearMissed", 1]] },
  { tex: "u_{xxy} + u_{y} = \\cos y", order: 3, power: 1, vars: 2, kind: 1, why: "\\cos y", slips: [["sourceTermHomogeneous", 0]] },
];

function basicPart(r: Rng, w: PracticeWords): Part {
  const e = r.pick(PDES);
  if (r.next() < 0.5)
    return {
      prompt: w.pde.prompt.order,
      q: e.tex,
      ...wholeOf(e.order, [["orderFromPower", e.power], ["orderCountsVariables", e.vars]]),
      steps: [`${e.order}`],
    };
  const options = [word(w.pde.kind.linHom), word(w.pde.kind.linInhom), word(w.pde.kind.nonlinear)];
  return { prompt: w.pde.prompt.linearity, q: e.tex, ...pickOf(options, e.kind, e.slips), steps: [e.why] };
}

/** The type pick with the two discriminant slips: its sign read backwards, and b² − ac. */
function typed(w: PracticeWords, a: number, b: number, c: number) {
  const d = discriminant(a, b, c);
  const t = typeOf(d);
  const options = [word(w.pde.type.elliptic), word(w.pde.type.parabolic), word(w.pde.type.hyperbolic)];
  const slips: [MistakeId, number][] = [];
  if (t !== 1) slips.push(["discriminantSignSwapped", 2 - t]);
  const noFour = typeOf(b * b - a * c);
  if (noFour !== t && !slips.some(([, i]) => i === noFour)) slips.push(["discriminantNoFour", noFour]);
  return { d, ...pickOf(options, t, slips) };
}
const neg = (v: number) => (v < 0 ? `(${v})` : String(v));

function constantPart(r: Rng, w: PracticeWords): Part {
  let a: number, b: number, c: number;
  if (r.next() < 0.25) {
    // A perfect square (s∂x + t∂y)², so b² = 4ac.
    const s = r.int(1, 3);
    const t = r.pick([-3, -2, -1, 1, 2, 3]);
    [a, b, c] = [s * s, 2 * s * t, t * t];
  } else {
    do {
      a = r.pick([-3, -2, -1, 1, 2, 3, 4]);
      b = r.int(-6, 6);
      c = r.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    } while (discriminant(a, b, c) === 0);
  }
  const lower = r.pick(["", "u_{x}", "-3u", "2u_{y}"]);
  const res = typed(w, a, b, c);
  return {
    prompt: w.pde.prompt.classify,
    q: `${sumTex([coefTex(a, "u_{xx}"), coefTex(b, "u_{xy}"), coefTex(c, "u_{yy}"), lower])} = 0`,
    ...res,
    steps: [`a = ${a}, \\quad b = ${b}, \\quad c = ${c}`, `b^{2} - 4ac = ${neg(b)}^{2} - 4 \\cdot ${neg(a)} \\cdot ${neg(c)} = ${res.d}`, res.d < 0 ? `${res.d} < 0` : res.d === 0 ? "0 = 0" : `${res.d} > 0`],
  };
}

// Variable coefficients A(x, y), B(x, y), C(x, y) as TeX and as functions.
// A coefficient "0" leaves its term out, "1" writes the derivative alone.
type Coef = [string, (x: number, y: number) => number];
const ZERO: Coef = ["0", () => 0];
const ONE: Coef = ["1", () => 1];
const VARIABLE: { a: Coef; b: Coef; c: Coef }[] = [
  { a: ["y", (_x, y) => y], b: ZERO, c: ONE },
  { a: ONE, b: ZERO, c: ["x", (x) => x] },
  { a: ["x", (x) => x], b: ["2", () => 2], c: ["y", (_x, y) => y] },
  { a: ONE, b: ["2x", (x) => 2 * x], c: ONE },
  { a: ["x", (x) => x], b: ZERO, c: ["-y", (_x, y) => -y] },
  { a: ONE, b: ["y", (_x, y) => y], c: ["x", (x) => x] },
];
const term = ([t]: Coef, body: string) => (t === "0" ? "" : t === "1" ? body : t.startsWith("-") ? `-${t.slice(1)} ${body}` : `${t} ${body}`);

function atPointPart(r: Rng, w: PracticeWords): Part {
  const v = r.pick(VARIABLE);
  let x: number, y: number;
  let a: number, b: number, c: number;
  do {
    x = r.int(-3, 3);
    y = r.int(-3, 3);
    [a, b, c] = [v.a[1](x, y), v.b[1](x, y), v.c[1](x, y)];
  } while (a === 0 && b === 0 && c === 0);
  const res = typed(w, a, b, c);
  return {
    prompt: fill(w.pde.prompt.classifyAt, { x, y }),
    q: `${sumTex([term(v.a, "u_{xx}"), term(v.b, "u_{xy}"), term(v.c, "u_{yy}")])} = 0`,
    ...res,
    steps: [`a = ${a}, \\quad b = ${b}, \\quad c = ${c}`, `b^{2} - 4ac = ${neg(b)}^{2} - 4 \\cdot ${neg(a)} \\cdot ${neg(c)} = ${res.d}`, res.d < 0 ? `${res.d} < 0` : res.d === 0 ? "0 = 0" : `${res.d} > 0`],
  };
}

function characteristicPart(r: Rng, w: PracticeWords): Part {
  // a m² − b m + c = 0 with roots m₁ > m₂: b = a(m₁ + m₂), c = a m₁ m₂.
  const a = r.pick([1, 1, 2, 3, -1]);
  let m1: number, m2: number;
  do {
    m1 = r.int(-4, 4);
    m2 = r.int(-4, 4);
  } while (m1 <= m2 || m1 === -m2);
  const b = a * (m1 + m2);
  const c = a * m1 * m2;
  const slips: NumSlip[] = [["characteristicSignFlip", -m2]];
  if (m1 !== 0 && m2 !== 0) slips.push(["characteristicInverted", Math.max(1 / m1, 1 / m2) === 1 / m1 ? F(1, m1) : F(1, m2)]);
  return {
    prompt: w.pde.prompt.characteristic,
    q: `${sumTex([coefTex(a, "u_{xx}"), coefTex(b, "u_{xy}"), coefTex(c, "u_{yy}")])} = 0`,
    ...exact(F(m1), slips),
    steps: [
      `${sumTex([coefTex(a, "m^{2}"), coefTex(-b, "m"), c === 0 ? "" : String(c)])} = 0`,
      `${a === 1 ? "" : a === -1 ? "-" : a}(m ${m1 < 0 ? `+ ${-m1}` : `- ${m1}`})(m ${m2 < 0 ? `+ ${-m2}` : `- ${m2}`}) = 0`,
      `m = ${m1}, \\quad m = ${m2}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? basicPart(r, w) : L === 2 ? constantPart(r, w) : r.next() < 0.5 ? atPointPart(r, w) : characteristicPart(r, w));

export default gen;
