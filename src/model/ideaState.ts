// What the practice policy knows of each idea a student has met, so the adaptive condition can ask for the idea they
// are least likely to know. The skills with a concept graph (src/model/conceptGraph.ts) are times, hcf and fractions;
// every question on them is read for the ideas it needs, and one BKT step moves those ideas together, as in the world
// of ideas (src/model/ideas.ts): a question is right only when every idea it needs is known, and a wrong answer in
// the shape of a recognised mistake (3/10 for 1/5 + 2/5) is blamed on the one idea the mistake shows is missing. The
// state is one number per idea, P(known), kept per student beside the Elo model: the server replays it from the stored
// attempts and the browser carries it forward (src/learner.ts). Nothing here needs the generators, so the server and
// the policy can import it; rebuilding a question from its seed is the learner's and the checker's business.
//
// The parameters are the simulation's, not fitted: no class has answered yet. Once one has, fitIdeas in ideas.ts on
// the export is the fit to put here.
import type { MistakeId } from "../math/mistakes.ts";
import type { Exercise } from "../math/practice.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { ARITHMETIC, arithmeticUses, FRACTIONS, FRACTIONS_GAPS, fractionsUses, type FractionsNode } from "./conceptGraph.ts";
import { bktStep, type BktParams } from "./evaluate.ts";

/** The skills with a concept graph, in curriculum order: what a learner knows of an idea goes from each to the next. */
export const IDEA_SKILLS = ["times", "hcf", "fractions"] as const satisfies readonly SkillId[];
export type IdeaSkill = (typeof IDEA_SKILLS)[number];
export const hasIdeas = (skill: SkillId): skill is IdeaSkill => (IDEA_SKILLS as readonly SkillId[]).includes(skill);

const inGraphOrder = (ids: readonly string[]) => (Object.keys(FRACTIONS.nodes) as FractionsNode[]).filter((n) => ids.includes(n));
/**
 * The ideas each skill's questions can need, in the graph's order: the ideas a student must know to have mastered it.
 * Times multiplies two whole numbers; hcf asks for a highest common factor or a lowest common multiple, the whole of
 * arithmetic; fractions, with its forms, asks for every idea of the graph. ideasOf in ideas.ts reads the same lists
 * off the generators' questions, and its test holds these to that.
 */
export const SKILL_IDEAS: Readonly<Record<IdeaSkill, readonly FractionsNode[]>> = {
  times: inGraphOrder(["addWhole", "multiplyFacts", "multiplyLong"]),
  hcf: inGraphOrder(Object.keys(ARITHMETIC.nodes)),
  fractions: inGraphOrder(Object.keys(FRACTIONS.nodes)),
};

/** The ideas a question needs, read from it. */
export const usesOf = (ex: Exercise) => (ex.skill === "fractions" ? fractionsUses(ex) : arithmeticUses(ex)).nodes as FractionsNode[];

/** The idea a recognised mistake shows is missing: the idea itself, or the far end of the connection. */
export function gapIdea(mistake: MistakeId): FractionsNode | undefined {
  const gap = FRACTIONS_GAPS[mistake];
  return gap === undefined ? undefined : ((gap.includes("→") ? gap.split("→")[1] : gap) as FractionsNode);
}

/**
 * One BKT step on several ideas at once, for a question that is right only when every idea it needs is known (a
 * conjunctive question, Pardos, Beck, Ruiz & Heffernan 2008). With the ideas independent given what is known of each,
 * P(all known) is the product of their P(known), and the chance that idea j is known and the answer right is
 * P(all known)(1 − slip) + (P(j known) − P(all known))·guess, so each idea's posterior has a closed form and no sum over
 * the 2^m states is needed. Then each needed idea may have been learnt. With one idea this is bktStep. The question's
 * guess and slip are given; learn is each idea's own.
 */
export function conjunctiveStep(known: number[], needed: readonly number[], learnOf: (j: number) => number, question: { guess: number; slip: number }, correct: boolean): void {
  let all = 1;
  for (const j of needed) all *= known[j];
  const { guess, slip } = question;
  const seen = correct ? all * (1 - slip) + (1 - all) * guess : all * slip + (1 - all) * (1 - guess);
  for (const j of needed) {
    const joint = correct ? all * (1 - slip) + (known[j] - all) * guess : all * slip + (known[j] - all) * (1 - guess);
    const posterior = seen > 0 ? joint / seen : known[j];
    known[j] = posterior + (1 - posterior) * learnOf(j);
  }
}

/** P(known) of each idea the student has met; an idea not here was never met and stands at the prior's init. */
export type IdeaState = Partial<Record<string, number>>;

/**
 * BKT's parameters for every idea until there are class answers to fit them on: the simulated world's guess and slip
 * (ideas.ts), a 5 % chance of learning an idea from one question (2.5 times its 0.02 learning rate), and an even
 * chance of knowing an idea at the start, as the Elo model gives a new student on every skill.
 */
export const IDEA_PRIOR: BktParams = { init: 0.5, learn: 0.05, guess: 0.2, slip: 0.1 };

export const knownOf = (state: IdeaState, idea: string, params: BktParams = IDEA_PRIOR) => state[idea] ?? params.init;

/**
 * One answer into the student's ideas. A wrong answer in the shape of a recognised mistake is a wrong answer on that
 * idea alone (the mistake says the student got as far as it); any other answer updates every idea the question
 * needed, together. A question on a skill without a graph says nothing.
 */
export function learnIdeas(state: IdeaState, ex: Exercise, correct: boolean, mistake?: MistakeId, params: BktParams = IDEA_PRIOR): void {
  if (!hasIdeas(ex.skill)) return;
  const ids = usesOf(ex);
  const gap = mistake && gapIdea(mistake);
  if (!correct && gap && ids.includes(gap)) {
    state[gap] = bktStep(knownOf(state, gap, params), params, false).known;
    return;
  }
  const known = ids.map((id) => knownOf(state, id, params));
  conjunctiveStep(known, known.map((_, j) => j), () => params.learn, params, correct);
  ids.forEach((id, j) => (state[id] = known[j]));
}

/** The idea of the skill the student is least likely to know; ties (every idea at the start) are broken at random. */
export function weakestIdea(state: IdeaState, skill: IdeaSkill, random: () => number = Math.random, params: BktParams = IDEA_PRIOR): FractionsNode {
  const ids = SKILL_IDEAS[skill];
  const lowest = Math.min(...ids.map((id) => knownOf(state, id, params)));
  const tied = ids.filter((id) => knownOf(state, id, params) === lowest);
  return tied[Math.min(tied.length - 1, Math.floor(random() * tied.length))];
}

/**
 * How much of a question's evidence falls on one idea: 1 over the ideas it needs when it needs the idea, else 0. The
 * question that bears most on an idea is the one asking for it alone (a form, on fractions), then the operation that
 * needs it with the fewest others.
 */
export function bearing(ex: Exercise, idea: string): number {
  if (!hasIdeas(ex.skill)) return 0;
  const ids: readonly string[] = usesOf(ex);
  return ids.includes(idea) ? 1 / ids.length : 0;
}
