// How many fit?: every task divides a bar by a smaller tile within the picture's limits, the levels go from exact fits
// to cut tiles to bigger tiles, a check wants the bar covered first and catches the leftover read as a part of the
// whole, and the notices follow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { rng } from "../src/math/random.ts";
import type { GameLevel } from "../src/math/ladder.ts";
import { FIT_LADDER, fitNotice, fitNow, fitOf, fitTask, judgeFit, MAX_PARTS, MAX_TILES, tilesToCover } from "../src/math/fitTiles.ts";

const f = (n: number, d: number) => new Frac(n, d);

test("every task has a tile smaller than the bar, at most twelve tiles, a cut tile of at most twelve parts", () => {
  for (const level of [1, 2, 3] as GameLevel[])
    for (let seed = 1; seed <= 300; seed++) {
      const t = fitTask(level, rng(seed));
      assert.ok(t.b.toNumber() < t.a.toNumber() && t.a.toNumber() < 2, `${t.a.n}/${t.a.d} ÷ ${t.b.n}/${t.b.d}`);
      assert.ok(tilesToCover(t) <= MAX_TILES && fitOf(t).part.d <= MAX_PARTS);
      if (level === 1) assert.ok(fitOf(t).part.isZero() && t.b.n === 1);
      if (level === 2) assert.ok(!fitOf(t).part.isZero() && t.b.n === 1);
      if (level === 3) assert.ok(t.b.n >= 2);
    }
  assert.equal(fitNow({ mode: "free", stage: 0, level: 1, seed: 1 }), null);
  assert.equal(FIT_LADDER.length, 9);
});

test("3/4 ÷ 1/3: two whole tiles and a quarter of the third", () => {
  const t = { a: f(3, 4), b: f(1, 3) };
  assert.equal(fitOf(t).whole, 2);
  assert.deepEqual([fitOf(t).part.n, fitOf(t).part.d], [1, 4]);
  assert.equal(tilesToCover(t), 3);
  assert.equal(tilesToCover({ a: f(3, 4), b: f(1, 8) }), 6);
});

test("a check wants the bar covered, then the count; the leftover as a part of the whole has its own answer", () => {
  const t = { a: f(3, 4), b: f(1, 3) };
  assert.equal(judgeFit(t, { laid: 2, whole: 2, top: 1, bottom: 4 }), "short");
  assert.equal(judgeFit(t, { laid: 3, whole: 2, top: 1, bottom: 12 }), "ofWhole");
  assert.equal(judgeFit(t, { laid: 3, whole: 2, top: 1, bottom: 3 }), "answer");
  assert.equal(judgeFit(t, { laid: 3, whole: 2, top: 1, bottom: 4 }), null);
  assert.equal(judgeFit(t, { laid: 3, whole: 0, top: 9, bottom: 4 }), null);
  assert.equal(judgeFit({ a: f(3, 4), b: f(1, 8) }, { laid: 6, whole: 6, top: 0, bottom: 1 }), null);
});

test("notices: a leftover in tiles, a quotient bigger than the bar, ten in a row", () => {
  assert.equal(fitNotice({ a: f(3, 4), b: f(1, 3) }, 1), "ofTile");
  assert.equal(fitNotice({ a: f(3, 4), b: f(1, 8) }, 1), "bigger");
  assert.equal(fitNotice({ a: f(3, 4), b: f(1, 8) }, 10), "streak10");
});
