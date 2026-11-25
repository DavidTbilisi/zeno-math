// Rational functions: the piece's three graphs, their walls, hole and far-out lines; every question is right with its
// own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { short, WALK_FNS } from "../src/math/rational.ts";

const w = en.pracWords;

test("the walls, the hole and the lines far out", () => {
  const [flat, hole, slant] = WALK_FNS;
  assert.equal(flat.bottom(flat.wall), 0);
  assert.notEqual(flat.top(flat.wall), 0);
  assert.equal(hole.top(hole.wall), 0);
  assert.equal(hole.bottom(hole.wall), 0);
  assert.ok(Math.abs(flat.top(1000) / flat.bottom(1000) - 2) < 0.01);
  assert.ok(Math.abs(slant.top(1000) / slant.bottom(1000) - slant.line(1000)) < 0.01);
  assert.equal(short(-2.456), "−2.46");
  assert.equal(short(-0.001), "0");
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 200; seed++) {
      const ex = exercise("rationalFn", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["vaFromNumerator", "vaSignKept", "zeroFromDenominator", "domainFromNumerator", "domainNotRooted", "haFromConstants", "haUpsideDown", "haDegreesIgnored", "holeAsZero", "slantSignKept", "slantNumeratorOnly", "asymptoteNoSignChange", "averageToZero", "fixedCostKept"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("rationalFn", L as 1 | 2 | 3)), [10, 12, 12]);
});
