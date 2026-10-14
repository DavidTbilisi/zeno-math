// Long division with base-ten blocks: at every step the blocks still add up to the dividend
// (b groups + the pool), and at the end each group holds the quotient and the pool the remainder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planDivision, renderDivision } from "../src/math/division.ts";
import { blocksFit, blocksState } from "../src/math/divisionBlocks.ts";

const value = (c: { h: number; t: number; o: number }) => c.h * 100 + c.t * 10 + c.o;

test("blocks: nothing is lost at any step, and the end is quotient and remainder", () => {
  for (let a = 0; a <= 999; a++)
    for (let b = 1; b <= 9; b++) {
      const plan = planDivision(a, b, 0);
      for (let k = 0; k <= plan.steps.length; k++) {
        const st = blocksState(plan, b, k);
        assert.equal(b * value(st.group) + value(st.pool), a, `${a} ÷ ${b}, step ${k}`);
        for (const n of [...Object.values(st.group), ...Object.values(st.pool)]) assert.ok(n >= 0 && Number.isInteger(n));
        for (const n of Object.values(st.group)) assert.ok(n <= 9);
      }
      const end = blocksState(plan, b, plan.steps.length);
      assert.equal(value(end.group), Math.floor(a / b));
      assert.equal(value(end.pool), a % b);
    }
});

test("blocks: 405 ÷ 3 shares a hundred, trades the hundred left for ten tens, then shares those", () => {
  const plan = planDivision(405, 3, 0);
  assert.deepEqual(blocksState(plan, 3, 0), { pool: { h: 4, t: 0, o: 5 }, group: { h: 0, t: 0, o: 0 }, fresh: null, trades: [] });
  assert.deepEqual(blocksState(plan, 3, 1), { pool: { h: 0, t: 10, o: 5 }, group: { h: 1, t: 0, o: 0 }, fresh: "h", trades: [{ kind: "h", n: 1 }] });
  assert.deepEqual(blocksState(plan, 3, 2), { pool: { h: 0, t: 0, o: 15 }, group: { h: 1, t: 3, o: 0 }, fresh: "t", trades: [{ kind: "t", n: 1 }] });
  assert.deepEqual(blocksState(plan, 3, 3), { pool: { h: 0, t: 0, o: 0 }, group: { h: 1, t: 3, o: 5 }, fresh: "o", trades: [] });
});

test("blocks: a first step on a prefix trades the places before it (125 ÷ 3 starts on 12 tens)", () => {
  const st = blocksState(planDivision(125, 3, 0), 3, 1);
  assert.deepEqual(st.trades, [{ kind: "h", n: 1 }]);
  assert.deepEqual(st.group, { h: 0, t: 4, o: 0 });
});

test("blocks: the panel is drawn only for small whole-number divisions, and stays put while stepping", () => {
  assert.ok(blocksFit(999, 9, 0));
  assert.ok(!blocksFit(1000, 3, 0) && !blocksFit(405, 12, 0) && !blocksFit(7, 8, 2));
  const svg = (a: number, b: number, decimals: number, step: number, blocks = true) =>
    renderDivision({ type: "division", style: "corner", a, b, decimals, step, blocks }).svg;
  assert.ok(svg(405, 3, 0, 999).includes("translate("));
  assert.ok(!svg(405, 3, 0, 999, false).includes("translate("));
  assert.ok(!svg(4050, 3, 0, 999).includes("translate("));
  const at = (step: number) => svg(899, 7, 0, step).match(/translate\(([\d.]+),/)![1];
  assert.equal(new Set([0, 1, 2, 999].map(at)).size, 1);
  for (let a = 0; a <= 999; a += 37)
    for (let b = 1; b <= 9; b++)
      for (const step of [0, 1, 999]) assert.doesNotMatch(svg(a, b, 0, step), /NaN|undefined|Infinity/);
});
