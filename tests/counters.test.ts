// Integer counters: zero pairs cancel and leave the value; every sum walked through ends on its answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answer, cancelOne, cancelPairs, CHIP_CAP, NUM_RANGE, pairs, put, slots, sumSteps, sumText, take, value,
} from "../src/math/counters.ts";

test("zero pairs cancel and the value stays", () => {
  const m = { pos: 3, neg: 5 };
  assert.equal(pairs(m), 3);
  assert.deepEqual(cancelPairs(m), { pos: 0, neg: 2 });
  assert.equal(value(cancelPairs(m)), value(m));
  assert.deepEqual(cancelOne(m), { pos: 2, neg: 4 });
  assert.deepEqual(cancelOne({ pos: 4, neg: 0 }), { pos: 4, neg: 0 }, "no pair, nothing cancels");
  assert.deepEqual(put({ pos: CHIP_CAP, neg: 0 }, false), { pos: CHIP_CAP, neg: 0 });
  assert.deepEqual(take({ pos: 0, neg: 0 }, true), { pos: 0, neg: 0 });
});

test("the chips of a pair sit one above the other; the ones left over keep their place", () => {
  assert.deepEqual(slots({ pos: 3, neg: 5 }), { pos: [2, 3, 4], neg: [0, 1, 2, 3, 4], paired: 3 });
  assert.deepEqual(slots({ pos: 2, neg: 0 }), { pos: [0, 1], neg: [], paired: 0 });
  // After the pairs go, the two − left are still in slots 0 and 1.
  assert.deepEqual(slots(cancelPairs({ pos: 3, neg: 5 })).neg, [0, 1]);
});

test("the steps of a sum", () => {
  assert.deepEqual(sumSteps(3, "add", -5).map((s) => s.kind), ["start", "put", "cancel", "answer"]);
  // 2 − 5: too few + to take 5 away, so 3 zero pairs first; then 3 − are left.
  const sub = sumSteps(2, "sub", 5);
  assert.deepEqual(sub.map((s) => s.kind), ["start", "zeroPairs", "take", "answer"]);
  assert.deepEqual(sub[1], { kind: "zeroPairs", n: 3, take: 5, negative: false, mat: { pos: 5, neg: 3 } });
  assert.deepEqual(sub.at(-1)!.mat, { pos: 0, neg: 3 });
  // 2 − (−4): 4 zero pairs, take the 4 − away, 6 + left.
  assert.deepEqual(sumSteps(2, "sub", -4).at(-1)!.mat, { pos: 6, neg: 0 });
  assert.deepEqual(sumSteps(4, "add", 0).map((s) => s.kind), ["start", "answer"]);
  assert.equal(sumText(2, "sub", -4), "2 − (−4)");
  assert.equal(sumText(-3, "add", 5), "−3 + 5");
});

test("every sum in range ends on its answer with no pairs left and never over the cap", () => {
  for (let a = NUM_RANGE[0]; a <= NUM_RANGE[1]; a++)
    for (let b = NUM_RANGE[0]; b <= NUM_RANGE[1]; b++)
      for (const op of ["add", "sub"] as const) {
        const steps = sumSteps(a, op, b);
        const end = steps.at(-1)!.mat;
        assert.equal(value(end), answer(a, op, b), `${a} ${op} ${b}`);
        assert.equal(pairs(end), 0);
        for (const s of steps) assert.ok(s.mat.pos <= CHIP_CAP && s.mat.neg <= CHIP_CAP && s.mat.pos >= 0 && s.mat.neg >= 0);
      }
});
