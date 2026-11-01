// Targeted step-down (issue #269). Sending a student who fails early back through every prerequisite cost about ten
// problems and ten points of completion for no gain on the post-test (ASSISTments PSAYN42): they already got 81 % of
// the prerequisite problems right. What no one has tried is stepping down only to the one idea the estimate says is
// missing. On a skill made of ideas (ideaState.ts), two wrong of the first three answers in class practice bring
// STEP_DOWN_QUESTIONS questions on the skill's weakest idea, each the question that asks for it most alone
// (stepDownExercise in learner.ts), then straight back to the skill. Each skill steps down once at most.
//
// It is a feature on trial (arms.ts): only the arm with it in a class testing it gets it. The state is worked out from
// the answers alone, one at a time in order, so the browser and the server (which replays every stored attempt,
// server/research.ts) arrive at the same one, as with spaced review (spacing.ts) and fading (fading.ts).
import type { SkillId } from "../math/practiceSkills.ts";
import { hasIdeas, weakestIdea, type IdeaState } from "./ideaState.ts";

/** The answers on a skill that count as early. */
export const EARLY = 3;
/** Wrong answers among them that make an early failure. */
export const EARLY_MISSES = 2;
/** Questions on the weakest idea before going back to the skill. */
export const STEP_DOWN_QUESTIONS = 3;

export type StepDown = {
  /** For each skill made of ideas the student has answered in class practice: its early answers, and how many were wrong. */
  early: Record<string, { answered: number; wrong: number }>;
  /** The step-down under way: the skill failed early, its idea stepped down to, and the questions left on it. */
  now?: { skill: string; idea: string; left: number };
  /** The skill to go straight back to once the step-down is over, until a question on it comes. */
  back?: string;
};
export const noStepDown = (): StepDown => ({ early: {} });

/** Who chose the question, and what its answer says (null: nothing to go by). */
export type Stepped = { skill: SkillId; policy: string; correct: boolean | null };

/**
 * Moves the step-down on by one question, with the student's ideas as they stand after it (the weakest idea is taken
 * then; ties go to the first in the graph's order, so the browser and the server pick the same).
 */
export function learnStepDown(s: StepDown, q: Stepped, ideas: IdeaState): void {
  if (q.policy === "stepdown") {
    if (s.now && --s.now.left <= 0) {
      s.back = s.now.skill;
      delete s.now;
    }
    return;
  }
  // Only class practice counts: a review, a spaced review or free practice is not the skill's first go.
  if (q.policy !== "adaptive" && q.policy !== "fixed") return;
  if (s.back === q.skill) delete s.back;
  if (q.correct === null || !hasIdeas(q.skill)) return;
  const early = (s.early[q.skill] ??= { answered: 0, wrong: 0 });
  if (early.answered >= EARLY) return;
  early.answered++;
  if (!q.correct) early.wrong++;
  if (early.wrong >= EARLY_MISSES && !s.now) {
    early.answered = EARLY; // once is enough
    s.now = { skill: q.skill, idea: weakestIdea(ideas, q.skill, () => 0), left: STEP_DOWN_QUESTIONS };
  }
}
