// Trigonometric graphs and equations: the wave's height and the level's solutions; every question of both skills is
// right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { levelSolutions, waveAt } from "../src/math/trigWave.ts";

const w = en.pracWords;

test("the wave's height and where a level meets it in one turn", () => {
  assert.ok(Math.abs(waveAt({ a: 2, b: 1, d: 1 }, 90) - 3) < 1e-9);
  assert.deepEqual(levelSolutions({ a: 2, b: 1, d: 0 }, 1), [30, 150]);
  assert.deepEqual(levelSolutions({ a: 1, b: 2, d: 0 }, 0.5), [15, 75, 195, 255]);
  assert.deepEqual(levelSolutions({ a: 2, b: 1, d: 0 }, -2), [270]);
  assert.deepEqual(levelSolutions({ a: 1, b: 1, d: 0 }, 2), []);
});

for (const skill of ["trigGraphs", "trigEquations"] as const)
  test(`${skill}: every question is right with its own answer, and every slip is wrong with its hint`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 200; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
          assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
        }
      }
    const ids = skill === "trigGraphs"
      ? ["amplitudeDoubled", "periodAsB", "periodNotDivided", "midlineFromMax", "bAsPeriod", "highTideAsMidline"]
      : ["oneSolutionOnly", "wrongQuadrant", "negativeAngleKept", "periodChangeIgnored", "inverseRangeIgnored", "arccosNegated", "oneFactorOnly", "degreesForRadians"];
    for (const id of ids) assert.ok(seen.has(id), id);
  });

test("the grades", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("trigGraphs", L as 1 | 2 | 3)), [10, 10, 12]);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("trigEquations", L as 1 | 2 | 3)), [10, 12, 12]);
});
