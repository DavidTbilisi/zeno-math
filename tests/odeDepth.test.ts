// Differential equations (#752): every first-order, second-order and Laplace question is right with its own answer and
// wrong with each slip, named with its hint filled in; each new slip comes up, and only at the level its kind is asked
// at; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const w = en.pracWords;
/** Each new slip and the levels it may come up at. */
const IDS: Record<string, Record<string, readonly number[]>> = {
  odeFirst: {
    rateOfWrongAmount: [1], rateSignFlipped: [1], rateProportionalToTime: [1], sumTakenAsSeparable: [1], insideFunctionTaken: [1], constantTermIgnored: [1],
    rootTakenTermwise: [2], implicitBranchSign: [2], domainEndpointSign: [2], domainEndpointInverted: [2], correctLineBlamed: [2], homogeneousNoX: [2],
    ambientLeftOut: [3], linearCooling: [3],
  },
  laplace: {
    shiftTopLeftOut: [1], shiftAsProduct: [1], delayLeftOut: [1], siftedValueLeftOut: [1], delayShiftSign: [1, 3], deltaAsStep: [1, 3],
    convolutionAsProduct: [2, 3], convolutionLowerEndLeftOut: [2, 3], convolutionAsSum: [2],
  },
  odeSecond: { trigDerivativeSignSlip: [3], secondDerivativeLeftOut: [3], forcingPartLeftOut: [3], massLeftOut: [3], naturalFrequencySign: [3] },
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
  for (const s of ["odeFirst", "odeSecond", "laplace"] as const) assert.deepEqual([1, 2, 3].map((L) => gradeOf(s, L as 1 | 2 | 3)), [13, 13, 13]);
});
