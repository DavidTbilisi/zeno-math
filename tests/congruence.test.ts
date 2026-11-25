// Congruent triangles: one place for the top corner with SSS, SAS and ASA, two with SSA, one for each base with AAA;
// every question right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { BASE_A, BUILD_START, GIVEN, spots } from "../src/math/congruence.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the build piece: one place for SSS, SAS and ASA, two for SSA, and AAA's place moves with the base", () => {
  for (const t of ["SSS", "SAS", "ASA"] as const) assert.equal(spots({ ...BUILD_START, test: t }).length, 1, t);
  const two = spots({ ...BUILD_START, test: "SSA" });
  assert.equal(two.length, 2);
  // Both are the given side's length from the base's right end.
  for (const p of two) assert.ok(Math.abs(Math.hypot(p[0] - (BASE_A[0] + 260), p[1] - BASE_A[1]) - GIVEN.a) < 1e-6);
  const [small, big] = [spots({ ...BUILD_START, test: "AAA", bx: BASE_A[0] + 150 })[0], spots({ ...BUILD_START, test: "AAA", bx: BASE_A[0] + 300 })[0]];
  assert.ok(Math.abs((BASE_A[1] - big[1]) / (BASE_A[1] - small[1]) - 2) < 1e-9);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("congruence", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const c = check(ex, t.input, w);
        assert.ok(!c.ok, `${level}/${seed} ${t.id}`);
        assert.ok(c.hint && c.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("congruence", L as 1 | 2 | 3)), [8, 8, 10]);
});
