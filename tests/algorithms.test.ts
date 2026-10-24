// The Algorithms tool states the right answers: shortest paths, best windows, pointer patterns, queens,
// call counts, string-matching comparisons — every sort survives random input in both views, and every example
// can be stepped through with the slider.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ALGO_PRESETS, ALGO_TOPICS, renderAlgo, SORT_ALGOS, upgradeAlgo, type AlgoSpec, type PatternAlgo } from "../src/math/algo.ts";

const w = en.algoWords;
const text = (spec: AlgoSpec) => [...renderAlgo(spec, w).svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")).join(" ").replace(/\s+/g, " ");
const has = (spec: AlgoSpec, ...wants: string[]) => {
  const shown = text(spec);
  for (const want of wants) assert.ok(shown.includes(want), `expected "${want}" in\n${shown}`);
};

test("sorting: random input, every algorithm, cells and bars", () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % 25);
  for (let k = 0; k < 40; k++) {
    const data = Array.from({ length: 2 + (k % 12) }, rnd).join(", ");
    for (const algo of SORT_ALGOS)
      for (const view of ["cells", "bars"] as const) {
        const svg = renderAlgo({ topic: "sort", algo, data, view }, w).svg;
        assert.doesNotMatch(svg, /NaN|undefined/, `${algo} ${view}: ${data}`);
      }
  }
  assert.throws(() => renderAlgo({ topic: "sort", algo: "counting", data: "1, 100", view: "cells" }, w));
});

test("patterns: pointers, windows, prefix sums, a monotonic stack", () => {
  const pt = (algo: PatternAlgo, data: string, target = "") => ({ topic: "pattern", algo, data, target }) as AlgoSpec;
  has(pt("twoptr", "1, 3, 4, 6, 8, 11, 13, 15", "17"), "4 + 13 = 17: found at indices 2 and 6 after 4 steps");
  has(pt("twoptr", "1, 2, 4", "10"), "No pair adds up to 10");
  has(pt("twoptr", "4, 1, 3", "5"), "sorted first");
  has(pt("window", "2, 1, 5, 1, 3, 2, 7, 1, 4", "3"), "Best window: indices 4 to 6, sum 12");
  has(pt("water", "1, 8, 6, 2, 5, 4, 8, 3, 7"), "Lines 1 and 8 hold the most water: 7 × 7 = 49");
  has(pt("dedupe", "0, 0, 1, 1, 1, 2, 2, 3, 3, 4"), "5 distinct value(s), now at indices 0 to 4: 0, 1, 2, 3, 4");
  has(pt("dedupe", "3, 1, 3"), "sorted first", "2 distinct value(s)");
  has(pt("partition", "2, 0, 2, 1, 1, 0", "1"), "2 value(s) below the pivot 1, 2 equal to it and 2 above it, after 6 steps");
  // 1 3 4 2 2: 0 → 1 → 3 → 2 → 4 → 2, so the loop is 2 → 4 and the 2 repeats.
  has(pt("cycle", "1, 3, 4, 2, 2"), "The loop starts at index 2 and has 2 cell(s)", "a[3] = a[4] = 2");
  has(pt("cycle", "3, 1, 3, 4, 2"), "The loop starts at index 3 and has 3 cell(s)", "a[0] = a[2] = 3");
  const fromStart = text(pt("cycle", "1, 2, 0"));
  assert.ok(fromStart.includes("The loop starts at index 0 and has 3 cell(s)") && !fromStart.includes("repeats"), fromStart);
  has(pt("distinct", "abcabcbb"), "“abc”, indices 0 to 2, length 3");
  has(pt("distinct", "pwwkew"), "“wke”, indices 2 to 4, length 3");
  has(pt("minsum", "2, 3, 1, 2, 4, 3", "7"), "indices 4 to 5, length 2 (sum 7)");
  has(pt("minsum", "1, 2", "10"), "Even the whole array adds up to less than 10");
  has(pt("prefix", "3, 4, 7, 2, -3, 1, 4, 2", "7"), "4 subarray(s) add up to 7: [0–1], [2], [2–5], [5–7]");
  has(pt("prefix", "1, -1, 1", "0"), "2 subarray(s) add up to 0: [0–1], [1–2]");
  has(pt("mono", "73, 74, 75, 71, 69, 72, 76, 73"), "Next greater: [74, 75, 76, 72, 72, 76, —, —]");
  // Wrapping round, the 2 at the end finds the 5 at the start; the 7 has nothing greater anywhere.
  has({ ...pt("mono", "2, 5, -3, -4, 6, 7, 2"), circular: true } as AlgoSpec, "Next greater: [5, 6, 6, 6, 7, —, 5]", "nothing in the whole array is greater");
  has(pt("trap", "0, 8, 0, 0, 5, 0, 0, 10, 0, 0, 1, 1, 0, 3"), "The bars trap 48 unit(s) of water");
  has(pt("trap", "0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1"), "The bars trap 6 unit(s) of water");
  has(pt("trap", "1, 2, 3"), "The bars trap 0 unit(s) of water");
  has(pt("kadane", "-2, 1, -3, 4, -1, 2, 1, -5, 4"), "Largest sum: 6, indices 3 to 6", "4 − 1 = 3");
  has(pt("kadane", "-3, -1, -2"), "Largest sum: −1, indices 1 to 1");
  for (const [algo, data, target] of [["water", "3, -1"], ["trap", "2, -1, 2"], ["cycle", "1, 5"], ["distinct", " "], ["minsum", "1, -2, 3", "2"], ["minsum", "1, 2", "0"], ["partition", "1, 2", ""]] as const)
    assert.throws(() => renderAlgo(pt(algo, data, target), w), `${algo}: ${data}`);
});

test("boards saved before Patterns open two pointers and windows there, unchanged", () => {
  const old = { topic: "search", algo: "window", data: "2, 1, 5, 1, 3, 2, 7, 1, 4", target: "3", step: 2 } as AlgoSpec;
  const now = upgradeAlgo(old);
  assert.deepEqual(now, { topic: "pattern", algo: "window", data: "2, 1, 5, 1, 3, 2, 7, 1, 4", target: "3", step: 2 });
  assert.equal(renderAlgo(now, w).svg, renderAlgo(old, w).svg);
  const binary = ALGO_PRESETS.search[0].spec;
  assert.equal(upgradeAlgo(binary), binary);
});

test("graphs: Bellman–Ford, Floyd–Warshall, union–find", () => {
  has({ topic: "graph", algo: "bellman", edges: "S-A 4, S-B 5, A-C -3, B-A -2, C-D 2, B-D 6", directed: true, start: "S" }, "D: S → B → A → C → D = 2", "stopped early");
  has({ topic: "graph", algo: "bellman", edges: "S-A 1, A-B 2, B-C -4, C-A 1, C-D 3", directed: true, start: "S" }, "Negative cycle through A → B → C → A");
  // A → D: A → B → C → D = 3 + 2 + 1 = 6, last improved through C.
  has({ topic: "graph", algo: "floyd", edges: "A-B 3, A-D 7, B-A 8, B-C 2, C-A 5, C-D 1, D-A 2", directed: true, start: "" }, "6 (C)", "5 (B)");
  has({ topic: "graph", algo: "unionfind", edges: "A-B, C-D, B-D, E-F, A-C, G-H, F-G", directed: false, start: "" }, "2 set(s) in the end: {A B C D} {E F G H}");
});

test("recursion and backtracking", () => {
  const r = (problem: "fib" | "fact" | "hanoi" | "queens" | "subsets", n: string, memo = false, data = "", target = "") =>
    ({ topic: "recur", problem, n, memo, data, target }) as AlgoSpec;
  has(r("fib", "5"), "15 calls for 6 different values", "9 calls repeat");
  has(r("fib", "8", true), "15 calls for 9 different values");
  has(r("hanoi", "3"), "7 moves for 3 disc(s)");
  has(r("queens", "8"), "92 solution(s) for n = 8");
  has(r("queens", "6"), "4 solution(s) for n = 6");
  has(r("subsets", "", false, "3, 5, 6, 7", "15"), "1 subset(s) add up to 15: {3, 5, 7}");
  assert.throws(() => renderAlgo(r("fib", "9"), w), "fib without memo is limited to small n");
});

test("string matching", () => {
  const s = (algo: "naive" | "kmp" | "rk", t: string, p: string) => ({ topic: "string", algo, text: t, pattern: p }) as AlgoSpec;
  has(s("naive", "AAAAAAAB", "AAAB"), "Found 1 time(s), at shift(s) 4", "20 character comparisons");
  has(s("kmp", "AAAAAAAB", "AAAB"), "12 character comparisons (the naive algorithm needs 20)");
  has(s("kmp", "ABABABCAB", "ABABC"), "shift 2: match", "8 character comparisons (the naive algorithm needs 15)");
  has(s("rk", "abracadabra", "abra"), "Found 2 time(s), at shift(s) 0, 7", "1 spurious hit(s)");
  has(s("kmp", "aaaa", "aa"), "Found 3 time(s), at shift(s) 0, 1, 2");
  has(s("naive", "hello", "xyz"), "The pattern does not occur in the text");
});

test("dynamic programming: ways to make change and the staircase", () => {
  const dp = (problem: "ways" | "stairs", a: string, c: string) => ({ topic: "dp", problem, a, b: "", c }) as AlgoSpec;
  has(dp("ways", "1, 5", "6"), "2 way(s) to make 6: 5 + 1, 1 + 1 + 1 + 1 + 1 + 1");
  has(dp("ways", "2, 5, 1", "5"), "4 way(s) to make 5: 5, 2 + 2 + 1, 2 + 1 + 1 + 1, 1 + 1 + 1 + 1 + 1");
  has(dp("ways", "1", "24"), "1 way(s) to make 24");
  has(dp("ways", "10", "7"), "The amount 7 cannot be made");
  has(dp("stairs", "2", "4"), "5 way(s) to climb 4 steps taking 1 to 2 at a time");
  has(dp("stairs", "3", "10"), "274 way(s) to climb 10 steps");
  has(dp("stairs", "1", "7"), "1 way(s) to climb 7 steps");
  for (const [problem, a, c] of [["ways", "0, 1", "5"], ["ways", "1", "25"], ["stairs", "0", "4"], ["stairs", "2", "41"]] as const)
    assert.throws(() => renderAlgo(dp(problem, a, c), w), `${problem}: ${a} / ${c}`);
});

test("search trees: a repeat goes right in a BST, an AVL tree skips it", () => {
  has({ topic: "tree", kind: "bst", data: "10, 5, 15, 2, 5, 22, 1" }, "sorted: 1, 2, 5, 5, 10, 15, 22", "Preorder (root, left, right): 10, 5, 2, 1, 5, 15, 22");
  assert.ok(!text({ topic: "tree", kind: "bst", data: "3, 3" }).includes("Duplicates"));
  has({ topic: "tree", kind: "avl", data: "3, 3, 1" }, "Duplicates skipped: 3");
});

test("the step slider: every example, every step", () => {
  for (const topic of ALGO_TOPICS)
    for (const { label, spec } of ALGO_PRESETS[topic]) {
      const full = renderAlgo(spec, w);
      assert.equal(full.steps > 0, topic !== "growth", `${label}: ${full.steps} steps`);
      for (let step = 0; step <= full.steps; step++) {
        const r = renderAlgo({ ...spec, step }, w);
        assert.equal(r.steps, full.steps, `${label} @ ${step}`);
        assert.doesNotMatch(r.svg, /NaN|undefined|Infinity/, `${label} @ ${step}`);
        if (step < full.steps) assert.notEqual(r.svg, full.svg, `${label} @ ${step} looks finished`);
      }
      assert.equal(renderAlgo({ ...spec, step: full.steps }, w).svg, full.svg, `${label}: the last step is the whole picture`);
    }
  // The answer waits for the last step.
  const bfs = ALGO_PRESETS.graph[0].spec;
  assert.ok(text(bfs).includes("Visiting order"));
  assert.ok(!text({ ...bfs, step: 2 }).includes("Visiting order"));
});
