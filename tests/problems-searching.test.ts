// The searching problems give the right answers: on their examples, on cases picked to catch a slip (the ends, one
// value, nothing found, runs of equal values), and on random inputs checked against looking at every value or sorting;
// bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const up = (a: number[]) => [...a].sort((x, y) => x - y);
const num = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** Distinct sorted whole numbers. */
const distinct = (r: () => number, n: number, lo: number, hi: number) => {
  const s = new Set<number>();
  while (s.size < n) s.add(randInts(r, 1, lo, hi)[0]);
  return up([...s]);
};

test("binary search", () => {
  assert.equal(answer("binarySearch", "-4, 1, 3, 7, 9, 12, 15, 20, 26", "12"), "12 is at index 5.");
  assert.equal(answer("binarySearch", "5", "5"), "5 is at index 0.");
  assert.equal(answer("binarySearch", "1, 3", "2"), "L has passed R with nothing found, so 2 isn't there: −1.");
  assert.throws(() => answer("binarySearch", "3, 1", "1"), /sorted/);
  const r = rng(31);
  for (let k = 0; k < 200; k++) {
    const xs = up(randInts(r, 1 + (k % 14), -20, 20));
    const t = randInts(r, 1, -22, 22)[0];
    const got = answer("binarySearch", xs.join(", "), String(t));
    if (!xs.includes(t)) assert.match(got, /: −1\.$/, `${xs} / ${t}`);
    else assert.equal(xs[Number(got.match(/index (\d+)/)![1])], t, `${xs} / ${t}: ${got}`);
  }
});

test("find three largest numbers", () => {
  assert.equal(answer("findThreeLargestNumbers", "12, 4, 19, 7, 19, 3, 15, -2, 10"), "The three largest: [15, 19, 19].");
  assert.equal(answer("findThreeLargestNumbers", "7, 7, 7"), "The three largest: [7, 7, 7].");
  assert.equal(answer("findThreeLargestNumbers", "-1, -5, -3, -9"), "The three largest: [−5, −3, −1].");
  assert.throws(() => answer("findThreeLargestNumbers", "1, 2"), /At least 3/);
  const r = rng(32);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 3 + (k % 12), -30, 30);
    const want = up(xs).slice(-3);
    assert.equal(answer("findThreeLargestNumbers", xs.join(", ")), `The three largest: [${want.map(num).join(", ")}].`, `${xs}`);
  }
});

test("search in sorted matrix", () => {
  const m = "1, 4, 7, 12; 2, 5, 9, 15; 6, 8, 13, 20; 10, 14, 18, 25";
  assert.equal(answer("searchInSortedMatrix", m, "13"), "13 is at [2, 2].");
  assert.equal(answer("searchInSortedMatrix", m, "10"), "10 is at [3, 0].");
  assert.equal(answer("searchInSortedMatrix", m, "11"), "The search has left the matrix, so 11 isn't in it: [−1, −1].");
  assert.equal(answer("searchInSortedMatrix", "4", "4"), "4 is at [0, 0].");
  assert.throws(() => answer("searchInSortedMatrix", "1, 2; 0, 3", "3"), /Every row and every column/);
  const r = rng(33);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [1 + (k % 5), 1 + Math.floor(r() * 6)];
    const g: number[][] = [];
    for (let i = 0; i < R; i++) {
      g.push([]);
      for (let j = 0; j < C; j++) g[i].push(Math.max(i ? g[i - 1][j] : -10, j ? g[i][j - 1] : -10) + Math.floor(r() * 4));
    }
    const t = randInts(r, 1, -10, 25)[0];
    const got = answer("searchInSortedMatrix", g.map((row) => row.join(", ")).join("; "), String(t));
    const at = got.match(/at \[(\d+), (\d+)\]/);
    if (!g.flat().includes(t)) assert.equal(at, null, got);
    else assert.equal(g[Number(at![1])][Number(at![2])], t, `${JSON.stringify(g)} / ${t}: ${got}`);
  }
});

test("shifted binary search", () => {
  assert.equal(answer("shiftedBinarySearch", "15, 18, 22, 30, 2, 5, 9, 11", "11"), "11 is at index 7.");
  assert.equal(answer("shiftedBinarySearch", "15, 18, 22, 30, 2, 5, 9, 11", "18"), "18 is at index 1.");
  assert.equal(answer("shiftedBinarySearch", "1, 2, 3", "4"), "L has passed R with nothing found, so 4 isn't there: −1.");
  assert.throws(() => answer("shiftedBinarySearch", "3, 1, 2, 0", "1"), /turned round/);
  assert.throws(() => answer("shiftedBinarySearch", "1, 1, 2", "1"), /all different/);
  assert.throws(() => answer("shiftedBinarySearch", "3, 4, 1, 5", "1"), /turned round/);
  const r = rng(34);
  for (let k = 0; k < 200; k++) {
    const s = distinct(r, 1 + (k % 14), -20, 20);
    const turn = Math.floor(r() * s.length);
    const xs = [...s.slice(turn), ...s.slice(0, turn)];
    const t = randInts(r, 1, -22, 22)[0];
    const i = xs.indexOf(t);
    assert.equal(answer("shiftedBinarySearch", xs.join(", "), String(t)), i < 0 ? `L has passed R with nothing found, so ${num(t)} isn't there: −1.` : `${num(t)} is at index ${i}.`, `${xs} / ${t}`);
  }
});

test("search for range", () => {
  assert.equal(answer("searchForRange", "1, 3, 4, 4, 4, 4, 4, 6, 8, 9", "4"), "4 runs from index 2 to index 6: [2, 6].");
  assert.equal(answer("searchForRange", "2, 2, 2", "2"), "2 runs from index 0 to index 2: [0, 2].");
  assert.equal(answer("searchForRange", "1, 3, 5", "4"), "L has passed R with no 4 found, so it isn't there: [−1, −1].");
  assert.throws(() => answer("searchForRange", "5, 4", "4"), /sorted/);
  const r = rng(35);
  for (let k = 0; k < 200; k++) {
    const xs = up(randInts(r, 1 + (k % 14), 0, 6));
    const t = randInts(r, 1, -1, 7)[0];
    const [a, b] = [xs.indexOf(t), xs.lastIndexOf(t)];
    assert.equal(answer("searchForRange", xs.join(", "), String(t)), a < 0 ? `L has passed R with no ${num(t)} found, so it isn't there: [−1, −1].` : `${t} runs from index ${a} to index ${b}: [${a}, ${b}].`, `${xs} / ${t}`);
  }
});

test("quickselect", () => {
  assert.equal(answer("quickselect", "8, 3, 12, 5, 1, 9, 6, 14, 2", "4"), "Counting from the smallest, number 4 is 5.");
  assert.equal(answer("quickselect", "7", "1"), "Counting from the smallest, number 1 is 7.");
  assert.equal(answer("quickselect", "3, -1, 2", "3"), "Counting from the smallest, number 3 is 3.");
  assert.throws(() => answer("quickselect", "1, 2, 2", "1"), /all different/);
  assert.throws(() => answer("quickselect", "1, 2", "3"), /from 1 to 2/);
  const r = rng(36);
  for (let c = 0; c < 200; c++) {
    const s = distinct(r, 1 + (c % 12), -30, 30);
    const xs = s.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    const k = 1 + Math.floor(r() * xs.length);
    assert.equal(answer("quickselect", xs.join(", "), String(k)), `Counting from the smallest, number ${k} is ${num(s[k - 1])}.`, `${xs} / ${k}`);
  }
});

test("index equals value", () => {
  assert.equal(answer("indexEqualsValue", "-5, -2, 0, 3, 4, 7, 9, 10, 13"), "The smallest index with a[i] = i is 3.");
  assert.equal(answer("indexEqualsValue", "0, 1, 2"), "The smallest index with a[i] = i is 0.");
  assert.equal(answer("indexEqualsValue", "1, 2, 3"), "L has passed R with no match: −1.");
  assert.throws(() => answer("indexEqualsValue", "1, 1, 2"), /all different/);
  const r = rng(37);
  for (let k = 0; k < 200; k++) {
    const xs = distinct(r, 1 + (k % 14), -8, 16);
    const i = xs.findIndex((x, j) => x === j);
    assert.equal(answer("indexEqualsValue", xs.join(", ")), i < 0 ? "L has passed R with no match: −1." : `The smallest index with a[i] = i is ${i}.`, `${xs}`);
  }
});

test("median of two sorted arrays", () => {
  assert.equal(answer("medianOfTwoSortedArrays", "2, 6, 9", "1, 3, 4, 7, 10, 12"), "The median is 6, the largest value on the left side.");
  assert.match(answer("medianOfTwoSortedArrays", "1, 2", "3, 4"), /^The median is \(2 \+ 3\) \/ 2 = 2\.5,/);
  assert.match(answer("medianOfTwoSortedArrays", "-", "5"), /^The median is 5,/);
  assert.match(answer("medianOfTwoSortedArrays", "1, 1", ""), /^The median is \(1 \+ 1\) \/ 2 = 1,/);
  assert.throws(() => answer("medianOfTwoSortedArrays", "-", ""), /Write something/);
  assert.throws(() => answer("medianOfTwoSortedArrays", "3, 1", "2"), /sorted/);
  const r = rng(38);
  for (let k = 0; k < 200; k++) {
    const a = up(randInts(r, k % 8, -15, 15));
    const b = up(randInts(r, 1 + Math.floor(r() * 9), -15, 15));
    const [x, y] = k % 2 ? [a, b] : [b, a];
    const all = up([...a, ...b]);
    const n = all.length;
    const med = n % 2 ? all[(n - 1) / 2] : (all[n / 2 - 1] + all[n / 2]) / 2;
    const got = answer("medianOfTwoSortedArrays", x.length ? x.join(", ") : "-", y.length ? y.join(", ") : "-");
    assert.ok(got.match(/= (−?[\d.]+),|^The median is (−?[\d.]+),/), got);
    const said = Number((got.match(/= (−?[\d.]+),/)?.[1] ?? got.match(/^The median is (−?[\d.]+),/)![1]).replace("−", "-"));
    assert.equal(said, med, `${x} / ${y}: ${got}`);
  }
});

test("optimal assembly line", () => {
  assert.equal(answer("optimalAssemblyLine", "4, 7, 2, 6, 3, 8, 5, 1", "3"), "The smallest possible longest station time is 14.");
  assert.equal(answer("optimalAssemblyLine", "5, 5, 5", "3"), "The smallest possible longest station time is 5.");
  assert.equal(answer("optimalAssemblyLine", "2, 9, 4", "1"), "The smallest possible longest station time is 15.");
  assert.throws(() => answer("optimalAssemblyLine", "1, 2", "3"), /from 1 to 2/);
  assert.throws(() => answer("optimalAssemblyLine", "1, 0", "1"), /too small/);
  const r = rng(39);
  for (let c = 0; c < 150; c++) {
    const steps = randInts(r, 1 + (c % 10), 1, 12);
    const k = 1 + Math.floor(r() * steps.length);
    // The slow way: every way to cut the steps into k groups in order.
    const best = (from: number, groups: number): number => {
      if (groups === 1) return steps.slice(from).reduce((x, y) => x + y, 0);
      let out = Infinity;
      let sum = 0;
      for (let end = from; end <= steps.length - groups; end++) {
        sum += steps[end];
        out = Math.min(out, Math.max(sum, best(end + 1, groups - 1)));
      }
      return out;
    };
    assert.equal(answer("optimalAssemblyLine", steps.join(", "), String(k)), `The smallest possible longest station time is ${best(0, k)}.`, `${steps} / ${k}`);
  }
});
