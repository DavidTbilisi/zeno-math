// Stripes: every task is drawable (proper fractions, small bottoms, added ones with two bottoms, neighbours one apart on
// a shared bottom), a check finds the first thing wrong, a tap shades up to a stripe, and the notices follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { rng } from "../src/math/random.ts";
import {
  judgeStripes,
  poured,
  recut,
  sameCells,
  STRIPE_LADDER,
  stripeCols,
  stripeNotice,
  stripesNow,
  stripeStars,
  STRIPES_START,
  stripeTask,
  tapStripe,
  type LiveStripes,
  type StripeTask,
} from "../src/math/stripes.ts";
import type { GameLevel } from "../src/math/ladder.ts";

const at = (p: Partial<LiveStripes>): LiveStripes => ({ ...STRIPES_START, ...p });
const f = (n: number, d: number) => new Frac(n, d);

test("every task is proper and fits the square's cuts", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = stripeTask(level, rng(seed));
      for (const x of [t.a, t.b]) assert.ok(x.n > 0 && x.n < x.d && x.d <= 7, `${x.n}/${x.d}`);
      if (t.kind === "plus") assert.notEqual(t.a.d, t.b.d);
      if (t.kind === "between") {
        const n = stripeCols(t);
        assert.ok(n <= 7 && n % t.a.d === 0 && n % t.b.d === 0);
        assert.equal(t.b.sub(t.a).n, 1);
        assert.equal(t.b.sub(t.a).d, n);
      }
    }
});

test("the ladder climbs through the three kinds and free play has no task", () => {
  const kinds = STRIPE_LADDER.map((_, stage) => stripesNow({ mode: "puzzle", stage, level: 1, seed: 1 })!.kind);
  assert.deepEqual(kinds, ["times", "times", "times", "plus", "plus", "plus", "between", "between", "between"]);
  assert.equal(stripesNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("a tap shades up to a stripe, again on the last shades one fewer; recutting keeps the shading inside", () => {
  assert.equal(tapStripe(0, 2), 3);
  assert.equal(tapStripe(3, 2), 2);
  assert.equal(tapStripe(3, 0), 1);
  assert.deepEqual(recut(3, 5), { n: 3, on: 3 });
  assert.deepEqual(recut(20, 2), { n: 12, on: 2 });
  assert.deepEqual(recut(0, 0), { n: 1, on: 0 });
});

test("multiplying: the stripes first, then the cells shaded both ways, in any terms", () => {
  const t: StripeTask = { kind: "times", a: f(2, 3), b: f(3, 4) };
  const good = { cols: 3, colsOn: 2, rows: 4, rowsOn: 3, top: 6, bottom: 12 };
  assert.equal(judgeStripes(t, at({ ...good, colsOn: 1 })), "cols");
  assert.equal(judgeStripes(t, at({ ...good, rowsOn: 2 })), "rows");
  assert.equal(judgeStripes(t, at({ ...good, top: 5 })), "answer");
  assert.equal(judgeStripes(t, at(good)), null);
  assert.equal(judgeStripes(t, at({ ...good, top: 1, bottom: 2 })), null);
  // Stripes cut finer still show the fraction.
  assert.equal(judgeStripes(t, at({ ...good, cols: 6, colsOn: 4 })), null);
  assert.equal(stripeNotice(t, at({ ...good, top: 1, bottom: 2 }), 1), "lowest");
  assert.equal(stripeNotice(t, at(good), 1), "smaller");
  assert.equal(stripeNotice(t, at(good), 10), "streak10");
});

test("adding: the cells must match before the sum counts; a sum past one is noticed", () => {
  const t: StripeTask = { kind: "plus", a: f(1, 2), b: f(2, 3) };
  assert.equal(judgeStripes(t, at({ across: 2, down: 2, top: 7, bottom: 6 })), "size");
  assert.ok(sameCells(t, { across: 3, down: 2 }));
  assert.deepEqual(poured(t, { across: 3, down: 2 }), { each: 6, filled: 7 });
  assert.equal(judgeStripes(t, at({ across: 3, down: 2, top: 6, bottom: 6 })), "answer");
  assert.equal(judgeStripes(t, at({ across: 3, down: 2, top: 7, bottom: 6 })), null);
  assert.equal(stripeNotice(t, at({ across: 3, down: 2, top: 7, bottom: 6 }), 1), "overOne");
  const u: StripeTask = { kind: "plus", a: f(1, 4), b: f(1, 6) };
  assert.equal(stripeNotice(u, at({ across: 6, down: 4, top: 10, bottom: 24 }), 1), null);
  assert.equal(stripeNotice(u, at({ across: 6, down: 4, top: 5, bottom: 12 }), 1), "lowest");
});

test("between: strictly inside, on the shared bottom of neighbours in lowest terms", () => {
  const t: StripeTask = { kind: "between", a: f(1, 3), b: f(1, 2) };
  assert.equal(stripeCols(t), 6);
  assert.equal(judgeStripes(t, at({ across: 1, cells: 2 })), "notBetween");
  assert.equal(judgeStripes(t, at({ across: 1, cells: 3 })), "notBetween");
  assert.equal(judgeStripes(t, at({ across: 2, cells: 5 })), null);
  assert.equal(stripeNotice(t, at({ across: 2, cells: 5 }), 1), null);
  assert.equal(stripeNotice(t, at({ across: 3, cells: 7 }), 1), "manyBetween");
});

test("stars: three right first time, two after a miss, one after more", () => {
  assert.deepEqual([0, 1, 2, 5].map(stripeStars), [3, 2, 1, 1]);
});
