// Addition and subtraction models: each style draws the sum or difference (with 0, 1 and n − n too), the same fact
// another way (b + a, or adding back), and the special case's rule. In columns: a carry goes to the next column, a
// ten is taken from the one on the left (through a row of zeros in one go), and each step works one more column.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ADD_LIMITS, ADD_STYLES, addCase, addColumns, addRule, addStepCount, inThrees, renderAddition, renderSubtraction, SUB_LIMITS, SUB_STYLES, sameShift, subCase, subColumns, subRule, tradeMark, writtenLayout, type AddSpec, type SubSpec } from "../src/math/addition.ts";

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

test("the styles with counters and a number line draw the sum, the sum swapped round, and the rule for 0 once both numbers are shown", () => {
  for (const style of ADD_STYLES.filter((x) => x !== "column")) {
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

test("every subtraction style but the written one draws the difference, the check by adding back, and the rule once both numbers are shown", () => {
  for (const style of SUB_STYLES.filter((x) => x !== "column")) {
    const max = SUB_LIMITS[style];
    for (const [a, b] of [[7, 3], [7, 0], [7, 7], [0, 0], [7, 1], [13, 5], [max, max], [max, 15], [max, 0]]) {
      const spec: SubSpec = { type: "subtraction", style, a, b, step: 999 };
      const where = `${style} ${a} − ${b}`;
      const r = renderSubtraction(spec);
      assert.ok(r.width > 0 && r.height > 0, where);
      assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, where);
      // Same difference writes the slid difference in between: 63 − 28 = 65 − 30 = 35.
      const s = style === "same" ? sameShift(b) : 0;
      assert.ok(r.svg.includes(`>${a} − ${b}${s ? ` = ${a + s} − ${b + s}` : ""} = ${a - b}<`), where);
      assert.ok(r.svg.includes(`>${a - b} + ${b} = ${a}<`), where);
      const rule = subRule(a, b);
      if (rule) assert.ok(r.svg.includes(`>${rule}<`), where);
      const half = renderSubtraction({ ...spec, step: 1 }).svg;
      assert.ok(half.includes(style === "same" ? `>${a} − ${b} = ?<` : `>${a} − ? = ?<`), where);
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

test("same difference slides b to the nearest whole ten, both lines bracket a gap of the same length", () => {
  assert.equal(sameShift(28), 2);
  assert.equal(sameShift(19), 1);
  assert.equal(sameShift(52), -2);
  assert.equal(sameShift(3), -3);
  assert.equal(sameShift(15), 5); // a 5 goes up
  assert.equal(sameShift(30), 0);
  assert.equal(sameShift(0), 0);
  const at = (step: number) => renderSubtraction({ type: "subtraction", style: "same", a: 63, b: 28, step }).svg;
  // Step 1: the gap on one line, its length still a question. Step 2: the slide, +2 for both, onto a second line.
  assert.equal((at(1).match(/>\?</g) ?? []).length, 1);
  assert.doesNotMatch(at(1), /marker-end/);
  assert.equal((at(2).match(/>\?</g) ?? []).length, 2);
  assert.equal((at(2).match(/marker-end/g) ?? []).length, 2);
  assert.equal((at(2).match(/>\+2</g) ?? []).length, 2);
  assert.ok(at(2).includes(">(63 + 2) − (28 + 2) = 65 − 30<"));
  assert.ok(at(2).includes(">63 − 28 = 65 − 30 = ?<"));
  // Done: both gaps are 35, and the answer is written.
  assert.equal((at(3).match(/>35</g) ?? []).length, 2);
  assert.ok(at(3).includes(">63 − 28 = 65 − 30 = 35<"));
  // Sliding down: 52 − 22 = 50 − 20.
  const down = renderSubtraction({ type: "subtraction", style: "same", a: 52, b: 22, step: 999 }).svg;
  assert.ok(down.includes(">(52 − 2) − (22 − 2) = 50 − 20<"));
  assert.equal((down.match(/>−2</g) ?? []).length, 2);
});

test("a difference below 0 or past the style's limit is refused", () => {
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "takeaway", a: 3, b: 7, step: 999 }));
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "takeaway", a: SUB_LIMITS.takeaway + 1, b: 0, step: 999 }));
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "numberline", a: 5, b: -1, step: 999 }));
});

test("in columns, a sum carries a 1 to the next column and a difference takes a ten from the left", () => {
  assert.deepEqual(addColumns(367, 285).map((c) => [c.in, c.d, c.out]), [[0, 2, 1], [1, 5, 1], [1, 6, 0]]);
  assert.deepEqual(subColumns(523, 278).map((c) => [c.top, c.d]), [[13, 5], [11, 4], [4, 2]]);
  // Across zeros: the zeros stand at 9, and all of them are crossed when the ones are worked.
  const zeros = subColumns(4003, 1568);
  assert.deepEqual(zeros.map((c) => c.top), [13, 9, 9, 3]);
  assert.deepEqual(zeros.map((c) => c.lentAt), [0, 1, 1, 1]);
  assert.deepEqual([0, 1, 2, 3].map((j) => tradeMark(zeros, j, 0)), [null, null, null, null]);
  assert.deepEqual([0, 1, 2, 3].map((j) => tradeMark(zeros, j, 1)), [13, 9, 9, 3]);
  // 523 − 278: the tens are 1 once the ones have taken from them, and 11 once they have taken from the hundreds.
  const plain = subColumns(523, 278);
  assert.deepEqual([1, 2, 3].map((k) => tradeMark(plain, 1, k)), [1, 11, 11]);
  assert.deepEqual([1, 2, 3].map((k) => tradeMark(plain, 2, k)), [null, 4, 4]);
  for (let i = 0; i < 400; i++) {
    const [a, b] = [(i * 7919 + 13) % 1_000_000, (i * 104_729 + 7) % 1_000_000];
    const sum = addColumns(a, b);
    assert.equal(Number((sum[sum.length - 1].out ? "1" : "") + sum.map((c) => c.d).reverse().join("")), a + b, `${a} + ${b}`);
    const [hi, lo] = [Math.max(a, b), Math.min(a, b)];
    const diff = subColumns(hi, lo);
    assert.equal(Number(diff.map((c) => c.d).reverse().join("")), hi - lo, `${hi} − ${lo}`);
    assert.ok(diff.every((c) => c.top >= c.y && c.top <= 19 && c.d >= 0 && c.d <= 9), `${hi} − ${lo}`);
  }
});

test("the written method is drawn a column at a time, the answer and the check written once it is done", () => {
  const sum: AddSpec = { type: "addition", style: "column", a: 748_915, b: 386_297, step: 999 };
  assert.equal(addStepCount(sum), 6);
  const whole = renderAddition(sum).svg;
  assert.doesNotMatch(whole, /NaN|Infinity|undefined/);
  assert.ok(whole.includes(`>${inThrees(748_915)} + ${inThrees(386_297)} = ${inThrees(1_135_212)}<`));
  assert.ok(whole.includes(">5 + 7 = 12<") && whole.includes(">7 + 3 + 1 = 11<"));
  const one = renderAddition({ ...sum, step: 1 }).svg;
  assert.ok(one.includes(">5 + 7 = 12<") && !one.includes(">1 + 9 + 1 = 11<") && one.includes(" = ?<"));
  assert.ok(!renderAddition({ ...sum, step: 0 }).svg.includes(" = 12<"));
  const diff: SubSpec = { type: "subtraction", style: "column", a: 4003, b: 1568, step: 999 };
  assert.equal(addStepCount(diff), 4);
  const done = renderSubtraction(diff).svg;
  assert.ok(done.includes(`>${inThrees(4003)} − ${inThrees(1568)} = ${inThrees(2435)}<`) && done.includes(`>${inThrees(2435)} + ${inThrees(1568)} = ${inThrees(4003)}<`));
  assert.ok(done.includes(">13 − 8 = 5<") && done.includes(">9 − 6 = 3<") && done.includes(">3 − 1 = 2<"));
  // Every top digit is crossed out; before any column is worked, none is.
  const crossed = (svg: string) => (svg.match(/stroke-linecap="round"/g) ?? []).length;
  assert.equal(crossed(done), 4);
  assert.equal(crossed(renderSubtraction({ ...diff, step: 1 }).svg), 4);
  assert.equal(crossed(renderSubtraction({ ...diff, step: 0 }).svg), 0);
  for (const [a, b] of [[0, 0], [7, 0], [9, 9], [999_999, 999_999], [1000, 1], [SUB_LIMITS.column, 0]]) {
    assert.doesNotMatch(renderAddition({ type: "addition", style: "column", a, b, step: 999 }).svg, /NaN|Infinity|undefined/, `${a} + ${b}`);
    assert.doesNotMatch(renderSubtraction({ type: "subtraction", style: "column", a, b, step: 999 }).svg, /NaN|Infinity|undefined/, `${a} − ${b}`);
  }
  assert.throws(() => renderAddition({ type: "addition", style: "column", a: ADD_LIMITS.column.a + 1, b: 1, step: 999 }));
  assert.throws(() => renderSubtraction({ type: "subtraction", style: "column", a: 5, b: 6, step: 999 }));
});

test("a sum set out on paper shows its digits, a box for a missing one, and the answer's row only when given", () => {
  const open = writtenLayout("367", "285", "+");
  assert.equal((open.body.match(/<text/g) ?? []).length, 7);
  assert.ok(!open.body.includes("<rect") && open.w > 0 && open.h > 0);
  const boxed = writtenLayout("4□7", "285", "+", "742");
  assert.equal((boxed.body.match(/<rect/g) ?? []).length, 1);
  assert.equal((boxed.body.match(/<text/g) ?? []).length, 9);
  assert.ok(!boxed.body.includes("□"));
});
