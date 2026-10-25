// The problems that come ready-made: each is a kind of data, a pattern, the inputs to start from and the formulas in
// the slots. Their names are in the locales under live.solver.presets.
import type { Preset, PresetId } from "./types";

export const PRESETS: Record<PresetId, Preset> = {
  // ——— Sliding window ———
  longestNoRepeat: { data: "text", pattern: "window", inputs: ["abcabcbb", ""], slots: { valid: "distinct == len", score: "len", goal: "longest", mode: "grow" } },
  maxSumK: { data: "nums", pattern: "window", inputs: ["2, 1, 5, 1, 3, 2", "3"], slots: { valid: "true", score: "sum", goal: "maxScore", mode: "fixed" } },
  minLenSum: { data: "nums", pattern: "window", inputs: ["2, 3, 1, 2, 4, 3", "7"], slots: { valid: "sum >= k", score: "sum", goal: "shortest", mode: "grow" } },
  atMostKDistinct: { data: "text", pattern: "window", inputs: ["araaci", "2"], slots: { valid: "distinct <= k", score: "len", goal: "longest", mode: "grow" } },
  countWindows: { data: "nums", pattern: "window", inputs: ["1, 2, 3, 4", "5"], slots: { valid: "sum <= k", score: "sum", goal: "count", mode: "grow" } },
  // ——— Two pointers ———
  twoSumSorted: { data: "nums", pattern: "twoptr", inputs: ["1, 2, 3, 4, 6, 8, 11", "10"], slots: { sort: "yes", score: "a[l] + a[r]", hit: "score == k", moveLeft: "score < k", goal: "find" } },
  container: { data: "nums", pattern: "twoptr", inputs: ["1, 8, 6, 2, 5, 4, 8, 3, 7", ""], slots: { sort: "no", score: "min(a[l], a[r]) * (r - l)", hit: "false", moveLeft: "a[l] < a[r]", goal: "maxScore" } },
  countPairs: { data: "nums", pattern: "twoptr", inputs: ["1, 1, 2, 3, 4, 5, 5", "6"], slots: { sort: "yes", score: "a[l] + a[r]", hit: "score == k", moveLeft: "score < k", goal: "count" } },
  // ——— Monotonic stack ———
  nextGreater: { data: "nums", pattern: "mono", inputs: ["2, 1, 2, 4, 3", ""], slots: { popWhile: "cur > top", direction: "l2r", record: "poppedValue" } },
  prevSmaller: { data: "nums", pattern: "mono", inputs: ["3, 1, 4, 1, 5", ""], slots: { popWhile: "top >= cur", direction: "l2r", record: "topValue" } },
  dailyTemperatures: { data: "nums", pattern: "mono", inputs: ["73, 74, 75, 71, 69, 72, 76, 73", ""], slots: { popWhile: "cur > top", direction: "l2r", record: "poppedDist" } },
  // ——— Binary search ———
  lowerBound: { data: "nums", pattern: "bsearch", inputs: ["1, 3, 5, 7, 9, 11, 13", "7"], slots: { ok: "a[mid] >= k", find: "firstTrue" } },
  sqrtFloor: { data: "range", pattern: "bsearch", inputs: ["0", "40", "26", ""], slots: { ok: "mid * mid > k", find: "lastFalse" } },
  kokoBananas: { data: "range", pattern: "bsearch", inputs: ["1", "11", "8", "3, 6, 7, 11"], slots: { ok: "sum(x in a: ceil(x / mid)) <= k", find: "firstTrue" } },
  // ——— Dynamic programming, one row ———
  climbStairs: { data: "nums", pattern: "dp1", inputs: ["1, 2", "6"], slots: { size: "k1", base: "dp[0] = 1", rec: "sum(s in a if s <= i: dp[i - s])", answer: "dp[k]" } },
  houseRobber: { data: "nums", pattern: "dp1", inputs: ["4, 9, 6, 2, 8, 7, 3", ""], slots: { size: "n", base: "dp[0] = a[0]; dp[1] = max(a[0], a[1])", rec: "max(dp[i-1], dp[i-2] + a[i])", answer: "dp[n-1]" } },
  minCoins: { data: "nums", pattern: "dp1", inputs: ["1, 2, 5", "11"], slots: { size: "k1", base: "dp[0] = 0", rec: "1 + min(c in a if c <= i: dp[i - c])", answer: "dp[k]" } },
  kadane: { data: "nums", pattern: "dp1", inputs: ["-2, 1, -3, 4, -1, 2, 1, -5, 4", ""], slots: { size: "n", base: "dp[0] = a[0]", rec: "max(a[i], dp[i-1] + a[i])", answer: "max(dp)" } },
  lis: { data: "nums", pattern: "dp1", inputs: ["10, 9, 2, 5, 3, 7, 101, 18", ""], slots: { size: "n", base: "", rec: "max(1, 1 + max(j in 0..i-1 if a[j] < a[i]: dp[j]))", answer: "max(dp)" } },
  jumpGame: { data: "nums", pattern: "dp1", inputs: ["2, 3, 1, 1, 4", ""], slots: { size: "n", base: "dp[0] = true", rec: "any(j in 0..i-1: dp[j] and j + a[j] >= i)", answer: "dp[n-1]" } },
  // ——— Dynamic programming, a table ———
  lcs: { data: "pair", pattern: "dp2", inputs: ["abcde", "ace"], slots: { rows: "n + 1", cols: "m + 1", base: "dp[i][0] = 0; dp[0][j] = 0", rec2: "if(a[i-1] == b[j-1], dp[i-1][j-1] + 1, max(dp[i-1][j], dp[i][j-1]))", answer: "dp[n][m]" } },
  editDistance: { data: "pair", pattern: "dp2", inputs: ["horse", "ros"], slots: { rows: "n + 1", cols: "m + 1", base: "dp[i][0] = i; dp[0][j] = j", rec2: "if(a[i-1] == b[j-1], dp[i-1][j-1], 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]))", answer: "dp[n][m]" } },
  knapsack: { data: "items", pattern: "dp2", inputs: ["[6, 1], [10, 2], [12, 3]", "5"], slots: { rows: "n + 1", cols: "cap + 1", base: "dp[0][j] = 0; dp[i][0] = 0", rec2: "if(w[i-1] <= j, max(dp[i-1][j], dp[i-1][j - w[i-1]] + v[i-1]), dp[i-1][j])", answer: "dp[n][cap]" } },
  uniquePaths: { data: "grid", pattern: "dp2", inputs: ["0 0 0 0 0 0 0; 0 0 0 0 0 0 0; 0 0 0 0 0 0 0", ""], slots: { rows: "R", cols: "C", base: "dp[i][0] = 1; dp[0][j] = 1", rec2: "dp[i-1][j] + dp[i][j-1]", answer: "dp[R-1][C-1]" } },
  minPathSum: { data: "grid", pattern: "dp2", inputs: ["1 3 1; 1 5 1; 4 2 1", ""], slots: { rows: "R", cols: "C", base: "dp[0][0] = g[0][0]", rec2: "g[i][j] + min(if(i > 0, dp[i-1][j], inf), if(j > 0, dp[i][j-1], inf))", answer: "dp[R-1][C-1]" } },
  waysChange: { data: "nums", pattern: "dp2", inputs: ["1, 2, 5", "5"], slots: { rows: "n + 1", cols: "k + 1", base: "dp[i][0] = 1; dp[0][j] = 0", rec2: "dp[i-1][j] + if(j >= a[i-1], dp[i][j - a[i-1]], 0)", answer: "dp[n][k]" } },
  // ——— Grid search ———
  islands: { data: "grid", pattern: "gridsearch", inputs: ["1 1 0 0 0; 1 1 0 0 0; 0 0 1 0 0; 0 0 0 1 1", ""], slots: { passable: "v == 1", start: "0, 0", goalCell: "", neighbours: "four", mode: "components" } },
  shortestGrid: { data: "grid", pattern: "gridsearch", inputs: ["0 0 0 1; 1 1 0 1; 0 0 0 0; 0 1 1 0", ""], slots: { passable: "v == 0", start: "0, 0", goalCell: "r == R - 1 and c == C - 1", neighbours: "four", mode: "bfs" } },
  floodFill: { data: "grid", pattern: "gridsearch", inputs: ["1 1 1; 1 1 0; 1 0 1", "2"], slots: { passable: "v == 1", start: "1, 1", goalCell: "", neighbours: "four", mode: "fill" } },
  // ——— Graph search ———
  bfsOrder: { data: "edges", pattern: "graphsearch", inputs: ["A-B, A-C, B-D, C-D, D-E"], slots: { startNode: "A", goalNode: "", mode: "bfs" } },
  dfsOrder: { data: "edges", pattern: "graphsearch", inputs: ["A-B, A-C, B-D, C-D, D-E"], slots: { startNode: "A", goalNode: "", mode: "dfs" } },
  shortestGraph: { data: "edges", pattern: "graphsearch", inputs: ["A-B, A-C, B-D, C-D, D-E, C-F, F-E"], slots: { startNode: "A", goalNode: "E", mode: "shortestPath" } },
  graphComponents: { data: "edges", pattern: "graphsearch", inputs: ["A-B, B-C, D-E, F-G, G-H, H-F"], slots: { startNode: "A", goalNode: "", mode: "components" } },
  // ——— Backtracking ———
  subsets: { data: "nums", pattern: "backtrack", inputs: ["1, 2, 3", ""], slots: { choose: "a", allowed: "true", accept: "true", reuse: "once" } },
  permutations: { data: "nums", pattern: "backtrack", inputs: ["1, 2, 3", ""], slots: { choose: "a", allowed: "true", accept: "len(picked) == n", reuse: "ordered" } },
  combinationSum: { data: "nums", pattern: "backtrack", inputs: ["2, 3, 6, 7", "7"], slots: { choose: "a", allowed: "sum(picked) + x <= k", accept: "sum(picked) == k", reuse: "repeat" } },
};

export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const isPresetId = (id: unknown): id is PresetId => typeof id === "string" && Object.hasOwn(PRESETS, id);
