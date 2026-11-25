// Spread: the quartiles leave the median out of both halves (3, 4, 4, 6, 7, 8, 9, 11, 12, 12, 15 has Q1 4, median 8,
// Q3 12); the piece's taps find the cuts and count the cards on each side of a miss; every question is right with its
// own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { BOX_SETS, BOX_START, cutsOf, fiveNumbers, meanAbsDev, sides, tapAt, valueAt } from "../src/math/spread.ts";

const w = en.pracWords;

test("the quartiles split each half; the mean absolute deviation is the mean distance from the mean", () => {
  assert.deepEqual(fiveNumbers([15, 3, 4, 4, 6, 7, 8, 9, 11, 12, 12]), { min: 3, q1: 4, med: 8, q3: 12, max: 15 });
  assert.deepEqual(fiveNumbers([10, 12, 13, 15, 16, 18, 20, 21, 25, 30]), { min: 10, q1: 13, med: 17, q3: 21, max: 30 });
  assert.deepEqual(fiveNumbers([1, 2, 2, 3, 4, 5, 5, 6, 7, 8, 9, 20]), { min: 1, q1: 2.5, med: 5, q3: 7.5, max: 20 });
  assert.equal(meanAbsDev([2, 4, 6, 8]), 2);
});

test("the piece: a miss counts the cards each side; the right taps give the median and the quartiles", () => {
  // Eleven cards: the median is card 6 (position 10), Q1 card 3, Q3 card 9.
  assert.deepEqual(cutsOf(11), { med: 10, q1: 4, q3: 16 });
  assert.deepEqual(sides(6, 0, 10), { left: 3, right: 7 });
  assert.deepEqual(sides(7, 0, 10), { left: 4, right: 7 });
  let s = tapAt(BOX_START, 6);
  assert.equal(s.miss, 6);
  assert.equal(s.med, null);
  for (const p of [10, 4, 16]) s = tapAt(s, p);
  assert.deepEqual([s.med, s.q1, s.q3, s.miss], [10, 4, 16, null]);
  assert.deepEqual([s.q1, s.med, s.q3].map((p) => valueAt(BOX_SETS[0], p!)), [4, 8, 12]);
  // Every row's taps agree with the five-number summary.
  BOX_SETS.forEach((vs) => {
    const c = cutsOf(vs.length);
    const f = fiveNumbers(vs);
    assert.deepEqual([c.q1, c.med, c.q3].map((p) => valueAt(vs, p)), [f.q1, f.med, f.q3]);
  });
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("spread", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["dotIncludesEqual", "modeAsCount", "histOneBar", "medianUnsorted", "iqrAsRange", "quartileWithMedian", "madSigned", "madNotDivided", "fenceFromMedian", "meanChangeWhole", "medianMoves", "spreadByRange"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("spread", L as 1 | 2 | 3)), [7, 8, 10]);
});
