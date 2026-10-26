// The dynamic programming problems give the right answers: on their examples, on cases picked to catch a slip (nothing
// possible, one entry, ties, negatives), and on random inputs checked against working it out the slow way (every
// subset, every split, every throw); bad inputs say why.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { problemTrace, type ProblemId } from "../src/math/problems/index.ts";
import { rng } from "../src/math/random.ts";

const w = en.live.problems;
/** The answer, after checking that every frame draws something and says nothing unfilled or broken. */
const answer = (id: ProblemId, ...input: string[]) => {
  const t = problemTrace(id, input, w);
  for (const f of t.frames) {
    assert.ok(f.note && (f.cells || f.rows?.length || f.mat || f.graph), `${id} ${input}: ${f.note}`);
    assert.doesNotMatch(JSON.stringify(f), /NaN|undefined|Infinity|\{\w+\}/, `${id} ${input}`);
  }
  return t.answer;
};
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const num = (s: string) => Number(s.replace(/−/g, "-"));
/** The numbers in a list written as "[1, −2, 3]". */
const listOf = (s: string) => (s.trim() === "" ? [] : s.split(",").map((x) => num(x.trim())));
const subsets = <T>(xs: readonly T[]): T[][] => xs.reduce<T[][]>((acc, x) => acc.concat(acc.map((s) => [...s, x])), [[]]);
const isSubseq = <T>(sub: readonly T[], of: readonly T[]) => {
  let j = 0;
  for (const x of of) if (j < sub.length && x === sub[j]) j++;
  return j === sub.length;
};
const word = (r: () => number, n: number, abc: string) => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join("");

test("max subset sum no adjacent", () => {
  assert.equal(answer("maxSubsetSumNoAdjacent", "4, 9, 6, 2, 8, 7, 3"), "The largest sum is 21 = 4 + 6 + 8 + 3.");
  assert.equal(answer("maxSubsetSumNoAdjacent", "7"), "The largest sum is 7 = 7.");
  assert.equal(answer("maxSubsetSumNoAdjacent", "3, 8"), "The largest sum is 8 = 8.");
  const r = rng(11);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 10), 1, 20);
    let best = 0;
    for (const s of subsets(xs.map((_, i) => i))) if (s.every((i, t) => t === 0 || i - s[t - 1] > 1)) best = Math.max(best, s.reduce((a, i) => a + xs[i], 0));
    const m = answer("maxSubsetSumNoAdjacent", xs.join(", ")).match(/is (\d+) = (.*)\.$/)!;
    assert.equal(Number(m[1]), best, `${xs}`);
    assert.equal(m[2].split(" + ").map(Number).reduce((a, b) => a + b, 0), best, `${xs}: the picks add up`);
  }
  assert.throws(() => answer("maxSubsetSumNoAdjacent", "3, 0"), /too small/);
});

/** Coin problems the slow way: every way to use the coins, by recursion. */
function change(n: number, coins: number[]): { ways: number; fewest: number } {
  let ways = 0;
  let fewest = Infinity;
  const go = (left: number, from: number, used: number) => {
    if (left === 0) return void (ways++, (fewest = Math.min(fewest, used)));
    for (let k = from; k < coins.length; k++) if (coins[k] <= left) go(left - coins[k], k, used + 1);
  };
  go(n, 0, 0);
  return { ways, fewest };
}

test("number of ways to make change", () => {
  assert.equal(answer("numberOfWaysToMakeChange", "10", "2, 3, 5"), "Ways to make 10: 4.");
  assert.equal(answer("numberOfWaysToMakeChange", "0", "4"), "Ways to make 0: 1.");
  assert.equal(answer("numberOfWaysToMakeChange", "7", "2, 4"), "Ways to make 7: 0.");
  assert.equal(answer("numberOfWaysToMakeChange", "6", "1, 1, 2"), "Ways to make 6: 4.");
  const r = rng(12);
  for (let k = 0; k < 150; k++) {
    const coins = [...new Set(randInts(r, 1 + (k % 4), 1, 9))];
    const n = randInts(r, 1, 0, 11)[0];
    assert.equal(answer("numberOfWaysToMakeChange", String(n), coins.join(", ")), `Ways to make ${n}: ${change(n, coins).ways}.`, `${n} / ${coins}`);
  }
  assert.throws(() => answer("numberOfWaysToMakeChange", "12", "1"), /from 0 to 11/);
  assert.throws(() => answer("numberOfWaysToMakeChange", "5", "0, 1"), /too small/);
});

test("min number of coins for change", () => {
  assert.equal(answer("minNumberOfCoinsForChange", "11", "1, 5, 7"), "The fewest coins for 11: 3.");
  assert.equal(answer("minNumberOfCoinsForChange", "0", "3"), "The fewest coins for 0: 0.");
  assert.equal(answer("minNumberOfCoinsForChange", "7", "2, 4"), "7 can't be made from these coins: −1.");
  const r = rng(13);
  for (let k = 0; k < 150; k++) {
    const coins = [...new Set(randInts(r, 1 + (k % 4), 1, 9))];
    const n = randInts(r, 1, 0, 11)[0];
    const { fewest } = change(n, coins);
    const want = Number.isFinite(fewest) ? `The fewest coins for ${n}: ${fewest}.` : `${n} can't be made from these coins: −1.`;
    assert.equal(answer("minNumberOfCoinsForChange", String(n), coins.join(", ")), want, `${n} / ${coins}`);
  }
});

test("levenshtein distance", () => {
  assert.equal(answer("levenshteinDistance", "stone", "tones"), "The edit distance from “stone” to “tones” is 2.");
  assert.equal(answer("levenshteinDistance", "", "abc"), "The edit distance from “” to “abc” is 3.");
  assert.equal(answer("levenshteinDistance", "same", "same"), "The edit distance from “same” to “same” is 0.");
  // The slow way: plain recursion over the three edits.
  const slow = (a: string, b: string): number =>
    !a.length ? b.length : !b.length ? a.length : a[0] === b[0] ? slow(a.slice(1), b.slice(1)) : 1 + Math.min(slow(a.slice(1), b), slow(a, b.slice(1)), slow(a.slice(1), b.slice(1)));
  const r = rng(14);
  for (let k = 0; k < 120; k++) {
    const [a, b] = [word(r, k % 5, "abc"), word(r, (k * 3) % 6, "abc")];
    assert.equal(answer("levenshteinDistance", a, b), `The edit distance from “${a}” to “${b}” is ${slow(a, b)}.`);
  }
  assert.throws(() => answer("levenshteinDistance", "abcdefghi", "a"), /At most 8/);
});

test("number of ways to traverse graph", () => {
  assert.equal(answer("numberOfWaysToTraverseGraph", "5", "4"), "Ways from the top-left to the bottom-right: 35.");
  assert.equal(answer("numberOfWaysToTraverseGraph", "1", "1"), "Ways from the top-left to the bottom-right: 1.");
  assert.equal(answer("numberOfWaysToTraverseGraph", "1", "6"), "Ways from the top-left to the bottom-right: 1.");
  const choose = (n: number, k: number): number => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);
  for (let W = 1; W <= 10; W++)
    for (let H = 1; H <= 8; H++) assert.equal(answer("numberOfWaysToTraverseGraph", String(W), String(H)), `Ways from the top-left to the bottom-right: ${choose(W + H - 2, H - 1)}.`);
  assert.throws(() => answer("numberOfWaysToTraverseGraph", "0", "3"), /from 1 to 10/);
});

test("max sum increasing subsequence", () => {
  assert.equal(answer("maxSumIncreasingSubsequence", "4, 9, -2, 5, 6, 3, 8, 1"), "The largest sum is 23: [4, 5, 6, 8].");
  assert.equal(answer("maxSumIncreasingSubsequence", "-5, -2, -9"), "The largest sum is −2: [−2].");
  assert.equal(answer("maxSumIncreasingSubsequence", "5, 5, 5"), "The largest sum is 5: [5].");
  const r = rng(15);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 9), -8, 15);
    let best = -Infinity;
    for (const s of subsets(xs)) if (s.length && s.every((x, i) => i === 0 || x > s[i - 1])) best = Math.max(best, s.reduce((a, b) => a + b, 0));
    const m = answer("maxSumIncreasingSubsequence", xs.join(", ")).match(/is (−?\d+): \[(.*)\]\.$/)!;
    const seq = listOf(m[2]);
    assert.equal(num(m[1]), best, `${xs}`);
    assert.equal(seq.reduce((a, b) => a + b, 0), best, `${xs}: the subsequence adds up`);
    assert.ok(isSubseq(seq, xs) && seq.every((x, i) => i === 0 || x > seq[i - 1]), `${xs}: ${seq}`);
  }
});

test("longest common subsequence", () => {
  assert.equal(answer("longestCommonSubsequence", "canoe", "ocean"), "A longest common subsequence: [c, a, n] (length 3).");
  assert.equal(answer("longestCommonSubsequence", "abc", "xyz"), w.dp.longestCommonSubsequence.none);
  assert.equal(answer("longestCommonSubsequence", "", "abc"), w.dp.longestCommonSubsequence.none);
  assert.equal(answer("longestCommonSubsequence", "abcd", "abcd"), "A longest common subsequence: [a, b, c, d] (length 4).");
  const r = rng(16);
  for (let k = 0; k < 150; k++) {
    const [a, b] = [word(r, 1 + (k % 7), "abcd"), word(r, 1 + ((k * 5) % 8), "abcd")];
    let best = 0;
    for (const s of subsets([...a])) if (isSubseq(s, [...b])) best = Math.max(best, s.length);
    const got = answer("longestCommonSubsequence", a, b);
    if (!best) assert.equal(got, w.dp.longestCommonSubsequence.none, `${a} / ${b}`);
    else {
      const letters = got.match(/\[(.*)\]/)![1].split(", ");
      assert.equal(letters.length, best, `${a} / ${b}: ${got}`);
      assert.ok(isSubseq(letters, [...a]) && isSubseq(letters, [...b]), `${a} / ${b}: ${got}`);
    }
  }
});

test("min number of jumps", () => {
  assert.equal(answer("minNumberOfJumps", "2, 3, 1, 1, 2, 4, 1, 1, 1, 2"), "The fewest jumps: 4.");
  assert.equal(answer("minNumberOfJumps", "5"), "The fewest jumps: 0.");
  assert.equal(answer("minNumberOfJumps", "1, 1"), "The fewest jumps: 1.");
  assert.equal(answer("minNumberOfJumps", "9, 1, 1, 1"), "The fewest jumps: 1.");
  const r = rng(17);
  for (let k = 0; k < 200; k++) {
    const xs = randInts(r, 1 + (k % 14), 1, 4);
    // The slow way: breadth-first over the indices.
    const dist = xs.map(() => Infinity);
    dist[0] = 0;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j <= Math.min(xs.length - 1, i + xs[i]); j++) dist[j] = Math.min(dist[j], dist[i] + 1);
    assert.equal(answer("minNumberOfJumps", xs.join(", ")), `The fewest jumps: ${dist[xs.length - 1]}.`, `${xs}`);
  }
  assert.throws(() => answer("minNumberOfJumps", "2, 0, 1"), /too small/);
});

test("water area", () => {
  assert.equal(answer("waterArea", "0, 4, 0, 2, 1, 5, 0, 1, 3, 0, 2"), "The water trapped: 16.");
  assert.equal(answer("waterArea", "3"), "The water trapped: 0.");
  assert.equal(answer("waterArea", "1, 2, 3, 2, 1"), "The water trapped: 0.");
  assert.equal(answer("waterArea", "0, 0, 0"), "The water trapped: 0.");
  const r = rng(18);
  for (let k = 0; k < 150; k++) {
    const hs = randInts(r, 1 + (k % 12), 0, 8);
    // The slow way, a level at a time: on each level, the gaps between the first and last pillar that reach it.
    let total = 0;
    for (let lvl = 1; lvl <= 8; lvl++) {
      const at = hs.flatMap((h, i) => (h >= lvl ? [i] : []));
      if (at.length >= 2) total += at[at.length - 1] - at[0] + 1 - at.length;
    }
    assert.equal(answer("waterArea", hs.join(", ")), `The water trapped: ${total}.`, `${hs}`);
  }
  assert.throws(() => answer("waterArea", "1, 9"), /too big/);
});

test("knapsack problem", () => {
  assert.equal(answer("knapsackProblem", "[5, 2], [6, 3], [9, 4], [4, 1]", "6"), "The most value is 15, with items [0, 1, 3].");
  assert.equal(answer("knapsackProblem", "[5, 4]", "3"), w.dp.knapsackProblem.nothing);
  assert.equal(answer("knapsackProblem", "5 2; 3 1", "3"), "The most value is 8, with items [0, 1].");
  const r = rng(19);
  for (let k = 0; k < 150; k++) {
    const items = Array.from({ length: 1 + (k % 6) }, () => [randInts(r, 1, 0, 12)[0], randInts(r, 1, 1, 6)[0]]);
    const C = randInts(r, 1, 0, 10)[0];
    let best = 0;
    for (const s of subsets(items.map((_, i) => i))) {
      const [v, wt] = s.reduce(([a, b], i) => [a + items[i][0], b + items[i][1]], [0, 0]);
      if (wt <= C) best = Math.max(best, v);
    }
    const got = answer("knapsackProblem", items.map((x) => `[${x.join(", ")}]`).join(", "), String(C));
    const m = got.match(/is (\d+), with items \[(.*)\]\.$/);
    if (!m) {
      assert.equal(best, 0, `${JSON.stringify(items)} / ${C}: ${got}`);
      continue;
    }
    const chosen = listOf(m[2]);
    assert.equal(Number(m[1]), best, `${JSON.stringify(items)} / ${C}`);
    assert.equal(chosen.reduce((a, i) => a + items[i][0], 0), best);
    assert.ok(chosen.reduce((a, i) => a + items[i][1], 0) <= C);
  }
  assert.throws(() => answer("knapsackProblem", "[5, 0]", "3"), /too small/);
  assert.throws(() => answer("knapsackProblem", "[5, 2, 1]", "3"), /doesn't fit/);
});

test("disk stacking", () => {
  assert.equal(answer("diskStacking", "[3, 3, 2], [1, 2, 1], [4, 5, 3], [2, 2, 6], [5, 6, 4], [3, 4, 7]"), "The tallest stack is 13 high; from the top down: [2, 2, 6], [3, 4, 7].");
  assert.equal(answer("diskStacking", "[2, 2, 2]"), "The tallest stack is 2 high; from the top down: [2, 2, 2].");
  assert.equal(answer("diskStacking", "[2, 2, 2], [2, 3, 3]"), "The tallest stack is 3 high; from the top down: [2, 3, 3].");
  const r = rng(20);
  for (let k = 0; k < 120; k++) {
    const disks = Array.from({ length: 1 + (k % 7) }, () => randInts(r, 3, 1, 5));
    let best = 0;
    const fits = (top: number[], bottom: number[]) => top.every((v, t) => v < bottom[t]);
    for (const s of subsets(disks)) {
      const sorted = [...s].sort((a, b) => a[2] - b[2]);
      if (sorted.every((d, i) => i === 0 || fits(sorted[i - 1], d))) best = Math.max(best, s.reduce((a, d) => a + d[2], 0));
    }
    const got = answer("diskStacking", disks.map((d) => `[${d.join(", ")}]`).join(", "));
    const m = got.match(/is (\d+) high; from the top down: (.*)\.$/)!;
    const stack = [...m[2].matchAll(/\[([^\]]*)\]/g)].map((x) => listOf(x[1]));
    assert.equal(Number(m[1]), best, `${JSON.stringify(disks)}`);
    assert.equal(stack.reduce((a, d) => a + d[2], 0), best);
    assert.ok(stack.every((d, i) => i === 0 || fits(stack[i - 1], d)), got);
  }
  assert.throws(() => answer("diskStacking", "[1, 2]"), /doesn't fit/);
});

test("numbers in pi", () => {
  assert.equal(answer("numbersInPi", "2718281828", "27, 2718, 18, 28, 1828, 8, 182"), "Spaces needed: 2 — 27 1828 1828");
  assert.equal(answer("numbersInPi", "123", "123, 1"), "Spaces needed: 0 — 123");
  assert.equal(answer("numbersInPi", "123", "12, 4"), w.dp.numbersInPi.never);
  const r = rng(21);
  for (let k = 0; k < 150; k++) {
    const s = word(r, 1 + (k % 9), "123");
    const favs = [...new Set(Array.from({ length: 1 + (k % 6) }, () => word(r, 1 + Math.floor(r() * 3), "123")))];
    const slow = (t: string): number => (t === "" ? 0 : Math.min(Infinity, ...favs.filter((f) => t.startsWith(f)).map((f) => 1 + slow(t.slice(f.length)))));
    const best = slow(s);
    const got = answer("numbersInPi", s, favs.join(", "));
    if (!Number.isFinite(best)) assert.equal(got, w.dp.numbersInPi.never, `${s} / ${favs}`);
    else {
      const m = got.match(/needed: (\d+) — (.*)$/)!;
      assert.equal(Number(m[1]), best - 1, `${s} / ${favs}`);
      const pieces = m[2].split(" ");
      assert.equal(pieces.join(""), s);
      assert.ok(pieces.every((p) => favs.includes(p)), got);
    }
  }
  assert.throws(() => answer("numbersInPi", "31a4", "3"), /doesn't fit/);
});

test("maximum sum submatrix", () => {
  assert.equal(answer("maximumSumSubmatrix", "2, -1, 3, 0; -4, 5, 1, -2; 3, 2, -6, 4; 1, 0, 2, 3", "2"), "The largest 2×2 sum is 8.");
  assert.equal(answer("maximumSumSubmatrix", "-3, -1; -2, -5", "1"), "The largest 1×1 sum is −1.");
  assert.equal(answer("maximumSumSubmatrix", "1, 2; 3, 4", "2"), "The largest 2×2 sum is 10.");
  const r = rng(22);
  for (let k = 0; k < 120; k++) {
    const [R, C] = [1 + (k % 6), 1 + ((k * 7) % 6)];
    const m = Array.from({ length: R }, () => randInts(r, C, -9, 9));
    const s = 1 + Math.floor(r() * Math.min(R, C));
    let best = -Infinity;
    for (let i = 0; i + s <= R; i++)
      for (let j = 0; j + s <= C; j++) {
        let t = 0;
        for (let a = i; a < i + s; a++) for (let b = j; b < j + s; b++) t += m[a][b];
        best = Math.max(best, t);
      }
    assert.equal(answer("maximumSumSubmatrix", m.map((x) => x.join(", ")).join("; "), String(s)), `The largest ${s}×${s} sum is ${best < 0 ? `−${-best}` : best}.`);
  }
  assert.throws(() => answer("maximumSumSubmatrix", "1, 2; 3, 4", "3"), /from 1 to 2/);
});

test("maximize expression", () => {
  assert.equal(answer("maximizeExpression", "3, 6, 1, -3, 2, 7"), "The largest a[i] − a[j] + a[k] − a[l] is 4.");
  assert.equal(answer("maximizeExpression", "1, 2, 3"), w.dp.maximizeExpression.answerFew);
  assert.equal(answer("maximizeExpression", "1, 2, 3, 4"), "The largest a[i] − a[j] + a[k] − a[l] is −2.");
  const r = rng(23);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 4 + (k % 9), -10, 10);
    let best = -Infinity;
    for (let i = 0; i < xs.length; i++)
      for (let j = i + 1; j < xs.length; j++)
        for (let a = j + 1; a < xs.length; a++) for (let b = a + 1; b < xs.length; b++) best = Math.max(best, xs[i] - xs[j] + xs[a] - xs[b]);
    assert.equal(answer("maximizeExpression", xs.join(", ")), `The largest a[i] − a[j] + a[k] − a[l] is ${best < 0 ? `−${-best}` : best}.`, `${xs}`);
  }
});

test("dice throws", () => {
  assert.equal(answer("diceThrows", "3", "4", "8"), "Ways to throw 8 (dice: 3, sides: 4): 12.");
  assert.equal(answer("diceThrows", "2", "6", "1"), "Ways to throw 1 (dice: 2, sides: 6): 0.");
  assert.equal(answer("diceThrows", "1", "6", "6"), "Ways to throw 6 (dice: 1, sides: 6): 1.");
  assert.equal(answer("diceThrows", "4", "2", "3"), "Ways to throw 3 (dice: 4, sides: 2): 0.");
  const r = rng(24);
  for (let k = 0; k < 120; k++) {
    const [D, S, T] = [1 + Math.floor(r() * 4), 1 + Math.floor(r() * 6), 1 + Math.floor(r() * 12)];
    // Every throw, one die at a time.
    let sums = [0];
    for (let d = 0; d < D; d++) sums = sums.flatMap((x) => Array.from({ length: S }, (_, f) => x + f + 1));
    const ways = sums.filter((x) => x === T).length;
    assert.equal(answer("diceThrows", String(D), String(S), String(T)), `Ways to throw ${T} (dice: ${D}, sides: ${S}): ${ways}.`);
  }
  assert.throws(() => answer("diceThrows", "7", "6", "8"), /from 1 to 6/);
});

test("juice bottling", () => {
  assert.equal(answer("juiceBottling", "0, 1, 3, 2, 6, 7, 8"), "Bottle sizes [2, 2, 2] earn 9.");
  assert.equal(answer("juiceBottling", "0, 5"), "Bottle sizes [1] earn 5.");
  assert.equal(answer("juiceBottling", "0, 1, 1, 10"), "Bottle sizes [3] earn 10.");
  const r = rng(25);
  for (let k = 0; k < 150; k++) {
    const prices = [0, ...randInts(r, 1 + (k % 10), 0, 15)];
    const slow = (n: number): number => (n === 0 ? 0 : Math.max(...Array.from({ length: n }, (_, s) => prices[s + 1] + slow(n - s - 1))));
    const m = answer("juiceBottling", prices.join(", ")).match(/\[(.*)\] earn (\d+)\.$/)!;
    const sizes = listOf(m[1]);
    assert.equal(Number(m[2]), slow(prices.length - 1), `${prices}`);
    assert.equal(sizes.reduce((a, b) => a + b, 0), prices.length - 1);
    assert.equal(sizes.reduce((a, s) => a + prices[s], 0), Number(m[2]));
    assert.deepEqual(sizes, [...sizes].sort((a, b) => a - b));
  }
  assert.throws(() => answer("juiceBottling", "1, 2, 3"), /must be 0/);
  assert.throws(() => answer("juiceBottling", "0"), /At least 2/);
});

test("max profit with k transactions", () => {
  assert.equal(answer("maxProfitWithKTransactions", "6, 2, 9, 4, 3, 8, 1, 5", "2"), "The most profit from at most k = 2 transactions: 12.");
  assert.equal(answer("maxProfitWithKTransactions", "9, 7, 4, 1", "2"), "The most profit from at most k = 2 transactions: 0.");
  assert.equal(answer("maxProfitWithKTransactions", "5", "1"), "The most profit from at most k = 1 transactions: 0.");
  assert.equal(answer("maxProfitWithKTransactions", "1, 5, 2, 8", "3"), "The most profit from at most k = 3 transactions: 10.");
  const r = rng(26);
  for (let k = 0; k < 150; k++) {
    const p = randInts(r, 1 + (k % 10), 0, 12);
    const K = 1 + Math.floor(r() * 4);
    // Every choice on every day: rest, buy (if not holding) or sell (if holding).
    const slow = (d: number, left: number, held: number | null): number => {
      if (d === p.length) return 0;
      let best = slow(d + 1, left, held);
      if (held === null && left > 0) best = Math.max(best, slow(d + 1, left, p[d]));
      if (held !== null) best = Math.max(best, p[d] - held + slow(d + 1, left - 1, null));
      return best;
    };
    assert.equal(answer("maxProfitWithKTransactions", p.join(", "), String(K)), `The most profit from at most k = ${K} transactions: ${slow(0, K, null)}.`, `${p} / ${K}`);
  }
});

test("palindrome partitioning min cuts", () => {
  assert.equal(answer("palindromePartitioningMinCuts", "noonabbad"), "The fewest cuts: 2 — noon | abba | d.");
  assert.equal(answer("palindromePartitioningMinCuts", "racecar"), "The fewest cuts: 0 — racecar.");
  assert.equal(answer("palindromePartitioningMinCuts", "abc"), "The fewest cuts: 2 — a | b | c.");
  assert.equal(answer("palindromePartitioningMinCuts", "x"), "The fewest cuts: 0 — x.");
  const r = rng(27);
  const isPal = (t: string) => t === [...t].reverse().join("");
  for (let k = 0; k < 150; k++) {
    const s = word(r, 1 + (k % 9), "ab");
    const slow = (t: string): number => (isPal(t) ? 0 : Math.min(...Array.from({ length: t.length - 1 }, (_, i) => i + 1).filter((i) => isPal(t.slice(0, i))).map((i) => 1 + slow(t.slice(i)))));
    const m = answer("palindromePartitioningMinCuts", s).match(/cuts: (\d+) — (.*)\.$/)!;
    const pieces = m[2].split(" | ");
    assert.equal(Number(m[1]), slow(s), s);
    assert.equal(pieces.length, Number(m[1]) + 1);
    assert.ok(pieces.join("") === s && pieces.every(isPal), m[2]);
  }
  assert.throws(() => answer("palindromePartitioningMinCuts", "abcdefghij"), /At most 9/);
});

test("longest increasing subsequence", () => {
  assert.equal(answer("longestIncreasingSubsequence", "5, 2, 8, 6, 3, 6, 9, 5"), "A longest increasing subsequence: [2, 3, 6, 9].");
  assert.equal(answer("longestIncreasingSubsequence", "4, 4, 4"), "A longest increasing subsequence: [4].");
  assert.equal(answer("longestIncreasingSubsequence", "-1, -3, 0"), "A longest increasing subsequence: [−3, 0].");
  const r = rng(28);
  for (let k = 0; k < 150; k++) {
    const xs = randInts(r, 1 + (k % 12), -5, 9);
    let best = 0;
    for (const s of subsets(xs)) if (s.every((x, i) => i === 0 || x > s[i - 1])) best = Math.max(best, s.length);
    const seq = listOf(answer("longestIncreasingSubsequence", xs.join(", ")).match(/\[(.*)\]/)![1]);
    assert.equal(seq.length, best, `${xs}`);
    assert.ok(isSubseq(seq, xs) && seq.every((x, i) => i === 0 || x > seq[i - 1]), `${xs}: ${seq}`);
  }
});

test("longest string chain", () => {
  assert.equal(answer("longestStringChain", "strap, a, tap, at, trap, ta, pat, tra"), "The longest chain: “strap” → “trap” → “tap” → “ta” → “a”.");
  assert.equal(answer("longestStringChain", "abc, xy, q"), w.dp.longestStringChain.none);
  assert.equal(answer("longestStringChain", "ab, b"), "The longest chain: “ab” → “b”.");
  const r = rng(29);
  for (let k = 0; k < 120; k++) {
    const list = [...new Set(Array.from({ length: 2 + (k % 8) }, () => word(r, 1 + Math.floor(r() * 4), "ab")))];
    const drops = (x: string) => [...x].map((_, i) => x.slice(0, i) + x.slice(i + 1));
    const slow = (x: string): number => 1 + Math.max(0, ...drops(x).filter((y) => list.includes(y)).map(slow));
    const best = Math.max(...list.map(slow));
    const got = answer("longestStringChain", list.join(", "));
    if (best < 2) assert.equal(got, w.dp.longestStringChain.none, `${list}`);
    else {
      const chain = got.match(/: (.*)\.$/)![1].split(" → ").map((x) => x.slice(1, -1));
      assert.equal(chain.length, best, `${list}: ${got}`);
      assert.ok(chain.every((x, i) => list.includes(x) && (i === 0 || drops(chain[i - 1]).includes(x))), got);
    }
  }
});

test("square of zeroes", () => {
  assert.equal(answer("squareOfZeroes", "1, 1, 1, 0, 1; 0, 0, 0, 0, 1; 0, 1, 0, 0, 1; 0, 0, 0, 1, 1; 1, 0, 1, 1, 0"), "Yes: the square from (1, 0) to (3, 2) has a border of zeros.");
  assert.equal(answer("squareOfZeroes", "0"), w.dp.squareOfZeroes.answerNo);
  assert.equal(answer("squareOfZeroes", "0, 1; 0, 0"), w.dp.squareOfZeroes.answerNo);
  assert.equal(answer("squareOfZeroes", "0, 0; 0, 0"), "Yes: the square from (0, 0) to (1, 1) has a border of zeros.");
  const r = rng(30);
  for (let k = 0; k < 150; k++) {
    const n = 1 + (k % 6);
    const m = Array.from({ length: n }, () => Array.from({ length: n }, () => (r() < 0.3 ? 1 : 0)));
    let some = false;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let s = 2; i + s <= n && j + s <= n; s++) {
          let ok = true;
          for (let t = 0; t < s; t++) if (m[i][j + t] || m[i + s - 1][j + t] || m[i + t][j] || m[i + t][j + s - 1]) ok = false;
          if (ok) some = true;
        }
    const got = answer("squareOfZeroes", m.map((x) => x.join(", ")).join("; "));
    assert.equal(got.startsWith("Yes"), some, `${JSON.stringify(m)}: ${got}`);
  }
  assert.throws(() => answer("squareOfZeroes", "0, 0, 0; 0, 0, 0"), /square/);
  assert.throws(() => answer("squareOfZeroes", "0, 2; 0, 0"), /too big/);
});

test("burst balloons", () => {
  assert.equal(answer("burstBalloons", "2, 4, 1, 3, 5"), "The most coins: 127, bursting in the order 1 → 3 → 4 → 2 → 5.");
  assert.equal(answer("burstBalloons", "7"), "The most coins: 7, bursting in the order 7.");
  assert.equal(answer("burstBalloons", "0, 0"), "The most coins: 0, bursting in the order 0 → 0.");
  assert.throws(() => answer("burstBalloons", "12"), /too big/);
  const r = rng(29);
  // The coins for bursting in this order, balloon by balloon.
  const play = (xs: readonly number[], order: readonly number[]) => {
    const left = xs.map((_, i) => i);
    let coins = 0;
    for (const k of order) {
      const at = left.indexOf(k);
      coins += (at > 0 ? xs[left[at - 1]] : 1) * xs[k] * (at < left.length - 1 ? xs[left[at + 1]] : 1);
      left.splice(at, 1);
    }
    return coins;
  };
  function* perms(a: number[]): Generator<number[]> {
    if (a.length <= 1) return yield [...a];
    for (let i = 0; i < a.length; i++) for (const p of perms([...a.slice(0, i), ...a.slice(i + 1)])) yield [a[i], ...p];
  }
  for (let k = 0; k < 60; k++) {
    const xs = randInts(r, 1 + (k % 6), 0, 9);
    let best = 0;
    for (const p of perms(xs.map((_, i) => i))) best = Math.max(best, play(xs, p));
    const got = answer("burstBalloons", xs.join(", "));
    assert.ok(got.startsWith(`The most coins: ${best},`), `${xs}: ${got}`);
  }
});
