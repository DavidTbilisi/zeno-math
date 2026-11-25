// Inequalities in two variables: clipping keeps the right side, the piece's third inequality shades below, and the
// region shows after eight tests with one on the line; every question is right with its own answer and wrong with
// each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { clip, holds, ineqText, shown, square, TEST_INEQS, testAt, TESTPOINTS_START } from "../src/math/regions.ts";

const w = en.pracWords;

test("a half-plane, the piece's inequalities and when the region shows", () => {
  const half = clip(square(6), { m: 0, c: 0, op: ">" });
  assert.ok(half.every(([, y]) => y >= 0) && half.length === 4);
  assert.equal(ineqText({ m: -1, c: -3, op: "≥" }), "y ≥ −x − 3");
  for (const t of TEST_INEQS)
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) {
      const raw = t.op === "<" ? t.lhs([x, y]) < t.rhs([x, y]) : t.op === ">" ? t.lhs([x, y]) > t.rhs([x, y]) : t.lhs([x, y]) >= t.rhs([x, y]);
      assert.equal(holds(t.q, [x, y]), raw, `${t.text} (${x}, ${y})`);
    }
  let s = TESTPOINTS_START;
  for (const p of [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [0, 3], [1, 0], [2, 1]] as const) s = testAt(s, p);
  assert.equal(s.tested.length, 8);
  assert.equal(shown(s), false);
  assert.equal(shown(testAt(s, [1, 3])), true);
  assert.equal(testAt(s, [0, 0]).tested.length, 8);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("regions", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["boundaryMisread", "coordsSwapped", "lineStyleSwapped", "shadeSideSwapped", "slopeSignKept", "slopeUpsideDown", "pointSignsFlipped", "oneInequalityOnly", "atMostAsAtLeast", "costsSwapped"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("regions", L as 1 | 2 | 3)), [8, 10, 10]);
});
