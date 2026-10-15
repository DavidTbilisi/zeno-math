// Addition and subtraction models: each style draws the sum or difference (with 0, 1 and n − n too), the same fact
// another way (b + a, or adding back), and the special case's rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADD_LIMITS, ADD_STYLES, addCase, addRule, renderAddition, renderSubtraction, SUB_LIMITS, SUB_STYLES, subCase, subRule, type AddSpec, type SubSpec } from "../src/math/addition.ts";

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

test("the special cases of subtraction are named: taking away 0, a number from itself, and taking away 1", () => {
  assert.equal(subCase(7, 0), "zero");
  assert.equal(subCase(0, 0), "zero");
  assert.equal(subCase(7, 7), "self");
  assert.equal(subCase(1, 1), "self");
  assert.equal(subCase(7, 1), "one");
  assert.equal(subCase(7, 3), null);
  assert.equal(subRule(7, 0), "n − 0 = n");
  assert.equal(subRule(7, 7), "n − n = 0");
  assert.equal(subRule(7, 1), null);
});

test("both subtraction styles draw the difference, the check by adding back, and the rule once both numbers are shown", () => {
  for (const style of SUB_STYLES) {
    const max = SUB_LIMITS[style];
    for (const [a, b] of [[7, 3], [7, 0], [7, 7], [0, 0], [7, 1], [13, 5], [max, max], [max, 15], [max, 0]]) {
      const spec: SubSpec = { type: "subtraction", style, a, b, step: 999 };
      const where = `${style} ${a} − ${b}`;
      const r = renderSubtraction(spec);
      assert.ok(r.width > 0 && r.height > 0, where);
      assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, where);
      assert.ok(r.svg.includes(`>${a} − ${b} = ${a - b}<`), where);
      assert.ok(r.svg.includes(`>${a - b} + ${b} = ${a}<`), where);
      const rule = subRule(a, b);
      if (rule) assert.ok(r.svg.includes(`>${rule}<`), where);
      const half = renderSubtraction({ ...spec, step: 1 }).svg;
      assert.ok(half.includes(`>${a} − ? = ?<`), where);
      assert.doesNotMatch(half, /n − /, where);
    }
  }
});

test("taking away crosses out b counters; counting back hops b times on a short line", () => {
  const crosses = (a: number, b: number) => (renderSubtraction({ type: "subtraction", style: "takeaway", a, b, step: 999 }).svg.match(/<path d="M[^"]*L[^"]*M/g) ?? []).length;
  assert.equal(crosses(7, 3), 3);
  assert.equal(crosses(7, 0), 0);
  assert.equal(crosses(7, 7), 7);
  const hops = (a: number, b: number) => (renderSubtraction({ type: "subtraction", style: "numberline", a, b, step: 999 }).svg.match(/marker-end="url\(#j1\)"/g) ?? []).length;
  assert.equal(hops(13, 5), 5);
  assert.equal(hops(7, 0), 1); // the loop of −0
  assert.equal(hops(42, 15), 1);
});

test("a difference below 0 or past the style's limit is refused", () => {
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "takeaway", a: 3, b: 7, step: 999 }));
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "takeaway", a: SUB_LIMITS.takeaway + 1, b: 0, step: 999 }));
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "numberline", a: 5, b: -1, step: 999 }));
});
