// Samples: a full sample of ten adds its estimate, a tap after it starts a new one, random draws are ten different
// fish; every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { drawRandom, estimate, FISH, SAMPLE_START, tapFish, TRUE_RED } from "../src/math/sampling.ts";

const w = en.pracWords;

test("the pond: samples of ten, their estimates, and fresh random draws", () => {
  assert.equal(FISH.length, 100);
  assert.equal(TRUE_RED, 30);
  let s = SAMPLE_START;
  for (let i = 0; i < 10; i++) s = tapFish(s, i);
  assert.equal(tapFish(s, 3).picked.length, 1);
  assert.equal(s.samples.length, 1);
  assert.equal(s.samples[0].v, estimate(s.picked));
  assert.equal(tapFish(tapFish(SAMPLE_START, 4), 4).picked.length, 1);
  const a = drawRandom(s);
  const b = drawRandom(a);
  assert.equal(new Set(a.picked).size, 10);
  assert.notDeepEqual(a.picked, b.picked);
  assert.deepEqual(b.samples.map((x) => x.hand), [true, false, false]);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("sampling", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["sampleAsPopulation", "convenienceFair", "leadingNeutral", "estimateSampleCount", "estimateAsPercent", "methodClusterStrata",
    "methodSystematicRandom", "studyKindMixed", "volunteerGroups", "noControl", "causeFromObservation", "generalizeBeyond"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("sampling", L as 1 | 2 | 3)), [7, 8, 10]);
});
