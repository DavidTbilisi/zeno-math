// Polynomial graphs: the ends by the degree and the leading sign, the powers going round; every question is right with
// its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { endsOf, nextPower, POLY_START, polyAt, polyText } from "../src/math/polyGraph.ts";

const w = en.pracWords;

test("the ends follow the degree and the leading sign; a tap raises a power and goes round", () => {
  assert.deepEqual(endsOf(3, 1), [-1, 1]);
  assert.deepEqual(endsOf(4, -1), [-1, -1]);
  assert.deepEqual(endsOf(5, -1), [1, -1]);
  assert.deepEqual(nextPower(POLY_START, 1).m, [1, 3, 1]);
  assert.deepEqual(nextPower(nextPower(POLY_START, 1), 1).m, [1, 1, 1]);
  assert.equal(polyText([-3, 0, 2], [1, 2, 3], -1), "y = −(x + 3)x²(x − 2)³");
  // A squared zero keeps the sign on both sides.
  assert.equal(Math.sign(polyAt([0], [2], 1, -0.1)), Math.sign(polyAt([0], [2], 1, 0.1)));
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("polyGraph", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["zeroSignKept", "endsByLeadingOnly", "endsByDegreeOnly", "touchAsCross", "crossAsTouch", "multiplicityDropped", "signBetweenWrong", "turningPointsDegree", "positiveNotReal", "widthLimitMissed"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("polyGraph", L as 1 | 2 | 3)), [10, 10, 12]);
});
