// Scatter plots: the least-squares line has residuals that add to nothing and the least sum of squares; the piece
// calls a line best within 3 % of it; every question is right with its own answer and wrong with each slip; the grades.
import assert from "node:assert/strict";
import test from "node:test";
import { en } from "../src/locales/en.ts";
import { gradeOf } from "../src/model/curriculum.ts";
import { check, exercise, trapInputs } from "../src/math/practice.ts";
import { bestLine, FIT_SETS, FITLINE_START, isBest, lineText, residuals, sse } from "../src/math/scatterFit.ts";

const w = en.pracWords;

test("the line of best fit: residuals balance, and no nudge makes the squares smaller", () => {
  for (const pts of FIT_SETS) {
    const b = bestLine(pts);
    assert.ok(Math.abs(residuals(pts, b).reduce((s, r) => s + r, 0)) < 1e-9);
    for (const d of [[0.05, 0], [-0.05, 0], [0, 0.2], [0, -0.2]]) assert.ok(sse(pts, { m: b.m + d[0], c: b.c + d[1] }) > sse(pts, b));
  }
  assert.equal(isBest(FITLINE_START), false);
  const b = bestLine(FIT_SETS[0]);
  assert.equal(isBest({ set: 0, y0: Math.round(b.c * 10) / 10, y1: Math.round((b.c + 10 * b.m) * 10) / 10 }), true);
  assert.equal(lineText({ m: 2.5, c: 10 }), "y = 2.5x + 10");
  assert.equal(lineText({ m: 1, c: -2 }), "y = x − 2");
});

test("every question is right with its own answer, and every slip is wrong with its hint", () => {
  const seen = new Set<string>();
  for (const level of [1, 2, 3] as const)
    for (let seed = 1; seed <= 150; seed++) {
      const ex = exercise("scatter", level, seed, w);
      assert.ok(check(ex, ex.plain, w).ok, `${level}/${seed} ${ex.prompt} ${ex.plain}`);
      for (const t of trapInputs(ex)) {
        seen.add(t.id);
        const v = check(ex, t.input, w);
        assert.ok(!v.ok, `${level}/${seed} ${t.id}`);
        assert.ok(v.hint && v.hint.length > 20, `${level}/${seed} ${t.id} ${t.input}`);
      }
    }
  for (const id of ["directionReversed", "outlierExtreme", "predictNoIntercept", "slopeAsIntercept", "slopePerMark", "interceptAsSlope", "residualSign", "fitByOnePoint", "correlationCause"])
    assert.ok(seen.has(id), id);
  assert.deepEqual([1, 2, 3].map((L) => gradeOf("scatter", L as 1 | 2 | 3)), [8, 8, 10]);
});
