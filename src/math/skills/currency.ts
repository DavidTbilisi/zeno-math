// Practice: currency conversion (#459). Rates are given in lari (GEL) for one dollar or one euro. Easy changes an
// amount at a rate, multiplying from the foreign currency and dividing into it (the other operation, named); medium
// changes at a bank that buys the foreign currency at b and sells it at s (the bank's other rate, named), or a cross
// rate of one euro in dollars from the two rates to lari (the ratio upside down, named); hard the lari lost on a round
// trip, A(1 − b/s) (the spread on the amount, named), or the rate without a fee that matches a rate R with a fee f,
// R(1 − f) (the fee added, named). Money to 2 dp, rates to 4 dp.
import type { NumSlip } from "../calculusTwo";
import { money } from "../finance";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const RATES = { USD: [2.65, 2.7, 2.75, 2.8], EUR: [2.9, 3, 3.1, 3.2] } as const;
const cents = (v: number) => Math.round(v * 100) / 100;
const gel = (v: number) => `${v.toFixed(2)} \\text{ GEL}`;
const one = (c: string, v: number) => `1 \\text{ ${c}} = ${gel(v)}`;

/** The answer to the cent, with only the slips a rounding can't be mistaken for (the "nearly" window is ±0.102). */
const answer = (v: number, slips: [NumSlip[0], number][]) => money(v, slips.filter(([, x]) => Math.abs(x - v) > 0.105));

/** A rate to 4 dp: exact enough that no "nearly" window applies, so a slip close by is still named. */
function rate(v: number, slips: [NumSlip[0], number][]) {
  const traps = slips.filter(([, x]) => Math.abs(x - v) > 2e-4).map(([id, x]) => ({ id, a: num(x, 1e-4) }));
  return { answer: { ...num(v, 1e-4), ...(traps.length ? { traps } : {}) }, show: dp(v, 4), plain: dp(v, 4), format: "number" as const };
}

function convertPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(["USD", "EUR"] as const);
  const R = r.pick(RATES[c]);
  const out = r.next() < 0.5;
  // Out of lari divides by the rate; into lari multiplies by it.
  const A = out ? r.pick([200, 500, 1000, 1500]) : r.pick([50, 120, 250, 400]);
  const v = out ? A / R : A * R;
  return {
    prompt: w.fin.prompt.fxConvert,
    q: `A = ${out ? gel(A) : `${A} \\text{ ${c}}`}, \\ ${one(c, R)}`,
    ...answer(v, out ? [["rateMultiplied", A * R]] : [["rateDivided", A / R]]),
    steps: [out ? `\\frac{${A}}{${R}} \\approx ${v.toFixed(2)} \\text{ ${c}}` : `${A} \\cdot ${R} = ${gel(v)}`],
  };
}

function spreadPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(["USD", "EUR"] as const);
  const mid = r.pick(RATES[c]);
  const [b, s] = [cents(mid - 0.05), cents(mid + 0.05)];
  const out = r.next() < 0.5;
  // The bank sells you the foreign currency at s, and buys it from you at b: both are the worse rate for you.
  const A = out ? r.pick([500, 1000, 2000]) : r.pick([100, 300, 500]);
  const v = out ? A / s : A * b;
  return {
    prompt: w.fin.prompt.fxSpread,
    q: `A = ${out ? gel(A) : `${A} \\text{ ${c}}`}, \\ b = ${gel(b)}, \\ s = ${gel(s)} \\ (1 \\text{ ${c}})`,
    ...answer(v, [["spreadWrongSide", out ? A / b : A * s]]),
    steps: [out ? `\\frac{A}{s} = \\frac{${A}}{${s.toFixed(2)}} \\approx ${v.toFixed(2)} \\text{ ${c}}` : `A \\cdot b = ${A} \\cdot ${b.toFixed(2)} = ${gel(v)}`],
  };
}

function crossPart(r: Rng, w: PracticeWords): Part {
  const u = r.pick(RATES.USD);
  const e = r.pick(RATES.EUR);
  const v = e / u;
  return {
    prompt: w.fin.prompt.fxCross,
    q: `${one("USD", u)}, \\ ${one("EUR", e)}`,
    ...rate(v, [["crossInverted", u / e]]),
    steps: [`1 \\text{ EUR} = \\frac{${e}}{${u}} \\text{ USD} \\approx ${dp(v, 4)} \\text{ USD}`],
  };
}

function roundTripPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(["USD", "EUR"] as const);
  const mid = r.pick(RATES[c]);
  // Even gaps, so both rates are whole cents and the question shows them exactly.
  const gap = r.pick([0.04, 0.06, 0.08, 0.1]);
  const [b, s] = [cents(mid - gap / 2), cents(mid + gap / 2)];
  const A = r.pick([1000, 2000, 5000]);
  const v = A * (1 - b / s);
  return {
    prompt: w.fin.prompt.fxRoundTrip,
    q: `A = ${gel(A)}, \\ b = ${gel(b)}, \\ s = ${gel(s)} \\ (1 \\text{ ${c}})`,
    ...answer(v, [["spreadOnAmount", A * (s - b)]]),
    steps: [`\\frac{A}{s} \\cdot b = \\frac{${A}}{${s.toFixed(2)}} \\cdot ${b.toFixed(2)} \\approx ${(A - v).toFixed(2)}`, `A - ${(A - v).toFixed(2)} = ${v.toFixed(2)} \\text{ GEL}`],
  };
}

function breakEvenPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(["USD", "EUR"] as const);
  const R = r.pick(RATES[c]);
  const f = r.pick([0.01, 0.02, 0.03, 0.05]);
  const v = R * (1 - f);
  return {
    prompt: w.fin.prompt.fxBreakEven,
    q: `${one(c, R)}, \\ f = ${dp(f * 100, 2)}\\%`,
    ...rate(v, [["feeAdded", R * (1 + f)]]),
    steps: [`A \\cdot R \\cdot (1 - f) = A \\cdot x \\iff x = ${R} \\cdot ${1 - f} = ${dp(v, 4)}`],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1
    ? convertPart(r, w)
    : L === 2
      ? r.next() < 0.5
        ? spreadPart(r, w)
        : crossPart(r, w)
      : r.next() < 0.5
        ? roundTripPart(r, w)
        : breakEvenPart(r, w);

export default gen;
