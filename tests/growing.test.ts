// Growing patterns: every figure has the squares its rule says, none twice, each figure inside the next; a built
// figure is judged wherever it lies; the working ends on the answer; ten figure 1s for figure 10 is named; and the
// board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import {
  buildGrid,
  countOf,
  figure,
  figuresSvg,
  GROW_LADDER,
  growAnswer,
  growNotice,
  growNow,
  growQuestion,
  growStars,
  growSteps,
  growTask,
  judgeBuilt,
  linear,
  renderGrow,
  scaledFigure,
  shapeKey,
  stepOf,
  whichFigure,
  type GrowKind,
} from "../src/math/growing.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const KINDS: GrowKind[] = ["L", "T", "plus", "U", "steps", "frame", "square", "rect", "stairs"];

test("every figure: the squares its rule says, none twice, on the grid from 0, growing by the same step when linear", () => {
  for (const kind of KINDS)
    for (let n = 1; n <= 12; n++) {
      const f = figure(kind, n);
      assert.equal(f.length, countOf(kind, n), `${kind} ${n}`);
      assert.equal(new Set(f.map((c) => `${c.x},${c.y}`)).size, f.length, `${kind} ${n}: no square twice`);
      assert.equal(Math.min(...f.map((c) => c.x)), 0);
      assert.equal(Math.min(...f.map((c) => c.y)), 0);
      if (linear(kind)) assert.equal(countOf(kind, n + 1) - countOf(kind, n), stepOf(kind), kind);
    }
  assert.equal(whichFigure("L", 41), 20);
  assert.equal(whichFigure("L", 42), 0, "no figure of an L has an even number of squares");
});

test("a built figure is the shape anywhere on the grid, and only that shape", () => {
  for (const kind of ["L", "T", "plus", "U", "steps"] as const) {
    const { cols, rows } = buildGrid(kind);
    const at = (dx: number, dy: number) => figure(kind, 4).map((c) => (rows - 1 - (c.y + dy)) * cols + c.x + dx);
    assert.deepEqual(judgeBuilt(kind, 4, at(0, 0), cols, rows), { ok: true, count: countOf(kind, 4) });
    assert.equal(judgeBuilt(kind, 4, at(2, 2), cols, rows).ok, true, `${kind} moved up and along`);
    assert.equal(judgeBuilt(kind, 4, at(1, 1).slice(1), cols, rows).ok, false, `${kind} a square short`);
    assert.equal(judgeBuilt(kind, 4, figure(kind, 3).map((c) => (rows - 1 - c.y) * cols + c.x), cols, rows).ok, false, `${kind} figure 3`);
  }
  assert.equal(shapeKey([]), "");
  assert.equal(shapeKey([{ x: 3, y: 5 }, { x: 4, y: 5 }]), shapeKey([{ x: 0, y: 0 }, { x: 1, y: 0 }]));
});

test("every task and question fits its level, and the working ends on the answer", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++)
      for (const t of [growTask(level, rng(seed)), growQuestion(level, rng(seed))]) {
        const where = `level ${level} seed ${seed}: ${t.kind} ${JSON.stringify(t.ask)}`;
        const v = growAnswer(t);
        assert.ok(Number.isInteger(v) && v > 0, where);
        if (t.ask.dir === "which") assert.equal(countOf(t.kind, v), t.ask.count, where);
        if (level < 3) assert.ok(linear(t.kind), where);
        assert.match(growSteps(t).at(-1)!, new RegExp(`= ${v}$`), where);
      }
  const pic = figuresSvg("plus", true, 420);
  assert.ok(pic.body.includes("#ffa94d") && pic.w === 420);
  assert.ok(!renderGrow({ task: growTask(3, rng(5)) }, null).svg.includes("NaN"));
});

test("in practice: the count typed, ten figure 1s named, the solution drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("growingPattern", level, 7, w);
    assert.ok(ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("#74c0fc") && !r.svg.includes("NaN"));
  }
  const ex = exercise("growingPattern", 2, 7, w);
  const [trap] = trapInputs(ex).filter((t) => t.id === "scaledFigure");
  const v = check(ex, trap.input, w);
  assert.equal(v.mistake, "scaledFigure");
  assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
  assert.equal(scaledFigure({ level: 3, kind: "square", ask: { dir: "count", k: 10 } }), null, "n² isn't a step each time");
  const q = { skill: "growingPattern" as const, level: 2, seed: 7 };
  assert.deepEqual([mark(q, "21"), mark(q, "30")], ["correct", "wrong"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([growStars(0), growStars(1), growStars(2)], [3, 2, 1]);
  const t = { level: 2 as const, kind: "L" as const, ask: { dir: "count" as const, k: 10 } };
  assert.equal(growNotice(t, 0, 10), "streak10");
  assert.equal(growNotice(t, 1, 0), null);
  assert.equal(growNotice({ ...t, ask: { dir: "which", count: 41 } }, 0, 1), "backwards");
  assert.equal(growNotice({ ...t, kind: "square" }, 0, 1), "squares");
  assert.equal(growNotice({ ...t, ask: { dir: "count", k: 50 } }, 0, 1), "bigFigure");
  assert.equal(growNotice(t, 0, 1), null);
  GROW_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(growNow({ mode: "puzzle", stage, level: 1, seed: 0 }), growTask(level, rng(seed))));
  assert.deepEqual(growNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), growTask(3, rng(8)));
});
