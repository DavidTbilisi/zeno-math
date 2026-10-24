// The sorting problems give the right answers: on their examples, on cases picked to catch a slip (one number, ties,
// negatives, already sorted, reversed), and on random inputs checked against Array.prototype.sort or counting every
// pair; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const text = (xs: number[]) => `[${xs.map((x) => (x < 0 ? `−${-x}` : String(x))).join(", ")}]`;
const sorted = (xs: number[]) => `Sorted: ${text([...xs].sort((a, b) => a - b))}`;

const SORTS: ProblemId[] = ["bubbleSort", "insertionSort", "selectionSort", "quickSort", "heapSort", "mergeSort"];

test("the comparison sorts: examples, edge cases and random arrays", () => {
  assert.equal(answer("bubbleSort", "6, 2, -3, 8, 4, 9, 11"), "Sorted: [−3, 2, 4, 6, 8, 9, 11]");
  assert.equal(answer("insertionSort", "4, -1, 7, 3, 9, 0"), "Sorted: [−1, 0, 3, 4, 7, 9]");
  assert.equal(answer("selectionSort", "8, 3, 5, -1, 9, 2"), "Sorted: [−1, 2, 3, 5, 8, 9]");
  assert.equal(answer("quickSort", "5, 2, 8, -1, 9, 3, 6, 1"), "Sorted: [−1, 1, 2, 3, 5, 6, 8, 9]");
  assert.equal(answer("heapSort", "4, 10, -2, 7, 1, 9, 3"), "Sorted: [−2, 1, 3, 4, 7, 9, 10]");
  assert.equal(answer("mergeSort", "7, -3, 5, 1, 9, 0, 4"), "Sorted: [−3, 0, 1, 4, 5, 7, 9]");
  const r = rng(11);
  for (const id of SORTS) {
    for (const xs of [[5], [2, 2, 2], [1, 2, 3, 4], [4, 3, 2, 1], [0, -1, 0, -1], [1.5, -0.5, 1]]) assert.equal(answer(id, xs.join(", ")), sorted(xs), `${id} ${xs}`);
    for (let k = 0; k < 120; k++) {
      const xs = randInts(r, 1 + (k % 12), -20, 20);
      assert.equal(answer(id, xs.join(", ")), sorted(xs), `${id} ${xs}`);
    }
    assert.throws(() => answer(id, ""), /Write something/);
    assert.throws(() => answer(id, "1, x"), /isn't a number/);
    assert.throws(() => answer(id, Array(13).fill(1).join(", ")), /At most 12/);
  }
});

test("bubble sort stops early on a sorted array", () => {
  const trace = problemTrace("bubbleSort", ["1, 2, 3, 4, 5"], w);
  // Four comparisons, the clean pass, the answer.
  assert.equal(trace.frames.length, 6);
  assert.match(trace.frames[4].note, /no swaps/);
});

test("heap sort shows the heap shrinking as a tree", () => {
  const trace = problemTrace("heapSort", ["4, 10, -2, 7, 1, 9, 3"], w);
  const sizes = trace.frames.map((f) => f.tree?.nodes?.length);
  assert.equal(sizes[0], 7);
  assert.equal(sizes[sizes.length - 1], 1);
  const built = trace.frames.find((f) => f.note.startsWith("The max-heap is built"))!;
  const nodes = built.tree!.nodes!;
  for (const n of nodes) for (const c of [n.left, n.right]) if (c >= 0) assert.ok(n.val >= nodes[c].val, `${n.val} over ${nodes[c].val}`);
});

test("three number sort", () => {
  assert.equal(answer("threeNumberSort", "3, 1, -2, 1, 3, -2, 1, 3, -2", "1, -2, 3"), "Sorted: [1, 1, 1, −2, −2, −2, 3, 3, 3]");
  assert.equal(answer("threeNumberSort", "7", "1, 7, 3"), "Sorted: [7]");
  assert.equal(answer("threeNumberSort", "3, 3, 1", "1, 2, 3"), "Sorted: [1, 3, 3]");
  const r = rng(12);
  for (let k = 0; k < 150; k++) {
    const order = [...new Set(randInts(r, 6, -5, 5))].slice(0, 3);
    if (order.length < 3) continue;
    const xs = randInts(r, 1 + (k % 12), 0, 2).map((i) => order[i]);
    const want = [...xs].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    assert.equal(answer("threeNumberSort", xs.join(", "), order.join(", ")), `Sorted: ${text(want)}`, `${xs} / ${order}`);
  }
  assert.throws(() => answer("threeNumberSort", "1, 2", "1, 1, 2"), /three different/);
  assert.throws(() => answer("threeNumberSort", "1, 4", "1, 2, 3"), /4 isn't one of/);
  assert.throws(() => answer("threeNumberSort", "1, 2", "1, 2"), /At least 3/);
});

test("radix sort", () => {
  assert.equal(answer("radixSort", "412, 38, 905, 7, 263, 81, 350"), "Sorted: [7, 38, 81, 263, 350, 412, 905]");
  assert.equal(answer("radixSort", "0, 0"), "Sorted: [0, 0]");
  assert.equal(answer("radixSort", "5"), "Sorted: [5]");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 10), 0, [9, 99, 999][k % 3]);
    assert.equal(answer("radixSort", xs.join(", ")), sorted(xs), `${xs}`);
  }
  assert.throws(() => answer("radixSort", "3, -1"), /too small/);
  assert.throws(() => answer("radixSort", "3, 1000"), /too big/);
  assert.throws(() => answer("radixSort", "3, 1.5"), /whole number/);
});

test("count inversions", () => {
  assert.equal(answer("countInversions", "3, 8, 1, 5, -2, 6"), "Inversions: 8.");
  assert.equal(answer("countInversions", "4"), "Inversions: 0.");
  assert.equal(answer("countInversions", "1, 2, 3"), "Inversions: 0.");
  assert.equal(answer("countInversions", "3, 2, 1"), "Inversions: 3.");
  assert.equal(answer("countInversions", "2, 2, 2"), "Inversions: 0.");
  const r = rng(14);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9);
    let n = 0;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i] > xs[j]) n++;
    assert.equal(answer("countInversions", xs.join(", ")), `Inversions: ${n}.`, `${xs}`);
  }
  assert.throws(() => answer("countInversions", "a"), /isn't a number/);
});
