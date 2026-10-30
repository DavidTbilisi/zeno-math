// The fraction operations' pictures: every question in practice gets one, mixed numbers too, drawn above the working.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { renderFracOp, type FracOpSpec } from "../src/math/fracop.ts";
import { exercise, LEVELS } from "../src/math/practice.ts";

const BLUE = "#a5d8ff";

test("every fraction operation in practice draws its picture, before the working", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 150; seed++) {
      const spec = exercise("fractions", level, seed, en.pracWords).solution?.spec as FracOpSpec | undefined;
      if (spec?.type !== "fracop") continue;
      const { svg } = renderFracOp(spec);
      const where = `level ${level} seed ${seed}: ${spec.a} ${spec.op} ${spec.b}`;
      assert.ok(svg.includes(BLUE) && !svg.includes("NaN"), where);
      // The bars come before the first line of working (the green answer line is last).
      assert.ok(svg.indexOf(BLUE) < svg.indexOf("fill=\"#2f9e44\"") || !svg.includes("fill=\"#2f9e44\""), where);
    }
});

test("÷ shows how many copies of b fit along a, the last part against a whole copy, and the count on common pieces", () => {
  const { svg } = renderFracOp({ type: "fracop", op: "÷", a: "1/5", b: "1/2", step: 99 });
  assert.ok(svg.includes('stroke-dasharray="6 4"'), "the whole copy of b, dashed");
  const big = renderFracOp({ type: "fracop", op: "÷", a: "3/4", b: "1/3", step: 99 }).svg;
  assert.ok(!big.includes("NaN") && big.includes(BLUE));
});

test("a sum too big for eight wholes is left without bars", () => {
  const { svg } = renderFracOp({ type: "fracop", op: "+", a: "7 1/2", b: "3 1/3", step: 99 });
  assert.ok(!svg.includes(BLUE));
});
