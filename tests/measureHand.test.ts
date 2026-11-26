// The ruler and scale by hand: the marks under the pencil's ends change as the ruler moves but their difference does
// not; the tiles hold the right answer and the usual slip; a rule comes only with a right tap; the needle adds the pan.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  again, ends, MEASURE_HAND_START, moveRuler, needle, next, onRuler, putWeight, RULER_LADDER, RULER_LEN, SCALE_LADDER, switchMode, takeWeight, tap, tiles, trayOf,
} from "../src/math/measureHand.ts";

test("every round's pencil lies on its ruler at the start, and the difference of its ends is its length wherever the ruler is", () => {
  for (const r of RULER_LADDER) {
    assert.ok(onRuler(r, r.at), JSON.stringify(r));
    for (const at of [r.at, r.at - 1, r.at + 0.5]) {
      const [p, q] = ends(r, at);
      assert.equal(q - p, r.n);
    }
  }
  assert.ok(RULER_LADDER.some((r) => r.from > 0), "a broken ruler, with no 0, comes in the ladder");
  assert.ok(RULER_LADDER.slice(0, 2).every((r) => r.from === 0), "after whole rulers");
});

test("the ruler moves by half centimetres and stays on the mat", () => {
  const s = MEASURE_HAND_START;
  assert.equal(moveRuler(s, 4.3).at, 4.5);
  assert.equal(moveRuler(s, 99).at, 19);
  assert.equal(moveRuler(s, -99).at, -RULER_LEN + 1);
});

test("the tiles are three different numbers: the length or mass, and the slip of the end mark or of 1 g a mark", () => {
  let s = MEASURE_HAND_START;
  for (let k = 0; k < RULER_LADDER.length; k++, s = next(s)) {
    const t = tiles(s)!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3);
    assert.equal(t.right, RULER_LADDER[k].n);
    if (RULER_LADDER[k].at !== RULER_LADDER[k].a) assert.equal(t.slip, ends(RULER_LADDER[k], RULER_LADDER[k].at)[1], "the mark at the point");
  }
  assert.equal(tiles(s), null);
  s = switchMode(MEASURE_HAND_START, "scale");
  for (let k = 0; k < SCALE_LADDER.length; k++, s = next(s)) {
    const r = SCALE_LADDER[k];
    const t = tiles(s)!;
    assert.equal(new Set([t.right, t.slip, t.other]).size, 3);
    assert.equal(t.right, r.fruit ? r.v : r.minor);
    assert.equal(r.v % r.minor, 0, "the needle stops on a mark");
    assert.ok(r.v < r.max);
  }
});

test("a rule comes with a right tap only; a wrong tap can be followed by the right one; Next clears it", () => {
  let s = MEASURE_HAND_START;
  const t = tiles(s)!;
  s = tap(s, t.slip);
  assert.deepEqual(s.said, { v: t.slip, ok: false });
  s = tap(s, t.right);
  assert.deepEqual(s.said, { v: t.right, ok: true });
  assert.equal(tap(s, t.other), s, "a right answer stands");
  s = next(s);
  assert.equal(s.said, null);
  assert.equal(s.ruler, 1);
  assert.equal(s.at, RULER_LADDER[1].at, "the ruler goes back to where the round starts");
  assert.equal(again(s).ruler, 0);
});

test("the needle shows the fruit and the weights on the pan; only the first round has a tray", () => {
  let s = switchMode(MEASURE_HAND_START, "scale");
  assert.deepEqual(trayOf(SCALE_LADDER[0]), [25, 100]);
  assert.equal(needle(s), 0);
  s = putWeight(putWeight(s, 25), 100);
  assert.equal(needle(s), 125);
  assert.equal(needle(takeWeight(s, 1)), 25);
  assert.equal(needle(putWeight(s, null)), 0);
  for (let k = 0; k < 6; k++) s = putWeight(s, 100);
  assert.equal(s.pan.length, 6, "six at most");
  assert.equal(needle(s), 500, "no further than the dial's end");
  s = next(s);
  assert.deepEqual(s.pan, []);
  assert.equal(needle(s), SCALE_LADDER[1].v);
  assert.deepEqual(trayOf(SCALE_LADDER[1]), []);
  assert.equal(switchMode(s, "ruler").scale, 1, "switching keeps each mode's round");
});
