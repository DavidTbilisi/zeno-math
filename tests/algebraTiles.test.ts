// Algebra tiles: the words match the tiles, the rectangle's area is the product tile for tile, zero pairs leave the
// same value, and every factoring puzzle can be made inside the steppers' ranges.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampFactors, FACTOR_TARGETS, factorings, matText, net, partsText, poly, product, rectangle, removePairs, rows, same, side,
  X_LEN, zeroPairs, type Counts, type Factors,
} from "../src/math/algebraTiles.ts";

test("polynomials are written as people write them", () => {
  assert.equal(poly([1, 5, 6]), "x² + 5x + 6");
  assert.equal(poly([2, -1, -3]), "2x² − x − 3");
  assert.equal(poly([-1, 0, 4]), "−x² + 4");
  assert.equal(poly([0, -1, 0]), "−x");
  assert.equal(poly([0, 0, 0]), "0");
  assert.equal(side(1, -2), "x − 2");
  assert.equal(side(0, 3), "3");
  assert.equal(side(2, 0), "2x");
});

test("multiplying out: the four parts, then like terms together", () => {
  assert.deepEqual(product([1, 2, 1, 3]), [1, 5, 6]);
  assert.deepEqual(product([2, -1, 1, 3]), [2, 5, -3]);
  assert.equal(partsText([1, 2, 1, 3]), "x² + 3x + 2x + 6");
  assert.equal(partsText([1, -2, 1, 3]), "x² + 3x − 2x − 6");
  assert.equal(partsText([0, 2, 0, 3]), "6");
});

test("the rectangle's tiles are the product, tile for tile, and fill it exactly", () => {
  for (let a = 0; a <= 3; a++)
    for (let c = 0; c <= 3; c++)
      for (const b of [-3, -1, 0, 2, 4])
        for (const d of [-2, 0, 1, 5]) {
          const f: Factors = [a, b, c, d];
          const r = rectangle(f);
          const sum: Counts = [0, 0, 0];
          const k = { x2: 0, x: 1, one: 2 } as const;
          for (const t of r.tiles) sum[k[t.kind]] += t.neg ? -1 : 1;
          assert.deepEqual(sum, product(f), `(${side(a, b)})(${side(c, d)})`);
          const area = r.tiles.reduce((s, t) => s + t.w * t.h, 0);
          assert.ok(Math.abs(area - r.w * r.h) < 1e-9);
          assert.ok(Math.abs(r.w - (a * X_LEN + Math.abs(b))) < 1e-9);
          assert.equal(r.top.length, a + Math.abs(b));
          assert.equal(r.left.length, c + Math.abs(d));
        }
});

test("zero pairs: taking them away leaves the same value and no pairs", () => {
  const pos: Counts = [2, 3, 1];
  const neg: Counts = [1, 1, 4];
  assert.deepEqual(zeroPairs(pos, neg), [1, 1, 1]);
  const after = removePairs(pos, neg);
  assert.deepEqual(net(after.pos, after.neg), net(pos, neg));
  assert.deepEqual(zeroPairs(after.pos, after.neg), [0, 0, 0]);
  assert.equal(poly(net(pos, neg)), "x² + 2x − 3");
  assert.equal(matText(pos, neg), "2x² + 3x + 1 − x² − x − 4");
  assert.equal(matText([0, 0, 0], [0, 2, 1]), "−2x − 1");
  assert.equal(matText([0, 0, 0], [0, 0, 0]), "0");
});

test("every factoring puzzle has an answer inside the steppers, and checks by its product", () => {
  for (const t of FACTOR_TARGETS) {
    const ways = factorings(t);
    assert.ok(ways.length > 0, poly(t));
    for (const f of ways) {
      assert.deepEqual(clampFactors(f), f);
      assert.ok(same(product(f), t));
    }
  }
});

test("the combine mat lays every tile out without overlap", () => {
  const { tiles } = rows([2, 5, 7], [1, 3, 4], 14);
  assert.equal(tiles.length, 22);
  for (const [i, p] of tiles.entries())
    for (const q of tiles.slice(i + 1))
      assert.ok(p.x + p.w <= q.x + 1e-9 || q.x + q.w <= p.x + 1e-9 || p.y + p.h <= q.y + 1e-9 || q.y + q.h <= p.y + 1e-9);
  assert.ok(tiles.every((t) => t.x + t.w <= 14 + 1e-9));
});
