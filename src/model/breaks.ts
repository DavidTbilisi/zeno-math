// When a "where it breaks" question comes (issue #577): a run of right answers can be habit, and a student who adds
// fraction sums right may still believe that adding the tops and the bottoms is sometimes fine. So after BREAK_AFTER
// right answers in a row in class practice on a skill made of ideas (ideaState.ts), the next class question is a
// worked answer on that skill to judge: right, or where and how it breaks (src/math/whereItBreaks.ts). A wrong answer
// starts the run again; the question itself clears what was due, and only one is due at a time.
//
// It is a feature on trial (arms.ts): only the arm with it in a class testing it gets these questions. The state is
// worked out from the answers alone, one at a time in order, so the browser and the server (which replays every
// stored attempt, server/research.ts) arrive at the same one, as with step-down (stepDown.ts).
import type { SkillId } from "../math/practiceSkills.ts";
import { hasIdeas } from "./ideaState.ts";

/** Right answers in a row on a skill before a worked answer on it is shown to judge. */
export const BREAK_AFTER = 3;

export type Breaks = {
  /** For each skill made of ideas answered in class practice: the right answers in a row on it since the last break. */
  run: Record<string, number>;
  /** The skill whose worked answer comes next, until it has come. */
  due?: string;
};
export const noBreaks = (): Breaks => ({ run: {} });

/** Who chose the question, and what its answer says to the learner model (null: nothing to go by). */
export type BreakStep = { skill: SkillId; policy: string; correct: boolean | null };

/** Moves the state on by one question. */
export function learnBreaks(s: Breaks, q: BreakStep): void {
  if (q.policy === "breaks") {
    delete s.due;
    return;
  }
  // Only class practice counts: a review, a spaced review, free practice or homework is not the run.
  if (q.policy !== "adaptive" && q.policy !== "fixed") return;
  if (q.correct === null || !hasIdeas(q.skill)) return;
  if (!q.correct) {
    s.run[q.skill] = 0;
    return;
  }
  const n = (s.run[q.skill] ?? 0) + 1;
  if (n >= BREAK_AFTER && !s.due) {
    s.due = q.skill;
    s.run[q.skill] = 0;
  } else s.run[q.skill] = n;
}
