// Practice: The Laplace transform. Easy transforms ae^(bt) plus a power of t, a sine or a cosine (1/(s + b) for
// e^(bt), the n! of tⁿ left out, sine and cosine swapped, named); medium inverts (ps + q)/((s − a)(s − b)) by partial
// fractions (e^(−at) for 1/(s − a), named); hard solves y′ + ay = b or y″ + ω²y = 0 with initial values through the
// transform (the initial values left out of ℒ{y′} and ℒ{y″}, named).
import { minusA } from "../calculusTwo";
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

const gen: Gen = (r, L, w) => (L === 1 ? transformPart(r, w) : L === 2 ? inversePart(r, w) : ivpPart(r, w));

export default gen;
