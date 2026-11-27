// Idea cards (issue #579): an encoding step between understanding an idea and practising it (tracker #587, the green
// stage). Every idea of the concept graphs (IDEAS in conceptGraph.ts) gets a card of four corners a student can hold in
// mind as one unit: a glyph that names it (the name-hook), its essence in one line, the look-alike it is easily taken
// for with the one test that tells them apart, and the failure: the mistake that shows the idea is missing, which for
// the ideas that have one is the trap ideaState.ts blames on it (gapIdea). The words are in the card locales
// (src/locales/cards); here is what needs none.
//
// A glyph is part of the design: no two ideas share one, none is a symbol's, a topic's or a menu entry's, and once
// given it is kept (tests/ideaCards.test.ts pins every one). The card is shown on its home topic's page under the
// intro, and a spaced review due on a skill made of ideas opens with the card of its weakest idea, one corner covered,
// for the student to fill from a short choice (coveredCard). The pick moves nothing: no mastery, no idea, no stage.
import type { MistakeId } from "../math/mistakes.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { IDEAS, type IdeaNode } from "./conceptGraph.ts";
import { SKILL_IDEAS, type IdeaSkill } from "./ideaState.ts";

export const CORNERS = ["glyph", "essence", "like", "failure"] as const;
export type Corner = (typeof CORNERS)[number];

export type IdeaCard = {
  /** The name-hook: a few characters, unique across Zeno and never changed. */
  glyph: string;
  /** The skill whose concept graph brings the idea in: its topic's page shows the card. */
  home: IdeaSkill;
  /** The look-alike, when it is another idea with a card (its glyph is shown beside its name). */
  like?: IdeaNode;
  /** The recognised mistake blamed on the idea (GAPS in conceptGraph.ts), when it has one. */
  trap?: MistakeId;
};

export const IDEA_CARDS: Readonly<Record<IdeaNode, IdeaCard>> = {
  // whole-number arithmetic
  addWhole: { glyph: "+−", home: "times", like: "multiplyFacts", trap: "missingAdd" },
  multiplyFacts: { glyph: "7×8", home: "times", like: "addWhole" },
  multiplyLong: { glyph: "23×4", home: "times", like: "multiplyFacts" },
  divideExact: { glyph: "56÷8", home: "hcf" },
  hcf: { glyph: "∩↑", home: "hcf", like: "lcm" },
  lcm: { glyph: "∩↓", home: "hcf", like: "hcf" },
  // fractions
  part: { glyph: "▮▯▯", home: "fractions" },
  equivalent: { glyph: "½=²⁄₄", home: "fractions", like: "lowest", trap: "addedToBoth" },
  lowest: { glyph: "↓¾", home: "fractions", like: "equivalent" },
  commonDenom: { glyph: "□⁄₁₂", home: "fractions", like: "multiply" },
  addSub: { glyph: "⅕+⅖", home: "fractions", like: "multiply", trap: "addAcross" },
  multiply: { glyph: "½×⅓", home: "fractions", like: "addSub" },
  reciprocal: { glyph: "⅔↕", home: "fractions" },
  divide: { glyph: "÷⅔", home: "fractions", like: "multiply", trap: "flipFirst" },
  toImproper: { glyph: "2¾→", home: "fractions", like: "toMixed", trap: "wholeTimesTop" },
  toMixed: { glyph: "→2¾", home: "fractions", like: "toImproper" },
  // signed numbers
  negLine: { glyph: "←0→", home: "integers", trap: "riseAdds" },
  addNeg: { glyph: "+(−)", home: "integers", like: "minusNeg", trap: "sumSign" },
  minusNeg: { glyph: "−(−)", home: "integers", like: "addNeg", trap: "subNeg" },
  signTimes: { glyph: "−×−", home: "integers", like: "addNeg", trap: "unlikeSigns" },
  // powers
  powValue: { glyph: "2⁵", home: "indices", like: "multiplyFacts" },
  powLaws: { glyph: "aᵐ⁺ⁿ", home: "indices", trap: "powersAddedForDivide" },
  negIndex: { glyph: "2⁻³", home: "indices", trap: "negPower" },
  fracIndex: { glyph: "x^½", home: "indices", like: "negIndex", trap: "powTimes" },
  // brackets
  distribute: { glyph: "a(b+c)", home: "expand", like: "twoBrackets", trap: "firstTermOnly" },
  twoBrackets: { glyph: "()()", home: "expand", like: "distribute", trap: "noMiddle" },
  squareBracket: { glyph: "()²", home: "expand", trap: "squareTerms" },
  // order of operations
  bracketsFirst: { glyph: "(…)", home: "order", like: "mulFirst" },
  powFirst: { glyph: "3×2²", home: "order", like: "bracketsFirst", trap: "mulBeforePow" },
  mulFirst: { glyph: "2+3×4", home: "order", like: "chainLeft", trap: "leftToRight" },
  chainLeft: { glyph: "9−4−2", home: "order", like: "mulFirst", trap: "grouped" },
  // rounding
  roundPlace: { glyph: "5↑4↓", home: "rounding", trap: "doubleRound" },
  placeHolders: { glyph: "…00", home: "rounding", trap: "placeLost" },
  sigFigs: { glyph: "0.0①②", home: "rounding", like: "roundPlace" },
  stdForm: { glyph: "×10ⁿ", home: "rounding", trap: "powerOneOut" },
  bounds: { glyph: "±½", home: "rounding", like: "roundPlace", trap: "fullUnit" },
  // linear equations (#755)
  undoOp: { glyph: "2x=6", home: "linear", like: "balance", trap: "inverseNotUsed" },
  checkRoot: { glyph: "x=5?", home: "linear", like: "undoOp", trap: "coefficientIgnored" },
  balance: { glyph: "3x=x+4", home: "linear", like: "undoOp", trap: "xTermsAdded" },
  writeEquation: { glyph: "✎=", home: "linear", trap: "storyOpSwapped" },
  eqSteps: { glyph: "⇣=⇣", home: "linear", trap: "mistakeLaterLine" },
  solutionCount: { glyph: "1·0·∞", home: "linear", trap: "solutionCountSwapped" },
  // expressions (#755)
  letterTimes: { glyph: "xy=x·y", home: "sameExpression", trap: "letterAsDigit" },
  letterSquare: { glyph: "x·x=x²", home: "sameExpression", like: "letterTimes", trap: "coefficientSquared" },
  termSigns: { glyph: "−3y", home: "sameExpression", like: "likeTerms", trap: "termSignLost" },
  likeTerms: { glyph: "2x=x+x", home: "sameExpression", like: "termSigns", trap: "joinedUnlike" },
  wordsToExpr: { glyph: "n−5", home: "sameExpression", trap: "lessThanReversed" },
  factorOut: { glyph: "3(…)", home: "sameExpression", like: "distribute", trap: "factorNotDividedAll" },
  // decimals (#755)
  decCompare: { glyph: "0.4>0.35", home: "decimals", trap: "longerDecimal" },
  decAlign: { glyph: "·|·", home: "decimals", like: "decCompare", trap: "alignedRight" },
  decShift: { glyph: "×10→", home: "decimals", like: "decTimes", trap: "pointWrongWay" },
  decTimes: { glyph: "0.3×4", home: "decimals", like: "decShift" },
  divPastPoint: { glyph: "7÷4=1.75", home: "decimals", like: "decTimes" },
  // percentages (#755)
  perHundred: { glyph: "▦%", home: "percent", like: "asPercent", trap: "partsAsPercent" },
  percentOf: { glyph: "25%", home: "percent", like: "asPercent", trap: "onePercentTenth" },
  asPercent: { glyph: "a÷b·%", home: "percent", like: "percentOf", trap: "countAsPercent" },
  reversePercent: { glyph: "?=100%", home: "percent", like: "percentOf", trap: "percentOfPart" },
  percentChange: { glyph: "Δ%", home: "percent", like: "asPercent" },
  // ratio (#755)
  ratioSimplify: { glyph: "6:4→3:2", home: "ratio", like: "ratioScale" },
  ratioScale: { glyph: "3:2", home: "ratio", like: "ratioParts", trap: "addedNotScaled" },
  ratioParts: { glyph: "▮▮:▮▮▮", home: "ratio", like: "ratioScale", trap: "ratioAsFraction" },
  ratioUnits: { glyph: "cm:m", home: "ratio", like: "ratioSimplify", trap: "ratioUnitsMixed" },
  ratioOrder: { glyph: "A:B", home: "ratio", like: "ratioScale", trap: "ratioPointSwapped" },
  // proportion (#755)
  directProp: { glyph: "y∝x", home: "proportion", like: "inverseProp", trap: "constantDifference" },
  constantK: { glyph: "y=kx", home: "proportion", like: "directProp", trap: "kInverted" },
  propEquation: { glyph: "a/b=c/x", home: "proportion", like: "constantK", trap: "proportionFlipped" },
  inverseProp: { glyph: "y∝1/x", home: "proportion", like: "directProp", trap: "inverseAsDirect" },
  powerProp: { glyph: "y∝x²", home: "proportion", like: "directProp", trap: "powerIgnored" },
};

/** Every idea with a card, in the order the app lists ideas (IDEAS). */
export const CARD_IDEAS = Object.keys(IDEAS) as IdeaNode[];

/** The ideas whose cards a topic's page shows: those brought in by one of its skills, in the app's order. */
export const cardsOf = (skills: readonly SkillId[]): IdeaNode[] => CARD_IDEAS.filter((id) => (skills as readonly string[]).includes(IDEA_CARDS[id].home));

/** How many choices fill a covered corner: the corner itself and two from the skill's other ideas. */
export const CHOICES = 3;

/** A card with one corner covered: the idea, the corner, and the ideas whose same corner are the choices, shuffled. */
export type Covered = { idea: IdeaNode; corner: Corner; choices: IdeaNode[] };

/**
 * The card a review on `skill` opens with: its weakest idea's (`idea`), one corner covered at random, and the choices
 * to fill it: that corner of the idea and of CHOICES − 1 other ideas of the same skill, in a random order. Nothing
 * here is learner state: the pick is not counted, so `random` may be anything.
 */
export function coveredCard(skill: IdeaSkill, idea: IdeaNode, random: () => number = Math.random): Covered {
  const pickOf = <T,>(xs: readonly T[]) => xs[Math.min(xs.length - 1, Math.floor(random() * xs.length))];
  const corner = pickOf(CORNERS);
  const others = SKILL_IDEAS[skill].filter((id) => id !== idea);
  const chosen: IdeaNode[] = [idea];
  while (chosen.length < CHOICES && others.length) chosen.push(others.splice(Math.floor(random() * others.length) % others.length, 1)[0]);
  // A Fisher–Yates shuffle, so the right one isn't always first.
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return { idea, corner, choices: chosen };
}
