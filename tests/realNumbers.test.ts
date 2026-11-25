// Real numbers: the root zoom finds 1.5 for √2.25 and never ends for √2; every question right with its own answer and
// wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { exactAt, holds, ROOT_PLACES, zoomOf } from "../src/math/realNumbers.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

/** The digits the piece finds for √n by always tapping the right piece, and whether it stopped exactly. */
function squeeze(n: number) {
  const digits: number[] = [];
  while (!exactAt(n, digits) && digits.length <= ROOT_PLACES) {
    const { lo, step } = zoomOf(digits);
    const j = Array.from({ length: 10 }, (_, k) => k).find((k) => holds(n, lo + k * step, step));
    assert.ok(j !== undefined, `${n}: no piece holds the root at ${digits}`);
    digits.push(j);
  }
  return { digits, exact: exactAt(n, digits) };
}

test("the root zoom: √2.25 stops at 1.5, √2 goes on as 1.41421", () => {
  assert.deepEqual(squeeze(2.25), { digits: [1, 5], exact: true });
  assert.deepEqual(squeeze(6.25), { digits: [2, 5], exact: true });
  const two = squeeze(2);
  assert.equal(two.exact, false);
  assert.deepEqual(two.digits, [1, 4, 1, 4, 2, 1]);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("realNumbers", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("realNumbers", L as 1 | 2 | 3)), [8, 8, 10]);
});
