// Slicing solids: the slices the questions name are the solids piece's own; every question right with its own answer and
// wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { sliceName } from "../src/math/crossSections.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("level slices copy the base, upright ones show the side", () => {
  const s = (shape: "cuboid" | "prism" | "pyramid" | "cylinder" | "cone" | "sphere", n: number, tilt: 0 | 90, cutAt = 50) => sliceName({ shape, n, a: 4, b: 3, c: 5, tilt, cutAt });
  assert.equal(s("cylinder", 4, 0), "circle");
  assert.equal(s("cylinder", 4, 90), "rectangle");
  assert.equal(s("cone", 4, 0), "circle");
  assert.equal(s("cone", 4, 90), "triangle");
  assert.equal(s("pyramid", 4, 90), "triangle");
  assert.equal(s("pyramid", 4, 90, 30), "trapezium");
  assert.equal(s("prism", 3, 0), "triangle");
  assert.equal(s("sphere", 4, 0, 70), "circle");
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("crossSections", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("crossSections", L as 1 | 2 | 3)), [7, 10, 10]);
});
