// Parametric, vector and polar calculus (#750): every parametric question is right with its own answer and wrong with
// each slip, named with its hint filled in; the new kinds' slips all come up; L1 is as it was; polar calculus and motion
// from a velocity are only at the hard level; the grades stay.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const IDS = ["secondDerivNotDivided", "secondDerivRatio", "vecPositionForVelocity", "velocityForAcceleration", "startPointLeftOut", "velocityForPosition",
  "polarProductDropped", "polarSinSignSlip", "polarSlopeAsDrDtheta", "polarSlopeUpsideDown", "polarRadiiSubtracted", "polarArcRadiusOnly", "polarArcNotRooted"];

test("parametric: every question is right with its answer and every new slip is named", () => {
  const seen = new Set<string>();
  let hard = 0;
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 400; seed++) {
      const ex = exercise("parametric", level, seed, w);
      const at = `${level}/${seed} ${ex.prompt}`;
      assert.ok(!/\{\w+\}/.test(ex.prompt), at);
      assert.ok(!/NaN|undefined|Infinity/.test(ex.prompt + ex.q + ex.show + (ex.steps ?? []).join(" ")), at);
      assert.ok(check(ex, ex.plain, w).ok, `${at} ${ex.plain}`);
      if (/polar curve|velocity shown/.test(ex.prompt)) {
        assert.equal(level, 3, "polar calculus and motion are only at the hard level");
        hard++;
      }
      for (const t of trapInputs(ex)) {
        if (level === 1) assert.ok(!IDS.includes(t.id), at);
        if (!IDS.includes(t.id)) continue;
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${at} ${t.id}`);
        assert.equal(v.mistake, t.id, `${at} ${t.input}`);
        assert.ok(v.hint && v.hint.length > 20 && !/\{\w+\}/.test(v.hint), `${at} ${t.id} ${v.hint}`);
      }
    }
  for (const id of IDS) assert.ok(seen.has(id), id);
  assert.ok(hard > 100, String(hard));
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("parametric", L as 1 | 2 | 3)), [12, 12, 13]);
});
