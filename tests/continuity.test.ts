// Continuity and limits: the piece's one-sided limits and values; every question is right with its own answer and
// wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { breakAt, sidesAt } from "../src/math/continuity.ts";

const w = en.pracWords;

test("the hole, the jump, the asymptote and the joined pieces head where the words say", () => {
  for (const which of [0, 1, 3])
    for (const k of [-3, 1, 2]) {
      const s = sidesAt(which, k);
      assert.ok(Math.abs((breakAt(which, k, 2 - 1e-7) ?? NaN) - s.left) < 1e-5, `${which} ${k} left`);
      assert.ok(Math.abs((breakAt(which, k, 2 + 1e-7) ?? NaN) - s.right) < 1e-5, `${which} ${k} right`);
    }
  assert.equal(breakAt(0, 0, 2), null);
  assert.deepEqual(sidesAt(3, 1), { left: 3, right: 3, value: 3 });
  assert.ok((breakAt(2, 0, 2.01) ?? 0) > 99);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("continuity", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!JSON.stringify(ex).includes("{a}") && !ex.prompt.includes("{"), `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20 && !v.hint.includes("{"), `${level}/${seed} ${t.id} ${v.hint}`);
      }
    }
  for (const id of ["limitAsValue", "valueBreaksLimit", "oneSideTaken", "sidesSwapped", "denominatorZeroInfinite", "jumpCalledRemovable", "piecesAlwaysJump", "kNotDivided", "slopesMatched", "ivtNeedsMonotone", "ivtSameSignRoot", "ivtNoContinuity", "swingNotSqueezed"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("continuity", L as 1 | 2 | 3)), [12, 12, 12]);
});
