// The matrix plane piece (#734): each round's columns are where (1, 0) and (0, 1) land, a wrong tap is named (a row
// read across, the point unmoved, another point), both found end the round, and the rules quote each round's numbers.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, apply, column, det, MAT_LADDER, MAT_PLANE_START, mapSay, matOf, missOf, next, sayPt, tap, UNITS } from "../src/math/matPlane.ts";

test("the rounds: a stretch, a quarter turn, a reflection, a shear, a parallelogram of area 3", () => {
  assert.deepEqual(MAT_LADDER.map(det), [2, 1, -1, 1, 3]);
  for (const [k, m] of MAT_LADDER.entries()) {
    for (const j of [0, 1] as const) assert.deepEqual(apply(m, UNITS[j]), column(m, j));
    assert.ok(en.live.matPlane[`rule${k}` as "rule0"].includes(sayPt(column(m, 1))), `rule${k}`);
  }
  assert.equal(mapSay(MAT_LADDER[1]), "M(x, y) = (0x − 1y, 1x + 0y)");
});

test("a wrong tap is named; both images found end the round", () => {
  const turn = MAT_LADDER[1];
  assert.equal(missOf(turn, 0, [0, -1]), "row");
  assert.equal(missOf(turn, 0, [1, 0]), "same");
  assert.equal(missOf(turn, 0, [3, 3]), "other");
  assert.equal(missOf(turn, 0, [0, 1]), null);
  let s = next(MAT_PLANE_START);
  s = tap(s, [0, -1]);
  assert.deepEqual(s, { round: 1, found: 0, miss: [0, -1] });
  s = tap(s, [0.2, 1.1]);
  assert.deepEqual(s, { round: 1, found: 1, miss: null });
  s = tap(s, [-1, 0]);
  assert.equal(s.found, 2);
  assert.equal(tap(s, [2, 2]), s, "a solved round stands until Next");
  for (let i = 0; i < 6; i++) s = next(s);
  assert.equal(matOf(s), null);
  assert.deepEqual(again(), MAT_PLANE_START);
  for (const m of ["row", "same", "other"]) assert.ok(en.live.matPlane[`miss_${m}` as "miss_other"].includes("{p}"), m);
});
