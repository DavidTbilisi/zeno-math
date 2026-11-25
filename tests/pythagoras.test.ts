// Pythagoras' theorem: the triples, every question right with its own answer and wrong with each slip, surd and
// decimal answers both accepted, and the grade.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { TRIPLES } from "../src/math/skills/pythagoras.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the triples are right triangles", () => {
  for (const [a, b, c] of TRIPLES) assert.equal(a * a + b * b, c * c);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("pythagoras", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const c = check(ex, t.input, w);
        assert.ok(!c.ok, `${level}/${seed} ${t.id}`);
        assert.ok(c.hint && c.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
});

test("a surd answer is also right as a decimal to 2 places, and the hard level asks the box, the ladder and the height", () => {
  let surds = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const ex = exercise("pythagoras", 3, seed, w);
    if (ex.format !== "exact" || ex.answer.k !== "num") continue;
    surds++;
    assert.ok(check(ex, (Math.round(ex.answer.v * 100) / 100).toFixed(2), w).ok, ex.prompt);
  }
  assert.ok(surds > 20);
  const prompts = Array.from({ length: 60 }, (_, s) => exercise("pythagoras", 3, s + 1, w).prompt);
  for (const t of [w.pyth.box, w.pyth.ladder, w.pyth.iso]) {
    const piece = t.split(/\{.\}/).sort((x, y) => y.length - x.length)[0];
    assert.ok(prompts.some((p) => p.includes(piece)), t);
  }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("pythagoras", L as 1 | 2 | 3)), [8, 8, 8]);
});
