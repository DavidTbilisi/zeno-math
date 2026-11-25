// Angles on parallel lines: the pairs named from their places, every question's answer from the figure's angles, the
// slips that differ from the answer, and the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { LAB_PLACES, pairEqual, pairOf, positionAngle } from "../src/math/parallelAngles.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the pairs: corresponding and alternate equal, co-interior and on a line adding to 180°, at any slope", () => {
  assert.equal(pairOf({ at: "p", c: "tl" }, { at: "p", c: "br" }), "vertical");
  assert.equal(pairOf({ at: "p", c: "tl" }, { at: "q", c: "tl" }), "corresponding");
  assert.equal(pairOf({ at: "p", c: "bl" }, { at: "q", c: "tr" }), "alternate");
  assert.equal(pairOf({ at: "p", c: "br" }, { at: "q", c: "tr" }), "coInterior");
  assert.equal(pairOf({ at: "p", c: "tl" }, { at: "q", c: "br" }), null);
  for (const theta of [35, 70, 110, 145])
    for (const a of LAB_PLACES)
      for (const b of LAB_PLACES) {
        const p = pairOf(a, b);
        if (!p || a === b) continue;
        const [x, y] = [positionAngle(theta, a.c), positionAngle(theta, b.c)];
        if (pairEqual(p)) assert.equal(x, y, `${p} ${theta}`);
        else assert.equal(x + y, 180, `${p} ${theta}`);
      }
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("parallelAngles", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const c = check(ex, t.input, w);
        assert.ok(!c.ok, `${level}/${seed} ${t.id}`);
        assert.ok(c.hint && c.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
});

test("the hard level asks all three: the outside angle, an equation in x, and a bend between parallels", () => {
  const prompts = new Set(Array.from({ length: 60 }, (_, s) => exercise("parallelAngles", 3, s + 1, w).prompt));
  for (const p of [w.parAngles.solveX, w.parAngles.bend]) assert.ok(prompts.has(p), p);
  assert.ok(prompts.has(w.parAngles.ext) || prompts.has(w.parAngles.extIn));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("parallelAngles", L as 1 | 2 | 3)), [7, 7, 7]);
});
