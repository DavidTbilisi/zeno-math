// Derivatives in context: both sheets' largest boxes sit where V′ = 0; every question is right with its own answer and
// wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { boxSlope, boxVolume, SHEETS } from "../src/math/derivContext.ts";

const w = en.pracWords;

test("each sheet's largest box is where V′ = 0, at x = 2 (128) and x = 3 (576)", () => {
  for (const [[L, W], x, v] of [[SHEETS[0], 2, 128], [SHEETS[1], 3, 576]] as const) {
    assert.equal(boxSlope(L, W, x), 0);
    assert.equal(boxVolume(L, W, x), v);
    for (let q = 0; q <= 2 * W; q++) assert.ok(boxVolume(L, W, q / 4) <= v);
    // V′ matches the volume's change over a tiny step.
    assert.ok(Math.abs((boxVolume(L, W, 1.0001) - boxVolume(L, W, 1)) / 0.0001 - boxSlope(L, W, 1)) < 0.1);
  }
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("derivContext", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!/\{[a-z]+\}/.test(JSON.stringify(ex.answer) + ex.prompt), `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20 && !v.hint.includes("{"), `${level}/${seed} ${t.id} ${v.hint}`);
      }
    }
  for (const id of ["rateAsValue", "rateOverInterval", "positionForVelocity", "accelSignOnly", "stepNotScaled", "xForStep", "maxMinSwapped", "endpointRootKept", "fourSidesAssumed", "endpointsIgnored"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("derivContext", L as 1 | 2 | 3)), [12, 12, 12]);
});
