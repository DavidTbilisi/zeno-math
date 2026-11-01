// Spaced review: a key mastered comes back a day later, then after 3, 7 and every 21 days while the reviews are right;
// practice before a review is due moves nothing; a missed review opens the key again until it is relearnt, then it
// starts over from a day. The next review mixes skills and asks the longest due first. A key is mastered, then kept only
// through a right delayed review; a wrong one sends it back (issue #264).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, holdOf, holds, INTERVAL_DAYS, isDue, learnSpacing, nextReview, openAgain, type Spacing } from "../src/model/spacing.ts";

const T = Date.UTC(2026, 10, 1, 9);

test("a mastered key comes back after 1, 3, 7 and then every 21 days while its reviews are right", () => {
  const s: Spacing = {};
  learnSpacing(s, "linear", true, false, T);
  assert.deepEqual(s, {}, "nothing is scheduled before mastery");
  learnSpacing(s, "linear", true, true, T);
  assert.deepEqual(s.linear, { step: 0, due: T + DAY });
  assert.ok(!isDue(s.linear, T + DAY - 1) && isDue(s.linear, T + DAY));
  // Practice before the review is due, right or wrong, moves nothing.
  learnSpacing(s, "linear", false, false, T + DAY / 2);
  assert.deepEqual(s.linear, { step: 0, due: T + DAY });
  let at = T;
  const gaps: number[] = [];
  for (let i = 0; i < 6; i++) {
    const due = s.linear.due;
    gaps.push((due - at) / DAY);
    at = due + 1000;
    learnSpacing(s, "linear", true, true, at);
  }
  assert.deepEqual(gaps, [1, 3, 7, 21, 21, 21]);
  assert.deepEqual(INTERVAL_DAYS, [1, 3, 7, 21]);
});

test("a missed review opens the key again until it is mastered and answered right, then starts over from a day", () => {
  const s: Spacing = { fractions: { step: 2, due: T } };
  learnSpacing(s, "fractions", false, true, T + 5);
  assert.deepEqual(s.fractions, { step: 0, due: T + 5 + DAY, again: true });
  assert.deepEqual(openAgain(s), ["fractions"]);
  assert.ok(!isDue(s.fractions, T + 10 * DAY), "a key open again is practised, not reviewed");
  // Right but not yet mastered again, or mastered but wrong: still open.
  learnSpacing(s, "fractions", true, false, T + 6);
  learnSpacing(s, "fractions", false, true, T + 7);
  assert.equal(s.fractions.again, true);
  learnSpacing(s, "fractions", true, true, T + 8);
  assert.deepEqual(s.fractions, { step: 0, due: T + 8 + DAY });
  assert.deepEqual(openAgain(s), []);
});

test("the next review: the longest due that fits, on another skill than the last when one is due", () => {
  const s: Spacing = {
    "linear.2": { step: 0, due: T - 3 * DAY },
    "linear.3": { step: 1, due: T - 2 * DAY },
    "circles.1": { step: 0, due: T - DAY },
    "volume.1": { step: 0, due: T + DAY },
    "angles.1": { step: 0, due: T - 9 * DAY, again: true },
  };
  const skillOf = (k: string) => k.split(".")[0];
  const all = () => true;
  assert.equal(nextReview(s, T, all, skillOf), "linear.2");
  assert.equal(nextReview(s, T, all, skillOf, "linear"), "circles.1", "reviews mix skills");
  assert.equal(nextReview(s, T, (k) => k.startsWith("linear"), skillOf, "linear"), "linear.2", "the same skill when nothing else is due");
  assert.equal(nextReview(s, T, (k) => k.startsWith("volume"), skillOf), null, "not due yet");
  assert.equal(nextReview(s, T, (k) => k.startsWith("angles"), skillOf), null, "open again, not due");
  // Two due at once are taken in a fixed order.
  assert.equal(nextReview({ b: { step: 0, due: T }, a: { step: 0, due: T } }, T, all, (k) => k), "a");
  assert.equal(nextReview({ a: { step: 0, due: T }, b: { step: 0, due: T } }, T, all, (k) => k), "a");
});

test("mastered, then kept only through a right review days later; a wrong review sends it back to be mastered and kept anew", () => {
  const s: Spacing = {};
  const hold = () => holdOf(s.fractions);
  learnSpacing(s, "fractions", true, false, T);
  assert.equal(hold(), null, "not mastered yet");
  learnSpacing(s, "fractions", true, true, T);
  assert.equal(hold(), "mastered");
  learnSpacing(s, "fractions", true, true, T + DAY / 2);
  assert.equal(hold(), "mastered", "right again the same day: not a delayed review");
  learnSpacing(s, "fractions", true, true, T + DAY);
  assert.equal(hold(), "kept", "right on its review a day later");
  learnSpacing(s, "fractions", false, true, s.fractions.due);
  assert.equal(hold(), "again", "wrong on a later review: back to practise");
  learnSpacing(s, "fractions", true, true, s.fractions.due);
  assert.equal(hold(), "mastered", "mastered anew");
  learnSpacing(s, "fractions", false, true, s.fractions.due);
  assert.equal(hold(), "again", "and wrong on its first review: back again, never kept on the way");
  learnSpacing(s, "fractions", true, true, T + 40 * DAY);
  learnSpacing(s, "fractions", true, true, s.fractions.due);
  assert.equal(hold(), "kept");
  const all: Spacing = { a: { step: 0, due: T }, b: { step: 2, due: T }, c: { step: 0, due: T, again: true }, d: { step: 1, due: T } };
  assert.deepEqual(holds(all), { mastered: ["a"], kept: ["b", "d"], again: ["c"] });
  assert.deepEqual(holds(all, ["d", "x", "a"]), { mastered: ["a"], kept: ["d"], again: [] }, "the keys asked for, in their order");
});
