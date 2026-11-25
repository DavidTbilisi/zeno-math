// Absolute value: the piece's answers are b each side of a (one when b is 0); every question right with its own answer
// and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { ABS_TASKS, absAnswers } from "../src/math/absValue.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the piece: two answers b each side of a, one when b is 0", () => {
  ABS_TASKS.forEach(({ a, b }, i) => {
    const xs = absAnswers(i);
    assert.equal(xs.length, b === 0 ? 1 : 2);
    for (const x of xs) assert.equal(Math.abs(x - a), b);
  });
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("absoluteValue", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("absoluteValue", L as 1 | 2 | 3)), [7, 8, 10]);
});
