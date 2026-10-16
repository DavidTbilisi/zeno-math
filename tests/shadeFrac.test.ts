// Shade the fraction: every task's shape has a whole number of pieces per part of the bottom and fits its level, a
// shading is read and judged by how many pieces it has (any pieces), the top number of pieces is named, pieces are
// laid out without overlapping, and the board's stars and notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import {
  decodeShade,
  encodeShade,
  judgeShade,
  piecesOf,
  renderShade,
  scattered,
  SHADE_LADDER,
  shadeNotice,
  shadeNow,
  shadeStars,
  shadeSvg,
  shadeTask,
  shapeBox,
} from "../src/math/shadeFrac.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;

test("every task: pieces a multiple of the bottom, the level's shapes, a grid as near square as goes", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 300; seed++) {
      const t = shadeTask(level, rng(seed));
      const where = `level ${level} seed ${seed}: ${t.n}/${t.d} of ${t.play.pieces} (${t.play.shape})`;
      assert.equal(t.play.pieces % t.d, 0, where);
      assert.equal(t.count, (t.n * t.play.pieces) / t.d, where);
      assert.equal(t.play.rows * t.play.cols, t.play.pieces, where);
      if (level === 1) assert.ok(t.play.pieces === t.d && ["bar", "circle"].includes(t.play.shape), where);
      if (level > 1) assert.ok(t.play.pieces > t.d, where);
      assert.ok(t.play.pieces <= (level === 3 ? 30 : 24), where);
      if (t.play.shape === "bar") assert.ok(t.play.pieces <= 12, where);
      if (t.play.shape === "grid" || t.play.shape === "set") assert.ok(t.play.rows <= t.play.cols, where);
    }
  assert.ok(Array.from({ length: 50 }, (_, i) => shadeTask(3, rng(i + 1))).some((t) => t.play.shape === "set"), "counters at hard");
});

test("a shading is written in order and read back; judged by the number of pieces", () => {
  assert.equal(encodeShade([5, 1, 1, 3]), "shade:1,3,5");
  assert.deepEqual(decodeShade(" shade: 1, 3 5 "), [1, 3, 5]);
  assert.deepEqual(decodeShade("shade:"), []);
  for (const bad of ["shade:a", "shade:-1", "1.5", Array(70).fill("1").join(",")]) assert.equal(decodeShade(bad), null, bad);
  const p = { pieces: 12 };
  assert.deepEqual(judgeShade(p, 9, "shade:0,1,2,3,4,5,6,7,8"), { ok: true });
  assert.deepEqual(judgeShade(p, 9, "shade:11,10,9,8,7,6,5,4,3"), { ok: true });
  assert.deepEqual(judgeShade(p, 9, "shade:0,1,2"), { ok: false, shaded: 3 });
  assert.deepEqual(judgeShade(p, 9, "shade:"), { ok: false, problem: "none" });
  assert.deepEqual(judgeShade(p, 9, "shade:12"), { ok: false, problem: "outside" });
  assert.deepEqual(judgeShade(p, 9, "shade:1,1"), { ok: false, problem: "twice" });
  assert.deepEqual(judgeShade(p, 9, "nine"), { ok: false, problem: "unreadable" });
});

test("in practice: the top number of pieces named, how many shaded said, the solution drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("shadeFraction", level, 7, w);
    assert.ok(ex.play?.kind === "shade" && ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(r.svg.includes("#4dabf7") && !r.svg.includes("NaN"));
  }
  const ex = exercise("shadeFraction", 2, 7, w);
  const [trap] = trapInputs(ex);
  const v = check(ex, trap.input, w);
  assert.equal(v.mistake, "topAsPieces");
  assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
  assert.equal(check(ex, "shade:0,1,2", w).hint, "You shaded 3.");
  assert.equal(check(ex, "shade:", w).why, w.reasons.shading.none);
  assert.equal(trapInputs(exercise("shadeFraction", 1, 7, w)).length, 0, "no trap when the pieces are the bottom");
  const q = { skill: "shadeFraction" as const, level: 3, seed: 7 };
  assert.deepEqual([mark(q, "shade:5,6,7,8,9"), mark(q, "shade:3"), mark(q, "shade:1,1,2,3,4")], ["correct", "wrong", "form"]);
});

test("pieces: one per piece, inside their box, a circle's sectors meeting at its centre", () => {
  for (const shape of ["bar", "grid", "circle", "set"] as const) {
    const play = { shape, pieces: 12, rows: shape === "bar" || shape === "circle" ? 1 : 3, cols: shape === "bar" || shape === "circle" ? 12 : 4 };
    const ps = piecesOf(play, 300);
    const box = shapeBox(play, 300);
    assert.equal(ps.length, 12, shape);
    for (const p of ps) {
      if (p.kind === "rect") assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= box.w + 1e-9 && p.y + p.h <= box.h + 1e-9, shape);
      if (p.kind === "dot") assert.ok(p.cx - p.r >= 0 && p.cx + p.r <= box.w + 1e-9, shape);
      if (p.kind === "path") assert.match(p.d, /^M150,150 L/);
    }
    assert.equal(shadeSvg(play, [0, 1, 2], 300).body.match(/#4dabf7/g)!.length, 3);
  }
  assert.ok(renderShade({ play: { shape: "bar", pieces: 4, rows: 1, cols: 4 }, count: 3 }, null).svg.includes("#4dabf7"));
});

test("the board: stars from misses, pieces side by side or scattered, the notices", () => {
  assert.deepEqual([shadeStars(0), shadeStars(1), shadeStars(2)], [3, 2, 1]);
  const bar = { shape: "bar" as const, pieces: 8, rows: 1, cols: 8 };
  const circle = { ...bar, shape: "circle" as const };
  const grid = { shape: "grid" as const, pieces: 12, rows: 3, cols: 4 };
  assert.equal(scattered(bar, [2, 3, 4]), false);
  assert.equal(scattered(bar, [1, 3]), true);
  assert.equal(scattered(circle, [7, 0, 1]), false, "round the circle, the last piece is next to the first");
  assert.equal(scattered(circle, [0, 2]), true);
  assert.equal(scattered(grid, [0, 4, 8]), false, "one above another");
  assert.equal(scattered(grid, [3, 4]), true, "the end of one row isn't beside the start of the next");
  assert.equal(scattered(grid, [5]), false);
  const t = shadeTask(2, rng(3));
  assert.equal(shadeNotice(t, [], 10), "streak10");
  assert.equal(shadeNotice({ ...t, play: grid }, [0, 5], 1), "scattered");
  assert.equal(shadeNotice({ ...t, play: { ...grid, shape: "set" } }, [0, 1], 1), "ofASet");
  assert.equal(shadeNotice({ ...t, play: { ...grid, pieces: 20, rows: 4, cols: 5 } }, [0, 1], 1), "manyPieces");
  assert.equal(shadeNotice({ ...t, play: grid }, [0, 1], 1), null);
  SHADE_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(shadeNow({ mode: "puzzle", stage, level: 1, seed: 0 }), shadeTask(level, rng(seed))));
  assert.deepEqual(shadeNow({ mode: "endless", stage: 0, level: 3, seed: 8 }), shadeTask(3, rng(8)));
});
