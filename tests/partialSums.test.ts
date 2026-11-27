// The partial-sums piece (#751): each round's target is a/(1 − r) on the line's grid; a line below it is passed by a
// partial sum (the first that does is named) and one above it is never reached; the line snaps and stays on the chart;
// a round is done only once let go on the target; Next walks the rounds and the last ones show three bars.
import assert from "node:assert/strict";
import test from "node:test";
import { again, BARS, done, limitOf, missOf, moveLine, next, partial, PARTIAL_SUMS_START, roundOf, seriesText, SUMS_ROUNDS, targetOf, valueOf } from "../src/math/partialSums.ts";

test("every target is the series' sum, the partial sums close in on it, and the misses point the right way", () => {
  for (const r of SUMS_ROUNDS) {
    const t = targetOf(r);
    assert.ok(Math.abs(valueOf(r, t) - limitOf(r)) < 1e-9, String(limitOf(r)));
    assert.ok(Math.abs(partial(r, 60) - limitOf(r)) < 1e-6);
    assert.ok(valueOf(r, t) < r.top);
    assert.equal(missOf(r, t), null);
    assert.equal(missOf(r, t + 1)?.kind, "high");
    const low = missOf(r, t - 1);
    assert.ok(low?.kind === "low" && partial(r, low.n) > valueOf(r, t - 1) && (low.n === 1 || partial(r, low.n - 1) <= valueOf(r, t - 1) + 1e-9));
  }
  assert.deepEqual(SUMS_ROUNDS.map((r) => r.shown < BARS), [false, false, false, true, true], "the bars are hidden at the end");
  assert.deepEqual(SUMS_ROUNDS.map(seriesText), ["1/2 + 1/4 + 1/8 + …", "1 + 2/3 + 4/9 + …", "1 − 1/2 + 1/4 + …", "3 + 3/4 + 3/16 + …", "5 + 5/6 + 5/36 + …"]);
});

test("the line snaps, stays on the chart, and the round is done once let go on the target", () => {
  let s = PARTIAL_SUMS_START;
  const r = roundOf(s)!;
  assert.notEqual(s.at, targetOf(r));
  s = moveLine(s, 100, false);
  assert.equal(valueOf(r, s.at), r.top);
  s = moveLine(s, -3, false);
  assert.equal(s.at, 0);
  s = moveLine(s, limitOf(r) + 0.01, false);
  assert.equal(s.at, targetOf(r));
  assert.ok(!done(s), "not done while still held");
  s = moveLine(s, limitOf(r), true);
  assert.ok(done(s));
  assert.deepEqual(moveLine(s, 0.2, true), s, "nothing moves once done");
  for (let i = 0; i < SUMS_ROUNDS.length; i++) {
    s = next(s);
    const now = roundOf(s);
    if (now) assert.notEqual(s.at, targetOf(now), "each round starts away from its target");
  }
  assert.equal(roundOf(s), null);
  assert.deepEqual(again(), PARTIAL_SUMS_START);
});
