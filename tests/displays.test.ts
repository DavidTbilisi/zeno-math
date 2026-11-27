// Building and reading displays (#735): the pictures draw (a line plot of fractions, raw data, a table of counts, a
// mosaic plot), and in readChart, diagrams and twoWay every question's right answer is accepted and each slip is named
// with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { countTableSvg, dataGridSvg, fracLabel, linePlotSvg, mosaicSvg } from "../src/math/displays.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("fractions are read in lowest terms, whole and mixed", () => {
  assert.deepEqual([fracLabel(4, 8), fracLabel(6, 8), fracLabel(8, 8), fracLabel(10, 8), fracLabel(0, 4)], ["1/2", "3/4", "1", "1 1/4", "0"]);
});

test("the pictures draw: an X for each value, a cell for each item, a row for each count, two columns of a mosaic", () => {
  const plot = linePlotSvg([1, 3, 3, 6], 0, 8, 8, "cm");
  assert.equal(plot.body.match(/<path/g)!.length, 4);
  assert.match(plot.body, />3\/4</);
  assert.equal(dataGridSvg(["1/2", "4/8", "3/8"], 2).body.match(/<text/g)!.length, 3);
  assert.equal(countTableSvg(["Fruit", "How many"], [{ name: "a", n: 4 }, { name: "b", n: 6 }]).body.match(/<text/g)!.length, 6);
  const mosaic = mosaicSvg(["Walk", "Bus"], ["Late", "On time"], [[12, 28], [30, 30]]);
  // Walk is 40 % wide (144 of 360), and its late part 30 % high (72 of 240).
  assert.match(mosaic.body, /width="144" height="72"/);
  for (const p of [plot, mosaic]) assert.ok(!p.body.includes("NaN"));
});

test("in practice: the new kinds' answers are right and their slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const skill of ["readChart", "diagrams", "twoWay"] as const)
    for (const level of [1, 2, 3] as const)
      for (let seed = 1; seed <= 300; seed++) {
        const ex = exercise(skill, level, seed, w);
        assert.equal(check(ex, ex.plain, w).ok, true, `${skill} ${level} ${seed} ${ex.prompt}`);
        assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, w);
          assert.equal(v.mistake, t.id, `${skill} ${level} ${seed} ${ex.prompt} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
          named.add(t.id);
        }
      }
  for (const id of ["scaleStepIgnored", "stoppedAtOneStep", "allThreeAdded", "picturesCounted", "dotIncludesEqual", "longestAsDifference", "countNotTimesValue", "equivFractionMissed",
    "codeAsQuantitative", "categoryAsQuantitative", "countAsContinuous", "measureAsDiscrete", "countForShare", "binEdgeBoth", "modeAsCount",
    "wholeForRow", "wrongRowSubtracted", "marginalFromCell", "marginalCondSwapped", "mosaicWidthRead", "mosaicOtherPart", "trendByCounts"]) assert.ok(named.has(id), id);
});
