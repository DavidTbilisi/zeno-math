// Practice: The Laplace transform. Easy transforms ae^(bt) plus a power of t, a sine or a cosine (1/(s + b) for
// e^(bt), the n! of tⁿ left out, sine and cosine swapped, named); medium inverts (ps + q)/((s − a)(s − b)) by partial
// fractions (e^(−at) for 1/(s − a), named); hard solves y′ + ay = b or y″ + ω²y = 0 with initial values through the
// transform (the initial values left out of ℒ{y′} and ℒ{y″}, named).
import { F, minusA } from "../calculusTwo";
import type { MistakeId } from "../mistakes";
import { coef, ex, fnOf, linTex, sumOf, T } from "../odes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const S = ["s"];
const TT = ["t"];
/** c·top/den as typed, top "" (a number) or "s": signed terms joined. */
function fracs(terms: [number, "" | "s", string][]): string {
  let out = "";
  for (const [c, top, den] of terms) {
    if (c === 0) continue;
    const n = Math.abs(c);
    const t = `${top === "" ? n : n === 1 ? "s" : `${n}s`}/${den}`;
    out += out ? (c < 0 ? ` - ${t}` : ` + ${t}`) : c < 0 ? `-${t}` : t;
  }
  return out || "0";
}
const sMinus = (a: number) => (a === 0 ? "s" : `(${minusA(a, "s")})`);
const sFactor = (a: number) => (a === 0 ? "s" : `\\left(${minusA(a, "s")}\\right)`);
const FACT = [1, 1, 2, 6];

/** ℒ{ae^(bt) + c·g(t)}, g = tⁿ, sin ωt or cos ωt. */
function transformPart(r: Rng, w: PracticeWords): Part {
  const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
  const g = r.pick(["pow", "sin", "cos"] as const);
  const n = r.int(1, 3);
  const om = r.int(1, 3);
  const trig = `(s^2 + ${om * om})`;
  const gBody = g === "pow" ? (n === 1 ? "t" : `t^${n}`) : `${g}(${coef(om, "t")})`;
  const second: [number, "" | "s", string] = g === "pow" ? [c * FACT[n], "", n === 0 ? "s" : `s^${n + 1}`] : g === "sin" ? [c * om, "", trig] : [c, "s", trig];
  const Fs = fracs([[a, "", sMinus(b)], second]);
  const slips: [MistakeId, string][] = [["laplaceShiftSign", fracs([[a, "", sMinus(-b)], second])]];
  if (g === "pow" && n >= 2) slips.push(["laplaceNoFactorial", fracs([[a, "", sMinus(b)], [c, "", `s^${n + 1}`]])]);
  if (g === "sin") slips.push(["laplaceSinCos", fracs([[a, "", sMinus(b)], [c, "s", trig]])]);
  if (g === "cos") slips.push(["laplaceSinCos", fracs([[a, "", sMinus(b)], [c * om, "", trig]])]);
  const rule = g === "pow" ? `\\mathcal{L}\\{t^{n}\\} = \\frac{n!}{s^{n+1}}` : g === "sin" ? `\\mathcal{L}\\{\\sin \\omega t\\} = \\frac{\\omega}{s^{2} + \\omega^{2}}` : `\\mathcal{L}\\{\\cos \\omega t\\} = \\frac{s}{s^{2} + \\omega^{2}}`;
  return {
    prompt: w.ode.prompt.transform,
    q: `f(t) = ${T(sumOf([[a, ex(b, "t")], [c, gBody]]), TT)}`,
    ...fnOf(Fs, slips, S, "exprS"),
    steps: [`\\mathcal{L}\\{e^{bt}\\} = \\frac{1}{s - b}, \\quad ${rule}`, `F(s) = ${T(Fs, S)}`],
  };
}

/** ℒ⁻¹{(ps + q)/((s − a)(s − b))} = Ae^(at) + Be^(bt). */
function inversePart(r: Rng, w: PracticeWords): Part {
  const a = r.int(-3, 3);
  let b = r.int(-3, 3);
  while (b === a) b = r.int(-3, 3);
  const [A, B] = [r.nz(-3, 3), r.nz(-3, 3)];
  const [p, q] = [A + B, -(A * b + B * a)];
  const f = sumOf([[A, ex(a, "t")], [B, ex(b, "t")]]);
  return {
    prompt: w.ode.prompt.inverse,
    q: `F(s) = \\frac{${linTex([[p, "s"], [q, ""]])}}{${sFactor(a)}${sFactor(b)}}`,
    ...fnOf(f, [["inverseShiftSign", sumOf([[A, ex(-a, "t")], [B, ex(-b, "t")]])]], TT, "exprT"),
    steps: [`F(s) = ${T(fracs([[A, "", sMinus(a)], [B, "", sMinus(b)]]), S)}`, `\\mathcal{L}^{-1}\\left\\{\\frac{1}{s - a}\\right\\} = e^{at}: \\quad f(t) = ${T(f, TT)}`],
  };
}

/** y′ + ay = b, y(0) = y₀: y = k + (y₀ − k)e^(−at); or y″ + ω²y = 0: y = A cos ωt + B sin ωt. */
function ivpPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const [a, k] = [r.nz(-3, 3), r.nz(-3, 3)];
    const b = a * k;
    let y0 = r.int(-3, 4);
    while (y0 === k) y0 = r.int(-3, 4);
    const y = sumOf([[k, ""], [y0 - k, ex(-a, "t")]]);
    return {
      prompt: w.ode.prompt.laplaceIvp,
      q: `${linTex([[1, "y'"], [a, "y"]])} = ${b}, \\quad y(0) = ${y0}`,
      ...fnOf(y, [["initialValueDropped", sumOf([[k, ""], [-k, ex(-a, "t")]])]], TT, "exprT"),
      steps: [
        `${linTex([[1, "sY"], [-y0, ""], [a, "Y"]])} = \\frac{${b}}{s}: \\quad Y(s) = \\frac{${linTex([[y0, "s"], [b, ""]])}}{s${sFactor(-a)}}`,
        `Y(s) = ${T(fracs([[k, "", "s"], [y0 - k, "", sMinus(-a)]]), S)}: \\quad y(t) = ${T(y, TT)}`,
      ],
    };
  }
  const om = r.int(1, 3);
  const [A, B] = [r.nz(-3, 3), r.nz(-3, 3)];
  const [cos, sin] = [`cos(${coef(om, "t")})`, `sin(${coef(om, "t")})`];
  const y = sumOf([[A, cos], [B, sin]]);
  return {
    prompt: w.ode.prompt.laplaceIvp,
    q: `y'' + ${om * om === 1 ? "" : om * om}y = 0, \\quad y(0) = ${A}, \\; y'(0) = ${B * om}`,
    ...fnOf(y, [["initialValueDropped", coef(A, cos)]], TT, "exprT"),
    steps: [
      `${linTex([[1, "s^{2}Y"], [-A, "s"], [-B * om, ""], [om * om, "Y"]])} = 0: \\quad Y(s) = \\frac{${linTex([[A, "s"], [B * om, ""]])}}{s^{2} + ${om * om}}`,
      `y(t) = ${T(y, TT)}`,
    ],
  };
}

// ---------- since #752: the shift by e^(at), steps and the delta, convolution, and equations they solve ----------

/** c·e^(−ds)/den as typed, its sign in front: "3e^(-2s)/s", "-e^(-s)/(s + 1)", den "" for none. */
function delayed(c: number, d: number, den: string): string {
  const n = Math.abs(c);
  return `${c < 0 ? "-" : ""}${n === 1 ? "" : n}${ex(-d, "s")}${den ? `/${den}` : ""}`;
}
const plus = (a: string, b: string) => (b.startsWith("-") ? `${a} - ${b.slice(1)}` : `${a} + ${b}`);
const coefTex = (c: number) => (c === 1 ? "" : c === -1 ? "-" : String(c));

/** L1: ℒ{e^(at)g(t)} = G(s − a) for g = sin ωt, cos ωt or tⁿ. */
function shiftPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  const om = r.int(1, 3);
  const g = r.pick(["sin", "cos", "pow"] as const);
  const n = r.int(1, 3);
  const sa = sMinus(a);
  const sb = sMinus(-a);
  const e = ex(a, "t");
  let Fs: string;
  let slips: [MistakeId, string][];
  let body: string;
  if (g === "pow") {
    body = `${n === 1 ? "t" : `t^${n}`}*${e}`;
    Fs = `${FACT[n]}/${sa}^${n + 1}`;
    slips = [["laplaceShiftSign", `${FACT[n]}/${sb}^${n + 1}`], ["shiftAsProduct", `${FACT[n]}/(s^${n + 1}*${sa})`]];
    if (n >= 2) slips.push(["laplaceNoFactorial", `1/${sa}^${n + 1}`]);
  } else {
    body = `${e}*${g}(${coef(om, "t")})`;
    const den = (x: string) => `(${x}^2 + ${om * om})`;
    const top = (x: string) => (g === "sin" ? String(om) : x);
    Fs = `${top(sa)}/${den(sa)}`;
    slips = [["laplaceShiftSign", `${top(sb)}/${den(sb)}`], ["shiftAsProduct", `${top("s")}/(${sa}*(s^2 + ${om * om}))`]];
    if (g === "cos") slips.push(["shiftTopLeftOut", `s/${den(sa)}`]);
  }
  const rule = g === "pow" ? `\\mathcal{L}\\{t^{${n}}\\} = \\frac{${FACT[n]}}{s^{${n + 1}}}` : g === "sin" ? `\\mathcal{L}\\{\\sin ${om === 1 ? "" : om}t\\} = \\frac{${om}}{s^{2} + ${om * om}}` : `\\mathcal{L}\\{\\cos ${om === 1 ? "" : om}t\\} = \\frac{s}{s^{2} + ${om * om}}`;
  return {
    prompt: w.ode.prompt.transform,
    q: `f(t) = ${T(body, TT)}`,
    ...fnOf(Fs, slips, S, "exprS"),
    steps: [`\\mathcal{L}\\{e^{at}g(t)\\} = G(s - a): \\quad ${rule}`, `s \\to ${minusA(a, "s")}: \\quad F(s) = ${T(Fs, S)}`],
  };
}

/** L1: a switched-on function or an impulse: ℒ{k·u(t − c)}, ℒ{u(t − c)e^(a(t − c))}, ℒ{kδ(t − c)}, ℒ{tⁿδ(t − c)}. */
function stepPart(r: Rng, w: PracticeWords): Part {
  const c = r.int(1, 4);
  const k = r.nz(-3, 3);
  const kind = r.int(0, 3);
  const E = ex(-c, "s");
  if (kind === 0) {
    return {
      prompt: w.lpK.stepQ,
      q: `f(t) = ${coefTex(k)}u(t - ${c})`,
      ...fnOf(delayed(k, c, "s"), [["delayShiftSign", delayed(k, -c, "s")], ["delayLeftOut", `${k}/s`]], S, "exprS"),
      steps: [`\\mathcal{L}\\{u(t - c)\\} = \\frac{e^{-cs}}{s}`, `F(s) = ${T(delayed(k, c, "s"), S)}`],
    };
  }
  if (kind === 1) {
    const a = r.nz(-3, 3);
    const den = sMinus(a);
    return {
      prompt: w.lpK.stepQ,
      q: `f(t) = u(t - ${c}) \\, e^{${coefTex(a)}(t - ${c})}`,
      ...fnOf(delayed(1, c, den), [["delayShiftSign", delayed(1, -c, den)], ["delayLeftOut", `1/${den}`]], S, "exprS"),
      steps: [`\\mathcal{L}\\{u(t - c)g(t - c)\\} = e^{-cs}G(s), \\quad G(s) = \\mathcal{L}\\{e^{${coefTex(a)}t}\\} = ${T(`1/${den}`, S)}`, `F(s) = ${T(delayed(1, c, den), S)}`],
    };
  }
  if (kind === 2) {
    return {
      prompt: w.lpK.deltaQ,
      q: `f(t) = ${coefTex(k)}\\delta(t - ${c})`,
      ...fnOf(delayed(k, c, ""), [["deltaAsStep", delayed(k, c, "s")], ["delayShiftSign", delayed(k, -c, "")]], S, "exprS"),
      steps: [`\\mathcal{L}\\{\\delta(t - c)\\} = e^{-cs}`, `F(s) = ${T(delayed(k, c, ""), S)}`],
    };
  }
  const n = r.int(2, 3);
  const v = c ** n;
  return {
    prompt: w.lpK.deltaQ,
    q: `f(t) = t^{${n}} \\, \\delta(t - ${c})`,
    ...fnOf(delayed(v, c, ""), [["siftedValueLeftOut", E], ["deltaAsStep", delayed(v, c, "s")]], S, "exprS"),
    steps: [`\\mathcal{L}\\{g(t)\\delta(t - c)\\} = g(c)e^{-cs}`, `g(${c}) = ${c}^{${n}} = ${v}: \\quad F(s) = ${T(delayed(v, c, ""), S)}`],
  };
}

/** L2: (f ∗ g)(t) = ∫₀ᵗ f(τ)g(t − τ) dτ for 1 ∗ e^(at), t ∗ 1, t ∗ t or e^(at) ∗ e^(bt). */
function convolutionPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 3);
  const a = r.nz(-3, 3);
  let b = r.nz(-3, 3);
  while (b === a) b = r.nz(-3, 3);
  const eT = (k: number) => (k === 1 ? "e^{t}" : `e^{${coefTex(k)}t}`);
  const cases: { f: string; g: string; ans: string; prod: string; low: string; work: string }[] = [
    { f: "1", g: eT(a), ans: sumOf([[F(1, a), ex(a, "t")], [F(-1, a), ""]]), prod: ex(a, "t"), low: coef(F(1, a), ex(a, "t")), work: `\\int_0^t e^{${coefTex(a)}(t - \\tau)} \\, d\\tau` },
    { f: "t", g: "1", ans: "t^2/2", prod: "t", low: "t^2/2", work: `\\int_0^t \\tau \\, d\\tau` },
    { f: "t", g: "t", ans: "t^3/6", prod: "t^2", low: "t^3/6", work: `\\int_0^t \\tau(t - \\tau) \\, d\\tau = \\frac{t^{3}}{2} - \\frac{t^{3}}{3}` },
    { f: eT(a), g: eT(b), ans: sumOf([[F(1, a - b), ex(a, "t")], [F(-1, a - b), ex(b, "t")]]), prod: ex(a + b, "t") || "1", low: coef(F(1, a - b), ex(a, "t")), work: `e^{${coefTex(b)}t}\\int_0^t e^{${coefTex(a - b)}\\tau} \\, d\\tau` },
  ];
  const k = cases[kind];
  return {
    prompt: w.lpK.convQ,
    q: `f(t) = ${k.f}, \\quad g(t) = ${k.g}`,
    ...fnOf(k.ans, [["convolutionAsProduct", k.prod], ["convolutionLowerEndLeftOut", k.low]], TT, "exprT"),
    steps: [`(f * g)(t) = ${k.work}`, `(f * g)(t) = ${T(k.ans, TT)}`],
  };
}

/** L2: ℒ{f ∗ g} = F(s)G(s) for f = tⁿ or sin ωt and g = e^(at). */
function convTransformPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  const sa = sMinus(a);
  const pow = r.next() < 0.5;
  const n = r.int(1, 3);
  const om = r.int(1, 3);
  const Ff = pow ? `${FACT[n]}/s^${n + 1}` : `${om}/(s^2 + ${om * om})`;
  const ans = pow ? `${FACT[n]}/(s^${n + 1}*${sa})` : `${om}/((s^2 + ${om * om})*${sa})`;
  const slips: [MistakeId, string][] = [["convolutionAsSum", `${Ff} + 1/${sa}`]];
  if (pow && n >= 2) slips.push(["laplaceNoFactorial", `1/(s^${n + 1}*${sa})`]);
  return {
    prompt: w.lpK.convLQ,
    q: `f(t) = ${pow ? (n === 1 ? "t" : `t^{${n}}`) : `\\sin ${om === 1 ? "" : om}t`}, \\quad g(t) = e^{${coefTex(a)}t}`,
    ...fnOf(ans, slips, S, "exprS"),
    steps: [`\\mathcal{L}\\{f * g\\} = F(s)G(s)`, `F(s) = ${T(Ff, S)}, \\quad G(s) = ${T(`1/${sa}`, S)}`, `\\mathcal{L}\\{f * g\\} = ${T(ans, S)}`],
  };
}

/** L3: y′ + ay = k·u(t − c) or kδ(t − c), y(0) = y₀, transformed: Y(s). */
function stepIvpPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  const k = r.nz(-3, 3);
  const c = r.int(1, 3);
  const y0 = r.nz(-3, 3);
  const delta = r.next() < 0.5;
  const sp = sMinus(-a);
  const start = `${y0}/${sp}`;
  const force = (d: number, step: boolean) => delayed(k, d, step ? `(s*${sp})` : sp);
  const Y = plus(start, force(c, !delta));
  const slips: [MistakeId, string][] = [["initialValueDropped", force(c, !delta)], ["delayShiftSign", plus(start, force(-c, !delta))]];
  if (delta) slips.push(["deltaAsStep", plus(start, force(c, true))]);
  const rhs = `${coefTex(k)}${delta ? "\\delta" : "u"}(t - ${c})`;
  return {
    prompt: w.lpK.stepIvpQ,
    q: `${linTex([[1, "y'"], [a, "y"]])} = ${rhs}, \\quad y(0) = ${y0}`,
    ...fnOf(Y, slips, S, "exprS"),
    steps: [
      `${linTex([[1, "sY"], [-y0, ""], [a, "Y"]])} = ${T(delayed(k, c, delta ? "" : "s"), S)}`,
      `Y(s) = ${T(Y, S)}`,
    ],
  };
}

/** L3: y′ − ay = g(t), y(0) = 0, by the convolution theorem: y = e^(at) ∗ g, g a constant K or e^(bt). */
function convIvpPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  const konst = r.next() < 0.5;
  const K = r.nz(-3, 3);
  let b = r.nz(-3, 3);
  while (b === a) b = r.nz(-3, 3);
  const y = konst ? sumOf([[F(K, a), ex(a, "t")], [F(-K, a), ""]]) : sumOf([[F(1, a - b), ex(a, "t")], [F(-1, a - b), ex(b, "t")]]);
  const prod = konst ? coef(K, ex(a, "t")) : ex(a + b, "t") || "1";
  const low = konst ? coef(F(K, a), ex(a, "t")) : coef(F(1, a - b), ex(a, "t"));
  const gTex = konst ? String(K) : `e^{${coefTex(b)}t}`;
  return {
    prompt: w.lpK.convIvpQ,
    q: `${linTex([[1, "y'"], [-a, "y"]])} = ${gTex}, \\quad y(0) = 0`,
    ...fnOf(y, [["convolutionAsProduct", prod], ["convolutionLowerEndLeftOut", low]], TT, "exprT"),
    steps: [
      `Y(s) = \\frac{1}{${minusA(a, "s")}} \\, G(s): \\quad y = e^{${coefTex(a)}t} * g`,
      `y(t) = \\int_0^t e^{${coefTex(a)}(t - \\tau)} \\, ${konst ? K : `e^{${coefTex(b)}\\tau}`} \\, d\\tau = ${T(y, TT)}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) {
    if (L === 1) return r.next() < 0.5 ? shiftPart(r, w) : stepPart(r, w);
    if (L === 2) return r.next() < 0.5 ? convolutionPart(r, w) : convTransformPart(r, w);
    return r.next() < 0.5 ? stepIvpPart(r, w) : convIvpPart(r, w);
  }
  return L === 1 ? transformPart(r, w) : L === 2 ? inversePart(r, w) : ivpPart(r, w);
};

export default gen;
