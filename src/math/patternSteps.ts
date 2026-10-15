// The fifteen patterns behind most interview problems (prefix sums, two pointers, a sliding window, fast and slow
// pointers, reversing part of a linked list, a monotonic stack, the top k, merging intervals, binary search on a
// rotated array, tree traversals, depth- and breadth-first search, flood fill, backtracking and dynamic programming),
// each turned into frames for the live piece to step through. A frame is the picture at one moment and a note on it;
// `then` says what happens next, and `ask` puts that as a question when the pupil takes a turn. Kept free of React so
// it can be tested on its own.
import type { Dict } from "../locales/en";
import { fill } from "./text";

export type PatternId =
  | "prefix" | "twoptr" | "window" | "fastslow" | "reverse" | "mono" | "topk" | "intervals"
  | "rotated" | "traverse" | "dfs" | "bfs" | "flood" | "permute" | "dp";
export const PATTERN_IDS: PatternId[] = [
  "prefix", "twoptr", "window", "fastslow", "reverse", "mono", "topk", "intervals",
  "rotated", "traverse", "dfs", "bfs", "flood", "permute", "dp",
];

export type PatternWords = Dict["live"]["patterns"];

/** The same colours as the Algorithms pictures. */
export type Role = "plain" | "compare" | "sorted" | "pivot" | "key" | "min" | "idle";

/** A row of cells: pointers name an index each, and `range` is the part being worked on. */
export type Cells = { label?: string; vals: (number | string)[]; roles?: Role[]; ptrs?: Record<string, number>; range?: [number, number] };
export type Ask = { q: string; options: string[]; answer: number };
/** A node of a binary tree, its children as indices into the same list (−1: none). */
export type TreeNode = { val: number; left: number; right: number };

export type Frame = {
  note: string;
  then?: string;
  ask?: Ask;
  cells?: Cells;
  /** Stacks, heaps, answers and the like, under the picture. */
  rows?: Cells[];
  /** A linked list: node i points at next[i] (−1: nothing). */
  list?: { vals: number[]; next: number[]; roles: Role[]; ptrs: Record<string, number> };
  /** The trace's tree, coloured. */
  tree?: { roles: Role[] };
  grid?: { vals: number[][]; roles: Role[][] };
  /** Intervals on a number line, a row of them per entry. */
  spans?: { label: string; items: [number, number][]; roles: Role[] }[];
};

export type Trace = { frames: Frame[]; answer: string; tree?: TreeNode[] };

/** The inputs of one pattern: `data` is the array (or tree, grid, list…) and `extra` its other input. */
export type PatternInput = { data: string; extra: string };

export const PATTERN_EXAMPLES: Record<PatternId, PatternInput> = {
  prefix: { data: "1, 2, 3, 4, 5, 6", extra: "1, 3" },
  twoptr: { data: "1, 2, 3, 4, 6", extra: "6" },
  window: { data: "2, 1, 5, 1, 3, 2", extra: "3" },
  fastslow: { data: "3, 2, 0, -4", extra: "1" },
  reverse: { data: "1, 2, 3, 4, 5", extra: "2, 4" },
  mono: { data: "2, 1, 2, 4, 3", extra: "" },
  topk: { data: "3, 2, 1, 5, 6, 4", extra: "2" },
  intervals: { data: "[1, 3], [2, 6], [8, 10], [15, 18]", extra: "" },
  rotated: { data: "4, 5, 6, 7, 0, 1, 2", extra: "0" },
  traverse: { data: "1, null, 2, 3", extra: "in" },
  dfs: { data: "1, 2, 3, null, 5", extra: "" },
  bfs: { data: "3, 9, 20, null, null, 15, 7", extra: "" },
  flood: { data: "1 1 1; 1 1 0; 1 0 1", extra: "1, 1, 2" },
  permute: { data: "1, 2, 3", extra: "" },
  dp: { data: "", extra: "5" },
};

/** Which patterns read `data` as what, for the editor. */
export const PATTERN_DATA: Record<PatternId, "nums" | "list" | "intervals" | "tree" | "grid" | "none"> = {
  prefix: "nums", twoptr: "nums", window: "nums", fastslow: "list", reverse: "list", mono: "nums", topk: "nums",
  intervals: "intervals", rotated: "nums", traverse: "tree", dfs: "tree", bfs: "tree", flood: "grid", permute: "nums", dp: "none",
};

export const TRAVERSALS = ["pre", "in", "post"] as const;
export type Traversal = (typeof TRAVERSALS)[number];

export const MAX_CELLS = 12;
export const MAX_TREE = 15;
export const MAX_GRID = 6;
export const MAX_DP = 20;
export const PERMUTE_MAX = 4;

// ——— Reading the inputs ———

const minus = (s: string) => s.replace(/[−–—]/g, "-");
const show = (v: number) => (v < 0 ? `−${-v}` : String(v));

export function parseList(s: string, w: PatternWords, max = MAX_CELLS): number[] {
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) throw new Error(w.errors.empty);
  const vals = parts.map((p) => {
    const v = Number(p);
    if (!Number.isFinite(v)) throw new Error(fill(w.errors.number, { s: p }));
    return v;
  });
  if (vals.length > max) throw new Error(fill(w.errors.tooMany, { n: max }));
  return vals;
}

/** Whole numbers, as many as `count` (with the words to say which). */
function parseInts(s: string, w: PatternWords, count: number): number[] {
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  const vals = parts.map(Number);
  if (vals.length !== count || !vals.every(Number.isInteger)) throw new Error(fill(w.errors.whole, { n: count, s: s.trim() || "…" }));
  return vals;
}

/** "[1, 3], [2, 6]" or "1-3, 2-6" or "1 3; 2 6". */
export function parseIntervals(s: string, w: PatternWords): [number, number][] {
  const t = s.replace(/[−–—]/g, "-");
  let pairs: string[][];
  if (t.includes("[")) pairs = [...t.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(/[,\s]+/).filter(Boolean));
  else pairs = t.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((p) => p.match(/^(-?[\d.]+)\s*(?:-|\s)\s*(-?[\d.]+)$/)?.slice(1) ?? [p]);
  if (!pairs.length) throw new Error(w.errors.empty);
  const out = pairs.map((p): [number, number] => {
    const [a, b] = p.map(Number);
    if (p.length !== 2 || !Number.isFinite(a) || !Number.isFinite(b) || a > b) throw new Error(fill(w.errors.interval, { s: p.join(", ") }));
    return [a, b];
  });
  if (out.length > 8) throw new Error(fill(w.errors.tooMany, { n: 8 }));
  return out;
}

/** A binary tree written level by level, as LeetCode writes it: "1, null, 2, 3". */
export function parseTree(s: string, w: PatternWords): TreeNode[] {
  const parts = minus(s).split(/[,;\s]+/).filter(Boolean);
  if (!parts.length || /^(null|-|#)$/i.test(parts[0])) throw new Error(w.errors.empty);
  const vals = parts.map((p) => {
    if (/^(null|-|#)$/i.test(p)) return null;
    const v = Number(p);
    if (!Number.isFinite(v)) throw new Error(fill(w.errors.number, { s: p }));
    return v;
  });
  const nodes: TreeNode[] = [{ val: vals[0]!, left: -1, right: -1 }];
  const queue = [0];
  let i = 1;
  while (queue.length && i < vals.length) {
    const at = queue.shift()!;
    for (const side of ["left", "right"] as const) {
      if (i >= vals.length) break;
      const v = vals[i++];
      if (v === null) continue;
      nodes.push({ val: v, left: -1, right: -1 });
      nodes[at][side] = nodes.length - 1;
      queue.push(nodes.length - 1);
    }
  }
  if (nodes.length > MAX_TREE) throw new Error(fill(w.errors.tooMany, { n: MAX_TREE }));
  if (treeDepth(nodes) > 4) throw new Error(w.errors.deep);
  return nodes;
}

/** How many levels the tree has. */
export function treeDepth(nodes: TreeNode[], at = 0): number {
  return at < 0 || !nodes.length ? 0 : 1 + Math.max(treeDepth(nodes, nodes[at].left), treeDepth(nodes, nodes[at].right));
}

/** The tree written level by level again, without the nulls at the end; `skip` leaves out a node and all below it. */
export function writeTree(nodes: TreeNode[], skip = -1): string {
  if (!nodes.length || skip === 0) return "";
  const out: string[] = [];
  const queue: number[] = [0];
  while (queue.length) {
    const at = queue.shift()!;
    if (at < 0 || at === skip) {
      out.push("null");
      continue;
    }
    out.push(String(nodes[at].val));
    queue.push(nodes[at].left, nodes[at].right);
  }
  while (out[out.length - 1] === "null") out.pop();
  return out.join(", ");
}

/** Rows split by ";" or new lines, numbers by commas or spaces; every row as long as the first. */
export function parseGrid(s: string, w: PatternWords): number[][] {
  const rows = s.split(/[;\n]/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[,\s]+/).map(Number));
  if (!rows.length) throw new Error(w.errors.empty);
  if (rows.length > MAX_GRID || rows[0].length > MAX_GRID) throw new Error(fill(w.errors.gridSize, { n: MAX_GRID }));
  if (!rows.every((r) => r.length === rows[0].length && r.every((v) => Number.isInteger(v) && v >= 0 && v <= 9))) throw new Error(w.errors.grid);
  return rows;
}

export const writeGrid = (g: number[][]) => g.map((r) => r.join(" ")).join("; ");

// ——— Building frames ———

const rolesOf = (n: number, f: (i: number) => Role): Role[] => Array.from({ length: n }, (_, i) => f(i));
const listText = (a: (number | string)[]) => `[${a.map((v) => (typeof v === "number" ? show(v) : v)).join(", ")}]`;

/** Numbers to choose from: the right one and some near misses, smallest first, no repeats. */
function numberAsk(q: string, right: number, wrong: number[]): Ask {
  const all = [...new Set([right, ...wrong])].sort((a, b) => a - b);
  return { q, options: all.map(show), answer: all.indexOf(right) };
}

export function patternTrace(id: PatternId, input: PatternInput, w: PatternWords): Trace {
  switch (id) {
    case "prefix":
      return prefix(parseList(input.data, w), input.extra, w);
    case "twoptr":
      return twoPointers(parseList(input.data, w), input.extra, w);
    case "window":
      return slidingWindow(parseList(input.data, w), input.extra, w);
    case "fastslow":
      return fastSlow(parseList(input.data, w), input.extra, w);
    case "reverse":
      return reverse(parseList(input.data, w), input.extra, w);
    case "mono":
      return monoStack(parseList(input.data, w), w);
    case "topk":
      return topK(parseList(input.data, w), input.extra, w);
    case "intervals":
      return intervals(parseIntervals(input.data, w), w);
    case "rotated":
      return rotated(parseList(input.data, w), input.extra, w);
    case "traverse":
      return traverse(parseTree(input.data, w), (TRAVERSALS as readonly string[]).includes(input.extra) ? (input.extra as Traversal) : "in", w);
    case "dfs":
      return dfs(parseTree(input.data, w), w);
    case "bfs":
      return bfs(parseTree(input.data, w), w);
    case "flood":
      return flood(parseGrid(input.data, w), input.extra, w);
    case "permute":
      return permute(parseList(input.data, w, PERMUTE_MAX), w);
    case "dp":
      return fibonacci(input.extra, w);
  }
}

// 1. Prefix sums: P[k] is the sum of the first k numbers, so the sum from i to j is P[j + 1] − P[i].
function prefix(a: number[], extra: string, w: PatternWords): Trace {
  const n = a.length;
  const [i, j] = parseInts(extra, w, 2);
  if (i < 0 || j >= n || i > j) throw new Error(fill(w.errors.range, { n: n - 1 }));
  const p = w.prefix;
  const P = [0];
  const frames: Frame[] = [{ note: p.start, cells: { vals: a }, rows: [{ label: "P", vals: [0], roles: ["key"] }] }];
  for (let k = 0; k < n; k++) {
    P.push(P[k] + a[k]);
    frames.push({
      note: fill(p.add, { k: k + 1, prev: show(P[k]), a: show(a[k]), s: show(P[k + 1]) }),
      cells: { vals: a, roles: rolesOf(n, (x) => (x === k ? "key" : x < k ? "sorted" : "plain")) },
      rows: [{ label: "P", vals: P.slice(), roles: rolesOf(k + 2, (x) => (x === k + 1 ? "key" : x === k ? "compare" : "plain")) }],
    });
  }
  const sum = P[j + 1] - P[i];
  // The right rule and two off by one, in an order that changes with the range.
  const rules = [`P[${j + 1}] − P[${i}]`, `P[${j}] − P[${i}]`, `P[${j + 1}] − P[${i + 1}]`];
  const turn = (i + j) % 3;
  const options = [...rules.slice(turn), ...rules.slice(0, turn)];
  frames.push({
    note: fill(p.query, { i, j }),
    then: fill(p.rule, { i, j, j1: j + 1 }),
    ask: { q: fill(p.ask, { i, j }), options, answer: options.indexOf(rules[0]) },
    cells: { vals: a, roles: rolesOf(n, (x) => (x >= i && x <= j ? "key" : "plain")), range: [i, j] },
    rows: [{ label: "P", vals: P, roles: rolesOf(n + 1, () => "plain") }],
  });
  frames.push({
    note: fill(p.result, { i, j, j1: j + 1, a: show(P[j + 1]), b: show(P[i]), s: show(sum), n: j - i + 1 }),
    cells: { vals: a, roles: rolesOf(n, (x) => (x >= i && x <= j ? "sorted" : "idle")), range: [i, j] },
    rows: [{ label: "P", vals: P, roles: rolesOf(n + 1, (x) => (x === j + 1 ? "sorted" : x === i ? "min" : "plain")) }],
  });
  return { frames, answer: fill(p.answer, { i, j, s: show(sum) }) };
}

// 2. Two pointers on a sorted array: a sum too small moves the left pointer on, too big moves the right one back.
function twoPointers(input: number[], extra: string, w: PatternWords): Trace {
  const t = parseList(extra, w, 1)[0];
  const p = w.twoptr;
  const a = input.slice().sort((x, y) => x - y);
  const n = a.length;
  const sorted = a.every((v, i) => v === input[i]);
  const frames: Frame[] = [{ note: sorted ? fill(p.start, { t: show(t) }) : fill(p.sortedFirst, { t: show(t) }), cells: { vals: a, ptrs: { L: 0, R: n - 1 } } }];
  const options = [p.moveL, p.found, p.moveR];
  let [l, r] = [0, n - 1];
  let answer = fill(p.none, { t: show(t) });
  while (l < r) {
    const s = a[l] + a[r];
    const roles = rolesOf(n, (i) => (i === l || i === r ? "compare" : i < l || i > r ? "idle" : "plain"));
    const note = fill(p.sum, { x: show(a[l]), y: show(a[r]), s: show(s), t: show(t) });
    const pick = s < t ? 0 : s === t ? 1 : 2;
    frames.push({ note, then: [p.less, p.equal, p.more][pick], ask: { q: p.ask, options, answer: pick }, cells: { vals: a, roles, ptrs: { L: l, R: r } } });
    if (s === t) {
      answer = fill(p.answer, { x: show(a[l]), y: show(a[r]), i: l, j: r });
      frames.push({ note: answer, cells: { vals: a, roles: rolesOf(n, (i) => (i === l || i === r ? "sorted" : "idle")), ptrs: { L: l, R: r } } });
      return { frames, answer };
    }
    if (s < t) l++;
    else r--;
  }
  frames.push({ note: answer, cells: { vals: a, roles: rolesOf(n, () => "idle"), ptrs: { L: l, R: r } } });
  return { frames, answer };
}

// 3. A sliding window of k: one number comes in on the right and one goes out on the left.
function slidingWindow(a: number[], extra: string, w: PatternWords): Trace {
  const n = a.length;
  const k = parseInts(extra, w, 1)[0];
  if (k < 1 || k > n) throw new Error(fill(w.errors.k, { n }));
  const p = w.window;
  let s = a.slice(0, k).reduce((x, y) => x + y, 0);
  let best = { i: 0, s };
  const at = (i: number, entering: boolean): Cells => ({
    vals: a,
    roles: rolesOf(n, (j) => (j >= i && j < i + k ? (entering && j === i + k - 1 ? "compare" : "key") : j === i - 1 && entering ? "idle" : "plain")),
    range: [i, i + k - 1],
  });
  const frames: Frame[] = [];
  for (let i = 0; i + k <= n; i++) {
    if (i > 0) {
      const s0 = s;
      s += a[i + k - 1] - a[i - 1];
      if (s > best.s) best = { i, s };
      frames[frames.length - 1].then = fill(p.slide, { s: show(s0), out: show(a[i - 1]), in: show(a[i + k - 1]), r: show(s) });
      frames[frames.length - 1].ask = numberAsk(p.ask, s, [s0 + a[i + k - 1], s0 - a[i + k - 1] + a[i - 1], s0 - a[i - 1]]);
    }
    frames.push({ note: fill(i ? p.sum : p.first, { s: show(s), b: show(best.s), k }), cells: at(i, i > 0) });
  }
  const answer = fill(p.answer, { k, i: best.i, j: best.i + k - 1, s: show(best.s) });
  frames.push({ note: answer, cells: { vals: a, roles: rolesOf(n, (j) => (j >= best.i && j < best.i + k ? "sorted" : "idle")), range: [best.i, best.i + k - 1] } });
  return { frames, answer };
}

// 4. Fast and slow pointers: in a loop the fast one gains a node a move and catches the slow one up.
function fastSlow(vals: number[], extra: string, w: PatternWords): Trace {
  const n = vals.length;
  const pos = parseInts(extra, w, 1)[0];
  if (pos < -1 || pos >= n) throw new Error(fill(w.errors.pos, { n: n - 1 }));
  const p = w.fastslow;
  const next = vals.map((_, i) => (i < n - 1 ? i + 1 : pos));
  const listAt = (ptrs: Record<string, number>, roles: (i: number) => Role = () => "plain") => ({ vals, next, roles: rolesOf(n, roles), ptrs });
  const frames: Frame[] = [{ note: pos < 0 ? p.startNone : fill(p.start, { v: show(vals[pos]) }), list: listAt({ S: 0, F: 0 }) }];
  let [s, f] = [0, 0];
  for (;;) {
    const f1 = next[f];
    const f2 = f1 < 0 ? -1 : next[f1];
    if (f2 < 0) {
      const answer = p.noCycle;
      frames[frames.length - 1].then = p.endThen;
      frames.push({ note: answer, list: listAt({ S: s, ...(f1 < 0 ? { F: f } : { F: f1 }) }, () => "idle") });
      return { frames, answer };
    }
    s = next[s];
    f = f2;
    frames[frames.length - 1].then = p.moveThen;
    const met = s === f;
    frames.push({ note: met ? fill(p.met, { v: show(vals[s]) }) : fill(p.move, { s: show(vals[s]), f: show(vals[f]) }), list: listAt({ S: s, F: f }, (i) => (met && i === s ? "sorted" : "plain")) });
    if (met) break;
  }
  // Then one pointer from the start and one from where they met, a node a move each: they meet where the loop begins.
  let h = 0;
  frames[frames.length - 1].then = p.phase2;
  while (h !== s) {
    h = next[h];
    s = next[s];
    frames.push({ note: h === s ? fill(p.entry, { v: show(vals[h]), i: h }) : fill(p.walk, { h: show(vals[h]), s: show(vals[s]) }), list: listAt({ H: h, S: s }, (i) => (h === s && i === h ? "sorted" : "plain")) });
  }
  if (frames[frames.length - 1].list!.ptrs.H === undefined) frames.push({ note: fill(p.entry, { v: show(vals[h]), i: h }), list: listAt({ H: h, S: s }, (i) => (i === h ? "sorted" : "plain")) });
  return { frames, answer: fill(p.answer, { v: show(vals[h]), i: h }) };
}

// 5. Reversing positions m to n of a linked list in place: each node in turn is pointed back at the one before.
function reverse(vals: number[], extra: string, w: PatternWords): Trace {
  const len = vals.length;
  const [m, n] = parseInts(extra, w, 2);
  if (m < 1 || n > len || m > n) throw new Error(fill(w.errors.mn, { n: len }));
  const p = w.reverse;
  const next = vals.map((_, i) => (i < len - 1 ? i + 1 : -1));
  const [lo, hi] = [m - 1, n - 1];
  const before = lo - 1;
  const roles = (done: number) => rolesOf(len, (i) => (i >= lo && i <= hi ? (i < done ? "sorted" : "key") : "plain"));
  const at = (ptrs: Record<string, number>, done: number) => ({ vals, next: next.slice(), roles: roles(done), ptrs });
  const named = (ptrs: Record<string, number>) => Object.fromEntries(Object.entries(ptrs).filter(([, v]) => v >= 0));
  // prev starts at the node after the part, so each reversed node points straight at the rest of the list.
  let prev = next[hi];
  const frames: Frame[] = [{ note: fill(p.start, { m, n }), list: at(named({ B: before, prev, cur: lo }), lo) }];
  for (let cur = lo; cur <= hi; cur++) {
    const after = next[cur];
    frames[frames.length - 1].then = fill(p.flipThen, { c: show(vals[cur]) });
    next[cur] = prev;
    frames.push({
      note: prev < 0 ? fill(p.flipNull, { c: show(vals[cur]) }) : fill(p.flip, { c: show(vals[cur]), p: show(vals[prev]) }),
      list: at(named({ B: before, prev: cur, cur: after }), cur + 1),
    });
    prev = cur;
  }
  const head = before >= 0 ? 0 : hi;
  if (before >= 0) {
    frames[frames.length - 1].then = fill(p.joinThen, { b: show(vals[before]), h: show(vals[hi]) });
    next[before] = hi;
    frames.push({ note: fill(p.join, { b: show(vals[before]), h: show(vals[hi]) }), list: at(named({ B: before }), len) });
  }
  const order: number[] = [];
  for (let i = head, guard = 0; i >= 0 && guard <= len; i = next[i], guard++) order.push(vals[i]);
  const answer = fill(p.answer, { list: listText(order) });
  // Last, the list as it now reads, from the head.
  frames.push({ note: answer, list: { vals: order, next: order.map((_, i) => (i < len - 1 ? i + 1 : -1)), roles: rolesOf(len, (i) => (i >= lo && i <= hi ? "sorted" : "plain")), ptrs: { head: 0 } } });
  return { frames, answer };
}

// 6. A monotonic stack: indices wait on the stack until a bigger number comes, which is their next greater element.
function monoStack(a: number[], w: PatternWords): Trace {
  const n = a.length;
  const p = w.mono;
  const ans: (number | string)[] = Array(n).fill("?");
  const stack: number[] = [];
  const rows = (top: Role = "plain"): Cells[] => [
    { label: p.stack, vals: stack.map((i) => a[i]), roles: stack.map((_, k) => (k === stack.length - 1 ? top : "plain")) },
    { label: p.result, vals: ans.slice(), roles: ans.map((v) => (v === "?" ? "idle" : "sorted")) },
  ];
  const cellsAt = (i: number): Cells => ({ vals: a, roles: rolesOf(n, (j) => (j === i ? "key" : stack.includes(j) ? "compare" : j < i ? "sorted" : "plain")), ptrs: i < n ? { i } : {} });
  const frames: Frame[] = [{ note: p.start, cells: cellsAt(-1), rows: rows() }];
  const options = [p.pop, p.push];
  for (let i = 0; i < n; i++) {
    for (;;) {
      const top = stack[stack.length - 1];
      const pop = top !== undefined && a[i] > a[top];
      frames.push({
        note: top === undefined ? fill(p.empty, { v: show(a[i]) }) : fill(p.compare, { v: show(a[i]), t: show(a[top]) }),
        then: pop ? fill(p.popThen, { v: show(a[i]), t: show(a[top]) }) : fill(p.pushThen, { v: show(a[i]) }),
        ask: top === undefined ? undefined : { q: p.ask, options, answer: pop ? 0 : 1 },
        cells: cellsAt(i),
        rows: rows("compare"),
      });
      if (!pop) break;
      ans[stack.pop()!] = a[i];
    }
    stack.push(i);
  }
  for (const i of stack) ans[i] = -1;
  stack.length = 0;
  const answer = fill(p.answer, { list: listText(ans) });
  frames.push({ note: fill(p.left, { list: listText(ans) }), cells: cellsAt(n), rows: rows() });
  return { frames, answer };
}

// 7. The top k with a min-heap of size k: its top is the smallest of the k largest so far, the k-th largest.
function topK(a: number[], extra: string, w: PatternWords): Trace {
  const n = a.length;
  const k = parseInts(extra, w, 1)[0];
  if (k < 1 || k > n) throw new Error(fill(w.errors.k, { n }));
  const p = w.topk;
  // Kept smallest first: what a min-heap gives back one at a time, its top on the left.
  const heap: number[] = [];
  const rows = (top: Role = "pivot"): Cells[] => [{ label: p.heap, vals: heap.slice(), roles: heap.map((_, j) => (j === 0 ? top : "plain")) }];
  const cellsAt = (i: number): Cells => ({ vals: a, roles: rolesOf(n, (j) => (j === i ? "key" : j < i ? "idle" : "plain")), ptrs: i < n ? { i } : {} });
  const frames: Frame[] = [{ note: fill(p.start, { k }), cells: cellsAt(-1), rows: rows() }];
  const options = [p.replace, p.skip];
  for (let i = 0; i < n; i++) {
    const x = a[i];
    if (heap.length < k) {
      frames.push({ note: fill(p.room, { v: show(x), n: heap.length, k }), then: fill(p.pushThen, { v: show(x) }), cells: cellsAt(i), rows: rows() });
      heap.push(x);
    } else {
      const top = heap[0];
      const swap = x > top;
      frames.push({
        note: fill(p.full, { v: show(x), t: show(top) }),
        then: swap ? fill(p.replaceThen, { v: show(x), t: show(top) }) : fill(p.skipThen, { v: show(x), t: show(top) }),
        ask: { q: p.ask, options, answer: swap ? 0 : 1 },
        cells: cellsAt(i),
        rows: rows("compare"),
      });
      if (swap) heap.splice(0, 1, x);
    }
    heap.sort((x1, y1) => x1 - y1);
  }
  const answer = fill(p.answer, { k, v: show(heap[0]) });
  frames.push({ note: answer, cells: cellsAt(n), rows: [{ label: p.heap, vals: heap.slice(), roles: heap.map((_, j) => (j === 0 ? "sorted" : "plain")) }] });
  return { frames, answer };
}

// 8. Overlapping intervals: sorted by start, each one either stretches the last merged interval or starts a new one.
function intervals(input: [number, number][], w: PatternWords): Trace {
  const p = w.intervals;
  const items = input.slice().sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const sorted = items.every((v, i) => v === input[i]);
  const merged: [number, number][] = [];
  const at = (i: number, last: Role = "plain") => [
    { label: p.sorted, items, roles: rolesOf(items.length, (j) => (j === i ? "key" : j < i ? "idle" : "plain")) },
    { label: p.merged, items: merged.map((m) => [...m] as [number, number]), roles: merged.map((_, j) => (j === merged.length - 1 ? last : "sorted")) },
  ];
  const frames: Frame[] = [{ note: sorted ? p.start : p.sortFirst, spans: at(-1) }];
  const options = [p.merge, p.newOne];
  const iv = (x: [number, number]) => `[${show(x[0])}, ${show(x[1])}]`;
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    const last = merged[merged.length - 1];
    if (!last) {
      frames.push({ note: fill(p.first, { a: iv(cur) }), then: p.firstThen, spans: at(i) });
      merged.push([...cur]);
      continue;
    }
    const overlap = cur[0] <= last[1];
    const grown: [number, number] = [last[0], Math.max(last[1], cur[1])];
    frames.push({
      note: fill(p.compare, { a: iv(cur), b: iv(last) }),
      then: overlap ? fill(p.mergeThen, { s: show(cur[0]), e: show(last[1]), r: iv(grown) }) : fill(p.newThen, { s: show(cur[0]), e: show(last[1]) }),
      ask: { q: p.ask, options, answer: overlap ? 0 : 1 },
      spans: at(i, "compare"),
    });
    if (overlap) last[1] = grown[1];
    else merged.push([...cur]);
  }
  const answer = fill(p.answer, { list: `[${merged.map(iv).join(", ")}]` });
  frames.push({ note: answer, spans: at(items.length) });
  return { frames, answer };
}

// 9. Binary search on a rotated sorted array: one half of every range is in order, and the target is in it or not.
function rotated(a: number[], extra: string, w: PatternWords): Trace {
  const n = a.length;
  const t = parseList(extra, w, 1)[0];
  const p = w.rotated;
  const drops = a.filter((v, i) => i > 0 && v <= a[i - 1]).length;
  if (new Set(a).size !== n || drops > 1 || (drops === 1 && a[n - 1] >= a[0])) throw new Error(p.notRotated);
  const options = [p.left, p.found, p.right];
  const frames: Frame[] = [{ note: fill(p.start, { t: show(t) }), cells: { vals: a, ptrs: { lo: 0, hi: n - 1 }, range: [0, n - 1] } }];
  let [lo, hi] = [0, n - 1];
  let answer = fill(p.none, { t: show(t) });
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const roles = rolesOf(n, (i) => (i === mid ? "compare" : i < lo || i > hi ? "idle" : "plain"));
    const cells = { vals: a, roles, ptrs: { lo, mid, hi }, range: [lo, hi] as [number, number] };
    if (a[mid] === t) {
      frames.push({ note: fill(p.mid, { m: mid, v: show(a[mid]) }), then: fill(p.hit, { t: show(t) }), ask: { q: p.ask, options, answer: 1 }, cells });
      answer = fill(p.answer, { t: show(t), i: mid });
      frames.push({ note: answer, cells: { ...cells, roles: rolesOf(n, (i) => (i === mid ? "sorted" : "idle")) } });
      return { frames, answer };
    }
    const leftSorted = a[lo] <= a[mid];
    const goLeft = leftSorted ? a[lo] <= t && t < a[mid] : !(a[mid] < t && t <= a[hi]);
    const half = leftSorted ? fill(p.leftSorted, { x: show(a[lo]), y: show(a[mid]) }) : fill(p.rightSorted, { x: show(a[mid]), y: show(a[hi]) });
    const inSorted = leftSorted === goLeft;
    frames.push({
      note: `${fill(p.mid, { m: mid, v: show(a[mid]) })} ${half}`,
      then: fill(inSorted ? p.inside : p.outside, { t: show(t) }) + " " + (goLeft ? fill(p.goLeft, { h: mid - 1 }) : fill(p.goRight, { l: mid + 1 })),
      ask: { q: p.ask, options, answer: goLeft ? 0 : 2 },
      cells,
    });
    if (goLeft) hi = mid - 1;
    else lo = mid + 1;
  }
  frames.push({ note: answer, cells: { vals: a, roles: rolesOf(n, () => "idle") } });
  return { frames, answer };
}

// 10. Tree traversals: pre-order writes a node before its subtrees, in-order between them, post-order after them.
function traverse(nodes: TreeNode[], order: Traversal, w: PatternWords): Trace {
  const p = w.traverse;
  const seq: number[] = [];
  const walk = (at: number) => {
    if (at < 0) return;
    if (order === "pre") seq.push(at);
    walk(nodes[at].left);
    if (order === "in") seq.push(at);
    walk(nodes[at].right);
    if (order === "post") seq.push(at);
  };
  walk(0);
  const out = (k: number): Cells => ({ label: p.out, vals: seq.slice(0, k).map((i) => nodes[i].val), roles: rolesOf(k, (j) => (j === k - 1 ? "key" : "sorted")) });
  const frames: Frame[] = [];
  for (let k = 0; k <= seq.length; k++) {
    const next = seq[k];
    // The node to write next and two that might be mistaken for it, in the order of the tree.
    const asked: number[] = [];
    for (const i of seq.slice(k)) if (asked.length < 3 && !asked.some((j) => nodes[j].val === nodes[i].val)) asked.push(i);
    asked.sort((x, y) => x - y);
    frames.push({
      note: k === 0 ? p.rules[order] : k === seq.length ? fill(p.answer, { list: listText(seq.map((i) => nodes[i].val)) }) : fill(p.wrote, { v: show(nodes[seq[k - 1]].val) }),
      then: next === undefined ? undefined : fill(p.nextThen, { v: show(nodes[next].val) }),
      ask: asked.length > 1 ? { q: p.ask, options: asked.map((i) => show(nodes[i].val)), answer: asked.indexOf(next) } : undefined,
      tree: { roles: nodes.map((_, i) => (k > 0 && i === seq[k - 1] ? "key" : seq.slice(0, k).includes(i) ? "sorted" : "plain")) },
      rows: [out(k)],
    });
  }
  return { frames, answer: fill(p.answer, { list: listText(seq.map((i) => nodes[i].val)) }), tree: nodes };
}

// 11. Depth-first search: go down one branch to a leaf, write the path, then back up to the last branch not tried.
function dfs(nodes: TreeNode[], w: PatternWords): Trace {
  const p = w.dfs;
  const paths: string[] = [];
  const frames: Frame[] = [];
  const path: number[] = [];
  const row = (): Cells[] => [
    { label: p.path, vals: path.map((i) => nodes[i].val), roles: path.map((_, j) => (j === path.length - 1 ? "key" : "compare")) },
    { label: p.found, vals: paths.slice(), roles: paths.map(() => "sorted") },
  ];
  const seen = new Set<number>();
  const roles = (): Role[] => nodes.map((_, i) => (i === path[path.length - 1] ? "key" : path.includes(i) ? "compare" : seen.has(i) ? "idle" : "plain"));
  const go = (at: number) => {
    path.push(at);
    seen.add(at);
    const { left, right, val } = nodes[at];
    const leaf = left < 0 && right < 0;
    if (leaf) paths.push(path.map((i) => show(nodes[i].val)).join("→"));
    frames.push({ note: leaf ? fill(p.leaf, { v: show(val), path: paths[paths.length - 1] }) : fill(p.down, { v: show(val) }), tree: { roles: roles() }, rows: row() });
    if (left >= 0) go(left);
    if (right >= 0) go(right);
    path.pop();
    if (path.length) frames.push({ note: fill(p.back, { v: show(nodes[path[path.length - 1]].val) }), tree: { roles: roles() }, rows: row() });
  };
  go(0);
  const answer = fill(p.answer, { n: paths.length, list: paths.join(", ") });
  frames.push({ note: answer, tree: { roles: nodes.map((n) => (n.left < 0 && n.right < 0 ? "sorted" : "plain")) }, rows: row() });
  return { frames, answer, tree: nodes };
}

// 12. Breadth-first search: a queue takes the tree a level at a time.
function bfs(nodes: TreeNode[], w: PatternWords): Trace {
  const p = w.bfs;
  const levels: number[][] = [];
  const done = new Set<number>();
  let queue = [0];
  const rows = (cur: number[]): Cells[] => [
    { label: p.queue, vals: queue.map((i) => nodes[i].val), roles: queue.map((i) => (cur.includes(i) ? "key" : "compare")) },
    { label: p.levels, vals: levels.map((l) => listText(l.map((i) => nodes[i].val))), roles: levels.map(() => "sorted") },
  ];
  const roles = (cur: number[]): Role[] => nodes.map((_, i) => (cur.includes(i) ? "key" : queue.includes(i) ? "compare" : done.has(i) ? "sorted" : "plain"));
  const frames: Frame[] = [{ note: p.start, then: p.startThen, tree: { roles: roles([]) }, rows: rows([]) }];
  while (queue.length) {
    const level = queue.slice();
    frames.push({ note: fill(p.level, { n: levels.length + 1, list: listText(level.map((i) => nodes[i].val)) }), then: p.levelThen, tree: { roles: roles(level) }, rows: rows(level) });
    const nextQ = level.flatMap((i) => [nodes[i].left, nodes[i].right].filter((c) => c >= 0));
    levels.push(level);
    level.forEach((i) => done.add(i));
    queue = nextQ;
  }
  const answer = fill(p.answer, { list: `[${levels.map((l) => listText(l.map((i) => nodes[i].val))).join(", ")}]` });
  frames.push({ note: answer, tree: { roles: roles([]) }, rows: rows([]) });
  return { frames, answer, tree: nodes };
}

// 13. Flood fill: from one square, paint it and every square of the same colour joined to it, through a queue.
function flood(g0: number[][], extra: string, w: PatternWords): Trace {
  const p = w.flood;
  const [r0, c0, color] = parseInts(extra, w, 3);
  const R = g0.length;
  const C = g0[0].length;
  if (r0 < 0 || r0 >= R || c0 < 0 || c0 >= C) throw new Error(fill(w.errors.cell, { r: R - 1, c: C - 1 }));
  if (color < 0 || color > 9) throw new Error(w.errors.grid);
  const g = g0.map((r) => r.slice());
  const old = g[r0][c0];
  const queued = new Set<string>();
  const painted = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const at = (cur: string) => ({ vals: g.map((r) => r.slice()), roles: g.map((row, r) => row.map((_, c): Role => (key(r, c) === cur ? "key" : queued.has(key(r, c)) ? "compare" : painted.has(key(r, c)) ? "sorted" : "plain"))) });
  const frames: Frame[] = [{ note: fill(p.start, { r: r0, c: c0, old, color }), grid: at(key(r0, c0)) }];
  if (old === color) {
    const answer = fill(p.same, { color });
    frames.push({ note: answer, grid: at("") });
    return { frames, answer };
  }
  const queue: [number, number][] = [[r0, c0]];
  queued.add(key(r0, c0));
  while (queue.length) {
    const [r, c] = queue.shift()!;
    queued.delete(key(r, c));
    g[r][c] = color;
    painted.add(key(r, c));
    const added: string[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const [nr, nc] = [r + dr, c + dc];
      if (nr < 0 || nr >= R || nc < 0 || nc >= C || g[nr][nc] !== old || queued.has(key(nr, nc))) continue;
      queue.push([nr, nc]);
      queued.add(key(nr, nc));
      added.push(`(${nr}, ${nc})`);
    }
    frames.push({ note: fill(added.length ? p.paint : p.paintNone, { r, c, list: added.join(", ") }), grid: at(key(r, c)) });
  }
  const answer = fill(p.answer, { n: painted.size, color });
  frames.push({ note: answer, grid: at("") });
  return { frames, answer };
}

// 14. Backtracking: choose a number, go on with the rest, then take the choice back and try the next.
function permute(a: number[], w: PatternWords): Trace {
  const p = w.permute;
  const n = a.length;
  if (new Set(a).size !== n) throw new Error(p.distinct);
  const path: number[] = [];
  const used = Array(n).fill(false);
  const results: string[] = [];
  const at = (cur: number): Pick<Frame, "cells" | "rows"> => ({
    cells: { vals: a, roles: rolesOf(n, (i) => (i === cur ? "key" : used[i] ? "idle" : "plain")) },
    rows: [
      { label: p.path, vals: path.map((i) => a[i]), roles: path.map((_, j) => (j === path.length - 1 ? "key" : "compare")) },
      { label: p.found, vals: results.slice(), roles: results.map(() => "sorted") },
    ],
  });
  const frames: Frame[] = [{ note: p.start, ...at(-1) }];
  const go = () => {
    if (path.length === n) {
      results.push(path.map((i) => show(a[i])).join(""));
      frames.push({ note: fill(p.full, { list: listText(path.map((i) => a[i])), k: results.length }), ...at(-1) });
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(i);
      frames.push({ note: fill(p.choose, { v: show(a[i]) }), ...at(i) });
      go();
      path.pop();
      used[i] = false;
      frames.push({ note: fill(p.undo, { v: show(a[i]) }), ...at(-1) });
    }
  };
  go();
  const answer = fill(p.answer, { n: results.length });
  frames.push({ note: answer, ...at(-1) });
  return { frames, answer };
}

// 15. Dynamic programming: each Fibonacci number from the two before it, worked out once and kept in a table.
function fibonacci(extra: string, w: PatternWords): Trace {
  const p = w.dp;
  const n = parseInts(extra, w, 1)[0];
  if (n < 1 || n > MAX_DP) throw new Error(fill(w.errors.dp, { n: MAX_DP }));
  const dp: number[] = [0, 1];
  const cells = (k: number, roles: (i: number) => Role): Cells => ({
    vals: Array.from({ length: n + 1 }, (_, i) => (i < dp.length ? dp[i] : "")),
    roles: rolesOf(n + 1, roles),
    ptrs: k <= n ? { i: k } : {},
  });
  const frames: Frame[] = [{ note: p.start, cells: cells(1, (i) => (i <= 1 ? "sorted" : "idle")) }];
  for (let i = 2; i <= n; i++) {
    const v = dp[i - 1] + dp[i - 2];
    frames[frames.length - 1].then = fill(p.fillThen, { i, a: show(dp[i - 1]), b: show(dp[i - 2]), v: show(v) });
    frames[frames.length - 1].ask = numberAsk(fill(p.ask, { i }), v, [dp[i - 1] * 2, dp[i - 1] + 1, i]);
    dp.push(v);
    frames.push({ note: fill(p.filled, { i, v: show(v) }), cells: cells(i, (k) => (k === i ? "key" : k === i - 1 || k === i - 2 ? "compare" : k < i ? "sorted" : "idle")) });
  }
  const answer = fill(p.answer, { n, v: show(dp[n]), k: Math.max(0, n - 1) });
  frames.push({ note: answer, cells: cells(n + 1, (k) => (k === n ? "sorted" : "plain")) });
  return { frames, answer };
}
