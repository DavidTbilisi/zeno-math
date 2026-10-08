// The predictable wrong answers the practice checker recognises and names. A question lists the ones its numbers make
// possible (the "traps": the answer each mistake would give); "sign" is tried on every question with a number, a set
// of roots or an expression for its answer. Kept apart from the generators so the words can be typed without the maths.
export const MISTAKES = [
  "sign",
  "addAcross",
  "flipFirst",
  "squareTerms",
  "noMiddle",
  "negPower",
  "powTimes",
  "subNeg",
  "leftToRight",
  "mulBeforePow",
  "grouped",
  "truncated",
  "placeLost",
  "doubleRound",
  "fullUnit",
  "noFlip",
  "boundary",
] as const;
export type MistakeId = (typeof MISTAKES)[number];
