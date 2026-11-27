// The normal model (#740): the density picture shades the asked part, and in practice every question's right answer is
// accepted and each of its slips is named, with the hint filled in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { densitySvg } from "../src/math/displays.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;

test("the density picture draws the curve and shades from the lower cut to the upper", () => {
  const v = densitySvg("triangle", 4, 2, 4, "2/4");
  assert.ok(v.body.includes("#a5d8ff") && !v.body.includes("NaN"));
  assert.ok(densitySvg("uniform", 10, 3, 7, "1/10").body.includes(">7<"));
});

test("in practice: every answer is right and every slip is named, its hint filled in", () => {
  const named = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 400; seed++) {
      const ex = exercise("normalModel", level, seed, w);
      assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!/\{\w+\}/.test(ex.prompt), ex.prompt);
      assert.ok(!ex.pic || !ex.pic.svg(0, 0).includes("NaN"));
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input} ${JSON.stringify(v)}`);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
        named.add(t.id);
      }
    }
  for (const id of ["percentileIncludesSelf", "rankNotPercent", "zSignFlipped", "zNoMean", "zOverMean", "rawScoresCompared", "shiftChangesSpread", "scaleSkipsSpread",
    "spreadSquared", "peakAtOne", "densityAreaAny", "heightIgnored", "lowerCutIgnored", "widthShare", "wrongBandUsed", "bothTailsCounted", "belowForAbove",
    "bandNotHalved", "tailSwapped", "reverseTailSwapped", "zAsScore", "oneTailOnly", "keptForRejected"]) assert.ok(named.has(id), id);
});

test("a normal probability read from a table to 2 places of z is accepted", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const ex = exercise("normalModel", 3, seed, w);
    if (!ex.prompt.includes("Find P(X")) continue;
    const v = Number(ex.plain);
    assert.equal(check(ex, (v + 0.002).toFixed(3), w).ok, true, ex.prompt);
  }
});
