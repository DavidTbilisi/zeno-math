// The surface live piece (#565): f(x, y) read as the Multivariable tool reads it, its partials and gradient, the
// contour map by marching squares (chained into lines), a fence g = c walked along with its highest and lowest points
// (where the contours touch: Lagrange), gradient descent on the hill, and a drag across the picture turned back into a
// move on the floor.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  along, arrowScale, contour, descend, fence, floorMove, fmt, gradient, grid, joinSegments, lambdaAt, levels, levelStep, movePoint, nearestT,
  pathExtrema, pathLength, pathOf, pickFn, readSurface, snapT, SURFACE_FNS, SURFACE_PRESETS, SURFACE_START, toStage, zRange, SIDE, FLOOR, onFloor,
  type P2,
} from "../src/math/surface.ts";
import { seen } from "../src/math/solid.ts";

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const F = (expr: string, half = 2) => {
  const f = readSurface(expr, half);
  assert.ok(f, expr);
  return f;
};

test("f(x, y) is read as the Multivariable tool reads it; what cannot be drawn is null", () => {
  close(F("x^2 y + sin(x y)")(1, 2), 2 + Math.sin(2));
  close(F("4e^(-(x^2 + 2y^2)/4)", 3)(0, 0), 4);
  assert.equal(readSurface("x^2 +", 2), null);
  assert.equal(readSurface("ln(-1 - x^2 - y^2)", 2), null);
  for (const fn of SURFACE_FNS) assert.ok(readSurface(SURFACE_PRESETS[fn].expr, SURFACE_PRESETS[fn].half), fn);
});

test("partial derivatives and the gradient at a point", () => {
  const [fx, fy] = gradient(F("x^2 y + sin(x y)"), 1, 2);
  close(fx, 4 + 2 * Math.cos(2), 1e-6);
  close(fy, 1 + Math.cos(2), 1e-6);
  const [sx, sy] = gradient(F("x^2 - y^2"), 0, 0);
  close(sx, 0);
  close(sy, 0);
});

test("the heights shown and round contour levels", () => {
  const g = grid(F("x^2 + y^2"), 2, 20);
  assert.deepEqual(zRange(g), [0, 8]);
  assert.equal(levelStep(0, 8), 1);
  assert.deepEqual(levels(0, 8), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(levelStep(-4, 4, 10), 1);
  // A spike in one corner does not flatten the rest.
  const spiky = grid(F("x^2 + y^2 + 1000e^(-20((x - 2)^2 + (y - 2)^2))"), 2, 20);
  assert.ok(zRange(spiky)[1] < 100);
  // On the stage the lowest point is at the hill's foot and the highest at its top.
  const at = toStage(2, [0, 8]);
  assert.deepEqual(at(0, 0, 0), [0, 0, -1]);
  close(at(2, -2, 8)[2], 1.4);
  assert.deepEqual(onFloor(2)(-2, 2), [-SIDE, SIDE, FLOOR]);
});

test("a contour of the bowl is a circle, chained into one closed loop", () => {
  const g = grid(F("x^2 + y^2"), 2, 40);
  const segs = contour(g, 1);
  for (const [p, q] of segs) for (const r of [p, q]) close(Math.hypot(...r), 1, 0.01);
  const lines = joinSegments(segs);
  assert.equal(lines.length, 1);
  const loop = pathOf(lines[0]);
  assert.ok(loop.closed);
  close(pathLength(loop), 2 * Math.PI, 0.01);
  // A saddle's level 0 is the two diagonals; level 1 two curves that open left and right.
  assert.equal(joinSegments(contour(grid(F("x^2 - y^2"), 2, 40), 1)).length, 2);
});

test("a path: a point along it, the nearest point to a place, a loop going round", () => {
  const line = pathOf([[0, 0], [1, 0], [1, 1]]);
  assert.equal(pathLength(line), 2);
  assert.deepEqual(along(line, 0.25), [0.5, 0]);
  assert.deepEqual(along(line, 0.75), [1, 0.5]);
  assert.deepEqual(along(line, 2), [1, 1]);
  close(nearestT(line, [2, 0.5]), 0.75);
  const square = pathOf([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
  assert.ok(square.closed);
  assert.deepEqual(along(square, 1.25), [1, 0]);
  assert.deepEqual(along(square, -0.25), [0, 1]);
});

test("Lagrange: the highest and lowest points on the fence, where the contours touch", () => {
  // x² + y² on x + y = 2: lowest at (1, 1).
  const bowl = F("x^2 + y^2");
  const line = fence(F("x + y"), 2, 2)!;
  const [m] = pathExtrema(line, bowl);
  assert.equal(m.kind, "min");
  close(m.x, 1, 1e-3);
  close(m.y, 1, 1e-3);
  close(m.v, 2, 1e-5);
  // There ∇f = λ∇g: (2, 2) = 2·(1, 1).
  close(lambdaAt(gradient(bowl, m.x, m.y), gradient(F("x + y"), m.x, m.y)), 2, 1e-3);
  // x² − y² on the unit circle: tops at (±1, 0), bottoms at (0, ±1).
  const saddle = F("x^2 - y^2");
  const circle = fence(F("x^2 + y^2"), 1, 2)!;
  assert.ok(circle.closed);
  const ext = pathExtrema(circle, saddle);
  assert.equal(ext.length, 4);
  for (const e of ext) {
    if (e.kind === "max") close(Math.abs(e.x), 1, 1e-3), close(e.v, 1, 1e-4);
    else close(Math.abs(e.y), 1, 1e-3), close(e.v, -1, 1e-4);
  }
  // The hill over the fence x + y = 2: highest where x = 2y, at (4/3, 2/3).
  const hill = SURFACE_PRESETS.hill;
  const top = pathExtrema(fence(F(hill.g, 3), hill.c, hill.half)!, F(hill.expr, 3));
  assert.equal(top.length, 1);
  assert.equal(top[0].kind, "max");
  close(top[0].x, 4 / 3, 1e-3);
  close(top[0].y, 2 / 3, 1e-3);
  // A point let go near the top lands on it; further off it stays.
  assert.equal(snapT(line, [m], m.t + 0.01), m.t);
  assert.equal(snapT(line, [m], m.t + 0.05), m.t + 0.05);
  // A fence that misses the square is none.
  assert.equal(fence(F("x^2 + y^2"), 100, 2), null);
});

test("gradient descent: down to the bottom of the bowl, off the hill when η is too big, faster with momentum", () => {
  const bowl = F("x^2 + y^2");
  const slow = descend(bowl, [1.5, -1], 0.1, 0, 30, 2);
  assert.equal(slow.away, false);
  assert.equal(slow.pts.length, 31);
  // Each step multiplies (x, y) by 1 − 2η = 0.8.
  close(slow.pts[1][0], 1.2, 1e-6);
  close(slow.pts[1][1], -0.8, 1e-6);
  assert.ok(Math.hypot(...slow.pts[30]) < 0.01);
  const wild = descend(bowl, [1.5, -1], 1.1, 0, 30, 2);
  assert.equal(wild.away, true);
  // In the ravine a small η crawls along it; momentum gets further in the same steps.
  const ravine = F(SURFACE_PRESETS.ravine.expr, 3);
  const f = (p: P2) => ravine(...p);
  const plain = descend(ravine, [-2.5, 1.2], 0.05, 0, 20, 3).pts.at(-1)!;
  const heavy = descend(ravine, [-2.5, 1.2], 0.05, 0.8, 20, 3).pts.at(-1)!;
  assert.ok(f(heavy) < f(plain));
  assert.ok(arrowScale(bowl, 2) > 0);
});

test("a drag across the picture moves the point on the floor under the pointer", () => {
  const view = { yaw: 330, pitch: 24 };
  const px = 70;
  const half = 2;
  // A move of (1, −0.5) on the floor, as the picture shows it, comes back as that move.
  const a = seen(onFloor(half)(0, 0), view);
  const b = seen(onFloor(half)(1, -0.5), view);
  const [dx, dy] = [px * (b[0] - a[0]), -px * (b[1] - a[1])];
  const [mx, my] = floorMove(view, px, half, dx, dy);
  close(mx, 1, 1e-9);
  close(my, -0.5, 1e-9);
});

test("the tray and the point keep the piece's state whole", () => {
  const s = pickFn({ ...SURFACE_START, mode: "lagrange", yaw: 10, steps: 4 }, "hill");
  assert.equal(s.mode, "lagrange");
  assert.equal(s.yaw, 10);
  assert.equal(s.steps, 0);
  assert.equal(s.expr, SURFACE_PRESETS.hill.expr);
  const m = movePoint(SURFACE_START, 5.123, -0.456);
  assert.deepEqual([m.x, m.y], [2, -0.46]);
  assert.equal(fmt(-0.004), "0");
  assert.equal(fmt(-1.5), "−1.5");
  assert.equal(fmt(2.345), "2.35");
});
