// Moving shapes: the four moves on points, each piece task reachable by its own move, every question right with its
// own answer and wrong with each slip, and the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { enlarge, flip, imageOf, MOVE_SHAPE_START, moveTask, sameShape, SCALES, turnAbout, type P2 } from "../src/math/moveShape.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the moves on a point", () => {
  assert.deepEqual(flip([2, 3], { dir: "v", c: 0 }), [-2, 3]);
  assert.deepEqual(flip([2, 3], { dir: "h", c: 1 }), [2, -1]);
  assert.deepEqual(flip([2, 3], { dir: "d1", c: 0 }), [3, 2]);
  assert.deepEqual(flip([2, 3], { dir: "d2", c: 0 }), [-3, -2]);
  assert.deepEqual(turnAbout([2, 1], [0, 0], 1), [-1, 2]);
  assert.deepEqual(turnAbout([2, 1], [1, 1], 2), [0, 1]);
  assert.deepEqual(enlarge([3, 1], [1, 1], 2), [5, 1]);
});

test("every task of the piece can be done with the move that made it", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const t = moveTask(seed);
    let found = false;
    const tries: Partial<typeof MOVE_SHAPE_START>[] = [];
    for (let dx = -14; dx <= 14; dx++) for (let dy = -12; dy <= 12; dy++) tries.push({ tool: "slide", dx, dy });
    for (const dir of ["v", "h", "d1", "d2"] as const) for (let c = -6; c <= 6; c++) tries.push({ tool: "flip", mirror: { dir, c } });
    for (let a = -8; a <= 8; a++) for (let b = -6; b <= 6; b++) {
      for (let q = 1; q < 4; q++) tries.push({ tool: "turn", centre: [a, b] as P2, q });
      for (let k = 0; k < SCALES.length; k++) tries.push({ tool: "enlarge", centre: [a, b] as P2, k });
    }
    for (const p of tries) if (p.tool === t.tool && sameShape(imageOf({ ...MOVE_SHAPE_START, ...p }, t.base), t.target)) found = true;
    assert.ok(found, `task ${seed} (${t.tool})`);
  }
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("transformations", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const c = check(ex, t.input, w);
        assert.ok(!c.ok, `${level}/${seed} ${t.id}`);
        assert.ok(c.hint && c.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("transformations", L as 1 | 2 | 3)), [8, 8, 10]);
});
