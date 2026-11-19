// The shapes of practice: a question (Exercise) and its parts, the kinds of answer and how they are checked, the
// formats and solution kinds, and the words a question is written in (PracticeWords). Types only, plus the levels,
// so any module can name a question without loading the generators.
import type { ArcWords } from "./arcs";
import type { BarModelWords } from "./barProblems";
import type { RowWords } from "./rowsAndPatterns";
import type { LogicWords } from "./logicSets";
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

export type Level = 1 | 2 | 3;

export const LEVELS: Level[] = [1, 2, 3];

/** The tools whose pictures serve as worked solutions. */
export type SolutionKind = "compare" | "fractionBars" | "model" | "algebra" | "powers" | "coord" | "trig" | "deriv" | "applied" | "statistics" | "comb" | "nt" | "inference" | "vectors" | "sequences" | "functions" | "identities" | "polynomials" | "euclid" | "numerical" | "shape" | "pin" | "dots" | "wall" | "orderline" | "shade" | "balance" | "grow" | "angle" | "angles" | "mirror" | "net" | "plot" | "chart" | "story" | "slope" | "stroke" | "colour" | "route" | "network" | "matrix" | "randvar" | "decimal" | "percent" | "ratio" | "rate" | "round" | "divisible" | "time" | "diagram" | "trigRule" | "arc";

export type Format =
  | "number" | "exact" | "fraction" | "dp2" | "dp3" | "roots" | "point" | "vector" | "interval" | "line" | "expr" | "factors" | "antiderivative" | "primes"
  | "inequality" | "standard" | "sign" | "shape" | "pin" | "target" | "near" | "order" | "shade" | "pick" | "divisors" | "ratio" | "matrix" | "pair" | "xyz" | "eigvec"
  | "clock" | "duration" | "measure" | "algFraction" | "formula" | "base" | "lines" | "counter" | "decide" | "elements" | "bits";

/** A larger unit and the smaller one it is made of, f of them to one (1 m = 100 cm). */
export type MeasurePair = { big: MeasureUnit; small: MeasureUnit; f: number };

/** The parts of the day a 12-hour time is said in. */
export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** The units a measurement is converted between (decimals). */
export type MeasureUnit = "km" | "m" | "cm" | "kg" | "g" | "l" | "ml";

/** One end of the solution set of an inequality: closed when the number itself is included. */
export type Bound = { v: number; closed: boolean };

/** A predictable mistake and the answer it gives (with the numbers its message names). */
export type Trap = { id: MistakeId; a: Answer; vars?: Record<string, string | number> };

export type Answer = (
  /** std: the answer is asked for in standard form, a × 10ⁿ; form: as an improper fraction or a mixed number. */
  /** `units`: unit signs the answer may end in ("5.64 m"); they are taken off before it is read. */
  | { k: "num"; v: number; tol: number; lowest?: boolean; surd?: boolean; std?: boolean; form?: "improper" | "mixed"; units?: readonly string[] }
  /** `listed`: the elements of a set are listed, so how many there are is part of the answer, not told: a list of the
   *  wrong length is wrong (and may be a named slip), not sent back. */
  | { k: "set"; vs: number[]; tol: number; listed?: boolean }
  /** Values in order; they may be typed named ("y = 3; x = 2"), by `names` (x, y, z when not given). */
  | { k: "tuple"; vs: number[]; tol: number; names?: string[] }
  /** A matrix, row by row. */
  | { k: "matrix"; rows: number[][]; tol: number }
  /** A direction: any non-zero multiple of vs (an eigenvector). */
  | { k: "dir"; vs: number[] }
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
};

/** A step of a question: a question without its skill, level and seed, which are the question's. */
export type Part = Omit<Exercise, "skill" | "level" | "seed" | "worked">;

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
  /** Ordinal numbers and repeating patterns: shapes, colours, ordinals, prompts (src/math/rowsAndPatterns.ts). */
  rows: RowWords;
  /** Proofs: their lines, reasons, faulty proofs and claims (src/math/proofs.ts). */
  proofs: ProofWords;
  /** Logic, quantifiers, sets, functions, relations and countability: prompts and words (src/math/logicSets.ts). */
  logic: LogicWords;
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
    /** The student's number in the class list (only the teacher sees it), asked for when joining. */
    listNo: string;
    /** Joining with a number someone in the class already gave: {n} the number. */
    numberTaken: string;
    joinAnyway: string;
    signIn: string;
    joinedAs: string;
    yourSkills: string;
    keptList: string;
    masteredList: string;
    againList: string;
    keepCode: string;
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
