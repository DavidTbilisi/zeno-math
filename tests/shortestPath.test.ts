// Shortest route: the shortest route found is as long as the shortest distance, the medium level always has a detour
// that pays, the fewest-roads and greedy routes are what they say, their slips are named, and the board's stars and
// notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { distances, routeLength, withLengths, type Graph } from "../src/math/graphPlay.ts";
import { fewestRoads, greedyRoute, PATH_LADDER, pathNotice, pathNow, pathStars, pathSteps, pathSvg, pathTask, pathTraps, shortestCount, shortestRoute } from "../src/math/shortestPath.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every map fits its level; the shortest route found is the shortest distance; a detour pays on the medium level", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 150; seed++) {
      const t = pathTask(level, rng(seed));
      const where = `level ${level} seed ${seed}`;
      assert.equal(t.g.pts.length, level === 1 ? 6 : level === 2 ? 9 : 12, where);
      assert.ok(t.g.w.every((x) => Number.isInteger(x) && x >= 1 && x <= 9), where);
      const route = shortestRoute(t.g, t.a, t.b);
      assert.equal(route[0], t.a);
      assert.equal(route[route.length - 1], t.b);
      assert.equal(routeLength(t.g, route), t.best, where);
      assert.equal(distances(t.g, t.a)[t.b], t.best, where);
      const few = fewestRoads(t.g, t.a, t.b);
      assert.ok(few.length >= t.best, where);
      if (level === 2) assert.ok(few.length > t.best, where);
      const greedy = greedyRoute(t.g, t.a, t.b);
      if (greedy) assert.ok(routeLength(t.g, greedy)! >= t.best, where);
      for (const x of pathTraps(t)) assert.notEqual(x.v, t.best, where);
    }
});

// A square A B / C D with a diagonal A–D: the diagonal is one road of 9, the way round by B two roads of 2.
const square: Graph = withLengths({ pts: [[0, 0], [100, 0], [0, 100], [100, 100]], edges: [[0, 1], [1, 3], [0, 2], [2, 3], [0, 3]], w: [] }, [2, 2, 1, 6, 9]);

test("the fewest roads, the greedy route and the count of shortest routes, worked by hand", () => {
  assert.deepEqual(fewestRoads(square, 0, 3), { roads: 1, length: 9 });
  assert.deepEqual(shortestRoute(square, 0, 3), [0, 1, 3]);
  // Greedy takes the road of 1 to C, then must take 6: 7, not 4.
  assert.deepEqual(greedyRoute(square, 0, 3), [0, 2, 3]);
  assert.equal(shortestCount(square, 0)[3], 1);
  assert.equal(shortestCount(withLengths(square, [2, 2, 1, 3, 9]), 0)[3], 2);
  const t = { level: 1 as const, g: square, a: 0, b: 3, best: 4 };
  assert.deepEqual(pathTraps(t).map((x) => [x.id, x.v]), [["fewestRoads", 9], ["greedyRoute", 7]]);
  assert.deepEqual(pathSteps(t), ["\\text{A} \\to \\text{B} \\to \\text{D}: \\; 2 + 2 = 4"]);
  const pic = pathSvg(t, [0, 1]);
  assert.ok(!pic.body.includes("NaN"));
  assert.match(pic.body, /#1971c2/);
});

test("in practice: the shortest length typed, the slips named, the route drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("shortestPath", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.doesNotMatch(ex.prompt, /\{\w+\}/);
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const id of ["fewestRoads", "greedyRoute"] as const)
    for (const level of LEVELS) {
      let found = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const ex = exercise("shortestPath", level, seed, w);
        const trap = trapInputs(ex).find((x) => x.id === id);
        if (!trap) continue;
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
      assert.ok(found >= 5, `${found} questions at level ${level} name ${id}`);
    }
  const q = { skill: "shortestPath" as const, level: 2, seed: 7 };
  const ex = exercise("shortestPath", 2, 7, w);
  assert.deepEqual([mark(q, ex.plain), mark(q, String(Number(ex.plain) + 1)), mark(q, "far")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([pathStars(0), pathStars(1), pathStars(3)], [3, 2, 1]);
  const t = { level: 1 as const, g: square, a: 0, b: 3, best: 4 };
  assert.equal(pathNotice(t, [0, 1, 3], 0, 1), "detour");
  const tied = { ...t, g: withLengths(square, [2, 2, 1, 3, 4]) };
  assert.equal(pathNotice(tied, [0, 3], 0, 1), "tie");
  assert.equal(pathNotice(t, [0, 1, 3], 1, 0), null);
  assert.equal(pathNotice(t, [0, 1, 3], 0, 10), "streak10");
  assert.deepEqual(pathNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), pathTask(PATH_LADDER[4].level, rng(PATH_LADDER[4].seed)));
  assert.deepEqual(pathNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), pathTask(3, rng(8)));
});
