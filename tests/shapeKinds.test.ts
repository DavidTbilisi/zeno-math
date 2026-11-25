// Shapes by their properties: every question takes its own answer in three languages and no slip is right; the
// marks and names of a quadrilateral come from its points, turned any way; triangles are built from whole-degree
// angles of the kind asked; a polygon has as many sides as asked; equal sides are written equal; always, sometimes
// or never follows the family; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { check, exercise, LEVELS, rngOf, trapInputs } from "../src/math/practice.ts";
import { anglesOf, marks, polygon, quad, quadNames, triangleAngles, triangleOf, turn } from "../src/math/shapeKinds.ts";
import { FAMILY } from "../src/math/skills/shapeKinds.ts";
import { gradeOf } from "../src/model/curriculum.ts";

const w = en.pracWords;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

test("every question takes its own answer in each language, and no slip is the right answer", () => {
  for (const words of [w, ka.pracWords, ru.pracWords])
    for (const level of LEVELS)
      for (const seed of SEEDS) {
        const ex = exercise("shapeKinds", level, seed, words);
        const where = `${level} #${seed}: ${ex.prompt} → ${ex.plain}`;
        assert.equal(check(ex, ex.plain, words).ok, true, where);
        assert.ok(!/\{\w+\}/.test(ex.prompt), `${where}: the prompt is filled in`);
        for (const t of trapInputs(ex)) {
          const v = check(ex, t.input, words);
          assert.equal(v.mistake, t.id, `${where}; ${t.id} ${t.input}`);
          assert.ok(v.hint && !/\{\w+\}/.test(v.hint), `${where}: ${v.hint}`);
        }
      }
});

test("a quadrilateral's names come from its points, whichever way it is turned", () => {
  const r = rngOf(3);
  const expect = { square: 5, rectangle: 3, rhombus: 3, parallelogram: 2, kite: 1, trapezium: 1, quadrilateral: 1 } as const;
  for (const [k, n] of Object.entries(expect))
    for (let i = 0; i < 20; i++) {
      const p = quad(k as keyof typeof expect, r);
      for (const t of [0, 17, 45, 90]) assert.equal(quadNames(turn(p, t)).length, n, `${k} turned ${t}`);
    }
  const sq = marks(quad("square", r));
  assert.deepEqual([sq.equal.map((g) => g.length), sq.parallel.length, sq.right.length], [[4], 2, 4]);
  const kite = marks(quad("kite", r));
  assert.deepEqual([kite.equal.map((g) => g.length), kite.parallel.length, kite.right.length], [[2, 2], 0, 0]);
  assert.equal(marks(quad("trapezium", r)).parallel.length, 1);
});

test("triangles are built from their angles, of the kind asked", () => {
  const r = rngOf(5);
  for (let i = 0; i < 200; i++)
    for (const k of ["equilateral", "isosceles", "scalene", "right", "acute", "obtuse"] as const) {
      const t = triangleAngles(k, r);
      assert.equal(t[0] + t[1] + t[2], 180);
      const drawn = anglesOf(triangleOf(t[0], t[1]));
      drawn.forEach((a, j) => assert.ok(Math.abs(a - t[j]) < 1e-6, `${k}: ${t} drawn ${drawn}`));
      const big = Math.max(...t);
      if (k === "right") assert.equal(big, 90);
      if (k === "obtuse") assert.ok(big > 90);
      if (k === "acute" || k === "scalene") assert.ok(big < 90 && new Set(t).size === 3);
      if (k === "isosceles") assert.equal(new Set(t).size, 2);
    }
});

test("the easy level: as many corners as asked, a solid's faces with the ones at the back", () => {
  let [counted, faces] = [0, 0];
  for (const seed of SEEDS) {
    const ex = exercise("shapeKinds", 1, seed, w);
    const svg = ex.pic?.svg(0, 0) ?? "";
    if (ex.prompt === w.shapes.sides || ex.prompt === w.shapes.corners) {
      counted++;
      const pts = svg.match(/<polygon points="([^"]+)"/)![1].trim().split(" ");
      assert.equal(String(pts.length), ex.plain);
    }
    if (ex.prompt === w.shapes.faces) {
      faces++;
      assert.equal(trapInputs(ex)[0].id, "onlyVisibleFaces");
    }
  }
  assert.ok(counted > 40 && faces > 10, `${counted} ${faces}`);
  assert.equal(polygon(7, rngOf(1), true).length, 7);
});

test("a triangle by its sides: two lengths written the same exactly when it is isosceles", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("shapeKinds", 2, seed, w);
    if (ex.prompt !== w.shapes.bySides) continue;
    seen++;
    const cm = [...ex.pic!.svg(0, 0).matchAll(/>(\d+) cm</g)].map((m) => m[1]);
    assert.equal(cm.length, 3);
    assert.equal(new Set(cm).size === 2, ex.plain === w.shapes.kinds.isosceles, `${cm} ${ex.plain}`);
  }
  assert.ok(seen > 30);
});

test("always, sometimes or never follows the family, with the slip of each", () => {
  let seen = 0;
  for (const seed of SEEDS) {
    const ex = exercise("shapeKinds", 3, seed, w);
    const key = (Object.keys(FAMILY) as (keyof typeof FAMILY)[]).find((k) => ex.prompt.endsWith(w.shapes.family[k].s));
    if (!key) continue;
    seen++;
    assert.equal(ex.plain, w.shapes.when[FAMILY[key]]);
    const ids = trapInputs(ex).map((t) => t.id);
    assert.deepEqual(ids, FAMILY[key] === "always" ? ["namesExclusive"] : FAMILY[key] === "sometimes" ? ["oneExampleEnough"] : []);
  }
  assert.ok(seen > 60);
});

test("its grades: naming and counting in grade 1, angles and lines in grade 4, the family in grade 5", () => {
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("shapeKinds", L as 1 | 2 | 3)), [1, 4, 5]);
});

test("the sorting piece: every board fills all four places, and a square goes in the middle", async () => {
  const { RINGS, regionOf, sortBoard, SORT_LADDER, sortNotice } = await import("../src/math/shapeSort.ts");
  for (const { level, seed } of SORT_LADDER) {
    const shapes = sortBoard(level, seed);
    assert.equal(shapes.length, 6);
    assert.equal(new Set(shapes.map((s) => regionOf(s.pts, RINGS[level]))).size, 4, `level ${level} seed ${seed}`);
  }
  const r = rngOf(9);
  for (const level of [1, 2] as const) assert.equal(regionOf(turn(quad("square", r), 45), RINGS[level]), "both");
  assert.equal(regionOf(quad("rectangle", r), RINGS[2]), "a");
  assert.equal(regionOf(quad("rhombus", r), RINGS[2]), "b");
  assert.equal(regionOf(quad("kite", r), RINGS[3]), "out");
  assert.equal(sortNotice(true, 0, 20000, 3, false), "quick");
  assert.equal(sortNotice(false, 0, 5000, 3, true), "bothFirst");
});
