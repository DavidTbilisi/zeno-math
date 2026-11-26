// The mean as the balance point (#736): each round balances only at its mean, which differs from the middle dot and
// from halfway between the ends past the first round; taps are named, kept on the line, and stand once level.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, balanced, MEAN_BALANCE_START, MEAN_LADDER, meanOf, medianOf, missOf, next, pulls, sumSay, tap, torque } from "../src/math/meanBalance.ts";

test("each round balances at its whole mean only, away from the median and the middle of the ends after the first", () => {
  assert.deepEqual(MEAN_LADDER.map(meanOf), [5, 4, 4, 5, 5]);
  MEAN_LADDER.forEach((vs, i) => {
    const m = meanOf(vs);
    for (let f = 0; f <= 10; f++) assert.equal(torque(vs, f) === 0, f === m, `${vs} at ${f}`);
    const p = pulls(vs, m);
    assert.equal(p.l, p.r);
    if (i) {
      assert.notEqual(medianOf(vs), m);
      assert.notEqual((Math.min(...vs) + Math.max(...vs)) / 2, m);
    }
  });
  assert.deepEqual([missOf(MEAN_LADDER[1], 2), missOf(MEAN_LADDER[1], 5), missOf(MEAN_LADDER[1], 3), missOf(MEAN_LADDER[1], 8), missOf(MEAN_LADDER[1], 4)], ["median", "mid", "right", "left", null]);
  assert.deepEqual([sumSay([3, 2]), sumSay([5]), sumSay([])], ["3 + 2 = 5", "5", "0"]);
});

test("a tap sets the balance point on the line; a level beam stands until Next", () => {
  let s = tap(MEAN_BALANCE_START, 7);
  assert.equal(s.at, 7);
  assert.equal(balanced(s), false);
  assert.equal(tap(s, 40).at, 10);
  s = tap(s, 5);
  assert.equal(balanced(s), true);
  assert.equal(tap(s, 2), s);
  s = next(s);
  assert.deepEqual(s, { round: 1, at: null });
  let end = s;
  for (let i = 0; i < 5; i++) end = next(end);
  assert.equal(end.round, MEAN_LADDER.length);
  assert.equal(tap(end, 3), end);
  assert.deepEqual(again(), MEAN_BALANCE_START);
});

test("the words: a rule for every round, every miss named", () => {
  const w = en.live.meanBalance;
  MEAN_LADDER.forEach((_, i) => assert.ok(w[`rule${i}` as "rule0"]));
  for (const k of ["median", "mid", "left", "right"]) assert.match(w[`miss_${k}` as "miss_left"], /\{l\}/);
});
