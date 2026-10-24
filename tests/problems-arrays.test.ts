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
