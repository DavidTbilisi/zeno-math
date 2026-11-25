// t tests and two samples: the t cut is beyond 1.96 and closes in on it, 1.96 under-covers on a small sample; every
// question of both skills is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { mean, sd, tPdf, tStar, zCover } from "../src/math/tTails.ts";

const w = en.pracWords;

test("t against the normal: fatter tails, a wider cut, and 1.96 catching less than 95 %", () => {
  assert.equal(tStar(4), 2.776);
  assert.equal(tStar(29), 2.045);
  assert.ok(tStar(3) > tStar(10) && tStar(10) > tStar(59) && tStar(59) > 1.96);
  assert.ok(zCover(3) < 0.9 && zCover(59) > 0.94);
  assert.ok(tPdf(3, 3) > Math.exp(-4.5) / Math.sqrt(2 * Math.PI));
  assert.equal(mean([1, 2, 3, 6]), 3);
  assert.ok(Math.abs(sd([1, 2, 3, 6]) - Math.sqrt(14 / 3)) < 1e-12);
});

for (const [skill, ids, grades] of [
  ["tTests", ["propSeFromPhat", "conditionsOneSide", "seDividedByN", "marginWithZ", "dfIsN", "pairedAsIndependent"], [12, 12, 13]],
  ["twoSample", ["errorTypesSwapped", "powerSmallerAlpha", "seAdded", "slopeDfOne", "pairedAsTwoSample", "twoSampleAsPaired"], [12, 13, 13]],
] as const)
  test(`${skill}: every question is right with its own answer, and every slip is wrong with its hint`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 150; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
          assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
        }
      }
    for (const id of ids) assert.ok(seen.has(id), id);
    assert.deepEqual([1, 2, 3].map((L) => gradeOf(skill, L as 1 | 2 | 3)), grades);
  });
