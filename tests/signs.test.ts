// Why a minus times a minus is a plus (src/math/signs.ts): the turning arrow ends where a × b is, and the pattern's
// rows are put in only when they keep to the line.
import assert from "node:assert/strict";
import test from "node:test";
import {
  arrowShape, arrowSteps, arrowValue, PATTERN_AS, patternRow, patternSlip, patternTap, productText, SIGN_PATTERN_START,
  SIGN_RANGE, stepPast0,
} from "../src/math/signs.ts";

const range = () => {
  const out: number[] = [];
  for (let n = SIGN_RANGE[0]; n <= SIGN_RANGE[1]; n++) if (n) out.push(n);
  return out;
};

test("the walked arrow ends at a × b, turned once for each minus sign", () => {
  for (const a of range())
    for (const b of range()) {
      const steps = arrowSteps(a, b);
      const end = arrowShape(a, b, steps.length);
      assert.equal(arrowValue(end), a * b, `${a} × ${b}`);
      assert.equal(end.turns, (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0));
      assert.equal(steps.at(-1)?.kind, "answer");
      // Before the walk the arrow is b itself.
      assert.equal(arrowValue(arrowShape(a, b, 0)), b);
    }
});

test("the walk: right, turned for b, stretched, turned for a", () => {
  assert.deepEqual(arrowSteps(-3, -2).map((s) => s.kind), ["size", "turnB", "stretch", "turnA", "answer"]);
  assert.deepEqual(arrowSteps(3, 2).map((s) => s.kind), ["size", "stretch", "answer"]);
  assert.deepEqual(arrowSteps(-3, -2).map((s, i) => arrowValue(arrowShape(-3, -2, i + 1))), [2, -2, -6, 6, 6]);
});

test("each turn after the walk is another × (−1)", () => {
  const n = arrowSteps(-3, -2).length;
  assert.equal(arrowValue(arrowShape(-3, -2, n, 1)), -6);
  assert.equal(arrowValue(arrowShape(-3, -2, n, 2)), 6);
  assert.equal(productText(-3, -2, 1), "(−3) × (−2) × (−1)");
  assert.equal(productText(4, 1), "4 × 1");
});

test("stepping a number skips 0 and stays in range", () => {
  assert.equal(stepPast0(0, 1), -1);
  assert.equal(stepPast0(0, -1), 1);
  assert.equal(stepPast0(3, 2), 3);
  assert.equal(stepPast0(9, 4), SIGN_RANGE[1]);
});

test("the pattern takes only the answers on the line, and says how a wrong one is wrong", () => {
  let d = { ...SIGN_PATTERN_START, b: -2 };
  assert.equal(patternRow(d), 3);
  d = patternTap(d, -2);
  assert.equal(d.wrong, -2);
  assert.equal(d.misses, 1);
  for (const a of PATTERN_AS.slice(3)) d = patternTap(d, a * d.b);
  assert.equal(patternRow(d), null);
  assert.deepEqual(d.placed, [0, 2, 4, 6]);
  assert.equal(d.misses, 0);
  // (−1) × (−2): −2 is the right size on the wrong side, −4 doubles back, 5 is just off.
  assert.equal(patternSlip(-2, 4, -2), "sign");
  assert.equal(patternSlip(-2, 4, -2 - 2), "far");
  assert.equal(patternSlip(-2, 5, 0), "jump");
  assert.equal(patternSlip(-2, 4, 5), "far");
});
