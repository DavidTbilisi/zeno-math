// Hypothesis tests and χ² tests (#742): every question is right with its own answer and wrong with each slip, named
// with its hint filled in; picks have distinct options; the new kinds' slips all come up; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { textTex } from "../src/math/partKit.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

for (const [skill, ids, grades] of [
  ["hypothesis", ["smallPKept", "largePRejected", "rejectAsProof", "hypothesesSwapped", "twoSidedForOne", "oneSidedForTwo", "statisticInHypothesis", "simCountAsP",
    "simComplement", "conditionMixed", "conditionsMissed", "seFromPHat", "tailDoubled", "tailNotDoubled", "zForT", "nullAccepted", "decisionFlipped"], [12, 12, 12]],
  ["chiSquared", ["expectedAsShare", "expectedEqualSplit", "observedCountChecked", "chiConditionsMissed", "chiLowerTail", "chiNullAccepted", "chiDecisionFlipped",
    "dfCategories", "dfCellsMinusOne", "chiSquaredByObserved", "chiSquaredNotDivided", "expectedUniform"], [13, 13, 13]],
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

test("words as TeX: the symbols of a test are set as maths, a percent is escaped", () => {
  assert.equal(textTex("H₀: μ = 40"), "\\text{}H_0\\text{: }\\mu\\text{ = 40}");
  assert.equal(textTex("50% red"), "\\text{50\\% red}");
  assert.equal(textTex("p ≥ 0.3"), "\\text{p }\\ge\\text{ 0.3}");
});
