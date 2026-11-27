// Centre, spread and shape from displays (#736): in average and spread every question's right answer is accepted, and
// each slip of the new kinds is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("in practice: the new kinds' answers are right and their slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const skill of ["average", "spread"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt}`);
        assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
        assert.ok(!ex.pic || !ex.pic.svg(0, 0).includes("NaN"));
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["oneAnswerAsStatistical", "meanOfDistinct", "meanByRows", "missingAsMean", "missingWrongCount", "medianOfValues", "medianOfCounts", "modalBinAsMedian",
    "rangeAsLargest", "shiftIgnored", "shiftTimesCount", "rangeShifted", "newValueAveraged", "sdForVariance", "squaresNotDivided", "sampleForPopulation", "populationForSample",
    "sdByRange", "skewSideSwapped", "lowStackAsGap", "meanForSkewed", "medianForSymmetric", "comparedLargest"]) assert.ok(named.has(id), id);
});
