// Equations with roots: the piece's answers, the fitting one first, and checks only after squaring; every question is
// right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { checkAt, ROOT_EQS, rootsOf, SQUARE_CHECK_START, squareIt } from "../src/math/rootEquations.ts";

const w = en.pracWords;

test("the squared equation's answers: one fits, the other lies on the mirror", () => {
  assert.deepEqual(rootsOf(2, -4), [7, 2]);
  for (const { a, c } of ROOT_EQS) {
    const [g, b] = rootsOf(a, c);
    assert.ok(Math.abs(Math.sqrt(g + a) - (g + c)) < 1e-9);
    assert.ok(Math.abs(-Math.sqrt(b + a) - (b + c)) < 1e-9);
  }
  assert.deepEqual(checkAt(SQUARE_CHECK_START, 0), SQUARE_CHECK_START);
  assert.deepEqual(checkAt(checkAt(squareIt(SQUARE_CHECK_START), 1), 1).checked, [1]);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("rootEquations", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!/\+ −|\(\)/.test(ex.prompt), ex.prompt);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["rootNotSquared", "constantAddedBack", "fractionMultiplied", "fractionUpsideDown", "extraneousKept", "excludedKept", "lastSquareForgotten", "crossingYGiven", "rootDividedNotTimes"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("rootEquations", L as 1 | 2 | 3)), [10, 10, 12]);
});
