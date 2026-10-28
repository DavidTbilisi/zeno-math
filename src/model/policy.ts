// Choosing the next practice question in a class study. The two conditions differ only here: feedback, worked
// solutions and the review of missed questions are the same for both.
//
// fixed: the class's skills in curriculum order, each at levels 1, 2 and 3 with PER_LEVEL questions at each, then
// round again. It ignores how the student is doing.
//
// adaptive: of the skills whose prerequisites the student has met and that they haven't mastered yet, the skill and
// level where the learner model's chance of a right first answer is closest to TARGET (about three in four right, as
// in Math Garden, Klinkenberg et al. 2011: hard enough to learn from, easy enough to keep going). A skill
// practised in the last few questions counts as further from the target, so practice interleaves. On a skill made of
// ideas (times, hcf, fractions), given what the student knows of each, it also names the idea they are least likely
// to know, and the question asked is the one bearing most on it (exerciseFor in src/learner.ts): on fractions, the
// form asking for that idea alone.
//
// A skill counts as mastered once the model gives a hard question on it a good chance. Given the student's evidence on
// the skill itself, as the app gives it, the thesis's rule must hold as well (docs/thesis, section 3.3): the moving
// average of their answers on the skill has reached the threshold fitted on ASSISTments, and on a skill made of ideas
// they are likely to know every one of them, since a skill whose questions each leave ideas untested looks mastered
// before it is (G1). The gates only hold a skill open longer; the simulations, which give neither, are as they were.
import type { SkillId } from "../math/practiceSkills.ts";
import { PREREQUISITES } from "./curriculum.ts";
import type { Level } from "./elo.ts";
import { emaStep, type EmaParams } from "./evaluate.ts";
import { allKnown, hasIdeas, weakestIdea, type IdeaState } from "./ideaState.ts";

export type Policy = "adaptive" | "fixed";
/** A skill and level, and on a skill made of ideas, with the student's ideas given, the idea to aim the question at. */
export type Choice = { skill: SkillId; level: Level; idea?: string };

export const PER_LEVEL = 2;
export const TARGET = 0.75;
/**
 * A prerequisite holds a skill back while a medium question on it would be answered right less often than this. At
 * 0.5 a new student (an even chance on everything) starts with every skill open, and a skill closes only once the
 * student has shown weakness in what it builds on. (A higher bar made every new student grind the first skills: in
 * simulated classes a fifth of all practice went to each root skill.)
 */
export const UNLOCK_AT = 0.5;
/** A skill is mastered when a hard question on it would be answered right this often. */
export const MASTERED_AT = 0.8;
/** The moving average fitted on the ASSISTments training students (thesis section 3.1), until a class has answered. */
export const EMA: EmaParams = { alpha: 0.15, start: 0.594 };
/** The moving average's threshold that costs on those students what three right in a row costs (thesis Table 3.9). */
export const EMA_MASTERED_AT = 0.6962;
/** On a skill made of ideas, the chance of knowing every one of them that mastery needs (BKT's usual threshold). */
export const IDEAS_MASTERED_AT = 0.95;

/** The student's moving average of right first answers on each skill they have answered; a skill not here stands at EMA.start. */
export type EmaState = Partial<Record<SkillId, number>>;
export function learnEma(state: EmaState, skill: SkillId, correct: boolean): void {
  state[skill] = emaStep(state[skill] ?? EMA.start, EMA.alpha, correct);
}
/** Added to the distance from the target for each of the last RECENT questions that were on the same skill. */
export const RECENCY_PENALTY = 0.1;
export const RECENT = 3;
const LEVELS: readonly Level[] = [1, 2, 3];

/** The question at this position in the fixed sequence (position = fixed-sequence questions done so far). */
export function fixedChoice(skills: readonly SkillId[], position: number): Choice {
  const perSkill = LEVELS.length * PER_LEVEL;
  const i = ((position % (skills.length * perSkill)) + skills.length * perSkill) % (skills.length * perSkill);
  return { skill: skills[Math.floor(i / perSkill)], level: LEVELS[Math.floor((i % perSkill) / PER_LEVEL)] };
}

/** What the policy needs of a learner model: the chance of a right first answer (the Elo model and the logistic model both give it). */
export type ChanceModel = { predictAt(student: string, skill: string, level: Level): number };

export type AdaptiveOptions = {
  /**
   * A prerequisite then holds a skill back only while the student's chance on it is below this as well as UNLOCK_AT:
   * the chance of a student with no answers, for a model whose new students don't start at an even chance (the
   * logistic model), so that a skill still closes only once the student has shown weakness in what it builds on.
   */
  unlockFloor?: (skill: SkillId) => number;
  /** Skills of the last questions, most recent last. */
  recent?: readonly SkillId[];
  /** Breaks exact ties; Math.random in the app, a seeded generator in simulations. */
  random?: () => number;
  /** The chance of a right first answer to aim at: TARGET in the app; simulations try others. */
  target?: number;
  /**
   * What the student knows of each idea (ideaState.ts): with it, a question on a skill made of ideas aims at the
   * weakest, and such a skill is mastered only once every idea is likely known.
   */
  ideas?: IdeaState;
  /** The student's moving average on each skill: with it, a skill is mastered only once that has reached EMA_MASTERED_AT. */
  ema?: EmaState;
};

/** Whether a skill counts as mastered, given the chance the model gives a hard question on it and the student's evidence on the skill. */
export function isMastered(skill: SkillId, hard: number, options: Pick<AdaptiveOptions, "ideas" | "ema"> = {}): boolean {
  if (hard < MASTERED_AT) return false;
  if (options.ema && (options.ema[skill] ?? EMA.start) < EMA_MASTERED_AT) return false;
  return !options.ideas || !hasIdeas(skill) || allKnown(options.ideas, skill) >= IDEAS_MASTERED_AT;
}

/** The open skills, and the hard-question predictions they were judged by (adaptiveChoice needs those again). */
function open(model: ChanceModel, student: string, skills: readonly SkillId[], options: Pick<AdaptiveOptions, "unlockFloor" | "ideas" | "ema">): { open: SkillId[]; hard: Map<SkillId, number> } {
  const hard = new Map(skills.map((k) => [k, model.predictAt(student, k, 3)] as const));
  const unmastered = skills.filter((k) => !isMastered(k, hard.get(k)!, options));
  const floor = options.unlockFloor;
  const bar = (pre: SkillId) => (floor ? Math.min(UNLOCK_AT, floor(pre)) : UNLOCK_AT);
  const ready = unmastered.filter((k) => (PREREQUISITES[k] ?? []).every((pre) => !skills.includes(pre) || model.predictAt(student, pre, 2) >= bar(pre)));
  return { open: ready.length ? ready : unmastered.length ? unmastered : [...skills], hard };
}

/** The skills the student may practise now: prerequisites met and not mastered (all of them once everything is). */
export const openSkills = (model: ChanceModel, student: string, skills: readonly SkillId[], options: Pick<AdaptiveOptions, "unlockFloor" | "ideas" | "ema"> = {}): SkillId[] =>
  open(model, student, skills, options).open;

export function adaptiveChoice(model: ChanceModel, student: string, skills: readonly SkillId[], options: AdaptiveOptions = {}): Choice {
  const recent = (options.recent ?? []).slice(-RECENT);
  const random = options.random ?? Math.random;
  const target = options.target ?? TARGET;
  let best: (Choice & { score: number; tie: number }) | null = null;
  const { open: candidates, hard } = open(model, student, skills, options);
  for (const skill of candidates) {
    let penalty = 0;
    for (const k of recent) if (k === skill) penalty += RECENCY_PENALTY;
    for (const level of LEVELS) {
      const p = level === 3 ? hard.get(skill)! : model.predictAt(student, skill, level);
      const score = Math.abs(p - target) + penalty;
      const tie = random();
      if (!best || score < best.score - 1e-12 || (Math.abs(score - best.score) <= 1e-12 && tie < best.tie)) best = { skill, level, score, tie };
    }
  }
  const choice: Choice = { skill: best!.skill, level: best!.level };
  if (options.ideas && hasIdeas(choice.skill)) choice.idea = weakestIdea(options.ideas, choice.skill, random);
  return choice;
}

export function choose(policy: Policy, model: ChanceModel, student: string, skills: readonly SkillId[], position: number, options: AdaptiveOptions = {}): Choice {
  return policy === "fixed" ? fixedChoice(skills, position) : adaptiveChoice(model, student, skills, options);
}
