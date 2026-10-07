// The pre- and post-test: the same class always gets the same forms, A and B ask about the same skills at the same
// levels with different questions, items spread over the class's skills, and every item is a question that accepts its
// own answer in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, SKILLS } from "../src/math/practice.ts";
import { CURRICULUM, inCurriculumOrder } from "../src/model/curriculum.ts";
import { formFor, testItems } from "../src/model/testForms.ts";

test("forms are stable and parallel: same skills and levels, different questions", () => {
  const skills = inCurriculumOrder(SKILLS.algebra);
  const a = testItems("ABC234", skills, "A", 12);
  assert.deepEqual(testItems("ABC234", skills, "A", 12), a, "the same class gets the same form");
  const b = testItems("ABC234", skills, "B", 12);
  assert.deepEqual(a.map((i) => [i.skill, i.level]), b.map((i) => [i.skill, i.level]));
  assert.ok(a.every((item, i) => item.seed !== b[i].seed), "different questions");
  assert.notDeepEqual(testItems("XYZ234", skills, "A", 12).map((i) => i.seed), a.map((i) => i.seed), "another class, other questions");
});

test("items spread evenly over the class's skills and levels", () => {
  // Fewer skills than items: every skill comes round, at the next level each time.
  const few = testItems("C", ["linear", "expand", "factor"], "A", 9);
  assert.deepEqual(few.map((i) => `${i.skill}${i.level}`), ["linear2", "expand2", "factor2", "linear1", "expand1", "factor1", "linear3", "expand3", "factor3"]);
  // More skills than items: spread across the curriculum, not bunched at the start.
  const many = testItems("C", CURRICULUM, "A", 12);
  assert.equal(new Set(many.map((i) => i.skill)).size, 12);
  assert.equal(many[0].skill, CURRICULUM[1]);
  assert.equal(many.at(-1)!.skill, CURRICULUM[CURRICULUM.length - 2]);
  assert.deepEqual([...new Set(many.map((i) => i.level))].sort(), [1, 2, 3]);
});

test("every test question works and accepts its own answer, in every language", () => {
  for (const code of ["ABC234", "QWE789"])
    for (const form of ["A", "B"] as const)
      for (const item of testItems(code, CURRICULUM, form, 30))
        for (const words of [en.pracWords, ru.pracWords, ka.pracWords]) {
          const ex = exercise(item.skill, item.level, item.seed, words);
          assert.deepEqual(check(ex, ex.plain, words), { ok: true }, `${item.skill} ${item.level} #${item.seed}`);
        }
});

test("counterbalancing: AB takes A first, BA takes B first", () => {
  assert.deepEqual([formFor("AB", "pre"), formFor("AB", "post"), formFor("BA", "pre"), formFor("BA", "post")], ["A", "B", "B", "A"]);
});
