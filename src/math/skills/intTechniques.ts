// Practice: Techniques of integration. Easy is a substitution, the derivative of the inside already there up to a
// number (that number not divided out, named); medium is by parts once: x eᵃˣ, x sin ax, x cos ax, x ln x, ln x (the
// second term with the wrong sign, named); hard is partial fractions over two linear factors (the two numbers of the
// cover-up swapped, named) or sin² and cos² by the double angle (the 1/(2a) of the inside left out, named). Each
// question is made from its answer, so differentiating the answer gives back what is integrated. Since #748 half the
// seeds ask the techniques left out before: which u a substitution needs, a definite integral by substitution, also of
// an exponential (L1); dividing before integrating, a definite integral by parts (L2); completing the square for an
// arctangent and which trigonometric substitution fits (L3).
import { byParts, exact, F, partialOrTrig, substitution, type Integral } from "../calculusTwo";
import { parseE, tex } from "../expr";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

function integralPart(I: Integral, prompt: string): Part {
  const [f, Fe] = [parseE(I.f), parseE(I.F)];
  const traps: Trap[] = I.slip ? [{ id: I.slip.id, a: { k: "expr", e: parseE(I.slip.F), mode: "plusC" } }] : [];
  return {
    prompt,
    q: `\\int ${tex(f)} \\, dx`,
    answer: { k: "expr", e: Fe, mode: "plusC", ...(traps.length ? { traps } : {}) },
    show: `${tex(Fe)} + C`,
    plain: `${I.F} + C`,
    format: "antiderivative",
    steps: [`\\int ${tex(f)} \\, dx = ${tex(Fe)} + C`, `\\frac{d}{dx}\\left(${tex(Fe)}\\right) = ${tex(f)}`],
  };
}

const signed = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c) === 1 && v ? "" : Math.abs(c)}${v}`);

/** A value to three places with named slips at the same tolerance. */
function approx(v: number, show: string, slips: [Trap["id"], number, Record<string, string | number>?][]): Pick<Part, "answer" | "show" | "plain" | "format"> {
  const traps: Trap[] = slips.filter(([, t]) => Math.abs(t - v) > 0.01).map(([id, t, vars]) => ({ id, a: num(t, 0.0006), ...(vars ? { vars } : {}) }));
  return { answer: { ...num(v, 0.0006), traps }, show: `${show} \\approx ${dp(v, 3)}`, plain: dp(v, 6), format: "dp3" };
}

/** The techniques left out before (#748). */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.itK;
  const kind = r.int(0, 2);
  if (L === 1 && kind === 0) {
    // Which u: the inside whose derivative is the other factor.
    const c = r.nz(-5, 5);
    const [q, right, outer, factor] = r.pick([
      ["\\int 2x\\cos(x^{2})\\,dx", "u = x²", "u = cos(x²)", "u = 2x"],
      [`\\int 3x^{2}(x^{3}${signed(c)})^{5}\\,dx`, `u = x³${signed(c).replace("-", "−")}`, `u = (x³${signed(c).replace("-", "−")})⁵`, "u = 3x²"],
      ["\\int x e^{x^{2}}\\,dx", "u = x²", "u = e^(x²)", "u = x"],
      ["\\int \\cos x \\sin^{4} x\\,dx", "u = sin x", "u = sin⁴ x", "u = cos x"],
      ["\\int \\frac{(\\ln x)^{3}}{x}\\,dx", "u = ln x", "u = (ln x)³", "u = 1/x"],
    ] as const);
    return { ...pickPart(r, [right, outer, factor], 0, [{ id: "uOuterFunction", at: 1 }, { id: "uIsFactor", at: 2 }], K.defineUQ, [`\\text{${right}}: \\ du \\ \\text{is the other factor}`]), q };
  }
  if (L === 1 && kind === 1) {
    // ∫ from 0 to b of 2x(x² + 1)ⁿ dx = [(x² + 1)ⁿ⁺¹/(n + 1)] from 0 to b; u runs from 1 to b² + 1.
    const n = r.int(1, 3);
    const b = r.int(1, 2);
    const hi = b * b + 1;
    const v = F(hi ** (n + 1) - 1, n + 1);
    return {
      prompt: K.uDefQ, q: `\\int_{0}^{${b}} 2x\\left(x^{2} + 1\\right)^{${n}}\\,dx`,
      ...exact(v, [["uLimitsNotChanged", F(b ** (n + 1), n + 1), { lo: 1, hi }]]),
      steps: [`u = x^{2} + 1: \\quad x = 0 \\to u = 1, \\quad x = ${b} \\to u = ${hi}`, `\\int_{1}^{${hi}} u^{${n}}\\,du = \\left[\\frac{u^{${n + 1}}}{${n + 1}}\\right]_{1}^{${hi}} = ${v.tex()}`],
    };
  }
  if (L === 1) {
    // ∫ from 0 to k of c x e^(x²) dx = (c/2)(e^(k²) − 1).
    const k = r.int(1, 2);
    const c = r.pick([1, 2]);
    const v = (c / 2) * (Math.exp(k * k) - 1);
    const front = c === 2 ? "" : "\\frac{1}{2}";
    return {
      prompt: K.uDefQ, q: `\\int_{0}^{${k}} ${c === 2 ? "2" : ""}x e^{x^{2}}\\,dx`,
      ...approx(v, `${front}\\left(e^{${k * k}} - 1\\right)`, [["uLimitsNotChanged", (c / 2) * (Math.exp(k) - 1), { lo: 0, hi: k * k }], ...(c === 1 ? [["forgotInnerFactor", Math.exp(k * k) - 1] as [Trap["id"], number]] : [])]),
      steps: [`u = x^{2}: \\quad du = 2x\\,dx, \\quad u: 0 \\to ${k * k}`, `${c === 2 ? "" : "\\frac{1}{2}"}\\int_{0}^{${k * k}} e^{u}\\,du = ${front}\\left(e^{${k * k}} - 1\\right)`],
    };
  }
  if (L === 2 && kind < 2) {
    // (x² + a x + b)/(x + c): divide first, x + (a − c) remainder R.
    const c = r.int(1, 4);
    const a = r.int(-4, 6);
    let b = r.int(-6, 9);
    while (b - c * (a - c) === 0) b = r.int(-6, 9);
    const R = b - c * (a - c);
    const qc = a - c;
    const slip = `x^2/2${signed(qc, "x")}`;
    const Fs = `${slip}${signed(R, "ln(x + " + c + ")")}`;
    const f = parseE(`(x^2${signed(a, "x")}${signed(b)})/(x + ${c})`);
    const Fe = parseE(Fs);
    return {
      prompt: K.divideQ, q: `\\int ${tex(f)} \\, dx`,
      answer: { k: "expr", e: Fe, mode: "plusC", traps: [{ id: "divisionRemainderDropped", a: { k: "expr", e: parseE(slip), mode: "plusC" }, vars: { R: String(R).replace("-", "−"), c } }] },
      show: `${tex(Fe)} + C`, plain: `${Fs} + C`, format: "antiderivative",
      steps: [`\\frac{x^{2}${signed(a, "x")}${signed(b)}}{x + ${c}} = x${signed(qc)} ${R < 0 ? "-" : "+"} \\frac{${Math.abs(R)}}{x + ${c}}`, `\\int = ${tex(Fe)} + C`],
    };
  }
  if (L === 2) {
    // By parts between limits.
    const [q, v, show, slip] = r.pick([
      ["\\int_{0}^{1} x e^{x}\\,dx", 1, "1", 2 * Math.E - 1],
      ["\\int_{0}^{2} x e^{x}\\,dx", Math.E ** 2 + 1, "e^{2} + 1", 3 * Math.E ** 2 - 1],
      ["\\int_{0}^{\\pi/2} x \\sin x\\,dx", 1, "1", -1],
      ["\\int_{0}^{\\pi/2} x \\cos x\\,dx", Math.PI / 2 - 1, "\\frac{\\pi}{2} - 1", Math.PI / 2 + 1],
      ["\\int_{1}^{e} \\ln x\\,dx", 1, "1", 2 * Math.E - 1],
    ] as const);
    return { prompt: K.partsDefQ, q, ...approx(v, show, [["partsSignSlip", slip]]), steps: ["\\int_{a}^{b} u\\,dv = \\big[uv\\big]_{a}^{b} - \\int_{a}^{b} v\\,du", `= ${show}`] };
  }
  if (kind < 2) {
    // 1/(x² + 2bx + b² + a²) = 1/((x + b)² + a²): (1/a) arctan((x + b)/a).
    const b = r.nz(-4, 4);
    const a = r.int(1, 3);
    const inner = a === 1 ? `x${signed(b)}` : `(x${signed(b)})/${a}`;
    const Fs = a === 1 ? `atan(${inner})` : `atan(${inner})/${a}`;
    const f = parseE(`1/(x^2${signed(2 * b, "x")} + ${b * b + a * a})`);
    const Fe = parseE(Fs);
    const traps: Trap[] = [{ id: "completedSquareShiftLost", a: { k: "expr", e: parseE(a === 1 ? "atan(x)" : `atan(x/${a})/${a}`), mode: "plusC" }, vars: { b: Math.abs(b), s: b < 0 ? "−" : "+" } },
      ...(a > 1 ? [{ id: "arctanFactorLost" as const, a: { k: "expr" as const, e: parseE(`atan(${inner})`), mode: "plusC" as const }, vars: { a } }] : [])];
    return {
      prompt: K.squareQ, q: `\\int ${tex(f)} \\, dx`,
      answer: { k: "expr", e: Fe, mode: "plusC", traps }, show: `${tex(Fe)} + C`, plain: `${Fs} + C`, format: "antiderivative",
      steps: [`x^{2}${signed(2 * b, "x")} + ${b * b + a * a} = (x${signed(b)})^{2} + ${a * a}`, `\\int \\frac{du}{u^{2} + a^{2}} = \\frac{1}{a}\\arctan\\frac{u}{a} + C`, `= ${tex(Fe)} + C`],
    };
  }
  // Which trigonometric substitution: a² − x² takes a sine, a² + x² a tangent, x² − a² a secant.
  const a = r.int(2, 5);
  const form = r.int(0, 2);
  const root = [`\\sqrt{${a * a} - x^{2}}`, `\\sqrt{${a * a} + x^{2}}`, `\\sqrt{x^{2} - ${a * a}}`][form];
  const q = r.pick([`\\int \\frac{dx}{${root}}`, `\\int ${root}\\,dx`, `\\int \\frac{x^{2}}{${root}}\\,dx`, `\\int \\frac{dx}{x^{2}${root}}`]);
  const subs = [`x = ${a} sin θ`, `x = ${a} tan θ`, `x = ${a} sec θ`];
  const opts = [subs[form], ...subs.filter((_, i) => i !== form)];
  const why = ["1 - \\sin^{2}\\theta = \\cos^{2}\\theta", "1 + \\tan^{2}\\theta = \\sec^{2}\\theta", "\\sec^{2}\\theta - 1 = \\tan^{2}\\theta"][form];
  return { ...pickPart(r, opts, 0, [{ id: "trigSubMismatched", at: 1 }, { id: "trigSubMismatched", at: 2 }], K.trigSubQ, [why, `x = ${a}${["\\sin", "\\tan", "\\sec"][form]}\\theta`]), q };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const P = w.calc2.prompt;
  if (L === 1) return integralPart(substitution(r), P.substitute);
  if (L === 2) return integralPart(byParts(r), P.parts);
  const I = partialOrTrig(r);
  return integralPart(I, I.f.includes("/(") ? P.partial : P.doubleAngle);
};

export default gen;
