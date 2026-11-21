// Financial mathematics as a degree's elective teaches it (Shreve, Stochastic Calculus for Finance I: The Binomial
// Asset Pricing Model): interest, present value and annuities, then the binomial model, risk-neutral pricing,
// replication, arbitrage, European and American options and put–call parity. The words, the data and the rules; the
// questions are in src/math/skills/{interestRates,amortisation,npv,binomialPricing,optionPricing}.ts.
import { Frac } from "./fraction";
import { numTraps, type NumSlip } from "./calculusTwo";
import { dp, num } from "./practiceKit";
import type { Answer, Format } from "./practiceTypes";

/** The words of these questions (the locale's `fin` block). */
export type FinanceWords = {
  prompt: {
    compound: string;
    continuous: string;
    presentValue: string;
    payment: string;
    annuityPV: string;
    riskNeutral: string;
    call1: string;
    put1: string;
    delta: string;
    arbitrage: string;
    call2: string;
    put2: string;
    parity: string;
    american: string;
    amortInterest: string;
    amortPrincipal: string;
    amortBalance: string;
    amortTotal: string;
    amortPayments: string;
    npvPV: string;
    npvValue: string;
    npvAccept: string;
    npvIrr: string;
  };
  arb: { none: string; buy: string; short: string };
  npv: { accept: string; reject: string };
};

// ---------- interest ----------

/** P(1 + r/n)^{nt}: the amount after t years at the yearly rate r compounded n times a year. */
export const compound = (P: number, r: number, n: number, t: number) => P * (1 + r / n) ** (n * t);
/** The payment that repays a loan L in n payments at the rate i a period: L i / (1 − (1 + i)^{−n}). */
export const payment = (L: number, i: number, n: number) => (L * i) / (1 - (1 + i) ** -n);
/** The present value of n payments R at the rate i a period, the first one period away: R (1 − (1 + i)^{−n}) / i. */
export const annuityPV = (R: number, i: number, n: number) => (R * (1 - (1 + i) ** -n)) / i;

/** What is still owed on a loan L at the rate i a period after k payments R: L(1 + i)^k − R((1 + i)^k − 1)/i. */
export const amortBalance = (L: number, i: number, R: number, k: number) => L * (1 + i) ** k - (R * ((1 + i) ** k - 1)) / i;
/** The payments R at the rate i a period it takes to clear a balance B: the smallest whole n with annuityPV ≥ B. */
/** A project's net present value at the rate r a period: Σ C_t/(1 + r)^t, C_0 now. */
export const npvAt = (flows: number[], r: number) => flows.reduce((s, c, t) => s + c / (1 + r) ** t, 0);

export function paymentsToClear(B: number, i: number, R: number): number {
  if (R <= B * i) return Infinity;
  const n = Math.ceil(-Math.log(1 - (B * i) / R) / Math.log(1 + i) - 1e-9);
  return annuityPV(R, i, n) >= B - 1e-9 ? n : n + 1;
}

/** A sum of money to the cent, with slips judged at the same tolerance and dropped when they round alike. */
export function money(v: number, slips: NumSlip[] = []): { answer: Answer; show: string; plain: string; format: Format } {
  const traps = numTraps(v, slips)
    .filter((t) => t.a.k === "num" && Math.abs(t.a.v - v) > 0.02)
    .map((t) => ({ ...t, a: num((t.a as { v: number }).v, 0.0051) }));
  const s = v.toFixed(2);
  return { answer: { ...num(v, 0.0051), ...(traps.length ? { traps } : {}) }, show: s, plain: s, format: "dp2" };
}

// ---------- the binomial model ----------

/** A binomial model: the stock starts at S0 and each period goes up by u or down by d; money grows by 1 + r. */
export type Model = { S0: number; u: Frac; d: Frac; r: Frac };
const F = (n: number, d = 1) => new Frac(n, d);

/** Models with 0 < d < 1 + r < u (no arbitrage) and whole-number stock prices for two periods. */
export const MODELS: readonly Model[] = [
  ...[4, 8, 16].map((S0) => ({ S0, u: F(2), d: F(1, 2), r: F(1, 4) })), // Shreve's own: p̃ = 1/2
  ...[4, 8, 16].map((S0) => ({ S0, u: F(3, 2), d: F(1, 2), r: F(1, 4) })), // p̃ = 3/4
  ...[25, 50].map((S0) => ({ S0, u: F(6, 5), d: F(4, 5), r: F(1, 10) })), // p̃ = 3/4
  ...[4, 8].map((S0) => ({ S0, u: F(2), d: F(1, 2), r: F(1, 2) })), // p̃ = 2/3
  ...[4, 8, 16].map((S0) => ({ S0, u: F(2), d: F(1, 2), r: F(1, 10) })), // p̃ = 2/5
];

/** More one-period models with 0 < d < 1 + r < u, for p̃ alone (no stock prices needed). */
export const STEPS: readonly Pick<Model, "u" | "d" | "r">[] = [
  { u: F(3, 2), d: F(2, 3), r: F(1, 6) }, // p̃ = 3/5
  { u: F(5, 4), d: F(3, 4), r: F(1, 20) }, // 3/5
  { u: F(3), d: F(1, 3), r: F(1, 3) }, // 3/8
  { u: F(4, 3), d: F(3, 4), r: F(1, 12) }, // 4/7
  { u: F(5, 4), d: F(4, 5), r: F(1, 10) }, // 2/3
  { u: F(7, 5), d: F(3, 5), r: F(1, 5) }, // 3/4
  { u: F(3, 2), d: F(3, 4), r: F(1, 8) }, // 1/2
  { u: F(11, 10), d: F(9, 10), r: F(1, 20) }, // 3/4
];

/** p̃ = (1 + r − d)/(u − d), the up chance under which the discounted stock is a martingale. */
export const riskNeutral = (m: Pick<Model, "u" | "d" | "r">) => F(1).add(m.r).sub(m.d).div(m.u.sub(m.d));
/** The stock price after j ups and k downs. */
export const price = (m: Model, j: number, k: number) => F(m.S0).mul(pow(m.u, j)).mul(pow(m.d, k));
export const pow = (x: Frac, n: number) => Array.from({ length: n }, () => x).reduce((a, b) => a.mul(b), F(1));

export const callPay = (K: number) => (S: Frac) => (S.toNumber() > K ? S.sub(F(K)) : F(0));
export const putPay = (K: number) => (S: Frac) => (S.toNumber() < K ? F(K).sub(S) : F(0));
const max = (a: Frac, b: Frac) => (a.toNumber() >= b.toNumber() ? a : b);

/** The value at time 0 of a payoff at time n, by backward induction with p̃; American when it may be exercised early. */
export function value(m: Model, n: number, pay: (S: Frac) => Frac, american = false): Frac {
  const p = riskNeutral(m);
  const q = F(1).sub(p);
  const R = F(1).add(m.r);
  // V[j] at step t is the value after j downs
  let V = Array.from({ length: n + 1 }, (_, j) => pay(price(m, n - j, j)));
  for (let t = n - 1; t >= 0; t--) {
    V = Array.from({ length: t + 1 }, (_, j) => {
      const hold = p.mul(V[j]).add(q.mul(V[j + 1])).div(R);
      return american ? max(hold, pay(price(m, t - j, j))) : hold;
    });
  }
  return V[0];
}

/** Ẽ[V_n], the risk-neutral average of the payoff at time n with this model's p̃. */
export function expectation(m: Model, n: number, pay: (S: Frac) => Frac): Frac {
  const p = riskNeutral(m);
  const q = F(1).sub(p);
  let s = F(0);
  for (let k = 0; k <= n; k++) s = s.add(F(choose(n, k)).mul(pow(p, n - k)).mul(pow(q, k)).mul(pay(price(m, n - k, k))));
  return s;
}
const choose = (n: number, k: number): number => (k === 0 || k === n ? 1 : choose(n - 1, k - 1) + choose(n - 1, k));

/** A money amount as written in a question: whole, or to 2 places. */
export const cash = (v: number) => (Number.isInteger(v) ? String(v) : dp(v, 2));
