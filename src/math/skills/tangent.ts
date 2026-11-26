// Practice: Gradients and tangents. Since #744 half the seeds ask about the derivative itself: a limit read as a
// derivative, a slope estimated from a table, the average rate of change from a to x (L1); whether a drawn graph is
// differentiable at a point, and a derivative disguised as a limit (L2); whether two pieces join differentiably, and
// the average rate of change of x³ or 1/x simplified (L3).
import { exact, F } from "../calculusTwo";
import { fill } from "../chart";
import { derive } from "../derive";
import { evalE, fromPoly, parseE, simp, tex } from "../expr";
import { limitPic } from "../limitGraph";
import { minus } from "../logicSets";
import { exprPart, num, numPart, plainFrac, polyStr, toFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { tableSvg } from "../readFunction";
import { pickPart } from "../tTails";

const place = (p: { body: string; w: number; h: number }) => ({ svg: (x: number, y: number) => `<g transform="translate(${x} ${y})">${p.body}</g>`, w: p.w, h: p.h });
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const pw = (n: number) => String(n).split("").map((d) => SUP[Number(d)]).join("");
const plusT = (c: number, v = "") => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}${v}`);

/** The derivative itself (#745), on half the seeds. */
function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.tgK;
  if (L === 1) {
    const t = r.pick(["asLimit", "estimate", "secant"] as const);
    if (t === "asLimit") {
      const [n, a] = [r.int(2, 4), r.int(2, 5)];
      const opts = [`f′(${a}), f(x) = x${pw(n)}`, `f′(h), f(x) = x${pw(n)}`, `f(${a}), f(x) = x${pw(n)}`];
      return { ...pickPart(r, opts, 0, [{ id: "limitPointAsH", at: 1, vars: { a } }, { id: "derivativeAsValue", at: 2, vars: { a } }], K.asLimitQ,
        [`\\frac{f(${a} + h) - f(${a})}{h}, \\quad f(x) = x^{${n}}`, `\\to f'(${a})`]), q: `\\lim_{h \\to 0} \\frac{(${a} + h)^{${n}} - ${a ** n}}{h}` };
    }
    if (t === "estimate") {
      const xs = [0, 2, 4, 6, 8];
      const ys = [r.int(0, 20)];
      for (let i = 1; i < 5; i++) ys.push(ys[i - 1] + r.int(-4, 9));
      const i = r.int(1, 3);
      const d = ys[i + 1] - ys[i - 1];
      const at = xs[i];
      const [lo, hi] = [i - 1, i + 1];
      return {
        ...exact(F(d, 4), [["slopeNotDivided", F(d), { a: xs[lo], b: xs[hi], d: minus(d) }]]),
        prompt: fill(K.estimateQ, { t: at, a: xs[lo], b: xs[hi] }), q: "",
        steps: [`f'(${at}) \\approx \\frac{f(${xs[hi]}) - f(${xs[lo]})}{${xs[hi]} - ${xs[lo]}} = \\frac{${ys[hi]} - ${ys[lo] < 0 ? `(${ys[lo]})` : ys[lo]}}{4} = ${F(d, 4).tex()}`],
        pic: place(tableSvg(xs, ys, ["x", "f(x)"])),
      };
    }
    const [a, b, c] = [r.nz(-4, 4), r.int(-5, 5), r.int(-6, 6)];
    const fx = polyStr([c, b, 1]);
    const e = parseE(polyStr([a + b, 1]));
    return {
      prompt: fill(K.secantQ, { a: minus(a) }), q: `f(x) = ${tex(parseE(fx))}`, show: tex(e), plain: polyStr([a + b, 1]), format: "expr",
      steps: [`\\frac{f(x) - f(${a})}{${tex(parseE(polyStr([-a, 1])))}} = \\frac{\\left(${tex(parseE(polyStr([-a, 1])))}\\right)\\left(${tex(e)}\\right)}{${tex(parseE(polyStr([-a, 1])))}}`, `= ${tex(e)}`],
      ...secantTraps(e, parseE(`${polyStr([0, b, 1])} - ${a * a + a * b}`), "secantNotDivided", { a: minus(a) }),
    };
  }
  if (L === 2) {
    if (r.next() < 0.5) {
      const a = r.int(-2, 2);
      const kind = r.pick(["smooth", "corner", "jump", "vertical"] as const);
      const l = r.int(-2, 2);
      const opts = [K.dYes, K.dCorner, K.dBreak, K.dVertical].map((o) => fill(o, { a: minus(a) }));
      const s = r.pick([-1, 1]);
      const pieces =
        kind === "smooth" ? [{ f: (x: number) => l + (s * (x - a) ** 2) / 3, from: -6, to: 6 }]
        : kind === "corner" ? [{ f: (x: number) => l + s * Math.abs(x - a), from: -6, to: 6 }]
        : kind === "vertical" ? [{ f: (x: number) => l + 2 * Math.cbrt(x - a), from: -6, to: 6 }]
        : [{ f: (x: number) => l + (x - a) / 2, from: -6, to: a }, { f: (x: number) => l + 2 + (x - a) / 2, from: a, to: 6 }];
      const right = ["smooth", "corner", "jump", "vertical"].indexOf(kind);
      const traps = kind === "corner" || kind === "vertical" ? [{ id: "continuousSoDifferentiable" as const, at: 0, vars: { a: minus(a) } }] : [];
      const part = pickPart(r, opts, right, traps, fill(K.diffGraphQ, { a: minus(a) }), [`x = ${a}`]);
      return { ...part, pic: limitPic({ pieces, ...(kind === "jump" ? { closed: [[a, l]], open: [[a, l + 2]] } : { closed: [[a, l]] }) }) };
    }
    const [n, a] = [r.int(2, 4), r.int(1, 4)];
    const v = F(n * a ** (n - 1));
    const hForm = r.next() < 0.5;
    return {
      prompt: w.calc2.prompt.limit,
      q: hForm ? `\\lim_{h \\to 0} \\frac{(${a} + h)^{${n}} - ${a ** n}}{h}` : `\\lim_{x \\to ${a}} \\frac{x^{${n}} - ${a ** n}}{x - ${a}}`,
      ...exact(v, [["indeterminateAsZero", 0], ["disguisedPowerKept", F(n * a ** n), { n, a, v: n * a ** (n - 1) }]]),
      steps: [`= f'(${a}), \\quad f(x) = x^{${n}}`, `f'(x) = ${n}x${n === 2 ? '' : `^{${n - 1}}`}: \\quad f'(${a}) = ${n} \\cdot ${a}${n === 2 ? '' : `^{${n - 1}}`} = ${v.tex()}`],
    };
  }
  if (r.next() < 0.5) {
    const a = r.nz(-2, 2);
    const p = r.int(-3, 3);
    const kind = r.pick(["both", "cont", "jump"] as const);
    const m = kind === "cont" ? 2 * a + r.pick([-2, -1, 1, 2]) : 2 * a;
    const q = a * a + p - m * a + (kind === "jump" ? r.pick([-2, -1, 1, 2]) : 0);
    const f1 = `x²${plusT(p).replace("-", "−")}`;
    const f2 = m === 0 ? minus(q) : `${m === 1 ? "" : m === -1 ? "−" : minus(m)}x${plusT(q).replace("-", "−")}`;
    const opts = [K.aBoth, K.aCont, K.aNeither].map((o) => fill(o, { a: minus(a) }));
    const right = ["both", "cont", "jump"].indexOf(kind);
    const traps = kind === "cont" ? [{ id: "valuesMatchEnough" as const, at: 0, vars: { a: minus(a), l: minus(2 * a), r: minus(m) } }] : kind === "jump" ? [{ id: "slopesMatchEnough" as const, at: 0, vars: { a: minus(a) } }] : [];
    return pickPart(r, opts, right, traps, fill(K.diffAlgQ, { f1, f2, a: minus(a) }),
      [`x \\to ${a}^{-}: \\ ${a * a + p}, \\quad x \\to ${a}^{+}: \\ ${m * a + q}`, `f'_{-}(${a}) = ${2 * a}, \\quad f'_{+}(${a}) = ${m}`]);
  }
  const a = r.nz(-3, 3);
  const A = a < 0 ? `(${a})` : String(a);
  if (r.next() < 0.5) {
    const e = parseE(polyStr([a * a, a, 1]));
    return {
      prompt: fill(K.secantQ, { a: minus(a) }), q: `f(x) = x^{3}`, show: tex(e), plain: polyStr([a * a, a, 1]), format: "expr",
      steps: [`\\frac{x^{3} - ${A}^{3}}{x - ${A}} = \\frac{(x - ${A})\\left(x^{2} + ${A}x + ${A}^{2}\\right)}{x - ${A}}`, `= ${tex(e)}`],
      ...secantTraps(e, parseE(`x^3 - ${a ** 3}`), "secantNotDivided", { a: minus(a) }),
    };
  }
  const [sg, k] = [a < 0 ? "" : "-", Math.abs(a)];
  const e = parseE(`${sg}1/(${k}x)`);
  const show = `${sg}\\frac{1}{${k}x}`;
  return {
    prompt: fill(K.secantQ, { a: minus(a) }), q: `f(x) = \\frac{1}{x}`, show, plain: `${sg}1/(${k}x)`, format: "expr",
    steps: [`\\frac{\\frac{1}{x} - \\frac{1}{${A}}}{x - ${A}} = \\frac{${A} - x}{${A}x\\,(x - ${A})}`, `= ${show}`],
    ...secantTraps(e, parseE(`${a < 0 ? "-" : ""}1/(${k}x)`), "secantSignLost", { a: minus(a) }),
  };
}

/** An expression answer with one named slip. */
function secantTraps(e: ReturnType<typeof parseE>, wrong: ReturnType<typeof parseE>, id: "secantNotDivided" | "secantSignLost", vars: Record<string, string>): Pick<Part, "answer"> {
  return { answer: { k: "expr", e, traps: [{ id, a: { k: "expr", e: wrong }, vars }] } };
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  let src: string;
  let at: number;
  if (L === 2) {
    const pick = r.int(0, 2);
    if (pick === 0) [src, at] = [`sqrt(x)`, r.pick([1, 4, 9, 16])];
    else if (pick === 1) [src, at] = [`${r.int(1, 6)}/x`, r.pick([1, 2, 3, -1, -2])];
    else [src, at] = [`x^3 - ${r.int(1, 9)}x`, r.int(-3, 3)];
  } else {
    src = polyStr([r.int(-6, 6), r.int(-6, 6), r.nz(-4, 4), r.next() < 0.5 ? r.nz(-2, 2) : 0]);
    at = r.int(-3, 3);
  }
  const f = parseE(src);
  const d = derive(f);
  const m = evalE(d, at);
  const y0 = evalE(f, at);
  const mF = toFrac(m);
  // dy/dx, then (for the tangent) its value and y's at the point; the last step is the question.
  const derivative = exprPart(w.prompts.stepDiff, `y = ${tex(f)}: \\quad \\frac{dy}{dx}`, simp(d));
  if (L < 3)
    return {
      prompt: fill(w.prompts.gradient, { a: at }), q: `y = ${tex(f)}`, answer: num(m), show: `\\frac{dy}{dx}\\Big|_{x = ${at}} = ${mF.tex()}`, plain: plainFrac(mF), format: "exact",
      solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } }, worked: [derivative],
    };
  const c = toFrac(y0 - m * at);
  const e = fromPoly([c, mF]);
  return {
    prompt: fill(w.prompts.tangent, { a: at }), q: `y = ${tex(f)}`, answer: { k: "expr", e, mode: "line" }, show: `y = ${tex(e)}`, plain: `y = (${plainFrac(mF)})x + (${plainFrac(c)})`, format: "line",
    solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } },
    worked: [derivative, numPart(w.prompts.stepWork, `\\frac{dy}{dx}\\Big|_{x = ${at}}`, m), numPart(w.prompts.stepWork, `y\\Big|_{x = ${at}}`, y0)],
  };
};

export default gen;
