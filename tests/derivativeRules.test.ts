// The derivative itself and its rules (#745): every question is right with its own answer and wrong with each slip,
// named with its hint filled in; picks have distinct options; the new kinds' slips all come up; the table and graph
// questions carry a picture; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

for (const [skill, ids, grades] of [
  ["tangent", ["limitPointAsH", "derivativeAsValue", "slopeNotDivided", "secantNotDivided", "continuousSoDifferentiable", "disguisedPowerKept", "indeterminateAsZero",
    "valuesMatchEnough", "slopesMatchEnough", "secantSignLost"], [10, 10, 10]],
  ["differentiate", ["valuesNotDerivatives", "errorNotSeen", "compositeLayersSwapped", "compositeReadAsProduct", "derivativesMultiplied", "quotientTopSwapped",
    "quotientNotSquared", "chainOuterAtPoint", "chainInsideLost", "powerRuleOnExponential", "lnFactorLost", "lnFactorInverted", "derivativesDivided", "trigDerivSign",
    "trigCofunctionSwapped", "firstForSecond"], [10, 10, 10]],
  ["implicit", ["inverseDerivNotFlipped", "inverseDerivWrongPoint", "inverseTrigSign", "inverseTrigFormsMixed", "chainInsideLost", "implicitSecondYConstant"], [12, 12, 12]],
] as const) {
  test(`${skill}: every question is right with its answer and every slip is named`, () => {
    const seen = new Set<string>();
    let pics = 0;
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        const at = `${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        if (ex.answer.k === "pick") assert.equal(new Set(ex.answer.options.map((o) => o.text)).size, ex.answer.options.length, at);
        if (/table|drawn/.test(ex.prompt)) {
          assert.ok(ex.pic && !/NaN/.test(ex.pic.svg(0, 0)), at);
          pics++;
        }
        for (const t of trapInputs(ex)) {
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
    for (const id of ids) assert.ok(seen.has(id), id);
    if (skill !== "implicit") assert.ok(pics > 50, String(pics));
    assert.deepEqual([1, 2, 3].map((L) => gradeOf(skill, L as 1 | 2 | 3)), grades);
  });
}
