// The heap problems give the right answers: on their examples, on cases picked to catch a slip (one value, an empty
// heap, ties, rentals that touch), and on random inputs checked against sorting; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const up = (a: number[]) => [...a].sort((x, y) => x - y);
const list = (a: number[]) => `[${a.map((v) => (v < 0 ? `−${-v}` : v)).join(", ")}]`;
const unlist = (s: string) => (s.trim() ? s.split(", ").map((v) => Number(v.replace("−", "-"))) : []);

test("min heap construction", () => {
  assert.equal(answer("minHeapConstruction", "9, 4, 7, 1, 8, 2, 6", "insert 3, remove, peek, insert 0"), "The heap ends as [0, 2, 6, 3, 8, 7, 9, 4]; remove and peek gave [1, 2].");
  assert.equal(answer("minHeapConstruction", "5", ""), "The heap ends as [5].");
  assert.equal(answer("minHeapConstruction", "5", "remove"), "The heap ends as []; remove and peek gave [5].");
  assert.throws(() => answer("minHeapConstruction", "5", "remove, peek"), /the heap is empty/);
  assert.throws(() => answer("minHeapConstruction", "5", "jump 3"), /doesn't fit/);
  assert.throws(() => answer("minHeapConstruction", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", "insert 1, insert 2, insert 3, insert 4, insert 5, insert 6"), /At most 15/);
  const r = rng(21);
  for (let k = 0; k < 200; k++) {
    const vals = randInts(r, 1 + (k % 10), -9, 20);
    const ops: string[] = [];
    const bag = [...vals];
    const want: number[] = [];
    for (let j = 0; j < k % 8; j++) {
      const pick = r();
      if (pick < 0.4 || !bag.length) {
        const x = randInts(r, 1, -9, 20)[0];
        ops.push(`insert ${x}`);
        bag.push(x);
      } else {
        bag.sort((a, b) => a - b);
        want.push(bag[0]);
        if (pick < 0.7) ops.push("peek");
        else ops.push("remove"), bag.shift();
      }
    }
    const got = answer("minHeapConstruction", vals.join(", "), ops.join(", "));
    const m = got.match(/ends as \[(.*?)\](?:; remove and peek gave \[(.*)\])?\.$/)!;
    const heap = unlist(m[1]);
    assert.deepEqual(up(heap), up(bag), got);
    assert.ok(heap.every((v, i) => i === 0 || heap[(i - 1) >> 1] <= v), `not a heap: ${got}`);
    assert.deepEqual(m[2] === undefined ? [] : unlist(m[2]), want, got);
  }
});

test("continuous median", () => {
  assert.equal(answer("continuousMedian", "5, 15, 1, 3, 8, 7, 9, 10"), "The medians: [5, 10, 5, 4, 5, 6, 7, 7.5].");
  assert.equal(answer("continuousMedian", "-4"), "The medians: [−4].");
  assert.equal(answer("continuousMedian", "2, 2, 2"), "The medians: [2, 2, 2].");
  const r = rng(22);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), -20, 20);
    const meds = xs.map((_, i) => {
      const s = up(xs.slice(0, i + 1));
      const n = s.length;
      return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    });
    assert.equal(answer("continuousMedian", xs.join(", ")), `The medians: ${list(meds)}.`, `${xs}`);
  }
  assert.throws(() => answer("continuousMedian", "1, x"), /isn't a number/);
});

test("sort k-sorted array", () => {
  assert.equal(answer("sortKSortedArray", "3, 1, 2, 6, 4, 5, 9, 7, 8", "2"), "Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9].");
  assert.equal(answer("sortKSortedArray", "4, 1", "1"), "Sorted: [1, 4].");
  assert.throws(() => answer("sortKSortedArray", "4, 1", "0"), /isn't 0-sorted/);
  assert.equal(answer("sortKSortedArray", "7", "3"), "Sorted: [7].");
  assert.equal(answer("sortKSortedArray", "1, 1, 0", "2"), "Sorted: [0, 1, 1].");
  assert.throws(() => answer("sortKSortedArray", "5, 1, 2, 3", "1"), /isn't 1-sorted/);
  assert.throws(() => answer("sortKSortedArray", "1, 2", "-1"), /from 0 to 13/);
  const r = rng(23);
  for (let c = 0; c < 150; c++) {
    const n = 1 + (c % 14);
    const k = Math.floor(r() * 4);
    const sorted = up(randInts(r, n, -15, 15));
    // Shuffle with every value at most k places from where it belongs: sort the places by i + a random number in [0, k].
    const keys = sorted.map((_, i) => i + r() * (k + 0.999));
    const xs = sorted.map((_, i) => i).sort((a, b) => keys[a] - keys[b]).map((i) => sorted[i]);
    assert.equal(answer("sortKSortedArray", xs.join(", "), String(k)), `Sorted: ${list(sorted)}.`, `${xs} / ${k}`);
  }
});

test("laptop rentals", () => {
  assert.equal(answer("laptopRentals", "[0, 4], [2, 5], [4, 7], [1, 3], [6, 9], [5, 6]"), "The fewest laptops needed: 3.");
  assert.equal(answer("laptopRentals", "[0, 2], [2, 4], [4, 6]"), "The fewest laptops needed: 1.");
  assert.equal(answer("laptopRentals", "[1, 9], [1, 9], [1, 9]"), "The fewest laptops needed: 3.");
  assert.throws(() => answer("laptopRentals", "[3, 3]"), /ends as it starts/);
  assert.throws(() => answer("laptopRentals", "[4, 1]"), /isn't an interval/);
  const r = rng(24);
  for (let k = 0; k < 200; k++) {
    const rs = Array.from({ length: 1 + (k % 8) }, () => {
      const s = Math.floor(r() * 12) - 2;
      return [s, s + 1 + Math.floor(r() * 6)];
    });
    // The slow way: the most rentals going on at any one moment.
    const most = Math.max(...rs.map(([s]) => rs.filter(([a, b]) => a <= s && s < b).length));
    assert.equal(answer("laptopRentals", rs.map(([a, b]) => `[${a}, ${b}]`).join(", ")), `The fewest laptops needed: ${most}.`, JSON.stringify(rs));
  }
});

test("merge sorted arrays", () => {
  assert.equal(answer("mergeSortedArrays", "2, 9, 14; 1, 5, 8, 20; 3, 4, 12"), "Merged: [1, 2, 3, 4, 5, 8, 9, 12, 14, 20].");
  assert.equal(answer("mergeSortedArrays", "4, 6"), "Merged: [4, 6].");
  assert.equal(answer("mergeSortedArrays", "1, 1; 1; -2, 1"), "Merged: [−2, 1, 1, 1, 1].");
  assert.throws(() => answer("mergeSortedArrays", "1, 2; 5, 3"), /Array 1 isn't sorted/);
  assert.throws(() => answer("mergeSortedArrays", "1; 2; 3; 4; 5; 6"), /At most 5/);
  const r = rng(25);
  for (let k = 0; k < 150; k++) {
    const arrs = Array.from({ length: 1 + (k % 5) }, () => up(randInts(r, 1 + Math.floor(r() * 4), -10, 10)));
    assert.equal(answer("mergeSortedArrays", arrs.map((a) => a.join(", ")).join("; ")), `Merged: ${list(up(arrs.flat()))}.`, JSON.stringify(arrs));
  }
});
