// The maths of the measure theory elective (src/math/measureTheory.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { F, SQUARE_NORMS, cantorLeft, oneGapRemoved, polyIntegral, powF, unionLength } from "../src/math/measureTheory.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

test("the length of two intervals counts their overlap once", () => {
  assert.equal(unionLength(0, 3, 5, 7), 5);
  assert.equal(unionLength(0, 3, 2, 7), 7);
  assert.equal(unionLength(0, 5, 1, 2), 5);
  assert.equal(unionLength(0, 3, 3, 4), 4);
});

test("the middle-thirds Cantor set keeps (2/3)ⁿ and its measure tends to 0", () => {
  assert.deepEqual(cantorLeft(1, F(1, 3), 1), F(2, 3));
  assert.deepEqual(cantorLeft(1, F(1, 3), 2), F(4, 9));
  assert.deepEqual(cantorLeft(9, F(1, 3), 3), F(8, 3));
  assert.ok(cantorLeft(1, F(1, 3), 40).toNumber() < 1e-6);
  assert.deepEqual(powF(F(1, 2), 0), F(1));
  // one gap a step: 1/3, then 1/9 from one of the two thirds
  assert.deepEqual(oneGapRemoved(1, F(1, 3), 2), F(4, 9));
});

test("integrals of c xᵏ + s over [0, b]", () => {
  assert.deepEqual(polyIntegral(1, 1, 0, 2), F(2));
  assert.deepEqual(polyIntegral(3, 2, 1, 1), F(2));
  assert.deepEqual(polyIntegral(2, 1, 3, 3), F(18));
});

test("the 2-norms of the norm questions come out whole", () => {
  assert.ok(SQUARE_NORMS.length > 10);
  for (const [a, b, u, v] of SQUARE_NORMS) assert.ok(Number.isInteger(Math.sqrt(a * a * u + b * b * v)));
});

test("every measure theory question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["lebesgueMeasure", "simpleIntegrals", "convergenceTheorems"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
