// Scatter plots by hand and regression output (#737): r and the residual plot drawn as asked, a table of output, and in
// scatter every question's right answer is accepted and each slip of the new kinds is named with its working filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { tableSvg } from "../src/math/displays.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { corr, residualSvg } from "../src/math/scatterFit.ts";

const w = en.pracWords;

test("r of a line is ±1; a residual plot puts 0 in the middle; a table draws every cell", () => {
  assert.equal(corr([[1, 2], [2, 4], [3, 6]]), 1);
  assert.equal(Math.round(corr([[1, 6], [2, 4], [3, 2]]) * 1e9) / 1e9, -1);
  const res = residualSvg([[2, 0], [4, 6]], 10, 6, "residual");
  assert.match(res.body, /cy="102"/);
  assert.match(res.body, /cy="12"/);
  assert.equal(tableSvg(["Predictor", "Coef", "SE Coef"], [["Constant", "31.4", "2.2"], ["Hours", "4.7", "0.6"]]).body.match(/<text/g)!.length, 9);
});

test("in practice: the new kinds' answers are right and their slips are named, their hints filled in", () => {
  const named = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 400; seed++) {
      const ex = exercise("scatter", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt}`);
      assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
      assert.ok(!ex.pic || !ex.pic.svg(0, 0).includes("NaN"));
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["pointAxesSwapped", "categoryForScatter", "oneVariableForScatter", "responseOnX", "strengthBySteepness", "curveAsLinear", "slopeRunOverRise", "slopeFromOrigin",
    "slopeSignFlipped", "interceptAtFirstX", "rSignIgnored", "rStrengthMisjudged", "residualsNotZero", "residualPatternIgnored", "influenceIgnored", "influenceReversed",
    "interpExtrapSwapped", "coefSwapped", "seForSlope"]) assert.ok(named.has(id), id);
});
