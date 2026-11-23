// Double number line: the levels need the moves they say, every move keeps the lines in proportion, a split and a lay
// make the marks they should, the fewest is found, and a solve through the amount for one or round it is noticed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import {
  afterMove,
  DOUBLE_LADDER,
  doubleNotice,
  doubleNow,
  doubleStars,
  doubleTask,
  fewest,
  fr,
  gapOf,
  madeBy,
  partner,
  reached,
  showVal,
  tapMark,
  targetBot,
  ticksOf,
  type DoubleTask,
} from "../src/math/doubleLine.ts";

const f = (n: number, d = 1) => new Frac(n, d);
const task = (a: number, A: number, t: number, end = 12): DoubleTask => ({ ctx: "flour", a, A, t: f(t), ask: "bot", end });

test("each level needs the moves it says: 1, then 2, then 2 or 3 with a k that is not whole", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 200; seed++) {
      const t = doubleTask(level, rng(seed));
      const m = fewest(t)!;
      assert.ok(level === 1 ? m === 1 : level === 2 ? m === 2 : m >= 2 && m <= 3, `level ${level} seed ${seed}: ${m}`);
      assert.ok(t.t.isInt() && targetBot(t).isInt() && t.t.toNumber() <= t.end && t.t.n !== t.a);
      assert.equal(t.A % t.a === 0, level < 3);
      if (level < 3) assert.equal(t.ask, "bot");
    }
  assert.equal(DOUBLE_LADDER.length, 9);
});

test("a split makes the parts between, a lay one mark n gaps on; a move off the lines or making nothing is refused", () => {
  assert.deepEqual(madeBy(f(0), f(3), "split", 3).map(fr), ["1", "2"]);
  assert.deepEqual(madeBy(f(2), f(4), "times", 3).map(fr), ["8"]);
  assert.deepEqual(madeBy(f(0), f(3), "split", 2).map(fr), ["3/2"]);
  const start = [f(0), f(3)];
  assert.equal(afterMove(start, 12, f(0), f(3), "times", 5), null); // 15 is past 12
  assert.deepEqual(afterMove(start, 12, f(0), f(3), "times", 4)!.map(fr), ["0", "3", "12"]);
  assert.equal(afterMove(start, 12, f(3), f(0), "split", 3), null); // the gap runs up
  assert.equal(afterMove(start, 12, f(0), f(5), "split", 2), null); // 5 is not a mark
  const thirds = afterMove(start, 12, f(0), f(3), "split", 3)!;
  assert.equal(afterMove(thirds, 12, f(0), f(3), "split", 3), null); // nothing new
});

test("the partner of a mark is top × A/a, and the fewest goes through one or round it", () => {
  const t = task(3, 12, 5);
  assert.equal(fr(partner(t, f(5))), "20");
  assert.equal(fr(targetBot(t)), "20");
  assert.equal(fewest(t), 2); // ÷3 to 1, ×5
  assert.equal(fewest(task(3, 12, 9)), 1); // ×3
  assert.equal(fewest(task(4, 6, 10, 15)), 2); // ÷2 to 2, ×5: round the amount for one
  assert.equal(fewest(task(4, 6, 4)), 0);
});

test("ticks follow the moves, the flag is reached, the stars count moves past the fewest, and the notices", () => {
  const t = task(3, 12, 5);
  const unitWay = [{ p: "0", q: "3", op: "split" as const, n: 3 }, { p: "0", q: "1", op: "times" as const, n: 5 }];
  assert.deepEqual(ticksOf(t, unitWay).map(fr), ["0", "1", "2", "3", "5"]);
  assert.ok(reached(t, ticksOf(t, unitWay)));
  assert.equal(doubleNotice(t, unitWay, 1), "unit");
  assert.equal(doubleNotice(t, unitWay, 10), "streak10");
  const t2 = task(4, 6, 10, 15);
  const common = [{ p: "0", q: "4", op: "split" as const, n: 2 }, { p: "0", q: "2", op: "times" as const, n: 5 }];
  assert.ok(reached(t2, ticksOf(t2, common)));
  assert.equal(doubleNotice(t2, common, 1), "common");
  assert.deepEqual([doubleStars(2, 2), doubleStars(3, 2), doubleStars(5, 2)], [3, 2, 1]);
});

test("picking marks, the gap smaller first, and values as they read", () => {
  assert.deepEqual(tapMark([], "3"), ["3"]);
  assert.deepEqual(tapMark(["3"], "0"), ["3", "0"]);
  assert.deepEqual(tapMark(["3", "0"], "1"), ["0", "1"]);
  assert.deepEqual(tapMark(["3", "0"], "3"), ["0"]);
  assert.deepEqual(gapOf(["3", "0"])!.map(fr), ["0", "3"]);
  assert.equal(gapOf(["3"]), null);
  assert.deepEqual([f(3, 2), f(1, 4), f(4, 3), f(7)].map(showVal), ["1.5", "0.25", "4/3", "7"]);
  const t = doubleNow({ mode: "puzzle", stage: 0, level: 1, seed: 1 });
  assert.equal(fewest(t), 1);
});
