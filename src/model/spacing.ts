// Spaced review (issue #263): a mastered skill comes back after days, not never. What a student shows on the day does
// not last to the next assignment (ASSISTments, 23 October 2026: streaks don't carry over), and reviewing after growing
// gaps is the oldest reliable finding about memory (Ebbinghaus 1885; Cepeda et al. 2006, a review of 254 studies).
//
// The schedule is worked out from the answers alone, one at a time in the order given, so the browser and the server
// (server/research.ts, which replays every stored attempt) arrive at the same one. Each key is something that can be
// mastered: a skill in class practice, a skill at a level in free practice. Once it is mastered its first review falls
// a day later. An answer on it once the review is due is the review: right, and the next one falls after the next
// interval (1, 3, 7, then every 21 days); wrong, and it is open for practice again ("again") until the student has it
// mastered once more and answers it right, when it starts over from a day. Answers before a review is due move nothing.
// Times are the student's clock (Date.now() when the question was shown), so a day is a day where they are.
import type { SkillId } from "../math/practiceSkills.ts";
import type { IdeaState } from "./ideaState.ts";
import { isMastered, type ChanceModel, type EmaState } from "./policy.ts";

export const DAY = 86_400_000;
/** The gaps between reviews, in days: the first after mastery, then one more after each right review, the last repeating. */
export const INTERVAL_DAYS = [1, 3, 7, 21] as const;

/** step: how many right reviews in a row (an index into INTERVAL_DAYS, capped at its last); due: when the next review falls. */
export type Due = { step: number; due: number; again?: true };
/** The schedule of everything mastered so far, by key. */
export type Spacing = Record<string, Due>;

const after = (step: number, at: number): Due => ({ step, due: at + INTERVAL_DAYS[Math.min(step, INTERVAL_DAYS.length - 1)] * DAY });

/**
 * Moves the schedule on by one answer on `key`, given at `at`: whether its first try was right, and whether the key
 * counts as mastered once this answer is taken into account (by the caller's rule).
 */
export function learnSpacing(s: Spacing, key: string, correct: boolean, mastered: boolean, at: number): void {
  const d = s[key];
  if (!d) {
    if (mastered) s[key] = after(0, at);
  } else if (d.again) {
    if (correct && mastered) s[key] = after(0, at);
  } else if (at >= d.due) s[key] = correct ? after(d.step + 1, at) : { ...after(0, at), again: true };
}

/** Whether the key's review is due: a key open again is being practised, not reviewed. */
export const isDue = (d: Due | undefined, now: number): boolean => !!d && !d.again && d.due <= now;

/** The keys open again after a missed review: practice must not count them as mastered until they are learnt anew. */
export const openAgain = (s: Spacing): string[] => Object.keys(s).filter((k) => s[k].again);

/**
 * The review to ask next, of the keys that `fits` allows: the one due longest, but not on the skill just asked if
 * another one is due (reviews mix skills). `skillOf` reads a key's skill; null when nothing is due.
 */
export function nextReview(s: Spacing, now: number, fits: (key: string) => boolean, skillOf: (key: string) => string, last?: string): string | null {
  const due = Object.keys(s).filter((k) => fits(k) && isDue(s[k], now)).sort((a, b) => s[a].due - s[b].due || (a < b ? -1 : 1));
  return due.find((k) => skillOf(k) !== last) ?? due[0] ?? null;
}

/**
 * Moves a student's spaced reviews on by an answer in class practice, once the model, the moving average and the ideas
 * have learnt from it, the same in the browser (learner.ts) and on the server (server/research.ts): a skill is
 * mastered by the adaptive policy's rule (policy.ts), whichever condition the student is in.
 */
export function learnClassSpacing(
  spacing: Spacing, model: ChanceModel, student: string, ema: EmaState, ideas: IdeaState, skill: SkillId, correct: boolean, at: number,
): void {
  learnSpacing(spacing, skill, correct, isMastered(skill, model.predictAt(student, skill, 3), { ema, ideas }), at);
}

/**
 * Mastered or kept (issue #264): a key is mastered once practice gets it there, and kept once a review days later has
 * gone right; a review gone wrong sends it back to practise ("again") until it is mastered anew, then kept anew. So it
 * is kept only through a right delayed review. Reaching mastery is progress; keeping it is the result.
 */
export type Hold = "mastered" | "kept" | "again";
export const holdOf = (d: Due | undefined): Hold | null => (!d ? null : d.again ? "again" : d.step >= 1 ? "kept" : "mastered");
/** The keys of a schedule by how they hold, each in the order given. */
export function holds(s: Spacing, keys: readonly string[] = Object.keys(s)): Record<Hold, string[]> {
  const out: Record<Hold, string[]> = { mastered: [], kept: [], again: [] };
  for (const k of keys) {
    const h = holdOf(s[k]);
    if (h) out[h].push(k);
  }
  return out;
}
