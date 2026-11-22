// Frog jumps: every target can be reached, the fewest is right, past level 1 it needs both sizes, a check tells short
// from past from too many, and the jumps read as a sum of products.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import { canJump, exprOf, FROG_LADDER, frogNotice, frogNow, frogTask, fewest, judgeFrog, landOf, LINE_END, stepOf } from "../src/math/frogJumps.ts";

const f = (n: number, d: number) => new Frac(n, d);

test("every task lands on its target in 2 to 9 jumps, on the line, the levels as they say", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = frogTask(level, rng(seed));
      const m = fewest(t.sizes, t.target)!;
      assert.ok(m >= 2 && m <= 9 && t.target.toNumber() <= LINE_END && stepOf([...t.sizes, t.target]) <= 12);
      assert.equal(t.sizes.length, level === 1 ? 1 : 2);
      if (level === 1) assert.equal(t.sizes[0].n, 1);
      else for (const s of t.sizes) assert.notEqual(fewest([s], t.target), m);
    }
  assert.equal(FROG_LADDER.length, 9);
  assert.equal(frogNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
});

test("fewest: greedy when one size measures the other, both sizes when not", () => {
  assert.equal(fewest([f(1, 2), f(1, 4)], f(7, 4)), 4);
  assert.equal(fewest([f(1, 2), f(1, 3)], f(5, 6)), 2);
  assert.equal(fewest([f(2, 3), f(1, 4)], f(11, 6)), 4);
  assert.equal(fewest([f(1, 2)], f(3, 4)), null);
});

test("a check: none, short, past, more, then right; the sum read as products", () => {
  const t = { sizes: [f(1, 2), f(1, 4)], target: f(7, 4) };
  assert.equal(judgeFrog(t, []), "none");
  assert.equal(judgeFrog(t, [0, 0, 0]), "short");
  assert.equal(judgeFrog(t, [0, 0, 0, 0]), "past");
  assert.equal(judgeFrog(t, [0, 0, 1, 1, 1]), "more");
  assert.equal(judgeFrog(t, [1, 0, 0, 0]), null);
  assert.equal(exprOf(t.sizes, [1, 0, 0, 0]), "3 × 1/2 + 1 × 1/4");
  assert.equal(exprOf([f(1, 3)], [0, 0, 0, 0]), "4 × 1/3");
  assert.ok(landOf([f(1, 3)], [0, 0, 0, 0]).sub(f(4, 3)).isZero());
  assert.equal(canJump([f(1, 2)], [0, 0, 0, 0, 0, 0], 0), false);
  assert.equal(canJump([f(1, 2)], [0, 0, 0, 0, 0], 0), true);
});

test("notices: a product, a mix, ten in a row", () => {
  assert.equal(frogNotice({ sizes: [f(1, 3)], target: f(4, 3) }, 1), "times");
  assert.equal(frogNotice({ sizes: [f(1, 3)], target: f(2, 3) }, 1), null);
  assert.equal(frogNotice({ sizes: [f(1, 2), f(1, 3)], target: f(5, 6) }, 1), "mix");
  assert.equal(frogNotice({ sizes: [f(1, 3)], target: f(2, 3) }, 10), "streak10");
});
