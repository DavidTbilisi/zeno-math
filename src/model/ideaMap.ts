// The idea map (issue #285): a skill's ideas as tiles, joined to the ideas they rest on, each lit once the student's
// answers have shown it. "Shown" is the same bar as mastery: the model's chance that the student knows the idea reaches
// 0.95 (ideaState.ts). A tile lit once stays lit, even when a later answer lowers the estimate, because the map
// rewards what the student has done; the policy keeps reading the live estimate to choose questions.
import { ARITHMETIC, BRACKETS, FRACTIONS, ORDER, POWERS, ROUNDING, SIGNED, type ConceptGraph, type IdeaNode } from "./conceptGraph.ts";
import { knownOf, SKILL_IDEAS, type IdeaSkill, type IdeaState } from "./ideaState.ts";

/** The chance of knowing an idea at which its tile lights. */
export const LIT = 0.95;

/** The graph each skill's ideas come from. */
const GRAPH_OF: Record<IdeaSkill, ConceptGraph> = {
  times: ARITHMETIC, hcf: ARITHMETIC, fractions: FRACTIONS, integers: SIGNED, order: ORDER, rounding: ROUNDING, indices: POWERS, expand: BRACKETS,
};

/** The ideas newly shown: known well enough now and not lit before, in the order the state lists them. */
export function newlyLit(lit: readonly string[], state: IdeaState): string[] {
  return Object.keys(state).filter((id) => !lit.includes(id) && knownOf(state, id) >= LIT);
}

export type IdeaMapLayout = {
  /** The skill's ideas in rows: the first row rests on nothing in the map, every other idea sits below all it rests on. */
  rows: IdeaNode[][];
  /** [from, to, kind]: to rests on from ("needs"), or the two are used together ("joins"); only edges inside the map. */
  edges: [IdeaNode, IdeaNode, "needs" | "joins"][];
};

/** A skill's map: its ideas, the edges between them, and each idea's row (one more than the deepest idea it rests on). */
export function ideaMap(skill: IdeaSkill): IdeaMapLayout {
  const nodes = SKILL_IDEAS[skill];
  const edges = GRAPH_OF[skill].edges
    .filter(([a, b]) => nodes.includes(a as IdeaNode) && nodes.includes(b as IdeaNode))
    .map(([a, b, k]) => [a, b, k] as [IdeaNode, IdeaNode, "needs" | "joins"]);
  const row = new Map<IdeaNode, number>();
  const depth = (n: IdeaNode, seen: readonly IdeaNode[] = []): number => {
    if (row.has(n)) return row.get(n)!;
    if (seen.includes(n)) throw new Error(`the ${skill} graph has a cycle through ${n}`);
    const under = edges.filter(([, b]) => b === n).map(([a]) => depth(a, [...seen, n]));
    const d = under.length ? Math.max(...under) + 1 : 0;
    row.set(n, d);
    return d;
  };
  nodes.forEach((n) => depth(n));
  const rows: IdeaNode[][] = [];
  for (const n of nodes) (rows[row.get(n)!] ??= []).push(n);
  return { rows, edges };
}
