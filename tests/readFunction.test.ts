// Reading a function: the piece's curve and its flat chords; every question is right with its own answer and wrong
// with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { rateOf, SECANT_START, secantF } from "../src/math/readFunction.ts";

const w = en.pracWords;

test("the curve rises, falls and rises, and chords between equal heights are flat", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(secantF), [2, 4.5, 4, 2, 0, -0.5, 2, 9]);
  assert.equal(rateOf(SECANT_START), -0.5);
  assert.equal(rateOf({ a: 0, b: 3 }), 0);
  assert.equal(rateOf({ a: 6, b: 0 }), 0);
  assert.equal(rateOf({ a: 2, b: 2 }), null);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("readFunction", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["sameOutputNotFunction", "oneToManyFunction", "readXForY", "domainRangeSwapped", "rangeFromEnds", "interceptsSwapped", "positiveVsIncreasing",
    "rateNotDivided", "rateUpsideDown", "linearByIncreasing", "xGapsIgnored", "startForRate"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("readFunction", L as 1 | 2 | 3)), [8, 8, 10]);
});
