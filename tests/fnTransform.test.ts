// Transformations: the formula written from h, k and a, and the moved graph's heights; every question is right with
// its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { formulaOf, MOVE_START, movedAt } from "../src/math/fnTransform.ts";

const w = en.pracWords;

test("the formula follows the move, and the key point sits at (h, k)", () => {
  assert.equal(formulaOf(MOVE_START), "y = x²");
  assert.equal(formulaOf({ parent: 0, h: 3, k: -2, a: -2 }), "y = −2(x − 3)² − 2");
  assert.equal(formulaOf({ parent: 1, h: -1, k: 4, a: 1 }), "y = |x + 1| + 4");
  assert.equal(formulaOf({ parent: 2, h: 2, k: 0, a: -1 }), "y = −√(x − 2)");
  assert.equal(movedAt({ parent: 0, h: 3, k: -2, a: 2 }, 3), -2);
  assert.equal(movedAt({ parent: 0, h: 3, k: -2, a: 2 }, 4), 0);
  assert.ok(Number.isNaN(movedAt({ parent: 2, h: 2, k: 0, a: 1 }, 1)));
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("fnTransform", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["shiftWrongWay", "reflectionAxesSwapped", "stretchWrongAxis", "stretchNotInverted", "stretchAfterShift", "insideFactorNotTaken", "constantBreaksEven", "oddCalledEven", "oddWithConstant"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("fnTransform", L as 1 | 2 | 3)), [10, 10, 12]);
});
