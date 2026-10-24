// The interview problems, AlgoExpert's two hundred, by category: which there are, where each belongs, and the frames
// of one for the inputs typed.
import { ARRAYS } from "./arrays";
import { BST } from "./bst";
import { TREES } from "./trees";
import { DP } from "./dp";
import { FAMOUS } from "./famous";
import { GRAPHS } from "./graphs";
import { GREEDY } from "./greedy";
import { HEAPS } from "./heaps";
import { LISTS } from "./lists";
import { RECURSION } from "./recursion";
import { SEARCHING } from "./searching";
import { SORTING } from "./sorting";
import { STACKS } from "./stacks";
import { STRINGS } from "./strings";
import { TRIES } from "./tries";
import { CATEGORIES, type Category, type Errors, type Level, type Problem, type ProblemSet, type ProblemsWords, type ProblemText, type Trace } from "./core";

export { CATEGORIES, type Category, type Level };

const SETS: { [C in Category]: ProblemSet<C> } = {
  arrays: ARRAYS, bst: BST, trees: TREES, dp: DP, famous: FAMOUS, graphs: GRAPHS, greedy: GREEDY, heaps: HEAPS, lists: LISTS, recursion: RECURSION, searching: SEARCHING, sorting: SORTING, stacks: STACKS, strings: STRINGS, tries: TRIES,
};

export type ProblemId = { [C in Category]: keyof ProblemsWords[C] & string }[Category];

type Entry = { id: ProblemId; cat: Category; problem: Problem<ProblemText> };
/** Every problem, a category at a time and the easy ones first within it. */
const ENTRIES: Entry[] = CATEGORIES.flatMap((cat) =>
  Object.entries(SETS[cat] as Record<string, Problem<ProblemText>>)
    .map(([id, problem]) => ({ id: id as ProblemId, cat, problem }))
    .sort((a, b) => a.problem.level - b.problem.level),
);
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const PROBLEM_IDS: ProblemId[] = ENTRIES.map((e) => e.id);
export const isProblemId = (id: unknown): id is ProblemId => typeof id === "string" && BY_ID.has(id as ProblemId);
export const problemsIn = (cat: Category): ProblemId[] => ENTRIES.filter((e) => e.cat === cat).map((e) => e.id);

export function problemInfo(id: ProblemId): { cat: Category; level: Level; example: readonly string[] } {
  const { cat, problem } = BY_ID.get(id)!;
  return { cat, level: problem.level, example: problem.example };
}

/** The problem's own words. */
export const problemWords = (id: ProblemId, w: ProblemsWords): ProblemText => (w[BY_ID.get(id)!.cat] as Record<string, ProblemText>)[id];

/** The frames for these inputs; an input that can't be read throws, with a message saying why. */
export function problemTrace(id: ProblemId, input: readonly string[], w: ProblemsWords): Trace {
  const { problem } = BY_ID.get(id)!;
  return problem.solve(input, problemWords(id, w), w.errors as Errors);
}
