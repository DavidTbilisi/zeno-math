// Where a learner stands in the course: the placement that halves the grades, and practice that moves them on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeOf, GRADES, type Grade } from "../src/model/curriculum.ts";
import {
  cellKey, cellsOf, currentGrade, GRADE_DONE, gradeProgress, isSecure, MAX_PLACEMENT, PER_PROBE, placedGrade, placementStep, probe, recordCell, SECURE_RUN, startPlacement,
  type Cells, type Placement,
} from "../src/model/placement.ts";

/** A learner who answers right exactly the grades up to `knows`. */
function place(knows: Grade) {
  let p: Placement = startPlacement();
  const asked: Grade[] = [];
  while (placedGrade(p) === null) {
    asked.push(probe(p));
    p = placementStep(p, probe(p) <= knows);
  }
  return { grade: placedGrade(p)!, asked };
}

test("the placement finds every grade, halving the grades left with each probe", () => {
  for (const g of GRADES) {
    const { grade, asked } = place(g);
    assert.equal(grade, g);
    assert.ok(asked.length <= MAX_PLACEMENT, `grade ${g}: ${asked.length} questions`);
  }
  assert.equal(MAX_PLACEMENT, 8);
  // It starts in the middle of the 11 grades and narrows from there.
  assert.equal(probe(startPlacement()), 6);
  assert.deepEqual(place(8).asked, [6, 6, 10, 7, 7, 8, 8]);
  // A learner who misses everything lands in grade 1 after three questions, one wrong at each probe.
  assert.deepEqual(place(0 as Grade), { grade: 1, asked: [6, 3, 2] });
});

test("a grade needs PER_PROBE right answers to count; one wrong rules it out", () => {
  const p = startPlacement();
  const once = placementStep(p, true);
  assert.deepEqual([once.lo, once.hi, once.right], [p.lo, p.hi, 1]);
  const twice = placementStep(once, true);
  assert.equal(PER_PROBE, 2);
  assert.equal(GRADES[twice.lo], 6);
  const wrong = placementStep(once, false);
  assert.equal(GRADES[wrong.hi], 5);
  assert.equal(wrong.right, 0);
});

test("a level is secure after SECURE_RUN right at the first try in a row", () => {
  let s = recordCell(undefined, true);
  s = recordCell(s, true);
  assert.equal(isSecure(s), false);
  s = recordCell(s, false);
  assert.deepEqual(s, { seen: 3, right: 2, run: 0 });
  for (let i = 0; i < SECURE_RUN; i++) s = recordCell(s, true);
  assert.ok(isSecure(s));
});

test("practice moves the learner past a grade once most of its levels are secure", () => {
  const secure = { seen: 3, right: 3, run: 3 };
  const cells: Cells = {};
  assert.equal(currentGrade(null, cells), 1);
  assert.equal(currentGrade(7, cells), 7);
  const seven = cellsOf(7);
  assert.ok(seven.every((c) => gradeOf(c.skill, c.level) === 7));
  const needed = Math.ceil(GRADE_DONE * seven.length);
  seven.slice(0, needed - 1).forEach((c) => (cells[cellKey(c)] = secure));
  assert.equal(currentGrade(7, cells), 7);
  assert.deepEqual(gradeProgress(7, cells), { secure: needed - 1, total: seven.length });
  cells[cellKey(seven[needed - 1])] = secure;
  assert.equal(currentGrade(7, cells), 8);
  // University is the last stage: it is never moved past.
  for (const c of cellsOf(13)) cells[cellKey(c)] = secure;
  assert.equal(currentGrade(13, cells), 13);
});
