// The ladder every game on the board shares: the streak after an answer, settling a finished puzzle into the ladder
// (and nothing saved when nothing changed), when the ladder is done and how many stars it holds, the streaks worth a
// cheer, and how big each celebration is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { burst, isMilestone, isOpen, ladderDone, nextStreak, readLadder, settle, totalStars } from "../src/math/ladder.ts";

const KEYS = ["a", "b", "c"] as const;
type K = (typeof KEYS)[number];
const empty = () => readLadder<K>(null, 3, KEYS);

test("the streak: up when clean in the endless run, back to nought when not, unchanged in a puzzle or free play", () => {
  assert.equal(nextStreak("endless", 4, true), 5);
  assert.equal(nextStreak("endless", 4, false), 0);
  assert.equal(nextStreak("puzzle", 4, false), 4);
  assert.equal(nextStreak("free", 4, true), 4);
});

test("settling a finished puzzle: stars 1 to 3 and only up, in a puzzle only; the best streak in the endless run only; a notice once", () => {
  const p = empty();
  assert.equal(settle(p, { mode: "puzzle", stage: 0, streak: 0, key: null, keys: KEYS }), p);
  const one = settle(p, { mode: "puzzle", stage: 1, stars: 2, streak: 0, key: "b", keys: KEYS });
  assert.deepEqual(one, { stars: [0, 2, 0], found: ["b"], best: 0 });
  assert.equal(settle(one, { mode: "puzzle", stage: 1, stars: 1, streak: 0, key: "b", keys: KEYS }), one);
  assert.deepEqual(settle(one, { mode: "puzzle", stage: 1, stars: 3, streak: 0, key: "a", keys: KEYS }), { stars: [0, 3, 0], found: ["a", "b"], best: 0 });
  // Clamped: nothing finished is worth less than one star or more than three.
  assert.deepEqual(settle(p, { mode: "puzzle", stage: 2, stars: 0, streak: 0, key: null, keys: KEYS }).stars, [0, 0, 1]);
  assert.deepEqual(settle(p, { mode: "puzzle", stage: 2, stars: 7.5, streak: 0, key: null, keys: KEYS }).stars, [0, 0, 3]);
  // The endless run keeps the best streak and gives no stars; a puzzle's streak is not a best.
  assert.deepEqual(settle(p, { mode: "endless", stage: 0, stars: 3, streak: 6, key: null, keys: KEYS }), { stars: [0, 0, 0], found: [], best: 6 });
  assert.equal(settle(p, { mode: "puzzle", stage: 0, streak: 9, key: null, keys: KEYS }).best, 0);
  assert.equal(settle(p, { mode: "endless", stage: 0, streak: 0, key: null, keys: KEYS }), p);
});

test("a finished puzzle always opens the next, and the ladder is done once every puzzle has a star", () => {
  let p = empty();
  assert.ok(!isOpen(p, 1));
  p = settle(p, { mode: "puzzle", stage: 0, stars: 1, streak: 0, key: null, keys: KEYS });
  assert.ok(isOpen(p, 1) && !isOpen(p, 2));
  assert.ok(!ladderDone(p.stars));
  p = settle(p, { mode: "puzzle", stage: 1, stars: 3, streak: 0, key: null, keys: KEYS });
  p = settle(p, { mode: "puzzle", stage: 2, stars: 2, streak: 0, key: null, keys: KEYS });
  assert.ok(ladderDone(p.stars));
  assert.equal(totalStars(p.stars), 6);
  assert.ok(!ladderDone([]));
});

test("the streaks worth a cheer, and how big each celebration is", () => {
  assert.deepEqual([5, 10, 25, 50].map(isMilestone), [true, true, true, true]);
  assert.deepEqual([0, 1, 4, 11].map(isMilestone), [false, false, false, false]);
  assert.deepEqual(burst("stars", 1), { pieces: 0, cls: "s1" });
  assert.deepEqual(burst("stars", 2), { pieces: 12, cls: "s2" });
  assert.deepEqual(burst("stars", 3), { pieces: 24, cls: "s3" });
  assert.ok(burst("stars", 1).pieces < burst("stars", 2).pieces && burst("stars", 2).pieces < burst("stars", 3).pieces);
  assert.deepEqual(burst("streak"), { pieces: 16, cls: "streak" });
});
