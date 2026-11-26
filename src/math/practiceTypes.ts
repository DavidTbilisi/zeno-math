// The shapes of practice: a question (Exercise) and its parts, the kinds of answer and how they are checked, the
// formats and solution kinds, and the words a question is written in (PracticeWords). Types only, plus the levels,
// so any module can name a question without loading the generators.
import type { NumberLang } from "./numberWords";
import type { ArcWords } from "./arcs";
import type { BarModelWords } from "./barProblems";
import type { BreakWords } from "./whereItBreaks";
import type { RowWords } from "./rowsAndPatterns";
import type { LogicWords } from "./logicSets";
import type { CalcTwoWords } from "./calculusTwo";
import type { LinAlgWords } from "./linearAlgebra";
import type { ComplexWords } from "./complexPractice";
import type { VecCalcWords } from "./vectorCalculus";
import type { OdeWords } from "./odes";
import type { RealWords } from "./realAnalysis";
import type { GroupWords } from "./groups";
import type { RingsFieldsWords } from "./ringsFields";
import type { TopologyWords } from "./topology";
import type { StatWords } from "./mathStats";
import type { NumAnalysisWords } from "./numericalAnalysis";
import type { HigherGeometryWords } from "./higherGeometry";
import type { OptimisationWords } from "./optimisation";
import type { StochasticWords } from "./stochastic";
import type { GameWords } from "./gameTheory";
import type { CryptoWords } from "./crypto";
import type { MeasureWords } from "./measureTheory";
import type { FunctionalWords } from "./functionalAnalysis";
import type { FoundationsWords } from "./foundations";
import type { DynamicsWords } from "./dynamics";
import type { FinanceWords } from "./finance";
import type { PdeWords } from "./pdes";
import type { NtWords } from "./numberTheoryTwo";
import type { ProbWords } from "./probTheory";
import type { DiscreteWords } from "./discrete";
import type { ComplexAnalysisWords } from "./complexAnalysis";
import type { ClaimId, ProofWords } from "./proofs";
import type { Bench } from "./benchmark";
import type { StemWords } from "./dataGraphs";
import type { PinPlay } from "./estimate";
import type { E } from "./expr";
import type { ExprOption } from "./exprMatch";
import type { OrderItem, OrderProblem } from "./fracOrder";
import type { GeoPlay, PolyProblem } from "./geoPlay";
import type { StoryWord } from "./graphStory";
import type { CompareSign } from "./live";
import type { MistakeId } from "./mistakes";
import type { NumberTheoryWords } from "./numberTheory";
import type { SkillId } from "./practiceSkills";
import type { ProportionWords } from "./proportion";
import type { ShadePlay } from "./shadeFrac";
import type { TriangleSidesWords } from "./sidesAndSecants";
import type { TargetPuzzle } from "./target";
import type { DurationStems } from "./timePics";
import type { TrigRuleWords } from "./trigRules";
import type { Mark, MarkedSentence } from "./wordMarks";

export type Level = 1 | 2 | 3;

export const LEVELS: Level[] = [1, 2, 3];

/** The tools whose pictures serve as worked solutions. */
export type SolutionKind = "compare" | "fractionBars" | "model" | "algebra" | "powers" | "coord" | "trig" | "deriv" | "applied" | "statistics" | "comb" | "nt" | "inference" | "vectors" | "sequences" | "functions" | "identities" | "polynomials" | "euclid" | "numerical" | "shape" | "pin" | "dots" | "wall" | "orderline" | "shade" | "balance" | "grow" | "angle" | "angles" | "mirror" | "net" | "plot" | "chart" | "story" | "slope" | "stroke" | "colour" | "route" | "network" | "matrix" | "randvar" | "decimal" | "percent" | "ratio" | "rate" | "round" | "divisible" | "time" | "diagram" | "trigRule" | "arc";

export type Format =
  | "number" | "exact" | "fraction" | "dp2" | "dp3" | "roots" | "point" | "vector" | "interval" | "line" | "expr" | "factors" | "antiderivative" | "primes"
  | "inequality" | "standard" | "sign" | "shape" | "pin" | "target" | "near" | "order" | "shade" | "pick" | "divisors" | "ratio" | "matrix" | "pair" | "xyz" | "eigvec" | "nullvec" | "singular" | "complex" | "complexPolar" | "complexList" | "plane" | "exprT" | "exprS" | "potential" | "supInf" | "limits" | "images"
  | "clock" | "duration" | "measure" | "algFraction" | "formula" | "base" | "lines" | "counter" | "decide" | "elements" | "bits";

/** A larger unit and the smaller one it is made of, f of them to one (1 m = 100 cm). */
export type MeasurePair = { big: MeasureUnit; small: MeasureUnit; f: number };

/** The parts of the day a 12-hour time is said in. */
export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** The units a measurement is converted between (decimals). */
export type MeasureUnit = "km" | "m" | "cm" | "mm" | "kg" | "g" | "l" | "ml";

/** One end of the solution set of an inequality: closed when the number itself is included. */
export type Bound = { v: number; closed: boolean };

/** A complex number, a + bi. */
export type CxVal = { re: number; im: number };

/** A predictable mistake and the answer it gives (with the numbers its message names). */
export type Trap = { id: MistakeId; a: Answer; vars?: Record<string, string | number> };

export type Answer = (
  /** std: the answer is asked for in standard form, a × 10ⁿ; form: as an improper fraction or a mixed number, or as
   *  a fraction at all, or as a decimal (one written as the other: the question typed back is the right value in the
   *  wrong form). */
  /** `units`: unit signs the answer may end in ("5.64 m"); they are taken off before it is read. */
  | { k: "num"; v: number; tol: number; lowest?: boolean; surd?: boolean; std?: boolean; form?: "improper" | "mixed" | "fraction" | "decimal"; units?: readonly string[] }
  /** `listed`: the elements of a set are listed, so how many there are is part of the answer, not told: a list of the
   *  wrong length is wrong (and may be a named slip), not sent back. */
  | { k: "set"; vs: number[]; tol: number; listed?: boolean }
  /** Values in order; they may be typed named ("y = 3; x = 2"), by `names` (x, y, z when not given). */
  | { k: "tuple"; vs: number[]; tol: number; names?: string[] }
  /** A matrix, row by row. */
  | { k: "matrix"; rows: number[][]; tol: number }
  /** A direction: any non-zero multiple of vs (an eigenvector). */
  | { k: "dir"; vs: number[] }
  /**
   * One complex number, or several compared as a list in any order (the roots of an equation), typed as a + bi or
   * re^{iθ}. `polar`: asked for in the form re^{iθ}, so a + bi is the right value in the wrong form.
   */
  | { k: "complex"; vs: CxVal[]; tol: number; polar?: boolean }
  /** `vars`: letters besides x the answer is in (a formula's subject); they are tried at positive values.
   *  `fraction`: one fraction, cut down (no factor common to the top and the bottom). */
  | { k: "expr"; e: E; mode?: "factor" | "expand" | "plusC" | "line" | "fraction"; vars?: readonly string[] }
  | { k: "primes"; n: number }
  /** x between lo and hi; a missing end is unbounded. */
  | { k: "ineq"; lo: Bound | null; hi: Bound | null }
  /** The sign between two numbers. */
  | { k: "sign"; v: CompareSign }
  /** A shape made on a dot grid, typed as its corners ("poly:1,1;5,1;5,4"); sample is one that does it. */
  | { k: "poly"; play: GeoPlay; sample: string }
  /** A pin put on a number line ("pin:36.8"): right within 5 % of the line of v, close within 10 %. */
  | { k: "pin"; play: PinPlay; v: number }
  /** A sum of the cards (each at most once, every one when `all`) that makes the target. */
  | { k: "target"; puzzle: Pick<TargetPuzzle, "cards" | "target" | "ops" | "all">; sample: string }
  /** One of the options offered, picked: the benchmark nearest a number, or the one equal to a fraction. */
  | { k: "near"; options: Bench[]; right: number }
  /** The items listed in the order `seq` (places in `items`): smallest first, or the order a slip gives. */
  | { k: "order"; items: OrderItem[]; seq: number[] }
  /** `count` of the shape's pieces shaded ("shade:0,1,5"), any of them. */
  | { k: "shade"; play: ShadePlay; count: number }
  /** One of the expressions offered, picked or typed as written (not any equal one: that would be the question). */
  | { k: "pick"; options: ExprOption[]; right: number }
  /** The divisors of n among those `offered`, listed in any order. */
  | { k: "divisors"; n: number; offered: number[]; right: number[] }
  /** A ratio of whole numbers in its simplest form, a : b or a : b : c. */
  | { k: "ratio"; vs: number[] }
  /**
   * A time on the clock (t minutes after midnight), typed as h:mm. On the 24-hour clock when h24, else any hour that
   * shows the same on a clock with hands; `face` asks what a clock with hands shows, so the hour is 1 to 12. `typed`:
   * how a trap's answer is typed when it is no real time (2:75).
   */
  | { k: "clock"; t: number; h24?: boolean; face?: boolean; typed?: string }
  /** A length of time in minutes, typed as minutes or as hours and minutes (85 min, 1 h 25 min, 1:25). */
  | { k: "dur"; m: number; typed?: string }
  /**
   * A measure, v of the smaller unit of a pair: typed in the smaller unit (235, 235 cm) or, when `whole`, in both
   * (2 m 35 cm). `typed`: how a trap's answer is typed.
   */
  | ({ k: "meas"; v: number; whole?: boolean; typed?: string } & MeasurePair)
  /** A proof's lines put in order, typed as their letters ("C, A, D"); `count` lines are shown, those not in `seq` don't belong. */
  | { k: "lines"; count: number; seq: number[] }
  /** An object that breaks a claim (src/math/proofs.ts), tested by the claim's own rule. */
  | { k: "counter"; claim: ClaimId }
  /** A claim decided true or false; when false, with a counterexample after it ("false: 40"). */
  | { k: "decide"; claim: ClaimId; truth: boolean }
) & { traps?: Trap[] };

/** What a question answered by doing rather than typing shows: a dot grid to make a shape on, a line to put a pin on. */
export type Play =
  | ({ kind: "grid" } & GeoPlay)
  | ({ kind: "pin" } & PinPlay)
  /** Dots shown for `ms` and hidden, then the number typed: the dots' picture, `h` high. */
  | { kind: "flash"; ms: number; body: string; h: number }
  /** A shape cut into pieces to shade by tapping. */
  | ({ kind: "shade" } & ShadePlay);

export type Exercise = {
  skill: SkillId;
  level: Level;
  seed: number;
  /** The instruction, in words. */
  prompt: string;
  /** The question in LaTeX ("" when the prompt says it all). */
  q: string;
  /** A drawing that goes with the question (the right triangle), with its height and the width it can take up. */
  pic?: { svg: (x: number, y: number) => string; h: number; w: number };
  answer: Answer;
  /** The answer in LaTeX. */
  show: string;
  /** A typed answer that is accepted (for the tests). */
  plain: string;
  format: Format;
  solution?: { kind: SolutionKind; spec: unknown };
  /** Worked lines when no tool draws the solution. */
  steps?: string[];
  /**
   * The question as plain working ("-3 - (-5)", "2 + 3 * 4"), on the skills with no solution spec to read it from
   * (integers, order): what conceptGraph.ts reads its ideas off.
   */
  src?: string;
  /**
   * The steps before the last, each a question of its own, on a skill whose questions are worked in steps (stepsOf):
   * the last step is the question itself. Faded worked examples show some of them done and leave the rest.
   */
  worked?: Part[];
  /** Answered by doing rather than typing: a shape made on a grid, a pin put on a line (the answer is still text). */
  play?: Play;
  /**
   * A word problem in its sentences, each with its right mark (wordMarks.ts): the prompt is these read in order. In
   * practice the student marks them before solving (issue #582).
   */
  marked?: MarkedSentence[];
};

/** A step of a question: a question without its skill, level and seed, which are the question's. */
export type Part = Omit<Exercise, "skill" | "level" | "seed" | "worked">;

/** The words of marking a word problem: each mark's name and why a sentence has it, and the steps around them. */
export type MarkWords = {
  /** What to do, over the sentences. */
  intro: string;
  /** The keys, for the keyboard. */
  keys: string;
  /** The sentences' group, and the marks' group, for a screen reader. */
  sentences: string;
  marks: string;
  name: Record<Mark, string>;
  /** On a relation: whose amount is bigger? */
  bigger: string;
  /** A relation's tag with the bigger picked: "Relation · Ann more". */
  biggerTag: string;
  check: string;
  allRight: string;
  /** One wrong mark pointed out: "this sentence is {mark}." and why. */
  wrong: string;
  why: Record<Mark, string>;
};

export type PracticeWords = {
  practicalTrig: {
    ladder: string; ramp: string; cable: string;
    opp: string; adj: string; hyp: string; ang: string;
    given: string; find: string; length: string; angle: string; diagram: string;
  };
  /** Trigonometry beyond the right angle: the prompt of each kind of question (src/math/trigRules.ts). */
  trigRules: TrigRuleWords;
  /** Arcs, sectors and radians: the prompt of each kind of question (src/math/arcs.ts). */
  arcs: ArcWords;
  proportion: ProportionWords;
  /** Number bases, divisors, remainders and congruences: the prompts (src/math/numberTheory.ts). */
  numberTheory: NumberTheoryWords;
  /** The triangle inequality: the prompts (src/math/sidesAndSecants.ts). */
  triangleSides: TriangleSidesWords;
  /** Bar-model word problems: the names, prompts and steps (src/math/barProblems.ts). */
  barModels: BarModelWords;
  /** "Where it breaks": a worked answer to judge, and the names of the mistakes in it (src/math/whereItBreaks.ts). */
  breaks: BreakWords;
  /** Ordinal numbers and repeating patterns: shapes, colours, ordinals, prompts (src/math/rowsAndPatterns.ts). */
  rows: RowWords;
  /** Proofs: their lines, reasons, faulty proofs and claims (src/math/proofs.ts). */
  proofs: ProofWords;
  /** Logic, quantifiers, sets, functions, relations and countability: prompts and words (src/math/logicSets.ts). */
  logic: LogicWords;
  /** Limits, integration techniques and uses, Taylor and power series, convergence tests (src/math/calculusTwo.ts). */
  calc2: CalcTwoWords;
  /** Subspaces, bases, rank, linear maps, inner products, diagonalisation and the SVD (src/math/linearAlgebra.ts). */
  linalg: LinAlgWords;
  /** Complex numbers: arithmetic, the polar form, De Moivre, roots and loci (src/math/complexPractice.ts). */
  cxq: ComplexWords;
  /** Partial derivatives, multiple integrals, line integrals and the theorems of Green, Gauss and Stokes (src/math/vectorCalculus.ts). */
  vcalc: VecCalcWords;
  /** First- and second-order equations, linear systems, the Laplace transform and stability (src/math/odes.ts). */
  ode: OdeWords;
  /** Suprema, ε–N and ε–δ, the mean value theorem, Darboux sums and uniform convergence (src/math/realAnalysis.ts). */
  real: RealWords;
  /** Groups, orders, subgroups and cosets, permutations, homomorphisms and quotients (src/math/groups.ts). */
  group: GroupWords;
  /** Extended Euclid, linear congruences, the CRT, Fermat and Euler, RSA, quadratic residues (src/math/numberTheoryTwo.ts). */
  nt: NtWords;
  /** Densities, joint distributions, MGFs, the limit theorems and Markov chains (src/math/probTheory.ts). */
  pt: ProbWords;
  /** Recurrences, generating functions, inclusion–exclusion, the pigeonhole principle, graph theory (src/math/discrete.ts). */
  dm: DiscreteWords;
  /** Analytic functions, contour integrals, Laurent series and residues (src/math/complexAnalysis.ts). */
  ca: ComplexAnalysisWords;
  /** Rings and ideals, polynomial rings, field extensions, finite fields, Galois groups (src/math/ringsFields.ts). */
  rf: RingsFieldsWords;
  /** Metric spaces, open and closed sets, compactness, connectedness, topological spaces (src/math/topology.ts). */
  top: TopologyWords;
  /** Estimators, maximum likelihood, regression, χ² tests, ANOVA, Bayesian inference (src/math/mathStats.ts). */
  st: StatWords;
  /** Rounding error, interpolation, one-step ODE methods, linear solvers, orders of convergence (src/math/numericalAnalysis.ts). */
  na: NumAnalysisWords;
  /** Fourier series, the kind of a PDE, separation of variables (src/math/pdes.ts). */
  pde: PdeWords;
  /** Curves, surfaces, non-Euclidean and projective geometry (src/math/higherGeometry.ts). */
  hg: HigherGeometryWords;
  /** Linear programming, the simplex method, convex optimisation (src/math/optimisation.ts). */
  opt: OptimisationWords;
  /** Random walks, the Poisson process, Brownian motion (src/math/stochastic.ts). */
  sp: StochasticWords;
  /** Games in normal form, mixed equilibria, backward induction (src/math/gameTheory.ts). */
  gt: GameWords;
  /** Discrete logarithms, ElGamal, elliptic curves (src/math/crypto.ts). */
  cr: CryptoWords;
  /** Lebesgue measure, Lebesgue integrals, convergence theorems and Lᵖ norms (src/math/measureTheory.ts). */
  mt: MeasureWords;
  /** Norms, operator norms and Hilbert spaces (src/math/functionalAnalysis.ts). */
  fa: FunctionalWords;
  /** Normal forms, structures, ordinals and cardinals (src/math/foundations.ts). */
  fo: FoundationsWords;
  /** Bifurcations, iterated maps, Lyapunov exponents (src/math/dynamics.ts). */
  dyn: DynamicsWords;
  /** Interest, the binomial model, option pricing (src/math/finance.ts). */
  fin: FinanceWords;
  /**
   * The first skills' prompts (addSubtract, tables, divide, placeValue, convert, areaPerimeter): a number missing from
   * a box, a digit's value, a remainder, one form of a number written as another, a shape's perimeter, area or side.
   */
  basics: {
    missing: string; digitValue: string; remainder: string;
    toDecimal: string; toPercent: string; toFraction: string;
    perimeter: string; area: string; sideFromArea: string; sideFromPerimeter: string; circumference: string; circleArea: string;
  };
  /**
   * Place value in words (placeValue): the language its numbers are written out in (src/math/numberWords.ts), the
   * prompts for a number or decimal from its words, the largest and smallest number from some digits, a number from
   * counts of its places (with the places' names and the word before the last), and the larger of two forms.
   */
  place: {
    lang: NumberLang;
    toFigures: string; decimal: string; largest: string; smallest: string; regroup: string; larger: string; and: string;
    places: Record<"thousands" | "hundreds" | "tens" | "ones" | "tenths" | "hundredths", string>;
  };
  /**
   * Estimating (rounding): "the nearest ten" as the prompts say it, an estimate by rounding first, rounding in a
   * story and a two-step story, standard form in two stories, and a number as one digit times a power of 10.
   */
  estimate: {
    nearest: Record<"ten" | "hundred" | "thousand", string>;
    sum: string; stadium: string; school: string; probe: string; grains: string; single: string;
  };
  /**
   * Addition and subtraction (addSubtract): the stories at each level, the prompts for the equal sign, a related fact,
   * the sums that make a number, a rounding shortcut and the equation of a two-step story; and what each story does,
   * for the hint when the other operation is used.
   */
  addSub: {
    together: string; takeAway: string; fewer: string; more: string; howManyMore: string; startUnknown: string;
    bus: string; addends: string; flight: string; journeys: string; stall: string;
    equalSign: string; related: string; makes: string; shortcut: string; whichEquation: string;
    why: Record<"together" | "takeAway" | "fewer" | "more" | "howManyMore" | "startUnknown", string>;
  };
  /**
   * Counting in steps (skipCount): the prompts for a row with a number missing, tens and ones, odd and even, the step
   * of a row and whether a count says a number; and the words of the answers that are picked.
   */
  count: {
    next: string; missing: string; tensOnes: string; howManyTens: string; whichOdd: string; whichEven: string;
    step: string; said: string; sumParity: string; below: string; above: string; inTable: string;
    words: Record<"yes" | "no" | "odd" | "even", string>;
  };
  /** Factors, multiples, prime or composite (divisibility, #701). */
  factors: {
    pair: string; factor: string; multiple: string; relate: string; factorOf: string; multipleOf: string;
    prime: string; composite: string; primeOrComposite: string; isPrime: string; isComposite: string;
  };
  /**
   * Multiplication and division (tables, times, divide): the prompts over a picture of groups, an array or jumps, the
   * stories at each level, the multiplication that answers a division, a fact family and the equation of a story.
   */
  mulDiv: {
    groupsTotal: string; whichTimes: string; otherFact: string;
    bags: string; eggs: string; garden: string; pencils: string; timesAsTall: string; cinema: string; train: string;
    share: string; teams: string; related: string; family: string; stickers: string; packs: string; baker: string; bestEstimate: string; packsLeft: string; treeFromTower: string; estimateQuotient: string;
  };
  /**
   * Written sums and long division (columnSums, longDivide): the prompts for a digit missing from a written sum, how
   * many times a number goes into another, a quotient as a decimal or a mixed number, and the stories in which the
   * remainder decides the answer.
   */
  written: { missingDigit: string; fits: string; asDecimal: string; asMixed: string; coaches: string; boxes: string; left: string };
  /** Multiplying and dividing decimals (decimalTimes): the point placed from a given product, more or less, two stories. */
  decTimes: { placePoint: string; moreOrLess: string; more: string; less: string; ribbon: string; jug: string };
  /** Fractions before grade 6 (fractionSums): a division as a fraction, a fraction of a number, three stories. */
  fracSums: { asFraction: string; of: string; pizzas: string; cake: string; servings: string; whichSum: string } & Record<"lunch" | "ribbon" | "walk" | "plank" | "sameAs" | "laps" | "sugar" | "scale" | "more" | "less" | "equal" | "asks" | "howMany" | "partOf" | "howManyBig" | "area" | "ateOf", string>;
  /** Decimals on grids and number lines, estimates and stories (#704). */
  decPics: Record<"gridDecimal" | "gridFraction" | "lineDecimal" | "lineFraction" | "bestEstimate" | "jug" | "rope" | "jump" | "nino" | "gio" | "pencil" | "apples" | "laps" | "faster" | "placeTimes", string>;
  signed: Record<"positive" | "negative" | "zero" | "signOfSum" | "signOfProduct" | "missing" | "lineSum" | "sameValue" | "equalTo" | "subst" | "riseExpr" | "apart" | "subUp" | "subDown" | "payIn" | "payOut" | "diver" | "share" | "tank" | "orderList" | "lineRead" | "less" | "greater" | "colder" | "warmer" | "smallest" | "farther" | "cave" | "hill" | "same" | "owes" | "ana" | "gio", string>;
  pct: Record<"grid" | "bar" | "whichWay" | "whatPercent" | "walk" | "seeds" | "wholeOf" | "team" | "before" | "download" | "battery" | "storage" | "downloadPct", string>;
  simP: Record<"corresp" | "aa" | "sss" | "shadow" | "altitude" | "bisector" | "splitter" | "reason" | "notEnough" | "mirrorTower" | "yes" | "no" | "pole" | "tree" | "eye" | "mirror" | "tower" | "copyWhich" | "copyFactor" | "copySide" | "copyBack" | "original" | "copy", string>;
  movP: Record<"letter" | "finish" | "whichVector" | "whichMirror" | "turned" | "flipped" | "slid" | "rigidSide" | "rigidAngle" | "whichTurn" | "halfTurn" | "dilSide" | "dilAngle" | "scale" | "order" | "smallestTurn" | "centre" | "mirrorX" | "mirrorY" | "then" | "mapping" | "photo" | "yes" | "no" | "reflectedIn" | "turnedQuarter" | "mustBe" | "rigidKeeps", string>;
  coordP: Record<"apart" | "mapSchool" | "mapPark" | "shape" | "square" | "rectangle" | "parallelogram" | "rightTri" | "rhombus" | "slid" | "road" | "diver" | "rectPer" | "rectArea" | "cornerAbove" | "cornerBelow" | "walk" | "right" | "left" | "up" | "down" | "divide" | "linesGraph" | "linesEq" | "parallel" | "perpendicular" | "neither" | "classify" | "throughPar" | "throughPerp" | "triPer" | "garden" | "fence", string>;
  volP: Record<"countCubes" | "compareCubes" | "same" | "stepCubes" | "stepVol" | "stepExpr" | "tank" | "tankH" | "fracBox" | "sandpit" | "netSolid" | "cube" | "cuboid" | "triPrism" | "sqPyramid" | "triPyramid" | "netArea" | "saExpr" | "openBox" | "cubeSA" | "can" | "ball" | "cone" | "coneOf" | "cylOf" | "ballIn" | "cups", string>;
  angP: Record<"compose" | "twoTri" | "twoRect" | "sqTri" | "threeTri" | "nameAngle" | "countAngles" | "both" | "bothName" | "ticked" | "acuteT" | "rightT" | "obtuseT" | "isoT" | "scaleneT" | "equiT" | "parPairs" | "rightCount" | "acuteCount" | "obtuseCount" | "perpPick" | "parPick" | "measure" | "drawPick" | "turn" | "bench" | "reflex" | "eqPick" | "solveX" | "wholeX" | "crossX" | "crossAngle", string>;
  areaP: Record<"shapeA" | "shapeB" | "same" | "unitCompare" | "partial" | "distPick" | "missingSide" | "fence" | "carpet" | "compareArea" | "comparePerim" | "fenceSide" | "paraHeight" | "triHeight" | "semiPerim" | "quarterPerim" | "semiArea" | "quarterArea" | "wheel" | "fromCirc" | "shadedCircle" | "path", string>;
  prop: Record<"yes" | "no" | "ratioTable" | "tape" | "flour" | "paint" | "sameMix" | "beads" | "units" | "plane" | "perHour" | "toMs" | "unitSpeed" | "unitPrice" | "unitFlow" | "gel" | "l" | "isTable" | "isGraph" | "writeProp" | "walk" | "wall" | "kEquation" | "kTable" | "pointMeaning" | "kgCost" | "oneKgCost" | "compare" | "planA" | "planB" | "same" | "kMeaning" | "kOne" | "kBack" | "kAll" | "graphPoint", string>;
  measTime: Record<"ribbonsLong" | "ribbonsShort" | "ribbonsOrder" | "taller" | "same" | "handFoot" | "clipPencil" | "hands" | "feet" | "clips" | "pencils" | "sameCount" | "fewerFit" | "aboutLong" | "aboutHeavy" | "aboutHolds" | "aboutB" | "apples" | "glasses" | "jug" | "ribbonCut" | "rice" | "lineTime" | "homework" | "sec" | "days" | "aboutTime" | "film" | "song" | "trip", string> & {
    names: string[];
    things: Record<"pencil" | "book" | "shoe" | "crayon" | "door" | "bus" | "classroom" | "apple" | "clip" | "flour" | "dog" | "melon" | "egg" | "spoon" | "cup" | "bath" | "bucket" | "bottle" | "ant" | "rice" | "towns" | "marathon" | "pitch" | "finger", string>;
    acts: Record<"blink" | "shoes" | "teeth" | "lunch" | "match" | "sleep" | "cake", string>;
  };
  /** Fractions as numbers on a line, equal parts, and fractions compared in stories (#702). */
  fracLine: {
    point: string; findOne: string; barToLine: string; toOne: string; sameLine: string; pastOne: string; equalParts: string;
    fence: string; red: string; blue: string; same: string; wholes: string; ofSmall: string; ofLarge: string; sameAmount: string; biggerWhole: string;
  };
  /** Shapes by their properties (shapeKinds): the prompts, the names of shapes and kinds, and the family sentences. */
  shapes: {
    sides: string; corners: string; name: string; faces: string; edges: string; vertices: string; angleKind: string; lines: string; lineKind: string;
    bySides: string; byAngles: string; familyPrompt: string; exact: string; namesFit: string;
    names: Record<"triangle" | "square" | "rectangle" | "pentagon" | "hexagon" | "octagon" | "circle" | "quadrilateral" | "parallelogram" | "rhombus" | "cube" | "cuboid" | "cylinder" | "cone" | "sphere" | "pyramid" | "prism", string>;
    kinds: Record<"acute" | "right" | "obtuse" | "parallel" | "perpendicular" | "crossing" | "line" | "ray" | "segment" | "equilateral" | "isosceles" | "scalene" | "acuteTri" | "rightTri" | "obtuseTri", string>;
    when: Record<"always" | "sometimes" | "never", string>;
    family: Record<"squareRect" | "squareRhombus" | "rectPara" | "rhombusPara" | "equiIso" | "rectSquare" | "rhombusSquare" | "paraRect" | "paraRhombus" | "isoEqui" | "rightObtuse" | "twoRight", { s: string; why: string }>;
  };
  /** Angles on parallel lines (parallelAngles): the prompts and the names of the pairs. */
  parAngles: {
    cross: string; rightSplit: string; compOf: string; suppOf: string; find: string; name: string; ext: string; extIn: string; solveX: string; bend: string; through: string;
    pairs: Record<"vertical" | "line" | "corresponding" | "alternate" | "coInterior", string>;
  };
  /** Pythagoras' theorem (pythagoras): the prompts and the words of the steps. */
  pyth: { find: string; findExact: string; isRight: string; yes: string; no: string; box: string; floorStep: string; ladder: string; iso: string; halfStep: string };
  /** Moving shapes (transformations): the prompts, the lines, the moves' names and what each one does. */
  moves: {
    translate: string; reflect: string; rotate: string; enlarge: string; name: string; two: string; reflected: string; translated: string;
    area: string; areaWhy: string; half: string; quarter: string; anti: string; clock: string;
    lines: Record<"x" | "y" | "yx", string>;
    names: Record<"translation" | "reflection" | "rotation" | "enlargement", string>;
    tells: Record<"translation" | "reflection" | "rotation" | "enlargement", string>;
  };
  /** Congruent triangles (congruence): the prompts, why each set of parts is or is not a test, and the proofs. */
  congr: {
    which: string; notEnough: string; side: string; angle: string; order: string;
    why: Record<"SSS" | "SAS" | "ASA" | "AAS" | "RHS" | "SSA" | "AAA", string>;
    proofs: Record<"iso" | "para" | "bisector", { claim: string; lines: string[]; wrong: string }>;
  };
  /** Ruler-and-compass constructions (constructions): the names, how each is drawn, the prompts and the proofs. */
  cons: {
    which: string; half: string; halfAngle: string; equiAngle: string; equidist: string; hexSide: string; hexPerim: string;
    twice: string; order: string;
    names: Record<"bisect" | "angle" | "perp" | "equi" | "hexagon", string>;
    how: Record<"bisect" | "angle" | "perp" | "equi" | "hexagon", string>;
    proofs: Record<"bisect" | "angle" | "thirty", { claim: string; lines: string[]; wrong: string }>;
  };
  /** Scale drawings and maps (scale): the units and the prompts. */
  maps: {
    m: string; km: string; real: string; onMap: string; ratioMap: string; findScale: string; cmToM: string; area: string;
    areaBack: string; redraw: string;
  };
  /** Slicing solids, and density (crossSections): the prompts and the names of the shapes and solids. */
  slices: {
    which: string; level: string; upright: string; turnWhich: string; stack: string; cavalieri: string; turnCylinder: string;
    turnCone: string; density: string; mass: string; people: string; areaFrom: string;
    shapes: Record<"circle" | "triangle" | "square" | "rectangle" | "trapezium" | "hexagon", string>;
    flat: Record<"rectangle" | "rightTriangle" | "semicircle" | "isosceles", string>;
    sweeps: Record<"rectangle" | "rightTriangle" | "semicircle" | "isosceles", string>;
    solids: Record<"cylinder" | "cone" | "sphere" | "twoCones", string>;
    materials: Record<"aluminium" | "iron" | "ice" | "oak" | "glass", string>;
  };
  /** Real numbers (realNumbers): the prompts and the words of the choices. */
  reals: {
    rational: string; irrational: string; classify: string; rootWhy: string; recurringWhy: string; piWhy: string; fractionWhy: string;
    between: string; recurring: string; largest: string; alwaysRational: string; alwaysIrrational: string; either: string;
    stdDivide: string; stdAdd: string; asRepeating: string;
    closed: Record<"ratIrr" | "irrIrr" | "ratRat" | "irrTimes" | "ratTimesIrr", string>;
    closedWhy: Record<"ratIrr" | "irrIrr" | "ratRat" | "irrTimes" | "ratTimesIrr", string>;
  };
  /** Absolute value (absoluteValue): the prompts and the words of the working. */
  absv: {
    evaluate: string; fromZero: string; apart: string; solveEq: string; bothWays: string; or: string; solveIneq: string; within: string;
    corner: string; cornerWhy: string; split: string; splitWhy: string; piecewise: string;
  };
  /** Slope fields, exponential and logistic models (slopeFields): prompts and options. */
  qsf: { slopeQ: string; rowsQ: string; colsQ: string; growQ: string; equilQ: string; checkQ: string; yes: string; no: string; capacityQ: string; fastestQ: string; lakeQ: string; };
  /** Accumulation and the fundamental theorem (accumulation): prompts and options. */
  qac: { tableLeftQ: string; tableRightQ: string; overQ: string; increasing: string; decreasing: string; leftKind: string; rightKind: string; tooMuch: string; tooLittle: string; midQ: string; ftcQ: string; chainQ: string; netQ: string; averageQ: string; distanceQ: string; displacementQ: string; brakeQ: string; };
  /** Derivatives in context (derivContext): prompts and options. */
  qdc: { teaQ: string; teaRight: string; teaValue: string; teaTotal: string; tankQ: string; tankRight: string; tankValue: string; tankTotal: string; velocityQ: string; speedingQ: string; up: string; down: string; linearQ: string; maxQ: string; minQ: string; boxQ: string; fenceQ: string; closedQ: string; };
  /** Continuity and limits from graphs (continuity): prompts and options. */
  qct: { tableQ: string; leftQ: string; existsQ: string; limitIs: string; noLimit: string; hole: string; jump: string; asymptote: string; none: string; kindQ: string; piecesQ: string; kQ: string; yes: string; noBreak: string; noSigns: string; noRising: string; ivtQ: string; wiggles: string; signsDiffer: string; brokenQ: string; breaks: string; swings: string; squeezeQ: string; parkQ: string; };
  /** Parametric and polar curves (parametric): prompts and options. */
  qpm: { pointQ: string; removeQ: string; polarQ: string; slopeQ: string; speedQ: string; nameQ: string; circle: string; line: string; spiral: string; arcQ: string; areaQ: string; accelQ: string; ballQ: string; };
  /** Conic sections (conics): prompts and options. */
  conP: Record<"circleFrom" | "circleGraph" | "centreOf" | "pointQ" | "inside" | "on" | "outside" | "ellipseCentre" | "radiusAcross" | "radiusUp" | "ellipseFrom" | "ellipseGraph" | "opens" | "leftRight" | "upDown" | "vertex" | "hyperFrom", string>;
  plyP: Record<"collect" | "area" | "degree" | "leading", string>;
  fctP: Record<"gcf" | "mono" | "numbers" | "negative", string>;
  linP: Record<"isSolution" | "mistake" | "line" | "more" | "less" | "times" | "part" | "gave" | "boxes" | "tape" | "interpret" | "gymSay" | "taxiSay" | "gym" | "taxi" | "perMonth" | "joinFee" | "gymTotal" | "months" | "perKm" | "startFee" | "taxiTotal" | "kms" | "count" | "one" | "none" | "many" | "whyOne" | "whyNone" | "whyMany" | "findK" | "letters" | "consecSmall" | "consecLarge" | "consecEven", string>;
  pwlP: Record<"means" | "exponent" | "simplify" | "memory" | "culture", string>;
  sqrP: Record<"solveSquare" | "solveCube", string>;
  srdP: Record<"simplifyRoot" | "sameAs" | "solveExp", string>;
  sxpP: Record<"constant" | "coefficient" | "evalOne" | "wordPens" | "wordBoxes" | "write" | "more" | "less" | "from" | "times" | "over" | "evalMulti" | "evalSquare" | "evalFrac" | "largest" | "smallest" | "taxi" | "gym" | "perKm" | "flagFall" | "taxiTotal" | "kms" | "perMonth" | "joining" | "gymTotal" | "months" | "timesSum" | "sumTimes" | "timesDiff" | "sumOver" | "change" | "factor" | "simplify" | "ball", string>;
  vecP: Record<"fromEnds" | "fromPolar" | "direction" | "length2" | "unit" | "addLen" | "addComp" | "plane" | "lineAt" | "lineT", string>;
  xplP: Record<"cross" | "triArea" | "planeD" | "normal" | "pointDist" | "planesDist", string>;
  trgP: Record<"ratioSide" | "cofunction" | "sinCos" | "special45" | "special30" | "quadrant" | "reciprocal" | "reflect" | "addition" | "waves" | "ski" | "asa" | "sas" | "ships" | "lighthouses", string>;
  crcP: Record<"arcThird" | "arcAlg" | "major" | "inscFromArc" | "arcFromInsc" | "tangentLen" | "tangentRad" | "tangentsEq" | "tangentsAngle" | "quad" | "rightIn" | "horizon" | "plane" | "towerNote" | "planeNote", string>;
  qcn: { radiusQ: string; centreQ: string; focusQ: string; fromFocusQ: string; fociQ: string; axisQ: string; slopeQ: string; whichQ: string; circle: string; ellipse: string; parabola: string; hyperbola: string; galleryQ: string; };
  /** Trigonometric graphs (trigGraphs): prompts. */
  qtg: { ampQ: string; periodQ: string; midQ: string; ampPicQ: string; periodPicQ: string; midPicQ: string; bPicQ: string; tideHighQ: string; tideGapQ: string; };
  /** Trigonometric equations (trigEquations): prompts and the quarter rules. */
  qte: { largerQ: string; countQ: string; inverseQ: string; countAllQ: string; radiansQ: string; tideQ: string; sinRule: string; cosRule: string; tanRule: string; };
  /** Transformations of functions (fnTransform): prompts and options. */
  qft: { xQ: string; yQ: string; pictureQ: string; parityQ: string; even: string; odd: string; neither: string; scheduleQ: string; right: string; left: string; };
  /** Equations with roots and fractions (rootEquations): prompts. */
  qre: { solveQ: string; graphQ: string; stoneQ: string; };
  /** Rational functions (rationalFn): prompts and options. */
  qrf: { domainQ: string; wallQ: string; zeroQ: string; flatQ: string; holeQ: string; slantQ: string; signQ: string; positive: string; negative: string; costQ: string; };
  /** Polynomial graphs (polyGraph): prompts and options. */
  qpg: { sumQ: string; endsQ: string; upUp: string; downDown: string; downUp: string; upDown: string; touchQ: string; crosses: string; touches: string; signQ: string; positive: string; negative: string; graphQ: string; turnsQ: string; boxQ: string; };
  /** Quadratic graphs (quadraticGraph): prompts. */
  qgr: { rootQ: string; axisQ: string; interceptQ: string; squareQ: string; leastAtQ: string; fromGraphQ: string; rootsQ: string; ballQ: string; };
  /** Exponential growth and decay (exponential): prompts, options and steps. */
  exg: { factorQ: string; linear: string; exponential: string; kindQ: string; sameRatio: string; sameDiff: string; bacteria: string; rumour: string; pointsQ: string; townQ: string; carQ: string; halfQ: string; logsQ: string; monthlyQ: string; contQ: string; };
  /** Inequalities in two variables (regions): prompts, options and steps. */
  rgn: { yes: string; no: string; true: string; false: string; solutionQ: string; solid: string; dashed: string; styleQ: string; styleStep: string; pictureQ: string; pictureStep: string; above: string; below: string; turnQ: string; turnStep: string; standardQ: string; pointSlopeQ: string; systemQ: string; systemStep: string; cornerX: string; cornerY: string; bakeQ: string; craftQ: string; wordsStep: string; };
  /** Reading a function (readFunction): prompts, options and steps. */
  rfn: { isFunction: string; yesFn: string; noFn: string; fnStep: string; fGraph: string; fTable: string; rangeQ: string; domainQ: string; rangeStep: string; yIntQ: string; xIntQ: string; intStep: string; riseQ: string; riseStep: string; rateQ: string; linQ: string; linear: string; notLinear: string; linStep: string; planQ: string; planA: string; planB: string; months: string; cost: string; planStep: string; };
  /** t tests and a proportion (tTests): prompts, options and settings. */
  tts: { propQ: string; condQ: string; condYes: string; condNo: string; condStep: string; tQ: string; marginQ: string; pairedQ: string; runSetting: string; runA: string; runB: string; fieldSetting: string; fieldA: string; fieldB: string; };
  /** Two samples, errors and the slope (twoSample): prompts, options and settings. */
  tws: { errMachine: string; errDoctor: string; errQ: string; h0True: string; h0False: string; decReject: string; decKeep: string; typeI: string; typeII: string; correct: string; errStep: string; powerQ: string; powerBigger: string; powerAlpha: string; powerSmaller: string; powerStep: string; twoQ: string; marginQ: string; slopeQ: string; yes: string; no: string; whichQ: string; sPaired: string; sTwo: string; sOne: string; sProp: string; oPaired: string; oTwo: string; oOne: string; oProp: string; whichStep: string; };
  /** Samples and study design (sampling): settings, options and steps. */
  smp: { popTown: string; popTownAll: string; popTownAsked: string; popTownOther: string; popFactory: string; popFactoryAll: string; popFactoryAsked: string; popFactoryOther: string; whichSample: string; whichPopulation: string; popStep: string; fairSport: string; fairSportGood: string; fairSportTeam: string; fairSportGym: string; fairRead: string; fairReadGood: string; fairReadLibrary: string; fairReadClub: string; fairStep: string; whichQuestion: string; qHomeworkFair: string; qHomeworkLeading: string; qParkFair: string; qParkLeading: string; qFoodFair: string; qFoodLeading: string; questionStep: string; estFish: string; estSchool: string; mSimple: string; mStrat: string; mCluster: string; mSystem: string; whichMethod: string; hSimple: string; hStrat: string; hCluster: string; hSystem: string; methodStep: string; observational: string; experiment: string; whichKind: string; kCoffeeObs: string; kCoffeeExp: string; kMusicObs: string; kMusicExp: string; obsStep: string; expStep: string; pApp: string; pAppCoin: string; pAppChoose: string; pAppAll: string; pPlant: string; pPlantCoin: string; pPlantChoose: string; pPlantAll: string; planStep: string; cDog: string; cDogOk: string; cDogCause: string; cDogBeyond: string; cBreakfast: string; cBreakfastOk: string; cBreakfastCause: string; cBreakfastBeyond: string; concludeStep: string; };
  /** Scatter plots and lines of fit (scatter): the axes, the prompts, the meanings offered and the three causal settings. */
  scat: {
    hours: string; mark: string; positive: string; negative: string; none: string; climb: string; fall: string; climbs: string; falls: string;
    noPattern: string; direction: string; outlier: string; offTrend: string; predict: string; slopeQ: string; interceptQ: string;
    slopeMeans: string; interceptMeans: string; slopeBackwards: string; residual: string; lineName: string; better: string; iceQ: string;
    iceNo: string; iceZ: string; shoeQ: string; shoeNo: string; shoeZ: string; fireQ: string; fireNo: string; fireZ: string; yesStrong: string;
  };
  /** Two-way tables (twoWay): the headings, the prompts and the names of the choices. */
  twy: {
    y7: string; y8: string; sport: string; noSport: string; total: string; walk: string; bus: string; late: string; onTime: string;
    missing: string; everyone: string; rowShare: string; colShare: string; allShare: string; assoc: string; assocYes: string;
    assocNo: string; likely: string; walkers: string; riders: string;
  };
  /** Spread (spread): the prompts, the axis labels and the names of the choices. */
  spr: {
    hist: string; histAxis: string; dotAxis: string; dotMode: string; dotMore: string; tallest: string; mad: string; boxIqr: string;
    halves: string; iqrList: string; q1: string; q3: string; fence: string; meanChange: string; medianChange: string; stays: string;
    goesUp: string; middleStays: string; classA: string; classB: string; compare: string;
  };
  /** Everyday money (moneySense): the prompts and the names of the choices. */
  shop: {
    discount: string; tip: string; tax: string; interest: string; offOff: string; upDown: string; markup: string; bands: string;
    loans: string; loanA: string; loanB: string; packs: string; packSmall: string; packBig: string; per100: string;
    commission: string; exprUp: string; exprDown: string; adds: string; takes: string;
  };
  /** Algebraic fractions and formulae: the prompts (src/math/formulae.ts). */
  formulae: { simplify: string; single: string; substitute: string; subject: string };
  bad: string;
  onlyX: string;
  tooBig: string;
  skills: Record<SkillId, string>;
  levels: Record<"1" | "2" | "3", string>;
  mixed: string;
  prompts: {
    times: string;
    fractions: string;
    fracEquivalent: string;
    fracLowest: string;
    fracLcd: string;
    fracReciprocal: string;
    fracImproper: string;
    fracMixed: string;
    stepTops: string;
    stepTimes: string;
    stepDivide: string;
    /** A calculus question's steps (calcSteps.ts): differentiate a part, integrate a part, work out a value. */
    stepDiff: string;
    stepInt: string;
    stepWork: string;
    percentOf: string;
    percentChange: string;
    percentReverse: string;
    hcf: string;
    lcm: string;
    primes: string;
    linear: string;
    expand: string;
    factor: string;
    quadratic: string;
    simultaneous: string;
    evaluate: string;
    surds: string;
    rationalise: string;
    line: string;
    perp: string;
    midpoint: string;
    distance: string;
    trigexact: string;
    idDouble: string;
    idMax: string;
    polyRem: string;
    polyCoef: string;
    circleFind: string;
    similarSide: string;
    similarA: string;
    scaleArea: string;
    scaleVolume: string;
    scaleAreaVolume: string;
    volume: string;
    surface: string;
    solidDim: string;
    rightSide: string;
    rightAngle: string;
    vecCombo: string;
    vecLength: string;
    vecPerp: string;
    vecDot: string;
    vecAngle: string;
    vecAngleExact: string;
    projScalar: string;
    projVector: string;
    projFoot: string;
    matProduct: string;
    matTranspose: string;
    matIdentity: string;
    matDet: string;
    matInverse: string;
    elimSolve: string;
    elimRank: string;
    elimK: string;
    eigValues: string;
    eigVector: string;
    eigRest: string;
    expMean: string;
    expVar: string;
    expRule: string;
    condTable: string;
    condTotal: string;
    condBayes: string;
    binomEq: string;
    normalP: string;
    covData: string;
    corrData: string;
    covJoint: string;
    hypDecide: string;
    hypZ: string;
    hypP: string;
    gdStep: string;
    gdTwo: string;
    gdRate: string;
    bpNode: string;
    bpLoss: string;
    bpRelu: string;
    smProb: string;
    smLoss: string;
    smGrad: string;
    fitOver: string;
    fitUnder: string;
    fitDegree: string;
    fitStop: string;
    prPrecision: string;
    prRecall: string;
    prF1: string;
    prThreshP: string;
    prThreshR: string;
    knnVote: string;
    kmCentroid: string;
    kmInertia: string;
    seqTerm: string;
    seqTwo: string;
    serSum: string;
    serInf: string;
    serSigma: string;
    fnComp: string;
    fnInv: string;
    differentiate: string;
    gradient: string;
    tangent: string;
    stationary: string;
    integrate: string;
    definite: string;
    numNewton: string;
    numRoot: string;
    numIterate: string;
    numTrapezium: string;
    numSimpson: string;
    mean: string;
    median: string;
    mode: string;
    range: string;
    sd: string;
    die: string;
    dice: string;
    marbles: string;
    lineUp: string;
    podium: string;
    choose: string;
    word: string;
    ciZ: string;
    ciT: string;
    ciP: string;
    intRise: string;
    intFall: string;
    intDiff: string;
    compare: string;
    roundTo10: string;
    roundTo100: string;
    roundTo1000: string;
    roundDp1: string;
    roundDp2: string;
    roundSf1: string;
    roundSf: string;
    stdForm: string;
    stdMul: string;
    estimate: string;
    boundLow: string;
    boundHigh: string;
    boundTotal: string;
    precWhole: string;
    precDp1: string;
    precTen: string;
    ineqSolve: string;
    ineqWord: string;
    shapeRect: string;
    shapeTriangle: string;
    shapeAreaPerim: string;
    estimatePlace: string;
    quickLook: string;
    makeTarget: string;
    makeTargetAll: string;
    kakoomaSum: string;
    kakoomaProduct: string;
    closerTo: string;
    closerToCalc: string;
    makeWhole: string;
    equivShaded: string;
    equivFraction: string;
    equivDecimal: string;
    orderFractions: string;
    shadeShape: string;
    shadeSet: string;
    balance: string;
    findRuleOut: string;
    findRuleIn: string;
    growCount: string;
    growWhich: string;
    sameExpression: string;
    estimateAngle: string;
    missingAngle: string;
    symmetryLines: string;
    cubeNet: string;
    cubeOpposite: string;
    coordinates: string;
    coordCorner: string;
    chartOne: string;
    chartMore: string;
    chartTotal: string;
    graphStory: string;
    slope: string;
    oddVertices: string;
    oneStroke: string;
    colouring: string;
    shortestPath: string;
    spanningTree: string;
    parity: string;
    inversions: string;
    divisibility: string;
    moneyDollars: string;
    moneyCents: string;
    moneyFromCents: string;
    moneyAdd: string;
    moneyChange: string;
    moneyLeft: string;
    moneyShop: string;
    convertUnit: string;
    decimalQuotient: string;
    decimalQuotient2: string;
    ratioSimplify: string;
    ratioMissing: string;
    ratioShare: string;
    ratioShare3: string;
    ratioPart: string;
    ratioWhole: string;
    ratioFraction: string;
    rateCost: string;
    rateCostTotal: string;
    rateCostUnits: string;
    rateCostTwo: string;
    rateTap: string;
    rateTapTotal: string;
    rateTapUnits: string;
    rateTapTwo: string;
    timeRead: string;
    timeEnd: string;
    timeStart: string;
    timeLength: string;
    time24: string;
    time12: string;
    timeTrip: string;
    timeTripEnd: string;
    speedDistance: string;
    speedSpeed: string;
    speedTime: string;
    speedMinutes: string;
    speedRunner: string;
    speedAverage: string;
    speedMeet: string;
    speedCatch: string;
    measRuler: string;
    measScale: string;
    measJug: string;
    measToSmall: string;
    measToWhole: string;
    measAddLength: string;
    measAddMass: string;
    measAddVolume: string;
    measSubLength: string;
    measSubMass: string;
    measSubVolume: string;
    lineRead: string;
    lineHalf: string;
    lineRise: string;
    pieCount: string;
    pieAngle: string;
    stemMedian: string;
    stemRange: string;
  };
  /** A hypothesis test's two decisions: on a button (text) and typed (plain). */
  decisions: Record<"reject" | "keep", { text: string; plain: string }>;
  /** Where gradient descent goes with a learning rate: on a button (text) and typed (plain). */
  fates: Record<"steady" | "zigzag" | "diverge", { text: string; plain: string }>;
  /** A walk from home told part by part (graph stories): each part, and what joins them. */
  story: { parts: Record<StoryWord, string>; then: string };
  events: { even: string; greater: string; prime: string; mult3: string };
  marbleNames: { first: string; second: string };
  /** An amount of money in the language's own currency ({v} is the number, e.g. 4.05). */
  money: string;
  /** Units of length, mass and volume as they are written after a number. */
  units: Record<MeasureUnit, string>;
  /** The stem-and-leaf plot's headings and key ("{s} | {l} means {v}"). */
  stemLeaf: StemWords;
  /**
   * Time: hours and minutes as written after a number, the first letters a typed answer may write them with, the parts
   * of the day a 12-hour time is said in (3:45 in the afternoon), and the hands of the clock in the worked solution.
   */
  /** Units of speed, and seconds, as written after a number. */
  speed: { kmh: string; ms: string; s: string };
  time: { h: string; min: string; stems: DurationStems; parts: Record<DayPart, string>; shortHand: string; longHand: string };
  formats: Record<Format, string>;
  /** What each recognised mistake is, said kindly: the slip, and how to see it. */
  mistakes: Record<MistakeId, string>;
  reasons: {
    empty: string;
    unreadable: string;
    notLowest: string;
    notOneFraction: string;
    notImproper: string;
    notMixed: string;
    notFraction: string;
    notDecimal: string;
    notSimplified: string;
    notFactored: string;
    notExpanded: string;
    notPrime: string;
    count: string;
    rounding: string;
    notNumber: string;
    notIneq: string;
    notStandard: string;
    notSign: string;
    shape: Record<PolyProblem, string>;
    pin: { unreadable: string; offLine: string; left: string; right: string };
    target: { unreadable: string; other: string; notAll: string; op: string; divZero: string; makes: string };
    near: { unreadable: string; notOption: string };
    order: Record<OrderProblem | "reversed", string>;
    shading: { unreadable: string; none: string; outside: string; twice: string; count: string };
    pick: { notOption: string };
    divisors: { unreadable: string; notOffered: string; more: string };
    ratio: { unreadable: string; notSimplest: string };
    /** A time that can't be read, a length of time that can't be read, an hour over 12 on a clock with hands. */
    time: { unreadable: string; unreadableLength: string; face: string };
    /** A measure that can't be read, in other units, asked in two units, asked in the smaller unit. */
    measure: { unreadable: string; units: string; whole: string; inSmall: string };
    matrixSize: string;
    zeroVector: string;
    polar: string;
  };
  answer: string;
  answers: string;
  ui: {
    look: string;
    /** The scratch paper under a question on the practice page: its toggle and title, tools (rub rubs out what it passes
     * over, lift takes away whole lines, dots turns the squares into dots the pen draws and the eraser rubs straight
     * between and the line eraser cuts lines at), and the inks' names. */
    scratch: { title: string; pen: string; rub: string; lift: string; dots: string; undo: string; clear: string; black: string; blue: string; red: string };
    practise: string;
    sheet: string;
    check: string;
    next: string;
    reveal: string;
    correct: string;
    wrong: string;
    revealed: string;
    review: string;
    /** Over a question that is the spaced review of something mastered days ago. */
    spaced: string;
    stepDown: string;
    score: string;
    progress: string;
    count: string;
    withAnswers: string;
    newSet: string;
    answerHere: string;
    solving: string;
    reset: string;
    joinClass: string;
    /** What joining a class study means, shown before a student joins; consentAgree is the box they tick. */
    consentTitle: string;
    consentSaved: string;
    consentGroups: string;
    consentStop: string;
    consentAgree: string;
    classCode: string;
    join: string;
    haveCode: string;
    signIn: string;
    joinedAs: string;
    yourSkills: string;
    keptList: string;
    masteredList: string;
    againList: string;
    keepCode: string;
    /** Joining needs an account (#606): said above the sign-in form. */
    needAccount: string;
    /** Signed in to an account: {name}. */
    withAccount: string;
    makeAccount: string;
    /** A student code that another account holds. */
    codeTaken: string;
    signOut: string;
    forget: string;
    forgetSure: string;
    noClass: string;
    noStudent: string;
    offline: string;
    unsaved: string;
    classPractice: string;
    freePractice: string;
    chosen: string;
    loadingPlan: string;
    planError: string;
    retry: string;
    preTest: string;
    postTest: string;
    delayedTest: string;
    testIntro: string;
    testProgress: string;
    submit: string;
    pass: string;
    testDone: string;
    timeLeft: string;
    sessionOver: string;
    classClosed: string;
    inSteps: string;
    workedExample: string;
    fadedIntro: string;
    /** Marking a word problem before solving it (MarkProblem.tsx, issue #582). */
    mark: MarkWords;
    given: string;
    stepOf: string;
    showStep: string;
    stepsDone: string;
    sessionTitle: string;
    sessionCount: string;
    sessionRight: string;
    sessionDone: string;
    sessionScore: string;
    sessionTopics: string;
    sessionTopic: string;
    sessionBack: string;
    sessionClean: string;
    sessionAgain: string;
    seeSummary: string;
    sessionLength: string;
    sessionOf: string;
    breakTime: string;
    breakOn: string;
    rateAsk: string;
    rate: { easy: string; right: string; hard: string };
    rateNext: string;
    rateKeep: string;
    rateTop: string;
    rateBottom: string;
    rateNoted: string;
    ideaMapOpen: string;
    ideaMapTitle: string;
    ideaMapCount: string;
    ideaMapFresh: string;
    ideaMapHint: string;
    ideaNew: string;
    ideaShown: string;
    ideaNotYet: string;
    ideaMapPick: string;
    ideaRestsOn: string;
    ideaRestsOnNothing: string;
    comingBack: string;
    backNext: string;
    backIn: string;
  };
  /** Where the learner is in the course (GradeCard). */
  grades: Record<"title" | "intro" | "place" | "placeAgain" | "placing" | "between" | "found" | "here" | "secure" | "practise" | "grade" | "pair" | "uni" | "uniShort" | "topics", string>;
};

export type Rng = { next: () => number; int: (lo: number, hi: number) => number; nz: (lo: number, hi: number) => number; pick: <T>(a: readonly T[]) => T; sign: () => 1 | -1 };

export type Gen = (r: Rng, L: Level, w: PracticeWords) => Omit<Exercise, "skill" | "level" | "seed">;

export type FractionForm = "equivalent" | "lowest" | "lcd" | "reciprocal" | "toImproper" | "toMixed";

/** A step of an operation worked in steps (stepsOf): a form, or the operation itself once the fractions are ready for it. */
export type StepForm = FractionForm | "addTops" | "timesTops" | "divideTops";
