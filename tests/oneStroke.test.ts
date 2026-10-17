// One stroke: every graph fits its level, a trail goes only along edges not drawn yet and gets stuck where it should,
// an Euler trail exists exactly when the odd vertices allow, the even vertices counted and a graph with too many odd
// vertices picked are named, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { oddVertices, type Graph } from "../src/math/graphPlay.ts";
import { canStep, canTrace, eulerTrail, isStuck, STROKE_LADDER, strokeNotice, strokeNow, strokeQuestion, strokeStars, strokeSvg, strokeTask, trailEdges } from "../src/math/oneStroke.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every graph fits its level, and an Euler trail is found exactly when it can be drawn", () => {
  let impossible = 0;
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const { g } = strokeTask(level, rng(seed));
      const odd = oddVertices(g).length;
      const where = `level ${level} seed ${seed}`;
      if (level === 1) assert.equal(odd, 0, where);
      if (level === 2) assert.equal(odd, 2, where);
      const trail = eulerTrail(g);
      assert.equal(!!trail, canTrace(g), where);
      if (!trail) {
        impossible++;
        continue;
      }
      const edges = trailEdges(g, trail);
      assert.ok(edges.every((e) => e >= 0), where);
      assert.equal(new Set(edges).size, g.edges.length, where);
      if (odd === 2) assert.ok(oddVertices(g).includes(trail[0]) && oddVertices(g).includes(trail[trail.length - 1]), where);
    }
  assert.ok(impossible > 60 && impossible < 140, `${impossible} of the hard graphs can't be drawn`);
});

// A triangle A B C with a tail C–D: A and B even, C (3 edges) and D (1) odd.
const kite: Graph = { pts: [[0, 0], [100, 0], [50, 80], [50, 160]], edges: [[0, 1], [1, 2], [0, 2], [2, 3]], w: [] };

test("tracing: along edges not drawn yet, stuck with edges left where there is no way on", () => {
  assert.ok(canStep(kite, [], 3));
  assert.ok(canStep(kite, [3], 2));
  assert.ok(!canStep(kite, [3], 0), "not joined");
  assert.ok(!canStep(kite, [3, 2], 3), "that edge is drawn");
  assert.ok(!isStuck(kite, [3, 2, 0, 1, 2]), "done, not stuck");
  // From A to B to C, then down to D: the edge C–A is left, and D has no other edge.
  assert.ok(isStuck(kite, [0, 1, 2, 3]));
  assert.deepEqual(trailEdges(kite, [3, 2, 0]), [3, 2]);
  const pic = strokeSvg(kite, [3, 2]);
  assert.ok(!pic.body.includes("NaN"));
  assert.match(pic.body, /#e8590c/, "where the trail is, ringed");
});

test("in practice: the odd vertices counted, or the graph that can be drawn picked; the slips named; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("oneStroke", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (let seed = 1; seed <= 100; seed++) {
    const q = strokeQuestion(3, rng(seed));
    if (q.level !== 3) throw new Error();
    assert.deepEqual(q.options.map(canTrace), [0, 1, 2, 3].map((i) => i === q.right), `seed ${seed}`);
  }
  for (const [level, id] of [[1, "countedEven"], [2, "countedEven"], [3, "fourOdd"]] as const) {
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const ex = exercise("oneStroke", level, seed, w);
      for (const trap of trapInputs(ex).filter((x) => x.id === id)) {
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
    }
    assert.ok(found >= 30, `${found} slips at level ${level}`);
  }
  const q = { skill: "oneStroke" as const, level: 1, seed: 7 };
  const ex = exercise("oneStroke", 1, 7, w);
  assert.deepEqual([mark(q, ex.plain), mark(q, "3"), mark(q, "odd")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([strokeStars(0), strokeStars(1), strokeStars(4)], [3, 2, 1]);
  assert.equal(strokeNotice(kite, [3, 2, 0, 1, 2], 0, 1), "oddStart");
  assert.equal(strokeNotice(kite, [0, 1, 2, 0], 0, 1), "circuit");
  assert.equal(strokeNotice(kite, null, 0, 1), "impossible");
  assert.equal(strokeNotice(kite, [3, 2, 0, 1, 2], 1, 0), null);
  assert.equal(strokeNotice(kite, [3, 2, 0, 1, 2], 0, 10), "streak10");
  assert.deepEqual(strokeNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), strokeTask(STROKE_LADDER[4].level, rng(STROKE_LADDER[4].seed)));
  assert.deepEqual(strokeNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), strokeTask(3, rng(8)));
});
