// Areas and volumes beyond one disc (#749): every intApplications question is right with its own answer and wrong with
// each slip, named with its hint filled in; picks have distinct options; the new kinds' slips all come up; the settings
// (a leaking tank, what an integral means) are only at the hard level; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const IDS = ["rightMinusLeftSwapped", "xValuesAsLimits", "oneRegionOnly", "curveThroughout", "loopsCancel", "oneLoopOnly", "sideNotSquared", "piForSquares",
  "semicircleRadiusAsDiameter", "triangleHalfLeftOut", "differenceSquared", "innerLeftOut", "axisDistanceLeftOut", "axisShiftLeftOut", "shiftSubtracted",
  "integralAsRate", "integralAsAmount", "integralAsAverage", "rateAtTimeGiven", "lowerLimitLeftOut", "divisorLeftOut"];

test("intApplications: every question is right with its answer and every new slip is named", () => {
  const seen = new Set<string>();
  let settings = 0;
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 400; seed++) {
      const ex = exercise("intApplications", level, seed, w);
      const at = `${level}/${seed} ${ex.prompt}`;
      assert.ok(!/\{\w+\}/.test(ex.prompt), at);
      assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
      assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
      if (ex.answer.k === "pick") assert.equal(new Set(ex.answer.options.map((o) => o.text)).size, ex.answer.options.length, at);
      if (/leak|velocity|population|flows into/.test(ex.prompt)) {
        assert.equal(level, 3, "the settings are only at the hard level");
        settings++;
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
  assert.ok(settings > 60, String(settings));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("intApplications", L as 1 | 2 | 3)), [12, 12, 13]);
});
