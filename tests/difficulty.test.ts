// Too easy moves the next questions up a level, too hard down one, about right keeps it; past either end the level
// stays and the rating is marked as at the edge (issue #288).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLevel } from "../src/math/difficulty.ts";

test("too easy goes up, too hard goes down, about right stays", () => {
  assert.deepEqual(rateLevel(1, "easy"), { level: 2, edge: false });
  assert.deepEqual(rateLevel(2, "easy"), { level: 3, edge: false });
  assert.deepEqual(rateLevel(3, "hard"), { level: 2, edge: false });
  assert.deepEqual(rateLevel(2, "hard"), { level: 1, edge: false });
  for (const L of [1, 2, 3] as const) assert.deepEqual(rateLevel(L, "right"), { level: L, edge: false });
});

test("there is no level past hard or below easy", () => {
  assert.deepEqual(rateLevel(3, "easy"), { level: 3, edge: true });
  assert.deepEqual(rateLevel(1, "hard"), { level: 1, edge: true });
});
