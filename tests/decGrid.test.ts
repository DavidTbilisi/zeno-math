// The hundredths grid: the decimal follows the squares shaded, painting and nudging stay on the grids, and each rule is
// said only once its amount has been made, never before.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asked, CELLS, decimalOf, DEC_GRID_START, gridsShown, LADDER, made, next, nudge, paint, parts, rulesFound, twoPlaces,
} from "../src/math/decGrid.ts";

test("hundredths are written as a decimal, trailing zeros dropped", () => {
  assert.equal(decimalOf(0), "0");
  assert.equal(decimalOf(7), "0.07");
  assert.equal(decimalOf(30), "0.3");
  assert.equal(decimalOf(47), "0.47");
  assert.equal(decimalOf(100), "1");
  assert.equal(decimalOf(120), "1.2");
  assert.equal(decimalOf(106), "1.06");
  assert.equal(twoPlaces(30), "0.30");
  assert.deepEqual(parts(147), { wholes: 1, tenths: 4, hundredths: 7 });
});

test("painting sets squares on or off, and nothing off the grids", () => {
  assert.deepEqual(paint([], [3, 1, 1, 2], true), [1, 2, 3]);
  assert.deepEqual(paint([1, 2, 3], [2], false), [1, 3]);
  assert.deepEqual(paint([], [-1, 200, 2.5, 199], true), [199]);
  assert.equal(CELLS, 200);
});

test("a nudge adds the first empty square or takes the last; with a column, ten", () => {
  assert.deepEqual(nudge([], true), [0]);
  assert.deepEqual(nudge([0, 1, 5], true), [0, 1, 2, 5]);
  assert.deepEqual(nudge([0, 1, 5], false), [0, 1]);
  assert.equal(nudge([], true, true).length, 10);
  assert.deepEqual(nudge([], false), []);
  const all = Array.from({ length: CELLS }, (_, i) => i);
  assert.equal(nudge(all, true).length, CELLS, "no square past the last grid");
});

test("the ladder asks small amounts before tenths, both, then past one; each rule comes with its amount made", () => {
  assert.deepEqual(LADDER.filter((r) => r.rule).map((r) => r.rule), ["hundredth", "tenth", "both", "whole"]);
  for (const r of LADDER) assert.ok(r.n > 0 && r.n <= CELLS);
  let s = DEC_GRID_START;
  const seen: string[] = [];
  for (let k = 0; k < LADDER.length; k++) {
    assert.equal(asked(s), LADDER[k].n);
    assert.ok(!made(s));
    const before = rulesFound(s).length;
    assert.equal(before, seen.length, "no rule said before its amount is made");
    s = { ...s, shaded: Array.from({ length: LADDER[k].n }, (_, i) => i) };
    assert.ok(made(s));
    if (LADDER[k].rule) seen.push(LADDER[k].rule!);
    assert.deepEqual(rulesFound(s).map((f) => f.rule), seen);
    assert.ok(!made({ ...s, shaded: s.shaded.slice(1) }) && !made({ ...s, shaded: [...s.shaded, CELLS - 1] }));
    s = next(s);
    assert.deepEqual(s.shaded, [], "the grids clear for the next amount");
  }
  assert.equal(asked(s), null, "free shading after the last rung");
  assert.ok(!made(s));
  assert.equal(rulesFound(s).length, 4);
  assert.equal(next(s).step, LADDER.length);
});

test("the second grid shows once an amount past one is asked or shaded", () => {
  assert.equal(gridsShown(DEC_GRID_START), 1);
  assert.equal(gridsShown({ shaded: [100], step: 0 }), 2);
  const past = LADDER.findIndex((r) => r.n > 100);
  assert.equal(gridsShown({ shaded: [], step: past - 1 }), 1);
  assert.equal(gridsShown({ shaded: [], step: past }), 2);
  assert.equal(gridsShown({ shaded: [], step: LADDER.length }), 2);
});
