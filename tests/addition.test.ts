// Addition models: both styles draw the sum (with 0 and 1 too), the sum the other way round, and the rule for adding 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADD_LIMITS, ADD_STYLES, addCase, addRule, renderAddition, type AddSpec } from "../src/math/addition.ts";

test("the special cases of addition are named: adding 0 and adding 1, either way round", () => {
  assert.equal(addCase(7, 0), "zero");
  assert.equal(addCase(0, 7), "zero");
  assert.equal(addCase(0, 1), "zero");
  assert.equal(addCase(7, 1), "one");
  assert.equal(addCase(1, 7), "one");
  assert.equal(addCase(3, 4), null);
  assert.equal(addRule(7, 0), "n + 0 = n");
  assert.equal(addRule(0, 7), "0 + n = n");
  assert.equal(addRule(0, 0), "n + 0 = n");
  assert.equal(addRule(7, 1), null);
});

test("both styles draw the sum, the sum swapped round, and the rule for 0 once both numbers are shown", () => {
  for (const style of ADD_STYLES) {
    const lim = ADD_LIMITS[style];
    for (const [a, b] of [[3, 4], [4, 3], [7, 0], [0, 5], [0, 0], [7, 1], [8, 5], [lim.a, lim.b], [lim.a, 3]]) {
      const spec: AddSpec = { type: "addition", style, a, b, step: 999 };
      const where = `${style} ${a} + ${b}`;
      const r = renderAddition(spec);
      assert.ok(r.width > 0 && r.height > 0, where);
      assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, where);
      assert.ok(r.svg.includes(`>${a} + ${b} = ${a + b}<`), where);
      if (a !== b) assert.ok(r.svg.includes(`>${b} + ${a} = ${a + b}<`), where);
      else assert.equal(r.svg.split(`>${a} + ${b} = ${a + b}<`).length, 2, where); // written once, not swapped
      const rule = addRule(a, b);
      if (rule) assert.ok(r.svg.includes(`>${rule}<`), where);
      // Before b is shown, the sum is still a question and no rule is written.
      const half = renderAddition({ ...spec, step: 1 }).svg;
      assert.ok(half.includes(`>${a} + ? = ?<`), where);
      assert.doesNotMatch(half, /n \+ 0|0 \+ n/, where);
    }
  }
});

test("counting on: up to 10 hops of 1 on a short line, one jump otherwise", () => {
  const hops = (a: number, b: number) => (renderAddition({ type: "addition", style: "numberline", a, b, step: 999 }).svg.match(/marker-end="url\(#j1\)"/g) ?? []).length;
  assert.equal(hops(8, 5), 5);
  assert.equal(hops(7, 1), 1);
  assert.equal(hops(7, 0), 1); // the loop of +0
  assert.equal(hops(3, 15), 1);
  assert.equal(hops(40, 9), 1); // a long line: the hops would be too small to see
});

test("numbers outside 0 to the style's limit are refused", () => {
  assert.throws(() => renderAddition({ type: "addition", style: "counters", a: -1, b: 3, step: 999 }));
  assert.throws(() => renderAddition({ type: "addition", style: "counters", a: ADD_LIMITS.counters.a + 1, b: 3, step: 999 }));
  assert.throws(() => renderAddition({ type: "addition", style: "numberline", a: 2.5, b: 3, step: 999 }));
});
