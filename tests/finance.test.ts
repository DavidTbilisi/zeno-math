// The maths of the financial mathematics elective (src/math/finance.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { amortBalance, annuityPV, bondPrice, callPay, compound, MODELS, npvAt, payment, paymentsToClear, price, putPay, riskNeutral, STEPS, value } from "../src/math/finance.ts";
import { Frac } from "../src/math/fraction.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const F = (n: number, d = 1) => new Frac(n, d);

test("compounding more often tends to e^{rt}, and a loan's payments are worth the loan", () => {
  assert.ok(Math.abs(compound(1000, 0.05, 1e6, 10) - 1000 * Math.exp(0.5)) < 1e-3);
  assert.ok(Math.abs(compound(1000, 0.06, 12, 1) - 1061.68) < 0.01);
  const R = payment(10000, 0.01, 36);
  assert.ok(Math.abs(annuityPV(R, 0.01, 36) - 10000) < 1e-6);
  // paying R a month on the balance leaves nothing after n months
  let bal = 10000;
  for (let k = 0; k < 36; k++) bal = bal * 1.01 - R;
  assert.ok(Math.abs(bal) < 1e-6);
});

test("a loan's schedule: the balance month by month, nothing left after n payments, and the payments to clear it (#455)", () => {
  const R = payment(10000, 0.01, 36);
  let bal = 10000;
  for (let k = 1; k <= 36; k++) {
    bal = bal * 1.01 - R;
    assert.ok(Math.abs(amortBalance(10000, 0.01, R, k) - bal) < 1e-6, `after ${k}`);
  }
  assert.ok(Math.abs(amortBalance(10000, 0.01, R, 36)) < 1e-6);
  // A payment that clears the loan in exactly 36 months takes 36; a cent less takes one more, a larger one fewer.
  assert.equal(paymentsToClear(10000, 0.01, R), 36);
  assert.equal(paymentsToClear(10000, 0.01, R - 0.01), 37);
  assert.equal(paymentsToClear(10000, 0.01, 100), Infinity); // no more than the interest: never cleared
  for (const [B, i, x] of [[8000, 0.005, 300], [5000, 0.0075, 200], [12000, 0.01, 500]]) {
    const n = paymentsToClear(B, i, x);
    assert.ok(annuityPV(x, i, n) >= B && annuityPV(x, i, n - 1) < B, `${B} ${i} ${x}`);
  }
});

test("every model is free of arbitrage, and p̃ makes the discounted stock a martingale", () => {
  for (const m of [...MODELS, ...STEPS]) {
    const R = F(1).add(m.r);
    assert.ok(m.d.toNumber() > 0 && m.d.toNumber() < R.toNumber() && R.toNumber() < m.u.toNumber());
    const p = riskNeutral(m);
    assert.equal(p.mul(m.u).add(F(1).sub(p).mul(m.d)).toNumber(), R.toNumber());
  }
});

test("Shreve's example: S₀ = 4, u = 2, d = 1/2, r = 1/4 gives the call 1.76 and the American put 1.36", () => {
  const m = MODELS[0];
  assert.equal(value(m, 1, callPay(5)).toNumber(), 1.2);
  assert.equal(value(m, 2, callPay(5)).toNumber(), 1.76); // 11 · (1/2)² / (5/4)²
  assert.equal(value(m, 2, putPay(5), true).toNumber(), 1.36);
  assert.equal(value(m, 2, putPay(5)).toNumber(), 0.96);
});

test("put–call parity holds in every model, and the American call is the European one", () => {
  for (const m of MODELS)
    for (const n of [1, 2, 3])
      for (let K = 1; K < price(m, n, 0).toNumber(); K++) {
        const C = value(m, n, callPay(K));
        const P = value(m, n, putPay(K));
        const disc = F(K).div(Array.from({ length: n }, () => F(1).add(m.r)).reduce((a, b) => a.mul(b)));
        assert.equal(C.sub(P).toNumber(), F(m.S0).sub(disc).toNumber());
        assert.equal(value(m, n, callPay(K), true).toNumber(), C.toNumber());
        assert.ok(value(m, n, putPay(K), true).toNumber() >= P.toNumber());
      }
});

test("NPV: a level annuity's NPV is its present value less the cost, and every hard project's NPV is zero at its IRR (#456)", () => {
  assert.ok(Math.abs(npvAt([-10000, 4000, 4000, 4000], 0.08) - (annuityPV(4000, 0.08, 3) - 10000)) < 1e-9);
  assert.equal(npvAt([-5000, 3000, 3000], 0), 1000); // no discounting: the flows just add up
  // NPV falls as the rate rises, so a project is taken below its IRR and turned down above it.
  for (const r of [0.04, 0.05, 0.08, 0.1, 0.12]) assert.ok(npvAt([-10000, 4000, 4000, 4000], r) > npvAt([-10000, 4000, 4000, 4000], r + 0.01));
  for (let seed = 1; seed <= 60; seed++) {
    const ex = exercise("npv", 3, seed, en.pracWords);
    const [P, C1, C2] = [...ex.q.matchAll(/C_\d = (-?\d+)/g)].map((m) => Number(m[1]));
    const x = (ex.answer as { v: number }).v / 100;
    assert.ok(Math.abs(npvAt([P, C1, C2], x)) < 1e-6, `${ex.q} at ${x}`);
    assert.ok(npvAt([P, C1, C2], x - 0.01) > 0 && npvAt([P, C1, C2], x + 0.01) < 0);
  }
});

test("bonds: at the coupon rate a bond sells at par, above it at a discount, below at a premium, and every hard yield prices the bond (#457)", () => {
  for (const c of [0.04, 0.05, 0.06, 0.08])
    for (const n of [1, 2, 3, 5]) {
      assert.ok(Math.abs(bondPrice(1000, c, c, n) - 1000) < 1e-9, `par at ${c}, ${n} years`);
      assert.ok(bondPrice(1000, c, c + 0.01, n) < 1000 && bondPrice(1000, c, c - 0.01, n) > 1000);
    }
  // The price is the coupons and the face value, each discounted for its own year.
  assert.ok(Math.abs(bondPrice(1000, 0.06, 0.08, 2) - (60 / 1.08 + 1060 / 1.08 ** 2)) < 1e-9);
  for (let seed = 1; seed <= 80; seed++) {
    const ex = exercise("bonds", 3, seed, en.pracWords);
    if (ex.format !== "number") continue;
    const [c, n, P] = [/c = ([\d.]+)/, /n = (\d+)/, /P = ([\d.]+)/].map((re) => Number(ex.q.match(re)![1]));
    const y = (ex.answer as { v: number }).v / 100;
    assert.ok(Math.abs(bondPrice(1000, c / 100, y, n) - P) <= 0.005, `${ex.q} at ${y}`);
  }
});

test("every financial mathematics question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["inflation", "interestRates", "amortisation", "npv", "bonds", "binomialPricing", "optionPricing"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});

test("inflation: the exact real rate is a little smaller than i − π, money later is worth less today, and taxed interest is wiped out at i(1 − t) (#458)", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const ex = exercise("inflation", 2, seed, en.pracWords);
    const [i, p] = [/i = ([\d.]+)/, /pi = ([\d.]+)/].map((re) => Number(ex.q.match(re)![1]) / 100);
    const real = (ex.answer as { v: number }).v / 100;
    // (1 + i) = (1 + π)(1 + real), to the rounding of the answer; and the rough i − π overstates its size.
    assert.ok(Math.abs((1 + p) * (1 + real) - (1 + i)) < 1e-4, ex.q);
    assert.ok(Math.abs(real) < Math.abs(i - p), ex.q);
  }
  for (let seed = 1; seed <= 60; seed++) {
    const ex = exercise("inflation", 3, seed, en.pracWords);
    const v = (ex.answer as { v: number }).v;
    if (ex.q.startsWith("A")) assert.ok(v < Number(ex.q.match(/A = (\d+)/)![1]), ex.q);
    else {
      const [i, t] = [/i = ([\d.]+)/, /t = ([\d.]+)/].map((re) => Number(ex.q.match(re)![1]) / 100);
      // At π = i(1 − t) the deposit after tax just keeps up with prices.
      assert.ok(Math.abs((1 + i * (1 - t)) / (1 + v / 100) - 1) < 1e-9, ex.q);
    }
  }
});
