// Plot the point: every point fits its level's grid, a rectangle's fourth corner is beside the first and last of the
// three drawn, a tap lands on the nearest crossing, the numbers the wrong way round are named, and the board's stars
// and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { gridAt, gridSnap, PLOT_LADDER, PLOT_ROUND, plotNotice, plotNow, plotRange, plotRound, plotStars, plotSteps, plotSvg, plotTask, ptText, samePt, swapped } from "../src/math/plotPoint.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every point fits its level; a rectangle's fourth corner shares a number with the corners either side of it", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = plotTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${JSON.stringify(t)}`;
      const [lo, hi] = plotRange(level);
      for (const p of [t.p, ...t.corners]) assert.ok(p.every((v) => Number.isInteger(v) && v >= lo && v <= hi), where);
      if (level === 2) assert.ok(t.p[0] < 0 || t.p[1] < 0, where);
      if (level < 3) {
        assert.equal(t.corners.length, 0, where);
        continue;
      }
      const [A, B, C] = t.corners;
      // A and C are beside D; B is opposite it.
      assert.ok((A[0] === t.p[0]) !== (A[1] === t.p[1]), where);
      assert.ok((C[0] === t.p[0]) !== (C[1] === t.p[1]), where);
      assert.ok(B[0] !== t.p[0] && B[1] !== t.p[1], where);
      assert.ok(Math.abs(B[0] - t.p[0]) >= 3 && Math.abs(B[1] - t.p[1]) >= 3, where);
    }
});

test("a tap lands on the nearest crossing, or nowhere off the grid", () => {
  const g = { lo: -6, hi: 6, cell: 34 };
  for (let x = -6; x <= 6; x++)
    for (let y = -6; y <= 6; y++) {
      const [px, py] = gridAt(g, [x, y]);
      assert.deepEqual(gridSnap(g, px + 12, py - 12), [x, y]);
    }
  const [px, py] = gridAt(g, [6, -6]);
  assert.equal(gridSnap(g, px + 30, py), null);
  assert.equal(gridSnap(g, px, py + 30), null);
});

test("the picture: the point asked for, a tap that missed, and the point with its dashed lines once shown", () => {
  const t = { level: 2 as const, p: [3, -2] as [number, number], corners: [] };
  const asked = plotSvg(t, { asked: true });
  assert.match(asked.body, />P</);
  assert.doesNotMatch(asked.body, /\(3, −2\)/);
  const shown = plotSvg(t, { tap: [-2, 3], shown: true });
  assert.ok(!shown.body.includes("NaN"));
  assert.match(shown.body, />\(3, −2\)</);
  assert.match(shown.body, />\(−2, 3\)</);
  assert.match(shown.body, /stroke-dasharray="6 4"/);
  const corner = plotTask(3, rng(5));
  const drawn = plotSvg(corner, {});
  for (const k of ["A", "B", "C"]) assert.match(drawn.body, new RegExp(`>${k}<`));
  assert.match(plotSvg(corner, { shown: true }).body, /<polygon/);
  assert.equal(ptText([-4, 0]), "(−4, 0)");
  assert.deepEqual(swapped([1, 2]), [2, 1]);
});

test("in practice: the coordinates typed, the numbers swapped named, the point drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("coordinates", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.deepEqual(check(ex, ex.plain.replace(", ", "; "), w), { ok: true });
    assert.deepEqual(check(ex, `x = ${ex.answer.k === "tuple" ? ex.answer.vs[0] : ""}; y = ${ex.answer.k === "tuple" ? ex.answer.vs[1] : ""}`, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
  }
  for (const level of LEVELS) {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const ex = exercise("coordinates", level, seed, w);
      const trap = trapInputs(ex).find((x) => x.id === "swappedXY");
      if (!trap) continue;
      found++;
      const v = check(ex, trap.input, w);
      assert.equal(v.mistake, "swappedXY");
      assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
    }
    assert.ok(found > 30, `${found} questions at level ${level} name swappedXY`);
  }
  assert.deepEqual(plotSteps({ level: 3, p: [4, -1], corners: [[4, 5], [-2, 5], [-2, -1]] }), ["x_D = x_A = 4, \\; y_D = y_C = -1", "D = (4, -1)"]);
  const q = { skill: "coordinates" as const, level: 2, seed: 7 };
  const ex = exercise("coordinates", 2, 7, w);
  if (ex.answer.k !== "tuple") throw new Error();
  const [x, y] = ex.answer.vs;
  assert.deepEqual([mark(q, `(${x}, ${y})`), mark(q, `(${x + 1}, ${y})`), mark(q, "here")], ["correct", "wrong", "form"]);
});

test("the board: rounds of different points, stars from the points found, the notices, the ladder", () => {
  for (const { level, seed } of PLOT_LADDER) {
    const round = plotRound(level, seed);
    assert.equal(round.length, PLOT_ROUND);
    assert.ok(round.every((t, i) => round.every((o, j) => i === j || !samePt(o.p, t.p))));
  }
  assert.deepEqual([plotStars([true, true, true, true, true]), plotStars([true, false, true, true, true]), plotStars([false, false, true, true, true])], [3, 2, 1]);
  const t = (p: [number, number]) => ({ level: 2 as const, p, corners: [] });
  assert.equal(plotNotice(t([0, 4]), true, 1), "onAxis");
  assert.equal(plotNotice(t([-3, -1]), true, 1), "negative");
  assert.equal(plotNotice(plotTask(3, rng(1)), true, 1), "corner");
  assert.equal(plotNotice(t([2, 3]), true, 10), "streak10");
  assert.equal(plotNotice(t([0, 4]), false, 0), null);
  assert.equal(plotNotice(t([2, 3]), true, 2), null);
  assert.deepEqual(plotNow({ mode: "puzzle", stage: 4, level: 1, seed: 0, i: 2 }), plotRound(PLOT_LADDER[4].level, PLOT_LADDER[4].seed)[2]);
  assert.deepEqual(plotNow({ mode: "endless", stage: 0, level: 3, seed: 8, i: 0 }), plotTask(3, rng(8)));
});
