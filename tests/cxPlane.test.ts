// The complex plane piece (#732): the rounds' targets (a point, a sum, i times a number, a conjugate), each wrong tap
// named for the slip it shows, a right tap standing until Next, and the numbers said back with a true minus.
import assert from "node:assert/strict";
import { test } from "node:test";
import { en } from "../src/locales/en.ts";
import { again, CX_LADDER, CX_PLANE_START, cxSay, missOf, next, roundOf, tap, target } from "../src/math/cxPlane.ts";

test("the rounds: 3 + 2i, z + w, i·z a quarter turn, the conjugate a mirror", () => {
  assert.deepEqual(CX_LADDER.map((r) => r.kind), ["plot", "add", "times", "conj"]);
  assert.deepEqual(CX_LADDER.map((r) => cxSay(target(r))), ["3 + 2i", "3 + 4i", "−1 + 3i", "2 − 3i"]);
  // Every round's rule is written for its own numbers.
  for (const [k, r] of CX_LADDER.entries()) assert.ok(en.live.cxPlane[`rule${k}` as "rule0"].includes(cxSay(target(r))), `rule${k}`);
});

test("each wrong tap is named for what it shows", () => {
  const [plot, add, times, conj] = CX_LADDER;
  assert.equal(missOf(plot, [2, 3]), "swapped");
  assert.equal(missOf(add, [1, -2]), "minus");
  assert.equal(missOf(add, [-1, 2]), "minus");
  assert.equal(missOf(times, [1, -3]), "wrongWay");
  assert.equal(missOf(times, [1, 3]), "iPlus");
  assert.equal(missOf(conj, [-2, 3]), "otherMirror");
  assert.equal(missOf(conj, [-2, -3]), "negated");
  assert.equal(missOf(conj, [4, 4]), "other");
  assert.equal(missOf(conj, [2, -3]), null);
  for (const m of ["swapped", "minus", "wrongWay", "iPlus", "otherMirror", "negated", "other"]) assert.ok(en.live.cxPlane[`miss_${m}` as "miss_other"].includes("{p}"), m);
});

test("a right tap stands until Next; the ladder ends and starts again", () => {
  let s = tap(CX_PLANE_START, [2, 3]);
  assert.deepEqual(s, { round: 0, tapped: [2, 3], ok: false });
  s = tap(s, [3.2, 9]);
  assert.deepEqual(s.tapped, [3, 5], "kept on the plane");
  s = tap(s, [3, 2]);
  assert.equal(s.ok, true);
  assert.equal(tap(s, [0, 0]), s);
  s = next(s);
  assert.deepEqual(s, { round: 1, tapped: null, ok: false });
  for (let i = 0; i < 5; i++) s = next(s);
  assert.equal(roundOf(s), null);
  assert.equal(tap(s, [1, 1]), s);
  assert.deepEqual(again(), CX_PLANE_START);
  assert.deepEqual([cxSay([0, 0]), cxSay([-5, 0]), cxSay([0, -1]), cxSay([0, 4]), cxSay([-1, 1])], ["0", "−5", "−i", "4i", "−1 + i"]);
});
