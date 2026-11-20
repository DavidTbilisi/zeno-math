// Practice: convergence theorems and Lᵖ norms. Easy takes a sequence whose mass escapes, a bump c·n·χ_(0, 1/n) or a
// box c·χ_[n, n + k], and asks for lim ∫ fₙ or ∫ lim fₙ (the other one, the box's length dropped, named); medium uses
// monotone convergence on min(n, x⁻ᵃ) over (0, 1] (the power integrated with the wrong sign, named) or dominated
// convergence on n sin(c xᵏ / n) (the sine taken to 0, named); hard finds the 1-, 2- or ∞-norm of a step function
// (the square root left off, the sign kept, the supremum times the length, the heights added, named).
import { exact } from "../calculusTwo";
import { F, SQUARE_NORMS, chi, polyIntegral, polyTex } from "../measureTheory";
import type { NumSlip } from "../calculusTwo";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** Mass that escapes: lim ∫ fₙ = c·len but ∫ lim fₙ = 0. */
function escapePart(r: Rng, w: PracticeWords): Part {
  const c = r.int(1, 6);
  const bump = r.next() < 0.5;
  const k = bump ? 1 : r.int(2, 4);
  const mass = c * k;
  const askLimInt = r.next() < 0.5;
  const cc = c === 1 ? "" : String(c);
  const fn = bump ? `f_n = ${cc}n\\,${chi("(0, \\frac{1}{n})")}` : `f_n = ${cc}${c === 1 ? "" : "\\,"}${chi(`[n, \\ n + ${k}]`)}`;
  const slips: NumSlip[] = askLimInt ? [["limitSwapped", 0]] : [["limitSwapped", mass]];
  if (askLimInt && !bump) slips.push(["boxLengthDropped", c]);
  return {
    prompt: askLimInt ? w.mt.prompt.limInt : w.mt.prompt.intLim,
    q: fn,
    ...exact(F(askLimInt ? mass : 0), slips),
    steps: [
      bump ? `\\int f_n \\, d\\lambda = ${cc}n \\cdot \\tfrac{1}{n} = ${mass}` : `\\int f_n \\, d\\lambda = ${c} \\cdot ${k} = ${mass}`,
      `f_n(x) \\to 0 \\text{ for every } x, \\quad \\int \\lim f_n \\, d\\lambda = 0`,
      askLimInt ? `\\lim \\int f_n \\, d\\lambda = ${mass}` : `\\int \\lim f_n \\, d\\lambda = 0 \\ne ${mass}`,
    ],
  };
}

const POWERS = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(2, 5)];

/** Monotone convergence on min(n, x⁻ᵃ), or dominated convergence on n sin(c xᵏ / n). */
function theoremPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const a = r.pick(POWERS);
    const v = F(1).div(F(1).sub(a));
    return {
      prompt: w.mt.prompt.limInt,
      q: `f_n(x) = \\min\\left(n, \\ x^{-${a.tex()}}\\right), \\quad x \\in (0, 1]`,
      ...exact(v, [["exponentSignSlip", F(1).div(F(1).add(a))]]),
      steps: [
        `0 \\le f_1 \\le f_2 \\le \\dots, \\quad f_n \\uparrow x^{-${a.tex()}}`,
        `\\lim \\int_0^1 f_n \\, dx = \\int_0^1 x^{-${a.tex()}} \\, dx = \\left[\\frac{x^{${F(1).sub(a).tex()}}}{${F(1).sub(a).tex()}}\\right]_0^1 = ${v.tex()}`,
      ],
    };
  }
  const c = r.int(1, 4);
  const k = r.int(1, 3);
  const B = r.int(1, 3);
  const v = polyIntegral(c, k, 0, B);
  const inner = polyTex(c, k, 0);
  return {
    prompt: w.mt.prompt.limInt,
    q: `f_n(x) = n \\sin\\left(\\frac{${inner}}{n}\\right), \\quad x \\in [0, ${B}]`,
    ...exact(v, [["smallSineZero", 0]]),
    steps: [
      `|f_n(x)| \\le ${inner}, \\quad f_n(x) \\to ${inner}`,
      `\\lim \\int_0^{${B}} f_n \\, dx = \\int_0^{${B}} ${inner} \\, dx = ${v.tex()}`,
    ],
  };
}

/** ‖a·χ_[0, u) − b·χ_[u, u + v)‖ₚ for p = 1, 2, ∞. */
function normPart(r: Rng, w: PracticeWords): Part {
  const [a, b0, u, v] = r.pick(SQUARE_NORMS);
  const neg = r.next() < 0.5;
  const b = neg ? -b0 : b0;
  const p = r.pick(["1", "2", "\\infty"] as const);
  const f = `f = ${a}\\,${chi(`[0, ${u})`)} ${neg ? "-" : "+"} ${b0}\\,${chi(`[${u}, ${u + v})`)}`;
  const q = `${f}, \\quad \\|f\\|_{${p}}`;
  const prompt = fill(w.mt.prompt.norm, { p: p === "\\infty" ? "∞" : p });
  if (p === "1") {
    const val = a * u + b0 * v;
    const slips: NumSlip[] = [["heightsAdded", a + b0]];
    if (neg) slips.push(["signKept", a * u + b * v]);
    return { prompt, q, ...exact(F(val), slips), steps: [`\\|f\\|_1 = \\int |f| \\, d\\lambda = ${a} \\cdot ${u} + ${b0} \\cdot ${v} = ${val}`] };
  }
  if (p === "2") {
    const sq = a * a * u + b0 * b0 * v;
    const val = Math.round(Math.sqrt(sq));
    return {
      prompt,
      q,
      ...exact(F(val), [["normNoRoot", sq]]),
      steps: [`\\|f\\|_2 = \\left(\\int |f|^2 \\, d\\lambda\\right)^{1/2} = \\sqrt{${a}^2 \\cdot ${u} + ${b0}^2 \\cdot ${v}} = \\sqrt{${sq}} = ${val}`],
    };
  }
  const val = Math.max(a, b0);
  const slips: NumSlip[] = [["supTimesLength", val * (u + v)]];
  if (neg) slips.push(["signKept", Math.max(a, b)]);
  return { prompt, q, ...exact(F(val), slips), steps: [`\\|f\\|_\\infty = \\operatorname{ess\\,sup} |f| = \\max(${a}, ${b0}) = ${val}`] };
}

const gen: Gen = (r, L, w) => (L === 1 ? escapePart(r, w) : L === 2 ? theoremPart(r, w) : normPart(r, w));

export default gen;
