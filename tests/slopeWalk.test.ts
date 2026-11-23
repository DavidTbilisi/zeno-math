// Walk the slope: across is walked × cos θ and up is walked × sin θ, at the top they are cos θ and sin θ, the
// walk and the angle stay on the slope, and a point is read as the angle and the part walked it shows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { atOn, clampAt, clampTheta, dec2, SLOPE_THETA, SLOPE_WALK_START, thetaAt, walkParts } from "../src/math/slopeWalk.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("across is walked × cos θ, up is walked × sin θ", () => {
  for (const theta of [5, 30, 45, 60, 85])
    for (const at of [0, 25, 60, 100]) {
      const p = walkParts({ theta, at });
      close(p.far, (at / 100) * Math.cos((theta * Math.PI) / 180));
      close(p.tall, (at / 100) * Math.sin((theta * Math.PI) / 180));
      // Across and up make the part walked: Pythagoras on the walker's own triangle.
      close(Math.hypot(p.far, p.tall), at / 100);
    }
});

test("at the top the walk is the whole 1: across is cos θ and up is sin θ", () => {
  const p = walkParts({ theta: 30, at: 100 });
  close(p.far, p.cos);
  close(p.tall, p.sin);
  assert.equal(dec2(p.tall), "0.50");
  assert.equal(dec2(p.far), "0.87");
});

test("the angle and the walk stay on the slope", () => {
  assert.equal(clampTheta(0), SLOPE_THETA[0]);
  assert.equal(clampTheta(120), SLOPE_THETA[1]);
  assert.equal(clampTheta(44.6), 45);
  assert.equal(clampAt(-3), 0);
  assert.equal(clampAt(130), 100);
  assert.ok(SLOPE_WALK_START.theta >= SLOPE_THETA[0] && SLOPE_WALK_START.theta <= SLOPE_THETA[1]);
});

test("a point is read as the angle pointing at it and the part of the slope under it", () => {
  assert.equal(thetaAt(1, 1), 45);
  assert.equal(thetaAt(1, 0), SLOPE_THETA[0]);
  assert.equal(thetaAt(0, 1), SLOPE_THETA[1]);
  assert.equal(thetaAt(-1, -1), SLOPE_THETA[0]);
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  assert.equal(atOn(30, 0.4 * c, 0.4 * s), 40);
  assert.equal(atOn(30, 2, 2), 100);
  assert.equal(atOn(30, -1, 0), 0);
});
