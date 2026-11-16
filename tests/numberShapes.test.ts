// Number patterns as dots: each picture has as many dots as its number, the "Why?" parts add up to it, primes make
// only the one row, and the Fibonacci squares tile a rectangle with a spiral that doesn't break.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangements, clampN, dotPicture, fib, fibTiles, isPrime, N_RANGE, N_START, row, SHAPE_KINDS, sumText, term, whyParts,
} from "../src/math/numberShapes.ts";

test("the sequences start as they should", () => {
  const first = (k: (typeof SHAPE_KINDS)[number]) => [1, 2, 3, 4, 5, 6].map((n) => term(k, n));
  assert.deepEqual(first("square"), [1, 4, 9, 16, 25, 36]);
  assert.deepEqual(first("triangle"), [1, 3, 6, 10, 15, 21]);
  assert.deepEqual(first("oblong"), [2, 6, 12, 20, 30, 42]);
  assert.deepEqual(first("cube"), [1, 8, 27, 64, 125, 216]);
  assert.deepEqual(first("fibonacci"), [1, 1, 2, 3, 5, 8]);
  assert.equal(fib(9), 34);
  assert.deepEqual([2, 3, 4, 9, 11, 25, 37].map(isPrime), [true, true, false, false, true, false, true]);
});

test("every picture has as many dots as its number, and the why parts add up to it", () => {
  for (const kind of ["square", "triangle", "oblong", "cube"] as const)
    for (let n = N_RANGE[kind][0]; n <= N_RANGE[kind][1]; n++) {
      const plain = dotPicture(kind, n, false);
      assert.equal(plain.dots.length, term(kind, n), `${kind} ${n}`);
      for (const d of plain.dots) assert.ok(d.x >= 0 && d.x < plain.cols && d.y >= 0 && d.y < plain.rows, `${kind} ${n} inside`);
      assert.equal(new Set(plain.dots.map((d) => `${d.x},${d.y}`)).size, plain.dots.length, `${kind} ${n} no two dots in one place`);
      assert.equal(whyParts(kind, n).reduce((a, b) => a + b, 0), term(kind, n));
      // Each band holds one of the parts (squares, rectangles, cubes); the triangle's copy is the same again.
      const why = dotPicture(kind, n, true);
      if (kind === "triangle") {
        assert.equal(why.dots.length, n * (n + 1));
        assert.equal(why.dots.filter((d) => d.band === 1).length, term(kind, n));
      } else
        whyParts(kind, n).forEach((p, k) => assert.equal(why.dots.filter((d) => d.band === k).length, p, `${kind} ${n} band ${k}`));
    }
  assert.equal(sumText([1, 3, 5, 7]), "1 + 3 + 5 + 7");
  assert.equal(sumText(whyParts("square", 10)), "1 + 3 + … + 19");
});

test("a prime's dots make only one row", () => {
  for (let n = 2; n <= 40; n++) {
    const rects = arrangements(n, false);
    assert.equal(rects.length === 1, isPrime(n), `${n}`);
    for (const a of rects) assert.equal(a.rows * a.cols, n);
    // The tries add every number of rows up to √n; the dots are all there, the misses with some over.
    const tries = arrangements(n, true);
    assert.equal(tries.length, Math.floor(Math.sqrt(n)));
    for (const a of tries) assert.equal(a.rows * a.cols + a.left, n);
  }
  assert.deepEqual(arrangements(12, false).map((a) => [a.rows, a.cols]), [[1, 12], [2, 6], [3, 4]]);
});

test("the Fibonacci squares tile a rectangle and the spiral runs on unbroken", () => {
  for (let n = 1; n <= N_RANGE.fibonacci[1]; n++) {
    const { tiles, box } = fibTiles(n);
    const [x0, y0, x1, y1] = box;
    assert.deepEqual([x1 - x0, y1 - y0].sort((a, b) => a - b), n === 1 ? [1, 1] : [fib(n), fib(n + 1)].sort((a, b) => a - b));
    assert.equal(tiles.reduce((s, t) => s + t.s * t.s, 0), (x1 - x0) * (y1 - y0), `squares fill the box at ${n}`);
    for (let i = 1; i < tiles.length; i++) assert.deepEqual(tiles[i].arc.from, tiles[i - 1].arc.to, `arc ${i + 1} starts where ${i} ends`);
    for (const t of tiles) {
      // Both ends are corners of the square, a side apart along one edge each from the centre corner.
      for (const [px, py] of [t.arc.from, t.arc.to]) assert.ok([t.x, t.x + t.s].includes(px) && [t.y, t.y + t.s].includes(py));
    }
  }
});

test("the row and the range keep n in bounds", () => {
  for (const kind of SHAPE_KINDS) {
    const [lo, hi] = N_RANGE[kind];
    assert.ok(N_START[kind] >= lo && N_START[kind] <= hi);
    assert.equal(clampN(kind, lo - 5), lo);
    assert.equal(clampN(kind, hi + 5), hi);
  }
  assert.deepEqual(row("prime", 2).map((c) => c.v), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(row("prime", 40).map((c) => c.v).at(-1), 40);
  assert.ok(row("prime", 20).some((c) => c.n === 20));
  assert.deepEqual(row("square", 1).map((c) => c.v), [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);
});
