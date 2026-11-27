// Hamming code (#857): encoding, the syndrome naming a single flipped bit, and two flips pointing at a third.
import assert from "node:assert/strict";
import { test } from "node:test";
import { HAMMING_LADDER, diffs, encode, failing, flip, sentOf, startBits, syndrome } from "../src/math/hammingLab";

test("code words pass every check; the data sits in the non-check places", () => {
  assert.deepEqual(encode([1, 0, 1, 1], 7), [0, 1, 1, 0, 0, 1, 1]);
  for (const p of HAMMING_LADDER) assert.equal(syndrome(sentOf(p)), 0);
  assert.equal(encode([1, 0, 0, 1, 1, 1, 0, 1], 12).length, 12);
});

test("any one flip: the failing checks add up to its place", () => {
  for (const n of [7, 12]) {
    const w = encode(n === 7 ? [0, 1, 1, 0] : [0, 1, 1, 0, 1, 0, 0, 1], n);
    for (let i = 1; i <= n; i++) assert.equal(syndrome(flip(w, i)), i);
  }
  assert.deepEqual(failing(startBits(HAMMING_LADDER[1])), [1, 4]);
  assert.deepEqual(failing(startBits(HAMMING_LADDER[3])), [2, 8]);
});

test("two flips point at a third bit, and fixing it lands on another code word", () => {
  const w = sentOf(HAMMING_LADDER[4]);
  const bad = flip(flip(w, 2), 5);
  assert.equal(syndrome(bad), 7);
  const fixed = flip(bad, 7);
  assert.equal(syndrome(fixed), 0);
  assert.deepEqual(diffs(fixed, w), [2, 5, 7]);
});
