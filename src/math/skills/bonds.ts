// Practice: bonds and yield (#457). A bond of face value F pays a coupon c·F at the end of every year and F back at
// maturity. Easy finds the coupon c·F (taken on the price, named) or the current yield cF/P (the coupon rate, cF/F,
// named); medium the price at the market yield y, Σ cF/(1 + y)^t + F/(1 + y)^n (the face value left undiscounted,
// discounted at the coupon rate, which always gives F, named); hard whether the bond trades above, at or below its
// face value, which turns on y against c (premium and discount swapped, named), or the yield to maturity of a one- or
// two-year bond from its price, a whole percent (the current yield, the coupon rate, named).
import { pickOf, word } from "../calculusTwo";
import { bondPrice, money } from "../finance";
import type { MistakeId } from "../mistakes";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const pc = (r: number) => `${dp(r * 100, 2)}\\%`;
const F = 1000;
const COUPONS = [0.04, 0.05, 0.06, 0.08];
const YIELDS = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.1];

function couponPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(COUPONS);
  const P = r.pick([900, 950, 1050, 1100]);
  const v = c * F;
  return {
    prompt: w.fin.prompt.bondCoupon,
    q: `F = ${F}, \\ c = ${pc(c)}, \\ P = ${P}`,
    ...money(v, [["couponOnPrice", c * P]]),
    steps: [`cF = ${c} \\cdot ${F} = ${v.toFixed(2)}`],
  };
}

function currentYieldPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(COUPONS);
  const P = r.pick([800, 900, 950, 1040, 1100, 1250]);
  const v = ((c * F) / P) * 100;
  return {
    prompt: w.fin.prompt.bondCurrentYield,
    q: `F = ${F}, \\ c = ${pc(c)}, \\ P = ${P}`,
    ...money(v, [["currentYieldFace", c * 100]]),
    steps: [`\\frac{cF}{P} = \\frac{${c * F}}{${P}}`, `\\approx ${v.toFixed(2)}\\%`],
  };
}

function pricePart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(COUPONS);
  const y = r.pick(YIELDS.filter((x) => x !== c));
  const n = r.pick([2, 3, 5]);
  const v = bondPrice(F, c, y, n);
  const coupons = bondPrice(F, c, y, n) - F / (1 + y) ** n;
  return {
    prompt: w.fin.prompt.bondPrice,
    q: `F = ${F}, \\ c = ${pc(c)}, \\ y = ${pc(y)}, \\ n = ${n}`,
    ...money(v, [["faceUndiscounted", coupons + F], ["couponRateDiscount", F]]),
    steps: [
      `P = \\sum_{t=1}^{${n}} \\frac{${c * F}}{${1 + y}^{t}} + \\frac{${F}}{${1 + y}^{${n}}}`,
      `P \\approx ${coupons.toFixed(2)} + ${(F / (1 + y) ** n).toFixed(2)} = ${v.toFixed(2)}`,
    ],
  };
}

function premiumPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(COUPONS);
  // A third of the time the market asks the coupon rate itself, and the bond sells at its face value.
  const y = r.next() < 1 / 3 ? c : r.pick(YIELDS.filter((x) => x !== c));
  const options = [word(w.fin.bond.premium), word(w.fin.bond.par), word(w.fin.bond.discount)];
  const right = y < c ? 0 : y === c ? 1 : 2;
  const slips: [MistakeId, number][] = right === 1 ? [] : [["premiumDiscountSwapped", 2 - right]];
  return {
    prompt: w.fin.prompt.bondPremium,
    q: `F = ${F}, \\ c = ${pc(c)}, \\ y = ${pc(y)}, \\ n = 5`,
    ...pickOf(options, right, slips),
    steps: [
      `P = ${bondPrice(F, c, y, 5).toFixed(2)}`,
      `${y < c ? `y < c \\implies P > F` : y === c ? `y = c \\implies P = F` : `y > c \\implies P < F`}: \\text{${options[right].text}}`,
    ],
  };
}

function ytmPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(COUPONS);
  const x = r.pick([3, 4, 5, 6, 7, 8, 10].filter((p) => p !== c * 100));
  const n = r.pick([1, 2]);
  const P = Math.round(bondPrice(F, c, x / 100, n) * 100) / 100;
  // The current yield can sit within a rounding of the coupon rate; then only the coupon rate is named.
  const traps = (
    [
      ["ytmCouponRate", c * 100],
      ["ytmCurrentYield", ((c * F) / P) * 100],
    ] as const
  )
    .filter(([, t], j, all) => Math.abs(t - x) > 0.05 && (j === 0 || Math.abs(t - all[0][1]) > 0.11))
    .map(([id, t]) => ({ id, a: num(t, 0.051) }));
  const cF = c * F;
  return {
    prompt: w.fin.prompt.bondYtm,
    q: `F = ${F}, \\ c = ${pc(c)}, \\ n = ${n}, \\ P = ${P.toFixed(2)}`,
    // Built from a whole-percent yield; the price rounded to the cent moves the exact yield by under 0.0003 points.
    answer: { ...num(x, 4e-4), ...(traps.length ? { traps } : {}) },
    show: `${x}\\%`,
    plain: String(x),
    format: "number",
    steps:
      n === 1
        ? [`P = \\frac{${cF + F}}{1 + y} \\implies 1 + y = \\frac{${cF + F}}{${P.toFixed(2)}} = ${1 + x / 100}`, `y = ${x}\\%`]
        : [
            `P = \\frac{${cF}}{1 + y} + \\frac{${cF + F}}{(1 + y)^{2}}, \\quad z = 1 + y`,
            `${P.toFixed(2)}z^{2} - ${cF}z - ${cF + F} = 0 \\implies z = ${1 + x / 100}`,
            `y = ${x}\\%`,
          ],
  };
}

const gen: Gen = (r, L, w) =>
  L === 1
    ? r.next() < 0.5
      ? couponPart(r, w)
      : currentYieldPart(r, w)
    : L === 2
      ? pricePart(r, w)
      : r.next() < 0.5
        ? premiumPart(r, w)
        : ytmPart(r, w);

export default gen;
