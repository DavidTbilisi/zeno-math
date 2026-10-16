// The geoboard and the shape questions: every task has a shape that does it, a shape is read back the way it was
// written, shapes that can't be marked are sent back with the reason, the marking is in whole numbers, the ladder's
// puzzles are the practice questions of their level and seed, and stars and things noticed are kept as they should be.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, preview, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import {
  areaText,
  decodePoly,
  encodePoly,
  GEO_COLS,
  GEO_LADDER,
  GEO_ROWS,
  geoGridSvg,
  gridSides,
  isOpen,
  judgePoly,
  ladderTask,
  measurePoly,
  moveCorner,
  notice,
  polyTask,
  polyTraps,
  readProgress,
  renderShape,
  shapeProblem,
  snapPt,
  starsFor,
  tapDot,
  withFound,
  withStars,
  type GeoPlay,
  type GeoPt,
} from "../src/math/geoPlay.ts";
import { rng } from "../src/math/random.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const play = (goal: GeoPlay["goal"]): GeoPlay => ({ cols: GEO_COLS, rows: GEO_ROWS, goal });
const rect = (x: number, y: number, a: number, b: number): GeoPt[] => [[x, y], [x + a, y], [x + a, y + b], [x, y + b]];

test("every task's own shape does it, and fits the grid", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = polyTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${encodePoly(t.sample)}`;
      assert.deepEqual(judgePoly(t.play, encodePoly(t.sample)), { ok: true }, where);
      assert.equal(shapeProblem(t.sample, t.play.cols, t.play.rows), null, where);
      const m = measurePoly(t.sample);
      if (level === 1) assert.ok(m.rect && m.area2 % 2 === 0, where);
      if (level === 2) assert.equal(m.corners, 3, where);
      if (level === 3) assert.ok(m.perim === t.play.goal.perim && m.corners === 6, where);
    }
});

test("triangles bring in half squares; levels differ", () => {
  const halves = Array.from({ length: 100 }, (_, i) => polyTask(2, rng(i + 1)).play.goal.area2! % 2).filter(Boolean).length;
  assert.ok(halves > 10 && halves < 90, `${halves} of 100 triangles have half squares`);
  assert.equal(areaText(15), "7½");
  assert.equal(areaText(1), "½");
  assert.equal(areaText(12), "6");
});

test("a shape is written and read back the same; anything else is unreadable", () => {
  const pts: GeoPt[] = [[1, 1], [5, 1], [5, 4], [1, 4]];
  assert.equal(encodePoly(pts), "poly:1,1;5,1;5,4;1,4");
  assert.deepEqual(decodePoly(encodePoly(pts)), pts);
  assert.deepEqual(decodePoly(" poly: (1, 1); 5,1 ;5,4;1,4 "), pts);
  assert.deepEqual(decodePoly("1,1;5,1;5,4"), pts.slice(0, 3));
  assert.deepEqual(decodePoly("poly:"), []);
  for (const bad of ["12", "poly:1;2", "1.5,2;3,4;5,6", "a,b;c,d;e,f", Array(70).fill("1,1").join(";")]) assert.equal(decodePoly(bad), null, bad);
  assert.deepEqual(judgePoly(play({ area2: 2 }), "squares"), { ok: false, problem: "unreadable" });
});

test("shapes that can't be marked are sent back with the reason", () => {
  const p = play({ area2: 48, rect: true });
  const why = (pts: GeoPt[]) => judgePoly(p, encodePoly(pts));
  assert.deepEqual(why([[0, 0], [2, 0]]), { ok: false, problem: "few" });
  assert.deepEqual(why(Array.from({ length: 13 }, (_, i): GeoPt => [i % 11, Math.floor(i / 11)])), { ok: false, problem: "tooMany" });
  assert.deepEqual(why([[0, 0], [11, 0], [0, 3]]), { ok: false, problem: "offGrid" });
  assert.deepEqual(why([[0, 0], [4, 0], [4, 3], [4, 0]]), { ok: false, problem: "repeat" });
  assert.deepEqual(why([[0, 0], [2, 2], [4, 4]]), { ok: false, problem: "flat" });
  // A bow tie, a side running back along the one before, and a corner on another side.
  assert.deepEqual(why([[0, 0], [4, 3], [4, 0], [0, 3]]), { ok: false, problem: "crossing" });
  assert.deepEqual(why([[0, 0], [4, 0], [2, 0], [2, 3]]), { ok: false, problem: "crossing" });
  assert.deepEqual(why([[0, 0], [4, 0], [4, 4], [2, 0], [0, 4]]), { ok: false, problem: "crossing" });
  assert.deepEqual(why(rect(0, 0, 4, 6)), { ok: true });
  // The right area in the wrong shape is sent back; the wrong area is a miss.
  assert.deepEqual(why(rect(0, 0, 5, 4)), { ok: false });
  assert.deepEqual(judgePoly(p, encodePoly([[0, 0], [6, 0], [6, 2], [3, 2], [3, 6], [0, 6]])), { ok: false, problem: "notRect" });
  assert.deepEqual(judgePoly(play({ area2: 12, sides: 3 }), encodePoly(rect(0, 0, 3, 2))), { ok: false, problem: "notTriangle" });
  assert.deepEqual(judgePoly(play({ area2: 12, perim: 14, grid: true }), encodePoly([[0, 0], [4, 0], [3, 3], [0, 3]])), { ok: false, problem: "notGrid" });
});

test("a tilted rectangle is a rectangle; a dot in the middle of a side isn't a corner", () => {
  // Sides (2,1) and (-1,2): area 5, every corner a right angle.
  const tilted: GeoPt[] = [[1, 0], [3, 1], [2, 3], [0, 2]];
  assert.deepEqual(judgePoly(play({ area2: 10, rect: true }), encodePoly(tilted)), { ok: true });
  const m = measurePoly(tilted);
  assert.ok(m.square && m.tilted && m.perim === null && Math.abs(m.around - 4 * Math.sqrt(5)) < 1e-9);
  const withDot: GeoPt[] = [[0, 0], [2, 0], [4, 0], [4, 3], [0, 3]];
  assert.deepEqual(judgePoly(play({ area2: 24, rect: true }), encodePoly(withDot)), { ok: true });
  assert.equal(measurePoly(withDot).perim, 14);
  assert.deepEqual(judgePoly(play({ area2: 6, sides: 3 }), encodePoly([[0, 0], [1, 0], [2, 0], [0, 3]])), { ok: true });
});

test("the practice question: its answer is the shape, its mistakes are named, it has a picture and a solution", async () => {
  for (const level of LEVELS) {
    const ex = exercise("shapeArea", level, 7, w);
    assert.ok(ex.play && ex.pic && ex.answer.k === "poly", `level ${level}`);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.equal(check(ex, "poly:0,0;1,0", w).why, w.reasons.shape.few);
    assert.equal(check(ex, "hello", w).why, w.reasons.shape.unreadable);
    assert.equal(preview(ex, ex.plain), null);
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("<polygon") && !r.svg.includes("NaN"), `level ${level}`);
  }
  // A rectangle whose perimeter is the area asked for; a triangle with base × height the area asked for.
  const L1 = Array.from({ length: 50 }, (_, i) => exercise("shapeArea", 1, i + 1, w)).find((e) => trapInputs(e).length)!;
  const trap = trapInputs(L1)[0];
  assert.equal(check(L1, trap.input, w).mistake, "areaPerimeter");
  const L2 = Array.from({ length: 50 }, (_, i) => exercise("shapeArea", 2, i + 1, w)).find((e) => trapInputs(e).length)!;
  assert.equal(check(L2, trapInputs(L2)[0].input, w).mistake, "triangleHalf");
  // No trap when the numbers can't make one: an odd area has no rectangle with that perimeter.
  assert.deepEqual(polyTraps({ level: 1, play: play({ area2: 30, rect: true }), sample: rect(1, 1, 3, 5), dims: [3, 5] }), []);
  assert.deepEqual(polyTraps({ level: 3, play: play({ area2: 16, perim: 12, grid: true }), sample: [], dims: [] }), []);
});

test("the ladder's puzzles are the practice questions of their level and seed, all different", () => {
  const goals = GEO_LADDER.map((s, i) => {
    const t = ladderTask(i);
    assert.deepEqual(t.play, exercise("shapeArea", s.level, s.seed, w).play, `puzzle ${i + 1}`);
    return JSON.stringify(t.play.goal);
  });
  assert.equal(new Set(goals).size, GEO_LADDER.length);
});

test("tapping and dragging corners", () => {
  assert.deepEqual(snapPt([2.4, 7.6], 10, 8), [2, 8]);
  assert.deepEqual(snapPt([-3, 12], 10, 8), [0, 8]);
  const pts: GeoPt[] = [[0, 0], [3, 0]];
  assert.deepEqual(tapDot(pts, [3, 2]), [[0, 0], [3, 0], [3, 2]]);
  assert.deepEqual(tapDot(pts, [0, 0]), [[3, 0]]);
  const full = Array.from({ length: 12 }, (_, i): GeoPt => [i % 10, Math.floor(i / 10)]);
  assert.equal(tapDot(full, [9, 8]), full, "no more than 12 corners");
  assert.deepEqual(moveCorner(pts, 1, [4, 4]), [[0, 0], [4, 4]]);
  assert.equal(moveCorner(pts, 1, [0, 0]), pts, "not onto another corner");
});

test("stars: three first time, fewer after misses or a peek; puzzles open in turn; the best is kept", () => {
  assert.deepEqual([starsFor(0, false), starsFor(1, false), starsFor(2, false), starsFor(3, false)], [3, 2, 2, 1]);
  assert.deepEqual([starsFor(0, true), starsFor(1, true), starsFor(5, true)], [2, 1, 1]);
  let p = readProgress(null);
  assert.deepEqual(p.stars, GEO_LADDER.map(() => 0));
  assert.ok(isOpen(p, 0) && !isOpen(p, 1));
  p = withStars(p, 0, 2);
  assert.ok(isOpen(p, 1));
  assert.equal(withStars(p, 0, 1).stars[0], 2);
  assert.equal(withStars(p, 0, 3).stars[0], 3);
  p = withFound(withFound(p, "sameArea"), "square");
  assert.deepEqual(p.found, ["square", "sameArea"]);
  assert.equal(withFound(p, "square"), p);
  // Read back as saved; anything odd in storage is ignored.
  assert.deepEqual(readProgress(JSON.stringify(p)), p);
  assert.deepEqual(readProgress('{"stars":[3,9,-1,"2"],"found":["square","nonsense"]}').stars.slice(0, 4), [3, 0, 0, 2]);
  assert.deepEqual(readProgress('{"stars":[3,9,-1,"2"],"found":["square","nonsense"]}').found, ["square"]);
  assert.deepEqual(readProgress("{not json"), readProgress(null));
  assert.deepEqual(readProgress('"text"'), readProgress(null));
});

test("things noticed: squares, tilted squares, same area or perimeter as the shape before", () => {
  const m = (pts: GeoPt[]) => measurePoly(pts);
  assert.equal(notice(null, m(rect(0, 0, 3, 3))), "square");
  assert.equal(notice(null, m([[1, 0], [3, 1], [2, 3], [0, 2]])), "tiltedSquare");
  assert.equal(notice(m(rect(0, 0, 4, 3)), m(rect(0, 0, 6, 2))), "sameArea");
  assert.equal(notice(m(rect(0, 0, 4, 3)), m(rect(0, 0, 5, 2))), "samePerim");
  assert.equal(notice(m(rect(0, 0, 4, 3)), m(rect(0, 0, 4, 3))), null);
  assert.equal(notice(null, m(rect(0, 0, 4, 3))), null);
  assert.equal(notice(m([[0, 0], [4, 0], [0, 3]]), m(rect(0, 0, 6, 1))), null, "a slanted side has no exact perimeter");
});

test("pictures: the grid, the sides labelled outside the shape, and the solution with its steps", () => {
  const g = geoGridSvg(play({}));
  assert.equal(g.body.match(/<circle/g)!.length, 11 * 9);
  // Clockwise or not, each label is outside: the top side's label above it, the right side's to its right.
  for (const pts of [rect(1, 1, 4, 3), [...rect(1, 1, 4, 3)].reverse()]) {
    const sides = gridSides(pts);
    assert.equal(sides.length, 4);
    for (const { at, out } of sides) {
      const inside = [3, 2.5];
      assert.ok((at[0] - inside[0]) * out[0] + (at[1] - inside[1]) * out[1] > 0, JSON.stringify({ at, out }));
    }
  }
  assert.equal(gridSides([[0, 0], [4, 0], [0, 3]]).length, 2, "the slanted side has no label");
  const r = renderShape({ play: play({}), pts: rect(1, 1, 4, 3) }, { svg: '<svg width="10" height="20"><text>x</text></svg>', width: 10, height: 20 });
  assert.ok(r.svg.includes("<text>x</text>") && r.height === g.h + 20);
  assert.equal(renderShape({ play: play({}), pts: [] }, null).height, g.h);
});

test("the server marks a shape the way the browser does: right, a miss, or sent back", () => {
  const q = { skill: "shapeArea" as const, level: 3, seed: 7 };
  const ex = exercise(q.skill, 3, q.seed, w);
  assert.equal(mark(q, ex.plain), "correct");
  assert.equal(mark(q, "poly:0,0;8,0;8,1;0,1"), "wrong");
  assert.equal(mark(q, "poly:0,0;4,0;4,2;1,4"), "form");
  assert.equal(mark(q, "poly:0,0;4,4;4,0;0,4"), "form");
});
