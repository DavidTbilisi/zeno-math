// Algebra tiles: the words match the tiles, the rectangle's area is the product tile for tile, zero pairs leave the
// same value, and every factoring puzzle can be made inside the steppers' ranges.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampFactors, countsOf, FACTOR_TARGETS, factorings, freeTileSpot, keepTileOn, lineUp, matFrom, matText, net, onTileMat, partsText,
  poly, product, rectangle, removePairs, rows, same, side, sideAdd, sideTake, TILE_CAP, TILE_KINDS, TILE_MAT, TILES_START, tilesState,
  tileSize, tileUnder, X_LEN, zeroPairs, type Counts, type Factors, type MatTile,
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

const onMat = (t: MatTile) => {
  const [w, h] = tileSize(t.kind);
  return onTileMat(t.x, t.y) && onTileMat(t.x + w, t.y + h);
};
const apart = (ts: MatTile[]) =>
  ts.every((p, i) => ts.every((q, j) => {
    if (j <= i) return true;
    const [pw, ph] = tileSize(p.kind);
    const [qw, qh] = tileSize(q.kind);
    return p.x + pw <= q.x || q.x + qw <= p.x || p.y + ph <= q.y || q.y + qh <= p.y;
  }));

test("tiles placed by hand: lined up, a full mat fits with none on another, and ids are kept", () => {
  assert.deepEqual(countsOf(TILES_START.tiles), { pos: [1, 3, 2], neg: [0, 1, 4] });
  const full = matFrom(TILE_CAP, TILE_CAP);
  assert.ok(full.every(onMat), "every tile of a full mat is on it");
  assert.ok(apart(full));
  const messy = TILES_START.tiles.map((t, i) => ({ ...t, x: 300 + 11 * i, y: 90 + 7 * i }));
  assert.deepEqual(lineUp(messy), TILES_START.tiles);
  assert.deepEqual(keepTileOn("x2", 9999, -50), { x: TILE_MAT.x + TILE_MAT.w - 4 - tileSize("x2")[0], y: TILE_MAT.y + 4 });
});

test("a tile dropped on its negative finds it; a tap's tile goes where nothing is", () => {
  const t = (id: number, kind: MatTile["kind"], neg: boolean, x: number, y: number): MatTile => ({ id, kind, neg, x, y });
  const tiles = [t(0, "x", false, 200, 100), t(1, "x", true, 260, 100), t(2, "one", true, 205, 110)];
  assert.equal(tileUnder(tiles, 210, 120, "x", true)?.id, 0, "a −x dropped on the x");
  assert.equal(tileUnder(tiles, 210, 120, "x", false)?.id, undefined, "an x over an x: no cancel");
  assert.equal(tileUnder(tiles, 210, 115, "one", false)?.id, 2, "a 1 on the −1");
  assert.equal(tileUnder(tiles, 210, 115, "one", false, [2]), null, "that −1 already taken");
  for (const kind of TILE_KINDS) {
    const s = freeTileSpot(TILES_START.tiles, kind)!;
    assert.ok(apart([...TILES_START.tiles, { id: 99, kind, neg: false, ...s }]), kind);
  }
  // Taps fill the mat until there is no room left, none on another.
  const filled: MatTile[] = [];
  for (let s = freeTileSpot(filled, "x2"); s; s = freeTileSpot(filled, "x2")) filled.push({ id: filled.length, kind: "x2", neg: false, ...s });
  assert.ok(filled.length >= 12 && filled.every(onMat) && apart(filled), `${filled.length} x² tiles`);
});

test("a saved mat of counts comes back as tiles", () => {
  const s = tilesState({ mode: "combine", pos: [1, 2, 0], neg: [0, 0, 3], f: [1, 0, 1, 0], target: 2 } as never);
  assert.deepEqual(countsOf(s.tiles), { pos: [1, 2, 0], neg: [0, 0, 3] });
  assert.equal(s.next, 6);
  assert.equal(s.target, 2);
  assert.equal(tilesState(TILES_START), TILES_START);
});

test("sides built by hand: a 1 on a side of −1s cancels one, and nothing goes past the ranges", () => {
  assert.deepEqual(sideAdd([1, 2, 1, 3], 0, "x"), [2, 2, 1, 3]);
  assert.deepEqual(sideAdd([1, -2, 1, 3], 0, "one"), [1, -1, 1, 3]);
  assert.deepEqual(sideAdd([1, 2, 1, 3], 1, "neg"), [1, 2, 1, 2]);
  assert.deepEqual(sideAdd([3, 6, 0, 0], 0, "x"), [3, 6, 0, 0]);
  assert.deepEqual(sideAdd([3, 6, 0, 0], 0, "one"), [3, 6, 0, 0]);
  assert.deepEqual(sideTake([1, -2, 1, 3], 0, "one"), [1, -1, 1, 3]);
  assert.deepEqual(sideTake([0, 0, 1, 3], 0, "x"), [0, 0, 1, 3]);
  assert.deepEqual(sideTake([0, 0, 1, 3], 1, "x"), [0, 0, 0, 3]);
  // Every factoring puzzle can be built from nothing by drops alone.
  for (const target of FACTOR_TARGETS) {
    const [a, b, c, d] = factorings(target)[0];
    let f: Factors = [0, 0, 0, 0];
    for (let i = 0; i < a; i++) f = sideAdd(f, 0, "x");
    for (let i = 0; i < Math.abs(b); i++) f = sideAdd(f, 0, b < 0 ? "neg" : "one");
    for (let i = 0; i < c; i++) f = sideAdd(f, 1, "x");
    for (let i = 0; i < Math.abs(d); i++) f = sideAdd(f, 1, d < 0 ? "neg" : "one");
    assert.ok(same(product(f), target), poly(target));
  }
});
