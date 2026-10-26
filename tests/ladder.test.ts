// The ladder every game on the board shares: the streak after an answer, settling an answer into the ladder (and
// nothing saved when nothing changed), the drill ladder's rules (two stars pass a puzzle, every puzzle clean opens
// the endless run, a streak of five opens the next level and then the clock, three misses offer a step back, the
// warm-up, the edge and the repair), when the ladder is done and how many stars it holds, the streaks worth a cheer,
// and how big each celebration is.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  burst,
  clockMs,
  clockOpen,
  dailyBlock,
  fallbackOf,
  isMilestone,
  isOpen,
  ladderDone,
  ladderPassed,
  levelOpen,
  nextStreak,
  paceAfter,
  passed,
  readLadder,
  settle,
  stretchOf,
  totalStars,
  type Ladder,
} from "../src/math/ladder.ts";

const KEYS = ["a", "b", "c"] as const;
type K = (typeof KEYS)[number];
const empty = () => readLadder<K>(null, 3, KEYS);
const with_ = (o: Partial<Ladder<K>>): Ladder<K> => ({ ...empty(), ...o });

test("reading a ladder back: anything odd is nought, old ladders gain the new fields", () => {
  assert.deepEqual(empty(), { stars: [0, 0, 0], found: [], best: 0, runs: [0, 0, 0], misses: [0, 0, 0], pace: [0, 0, 0] });
  const old = readLadder<K>(JSON.stringify({ stars: [3, 1, 0], found: ["c", "x"], best: 7 }), 3, KEYS);
  assert.deepEqual(old, { stars: [3, 1, 0], found: ["c"], best: 7, runs: [0, 0, 0], misses: [0, 0, 0], pace: [0, 0, 0] });
  const odd = readLadder<K>(JSON.stringify({ stars: [9, -1, "2"], runs: [5.7, -3, "x"], misses: [2, null], pace: [800, Infinity, 0] }), 3, KEYS);
  assert.deepEqual([odd.stars, odd.runs, odd.misses, odd.pace], [[0, 0, 2], [5, 0, 0], [2, 0, 0], [800, 0, 0]]);
  assert.deepEqual(readLadder<K>("{not json", 3, KEYS), empty());
  assert.deepEqual(readLadder<K>("42", 3, KEYS), empty());
});

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
  assert.deepEqual([one.stars, one.found, one.best], [[0, 2, 0], ["b"], 0]);
  assert.equal(settle(one, { mode: "puzzle", stage: 1, stars: 1, streak: 0, key: "b", keys: KEYS }), one);
  const up = settle(one, { mode: "puzzle", stage: 1, stars: 3, streak: 0, key: "a", keys: KEYS });
  assert.deepEqual([up.stars, up.found], [[0, 3, 0], ["a", "b"]]);
  // Clamped: nothing finished is worth less than one star or more than three.
  assert.deepEqual(settle(p, { mode: "puzzle", stage: 2, stars: 0, streak: 0, key: null, keys: KEYS }).stars, [0, 0, 1]);
  assert.deepEqual(settle(p, { mode: "puzzle", stage: 2, stars: 7.5, streak: 0, key: null, keys: KEYS }).stars, [0, 0, 3]);
  // The endless run keeps the best streak and gives no stars; a puzzle's streak is not a best.
  const run = settle(p, { mode: "endless", stage: 0, stars: 3, streak: 6, key: null, keys: KEYS });
  assert.deepEqual([run.stars, run.best], [[0, 0, 0], 6]);
  assert.equal(settle(p, { mode: "puzzle", stage: 0, streak: 9, key: null, keys: KEYS }).best, 0);
  assert.equal(settle(p, { mode: "endless", stage: 0, streak: 0, key: null, keys: KEYS }), p);
});

test("settling also keeps each level's best streak, a clean time into the level's pace, and the misses on each puzzle", () => {
  let p = settle(empty(), { mode: "endless", stage: 0, level: 2, streak: 4, ms: 2000, key: null, keys: KEYS });
  assert.deepEqual([p.runs, p.pace, p.best], [[0, 4, 0], [0, 2000, 0], 4]);
  p = settle(p, { mode: "endless", stage: 0, level: 2, streak: 3, ms: 1000, key: null, keys: KEYS });
  assert.deepEqual([p.runs, p.pace], [[0, 4, 0], [0, 1700, 0]]);
  p = settle(p, { mode: "puzzle", stage: 1, streak: 0, missed: true, key: null, keys: KEYS });
  p = settle(p, { mode: "puzzle", stage: 1, streak: 0, missed: true, key: null, keys: KEYS });
  assert.deepEqual(p.misses, [0, 2, 0]);
  // A miss in the endless run is not a puzzle's.
  assert.deepEqual(settle(p, { mode: "endless", stage: 1, level: 1, streak: 0, missed: true, key: null, keys: KEYS }).misses, [0, 2, 0]);
});

test("the pass rule: two stars pass a puzzle and open the next; one played already stays open", () => {
  let p = empty();
  assert.ok(isOpen(p, 0) && !isOpen(p, 1));
  p = settle(p, { mode: "puzzle", stage: 0, stars: 1, streak: 0, key: null, keys: KEYS });
  assert.ok(!passed(p.stars, 0) && !isOpen(p, 1));
  assert.ok(ladderDone([1, 1, 1]) && !ladderPassed([1, 1, 1]));
  p = settle(p, { mode: "puzzle", stage: 0, stars: 2, streak: 0, key: null, keys: KEYS });
  assert.ok(passed(p.stars, 0) && isOpen(p, 1) && !isOpen(p, 2));
  // Stars won before the rule keep their puzzle open even when the one before has only one.
  assert.ok(isOpen({ stars: [3, 1, 2] }, 2));
  p = settle(p, { mode: "puzzle", stage: 1, stars: 3, streak: 0, key: null, keys: KEYS });
  p = settle(p, { mode: "puzzle", stage: 2, stars: 2, streak: 0, key: null, keys: KEYS });
  assert.ok(ladderPassed(p.stars) && ladderDone(p.stars));
  assert.equal(totalStars(p.stars), 7);
  assert.ok(!ladderDone([]) && !ladderPassed([]));
});

test("the endless run opens once every puzzle is clean, a level at a time by a streak of five, and then the clock", () => {
  assert.ok(!levelOpen(with_({ stars: [3, 3, 1] }), 1));
  assert.ok(levelOpen(with_({ stars: [3, 3, 2] }), 1));
  // A player who ran it before the rule keeps the first level.
  assert.ok(levelOpen(with_({ best: 3 }), 1));
  assert.ok(!levelOpen(with_({ runs: [4, 0, 0] }), 2));
  assert.ok(levelOpen(with_({ runs: [5, 0, 0] }), 2) && !levelOpen(with_({ runs: [5, 0, 0] }), 3));
  assert.ok(levelOpen(with_({ runs: [0, 1, 0] }), 2));
  assert.ok(!clockOpen(with_({ runs: [9, 9, 4] })) && clockOpen(with_({ runs: [0, 0, 5] })));
});

test("the clock's pace: a running average of clean times, beaten by a fifth more and never under a second and a half", () => {
  assert.equal(paceAfter(0, 3000), 3000);
  assert.equal(paceAfter(3000, 2000), 2700);
  assert.equal(clockMs(0), 0);
  assert.equal(clockMs(5000), 6000);
  assert.equal(clockMs(500), 1500);
});

test("the edge: the first puzzle not clean, then each level without a streak of five, then the clock; none without an endless run", () => {
  assert.deepEqual(stretchOf(with_({ stars: [3, 1, 0] }), true), { mode: "puzzle", stage: 1 });
  assert.deepEqual(stretchOf(with_({ stars: [3, 2, 2] }), true), { mode: "endless", level: 1, timed: false });
  assert.deepEqual(stretchOf(with_({ stars: [3, 2, 2], runs: [5, 2, 0] }), true), { mode: "endless", level: 2, timed: false });
  assert.deepEqual(stretchOf(with_({ stars: [3, 2, 2], runs: [5, 6, 5] }), true), { mode: "endless", level: 3, timed: true });
  assert.equal(stretchOf(with_({ stars: [3, 2, 2] }), false), null);
});

test("the daily block: warm up on the furthest puzzle at three stars, repair the one missed most, neither on the edge", () => {
  assert.deepEqual(dailyBlock(empty(), true), { anchor: null, stretch: { mode: "puzzle", stage: 0 }, repair: null });
  const p = with_({ stars: [3, 2, 3], misses: [0, 1, 4] });
  assert.deepEqual(dailyBlock(p, true), { anchor: 2, stretch: { mode: "endless", level: 1, timed: false }, repair: 1 });
  // The puzzle at the edge is neither the warm-up nor the repair, and a puzzle at three stars needs no repair.
  const q = with_({ stars: [2, 1, 0], misses: [1, 5, 0] });
  assert.deepEqual(dailyBlock(q, false), { anchor: null, stretch: { mode: "puzzle", stage: 1 }, repair: 0 });
  assert.equal(dailyBlock(with_({ stars: [3, 3, 3], misses: [4, 4, 4] }), false).repair, null);
});

test("the fallback: three misses step back a puzzle, off the clock, down a level, or from the first level to the repair", () => {
  const p = with_({ stars: [2, 3, 2], misses: [0, 0, 2] });
  const at = (o: Partial<Parameters<typeof fallbackOf>[1]>) => fallbackOf(p, { mode: "puzzle", stage: 0, slips: 3, hasFree: false, ...o });
  assert.equal(at({ stage: 2, slips: 2 }), null);
  assert.deepEqual(at({ stage: 2 }), { mode: "puzzle", stage: 1 });
  assert.equal(at({ stage: 0 }), null);
  assert.deepEqual(at({ stage: 0, hasFree: true }), { mode: "free" });
  assert.equal(at({ mode: "free" }), null);
  assert.deepEqual(at({ mode: "endless", level: 3, timed: true }), { mode: "endless", level: 3, timed: false });
  assert.deepEqual(at({ mode: "endless", level: 2 }), { mode: "endless", level: 1, timed: false });
  assert.deepEqual(at({ mode: "endless", level: 1 }), { mode: "puzzle", stage: 2 });
  assert.deepEqual(fallbackOf(with_({ stars: [3, 3, 3] }), { mode: "endless", stage: 0, level: 1, slips: 4, hasFree: false }), { mode: "puzzle", stage: 2 });
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
