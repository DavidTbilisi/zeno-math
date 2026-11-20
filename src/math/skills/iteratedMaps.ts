// Practice: iterated maps. Easy finds the nonzero fixed point 1 − 1/r of the logistic map (1/r, named) or x₂ from x₀
// (x₁, one step only, named); medium finds the multiplier f′(x*) = 2 − r (f′(0) = r, named) or says whether x* is
// stable (|f′(x*)| < 1: f′ < 1 without the absolute value, f′(0) used, named); hard finds the 2-cycle past r = 3 from
// f(f(x)) = x (the fixed points 0 and x* left in, or the fixed point given as the cycle, named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { CYCLE_T, cycleOf, listed, logistic, logisticFixed, logisticMultiplier } from "../dynamics";
import type { Frac } from "../fraction";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const map = (r: Frac) => `x_{n+1} = ${r.tex()}\\, x_n (1 - x_n)`;
const RATES: readonly Frac[] = [F(3, 2), F(5, 2), F(3), F(7, 2), F(4), F(5, 4), F(7, 3), F(8, 3), F(10, 3), F(15, 4)];

function fixedPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const rate = r.pick(RATES);
    const x = logisticFixed(rate);
    return {
      prompt: w.dyn.prompt.fixedPoint,
      q: map(rate),
      ...exact(x, [["fixedPointOneOverR", F(1).div(rate)]]),
      steps: [`x = ${rate.tex()}\\, x (1 - x), \\ x \\ne 0 \\implies 1 - x = \\frac{1}{${rate.tex()}}`, `x^* = 1 - ${F(1).div(rate).tex()} = ${x.tex()}`],
    };
  }
  const rate = r.pick([F(2), F(3), F(4), F(5, 2), F(3, 2)]);
  const x0 = r.pick([F(1, 3), F(1, 4), F(1, 5), F(2, 5), F(1, 6), F(3, 4)]);
  const x1 = logistic(rate, x0);
  const x2 = logistic(rate, x1);
  return {
    prompt: w.dyn.prompt.iterate,
    q: `${map(rate)}, \\quad x_0 = ${x0.tex()}`,
    ...exact(x2, [["iteratedOnce", x1]]),
    steps: [`x_1 = ${rate.tex()} \\cdot ${x0.tex()} \\cdot ${F(1).sub(x0).tex()} = ${x1.tex()}`, `x_2 = ${rate.tex()} \\cdot ${x1.tex()} \\cdot ${F(1).sub(x1).tex()} = ${x2.tex()}`],
  };
}

function multiplierPart(r: Rng, w: PracticeWords): Part {
  const rate = r.pick(RATES.filter((x) => x.toNumber() !== 3));
  const x = logisticFixed(rate);
  const m = logisticMultiplier(rate);
  const steps = [`f'(x) = ${rate.tex()}(1 - 2x), \\quad x^* = ${x.tex()}`, `f'(x^*) = 2 - ${rate.tex()} = ${m.tex()}`];
  if (r.next() < 0.5) return { prompt: w.dyn.prompt.multiplier, q: map(rate), ...exact(m, [["derivativeAtZero", rate]]), steps };
  const options = [word(w.dyn.stable), word(w.dyn.unstable)];
  const stable = Math.abs(m.toNumber()) < 1;
  // r > 3: f′(x*) < −1, so "f′ < 1" calls it stable; 1 < r < 3: f′(0) = r > 1 calls it unstable
  const slip: [MistakeId, number][] = stable ? [["derivativeAtZero", 1]] : [["multiplierSignNotAbs", 0]];
  return {
    prompt: w.dyn.prompt.fixedStability,
    q: map(rate),
    ...pickOf(options, stable ? 0 : 1, slip),
    steps: [...steps, `|f'(x^*)| = ${m.abs().tex()} ${stable ? "< 1" : "> 1"}`],
  };
}

function cyclePart(r: Rng, w: PracticeWords): Part {
  const { r: rate, s, cycle } = cycleOf(r.pick(CYCLE_T));
  const x = logisticFixed(rate);
  return {
    prompt: w.dyn.prompt.cycle,
    q: map(rate),
    ...listed(cycle, [
      { id: "fixedPointsNotDivided", vs: [F(0), x, ...cycle] },
      { id: "fixedPointForCycle", vs: [x] },
    ]),
    steps: [
      `f(f(x)) - x = -x\\left(${rate.tex()}x - ${rate.sub(F(1)).tex()}\\right)\\left(${rate.mul(rate).tex()}x^2 - ${rate.mul(rate.add(F(1))).tex()}x + ${rate.add(F(1)).tex()}\\right)`,
      `x = \\frac{${rate.add(F(1)).tex()} \\pm ${s.tex()}}{${rate.mul(F(2)).tex()}} = ${cycle[0].tex()}, \\; ${cycle[1].tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? fixedPart(r, w) : L === 2 ? multiplierPart(r, w) : cyclePart(r, w));

export default gen;
