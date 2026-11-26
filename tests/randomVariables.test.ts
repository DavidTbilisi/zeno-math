// Random variables in use (#739): the probability bar chart draws a bar for each value, and in expectation and
// distributions every question's right answer is accepted and each slip of the new kinds is named with its working.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { probBarsSvg } from "../src/math/displays.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the bar chart draws one bar a value, as tall as its probability", () => {
  const v = probBarsSvg([0, 1, 2], [0.2, 0.5, 0.3], 0.6);
  assert.equal(v.body.match(/<rect/g)!.length, 3);
  assert.ok(!v.body.includes("NaN"));
});

test("in practice: the new kinds' answers are right and their slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const skill of ["expectation", "distributions"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 400; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt} ${ex.plain}`);
        assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
        assert.ok(!ex.pic || !ex.pic.svg(0, 0).includes("NaN"));
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${t.input} ${JSON.stringify(v)}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["valuesEquallyLikely", "waysAsProbability", "countAsProbability", "sumNotOne", "negativeProbability", "strictForInclusive", "onlyOneBar",
    "expectedAsEveryTime", "expectedAsMostLikely", "varianceForSd", "noMeanSquared", "costIgnored", "probabilityNotWeighted", "oneSideFewer", "totalsNotEqual",
    "meanOfValues", "dividedByValues", "lossNotWeighted", "insuranceSkipped", "shiftDropped", "shiftAddedToSd", "sdScaledBySquare", "sdsAdded", "variancesSubtracted",
    "geometricAsBinomial", "dependentTrials", "geometricForBinomial", "binomialForGeometric", "geometricPowerK", "successFailSwapped", "binomialVarianceForSd",
    "failuresLeftOut", "firstSuccessOnlyAtK", "cumulativeComplementLeft", "geometricMeanAsP", "geometricMeanFailures", "simStrict", "simCountNotShare",
    "normalSdsAdded", "normalVarianceAsSd"]) assert.ok(named.has(id), id);
});
