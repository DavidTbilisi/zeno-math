// Slope fields: the traced curves follow the field, the logistic ones level off at 8 and the others are pulled to
// y = x − 1; every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { solution } from "../src/math/slopeFields.ts";

const w = en.pracWords;

test("the traced curves match the known solutions", () => {
  // y′ = 0.5y through (0, 1) is e^{x/2}.
  for (const [x, y] of solution(0, 0, 1).filter(([x]) => x <= 6)) assert.ok(Math.abs(y - Math.exp(x / 2)) < 1e-4, `${x}`);
  // Logistic from below levels off at 8, from above falls back to it, and 0 and 8 stay put.
  for (const y0 of [0.5, 1, 3, 10]) {
    const ys = solution(1, 0, y0).map(([, y]) => y);
    assert.ok(ys.every((y, i) => i === 0 || (y0 < 8 ? y > ys[i - 1] && y < 8 : y < ys[i - 1] && y > 8)), `${y0}`);
    assert.ok(Math.abs(ys.at(-1)! - 8 / (1 + (8 / y0 - 1) * Math.exp(-4))) < 1e-4, `${y0}`);
  }
  assert.ok(solution(1, 2, 8).every(([, y]) => Math.abs(y - 8) < 1e-9));
  // y′ = x − y: y = x − 1 + Ce^{−x}.
  for (const [x, y] of solution(2, 0, 3)) assert.ok(Math.abs(y - (x - 1 + 4 * Math.exp(-x))) < 1e-4, `${x}`);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("slopeFields", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!/\{[a-zA-Z0-9]+\}/.test(ex.prompt + ex.plain), `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20 && !v.hint.includes("{"), `${level}/${seed} ${t.id} ${v.hint}`);
      }
    }
  for (const id of ["xySwapped", "fieldAxisSwapped", "linearForExponential", "constantNotFitted", "equilibriumSign", "constantAddedFreely", "capacityInverted", "fastestAtCapacity", "logisticAsExponential"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("slopeFields", L as 1 | 2 | 3)), [12, 12, 12]);
});
