// The checker the server marks answers with: the browser's own (src/math/practice.ts), which needs mathjs and MathJax.
// The Docker image has no node_modules, so the build bundles this file with them (npm run build:checker) and
// marking.ts loads the bundle there; elsewhere marking.ts loads this file from source.
// The verdict doesn't depend on the interface language, so the server marks in English.
import { en } from "../src/locales/en.ts";
import { learnFromAttempt, verdictOf, type AnswerVerdict, type Outcome } from "../src/learner.ts";
import { check, exercise, stepsOf, type SkillId } from "../src/math/practice.ts";
import type { Level } from "../src/model/elo.ts";
import type { IdeaState } from "../src/model/ideaState.ts";

export type Question = { skill: SkillId; level: number; seed: number };
/** An answer as stored: what was typed and the server's verdict. */
export type Answered = { input: string; verdict: AnswerVerdict };
/** A step as stored: its answers, and whether its answer was shown. */
export type SteppedThrough = { answers: Answered[]; shown: boolean };

/** Moves a student's ideas on by one stored attempt, as the browser does (learnFromAttempt): it rebuilds the question. */
export function trackIdeas(state: IdeaState, q: Question, outcome: string, answers: readonly Answered[], hard?: string[], steps?: readonly SteppedThrough[]): void {
  const timed = (list: readonly Answered[]) => list.map((a) => ({ ...a, ms: 0 }));
  learnFromAttempt(state, {
    skill: q.skill, level: q.level as Level, seed: q.seed, outcome: outcome as Outcome, answers: timed(answers), hard, steps: steps?.map((s) => ({ answers: timed(s.answers), shown: s.shown })),
  });
}

/** The verdict the checker gives this input for the question, or for its step when one is given: correct, close, wrong or form (sent back). */
export function mark(q: Question, input: string, step?: number): AnswerVerdict {
  const ex = exercise(q.skill, q.level as Level, q.seed, en.pracWords);
  return verdictOf(check(step === undefined ? ex : stepsOf(ex, en.pracWords)[step], input, en.pracWords));
}

/** How many steps the question is worked in after a wrong answer (none for most questions). */
export const stepCount = (q: Question) => stepsOf(exercise(q.skill, q.level as Level, q.seed, en.pracWords), en.pracWords).length;
