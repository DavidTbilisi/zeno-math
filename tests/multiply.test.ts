// Multiplication models: every style draws a factor of 0 or 1, and names the special case's rule under the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MULTIPLY_LIMITS, MULTIPLY_STYLES, multiplyCase, multiplyRule, renderMultiply, stepCount, type MultiplySpec } from "../src/math/multiply.ts";

test("the special cases of multiplication are named: times 0 and times 1, either way round", () => {
  assert.equal(multiplyCase(7, 0), "zero");
  assert.equal(multiplyCase(0, 7), "zero");
  assert.equal(multiplyCase(0, 1), "zero");
  assert.equal(multiplyCase(7, 1), "one");
  assert.equal(multiplyCase(1, 7), "one");
  assert.equal(multiplyCase(3, 4), null);
  assert.equal(multiplyRule(7, 0), "n × 0 = 0");
  assert.equal(multiplyRule(0, 7), "0 × n = 0");
  assert.equal(multiplyRule(7, 1), "n × 1 = n");
  assert.equal(multiplyRule(1, 7), "1 × n = n");
  assert.equal(multiplyRule(3, 4), null);
});

test("every style draws 0 and 1 as factors, with the product and the rule once every step is shown", () => {
  for (const style of MULTIPLY_STYLES) {
    for (const [a, b] of [[0, 4], [3, 0], [0, 0], [1, 6], [5, 1], [3, 4]]) {
      const spec: MultiplySpec = { type: "multiply", style, a, b, step: 999 };
      const r = renderMultiply(spec);
      const where = `${style} ${a} × ${b}`;
      assert.ok(Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 0 && r.height > 0, where);
      assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, where);
      assert.match(r.svg, new RegExp(`${a} × ${b} = [^<]*${a * b}<`), where);
      const rule = multiplyRule(a, b);
      if (rule) assert.ok(r.svg.includes(`>${rule}<`), where);
      else assert.doesNotMatch(r.svg, /n × /, where);
      // Part way through, the rule isn't written yet.
      if (rule && stepCount(spec) > 0) assert.ok(!renderMultiply({ ...spec, step: 0 }).svg.includes(rule), where);
    }
  }
});

test("factors outside 0 to the style's limit are refused", () => {
  assert.throws(() => renderMultiply({ type: "multiply", style: "groups", a: -1, b: 3, step: 999 }));
  assert.throws(() => renderMultiply({ type: "multiply", style: "groups", a: MULTIPLY_LIMITS.groups.a + 1, b: 3, step: 999 }));
  assert.throws(() => renderMultiply({ type: "multiply", style: "array", a: 2.5, b: 3, step: 999 }));
});
