// The array problems give the right answers: on their examples, on cases picked to catch a slip (nothing found, the
// last pair, negatives), and on random inputs checked against working it out the slow way; bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
const answer = (id: ProblemId, ...input: string[]) => problemTrace(id, input, w).answer;
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));

test("two number sum", () => {
  assert.equal(answer("twoNumberSum", "4, 7, -2, 9, 1, 5, 12", "10"), "9 + 1 = 10");
  assert.equal(answer("twoNumberSum", "1, 2, 3", "7"), "No two of the numbers add up to 7.");
  assert.equal(answer("twoNumberSum", "-3, 8", "5"), "−3 + 8 = 5");
  const r = rng(1);
  for (let k = 0; k < 200; k++) {
    const xs = [...new Set(randInts(r, 2 + (k % 10), -20, 20))];
    const t = randInts(r, 1, -30, 30)[0];
    const some = xs.some((x, i) => xs.some((y, j) => i !== j && x + y === t));
    const got = answer("twoNumberSum", xs.join(", "), String(t));
    assert.equal(!got.startsWith("No"), some, `${xs} → ${t}: ${got}`);
  }
});

test("validate subsequence", () => {
  assert.equal(answer("validateSubsequence", "5, 1, 22, 25, 6, -1, 8, 10", "1, 6, -1, 10"), w.arrays.validateSubsequence.yes);
  assert.match(answer("validateSubsequence", "1, 2, 3", "2, 1"), /^No: 1 was never found/);
  const r = rng(2);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 8), 0, 4);
    const seq = randInts(r, 1 + (k % 3), 0, 4);
    let j = 0;
    for (const x of xs) if (j < seq.length && x === seq[j]) j++;
    assert.equal(answer("validateSubsequence", xs.join(", "), seq.join(", ")) === w.arrays.validateSubsequence.yes, j === seq.length, `${xs} / ${seq}`);
  }
});

test("sorted squared array", () => {
  assert.equal(answer("sortedSquaredArray", "-7, -3, -1, 2, 4, 9"), "Sorted squares: [1, 4, 9, 16, 49, 81]");
  assert.throws(() => answer("sortedSquaredArray", "3, 1"), /sorted/);
  const r = rng(3);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 9), -15, 15).sort((a, b) => a - b);
    assert.equal(answer("sortedSquaredArray", xs.join(", ")), `Sorted squares: [${xs.map((x) => x * x).sort((a, b) => a - b).join(", ")}]`);
  }
});

test("tournament winner", () => {
  assert.equal(answer("tournamentWinner", "Lions-Bears, Bears-Hawks, Hawks-Lions, Lions-Hawks", "0, 1, 1, 1"), "The winner is Bears with 6 points.");
  assert.throws(() => answer("tournamentWinner", "A-B, B-C", "1"), /One result per match/);
  assert.throws(() => answer("tournamentWinner", "A-B", "2"));
});

test("non-constructible change", () => {
  assert.equal(answer("nonConstructibleChange", "5, 7, 1, 1, 2, 3, 22"), "The smallest amount that can't be made is 20.");
  assert.equal(answer("nonConstructibleChange", "2"), "The smallest amount that can't be made is 1.");
  const r = rng(4);
  for (let k = 0; k < 100; k++) {
    const xs = randInts(r, 1 + (k % 7), 1, 9);
    // The slow way: every sum of a subset, then the first amount missing.
    const sums = new Set([0]);
    for (const x of xs) for (const s of [...sums]) sums.add(s + x);
    let g = 1;
    while (sums.has(g)) g++;
    assert.equal(answer("nonConstructibleChange", xs.join(", ")), `The smallest amount that can't be made is ${g}.`, `${xs}`);
  }
  assert.throws(() => answer("nonConstructibleChange", "1, 0"), /too small/);
});

test("transpose matrix", () => {
  assert.equal(answer("transposeMatrix", "1, 2, 3; 4, 5, 6"), "The transpose: [1, 4], [2, 5], [3, 6]");
  assert.equal(answer("transposeMatrix", "7"), "The transpose: [7]");
  assert.throws(() => answer("transposeMatrix", "1, 2; 3"), /as many entries/);
});

// ——— Medium and harder ———

/** The way the answers write numbers and lists: a real minus sign. */
const num = (v: number) => (v < 0 ? `−${-v}` : String(v));
const fmt = (a: readonly number[]) => `[${a.map(num).join(", ")}]`;
/** The numbers in a piece of an answer, minus signs and all. */
const numbersIn = (s: string) => (s.replace(/−/g, "-").match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const distinctInts = (r: () => number, n: number, lo: number, hi: number) => [...new Set(randInts(r, n, lo, hi))];
const subsets = <T>(xs: readonly T[], k: number): T[][] =>
  k === 0 ? [[]] : xs.flatMap((x, i) => subsets(xs.slice(i + 1), k - 1).map((s) => [x, ...s]));
const randPoints = (r: () => number, n: number, size: number) => {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const p: [number, number] = [Math.floor(r() * size), Math.floor(r() * size)];
    if (!seen.has(`${p}`)) seen.add(`${p}`), out.push(p);
  }
  return out;
};
const writePoints = (ps: readonly (readonly [number, number])[]) => ps.map(([x, y]) => `${x}, ${y}`).join("; ");

test("three number sum", () => {
  assert.equal(answer("threeNumberSum", "3, -4, 8, 1, -1, 6, 2", "5"), "The triplets: [−4, 1, 8], [−4, 3, 6]");
  assert.equal(answer("threeNumberSum", "1, 2, 3", "10"), "No three of the numbers add up to 10.");
  assert.throws(() => answer("threeNumberSum", "1, 1, 2", "4"), /different/);
  assert.throws(() => answer("threeNumberSum", "1, 2", "3"), /At least 3/);
  const r = rng(11);
  for (let k = 0; k < 150; k++) {
    const xs = distinctInts(r, 3 + (k % 9), -15, 15);
    if (xs.length < 3) continue;
    const t = randInts(r, 1, -10, 10)[0];
    const want = subsets([...xs].sort((a, b) => a - b), 3).filter((s) => s[0] + s[1] + s[2] === t);
    const got = answer("threeNumberSum", xs.join(", "), String(t));
    assert.equal(got, want.length ? `The triplets: ${want.map(fmt).join(", ")}` : `No three of the numbers add up to ${num(t)}.`, `${xs} → ${t}`);
  }
});

test("smallest difference", () => {
  assert.equal(answer("smallestDifference", "14, -3, 9, 27", "20, 5, -10, 31, 16"), "The closest pair is [14, 16], 2 apart.");
  assert.equal(answer("smallestDifference", "1, 5", "9, 5"), "The closest pair is [5, 5], 0 apart.");
  assert.equal(answer("smallestDifference", "-4", "7"), "The closest pair is [−4, 7], 11 apart.");
  const r = rng(12);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 8), -30, 30);
    const ys = randInts(r, 1 + ((k * 3) % 7), -30, 30);
    const best = Math.min(...xs.flatMap((x) => ys.map((y) => Math.abs(x - y))));
    const [x, y, d] = numbersIn(answer("smallestDifference", xs.join(", "), ys.join(", ")));
    assert.ok(xs.includes(x) && ys.includes(y) && Math.abs(x - y) === d && d === best, `${xs} / ${ys}`);
  }
});

test("move element to end", () => {
  assert.equal(answer("moveElementToEnd", "4, 1, 4, 3, 4, 2, 5, 4", "4"), "Every 4 moved to the end: [5, 1, 2, 3, 4, 4, 4, 4]");
  assert.equal(answer("moveElementToEnd", "7", "7"), "Every 7 moved to the end: [7]");
  assert.equal(answer("moveElementToEnd", "1, 2", "3"), "Every 3 moved to the end: [1, 2]");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 4);
    const v = randInts(r, 1, 0, 4)[0];
    const got = numbersIn(answer("moveElementToEnd", xs.join(", "), String(v)).split(": ")[1]);
    const copies = xs.filter((x) => x === v).length;
    assert.deepEqual([...got].sort(), [...xs].sort(), `${xs}`);
    assert.ok(got.slice(got.length - copies).every((x) => x === v) && !got.slice(0, got.length - copies).includes(v), `${xs} / ${v} → ${got}`);
  }
});

test("monotonic array", () => {
  const m = w.arrays.monotonicArray;
  assert.equal(answer("monotonicArray", "12, 9, 9, 4, 1, 1, -3"), m.isDown);
  assert.equal(answer("monotonicArray", ""), m.isFlat);
  assert.equal(answer("monotonicArray", "5"), m.isFlat);
  assert.equal(answer("monotonicArray", "1, 2, 2, 1"), m.isNot);
  assert.equal(answer("monotonicArray", "-1, -1, 0, 3"), m.isUp);
  const r = rng(14);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 7), 0, 3);
    const up = xs.every((x, i) => i === 0 || x >= xs[i - 1]);
    const down = xs.every((x, i) => i === 0 || x <= xs[i - 1]);
    assert.equal(answer("monotonicArray", xs.join(", ")).startsWith("Yes"), up || down, `${xs}`);
  }
});

test("spiral traverse", () => {
  assert.equal(answer("spiralTraverse", "7, 2, 9, 4; 1, 8, 3, 6; 5, 0, 2, 7"), "In spiral order: [7, 2, 9, 4, 6, 7, 2, 0, 5, 1, 8, 3]");
  assert.equal(answer("spiralTraverse", "5"), "In spiral order: [5]");
  assert.equal(answer("spiralTraverse", "1; 2; 3"), "In spiral order: [1, 2, 3]");
  const r = rng(15);
  for (let k = 0; k < 100; k++) {
    const [R, C] = [1 + (k % 6), 1 + Math.floor(r() * 6)];
    const m = Array.from({ length: R }, () => randInts(r, C, 0, 9));
    // The slow way: walk, turning right at an edge or a square already read.
    const seen = m.map((row) => row.map(() => false));
    const want: number[] = [];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let [i, j, d] = [0, 0, 0];
    for (let n = 0; n < R * C; n++) {
      want.push(m[i][j]);
      seen[i][j] = true;
      const [a, b] = [i + dirs[d][0], j + dirs[d][1]];
      if (a < 0 || a >= R || b < 0 || b >= C || seen[a][b]) d = (d + 1) % 4;
      [i, j] = [i + dirs[d][0], j + dirs[d][1]];
    }
    assert.equal(answer("spiralTraverse", m.map((row) => row.join(", ")).join("; ")), `In spiral order: ${fmt(want)}`, `${R}×${C}`);
  }
});

test("longest peak", () => {
  assert.equal(answer("longestPeak", "1, 4, 2, 3, 5, 9, 6, 2, 2, 7, 1"), "The longest peak has length 6: [2, 3, 5, 9, 6, 2].");
  assert.equal(answer("longestPeak", "1, 2, 3"), w.arrays.longestPeak.none);
  assert.equal(answer("longestPeak", "5"), w.arrays.longestPeak.none);
  assert.equal(answer("longestPeak", "1, 3, 1, 3, 1"), "The longest peak has length 3: [1, 3, 1].");
  const r = rng(16);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 5);
    let best = 0;
    for (let s = 0; s < xs.length; s++)
      for (let e = s + 2; e < xs.length; e++)
        for (let t = s + 1; t < e; t++) {
          const ok = xs.slice(s, t + 1).every((x, i, a) => i === 0 || x > a[i - 1]) && xs.slice(t, e + 1).every((x, i, a) => i === 0 || x < a[i - 1]);
          if (ok) best = Math.max(best, e - s + 1);
        }
    const got = answer("longestPeak", xs.join(", "));
    assert.equal(best ? numbersIn(got)[0] : got, best ? best : w.arrays.longestPeak.none, `${xs}`);
  }
});

test("array of products", () => {
  assert.equal(answer("arrayOfProducts", "3, -2, 5, 1, 4"), "The products: [−40, 60, −24, −120, −30]");
  assert.equal(answer("arrayOfProducts", "0, 2, 0"), "The products: [0, 0, 0]");
  assert.equal(answer("arrayOfProducts", "-3, 0"), "The products: [0, −3]");
  assert.equal(answer("arrayOfProducts", "7"), "The products: [1]");
  assert.throws(() => answer("arrayOfProducts", "2, 51"), /too big/);
  const r = rng(17);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 10), -9, 9);
    const want = xs.map((_, i) => xs.reduce((p, x, j) => (j === i ? p : p * x), 1) + 0);
    assert.equal(answer("arrayOfProducts", xs.join(", ")), `The products: ${fmt(want)}`, `${xs}`);
  }
});

test("first duplicate value", () => {
  assert.equal(answer("firstDuplicateValue", "2, 5, 3, 5, 2, 1"), "The first duplicate is 5.");
  assert.equal(answer("firstDuplicateValue", "1, 2, 3"), w.arrays.firstDuplicateValue.none);
  assert.equal(answer("firstDuplicateValue", "1, 1"), "The first duplicate is 1.");
  assert.throws(() => answer("firstDuplicateValue", "4, 1"), /from 1 to 2/);
  assert.throws(() => answer("firstDuplicateValue", "0, 1"), /too small/);
  const r = rng(18);
  for (let k = 0; k < 200; k++) {
    const n = 1 + (k % 12);
    const xs = randInts(r, n, 1, n);
    const seen = new Set<number>();
    const first = xs.find((x) => (seen.has(x) ? true : (seen.add(x), false)));
    assert.equal(answer("firstDuplicateValue", xs.join(", ")), first === undefined ? w.arrays.firstDuplicateValue.none : `The first duplicate is ${first}.`, `${xs}`);
  }
});

test("merge overlapping intervals", () => {
  assert.equal(answer("mergeOverlappingIntervals", "[6, 9], [1, 3], [2, 4], [10, 12], [9, 10], [15, 16]"), "Merged: [1, 4], [6, 12], [15, 16]");
  assert.equal(answer("mergeOverlappingIntervals", "[1, 2], [2, 3]"), "Merged: [1, 3]");
  assert.equal(answer("mergeOverlappingIntervals", "[1, 10], [2, 3], [4, 5]"), "Merged: [1, 10]");
  assert.equal(answer("mergeOverlappingIntervals", "[-5, -1], [0, 2]"), "Merged: [−5, −1], [0, 2]");
  assert.throws(() => answer("mergeOverlappingIntervals", "[3, 1]"), /isn't an interval/);
  const r = rng(19);
  for (let k = 0; k < 150; k++) {
    const iv = Array.from({ length: 1 + (k % 8) }, () => {
      const a = randInts(r, 1, 0, 20)[0];
      return [a, a + randInts(r, 1, 0, 5)[0]];
    });
    let merged = iv.map((p) => [...p]);
    for (let again = true; again; ) {
      again = false;
      for (let i = 0; i < merged.length && !again; i++)
        for (let j = i + 1; j < merged.length && !again; j++)
          if (merged[i][0] <= merged[j][1] && merged[j][0] <= merged[i][1]) {
            merged = [...merged.filter((_, x) => x !== i && x !== j), [Math.min(merged[i][0], merged[j][0]), Math.max(merged[i][1], merged[j][1])]];
            again = true;
          }
    }
    merged.sort((a, b) => a[0] - b[0]);
    assert.equal(answer("mergeOverlappingIntervals", iv.map(fmt).join(", ")), `Merged: ${merged.map(fmt).join(", ")}`, `${JSON.stringify(iv)}`);
  }
});

test("best seat", () => {
  assert.equal(answer("bestSeat", "1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1"), "The best seat is 5.");
  assert.equal(answer("bestSeat", "1, 0, 0, 1"), "The best seat is 1.");
  assert.equal(answer("bestSeat", "1, 1"), w.arrays.bestSeat.none);
  assert.throws(() => answer("bestSeat", "0, 1"), /first and last/);
  assert.throws(() => answer("bestSeat", "1, 2, 1"), /doesn't fit/);
  const r = rng(20);
  for (let k = 0; k < 200; k++) {
    const xs = [1, ...randInts(r, k % 12, 0, 1).map((x) => (r() < 0.6 ? 0 : x)), 1];
    // The slow way: every free seat with the run of free seats around it; the longest run, its middle, leftmost first.
    let [best, most] = [-1, 0];
    for (let i = 0; i < xs.length; i++) {
      if (xs[i]) continue;
      let [l, h] = [i, i];
      while (xs[l - 1] === 0) l--;
      while (xs[h + 1] === 0) h++;
      if (h - l + 1 > most) [best, most] = [Math.floor((l - 1 + h + 1) / 2), h - l + 1];
    }
    assert.equal(answer("bestSeat", xs.join(", ")), best < 0 ? w.arrays.bestSeat.none : `The best seat is ${best}.`, `${xs}`);
  }
});

test("zero sum subarray", () => {
  assert.equal(answer("zeroSumSubarray", "3, 4, -2, 5, -3, 1"), "Yes: [−2, 5, −3] adds up to 0.");
  assert.equal(answer("zeroSumSubarray", "1, 2, 3"), w.arrays.zeroSumSubarray.no);
  assert.equal(answer("zeroSumSubarray", "0"), "Yes: [0] adds up to 0.");
  assert.equal(answer("zeroSumSubarray", "4, -4"), "Yes: [4, −4] adds up to 0.");
  const r = rng(21);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 10), -6, 6);
    const some = xs.some((_, s) => xs.some((__, e) => e >= s && xs.slice(s, e + 1).reduce((a, b) => a + b, 0) === 0));
    const got = answer("zeroSumSubarray", xs.join(", "));
    assert.equal(got.startsWith("Yes"), some, `${xs}`);
    if (some) assert.equal(numbersIn(got.slice(0, got.indexOf("adds"))).reduce((a, b) => a + b, 0), 0, got);
  }
});

test("missing numbers", () => {
  assert.equal(answer("missingNumbers", "4, 7, 1, 2, 6"), "The missing numbers are 3 and 5.");
  assert.equal(answer("missingNumbers", "1"), "The missing numbers are 2 and 3.");
  assert.equal(answer("missingNumbers", "3, 4"), "The missing numbers are 1 and 2.");
  assert.throws(() => answer("missingNumbers", "1, 1"), /different/);
  assert.throws(() => answer("missingNumbers", "1, 5"), /from 1 to 4/);
  const r = rng(22);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 12);
    const all = Array.from({ length: n + 2 }, (_, i) => i + 1).sort(() => r() - 0.5);
    const [gone, xs] = [all.slice(0, 2).sort((a, b) => a - b), all.slice(2)];
    assert.equal(answer("missingNumbers", xs.join(", ")), `The missing numbers are ${gone[0]} and ${gone[1]}.`, `${xs}`);
  }
});

test("majority element", () => {
  assert.equal(answer("majorityElement", "4, 2, 4, 3, 4, 4, 1, 4, 2"), "The majority element is 4.");
  assert.equal(answer("majorityElement", "-7"), "The majority element is −7.");
  assert.throws(() => answer("majorityElement", "1, 2"), /more than half/);
  const r = rng(23);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 13);
    const v = randInts(r, 1, -5, 5)[0];
    const many = Math.floor(n / 2) + 1;
    const xs = [...Array(many).fill(v), ...randInts(r, n - many, -5, 5)].sort(() => r() - 0.5);
    assert.equal(answer("majorityElement", xs.join(", ")), `The majority element is ${num(v)}.`, `${xs}`);
  }
});

test("sweet and savory", () => {
  assert.equal(answer("sweetAndSavory", "-3, 5, -7, 2, 8, -1, 4", "6"), "The best pair is [−3, 8].");
  assert.equal(answer("sweetAndSavory", "-5, 3", "-3"), "No pair comes to −3 or less, so the answer is [0, 0].");
  assert.equal(answer("sweetAndSavory", "-1, -2", "5"), "No pair comes to 5 or less, so the answer is [0, 0].");
  assert.throws(() => answer("sweetAndSavory", "-1, 0, 2", "3"), /no zeros/);
  const r = rng(24);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), -9, 9).filter((x) => x !== 0);
    if (!xs.length) continue;
    const t = randInts(r, 1, -6, 10)[0];
    const sums = xs.filter((x) => x < 0).flatMap((s) => xs.filter((x) => x > 0).map((v) => s + v)).filter((s) => s <= t);
    const got = answer("sweetAndSavory", xs.join(", "), String(t));
    if (!sums.length) assert.match(got, /^No pair/, `${xs} → ${t}`);
    else {
      const [s, v] = numbersIn(got);
      assert.ok(s < 0 && v > 0 && xs.includes(s) && xs.includes(v) && s + v === Math.max(...sums), `${xs} → ${t}: ${got}`);
    }
  }
});

test("four number sum", () => {
  assert.equal(answer("fourNumberSum", "5, -2, 7, 1, -4, 3, 0", "6"), "The quadruplets: [−4, −2, 5, 7], [−4, 0, 3, 7], [−2, 0, 1, 7], [−2, 0, 3, 5]");
  assert.equal(answer("fourNumberSum", "1, 2, 3, 4", "11"), "No four of the numbers add up to 11.");
  assert.equal(answer("fourNumberSum", "1, 2, 3, 4", "10"), "The quadruplets: [1, 2, 3, 4]");
  assert.throws(() => answer("fourNumberSum", "1, 2, 2, 4", "9"), /different/);
  const r = rng(25);
  for (let k = 0; k < 150; k++) {
    const xs = distinctInts(r, 4 + (k % 5), -9, 9);
    if (xs.length < 4) continue;
    const t = randInts(r, 1, -8, 8)[0];
    const want = subsets([...xs].sort((a, b) => a - b), 4).filter((s) => s.reduce((a, b) => a + b, 0) === t);
    assert.equal(answer("fourNumberSum", xs.join(", "), String(t)), want.length ? `The quadruplets: ${want.map(fmt).join(", ")}` : `No four of the numbers add up to ${num(t)}.`, `${xs} → ${t}`);
  }
});

test("subarray sort", () => {
  assert.equal(answer("subarraySort", "1, 3, 2, 5, 4, 7, 9, 6, 10, 12"), "Sorting a[1..7] sorts the whole array: [1, 7].");
  assert.equal(answer("subarraySort", "1, 2, 2, 5"), w.arrays.subarraySort.sorted);
  assert.equal(answer("subarraySort", "2, 1"), "Sorting a[0..1] sorts the whole array: [0, 1].");
  const r = rng(26);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 6);
    const sorted = [...xs].sort((a, b) => a - b);
    const diff = xs.map((x, i) => x !== sorted[i]);
    const [s, e] = [diff.indexOf(true), diff.lastIndexOf(true)];
    assert.equal(answer("subarraySort", xs.join(", ")), s < 0 ? w.arrays.subarraySort.sorted : `Sorting a[${s}..${e}] sorts the whole array: [${s}, ${e}].`, `${xs}`);
  }
});

test("largest range", () => {
  assert.equal(answer("largestRange", "8, 3, 12, 5, 1, 4, 11, 2, 10, 6"), "The largest range is [1, 6].");
  assert.equal(answer("largestRange", "5"), "The largest range is [5, 5].");
  assert.equal(answer("largestRange", "-1, 0, 0, 1, 5"), "The largest range is [−1, 1].");
  const r = rng(27);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 14), -8, 8);
    const have = new Set(xs);
    const runOf = (x: number) => {
      let n = 1;
      while (have.has(x + n)) n++;
      return n;
    };
    const most = Math.max(...xs.map(runOf));
    const [lo, hi] = numbersIn(answer("largestRange", xs.join(", ")));
    assert.ok(hi - lo + 1 === most && Array.from({ length: most }, (_, i) => lo + i).every((v) => have.has(v)), `${xs}`);
  }
});

test("min rewards", () => {
  assert.equal(answer("minRewards", "6, 2, 9, 11, 4, 1, 7, 3"), "The fewest rewards in all: 14, given as [2, 1, 2, 3, 2, 1, 2, 1].");
  assert.equal(answer("minRewards", "5"), "The fewest rewards in all: 1, given as [1].");
  assert.equal(answer("minRewards", "1, 2, 3"), "The fewest rewards in all: 6, given as [1, 2, 3].");
  assert.throws(() => answer("minRewards", "1, 1"), /different/);
  const r = rng(28);
  for (let k = 0; k < 150; k++) {
    const xs = distinctInts(r, 1 + (k % 12), -20, 20);
    // The slow way: raise anyone who beats a neighbour without more rewards, until nobody needs raising.
    const re = xs.map(() => 1);
    for (let again = true; again; ) {
      again = false;
      for (let i = 0; i < xs.length; i++)
        for (const j of [i - 1, i + 1])
          if (j >= 0 && j < xs.length && xs[i] > xs[j] && re[i] <= re[j]) (re[i] = re[j] + 1), (again = true);
    }
    assert.equal(answer("minRewards", xs.join(", ")), `The fewest rewards in all: ${re.reduce((a, b) => a + b, 0)}, given as ${fmt(re)}.`, `${xs}`);
  }
});

test("zigzag traverse", () => {
  assert.equal(answer("zigzagTraverse", "1, 3, 4; 2, 5, 9; 6, 8, 10; 7, 11, 12"), "In zigzag order: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]");
  assert.equal(answer("zigzagTraverse", "1, 3, 4, 10; 2, 5, 9, 11; 6, 8, 12, 15; 7, 13, 14, 16"), `In zigzag order: ${fmt(Array.from({ length: 16 }, (_, i) => i + 1))}`);
  assert.equal(answer("zigzagTraverse", "1, 2, 3"), "In zigzag order: [1, 2, 3]");
  assert.equal(answer("zigzagTraverse", "1; 2; 3"), "In zigzag order: [1, 2, 3]");
  const r = rng(29);
  for (let k = 0; k < 100; k++) {
    const [R, C] = [1 + (k % 6), 1 + Math.floor(r() * 6)];
    const m = Array.from({ length: R }, () => randInts(r, C, 0, 9));
    // The slow way: diagonal by diagonal, rows going down on even ones and up on odd ones.
    const want: number[] = [];
    for (let d = 0; d < R + C - 1; d++) {
      const rows = Array.from({ length: R }, (_, i) => i).filter((i) => d - i >= 0 && d - i < C);
      for (const i of d % 2 ? rows.reverse() : rows) want.push(m[i][d - i]);
    }
    assert.equal(answer("zigzagTraverse", m.map((row) => row.join(", ")).join("; ")), `In zigzag order: ${fmt(want)}`, `${R}×${C}`);
  }
});

test("longest subarray with sum", () => {
  assert.equal(answer("longestSubarrayWithSum", "1, 2, 1, 0, 3, 2, 0, 0, 1, 4", "3"), "The longest run adding up to 3 is [2, 0, 0, 1]: [5, 8].");
  assert.equal(answer("longestSubarrayWithSum", "5, 6", "4"), "No run adds up to 4, so the answer is [].");
  assert.equal(answer("longestSubarrayWithSum", "2, 0, 0, 3", "0"), "The longest run adding up to 0 is [0, 0]: [1, 2].");
  assert.throws(() => answer("longestSubarrayWithSum", "1, -2", "1"), /too small/);
  const r = rng(30);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 12), 0, 4).map((x) => (r() < 0.3 ? 0 : x));
    const t = randInts(r, 1, 0, 8)[0];
    let best: number[] | null = null;
    for (let s = 0; s < xs.length; s++)
      for (let e = s; e < xs.length; e++)
        if (xs.slice(s, e + 1).reduce((a, b) => a + b, 0) === t && (!best || e - s > best[1] - best[0])) best = [s, e];
    const got = answer("longestSubarrayWithSum", xs.join(", "), String(t));
    assert.equal(got, best ? `The longest run adding up to ${t} is ${fmt(xs.slice(best[0], best[1] + 1))}: [${best[0]}, ${best[1]}].` : `No run adds up to ${t}, so the answer is [].`, `${xs} → ${t}`);
  }
});

test("knight connection", () => {
  assert.equal(answer("knightConnection", "0, 0", "5, 3"), "The fewest turns until they meet: 2.");
  assert.equal(answer("knightConnection", "2, -1", "2, -1"), "The fewest turns until they meet: 0.");
  assert.equal(answer("knightConnection", "(0, 0)", "(1, 1)"), "The fewest turns until they meet: 1.");
  assert.throws(() => answer("knightConnection", "0, 0", "9, 0"), /at most 7/);
  assert.throws(() => answer("knightConnection", "0", "1, 1"), /isn't a point/);
  const r = rng(31);
  // The slow way: a search over a much bigger board.
  const far = (dx: number, dy: number) => {
    const key = (x: number, y: number) => `${x},${y}`;
    const dist = new Map([[key(0, 0), 0]]);
    const queue: [number, number][] = [[0, 0]];
    while (!dist.has(key(dx, dy))) {
      const [x, y] = queue.shift()!;
      for (const [a, b] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
        const [nx, ny] = [x + a, y + b];
        if (Math.abs(nx) <= 20 && Math.abs(ny) <= 20 && !dist.has(key(nx, ny))) dist.set(key(nx, ny), dist.get(key(x, y))! + 1), queue.push([nx, ny]);
      }
    }
    return dist.get(key(dx, dy))!;
  };
  for (let k = 0; k < 120; k++) {
    const [ax, ay] = randInts(r, 2, -5, 5);
    const [dx, dy] = [randInts(r, 1, -7, 7)[0], randInts(r, 1, -4, 4)[0]];
    assert.equal(answer("knightConnection", `${ax}, ${ay}`, `${ax + dx}, ${ay + dy}`), `The fewest turns until they meet: ${Math.ceil(far(dx, dy) / 2)}.`, `${dx}, ${dy}`);
  }
});

test("count squares", () => {
  assert.equal(answer("countSquares", "0, 0; 2, 1; 1, 3; -1, 2; 1, 1; 2, 0; 1, 0"), "The number of squares: 2.");
  assert.equal(answer("countSquares", "0, 0; 1, 0"), "The number of squares: 0.");
  assert.equal(answer("countSquares", "0, 0; 0, 2; 2, 0; 2, 2; 1, 1; 1, 0; 0, 1; 1, 2"), "The number of squares: 3.");
  assert.throws(() => answer("countSquares", "0, 0; 0, 0"), /different/);
  assert.throws(() => answer("countSquares", "0, 0; 20, 0"), /fits/);
  const r = rng(32);
  const d2 = (p: number[], q: number[]) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  for (let k = 0; k < 120; k++) {
    const ps = randPoints(r, 4 + (k % 5), 4);
    const want = subsets(ps, 4).filter((q) => {
      const d = subsets(q, 2).map(([a, b]) => d2(a, b)).sort((a, b) => a - b);
      return d[0] > 0 && d[0] === d[3] && d[4] === d[5] && d[4] === 2 * d[0];
    }).length;
    assert.equal(answer("countSquares", writePoints(ps)), `The number of squares: ${want}.`, writePoints(ps));
  }
});

test("rectangle mania", () => {
  assert.equal(answer("rectangleMania", "0, 0; 0, 2; 3, 0; 3, 2; 1, 2; 1, 0; 3, 3; 1, 3"), "The number of rectangles: 5.");
  assert.equal(answer("rectangleMania", "0, 0; 1, 1; 2, 2"), "The number of rectangles: 0.");
  assert.equal(answer("rectangleMania", "5, 5"), "The number of rectangles: 0.");
  const r = rng(33);
  for (let k = 0; k < 120; k++) {
    const ps = randPoints(r, 4 + (k % 5), 4);
    const want = subsets(ps, 4).filter((q) => {
      const xs = [...new Set(q.map((p) => p[0]))];
      const ys = [...new Set(q.map((p) => p[1]))];
      return xs.length === 2 && ys.length === 2;
    }).length;
    assert.equal(answer("rectangleMania", writePoints(ps)), `The number of rectangles: ${want}.`, writePoints(ps));
  }
});

test("apartment hunting", () => {
  assert.equal(answer("apartmentHunting", "school; gym; ; school store; gym; store", "gym, school, store"), "Block 2 is the best: its farthest walk to a building needed is 1.");
  assert.equal(answer("apartmentHunting", "gym", "gym"), "Block 0 is the best: its farthest walk to a building needed is 0.");
  assert.throws(() => answer("apartmentHunting", "gym; school", "store"), /No block has a store/);
  const r = rng(34);
  const kinds = ["gym", "school", "store"];
  for (let k = 0; k < 150; k++) {
    const blocks = Array.from({ length: 1 + (k % 10) }, () => kinds.filter(() => r() < 0.35));
    const reqs = kinds.filter((x) => blocks.some((b) => b.includes(x)));
    if (!reqs.length) continue;
    const far = blocks.map((_, i) => Math.max(...reqs.map((q) => Math.min(...blocks.flatMap((b, j) => (b.includes(q) ? [Math.abs(i - j)] : []))))));
    const best = far.indexOf(Math.min(...far));
    assert.equal(answer("apartmentHunting", blocks.map((b) => b.join(" ")).join("; "), reqs.join(", ")), `Block ${best} is the best: its farthest walk to a building needed is ${far[best]}.`, JSON.stringify(blocks));
  }
});

test("calendar matching", () => {
  assert.equal(
    answer("calendarMatching", "8:30-9:15, 11:00-12:30, 15:00-16:00", "8:00-17:00", "9:00-10:00, 13:00-14:00, 14:15-15:30", "8:30-18:00", "45"),
    "Both are free for 45 minutes or more at 10:00–11:00, 16:00–17:00.",
  );
  assert.equal(answer("calendarMatching", "", "9:00-12:00", "", "10:00-17:00", "30"), "Both are free for 30 minutes or more at 10:00–12:00.");
  assert.equal(answer("calendarMatching", "9:00-9:40", "9:00-10:00", "", "9:30-11:00", "30"), "There is no time when both are free for 30 minutes.");
  assert.throws(() => answer("calendarMatching", "10:00-9:00", "9:00-17:00", "", "9:00-17:00", "30"), /isn't a time span/);
  assert.throws(() => answer("calendarMatching", "", "9:00-17:00, 18:00-19:00", "", "9:00-17:00", "30"), /isn't a time span|At most/);
  const r = rng(35);
  const at = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  const cal = () => {
    const out: number[][] = [];
    for (let t = 420 + Math.floor(r() * 4) * 15; out.length < 4 && t < 1200; ) {
      const len = 15 + Math.floor(r() * 6) * 15;
      out.push([t, t + len]);
      t += len + Math.floor(r() * 5) * 15;
    }
    return out.slice(0, 1 + Math.floor(r() * out.length));
  };
  const day = () => {
    const a = 360 + Math.floor(r() * 12) * 15;
    return [a, a + 240 + Math.floor(r() * 24) * 15];
  };
  for (let k = 0; k < 120; k++) {
    const [m1, b1, m2, b2] = [cal(), day(), cal(), day()];
    const len = 15 + Math.floor(r() * 6) * 15;
    // The slow way: minute by minute, who is free.
    const free = (t: number) => [[m1, b1], [m2, b2]].every(([m, b]) => t >= (b as number[])[0] && t < (b as number[])[1] && (m as number[][]).every(([s, e]) => t < s || t >= e));
    const slots: string[] = [];
    for (let t = 0; t < 1440; ) {
      if (!free(t)) {
        t++;
        continue;
      }
      let e = t;
      while (e < 1440 && free(e)) e++;
      if (e - t >= len) slots.push(`${at(t)}–${at(e)}`);
      t = e;
    }
    const write = (m: number[][]) => m.map(([s, e]) => `${at(s)}-${at(e)}`).join(", ");
    const got = answer("calendarMatching", write(m1), write([b1]), write(m2), write([b2]), String(len));
    assert.equal(got, slots.length ? `Both are free for ${len} minutes or more at ${slots.join(", ")}.` : `There is no time when both are free for ${len} minutes.`, `${write(m1)} | ${write([b1])} | ${write(m2)} | ${write([b2])}`);
  }
});

test("waterfall streams", () => {
  const grid = "0 0 0 0 0 0 0; 0 0 0 1 1 0 0; 0 0 0 0 0 0 0; 0 1 1 1 0 0 0; 1 0 0 0 0 1 0; 0 0 0 0 0 0 0";
  assert.equal(answer("waterfallStreams", grid, "3"), "Percent of the water reaching each column of the bottom row: [0, 0, 0, 0, 50, 0, 25]");
  assert.equal(answer("waterfallStreams", "0 0 0; 0 0 0", "1"), "Percent of the water reaching each column of the bottom row: [0, 100, 0]");
  assert.equal(answer("waterfallStreams", "0 0 0; 1 1 1; 0 0 0", "1"), "Percent of the water reaching each column of the bottom row: [0, 0, 0]");
  assert.throws(() => answer("waterfallStreams", "0 2; 0 0", "0"), /too big/);
  assert.throws(() => answer("waterfallStreams", "0 0; 0 0", "2"), /from 0 to 1/);
  const r = rng(36);
  for (let k = 0; k < 150; k++) {
    const [R, C] = [2 + (k % 6), 2 + Math.floor(r() * 6)];
    const g = Array.from({ length: R }, (_, i) => Array.from({ length: C }, () => (i > 0 && r() < 0.3 ? 1 : 0)));
    const src = Math.floor(r() * C);
    // The slow way: follow each stream down on its own.
    const bottom = Array(C).fill(0);
    const flow = (i: number, j: number, v: number) => {
      if (i === R - 1) return void (bottom[j] += v);
      if (!g[i + 1][j]) return flow(i + 1, j, v);
      for (const dir of [-1, 1])
        for (let x = j + dir; x >= 0 && x < C && !g[i][x]; x += dir)
          if (!g[i + 1][x]) {
            flow(i + 1, x, v / 2);
            break;
          }
    };
    flow(0, src, 1);
    const want = bottom.map((v) => Math.round(v * 1e6) / 1e4);
    assert.equal(answer("waterfallStreams", g.map((row) => row.join(" ")).join("; "), String(src)), `Percent of the water reaching each column of the bottom row: ${fmt(want)}`, `${JSON.stringify(g)} @ ${src}`);
  }
});

test("minimum area rectangle", () => {
  assert.equal(answer("minimumAreaRectangle", "0, 0; 4, 0; 4, 3; 0, 3; 1, 1; 1, 3; 4, 1; 2, 2"), "The smallest rectangle has an area of 6.");
  assert.equal(answer("minimumAreaRectangle", "0, 0; 1, 1; 2, 0"), w.arrays.minimumAreaRectangle.none);
  assert.equal(answer("minimumAreaRectangle", "3, 3"), w.arrays.minimumAreaRectangle.none);
  assert.equal(answer("minimumAreaRectangle", "-1, -1; -1, 1; 2, -1; 2, 1"), "The smallest rectangle has an area of 6.");
  const r = rng(37);
  for (let k = 0; k < 120; k++) {
    const ps = randPoints(r, 4 + (k % 5), 5);
    const areas = subsets(ps, 4).flatMap((q) => {
      const xs = [...new Set(q.map((p) => p[0]))];
      const ys = [...new Set(q.map((p) => p[1]))];
      return xs.length === 2 && ys.length === 2 ? [Math.abs((xs[0] - xs[1]) * (ys[0] - ys[1]))] : [];
    });
    assert.equal(answer("minimumAreaRectangle", writePoints(ps)), areas.length ? `The smallest rectangle has an area of ${Math.min(...areas)}.` : w.arrays.minimumAreaRectangle.none, writePoints(ps));
  }
});

test("line through points", () => {
  assert.equal(answer("lineThroughPoints", "0, 0; 1, 1; 2, 2; 3, 1; 1, 3; 4, 0; 2, 4"), "The most points on one straight line: 4.");
  assert.equal(answer("lineThroughPoints", "5, 5"), "The most points on one straight line: 1.");
  assert.equal(answer("lineThroughPoints", "1, 0; 1, 5; 1, -3; 2, 2"), "The most points on one straight line: 3.");
  const r = rng(38);
  for (let k = 0; k < 120; k++) {
    const ps = randPoints(r, 2 + (k % 9), 5);
    let best = 1;
    for (const [p, q] of subsets(ps, 2))
      best = Math.max(best, ps.filter((s) => (q[0] - p[0]) * (s[1] - p[1]) === (q[1] - p[1]) * (s[0] - p[0])).length);
    assert.equal(answer("lineThroughPoints", writePoints(ps)), `The most points on one straight line: ${best}.`, writePoints(ps));
  }
});

test("largest park", () => {
  assert.equal(answer("largestPark", "0 0 1 0 0 0; 0 0 0 0 1 0; 1 0 0 0 0 0; 0 0 0 1 0 0; 0 1 0 0 0 0"), "The largest park has an area of 6.");
  assert.equal(answer("largestPark", "true, false; false, false"), "The largest park has an area of 2.");
  assert.equal(answer("largestPark", "1 1; 1 1"), "The largest park has an area of 0.");
  assert.throws(() => answer("largestPark", "0 2"), /too big/);
  const r = rng(39);
  for (let k = 0; k < 120; k++) {
    const [R, C] = [1 + (k % 6), 1 + Math.floor(r() * 7)];
    const g = Array.from({ length: R }, () => Array.from({ length: C }, () => (r() < 0.3 ? 1 : 0)));
    let best = 0;
    for (let a = 0; a < R; a++)
      for (let b = a; b < R; b++)
        for (let c = 0; c < C; c++)
          for (let d = c; d < C; d++)
            if (g.slice(a, b + 1).every((row) => row.slice(c, d + 1).every((v) => !v))) best = Math.max(best, (b - a + 1) * (d - c + 1));
    assert.equal(answer("largestPark", g.map((row) => row.join(" ")).join("; ")), `The largest park has an area of ${best}.`, JSON.stringify(g));
  }
});
