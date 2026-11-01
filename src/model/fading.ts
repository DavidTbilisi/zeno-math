// Worked examples that fade (issue #266). A novice learns more from studying a worked example than from solving the
// same problem (Sweller and Cooper 1985), and the help should fade as they improve (Renkl and Atkinson 2003). On a
// skill whose questions are worked in steps (stepsOf in practice.ts), a wrong answer brings a worked example of the
// same kind; the next question of that kind has its first steps done and leaves the last one to the student; then the
// last two, and so on, until they solve it whole. A faded step answered wrong moves the fading back one step.
//
// The state is worked out from the answers alone, one at a time in order, so the browser and the server (which replays
// every stored attempt, server/research.ts) arrive at the same one, as with spaced review (spacing.ts).

/** For each skill being faded: how many steps, counted from the end, the student works on its next question. */
export type Fading = Record<string, number>;

/**
 * How many of a question's n steps are shown done: none (the question is asked whole) when the skill isn't being
 * faded, the question has fewer than two steps, or the student is to do all of them.
 */
export function givenSteps(f: Fading, skill: string, n: number): number {
  const left = f[skill];
  return left === undefined || n < 2 || left >= n ? 0 : n - left;
}

/** One question answered on a skill: its steps, how many of them were shown done, and how it went. */
export type Faded = {
  /** The question's steps (0 when it has none). */
  steps: number;
  /** Steps shown done before the student took over (0: the question was asked whole). */
  given: number;
  /** Asked whole: whether the first counted answer was right (null: nothing to go by). */
  correct: boolean | null;
  /** Faded: whether every step the student worked was right at their first counted answer. */
  stepsRight: boolean;
};

/** Moves the fading on by one question on the skill. */
export function learnFading(f: Fading, skill: string, q: Faded): void {
  if (q.given > 0) {
    const did = q.steps - q.given;
    f[skill] = q.stepsRight ? did + 1 : Math.max(1, did - 1);
    return;
  }
  if (q.steps < 2 || q.correct === null) return;
  if (q.correct) delete f[skill];
  // A miss: a worked example now, and the last step next time; while fading, one step back.
  else f[skill] = skill in f ? Math.max(1, Math.min(f[skill], q.steps) - 1) : 1;
}
