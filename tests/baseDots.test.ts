// Number bases by skip counting (#862): dotted columns, grouping binary into hex and octal, base 3 into base 9.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE_START, BASE3_DIGITS, digitChar, dotCols, groups, valueOf } from "../src/math/baseDots";

test("every k-th column from 1 is a power of 2^k; from 2 it is shifted", () => {
  assert.deepEqual(dotCols(8, 0, 3).map((n) => 2 ** n), [1, 8, 64]);
  assert.deepEqual(dotCols(8, 1, 2).map((n) => 2 ** n), [2, 8, 32, 128]);
});

test("grouping digits gives the number in the new base", () => {
  const d = BASE_START.digits;
  assert.equal(valueOf(d, 2), 182);
  assert.equal(groups(d, 2, 4).map((g) => digitChar(g.value)).join(""), "B6");
  assert.equal(groups(d, 2, 3).map((g) => digitChar(g.value)).join(""), "266");
  assert.equal(groups(d, 2, 2).map((g) => digitChar(g.value)).join(""), "2312");
  assert.equal(groups(BASE3_DIGITS, 3, 2).reduce((s, g) => s * 9 + g.value, 0), valueOf(BASE3_DIGITS, 3));
});
