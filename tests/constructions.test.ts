// Constructions: each task of the piece is recognised when built the usual way, and not before; every question is right
// with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { APEX, dist, GIVEN, goalMet, HEX, pointsOf, whyTriangles, type CTask, type Mark, type Pt } from "../src/math/compass.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";

const w = en.pracWords;
const c = (c: Pt, p: Pt): Mark => ({ k: "c", c, p });
const l = (a: Pt, b: Pt): Mark => ({ k: "l", a, b });
/** The point there is nearest to `q`, which must be within a pixel or two of it. */
function point(task: CTask, marks: Mark[], q: Pt): Pt {
  const p = pointsOf(task, marks).reduce((a, b) => (dist(a, q) < dist(b, q) ? a : b));
  assert.ok(dist(p, q) < 2, `${task}: no point at ${q}`);
  return p;
}
/** The crossing of the last two arcs, on the line from O at 32° (arcs of radius PQ meet off the rhombus's corner). */
function onBisector(marks: Mark[]): Pt {
  const O = GIVEN.angle.pts[0].p;
  const p = pointsOf("angle", marks).find((q) => dist(q, O) > 10 && Math.abs((Math.atan2(O[1] - q[1], q[0] - O[0]) * 180) / Math.PI - 32) < 0.01);
  assert.ok(p, "no crossing on the bisector");
  return p;
}
/** Builds a task mark by mark; the goal is met only after the last. */
function build(task: CTask, steps: ((m: Mark[]) => Mark)[]) {
  const marks: Mark[] = [];
  for (const s of steps) {
    assert.equal(goalMet(task, marks), false, `${task} met early`);
    marks.push(s(marks));
  }
  assert.ok(goalMet(task, marks), task);
  return whyTriangles(task, marks);
}

test("the piece: the usual constructions are recognised, with the triangles that show why", () => {
  const [A, B] = GIVEN.bisect.pts.map((q) => q.p);
  assert.equal(build("bisect", [() => c(A, B), () => c(B, A), (m) => l(point("bisect", m, [340, 147]), point("bisect", m, [340, 493]))]).length, 2);
  const [O, P] = GIVEN.angle.pts.map((q) => q.p);
  const Q: Pt = [304.0, 206.3];
  assert.equal(build("angle", [() => c(O, P), (m) => c(P, point("angle", m, Q)), (m) => c(point("angle", m, Q), P), (m) => l(O, onBisector(m))]).length, 2);
  const [E, F] = GIVEN.equi.pts.map((q) => q.p);
  assert.equal(build("equi", [() => c(E, F), () => c(F, E), (m) => l(E, point("equi", m, APEX)), (m) => l(F, point("equi", m, APEX))]).length, 1);
  const [X0, L] = GIVEN.perp.pts.map((q) => q.p);
  const X: Pt = [490, 420];
  assert.equal(build("perp", [() => c(X0, L), (m) => c(L, point("perp", m, X)), (m) => c(point("perp", m, X), L), (m) => l(X0, point("perp", m, [320, 125.6]))]).length, 2);
  const [HO, HA] = GIVEN.hexagon.pts.map((q) => q.p);
  assert.equal(build("hexagon", [() => c(HA, HO), (m) => c(point("hexagon", m, HEX[1]), HO), (m) => c(point("hexagon", m, HEX[2]), HO), (m) => c(point("hexagon", m, HEX[3]), HO)]).length, 6);
  // A line near the bisector but not through the crossings is not it.
  assert.equal(goalMet("bisect", [l([341, 150], [341, 490])]), false);
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("constructions", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt}`);
      for (const t of trapInputs(ex)) {
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id}`);
      }
    }
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("constructions", L as 1 | 2 | 3)), [7, 8, 10]);
});
