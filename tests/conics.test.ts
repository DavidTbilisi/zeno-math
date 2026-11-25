// Conic sections: the string's two lengths always add to 10, the parabola's two distances are equal; every question
// is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { ellipsePoint, strings } from "../src/math/conics.ts";

const w = en.pracWords;

test("the string's lengths add to 10 all the way round, and the parabola's distances match", () => {
  for (const c of [0, 1, 3, 4])
    for (let t = 0; t < 360; t += 25) {
      const [a, b] = strings(ellipsePoint(t, c), c);
      assert.ok(Math.abs(a + b - 10) < 1e-9, `${c} ${t}`);
    }
  for (const p of [1, 2, 3])
    for (const x of [-5, -1.5, 0, 2, 4.5]) {
      const y = (x * x) / (4 * p);
      assert.ok(Math.abs(Math.hypot(x, y - p) - (y + p)) < 1e-9);
    }
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("conics", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["radiusNotRooted", "centreSignKept", "circleConstantOnly", "focusNotQuartered", "fourPForgotten", "fociAdded", "semiAxisForAxis", "asymptoteSlopeInverted", "fociSubtracted", "ellipseAsCircle", "hyperbolaSignIgnored", "fociHalfOnly"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("conics", L as 1 | 2 | 3)), [10, 12, 12]);
});
