// The shape of a graph from f′ and f″ (#746): every stationary question is right with its own answer and wrong with
// each slip, named with its hint filled in; picks have distinct options; the new kinds' slips all come up; the sign
// chart and graph questions carry a picture; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const IDS = ["intervalsSwapped", "oneIntervalOnly", "extremumKindSwapped", "zeroWithoutSignChange", "concavityFromSlope", "zeroAloneJustifies", "signChangeReversed",
  "extremeXForValue", "localMaxAsAbsolute", "concavityIntervalsSwapped", "stationaryForInflection", "secondTestSwapped", "zeroSecondMeansInflection", "slopeForBending",
  "concavitySignSwapped", "allZerosCounted", "countSwapped", "derivativeOrderSwapped", "fForDerivative"];

test("stationary: every question is right with its answer and every slip is named", () => {
  const seen = new Set<string>();
  let pics = 0;
  let settings = 0;
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 400; seed++) {
      const ex = exercise("stationary", level, seed, w);
      const at = `${level}/${seed} ${ex.prompt}`;
      assert.ok(!/\{\w+\}/.test(ex.prompt), at);
      assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
      assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
      if (ex.answer.k === "pick") assert.equal(new Set(ex.answer.options.map((o) => o.text)).size, ex.answer.options.length, at);
      if (/sign chart|graph shows|graphs are|graph of f/.test(ex.prompt)) {
        assert.ok(ex.pic && !/NaN/.test(ex.pic.svg(0, 0)), at);
        pics++;
      }
      if (/phone|rumour/.test(ex.prompt)) {
        assert.equal(level, 3, "the new setting is only at the hard level");
        settings++;
      }
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${at} ${t.id}`);
        assert.equal(v.mistake, t.id, `${at} ${t.input}`);
        assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
      }
    }
  for (const id of IDS) assert.ok(seen.has(id), id);
  assert.ok(pics > 100, String(pics));
  assert.ok(settings > 20, String(settings));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("stationary", L as 1 | 2 | 3)), [10, 10, 10]);
});
