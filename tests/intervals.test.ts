// Confidence intervals, sampling distributions and two-sample inference (#743): every question is right with its own
// answer and wrong with each slip, named with its hint filled in; picks have distinct options; the new kinds' slips
// all come up; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

for (const [skill, ids, grades] of [
  ["ci", ["conditionMixed", "conditionsMissed", "zStarOneTail", "dfIsN", "tStarAsZ", "sizeRoundedDown", "sizeNotSquared", "marginByN", "marginGrows", "confidenceNarrows",
    "ciCentreOnly", "ciClaimMisread"], [13, 13, 13]],
  ["limitTheorems", ["statisticParameterSwapped", "lowSpreadAsUnbiased", "phatSdNoRoot", "phatCountSd", "conditionsOneSide", "normalNeedsThirty", "normalCountMissed",
    "phatForgotN", "normalWrongTail", "diffSdAdded", "diffVarSubtracted"], [13, 13, 13]],
  ["twoSample", ["conditionMixed", "conditionsMissed", "hypothesesSwapped", "oneSidedForTwo", "twoSidedForOne", "statisticInHypothesis", "diffSdAdded", "marginIsSe",
    "unpooledInTest", "tailDoubled", "zTailNotDoubled", "decisionFlipped", "nullAccepted", "errorTypesSwapped", "seAdded"], [12, 13, 13]],
] as const) {
  test(`${skill}: every question is right with its answer and every slip is named`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        const at = `${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        if (ex.answer.k === "pick") assert.equal(new Set(ex.answer.options.map((o) => o.text)).size, ex.answer.options.length, at);
        for (const t of trapInputs(ex)) {
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
    for (const id of ids) assert.ok(seen.has(id), id);
    assert.deepEqual([1, 2, 3].map((L) => gradeOf(skill, L as 1 | 2 | 3)), grades);
  });
}

test("a claim is supported only when the whole interval lies past the claimed value", () => {
  let seen = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const ex = exercise("ci", 2, seed, w);
    const m = /\((-?[\d.]+), (-?[\d.]+)\)[^?]*more than ([\d.]+)/.exec(ex.prompt);
    if (!m || ex.answer.k !== "pick") continue;
    const [lo, hi, v] = m.slice(1).map(Number);
    const right = ex.answer.options[ex.answer.right].text;
    assert.equal(right.startsWith("Yes"), lo > v, ex.prompt);
    assert.equal(right.includes("below"), hi < v, ex.prompt);
    seen++;
  }
  assert.ok(seen > 10);
});
