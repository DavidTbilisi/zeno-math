// Practice: Improper integrals. Easy asks whether ∫₁^∞ dx/xᵖ converges (p > 1 and p < 1 swapped, named); medium
// works out ∫ₐ^∞ c/xⁿ dx (divided by n, not n − 1, named) or ∫₀^∞ c e^(−kx) dx; hard asks the same of ∫₀¹ dx/xᵖ,
// where the rule turns round (the rule at infinity used at 0, named), or works out ∫₀¹ c/xᵖ dx or c/(1 + x²) over a
// half-line or the whole line.
import { exact, F, overXp, pickOf, piTimes, powTex, POWERS, word } from "../calculusTwo";
import { plainFrac } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import type { Frac } from "../fraction";

const converges = (p: Frac, atZero: boolean) => (atZero ? p.toNumber() < 1 : p.toNumber() > 1);

/** Does ∫₁^∞ dx/xᵖ (or ∫₀¹) converge? */
function convergePart(r: Rng, w: PracticeWords, atZero: boolean): Part {
  const p = r.pick(POWERS);
  const options = [word(w.calc2.converges), word(w.calc2.diverges)];
  const right = converges(p, atZero) ? 0 : 1;
  const other = converges(p, !atZero) ? 0 : 1;
  const one = p.n === p.d;
  const pt = powTex(p);
  return {
    prompt: w.calc2.prompt.converge,
    q: atZero ? `\\int_{0}^{1} ${overXp(p)} \\, dx` : `\\int_{1}^{\\infty} ${overXp(p)} \\, dx`,
    ...pickOf(options, right, [[atZero ? "pTestAtZero" : "pTestBackwards", atZero ? other : 1 - right, { p: plainFrac(p) }]]),
    steps: one
      ? [atZero ? `\\int_{t}^{1} \\frac{dx}{x} = -\\ln t \\to \\infty \\ (t \\to 0)` : `\\int_{1}^{b} \\frac{dx}{x} = \\ln b \\to \\infty`]
      : [
          atZero ? `\\int_{t}^{1} x^{-${pt}} \\, dx = \\frac{1 - t^{1 - ${pt}}}{1 - ${pt}}` : `\\int_{1}^{b} x^{-${pt}} \\, dx = \\frac{b^{1 - ${pt}} - 1}{1 - ${pt}}`,
          right === 0 ? `\\to \\frac{1}{${atZero ? `1 - ${pt}` : `${pt} - 1`}}` : `\\to \\infty`,
        ],
  };
}

/** ∫ₐ^∞ c/xⁿ dx or ∫₀^∞ c e^(−kx) dx. */
function valuePart(r: Rng, w: PracticeWords): Part {
  const c = r.int(1, 6);
  if (r.next() < 0.3) {
    const k = r.int(2, 5);
    const v = F(c, k);
    return {
      prompt: w.calc2.prompt.improperValue,
      q: `\\int_{0}^{\\infty} ${c === 1 ? "" : c}e^{-${k}x} \\, dx`,
      ...exact(v),
      steps: [`\\left[-\\frac{${c}}{${k}}e^{-${k}x}\\right]_{0}^{\\infty} = 0 + \\frac{${c}}{${k}} = ${v.tex()}`],
    };
  }
  const [n, a] = [r.int(2, 3), r.int(1, 3)];
  const v = F(c, (n - 1) * a ** (n - 1));
  return {
    prompt: w.calc2.prompt.improperValue,
    q: `\\int_{${a}}^{\\infty} \\frac{${c}}{x^{${n}}} \\, dx`,
    ...exact(v, [["dividedByOldPower", F(c, n * a ** (n - 1)), { n, m: n - 1 }]]),
    steps: [`\\int \\frac{${c}}{x^{${n}}} \\, dx = -\\frac{${c}}{${n - 1}x^{${n - 1}}}`, `\\left[-\\frac{${c}}{${n - 1}x^{${n - 1}}}\\right]_{${a}}^{\\infty} = 0 + \\frac{${c}}{${n - 1} \\cdot ${a}^{${n - 1}}} = ${v.tex()}`],
  };
}

/** ∫₀¹ c/xᵖ dx with p < 1, or c/(1 + x²) over a half-line or the line. */
function hardValuePart(r: Rng, w: PracticeWords): Part {
  const c = r.int(1, 5);
  if (r.next() < 0.5) {
    const p = r.pick([F(1, 3), F(1, 2), F(2, 3)]);
    const v = F(c * p.d, p.d - p.n);
    const e = F(p.d - p.n, p.d);
    return {
      prompt: w.calc2.prompt.improperValue,
      q: `\\int_{0}^{1} ${c === 1 ? overXp(p) : overXp(p).replace("{1}", `{${c}}`)} \\, dx`,
      ...exact(v),
      steps: [`\\left[\\frac{${c}x^{${e.tex()}}}{${e.tex()}}\\right]_{0}^{1} = \\frac{${c}}{${e.tex()}} = ${v.tex()}`],
    };
  }
  const whole = r.next() < 0.5;
  return {
    prompt: w.calc2.prompt.improperValue,
    q: `\\int_{${whole ? "-\\infty" : "0"}}^{\\infty} \\frac{${c}}{1 + x^{2}} \\, dx`,
    ...piTimes(F(c, whole ? 1 : 2)),
    steps: [`${c === 1 ? "" : c}\\left[\\arctan x\\right]_{${whole ? "-\\infty" : "0"}}^{\\infty} = ${c === 1 ? "" : c}\\left(\\frac{\\pi}{2} - ${whole ? "\\left(-\\frac{\\pi}{2}\\right)" : "0"}\\right)`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? convergePart(r, w, false) : L === 2 ? valuePart(r, w) : r.next() < 0.5 ? convergePart(r, w, true) : hardValuePart(r, w));

export default gen;
