// The soroban: the digits on the rods, clicking beads, the rules each rod uses to add or take away, the steps of a sum
// (checked against ordinary arithmetic for every pair of small numbers), and the numbers it asks for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import { beadsOf, clickBead, rodDigits, ruleFor, sorobanFits, sorobanMax, sorobanSteps, sorobanTarget } from "../src/math/soroban.ts";

test("rods show the digits, the five bead and the ones", () => {
  assert.deepEqual(rodDigits(2026, 6), [0, 0, 2, 0, 2, 6]);
  assert.deepEqual(rodDigits(0, 3), [0, 0, 0]);
  assert.deepEqual(beadsOf(7), { five: true, ones: 2 });
  assert.deepEqual(beadsOf(4), { five: false, ones: 4 });
  assert.equal(sorobanMax(4), 9999);
});

test("clicking a bead moves it with the beads between it and the beam", () => {
  assert.equal(clickBead(0, 0, "five"), 5);
  assert.equal(clickBead(7, 0, "five"), 2);
  assert.equal(clickBead(0, 0, 2), 3, "the third one bead pushes up the two above it");
  assert.equal(clickBead(3, 0, 0), 0, "the one next to the beam takes the others down with it");
  assert.equal(clickBead(3, 0, 1), 1);
  assert.equal(clickBead(8, 0, 3), 9);
  assert.equal(clickBead(1234, 2, "five"), 1734, "on the hundreds rod");
  assert.equal(clickBead(1234, 3, 0), 234);
});

test("each rod picks the rule a soroban teacher would", () => {
  assert.deepEqual(ruleFor(2, 1, 2), { rule: "direct", c: 0, e: 0 });
  assert.deepEqual(ruleFor(3, 1, 4), { rule: "five", c: 1, e: 0 }, "3 + 4: +5 − 1");
  assert.deepEqual(ruleFor(2, 1, 6), { rule: "direct", c: 0, e: 0 }, "2 + 6: the five bead and one more");
  assert.deepEqual(ruleFor(4, 1, 7), { rule: "ten", c: 3, e: 0 }, "4 + 7: −3 and carry");
  assert.deepEqual(ruleFor(5, 1, 6), { rule: "mixed", c: 4, e: 1 }, "5 + 6: +10 − 5 + 1");
  assert.deepEqual(ruleFor(9, 1, 1), { rule: "ten", c: 9, e: 0 });
  assert.deepEqual(ruleFor(7, 1, 2), { rule: "direct", c: 0, e: 0 });
  assert.deepEqual(ruleFor(6, -1, 3), { rule: "five", c: 2, e: 0 }, "6 − 3: −5 + 2");
  assert.deepEqual(ruleFor(3, -1, 6), { rule: "mixed", c: 4, e: 1 }, "3 − 6: −10 + 5 − 1");
  assert.deepEqual(ruleFor(1, -1, 7), { rule: "ten", c: 3, e: 0 }, "1 − 7: borrow, +3");
  assert.deepEqual(ruleFor(2, -1, 7), { rule: "mixed", c: 3, e: 2 }, "2 − 7: −10 + 5 − 2");
  assert.deepEqual(ruleFor(8, -1, 6), { rule: "direct", c: 0, e: 0 });
});

test("each rule's beads are really there to move", () => {
  // Straight on (or off) moves the five bead and the ones the same way; the friend of 10 does that the other way on
  // this rod; the friend of 5 and the mixed rule move the five bead one way and c or e ones the other, which the rod
  // must have to give (or room for).
  const same = (from: number, to: number, sign: number) => {
    const [a, b] = [beadsOf(from), beadsOf(to)];
    return to >= 0 && to <= 9 && sign * (Number(b.five) - Number(a.five)) >= 0 && sign * (b.ones - a.ones) >= 0;
  };
  for (let digit = 0; digit <= 9; digit++)
    for (let d = 1; d <= 9; d++)
      for (const sign of [1, -1] as const) {
        const { rule, c, e } = ruleFor(digit, sign, d);
        const { five, ones } = beadsOf(digit);
        const at = `${digit} ${sign > 0 ? "+" : "−"} ${d}`;
        if (rule === "direct") assert.ok(same(digit, digit + sign * d, sign), at);
        else if (rule === "ten") assert.ok(same(digit, digit + sign * (d - 10), -sign), at);
        else if (rule === "five") {
          assert.equal(c, 5 - d);
          assert.equal(five, sign < 0, at);
          assert.ok(sign > 0 ? ones >= c : ones + c <= 4, at);
        } else {
          assert.equal(c + e, 5);
          assert.equal(five, sign > 0, at);
          assert.ok(sign > 0 ? ones + e <= 4 : ones >= e, at);
        }
      }
});

test("the steps of a sum end on the answer, a rod at a time", () => {
  for (let a = 0; a < 300; a += 7)
    for (let n = 1; n < 300; n += 3)
      for (const sign of [1, -1] as const) {
        if (!sorobanFits(a, sign, n, 4)) continue;
        const steps = sorobanSteps(a, sign, n);
        assert.equal(steps.at(-1)?.after, a + sign * n, `${a} ${sign} ${n}`);
        let before = a;
        for (const s of steps) {
          const changed = rodDigits(before, 5).map((x, i) => x !== rodDigits(s.after, 5)[i]).filter(Boolean).length;
          assert.equal(changed, 1, "one rod moves at each step");
          assert.ok(s.after >= 0);
          before = s.after;
        }
      }
});

test("carries run on to the left, and the first rod done is the highest", () => {
  const steps = sorobanSteps(995, 1, 7);
  assert.deepEqual(steps.map((s) => [s.place, s.rule, s.carry, s.after]), [
    [0, "mixed", false, 992],
    [1, "ten", true, 902],
    [2, "ten", true, 2],
    [3, "direct", true, 1002],
  ]);
  const back = sorobanSteps(1002, -1, 7);
  assert.deepEqual(back.map((s) => [s.place, s.rule, s.carry]), [
    [0, "mixed", false],
    [1, "ten", true],
    [2, "ten", true],
    [3, "direct", true],
  ]);
  assert.equal(back.at(-1)?.after, 995);
  assert.deepEqual(sorobanSteps(123, 1, 345).map((s) => s.place), [2, 1, 0]);
  assert.deepEqual(sorobanSteps(10, 1, 101).map((s) => s.place), [2, 0], "noughts in the number move nothing");
});

test("sums that don't fit are caught, and targets fit the rods", () => {
  assert.ok(sorobanFits(990, 1, 9, 3));
  assert.ok(!sorobanFits(991, 1, 9, 3));
  assert.ok(!sorobanFits(5, -1, 6, 3));
  assert.ok(!sorobanFits(5, 1, 1.5, 3));
  const r = rng(7);
  for (let i = 0; i < 200; i++) {
    const rods = 3 + (i % 11);
    const t = sorobanTarget(rods, r);
    assert.ok(t >= 10 && t <= sorobanMax(Math.min(rods, 4)), String(t));
  }
});
