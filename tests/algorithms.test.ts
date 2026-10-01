// The Algorithms tool states the right answers: shortest paths, best windows, queens, call counts,
// string-matching comparisons — every sort survives random input in both views, and every example
// can be stepped through with the slider.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ALGO_PRESETS, ALGO_TOPICS, renderAlgo, SORT_ALGOS, type AlgoSpec } from "../src/math/algo.ts";

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

test("searching: two pointers and sliding window", () => {
  has({ topic: "search", algo: "twoptr", data: "1, 3, 4, 6, 8, 11, 13, 15", target: "17" }, "4 + 13 = 17: found at indices 2 and 6 after 4 steps");
  has({ topic: "search", algo: "twoptr", data: "1, 2, 4", target: "10" }, "No pair adds up to 10");
  has({ topic: "search", algo: "window", data: "2, 1, 5, 1, 3, 2, 7, 1, 4", target: "3" }, "Best window: indices 4 to 6, sum 12");
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
