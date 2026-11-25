// Parametric and polar curves: the piece's points and velocities, the ball's flat top and the circle's steady speed;
// every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { traceAt } from "../src/math/parametric.ts";

const w = en.pracWords;

test("the ball is flat at its top, the circle's speed stays 3, and the cardioid starts at r = 4", () => {
  const top = traceAt(0, 8);
  assert.deepEqual([top.x, top.y, top.dy], [0, 4, 0]);
  for (let s = 0; s <= 24; s += 5) assert.ok(Math.abs(Math.hypot(traceAt(1, s).dx, traceAt(1, s).dy) - 3) < 1e-9);
  assert.equal(traceAt(2, 0).r, 4);
  assert.ok(Math.abs(traceAt(2, 12).x) < 1e-9);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("parametric", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["xForY", "tSolvedWrongSign", "polarCosSinSwapped", "dydxUpsideDown", "speedNotRooted", "componentsAdded", "polarCurveMisnamed", "arcLengthNotRooted", "chordForArc", "areaHalfForgotten", "accelerationAsVelocity", "topForLanding"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("parametric", L as 1 | 2 | 3)), [12, 12, 13]);
});
