// Colour the graph: every graph needs the colours its level says, the slips' answers differ from the right one and are
// named, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { chromatic, clashes } from "../src/math/graphPlay.ts";
import { COLOUR_LADDER, colourNotice, colourNow, colourQuestion, colourStars, colourSvg, colourTask, colourTraps, coloursUsed } from "../src/math/colouring.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every graph needs the colours its level says: two, three, then three or four", () => {
  const fours = { n: 0 };
  for (const level of LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const t = colourTask(level, rng(seed));
      assert.equal(chromatic(t.g), t.k);
      assert.equal(t.k, level === 1 ? 2 : level === 2 ? 3 : t.k);
      if (level === 3) {
        assert.ok(t.k === 3 || t.k === 4);
        if (t.k === 4) fours.n++;
      }
      const q = colourQuestion(level, rng(seed));
      assert.equal(chromatic(q.g), q.k);
      for (const x of colourTraps(q)) assert.notEqual(x.v, q.k);
    }
  assert.ok(fours.n > 30 && fours.n < 70, `${fours.n} hard graphs need four colours`);
});

test("the picture: vertices in their colours, clashing edges red; colours counted", () => {
  const t = colourTask(2, rng(3));
  const col = t.g.pts.map(() => 0);
  const clash = clashes(t.g, col);
  assert.equal(clash.length, t.g.edges.length);
  const pic = colourSvg(t.g, col, clash);
  assert.ok(!pic.body.includes("NaN"));
  assert.match(pic.body, /#e03131/);
  assert.equal(coloursUsed([0, 2, -1, 2]), 2);
});

test("in practice: the fewest colours typed, the slips named, the graph coloured; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("colouring", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const [id, levels] of [["degreeColours", [1, 2, 3]], ["oddLoop", [2, 3]]] as const)
    for (const level of levels) {
      let found = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const ex = exercise("colouring", level, seed, w);
        const trap = trapInputs(ex).find((x) => x.id === id);
        if (!trap) continue;
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
      assert.ok(found > 20, `${found} questions at level ${level} name ${id}`);
    }
  const q = { skill: "colouring" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "2"), mark(q, "3"), mark(q, "two")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([colourStars(0), colourStars(1), colourStars(3)], [3, 2, 1]);
  const t = colourTask(1, rng(1));
  assert.equal(colourNotice(t, 0, 1), "two");
  assert.equal(colourNotice({ ...t, k: 3 }, 0, 1), "triangle");
  assert.equal(colourNotice({ ...t, k: 4 }, 0, 1), "four");
  assert.equal(colourNotice(t, 1, 0), null);
  assert.equal(colourNotice(t, 0, 10), "streak10");
  assert.deepEqual(colourNow({ mode: "puzzle", stage: 4, level: 1, seed: 0 }), colourTask(COLOUR_LADDER[4].level, rng(COLOUR_LADDER[4].seed)));
  assert.deepEqual(colourNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), colourTask(3, rng(8)));
});
