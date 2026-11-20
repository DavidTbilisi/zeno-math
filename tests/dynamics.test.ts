// The maths of the dynamical systems elective (src/math/dynamics.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CYCLE_T, cycleOf, logistic, logisticFixed, logisticMultiplier, shiftMap, skewTentExponent } from "../src/math/dynamics.ts";
import { Frac } from "../src/math/fraction.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const F = (n: number, d = 1) => new Frac(n, d);

test("the logistic map's fixed point is fixed, with multiplier 2 − r", () => {
  for (const r of [F(3, 2), F(5, 2), F(7, 2), F(4)]) {
    const x = logisticFixed(r);
    assert.equal(logistic(r, x).toNumber(), x.toNumber());
    assert.equal(logisticMultiplier(r).toNumber(), 2 - r.toNumber());
  }
});

test("every 2-cycle is a 2-cycle past r = 3, and no fixed point", () => {
  for (const t of CYCLE_T) {
    const { r, cycle: [p, q] } = cycleOf(t);
    assert.ok(r.toNumber() > 3 && r.toNumber() <= 4, r.tex());
    assert.notEqual(p.toNumber(), q.toNumber());
    assert.equal(logistic(r, p).toNumber(), q.toNumber());
    assert.equal(logistic(r, q).toNumber(), p.toNumber());
  }
});

test("the shift map keeps the fractional part", () => {
  assert.equal(shiftMap(2, F(3, 5)).toNumber(), 1 / 5);
  assert.equal(shiftMap(3, F(4, 7)).toNumber(), 5 / 7);
  assert.equal(shiftMap(2, F(1, 3)).toNumber(), 2 / 3);
});

test("the skew tent's Lyapunov exponent matches a long orbit's average of ln |f′|", () => {
  for (const c of [1 / 3, 1 / 4, 2 / 5]) {
    // an orbit of the skew tent in floating point collapses, so sample the invariant (uniform) measure directly
    const N = 200000;
    let s = 0;
    for (let i = 0; i < N; i++) s += Math.log((i + 0.5) / N <= c ? 1 / c : 1 / (1 - c));
    assert.ok(Math.abs(s / N - skewTentExponent(c)) < 1e-4, String(c));
    assert.ok(skewTentExponent(c) < Math.log(2));
  }
});

test("every dynamical systems question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["bifurcations", "iteratedMaps", "lyapunov"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
