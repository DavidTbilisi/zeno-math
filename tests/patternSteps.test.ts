// The algorithm patterns of the live piece: every example gives the answer LeetCode gives, random inputs give the same
// answers as doing it the slow way, each question's right option is what the next step does, and bad inputs are
// turned away with a reason. Also the tree and grid editors' round trips, and the words in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { initialLive } from "../src/math/live.ts";
import {
  parseGrid, parseIntervals, parseTree, PATTERN_EXAMPLES, PATTERN_IDS, patternTrace, writeGrid, writeTree, type PatternId, type PatternInput,
} from "../src/math/patternSteps.ts";
import { rng } from "../src/math/random.ts";
import { fill } from "../src/math/text.ts";

const w = en.live.patterns;
const run = (id: PatternId, data: string, extra = "") => patternTrace(id, { data, extra }, w);
const show = (v: number) => (v < 0 ? `−${-v}` : String(v));
const list = (a: number[]) => `[${a.map(show).join(", ")}]`;

test("every example gives the answer the problem expects", () => {
  const answers: Record<PatternId, string> = {
    prefix: fill(w.prefix.answer, { i: 1, j: 3, s: 9 }),
    twoptr: fill(w.twoptr.answer, { x: 2, y: 4, i: 1, j: 3 }),
    window: fill(w.window.answer, { k: 3, i: 2, j: 4, s: 9 }),
    fastslow: fill(w.fastslow.answer, { v: 2, i: 1 }),
    reverse: fill(w.reverse.answer, { list: "[1, 4, 3, 2, 5]" }),
    mono: fill(w.mono.answer, { list: "[4, 2, 4, −1, −1]" }),
    topk: fill(w.topk.answer, { k: 2, v: 5 }),
    intervals: fill(w.intervals.answer, { list: "[[1, 6], [8, 10], [15, 18]]" }),
    rotated: fill(w.rotated.answer, { t: 0, i: 4 }),
    traverse: fill(w.traverse.answer, { list: "[1, 3, 2]" }),
    dfs: fill(w.dfs.answer, { n: 2, list: "1→2→5, 1→3" }),
    bfs: fill(w.bfs.answer, { list: "[[3], [9, 20], [15, 7]]" }),
    flood: fill(w.flood.answer, { n: 6, color: 2 }),
    permute: fill(w.permute.answer, { n: 6 }),
    dp: fill(w.dp.answer, { n: 5, v: 5 }),
  };
  for (const id of PATTERN_IDS) {
    const t = patternTrace(id, PATTERN_EXAMPLES[id], w);
    assert.equal(t.answer, answers[id], id);
    assert.ok(t.frames.length >= 3, `${id} has steps`);
    assert.equal(t.frames[t.frames.length - 1].ask, undefined, `${id}: nothing is asked at the end`);
    for (const f of t.frames) if (f.ask) assert.ok(f.ask.answer >= 0 && f.ask.answer < f.ask.options.length, `${id}: the right option is offered`);
  }
  assert.deepEqual(initialLive("patterns"), { pattern: "twoptr", ...PATTERN_EXAMPLES.twoptr, step: 0, quiz: false });
});

test("random arrays give the same answers as the slow way", () => {
  const r = rng(7);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  for (let trial = 0; trial < 300; trial++) {
    const n = int(2, 10);
    const a = Array.from({ length: n }, () => int(-9, 20));
    const data = a.join(", ");

    // Two pointers: a pair is found exactly when some pair adds up to the target.
    const t = int(-10, 40);
    const pair = a.some((x, i) => a.some((y, j) => i < j && x + y === t));
    assert.equal(run("twoptr", data, String(t)).answer !== fill(w.twoptr.none, { t: show(t) }), pair, `pair ${data} → ${t}`);

    // The window: the best sum of k in a row.
    const k = int(1, n);
    const sums = Array.from({ length: n - k + 1 }, (_, i) => a.slice(i, i + k).reduce((x, y) => x + y, 0));
    const best = Math.max(...sums);
    const at = sums.indexOf(best);
    assert.equal(run("window", data, String(k)).answer, fill(w.window.answer, { k, i: at, j: at + k - 1, s: show(best) }));

    // Prefix sums: any range.
    const i = int(0, n - 1);
    const j = int(i, n - 1);
    const s = a.slice(i, j + 1).reduce((x, y) => x + y, 0);
    assert.equal(run("prefix", data, `${i}, ${j}`).answer, fill(w.prefix.answer, { i, j, s: show(s) }));

    // The monotonic stack: the next greater element of each.
    const greater = a.map((x, p) => a.slice(p + 1).find((y) => y > x) ?? -1);
    assert.equal(run("mono", data).answer, fill(w.mono.answer, { list: list(greater) }));

    // The top k: the k-th largest.
    const kth = a.slice().sort((x, y) => y - x)[k - 1];
    assert.equal(run("topk", data, String(k)).answer, fill(w.topk.answer, { k, v: show(kth) }));

    // Reversing m to n.
    const m = int(1, n);
    const e = int(m, n);
    const rev = [...a.slice(0, m - 1), ...a.slice(m - 1, e).reverse(), ...a.slice(e)];
    assert.equal(run("reverse", data, `${m}, ${e}`).answer, fill(w.reverse.answer, { list: list(rev) }));

    // Fast and slow: the loop is found, and where it starts.
    const pos = int(-1, n - 1);
    const fs = run("fastslow", data, String(pos)).answer;
    assert.equal(fs, pos < 0 ? w.fastslow.noCycle : fill(w.fastslow.answer, { v: show(a[pos]), i: pos }));

    // Search in a rotated array of different numbers.
    const sorted = [...new Set(a)].sort((x, y) => x - y);
    const turn = int(0, sorted.length - 1);
    const rot = [...sorted.slice(turn), ...sorted.slice(0, turn)];
    const target = r() < 0.7 ? rot[int(0, rot.length - 1)] : 99;
    const where = rot.indexOf(target);
    assert.equal(
      run("rotated", rot.join(", "), String(target)).answer,
      where < 0 ? fill(w.rotated.none, { t: show(target) }) : fill(w.rotated.answer, { t: show(target), i: where }),
      `${rot} → ${target}`,
    );

    // Merging intervals.
    const iv = Array.from({ length: int(1, 8) }, (): [number, number] => {
      const x = int(0, 20);
      return [x, x + int(0, 6)];
    });
    const byStart = iv.slice().sort((x, y) => x[0] - y[0]);
    const merged: [number, number][] = [];
    for (const [x, y] of byStart) {
      const last = merged[merged.length - 1];
      if (last && x <= last[1]) last[1] = Math.max(last[1], y);
      else merged.push([x, y]);
    }
    const ivText = iv.map(([x, y]) => `[${x}, ${y}]`).join(", ");
    assert.equal(run("intervals", ivText).answer, fill(w.intervals.answer, { list: `[${merged.map(([x, y]) => `[${x}, ${y}]`).join(", ")}]` }));
  }
});

test("each question's right option is what the next step does", () => {
  // Two pointers: the pointer that moves is the one the answer named.
  const tp = run("twoptr", "1, 3, 4, 5, 8, 11", "12");
  tp.frames.forEach((f, k) => {
    if (!f.ask) return;
    const [now, next] = [f.cells!.ptrs!, tp.frames[k + 1].cells!.ptrs!];
    const moved = next.L !== now.L ? 0 : next.R !== now.R ? 2 : 1;
    assert.equal(f.ask.answer, moved);
  });
  // The window and Fibonacci: the right number is the next step's.
  const win = run("window", "2, 1, 5, 1, 3, 2", "3");
  const sums = [8, 7, 9, 6];
  win.frames.forEach((f, k) => f.ask && assert.equal(f.ask.options[f.ask.answer], String(sums[k + 1])));
  const fib = run("dp", "", "8");
  fib.frames.forEach((f, k) => f.ask && assert.equal(f.ask.options[f.ask.answer], String(fib.frames[k + 1].cells!.vals[k + 2])));
  // In-order on a search tree writes the numbers in order, and each question offers the next one.
  const bst = run("traverse", "4, 2, 6, 1, 3, 5, 7", "in");
  bst.frames.forEach((f, k) => f.ask && assert.equal(f.ask.options[f.ask.answer], String(k + 1)));
  assert.equal(run("traverse", "1, 2, 3, 4, 5", "pre").answer, fill(w.traverse.answer, { list: "[1, 2, 4, 5, 3]" }));
  assert.equal(run("traverse", "1, 2, 3, 4, 5", "post").answer, fill(w.traverse.answer, { list: "[4, 5, 2, 3, 1]" }));
  // Prefix sums: the rule asked for is P[j + 1] − P[i], wherever it is among the options.
  for (const [i, j] of [[0, 0], [1, 3], [2, 5], [0, 5]]) {
    const ask = run("prefix", "1, 2, 3, 4, 5, 6", `${i}, ${j}`).frames.find((f) => f.ask)!.ask!;
    assert.equal(ask.options[ask.answer], `P[${j + 1}] − P[${i}]`);
  }
});

test("trees, grids and the other searches", () => {
  assert.equal(run("permute", "1, 2, 3, 4").answer, fill(w.permute.answer, { n: 24 }));
  assert.equal(run("dp", "", "20").answer, fill(w.dp.answer, { n: 20, v: 6765 }));
  assert.equal(run("flood", "0 0; 0 0", "0, 0, 0").answer, fill(w.flood.same, { color: 0 }));
  assert.equal(run("flood", "1 0 1; 1 1 1; 0 0 1", "2, 2, 3").answer, fill(w.flood.answer, { n: 6, color: 3 }));
  assert.equal(run("bfs", "1").answer, fill(w.bfs.answer, { list: "[[1]]" }));
  assert.equal(run("dfs", "1, 2, 3, 4, null, null, 5").answer, fill(w.dfs.answer, { n: 2, list: "1→2→4, 1→3→5" }));
  // A loop back to the head is found too, and a list of one pointing at itself.
  assert.equal(run("fastslow", "1, 2, 3", "0").answer, fill(w.fastslow.answer, { v: 1, i: 0 }));
  assert.equal(run("fastslow", "5", "0").answer, fill(w.fastslow.answer, { v: 5, i: 0 }));
  assert.equal(run("fastslow", "5", "-1").answer, w.fastslow.noCycle);
});

test("the editors' round trips: trees, grids and intervals", () => {
  for (const s of ["1, null, 2, 3", "3, 9, 20, null, null, 15, 7", "1, 2, 3, null, 5", "5"]) assert.equal(writeTree(parseTree(s, w)), s);
  const t = parseTree("1, 2, 3, 4, 5", w);
  assert.equal(writeTree(t, 1), "1, null, 3", "removing a node takes its subtree with it");
  assert.equal(writeGrid(parseGrid("1 1 1; 1 1 0;1 0 1", w)), "1 1 1; 1 1 0; 1 0 1");
  assert.deepEqual(parseIntervals("1-3, 2-6", w), [[1, 3], [2, 6]]);
  assert.deepEqual(parseIntervals("[1,3],[2, 6]", w), [[1, 3], [2, 6]]);
  assert.deepEqual(parseIntervals("1 3; 8 10", w), [[1, 3], [8, 10]]);
});

test("bad inputs are turned away with a reason", () => {
  const bad: [PatternId, PatternInput, string][] = [
    ["prefix", { data: "1, 2, 3", extra: "2, 5" }, fill(w.errors.range, { n: 2 })],
    ["twoptr", { data: "1, x", extra: "3" }, fill(w.errors.number, { s: "x" })],
    ["window", { data: "1, 2", extra: "3" }, fill(w.errors.k, { n: 2 })],
    ["rotated", { data: "3, 1, 2, 0", extra: "1" }, w.rotated.notRotated],
    ["rotated", { data: "1, 1, 2", extra: "1" }, w.rotated.notRotated],
    ["intervals", { data: "[3, 1]", extra: "" }, fill(w.errors.interval, { s: "3, 1" })],
    ["traverse", { data: "1, 2, null, 3, null, 4, null, 5", extra: "in" }, w.errors.deep],
    ["flood", { data: "1 2; 3", extra: "0, 0, 1" }, w.errors.grid],
    ["flood", { data: "1 2; 3 4", extra: "2, 0, 1" }, fill(w.errors.cell, { r: 1, c: 1 })],
    ["permute", { data: "1, 1, 2", extra: "" }, w.permute.distinct],
    ["permute", { data: "1, 2, 3, 4, 5", extra: "" }, fill(w.errors.tooMany, { n: 4 })],
    ["dp", { data: "", extra: "21" }, fill(w.errors.dp, { n: 20 })],
    ["reverse", { data: "1, 2, 3", extra: "3, 2" }, fill(w.errors.mn, { n: 3 })],
    ["fastslow", { data: "1, 2", extra: "2" }, fill(w.errors.pos, { n: 1 })],
  ];
  for (const [id, input, message] of bad) assert.throws(() => patternTrace(id, input, w), { message }, `${id} ${input.data}`);
});

test("the piece's words are there in every language", () => {
  for (const words of [ka.live.patterns, ru.live.patterns]) {
    for (const id of PATTERN_IDS) {
      const t = patternTrace(id, PATTERN_EXAMPLES[id], words);
      assert.ok(t.answer && !/\{\w+\}/.test(t.answer), `${id}: ${t.answer}`);
      for (const f of t.frames) assert.ok(!/\{\w+\}/.test(f.note + (f.then ?? "")), `${id}: ${f.note}`);
    }
  }
});
