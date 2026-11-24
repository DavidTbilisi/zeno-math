// What a class experiment tests (issue #268). A class is made to test one feature: half its students get it and half
// don't, handed out in random blocks as they join (server/research.ts). Everything else is the same for both arms, so
// a difference between them on the tests is the feature's.
//
// "policy" is the study the app was built for: the adaptive choice of question against a fixed sequence through the
// skills. Any other feature is tested with the adaptive policy for everyone, and is switched off only for the arm
// without it; the features not under test stay on for both, but for those still on trial (ON_TRIAL), which stay off.
// The browser switches a feature off (PracticeDialog), and the server refuses an answer that shows a feature the
// student's arm doesn't have, so the arms can't mix.

/** The features a class can test, in the order the teacher sees them. A new one joins at the end. */
export const FEATURES = [
  // the question chosen by the learner model (on) or the fixed sequence (off)
  "policy",
  // a skill mastered comes back after days (spacing.ts, #263)
  "spaced",
  // a fractions operation missed is worked in steps before it is tried whole again (stepsOf in practice.ts)
  "steps",
  // after a miss on a skill made of ideas, "what exactly was hard?" (whatWasHard in learner.ts)
  "hard",
  // after a miss on a skill worked in steps, a worked example, then fewer steps given each time (fading.ts, #266)
  "faded",
  // after an early failure on a skill made of ideas, a few questions on its weakest idea, then back (stepDown.ts, #269)
  "stepdown",
  // a spaced review on a skill made of ideas opens with its weakest idea's card, one corner to fill (ideaCards.ts, #579)
  "cards",
  // a word problem's sentences marked given, asked, not needed or relation before it is solved (wordMarks.ts, #582)
  "marking",
  // after a run of right answers on a skill made of ideas, a worked answer to judge: right, or where and how it breaks
  // (breaks.ts and src/math/whereItBreaks.ts, #577)
  "breaks",
] as const;
export type Feature = (typeof FEATURES)[number];
/**
 * Features on trial: nobody has one but the arm with it in a class testing it. Step-down has been tried untargeted, and
 * cost students practice and completion for no gain (ASSISTments PSAYN42), so until a class shows the targeted kind
 * helps, nobody else gets it. The idea cards add a pick before a review that nothing has tested yet. Marking a word
 * problem first takes time from solving it, so it waits for a class too. "Where it breaks" takes questions from
 * practice for questions about worked answers, and no class has yet shown that is worth it.
 */
export const ON_TRIAL: readonly Feature[] = ["stepdown", "cards", "marking", "breaks"];
export const ARMS = ["on", "off"] as const;
/** on: the arm with the feature; off: the arm without it. */
export type Arm = (typeof ARMS)[number];
/** Each randomisation block hands out each arm twice in a random order, so a class never drifts more than 2 apart. */
export const BLOCK: readonly Arm[] = ["on", "on", "off", "off"];

/** The policy class practice chooses by: the fixed sequence only for the arm without the adaptive policy. */
export const conditionOf = (feature: Feature, arm: Arm): "adaptive" | "fixed" => (feature === "policy" && arm === "off" ? "fixed" : "adaptive");

/**
 * Whether a student in this arm of a class testing `feature` has `f`: the feature under test only in the "on" arm, a
 * feature on trial nowhere else, and everything else.
 */
export const hasFeature = (klass: { feature: Feature; arm: Arm }, f: Feature): boolean =>
  f === klass.feature ? klass.arm === "on" : !ON_TRIAL.includes(f);

/** The arm of a student from before arms: the adaptive condition had the feature (the adaptive policy). */
export const armOfCondition = (condition: string): Arm => (condition === "fixed" ? "off" : "on");
