// The space piece (#566): the Vectors tool's exact working (surds and fractions) for vectors, the dot and cross
// products, lines and planes, its examples opened as scenes, and the hand: points dragged in the plane facing the
// viewer to whole numbers, keys along the axes seen across, up and deep, and looking straight down an axis.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clipLine, crossFacts, dotFacts, dragTo, handlesOf, keyStep, LIM, LOOK, lookingDown, planeEq, linePlane, pointLine, pointPlane, SPACE_EXAMPLES,
  SPACE_MODES, SPACE_START, symmText, tripleFacts, twoLines, twoPlanes, unseen, vectorFacts, type LiveSpace, type V3,
} from "../src/math/space.ts";
import { seen } from "../src/math/solid.ts";
import { VEC_PRESETS } from "../src/math/vectors.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const dot = (p: V3, q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const example = (mode: keyof typeof SPACE_EXAMPLES, i: number) => SPACE_EXAMPLES[mode][i].to(SPACE_START);

test("a vector's length and unit vector stay exact", () => {
  const f = vectorFacts([2, -1, 2]);
  assert.equal(f.squares, "2² + (−1)² + 2²");
  assert.equal(f.len, "3");
  assert.equal(f.unit, "(2/3, −1/3, 2/3)");
  assert.equal(vectorFacts([3, 1, 2]).len, "√14 ≈ 3.742");
  assert.equal(vectorFacts([1, 1, 0]).unit, "(√2/2, √2/2, 0)");
});

test("the dot product, the angle and the shadow of a on b", () => {
  const f = dotFacts([1, 2, 2], [2, -1, 2]);
  assert.equal(f.products, "1·2 + 2·(−1) + 2·2");
  assert.equal(f.dot, "4");
  assert.equal(f.cos, "4/9");
  assert.equal(f.shadow, "4/3");
  assert.equal(f.footText, "(8/9, −4/9, 8/9)");
  // The shadow's foot is on b, and a drops to it at a right angle.
  close(dot(sub([1, 2, 2], f.foot), [2, -1, 2]), 0);
  assert.equal(dotFacts([1, 1, 0], [0, 1, 1]).angle, "= 60°");
  assert.equal(dotFacts([2, 1, -1], [1, 1, 3]).right, true);
});

test("the cross product by its determinant measures the parallelogram", () => {
  const f = crossFacts([1, 2, 3], [4, 5, 6]);
  assert.deepEqual(f.c, [-3, 6, -3]);
  assert.equal(f.work, "(2·6 − 3·5, 3·4 − 1·6, 1·5 − 2·4)");
  assert.equal(f.area, "3√6 ≈ 7.348");
  assert.equal(f.half, "3√6/2 ≈ 3.674");
  assert.deepEqual(f.checks, ["0", "0"]);
  // a dragged onto b's line: nothing left.
  const flat = crossFacts([2, 4, 6], [1, 2, 3]);
  assert.equal(flat.zero, true);
  assert.equal(flat.area, "0");
  // △ABC from A(1, 0, 0), B(0, 2, 0), C(0, 0, 3): AB × AC = (6, 3, 2), seven long.
  const tri = crossFacts([-1, 2, 0], [-1, 0, 3]);
  assert.deepEqual(tri.c, [6, 3, 2]);
  assert.equal(tri.half, "7/2");
});

test("the scalar triple product: the box and the tetrahedron", () => {
  const box = tripleFacts([1, 2, 0], [0, 1, 3], [2, 0, 1]);
  assert.equal(box.v, "13");
  assert.equal(box.sixth, "13/6");
  const abcd = tripleFacts([2, 0, 0], [0, 3, 0], [1, 1, 4]);
  assert.equal(abcd.volume, "24");
  assert.equal(abcd.sixth, "4");
  assert.equal(tripleFacts([1, 0, 0], [0, 1, 0], [3, 4, 0]).flat, true);
});

test("a line: its Cartesian form, a point's foot and distance", () => {
  assert.equal(symmText([1, -1, 0], [2, 3, 1]), "(x − 1)/2 = (y + 1)/3 = z");
  assert.equal(symmText([1, 2, 0], [3, 1, 0]), "(x − 1)/3 = y − 2, z = 0");
  const f = pointLine([1, 0, 2], [2, -1, 1], [4, 3, 1]);
  assert.equal(f.t, "1/3");
  assert.equal(f.footText, "(5/3, −1/3, 7/3)");
  assert.equal(f.dist, "√165/3 ≈ 4.282");
  close(dot(sub([4, 3, 1], f.foot), [2, -1, 1]), 0);
  const on = pointLine([1, 0, 2], [2, -1, 1], [5, -2, 4]);
  assert.equal(on.on, true);
  assert.equal(on.t, "2");
});

test("two lines meet, run parallel or are skew, with the shortest way between", () => {
  const meet = twoLines([1, 2, 0], [1, -1, 2], [2, 4, 1], [0, 3, -1]);
  assert.equal(meet.kind, "meet");
  if (meet.kind === "meet") {
    assert.equal(meet.xText, "(2, 1, 2)");
    assert.deepEqual([meet.t, meet.s], ["1", "−1"]);
  }
  const skew = twoLines([1, 0, 0], [1, 1, 0], [0, 1, 2], [1, 0, 1]);
  assert.equal(skew.kind, "skew");
  if (skew.kind === "skew") {
    assert.equal(skew.dist, "4√3/3 ≈ 2.309");
    assert.equal(skew.n, "(1, −1, −1)");
    const pq = sub(skew.q, skew.p);
    close(Math.hypot(...pq), 4 / Math.sqrt(3));
    close(dot(pq, [1, 1, 0]), 0);
    close(dot(pq, [1, 0, 1]), 0);
  }
  const par = twoLines([0, 0, 0], [1, 0, 0], [0, 3, 4], [-2, 0, 0]);
  assert.deepEqual(par.kind === "parallel" && par.dist, "5");
  assert.equal(twoLines([0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]).kind, "same");
});

test("planes: the equation, a point's distance, a line piercing, two planes meeting", () => {
  assert.equal(planeEq([2, -1, 2], [1, 0, 2]), "2x − y + 2z = 6");
  assert.equal(planeEq([6, 3, 2], [1, 0, 0]), "6x + 3y + 2z = 6");
  assert.equal(planeEq([2, 2, 2], [2, 2, 2]), "x + y + z = 6");
  const p = pointPlane([2, -1, 2], [1, 0, 2], [4, 1, 5]);
  assert.equal(p.value, "17");
  assert.equal(p.dist, "11/3");
  assert.equal(p.footText, "(14/9, 20/9, 23/9)");
  assert.equal(pointPlane([2, -1, 2], [1, 0, 2], [3, 0, 0]).on, true);

  const l = linePlane([1, 1, 1], [2, 2, 2], [1, 0, 0], [1, 2, 3]);
  assert.equal(l.kind, "meet");
  if (l.kind === "meet") {
    assert.equal(l.t, "5/6");
    assert.equal(l.xText, "(11/6, 5/3, 5/2)");
    assert.equal(l.nd, "1·1 + 1·2 + 1·3 = 6");
  }
  assert.equal(linePlane([0, 0, 1], [0, 0, 2], [0, 0, 0], [1, 1, 0]).kind, "parallel");
  assert.equal(linePlane([0, 0, 1], [0, 0, 2], [0, 0, 2], [1, 1, 0]).kind, "inside");

  const two = twoPlanes([1, 1, 1], [2, 2, 2], [2, -1, 1], [1, 0, 1]);
  assert.equal(two.kind, "meet");
  if (two.kind === "meet") {
    assert.equal(two.line, "r = (0, 3/2, 9/2) + t(2, 1, −3)");
    assert.equal(two.cos, "√2/3");
    assert.equal(two.angle, "≈ 61.87°");
  }
  assert.deepEqual(twoPlanes([1, 1, 1], [2, 2, 2], [2, 2, 2], [0, 0, 0]), { kind: "parallel", dist: "2√3 ≈ 3.464" });
  assert.deepEqual(twoPlanes([1, 1, 1], [2, 2, 2], [-1, -1, -1], [6, 0, 0]), { kind: "same" });
});

test("each of the tool's cross, lines and planes examples opens as a scene", () => {
  for (const mode of ["cross", "lines", "planes"] as const) {
    assert.deepEqual(SPACE_EXAMPLES[mode].map((e) => e.label), VEC_PRESETS[mode].map((p) => p.label));
  }
  assert.ok(SPACE_MODES.every((m) => SPACE_EXAMPLES[m].length > 0));
  // The planes the tool writes as equations are held by whole points of them.
  const eqOf = (s: LiveSpace) => planeEq(s.planes.n, s.planes.a);
  assert.equal(eqOf(example("planes", 0)), "2x − y + 2z = 6");
  assert.equal(eqOf(example("planes", 3)), "x + y + z = 6");
  const two = example("planes", 4);
  assert.equal(eqOf(two), "x + y + z = 6");
  assert.equal(planeEq(two.planes.m, two.planes.b), "2x − y + z = 3");
  // Through A, B, C: all three on it.
  const abc = example("planes", 1);
  for (const q of [[1, 0, 0], [0, 2, 0], [0, 0, 3]] as V3[]) assert.equal(pointPlane(abc.planes.n, abc.planes.a, q).on, true);
  // The tool's skew pair, its triangle, and its 2D lines seen straight down z.
  const skew = example("lines", 3).lines;
  assert.equal(twoLines(skew.a1, skew.d1, skew.a2, skew.d2).kind, "skew");
  const tri = example("cross", 2).cross;
  assert.equal(crossFacts(tri.a, tri.b).half, "7/2");
  assert.equal(lookingDown(example("lines", 6)), "z");
  // Every example fits the box.
  for (const m of SPACE_MODES) for (const e of SPACE_EXAMPLES[m]) {
    const s = e.to({ ...SPACE_START, mode: m });
    for (const h of handlesOf({ ...s, mode: m })) assert.ok(h.at.every((v) => Math.abs(v) <= LIM), `${m} ${e.label} ${h.id}`);
  }
});

test("the hand: corners stay put when A moves, and no vector shrinks to nothing", () => {
  const s: LiveSpace = { ...example("cross", 2), mode: "cross" };
  const A = handlesOf(s).find((h) => h.id === "A")!;
  const moved = A.to([1, 1, 1])!;
  const at = (t: LiveSpace, id: string) => handlesOf(t).find((h) => h.id === id)!.at;
  assert.deepEqual(at(moved, "B"), [0, 2, 0]);
  assert.deepEqual(at(moved, "C"), [0, 0, 3]);
  assert.deepEqual(at(moved, "A"), [1, 1, 1]);
  assert.equal(A.to([0, 2, 0]), null);
  const v: LiveSpace = { ...SPACE_START, mode: "vector" };
  assert.equal(handlesOf(v)[0].to([0, 0, 0]), null);
  // A line's point carries its direction's tip with it.
  const l: LiveSpace = { ...SPACE_START, mode: "lines" };
  const next = handlesOf(l).find((h) => h.id === "A1")!.to([2, 2, 2])!;
  assert.deepEqual(at(next, "d1"), [3, 3, 2]);
});

test("the view: turned back exactly, dragged in the plane facing the viewer, keys along the axes seen", () => {
  const view = { yaw: 235, pitch: 20 };
  const p: V3 = [1.5, -2, 3];
  unseen(seen(p, view), view).forEach((v, i) => close(v, p[i]));
  // Seen straight down z, a drag right moves x, a drag up moves y, and z never changes.
  assert.deepEqual(dragTo([1, 1, 1], 2.4, 0.2, LOOK.z), [3, 1, 1]);
  assert.deepEqual(dragTo([1, 1, 1], -0.2, 1.6, LOOK.z), [1, 3, 1]);
  assert.deepEqual(dragTo([1, 1, 1], 1.4, 2.2, LOOK.x), [1, 2, 3]);
  assert.deepEqual(dragTo([8, 0, 0], 5, 0, LOOK.z), [LIM, 0, 0]);
  assert.deepEqual(keyStep("ArrowRight", LOOK.z), [1, 0, 0]);
  assert.deepEqual(keyStep("ArrowUp", LOOK.z), [0, 1, 0]);
  assert.deepEqual(keyStep("PageUp", LOOK.z), [0, 0, 1]);
  assert.deepEqual(keyStep("ArrowRight", LOOK.x), [0, 1, 0]);
  assert.deepEqual(keyStep("PageDown", LOOK.x), [-1, 0, 0]);
  assert.equal(keyStep("Enter", view), null);
  // Turned, the three keys still step along three different axes.
  const steps = ["ArrowRight", "ArrowUp", "PageUp"].map((k) => keyStep(k, view)!.findIndex((v) => v !== 0));
  assert.deepEqual([...steps].sort(), [0, 1, 2]);
  assert.equal(lookingDown(LOOK.y), "y");
  assert.equal(lookingDown(view), null);
});

test("a line is drawn inside the ball round the origin", () => {
  const ends = clipLine([1, 0, 0], [0, 1, 0], 5)!;
  for (const e of ends) close(Math.hypot(...e), 5);
  assert.equal(clipLine([6, 0, 0], [0, 1, 0], 5), null);
});
