// Practice: how fast iterations converge. Easy counts the bisection steps that shrink a bracket below 10⁻ᵏ (one step
// short, one step per decimal digit, named); medium finds the linear rate (m − 1)/m of Newton's method at a root of
// multiplicity m (1/m, the rate 0 of a simple root, named); hard the rate |g′(r)| of a fixed-point iteration (the sign
// kept, named) or whether it converges at all (a negative slope taken for divergence, every fixed point taken to
// attract, named).
import { exact, pickOf, word } from "../calculusTwo";
import { F, bisectionSteps } from "../numericalAnalysis";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { wholeOf } from "../realAnalysis";

function bisectionPart(r: Rng, w: PracticeWords): Part {
  const len = r.pick([1, 2, 4]);
  const k = r.int(2, 6);
  const n = bisectionSteps(len, k);
  return {
    prompt: fill(w.na.prompt.bisection, { k }),
    q: `b - a = ${len}, \\quad \\frac{b - a}{2^{n}} \\le 10^{-${k}}`,
    ...wholeOf(n, [["bisectionOffByOne", n - 1], ["bisectionDigitPerStep", k]]),
    steps: [`2^{n} \\ge ${len} \\cdot 10^{${k}}`, `n \\ge \\log_2 (${len} \\cdot 10^{${k}}) \\approx ${Math.log2(len * 10 ** k).toFixed(2)}`, `n = ${n}`],
  };
}

function newtonPart(r: Rng, w: PracticeWords): Part {
  const m = r.int(3, 5);
  const a = r.int(-4, 4);
  let b: number;
  do b = r.int(-4, 4);
  while (b === a);
  const lin = (c: number) => (c === 0 ? "x" : c > 0 ? `(x - ${c})` : `(x + ${-c})`);
  const rate = F(m - 1, m);
  return {
    prompt: fill(w.na.prompt.newtonRate, { r: a }),
    q: `f(x) = ${lin(a)}^{${m}} ${lin(b)}`,
    ...exact(rate, [["newtonRateOneOverM", F(1, m)], ["newtonAlwaysQuadratic", 0]]),
    steps: [
      `r = ${a}, \\quad m = ${m}`,
      `e_{k+1} \\approx \\frac{m - 1}{m} e_k = ${rate.tex()} \\, e_k`,
    ],
  };
}

function fixedPart(r: Rng, w: PracticeWords): Part {
  // g(x) = x − α(x² − s²) has the fixed point r = s and g′(r) = 1 − 2αs.
  const s = r.int(1, 4);
  const pick = r.next() < 0.5;
  const converges = !pick || r.next() < 0.5;
  let alpha: Frac;
  let slope: Frac;
  do {
    alpha = F(r.int(1, 9), r.pick([2, 4, 5, 8, 10]));
    slope = F(1).sub(alpha.mul(F(2 * s)));
  } while (converges ? !(slope.toNumber() < 0 && slope.toNumber() > -1) : !(slope.toNumber() < -1 && slope.toNumber() > -4));
  const q = `g(x) = x - ${alpha.tex()}\\left(x^{2} - ${s * s}\\right), \\quad r = ${s}`;
  const steps = [`g'(x) = 1 - ${alpha.mul(F(2)).tex()} x`, `g'(${s}) = 1 - ${alpha.mul(F(2)).tex()} \\cdot ${s} = ${slope.tex()}`];
  if (!pick)
    return { prompt: w.na.prompt.fixedRate, q, ...exact(slope.abs(), [["derivativeSignKept", slope]]), steps: [...steps, `|g'(${s})| = ${slope.abs().tex()}`] };
  const options = [word(w.na.converges), word(w.na.diverges)];
  return {
    prompt: w.na.prompt.fixedConverges,
    q,
    ...pickOf(options, converges ? 0 : 1, [converges ? ["negativeDerivativeDiverges", 1] : ["fixedPointAlwaysConverges", 0]]),
    steps: [...steps, `|g'(${s})| = ${slope.abs().tex()} ${converges ? "<" : ">"} 1`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? bisectionPart(r, w) : L === 2 ? newtonPart(r, w) : fixedPart(r, w));

export default gen;
