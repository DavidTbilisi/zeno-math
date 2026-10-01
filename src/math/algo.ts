// Algorithms and data structures: step-by-step traces of sorting and searching, graph algorithms
// (BFS, DFS, Dijkstra, Prim, Kruskal, topological sort), binary search trees, AVL trees and heaps,
// stacks, queues and hash tables, dynamic programming tables with traceback, and complexity
// (the master theorem and growth rates), recursion and backtracking, and string matching.
// Every picture is one standalone SVG.
import type { RenderedSvg } from "./latex";
import { renderDp, renderDs, renderGrowth, renderSearch, renderSort } from "./algoArrays";
import { renderGraph, renderTree } from "./algoGraphs";
import { renderRecur } from "./algoRecur";
import { renderString } from "./algoStrings";

export type SortAlgo = "bubble" | "insertion" | "selection" | "merge" | "quick" | "heap" | "shell" | "counting";
export type SortView = "cells" | "bars";
export type SearchAlgo = "binary" | "linear" | "twoptr" | "window";
export type GraphAlgo = "bfs" | "dfs" | "dijkstra" | "bellman" | "floyd" | "prim" | "kruskal" | "unionfind" | "topo";
export type RecurProblem = "fib" | "fact" | "hanoi" | "queens" | "subsets";
export type StringAlgo = "naive" | "kmp" | "rk";
export type TreeKind = "bst" | "avl" | "minheap" | "maxheap";
export type DsKind = "stack" | "queue" | "chaining" | "probing";
export type DpProblem = "lcs" | "edit" | "knapsack" | "coins";
export type GrowthMode = "master" | "compare";

export const SORT_ALGOS: SortAlgo[] = ["bubble", "insertion", "selection", "shell", "merge", "quick", "heap", "counting"];
export const SORT_VIEWS: SortView[] = ["cells", "bars"];
export const SEARCH_ALGOS: SearchAlgo[] = ["binary", "linear", "twoptr", "window"];
export const GRAPH_ALGOS: GraphAlgo[] = ["bfs", "dfs", "dijkstra", "bellman", "floyd", "prim", "kruskal", "unionfind", "topo"];
export const RECUR_PROBLEMS: RecurProblem[] = ["fib", "fact", "hanoi", "queens", "subsets"];
export const STRING_ALGOS: StringAlgo[] = ["naive", "kmp", "rk"];
export const TREE_KINDS: TreeKind[] = ["bst", "avl", "minheap", "maxheap"];
export const DS_KINDS: DsKind[] = ["stack", "queue", "chaining", "probing"];
export const DP_PROBLEMS: DpProblem[] = ["lcs", "edit", "knapsack", "coins"];
export const GROWTH_MODES: GrowthMode[] = ["master", "compare"];

export type SortSpec = { topic: "sort"; algo: SortAlgo; data: string; view?: SortView; step?: number };
/** target: the value to find (binary, linear), the sum of the pair (two pointers) or the window size k. */
export type SearchSpec = { topic: "search"; algo: SearchAlgo; data: string; target: string; step?: number };
/** Edges like "A-B 4, B-C 2"; the weight is optional. */
export type GraphSpec = { topic: "graph"; algo: GraphAlgo; edges: string; directed: boolean; start: string; step?: number };
export type TreeSpec = { topic: "tree"; kind: TreeKind; data: string; step?: number };
/** Stack/queue: ops is "push 3, push 5, pop, peek". Hashing: ops is the keys, m the table size. */
export type DsSpec = { topic: "ds"; kind: DsKind; ops: string; m: string; step?: number };
/** lcs/edit: a, b are the strings · knapsack: a weights, b values, c capacity · coins: a coins, c amount. */
export type DpSpec = { topic: "dp"; problem: DpProblem; a: string; b: string; c: string; step?: number };
/** master: T(n) = a·T(n/b) + Θ(n^d) · compare: growth rates up to n. */
export type GrowthSpec = { topic: "growth"; mode: GrowthMode; a: string; b: string; d: string; n: string; step?: number };

/** n for fib / fact / hanoi / queens; data (the numbers) and target for subsets; memo for fib. */
export type RecurSpec = { topic: "recur"; problem: RecurProblem; n: string; memo: boolean; data: string; target: string; step?: number };
export type StringSpec = { topic: "string"; algo: StringAlgo; text: string; pattern: string; step?: number };

/** step: how many steps of the trace to show (the slider); missing means all of them. */
export type AlgoSpec = SortSpec | SearchSpec | GraphSpec | TreeSpec | DsSpec | DpSpec | GrowthSpec | RecurSpec | StringSpec;
export type AlgoTopic = AlgoSpec["topic"];
export type AlgoSpecOf<K extends AlgoTopic> = Extract<AlgoSpec, { topic: K }>;
export const ALGO_TOPICS: AlgoTopic[] = ["sort", "search", "graph", "tree", "ds", "dp", "recur", "string", "growth"];

export type AlgoWords = {
  badList: string;
  badNumber: string;
  tooMany: string;
  legend: { sorted: string; sortedPart: string; run: string; pivot: string; key: string; min: string; idle: string; compared: string; found: string; ruledOut: string; path: string; match: string; taken: string; siftPath: string; siftEnd: string };
  sortNames: Record<SortAlgo, string>;
  sortInfo: Record<SortAlgo, string>;
  start: string;
  pass: string;
  noSwaps: string;
  insert: string;
  select: string;
  split: string;
  merge: string;
  pivot: string;
  done: string;
  stats: { swaps: string; shifts: string; copies: string };
  searchNames: Record<SearchAlgo, string>;
  sortedFirst: string;
  found: string;
  notFound: string;
  binaryInfo: string;
  linearInfo: string;
  graphNames: Record<GraphAlgo, string>;
  graphInfo: Record<GraphAlgo, string>;
  badEdge: string;
  noNode: string;
  noEdges: string;
  negative: string;
  cycle: string;
  needDirected: string;
  undirectedOnly: string;
  unreachable: string;
  order: string;
  pathTo: string;
  mstTotal: string;
  topoOrder: string;
  cols: { step: string; visit: string; queue: string; stack: string; edge: string; weight: string; total: string; result: string; key: string; slot: string; probes: string; op: string; output: string };
  added: string;
  cycleSkip: string;
  treeNames: Record<TreeKind, string>;
  treeInfo: Record<TreeKind, string>;
  inorder: string;
  preorder: string;
  postorder: string;
  levelorder: string;
  duplicates: string;
  height: string;
  rotations: string;
  noRotations: string;
  heapBuilt: string;
  sift: string;
  dsNames: Record<DsKind, string>;
  dsInfo: Record<DsKind, string>;
  badOp: string;
  empty: string;
  top: string;
  front: string;
  back: string;
  outputs: string;
  hashStats: string;
  chainStats: string;
  full: string;
  dpNames: Record<DpProblem, string>;
  dpInfo: Record<DpProblem, string>;
  tooLong: string;
  lcsResult: string;
  editResult: string;
  editOps: { sub: string; ins: string; del: string };
  knapResult: string;
  knapNothing: string;
  coinResult: string;
  coinNone: string;
  greedy: string;
  greedyFails: string;
  greedyStuck: string;
  amount: string;
  coinsRow: string;
  lastCoin: string;
  master: { smaller: string; equal: string; larger: string };
  levelWork: string;
  leaves: string;
  growthHint: string;
  timeAt: string;
  units: { s: string; min: string; h: string; d: string; y: string };
  sortMore: { moved: string; heapBuild: string; heapMove: string; heapRoot: string; shellGap: string; gapGroup: string; countRange: string; countRow: string; countEnds: string; countPlace: string; countStats: string };
  searchMore: { pairFound: string; pairNone: string; twoptrInfo: string; windowSum: string; best: string; windowBest: string; windowInfo: string; window: string; entering: string; leaving: string };
  graphMore: { cols: { pass: string; sets: string }; check: string; negCycle: string; undirectedNegative: string; earlyStop: string; fwUpdates: string; sameSet: string; components: string };
  recur: {
    names: Record<RecurProblem, string>;
    info: Record<RecurProblem, string>;
    legend: { repeated: string; cached: string; base: string; move: string; found: string; pruned: string; deadEnd: string };
    cols: { action: string };
    calls: string;
    memoOn: string;
    memoOff: string;
    factInfo: string;
    hanoiMoves: string;
    place: string;
    backAfter: string;
    noSafe: string;
    more: string;
    queensStats: string;
    queensInfo: string;
    subsetsFound: string;
    subsetsNone: string;
    subsetsInfo: string;
  };
  str: {
    names: Record<StringAlgo, string>;
    info: Record<StringAlgo, string>;
    legend: { match: string; mismatch: string; known: string; skipped: string };
    cols: { shift: string; window: string };
    empty: string;
    tooLong: string;
    patLonger: string;
    shifts: string;
    matchAt: string;
    mismatch: string;
    kmpShift: string;
    kmpStep: string;
    known: string;
    piMeaning: string;
    match: string;
    spurious: string;
    rkStats: string;
    comps: string;
    compsNaive: string;
    found: string;
    notFound: string;
  };
};

export const ALGO_PRESETS: { [K in AlgoTopic]: { label: string; spec: AlgoSpecOf<K> }[] } = {
  sort: [
    { label: "Bubble · 5 1 4 2 8", spec: { topic: "sort", algo: "bubble", data: "5, 1, 4, 2, 8" } },
    { label: "Insertion · 12 11 13 5 6", spec: { topic: "sort", algo: "insertion", data: "12, 11, 13, 5, 6" } },
    { label: "Selection · 64 25 12 22 11", spec: { topic: "sort", algo: "selection", data: "64, 25, 12, 22, 11" } },
    { label: "Merge · 38 27 43 3 9 82 10", spec: { topic: "sort", algo: "merge", data: "38, 27, 43, 3, 9, 82, 10" } },
    { label: "Quick · 10 80 30 90 40 50 70", spec: { topic: "sort", algo: "quick", data: "10, 80, 30, 90, 40, 50, 70" } },
    { label: "Bubble · nearly sorted", spec: { topic: "sort", algo: "bubble", data: "1, 2, 3, 5, 4" } },
    { label: "Shell · 9 8 7 6 5 4 3 2 1", spec: { topic: "sort", algo: "shell", data: "9, 8, 7, 6, 5, 4, 3, 2, 1" } },
    { label: "Heap · 4 10 3 5 1 8", spec: { topic: "sort", algo: "heap", data: "4, 10, 3, 5, 1, 8" } },
    { label: "Counting · 4 2 2 8 3 3 1", spec: { topic: "sort", algo: "counting", data: "4, 2, 2, 8, 3, 3, 1" } },
    { label: "Quick · bars", spec: { topic: "sort", algo: "quick", data: "6, 3, 9, 1, 7, 2, 8, 4, 5", view: "bars" } },
  ],
  search: [
    { label: "Binary · find 23", spec: { topic: "search", algo: "binary", data: "2, 5, 8, 12, 16, 23, 38, 56, 72, 91", target: "23" } },
    { label: "Binary · find 7 (missing)", spec: { topic: "search", algo: "binary", data: "1, 3, 4, 6, 8, 9, 11, 14", target: "7" } },
    { label: "Linear · find 9", spec: { topic: "search", algo: "linear", data: "4, 2, 7, 1, 9, 3", target: "9" } },
    { label: "Two pointers · sum 17", spec: { topic: "search", algo: "twoptr", data: "1, 3, 4, 6, 8, 11, 13, 15", target: "17" } },
    { label: "Sliding window · k = 3", spec: { topic: "search", algo: "window", data: "2, 1, 5, 1, 3, 2, 7, 1, 4", target: "3" } },
  ],
  graph: [
    { label: "BFS", spec: { topic: "graph", algo: "bfs", edges: "A-B, A-C, B-D, B-E, C-F, E-F, D-G", directed: false, start: "A" } },
    { label: "DFS", spec: { topic: "graph", algo: "dfs", edges: "A-B, A-C, B-D, B-E, C-F, E-F, D-G", directed: false, start: "A" } },
    { label: "Dijkstra", spec: { topic: "graph", algo: "dijkstra", edges: "A-B 4, A-C 2, B-C 5, B-D 10, C-E 3, E-D 4, D-F 11", directed: false, start: "A" } },
    { label: "Bellman–Ford · negative edge", spec: { topic: "graph", algo: "bellman", edges: "S-A 4, S-B 5, A-C -3, B-A -2, C-D 2, B-D 6", directed: true, start: "S" } },
    { label: "Bellman–Ford · negative cycle", spec: { topic: "graph", algo: "bellman", edges: "S-A 1, A-B 2, B-C -4, C-A 1, C-D 3", directed: true, start: "S" } },
    { label: "Floyd–Warshall", spec: { topic: "graph", algo: "floyd", edges: "A-B 3, A-D 7, B-A 8, B-C 2, C-A 5, C-D 1, D-A 2", directed: true, start: "" } },
    { label: "Union–find", spec: { topic: "graph", algo: "unionfind", edges: "A-B, C-D, B-D, E-F, A-C, G-H, F-G", directed: false, start: "" } },
    { label: "Prim", spec: { topic: "graph", algo: "prim", edges: "A-B 7, A-D 5, B-C 8, B-D 9, B-E 7, C-E 5, D-E 15, D-F 6, E-F 8, E-G 9, F-G 11", directed: false, start: "A" } },
    { label: "Kruskal", spec: { topic: "graph", algo: "kruskal", edges: "A-B 7, A-D 5, B-C 8, B-D 9, B-E 7, C-E 5, D-E 15, D-F 6, E-F 8, E-G 9, F-G 11", directed: false, start: "A" } },
    { label: "Topological sort", spec: { topic: "graph", algo: "topo", edges: "shirt-tie, tie-jacket, pants-shoes, pants-belt, belt-jacket, shirt-belt, socks-shoes", directed: true, start: "" } },
  ],
  tree: [
    { label: "BST · 50 30 70 20 40 60 80", spec: { topic: "tree", kind: "bst", data: "50, 30, 70, 20, 40, 60, 80, 35, 65" } },
    { label: "BST · sorted input", spec: { topic: "tree", kind: "bst", data: "1, 2, 3, 4, 5, 6" } },
    { label: "AVL · 1 … 7", spec: { topic: "tree", kind: "avl", data: "1, 2, 3, 4, 5, 6, 7" } },
    { label: "AVL · 30 20 10 25 28", spec: { topic: "tree", kind: "avl", data: "30, 20, 10, 25, 28, 40, 50" } },
    { label: "Max-heap", spec: { topic: "tree", kind: "maxheap", data: "4, 10, 3, 5, 1, 8, 9, 2, 7" } },
    { label: "Min-heap", spec: { topic: "tree", kind: "minheap", data: "9, 5, 6, 2, 3, 7, 1, 4" } },
  ],
  ds: [
    { label: "Stack", spec: { topic: "ds", kind: "stack", ops: "push 3, push 7, push 1, pop, push 9, peek, pop, pop", m: "7" } },
    { label: "Queue", spec: { topic: "ds", kind: "queue", ops: "enqueue 3, enqueue 7, enqueue 1, dequeue, enqueue 9, peek, dequeue, dequeue", m: "7" } },
    { label: "Hashing · chaining", spec: { topic: "ds", kind: "chaining", ops: "15, 11, 27, 8, 12, 22, 5, 19, 26, 34", m: "7" } },
    { label: "Hashing · linear probing", spec: { topic: "ds", kind: "probing", ops: "89, 18, 49, 58, 69, 25, 32", m: "10" } },
  ],
  dp: [
    { label: "LCS · ABCBDAB, BDCABA", spec: { topic: "dp", problem: "lcs", a: "ABCBDAB", b: "BDCABA", c: "" } },
    { label: "Edit distance · kitten → sitting", spec: { topic: "dp", problem: "edit", a: "kitten", b: "sitting", c: "" } },
    { label: "Knapsack · capacity 7", spec: { topic: "dp", problem: "knapsack", a: "1, 3, 4, 5", b: "1, 4, 5, 7", c: "7" } },
    { label: "Coins · 1 3 4, amount 6", spec: { topic: "dp", problem: "coins", a: "1, 3, 4", b: "", c: "6" } },
    { label: "Coins · 1 5 10 25, amount 30", spec: { topic: "dp", problem: "coins", a: "1, 5, 10, 25", b: "", c: "30" } },
  ],
  recur: [
    { label: "Fibonacci f(5)", spec: { topic: "recur", problem: "fib", n: "5", memo: false, data: "", target: "" } },
    { label: "Fibonacci f(8), memo", spec: { topic: "recur", problem: "fib", n: "8", memo: true, data: "", target: "" } },
    { label: "5!", spec: { topic: "recur", problem: "fact", n: "5", memo: false, data: "", target: "" } },
    { label: "Hanoi · 3 discs", spec: { topic: "recur", problem: "hanoi", n: "3", memo: false, data: "", target: "" } },
    { label: "4 queens", spec: { topic: "recur", problem: "queens", n: "4", memo: false, data: "", target: "" } },
    { label: "8 queens", spec: { topic: "recur", problem: "queens", n: "8", memo: false, data: "", target: "" } },
    { label: "Subset sum · 3 5 6 7 → 15", spec: { topic: "recur", problem: "subsets", n: "", memo: false, data: "3, 5, 6, 7", target: "15" } },
  ],
  string: [
    { label: "Naive · ABABC in ABABABCAB", spec: { topic: "string", algo: "naive", text: "ABABABCAB", pattern: "ABABC" } },
    { label: "KMP · ABABC in ABABABCAB", spec: { topic: "string", algo: "kmp", text: "ABABABCAB", pattern: "ABABC" } },
    { label: "KMP · AAAB in AAAAAAAB", spec: { topic: "string", algo: "kmp", text: "AAAAAAAB", pattern: "AAAB" } },
    { label: "Rabin–Karp · abra", spec: { topic: "string", algo: "rk", text: "abracadabra", pattern: "abra" } },
  ],
  growth: [
    { label: "Merge sort · T(n) = 2T(n/2) + n", spec: { topic: "growth", mode: "master", a: "2", b: "2", d: "1", n: "20" } },
    { label: "Binary search · T(n) = T(n/2) + 1", spec: { topic: "growth", mode: "master", a: "1", b: "2", d: "0", n: "20" } },
    { label: "Karatsuba · T(n) = 3T(n/2) + n", spec: { topic: "growth", mode: "master", a: "3", b: "2", d: "1", n: "20" } },
    { label: "T(n) = 2T(n/2) + n²", spec: { topic: "growth", mode: "master", a: "2", b: "2", d: "2", n: "20" } },
    { label: "Growth rates", spec: { topic: "growth", mode: "compare", a: "2", b: "2", d: "1", n: "20" } },
  ],
};

/**
 * The step slider. A renderer either cuts its finished list of rows (cut, count) or stops its loop when
 * take() says no; captions that give the answer away go through final(), so they wait for the last step.
 */
export class Steps {
  total = 0;
  readonly limit: number;
  constructor(limit = Infinity) {
    this.limit = limit;
  }
  get partial() {
    return this.limit < Infinity;
  }
  /** Is there room for another step (without counting it)? */
  room(): boolean {
    return this.total < this.limit;
  }
  /** Room for one more step? Counts it when there is. */
  take(): boolean {
    if (this.total >= this.limit) return false;
    this.total++;
    return true;
  }
  /** n more steps; returns how many of them to show. */
  count(n: number): number {
    this.total += n;
    return Math.min(this.limit, n);
  }
  /** The first `keep` items are always shown, the rest one per step. */
  cut<T>(items: T[], keep = 1): T[] {
    return items.slice(0, keep + this.count(Math.max(0, items.length - keep)));
  }
  final<T>(...items: T[]): T[] {
    return this.partial ? [] : items;
  }
}

function draw(spec: AlgoSpec, words: AlgoWords, st: Steps): RenderedSvg {
  switch (spec.topic) {
    case "sort":
      return renderSort(spec, words, st);
    case "search":
      return renderSearch(spec, words, st);
    case "graph":
      return renderGraph(spec, words, st);
    case "tree":
      return renderTree(spec, words, st);
    case "ds":
      return renderDs(spec, words, st);
    case "dp":
      return renderDp(spec, words, st);
    case "growth":
      return renderGrowth(spec, words);
    case "recur":
      return renderRecur(spec, words, st);
    case "string":
      return renderString(spec, words, st);
  }
}

/** The picture at spec.step, and how many steps there are in all (0: nothing to step through). */
export function renderAlgo(spec: AlgoSpec, words: AlgoWords): RenderedSvg & { steps: number } {
  const all = new Steps();
  const full = draw(spec, words, all);
  if (spec.step === undefined || spec.step >= all.total) return { ...full, steps: all.total };
  return { ...draw(spec, words, new Steps(Math.max(0, Math.floor(spec.step)))), steps: all.total };
}
