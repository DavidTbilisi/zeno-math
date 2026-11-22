// Overflow bars: tasks fit three bars and ask what their level says, taps shade up to a part or take the last off, a
// check wants the shading first, catches the two slips of mixed to improper, and the notices follow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import { barsFor, judgeOverflow, MAX_BARS, OVERFLOW_LADDER, overflowNotice, overflowNow, overflowTask, tapPart } from "../src/math/overflowBars.ts";

test("every task fits three bars, past one whole, and asks what its level says", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = overflowTask(level, rng(seed));
      assert.ok(t.n > t.d && t.n <= MAX_BARS * t.d && t.d >= 2 && t.d <= 8, `${t.n}/${t.d}`);
      if (level === 1) assert.ok(t.kind === "toMixed" && t.n < 2 * t.d);
      if (level === 2) assert.ok(t.kind === "toImproper" && t.n < 3 * t.d);
      if (t.kind === "toImproper") assert.notEqual(t.n % t.d, 0);
    }
  assert.equal(OVERFLOW_LADDER.length, 9);
  assert.equal(overflowNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("taps shade up to a part, the last one taken off; bars spill one at a time up to three", () => {
  assert.equal(tapPart(0, 6), 7);
  assert.equal(tapPart(7, 6), 6);
  assert.equal(tapPart(7, 2), 3);
  assert.deepEqual([0, 3, 4, 7, 8, 12].map((s) => barsFor(s, 4)), [1, 1, 2, 2, 3, 3]);
});

test("11/4: shade first, then 2 3/4 (or 2 6/8); the whole miscounted is its own answer", () => {
  const t = { kind: "toMixed", n: 11, d: 4 } as const;
  const say = (shaded: number, whole: number, top: number, bottom: number) => judgeOverflow(t, { shaded, whole, top, bottom });
  assert.equal(say(10, 2, 3, 4), "shade");
  assert.equal(say(11, 2, 3, 4), null);
  assert.equal(say(11, 2, 6, 8), null);
  assert.equal(say(11, 1, 7, 4), "whole");
  assert.equal(say(11, 2, 1, 4), "answer");
  assert.equal(say(11, 3, 3, 4), "whole");
  assert.equal(judgeOverflow({ kind: "toMixed", n: 12, d: 4 }, { shaded: 12, whole: 3, top: 0, bottom: 1 }), null);
});

test("2 3/4 as one fraction: 11/4; the whole times the top and the whole not multiplied are caught", () => {
  const t = { kind: "toImproper", n: 11, d: 4 } as const;
  const say = (top: number, bottom: number) => judgeOverflow(t, { shaded: 11, whole: 0, top, bottom });
  assert.equal(say(11, 4), null);
  assert.equal(say(22, 8), null);
  assert.equal(say(10, 4), "timesTop");
  assert.equal(say(5, 4), "addWhole");
  assert.equal(say(11, 3), "answer");
});

test("notices: a whole number, a third bar, ten in a row", () => {
  assert.equal(overflowNotice({ kind: "toMixed", n: 12, d: 4 }, 1), "exact");
  assert.equal(overflowNotice({ kind: "toMixed", n: 9, d: 4 }, 1), "three");
  assert.equal(overflowNotice({ kind: "toMixed", n: 7, d: 4 }, 1), null);
  assert.equal(overflowNotice({ kind: "toMixed", n: 7, d: 4 }, 10), "streak10");
});
