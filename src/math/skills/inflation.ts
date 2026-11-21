// Practice: inflation and real rates (#458). Easy finds a price after a year of inflation π, P(1 + π) (the increase
// alone, named), or the inflation from two prices as a percentage change (divided by the new price, the change in
// money, named); medium the real rate from a nominal rate i and inflation π, exactly (1 + i)/(1 + π) − 1 (the two
// the wrong way round, the rough i − π, named); hard what an amount A in n years is worth in today's prices,
// A/(1 + π)^n (π taken off simply each year, grown instead of shrunk, named), or the inflation that wipes out a
// deposit's interest once tax t is paid on it, i(1 − t) (the tax forgotten, named). Percentages and money to 2 dp.
import type { NumSlip } from "../calculusTwo";
import { money } from "../finance";
import { dp } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pc = (r: number) => `${dp(r * 100, 2)}\\%`;
const INFLATION = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1];
const PRICES = [2.4, 3.5, 12, 80, 250, 1200];

/** The answer to the cent, with only the slips a rounding can't be mistaken for (the "nearly" window is ±0.102). */
const answer = (v: number, slips: [NumSlip[0], number][]) => money(v, slips.filter(([, x]) => Math.abs(x - v) > 0.105));

function pricePart(r: Rng, w: PracticeWords): Part {
  const P = r.pick(PRICES);
  const p = r.pick(INFLATION);
  const v = P * (1 + p);
  return {
    prompt: w.fin.prompt.inflPrice,
    q: `P = ${P.toFixed(2)}, \\ \\pi = ${pc(p)}`,
    ...answer(v, [["increaseOnly", P * p]]),
    steps: [`P(1 + \\pi) = ${P.toFixed(2)} \\cdot ${1 + p}`, `= ${v.toFixed(2)}`],
  };
}

function changePart(r: Rng, w: PracticeWords): Part {
  const P0 = r.pick(PRICES.filter((x) => x >= 12));
  const p = r.pick(INFLATION);
  const P1 = Math.round(P0 * (1 + p) * 100) / 100;
  const v = ((P1 - P0) / P0) * 100;
  return {
    prompt: w.fin.prompt.inflChange,
    q: `P_0 = ${P0.toFixed(2)}, \\ P_1 = ${P1.toFixed(2)}`,
    ...answer(v, [["dividedByNew", ((P1 - P0) / P1) * 100], ["changeNotPercent", P1 - P0]]),
    steps: [`\\frac{P_1 - P_0}{P_0} \\cdot 100\\% = \\frac{${(P1 - P0).toFixed(2)}}{${P0.toFixed(2)}} \\cdot 100\\%`, `= ${v.toFixed(2)}\\%`],
  };
}

function realPart(r: Rng, w: PracticeWords): Part {
  const i = r.pick([0.06, 0.08, 0.1, 0.12, 0.15]);
  const p = r.pick(INFLATION.filter((x) => x !== i));
  const v = ((1 + i) / (1 + p) - 1) * 100;
  return {
    prompt: w.fin.prompt.inflReal,
    q: `i = ${pc(i)}, \\ \\pi = ${pc(p)}`,
    ...answer(v, [["realRateSwapped", ((1 + p) / (1 + i) - 1) * 100], ["realRateApprox", (i - p) * 100]]),
    steps: [`\\frac{1 + i}{1 + \\pi} - 1 = \\frac{${1 + i}}{${1 + p}} - 1`, `\\approx ${v.toFixed(2)}\\% \\quad (i - \\pi = ${dp((i - p) * 100, 2)}\\% \\text{ roughly})`],
  };
}

function todayPart(r: Rng, w: PracticeWords): Part {
  const A = r.pick([1000, 5000, 10000, 50000]);
  const p = r.pick([0.03, 0.04, 0.05, 0.08, 0.1]);
  const n = r.pick([5, 10, 20]);
  const v = A / (1 + p) ** n;
  const slips: [NumSlip[0], number][] = [["inflationGrown", A * (1 + p) ** n]];
  if (1 - n * p > 0) slips.push(["inflationSimple", A * (1 - n * p)]);
  return {
    prompt: w.fin.prompt.inflToday,
    q: `A = ${A}, \\ \\pi = ${pc(p)}, \\ n = ${n}`,
    ...answer(v, slips),
    steps: [`\\frac{A}{(1 + \\pi)^{n}} = \\frac{${A}}{${1 + p}^{${n}}}`, `\\approx ${v.toFixed(2)}`],
  };
}

function wipePart(r: Rng, w: PracticeWords): Part {
  const i = r.pick([0.04, 0.05, 0.06, 0.08, 0.1]);
  const t = r.pick([0.1, 0.15, 0.2, 0.25]);
  const v = i * (1 - t) * 100;
  return {
    prompt: w.fin.prompt.inflWipe,
    q: `i = ${pc(i)}, \\ t = ${pc(t)}`,
    ...answer(v, [["taxIgnored", i * 100]]),
    steps: [`\\text{after tax: } i(1 - t) = ${i} \\cdot ${1 - t} = ${dp(i * (1 - t), 4)}`, `\\frac{1 + i(1 - t)}{1 + \\pi} = 1 \\iff \\pi = ${v.toFixed(2)}\\%`],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1
    ? r.next() < 0.5
      ? pricePart(r, w)
      : changePart(r, w)
    : L === 2
      ? realPart(r, w)
      : r.next() < 0.5
        ? todayPart(r, w)
        : wipePart(r, w);

export default gen;
