// Accumulation: left sums fall short and right sums overshoot on the rising curve, middles come closest, and every
// sum closes in as n grows; every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { FILL_AREA, riemann } from "../src/math/accumulation.ts";

const w = en.pracWords;

test("left sums are too little, right sums too much, middles closest, and all close in", () => {
  for (let n = 1; n <= 16; n++) {
    const [l, r, m] = [0, 1, 2].map((k) => riemann(k, n));
    assert.ok(l < FILL_AREA && r > FILL_AREA, `${n}`);
    assert.ok(Math.abs(m - FILL_AREA) < FILL_AREA - l, `${n}`);
    if (n > 1) assert.ok(Math.abs(riemann(0, n) - FILL_AREA) < Math.abs(riemann(0, n - 1) - FILL_AREA));
  }
  assert.ok(Math.abs(riemann(2, 1000) - FILL_AREA) < 1e-5);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("accumulation", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      assert.ok(!/\{[a-z0-9]+\}/.test(JSON.stringify(ex.answer) + ex.prompt), `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20 && !v.hint.includes("{"), `${level}/${seed} ${t.id} ${v.hint}`);
      }
    }
  for (const id of ["leftForRight", "widthForgotten", "overUnderSwapped", "midpointMissed", "gForGPrime", "ftcChainForgotten", "startForgotten", "rateTimesTime", "averageNotDivided", "netAsTotal", "totalAsNet", "rectangleForTriangle"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("accumulation", L as 1 | 2 | 3)), [12, 12, 12]);
});
