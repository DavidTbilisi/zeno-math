// A fair price as a balance (#739): each round is fair only at its whole expected value, which differs from the likeliest
// prize, the different prizes' average and the point halfway after the first round; taps are named, kept on the line,
// stand once fair, and the rule is said only in the last round.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, distinct, expected, fair, FAIR_GAME_START, FAIR_LADDER, type LiveFairGame, likeliest, missOf, next, tally, tap, torque } from "../src/math/fairGame.ts";

test("each round is fair at its whole expected value only, where the tally's winnings equal the pay", () => {
  assert.deepEqual(FAIR_LADDER.map(expected), [2, 2, 2, 3, 3]);
  FAIR_LADDER.forEach((xs, i) => {
    const e = expected(xs);
    for (let f = 0; f <= 12; f++) {
      assert.equal(torque(xs, f) === 0, f === e, `${xs} at ${f}`);
      const t = tally(xs, f);
      assert.equal(t.win === t.pay, f === e);
    }
    if (i) {
      const ds = distinct(xs);
      assert.notEqual(likeliest(xs), e);
      assert.notEqual(expected(ds), e);
      assert.notEqual((ds[0] + ds[ds.length - 1]) / 2, e);
    }
  });
  const r = FAIR_LADDER[3];
  assert.deepEqual([missOf(r, 0), missOf(r, 6), missOf(r, 1), missOf(r, 9), missOf(r, 3)], ["likely", "avg", "player", "stall", null]);
  assert.equal(missOf(FAIR_LADDER[2], 3), "mid");
});

test("a tap sets the price on the line; a fair price stands until Next", () => {
  let s: LiveFairGame = tap(FAIR_GAME_START, 4);
  assert.equal(s.at, 4);
  assert.equal(fair(s), false);
  assert.equal(tap(s, 40).at, 12);
  s = tap(s, 2);
  assert.equal(fair(s), true);
  assert.equal(tap(s, 5), s);
  for (let i = 0; i < 9; i++) s = next(s);
  assert.equal(s.round, FAIR_LADDER.length);
  assert.equal(tap(s, 3), s);
  assert.deepEqual(again(), FAIR_GAME_START);
});

test("the rule is said only after the learner has balanced every round but the last", () => {
  const w = en.live.fairGame;
  for (const t of [w.ask, w.askDone, w.rule0, w.rule1, w.miss_likely, w.miss_avg, w.miss_mid, w.miss_player, w.miss_stall, w.hint]) assert.doesNotMatch(t, /expected value|×/i, t);
  assert.match(w.rule4, /expected value, each prize times its chance/);
});
