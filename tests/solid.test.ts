// The solid live piece (#564): volume and surface area worked from the solid's own numbers, nets that open flat with
// their pieces adding up to the surface area, slices named for the shape they make (a cone's four conics among them),
// unit cubes filling a cuboid layer by layer, and the view that turns it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coneSlant, corners, cubeFaces, cutArea, cutFaces, cutName, cutPlane, fmt, measures, modesOf, netFaces, netParts, netSum, ngonArea,
  pickShape, polyArea, resize, seen, seenWay, SOLID_SHAPES, SOLID_START, solidFaces, type LiveSolid, type V3,
} from "../src/math/solid.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const as = (patch: Partial<LiveSolid>): LiveSolid => ({ ...SOLID_START, ...patch });
const sliced = (s: LiveSolid) => {
  const pl = cutPlane(s);
  const { cut } = cutFaces(s, pl);
  return { name: cutName(s, pl, cut), area: cutArea(s, pl, cut), pl, cut };
};

test("volume and surface area from the solid's own numbers", () => {
  const box = measures(as({ a: 4, b: 3, c: 5 }));
  assert.equal(box.V, 60);
  assert.equal(box.S, 94);
  assert.deepEqual(box.lines, ["V = 4 × 3 × 5 = 60", "S = 2 × (12 + 15 + 20) = 94"]);
  close(measures(as({ shape: "cylinder", a: 3, c: 5 })).V, Math.PI * 45);
  assert.match(measures(as({ shape: "cylinder", a: 3, c: 5 })).lines[0], /= 45π ≈ 141\.37$/);
  close(measures(as({ shape: "cone", a: 3, c: 4 })).S, Math.PI * 9 + Math.PI * 15);
  close(measures(as({ shape: "sphere", a: 2 })).V, (32 / 3) * Math.PI);
  close(measures(as({ shape: "pyramid", n: 4, a: 6, c: 4 })).V, 48);
  close(measures(as({ shape: "pyramid", n: 4, a: 6, c: 4 })).S, 36 + 4 * 15);
  close(measures(as({ shape: "prism", n: 4, a: 2, c: 3 })).V, 12);
  close(ngonArea(6, 2), 6 * Math.sqrt(3));
  assert.equal(fmt(2.5), "2.50");
  assert.equal(fmt(-3), "−3");
});

test("the faces close up into the solid: their areas are its surface area", () => {
  for (const shape of SOLID_SHAPES) {
    const s = as({ shape, a: 3, b: 2, c: 4, n: 5 });
    const area = solidFaces(s).faces.reduce((t, f) => t + polyArea(f.pts), 0);
    // Round solids are drawn as facets, so their area is a little short.
    close(area, measures(s).S, shape === "sphere" ? 1.5 : shape === "cylinder" || shape === "cone" ? 0.2 : 1e-9);
  }
});

test("a net opens flat beside the base, every piece keeping its area and the base staying put", () => {
  for (const shape of ["cuboid", "prism", "pyramid", "cylinder", "cone"] as const) {
    const s = as({ shape, a: 3, b: 2, c: 4, n: 6 });
    const flat = netFaces(s, 1);
    const shut = solidFaces(s).faces;
    for (const f of flat) for (const p of f.pts) close(p[2], -s.c / 2, 1e-6);
    flat.forEach((f, i) => close(polyArea(f.pts), polyArea(shut[i].pts), 1e-6));
    assert.deepEqual(flat[0].pts, shut[0].pts);
    // Opened out, not folded in: every face's outside faces down, as the base's does.
    for (const f of flat) close(f.n[2], -1, 1e-6);
    // Half open is neither.
    assert.ok(netFaces(s, 0.5).some((f) => f.pts.some((p) => Math.abs(p[2] + s.c / 2) > 0.1)));
  }
  assert.deepEqual(netFaces(SOLID_START, 0).map((f) => f.pts), solidFaces(SOLID_START).faces.map((f) => f.pts));
});

test("the net's pieces add up to the surface area", () => {
  assert.equal(netSum(as({ a: 4, b: 3, c: 5 })), "S = 12 + 12 + 20 + 20 + 15 + 15 = 94");
  assert.match(netSum(as({ shape: "cylinder", a: 1, c: 2 })), /^S ≈ 3\.14 \+ 3\.14 \+ 12\.57 ≈ 18\.85$/);
  assert.equal(netParts(as({ shape: "pyramid", n: 3 })).length, 4);
  assert.equal(netParts(as({ shape: "sphere" })).length, 1);
});

test("a cube sliced level is a square, on the slant through its middle a hexagon, across a corner a triangle", () => {
  const cube = as({ a: 4, b: 4, c: 4, mode: "cut" });
  const level = sliced({ ...cube, cutAt: 30 });
  assert.equal(level.name, "square");
  close(level.area, 16);
  // The normal along a long diagonal of the cube: (−1, 1, 1).
  const diag = { ...cube, tilt: 55, spin: 45 };
  assert.equal(sliced({ ...diag, cutAt: 50 }).name, "hexagon");
  assert.equal(sliced({ ...diag, cutAt: 92 }).name, "triangle");
  assert.equal(sliced({ ...as({ a: 4, b: 3, c: 5 }), cutAt: 40 }).name, "rectangle");
  assert.equal(sliced({ ...cube, tilt: 30, cutAt: 50 }).name, "rectangle");
  assert.equal(sliced({ ...cube, tilt: 30, spin: 20, cutAt: 50 }).name, "parallelogram");
  assert.equal(sliced({ ...as({ shape: "pyramid", n: 4, a: 4, c: 4 }), tilt: 20, cutAt: 40 }).name, "trapezium");
  assert.equal(sliced({ ...as({ shape: "pyramid", n: 4, a: 4, c: 4 }), tilt: 0, cutAt: 40 }).name, "square");
  assert.equal(sliced({ ...as({ shape: "prism", n: 5, a: 3, c: 4 }), cutAt: 50 }).name, "pentagon");
  assert.equal(sliced({ ...as({ shape: "prism", n: 6, a: 3, c: 4 }), tilt: 90, cutAt: 50 }).name, "rectangle");
});

test("a cone sliced four ways gives the circle, the ellipse, the parabola and the hyperbola", () => {
  const cone = as({ shape: "cone", a: 3, c: 4, mode: "cut" });
  const slant = coneSlant(cone);
  const circle = sliced({ ...cone, tilt: 0, cutAt: 50 });
  assert.equal(circle.name, "circle");
  close(circle.area, Math.PI * 1.5 * 1.5, 0.01);
  assert.equal(sliced({ ...cone, tilt: 20, cutAt: 50 }).name, "ellipse");
  assert.equal(sliced({ ...cone, tilt: 45, cutAt: 30 }).name, "ellipsePart");
  // Within a degree and a half of the slant, the slice lies along it.
  const near = sliced({ ...cone, tilt: Math.round(slant), cutAt: 50 });
  assert.equal(near.name, "parabola");
  close(near.pl.tilt, slant);
  assert.equal(sliced({ ...cone, tilt: 75, cutAt: 30 }).name, "hyperbola");
  assert.equal(sliced({ ...cone, tilt: 90, cutAt: 30 }).name, "hyperbola");
  // Upright through the tip, the two straight sides: a triangle.
  assert.equal(sliced({ ...cone, tilt: 90, cutAt: 50 }).name, "triangle");
});

test("a cylinder's slices are a circle, an ellipse, part of one and a rectangle; a sphere's are circles", () => {
  const can = as({ shape: "cylinder", a: 2, c: 6, mode: "cut" });
  const level = sliced({ ...can, cutAt: 20 });
  assert.equal(level.name, "circle");
  close(level.area, 4 * Math.PI, 0.02);
  const oval = sliced({ ...can, tilt: 30, cutAt: 50 });
  assert.equal(oval.name, "ellipse");
  close(oval.area, (4 * Math.PI) / Math.cos(Math.PI / 6), 0.05);
  assert.equal(sliced({ ...can, tilt: 70, cutAt: 50 }).name, "ellipsePart");
  assert.equal(sliced({ ...can, tilt: 90, cutAt: 50 }).name, "rectangle");
  const ball = sliced({ ...as({ shape: "sphere", a: 3 }), tilt: 40, cutAt: 50 });
  assert.equal(ball.name, "circle");
  close(ball.area, 9 * Math.PI, 0.05);
});

test("the slice's two parts and its face share the cut", () => {
  const s = as({ a: 4, b: 4, c: 4, tilt: 55, spin: 45, cutAt: 50 });
  const { below, above, cut } = cutFaces(s);
  assert.equal(corners(cut).length, 6);
  const total = (fs: { pts: V3[] }[]) => fs.reduce((t, f) => t + polyArea(f.pts), 0);
  // Through the middle the two halves are alike, each the cube's half plus the hexagon.
  close(total(below), total(above), 1e-6);
  close(total(below), 48 + polyArea(cut), 1e-6);
});

test("a cuboid fills with unit cubes a layer at a time", () => {
  const s = as({ a: 3, b: 2, c: 4 });
  assert.equal(cubeFaces(s, 0).length, 0);
  const one = cubeFaces(s, 1);
  // Top and bottom 3 × 2 each, sides 2 × (3 + 2) per layer.
  assert.equal(one.length, 12 + 10);
  assert.equal(cubeFaces(s, 4).length, 12 + 40);
  for (const f of one) close(polyArea(f.pts), 1);
});

test("the tray keeps the sizes, and what the hand does fits the shape", () => {
  assert.deepEqual(modesOf("sphere"), ["turn", "cut"]);
  assert.deepEqual(modesOf("cuboid"), ["turn", "open", "cut", "fill"]);
  const filling = { ...SOLID_START, mode: "fill" as const };
  assert.equal(pickShape(filling, "cylinder").mode, "turn");
  assert.equal(pickShape({ ...SOLID_START, mode: "open" }, "sphere").mode, "turn");
  assert.equal(pickShape({ ...SOLID_START, mode: "cut" }, "cone").mode, "cut");
  assert.equal(pickShape(SOLID_START, "pyramid").n, 4);
  assert.equal(pickShape(SOLID_START, "prism").n, 3);
  assert.equal(pickShape({ ...SOLID_START, n: 6 }, "cone").n, 6);
  assert.deepEqual(resize({ ...SOLID_START, layers: 5 }, "c", 3), { ...SOLID_START, layers: 3, c: 3 });
  assert.equal(resize(SOLID_START, "a", 12).a, 8);
  assert.equal(resize(SOLID_START, "a", 0.2).a, 1);
});

test("the view: from the front, up is up and the front is nearest; from above, the top is", () => {
  const front = { yaw: 0, pitch: 0 };
  assert.deepEqual(seen([1, 0, 2], front).map((v) => Math.round(v * 1e9) / 1e9), [1, 2, 0]);
  close(seen([0, -1, 0], front)[2], 1);
  close(seen([0, 0, 1], { yaw: 0, pitch: 90 })[2], 1);
  close(seenWay([0, -1, 0], { yaw: 90, pitch: 0 })[0], 1);
});
