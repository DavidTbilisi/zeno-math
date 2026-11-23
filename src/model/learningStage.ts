// Learning stages (issue #576): what a skill has come to in the learner's mind, in the four stages an idea goes
// through, each its own kind of work (tracker #587). 1 comprehension, "I get it": the skill was mastered once. 2
// encoding, "I keep it": the first spaced review, a day or more later (spacing.ts), went right. 3 automaticity, "it's
// fast": after that, a run of right first answers on the top level, each at or under the learner's own pace on it.
// 4 problem-solving, "I can use it on something new": right on a question that mixes the skill with another or hides
// it in words (the questions of #581, #582 and #583; until they come, nothing reaches it).
//
// A stage is reached only in order, so a skill never shows gold while it is not green, and a missed spaced review
// drops it back to the first stage until it is mastered again and a later review goes right. Called "learning stages"
// because RoadStage (roadmap.ts) and the course's stages (course.ts) already mean groups of things to learn.
//
// The stage is worked out from the answers alone, one at a time in the order given, so whoever replays the same
// answers arrives at the same stage, as with spacing.ts and stepDown.ts. The caller says what its own rules make of
// each answer (mastered or not, a review or not), so free practice and class practice can each feed it.
import type { Level } from "./elo.ts";
import { usableMs } from "./elo.ts";

/** 0: not yet mastered once. 1 comprehension, 2 encoding, 3 automaticity, 4 problem-solving. */
export type LearningStage = 0 | 1 | 2 | 3 | 4;
export const LEARNING_STAGES = [1, 2, 3, 4] as const;

/** The level whose answers show automaticity: the hardest. */
export const TOP_LEVEL: Level = 3;
/** Right first answers on the top level in a row, each at or under the learner's own pace, that make a skill fast. */
export const FAST_RUN = 3;
/** Timed answers on the top level before the learner's own pace on it is a norm to beat. */
export const PACE_MIN = 3;
/** How much of each new time goes into the learner's pace on a skill: slow, as in pace.ts, since pace is a trait. */
export const PACE_DECAY = 0.2;

/**
 * A skill's stage, and what automaticity is judged by: the learner's moving average of log seconds over their timed
 * first answers on the top level (`pace`, over `timed` answers), and the right ones at or under it in a row (`fast`).
 */
export type StageState = { stage: LearningStage; pace?: number; timed?: number; fast?: number };
/** Every skill's state, by key (a skill). */
export type Stages = Record<string, StageState>;

/** What one answer says, as the caller's rules read it. */
export type StageAnswer = {
  level: Level;
  /** Right at the first try. */
  correct: boolean;
  /** Whether the skill counts as mastered once this answer is taken into account (the caller's rule, as spacing.ts). */
  mastered: boolean;
  /** Whether the answer was a spaced review that had fallen due (isDue in spacing.ts, before the answer). */
  review: boolean;
  /** How long the first answer took, in milliseconds; none or an unusable one counts as untimed. */
  ms?: number;
  /** Whether the question mixed the skill with another or hid it in words. */
  transfer?: boolean;
};

/** Moves `key`'s stage on by one answer. */
export function learnStage(s: Stages, key: string, a: StageAnswer): void {
  const st = (s[key] ??= { stage: 0 });
  if (a.review && !a.correct && st.stage > 0) {
    // A review gone wrong: the skill was not kept, so neither is anything built on keeping it.
    st.stage = 1;
    st.fast = 0;
  }
  if (st.stage === 0 && a.mastered) st.stage = 1;
  if (st.stage === 1 && a.review && a.correct) st.stage = 2;
  if (a.level === TOP_LEVEL && usableMs(a.ms)) {
    const y = Math.log(a.ms / 1000);
    const timed = st.timed ?? 0;
    // Judged against the pace before this answer, then the answer joins it.
    const fast = a.correct && timed >= PACE_MIN && y <= st.pace!;
    st.fast = fast && st.stage >= 2 ? (st.fast ?? 0) + 1 : 0;
    if (st.stage === 2 && st.fast >= FAST_RUN) st.stage = 3;
    st.pace = timed ? (1 - PACE_DECAY) * st.pace! + PACE_DECAY * y : y;
    st.timed = timed + 1;
  } else if (a.level === TOP_LEVEL && !a.correct) st.fast = 0;
  if (st.stage === 3 && a.correct && a.transfer) st.stage = 4;
}

/** The stage a key has reached: 0 when it has none. */
export const learningStageOf = (s: Stages | undefined, key: string): LearningStage => s?.[key]?.stage ?? 0;
