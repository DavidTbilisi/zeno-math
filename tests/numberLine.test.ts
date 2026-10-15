// The live number line: numbers typed any way, any range and step, labels that fit, marks and the sum the jumps write.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatJump, formatNumber, jumpSum, labelEvery, moveMark, moveTogether, nearestTick, NUMBER_LINE_RANGES, parseNumber, rangeProblem, ticksOf, toFraction, toggleMark, withRange } from "../src/math/numberLine.ts";

test("numbers can be typed as whole numbers, decimals with a point or a comma, fractions and mixed numbers", () => {
  assert.equal(parseNumber("3"), 3);
  assert.equal(parseNumber(" -12 "), -12);
  assert.equal(parseNumber("−2.5"), -2.5);
  assert.equal(parseNumber("2,5"), 2.5);
  assert.equal(parseNumber(".5"), 0.5);
  assert.equal(parseNumber("1/4"), 0.25);
  assert.equal(parseNumber("−3/4"), -0.75);
  assert.equal(parseNumber("1 1/2"), 1.5);
  assert.equal(parseNumber("-1 1/2"), -1.5);
  assert.equal(parseNumber("10 000"), 10000);
  for (const bad of ["", "abc", "1/0", "1 1/0", "2..5", "1/", "--3"]) assert.equal(parseNumber(bad), null, bad);
});

test("a range needs a step above 0, an end past its start, and no more than 100 steps", () => {
  assert.equal(rangeProblem(0, 10, 1), null);
  assert.equal(rangeProblem(-1, 1, 0.02), null); // exactly 100 steps
  assert.equal(rangeProblem(0, 10, 0), "step");
  assert.equal(rangeProblem(0, 10, -1), "step");
  assert.equal(rangeProblem(5, 5, 1), "order");
  assert.equal(rangeProblem(5, 2, 1), "order");
  assert.equal(rangeProblem(0, 1000, 1), "many");
  for (const r of NUMBER_LINE_RANGES) assert.equal(rangeProblem(r.from, r.to, r.step), null);
});

test("ticks run from the start by the step, without floating-point dust", () => {
  assert.deepEqual(ticksOf(0, 1, 0.1), [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
  assert.deepEqual(ticksOf(-3, 3, 1.5), [-3, -1.5, 0, 1.5, 3]);
  assert.deepEqual(ticksOf(0, 1, 0.3), [0, 0.3, 0.6, 0.9]); // the last tick is at or before the end
  assert.equal(ticksOf(0, 1, 1 / 3).length, 4);
  assert.deepEqual(ticksOf(1990, 2030, 10), [1990, 2000, 2010, 2020, 2030]);
  assert.deepEqual(ticksOf(0, 10, 0), []);
});

test("labels are decimals with the places the step needs, or fractions in lowest terms", () => {
  const dec = (v: number, step: number, from = 0) => formatNumber(v, { fractions: false, step, from });
  const frac = (v: number) => formatNumber(v, { fractions: true, step: 1, from: 0 });
  assert.equal(dec(0.30000000000000004, 0.1), "0.3");
  assert.equal(dec(1, 0.5), "1");
  assert.equal(dec(-2.5, 0.5), "−2.5");
  assert.equal(dec(1 / 3, 1 / 3), "0.333");
  assert.equal(dec(25000, 5000), "25 000");
  assert.equal(dec(2020, 10), "2020");
  assert.equal(dec(-0.0000001, 1), "0"); // never "−0"
  assert.equal(frac(0.75), "3/4");
  assert.equal(frac(-0.5), "−1/2");
  assert.equal(frac(1.25), "5/4");
  assert.equal(frac(2 / 3), "2/3");
  assert.equal(frac(3), "3");
  assert.deepEqual(toFraction(0.1), { n: 1, d: 10 });
  assert.deepEqual(toFraction(-7 / 8), { n: -7, d: 8 });
});

test("as many ticks are numbered as fit, the round ones first", () => {
  const ticks = ticksOf(0, 100, 1);
  const every = (spacing: number) => ticks.filter((_, i) => labelEvery(ticks, 1, spacing, 20)(i));
  assert.equal(every(40).length, 101); // room for all
  assert.deepEqual(every(6.8).slice(0, 3), [0, 5, 10]);
  assert.deepEqual(every(2).slice(0, 3), [0, 20, 40]);
  // From 3, numbered every 2nd: the even numbers, not 3, 5, 7.
  const t2 = ticksOf(3, 13, 1);
  assert.deepEqual(t2.filter((_, i) => labelEvery(t2, 1, 15, 20)(i)), [4, 6, 8, 10, 12]);
  // A start between steps counts from the start.
  const t3 = ticksOf(0.5, 10.5, 1);
  assert.deepEqual(t3.filter((_, i) => labelEvery(t3, 1, 15, 20)(i)), [0.5, 2.5, 4.5, 6.5, 8.5, 10.5]);
});

test("a click marks the nearest tick and a second click takes it off; a new range keeps the marks inside it", () => {
  const ticks = ticksOf(-5, 5, 1);
  assert.equal(nearestTick(ticks, 2.4), 2);
  assert.equal(nearestTick(ticks, -9), -5);
  let marks = toggleMark([], 2);
  marks = toggleMark(marks, -3);
  assert.deepEqual(marks, [2, -3]);
  assert.deepEqual(toggleMark(marks, 2), [-3]);
  const d = { from: -5, to: 5, step: 1, fractions: false, marks: [2, -3, 5], jumps: true, together: false };
  assert.deepEqual(withRange(d, { from: 0, to: 10, step: 1 }).marks, [2, 5]);
});

test("a dragged mark keeps its place in the order, and a mark it lands on gives way", () => {
  assert.deepEqual(moveMark([3, 7, 5], 2, 6), [3, 7, 6]);
  assert.deepEqual(moveMark([3, 7, 5], 0, 1), [1, 7, 5]);
  assert.deepEqual(moveMark([3, 7, 5], 2, 3), [7, 3]); // 5 dropped on 3: that 3 goes, the dragged one stays last
  assert.deepEqual(moveMark([3, 7, 5], 1, 7), [3, 7, 5]); // back where it was
});

test("moving together slides every mark the same way, so the gaps stay the same, and stops at the ends", () => {
  assert.deepEqual(moveTogether([28, 63], 0, 30, 0, 100), [30, 65]);
  assert.deepEqual(moveTogether([28, 63], 1, 60, 0, 100), [25, 60]);
  assert.deepEqual(moveTogether([3, 7, 5], 2, 9, 0, 10), [6, 10, 8]); // 7 reaches 10 first: they stop there
  assert.deepEqual(moveTogether([3, 7, 5], 0, -4, 0, 10), [0, 4, 2]);
  assert.deepEqual(moveTogether([0.25, 0.75], 0, 0.5, 0, 1), [0.25 + 0.25, 1]);
  assert.deepEqual(moveTogether([0.1, 0.3], 0, 0.2, 0, 1), [0.2, 0.4]); // no floating-point dust
  // The sum the jumps write keeps its jumps: 28 + 35 = 63 becomes 30 + 35 = 65.
  const o = { fractions: false, step: 1, from: 0 };
  assert.equal(jumpSum(moveTogether([28, 63], 0, 30, 0, 100), o), "30 + 35 = 65");
});

test("the jumps are signed and write the sum from the first mark to the last", () => {
  const o = { fractions: false, step: 1, from: -10 };
  assert.equal(formatJump(3, 7, o), "+4");
  assert.equal(formatJump(7, 5, o), "−2");
  assert.equal(jumpSum([3, 7, 5], o), "3 + 4 − 2 = 5");
  assert.equal(jumpSum([-3, 2], o), "−3 + 5 = 2");
  assert.equal(jumpSum([4], o), null);
  assert.equal(jumpSum([0.25, 1, 0.5], { fractions: true, step: 0.25, from: 0 }), "1/4 + 3/4 − 1/2 = 1/2");
});
