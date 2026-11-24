// Number rods: laying, moving and taking rods never loses one by accident or breaks the mat's limits, and the words
// read equal rows as equal sums and ask about a gap without filling it in.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addRod, fits, gaps, longest, MAX_ROWS, MAX_SUM, moveRod, newRow, putRod, RODS_START, rowSum, says, slotAt,
} from "../src/math/rods.ts";

const wall = RODS_START.rows;

test("a rod from the tray goes in where it is put, when the row has room", () => {
  assert.deepEqual(putRod(wall, 3, 3), [[10], [9, 1], [8, 2], [7, 3]]);
  assert.deepEqual(putRod(wall, 3, 3, 0)[3], [3, 7]);
  assert.deepEqual(putRod(wall, 1, 1, 1)[1], [9, 1, 1]);
  assert.deepEqual(putRod(wall, 1, 1, -4)[1], [1, 9, 1], "before the first");
  assert.equal(putRod([[10, 9]], 2, 0).length, 1);
  assert.equal(putRod([[10, 9]], 2, 0)[0].length, 2, "21 is too long");
  assert.equal(putRod(wall, 11, 0), wall, "no rod of 11");
  assert.equal(putRod(wall, 0, 0), wall);
  assert.equal(putRod(wall, 2.5, 0), wall);
  assert.equal(putRod(wall, 3, 7), wall, "no such row");
  assert.ok(fits([[10, 5]], 0, 5));
  assert.ok(!fits([[10, 5]], 0, 6));
  assert.ok(!fits([], 0, 1));
  assert.equal(MAX_SUM, 20);
});

test("a new row goes under the others; a tap lays a rod at the end of the last row", () => {
  assert.deepEqual(newRow(wall, 6).at(-1), [6]);
  const fullMat = Array.from({ length: MAX_ROWS }, () => [1]);
  assert.equal(newRow(fullMat, 2), fullMat);
  assert.equal(newRow(wall, 12), wall);
  assert.deepEqual(addRod(wall, 3).at(-1), [7, 3]);
  assert.deepEqual(addRod([], 4), [[4]]);
  assert.deepEqual(addRod([[10, 9]], 5), [[10, 9], [5]], "no room at the end: a row of its own");
});

test("a rod moves along its row, to another row, to a new row or off the mat", () => {
  assert.deepEqual(moveRod(wall, 1, 0, { t: 1, at: 1 })[1], [1, 9], "9 + 1 becomes 1 + 9");
  assert.equal(moveRod(wall, 1, 0, { t: 1, at: 0 }), wall, "put back where it was");
  assert.deepEqual(moveRod(wall, 2, 1, { t: 3, at: 5 }), [[10], [9, 1], [8], [7, 2]]);
  assert.deepEqual(moveRod(wall, 3, 0, { t: 0, at: 0 }), [[7, 10], [9, 1], [8, 2]], "an emptied row goes");
  assert.deepEqual(moveRod(wall, 1, 1, "new"), [[10], [9], [8, 2], [7], [1]]);
  assert.deepEqual(moveRod(wall, 0, 0, "new"), [[9, 1], [8, 2], [7], [10]], "a lone rod goes to the bottom");
  assert.deepEqual(moveRod(wall, 3, 0, null), [[10], [9, 1], [8, 2]]);
  assert.equal(moveRod(wall, 5, 0, null), wall, "no such rod");
  assert.equal(moveRod(wall, 0, 3, null), wall);
  assert.equal(moveRod(wall, 0, 0, { t: 9, at: 0 }), wall, "no such row");
  assert.equal(moveRod([[10, 9], [5]], 1, 0, { t: 0, at: 0 }).length, 2, "no room in that row");
  const fullMat = [[1, 2], ...Array.from({ length: MAX_ROWS - 1 }, () => [1])];
  assert.equal(moveRod(fullMat, 0, 1, "new"), fullMat, "no room for another row");
});

test("where a rod goes in a row is told by its middle", () => {
  assert.equal(slotAt([9, 1], 0.5), 0);
  assert.equal(slotAt([9, 1], 5), 1, "past the 9's middle");
  assert.equal(slotAt([9, 1], 9.4), 1);
  assert.equal(slotAt([9, 1], 12), 2);
  assert.equal(slotAt([], 3), 0);
});

test("the gaps are measured against the longest row", () => {
  assert.equal(longest(wall), 10);
  assert.deepEqual(gaps(wall), [0, 0, 0, 3]);
  assert.deepEqual(gaps([]), []);
  assert.equal(rowSum([8, 2]), 10);
});

test("the words: equal rows are equal sums, and a gap is asked about, not filled in", () => {
  assert.deepEqual(says([]), [{ kind: "empty" }]);
  assert.deepEqual(says([[7]]), [{ kind: "one", n: 7 }]);
  assert.deepEqual(says([[7, 3]]), [{ kind: "sum", parts: [7, 3], n: 10 }]);
  assert.deepEqual(says(wall), [{ kind: "same", n: 10, ways: [[9, 1], [8, 2]] }, { kind: "gap", parts: [7], n: 10 }]);
  assert.deepEqual(says([[10], [6, 1]]), [{ kind: "one", n: 10 }, { kind: "gap", parts: [6, 1], n: 10 }]);
  assert.deepEqual(says([[6, 4], [3]]), [{ kind: "sum", parts: [6, 4], n: 10 }, { kind: "gap", parts: [3], n: 10 }]);
  assert.deepEqual(says([[5], [5]]), [{ kind: "same", n: 5, ways: [] }]);
  assert.deepEqual(says(putRod(wall, 3, 3)), [{ kind: "same", n: 10, ways: [[9, 1], [8, 2], [7, 3]] }]);
});
