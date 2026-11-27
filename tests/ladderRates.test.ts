// The sliding ladder (#747): each round's target is where the top falls at the asked speed, x/y times the foot's; a
// foot short of it is "slow" and past it "fast"; the foot snaps to the round's step and stays off the wall and floor's
// end; a round is done only once let go on the target; Next walks the rounds and the last hides the speed.
import assert from "node:assert/strict";
import test from "node:test";
import { again, done, heightAt, LADDER_RATES_START, LADDER_ROUNDS, missOf, moveFoot, next, roundOf, topSpeed } from "../src/math/ladderRates.ts";

test("every target is where the top falls at the asked speed, and the misses point the right way", () => {
  for (const r of LADDER_ROUNDS) {
    assert.ok(Math.abs(topSpeed(r, r.target) - r.top[0] / r.top[1]) < 1e-9, String(r.target));
    assert.ok(Number.isInteger(heightAt(r, r.target)));
    assert.equal(missOf(r, r.target), null);
    assert.equal(missOf(r, r.target - r.step), "slow");
    assert.equal(missOf(r, r.target + r.step), "fast");
  }
  assert.ok(LADDER_ROUNDS.some((r) => !r.showSpeed), "the speed is hidden at the end");
});

test("the foot snaps, stays on the floor, and the round is done once let go on the target", () => {
  let s = LADDER_RATES_START;
  const r = roundOf(s)!;
  assert.notEqual(s.x, r.target);
  s = moveFoot(s, 100, false);
  assert.equal(s.x, r.L - r.step);
  s = moveFoot(s, -3, false);
  assert.equal(s.x, r.step);
  s = moveFoot(s, r.target + 0.07, false);
  assert.equal(s.x, r.target);
  assert.ok(!done(s), "not done while still held");
  s = moveFoot(s, r.target, true);
  assert.ok(done(s));
  assert.deepEqual(moveFoot(s, 1, true), s, "nothing moves once done");
  for (let i = 0; i < LADDER_ROUNDS.length; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.deepEqual(again(), LADDER_RATES_START);
});
