// Quadratic graphs: the tiles complete the square only once every strip is laid; every question is right with its own
// answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { completed, fillCorner, layStrip, SQUARE_START } from "../src/math/quadraticGraph.ts";

const w = en.pracWords;

test("the tiles: strips one at a time, the corner only after the last, and the completed square", () => {
  let s = SQUARE_START;
  assert.equal(fillCorner(s).filled, false);
  for (let i = 0; i < 6; i++) s = layStrip(s);
  assert.equal(layStrip(s).laid, 6);
  assert.equal(fillCorner(s).filled, true);
  assert.deepEqual(completed(6, 5), { h: 3, k: -4 });
  assert.deepEqual(completed(8, 20), { h: 4, k: 4 });
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("quadraticGraph", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["rootSignKept", "axisNotHalved", "interceptSignDropped", "kAddsSquare", "halfNotTaken", "vertexSignKept", "aFromIntercept", "discriminantPlus", "maxTimeForHeight", "startHeightLeft"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("quadraticGraph", L as 1 | 2 | 3)), [8, 10, 10]);
});
