// The maths of the financial mathematics elective (src/math/finance.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { amortBalance, annuityPV, callPay, compound, MODELS, payment, paymentsToClear, price, putPay, riskNeutral, STEPS, value } from "../src/math/finance.ts";
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

test("every financial mathematics question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["interestRates", "amortisation", "binomialPricing", "optionPricing"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
