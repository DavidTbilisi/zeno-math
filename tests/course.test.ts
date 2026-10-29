// The course map: eight stages from number to deep learning, each skill in one, after the stages of what it builds
// on; a level is secure, behind the learner's grade, or open; and the next step is the lowest-grade open level whose
// prerequisites are met, which walks a learner through the whole course without getting stuck.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS, type SkillId } from "../src/math/practiceSkills.ts";
import { isExtra, nextStep, STAGES, stageOf, stageProgress, standing } from "../src/model/course.ts";
import { gradeOf, PREREQUISITES } from "../src/model/curriculum.ts";
import { cellKey, type Cells } from "../src/model/placement.ts";

const LEVELS = [1, 2, 3] as const;
const secure = { seen: 3, right: 3, run: 3 };

test("every skill is in one stage, after the stages of what it builds on", () => {
  assert.deepEqual(STAGES.map((s) => s.id), ["number", "algebra", "calculus", "linear", "probability", "optimisation", "classical", "deep"]);
  assert.deepEqual(STAGES.flatMap((s) => s.skills).sort(), [...ALL_SKILLS].sort());
  const at = (k: SkillId) => STAGES.findIndex((s) => s.id === stageOf(k));
  for (const [k, pres] of Object.entries(PREREQUISITES)) for (const pre of pres!) assert.ok(at(pre) <= at(k as SkillId), `${pre} is after ${k}`);
  assert.deepEqual(STAGES.slice(3).map((s) => s.skills), [
    ["projection", "matrices", "determinant", "elimination", "eigen"],
    ["probability", "counting", "ci", "expectation", "conditional", "distributions", "correlation", "hypothesis"],
    ["descent"],
    ["overfitting", "precision", "clustering"],
    ["backprop", "softmax"],
  ]);
  // The puzzles no syllabus teaches are extras, with number.
  assert.deepEqual(ALL_SKILLS.filter(isExtra).map(stageOf), Array(6).fill("number"));
});

test("a level is secure after a run at the first try, behind when its grade is below the learner's, otherwise open", () => {
  const s = standing({ [cellKey({ skill: "linear", level: 2 })]: secure, [cellKey({ skill: "linear", level: 3 })]: { seen: 2, right: 2, run: 2 } }, 8);
  assert.equal(s.grade, 8);
  assert.deepEqual(LEVELS.map((L) => s.level("linear", L)), ["behind", "secure", "behind"]);
  assert.deepEqual(LEVELS.map((L) => s.level("factor", L)), ["open", "open", "open"]);
  // Placed in grade 8, most of number is behind; nothing past school is.
  const p = (id: string) => stageProgress(STAGES.find((st) => st.id === id)!, s);
  assert.ok(p("number").behind > 0.7 * p("number").total);
  assert.deepEqual(p("deep"), { secure: 0, behind: 0, total: 6 });
});

test("a level waits only for the levels of its prerequisites taught by its grade or earlier", () => {
  const s = standing({}, null);
  // The times tables need comparing whole numbers, not comparing negative ones (grade 7).
  assert.equal(gradeOf("compare", 3), 7);
  assert.equal(s.ready("times", 1), false);
  const cells: Cells = { [cellKey({ skill: "compare", level: 1 })]: secure, [cellKey({ skill: "compare", level: 2 })]: secure };
  assert.equal(standing(cells, null).ready("times", 1), true);
  // Gradient descent waits for stationary points, all of them taught by grade 10.
  assert.equal(standing({}, 12).ready("descent", 1), true);
  assert.equal(standing({}, 8).ready("descent", 1), false);
});

test("following the next step walks the whole course: every graded level ends secure or behind", () => {
  assert.deepEqual(nextStep(standing({}, null)), { skill: "quickLook", level: 1 });
  assert.deepEqual(nextStep(standing({}, 13)), { skill: "numroots", level: 1 });
  for (const placed of [null, 8, 13] as const) {
    const cells: Cells = {};
    const order: string[] = [];
    for (let n = nextStep(standing(cells, placed)); n; n = nextStep(standing(cells, placed))) {
      assert.equal(cells[cellKey(n)], undefined, `${cellKey(n)} came twice`);
      cells[cellKey(n)] = secure;
      order.push(n.skill);
    }
    const s = standing(cells, placed);
    for (const k of ALL_SKILLS) for (const L of LEVELS) if (gradeOf(k, L) !== null) assert.notEqual(s.level(k, L), "open", `${k} ${L} left open`);
    assert.equal(s.grade, 13);
    // The course ends with deep learning.
    assert.equal(order.at(-1), "softmax");
  }
});
