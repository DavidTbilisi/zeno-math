// Linking cubes: joining, breaking and sharing never lose or make a cube, and the words match the trains.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCube, breakAt, colourParts, cubeTotal, join, joinAll, MAX_LEN, MAX_TRAINS, newTrain, paint, removeCube, says,
  shareInto, sortByLength,
} from "../src/math/cubes.ts";

const mat = [[0, 0, 0, 0, 1, 1, 1], [2, 2, 2, 2, 2]];

test("joining and breaking keep every cube, in order", () => {
  const joined = join(mat, 1, 0);
  assert.deepEqual(joined, [[0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2]]);
  assert.deepEqual(breakAt(joined, 0, 7), mat);
  assert.deepEqual(breakAt(mat, 0, 0), mat, "no break before the first cube");
  assert.deepEqual(breakAt(mat, 0, 7), mat, "nor after the last");
  assert.deepEqual(join(mat, 0, 0), mat);
  const long = [Array(15).fill(0), Array(6).fill(1)];
  assert.deepEqual(join(long, 1, 0), long, "too long to join");
});

test("painting, adding and removing", () => {
  assert.deepEqual(paint(mat, 1, 0, 4)[1], [4, 2, 2, 2, 2]);
  assert.deepEqual(addCube(mat, 1, 3)[1], [2, 2, 2, 2, 2, 3]);
  assert.equal(addCube([Array(MAX_LEN).fill(0)], 0, 1)[0].length, MAX_LEN);
  assert.deepEqual(removeCube([[1], [2, 2]], 0), [[2, 2]], "a train with no cubes left goes");
  assert.equal(newTrain(Array(MAX_TRAINS).fill([0]), 1).length, MAX_TRAINS);
});

test("sharing into trains of k: equal trains and what is left", () => {
  const shared = shareInto(mat, 4);
  assert.deepEqual(shared.map((t) => t.length), [4, 4, 4]);
  assert.equal(cubeTotal(shared), 12);
  assert.deepEqual(says(shared), [{ kind: "equal", trains: 3, k: 4, n: 12 }]);
  const five = shareInto(mat, 5);
  assert.deepEqual(five.map((t) => t.length), [5, 5, 2]);
  assert.deepEqual(says(five), [{ kind: "share", trains: 2, k: 5, left: 2, n: 12 }]);
  assert.deepEqual(shareInto(mat, 1), mat, "12 trains would not fit");
  assert.deepEqual(joinAll(shared), [mat.flat()]);
  const many = [Array(15).fill(0), Array(6).fill(1)];
  assert.equal(joinAll(many), many, "21 cubes don't fit in one train");
});

test("the words: one train by colour, trains added, two compared", () => {
  assert.deepEqual(says([[0, 0, 0, 1, 1, 1, 1, 1, 1, 1]]), [{ kind: "parts", parts: [3, 7], n: 10 }]);
  assert.deepEqual(says([[2, 2, 2]]), [{ kind: "one", n: 3 }]);
  assert.deepEqual(says(mat), [{ kind: "sum", lengths: [7, 5], n: 12 }, { kind: "compare", a: 7, b: 5 }]);
  assert.deepEqual(says([[1, 1], [0, 0]]), [{ kind: "equal", trains: 2, k: 2, n: 4 }, { kind: "same", a: 2 }]);
  assert.deepEqual(says([]), [{ kind: "empty" }]);
  assert.deepEqual(colourParts([1, 0, 1, 2]), [{ color: 1, n: 2 }, { color: 0, n: 1 }, { color: 2, n: 1 }]);
});

test("sorting puts the longest first and keeps ties in order", () => {
  assert.deepEqual(sortByLength([[1], [2, 2, 2], [3, 3], [4, 4, 4]]), [[2, 2, 2], [4, 4, 4], [3, 3], [1]]);
});
