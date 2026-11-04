// Homework made for one student (issue #297) from what class practice already knows of them: for a student who is
// stuck, a step back on that skill first (issue #303); then the spaced reviews that are due, then the questions the adaptive policy would ask next (on a skill made of ideas, aimed at the weakest idea,
// and interleaved across skills), then one stretch question, harder than the rest. No language model: the questions
// come from the same generators as class practice, so the server marks every answer, and each question keeps why it
// was chosen for the teacher to read.
//
// Homework is extra practice. Given to one arm of a class experiment it would change what the experiment compares, so
// a class gets homework only once its delayed post-test has been given (server/homework.ts).
//
// The server makes it (through the checker bundle, which has the generators) and stores each question by skill, level
// and seed; the student's browser rebuilds the questions from those, in the student's language.
import { en } from "./locales/en";
import type { SkillId } from "./math/practiceSkills";
import { exerciseFor } from "./learner";
import { adaptiveChoice, type ChanceModel, type EmaState } from "./model/policy";
import type { IdeaState } from "./model/ideaState";
import { nextReview, openAgain, type Spacing } from "./model/spacing";
import type { Level } from "./model/elo";
import { HOMEWORK_REPAIRS, HOMEWORK_REVIEWS, REPAIR_TARGET, STRETCH_TARGET, type HomeworkItem, type HomeworkWhy, type Repair } from "./model/homework";

/** What homework is made from: the student's records in the model, and their ideas, moving averages and spaced reviews. */
export type HomeworkInput = {
  model: ChanceModel;
  /** The student's name in the model. */
  student: string;
  /** The class's skills. */
  skills: readonly SkillId[];
  ideas: IdeaState;
  ema: EmaState;
  spacing: Spacing;
  now: number;
  /** The adaptive policy's unlock floor (policy.ts), as class practice uses it. */
  unlockFloor?: (skill: SkillId) => number;
  /** Where the student is stuck, if they are (server/homework.ts takes it from the teacher's stuck list). */
  repair?: Repair | null;
};

/** The level of a skill whose chance of a right first answer comes closest to REPAIR_TARGET; on a tie, the easier. */
export function repairLevel(model: ChanceModel, student: string, skill: SkillId): Level {
  const off = (L: Level) => Math.abs(model.predictAt(student, skill, L) - REPAIR_TARGET);
  return ([2, 3] as const).reduce<Level>((best, L) => (off(L) < off(best) ? L : best), 1);
}

/**
 * The student's homework of `length` questions: for a stuck student, HOMEWORK_REPAIRS repair questions on the skill
 * they are stuck on, at the level they are most likely to get right (repairLevel) and aimed at the idea when there is
 * one; then up to HOMEWORK_REVIEWS spaced reviews that are due, each on another skill and asked hard as class practice
 * asks them; then the adaptive policy's choices, as if each were answered on
 * the way (the recent skills move on, so the questions interleave; nothing else does, since nothing is answered yet);
 * then one stretch question.
 */
export function homeworkFor(s: HomeworkInput, length: number, random: () => number = Math.random): HomeworkItem[] {
  const seed = () => Math.floor(random() * 2 ** 31);
  const items: HomeworkItem[] = [];
  // At least one practice question and the stretch, whatever comes before them.
  const room = length - 2;
  if (s.repair && s.skills.includes(s.repair.skill)) {
    const { skill, idea } = s.repair;
    const level = repairLevel(s.model, s.student, skill);
    while (items.length < Math.min(HOMEWORK_REPAIRS, room)) {
      const ex = exerciseFor({ skill, level, ...(idea ? { idea } : {}) }, en.pracWords, random);
      items.push({ skill, level, seed: ex.seed, why: "repair", ...(idea ? { idea } : {}) });
    }
  }
  const repairs = items.length;
  const reviewed = new Set<string>();
  while (items.length < repairs + Math.min(HOMEWORK_REVIEWS, room - repairs)) {
    const k = nextReview(s.spacing, s.now, (k) => s.skills.includes(k as SkillId) && !reviewed.has(k), (k) => k);
    if (!k) break;
    reviewed.add(k);
    items.push({ skill: k as SkillId, level: 3, seed: seed(), why: "review" });
  }
  const options = { ideas: s.ideas, ema: s.ema, again: openAgain(s.spacing) as SkillId[], unlockFloor: s.unlockFloor, random };
  const recent: SkillId[] = items.map((i) => i.skill);
  const ask = (why: HomeworkWhy, target?: number) => {
    const c = adaptiveChoice(s.model, s.student, s.skills, { ...options, recent, ...(target === undefined ? {} : { target }) });
    const ex = exerciseFor(c, en.pracWords, random);
    items.push({ skill: c.skill, level: c.level, seed: ex.seed, why, ...(c.idea ? { idea: c.idea } : {}) });
    recent.push(c.skill);
  };
  while (items.length < length - 1) ask("practice");
  ask("stretch", STRETCH_TARGET);
  return items;
}
