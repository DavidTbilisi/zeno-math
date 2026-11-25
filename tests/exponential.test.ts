// Exponential growth: the race's overtaking day, sooner for a bigger rate; every question is right with its own answer
// and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { expAt, linearAt, overtakes } from "../src/math/exponential.ts";

const w = en.pracWords;

test("the multiplying plant overtakes, sooner the bigger its rate", () => {
  assert.equal(overtakes(30), 17);
  assert.ok(expAt(17, 30) > linearAt(17) && expAt(16, 30) <= linearAt(16));
  assert.ok(overtakes(50) < overtakes(30) && overtakes(30) < overtakes(10));
  assert.ok(overtakes(10) > 20);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("exponential", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["factorAsDifference", "growthKindSwapped", "factorTimesSteps", "ratioNotRooted", "simpleNotCompound", "decayAsGrowth", "halfLifeHours", "halvesDivided", "monthlyByDivide", "yearlyForContinuous"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("exponential", L as 1 | 2 | 3)), [10, 10, 12]);
});
