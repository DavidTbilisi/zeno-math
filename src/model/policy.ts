// Choosing the next practice question in a class study. The two conditions differ only here: feedback, worked
// solutions and the review of missed questions are the same for both.
//
// fixed: the class's skills in curriculum order, each at levels 1, 2 and 3 with PER_LEVEL questions at each, then
// round again. It ignores how the student is doing.
//
// adaptive: of the skills whose prerequisites the student has met and that they haven't mastered yet, the skill and
// level where the learner model's chance of a right first answer is closest to TARGET (about three in four right, as
// in Math Garden, Klinkenberg et al. 2011: hard enough to learn from, easy enough to keep going). A skill
// practised in the last few questions counts as further from the target, so practice interleaves.
import type { SkillId } from "../math/practiceSkills.ts";
import { PREREQUISITES } from "./curriculum.ts";
import type { EloModel, Level } from "./elo.ts";

export type Policy = "adaptive" | "fixed";
export type Choice = { skill: SkillId; level: Level };

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

export type AdaptiveOptions = {
  /** Skills of the last questions, most recent last. */
  recent?: readonly SkillId[];
  /** Breaks exact ties; Math.random in the app, a seeded generator in simulations. */
  random?: () => number;
  /** The chance of a right first answer to aim at: TARGET in the app; simulations try others. */
  target?: number;
};

/** The skills the student may practise now: prerequisites met and not mastered (all of them once everything is). */
export function openSkills(model: EloModel, student: string, skills: readonly SkillId[]): SkillId[] {
  const p = (skill: SkillId, level: Level) => model.predict({ student, skill, level });
  const unmastered = skills.filter((k) => p(k, 3) < MASTERED_AT);
  const ready = unmastered.filter((k) => (PREREQUISITES[k] ?? []).every((pre) => !skills.includes(pre) || p(pre, 2) >= UNLOCK_AT));
  return ready.length ? ready : unmastered.length ? unmastered : [...skills];
}

export function adaptiveChoice(model: EloModel, student: string, skills: readonly SkillId[], options: AdaptiveOptions = {}): Choice {
  const recent = (options.recent ?? []).slice(-RECENT);
  const random = options.random ?? Math.random;
  const target = options.target ?? TARGET;
  let best: (Choice & { score: number; tie: number }) | null = null;
  for (const skill of openSkills(model, student, skills)) {
    const penalty = RECENCY_PENALTY * recent.filter((k) => k === skill).length;
    for (const level of LEVELS) {
      const score = Math.abs(model.predict({ student, skill, level }) - target) + penalty;
      const tie = random();
      if (!best || score < best.score - 1e-12 || (Math.abs(score - best.score) <= 1e-12 && tie < best.tie)) best = { skill, level, score, tie };
    }
  }
  return { skill: best!.skill, level: best!.level };
}

export function choose(policy: Policy, model: EloModel, student: string, skills: readonly SkillId[], position: number, options: AdaptiveOptions = {}): Choice {
  return policy === "fixed" ? fixedChoice(skills, position) : adaptiveChoice(model, student, skills, options);
}
