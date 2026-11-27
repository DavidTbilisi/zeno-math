// Integrals from pictures, Σ and the techniques left out (#748): every definite, accumulation and intTechniques question
// is right with its own answer and wrong with each slip, named with its hint filled in; picks have distinct options;
// the new kinds' slips all come up; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const IDS = ["trapezoidOneHeight", "sigmaLastTermOnly", "sigmaFromZero", "sigmaConstantOnce", "areaBelowAdded", "coefficientsDropped", "reversedLimitsSign", "adjacentAdded",
  "adjacentOrderSwapped", "onePieceThroughout", "riemannWidthLeftOut", "riemannStartLeftOut", "riemannStepNotScaled", "riemannEndAsWidth", "gTurnSwapped", "gMaxAtFMax", "gIntervalsSwapped",
  "gFollowsFShape", "gConcavitySwapped", "gIncreasingForConcave", "uOuterFunction", "uIsFactor", "uLimitsNotChanged", "divisionRemainderDropped", "completedSquareShiftLost", "arctanFactorLost", "trigSubMismatched"];

test("definite, accumulation, intTechniques: every question is right with its answer and every new slip is named", () => {
  const seen = new Set<string>();
  let pics = 0;
  for (const skill of ["definite", "accumulation", "intTechniques"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        const at = `${skill} ${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        if (ex.answer.k === "pick") assert.equal(new Set(ex.answer.options.map((o) => o.text)).size, ex.answer.options.length, at);
        if (/graph shows/.test(ex.prompt)) {
          assert.ok(ex.pic && !/NaN/.test(ex.pic.svg(0, 0)), at);
          pics++;
        }
        for (const t of trapInputs(ex)) {
          if (!IDS.includes(t.id)) continue;
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
  for (const id of IDS) assert.ok(seen.has(id), id);
  assert.ok(pics > 150, String(pics));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("definite", L as 1 | 2 | 3)), [10, 10, 12]);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("intTechniques", L as 1 | 2 | 3)), [12, 12, 12]);
});
