// Probability rules, sample spaces and counting (#738): the Venn diagram draws its four counts, and in probability and
// counting every question's right answer is accepted and each slip of the new kinds is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { vennSvg } from "../src/math/displays.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the Venn diagram writes each part's count", () => {
  const v = vennSvg(["F", "C"], [7, 3, 5, 9]);
  for (const n of [7, 3, 5, 9]) assert.match(v.body, new RegExp(`>${n}<`));
  assert.equal(v.body.match(/<circle/g)!.length, 2);
});

test("in practice: the new kinds' answers are right and their slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const skill of ["probability", "counting"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 400; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt}`);
        assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
        assert.ok(!ex.pic || !ex.pic.svg(0, 0).includes("NaN"));
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${t.input} ${JSON.stringify(v)}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["experimentalAsOdds", "theoryForExperiment", "moreByCount", "predictionOnePart", "predictedComplement", "modelMissingAsSum", "modelEqualShares",
    "smallSampleClaim", "gamblersFallacy", "theoryForSimulation", "simulationComplement", "outcomesAdded", "unionForIntersection", "intersectionForUnion", "unionOverlapDropped",
    "complementAsSet", "bothCountedTwice", "vennOnlyRegion", "vennBothDropped", "independentAdded", "complementAsOdds", "atLeastOneAdded", "atLeastAsAll",
    "withoutReplacementIndependent", "replacementIgnored", "atLeastReplaced", "conditionalAsJoint", "generalRuleAdded", "countingAdded", "repeatsForbidden",
    "digitsTimesPlaces", "orderCountedTwice", "orderIgnored", "lotteryOrdered", "committeeWithReplacement"]) assert.ok(named.has(id), id);
});
