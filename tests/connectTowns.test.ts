// Connect the towns: every map's cheapest network joins every town with n − 1 roads and no loop, nothing cheaper does,
// the roads chosen are judged (a town left out, a loop, dearer than need be), the cheapest roads taken loop or not are
// named, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { joinsAll, loopEdges, withLengths, type Graph } from "../src/math/graphPlay.ts";
import { cheapestRoads, TOWN_LADDER, townNotice, townNow, townProblem, townStars, townSteps, townSvg, townTask } from "../src/math/connectTowns.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

/** Every set of n − 1 edges that joins every vertex, by brute force (small graphs only). */
function cheapestByHand(g: Graph): number {
  const n = g.pts.length;
  let best = Infinity;
  const pick = (from: number, chosen: number[]) => {
    if (chosen.length === n - 1) {
      if (joinsAll(g, chosen)) best = Math.min(best, chosen.reduce((s, e) => s + g.w[e], 0));
      return;
    }
    for (let e = from; e < g.edges.length; e++) pick(e + 1, [...chosen, e]);
  };
  pick(0, []);
  return best;
}

test("every map: different costs, a cheapest network of n − 1 roads with no loop, and nothing cheaper (by hand on six towns)", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= (level === 1 ? 60 : 120); seed++) {
      const t = townTask(level, rng(seed));
      const where = `level ${level} seed ${seed}`;
      assert.equal(new Set(t.g.w).size, t.g.edges.length, where);
      assert.equal(t.best.edges.length, t.g.pts.length - 1, where);
      assert.ok(joinsAll(t.g, t.best.edges) && !loopEdges(t.g, t.best.edges).length, where);
      assert.equal(townProblem(t, t.best.edges), null, where);
      if (level > 1) assert.notEqual(cheapestRoads(t.g), t.best.total, where);
      if (level === 1) assert.equal(cheapestByHand(t.g), t.best.total, where);
    }
});

// A square A B / C D with a diagonal B–C, costs 1 to 5.
const square: Graph = withLengths({ pts: [[0, 0], [100, 0], [0, 100], [100, 100]], edges: [[0, 1], [1, 3], [0, 2], [2, 3], [1, 2]], w: [] }, [1, 4, 2, 5, 3]);

test("the roads chosen judged: a town left out, a loop, dearer than need be, or the cheapest", () => {
  const t = { level: 1 as const, g: square, best: { edges: [0, 2, 1], total: 7 } };
  assert.deepEqual(townProblem(t, [0, 2]), { kind: "apart" });
  assert.deepEqual(townProblem(t, [0, 2, 4, 1]), { kind: "loop", edges: [0, 2, 4] });
  assert.deepEqual(townProblem(t, [0, 2, 3]), { kind: "dearer", by: 1 });
  assert.equal(townProblem(t, [1, 0, 2]), null);
  // The three cheapest, 1 + 2 + 3, make the loop A–B–C.
  assert.equal(cheapestRoads(square), 6);
  assert.deepEqual(townSteps(t), ["1 + 2 + 4 = 7"]);
  const pic = townSvg(square, [0, 2, 4], { loop: [0, 2, 4] });
  assert.ok(!pic.body.includes("NaN"));
  assert.match(pic.body, /#e03131/);
  assert.match(pic.body, /stroke-dasharray/);
});

test("in practice: the least total typed, the cheapest roads taken loop or not named, the network drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("spanningTree", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const level of [2, 3] as const) {
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const ex = exercise("spanningTree", level, seed, w);
      const trap = trapInputs(ex).find((x) => x.id === "cheapestRoads");
      if (!trap) continue;
      found++;
      const v = check(ex, trap.input, w);
      assert.equal(v.mistake, "cheapestRoads");
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
    assert.equal(found, 30, `${found} questions at level ${level} name cheapestRoads`);
  }
  const q = { skill: "spanningTree" as const, level: 2, seed: 7 };
  const ex = exercise("spanningTree", 2, 7, w);
  assert.deepEqual([mark(q, ex.plain), mark(q, String(Number(ex.plain) + 1)), mark(q, "cheap")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([townStars(0), townStars(1), townStars(2)], [3, 2, 1]);
  // Finishing is always worth a star, however many tries it took, but only two (one miss at most) open the next puzzle.
  assert.equal(townStars(50), 1);
  const t = { level: 1 as const, g: square, best: { edges: [0, 2, 1], total: 7 } };
  assert.equal(townNotice(t, 0, 1), "skipCheap");
  assert.equal(townNotice(townTask(3, rng(1)), 0, 1), "bigMap");
  const path: Graph = withLengths({ pts: [[0, 0], [100, 0], [200, 0]], edges: [[0, 1], [1, 2]], w: [] }, [1, 2]);
  assert.equal(townNotice({ level: 1, g: path, best: { edges: [0, 1], total: 3 } }, 0, 1), "lonely");
  assert.equal(townNotice(t, 1, 0), null);
  assert.equal(townNotice(t, 0, 10), "streak10");
  assert.deepEqual(townNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), townTask(TOWN_LADDER[4].level, rng(TOWN_LADDER[4].seed)));
  assert.deepEqual(townNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), townTask(3, rng(8)));
});
