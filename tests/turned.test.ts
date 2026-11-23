// The solid of revolution by hand (#567) and the 3D matrix (#567): the faces, limits, slabs and the determinant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import {
  moveLimit, pickPreset, place, rimPoint, setSlices, slabFaces, slabSum, smoothFaces, TURNED_PRESETS, TURNED_START, turnedRevolution, type LiveTurned,
} from "../src/math/turned.ts";
import { between, cubeImage, det3, detSays, detWorking, setColumn, setEntry } from "../src/math/cubeMatrix.ts";

const w = en.revWords;
const rev = (s: LiveTurned) => {
  const r = turnedRevolution(s, w);
  assert.ok("ok" in r, "error" in r ? r.error : "");
  return r.ok;
};

test("every preset turns at its own limits", () => {
  for (const p of TURNED_PRESETS) rev(pickPreset(TURNED_START, p.key));
});

test("y = x² on 0..2 about x: V = 32π/5, and the slabs close in on it", () => {
  const r = rev(TURNED_START);
  assert.equal(r.exact, "32π/5");
  const errs = [4, 10, 40].map((n) => Math.abs(rev(setSlices(TURNED_START, n)).approx - r.volume));
  assert.ok(errs[0] > errs[1] && errs[1] > errs[2], String(errs));
});

test("a turned point stays as far from the axis, and goes round away from the viewer first", () => {
  for (const th of [0, 0.7, 2, 4]) {
    const p = place("x", 1.5, 2, th);
    assert.ok(Math.abs(Math.hypot(p[1], p[2]) - 2) < 1e-12);
    const q = place("y", 1.5, 2, th);
    assert.ok(Math.abs(Math.hypot(q[0], q[1]) - 1.5) < 1e-12 && q[2] === 2);
  }
  assert.ok(place("x", 1, 1, 0.5)[1] > 0);
});

test("the flat region at sweep 0, the whole solid at 360 with no flat ends", () => {
  const r = rev(TURNED_START);
  const flat = smoothFaces(r, "x", 0);
  assert.ok(flat.every((f) => f.tag === "region" || f.pts.every((p) => Math.abs(p[1]) < 1e-9)));
  const whole = smoothFaces(r, "x", 360);
  assert.equal(whole.filter((f) => f.tag === "region").length, 0);
  // Turned all the way round, the outer surface's last ring meets its first.
  assert.ok(whole.some((f) => f.tag === "outer"));
});

test("a limit only moves where the region can still be turned", () => {
  const sphere = pickPreset(TURNED_START, "sphere");
  assert.equal(moveLimit(sphere, "b", 3.5, w).b, 3); // √(9 − x²) is not defined past 3
  assert.equal(moveLimit(sphere, "b", 2.5, w).b, 2.5);
  assert.equal(moveLimit(TURNED_START, "a", 2, w).a, 0); // a would meet b
  const shell = pickPreset(TURNED_START, "shell");
  assert.equal(moveLimit(shell, "a", -1, w).a, 0); // shells keep the region on one side of the y-axis
});

test("a pulled slab is read with its numbers, and lets go when the slabs are fewer", () => {
  const s = { ...setSlices(TURNED_START, 4), pulled: 3 };
  const r = rev(s);
  assert.equal(slabSum(r, "x", 3), "π × 3.06² × 0.5 ≈ 14.73");
  assert.equal(setSlices(s, 3).pulled, null);
  assert.equal(setSlices(s, 5).pulled, 3);
  // The pulled slab is whole and away from the rest.
  const faces = slabFaces(r, "x", 180, 3);
  const pulled = faces.filter((f) => f.tag === "pulled");
  assert.ok(pulled.length > 0 && pulled.every((f) => f.pts.every((p) => p[2] < -2)));
  const washer = rev(setSlices(pickPreset(TURNED_START, "washer"), 2));
  assert.match(slabSum(washer, "x", 0), /^π × \(0\.25² − 0\.06²\) × 0\.5 ≈ /);
  const shells = rev(setSlices(pickPreset(TURNED_START, "shell"), 2));
  assert.match(slabSum(shells, "y", 1), /^2π × 1\.5 × 2\.25 × 1 ≈ 21\.21$/);
});

test("the sweep handle sits on the rim, turned as far as the solid", () => {
  const r = rev(TURNED_START);
  const { at, way } = rimPoint(r, "x", 90);
  assert.ok(Math.abs(at[0] - 2) < 1e-9 && Math.abs(at[1] - 4) < 1e-9 && Math.abs(at[2]) < 1e-9);
  assert.ok(Math.hypot(...way) > 0);
});

test("det M is the cube's volume: flattened 0, inside out negative", () => {
  const M = [2, 1, 0, 0, 1, 1, 1, 0, 1];
  assert.equal(det3(M), 3);
  assert.equal(detWorking(M), "det M = 2·1 − 1·(−1) + 0·(−1) = 3");
  assert.equal(detSays(M), "grown");
  assert.equal(detSays([1, 0, 0, 0, 1, 0, 0, 0, 0]), "flat");
  assert.equal(detSays([1, 0, 0, 0, 1, 0, 0, 0, -1]), "flipped");
  assert.equal(detSays([1, 0, 1, 0, 1, 0, 0, 0, 1]), "same");
  // From I to M: at 0 it is the identity, at 100 it is M.
  assert.deepEqual(between(M, 0), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(between(M, 100), M);
  // The cube's image: six faces whose corners are M's columns' sums.
  const faces = cubeImage(M);
  assert.equal(faces.length, 6);
  assert.ok(faces.some((f) => f.pts.some((p) => p[0] === 3 && p[1] === 2 && p[2] === 2)));
});

test("a column's tip lands on whole numbers in range, and so does an entry", () => {
  const m = setColumn([1, 0, 0, 0, 1, 0, 0, 0, 1], 1, [0.4, 2.6, -7]);
  assert.deepEqual(m, [1, 0, 0, 0, 3, 0, 0, -3, 1]);
  assert.deepEqual(setEntry(m, 0, 9), [3, 0, 0, 0, 3, 0, 0, -3, 1]);
});
