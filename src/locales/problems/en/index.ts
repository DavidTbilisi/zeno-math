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
  arrays, bst, trees, dp, famous, graphs, greedy, heaps, lists, recursion, searching, sorting, stacks, strings, tries, sysBasics, sysDesigns,
};
