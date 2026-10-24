// Solving a problem rather than watching it solved: for each coding question, the techniques at its heart, what the
// slow way of trying everything costs, and the time and extra memory the solution takes. From these come the
// questions of the solve ladder (which technique, what the brute force costs, what the solution costs), each with
// three wrong answers beside the right one, and the "what happens next?" questions asked while stepping through a
// trace, made from the kinds of step its notes describe. Kept free of React so it can be tested on its own.
import type { Ask, Frame } from "../patternSteps";
import { show, type Category, type ProblemsWords } from "./core";
import { problemInfo } from "./index";

/** The techniques the ladder asks about, roughly from the simplest to the most involved. */
export const TECHNIQUES = [
  "scan", "hash", "twoPointers", "window", "precompute", "sorting", "binarySearch", "fastSlow", "linkRewire",
  "stack", "monoStack", "heap", "intervals", "recurse", "bstWalk", "graphDfs", "bfs", "backtracking", "dp", "greedy",
  "divideConquer", "unionFind", "topoSort", "shortestPath", "trie", "simulate", "math", "design",
] as const;
export type Technique = (typeof TECHNIQUES)[number];

type CodingCategory = Exclude<Category, "sysBasics" | "sysDesigns">;
export type CodingId = { [C in CodingCategory]: keyof ProblemsWords[C] & string }[CodingCategory];

/**
 * Per problem: its techniques (the main one first; none for a problem that is a technique itself, like bubble sort),
 * the brute force's time (empty when there is no slower way worth naming), then the solution's time and extra space.
 */
type Row = readonly [techniques: string, brute: string, time: string, space: string];

// prettier-ignore
const ROWS: Record<CodingId, Row> = {
  // Arrays
  twoNumberSum: ["hash twoPointers", "O(n²)", "O(n)", "O(n)"],
  validateSubsequence: ["twoPointers", "", "O(n)", "O(1)"],
  sortedSquaredArray: ["twoPointers", "O(n log n)", "O(n)", "O(n)"],
  tournamentWinner: ["hash scan", "", "O(n)", "O(k)"],
  nonConstructibleChange: ["sorting greedy", "O(2ⁿ)", "O(n log n)", "O(1)"],
  transposeMatrix: ["simulate", "", "O(w·h)", "O(w·h)"],
  threeNumberSum: ["twoPointers sorting", "O(n³)", "O(n²)", "O(n)"],
  smallestDifference: ["twoPointers sorting", "O(n·m)", "O(n log n + m log m)", "O(1)"],
  moveElementToEnd: ["twoPointers", "", "O(n)", "O(1)"],
  monotonicArray: ["scan", "", "O(n)", "O(1)"],
  spiralTraverse: ["simulate", "", "O(w·h)", "O(w·h)"],
  longestPeak: ["scan", "O(n²)", "O(n)", "O(1)"],
  arrayOfProducts: ["precompute", "O(n²)", "O(n)", "O(n)"],
  firstDuplicateValue: ["hash math", "O(n²)", "O(n)", "O(1)"],
  mergeOverlappingIntervals: ["intervals sorting", "O(n²)", "O(n log n)", "O(n)"],
  bestSeat: ["scan", "O(n²)", "O(n)", "O(1)"],
  zeroSumSubarray: ["precompute hash", "O(n²)", "O(n)", "O(n)"],
  missingNumbers: ["math", "O(n²)", "O(n)", "O(1)"],
  majorityElement: ["scan", "O(n²)", "O(n)", "O(1)"],
  sweetAndSavory: ["twoPointers sorting", "O(n²)", "O(n log n)", "O(n)"],
  fourNumberSum: ["hash", "O(n⁴)", "O(n²)", "O(n²)"],
  subarraySort: ["scan", "O(n log n)", "O(n)", "O(1)"],
  largestRange: ["hash", "O(n log n)", "O(n)", "O(n)"],
  minRewards: ["precompute greedy", "O(n²)", "O(n)", "O(n)"],
  zigzagTraverse: ["simulate", "", "O(w·h)", "O(w·h)"],
  longestSubarrayWithSum: ["window", "O(n²)", "O(n)", "O(1)"],
  knightConnection: ["bfs", "", "O(n·m)", "O(n·m)"],
  countSquares: ["hash math", "O(n⁴)", "O(n²)", "O(n)"],
  rectangleMania: ["hash", "O(n⁴)", "O(n²)", "O(n)"],
  apartmentHunting: ["precompute", "O(b²·r)", "O(b·r)", "O(b·r)"],
  calendarMatching: ["intervals", "", "O(c₁ + c₂)", "O(c₁ + c₂)"],
  waterfallStreams: ["simulate", "", "O(w²·h)", "O(w)"],
  minimumAreaRectangle: ["hash", "O(n⁴)", "O(n²)", "O(n)"],
  lineThroughPoints: ["hash math", "O(n³)", "O(n²)", "O(n)"],
  largestPark: ["monoStack precompute", "O(w²·h²)", "O(w·h)", "O(w)"],
  // Binary search trees
  findClosestValueInBst: ["bstWalk", "O(n)", "O(log n)", "O(1)"],
  bstConstruction: ["bstWalk design", "", "O(log n)", "O(1)"],
  validateBst: ["recurse", "O(n²)", "O(n)", "O(d)"],
  bstTraversal: ["recurse", "", "O(n)", "O(n)"],
  minHeightBst: ["divideConquer recurse", "O(n log n)", "O(n)", "O(n)"],
  findKthLargestValueInBst: ["recurse", "O(n)", "O(h + k)", "O(h)"],
  reconstructBst: ["recurse bstWalk", "O(n²)", "O(n)", "O(n)"],
  sameBsts: ["recurse divideConquer", "", "O(n²)", "O(d)"],
  validateThreeNodes: ["bstWalk", "", "O(d)", "O(1)"],
  repairBst: ["recurse", "O(n log n)", "O(n)", "O(h)"],
  sumBsts: ["recurse", "O(n²)", "O(n)", "O(h)"],
  rightSmallerThan: ["bstWalk design", "O(n²)", "O(n log n)", "O(n)"],
  // Binary trees
  branchSums: ["recurse", "", "O(n)", "O(n)"],
  nodeDepths: ["recurse stack", "", "O(n)", "O(h)"],
  evaluateExpressionTree: ["recurse", "", "O(n)", "O(h)"],
  invertBinaryTree: ["bfs recurse", "", "O(n)", "O(n)"],
  binaryTreeDiameter: ["recurse", "O(n²)", "O(n)", "O(h)"],
  findSuccessor: ["recurse", "O(n)", "O(h)", "O(1)"],
  heightBalancedBinaryTree: ["recurse", "O(n²)", "O(n)", "O(h)"],
  mergeBinaryTrees: ["recurse", "", "O(n)", "O(h)"],
  symmetricalTree: ["recurse stack", "", "O(n)", "O(h)"],
  splitBinaryTree: ["recurse", "O(n²)", "O(n)", "O(h)"],
  maxPathSumInBinaryTree: ["recurse", "O(n²)", "O(n)", "O(h)"],
  findNodesDistanceK: ["bfs hash", "", "O(n)", "O(n)"],
  iterativeInOrderTraversal: ["recurse", "", "O(n)", "O(1)"],
  flattenBinaryTree: ["recurse linkRewire", "", "O(n)", "O(d)"],
  rightSiblingTree: ["recurse", "", "O(n)", "O(d)"],
  allKindsOfNodeDepths: ["recurse", "O(n²)", "O(n)", "O(h)"],
  compareLeafTraversal: ["stack recurse", "", "O(n + m)", "O(h₁ + h₂)"],
  // Dynamic programming
  maxSubsetSumNoAdjacent: ["dp", "O(2ⁿ)", "O(n)", "O(1)"],
  numberOfWaysToMakeChange: ["dp", "O(2ⁿ)", "O(n·d)", "O(n)"],
  minNumberOfCoinsForChange: ["dp", "O(2ⁿ)", "O(n·d)", "O(n)"],
  levenshteinDistance: ["dp", "O(3ⁿ)", "O(n·m)", "O(n·m)"],
  numberOfWaysToTraverseGraph: ["dp math", "O(2ⁿ⁺ᵐ)", "O(n·m)", "O(n·m)"],
  maxSumIncreasingSubsequence: ["dp", "O(2ⁿ)", "O(n²)", "O(n)"],
  longestCommonSubsequence: ["dp", "O(2ⁿ)", "O(n·m)", "O(n·m)"],
  minNumberOfJumps: ["greedy dp", "O(n²)", "O(n)", "O(1)"],
  waterArea: ["precompute twoPointers", "O(n²)", "O(n)", "O(n)"],
  knapsackProblem: ["dp", "O(2ⁿ)", "O(n·c)", "O(n·c)"],
  diskStacking: ["dp sorting", "O(2ⁿ)", "O(n²)", "O(n)"],
  numbersInPi: ["dp hash", "O(2ⁿ)", "O(n³)", "O(n + m)"],
  maximumSumSubmatrix: ["precompute dp", "O(w·h·s²)", "O(w·h)", "O(w·h)"],
  maximizeExpression: ["dp", "O(n⁴)", "O(n)", "O(n)"],
  diceThrows: ["dp", "O(sᵈ)", "O(d·s·t)", "O(d·t)"],
  juiceBottling: ["dp", "O(2ⁿ)", "O(n²)", "O(n)"],
  maxProfitWithKTransactions: ["dp", "O(n²·k)", "O(n·k)", "O(n·k)"],
  palindromePartitioningMinCuts: ["dp", "O(n³)", "O(n²)", "O(n²)"],
  longestIncreasingSubsequence: ["binarySearch dp", "O(n²)", "O(n log n)", "O(n)"],
  longestStringChain: ["dp hash sorting", "", "O(n·m²)", "O(n·m)"],
  squareOfZeroes: ["precompute dp", "O(n⁴)", "O(n³)", "O(n²)"],
  // Famous algorithms
  kadanesAlgorithm: ["dp scan", "O(n²)", "O(n)", "O(1)"],
  stableInternships: ["greedy", "O(n!)", "O(n²)", "O(n²)"],
  unionFind: ["unionFind design", "", "O(α(n))", "O(n)"],
  dijkstrasAlgorithm: ["shortestPath heap", "", "O((v + e) log v)", "O(v)"],
  topologicalSort: ["topoSort", "", "O(j + d)", "O(j + d)"],
  kruskalsAlgorithm: ["unionFind greedy sorting", "", "O(e log e)", "O(e + v)"],
  primsAlgorithm: ["heap greedy", "", "O(e log e)", "O(e + v)"],
  knuthMorrisPrattAlgorithm: ["precompute", "O(n·m)", "O(n + m)", "O(m)"],
  aStarAlgorithm: ["shortestPath heap", "", "O(w·h·log(w·h))", "O(w·h)"],
  // Graphs
  depthFirstSearch: ["graphDfs", "", "O(v + e)", "O(v)"],
  singleCycleCheck: ["simulate", "", "O(n)", "O(1)"],
  breadthFirstSearch: ["bfs", "", "O(v + e)", "O(v)"],
  riverSizes: ["graphDfs", "", "O(w·h)", "O(w·h)"],
  youngestCommonAncestor: ["twoPointers", "", "O(d)", "O(1)"],
  removeIslands: ["graphDfs", "", "O(w·h)", "O(w·h)"],
  cycleInGraph: ["graphDfs", "", "O(v + e)", "O(v)"],
  minimumPassesOfMatrix: ["bfs", "O((w·h)²)", "O(w·h)", "O(w·h)"],
  twoColorable: ["graphDfs bfs", "", "O(v + e)", "O(v)"],
  boggleBoard: ["graphDfs trie backtracking", "", "O(w·h·8ˢ)", "O(w·h + n·s)"],
  largestIsland: ["graphDfs hash", "O((w·h)²)", "O(w·h)", "O(w·h)"],
  detectArbitrage: ["shortestPath math", "", "O(n³)", "O(n²)"],
  twoEdgeConnectedGraph: ["graphDfs", "O(e·(v + e))", "O(v + e)", "O(v)"],
  airportConnections: ["graphDfs greedy sorting", "", "O(a·(a + r))", "O(a + r)"],
  // Greedy algorithms
  minimumWaitingTime: ["greedy sorting", "O(n!)", "O(n log n)", "O(1)"],
  classPhotos: ["greedy sorting", "", "O(n log n)", "O(1)"],
  tandemBicycle: ["greedy sorting", "", "O(n log n)", "O(1)"],
  optimalFreelancing: ["greedy sorting", "", "O(n log n)", "O(1)"],
  taskAssignment: ["greedy sorting twoPointers", "O(n!)", "O(n log n)", "O(n)"],
  validStartingCity: ["greedy", "O(n²)", "O(n)", "O(1)"],
  // Heaps
  minHeapConstruction: ["heap design", "", "O(n)", "O(1)"],
  continuousMedian: ["heap", "O(n)", "O(log n)", "O(n)"],
  sortKSortedArray: ["heap", "O(n log n)", "O(n log k)", "O(k)"],
  laptopRentals: ["heap sorting intervals", "O(n²)", "O(n log n)", "O(n)"],
  mergeSortedArrays: ["heap", "O(n·k)", "O(n log k)", "O(n + k)"],
  // Linked lists
  removeDuplicatesFromLinkedList: ["linkRewire", "", "O(n)", "O(1)"],
  middleNode: ["fastSlow", "", "O(n)", "O(1)"],
  linkedListConstruction: ["design linkRewire", "", "O(1)", "O(1)"],
  removeKthNodeFromEnd: ["twoPointers", "", "O(n)", "O(1)"],
  sumOfLinkedLists: ["simulate linkRewire", "", "O(max(n, m))", "O(max(n, m))"],
  mergingLinkedLists: ["twoPointers", "O(n·m)", "O(n + m)", "O(1)"],
  findLoop: ["fastSlow", "", "O(n)", "O(1)"],
  reverseLinkedList: ["linkRewire", "", "O(n)", "O(1)"],
  mergeLinkedLists: ["linkRewire twoPointers", "", "O(n + m)", "O(1)"],
  shiftLinkedList: ["linkRewire", "O(n·k)", "O(n)", "O(1)"],
  lruCache: ["design hash linkRewire", "O(n)", "O(1)", "O(n)"],
  rearrangeLinkedList: ["linkRewire", "", "O(n)", "O(1)"],
  linkedListPalindrome: ["fastSlow linkRewire", "", "O(n)", "O(1)"],
  zipLinkedList: ["fastSlow linkRewire", "", "O(n)", "O(1)"],
  nodeSwap: ["linkRewire", "", "O(n)", "O(1)"],
  // Recursion
  nthFibonacci: ["dp", "O(2ⁿ)", "O(n)", "O(1)"],
  productSum: ["recurse", "", "O(n)", "O(d)"],
  permutations: ["backtracking", "", "O(n·n!)", "O(n·n!)"],
  powerset: ["backtracking", "", "O(n·2ⁿ)", "O(n·2ⁿ)"],
  phoneNumberMnemonics: ["backtracking", "", "O(4ⁿ·n)", "O(4ⁿ·n)"],
  staircaseTraversal: ["dp window", "O(kⁿ)", "O(n)", "O(n)"],
  blackjackProbability: ["dp", "", "O(t)", "O(t)"],
  revealMinesweeper: ["graphDfs", "", "O(w·h)", "O(w·h)"],
  lowestCommonManager: ["recurse", "", "O(n)", "O(d)"],
  interweavingStrings: ["dp backtracking", "O(2ⁿ⁺ᵐ)", "O(n·m)", "O(n·m)"],
  solveSudoku: ["backtracking", "", "O(9ᵐ)", "O(m)"],
  generateDivTags: ["backtracking", "", "O(4ⁿ/√n)", "O(4ⁿ/√n)"],
  ambiguousMeasurements: ["dp", "", "O(l·h·n)", "O(l·h)"],
  numberOfBinaryTreeTopologies: ["dp", "O(4ⁿ)", "O(n²)", "O(n)"],
  nonAttackingQueens: ["backtracking", "", "O(n!)", "O(n)"],
  // Searching
  binarySearch: ["binarySearch", "O(n)", "O(log n)", "O(1)"],
  findThreeLargestNumbers: ["scan", "O(n log n)", "O(n)", "O(1)"],
  searchInSortedMatrix: ["twoPointers", "O(w·h)", "O(w + h)", "O(1)"],
  shiftedBinarySearch: ["binarySearch", "O(n)", "O(log n)", "O(1)"],
  searchForRange: ["binarySearch", "O(n)", "O(log n)", "O(1)"],
  quickselect: ["divideConquer", "O(n log n)", "O(n)", "O(1)"],
  indexEqualsValue: ["binarySearch", "O(n)", "O(log n)", "O(1)"],
  medianOfTwoSortedArrays: ["binarySearch", "O(n + m)", "O(log(min(n, m)))", "O(1)"],
  optimalAssemblyLine: ["binarySearch greedy", "", "O(n log t)", "O(1)"],
  // Sorting
  bubbleSort: ["", "", "O(n²)", "O(1)"],
  insertionSort: ["", "", "O(n²)", "O(1)"],
  selectionSort: ["", "", "O(n²)", "O(1)"],
  threeNumberSort: ["twoPointers", "O(n log n)", "O(n)", "O(1)"],
  quickSort: ["divideConquer", "", "O(n log n)", "O(log n)"],
  heapSort: ["heap", "", "O(n log n)", "O(1)"],
  radixSort: ["", "", "O(d·(n + 10))", "O(n)"],
  mergeSort: ["divideConquer", "", "O(n log n)", "O(n)"],
  countInversions: ["divideConquer", "O(n²)", "O(n log n)", "O(n)"],
  // Stacks
  minMaxStackConstruction: ["design stack", "", "O(1)", "O(1)"],
  balancedBrackets: ["stack", "", "O(n)", "O(n)"],
  sunsetViews: ["monoStack", "O(n²)", "O(n)", "O(n)"],
  bestDigits: ["monoStack greedy", "O(2ⁿ)", "O(n)", "O(n)"],
  sortStack: ["recurse stack", "", "O(n²)", "O(n)"],
  nextGreaterElement: ["monoStack", "O(n²)", "O(n)", "O(n)"],
  reversePolishNotation: ["stack", "", "O(n)", "O(n)"],
  collidingAsteroids: ["stack", "O(n²)", "O(n)", "O(n)"],
  shortenPath: ["stack", "", "O(n)", "O(n)"],
  largestRectangleUnderSkyline: ["monoStack", "O(n²)", "O(n)", "O(n)"],
  // Strings
  palindromeCheck: ["twoPointers", "", "O(n)", "O(1)"],
  caesarCipherEncryptor: ["math", "", "O(n)", "O(n)"],
  runLengthEncoding: ["scan", "", "O(n)", "O(n)"],
  commonCharacters: ["hash", "", "O(n·m)", "O(m)"],
  generateDocument: ["hash", "O(m·(n + m))", "O(n + m)", "O(c)"],
  firstNonRepeatingCharacter: ["hash", "O(n²)", "O(n)", "O(1)"],
  semordnilap: ["hash", "O(n²·m)", "O(n·m)", "O(n·m)"],
  longestPalindromicSubstring: ["twoPointers", "O(n³)", "O(n²)", "O(1)"],
  groupAnagrams: ["hash sorting", "O(w²·n)", "O(w·n log n)", "O(w·n)"],
  validIpAddresses: ["backtracking", "", "O(1)", "O(1)"],
  reverseWordsInString: ["twoPointers", "", "O(n)", "O(n)"],
  minimumCharactersForWords: ["hash", "", "O(n·l)", "O(c)"],
  oneEdit: ["twoPointers", "", "O(n)", "O(1)"],
  longestSubstringWithoutDuplication: ["window hash", "O(n²)", "O(n)", "O(min(n, a))"],
  underscorifySubstring: ["intervals", "", "O(n·m)", "O(n)"],
  patternMatcher: ["math hash", "", "O(n²·m)", "O(n + m)"],
  smallestSubstringContaining: ["window hash", "O(n²)", "O(b + s)", "O(b + s)"],
  longestBalancedSubstring: ["stack", "O(n³)", "O(n)", "O(n)"],
  stringsMadeUpOfStrings: ["trie dp", "", "O(n·m²)", "O(n·m)"],
  // Tries
  suffixTrieConstruction: ["trie", "", "O(n²)", "O(n²)"],
  multiStringSearch: ["trie", "O(b·n·s)", "O(n·s + b·s)", "O(n·s)"],
  longestMostFrequentPrefix: ["trie", "", "O(n·m)", "O(n·m)"],
  shortestUniquePrefixes: ["trie", "O(n²·m)", "O(n·m)", "O(n·m)"],
};

export type SolveInfo = { techniques: Technique[]; brute?: string; time: string; space: string };

export const isCoding = (id: string): id is CodingId => Object.hasOwn(ROWS, id);
export const CODING_IDS = Object.keys(ROWS) as CodingId[];

export function solveInfo(id: CodingId): SolveInfo {
  const [t, brute, time, space] = ROWS[id];
  return { techniques: t.split(" ").filter(Boolean) as Technique[], ...(brute ? { brute } : {}), time, space };
}

// ——— The ladder's questions ———

/** A whole number from a text, the same every time, to pick and order the wrong answers by. */
function seed(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return h;
}

/**
 * The right answer and three wrong ones, in an order the key fixes. The wrong ones come from the tiers in turn, the
 * most believable first; within a tier the key rotates them, so different problems meet different ones.
 */
function choose<T>(key: string, right: T, tiers: readonly (readonly T[])[], exclude: readonly T[] = []): T[] {
  const s = seed(key);
  const seen = new Set<T>([right, ...exclude]);
  const wrong: T[] = [];
  for (const tier of tiers) {
    const fresh = [...new Set(tier)].filter((x) => !seen.has(x));
    const rot = fresh.length ? s % fresh.length : 0;
    for (const x of [...fresh.slice(rot), ...fresh.slice(0, rot)]) seen.add(x), wrong.push(x);
  }
  const options = [right, ...wrong.slice(0, 3)];
  const at = s % options.length;
  [options[0], options[at]] = [options[at], options[0]];
  return options;
}

/** The problems of the same category, whose answers make believable wrong ones. */
const near = (id: CodingId) => {
  const { cat } = problemInfo(id);
  return CODING_IDS.filter((p) => problemInfo(p).cat === cat).map(solveInfo);
};

/**
 * Which technique is at its heart: the main one is offered and any of the problem's own techniques is right; the
 * wrong ones are those used elsewhere in its category, then any.
 */
export function techniqueQuestion(id: CodingId): { options: Technique[]; right: Technique[] } | undefined {
  const { techniques } = solveInfo(id);
  if (!techniques.length) return undefined;
  return { options: choose(id, techniques[0], [near(id).flatMap((o) => o.techniques), TECHNIQUES], techniques), right: techniques };
}

/** The usual costs, cheapest first. */
const COMMON = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)", "O(n!)"];
/** The letters a cost is in: n, or w and h, or v and e… */
const lettersOf = (c: string) => [...new Set(c.replace(/log|min|max/g, "").match(/[a-zα]/g) ?? [])].sort().join("");

/**
 * What the brute force, the solution, or its extra memory costs: one right answer and three wrong. The problem's own
 * other costs tempt most; then a usual cost is set beside its neighbours (a step cheaper or dearer), and a cost in
 * other letters beside the category's costs in the same letters.
 */
export function costQuestion(id: CodingId, which: "brute" | "time" | "space"): { options: string[]; right: string } | undefined {
  const info = solveInfo(id);
  const right = info[which];
  if (!right) return undefined;
  const own = [info.brute, info.time, info.space].filter((c): c is string => !!c);
  const at = COMMON.indexOf(right);
  const neighbours = at >= 0 ? COMMON.filter((_, i) => i !== at && Math.abs(i - at) <= 2) : [];
  const letters = lettersOf(right);
  const others = near(id).flatMap((o) => [o.time, o.space, o.brute ?? ""]).filter(Boolean);
  const alike = others.filter((c) => lettersOf(c) === letters);
  return { options: choose(`${id}:${which}`, right, [own, neighbours, alike, COMMON]), right };
}

// ——— "What happens next?" while stepping through ———

const NUMBER = /[−-]?\d+(?:\.\d+)?/g;
const QUOTED = /“[^”]*”/g;
/** A note with its numbers and quoted words taken out: the kind of step it describes. */
export const stepKind = (note: string) => note.replace(QUOTED, "“”").replace(NUMBER, "#");

/**
 * A kind of step written out with the numbers and quotes of the note it stands beside, in order; where those run out,
 * with the ones a real note of that kind had in the same places.
 */
function fillKind(kind: string, like: string, real: string) {
  const [nums, quotes] = [like.match(NUMBER) ?? [], like.match(QUOTED) ?? []];
  const [realNums, realQuotes] = [real.match(NUMBER) ?? [], real.match(QUOTED) ?? []];
  let n = 0;
  let q = 0;
  return kind.replace(/“”|#/g, (m) => {
    const i = m === "#" ? n++ : q++;
    return m === "#" ? (nums[i] ?? realNums[i]) : (quotes[i] ?? realQuotes[i]);
  });
}

/**
 * The frames with a question before each step that has none: which kind of step comes next, the right one written as
 * its note says and two other kinds the trace takes on the way (the most common first), written with the same
 * numbers. A trace whose steps on the way are all of one kind asks for the number its next note ends on instead,
 * beside one less and one more.
 */
export function withAsks(frames: readonly Frame[], question: string): Frame[] {
  const kinds = frames.map((f) => stepKind(f.note));
  const end = kinds[kinds.length - 1];
  const count = new Map<string, number>();
  for (const k of kinds.slice(1, -1)) count.set(k, (count.get(k) ?? 0) + 1);
  // The answer is never a wrong option: written with another step's numbers it would make no sense.
  count.delete(end);
  if (count.size < 2) return frames.map((f, k) => (f.ask || k === frames.length - 1 || kinds[k + 1] === end ? f : numberAsk(f, frames[k + 1].note, question)));
  const byUse = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!);
  /** The note of this kind nearest before step k, or else the first after it. */
  const realOf = (kind: string, k: number) => {
    const before = kinds.lastIndexOf(kind, k);
    return frames[before >= 0 ? before : kinds.indexOf(kind)].note;
  };
  return frames.map((f, k): Frame => {
    if (f.ask || k === frames.length - 1) return f;
    const next = frames[k + 1].note;
    const kind = kinds[k + 1];
    const others = byUse.filter((x) => x !== kind).slice(0, 2).map((x) => fillKind(x, next, realOf(x, k)));
    const options = [next, ...new Set(others.filter((o) => o !== next))];
    const at = (k * 7 + kind.length) % options.length;
    [options[0], options[at]] = [options[at], options[0]];
    const ask: Ask = { q: question, options, answer: at };
    return { ...f, ask };
  });
}

/** Before a step of the only kind, the number its note ends on, beside one less and one more. */
function numberAsk(f: Frame, next: string, question: string): Frame {
  const all = [...next.matchAll(NUMBER)];
  const lastNum = all[all.length - 1];
  if (!lastNum) return f;
  const v = Number(lastNum[0].replace("−", "-"));
  const write = (x: number) => next.slice(0, lastNum.index) + show(x) + next.slice(lastNum.index + lastNum[0].length);
  const options = [next, write(v - 1), write(v + 1)];
  const at = (all.length + Math.abs(Math.round(v))) % 3;
  [options[0], options[at]] = [options[at], options[0]];
  return { ...f, ask: { q: question, options, answer: at } };
}

// ——— The rungs ———

/** Understand the example, name the technique, cost the brute force, plan, trace, cost the solution; then done. */
export const RUNGS = ["understand", "technique", "brute", "plan", "trace", "cost"] as const;
export const DONE = RUNGS.length;

/** The rungs this problem has: no technique question for a problem that is a technique, no brute force without one. */
export function rungsOf(id: CodingId): number[] {
  const { techniques, brute } = solveInfo(id);
  return RUNGS.map((_, i) => i).filter((i) => (i !== 1 || techniques.length > 0) && (i !== 2 || !!brute));
}
