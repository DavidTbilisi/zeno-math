// Lines of symmetry: every shape has the mirror lines it should, however it is turned; the lines offered include them
// and the diagonals that only halve a shape; the diagonals counted as well are named; the board's stars and notices
// follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { falseDiagonals, foldedPath, isMirror, linesOf, mirrorsOf, SYM_IDS, SYM_LADDER, SYM_SHAPES, symNotice, symNow, symStars, symSvg, symTask, cornersOf } from "../src/math/symmetry.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const LINES: Record<string, number> = {
  rectangle: 2, square: 4, isosceles: 1, equilateral: 3, kite: 1, rightIsosceles: 1,
  rhombus: 2, parallelogram: 0, trapezium: 1, pentagon: 5, hexagon: 6, scalene: 0,
  octagon: 8, star: 5, plus: 4, tee: 1, ell: 1, ess: 0, arrow: 1,
};

test("every shape has its mirror lines, turned any way", () => {
  assert.deepEqual([...SYM_IDS].sort(), Object.keys(LINES).sort());
  for (const shape of SYM_IDS)
    for (const turn of [0, 15, 45, 90, 135, 210]) assert.equal(mirrorsOf({ shape, turn }).length, LINES[shape], `${shape} turned ${turn}`);
  assert.deepEqual(mirrorsOf({ shape: "rectangle", turn: 0 }), [0, 90]);
  assert.deepEqual(mirrorsOf({ shape: "rectangle", turn: 30 }), [30, 120]);
  // A rectangle's diagonal halves it but doesn't fold it.
  const pts = cornersOf({ shape: "rectangle", turn: 0 });
  assert.ok(!isMirror(pts, (Math.atan2(1.6, 2.8) * 180) / Math.PI));
  assert.deepEqual(SYM_IDS.filter((s) => falseDiagonals({ shape: s, turn: 0 }) > 0).sort(), ["kite", "parallelogram", "rectangle", "trapezium"]);
});

test("the lines offered: every mirror line, six in all or more, none too close, a rectangle's diagonals among them", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 200; seed++) {
      const r = rng(seed);
      const t = symTask(level, r);
      assert.equal(SYM_SHAPES[t.shape].level, level);
      const lines = linesOf(t, r);
      const m = mirrorsOf(t);
      const where = `${JSON.stringify(t)}: ${lines}`;
      assert.ok(m.every((d) => lines.includes(d)), where);
      assert.equal(lines.length, Math.max(6, m.length), where);
      for (const a of lines) for (const b of lines) if (a !== b) assert.ok(Math.min(Math.abs(a - b), 180 - Math.abs(a - b)) >= 10, where);
    }
  const rect = { level: 1 as const, shape: "rectangle" as const, turn: 0 };
  const diag = Math.round((Math.atan2(1.6, 2.8) * 180) / Math.PI * 2) / 2;
  assert.ok(linesOf(rect, rng(1)).includes(diag) && linesOf(rect, rng(1)).includes(180 - diag));
  assert.ok(!foldedPath(rect, 30, 380).includes("NaN"));
});

test("in practice: the number of lines typed, the diagonals counted named, the lines drawn; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("symmetryLines", level, 7, w);
    assert.ok(ex.pic);
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN"));
    assert.equal((r.svg.match(/stroke-dasharray/g) ?? []).length, Number(ex.plain));
  }
  let found = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const ex = exercise("symmetryLines", 1, seed, w);
    const trap = trapInputs(ex).find((x) => x.id === "diagonalMirror");
    if (!trap) continue;
    found++;
    const v = check(ex, trap.input, w);
    assert.equal(v.mistake, "diagonalMirror");
    assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
  }
  assert.ok(found > 5, `${found} easy questions name the diagonals`);
  assert.ok(!symSvg({ shape: "star", turn: 15 }, 220, true).body.includes("NaN"));
  const q = { skill: "symmetryLines" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "2"), mark(q, "4"), mark(q, "two")], ["correct", "wrong", "form"]);
});

test("the board: stars from misses, the notices, the ladder", () => {
  assert.deepEqual([symStars(0), symStars(1), symStars(2)], [3, 2, 1]);
  assert.equal(symNotice({ level: 2, shape: "parallelogram", turn: 0 }, 0, 1), "none");
  assert.equal(symNotice({ level: 1, shape: "rectangle", turn: 0 }, 0, 1), "notDiagonal");
  assert.equal(symNotice({ level: 2, shape: "hexagon", turn: 0 }, 0, 1), "many");
  assert.equal(symNotice({ level: 1, shape: "square", turn: 0 }, 0, 1), null);
  assert.equal(symNotice({ level: 1, shape: "rectangle", turn: 0 }, 1, 0), null);
  assert.equal(symNotice({ level: 1, shape: "square", turn: 0 }, 0, 10), "streak10");
  SYM_LADDER.forEach(({ level, seed }, stage) => {
    const r = rng(seed);
    const task = symTask(level, r);
    assert.deepEqual(symNow({ mode: "puzzle", stage, level: 1, seed: 0 }), { task, lines: linesOf(task, r) });
  });
  // The nine puzzles show nine different shapes.
  assert.equal(new Set(SYM_LADDER.map((_, stage) => symNow({ mode: "puzzle", stage, level: 1, seed: 0 }).task.shape)).size, 9);
});
