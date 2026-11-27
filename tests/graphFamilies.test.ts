// Graph families (#726): the equation of a square or cube root graph and of an exponential graph, even, odd or
// neither from a table or a graph, h read off a log graph; a parking fee read off its step graph, a piecewise graph
// read at its joint, y = ±|x − h| + k picked from its graph and a in y = a|x|. Every slip is named and its hint
// filled in, in every language; the parity tables and the fees follow from what is shown.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, trapInputs, type SkillId } from "../src/math/practice.ts";

const IDS: Partial<Record<SkillId, string[]>> = {
  fnTransform: ["shiftWrongWay", "shiftAxesSwapped", "graphFamilyConfused", "baseStartSwapped", "growthDecayConfused", "parityMisread", "asymptoteForIntercept"],
  absoluteValue: ["stepEndMisread", "piecewiseWrongPiece", "vertexSignH", "shiftAxesSwapped", "absOpensWrongWay", "absScaleInverted"],
};

for (const [skill, ids] of Object.entries(IDS) as [SkillId, string[]][])
  test(`${skill}: the new kinds' slips are named, their hints filled in`, () => {
    const named = new Set<string>();
    for (const words of [en, ka, ru])
      for (const level of [1, 2, 3] as const)
        for (let seed = 1; seed <= 250; seed++) {
          const w = words.pracWords;
          const ex = exercise(skill, level, seed, w);
          assert.equal(check(ex, ex.plain, w).ok, true, `${level} ${seed} ${ex.prompt}`);
          assert.ok(!/undefined|NaN|\{\w+\}/.test(ex.prompt + ex.plain + (ex.pic ? ex.pic.svg(0, 0) : "")), ex.prompt);
          for (const t of trapInputs(ex)) {
            const v = check(ex, t.input, w);
            assert.equal(v.mistake, t.id, `${level} ${seed} ${ex.prompt} ${t.input}`);
            assert.ok(v.hint && !/\{\w+\}|undefined|NaN/.test(v.hint), v.hint);
            named.add(t.id);
          }
        }
    for (const id of ids) assert.ok(named.has(id), id);
  });

test("a parity table's answer follows from its values, a parking fee from its hours", () => {
  const w = en.pracWords;
  let [tables, fees] = [0, 0];
  for (let seed = 1; seed <= 400; seed++) {
    const ex = exercise("fnTransform", 2, seed, w);
    const row = /\\hline f\(x\) & ([^\\]*)/.exec(ex.q);
    if (row) {
      const f = row[1].split(" & ").map(Number);
      const even = [1, 2, 3].every((x) => f[3 - x] === f[3 + x]);
      const odd = [0, 1, 2, 3].every((x) => f[3 - x] === -f[3 + x]);
      assert.equal(ex.plain, even ? w.qft.even : odd ? w.qft.odd : w.qft.neither, ex.q);
      tables++;
    }
    const park = exercise("absoluteValue", 3, seed, w);
    const m = /costs (\d) GEL .* f\(([\d.]+)\)/.exec(park.prompt);
    if (m) {
      assert.equal(Number(park.plain), Number(m[1]) * Math.ceil(Number(m[2])), park.prompt);
      fees++;
    }
  }
  assert.ok(tables > 10 && fees > 10, `${tables} ${fees}`);
});
