// The cache (#855): where a block may go under each mapping, least recently used thrown out, hits and misses for the
// ladder's sequences, the average time, and a sequence that thrashes direct mapping but not two-way.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CACHE_LADDER, access, addressParts, averageTime, choicesOf, emptyCache, placeOf, runSeq, thrashes } from "../src/math/cacheLab";

const hm = (hits: boolean[]) => hits.map((h) => (h ? "H" : "M")).join("");

test("where a block may go: its line, its set of two, or anywhere", () => {
  assert.deepEqual(placeOf("direct", 9), [1]);
  assert.deepEqual(placeOf("two", 7), [2, 3]);
  assert.deepEqual(placeOf("full", 7), [0, 1, 2, 3]);
  assert.deepEqual(addressParts("direct", 9), { tag: "10", index: "01" });
  assert.deepEqual(addressParts("two", 9), { tag: "100", index: "1" });
});

test("a full place throws out the least recently used line", () => {
  let c = emptyCache();
  for (const [t, b] of [1, 3, 1].entries()) c = access(c, "two", b, t).cache;
  // Set 1 holds 1 (used at 2) and 3 (used at 1): 5 throws out 3.
  assert.deepEqual(choicesOf(c, "two", 5), [3]);
  assert.equal(access(c, "two", 5, 3).out, 3);
});

test("the ladder's sequences, hit or miss", () => {
  assert.equal(hm(runSeq("direct", CACHE_LADDER[0].seq).hits), "MMHMHMM");
  assert.equal(hm(runSeq("two", CACHE_LADDER[1].seq).hits), "MMMHMHM");
  assert.equal(hm(runSeq("full", CACHE_LADDER[2].seq).hits), "MMMMHMHM");
  assert.equal(hm(runSeq("direct", CACHE_LADDER[3].seq).hits), "MMMMHHHHMM");
  assert.equal(averageTime(1, 2), 6);
});

test("thrashing: 0 and 4 fight over line 0 directly, but share set 0 two ways", () => {
  assert.ok(thrashes([0, 4, 0, 4, 0, 4]));
  assert.ok(!thrashes([0, 1, 0, 1, 0, 1]));
  assert.ok(!thrashes([0, 4, 0]));
});
