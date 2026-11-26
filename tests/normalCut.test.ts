// The empirical rule by cutting a normal curve (#740): each round is right only at its own cut, a whole number of
// standard deviations from the mean, where the share read is about 68%, 95%, 99.7%, 16% or 2.5%; other cuts are named,
// the cut snaps to quarters and stands once right, and only the last round states the whole rule.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { again, CUT_ROUNDS, done, FAR, missOf, moveCut, next, NORMAL_CUT_START, share, shareSay, snap, STEP, valueAt } from "../src/math/normalCut.ts";

test("each round's cut gives the share its ask names", () => {
  assert.deepEqual(CUT_ROUNDS.map((r) => shareSay(share(r.mode, r.target))), ["68.3", "95.4", "99.7", "15.9", "2.3"]);
  assert.deepEqual(CUT_ROUNDS.map((r) => valueAt(r, r.target)), [180, 190, 200, 504, 44]);
});

test("only the round's cut is right; the rest are too few, too many or the other side", () => {
  for (const r of CUT_ROUNDS)
    for (let k = -FAR; k <= FAR; k += STEP) {
      const miss = missOf(r, k);
      if (r.mode === "both" && k <= 0) continue;
      assert.equal(miss === null, k === r.target, `${r.mode} ${k}`);
      if (miss === "side") assert.equal(k, -r.target);
    }
  assert.equal(missOf(CUT_ROUNDS[0], 0.5), "few");
  assert.equal(missOf(CUT_ROUNDS[0], 1.5), "many");
  assert.equal(missOf(CUT_ROUNDS[3], -1), "side");
  assert.equal(missOf(CUT_ROUNDS[3], 2), "few");
  assert.equal(missOf(CUT_ROUNDS[4], 2), "side");
  assert.equal(missOf(CUT_ROUNDS[4], -1), "many");
});

test("the cut snaps to quarters, a pair never closes, and a right cut stands until Next", () => {
  assert.equal(snap("both", -0.9), 1);
  assert.equal(snap("both", 0.05), STEP);
  assert.equal(snap("above", -9), -FAR);
  assert.equal(shareSay(share("both", FAR)), "99.9");
  let s = moveCut(NORMAL_CUT_START, 1.06, false);
  assert.equal(s.k, 1);
  assert.equal(done(s), false, "not right before it is let go");
  s = moveCut(s, 1.06, true);
  assert.equal(done(s), true);
  assert.equal(moveCut(s, 2, true), s);
  for (let i = 1; i < CUT_ROUNDS.length; i++) {
    s = next(s);
    assert.equal(s.round, i);
    s = moveCut(s, CUT_ROUNDS[i].target, true);
    assert.ok(done(s));
  }
  s = next(s);
  assert.equal(moveCut(s, 1, true), s);
  assert.deepEqual(again(), NORMAL_CUT_START);
});

test("the rule is stated only in the last round, in every language", () => {
  for (const loc of [en, ka, ru]) {
    const w = loc.live.normalCut;
    for (const k of ["ask0", "ask1", "ask2", "ask3", "ask4"] as const) assert.ok(!/68%.*95%|1, 2/.test(w[k]), k);
    assert.ok(/1, 2 .*3/.test(w.done4));
    for (const k of ["done0", "done1", "done2", "done3"] as const) assert.ok(!/1, 2 .*3/.test(w[k]), k);
  }
});
