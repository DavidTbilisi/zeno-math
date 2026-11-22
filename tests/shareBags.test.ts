// Share the bag: tasks fit the bags and the bar with whole-number parts, dealing and taking work by hand, a check
// walks the steps in order and catches one bag for several and the left-over put over the spent parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import {
  dealRound, judgeShare, MAX_BAGS, MAX_SWEETS, pileOf, putIn, SHARE_LADDER, shareNotice, shareNow, shareTask, takeOut, toggleTaken, unitOf, wantOf,
  type ShareState,
} from "../src/math/shareBags.ts";

test("every task has whole-number parts and fits the picture, and the levels ask what they say", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = shareTask(level, rng(seed));
      assert.ok(Number.isInteger(unitOf(t)) && unitOf(t) >= 2 && t.a >= 1 && t.a < t.b && t.b <= MAX_BAGS);
      if (t.kind === "set") assert.ok(t.n <= MAX_SWEETS && t.n % t.b === 0);
      if (level === 1) assert.ok(t.kind === "set" && t.a === 1);
      if (level === 2) assert.ok(t.kind !== "left");
      if (level === 3) assert.ok(t.kind !== "set" && t.a >= 2);
    }
  assert.equal(SHARE_LADDER.length, 9);
  assert.equal(shareNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("dealing: rounds while the pile lasts, a sweet in and out of one bag, bags taken and put back", () => {
  assert.deepEqual(dealRound([], 3, 7), [1, 1, 1]);
  assert.deepEqual(dealRound([2, 2, 2], 3, 7), [3, 2, 2]);
  assert.equal(pileOf(7, [3, 2, 2]), 0);
  assert.deepEqual(putIn([1], 3, 2), [1, 0, 1]);
  assert.deepEqual(takeOut([1, 0, 1], 3, 1), [1, 0, 1]);
  assert.deepEqual(toggleTaken(toggleTaken([2], 0), 2), [0]);
});

const at = (p: Partial<ShareState>): ShareState => ({ bags: [], taken: [], cut: 1, part: 0, answer: 0, ...p });

test("3/5 of 20: deal all, fair, take three bags, twelve; one bag's worth is its own slip", () => {
  const t = { kind: "set", a: 3, b: 5, n: 20 } as const;
  assert.equal(wantOf(t), 12);
  assert.equal(judgeShare(t, at({ bags: [4, 4, 4, 4] })), "deal");
  assert.equal(judgeShare(t, at({ bags: [5, 3, 4, 4, 4] })), "unequal");
  assert.equal(judgeShare(t, at({ bags: [4, 4, 4, 4, 4], taken: [0] })), "take");
  assert.equal(judgeShare(t, at({ bags: [4, 4, 4, 4, 4], taken: [0, 2, 4], answer: 4 })), "oneBag");
  assert.equal(judgeShare(t, at({ bags: [4, 4, 4, 4, 4], taken: [0, 2, 4], answer: 12 })), null);
});

test("bars: cut in fifths, one part, all of it; 20 left put over the three spent is the slip", () => {
  const part = { kind: "part", a: 2, b: 5, x: 30 } as const;
  assert.equal(judgeShare(part, at({ cut: 4, part: 15, answer: 75 })), "cut");
  assert.equal(judgeShare(part, at({ cut: 5, part: 6, answer: 75 })), "part");
  assert.equal(judgeShare(part, at({ cut: 5, part: 15, answer: 45 })), "total");
  assert.equal(judgeShare(part, at({ cut: 5, part: 15, answer: 75 })), null);
  const left = { kind: "left", a: 3, b: 5, x: 30 } as const;
  assert.equal(unitOf(left), 15);
  assert.equal(judgeShare(left, at({ cut: 5, part: 10, answer: 50 })), "leftSlip");
  assert.equal(judgeShare(left, at({ cut: 5, part: 15, answer: 75 })), null);
});

test("notices: several bags, worked back, ten in a row", () => {
  assert.equal(shareNotice({ kind: "set", a: 3, b: 5, n: 20 }, 1), "bags");
  assert.equal(shareNotice({ kind: "set", a: 1, b: 5, n: 20 }, 1), null);
  assert.equal(shareNotice({ kind: "left", a: 3, b: 5, x: 30 }, 1), "back");
  assert.equal(shareNotice({ kind: "part", a: 3, b: 5, x: 30 }, 10), "streak10");
});
