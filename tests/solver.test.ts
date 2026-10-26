// The algorithm solver: every preset runs in every language and ends on its answer with nothing unfilled or broken,
// the registry and the words agree, the patterns give the right answers on random inputs checked the slow way, the
// questions a pattern asks match what it does next, and bad data or formulas say why, naming the slot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { DATA_KINDS, fromPair, fromPreset, mendSolver, PATTERN_KINDS, PATTERNS, patternsFor, PRESET_IDS, PRESETS, presetsFor, SOLVER_START, solverTrace, type LiveSolver } from "../src/math/solver/index.ts";
import { tape } from "../src/math/solver/frames.ts";
import { rng } from "../src/math/random.ts";

const LANGS = { en, ka, ru };
const w = en.live.solver;
const BROKEN = /NaN|undefined|Infinity|\{\w+\}/;

/** A preset with some of its inputs or slots changed; the answer, after checking every frame. */
function run(id: keyof typeof PRESETS, inputs: Partial<Record<number, string>> = {}, slots: Record<string, string> = {}, words = w) {
  const s = fromPreset(id);
  for (const [i, v] of Object.entries(inputs)) s.inputs[Number(i)] = v!;
  Object.assign(s.slots, slots);
  const t = solverTrace(s, words);
  for (const [k, f] of t.frames.entries()) {
    assert.ok(f.note.trim(), `${id} @ ${k}: a note`);
    assert.ok(f.cells || f.rows?.length || f.grid || f.mat || f.graph, `${id} @ ${k}: a picture`);
    assert.doesNotMatch(JSON.stringify(f), BROKEN, `${id} @ ${k}: ${f.note}`);
  }
  assert.equal(t.frames[t.frames.length - 1].note, t.answer, id);
  return t.answer;
}
const num = (s: string) => Number(s.replace(/−/g, "-"));
const last = (s: string, re: RegExp) => num(s.match(re)![1]);
const randInts = (r: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => lo + Math.floor(r() * (hi - lo + 1)));
const word = (r: () => number, n: number, abc: string) => Array.from({ length: n }, () => abc[Math.floor(r() * abc.length)]).join("");

test("every preset runs in every language and ends on its answer", () => {
  for (const id of PRESET_IDS)
    for (const [lang, t] of Object.entries(LANGS)) {
      const trace = solverTrace(fromPreset(id), t.live.solver);
      assert.ok(trace.frames.length >= 2 && trace.frames.length <= 300, `${id} (${lang}): ${trace.frames.length} frames`);
      assert.equal(trace.frames[trace.frames.length - 1].note, trace.answer, `${id} (${lang})`);
      for (const [k, f] of trace.frames.entries()) {
        assert.ok(f.note.trim() && (f.cells || f.rows?.length || f.grid || f.mat || f.graph), `${id} (${lang}) @ ${k}`);
        assert.doesNotMatch(JSON.stringify(f), BROKEN, `${id} (${lang}) @ ${k}: ${f.note}`);
        if (f.ask) assert.ok(f.ask.answer >= 0 && f.ask.answer < f.ask.options.length, `${id} (${lang}) @ ${k}: the right option exists`);
      }
    }
});

test("the registry and the words agree", () => {
  assert.deepEqual(Object.keys(PRESETS).sort(), Object.keys(w.presets).sort());
  assert.deepEqual([...PATTERN_KINDS].sort(), Object.keys(w.names).sort());
  assert.deepEqual([...PATTERN_KINDS].sort(), Object.keys(w.ideas).sort());
  assert.deepEqual([...DATA_KINDS].sort(), Object.keys(w.kinds).sort());
  for (const p of PATTERN_KINDS)
    for (const s of PATTERNS[p].slots) {
      assert.ok(w.slots[s.id], `${p}.${s.id} has a label`);
      if (s.kind === "select") for (const o of s.options) assert.ok(w.options[o], `${p}.${s.id}: ${o} has a word`);
      else assert.ok(s.kind === "text" || s.scope.length, `${p}.${s.id} says what names it binds`);
    }
  for (const id of PRESET_IDS) {
    const p = PRESETS[id];
    assert.ok(PATTERNS[p.pattern].data.includes(p.data), `${id}: ${p.pattern} takes ${p.data}`);
    assert.deepEqual(Object.keys(p.slots).sort(), PATTERNS[p.pattern].slots.map((s) => s.id).sort(), `${id}: every slot filled, no extra`);
    assert.ok(presetsFor(p.data, p.pattern).includes(id));
  }
  for (const d of DATA_KINDS) assert.ok(patternsFor(d).length, `${d} has a pattern`);
  assert.equal(SOLVER_START.preset, "twoSumSorted");
  // Boards saved with something gone come back whole.
  assert.deepEqual(mendSolver({ ...SOLVER_START, preset: "gone" }), { ...SOLVER_START, preset: null });
  assert.deepEqual(mendSolver({ ...SOLVER_START, pattern: "gone" as never }), SOLVER_START);
  assert.deepEqual(mendSolver({ ...SOLVER_START, data: "grid" }), SOLVER_START);
  assert.deepEqual(mendSolver({ ...SOLVER_START, slots: undefined as never, inputs: undefined as never }), { ...SOLVER_START, inputs: [] });
  const pair = fromPair("text", "window");
  assert.equal(pair.preset, "longestNoRepeat");
  assert.equal(fromPair("nums", "mono").preset, "nextGreater");
});

test("sliding windows", () => {
  assert.equal(run("longestNoRepeat"), "The longest valid window is [0–2], length 3: ['a', 'b', 'c'].");
  assert.equal(run("maxSumK"), "The largest score is 9, window [2–4]: [5, 1, 3].");
  assert.equal(run("minLenSum"), "The shortest valid window is [4–5], length 2: [4, 3].");
  assert.equal(run("countWindows"), "6 windows satisfy sum <= k.");
  assert.equal(run("minLenSum", { 1: "100" }), "No window satisfies sum >= k.");
  assert.equal(run("maxSumK", {}, { goal: "minScore" }), "The smallest score is 6, window [3–5]: [1, 3, 2].");
  assert.equal(run("maxSumK", {}, { goal: "count" }), "4 windows satisfy true.");
  const r = rng(3);
  for (let t = 0; t < 120; t++) {
    const s = word(r, 1 + (t % 12), "abcd");
    let best = 0;
    for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (new Set(s.slice(i, j + 1)).size === j - i + 1) best = Math.max(best, j - i + 1);
    assert.equal(last(run("longestNoRepeat", { 0: s }), /length (\d+)/), best, s);
    const xs = randInts(r, 1 + (t % 10), 1, 9);
    const k = 1 + Math.floor(r() * 15);
    let shortest = Infinity;
    for (let i = 0; i < xs.length; i++) for (let j = i; j < xs.length; j++) if (xs.slice(i, j + 1).reduce((a, b) => a + b, 0) >= k) shortest = Math.min(shortest, j - i + 1);
    const a = run("minLenSum", { 0: xs.join(", "), 1: String(k) });
    assert.equal(shortest === Infinity ? 0 : shortest, a.startsWith("No window") ? 0 : last(a, /length (\d+)/), `${xs} k=${k}`);
    const kk = 1 + Math.floor(r() * xs.length);
    let most = -Infinity;
    for (let i = 0; i + kk <= xs.length; i++) most = Math.max(most, xs.slice(i, i + kk).reduce((a, b) => a + b, 0));
    assert.equal(last(run("maxSumK", { 0: xs.join(", "), 1: String(kk) }), /score is (\d+)/), most, `${xs} k=${kk}`);
  }
  assert.throws(() => run("maxSumK", { 1: "0" }), /from 1 to 6/);
  assert.throws(() => run("maxSumK", { 1: "" }), /from 1 to 6/);
  assert.throws(() => run("longestNoRepeat", {}, { valid: "distinct ==" }), /Error: window is valid while: /);
  assert.throws(() => run("longestNoRepeat", {}, { valid: "sum" }), /window is valid while: .*true or false/);
  assert.throws(() => run("maxSumK", {}, { score: "win" }), /score: .*should be a number/);
  assert.throws(() => run("longestNoRepeat", {}, { valid: "x > 1" }), /isn't a name/);
});

test("two pointers", () => {
  assert.equal(run("twoSumSorted"), "Found: a[1] = 2 and a[5] = 8, a[l] + a[r] = 10.");
  assert.equal(run("twoSumSorted", { 0: "8, 2, 11, 1" }, { sort: "yes" }), "Found: a[1] = 2 and a[2] = 8, a[l] + a[r] = 10.");
  assert.equal(run("twoSumSorted", { 1: "100" }), "No pair is a hit.");
  assert.equal(run("container"), "The best score is 49: a[1] = 8 and a[8] = 7.");
  assert.equal(run("countPairs"), "3 pairs are hits.");
  assert.equal(run("container", {}, { goal: "minScore" }), "The best score is 4: a[1] = 8 and a[3] = 2.");
  assert.equal(run("container", { 0: "5" }), "The score was never recorded.");
  const r = rng(5);
  for (let t = 0; t < 120; t++) {
    const xs = randInts(r, 2 + (t % 10), 0, 12);
    let best = 0;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) best = Math.max(best, Math.min(xs[i], xs[j]) * (j - i));
    assert.equal(last(run("container", { 0: xs.join(", ") }), /score is (\d+)/), best, `${xs}`);
    const k = Math.floor(r() * 20);
    const sorted = [...xs].sort((a, b) => a - b);
    const hit = sorted.some((x, i) => sorted.slice(i + 1).includes(k - x));
    assert.equal(run("twoSumSorted", { 0: xs.join(", "), 1: String(k) }).startsWith("Found"), hit, `${xs} k=${k}`);
  }
  // Each question's right option is what the pointers do next.
  const trace = solverTrace(fromPreset("twoSumSorted"), w);
  for (let i = 0; i + 1 < trace.frames.length - 1; i++) {
    const [a, b] = [trace.frames[i].cells!.ptrs!, trace.frames[i + 1].cells!.ptrs!];
    const ask = trace.frames[i].ask!;
    assert.equal(ask.options[ask.answer], a.L !== b.L ? "L moves right" : "R moves left");
  }
  assert.throws(() => run("twoSumSorted", {}, { score: "'a'" }), /should be a number/);
});

test("monotonic stacks", () => {
  assert.equal(run("nextGreater"), "Result: [4, 2, 4, −1, −1]. Still on the stack: [4, 3].");
  assert.equal(run("prevSmaller"), "Result: [−1, −1, 1, −1, 1]. Still on the stack: [1, 5].");
  assert.equal(run("dailyTemperatures"), "Result: [1, 1, 4, 2, 1, 1, 0, 0]. Still on the stack: [76, 73].");
  assert.equal(run("nextGreater", { 0: "5, 4, 3" }, { direction: "r2l", popWhile: "cur < top", record: "topValue" }), "Result: [4, 3, −1]. Still on the stack: [3, 4, 5].");
  assert.equal(run("nextGreater", { 0: "1, 2, 3" }), "Result: [2, 3, −1]. Still on the stack: [3].");
  assert.equal(run("nextGreater", { 0: "7" }), "Result: [−1]. Still on the stack: [7].");
  const r = rng(7);
  for (let t = 0; t < 120; t++) {
    const xs = randInts(r, 1 + (t % 12), 1, 9);
    const next = xs.map((x, i) => xs.slice(i + 1).find((y) => y > x) ?? -1);
    assert.equal(run("nextGreater", { 0: xs.join(", ") }).split(". ")[0], `Result: [${next.map((v) => (v < 0 ? "−1" : v)).join(", ")}]`, `${xs}`);
    const wait = xs.map((x, i) => {
      const j = xs.findIndex((y, k) => k > i && y > x);
      return j < 0 ? 0 : j - i;
    });
    assert.equal(run("dailyTemperatures", { 0: xs.join(", ") }).split(". ")[0], `Result: [${wait.join(", ")}]`, `${xs}`);
  }
  const trace = solverTrace(fromPreset("nextGreater"), w);
  const asked = trace.frames.filter((f) => f.ask);
  assert.ok(asked.length >= 3);
  for (const f of asked) assert.equal(f.then, f.ask!.options[f.ask!.answer]);
});

test("binary search", () => {
  assert.equal(run("lowerBound"), "The first value with a[mid] >= k true is 3 (a[3] = 7).");
  assert.equal(run("lowerBound", { 1: "8" }), "The first value with a[mid] >= k true is 4 (a[4] = 9).");
  assert.equal(run("lowerBound", { 1: "99" }), "a[mid] >= k is never true.");
  assert.equal(run("lowerBound", { 1: "0" }, { find: "lastFalse" }), "a[mid] >= k is always true.");
  assert.equal(run("sqrtFloor"), "The last value with mid * mid > k false is 5.");
  assert.equal(run("sqrtFloor", { 1: "1000", 2: "500" }), "The last value with mid * mid > k false is 22.");
  assert.equal(run("kokoBananas"), "The first value with sum(x in a: ceil(x / mid)) <= k true is 4.");
  const r = rng(9);
  for (let t = 0; t < 120; t++) {
    const xs = randInts(r, 1 + (t % 12), 0, 30).sort((a, b) => a - b);
    const k = Math.floor(r() * 32);
    const want = xs.findIndex((x) => x >= k);
    const a = run("lowerBound", { 0: xs.join(", "), 1: String(k) });
    assert.equal(want < 0 ? -1 : want, a.includes("never") ? -1 : last(a, /is (\d+) \(/), `${xs} k=${k}`);
    const n = Math.floor(r() * 400);
    assert.equal(last(run("sqrtFloor", { 1: "40", 2: String(n) }), /is (\d+)\.$/), Math.floor(Math.sqrt(n)), `sqrt ${n}`);
  }
  const trace = solverTrace(fromPreset("lowerBound"), w);
  for (let i = 0; i + 1 < trace.frames.length - 1; i++) {
    const [a, b] = [trace.frames[i].cells!.ptrs!, trace.frames[i + 1].cells!.ptrs!];
    assert.equal(trace.frames[i].ask!.answer, a.hi !== b.hi ? 0 : 1);
  }
  assert.throws(() => run("sqrtFloor", { 0: "9", 1: "3" }), /from 9 to/);
  assert.throws(() => run("lowerBound", {}, { ok: "a[mid]" }), /Error: ok\(mid\): .*true or false/);
});

test("dynamic programming in a row", () => {
  assert.equal(run("climbStairs"), "dp[k] = 13.");
  assert.equal(run("houseRobber"), "dp[n-1] = 21.");
  assert.equal(run("minCoins"), "dp[k] = 3.");
  assert.equal(run("minCoins", { 0: "2", 1: "3" }), "dp[k] = ∞.");
  assert.equal(run("kadane"), "max(dp) = 6.");
  assert.equal(run("lis"), "max(dp) = 4.");
  assert.equal(run("jumpGame"), "dp[n-1] = ✓.");
  assert.equal(run("jumpGame", { 0: "3, 2, 1, 0, 4" }), "dp[n-1] = ✗.");
  assert.equal(run("houseRobber", { 0: "5" }, { base: "dp[0] = a[0]" }), "dp[n-1] = 5.");
  assert.equal(run("houseRobber", {}, { base: "dp[i] = 0", rec: "0" }), "dp[n-1] = 0.");
  const r = rng(11);
  const subsets = (n: number): number[][] => (n === 0 ? [[]] : subsets(n - 1).flatMap((s) => [s, [...s, n - 1]]));
  for (let t = 0; t < 100; t++) {
    const xs = randInts(r, 2 + (t % 9), 1, 20);
    let best = 0;
    for (const s of subsets(xs.length)) if (s.every((i, q) => q === 0 || i - s[q - 1] > 1)) best = Math.max(best, s.reduce((a, i) => a + xs[i], 0));
    assert.equal(last(run("houseRobber", { 0: xs.join(", ") }), /= (\d+)\.$/), best, `${xs}`);
    const ys = randInts(r, 1 + (t % 8), -5, 5);
    let kad = -Infinity;
    for (let i = 0; i < ys.length; i++) for (let j = i; j < ys.length; j++) kad = Math.max(kad, ys.slice(i, j + 1).reduce((a, b) => a + b, 0));
    assert.equal(last(run("kadane", { 0: ys.join(", ") }), /= (−?\d+)\.$/), kad, `${ys}`);
    let lis = 0;
    for (const s of subsets(ys.length)) if (s.every((i, q) => q === 0 || ys[i] > ys[s[q - 1]])) lis = Math.max(lis, s.length);
    assert.equal(last(run("lis", { 0: ys.join(", ") }), /= (\d+)\.$/), lis, `${ys}`);
  }
  // Each question is the cell about to be filled, and the cells a step reads are the ones lit up.
  const trace = solverTrace(fromPreset("houseRobber"), w);
  assert.equal(trace.frames[0].ask!.q, "dp[2] = ?");
  assert.equal(trace.frames[0].ask!.options[trace.frames[0].ask!.answer], "10");
  assert.deepEqual(trace.frames[1].cells!.roles, ["compare", "compare", "key", "idle", "idle", "idle", "idle"]);
  assert.equal(trace.frames[1].note, "dp[2] = 10, from dp[1], dp[0], a[2].");
  assert.throws(() => run("houseRobber", {}, { base: "dp[0] : 1" }), /Base cases are written/);
  assert.throws(() => run("houseRobber", {}, { base: "dp[9] = 1" }), /base cases: dp\[9\] is outside/);
  assert.throws(() => run("houseRobber", {}, { rec: "dp[i-1]", base: "" }), /dp\[i\] =: dp\[-1\]/);
  assert.throws(() => run("houseRobber", {}, { rec: "dp[i+1]", base: "" }), /has no value yet/);
  assert.throws(() => run("climbStairs", { 1: "40" }), /from 0 to 23/);
  assert.throws(() => run("climbStairs", { 1: "" }), /from 0 to 23/);
});

test("dynamic programming in a table", () => {
  assert.equal(run("lcs"), "dp[n][m] = 3.");
  assert.equal(run("editDistance"), "dp[n][m] = 3.");
  assert.equal(run("knapsack"), "dp[n][cap] = 22.");
  assert.equal(run("uniquePaths"), "dp[R-1][C-1] = 28.");
  assert.equal(run("minPathSum"), "dp[R-1][C-1] = 7.");
  assert.equal(run("waysChange"), "dp[n][k] = 4.");
  assert.equal(run("lcs", { 0: "1, 2, 3, 4", 1: "2, 4" }), "dp[n][m] = 2.");
  const r = rng(13);
  const lcs = (a: string, b: string): number => {
    const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d[a.length][b.length];
  };
  for (let t = 0; t < 60; t++) {
    const [a, b] = [word(r, 1 + (t % 7), "abc"), word(r, 1 + ((t * 3) % 7), "abc")];
    assert.equal(last(run("lcs", { 0: a, 1: b }), /= (\d+)\.$/), lcs(a, b), `${a} ${b}`);
    const vs = randInts(r, 1 + (t % 4), 1, 9);
    const ws = randInts(r, vs.length, 1, 4);
    const cap = Math.floor(r() * 9);
    let best = 0;
    for (let mask = 0; mask < 1 << vs.length; mask++) {
      const picked = vs.map((_, i) => (mask >> i) & 1);
      if (picked.reduce((s, p, i) => s + p * ws[i], 0) <= cap) best = Math.max(best, picked.reduce((s, p, i) => s + p * vs[i], 0));
    }
    assert.equal(last(run("knapsack", { 0: vs.map((v, i) => `[${v}, ${ws[i]}]`).join(", "), 1: String(cap) }), /= (\d+)\.$/), best, `${vs} ${ws} ${cap}`);
  }
  const trace = solverTrace(fromPreset("lcs"), w);
  assert.deepEqual(trace.frames[0].mat!.rowHeads, ["∅", "a", "b", "c", "d", "e"]);
  assert.deepEqual(trace.frames[0].mat!.colHeads, ["∅", "a", "c", "e"]);
  assert.equal(trace.frames[1].note, "dp[1][1] = 1, from dp[0][0].");
  assert.equal(trace.frames[1].mat!.roles[1][1], "key");
  assert.equal(trace.frames[1].mat!.roles[0][0], "compare");
  assert.equal(solverTrace(fromPreset("knapsack"), w).frames[0].mat!.rowHeads![1], "6/1");
  assert.throws(() => run("lcs", {}, { rows: "20" }), /At most 13 rows/);
  assert.throws(() => run("lcs", {}, { rows: "'a'" }), /Error: rows: /);
  assert.throws(() => run("lcs", {}, { base: "dp[0] = 1" }), /Base cases/);
  assert.throws(() => run("lcs", {}, { base: "dp[9][0] = 1" }), /dp\[9\]\[0\] is outside/);
  assert.throws(() => run("knapsack", { 0: "[1, 2, 3]" }), /isn't a pair/);
  assert.throws(() => run("knapsack", { 0: "" }), /Write something/);
  assert.throws(() => run("knapsack", { 1: "40" }), /from 0 to 12/);
});

test("grid search", () => {
  assert.equal(run("islands"), "3 components.");
  assert.equal(run("islands", {}, { neighbours: "eight" }), "1 components.");
  assert.equal(run("islands", { 0: "0 0; 0 0" }), "0 components.");
  assert.equal(run("shortestGrid"), "Goal at (3, 3), 6 steps from the start.");
  assert.equal(run("shortestGrid", {}, { mode: "dfs" }), "Goal at (3, 3), 6 steps from the start.");
  assert.equal(run("shortestGrid", { 0: "0 1; 1 0" }), "1 squares reached, none the goal.");
  assert.equal(run("shortestGrid", {}, { goalCell: "" }), "10 squares reached, in order: (0, 0) (0, 1) (0, 2) (1, 2) (2, 2) (2, 1) (2, 3) (2, 0) (3, 3) (3, 0).");
  assert.equal(run("floodFill"), "6 squares filled with 2.");
  const r = rng(17);
  for (let t = 0; t < 60; t++) {
    const R = 1 + (t % 5);
    const C = 1 + ((t * 7) % 6);
    const g = Array.from({ length: R }, () => randInts(r, C, 0, 1));
    const seen = g.map((row) => row.map(() => false));
    let comps = 0;
    for (let i = 0; i < R; i++)
      for (let j = 0; j < C; j++) {
        if (seen[i][j] || !g[i][j]) continue;
        comps++;
        const q: [number, number][] = [[i, j]];
        seen[i][j] = true;
        while (q.length) {
          const [a, b] = q.pop()!;
          for (const [x, y] of [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]]) if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] && !seen[x][y]) (seen[x][y] = true), q.push([x, y]);
        }
      }
    assert.equal(last(run("islands", { 0: g.map((row) => row.join(" ")).join("; ") }), /^(\d+) components/), comps, `${JSON.stringify(g)}`);
  }
  const trace = solverTrace(fromPreset("shortestGrid"), w);
  assert.equal(trace.frames[1].note, "Visit (0, 0) at distance 0: 1 new to see: (0, 1).");
  assert.equal(trace.frames[1].grid!.roles[0][0], "key");
  assert.equal(trace.frames[1].grid!.roles[0][1], "compare");
  assert.equal(trace.frames[trace.frames.length - 1].grid!.roles[3][3], "key");
  assert.equal(solverTrace(fromPreset("floodFill"), w).frames[3].grid!.vals[1][1], 2);
  assert.throws(() => run("shortestGrid", {}, { start: "9, 9" }), /row and a column inside the grid/);
  assert.throws(() => run("shortestGrid", {}, { start: "x" }), /row and a column/);
  assert.throws(() => run("shortestGrid", {}, { start: "1, 0" }), /isn't passable/);
  assert.throws(() => run("floodFill", { 1: "12" }), /from 0 to 9/);
  assert.throws(() => run("floodFill", { 1: "" }), /from 0 to 9/);
  assert.throws(() => run("islands", {}, { passable: "v" }), /passable when: .*true or false/);
});

test("graph search", () => {
  assert.equal(run("bfsOrder"), "5 nodes reached, in order: A B C D E.");
  assert.equal(run("dfsOrder"), "5 nodes reached, in order: A C D E B.");
  assert.equal(run("shortestGraph"), "Goal E reached, 3 edges from the start: A → B → D → E.");
  assert.equal(run("shortestGraph", {}, { startNode: "E", goalNode: "A" }), "Goal A reached, 3 edges from the start: E → D → B → A.");
  assert.equal(run("shortestGraph", { 0: "A-B, C-D" }, { goalNode: "D" }), "2 nodes reached, never D.");
  assert.equal(run("shortestGraph", { 0: "A>B, B>C, C>A, A>D" }, { goalNode: "C" }), "Goal C reached, 2 edges from the start: A → B → C.");
  assert.equal(run("bfsOrder", {}, { goalNode: "D" }), "Goal D reached, 2 edges from the start: A → B → D.");
  assert.equal(run("graphComponents"), "3 components.");
  const r = rng(19);
  for (let t = 0; t < 60; t++) {
    const n = 2 + (t % 7);
    const names = "ABCDEFGH".slice(0, n).split("");
    const es = [[0, 1], [n - 1, Math.max(0, n - 2)], ...Array.from({ length: Math.floor(r() * n) }, () => [Math.floor(r() * n), Math.floor(r() * n)])].filter(([a, b]) => a !== b);
    const dist = Array(n).fill(-1);
    dist[0] = 0;
    const q = [0];
    while (q.length) {
      const v = q.shift()!;
      for (const [a, b] of es) for (const [x, y] of [[a, b], [b, a]]) if (x === v && dist[y] < 0) (dist[y] = dist[v] + 1), q.push(y);
    }
    const goal = names[n - 1];
    const a = run("shortestGraph", { 0: es.map(([x, y]) => `${names[x]}-${names[y]}`).join(", ") }, { goalNode: goal });
    assert.equal(dist[n - 1] < 0 ? -1 : dist[n - 1], a.startsWith("Goal") ? last(a, /, (\d+) edges/) : -1, `${es}`);
  }
  const trace = solverTrace(fromPreset("shortestGraph"), w);
  assert.deepEqual(trace.frames[trace.frames.length - 1].graph!.roles, ["key", "key", "sorted", "key", "key", "sorted"]);
  assert.equal(trace.frames[1].rows![0].label, "queue");
  assert.equal(solverTrace(fromPreset("dfsOrder"), w).frames[1].rows![0].label, "stack");
  assert.deepEqual(solverTrace(fromPreset("graphComponents"), w).frames.at(-1)!.graph!.tags, ["1", "1", "1", "2", "2", "3", "3", "3"]);
  assert.throws(() => run("bfsOrder", {}, { startNode: "Z" }), /Error: start: “Z” isn't one of the nodes/);
  assert.throws(() => run("bfsOrder", { 0: "A-B-C" }), /isn't an edge/);
});

test("backtracking", () => {
  assert.equal(run("subsets"), "8 answers: [], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3].");
  assert.equal(run("permutations"), "6 answers: [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1].");
  assert.equal(run("combinationSum"), "2 answers: [2, 2, 3], [7].");
  assert.equal(run("combinationSum", { 1: "1" }), "No answer.");
  assert.equal(run("subsets", { 0: "1, 2, 3, 4", 1: "2" }, { accept: "len(picked) == k" }), "6 answers: [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4].");
  assert.equal(run("subsets", {}, { choose: "1..2" }), "4 answers: [], [1], [1, 2], [2].");
  const r = rng(23);
  for (let t = 0; t < 40; t++) {
    const xs = [...new Set(randInts(r, 1 + (t % 3), 2, 6))];
    const k = 1 + Math.floor(r() * 8);
    const ways = (i: number, left: number): number => (left === 0 ? 1 : i >= xs.length || left < 0 ? 0 : ways(i + 1, left) + ways(i, left - xs[i]));
    let a: string;
    try {
      a = run("combinationSum", { 0: xs.join(", "), 1: String(k) });
    } catch (e) {
      assert.match((e as Error).message, /too big/);
      continue;
    }
    assert.equal(a === "No answer." ? 0 : last(a, /^(\d+) answers/), ways(0, k), `${xs} k=${k}`);
  }
  const trace = solverTrace(fromPreset("subsets"), w);
  assert.equal(trace.frames[0].note, "Nothing picked yet: 3 to choose from.");
  assert.equal(trace.frames[1].note, "Accepted: [].");
  assert.equal(trace.frames[2].note, "Pick 1: picked = [1].");
  assert.deepEqual(trace.frames[2].graph!.layer, [0, 1]);
  assert.equal(trace.frames[2].graph!.roles[1], "key");
  assert.equal(solverTrace(fromPreset("combinationSum"), w).frames.find((f) => f.note.startsWith("7 is not allowed"))!.graph!.roles.at(-1), "idle");
  assert.throws(() => run("subsets", { 0: "1, 2, 3, 4, 5, 6, 7" }), /At most 6 to choose from/);
  assert.throws(() => run("subsets", { 0: "1, 2, 3, 4, 5, 6" }), /too big \(60 nodes/);
  assert.throws(() => run("subsets", {}, { choose: "1" }), /choose from: .*should be a list/);
  assert.throws(() => run("subsets", {}, { allowed: "x" }), /allowed when: .*true or false/);
});

test("the data and the frames have limits", () => {
  assert.throws(() => run("twoSumSorted", { 0: Array(17).fill(1).join(", ") }), /At most 16/);
  assert.throws(() => run("longestNoRepeat", { 0: "a".repeat(17) }), /At most 16 characters/);
  assert.throws(() => run("twoSumSorted", { 1: "ten" }), /isn't a number/);
  assert.throws(() => run("lcs", { 1: "" }), /Write something/);
  assert.throws(() => run("islands", { 0: "1 2; 3" }), /as many entries/);
  const t = tape(w);
  for (let i = 0; i < 300; i++) t.push({ note: "x" });
  assert.throws(() => t.push({ note: "x" }), /Too many steps/);
  const state: LiveSolver = { ...fromPreset("lcs"), inputs: ["ab"] };
  assert.throws(() => solverTrace(state, w), /Write something/);
});
