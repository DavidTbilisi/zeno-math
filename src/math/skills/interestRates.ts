// Practice: interest rates. Easy finds the amount after t years compounded n times a year (simple interest, the
// rate not divided by n, the years not multiplied by n, named); medium the amount compounded continuously (yearly
// compounding, simple interest, named) or a present value (discounting forward, simple discount, named); hard the
// payment that repays a loan (no interest, the sinking-fund formula, named) or the present value of an annuity (the
// payments added undiscounted, the future value for the present, named). Answers to the cent.
import { annuityPV, compound, money, payment } from "../finance";
import { dp } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pc = (r: number) => `${dp(r * 100, 2)}\\%`;

function compoundPart(r: Rng, w: PracticeWords): Part {
  const P = r.pick([500, 1000, 2000, 2500, 5000]);
  const rate = r.pick([3, 4, 5, 6, 8]) / 100;
  const n = r.pick([2, 4, 12]);
  const t = r.pick([2, 3, 5, 10]);
  const v = compound(P, rate, n, t);
  return {
    prompt: w.fin.prompt.compound,
    q: `P = ${P}, \\ r = ${pc(rate)}, \\ n = ${n}, \\ t = ${t}`,
    ...money(v, [["simpleForCompound", P * (1 + rate * t)], ["rateNotDividedByN", P * (1 + rate) ** (n * t)], ["periodsNotMultiplied", P * (1 + rate / n) ** t]]),
    steps: [`A = P\\left(1 + \\frac{r}{n}\\right)^{nt} = ${P}\\left(1 + \\frac{${rate}}{${n}}\\right)^{${n * t}}`, `A \\approx ${v.toFixed(2)}`],
  };
}

function continuousPart(r: Rng, w: PracticeWords): Part {
  const P = r.pick([500, 1000, 2000, 2500, 5000]);
  const rate = r.pick([3, 4, 5, 6, 8]) / 100;
  const t = r.pick([2, 3, 5, 10]);
  const v = P * Math.exp(rate * t);
  return {
    prompt: w.fin.prompt.continuous,
    q: `P = ${P}, \\ r = ${pc(rate)}, \\ t = ${t}`,
    ...money(v, [["continuousAsAnnual", P * (1 + rate) ** t], ["simpleForCompound", P * (1 + rate * t)]]),
    steps: [`A = P e^{rt} = ${P} e^{${dp(rate * t, 2)}}`, `A \\approx ${v.toFixed(2)}`],
  };
}

function presentPart(r: Rng, w: PracticeWords): Part {
  const A = r.pick([1000, 2000, 5000, 10000]);
  const rate = r.pick([3, 4, 5, 6, 8]) / 100;
  const t = r.pick([3, 5, 8, 10]);
  const v = A / (1 + rate) ** t;
  return {
    prompt: w.fin.prompt.presentValue,
    q: `A = ${A}, \\ r = ${pc(rate)}, \\ t = ${t}`,
    ...money(v, [["discountedForward", A * (1 + rate) ** t], ["simpleDiscount", A / (1 + rate * t)]]),
    steps: [`PV = \\frac{A}{(1 + r)^{t}} = \\frac{${A}}{${1 + rate}^{${t}}}`, `PV \\approx ${v.toFixed(2)}`],
  };
}

const MONTHLY = [0.005, 0.01, 0.015, 0.02];

function paymentPart(r: Rng, w: PracticeWords): Part {
  const L = r.pick([5000, 10000, 20000]);
  const i = r.pick(MONTHLY);
  const n = r.pick([12, 24, 36, 60]);
  const v = payment(L, i, n);
  return {
    prompt: w.fin.prompt.payment,
    q: `L = ${L}, \\ i = ${pc(i)}, \\ n = ${n}`,
    ...money(v, [["paymentNoInterest", L / n], ["sinkingFundForLoan", (L * i) / ((1 + i) ** n - 1)]]),
    steps: [
      `L = R \\cdot \\frac{1 - (1 + i)^{-n}}{i} \\implies R = \\frac{L i}{1 - (1 + i)^{-n}}`,
      `R = \\frac{${L} \\cdot ${i}}{1 - ${1 + i}^{-${n}}} \\approx ${v.toFixed(2)}`,
    ],
  };
}

function annuityPart(r: Rng, w: PracticeWords): Part {
  const R = r.pick([100, 200, 250, 500]);
  const i = r.pick(MONTHLY);
  const n = r.pick([12, 24, 36, 60]);
  const v = annuityPV(R, i, n);
  return {
    prompt: w.fin.prompt.annuityPV,
    q: `R = ${R}, \\ i = ${pc(i)}, \\ n = ${n}`,
    ...money(v, [["annuityNotDiscounted", R * n], ["annuityFutureForPresent", (R * ((1 + i) ** n - 1)) / i]]),
    steps: [
      `PV = \\sum_{k=1}^{n} \\frac{R}{(1 + i)^{k}} = R \\cdot \\frac{1 - (1 + i)^{-n}}{i}`,
      `PV = ${R} \\cdot \\frac{1 - ${1 + i}^{-${n}}}{${i}} \\approx ${v.toFixed(2)}`,
    ],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1 ? compoundPart(r, w) : L === 2 ? (r.next() < 0.5 ? continuousPart(r, w) : presentPart(r, w)) : r.next() < 0.5 ? paymentPart(r, w) : annuityPart(r, w);

export default gen;
