// Series, convergence and power series (#751): every question is right with its own answer and wrong with each slip,
// named with its hint filled in; each new slip comes up, and only at the level its kind is asked at; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;
/** Each new slip and the levels it may come up at. */
const IDS: Record<string, Record<string, readonly number[]>> = {
  series: {
    sigmaTopLeftOut: [1], sigmaStartAtOne: [1], sigmaTopAsLastTerm: [1], sigmaStartShifted: [1], sigmaStepLeftOut: [1],
    bounceUpOnlyCounted: [3], bounceDropCountedTwice: [3],
  },
  convergence: {
    partialSumForTerm: [1], termIndexShifted: [1], termLimitForSum: [1], firstPartialForSum: [1],
    sumEqualsIntegral: [2], comparisonWrongWay: [2], comparisonNoVerdict: [2], limitComparisonFlipped: [2],
    remainderLastTerm: [3], remainderNextTwo: [3],
  },
  powerSeries: {
    geometricSignLost: [1, 2], geometricPowerOff: [1], differentiatedIndexShift: [2], integratedNotDivided: [2], derivativeAtZeroAsCoefficient: [3],
  },
};

for (const [skill, ids] of Object.entries(IDS))
  test(`${skill}: every question is right with its answer and every new slip is named at its level`, () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 400; seed++) {
        const ex = exercise(skill as SkillId, level, seed, w);
        const at = `${level}/${seed} ${ex.prompt}`;
        assert.ok(!/\{\w+\}/.test(ex.prompt), at);
        assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
        assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
        for (const t of trapInputs(ex)) {
          if (!(t.id in ids)) continue;
          assert.ok(ids[t.id].includes(level), `${at} ${t.id} at level ${level}`);
          seen.add(t.id);
          const v = check(ex, t.input, w);
          assert.ok(!v.ok, `${at} ${t.id}`);
          assert.equal(v.mistake, t.id, `${at} ${t.input}`);
          assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
        }
      }
    for (const id of Object.keys(ids)) assert.ok(seen.has(id), id);
  });

test("the grades stay", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("series", L as 1 | 2 | 3)), [12, 12, 12]);
  for (const s of ["convergence", "powerSeries"] as const) assert.deepEqual([1, 2, 3].map((L) => gradeOf(s, L as 1 | 2 | 3)), [13, 13, 13]);
});
