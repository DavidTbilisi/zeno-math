// The block area model: the parts tile the rectangle and add up to the product, a part is filled by a tap or (your
// turn) by giving its product, and the whole is the parts added.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allFilled, AREA_RANGE, AREA_START, areaDone, areaParts, asked, checkTyped, dealtArea, isFilled, partCount, runningTotal, sideParts,
  tapPart, withAsk, withNumbers, type LiveAreaBlocks,
} from "../src/math/areaBlocks.ts";

const empty: LiveAreaBlocks = { ...AREA_START, filled: [] };

test("a side splits into its tens and ones, nothing parts dropped", () => {
  assert.deepEqual(sideParts(24), [{ size: 20, tens: true }, { size: 4, tens: false }]);
  assert.deepEqual(sideParts(20), [{ size: 20, tens: true }]);
  assert.deepEqual(sideParts(4), [{ size: 4, tens: false }]);
});

test("the parts tile the rectangle and add up to the product, for every pair of numbers", () => {
  for (let a = AREA_RANGE[0]; a <= AREA_RANGE[1]; a++) {
    for (let b = AREA_RANGE[0]; b <= AREA_RANGE[1]; b++) {
      const parts = areaParts(a, b);
      assert.equal(parts.reduce((s, p) => s + p.value, 0), a * b, `${a} × ${b}`);
      assert.equal(parts.reduce((s, p) => s + p.rows * p.cols, 0), a * b);
      assert.equal(new Set(parts.map((p) => p.key)).size, parts.length);
      for (const p of parts) {
        const each = p.block === "h" ? 100 : p.block === "t" ? 10 : 1;
        assert.equal(p.count * each, p.value, `${a} × ${b} ${p.key}`);
        assert.ok(p.top + p.rows <= a && p.left + p.cols <= b);
      }
    }
  }
});

test("24 × 16: flats, rods both ways and cubes", () => {
  assert.deepEqual(areaParts(24, 16).map((p) => [p.key, p.top, p.left, p.rows, p.cols, p.value, p.block, p.count]), [
    ["tt", 0, 0, 20, 10, 200, "h", 2],
    ["to", 0, 10, 20, 6, 120, "t", 12],
    ["ot", 20, 0, 4, 10, 40, "t", 4],
    ["oo", 20, 10, 4, 6, 24, "o", 24],
  ]);
  assert.deepEqual(areaParts(4, 16).map((p) => p.key), ["ot", "oo"]);
  assert.deepEqual(areaParts(20, 3).map((p) => p.key), ["to"]);
  assert.deepEqual(areaParts(24, 16).map(partCount), [{ x: 2, y: 1, n: 2 }, { x: 2, y: 6, n: 12 }, { x: 4, y: 1, n: 4 }, { x: 4, y: 6, n: 24 }]);
});

test("a tap fills a part and a second tap empties it; the product shows when all are in", () => {
  assert.equal(runningTotal(AREA_START), 320);
  let s = tapPart(empty, "tt");
  assert.ok(isFilled(s, "tt"));
  assert.equal(runningTotal(s), 200);
  assert.equal(runningTotal(tapPart(s, "tt")), 0);
  assert.equal(tapPart({ ...empty, a: 4 }, "tt").filled.length, 0, "4 × 16 has no tens × tens");
  for (const k of ["to", "ot", "oo"] as const) s = tapPart(s, k);
  assert.ok(allFilled(s) && areaDone(s));
  assert.equal(runningTotal(s), 384);
});

test("other numbers, your turn and the die start the rectangle empty", () => {
  const s = withNumbers(AREA_START, 13, 16);
  assert.deepEqual([s.a, s.b, s.filled], [13, 16, []]);
  assert.equal(withNumbers(AREA_START, 24, 16), AREA_START);
  assert.deepEqual([withNumbers(AREA_START, 0, 99).a, withNumbers(AREA_START, 0, 99).b], [1, 39]);
  assert.equal(withNumbers(AREA_START, NaN, 16).a, 1);
  assert.equal(withAsk(AREA_START, false), AREA_START);
  const ask = withAsk(AREA_START, true);
  assert.deepEqual([ask.ask, ask.filled, ask.at], [true, [], null]);
  const seen = new Set<string>();
  let d = AREA_START;
  for (let i = 0; i < 60; i++) {
    d = dealtArea(d);
    assert.ok(d.a >= 11 && d.a <= 29 && d.b >= 11 && d.b <= 19, `${d.a} × ${d.b}`);
    assert.deepEqual(d.filled, []);
    seen.add(`${d.a}×${d.b}`);
  }
  assert.ok(seen.size > 20);
  assert.deepEqual(dealtArea(AREA_START), dealtArea(AREA_START));
});

test("your turn: each part's product is given, a wrong one kept as the miss, and then the parts are added", () => {
  let s = withAsk(AREA_START, true);
  assert.equal(asked(s), null);
  const idle = { ...s, typed: "5" };
  assert.equal(checkTyped(idle), idle, "nothing asked: nothing checked");
  s = tapPart(s, "to");
  assert.equal(s.at, "to");
  assert.equal(asked(s), 120);
  assert.equal(tapPart(s, "to"), s, "already the one asked about");
  assert.equal(checkTyped(s), s, "no digits yet");

  s = checkTyped({ ...s, typed: "12" });
  assert.deepEqual([s.miss, s.typed, s.at, s.filled], [12, "", "to", []]);
  s = checkTyped({ ...s, typed: "120" });
  assert.deepEqual([s.miss, s.at, s.filled], [null, "tt", ["to"]], "on to the first part still empty");
  assert.equal(tapPart(s, "to"), s, "a filled part stays filled");
  s = tapPart(s, "oo");
  assert.equal(s.at, "oo");
  s = checkTyped({ ...s, typed: "24" });
  s = checkTyped({ ...s, typed: "200" });
  assert.equal(s.at, "ot");
  s = checkTyped({ ...s, typed: "40" });
  assert.equal(s.at, "total");
  assert.ok(allFilled(s) && !areaDone(s), "the parts are in, the sum is not");
  assert.equal(asked(s), 384);
  s = checkTyped({ ...s, typed: "374" });
  assert.equal(s.miss, 374);
  s = checkTyped({ ...s, typed: "384" });
  assert.ok(areaDone(s));
  assert.deepEqual([s.at, s.miss, s.summed], [null, null, true]);
  assert.equal(asked({ ...s, at: "tt", a: 4 }), null, "a part the rectangle does not have");
});
