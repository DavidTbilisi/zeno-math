// The maths of the cryptography elective (src/math/crypto.ts) and its three skills.
import assert from "node:assert/strict";
import { test } from "node:test";
import { dlog, ecAdd, ecMul, orderMod, points, primitiveRoots, rhs, smooth, type Curve } from "../src/math/crypto.ts";
import { powMod } from "../src/math/numberTheoryTwo.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

test("orders divide p − 1 and primitive roots have order p − 1", () => {
  assert.equal(orderMod(2, 7), 3);
  assert.equal(orderMod(3, 7), 6);
  assert.deepEqual(primitiveRoots(7), [3, 5]);
  assert.deepEqual(primitiveRoots(11), [2, 6, 7, 8]);
  for (const p of [11, 13, 23, 41]) for (let g = 2; g < p; g++) assert.equal((p - 1) % orderMod(g, p), 0);
});

test("the discrete log undoes the power", () => {
  assert.equal(dlog(2, 17, 19), 10);
  for (const p of [19, 23]) {
    const g = primitiveRoots(p)[0];
    for (let x = 0; x < p - 1; x++) assert.equal(dlog(g, powMod(g, x, p), p), x);
  }
  assert.equal(dlog(2, 3, 7), null); // 2 has order 3 mod 7: 1, 2, 4
});

test("Diffie–Hellman: both sides reach the same key", () => {
  const [p, g, a, b] = [23, 5, 6, 15];
  assert.equal(powMod(powMod(g, b, p), a, p), powMod(powMod(g, a, p), b, p));
  assert.equal(powMod(powMod(g, b, p), a, p), 2);
});

test("y² = x³ + 2x + 2 over ℤ₁₇ has 19 points and (5, 1) generates them", () => {
  const E: Curve = { a: 2, b: 2, p: 17 };
  assert.ok(smooth(E));
  assert.equal(points(E).length + 1, 19);
  for (const [x, y] of points(E)) assert.equal((y * y) % 17, rhs(E, x));
  assert.deepEqual(ecAdd(E, [5, 1], [5, 1]), [6, 3]);
  assert.deepEqual(ecMul(E, 3, [5, 1]), [10, 6]);
  assert.equal(ecMul(E, 19, [5, 1]), null);
  assert.equal(ecAdd(E, [5, 1], [5, 16]), null); // P + (−P) = O
});

test("the group law is commutative and associative on a small curve", () => {
  const E: Curve = { a: 1, b: 6, p: 11 };
  const pts = points(E);
  for (const P of pts.slice(0, 5))
    for (const Q of pts.slice(0, 5)) {
      assert.deepEqual(ecAdd(E, P, Q), ecAdd(E, Q, P));
      for (const R of pts.slice(0, 4)) assert.deepEqual(ecAdd(E, ecAdd(E, P, Q), R), ecAdd(E, P, ecAdd(E, Q, R)));
    }
});

test("every crypto question accepts its answer and names each trap", () => {
  const w = en.pracWords;
  for (const s of ["discreteLog", "elGamal", "ellipticCurves"] as SkillId[])
    for (const L of [1, 2, 3] as const)
      for (let seed = 0; seed < 40; seed++) {
        const e = exercise(s, L, seed, w);
        assert.ok(check(e, e.plain, w).ok, `${s} ${L} ${seed}`);
        for (const t of trapInputs(e)) assert.equal(check(e, t.input, w).mistake, t.id, `${s} ${L} ${seed} ${t.id}`);
      }
});
