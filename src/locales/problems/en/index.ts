// The interview problems' words: the piece's own, the categories and levels, the errors the inputs can give, then
// each category's problems from a file of its own.
import { arrays } from "./arrays";
import { bst } from "./bst";
import { trees } from "./trees";
import { dp } from "./dp";
import { famous } from "./famous";
import { graphs } from "./graphs";
import { greedy } from "./greedy";
import { heaps } from "./heaps";
import { lists } from "./lists";
import { recursion } from "./recursion";
import { searching } from "./searching";
import { sorting } from "./sorting";
import { stacks } from "./stacks";
import { strings } from "./strings";
import { tries } from "./tries";
import { sysBasics } from "./sysBasics";
import { sysDesigns } from "./sysDesigns";

export const problems = {
  problem: "Problem",
  category: "Category",
  example: "Example",
  quiz: "Your turn",
  quizTip: "Before each move, say what happens next",
  play: "Play",
  pause: "Pause",
  first: "Back to the start",
  prev: "Step back",
  next: "Step on",
  last: "To the answer",
  step: "Step {k} of {n}",
  right: "Right!",
  wrong: "Not that one. Look again.",
  hint: "Type new inputs and press Enter: the steps start again from the beginning.",
  levels: ["easy", "medium", "hard", "very hard"],
  cats: {
    arrays: "Arrays", bst: "Binary search trees", trees: "Binary trees", dp: "Dynamic programming", famous: "Famous algorithms",
    graphs: "Graphs", greedy: "Greedy algorithms", heaps: "Heaps", lists: "Linked lists", recursion: "Recursion",
    searching: "Searching", sorting: "Sorting", stacks: "Stacks", strings: "Strings", tries: "Tries",
    sysBasics: "System design: fundamentals", sysDesigns: "System design: questions",
  },
  groups: { coding: "Coding questions", systems: "System design" },
  yes: "yes",
  no: "no",
  errors: {
    empty: "Write something here first.",
    number: "“{s}” isn't a number.",
    whole: "“{s}” isn't a whole number.",
    atLeast: "“{s}” is too small: at least {n}.",
    atMost: "“{s}” is too big: at most {n}.",
    range: "Write a whole number from {lo} to {hi}, not “{s}”.",
    tooMany: "At most {n}, so it fits.",
    tooFew: "At least {n}, please.",
    tooLong: "At most {n} characters, so it fits.",
    gridSize: "At most {r} rows and {c} columns, so it fits.",
    ragged: "Every row needs as many entries as the first.",
    interval: "“{s}” isn't an interval: write it as [start, end], with start ≤ end.",
    point: "“{s}” isn't a point: write it as x, y with whole numbers.",
    edge: "“{s}” isn't an edge: write it as A-B (or A>B one way), with a weight after it if it needs one.",
    tooManyNodes: "At most {n} nodes, so the graph fits.",
    deep: "At most {n} levels, so the tree fits.",
    sameLength: "Both need the same number of entries.",
    bad: "“{s}” doesn't fit here.",
  },
  // The solve ladder: the problem worked out a rung at a time, with the key idea hidden until it is earned.
  solve: {
    toggle: "Solve it",
    toggleTip: "Work it out yourself, a rung at a time; the key idea stays hidden until you get there",
    rungs: ["Understand", "Technique", "Brute force", "Plan", "Trace", "Cost"],
    understand: "First work this example out on paper: what should the answer be?",
    showAnswer: "Show the answer",
    answerIs: "The answer: {a}",
    next: "Next rung",
    hidden: "The key idea is hidden: it opens on the Plan rung, once you have made a plan of your own.",
    techniqueQ: "Which technique is at its heart?",
    techniqueRight: "Right: {names}. It fits because {signal}",
    techniqueWrong: "Not that one here. {name} is for when {signal}",
    hint: "Hint",
    hintIs: "Think of it when {signal}",
    bruteQ: "First the slow way: trying every possibility, how long would it take?",
    bruteRight: "Right: {o}. That is the one to beat.",
    plan: "Now make a plan of your own that beats {o}: what would you keep, and what would you skip? Then compare it with the key idea.",
    planPlain: "Make a plan of your own: what would you keep track of, step by step? Then compare it with the key idea.",
    showIdea: "Show the key idea",
    trace: "Step through the solution: before each move, say what happens next.",
    whatNext: "What happens next?",
    traceDone: "Through to the answer.",
    timeQ: "How long does the solution take?",
    spaceQ: "And how much extra memory does it need?",
    costRight: "Right: {o}.",
    costWrong: "Not that one. Look at what each step does, and how many steps there are.",
    done: "Solved: {name}.",
    score: "Right first time: {right} of {n} questions.",
    nextProblem: "Next problem",
    again: "Start again",
    techniques: {
      scan: { name: "One pass with a record", signal: "the answer can be kept up to date as you read: a best so far, a count, a flag." },
      hash: { name: "Hash map or set", signal: "you need to know at once whether you have seen something, or how often: a partner, a duplicate, a count." },
      twoPointers: { name: "Two pointers", signal: "the input is sorted or has two ends (or comes as two lists), and each comparison says which side moves." },
      window: { name: "Sliding window", signal: "the question is about a run of neighbours, and growing or shrinking the run changes the answer one way." },
      precompute: { name: "Precompute a table", signal: "each answer needs everything to its left or right, or many sums of ranges: work those out in a pass or two first." },
      sorting: { name: "Sort first", signal: "the input's order doesn't matter but the answer's does: once sorted, the pairs, gaps or best choices line up." },
      binarySearch: { name: "Binary search", signal: "something is sorted, or a yes-or-no answer flips just once as a number grows, so each look rules out half." },
      fastSlow: { name: "Fast and slow pointers", signal: "a linked list's middle, or a loop in it, is wanted without counting or extra memory." },
      linkRewire: { name: "Re-point the links", signal: "a linked list must be reversed, merged, split or rearranged in place, a few next pointers at a time." },
      stack: { name: "Stack", signal: "the last thing opened is the first to close: brackets, nested parts, undoing, working out as you go." },
      monoStack: { name: "Monotonic stack", signal: "each item looks for the next bigger or smaller one, or for the widest span it can reach." },
      heap: { name: "Heap", signal: "you keep needing the smallest or largest of a changing collection: the top k, merging, scheduling, a running median." },
      intervals: { name: "Sort and merge intervals", signal: "the input is ranges or meetings that may overlap." },
      recurse: { name: "Recursion on the parts", signal: "it is a tree or something nested: each part solves itself and reports up (a height, a sum, a yes or no)." },
      bstWalk: { name: "Walk down a BST", signal: "it is a binary search tree: its order says which side can't hold the answer, so one path down is enough." },
      graphDfs: { name: "Depth-first search", signal: "it is about connected pieces of a grid or graph: islands, rivers, cycles, everything reachable." },
      bfs: { name: "Breadth-first search", signal: "the fewest steps or moves are wanted, or something spreads in rounds, a level at a time." },
      backtracking: { name: "Backtracking", signal: "every arrangement must be listed, or one found under rules: choose, go on, undo, try the next choice." },
      dp: { name: "Dynamic programming", signal: "you count the ways or find the best, and a bigger answer is built from smaller answers that repeat." },
      greedy: { name: "Greedy choice", signal: "taking the best-looking option each time can be shown never to hurt: the shortest first, the extremes paired." },
      divideConquer: { name: "Divide and conquer", signal: "it splits in halves (or round a pivot): solve each side the same way, then combine." },
      unionFind: { name: "Union–find", signal: "groups keep merging, and the question is whether two things are in the same group." },
      topoSort: { name: "Topological sort", signal: "tasks have prerequisites, and an order is wanted where each comes after what it depends on." },
      shortestPath: { name: "Shortest paths", signal: "a graph has weights on its edges and the cheapest route is wanted (Dijkstra, Bellman–Ford, A*)." },
      trie: { name: "Trie", signal: "many strings share their beginnings, and you search by prefix or for many words at once." },
      simulate: { name: "Follow it step by step", signal: "the rules say exactly what happens, and the work is walking the moves carefully: a spiral, the jumps, the carry." },
      math: { name: "A maths shortcut", signal: "a formula, a sum, a remainder or a fact of geometry replaces the search." },
      design: { name: "Design a data structure", signal: "you build the structure itself: keep extra facts beside each entry so every operation stays quick." },
    },
  },
  arrays, bst, trees, dp, famous, graphs, greedy, heaps, lists, recursion, searching, sorting, stacks, strings, tries, sysBasics, sysDesigns,
};
