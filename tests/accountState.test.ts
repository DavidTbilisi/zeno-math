// What follows an account between devices, and how two copies of a key become one (src/model/accountState.ts, #607).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVED_KEY, FACTS_KEY, follows, GOAL_KEY, hashOf, isWork, mergeState, PRACTICE_KEY, PREDICTIONS_KEY, TODAY_KEY } from "../src/model/accountState.ts";
import { GAME_KEYS } from "../src/model/gameKeys.ts";

const j = JSON.stringify;
const merged = (key: string, kept: unknown, sent: unknown) => JSON.parse(mergeState(key, j(kept), j(sent)));

test("progress follows the account; who is signed in, what waits to be sent and this device's settings stay", () => {
  for (const key of [PRACTICE_KEY, ACHIEVED_KEY, PREDICTIONS_KEY, TODAY_KEY, GOAL_KEY, "zeno.whichword.v1", "zeno.descentlab.v1", ...Object.values(GAME_KEYS)])
    assert.equal(follows(key), true, key);
  for (const key of [
    "zeno.account.v1", "zeno.student.v1", "zeno.outbox.v1", "zeno.testbox.v1", "zeno.synced.v1", "zeno.classIdeas.v1", "zeno.sound.v1", "zeno.feel.v1", "zeno.session.v1",
    "zeno.scratch.v1", "zeno.seen.v1", "zeno.scratch.dots.v1", "zeno.teacher", "zeno.classGames", "zeno.classGoal", "zeno.boardSort", "zeno.library", "zeno.site.boards", "lang", "zeno..v1",
    "other.practice.v1", "zeno.practice.v1 ", "",
  ])
    assert.equal(follows(key), false, key);
  // The goal and today's plan follow, but neither says someone has practised here.
  assert.equal(isWork(PRACTICE_KEY), true);
  assert.equal(isWork("zeno.kakooma.v1"), true);
  assert.equal(isWork(GOAL_KEY), false);
  assert.equal(isWork(TODAY_KEY), false);
  assert.equal(isWork("zeno.sound.v1"), false);
});

test("a value's fingerprint changes when the value does", () => {
  assert.equal(hashOf("abc"), hashOf("abc"));
  assert.notEqual(hashOf("abc"), hashOf("abd"));
  assert.notEqual(hashOf("ab"), hashOf("abc"));
  assert.match(hashOf(""), /^0:[0-9a-z]+$/);
});

test("a ladder keeps the best of both devices", () => {
  const phone = { stars: [3, 0, 2, 0], found: ["a"], best: 4, runs: [4, 0, 0], misses: [0, 2, 0, 0], pace: [900, 0, 0] };
  const laptop = { stars: [1, 2, 0, 0], found: ["b", "a"], best: 7, runs: [2, 7, 0], misses: [1, 0, 0, 3], pace: [0, 1200, 0] };
  assert.deepEqual(merged("zeno.kakooma.v1", phone, laptop), {
    stars: [3, 2, 2, 0], found: ["b", "a"], best: 7, runs: [4, 7, 0], misses: [1, 2, 0, 3], pace: [900, 1200, 0],
  });
  // Whichever way round they meet, the stars are the same.
  assert.deepEqual(merged("zeno.kakooma.v1", laptop, phone).stars, [3, 2, 2, 0]);
  // A ladder grown by a puzzle since the other copy was made, and counts that aren't numbers.
  assert.deepEqual(merged("zeno.x.v1", { stars: [2] }, { stars: [1, 3, "x"], pace: [null, 5] }), { stars: [2, 3, 0], pace: [0, 5], found: [], best: 0, runs: [], misses: [] });
  // A copy that adds nothing leaves the one sent exactly as it was sent.
  const sent = j({ stars: [3, 3], found: ["a"], best: 2, runs: [1, 0, 0], misses: [0, 0], pace: [5, 0, 0] });
  assert.equal(mergeState("zeno.x.v1", j({ stars: [1, 3], found: [], best: 1, runs: [0, 0, 0], misses: [0, 0], pace: [0, 0, 0] }), sent), sent);
});

test("the book of number facts keeps every fact of both devices, and of a fact on both the copy asked more often", () => {
  const phone = { "6×7": { n: 5, run: 4, quick: 3, ms: 1400 }, "8+5": { n: 1, run: 0, quick: 0, ms: 0 } };
  const laptop = { "6×7": { n: 2, run: 0, quick: 0, ms: 3000 }, "9−4": { n: 3, run: 3, quick: 1, ms: 2500 }, "8+5": "broken" };
  assert.deepEqual(merged(FACTS_KEY, phone, laptop), { "6×7": phone["6×7"], "9−4": laptop["9−4"], "8+5": "broken" });
  assert.deepEqual(merged(FACTS_KEY, laptop, phone), { "6×7": phone["6×7"], "9−4": laptop["9−4"], "8+5": phone["8+5"] });
  assert.ok(follows(FACTS_KEY));
});

test("achieved dates keep the earliest, first guesses the first", () => {
  assert.deepEqual(merged(ACHIEVED_KEY, { "cell:add.1": 100, "read:fractions": 500, odd: "x" }, { "cell:add.1": 300, "ladder:zeno.kakooma.v1": 200, odd: 7 }), {
    "cell:add.1": 100, "read:fractions": 500, "ladder:zeno.kakooma.v1": 200, odd: 7,
  });
  const early = { pick: "up", right: true, at: 10 }, late = { pick: "down", right: false, at: 20 };
  assert.deepEqual(merged(PREDICTIONS_KEY, { geoLab: early, slopeWalk: late }, { geoLab: late, fractionWall: early }), { geoLab: early, slopeWalk: late, fractionWall: early });
  assert.deepEqual(merged(PREDICTIONS_KEY, { geoLab: late }, { geoLab: early }), { geoLab: early });
  assert.deepEqual(merged(PREDICTIONS_KEY, { geoLab: "broken" }, { geoLab: late }), { geoLab: late });
});

test("free practice is the copy that has answered more; today's session the later day's, or the further along", () => {
  const far = j({ stats: {}, mistakes: [], answered: 40 }), near = j({ stats: {}, mistakes: [], answered: 12 });
  assert.equal(mergeState(PRACTICE_KEY, far, near), far);
  assert.equal(mergeState(PRACTICE_KEY, near, far), far);
  const same = j({ stats: { add: { seen: 1, right: 1 } }, mistakes: [], answered: 40 });
  assert.equal(mergeState(PRACTICE_KEY, far, same), same, "a tie goes to the copy sent");

  const monday = j({ day: "2026-11-23", parts: [1, 2], done: [0, 1] }), tuesday = j({ day: "2026-11-24", parts: [1], done: [] });
  assert.equal(mergeState(TODAY_KEY, monday, tuesday), tuesday);
  assert.equal(mergeState(TODAY_KEY, tuesday, monday), tuesday);
  const further = j({ day: "2026-11-24", parts: [1], done: [0] });
  assert.equal(mergeState(TODAY_KEY, further, tuesday), further);
  assert.equal(mergeState(TODAY_KEY, tuesday, further), further);
  assert.equal(mergeState(TODAY_KEY, j({ parts: [] }), tuesday), tuesday, "a copy with no day gives way");
});

test("anything else is the copy sent", () => {
  assert.equal(mergeState(GOAL_KEY, "exam", "finance"), "finance");
  assert.equal(mergeState("zeno.unknown.v1", j({ a: 1 }), j({ b: 2 })), j({ b: 2 }));
  assert.equal(mergeState("zeno.kakooma.v1", "not json", j({ stars: [1] })), j({ stars: [1] }));
  assert.equal(mergeState("zeno.kakooma.v1", j({ stars: [3] }), "[1,2]"), "[1,2]");
  assert.equal(mergeState("zeno.kakooma.v1", j({ stars: [3] }), j({ stars: [3] })), j({ stars: [3] }));
  assert.equal(mergeState(ACHIEVED_KEY, "null", j({ a: 1 })), j({ a: 1 }));
});
