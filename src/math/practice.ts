// Practice: questions made from a seed for each skill and level, answers checked (numbers, fractions, surds, sets of
// roots, points, expressions up to equivalence — in the form the question asks for), and a worked solution from the
// tool that covers the topic. A worksheet is a numbered set of questions with an optional answer key.
import { REL_TEX, splitRel, type Rel } from "./algebra";
import { antiderivative } from "./applied";
import { C, esc, fill, FONT, r2, W, wrap } from "./chart";
import { derive } from "./derive";
import { circleFigure, solidFigure } from "./euclid";
import { evalE, exprMessages, fromPoly, parseE, simp, sqrtSplit, tex, toPoly, type E } from "./expr";
import { Frac } from "./fraction";
import { normCdf, normSf, tUpper, zUpper, type Alt, type InfSpec } from "./inference";
import { covariance } from "./randvar";
import { latexToSvg, type RenderedSvg } from "./latex";
import { det, env, gaussJordan, mul, texM, type Mat, type MatrixCalcSpec, type MatrixOp } from "./matrix";
import { fractionBarsSvg, towersSvg, type FractionBarsSpec } from "./compare";
import { areaText, encodePoly, geoGridSvg, judgePoly, polyTask, polyTraps, type GeoPlay, type PolyProblem } from "./geoPlay";
import { judgeNear, nearSteps, nearTask, type Bench } from "./benchmark";
import { divSlips, divTask, judgeDivisors, rulesSpec } from "./divisible";
import { kakSet, kakSum, kakTraps } from "./kakooma";
import { inversions as countInversions } from "./tactics";
import { acrossGap, lcm, sumOf, wallSvg, wallTask } from "./fractionWall";
import { eqQuestion, partsSvg } from "./equivMatch";
import { encodeShade, judgeShade, shadeSvg, shadeTask, type ShadePlay } from "./shadeFrac";
import { balanceSteps, balanceSvg, balanceTask, oneSideOnly } from "./balance";
import { machineAnswer, ruleQuestion, ruleSteps, ruleTable, scaledOutput, undoOrder } from "./machine";
import { countOf, figuresSvg, growAnswer, growQuestion, growSteps, scaledFigure } from "./growing";
import { exprQuestion, exprSteps, exprTex, judgePick, type ExprOption } from "./exprMatch";
import { angleQuestion, angleSteps, angleSvg } from "./angleGuess";
import { huntSteps, huntSvg, huntTask, huntTraps } from "./missingAngle";
import { falseDiagonals, mirrorsOf, symSvg, symTask } from "./symmetry";
import { LETTERS, netOptions, netQuestion, netSteps, netSvg } from "./cubeNets";
import { plotSteps, plotSvg, plotTask, ptText, signed, swapped } from "./plotPoint";
import { chartQuestion, chartSteps, chartSvg, chartTraps } from "./barChart";
import { storyChoicesSvg, storyOptions, storyQuestion, storyWords, type StoryWord } from "./graphStory";
import { gradTex, gradText, runOverRise, slopeQuestion, slopeQuestionSvg, slopeSteps } from "./slope";
import { evenCount, strokeQuestion, strokeQuestionSvg, strokeSteps } from "./oneStroke";
import { colourQuestion, colourSvg, colourTraps } from "./colouring";
import { pathSteps, pathSvg, pathTask, pathTraps } from "./shortestPath";
import { cheapestRoads, townSteps, townSvg, townTask } from "./connectTowns";
import { name as vertexName } from "./graphPlay";
import { bottomsOrder, judgeOrder, orderTask, rightOrder, type OrderItem, type OrderProblem } from "./fracOrder";
import { judgeTarget, parseSum, qText, sumText, targetPuzzle, valueOf, type TargetPuzzle } from "./target";
import { dotsHeight, dotsSvg, FLASH_MS, LOOK_W, lookSteps, lookTask } from "./quickLook";
import { encodePin, estimateTask, judgePin, lineSvg, numText, shareAlong, type PinPlay } from "./estimate";
import { compareSign, fracSign, samePieces, type CompareSign, type Frac as Fraction } from "./live";
import type { MistakeId } from "./mistakes";
import type { SpaceSpec } from "./vectorspace";
import { AREAS, SKILLS, type Area, type SkillId } from "./practiceSkills";

export { ALL_SKILLS, AREAS, SKILLS, areaOf, type Area, type SkillId } from "./practiceSkills";
export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];

/** The tools whose pictures serve as worked solutions. */
export type SolutionKind = "compare" | "fractionBars" | "model" | "algebra" | "powers" | "coord" | "trig" | "deriv" | "applied" | "statistics" | "comb" | "nt" | "inference" | "vectors" | "sequences" | "functions" | "identities" | "polynomials" | "euclid" | "numerical" | "shape" | "pin" | "dots" | "wall" | "orderline" | "shade" | "balance" | "grow" | "angle" | "angles" | "mirror" | "net" | "plot" | "chart" | "story" | "slope" | "stroke" | "colour" | "route" | "network" | "rules" | "matrix" | "randvar" | "decimal";
export type Format =
  | "number" | "exact" | "fraction" | "dp2" | "dp3" | "roots" | "point" | "vector" | "interval" | "line" | "expr" | "factors" | "antiderivative" | "primes"
  | "inequality" | "standard" | "sign" | "shape" | "pin" | "target" | "near" | "order" | "shade" | "pick" | "divisors" | "ratio" | "matrix" | "pair" | "xyz" | "eigvec";

/** The units a measurement is converted between (decimals). */
export type MeasureUnit = "km" | "m" | "cm" | "kg" | "g" | "l" | "ml";
/** One end of the solution set of an inequality: closed when the number itself is included. */
export type Bound = { v: number; closed: boolean };
/** A predictable mistake and the answer it gives (with the numbers its message names). */
type Trap = { id: MistakeId; a: Answer; vars?: Record<string, string | number> };
type Answer = (
  /** std: the answer is asked for in standard form, a × 10ⁿ; form: as an improper fraction or a mixed number. */
  | { k: "num"; v: number; tol: number; lowest?: boolean; surd?: boolean; std?: boolean; form?: "improper" | "mixed" }
  | { k: "set"; vs: number[]; tol: number }
  /** Values in order; they may be typed named ("y = 3; x = 2"), by `names` (x, y, z when not given). */
  | { k: "tuple"; vs: number[]; tol: number; names?: string[] }
  /** A matrix, row by row. */
  | { k: "matrix"; rows: number[][]; tol: number }
  /** A direction: any non-zero multiple of vs (an eigenvector). */
  | { k: "dir"; vs: number[] }
  | { k: "expr"; e: E; mode?: "factor" | "expand" | "plusC" | "line" }
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
  /** Answered by doing rather than typing: a shape made on a grid, a pin put on a line (the answer is still text). */
  play?: Play;
};

export type PracticeWords = {
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
  formats: Record<Format, string>;
  /** What each recognised mistake is, said kindly: the slip, and how to see it. */
  mistakes: Record<MistakeId, string>;
  reasons: {
    empty: string;
    unreadable: string;
    notLowest: string;
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
    matrixSize: string;
    zeroVector: string;
  };
  answer: string;
  answers: string;
  ui: {
    look: string;
    practise: string;
    sheet: string;
    check: string;
    next: string;
    reveal: string;
    correct: string;
    wrong: string;
    revealed: string;
    review: string;
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
    testIntro: string;
    testProgress: string;
    submit: string;
    pass: string;
    testDone: string;
    timeLeft: string;
    sessionOver: string;
    classClosed: string;
    inSteps: string;
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
    comingBack: string;
    backNext: string;
    backIn: string;
  };
  /** Where the learner is in the course (GradeCard). */
  grades: Record<"title" | "intro" | "place" | "placeAgain" | "placing" | "between" | "found" | "here" | "secure" | "practise" | "grade" | "pair" | "uni" | "uniShort" | "topics", string>;
};

// ---------- random numbers ----------

type Rng = { next: () => number; int: (lo: number, hi: number) => number; nz: (lo: number, hi: number) => number; pick: <T>(a: readonly T[]) => T; sign: () => 1 | -1 };
/** mulberry32: the same seed gives the same questions. */
export function rngOf(seed: number): Rng {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const nz = (lo: number, hi: number) => {
    for (;;) {
      const v = int(lo, hi);
      if (v) return v;
    }
  };
  return { next, int, nz, pick: (a) => a[Math.floor(next() * a.length)], sign: () => (next() < 0.5 ? -1 : 1) };
}

// ---------- building expressions ----------

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const fr = (n: number, d = 1) => new Frac(n, d);
/** A polynomial typed out from its coefficients, highest power first: [c0, c1, c2] → "c2x^2 + c1x + c0". */
function polyStr(cs: number[], v = "x"): string {
  let out = "";
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k];
    if (!c) continue;
    const a = Math.abs(c);
    const body = k === 0 ? String(a) : `${a === 1 ? "" : a}${v}${k > 1 ? `^${k}` : ""}`;
    out += out ? (c < 0 ? ` - ${body}` : ` + ${body}`) : c < 0 ? `-${body}` : body;
  }
  return out || "0";
}
/** Product of two polynomials given by coefficients. */
const pmul = (a: number[], b: number[]) => {
  const out = Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};
/** "(2x + 3)" from a, b. */
const bracket = (a: number, b: number) => `(${polyStr([b, a])})`;
const T = (src: string) => tex(parseE(src));
/** A number as a typed answer: 3/4, -2. */
const plainFrac = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
/** The signs of a sum as words list them: × and ÷, a true minus. */
const OP_SIGN = { "+": "+", "-": "−", "*": "×", "/": "÷" } as const;
/** A sum of cards in LaTeX: (3 + 5) \times 2. */
const sumTex = (e: Parameters<typeof sumText>[0]) => sumText(e).replace(/×/g, "\\times").replace(/÷/g, "\\div").replace(/−/g, "-");
/** An area given as twice itself, in LaTeX: 7 or 7\frac{1}{2}. */
const areaTex = (area2: number) => (area2 % 2 ? `${area2 > 1 ? (area2 - 1) / 2 : ""}\\frac{1}{2}` : String(area2 / 2));
/** p + q√m in LaTeX. */
function surdTex(p: Frac, q: Frac, m: number): string {
  if (m === 1) return p.add(q).tex();
  const qa = q.abs();
  const root = qa.d === 1 ? `${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}` : `\\frac{${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}}{${qa.d}}`;
  if (p.isZero()) return (q.isNeg() ? "-" : "") + root;
  return `${p.tex()} ${q.isNeg() ? "-" : "+"} ${root}`;
}
const num = (v: number, tol = 1e-9, extra: { lowest?: boolean; surd?: boolean; form?: "improper" | "mixed" } = {}): Answer => ({ k: "num", v, tol, ...extra });
const dp = (v: number, d: number) => String(Math.round(v * 10 ** d) / 10 ** d);
/** E as text that parseE reads back. */
export function plainE(e: E): string {
  switch (e.k) {
    case "num":
      return e.v.d === 1 ? (e.v.n < 0 ? `(${e.v.n})` : String(e.v.n)) : `(${e.v.n}/${e.v.d})`;
    case "var":
      return e.name;
    case "e":
      return "e";
    case "pi":
      return "pi";
    case "add":
      return `(${e.ts.map(plainE).join(" + ")})`;
    case "mul":
      return `(${e.fs.map(plainE).join(" * ")})`;
    case "pow":
      return `(${plainE(e.b)})^(${plainE(e.e)})`;
    case "fn":
      return `${e.f}(${plainE(e.a)})`;
    case "log":
      return e.base.d === 1 && e.base.n === 10 ? `log(${plainE(e.a)})` : `log_${e.base.n}(${plainE(e.a)})`;
    case "d":
      return plainE(e.a);
  }
}

// ---------- order of operations ----------

/** How an expression is worked out: the right way, or as a known mistake would. */
type OrderMode = "right" | "leftToRight" | "mulBeforePow" | "grouped";
type OrderNode = { v: number } | { op: string; l: OrderNode; r: OrderNode; par: boolean };
const PREC: Record<OrderMode, Record<string, number>> = {
  right: { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 },
  // + − × ÷ all alike, from left to right.
  leftToRight: { "+": 1, "-": 1, "*": 1, "/": 1, "^": 3 },
  // multiplying before the power: 3·2² as (3·2)² (only asked where a × stands in front of a power).
  mulBeforePow: { "+": 1, "-": 1, "*": 3, "/": 2, "^": 2.5 },
  // the right order, but a chain of the same kind grouped from the right (a − b − c as a − (b − c)): see rightAssoc.
  grouped: { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 },
};
/** "a + b * (c - d) ^ 2" with numbers for the letters, as a tree. */
function orderTree(src: string, mode: OrderMode): OrderNode {
  const toks = src.match(/\d+|[-+*/^()]/g) ?? [];
  let i = 0;
  const prec = PREC[mode];
  const rightAssoc = (op: string) => op === "^" || mode === "grouped";
  const atom = (): OrderNode => {
    const t = toks[i++];
    if (t !== "(") return { v: Number(t) };
    const inner = expr(0);
    i++;
    return "op" in inner ? { ...inner, par: true } : inner;
  };
  const expr = (min: number): OrderNode => {
    let lhs = atom();
    for (;;) {
      const op = toks[i];
      if (op === undefined || op === ")" || prec[op] < min) return lhs;
      i++;
      lhs = { op, l: lhs, r: expr(rightAssoc(op) ? prec[op] : prec[op] + 1), par: false };
    }
  };
  return expr(0);
}
const orderApply = (a: number, op: string, b: number) => (op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a ** b);
const orderValue = (n: OrderNode): number => ("v" in n ? n.v : orderApply(orderValue(n.l), n.op, orderValue(n.r)));
/** One operation done, the leftmost of those that can be: the next line of working. */
function orderStep(n: OrderNode): OrderNode {
  if ("v" in n) return n;
  if ("op" in n.l) return { ...n, l: orderStep(n.l) };
  if ("op" in n.r) return { ...n, r: orderStep(n.r) };
  return { v: orderApply(n.l.v, n.op, n.r.v) };
}
/** In LaTeX; a negative number inside the working keeps brackets, so 4 × (−3)² isn't read as 4 × −3². */
function orderTex(n: OrderNode, whole = true): string {
  if ("v" in n) return n.v < 0 && !whole ? `(${n.v})` : String(n.v);
  const sym: Record<string, string> = { "+": "+", "-": "-", "*": "\\times", "/": "\\div" };
  const inner = n.op === "^" ? `${orderTex(n.l, false)}^{${orderTex(n.r, false)}}` : `${orderTex(n.l, false)} ${sym[n.op]} ${orderTex(n.r, false)}`;
  return n.par ? `(${inner})` : inner;
}
/** The shapes of question at each level: never a ÷ b(c + d), whose meaning people disagree on. */
const ORDER_FORMS: Record<Level, string[]> = {
  1: ["a + b * c", "a - b * c", "a * b - c", "a + b / c", "a - b - c", "a * b + c * d", "a / b * c", "a - b + c"],
  2: ["(a + b) * c", "a * (b - c)", "a + b ^ 2", "c * a ^ 2", "a - (b - c)", "a ^ 2 - b * c", "(a + b) ^ 2 / c"],
  3: ["a * (b + c * d)", "(a + b) ^ 2 - c * d", "a - 2 * (b - c) ^ 2", "(a - (b + c)) * d", "a + b * (c - d) ^ 2", "(a * b - c) / d"],
};

// ---------- rounding ----------
// A number is kept as a whole mantissa m and its decimal places p (m / 10^p), so rounding is exact.

/** m/10^p rounded to k decimal places (k < 0: to tens, hundreds…), halves up, as a mantissa at p places. */
const roundM = (m: number, p: number, k: number) => Math.round(m / 10 ** (p - k)) * 10 ** (p - k);
/** The same, digits just cut off. */
const cutM = (m: number, p: number, k: number) => Math.floor(m / 10 ** (p - k)) * 10 ** (p - k);
/** Rounded one place at a time from the last digit: the double-rounding mistake. */
function stagesM(m: number, p: number, k: number): number {
  let x = m;
  for (let j = p - 1; j >= k; j--) x = roundM(x, p, j);
  return x;
}
/** m/10^p with k decimal places shown (none when k ≤ 0). */
const fmtM = (m: number, p: number, k = p) => (m / 10 ** p).toFixed(Math.max(0, Math.min(k, p)));
/** A decimal without trailing zeros, safe from floating dust: 7.350000001 → "7.35". */
const tidy = (v: number) => String(Number(v.toFixed(10)));

// ---------- money, decimals, ratio and rate ----------

/** An amount of money in the language's currency: a whole amount bare, any other with its two places (20, 4.05). */
const money = (w: PracticeWords, v: number) => fill(w.money, { v: Number.isInteger(v) ? String(v) : v.toFixed(2) });
/** Cents as dollars with both places, for the working: 405 → 4.05. */
const dollars = (cents: number) => (cents / 100).toFixed(2);
/** A whole number from lo to hi that doesn't end in 0, so a decimal made from it shows all its places. */
function noZeroEnd(r: Rng, lo: number, hi: number): number {
  for (;;) {
    const m = r.int(lo, hi);
    if (m % 10) return m;
  }
}
/**
 * a − b worked column by column taking the smaller digit from the larger and never exchanging (2000 − 1365 → 1365):
 * the classic slip in a subtraction, of whole numbers (amounts in cents).
 */
function smallerFromLarger(a: number, b: number): number {
  const x = String(a);
  const y = String(b).padStart(x.length, "0");
  return Number([...x].map((d, i) => Math.abs(Number(d) - Number(y[i]))).join(""));
}

/** The steepest angle a right-triangle picture draws to scale. */
export const STEEPEST = 66;
/**
 * The centre of the angle label in a right-triangle picture: θ at (bx, by), base bw long, right angle at the far end.
 * It is the spot nearest the angle's bisector, 60 px out, where a box tw wide and 12 high lies inside the triangle with
 * 3 px to spare, clear of the right-angle mark and at least 20 px from the vertex, so that an arc fits inside it.
 */
export function angleLabelAt(bx: number, by: number, bw: number, th: number, tw: number): [number, number] {
  const [ix, iy] = [bx + 60 * Math.cos(th / 2), by - 60 * Math.sin(th / 2)];
  const cx = bx + bw;
  let best: [number, number] = [ix, iy];
  let bestD = Infinity;
  for (let x = bx; x <= cx; x += 2) {
    for (let y = by - bw * Math.tan(th); y <= by; y += 2) {
      const [l, r, t, b] = [x - tw / 2, x + tw / 2, y - 6, y + 6];
      const inside = b <= by - 3 && r <= cx - 3 && (l - bx) * Math.sin(th) - (by - t) * Math.cos(th) >= 3;
      const clear = (r < cx - 17 || b < by - 17) && Math.hypot(l - bx, by - b) >= 20;
      const d = Math.hypot(x - ix, y - iy);
      if (inside && clear && d < bestD) [best, bestD] = [[x, y], d];
    }
  }
  return best;
}

// ---------- the generators ----------

type Gen = (r: Rng, L: Level, w: PracticeWords) => Omit<Exercise, "skill" | "level" | "seed">;

/**
 * The share of fractions questions that ask for one idea of fractions alone, in place of an operation. An operation
 * needs seven to ten ideas at once, so a wrong answer could be any of them; these forms each test one step by itself
 * (src/model/conceptGraph.ts, test 1), so the ideas a student lacks can be told apart.
 */
const FRACTION_FORM_SHARE = 0.4;
export type FractionForm = "equivalent" | "lowest" | "lcd" | "reciprocal" | "toImproper" | "toMixed";
const FRACTION_FORMS: readonly FractionForm[] = ["equivalent", "lowest", "lcd", "reciprocal", "toImproper", "toMixed"];
/** A step of an operation worked in steps (stepsOf): a form, or the operation itself once the fractions are ready for it. */
export type StepForm = FractionForm | "addTops" | "timesTops" | "divideTops";
/** The worked picture of a fraction form: bars of the fractions named, with the form and numbers kept so the question can be read for its ideas. */
const fracBars = (form: StepForm, a: string, b: string | null, rows: { n: number; d: number }[]) => ({
  kind: "model" as const,
  spec: { type: "fraction", form, a, b, rows, shape: "bar", unitLabels: true },
});
const fracTex = (n: number, d: number) => `\\frac{${n}}{${d}}`;
const mixedTex = (whole: number, n: number, d: number) => `${whole}\\frac{${n}}{${d}}`;

/** One idea of fractions alone: a missing top, lowest terms, the lowest common denominator, a reciprocal, or a conversion between mixed and improper. */
function fractionForm(r: Rng, L: Level, w: PracticeWords): Omit<Exercise, "skill" | "level" | "seed"> {
  const form = r.pick(FRACTION_FORMS);
  const maxD = L === 1 ? 6 : L === 2 ? 9 : 12;
  /** A fraction below 1 in lowest terms. */
  const proper = () => {
    let n: number, d: number;
    do {
      d = r.int(2, maxD);
      n = r.int(1, d - 1);
    } while (gcd(n, d) !== 1);
    return { n, d };
  };
  switch (form) {
    case "equivalent": {
      // 3/4 = ?/12: the top scaled as the bottom was. Adding the same number to both is the trap.
      const { n, d } = proper();
      const k = r.int(2, L === 1 ? 5 : 12);
      const traps: Trap[] = [{ id: "addedToBoth", a: num(n + k * d - d), vars: { n, d, k, kd: k * d } }];
      return { prompt: w.prompts.fracEquivalent, q: `${fracTex(n, d)} = \\frac{?}{${k * d}}`, answer: { ...num(n * k), traps }, show: String(n * k), plain: String(n * k), format: "number", solution: fracBars("equivalent", `${n}/${d}`, `${n * k}/${k * d}`, [{ n, d }, { n: n * k, d: k * d }]) };
    }
    case "lowest": {
      const { n, d } = proper();
      const k = r.int(2, L === 1 ? 4 : L === 2 ? 9 : 12);
      return { prompt: w.prompts.fracLowest, q: fracTex(n * k, d * k), answer: num(n / d, 1e-9, { lowest: true }), show: fracTex(n, d), plain: `${n}/${d}`, format: "fraction", solution: fracBars("lowest", `${n * k}/${d * k}`, null, [{ n: n * k, d: d * k }, { n, d }]) };
    }
    case "lcd": {
      const a = proper();
      let b = proper();
      while (b.d === a.d) b = proper();
      const lcd = (a.d / gcd(a.d, b.d)) * b.d;
      const rows = [a, b, { n: (a.n * lcd) / a.d, d: lcd }, { n: (b.n * lcd) / b.d, d: lcd }];
      return { prompt: w.prompts.fracLcd, q: `${fracTex(a.n, a.d)},\\ ${fracTex(b.n, b.d)}`, answer: num(lcd), show: String(lcd), plain: String(lcd), format: "number", solution: fracBars("lcd", `${a.n}/${a.d}`, `${b.n}/${b.d}`, rows) };
    }
    case "reciprocal": {
      // A fraction, at level 2 sometimes a whole number, at level 3 a mixed number.
      const p = proper();
      const whole = L === 3 ? r.int(1, 3) : 0;
      const asWhole = L === 2 && r.next() < 0.3;
      const [n, d] = asWhole ? [r.int(2, 9), 1] : [whole * p.d + p.n, p.d];
      const given = asWhole ? String(n) : whole ? mixedTex(whole, p.n, p.d) : fracTex(n, d);
      const text = asWhole ? String(n) : whole ? `${whole} ${p.n}/${p.d}` : `${n}/${d}`;
      return { prompt: w.prompts.fracReciprocal, q: given, answer: num(d / n, 1e-9, { lowest: true }), show: fr(d, n).tex(), plain: plainFrac(fr(d, n)), format: "fraction", solution: fracBars("reciprocal", text, null, [{ n, d }, { n: d, d: n }]) };
    }
    case "toImproper":
    case "toMixed": {
      const { n, d } = proper();
      const whole = r.int(1, L === 1 ? 2 : L === 2 ? 3 : 5);
      const top = whole * d + n;
      const bars = fracBars(form, form === "toImproper" ? `${whole} ${n}/${d}` : `${top}/${d}`, null, [{ n: top, d }]);
      if (form === "toImproper") {
        // Multiplying the whole by the top instead of the bottom is the trap (the same value when the whole is 1).
        const traps: Trap[] = whole > 1 ? [{ id: "wholeTimesTop", a: num((whole * n + d) / d), vars: { w: whole, n, d, wd: whole * d, top } }] : [];
        return { prompt: w.prompts.fracImproper, q: mixedTex(whole, n, d), answer: { ...num(top / d, 1e-9, { lowest: true, form: "improper" }), traps }, show: fracTex(top, d), plain: `${top}/${d}`, format: "fraction", solution: bars };
      }
      return { prompt: w.prompts.fracMixed, q: fracTex(top, d), answer: num(top / d, 1e-9, { lowest: true, form: "mixed" }), show: mixedTex(whole, n, d), plain: `${whole} ${n}/${d}`, format: "fraction", solution: bars };
    }
  }
}

/**
 * A fractions operation worked in steps, as the usual method does it (src/math/fracop.ts): each mixed number as an
 * improper fraction; for + and −, the lowest common denominator, each fraction over it, then the tops added or taken
 * away; for ÷, the reciprocal; for × and ÷, tops times tops over bottoms times bottoms; then the result in lowest terms
 * when it isn't. Each step is a question of its own, read for its ideas as a form is (src/model/conceptGraph.ts), so a
 * wrong step says which idea went wrong. The practice offers them after a wrong answer. Any other question has none.
 */
export function stepsOf(ex: Exercise, w: PracticeWords): Exercise[] {
  const spec = ex.solution?.spec as { type?: string; op: "+" | "-" | "×" | "÷"; a: string; b: string } | undefined;
  if (ex.skill !== "fractions" || spec?.type !== "fracop") return [];
  const steps: Exercise[] = [];
  const fraction = (n: number, d: number) => ({ show: d === 1 ? String(n) : fracTex(n, d), plain: d === 1 ? String(n) : `${n}/${d}`, format: "fraction" as const });
  const count = (v: number) => ({ show: String(v), plain: String(v), format: "number" as const });
  const add = (form: StepForm, prompt: string, q: string, answer: Answer, given: ReturnType<typeof count | typeof fraction>, a: string, b: string | null = null) =>
    steps.push({ skill: ex.skill, level: ex.level, seed: ex.seed, prompt, q, answer, ...given, solution: fracBars(form, a, b, []) });
  // A mixed number's whole times the top is the mistake to name, as in the form asking for it alone.
  const [x, y] = [spec.a, spec.b].map((s) => {
    const [, whole, n, d] = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s)!.map(Number);
    if (!whole) return { n, d };
    const top = whole * d + n;
    const traps: Trap[] = whole > 1 ? [{ id: "wholeTimesTop", a: num((whole * n + d) / d), vars: { w: whole, n, d, wd: whole * d, top } }] : [];
    add("toImproper", w.prompts.fracImproper, mixedTex(whole, n, d), { ...num(top / d, 1e-9, { form: "improper" }), traps }, fraction(top, d), s);
    return { n: top, d };
  });
  let raw: [number, number];
  if (spec.op === "+" || spec.op === "-") {
    const L = (x.d / gcd(x.d, y.d)) * y.d;
    if (x.d !== y.d) {
      add("lcd", w.prompts.fracLcd, `${fracTex(x.n, x.d)},\\ ${fracTex(y.n, y.d)}`, num(L), count(L), `${x.n}/${x.d}`, `${y.n}/${y.d}`);
      for (const p of [x, y]) {
        if (p.d === L) continue;
        const k = L / p.d;
        const traps: Trap[] = [{ id: "addedToBoth", a: num(p.n + L - p.d), vars: { n: p.n, d: p.d, k, kd: L } }];
        add("equivalent", w.prompts.fracEquivalent, `${fracTex(p.n, p.d)} = \\frac{?}{${L}}`, { ...num(p.n * k), traps }, count(p.n * k), `${p.n}/${p.d}`, `${p.n * k}/${L}`);
      }
    }
    const [a1, a2] = [(x.n * L) / x.d, (y.n * L) / y.d];
    raw = [spec.op === "+" ? a1 + a2 : a1 - a2, L];
    add("addTops", w.prompts.stepTops, `${fracTex(a1, L)} ${spec.op} ${fracTex(a2, L)}`, num(raw[0] / L), fraction(...raw), `${a1}/${L}`, `${a2}/${L}`);
  } else {
    const divide = spec.op === "÷";
    const by = divide ? { n: y.d, d: y.n } : y;
    if (divide) add("reciprocal", w.prompts.fracReciprocal, fracTex(y.n, y.d), num(by.n / by.d), fraction(by.n, by.d), `${y.n}/${y.d}`);
    raw = [x.n * by.n, x.d * by.d];
    const times = `${fracTex(x.n, x.d)} \\times ${fracTex(by.n, by.d)}`;
    add(divide ? "divideTops" : "timesTops", divide ? w.prompts.stepDivide : w.prompts.stepTimes, divide ? `${fracTex(x.n, x.d)} \\div ${fracTex(y.n, y.d)} = ${times}` : times,
      num(raw[0] / raw[1]), fraction(...raw), `${x.n}/${x.d}`, `${by.n}/${by.d}`);
  }
  const g = gcd(...raw);
  if (raw[0] !== 0 && g > 1) add("lowest", w.prompts.fracLowest, fracTex(...raw), num(raw[0] / raw[1], 1e-9, { lowest: true }), fraction(raw[0] / g, raw[1] / g), `${raw[0]}/${raw[1]}`);
  return steps;
}

const FLIP_SIGN: Record<CompareSign, CompareSign> = { "<": ">", "=": "=", ">": "<" };
/** A number as a hint writes it, with a proper minus sign. */
const minusSign = (s: string | number) => String(s).replace(/^-/, "−");

/** The one sign in an answer (<, = or >, typed or full-width), or null when there is none or more than one. */
export function readSign(src: string): CompareSign | null {
  const signs = src.replace(/＜/g, "<").replace(/＞/g, ">").replace(/＝/g, "=").match(/[<>=]/g);
  return signs?.length === 1 ? (signs[0] as CompareSign) : null;
}

/**
 * a ? b, written as given. `naive` are the traps of known mistakes, each with the sign it gives; the first that gives
 * a different sign from the right one is the question's trap, or else the sign turned round (when it isn't =).
 */
function signExercise(w: PracticeWords, a: string, b: string, sign: CompareSign, more: Partial<Omit<Exercise, "skill" | "level" | "seed">>, naive: Trap[] = []) {
  const big = sign === "<" ? b : a;
  const trap = naive.find((t) => t.a.k === "sign" && t.a.v !== sign);
  const traps: Trap[] = trap ? [trap] : sign === "=" ? [] : [{ id: "compareFlip", a: { k: "sign", v: FLIP_SIGN[sign] }, vars: { big: minusSign(big.replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2")) } }];
  return { prompt: w.prompts.compare, q: `${a} \\;\\square\\; ${b}`, answer: { k: "sign" as const, v: sign, traps }, show: `${a} ${sign} ${b}`, plain: sign, format: "sign" as const, ...more };
}

// ---------- linear algebra ----------

/** An m × n matrix of whole numbers from lo to hi. */
const ints = (r: Rng, m: number, n: number, lo: number, hi: number) => Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(lo, hi)));
const M = (rows: number[][]): Mat => rows.map((row) => row.map((x) => fr(x)));
const matAnswer = (m: Mat): Answer => ({ k: "matrix", rows: m.map((row) => row.map((x) => x.toNumber())), tol: 1e-9 });
/** A matrix as typed: rows split by ;, numbers by commas. */
const matPlain = (m: Mat) => m.map((row) => row.map(plainFrac).join(", ")).join("; ");
/** A column of entries already in LaTeX. */
const colTex = (v: string[]) => env(v.map((x) => [x]));
/** The Matrices tool's working for an operation on A (and B). */
const matCalc = (op: MatrixOp, A: number[][], B: number[][] = []): Exercise["solution"] => {
  const spec: MatrixCalcSpec = { type: "calc", op, A: A.map((row) => row.map(String)), B: B.map((row) => row.map(String)), k: "1", steps: true };
  return { kind: "matrix", spec };
};

// ---------- probability and statistics ----------

/** Three or four values from −3 to 8, their probabilities a random split of 5, 8, 10 or 12. */
function smallDist(r: Rng): { xs: number[]; ps: Frac[] } {
  const k = r.pick([3, 4] as const);
  const xs: number[] = [];
  while (xs.length < k) {
    const x = r.int(-3, 8);
    if (!xs.includes(x)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  const d = r.pick([5, 8, 10, 12] as const);
  const cuts = new Set<number>();
  while (cuts.size < k - 1) cuts.add(r.int(1, d - 1));
  const cs = [0, ...[...cuts].sort((a, b) => a - b), d];
  return { xs, ps: cs.slice(1).map((c, i) => fr(c - cs[i], d)) };
}
/** A distribution as a table: x on top, P(X = x) beneath. */
const distTable = (xs: number[], ps: Frac[]) =>
  `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.join(" & ")} \\\\ \\hline P(X = x) & ${ps.map((p) => p.tex()).join(" & ")} \\end{array}`;
/** n choose k. */
const choose = (n: number, k: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};
/** The Inference tool's one-sample z test. */
const zTest = (mean: number, sigma: number, n: number, mu0: number, alt: Alt): InfSpec => ({
  topic: "test", kind: "z", a: String(mean), b: String(sigma), c: String(n), d: String(mu0), e: "", f: "", data: "", data2: "", level: "0.05", alt, seed: 1,
});

// ---------- machine learning ----------

/** A decimal as written: to 6 places at most, so no float noise shows. */
const dec6 = (v: number) => String(Math.round(v * 1e6) / 1e6);
/** A factor in a product, bracketed when negative. */
const par = (v: number | string) => (String(v).startsWith("-") ? `(${v})` : String(v));
/** One step of gradient descent on ax² + bx + c from x (uphill: the step taken up the slope instead). */
const gdStep = (x: Frac, a: number, b: number, eta: Frac, uphill = false) => {
  const s = eta.mul(x.mul(fr(2 * a)).add(fr(b)));
  return uphill ? x.add(s) : x.sub(s);
};
/** Two different classes' points, both on the 0–8 grid. */
type Dot = { x: number; y: number; c: 0 | 1 };
const sq = (p: { x: number; y: number }, q: { x: number; y: number }) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
/** Points on a 0–8 grid: class A as blue dots, B as orange triangles (with a key when there are both), and the marked points as crosses with names. */
function dotsPic(dots: Dot[], marks: { x: number; y: number; name: string }[]): Exercise["pic"] {
  const [S, P, N] = [22, 26, 8];
  const X = (x: number) => P + x * S;
  const Y = (y: number) => 10 + (N - y) * S;
  const dot = (x: number, y: number, c: 0 | 1) => (c === 0 ? `<circle cx="${x}" cy="${y}" r="5.5" fill="${C.blue}"/>` : `<path d="M${x} ${y - 6.5} l6 10.5 h-12 z" fill="${C.orange}"/>`);
  let body = "";
  for (let i = 0; i <= N; i++)
    body += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(N)}" stroke="#dee2e6"/><line x1="${X(0)}" y1="${Y(i)}" x2="${X(N)}" y2="${Y(i)}" stroke="#dee2e6"/>`;
  for (let i = 0; i <= N; i += 2)
    body += `<text x="${X(i)}" y="${Y(0) + 20}" font-size="11" text-anchor="middle" fill="${C.grey}" ${FONT}>${i}</text><text x="${X(0) - 12}" y="${Y(i) + 4}" font-size="11" text-anchor="end" fill="${C.grey}" ${FONT}>${i}</text>`;
  for (const d of dots) body += dot(X(d.x), Y(d.y), d.c);
  for (const m of marks)
    body += `<path d="M${X(m.x) - 5} ${Y(m.y) - 5} l10 10 m0 -10 l-10 10" stroke="${C.ink}" stroke-width="2.4"/><text x="${X(m.x) + 7}" y="${Y(m.y) - 6}" font-size="13" font-style="italic" fill="${C.ink}" ${FONT}>${m.name}</text>`;
  const key = dots.some((d) => d.c === 1);
  if (key)
    ([0, 1] as const).forEach((c) => {
      body += `${dot(X(N) + 26, Y(N) + 4 + c * 24, c)}<text x="${X(N) + 38}" y="${Y(N) + 9 + c * 24}" font-size="13" fill="${C.ink}" ${FONT}>${"AB"[c]}</text>`;
    });
  const [w, h] = [X(N) + (key ? 56 : 16), Y(0) + 26];
  return { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w };
}
/** Points with their coordinates, in LaTeX. */
const ptsTex = (ps: { x: number; y: number }[]) => ps.map((p) => `(${p.x}, ${p.y})`).join(",\\ ");
/** Errors in a table: one column for each of `heads`, one row for each named list. */
const errTable = (head: string, heads: (string | number)[], rows: [string, number[]][]) =>
  `\\begin{array}{c|${"c".repeat(heads.length)}} ${head} & ${heads.join(" & ")} \\\\ \\hline ${rows.map(([k, vs]) => `${k} & ${vs.join(" & ")}`).join(" \\\\ ")} \\end{array}`;

const GENS: Record<SkillId, Gen> = {
  times(r, L, w) {
    const [a, b] = L === 1 ? [r.int(12, 99), r.int(3, 9)] : L === 2 ? [r.int(12, 99), r.int(12, 99)] : [r.int(101, 999), r.int(12, 99)];
    return { prompt: w.prompts.times, q: `${a} \\times ${b}`, answer: num(a * b), show: String(a * b), plain: String(a * b), format: "number", solution: { kind: "model", spec: { type: "multiply", style: "area", a, b, step: 999 } } };
  },

  money(r, L, w) {
    if (L === 1) {
      // Dollars and cents in decimal notation, and in cents only (P2). Writing 5 cents as .5 is the trap.
      const [d, c] = [r.int(2, 20), r.next() < 0.5 ? r.int(1, 9) : r.int(10, 95)];
      const cents = 100 * d + c;
      const traps: Trap[] = c < 10 ? [{ id: "centsOneDigit", a: num(d + c / 10), vars: { c, d } }] : [];
      const kind = r.int(0, 2);
      if (kind === 1)
        return { prompt: fill(w.prompts.moneyCents, { a: money(w, cents / 100) }), q: "", answer: num(cents), show: String(cents), plain: String(cents), format: "number", steps: [`${dollars(cents)} \\times 100 = ${cents}`] };
      const prompt = kind === 0 ? fill(w.prompts.moneyDollars, { d, c }) : fill(w.prompts.moneyFromCents, { n: cents });
      const steps = kind === 0 ? [`${c} \\div 100 = ${dollars(c)}`, `${d} + ${dollars(c)} = ${dollars(cents)}`] : [`${cents} \\div 100 = ${dollars(cents)}`];
      return { prompt, q: "", answer: { ...num(cents / 100), traps }, show: dollars(cents), plain: dollars(cents), format: "number", steps };
    }
    if (L === 2) {
      // Adding two amounts, the change from a note, or what is left of an amount after spending some (P3), worked in
      // cents so nothing is lost to rounding.
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [a, b] = [r.int(105, 4995), r.int(105, 4995)];
        return { prompt: fill(w.prompts.moneyAdd, { a: money(w, a / 100), b: money(w, b / 100) }), q: "", answer: num((a + b) / 100), show: dollars(a + b), plain: dollars(a + b), format: "number", steps: [`${dollars(a)} + ${dollars(b)} = ${dollars(a + b)}`] };
      }
      if (kind === 1) {
        const note = r.pick([10, 20, 50]);
        let price: number;
        do price = r.int(105, 100 * note - 5);
        while (price % 100 === 0);
        const change = 100 * note - price;
        return { prompt: fill(w.prompts.moneyChange, { a: money(w, price / 100), b: money(w, note) }), q: "", answer: num(change / 100), show: dollars(change), plain: dollars(change), format: "number", steps: [`${dollars(100 * note)} - ${dollars(price)} = ${dollars(change)}`] };
      }
      // Two amounts with an exchange to make: taking the smaller digit from the larger in every column is the trap.
      let a: number, b: number;
      do [a, b] = [r.int(1005, 4995), r.int(105, 2995)];
      while (b >= a || smallerFromLarger(a, b) === a - b);
      const traps: Trap[] = [{ id: "smallerFromLarger", a: num(smallerFromLarger(a, b) / 100), vars: { a: dollars(a), b: dollars(b), v: dollars(a - b) } }];
      return { prompt: fill(w.prompts.moneyLeft, { a: money(w, a / 100), b: money(w, b / 100) }), q: "", answer: { ...num((a - b) / 100), traps }, show: dollars(a - b), plain: dollars(a - b), format: "number", steps: [`${dollars(a)} - ${dollars(b)} = ${dollars(a - b)}`] };
    }
    // A few of one thing and one of another, paid with the smallest note that covers them. Paying for one of each is the trap.
    const [p, b, k] = [5 * r.int(11, 99), 5 * r.int(100, 400), r.int(2, 4)];
    const cost = k * p + b;
    const paid = 100 * [10, 20, 50, 100].find((n) => 100 * n > cost)!;
    const change = paid - cost;
    const traps: Trap[] = [{ id: "oneOfEach", a: num((paid - p - b) / 100), vars: { k, p: money(w, p / 100) } }];
    return {
      prompt: fill(w.prompts.moneyShop, { p: money(w, p / 100), b: money(w, b / 100), k, t: money(w, paid / 100) }),
      q: "",
      answer: { ...num(change / 100), traps },
      show: dollars(change),
      plain: dollars(change),
      format: "number",
      steps: [`${k} \\times ${dollars(p)} = ${dollars(k * p)}`, `${dollars(k * p)} + ${dollars(b)} = ${dollars(cost)}`, `${dollars(paid)} - ${dollars(cost)} = ${dollars(change)}`],
    };
  },

  fractions(r, L, w) {
    const op = L === 1 ? r.pick(["+", "-"] as const) : r.pick(["+", "-", "×", "÷"] as const);
    const part = () => {
      const d = r.int(2, L === 1 ? 9 : 12);
      const n = r.int(1, d - 1);
      const whole = L === 3 ? r.int(1, 3) : 0;
      return { whole, n, d, f: fr(whole * d + n, d) };
    };
    let a = part();
    let b = part();
    if (L === 1 && r.next() < 0.5) {
      // Same or doubled denominator.
      const d = a.d * r.pick([1, 2]);
      const n = r.int(1, d - 1);
      b = { whole: 0, n, d, f: fr(n, d) };
    }
    if (op === "-" && a.f.toNumber() < b.f.toNumber()) [a, b] = [b, a];
    const res = op === "+" ? a.f.add(b.f) : op === "-" ? a.f.sub(b.f) : op === "×" ? a.f.mul(b.f) : a.f.div(b.f);
    const traps: Trap[] = [];
    if (op === "+" && !a.whole && !b.whole) {
      // Tops added and bottoms added: always between the two, so smaller than the larger one.
      const big = a.f.toNumber() > b.f.toNumber() ? a : b;
      traps.push({ id: "addAcross", a: num(fr(a.n + b.n, a.d + b.d).toNumber()), vars: { r: `${a.n + b.n}/${a.d + b.d}`, big: `${big.n}/${big.d}` } });
    }
    if (op === "÷" && !b.f.div(a.f).sub(res).isZero()) traps.push({ id: "flipFirst", a: num(b.f.div(a.f).toNumber()) });
    const ftex = (p: typeof a) => `${p.whole ? p.whole : ""}\\frac{${p.n}}{${p.d}}`;
    const ftxt = (p: typeof a) => (p.whole ? `${p.whole} ${p.n}/${p.d}` : `${p.n}/${p.d}`);
    const opTex = { "+": "+", "-": "-", "×": "\\times", "÷": "\\div" }[op];
    const whole = Math.trunc(res.n / res.d);
    const show = res.d === 1 || Math.abs(whole) === 0 ? res.tex() : `${res.tex()} = ${whole}\\frac{${Math.abs(res.n) % res.d}}{${res.d}}`;
    const operation = {
      prompt: w.prompts.fractions,
      q: `${ftex(a)} ${opTex} ${ftex(b)}`,
      answer: { ...num(res.toNumber(), 1e-9, { lowest: true }), traps },
      show,
      plain: plainFrac(res),
      format: "fraction" as const,
      solution: { kind: "model" as const, spec: { type: "fracop", op, a: ftxt(a), b: ftxt(b), step: 99 } },
    };
    // Drawn after the operation, so a seed that keeps its operation keeps the same question as before the forms came.
    return r.next() < FRACTION_FORM_SHARE ? fractionForm(r, L, w) : operation;
  },

  percent(r, L, w) {
    const P = (kind: string, p: number, a: number, b: number, up = true) => ({ type: "percratio", kind, p: String(p), a: String(a), b: String(b), ratio: "2:3", up, step: 999 });
    if (L === 1) {
      const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]);
      const a = 20 * r.int(2, 30);
      const v = (p * a) / 100;
      return { prompt: fill(w.prompts.percentOf, { p, a }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: { kind: "model", spec: P("of", p, a, 1) } };
    }
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const a = 20 * r.int(2, 30);
    if (L === 2) {
      const up = r.next() < 0.5;
      const b = (a * (100 + (up ? p : -p))) / 100;
      const v = up ? p : -p;
      return { prompt: fill(w.prompts.percentChange, { a, b }), q: "", answer: num(v), show: `${v}\\%`, plain: `${v}%`, format: "number", solution: { kind: "model", spec: P("percentChange", p, a, b) } };
    }
    const now = (a * (100 + p)) / 100;
    return { prompt: fill(w.prompts.percentReverse, { p, a: now }), q: "", answer: num(a), show: String(a), plain: String(a), format: "number", solution: { kind: "model", spec: P("reverseChange", p, now, 1, true) } };
  },

  decimals(r, L, w) {
    if (L === 1) {
      // Adding or subtracting decimals of one or two places (P4), worked with the points lined up: the one with fewer
      // places gets a zero. Lining up the last digits instead is the trap.
      const part = () => {
        const p = r.int(1, 2);
        return { m: noZeroEnd(r, 10 ** p + 1, 10 ** (p + 2) - 1), p };
      };
      const plus = r.next() < 0.5;
      let [a, b] = [part(), part()];
      const P = Math.max(a.p, b.p);
      /** The number in the smaller place of the two (tenths or hundredths). */
      const at = (x: typeof a) => x.m * 10 ** (P - x.p);
      while (at(a) === at(b)) b = part();
      if (!plus && at(a) < at(b)) [a, b] = [b, a];
      const res = plus ? at(a) + at(b) : at(a) - at(b);
      const v = res / 10 ** P;
      const slip = plus ? a.m + b.m : a.m - b.m;
      const [fa, fb] = [fmtM(a.m, a.p), fmtM(b.m, b.p)];
      const traps: Trap[] = a.p !== b.p && slip > 0 && slip !== res ? [{ id: "alignedRight", a: num(slip / 10 ** P), vars: { a: a.p < P ? fa : fb, pa: a.p < P ? fmtM(at(a), P) : fmtM(at(b), P) } }] : [];
      const op = plus ? "+" : "-";
      const steps = a.p === b.p ? [`${fa} ${op} ${fb} = ${tidy(v)}`] : [`${fa} ${op} ${fb} = ${fmtM(at(a), P)} ${op} ${fmtM(at(b), P)}`, `= ${fmtM(res, P)}`];
      const solution = { kind: "decimal" as const, spec: { pic: "columns", op, a: at(a), b: at(b), pa: a.p, pb: b.p, P, steps } };
      return { prompt: w.prompts.times, q: `${fa} ${op} ${fb}`, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution };
    }
    /** x × f or x ÷ f (f a power of ten), with the other one as the trap: the digits moved the wrong way. */
    const shifted = (m: number, p: number, f: number, times: boolean) => {
      const [up, down] = [Number(tidy((m * f) / 10 ** p)), Number(tidy(m / 10 ** p / f))];
      const [v, slip] = times ? [up, down] : [down, up];
      return { v, traps: [{ id: "pointWrongWay", a: num(slip), vars: { f } }] as Trap[] };
    };
    if (L === 2) {
      if (r.next() < 0.5) {
        // Multiplying or dividing by 10, 100 or 1000 (P5): the digits move past the point.
        const [p, f, times] = [r.int(1, 3), 10 ** r.int(1, 3), r.next() < 0.5];
        const m = noZeroEnd(r, 11, 9999);
        const { v, traps } = shifted(m, p, f, times);
        const q = `${fmtM(m, p)} ${times ? "\\times" : "\\div"} ${f}`;
        const solution = { kind: "decimal" as const, spec: { pic: "shift", m, p, e: Math.log10(f), times, steps: [`${q} = ${tidy(v)}`] } };
        return { prompt: w.prompts.times, q, answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution };
      }
      // A decimal times or divided by a one-digit number (P4), worked in tenths or hundredths as whole numbers. For a
      // division the answer is drawn first, so it comes out exactly.
      const [p, d] = [r.int(1, 2), r.int(2, 9)];
      const f = 10 ** p;
      if (r.next() < 0.5) {
        const m = noZeroEnd(r, f + 1, 30 * f);
        const v = (m * d) / f;
        const steps = [`${fmtM(m, p)} \\times ${d} = \\frac{${m} \\times ${d}}{${f}} = \\frac{${m * d}}{${f}} = ${tidy(v)}`];
        return { prompt: w.prompts.times, q: `${fmtM(m, p)} \\times ${d}`, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec: { pic: "jumps", m, p, d, times: true, steps } } };
      }
      let m: number;
      do m = noZeroEnd(r, f + 1, 20 * f);
      while ((m * d) % 10 === 0);
      const v = m / f;
      const steps = [`${fmtM(m * d, p)} \\div ${d} = \\frac{${m * d} \\div ${d}}{${f}} = \\frac{${m}}{${f}} = ${tidy(v)}`];
      return { prompt: w.prompts.times, q: `${fmtM(m * d, p)} \\div ${d}`, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec: { pic: "jumps", m, p, d, times: false, steps } } };
    }
    if (r.next() < 0.5) {
      // A measurement from one unit to the other in decimal form (P5): km and m, m and cm, kg and g, litres and ml.
      const [big, small, f] = r.pick([["km", "m", 1000], ["m", "cm", 100], ["kg", "g", 1000], ["l", "ml", 1000]] as const);
      const down = r.next() < 0.5;
      const p = down ? r.int(1, f === 100 ? 2 : 3) : 0;
      let m: number;
      do m = down ? noZeroEnd(r, 10 ** p + 1, 20 * 10 ** p) : r.int(15, 20 * f);
      while (!down && m % f === 0);
      const { v, traps } = shifted(m, p, f, down);
      const a = `${fmtM(m, p)} ${w.units[down ? big : small]}`;
      const units = [w.units[down ? big : small], w.units[down ? small : big]];
      const spec = { pic: "shift", m, p, e: Math.log10(f), times: down, units, steps: [`${fmtM(m, p)} ${down ? "\\times" : "\\div"} ${f} = ${tidy(v)}`] };
      return { prompt: fill(w.prompts.convertUnit, { a, u: w.units[down ? small : big] }), q: "", answer: { ...num(v), traps }, show: tidy(v), plain: tidy(v), format: "number", solution: { kind: "decimal", spec } };
    }
    // A whole number divided by a whole number, the answer as a decimal (P4): exact when the divisor goes into a power of
    // ten, else rounded to 2 places. The worked solution is the long division, carried past the point.
    const exact = r.next() < 0.5;
    const b = r.pick(exact ? [4, 8, 20, 25, 40] : [3, 6, 7, 9, 11, 12]);
    let a: number;
    do a = r.int(b + 1, 12 * b);
    while (a % b === 0);
    const v = exact ? a / b : Math.round((100 * a) / b) / 100;
    const places = exact ? (tidy(v).split(".")[1] ?? "").length : 3;
    const solution = { kind: "model" as const, spec: { type: "division", style: "bracket", a, b, decimals: places, step: 999 } };
    const q = `${a} \\div ${b}`;
    if (exact) return { prompt: w.prompts.decimalQuotient, q, answer: num(v), show: tidy(v), plain: tidy(v), format: "number", solution };
    return { prompt: w.prompts.decimalQuotient2, q, answer: num(v, 0.0051), show: v.toFixed(2), plain: v.toFixed(2), format: "dp2", solution };
  },

  ratio(r, L, w) {
    // Ratios of whole numbers (P6), drawn with the Percentages & ratios tool's bar models. Whole numbers from 1 to max
    // with no common factor, all different.
    const coprime = (n: number, max: number) => {
      for (;;) {
        const vs = Array.from({ length: n }, () => r.int(1, max));
        if (vs.reduce(gcd) === 1 && new Set(vs).size === n) return vs;
      }
    };
    const model = (kind: string, terms: number[], a = 1, b = 1) => ({ kind: "model" as const, spec: { type: "percratio", kind, p: "0", a: String(a), b: String(b), ratio: terms.join(":"), up: true, step: 999 } });
    const asked = (vs: number[], k: number, prompt: string) => {
      const terms = vs.map((v) => k * v);
      return { prompt, q: terms.join(" : "), answer: { k: "ratio" as const, vs }, show: vs.join(" : "), plain: vs.join(" : "), format: "ratio" as const, solution: model("simplify", terms) };
    };
    if (L === 1) {
      const [m, n] = coprime(2, 9);
      const k = r.int(2, 9);
      if (r.next() < 0.5) return asked([m, n], k, w.prompts.ratioSimplify);
      // The missing term of two equal ratios. Adding what the first term grew by, instead of multiplying, is the trap.
      const traps: Trap[] = [{ id: "addedNotScaled", a: num(k * m + n - m), vars: { a: m, b: k * m, k } }];
      return { prompt: w.prompts.ratioMissing, q: `${m} : ${n} = ${k * m} : \\,?`, answer: { ...num(k * n), traps }, show: String(k * n), plain: String(k * n), format: "number", solution: model("proportion", [m, n], k * m) };
    }
    if (L === 2) {
      const [m, n] = coprime(2, 9);
      const u = r.int(2, 12);
      if (r.next() < 0.5) {
        // A total shared in a ratio: m + n equal parts. Taking A's share as m/n of the total is the trap.
        const second = r.next() < 0.5;
        const T = u * (m + n);
        const v = u * (second ? n : m);
        const traps: Trap[] = !second && m < n && (T * m) % n === 0 ? [{ id: "ratioAsFraction", a: num((T * m) / n), vars: { m, n, s: m + n } }] : [];
        return { prompt: fill(w.prompts.ratioShare, { t: T, r: `${m} : ${n}`, who: second ? "B" : "A" }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model("share", [m, n], T) };
      }
      // One part known: the other part (adding what A's part grew by is the trap), or the whole.
      const whole = r.next() < 0.5;
      const v = u * (whole ? m + n : n);
      const traps: Trap[] = whole ? [] : [{ id: "addedNotScaled", a: num(u * m + n - m), vars: { a: m, b: u * m, k: u } }];
      return { prompt: fill(whole ? w.prompts.ratioWhole : w.prompts.ratioPart, { r: `${m} : ${n}`, a: u * m }), q: "", answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", solution: model("partKnown", [m, n], u * m, 1) };
    }
    const kind = r.int(0, 2);
    if (kind === 0) return asked(coprime(3, 9), r.int(2, 6), w.prompts.ratioSimplify);
    if (kind === 1) {
      // Shared between three.
      const vs = coprime(3, 6);
      const u = r.int(2, 12);
      const T = u * vs.reduce((s, v) => s + v, 0);
      const who = r.int(0, 2);
      return { prompt: fill(w.prompts.ratioShare3, { t: T, r: vs.join(" : "), who: "ABC"[who] }), q: "", answer: num(u * vs[who]), show: String(u * vs[who]), plain: String(u * vs[who]), format: "number", solution: model("share", vs, T) };
    }
    // A part as a fraction of the whole (fraction and ratio). Taking m : n as m/n is the trap.
    const [m, n] = coprime(2, 9);
    const s = m + n;
    const traps: Trap[] = [{ id: "ratioAsFraction", a: num(m / n), vars: { m, n, s } }];
    return { prompt: fill(w.prompts.ratioFraction, { r: `${m} : ${n}` }), q: "", answer: { ...num(m / s, 1e-9, { lowest: true }), traps }, show: fracTex(m, s), plain: `${m}/${s}`, format: "fraction", steps: [`${m} + ${n} = ${s}`, `\\frac{${m}}{${s}}`] };
  },

  rate(r, L, w) {
    // A rate as the amount for one unit (P5): rice at so much a kilogram, or a tap letting out so many litres a
    // minute. Given two of the rate, the total and the number of units, the third.
    const cost = r.next() < 0.5;
    const P = w.prompts;
    /** In the prompt: money, or litres as a plain number. */
    const said = (v: number) => (cost ? money(w, v) : tidy(v));
    /** In the working and the answer: money with both places when it has cents. */
    const shown = (v: number) => (cost && !Number.isInteger(v) ? v.toFixed(2) : tidy(v));
    const one = (v: number, steps: string[], traps: Trap[] = []) => ({ q: "", answer: { ...num(v), traps }, show: shown(v), plain: shown(v), format: "number" as const, steps });
    /** The rate from the total: dividing the other way round is the trap. */
    const inverted = (t: number, n: number): Trap[] => [{ id: "rateInverted", a: num(n / t), vars: { t: shown(t), n } }];
    if (L === 1) {
      const [u, n] = [r.int(2, 12), r.int(2, 9)];
      const t = u * n;
      if (r.next() < 0.5) return { prompt: fill(cost ? P.rateCost : P.rateTap, { n, t: said(t) }), ...one(u, [`${t} \\div ${n} = ${u}`], inverted(t, n)) };
      return { prompt: fill(cost ? P.rateCostTotal : P.rateTapTotal, { n, r: said(u) }), ...one(t, [`${u} \\times ${n} = ${t}`]) };
    }
    if (L === 2) {
      const kind = r.int(0, 2);
      if (kind === 0) {
        // How many units: the total divided by the rate.
        const [u, n] = [r.int(2, 12), r.int(3, 15)];
        return { prompt: fill(cost ? P.rateCostUnits : P.rateTapUnits, { r: said(u), t: said(u * n) }), ...one(n, [`${u * n} \\div ${u} = ${n}`]) };
      }
      // A rate with cents (1.05 to 4.95 a kilogram) or tenths of a litre, worked in cents or tenths.
      const f = cost ? 100 : 10;
      const uf = cost ? 5 * r.int(21, 99) : noZeroEnd(r, 11, 99);
      const n = r.int(3, 9);
      const [u, t] = [uf / f, (uf * n) / f];
      if (kind === 1) return { prompt: fill(cost ? P.rateCostTotal : P.rateTapTotal, { n, r: said(u) }), ...one(t, [`${shown(u)} \\times ${n} = ${shown(t)}`]) };
      return { prompt: fill(cost ? P.rateCost : P.rateTap, { n, t: said(t) }), ...one(u, [`${shown(t)} \\div ${n} = ${shown(u)}`], inverted(t, n)) };
    }
    // Two steps, the rate first (the unitary method): n units for t, so m units for? Adding the difference in units to
    // the total, as if each unit added one, is the trap.
    const u = cost ? 5 * r.int(5, 60) / 100 : r.int(2, 12);
    const n = r.int(2, 9);
    let m: number;
    do m = r.int(2, 15);
    while (m === n || m % n === 0);
    const [t, v] = [Number(tidy(u * n)), Number(tidy(u * m))];
    // At 1 a unit, adding and multiplying agree.
    const traps: Trap[] = t + m - n > 0 && u !== 1 ? [{ id: "addedNotScaled", a: num(Number(tidy(t + m - n))), vars: { a: n, b: m, k: plainFrac(fr(m, n)) } }] : [];
    return { prompt: fill(cost ? P.rateCostTwo : P.rateTapTwo, { n, t: said(t), m }), ...one(v, [`${shown(t)} \\div ${n} = ${shown(u)}`, `${shown(u)} \\times ${m} = ${shown(v)}`], traps) };
  },

  divisibility(r, L, w) {
    // Which of the divisors offered divide a number (src/math/divisible.ts): 2, 5 and 10; then 3 and 9; then 4, 6 and
    // 8. The answer lists them, typed or tapped, in any order; the worked solution is the Divisibility tab's table of
    // tests for those divisors.
    const t = divTask(L, r.next);
    const traps: Trap[] = divSlips(t).map((s) => ({ id: s.id, a: { k: "divisors", n: t.n, offered: t.offered, right: s.right }, vars: s.vars }));
    return {
      prompt: fill(w.prompts.divisibility, { divs: t.offered.join(", ") }),
      q: String(t.n),
      answer: { k: "divisors", n: t.n, offered: t.offered, right: t.right, traps },
      show: t.right.join(", "),
      plain: t.right.join(", "),
      format: "divisors",
      solution: { kind: "rules", spec: rulesSpec(t) },
    };
  },

  hcf(r, L, w) {
    const g = L === 3 ? r.int(6, 30) : r.int(2, 12);
    let m: number;
    let n: number;
    do {
      m = r.int(2, L === 3 ? 15 : 9);
      n = r.int(2, L === 3 ? 15 : 9);
    } while (m === n || gcd(m, n) !== 1);
    const [a, b] = [g * m, g * n];
    const lcm = L === 2;
    const v = lcm ? g * m * n : g;
    return { prompt: fill(lcm ? w.prompts.lcm : w.prompts.hcf, { a, b }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: { kind: "nt", spec: { topic: "gcd", mode: "euclid", a: String(a), b: String(b), c: "1" } } };
  },

  primes(r, L, w) {
    const ps = L === 1 ? [2, 3, 5, 7] : L === 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7, 11, 13];
    const limit = L === 1 ? 100 : L === 2 ? 1000 : 10000;
    let n = 1;
    let k = 0;
    for (;;) {
      const p = r.pick(ps);
      if (n * p > limit) {
        if (k >= (L === 1 ? 2 : 3)) break;
        n = 1;
        k = 0;
        continue;
      }
      n *= p;
      k++;
    }
    const pf: [number, number][] = [];
    let m = n;
    for (const p of ps)
      if (m % p === 0) {
        let e = 0;
        while (m % p === 0) (m /= p), e++;
        pf.push([p, e]);
      }
    return {
      prompt: fill(w.prompts.primes, { n }),
      q: "",
      answer: { k: "primes", n },
      show: pf.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : String(p))).join(" \\cdot "),
      plain: pf.map(([p, e]) => (e > 1 ? `${p}^${e}` : String(p))).join(" * "),
      format: "primes",
      solution: { kind: "nt", spec: { topic: "factor", n: String(n) } },
    };
  },

  linear(r, L, w) {
    let eq: string;
    let x: Frac;
    if (L === 1) {
      const a = r.int(2, 9);
      const xv = r.nz(-9, 9);
      const b = r.nz(-15, 15);
      eq = `${polyStr([b, a])} = ${a * xv + b}`;
      x = fr(xv);
    } else if (L === 2) {
      let a = r.int(2, 9);
      let c = r.int(1, 9);
      while (c === a) c = r.int(1, 9);
      if (r.next() < 0.5) [a, c] = [c, a];
      const xv = r.nz(-9, 9);
      const b = r.int(-12, 12);
      const d = (a - c) * xv + b;
      eq = `${polyStr([b, a])} = ${polyStr([d, c])}`;
      x = fr(xv);
    } else {
      const a = r.int(2, 6);
      const b = r.nz(-6, 6);
      let c = r.int(1, 9);
      while (c === a) c = r.int(1, 9);
      const d = r.int(-12, 12);
      eq = `${a}${bracket(1, b)} = ${polyStr([d, c])}`;
      x = fr(d - a * b, a - c);
    }
    return { prompt: w.prompts.linear, q: T(eq.split("=")[0]) + " = " + T(eq.split("=")[1]), answer: num(x.toNumber()), show: `x = ${x.tex()}`, plain: plainFrac(x), format: "exact", solution: { kind: "algebra", spec: { topic: "linear", eq, method: "factor" } } };
  },

  balance(r, L, w) {
    // Scales that balance, and what one ■ weighs (src/math/balance.ts): one shape, the same shape on both pans, two
    // shapes on two scales.
    const t = balanceTask(L, r.next);
    const pic = balanceSvg(t);
    const slip = oneSideOnly(t);
    const traps: Trap[] = slip ? [{ id: "oneSideOnly", a: num(slip.v), vars: { c: slip.c, k: slip.a - slip.c, b: slip.b, d: slip.d } }] : [];
    const steps = balanceSteps(t);
    return {
      prompt: w.prompts.balance,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
      answer: { ...num(t.values[0]), traps },
      show: `\\blacksquare = ${t.values[0]}`,
      plain: String(t.values[0]),
      format: "number",
      solution: { kind: "balance", spec: { task: t, steps } },
    };
  },

  findRule(r, L, w) {
    // A machine's rule from four pairs (src/math/machine.ts): what comes out for a bigger number, or what went in.
    const q = ruleQuestion(L, r.next);
    const v = machineAnswer(q);
    const traps: Trap[] = [];
    const scaled = scaledOutput(q);
    if (scaled) traps.push({ id: "scaledOutput", a: num(scaled.v), vars: { k: scaled.k, o: scaled.o } });
    const back = undoOrder(q);
    // Named only when the machine adds: "take −4 away first" would say it worse than the steps do.
    if (back !== null && q.rule.add > 0 && q.ask.dir === "in")
      traps.push({ id: "undoOrder", a: num(back), vars: { rule: `${q.rule.mul}n + ${q.rule.add}`, a: q.rule.add, out: q.ask.out, r: q.ask.out - q.rule.add, m: q.rule.mul } });
    return {
      prompt: q.ask.dir === "out" ? fill(w.prompts.findRuleOut, { n: q.ask.n }) : fill(w.prompts.findRuleIn, { out: q.ask.out }),
      q: ruleTable(q),
      answer: { ...num(v), traps },
      show: q.ask.dir === "out" ? `${q.ask.n} \\mapsto ${v}` : `${v} \\mapsto ${q.ask.out}`,
      plain: String(v),
      format: "number",
      steps: ruleSteps(q),
    };
  },

  growingPattern(r, L, w) {
    // Figures 1 to 3 of a pattern of squares, and figure k or which figure (src/math/growing.ts).
    const t = growQuestion(L, r.next);
    const v = growAnswer(t);
    const slip = scaledFigure(t);
    const traps: Trap[] = slip ? [{ id: "scaledFigure", a: num(slip.v), vars: { k: slip.k, f1: slip.f1, s: slip.s, k1: slip.k - 1, v } }] : [];
    const pic = figuresSvg(t.kind, false, 420);
    const steps = growSteps(t);
    return {
      prompt: t.ask.dir === "which" ? fill(w.prompts.growWhich, { n: t.ask.count }) : fill(w.prompts.growCount, { k: t.ask.dir === "count" ? t.ask.k : 4 }),
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
      answer: { ...num(v), traps },
      show: t.ask.dir === "which" ? `n = ${v}, \\quad ${countOf(t.kind, v)}` : steps[steps.length - 1],
      plain: String(v),
      format: "number",
      solution: { kind: "grow", spec: { task: t, steps } },
    };
  },

  sameExpression(r, L, w) {
    // The one of four expressions equal to one given (src/math/exprMatch.ts); the wrong ones are slips that get named.
    const q = exprQuestion(L, r.next);
    const best = q.options[q.right];
    return {
      prompt: fill(w.prompts.sameExpression, { e: q.given.text }),
      q: exprTex(q.given.text),
      answer: { k: "pick", options: q.options, right: q.right, traps: q.traps.map((x) => ({ id: x.id, a: { k: "pick", options: q.options, right: x.at }, vars: x.vars })) },
      show: `${exprTex(q.given.text)} = ${best.tex}`,
      plain: best.plain,
      format: "pick",
      steps: exprSteps(q),
    };
  },

  expand(r, L, w) {
    let src: string;
    let cs: number[];
    const traps: Trap[] = [];
    if (L === 1) {
      const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
      src = `${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([a, 1], [b, 1]);
      if (a + b !== 0) traps.push({ id: "noMiddle", a: { k: "expr", e: parseE(polyStr([a * b, 0, 1])) }, vars: { L: (1 + a) * (1 + b), R: 1 + a * b } });
    } else if (L === 2) {
      const [a, b, c, d] = [r.int(2, 5), r.nz(-7, 7), r.int(1, 5), r.nz(-7, 7)];
      src = `${bracket(a, b)}${bracket(c, d)}`;
      cs = pmul([b, a], [d, c]);
    } else {
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [a, b] = [r.int(2, 5), r.nz(-7, 7)];
        src = `${bracket(a, b)}^2`;
        cs = pmul([b, a], [b, a]);
        traps.push({ id: "squareTerms", a: { k: "expr", e: parseE(polyStr([b * b, 0, a * a])) }, vars: { L: (a + b) ** 2, R: a * a + b * b } });
      } else if (kind === 1) {
        const [a, b, c] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-6, 6)];
        src = `${bracket(1, a)}(${polyStr([c, b, 1])})`;
        cs = pmul([a, 1], [c, b, 1]);
      } else {
        const [k, a, b] = [r.int(2, 5) * r.sign(), r.nz(-6, 6), r.nz(-6, 6)];
        src = `${k}${bracket(1, a)}${bracket(1, b)}`;
        cs = pmul([k], pmul([a, 1], [b, 1]));
      }
    }
    const out = polyStr(cs);
    return { prompt: w.prompts.expand, q: T(src), answer: { k: "expr", e: parseE(out), mode: "expand", traps }, show: T(out), plain: out, format: "expr", solution: { kind: "algebra", spec: { topic: "expand", eq: src, method: "factor" } } };
  },

  factor(r, L, w) {
    let fac: string;
    let cs: number[];
    if (L === 1) {
      const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
      fac = `${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([a, 1], [b, 1]);
    } else if (L === 2) {
      let p: number, a: number, q: number, b: number;
      do [p, a, q, b] = [r.int(2, 3), r.nz(-7, 7), r.int(1, 2), r.nz(-7, 7)];
      while (gcd(p, a) !== 1 || gcd(q, b) !== 1 || p * b === q * a);
      fac = `${bracket(p, a)}${bracket(q, b)}`;
      cs = pmul([a, p], [b, q]);
    } else {
      const kind = r.int(0, 2);
      if (kind === 0) {
        let p: number, a: number;
        do [p, a] = [r.int(1, 5), r.int(1, 9)];
        while (gcd(p, a) !== 1);
        fac = `${bracket(p, -a)}${bracket(p, a)}`;
        cs = pmul([-a, p], [a, p]);
      } else if (kind === 1) {
        const [k, a, b] = [r.int(2, 5), r.nz(-6, 6), r.nz(-6, 6)];
        fac = `${k}${bracket(1, a)}${bracket(1, b)}`;
        cs = pmul([k], pmul([a, 1], [b, 1]));
      } else {
        let k: number, a: number, p: number;
        do [k, p, a] = [r.int(1, 4), r.int(2, 6), r.nz(-9, 9)];
        while (gcd(p, a) !== 1);
        fac = `${k === 1 ? "" : k}x${bracket(p, a)}`;
        cs = pmul([0, k], [a, p]);
      }
    }
    const ex = polyStr(cs);
    return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: { kind: "algebra", spec: { topic: "factor", eq: ex, method: "factor" } } };
  },

  quadratic(r, L, w) {
    if (L < 3) {
      let p: number, q: number, a: number, cs: number[];
      let roots: Frac[];
      if (L === 1) {
        do [p, q] = [r.int(-9, 9), r.int(-9, 9)];
        while (p === q);
        a = 1;
        cs = pmul([-p, 1], [-q, 1]);
        roots = [fr(p), fr(q)];
      } else {
        do [a, p, q] = [r.int(2, 3), r.nz(-7, 7), r.int(-6, 6)];
        while (gcd(a, p) !== 1);
        cs = pmul([-p, a], [-q, 1]);
        roots = [fr(p, a), fr(q)];
      }
      const eq = `${polyStr(cs)} = 0`;
      roots.sort((x, y) => x.toNumber() - y.toNumber());
      return {
        prompt: w.prompts.quadratic,
        q: `${T(polyStr(cs))} = 0`,
        answer: { k: "set", vs: roots.map((x) => x.toNumber()), tol: 1e-9 },
        show: roots.map((x) => `x = ${x.tex()}`).join(", \\; "),
        plain: roots.map(plainFrac).join("; "),
        format: "roots",
        solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "factor" } },
      };
    }
    let b: number, c: number, D: number;
    do [b, c] = [r.int(-8, 8), r.nz(-10, 10)];
    while ((D = b * b - 4 * c) <= 0 || Number.isInteger(Math.sqrt(D)));
    const { out, s } = sqrtSplit(fr(D));
    const eq = `${polyStr([c, b, 1])} = 0`;
    const vs = [(-b - Math.sqrt(D)) / 2, (-b + Math.sqrt(D)) / 2];
    return {
      prompt: w.prompts.quadratic,
      q: `${T(polyStr([c, b, 1]))} = 0`,
      answer: { k: "set", vs, tol: 0.0051 },
      show: `x = ${surdTex(fr(-b, 2), out.div(fr(2)), s).replace(/ [+-] /, " \\pm ")} \\approx ${dp(vs[0], 2)}, \\; ${dp(vs[1], 2)}`,
      plain: vs.map((v) => dp(v, 3)).join("; "),
      format: "roots",
      solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "formula" } },
    };
  },

  simultaneous(r, L, w) {
    const x = r.int(-6, 6);
    const y = r.int(-6, 6);
    const big = L === 3 ? 9 : 5;
    let a1: number, b1: number, a2: number, b2: number;
    do {
      [a1, b1, a2, b2] = [r.nz(-big, big), r.nz(-big, big), r.nz(-big, big), r.nz(-big, big)];
      if (L === 1) b2 = r.pick([b1, -b1]);
    } while (a1 * b2 - a2 * b1 === 0);
    const eq = (a: number, b: number) => `${polyStr([0, a])} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${a * x + b * y}`;
    const [e1, e2] = [eq(a1, b1), eq(a2, b2)];
    return {
      prompt: w.prompts.simultaneous,
      q: `\\begin{cases} ${e1} \\\\ ${e2} \\end{cases}`,
      answer: { k: "tuple", vs: [x, y], tol: 1e-9 },
      show: `x = ${x}, \\; y = ${y}`,
      plain: `x = ${x}; y = ${y}`,
      format: "point",
      solution: { kind: "coord", spec: { topic: "meet", src: `${e1}; ${e2}` } },
    };
  },

  polynomials(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "polynomials" as const, spec: { topic, src } });
    const sup = (k: number) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
    if (L === 1) {
      // The remainder theorem: dividing by (x − a) leaves f(a).
      const cs = [r.nz(-6, 6), r.int(-5, 5), r.int(-5, 5), r.pick([1, 1, 2, -1, 3])];
      const a = r.nz(-3, 3);
      const p = polyStr(cs);
      const v = cs.reduceRight((acc, c) => acc * a + c, 0);
      const d = `x ${a < 0 ? "+" : "-"} ${Math.abs(a)}`;
      return { prompt: fill(w.prompts.polyRem, { d: `(${d.replace("-", "−")})` }), q: `f(x) = ${T(p)}`, answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("divide", `(${p}) / (${d})`) };
    }
    if (L === 2) {
      // A cubic with three rational roots, found by the factor theorem.
      const r1 = r.nz(-4, 4);
      let r2 = r.nz(-4, 4);
      while (r2 === r1) r2 = r.nz(-4, 4);
      const b = r.pick([1, 1, 2]);
      let a = b === 2 ? r.pick([-3, -1, 1, 3, 5]) : r.nz(-5, 5);
      while (b === 1 && (a === r1 || a === r2)) a = r.nz(-5, 5);
      const cs = pmul(pmul([-r1, 1], [-r2, 1]), [-a, b]);
      const ex = polyStr(cs);
      const fac = [bracket(1, -r1), bracket(1, -r2), bracket(b, -a)].join("");
      return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: sol("solve", ex) };
    }
    // A coefficient in (ax + b)ⁿ: C(n, k)·aᵏ·bⁿ⁻ᵏ.
    const n = r.int(4, 7);
    const a = r.pick([1, 2, 2, 3]);
    const b = r.nz(-3, 3);
    const k = r.int(1, n - 1);
    let c = 1;
    for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
    const v = Math.round(c) * a ** k * b ** (n - k);
    const src = `(${polyStr([b, a])})^${n}`;
    return {
      prompt: fill(w.prompts.polyCoef, { t: k === 1 ? "x" : `x${sup(k)}` }),
      q: T(src),
      answer: num(v),
      show: String(v),
      plain: String(v),
      format: "number",
      solution: sol("binomial", `${src}, x^${k}`),
    };
  },

  indices(r, L, w) {
    let src: string;
    let v: Frac;
    let q: string;
    const traps: Trap[] = [];
    if (L === 1) {
      const a = r.int(2, 5);
      const kind = r.int(0, 1);
      if (kind === 0) {
        const [m, n] = [r.int(2, 6), r.int(1, 5)];
        const k = r.int(Math.max(1, m + n - (a === 2 ? 8 : 4)), m + n);
        src = `${a}^${m} * ${a}^${n} / ${a}^${k}`;
        q = `\\frac{${a}^{${m}} \\times ${a}^{${n}}}{${a}^{${k}}}`;
        v = fr(a ** (m + n - k));
      } else {
        const n = r.int(1, 3);
        src = `${a}^(-${n})`;
        q = `${a}^{-${n}}`;
        v = fr(1, a ** n);
        traps.push({ id: "negPower", a: num(-(a ** n)) });
      }
    } else {
      const [k, d] = r.pick([[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5]] as const);
      const base = k ** d;
      let n = r.int(1, d === 2 ? 3 : 2);
      if (n % d === 0) n++;
      if (L === 2) {
        src = `${base}^(${n}/${d})`;
        q = `${base}^{\\frac{${n}}{${d}}}`;
        v = fr(k ** n);
        if ((base * n) / d !== k ** n) traps.push({ id: "powTimes", a: num((base * n) / d) });
      } else {
        const [p, qq] = r.pick([[2, 3], [3, 2], [1, 2], [2, 5], [3, 4], [1, 3]] as const);
        const [P, Q] = [p ** d, qq ** d];
        src = `(${P}/${Q})^(-${n}/${d})`;
        q = `\\left(\\frac{${P}}{${Q}}\\right)^{-\\frac{${n}}{${d}}}`;
        v = fr(qq ** n, p ** n);
        // Not turned over, or taken to make the answer negative.
        traps.push({ id: "negPower", a: num((p / qq) ** n) }, { id: "negPower", a: num(-((qq / p) ** n)) });
      }
    }
    return { prompt: w.prompts.evaluate, q, answer: { ...num(v.toNumber()), traps }, show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "laws", src } } };
  },

  logs(r, L, w) {
    const logTex = (b: number, x: string) => (b === 10 ? `\\log ${x}` : `\\log_{${b}} ${x}`);
    const logSrc = (b: number, x: string) => (b === 10 ? `log(${x})` : `log_${b}(${x})`);
    let src: string;
    let q: string;
    let v: Frac;
    if (L === 1) {
      const b = r.pick([2, 3, 5, 10]);
      const k = r.int(1, b === 2 ? 7 : b === 10 ? 5 : 4);
      src = logSrc(b, String(b ** k));
      q = logTex(b, String(b ** k));
      v = fr(k);
    } else if (L === 2) {
      if (r.next() < 0.5) {
        const b = r.pick([2, 3, 10]);
        const k = r.int(1, 4);
        src = logSrc(b, `1/${b ** k}`);
        q = logTex(b, `\\frac{1}{${b ** k}}`);
        v = fr(-k);
      } else {
        const b = r.pick([2, 3]);
        const [m, n] = r.pick([[2, 3], [2, 1], [2, 5], [3, 2], [3, 1], [2, 4]] as const);
        if (b ** n > 10000 || b ** m > 100) return GENS.logs(r, 1, w);
        src = logSrc(b ** m, String(b ** n));
        q = logTex(b ** m, String(b ** n));
        v = fr(n, m);
      }
    } else {
      const b = r.pick([2, 3, 5, 6, 10]);
      const k = r.int(1, b <= 3 ? 3 : 2);
      if (b === 6 || b === 10) {
        const t = b ** k;
        const parts = k === 1 ? (b === 6 ? [2, 3] : [2, 5]) : b === 6 ? [4, 9] : k === 2 ? [4, 25] : [8, 125];
        src = `${logSrc(b, String(parts[0]))} + ${logSrc(b, String(parts[1]))}`;
        q = `${logTex(b, String(parts[0]))} + ${logTex(b, String(parts[1]))}`;
        v = fr(Math.round(Math.log(t) / Math.log(b)));
      } else {
        const y = r.pick([2, 3, 5, 6, 7].filter((x) => x % b !== 0));
        src = `${logSrc(b, String(y * b ** k))} - ${logSrc(b, String(y))}`;
        q = `${logTex(b, String(y * b ** k))} - ${logTex(b, String(y))}`;
        v = fr(k);
      }
    }
    return { prompt: w.prompts.evaluate, q, answer: num(v.toNumber()), show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "logs", src } } };
  },

  surds(r, L, w) {
    const M = [2, 3, 5, 6, 7, 10, 11];
    if (L === 1) {
      const [k, m] = [r.int(2, 6), r.pick(M)];
      const n = k * k * m;
      return { prompt: w.prompts.surds, q: `\\sqrt{${n}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: `${k}\\sqrt{${m}}`, plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `√${n}` } } };
    }
    if (L === 2) {
      const m = r.pick(M.slice(0, 4));
      let c: number[];
      do c = [r.int(1, 5), r.int(1, 5), r.int(1, 5)];
      while (c[0] + c[1] - c[2] === 0 || c[0] === c[1] || c[1] === c[2] || c[0] === c[2]);
      const k = c[0] + c[1] - c[2];
      const ns = c.map((x) => x * x * m);
      const src = `√${ns[0]} + √${ns[1]} - √${ns[2]}`;
      return { prompt: w.prompts.surds, q: `\\sqrt{${ns[0]}} + \\sqrt{${ns[1]}} - \\sqrt{${ns[2]}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: surdTex(fr(0), fr(k), m), plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src } } };
    }
    if (r.next() < 0.5) {
      const [a, b] = [r.int(1, 12), r.pick([2, 3, 5, 6, 7])];
      if (a % b === 0 && a / b === 1) return GENS.surds(r, 3, w);
      const coef = fr(a, b);
      return { prompt: w.prompts.rationalise, q: `\\frac{${a}}{\\sqrt{${b}}}`, answer: num(a / Math.sqrt(b), 1e-9, { surd: true }), show: surdTex(fr(0), coef, b), plain: `(${a}/${b})sqrt(${b})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `${a} / √${b}` } } };
    }
    const [a, b, c] = [r.int(1, 6), r.int(2, 5), r.pick([2, 3, 5, 7])];
    const den = b * b - c;
    const p = fr(a * b, den);
    const q = fr(a, den);
    return {
      prompt: w.prompts.rationalise,
      q: `\\frac{${a}}{${b} - \\sqrt{${c}}}`,
      answer: num(a / (b - Math.sqrt(c)), 1e-9, { surd: true }),
      show: surdTex(p, q, c),
      plain: `${plainFrac(p).replace(/^(.*)$/, "($1)")} + (${plainFrac(q)})sqrt(${c})`,
      format: "exact",
      solution: { kind: "powers", spec: { topic: "surds", src: `${a} / (${b} - √${c})` } },
    };
  },

  sequences(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
    const list = (vs: number[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
    const listSrc = (vs: number[]) => `${vs.join(", ")}, …`;
    const done = (prompt: string, v: number, spec: { kind: "sequences"; spec: { topic: string; src: string } }) => ({
      prompt, q: "", answer: num(v), show: String(v), plain: String(v), format: "number" as const, solution: spec,
    });
    const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
    if (L === 1 || (L === 2 && r.next() < 0.5)) {
      const [a, d] = [r.int(-10, 20), r.nz(-6, 9)];
      const terms = [0, 1, 2, 3].map((i) => a + i * d);
      const n = r.int(10, 40);
      if (L === 1) return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a + (n - 1) * d, sol("arith", `${listSrc(terms)}; u${n}`));
      let p = r.int(2, 8);
      let q = r.int(p + 2, 15);
      if (r.next() < 0.5) [p, q] = [q, p];
      const [x, y] = [a + (p - 1) * d, a + (q - 1) * d];
      const n2 = r.int(16, 30);
      return done(fill(w.prompts.seqTwo, { a: `u${sub(p)} = ${x}`.replace(/-/g, "−"), b: `u${sub(q)} = ${y}`.replace(/-/g, "−"), c: `u${sub(n2)}` }), a + (n2 - 1) * d, sol("arith", `u${p} = ${x}, u${q} = ${y}; u${n2}`));
    }
    if (L === 2) {
      const [a, ratio] = [r.nz(-4, 5), r.pick([2, 3, -2, -3] as const)];
      const terms = [0, 1, 2, 3].map((i) => a * ratio ** i);
      const n = r.int(6, 9);
      return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a * ratio ** (n - 1), sol("geom", `${listSrc(terms)}; u${n}`));
    }
    // A quadratic rule an² + bn + c.
    const [a, b, c] = [r.int(1, 3), r.int(-5, 5), r.int(-5, 6)];
    const u = (n: number) => a * n * n + b * n + c;
    const terms = [1, 2, 3, 4, 5].map(u);
    const n = r.int(10, 25);
    return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), u(n), sol("pattern", `${terms.join(", ")}; u${n}`));
  },
  series(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
    const list = (vs: string[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
    if (L === 1) {
      const [a, d] = [r.int(-5, 15), r.nz(-3, 8)];
      const n = r.int(10, 30);
      const terms = [0, 1, 2, 3].map((i) => String(a + i * d));
      const v = (n * (2 * a + (n - 1) * d)) / 2;
      return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("arith", `${terms.join(", ")}, …; S${n}`) };
    }
    if (L === 2) {
      if (r.next() < 0.5) {
        const [a, ratio, n] = [r.int(1, 5), r.pick([2, 3] as const), r.int(5, 8)];
        const terms = [0, 1, 2, 3].map((i) => String(a * ratio ** i));
        const v = (a * (ratio ** n - 1)) / (ratio - 1);
        return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("geom", `${terms.join(", ")}, …; S${n}`) };
      }
      const [p, q] = r.pick([[1, 2], [1, 3], [2, 3], [-1, 2], [3, 4], [-1, 3], [-2, 3]] as const);
      const a = r.int(1, 3) * q ** 3;
      const terms = [0, 1, 2, 3].map((i) => (a * p ** i) / q ** i);
      const v = fr(a * q, q - p);
      return {
        prompt: fill(w.prompts.serInf, { list: list(terms.map(String)) }),
        q: "",
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("geom", `${terms.join(", ")}, …; S∞`),
      };
    }
    const N = r.int(10, 30);
    if (r.next() < 0.5) {
      // 1/(k(k + m)) telescopes.
      const m = r.pick([1, 1, 2] as const);
      let v = fr(0);
      for (let k = 1; k <= N; k++) v = v.add(fr(1, k * (k + m)));
      return {
        prompt: w.prompts.serSigma,
        q: `\\sum_{k=1}^{${N}} \\frac{1}{k(k + ${m})}`,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("sigma", `sum k=1..${N} 1/(k(k + ${m}))`),
      };
    }
    const [p, q, c] = [r.int(0, 3), r.nz(-4, 6), r.int(-5, 5)];
    const f = (k: number) => p * k * k + q * k + c;
    let v = 0;
    for (let k = 1; k <= N; k++) v += f(k);
    const body = polyStr([c, q, p], "k");
    return {
      prompt: w.prompts.serSigma,
      q: `\\sum_{k=1}^{${N}} \\left(${T(polyStr([c, q, p])).replace(/x/g, "k")}\\right)`,
      answer: num(v),
      show: String(v),
      plain: String(v),
      format: "number",
      solution: sol("sigma", `sum k=1..${N} (${body})`),
    };
  },

  functions(r, L, w) {
    const sol = (src: string) => ({ kind: "functions" as const, spec: { topic: "compose", src } });
    if (L === 1) {
      const [p, q] = [r.nz(-5, 5), r.int(-6, 6)];
      const quad = r.next() < 0.5;
      const [s, t] = [r.nz(-4, 4), r.int(-5, 5)];
      const gs = quad ? polyStr([t, 0, 1]) : polyStr([t, s]);
      const fs = polyStr([q, p]);
      const a = r.int(-4, 4);
      const g = quad ? a * a + t : s * a + t;
      const v = p * g + q;
      return {
        prompt: fill(w.prompts.fnComp, { a }), q: `f(x) = ${T(fs)}, \\quad g(x) = ${T(gs)}`, answer: num(v), show: String(v), plain: String(v), format: "number",
        solution: sol(`f(x) = ${fs}; g(x) = ${gs}; fg(${a})`),
      };
    }
    const a = r.int(-6, 9);
    let fs: string;
    let v: Frac;
    if (L === 2) {
      const [p, q] = [r.pick([2, 3, 4, 5, -2, -3] as const), r.int(-8, 8)];
      fs = polyStr([q, p]);
      v = fr(a - q, p);
    } else {
      // (p x + q)/(x + s): x = (q − s a)/(a − p).
      let p: number, q: number, s: number;
      do [p, q, s] = [r.nz(-4, 4), r.int(-6, 6), r.nz(-5, 5)];
      while (p * s === q || a === p);
      fs = `(${polyStr([q, p])})/(${polyStr([s, 1])})`;
      v = fr(q - s * a, a - p);
    }
    return {
      prompt: fill(w.prompts.fnInv, { a }), q: `f(x) = ${T(fs)}`, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v),
      format: v.isInt() ? "number" : "fraction", solution: sol(`f(x) = ${fs}; f^-1(${a})`),
    };
  },

  line(r, L, w) {
    const pt = (x: number, y: number) => `(${x}, ${y})`;
    if (L < 3) {
      const x1 = r.int(-5, 5);
      const y1 = r.int(-5, 5);
      let dx = r.int(1, 4);
      let dy = L === 1 ? r.nz(-4, 4) * dx : r.nz(-7, 7);
      if (L === 2 && dy % dx === 0) dx = dx === 1 ? 2 : dx + 1;
      if (L === 2 && dy % dx === 0) dy += 1;
      const [x2, y2] = [x1 + dx, y1 + dy];
      const m = fr(dy, dx);
      const c = fr(y1).sub(m.mul(fr(x1)));
      const e = fromPoly([c, m]);
      return {
        prompt: fill(w.prompts.line, { a: pt(x1, y1), b: pt(x2, y2) }),
        q: "",
        answer: { k: "expr", e, mode: "line" },
        show: `y = ${tex(e)}`,
        plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
        format: "line",
        solution: { kind: "coord", spec: { topic: "line", src: `${pt(x1, y1)}, ${pt(x2, y2)}` } },
      };
    }
    const m0 = fr(r.nz(-4, 4), r.pick([1, 1, 2, 3]));
    const c0 = r.int(-6, 6);
    const [px, py] = [r.int(-5, 5), r.int(-5, 5)];
    const m = fr(-1).div(m0);
    const c = fr(py).sub(m.mul(fr(px)));
    const given = fromPoly([fr(c0), m0]);
    const givenSrc = `y = ${m0.d === 1 ? polyStr([c0, m0.n]) : `${m0.n}/${m0.d}x ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`}`;
    const e = fromPoly([c, m]);
    return {
      prompt: fill(w.prompts.perp, { p: pt(px, py) }),
      q: `y = ${tex(given)}`,
      answer: { k: "expr", e, mode: "line" },
      show: `y = ${tex(e)}`,
      plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
      format: "line",
      solution: { kind: "coord", spec: { topic: "perp", src: `${givenSrc}; P${pt(px, py)}` } },
    };
  },

  distance(r, L, w) {
    const [x1, y1] = [r.int(-6, 6), r.int(-6, 6)];
    let dx: number, dy: number;
    if (L === 2) {
      const [a, b] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15], [4, 3], [12, 5], [8, 6]] as const);
      [dx, dy] = [a * r.sign(), b * r.sign()];
    } else {
      do [dx, dy] = [r.int(-7, 7), r.int(-7, 7)];
      while (!dx || !dy || (L === 3 && Number.isInteger(Math.hypot(dx, dy))));
    }
    const [x2, y2] = [x1 + dx, y1 + dy];
    const A = `A(${x1}, ${y1})`;
    const B = `B(${x2}, ${y2})`;
    const solution = { kind: "coord" as const, spec: { topic: "points", src: `${A}, ${B}` } };
    if (L === 1) {
      const mx = fr(x1 + x2, 2);
      const my = fr(y1 + y2, 2);
      return { prompt: fill(w.prompts.midpoint, { a: A, b: B }), q: "", answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 }, show: `\\left(${mx.tex()}, \\; ${my.tex()}\\right)`, plain: `(${plainFrac(mx)}; ${plainFrac(my)})`, format: "point", solution };
    }
    const d2 = dx * dx + dy * dy;
    const { out, s } = sqrtSplit(fr(d2));
    const v = Math.sqrt(d2);
    return {
      prompt: fill(w.prompts.distance, { a: A, b: B }),
      q: "",
      answer: num(v, L === 2 ? 1e-9 : 0.0051, { surd: true }),
      show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: L === 2 ? "number" : "exact",
      solution,
    };
  },

  trigexact(r, L, w) {
    // sin and cos of the reference angles, exactly.
    const REF: Record<number, [string, number, string, number]> = {
      0: ["0", 0, "1", 1],
      30: ["\\frac{1}{2}", 0.5, "\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2],
      45: ["\\frac{\\sqrt{2}}{2}", Math.SQRT1_2, "\\frac{\\sqrt{2}}{2}", Math.SQRT1_2],
      60: ["\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2, "\\frac{1}{2}", 0.5],
      90: ["1", 1, "0", 0],
    };
    const TAN: Record<number, [string, number]> = { 0: ["0", 0], 30: ["\\frac{\\sqrt{3}}{3}", Math.sqrt(3) / 3], 45: ["1", 1], 60: ["\\sqrt{3}", Math.sqrt(3)] };
    const f = r.pick(["sin", "cos", "tan"] as const);
    let deg: number;
    do deg = L === 1 ? r.pick([30, 45, 60]) : r.pick([0, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
    while (f === "tan" && deg % 180 === 90);
    const rad = (deg * Math.PI) / 180;
    const ref = [0, 30, 45, 60, 90].find((a) => [deg, 180 - deg, deg - 180, 360 - deg].includes(a))!;
    const v0 = f === "sin" ? Math.sin(rad) : f === "cos" ? Math.cos(rad) : Math.tan(rad);
    const v = Math.abs(v0) < 1e-12 ? 0 : v0;
    const mag = f === "sin" ? REF[ref][0] : f === "cos" ? REF[ref][2] : TAN[ref][0];
    const show = v === 0 ? "0" : `${v < 0 ? "-" : ""}${mag}`;
    let angleTex = `${deg}^\\circ`;
    if (L === 3) {
      const g = gcd(deg, 180);
      const [n, d] = [deg / g, 180 / g];
      angleTex = deg === 0 ? "0" : d === 1 ? `${n === 1 ? "" : n}\\pi` : `\\frac{${n === 1 ? "" : n}\\pi}{${d}}`;
    }
    const plain = show.replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
    return { prompt: w.prompts.trigexact, q: `\\${f} ${angleTex}`, answer: num(v), show, plain, format: "exact", solution: { kind: "trig", spec: { topic: "circle", angle: deg, unit: "deg" } } };
  },

  shapeArea(r, L, w) {
    // A shape made on a dot grid by tapping: a rectangle, a triangle (half squares) or a shape on the grid lines with
    // an area and a perimeter. The answer is the shape's corners as text, marked in whole numbers (src/math/geoPlay.ts).
    const t = polyTask(L, r.next);
    const { goal } = t.play;
    const A = areaTex(goal.area2!);
    const lines =
      L === 1 ? [`${t.dims[0]} \\times ${t.dims[1]} = ${A}`]
      : L === 2 ? [`${t.dims[0]} \\times ${t.dims[1]} = ${t.dims[0] * t.dims[1]}`, `\\frac{1}{2} \\times ${t.dims[0] * t.dims[1]} = ${A}`]
      : [`${t.dims[0]} \\times ${t.dims[1]} - ${t.dims[2]} \\times ${t.dims[3]} = ${A}`, `P = 2 \\times (${t.dims[0]} + ${t.dims[1]}) = ${goal.perim}`];
    const prompt =
      L === 1 ? fill(w.prompts.shapeRect, { n: areaText(goal.area2!) })
      : L === 2 ? fill(w.prompts.shapeTriangle, { n: areaText(goal.area2!) })
      : fill(w.prompts.shapeAreaPerim, { a: areaText(goal.area2!), p: goal.perim! });
    const traps: Trap[] = polyTraps(t).map((p) => ({ id: p.id, a: { k: "poly", play: { ...t.play, goal: p.goal }, sample: encodePoly(p.sample) }, vars: p.vars }));
    const grid = geoGridSvg(t.play);
    return {
      prompt,
      q: L === 3 ? `A = ${A}, \\quad P = ${goal.perim}` : `A = ${A}`,
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${grid.body}</g>`, h: grid.h, w: grid.w },
      play: { kind: "grid", ...t.play },
      answer: { k: "poly", play: t.play, sample: encodePoly(t.sample), traps },
      show: lines.join(", \\quad "),
      plain: encodePoly(t.sample),
      format: "shape",
      solution: { kind: "shape", spec: { play: t.play, pts: t.sample, steps: lines } },
    };
  },

  estimateAngle(r, L, w) {
    // About how big an angle is, by eye (src/math/angleGuess.ts): the nearest of a few sizes, typed or picked.
    const q = angleQuestion(L, r.next);
    const pic = angleSvg(q.task, { R: 100, crop: true });
    const traps: Trap[] = q.trap ? [{ id: q.trap.id, a: { k: "near", options: q.options, right: q.trap.at }, vars: { v: q.options[q.trap.at].v, a: L === 3 ? 360 : 180 } }] : [];
    return {
      prompt: fill(w.prompts.estimateAngle, { opts: q.options.map((o) => o.text).join(", ") }),
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "near", options: q.options, right: q.right, traps },
      show: `${q.task.size}^\\circ \\approx ${q.options[q.right].tex}`,
      plain: q.options[q.right].plain,
      format: "near",
      solution: { kind: "angle", spec: { task: q.task, steps: angleSteps(q) } },
    };
  },

  missingAngle(r, L, w) {
    // An angle to find from the others, the figure drawn to size (src/math/missingAngle.ts): on a line, in a right
    // angle, around a point, in a triangle, an isosceles triangle or a quadrilateral.
    const t = huntTask(L, r.next);
    const pic = huntSvg(t.fig);
    const traps: Trap[] = huntTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: x.vars }));
    return {
      prompt: w.prompts.missingAngle,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(t.v), traps },
      show: `? = ${t.v}^\\circ`,
      plain: String(t.v),
      format: "number",
      solution: { kind: "angles", spec: { task: t, steps: huntSteps(t) } },
    };
  },

  symmetryLines(r, L, w) {
    // How many lines a shape folds onto itself along (src/math/symmetry.ts); a quadrilateral's diagonals that only
    // halve it, counted as well, are the slip named.
    const t = symTask(L, r.next);
    const n = mirrorsOf(t).length;
    const extra = falseDiagonals(t);
    const pic = symSvg(t, 220);
    return {
      prompt: w.prompts.symmetryLines,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(n), traps: extra ? [{ id: "diagonalMirror", a: num(n + extra), vars: { v: n } }] : [] },
      show: String(n),
      plain: String(n),
      format: "number",
      solution: { kind: "mirror", spec: { task: t, steps: [] } },
    };
  },

  cubeNets(r, L, w) {
    // Which of four shapes folds into a cube, or which face of a net is opposite ★ (src/math/cubeNets.ts); a letter,
    // typed or picked.
    const q = netQuestion(L, r.next);
    const options = netOptions(q);
    const slips = q.level === 3 ? q.beside.map((at) => ({ id: "nextToOpposite" as const, at })) : q.lookalikes.map((at) => ({ id: "sixSquares" as const, at }));
    const pic = netSvg(q);
    return {
      prompt: q.level === 3 ? w.prompts.cubeOpposite : w.prompts.cubeNet,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "pick", options, right: q.right, traps: slips.map(({ id, at }) => ({ id, a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } })) },
      show: `\\text{${LETTERS[q.right]}}`,
      plain: LETTERS[q.right],
      format: "pick",
      solution: { kind: "net", spec: { q, steps: netSteps(q) } },
    };
  },

  coordinates(r, L, w) {
    // A point drawn on a grid, its coordinates to read (src/math/plotPoint.ts); at the hard level the fourth corner of
    // a rectangle whose other three are drawn.
    const t = plotTask(L, r.next);
    const [x, y] = t.p;
    const pic = plotSvg(t, { asked: true, cell: 26 });
    return {
      prompt: L === 3 ? w.prompts.coordCorner : w.prompts.coordinates,
      q: "",
      pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "tuple", vs: [x, y], tol: 1e-9, traps: x !== y ? [{ id: "swappedXY", a: { k: "tuple", vs: swapped(t.p), tol: 1e-9 }, vars: { x, y, p: ptText(t.p), s: ptText(swapped(t.p)) } }] : [] },
      show: `(${x}, \\; ${y})`,
      plain: `(${x}, ${y})`,
      format: "point",
      solution: { kind: "plot", spec: { task: t, steps: plotSteps(t) } },
    };
  },

  slope(r, L, w) {
    // The gradient of a line drawn through two points of a grid (src/math/slope.ts): up (or down) over along.
    const q = slopeQuestion(L, r.next);
    const [dx, dy] = [q.q[0] - q.p[0], q.q[1] - q.p[1]];
    const m = dy / dx;
    const pic = slopeQuestionSvg(q);
    const flip = runOverRise(q);
    return {
      prompt: w.prompts.slope,
      q: "",
      pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(m, 1e-9, { lowest: true }), traps: Math.abs(m) !== 1 ? [{ id: "runOverRise", a: num(flip), vars: { dx, dy: signed(dy), v: gradText(dy, dx), u: gradText(dx, dy) } }] : [] },
      show: `m = ${gradTex(dy, dx)}`,
      plain: gradText(dy, dx).replace("−", "-"),
      format: Number.isInteger(m) ? "number" : "fraction",
      solution: { kind: "slope", spec: { q, steps: slopeSteps(q) } },
    };
  },

  oneStroke(r, L, w) {
    // Euler trails (src/math/oneStroke.ts): how many vertices have an odd degree, or which of four graphs can be drawn
    // in one stroke.
    const q = strokeQuestion(L, r.next);
    const pic = strokeQuestionSvg(q);
    const picture = { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w };
    const solution = { kind: "stroke" as const, spec: { q, steps: strokeSteps(q) } };
    if (q.level === 3) {
      const options = LETTERS.slice(0, 4).map((l) => ({ text: l, plain: l, tex: `\\text{${l}}` }));
      const traps: Trap[] = [0, 1, 2, 3].filter((i) => i !== q.right).map((at) => ({ id: "fourOdd", a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } }));
      return { prompt: w.prompts.oneStroke, q: "", pic: picture, answer: { k: "pick", options, right: q.right, traps }, show: `\\text{${LETTERS[q.right]}}`, plain: LETTERS[q.right], format: "pick", solution };
    }
    const even = evenCount(q as { g: import("./graphPlay").Graph; odd: number });
    const odd = (q as { odd: number }).odd;
    return {
      prompt: w.prompts.oddVertices,
      q: "",
      pic: picture,
      answer: { ...num(odd), traps: even !== odd ? [{ id: "countedEven", a: num(even), vars: { v: odd } }] : [] },
      show: String(odd),
      plain: String(odd),
      format: "number",
      solution,
    };
  },

  colouring(r, L, w) {
    // The fewest colours for the vertices so no edge joins two alike (src/math/colouring.ts).
    const t = colourQuestion(L, r.next);
    const pic = colourSvg(t.g, [], [], { scale: 0.8 });
    return {
      prompt: w.prompts.colouring,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(t.k), traps: colourTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: { v: t.k } })) },
      show: String(t.k),
      plain: String(t.k),
      format: "number",
      solution: { kind: "colour", spec: { task: t, steps: [] } },
    };
  },

  shortestPath(r, L, w) {
    // The length of the shortest route between two places on a map of roads (src/math/shortestPath.ts).
    const t = pathTask(L, r.next);
    const pic = pathSvg(t, [t.a], { scale: 0.8 });
    return {
      prompt: fill(w.prompts.shortestPath, { a: vertexName(t.a), b: vertexName(t.b) }),
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(t.best), traps: pathTraps(t).map((x) => ({ id: x.id, a: num(x.v), vars: x.vars })) },
      show: String(t.best),
      plain: String(t.best),
      format: "number",
      solution: { kind: "route", spec: { task: t, steps: pathSteps(t) } },
    };
  },

  spanningTree(r, L, w) {
    // The least total cost of roads joining every town: a minimum spanning tree (src/math/connectTowns.ts).
    const t = townTask(L, r.next);
    const pic = townSvg(t.g, [], { scale: 0.8 });
    const naive = cheapestRoads(t.g);
    return {
      prompt: w.prompts.spanningTree,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(t.best.total), traps: naive !== t.best.total ? [{ id: "cheapestRoads", a: num(naive), vars: { k: t.g.pts.length - 1, v: t.best.total } }] : [] },
      show: String(t.best.total),
      plain: String(t.best.total),
      format: "number",
      solution: { kind: "network", spec: { task: t, steps: townSteps(t) } },
    };
  },

  parity(r, L, w) {
    // Parity (src/math/tactics.ts): ±1 ±2 … ±n makes t exactly when t is at most 1 + … + n = S in size and differs
    // from S by an even number, since turning +k into −k lowers the total by 2k. Four totals are offered, one of them
    // makeable; one of the wrong parity, and (above easy) one of the right parity but out of reach, are the slips.
    const n = L === 1 ? r.int(3, 5) : L === 2 ? r.int(6, 9) : r.int(10, 14);
    const S = (n * (n + 1)) / 2;
    const lo = L === 3 ? -S : 0;
    let t: number;
    do t = r.int(lo, S);
    while ((S - t) % 2);
    const taken = new Set([t]);
    const fresh = (make: () => number) => {
      let x: number;
      do x = make();
      while (taken.has(x));
      taken.add(x);
      return x;
    };
    const odd = Array.from({ length: L === 1 ? 3 : 2 }, () => fresh(() => {
      let x: number;
      do x = r.int(lo, S);
      while ((S - x) % 2 === 0);
      return x;
    }));
    const far = L === 1 ? [] : [fresh(() => (L === 3 && r.next() < 0.5 ? -1 : 1) * (S + 2 * r.int(1, 3)))];
    const values = [t, ...odd, ...far].sort((a, b) => a - b);
    const options = values.map((v) => ({ v, text: String(v).replace("-", "−"), plain: String(v), tex: String(v) }));
    const at = (v: number) => values.indexOf(v);
    const traps: Trap[] = [
      ...odd.map((x): Trap => ({ id: "parityIgnored", a: { k: "near", options, right: at(x) }, vars: { t: String(x).replace("-", "−"), s: S, n } })),
      ...far.map((x): Trap => ({ id: "beyondReach", a: { k: "near", options, right: at(x) }, vars: { t: String(x).replace("-", "−"), s: S } })),
    ];
    // The signs: the numbers whose sign is turned to − add up to (S − t) / 2, picked greedily from the top.
    const minus = new Set<number>();
    let rest = (S - t) / 2;
    for (let k = n; k >= 1; k--)
      if (k <= rest) {
        minus.add(k);
        rest -= k;
      }
    const signed = Array.from({ length: n }, (_, i) => (minus.has(i + 1) ? `- ${i + 1}` : i ? `+ ${i + 1}` : "1")).join(" ").replace(/^- 1/, "-1");
    return {
      prompt: fill(w.prompts.parity, { n }),
      q: options.map((o) => o.tex).join(", \\quad "),
      answer: { k: "near", options, right: at(t), traps },
      show: `${signed} = ${t}`,
      plain: String(t),
      format: "near",
      steps: [`1 + 2 + \\dots + ${n} = ${S}`, `${S} - ${t < 0 ? `(${t})` : t} = ${S - t} = 2 \\cdot ${(S - t) / 2}`, `${signed} = ${t}`],
    };
  },

  inversions(r, L, w) {
    // A monovariant (src/math/tactics.ts): swapping two neighbours that are out of order puts that pair right and
    // leaves every other pair as it was, so sorting that way takes exactly as many swaps as there are pairs out of
    // order. Counting only the neighbours out of order at the start, or the numbers out of place, are the slips.
    const len = L === 1 ? 4 : L === 2 ? 5 : 7;
    const [least, most] = L === 1 ? [2, 5] : L === 2 ? [4, 8] : [8, 16];
    let a: number[];
    let k: number;
    do {
      const pool = Array.from({ length: len + 5 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = r.int(0, i);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      a = pool.slice(0, len);
      k = countInversions(a);
    } while (k < least || k > most);
    const sorted = [...a].sort((x, y) => x - y);
    const neighbours = a.filter((x, i) => i + 1 < a.length && x > a[i + 1]).length;
    const outOfPlace = a.filter((x, i) => x !== sorted[i]).length;
    const traps: Trap[] = [];
    if (neighbours !== k) traps.push({ id: "neighboursOnly", a: num(neighbours), vars: { d: neighbours } });
    if (outOfPlace !== k && outOfPlace !== neighbours) traps.push({ id: "outOfPlace", a: num(outOfPlace), vars: { m: outOfPlace } });
    // The working: for each number, how many smaller ones come after it.
    const after = a.map((x, i) => a.slice(i + 1).filter((y) => y < x).length);
    return {
      prompt: w.prompts.inversions,
      q: a.join(",\\ "),
      answer: { ...num(k), traps },
      show: String(k),
      plain: String(k),
      format: "number",
      steps: [a.map((x, i) => `${x}\\!:\\ ${after[i]}`).join(",\\quad "), `${after.join(" + ")} = ${k}`],
    };
  },

  readChart(r, L, w) {
    // A bar chart to read against its scale (src/math/barChart.ts): how many, how many more, or how many altogether.
    const q = chartQuestion(L, r.next);
    const [a, b] = q.at.map((k) => q.task.items[k].icon);
    const pic = chartSvg(q.task, { gap: 22 });
    const prompt = q.ask === "one" ? w.prompts.chartOne : q.ask === "more" ? w.prompts.chartMore : w.prompts.chartTotal;
    return {
      prompt: fill(prompt, { a, b }),
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(q.v), traps: chartTraps(q).map((t) => ({ id: t.id, a: num(t.v), vars: t.vars })) },
      show: String(q.v),
      plain: String(q.v),
      format: "number",
      solution: { kind: "chart", spec: { q, steps: chartSteps(q) } },
    };
  },

  graphStory(r, L, w) {
    // Which of four graphs is a walk's, the distance from home against the time (src/math/graphStory.ts); a letter,
    // typed or picked.
    const q = storyQuestion(L, r.next);
    const options = storyOptions();
    const pic = storyChoicesSvg(q);
    return {
      prompt: fill(w.prompts.graphStory, { story: storyWords(q.task.parts).map((p) => w.story.parts[p]).join(w.story.then) }),
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { k: "pick", options, right: q.right, traps: q.traps.map(({ id, at }) => ({ id, a: { k: "pick", options, right: at }, vars: { x: LETTERS[at] } })) },
      show: `\\text{${LETTERS[q.right]}}`,
      plain: LETTERS[q.right],
      format: "pick",
      solution: { kind: "story", spec: { task: q.task, steps: [] } },
    };
  },

  shadeFraction(r, L, w) {
    // A fraction of a shape cut into equal pieces, shaded by tapping (src/math/shadeFrac.ts); any pieces will do.
    const t = shadeTask(L, r.next);
    const m = t.play.pieces / t.d;
    // The top number of pieces shaded (3 for ¾ of 12), when the shape has more pieces than the bottom.
    const traps: Trap[] = m > 1 ? [{ id: "topAsPieces", a: { k: "shade", play: t.play, count: t.n }, vars: { n: t.n, d: t.d, p: t.play.pieces, g: m, k: t.count } }] : [];
    const f = `\\frac{${t.n}}{${t.d}}`;
    const pic = shadeSvg(t.play, [], 220);
    const steps = [`${t.play.pieces} \\div ${t.d} = ${m}, \\quad ${t.n} \\times ${m} = ${t.count}`];
    return {
      prompt: fill(t.play.shape === "set" ? w.prompts.shadeSet : w.prompts.shadeShape, { f: `${t.n}/${t.d}` }),
      q: f,
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h + 4, w: pic.w },
      play: { kind: "shade", ...t.play },
      answer: { k: "shade", play: t.play, count: t.count, traps },
      show: m > 1 ? `${f} = \\frac{${t.count}}{${t.play.pieces}}` : f,
      plain: encodeShade(Array.from({ length: t.count }, (_, i) => i)),
      format: "shade",
      solution: { kind: "shade", spec: { play: t.play, count: t.count, steps } },
    };
  },

  orderFractions(r, L, w) {
    // Four or five fractions, smallest first (src/math/fracOrder.ts); the answer is the list, typed or tapped.
    const t = orderTask(L, r.next);
    const seq = rightOrder(t.items);
    // Unit fractions put in the order of their bottoms (½, ⅓, ⅕ — a bigger bottom taken as bigger).
    const byBottoms = bottomsOrder(t.items);
    const ds = t.items.map((i) => i.d);
    const traps: Trap[] = byBottoms ? [{ id: "biggerBottom", a: { k: "order", items: t.items, seq: byBottoms }, vars: { n: 1, d: Math.max(...ds), e: Math.min(...ds) } }] : [];
    const dec = (v: number) => Number(v.toFixed(3));
    return {
      prompt: fill(w.prompts.orderFractions, { list: t.items.map((i) => i.text).join(", ") }),
      q: t.items.map((i) => i.tex).join(", \\quad "),
      answer: { k: "order", items: t.items, seq, traps },
      show: seq.map((i) => t.items[i].tex).join(" < "),
      plain: seq.map((i) => t.items[i].text).join(", "),
      format: "order",
      solution: { kind: "orderline", spec: { task: t, steps: [seq.map((i) => `${t.items[i].tex} ${Number.isInteger(t.items[i].v * 1000) ? "=" : "\\approx"} ${dec(t.items[i].v)}`).join(", \\quad ")] } },
    };
  },

  equivalent(r, L, w) {
    // The one of four equal to a fraction (src/math/equivMatch.ts); the wrong ones are slips that get named.
    const t = eqQuestion(L, r.next);
    const best = t.options[t.right];
    const f = `\\frac{${t.n}}{${t.d}}`;
    const steps =
      L === 1 ? [`${t.n} + ${t.d - t.n} = ${t.d}, \\quad ${f}`]
      : L === 2 ? [`${f} = \\frac{${t.n} \\times ${t.k}}{${t.d} \\times ${t.k}} = ${best.tex}`]
      : [`${t.n} \\div ${t.d} = ${Number((t.n / t.d).toFixed(3))}`, `${Number((t.n / t.d).toFixed(3))} = ${Number(((t.n / t.d) * 100).toFixed(1))}\\%`];
    const pic = L === 1 ? partsSvg(t.n, t.d) : null;
    return {
      prompt: L === 1 ? w.prompts.equivShaded : fill(L === 2 ? w.prompts.equivFraction : w.prompts.equivDecimal, { f: `${t.n}/${t.d}` }),
      q: L === 1 ? "" : f,
      ...(pic ? { pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic}</g>`, h: 50, w: 240 } } : {}),
      answer: { k: "near", options: t.options, right: t.right, traps: t.traps.map((x) => ({ id: x.id, a: { k: "near", options: t.options, right: x.at }, vars: x.vars })) },
      show: L === 1 ? f : `${f} = ${best.tex}`,
      plain: best.plain,
      format: "near",
      steps,
    };
  },

  makeWhole(r, L, w) {
    // Unit-fraction tiles in a bar and the fraction missing to make the target (src/math/fractionWall.ts).
    const t = wallTask(L, r.next);
    const unit = (d: number) => `\\frac{1}{${d}}`;
    const den = lcm([...t.fixed, t.target.d]);
    const have = sumOf(t.fixed);
    const lines = [
      ...(t.fixed.length > 1 ? [`${t.fixed.map(unit).join(" + ")} = ${t.fixed.map((d) => `\\frac{${den / d}}{${den}}`).join(" + ")} = ${have.tex()}`] : []),
      `${t.target.tex()} - ${have.tex()} = ${t.gap.tex()}`,
    ];
    // Tops added and bottoms added (½ + ⅓ as 2/5): the gap that gives.
    const across = acrossGap(t);
    const traps: Trap[] = across ? [{ id: "addAcross", a: num(across.gap.toNumber()), vars: { r: `${across.across.n}/${across.across.d}`, big: `1/${across.big}` } }] : [];
    const pic = wallSvg(t, null);
    return {
      prompt: fill(w.prompts.makeWhole, { t: t.target.isInt() ? String(t.target.n) : `${t.target.n}/${t.target.d}` }),
      q: `${t.fixed.map(unit).join(" + ")} + \\square = ${t.target.tex()}`,
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${pic.body}</g>`, h: pic.h, w: pic.w },
      answer: { ...num(t.gap.toNumber(), 1e-9, { lowest: true }), traps },
      show: t.gap.tex(),
      plain: `${t.gap.n}/${t.gap.d}`,
      format: "fraction",
      solution: { kind: "wall", spec: { task: t, steps: lines } },
    };
  },

  closerTo(r, L, w) {
    // Which benchmark a number is nearest (src/math/benchmark.ts); the answer is the benchmark, typed or picked.
    const t = nearTask(L, r.next);
    const best = t.options[t.right];
    // Easy, between two tens: the lower ten when the next digit is 5 or more is a cut, not a rounding.
    const traps: Trap[] = L === 1 && t.options.length === 2 && t.right === 1 ? [{ id: "truncated", a: { k: "near", options: t.options, right: 0 } }] : [];
    return {
      prompt: fill(L === 3 ? w.prompts.closerToCalc : w.prompts.closerTo, { opts: t.options.map((o) => o.text).join(", ") }),
      q: t.tex,
      answer: { k: "near", options: t.options, right: t.right, traps },
      show: `${t.tex} \\approx ${best.tex}`,
      plain: best.plain,
      format: "near",
      steps: nearSteps(t),
    };
  },

  kakooma(r, L, w) {
    // Kakooma (src/math/kakooma.ts): which of a few numbers is the sum of two others (the product, on hard)? The answer
    // is that number, typed or picked; one of the two parts, a number used twice and a sum for a product are named.
    const s = kakSet(L, r.next);
    const options = s.nums.map((n) => ({ v: n, text: String(n), plain: String(n), tex: String(n) }));
    const sign = s.op === "+" ? "+" : "×";
    const traps: Trap[] = kakTraps(s).map((x) => ({ id: x.id, a: { k: "near", options, right: s.nums.indexOf(x.n) }, vars: { ...x.vars, s: sign } }));
    return {
      prompt: s.op === "+" ? w.prompts.kakoomaSum : w.prompts.kakoomaProduct,
      q: s.nums.join(", \\quad "),
      answer: { k: "near", options, right: s.nums.indexOf(s.answer), traps },
      show: kakSum(s).replace("×", "\\times"),
      plain: String(s.answer),
      format: "near",
      steps: [`${s.parts[0]} ${s.op === "+" ? "+" : "\\times"} ${s.parts[1]} = ${s.answer}`],
    };
  },

  makeTarget(r, L, w) {
    // Cards and a target, and a sum of the cards that makes it (src/math/target.ts); the answer is the sum, typed.
    const p = targetPuzzle(L, r.next);
    const vars = { t: p.target, cards: p.cards.join(", "), ops: p.ops.map((o) => OP_SIGN[o]).join(" ") };
    const solved = `${sumTex(parseSum(p.sample)!)} = ${p.target}`;
    return {
      prompt: fill(p.all ? w.prompts.makeTargetAll : w.prompts.makeTarget, vars),
      q: `${p.cards.join(", \\quad ")} \\quad \\Rightarrow \\quad ${p.target}`,
      answer: { k: "target", puzzle: { cards: p.cards, target: p.target, ops: p.ops, all: p.all }, sample: p.sample },
      show: solved,
      plain: p.sample,
      format: "target",
      steps: [solved],
    };
  },

  quickLook(r, L, w) {
    // Dots shown for a moment, then hidden (src/math/quickLook.ts); the answer is how many, typed.
    const t = lookTask(L, r.next);
    const body = dotsSvg(t);
    const h = dotsHeight(t);
    const steps = lookSteps(t);
    return {
      prompt: w.prompts.quickLook,
      q: "",
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>`, h, w: LOOK_W },
      play: { kind: "flash", ms: FLASH_MS[L], body, h },
      answer: num(t.n),
      show: steps,
      plain: String(t.n),
      format: "number",
      solution: { kind: "dots", spec: { task: t, steps: [steps] } },
    };
  },

  estimateLine(r, L, w) {
    // Where a number goes on a line with only its ends labelled; the answer is the pin's place (src/math/estimate.ts).
    const t = estimateTask(L, r.next);
    const { from, to } = t.play;
    const share = shareAlong(t.play, t.v);
    const s3 = Number(share.toFixed(3));
    const eq = s3 === share ? "=" : "\\approx";
    const lines: string[] = [];
    if (from < 0) lines.push(`\\frac{${t.tex} - (${from})}{${to} - (${from})} = \\frac{${t.v - from}}{${to - from}} ${eq} ${s3}`);
    else if (to !== 1) lines.push(`\\frac{${t.tex}}{${to}} ${eq} ${s3}`);
    else if (t.tex.startsWith("\\frac")) lines.push(`${t.tex} ${eq} ${s3}`);
    lines.push(`${s3} ${share < 0.5 ? "<" : share > 0.5 ? ">" : "="} \\frac{1}{2}`);
    const line = lineSvg(t.play);
    return {
      prompt: fill(w.prompts.estimatePlace, { a: numText(from), b: numText(to) }),
      q: t.tex,
      pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${line.body}</g>`, h: line.h, w: line.w },
      play: { kind: "pin", ...t.play },
      answer: { k: "pin", play: t.play, v: t.v },
      show: lines[0],
      plain: encodePin(t.play, t.v),
      format: "pin",
      solution: { kind: "pin", spec: { play: t.play, v: t.v, text: t.text, steps: lines } },
    };
  },

  righttri(r, L, w) {
    const ang = r.int(20, 70);
    const t = (ang * Math.PI) / 180;
    const S = (v: number) => String(Math.round(v * 10) / 10);
    let given: string;
    let known: { opp?: string; adj?: string; hyp?: string; ang?: string };
    let ask: "opp" | "adj" | "hyp" | "ang";
    let v: number;
    const hyp = r.int(6, 20);
    if (L === 1) {
      known = { hyp: String(hyp), ang: String(ang) };
      ask = r.pick(["opp", "adj"] as const);
      v = ask === "opp" ? hyp * Math.sin(t) : hyp * Math.cos(t);
      given = "angHyp";
    } else if (L === 2) {
      const side = r.int(4, 15);
      if (r.next() < 0.5) {
        known = { adj: String(side), ang: String(ang) };
        ask = r.pick(["opp", "hyp"] as const);
        v = ask === "opp" ? side * Math.tan(t) : side / Math.cos(t);
        given = "angAdj";
      } else {
        known = { opp: String(side), ang: String(ang) };
        ask = r.pick(["adj", "hyp"] as const);
        v = ask === "adj" ? side / Math.tan(t) : side / Math.sin(t);
        given = "angOpp";
      }
    } else {
      const [a, b] = [r.int(3, 15), r.int(3, 15)];
      const kind = r.int(0, 2);
      ask = "ang";
      if (kind === 0) {
        known = { opp: String(a), adj: String(b) };
        v = (Math.atan(a / b) * 180) / Math.PI;
        given = "oppAdj";
      } else {
        const h = Math.max(a, b) + r.int(1, 6);
        const s = Math.min(a, b);
        if (kind === 1) {
          known = { opp: String(s), hyp: String(h) };
          v = (Math.asin(s / h) * 180) / Math.PI;
          given = "oppHyp";
        } else {
          known = { adj: String(s), hyp: String(h) };
          v = (Math.acos(s / h) * 180) / Math.PI;
          given = "adjHyp";
        }
      }
    }
    // The values the trig tool needs; unknown sides get a placeholder it ignores for this case.
    const spec = { topic: "right", given, opp: known.opp ?? "3", adj: known.adj ?? "4", hyp: known.hyp ?? S(hyp), ang: known.ang ?? "30" };
    const pic = (x0: number, y0: number) => {
      // θ at bottom left, right angle at bottom right; roughly to scale, except that a steeper angle is drawn
      // as STEEPEST so that its label still fits inside.
      const th = (Math.min(ask === "ang" ? v : ang, STEEPEST) * Math.PI) / 180;
      const [bw, bh] = Math.tan(th) * 210 <= 120 ? [210, 210 * Math.tan(th)] : [120 / Math.tan(th), 120];
      const [bx, by] = [x0 + 20, y0 + 135];
      const [cx, ay] = [r2(bx + bw), r2(by - bh)];
      const lab = (x: number, y: number, s: string, color: string, anchor = "middle") =>
        `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="15" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
      const side = (k: "opp" | "adj" | "hyp") => (ask === k ? "x" : known[k] ?? "");
      const angLabel = ask === "ang" ? "θ" : `${known.ang}°`;
      const [lx, ly] = angleLabelAt(bx, by, bw, th, angLabel.length * 9);
      // The arc stops short of the label and of the right-angle mark.
      const rad = r2(Math.max(10, Math.min(Math.hypot(lx - angLabel.length * 4.5 - bx, ly + 6 - by) - 6, bw - 20)));
      const parts = [
        `<polygon points="${bx},${by} ${cx},${by} ${cx},${ay}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`,
        `<path d="M${cx - 14},${by} L${cx - 14},${by - 14} L${cx},${by - 14}" fill="none" stroke="${C.blue}" stroke-width="1.6"/>`,
        `<path d="M${bx + rad},${by} A${rad},${rad} 0 0 0 ${r2(bx + rad * Math.cos(th))},${r2(by - rad * Math.sin(th))}" fill="none" stroke="${C.orange}" stroke-width="2"/>`,
        lab(lx, ly + 5.5, angLabel, C.orange),
      ];
      const hs = side("hyp");
      const os = side("opp");
      const as = side("adj");
      if (as) parts.push(lab((bx + cx) / 2, by + 20, as, as === "x" ? C.red : C.ink));
      if (os) parts.push(lab(cx + 10, (by + ay) / 2 + 5, os, os === "x" ? C.red : C.ink, "start"));
      if (hs) parts.push(lab((bx + cx) / 2 - 12, (by + ay) / 2 - 6, hs, hs === "x" ? C.red : C.ink, "end"));
      return parts.join("");
    };
    return {
      prompt: ask === "ang" ? w.prompts.rightAngle : w.prompts.rightSide,
      q: "",
      pic: { svg: pic, h: 160, w: 300 },
      answer: num(v, 0.0051),
      show: `${ask === "ang" ? "\\theta" : "x"} \\approx ${dp(v, 2)}${ask === "ang" ? "^\\circ" : ""}`,
      plain: dp(v, 2),
      format: "dp2",
      solution: { kind: "trig", spec },
    };
  },

  circles(r, L, w) {
    // An angle (or a length) from a circle theorem, with the figure.
    const make = (src: string, given: string, ask: string, v: number, angle = true) => {
      const full = `${src}; find ${ask}`;
      const fig = circleFigure(full);
      return {
        prompt: fill(w.prompts.circleFind, { a: angle ? `∠${ask}` : ask }),
        q: given,
        pic: fig ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${fig.svg}</g>`, h: fig.h, w: fig.w } : undefined,
        answer: num(v, 1e-6),
        show: angle ? `${v}^\\circ` : String(v),
        plain: String(v),
        format: "number" as const,
        solution: { kind: "euclid" as const, spec: { topic: "circle", src: full } },
      };
    };
    const deg = (n: string, v: number) => `\\angle ${n} = ${v}^\\circ`;
    if (L === 1) {
      const kind = r.int(0, 2);
      const a = r.int(25, 70);
      if (kind === 0) return r.next() < 0.5 ? make(`centre; AOB = ${2 * a}`, deg("AOB", 2 * a), "ACB", a) : make(`centre; ACB = ${a}`, deg("ACB", a), "AOB", 2 * a);
      if (kind === 1) return make(`semicircle; CAB = ${a}`, deg("CAB", a), "CBA", 90 - a);
      return make(`segment; ACB = ${a}`, deg("ACB", a), "ADB", a);
    }
    if (L === 2) {
      if (r.next() < 0.5) {
        const [A, B] = [r.int(55, 125), r.int(55, 125)];
        const src = `cyclic; A = ${A}; B = ${B}`;
        const q = `${deg("DAB", A)},\\quad ${deg("ABC", B)}`;
        return r.next() < 0.5 ? make(src, q, "BCD", 180 - A) : make(src, q, "CDA", 180 - B);
      }
      const P = 2 * r.int(15, 50);
      return r.next() < 0.5 ? make(`tangents; APB = ${P}`, deg("APB", P), "AOB", 180 - P) : make(`tangents; APB = ${P}`, deg("APB", P), "PAB", (180 - P) / 2);
    }
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [a, b] = [r.int(40, 75), r.int(40, 75)];
      return make(`alternate; TAB = ${a}; SAC = ${b}`, `${deg("TAB", a)},\\quad ${deg("SAC", b)}`, "BAC", 180 - a - b);
    }
    if (kind === 1) {
      const P = 2 * r.int(15, 50);
      return make(`tangents; APB = ${P}`, deg("APB", P), "OAB", P / 2);
    }
    const [m, h, k] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [12, 16, 20]] as const);
    const [half, om] = r.next() < 0.5 ? [m, h] : [h, m];
    return make(`chord; AB = ${2 * half}; OA = ${k}`, `AB = ${2 * half},\\quad OA = ${k}`, "OM", om, false);
  },

  similarity(r, L, w) {
    const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "similar", src } });
    const out = (prompt: string, q: string, v: number, src: string) => ({
      prompt,
      q,
      answer: num(v, 1e-6),
      show: dp(v, 3),
      plain: dp(v, 3),
      format: "number" as const,
      solution: sol(src),
    });
    if (L === 1) {
      const a = 2 * r.int(1, 5);
      const k = r.pick([2, 3, 1.5, 0.5, 2.5]);
      const b = r.int(3, 9);
      const [de, ef] = [a * k, b * k];
      return out(fill(w.prompts.similarSide, { a: "ABC", b: "DEF", s: "EF" }), `AB = ${a},\\quad BC = ${b},\\quad DE = ${dp(de, 3)}`, ef, `ABC ~ DEF; AB = ${a}; BC = ${b}; DE = ${dp(de, 3)}; find EF`);
    }
    if (L === 2) {
      const [a, b, m] = [r.int(2, 6), r.int(2, 8), r.int(1, 3)];
      return out(w.prompts.similarA, `AD = ${a},\\quad DB = ${b},\\quad DE = ${a * m}`, m * (a + b), `ADE ~ ABC; AD = ${a}; DB = ${b}; DE = ${a * m}; find BC`);
    }
    const [a, b] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 2], [1, 3], [4, 5]] as const);
    const m = r.int(1, 4);
    const kind = r.int(0, 2);
    if (kind === 0) return out(fill(w.prompts.scaleArea, { a, b, A: a * a * m }), "", b * b * m, `lengths ${a} : ${b}; area ${a * a * m} : ?`);
    if (kind === 1) return out(fill(w.prompts.scaleVolume, { a, b, V: a ** 3 * m }), "", b ** 3 * m, `lengths ${a} : ${b}; volume ${a ** 3 * m} : ?`);
    return out(fill(w.prompts.scaleAreaVolume, { a: a * a, b: b * b, V: a ** 3 * m }), "", b ** 3 * m, `areas ${a * a} : ${b * b}; volume ${a ** 3 * m} : ?`);
  },

  volume(r, L, w) {
    const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "solids", src } });
    const pic = (src: string, ask?: string) => {
      const f = solidFigure(src, ask);
      return f ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${f.svg}</g>`, h: f.h, w: f.w } : undefined;
    };
    const out = (prompt: string, q: string, v: number, src: string, figSrc: string, ask?: string) => {
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      return {
        prompt,
        q,
        pic: pic(figSrc, ask),
        answer: num(v, whole ? 1e-9 : 0.0051),
        show: whole ? String(Math.round(v)) : dp(v, 2),
        plain: whole ? String(Math.round(v)) : dp(v, 2),
        format: whole ? ("number" as const) : ("dp2" as const),
        solution: sol(src),
      };
    };
    if (L === 1) {
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [l, wd, h] = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
        const src = `cuboid ${l} x ${wd} x ${h}`;
        return out(w.prompts.volume, "", l * wd * h, src, src);
      }
      if (kind === 1) {
        const [b, h, l] = [2 * r.int(2, 5), r.int(2, 8), r.int(4, 12)];
        const src = `prism b = ${b} h = ${h} l = ${l}`;
        return out(w.prompts.volume, "", (b * h * l) / 2, src, src);
      }
      const [rr, h] = [r.int(2, 8), r.int(3, 15)];
      const src = `cylinder r = ${rr} h = ${h}`;
      return out(w.prompts.volume, "", Math.PI * rr * rr * h, src, src);
    }
    if (L === 2) {
      const kind = r.int(0, 3);
      if (kind === 0) {
        const [rr, h] = [r.int(2, 8), r.int(3, 15)];
        const src = `cylinder r = ${rr} h = ${h}`;
        return out(w.prompts.surface, "", 2 * Math.PI * rr * rr + 2 * Math.PI * rr * h, src, src);
      }
      if (kind === 1) {
        const [rr, h, l] = r.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const);
        const src = `cone r = ${rr} h = ${h}`;
        return r.next() < 0.5 ? out(w.prompts.volume, "", (Math.PI * rr * rr * h) / 3, src, src) : out(w.prompts.surface, "", Math.PI * rr * rr + Math.PI * rr * l, src, src);
      }
      if (kind === 2) {
        const rr = r.int(2, 10);
        const src = `sphere r = ${rr}`;
        return r.next() < 0.5 ? out(w.prompts.volume, "", (4 / 3) * Math.PI * rr ** 3, src, src) : out(w.prompts.surface, "", 4 * Math.PI * rr * rr, src, src);
      }
      const [a, h] = [2 * r.int(2, 6), r.int(3, 12)];
      const src = `pyramid a = ${a} h = ${h}`;
      return out(w.prompts.volume, "", (a * a * h) / 3, src, src);
    }
    // A length from the volume.
    const kind = r.int(0, 2);
    if (kind === 0) {
      const rr = r.int(2, 8);
      const V = r.int(100, 900);
      const h = V / (Math.PI * rr * rr);
      return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cylinder r = ${rr} V = ${V}`, `cylinder r = ${rr} h = ${h}`, "h");
    }
    if (kind === 1) {
      const V = r.int(100, 2000);
      const rr = Math.cbrt((3 * V) / (4 * Math.PI));
      return out(fill(w.prompts.solidDim, { V, d: "r" }), `V = ${V}`, rr, `sphere V = ${V}`, `sphere r = ${rr}`, "r");
    }
    const rr = r.int(2, 8);
    const V = r.int(50, 600);
    const h = (3 * V) / (Math.PI * rr * rr);
    return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cone r = ${rr} V = ${V}`, `cone r = ${rr} h = ${h}`, "h");
  },

  identities(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "identities" as const, spec: { topic, src } });
    if (L === 1) {
      // sin, cos, tan of 15°, 75°, 105°, 165°: from the compound angle formulas.
      const f = r.pick(["sin", "cos", "tan"] as const);
      const deg = r.pick([15, 75, 105, 165]);
      const t = (deg * Math.PI) / 180;
      const v = f === "sin" ? Math.sin(t) : f === "cos" ? Math.cos(t) : Math.tan(t);
      const [s6, s2, s3] = [Math.sqrt(6), Math.sqrt(2), Math.sqrt(3)];
      const forms: [number, string, string, string, string][] = [
        [(s6 + s2) / 4, "\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "(sqrt(6) + sqrt(2))/4", "-\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "-(sqrt(6) + sqrt(2))/4"],
        [(s6 - s2) / 4, "\\frac{\\sqrt{6} - \\sqrt{2}}{4}", "(sqrt(6) - sqrt(2))/4", "\\frac{\\sqrt{2} - \\sqrt{6}}{4}", "(sqrt(2) - sqrt(6))/4"],
        [2 + s3, "2 + \\sqrt{3}", "2 + sqrt(3)", "-2 - \\sqrt{3}", "-2 - sqrt(3)"],
        [2 - s3, "2 - \\sqrt{3}", "2 - sqrt(3)", "\\sqrt{3} - 2", "sqrt(3) - 2"],
      ];
      const m = forms.find((x) => Math.abs(Math.abs(v) - x[0]) < 1e-9)!;
      const [show, plain] = v > 0 ? [m[1], m[2]] : [m[3], m[4]];
      return { prompt: w.prompts.trigexact, q: `\\${f} ${deg}^\\circ`, answer: num(v), show, plain, format: "exact", solution: sol("compound", `${f} ${deg}°`) };
    }
    if (L === 2) {
      // A Pythagorean triple gives sin A, cos A and tan A; the double angle formulas give the rest.
      let [a, b, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]] as const) as unknown as [number, number, number];
      if (r.next() < 0.5) [a, b] = [b, a];
      const f = r.pick(["sin", "cos", "tan"] as const);
      const g = r.pick(["sin", "cos", "tan"] as const);
      const given = f === "sin" ? fr(a, h) : f === "cos" ? fr(b, h) : fr(a, b);
      const v = g === "sin" ? fr(2 * a * b, h * h) : g === "cos" ? fr(b * b - a * a, h * h) : fr(2 * a * b, b * b - a * a);
      return {
        prompt: fill(w.prompts.idDouble, { f, v: plainFrac(given) }),
        q: `\\${g} 2A`,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("compound", `${f} A = ${plainFrac(given)}, A acute; ${g} 2A`),
      };
    }
    // The greatest value of a sin x + b cos x is R = √(a² + b²).
    const [a, b] = [r.nz(-6, 6), r.nz(-6, 6)];
    const { out, s } = sqrtSplit(fr(a * a + b * b));
    const R = Math.sqrt(a * a + b * b);
    const src = `${a} sin x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos x`;
    return {
      prompt: w.prompts.idMax,
      q: `${a === 1 ? "" : a === -1 ? "-" : a}\\sin x ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}\\cos x`,
      answer: num(R, 1e-9, { surd: true }),
      show: s === 1 ? String(out.n) : surdTex(fr(0), out, s),
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: "exact",
      solution: sol("rform", src),
    };
  },

  vectors(r, L, w) {
    const vec = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
    const vs = (v: (number | string)[]) => `(${v.join(", ")})`;
    const col = (v: number[]) => `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
    const sol = (topic: string, src: string) => ({ kind: "vectors" as const, spec: { topic, src } });
    if (L === 1) {
      const [a, b] = [vec(2, -6, 6), vec(2, -6, 6)];
      const [p, q] = [r.pick([1, 2, 3, -2] as const), r.pick([1, 2, 3, -1, -2, -3] as const)];
      const res = a.map((x, i) => p * x + q * b[i]);
      const k = (c: number, first: boolean) => (Math.abs(c) === 1 ? (c < 0 && first ? "-" : "") : String(first ? c : Math.abs(c)));
      const e = `${k(p, true)}a ${q < 0 ? "-" : "+"} ${k(q, false)}b`;
      return {
        prompt: fill(w.prompts.vecCombo, { a: vs(a), b: vs(b) }),
        q: e.replace(/([ab])/g, "\\mathbf{$1}"),
        answer: { k: "tuple", vs: res, tol: 1e-9 },
        show: col(res),
        plain: `(${res.join("; ")})`,
        format: "vector",
        solution: sol("basics", `a = ${vs(a)}; b = ${vs(b)}; ${e}`),
      };
    }
    if (L === 2) {
      const A = vec(3, -5, 5);
      let d: number[];
      do d = vec(3, -6, 6);
      while (d.filter(Boolean).length < 2);
      const B = A.map((x, i) => x + d[i]);
      const d2 = d.reduce((s, x) => s + x * x, 0);
      const { out, s } = sqrtSplit(fr(d2));
      const v = Math.sqrt(d2);
      return {
        prompt: fill(w.prompts.vecLength, { a: `A${vs(A)}`, b: `B${vs(B)}` }),
        q: "",
        answer: num(v, 1e-9, { surd: true }),
        show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
        plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
        format: "exact",
        solution: sol("basics", `A${vs(A)}; B${vs(B)}`),
      };
    }
    // a = (k, p, q), b = (m, k, n) are perpendicular when k·m + p·k + q·n = 0.
    let p: number, q: number, m: number, n: number;
    do [p, q, m, n] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
    while (m + p === 0);
    const kv = fr(-q * n, m + p);
    const at = (v: (number | string)[]) => v.map((x) => (x === "k" ? `${kv.n}/${kv.d}` : x));
    return {
      prompt: fill(w.prompts.vecPerp, { a: vs(["k", p, q]), b: vs([m, "k", n]) }),
      q: "",
      answer: num(kv.toNumber(), 1e-9, { lowest: true }),
      show: kv.tex(),
      plain: plainFrac(kv),
      format: "fraction",
      solution: sol("dot", `a = ${vs(at(["k", p, q]))}; b = ${vs(at([m, "k", n]))}`),
    };
  },
  dotangle(r, L, w) {
    const vs = (v: number[]) => `(${v.join(", ")})`;
    const sol = (a: number[], b: number[]) => ({ kind: "vectors" as const, spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } });
    const nonzero = (n: number) => {
      for (;;) {
        const v = Array.from({ length: n }, () => r.int(-5, 5));
        if (v.filter(Boolean).length >= 2) return v;
      }
    };
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    if (L === 1) {
      const [a, b] = [nonzero(3), nonzero(3)];
      const v = dot(a, b);
      return { prompt: fill(w.prompts.vecDot, { a: vs(a), b: vs(b) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol(a, b) };
    }
    if (L === 2) {
      const n = r.pick([2, 3] as const);
      let a: number[], b: number[], c: number;
      do [a, b] = [nonzero(n), nonzero(n)], (c = dot(a, b) / Math.hypot(...a) / Math.hypot(...b));
      while (Math.abs(c) > 0.98 || Math.abs(c) < 1e-9);
      const v = (Math.acos(c) * 180) / Math.PI;
      return { prompt: fill(w.prompts.vecAngle, { a: vs(a), b: vs(b) }), q: "", answer: num(v, 0.0051), show: `${dp(v, 2)}^\\circ`, plain: dp(v, 2), format: "dp2", solution: sol(a, b) };
    }
    // Pairs with a whole-number angle, scaled and turned so they look different every time.
    const [a0, b0, deg] = r.pick([
      [[1, 1, 0], [0, 1, 1], 60],
      [[1, 0, 1], [0, 1, 1], 60],
      [[1, 0, 0], [1, 1, 0], 45],
      [[1, 1, 0], [-1, 0, 1], 120],
      [[1, 0, 0], [-1, 1, 0], 135],
      [[2, 1, 1], [1, 1, 0], 30],
      [[2, 1, 1], [-1, -1, 0], 150],
      [[1, 2, 2], [2, -2, 1], 90],
      [[1, 1, 1], [1, 1, -2], 90],
    ] as const);
    const perm = r.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const);
    const signs = [r.sign(), r.sign(), r.sign()];
    const turn = (v: readonly number[], k: number) => perm.map((j, i) => signs[i] * k * v[j] || 0);
    const [a, b] = [turn(a0, r.int(1, 3)), turn(b0, r.int(1, 2))];
    return { prompt: fill(w.prompts.vecAngleExact, { a: vs(a), b: vs(b) }), q: "", answer: num(deg), show: `${deg}^\\circ`, plain: String(deg), format: "number", solution: sol(a, b) };
  },
  projection(r, L, w) {
    const vs = (v: number[]) => `(${v.join(", ")})`;
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    const nonzero = (n: number, lo: number, hi: number) => {
      for (;;) {
        const v = Array.from({ length: n }, () => r.int(lo, hi));
        if (v.filter(Boolean).length >= 2) return v;
      }
    };
    if (L === 1) {
      // b of whole length, so a·b / |b| is a fraction; turned and signed so it looks different every time.
      const [b0, len] = r.pick([[[3, 4, 0], 5], [[1, 2, 2], 3], [[2, 3, 6], 7], [[2, 6, 9], 11], [[4, 4, 7], 9], [[1, 4, 8], 9], [[2, 1, 2], 3], [[6, 8, 0], 10]] as const);
      const perm = r.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const);
      const b = perm.map((j) => r.sign() * b0[j] || 0);
      let a: number[];
      do a = nonzero(3, -6, 6);
      while (dot(a, b) === 0);
      const v = fr(dot(a, b), len);
      return {
        prompt: fill(w.prompts.projScalar, { a: vs(a), b: vs(b) }),
        q: "",
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: { kind: "vectors", spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } },
      };
    }
    if (L === 2) {
      const n = r.pick([2, 3] as const);
      let a: number[], b: number[];
      do [a, b] = [nonzero(n, -6, 6), nonzero(n, -4, 4)];
      while (dot(a, b) === 0 || a.every((x, i) => x * b[0] === b[i] * a[0]));
      const k = fr(dot(a, b), dot(b, b));
      const p = b.map((x) => k.mul(fr(x)));
      return {
        prompt: fill(w.prompts.projVector, { a: vs(a), b: vs(b) }),
        q: "",
        answer: { k: "tuple", vs: p.map((x) => x.toNumber()), tol: 1e-9 },
        show: colTex(p.map((x) => x.tex())),
        plain: `(${p.map(plainFrac).join("; ")})`,
        format: "vector",
        solution: { kind: "vectors", spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } },
      };
    }
    // The foot F = A + t₀d, and P = F + m with m ⟂ d (d × e, made as short as it can be).
    let d: number[], m: number[];
    do {
      d = nonzero(3, -3, 3);
      const gd = d.reduce((s, x) => gcd(s, x), 0);
      d = d.map((x) => x / gd);
      const e = nonzero(3, -2, 2);
      m = [d[1] * e[2] - d[2] * e[1], d[2] * e[0] - d[0] * e[2], d[0] * e[1] - d[1] * e[0]];
      const g = m.reduce((s, x) => gcd(s, x), 0);
      if (g) m = m.map((x) => x / g);
    } while (m.every((x) => x === 0));
    const A = Array.from({ length: 3 }, () => r.int(-4, 4));
    const t0 = r.nz(-2, 2);
    const F = A.map((x, i) => x + t0 * d[i]);
    const s = r.pick([1, 2] as const);
    const P = F.map((x, i) => x + s * m[i]);
    return {
      prompt: fill(w.prompts.projFoot, { p: `P${vs(P)}` }),
      q: `\\mathbf{r} = ${colTex(A.map(String))} + t ${colTex(d.map(String))}`,
      answer: { k: "tuple", vs: F, tol: 1e-9 },
      show: `\\left(${F.join(", ")}\\right)`,
      plain: `(${F.join("; ")})`,
      format: "xyz",
      solution: { kind: "vectors", spec: { topic: "lines", src: `r = ${vs(A)} + t${vs(d)}; P${vs(P)}` } },
    };
  },

  matrices(r, L, w) {
    if (L === 1) {
      const [A, B] = [ints(r, 2, 2, -5, 6), ints(r, 2, 2, -5, 6)];
      const P = mul(M(A), M(B));
      return { prompt: w.prompts.matProduct, q: `${texM(M(A))} ${texM(M(B))}`, answer: matAnswer(P), show: texM(P), plain: matPlain(P), format: "matrix", solution: matCalc("mul", A, B) };
    }
    if (L === 2) {
      // AᵀB with A and B both 3 × 2: the product is only defined once A is turned.
      const [A, B] = [ints(r, 3, 2, -4, 5), ints(r, 3, 2, -4, 5)];
      const At = M(A[0].map((_, j) => A.map((row) => row[j])));
      const P = mul(At, M(B));
      return {
        prompt: w.prompts.matTranspose,
        q: `A = ${texM(M(A))}, \\quad B = ${texM(M(B))}`,
        answer: matAnswer(P),
        show: texM(P),
        plain: matPlain(P),
        format: "matrix",
        steps: [`A^{T} = ${texM(At)}`, `A^{T}B = ${texM(At)} ${texM(M(B))} = ${texM(P)}`],
      };
    }
    // A² = aA + bI: off the diagonal only a counts, so a comes from there and b from the diagonal (a = tr A, b = −det A).
    let A: number[][];
    do A = ints(r, 2, 2, -5, 5);
    while (A[0][1] === 0);
    const A2 = mul(M(A), M(A));
    const [a, b] = [A[0][0] + A[1][1], A[0][1] * A[1][0] - A[0][0] * A[1][1]];
    /** c·a, with + b on the diagonal: 3a + b, -a, b. */
    const lin = (c: number, diag: boolean) => {
      const t = c === 0 ? "" : c === 1 ? "a" : c === -1 ? "-a" : `${c}a`;
      return diag ? (t ? `${t} + b` : "b") : t || "0";
    };
    return {
      prompt: w.prompts.matIdentity,
      q: `A = ${texM(M(A))}`,
      answer: { k: "tuple", vs: [a, b], tol: 1e-9, names: ["a", "b"] },
      show: `a = ${a}, \\; b = ${b}`,
      plain: `a = ${a}; b = ${b}`,
      format: "pair",
      steps: [
        `A^{2} = ${texM(M(A))} ${texM(M(A))} = ${texM(A2)}`,
        `aA + bI = ${env([[lin(A[0][0], true), lin(A[0][1], false)], [lin(A[1][0], false), lin(A[1][1], true)]])}`,
        A[0][1] === 1 ? `a = ${a}` : `${lin(A[0][1], false)} = ${A2[0][1].tex()} \\;\\Rightarrow\\; a = ${a}`,
        `${lin(A[0][0], true)} = ${A2[0][0].tex()} \\;\\Rightarrow\\; b = ${b}`,
        `a = \\operatorname{tr} A, \\quad b = -\\det A`,
      ],
    };
  },

  determinant(r, L, w) {
    if (L < 3) {
      const A = L === 1 ? ints(r, 2, 2, -9, 9) : ints(r, 3, 3, -4, 5);
      const d = det(M(A));
      return { prompt: w.prompts.matDet, q: texM(M(A), "vmatrix"), answer: num(d.toNumber()), show: d.tex(), plain: plainFrac(d), format: "number", solution: matCalc("det", A) };
    }
    let A: number[][], d: number;
    do (A = ints(r, 2, 2, -6, 7)), (d = det(M(A)).n);
    while (d === 0 || Math.abs(d) > 12);
    const inv = M([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]]).map((row) => row.map((x) => x.div(fr(d))));
    return { prompt: w.prompts.matInverse, q: `A = ${texM(M(A))}`, answer: matAnswer(inv), show: `A^{-1} = ${texM(inv)}`, plain: matPlain(inv), format: "matrix", solution: matCalc("inverse", A) };
  },

  elimination(r, L, w) {
    const V = ["x", "y", "z"];
    /** 2x - y + 3z, with a coefficient written k where it is k. */
    const lhs = (row: (number | "k")[]) => {
      let out = "";
      row.forEach((c, j) => {
        if (c === 0) return;
        const neg = c !== "k" && c < 0;
        const body = c === "k" ? `k${V[j]}` : `${Math.abs(c) === 1 ? "" : Math.abs(c)}${V[j]}`;
        out += out ? (neg ? ` - ${body}` : ` + ${body}`) : neg ? `-${body}` : body;
      });
      return out || "0";
    };
    const system = (A: (number | "k")[][], b: number[]) => `\\begin{aligned} ${A.map((row, i) => `${lhs(row)} &= ${b[i]}`).join(" \\\\ ")} \\end{aligned}`;
    if (L === 1) {
      let A: number[][];
      do A = ints(r, 3, 3, -3, 4);
      while (det(M(A)).isZero() || A.some((row) => row.filter(Boolean).length < 2));
      const x = Array.from({ length: 3 }, () => r.int(-4, 5));
      const b = A.map((row) => row.reduce((s, c, j) => s + c * x[j], 0));
      return {
        prompt: w.prompts.elimSolve,
        q: system(A, b),
        answer: { k: "tuple", vs: x, tol: 1e-9 },
        show: `x = ${x[0]}, \\; y = ${x[1]}, \\; z = ${x[2]}`,
        plain: `x = ${x[0]}; y = ${x[1]}; z = ${x[2]}`,
        format: "xyz",
        solution: matCalc("solve", A.map((row, i) => [...row, b[i]])),
      };
    }
    if (L === 2) {
      // Rank k: a 3 × k matrix times a k × 4 one, kept only when the rank really is k.
      const k = r.pick([1, 2, 2, 3] as const);
      let A: number[][];
      do {
        const [P, Q] = [ints(r, 3, k, -3, 3), ints(r, k, 4, -2, 3)];
        A = P.map((row) => Q[0].map((_, j) => row.reduce((s, x, i) => s + x * Q[i][j], 0)));
      } while (
        gaussJordan(M(A), 4).pivots.length !== k ||
        // No row or column of zeros, and few zeros at all: the rank has to be worked out, not seen.
        A.some((row) => row.every((x) => x === 0)) ||
        A[0].some((_, j) => A.every((row) => row[j] === 0)) ||
        A.flat().filter((x) => x === 0).length > 2 ||
        A.some((row, i) => A.some((other, j) => j > i && (row.every((x, c) => x === other[c]) || row.every((x, c) => x === -other[c])))) ||
        A.flat().some((x) => Math.abs(x) > 12)
      );
      const spec: SpaceSpec = { type: "space", op: "subspaces", A: A.map((row) => row.map(String)), w: ["0", "0", "0"], steps: true };
      return { prompt: w.prompts.elimRank, q: texM(M(A)), answer: num(k), show: String(k), plain: String(k), format: "number", solution: { kind: "matrix", spec } };
    }
    // One coefficient is k: det A = αk + β (α its cofactor), so the solution stops being unique only at k = −β/α.
    let A: number[][], at: [number, number], alpha: number, beta: number;
    do {
      A = ints(r, 3, 3, -3, 4);
      at = [r.int(0, 2), r.int(0, 2)];
      A[at[0]][at[1]] = 0;
      beta = det(M(A)).n;
      A[at[0]][at[1]] = 1;
      alpha = det(M(A)).n - beta;
    } while (alpha === 0 || beta === 0 || beta % alpha !== 0 || A.some((row) => row.filter(Boolean).length < 2));
    const kv = -beta / alpha;
    const shown: (number | "k")[][] = A.map((row, i) => row.map((c, j) => (i === at[0] && j === at[1] ? "k" : c)));
    const b = Array.from({ length: 3 }, () => r.int(-6, 9));
    return {
      prompt: w.prompts.elimK,
      q: system(shown, b),
      answer: num(kv),
      show: `k = ${kv}`,
      plain: String(kv),
      format: "number",
      steps: [
        `\\det A = ${env(shown.map((row) => row.map(String)), "vmatrix")} = ${polyStr([beta, alpha], "k")}`,
        `\\det A = 0 \\;\\Rightarrow\\; k = ${kv}`,
      ],
    };
  },

  eigen(r, L, w) {
    // A = PDP⁻¹ with P made of shears (det 1), so A, P⁻¹ and the eigenvalues are whole numbers.
    const unit = (n: number) => M(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    const shears = (n: number) => {
      for (;;) {
        let P = unit(n);
        for (let s = 0; s <= n; s++) {
          const [i, j] = [r.int(0, n - 1), r.int(0, n - 1)];
          if (i === j) continue;
          const E = unit(n);
          E[i][j] = fr(r.nz(-2, 2));
          P = mul(P, E);
        }
        if (P.flat().filter((x) => !x.isZero()).length > n && P.flat().every((x) => Math.abs(x.n) <= 4)) return P;
      }
    };
    const inverse = (P: Mat) => gaussJordan(P.map((row, i) => [...row, ...unit(P.length)[i]]), P.length).result.map((row) => row.slice(P.length));
    const make = (n: number) => {
      for (;;) {
        const P = shears(n);
        const ls: number[] = [];
        while (ls.length < n) {
          const l = r.int(-4, 6);
          if (!ls.includes(l) && (n === 2 || l !== 0)) ls.push(l);
        }
        const D = M(ls.map((l, i) => ls.map((_, j) => (i === j ? l : 0))));
        const A = mul(mul(P, D), inverse(P));
        // Not triangular, so the eigenvalues can't be read off the diagonal; in 2D neither corner is 0.
        const above = A.some((row, i) => row.some((x, j) => j > i && !x.isZero()));
        const below = A.some((row, i) => row.some((x, j) => j < i && !x.isZero()));
        const corners = n === 3 ? A.flat().filter((x) => x.isZero()).length <= 2 : !A[0][1].isZero() && !A[1][0].isZero();
        if (above && below && corners && A.flat().every((x) => Math.abs(x.n) <= (n === 2 ? 12 : 15))) return { A, P, ls };
      }
    };
    const eigenOf = (A: Mat): Exercise["solution"] => ({ kind: "matrix", spec: { type: "space", op: "eigen", A: A.map((row) => row.map(plainFrac)), w: A.map(() => "0"), steps: true } satisfies SpaceSpec });
    if (L === 1) {
      const { A, ls } = make(2);
      return { prompt: w.prompts.eigValues, q: `A = ${texM(A)}`, answer: { k: "set", vs: ls, tol: 1e-9 }, show: `\\lambda = ${ls.join(", \\; ")}`, plain: ls.join("; "), format: "roots", solution: eigenOf(A) };
    }
    if (L === 2) {
      const { A, P, ls } = make(2);
      const i = r.int(0, 1);
      // P's column i, as short as it goes and with its first non-zero component positive.
      const v = P.map((row) => row[i].n);
      const g = gcd(v[0], v[1]) * Math.sign(v.find((x) => x !== 0)!);
      const u = v.map((x) => x / g || 0);
      return { prompt: fill(w.prompts.eigVector, { l: ls[i] }), q: `A = ${texM(A)}`, answer: { k: "dir", vs: u }, show: colTex(u.map(String)), plain: `(${u.join("; ")})`, format: "eigvec", solution: eigenOf(A) };
    }
    // Given one eigenvalue, the other two from the trace (their sum) and the determinant (their product).
    const { A, ls } = make(3);
    const tr = A.reduce((s, row, i) => s + row[i].n, 0);
    const [l1, rest] = [ls[0], ls.slice(1).sort((a, b) => a - b)];
    const [sum, prod] = [tr - l1, det(A).n / l1];
    return {
      prompt: fill(w.prompts.eigRest, { l: l1 }),
      q: `A = ${texM(A)}`,
      answer: { k: "set", vs: rest, tol: 1e-9 },
      show: `\\lambda = ${rest.join(", \\; ")}`,
      plain: rest.join("; "),
      format: "roots",
      steps: [
        `\\operatorname{tr} A = ${tr} = ${l1} + \\lambda_2 + \\lambda_3 \\;\\Rightarrow\\; \\lambda_2 + \\lambda_3 = ${sum}`,
        `\\det A = ${det(A).n} = ${l1 < 0 ? `(${l1})` : l1}\\,\\lambda_2 \\lambda_3 \\;\\Rightarrow\\; \\lambda_2 \\lambda_3 = ${prod}`,
        `${polyStr([prod, -sum, 1], "t")} = 0 \\;\\Rightarrow\\; t = ${rest.join(", \\; ")}`,
      ],
    };
  },
  differentiate(r, L, w) {
    let src: string;
    if (L === 1) {
      const n = r.int(3, 5);
      const cs = Array.from({ length: n + 1 }, (_, k) => (k === n ? r.nz(-6, 6) : r.next() < 0.6 ? r.int(-9, 9) : 0));
      src = polyStr(cs);
    } else if (L === 2) {
      const [a, b, k, n] = [r.int(2, 5), r.nz(-6, 6), r.nz(-4, 4), r.int(2, 5)];
      src = r.pick([`(${polyStr([b, a])})^${n}`, `e^(${k}x)`, `sin(${a}x)`, `cos(${a}x)`, `${a}x^2 + ${Math.abs(b)}/x`, `${a}sqrt(x)`, `${a}e^(${k}x) + x^${n}`]);
    } else {
      const [a, n] = [r.int(1, 5), r.int(2, 4)];
      src = r.pick([`x^${n} e^x`, `x^${n} sin x`, `x cos(${a}x)`, `ln(x^2 + ${a})`, `x/(x + ${a})`, `(x^2 + ${a})^${n}`, `e^(x^2)`, `(x^2 + 1)/(x - ${a})`, `x ln x`, `e^(${a}x) sin x`]);
    }
    const f = parseE(src);
    const d = simp(derive(f));
    return { prompt: w.prompts.differentiate, q: `y = ${tex(f)}`, answer: { k: "expr", e: d }, show: `\\frac{dy}{dx} = ${tex(d)}`, plain: plainE(d), format: "expr", solution: { kind: "deriv", spec: { topic: "rules", src, at: "" } } };
  },

  tangent(r, L, w) {
    let src: string;
    let at: number;
    if (L === 2) {
      const pick = r.int(0, 2);
      if (pick === 0) [src, at] = [`sqrt(x)`, r.pick([1, 4, 9, 16])];
      else if (pick === 1) [src, at] = [`${r.int(1, 6)}/x`, r.pick([1, 2, 3, -1, -2])];
      else [src, at] = [`x^3 - ${r.int(1, 9)}x`, r.int(-3, 3)];
    } else {
      src = polyStr([r.int(-6, 6), r.int(-6, 6), r.nz(-4, 4), r.next() < 0.5 ? r.nz(-2, 2) : 0]);
      at = r.int(-3, 3);
    }
    const f = parseE(src);
    const d = derive(f);
    const m = evalE(d, at);
    const y0 = evalE(f, at);
    const mF = toFrac(m);
    if (L < 3)
      return { prompt: fill(w.prompts.gradient, { a: at }), q: `y = ${tex(f)}`, answer: num(m), show: `\\frac{dy}{dx}\\Big|_{x = ${at}} = ${mF.tex()}`, plain: plainFrac(mF), format: "exact", solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } } };
    const c = toFrac(y0 - m * at);
    const e = fromPoly([c, mF]);
    return { prompt: fill(w.prompts.tangent, { a: at }), q: `y = ${tex(f)}`, answer: { k: "expr", e, mode: "line" }, show: `y = ${tex(e)}`, plain: `y = (${plainFrac(mF)})x + (${plainFrac(c)})`, format: "line", solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } } };
  },

  stationary(r, L, w) {
    let cs: number[];
    let xs: number[];
    if (L === 1) {
      const [a, h] = [r.nz(-3, 3), r.int(-5, 5)];
      cs = [r.int(-9, 9), -2 * a * h, a];
      xs = [h];
    } else if (L === 2) {
      let p: number, q: number, k: number;
      do [p, q, k] = [r.int(-4, 4), r.int(-4, 4), r.pick([1, 2])];
      while (p === q || (k === 1 && (p + q) % 2 !== 0));
      // f′ = 3k(x − p)(x − q)
      cs = [r.int(-9, 9), 3 * k * p * q, (-3 * k * (p + q)) / 2, k];
      xs = [p, q].sort((a, b) => a - b);
    } else if (r.next() < 0.5) {
      const a = r.int(1, 3);
      cs = [r.int(-9, 9), 0, -2 * a * a, 0, 1];
      xs = [-a, 0, a];
    } else {
      const p = r.nz(-2, 2);
      cs = [r.int(-9, 9), 0, 0, -4 * p, 1];
      xs = [0, 3 * p].sort((a, b) => a - b);
    }
    const src = polyStr(cs);
    return { prompt: w.prompts.stationary, q: `y = ${T(src)}`, answer: { k: "set", vs: xs, tol: 1e-9 }, show: xs.map((x) => `x = ${x}`).join(", \\; "), plain: xs.join("; "), format: "roots", solution: { kind: "deriv", spec: { topic: "stationary", src, at: "" } } };
  },

  integrate(r, L, w) {
    let src: string;
    if (L === 1) {
      const n = r.int(2, 4);
      const cs = Array.from({ length: n + 1 }, (_, k) => (k === n || r.next() < 0.6 ? r.nz(-5, 5) * (k + 1) : 0));
      src = polyStr(cs);
    } else if (L === 2) {
      const [a, k] = [r.int(1, 6), r.nz(-3, 3)];
      src = r.pick([`${a}/x^2`, `${3 * a}sqrt(x)`, `e^(${k}x)`, `${a}/x`, `x^2 + ${a}/x^2`, `${2 * a}x + e^x`]);
    } else {
      const [a, b, n] = [r.int(2, 5), r.nz(-5, 5), r.int(2, 4)];
      src = r.pick([`sin(${a}x)`, `cos(${a}x)`, `(${polyStr([b, a])})^${n}`, `e^(${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)})`, `${a}cos x - sin(${a}x)`, `1/(${polyStr([b, a])})`]);
    }
    const f = parseE(src);
    const Fe = antiderivative(f)!;
    return {
      prompt: w.prompts.integrate,
      q: `\\int ${tex(f)} \\, dx`,
      answer: { k: "expr", e: Fe, mode: "plusC" },
      show: `${tex(Fe)} + C`,
      plain: `${plainE(Fe)} + C`,
      format: "antiderivative",
      steps: [`\\int ${tex(f)} \\, dx = ${tex(Fe)} + C`, `\\frac{d}{dx}\\left(${tex(Fe)}\\right) = ${tex(simp(derive(Fe)))}`],
    };
  },

  definite(r, L, w) {
    let src: string;
    let a: string;
    let b: string;
    let v: number;
    let show: string;
    if (L === 1) {
      const cs = [r.int(0, 6), r.int(0, 6), r.int(1, 4)];
      const [lo, hi] = [r.int(0, 2), r.int(3, 4)];
      src = polyStr(cs);
      [a, b] = [String(lo), String(hi)];
      const I = cs.reduce((acc, c, k) => acc.add(fr(c * (hi ** (k + 1) - lo ** (k + 1)), k + 1)), fr(0));
      v = I.toNumber();
      show = I.tex();
    } else if (L === 2) {
      const pick = r.int(0, 2);
      if (pick === 0) {
        const k = r.int(2, 5);
        [src, a, b] = [`1/x^2`, "1", String(k)];
        const I = fr(k - 1, k);
        [v, show] = [I.toNumber(), I.tex()];
      } else if (pick === 1) {
        const k = r.pick([4, 9, 16]);
        [src, a, b] = [`sqrt(x)`, "0", String(k)];
        const I = fr(2 * Math.sqrt(k) ** 3, 3);
        [v, show] = [I.toNumber(), I.tex()];
      } else {
        const [p, q] = [r.int(1, 3), r.int(4, 6)];
        const c = r.int(1, 6);
        src = `x^3 + ${c}`;
        [a, b] = [String(p), String(q)];
        const I = fr(q ** 4 - p ** 4, 4).add(fr(c * (q - p)));
        [v, show] = [I.toNumber(), I.tex()];
      }
    } else {
      const pick = r.int(0, 3);
      const k = r.int(2, 4);
      if (pick === 0) [src, a, b, v, show] = [`e^x`, "0", String(k), Math.exp(k) - 1, `e^{${k}} - 1`];
      else if (pick === 1) [src, a, b, v, show] = [`1/x`, "1", String(k), Math.log(k), `\\ln ${k}`];
      else if (pick === 2) [src, a, b, v, show] = [`sin x`, "0", "pi", 2, "2"];
      else [src, a, b, v, show] = [`cos x`, "0", "pi/2", 1, "1"];
    }
    const lim = (s: string) => (s === "pi" ? "\\pi" : s === "pi/2" ? "\\frac{\\pi}{2}" : s);
    return {
      prompt: w.prompts.definite,
      q: `\\int_{${lim(a)}}^{${lim(b)}} ${T(src)} \\, dx`,
      answer: num(v, 0.0006),
      show: Number.isInteger(v) || /frac|^\d+$/.test(show) ? show : `${show} \\approx ${dp(v, 3)}`,
      plain: dp(v, 6),
      format: "dp3",
      solution: { kind: "applied", spec: { topic: "area", f: src, g: "", a, b, c: "", opt: "" } },
    };
  },

  numroots(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "numerical" as const, spec: { topic, src } });
    if (L === 2) {
      // x_(n+1) = ∛(ax + b) or √(ax + b): three steps
      const cube = r.next() < 0.5;
      const [a, b] = [r.int(2, 5), r.int(1, 9)];
      const x0 = r.int(1, 3);
      const g = (x: number) => (cube ? Math.cbrt(a * x + b) : Math.sqrt(a * x + b));
      const x3 = g(g(g(x0)));
      const src = `${cube ? "cbrt" : "sqrt"}(${a}x + ${b})`;
      return {
        prompt: fill(w.prompts.numIterate, { a: x0 }),
        q: `x_{n+1} = ${cube ? "\\sqrt[3]" : "\\sqrt"}{${a}x_n + ${b}}`,
        answer: num(x3, 0.0006),
        show: dp(x3, 3),
        plain: dp(x3, 6),
        format: "dp3",
        solution: sol("iterate", `x = ${src}; x0 = ${x0}; 3 steps`),
      };
    }
    // Newton–Raphson: one step (level 1) or to the root (level 3)
    let src: string;
    let x0: number;
    const pick = L === 1 ? 0 : r.int(0, 3);
    if (pick === 0) {
      x0 = r.int(1, 3);
      const b = r.int(-2, 4);
      const c = -(x0 ** 3 + b * x0) + r.nz(-3, 3);
      src = polyStr([c, b, 0, 1]);
    } else if (pick === 1) {
      let k = r.int(3, 40);
      while (Number.isInteger(Math.sqrt(k))) k++;
      [src, x0] = [`x^2 - ${k}`, Math.floor(Math.sqrt(k))];
    } else if (pick === 2) [src, x0] = [`e^x - ${r.int(3, 4)}x`, r.pick([0, 2])];
    else [src, x0] = [r.pick(["x - cos x", "x + ln x - 2", "x^3 + x - 3"]), r.pick([1, 2])];
    const f = parseE(src);
    const d = simp(derive(f));
    const step = (x: number) => x - evalE(f, x) / evalE(d, x);
    let v = step(x0);
    if (L === 3) for (let i = 0; i < 30; i++) v = step(v);
    return {
      prompt: fill(L === 1 ? w.prompts.numNewton : w.prompts.numRoot, { a: x0 }),
      q: `f(x) = ${T(src)}`,
      answer: num(v, 0.0006),
      show: dp(v, 3),
      plain: dp(v, 6),
      format: "dp3",
      solution: sol("newton", L === 1 ? `${src}; x0 = ${x0}; 1 step` : `${src}; x0 = ${x0}; 3 dp`),
    };
  },

  numint(r, L, w) {
    const fs: [string, number, number][] =
      L === 1
        ? [[`x^2 + ${r.int(1, 5)}`, 0, 2], ["x^3", 1, 3], ["sqrt x", 0, 4], [`${r.int(2, 6)}/x`, 1, 3]]
        : [["e^x", 0, 1], ["ln x", 1, 3], ["sqrt(1 + x^2)", 0, 2], ["1/(1 + x)", 0, 2], ["e^(-x^2)", 0, 1], ["sqrt(1 + x^3)", 0, 2]];
    const [src, a, b] = r.pick(fs);
    const n = L === 1 ? r.pick([2, 4]) : 4;
    const simpsonRule = L === 3;
    const f = parseE(src);
    const h = (b - a) / n;
    const ys = Array.from({ length: n + 1 }, (_, i) => evalE(f, a + i * h));
    const inner = ys.slice(1, n);
    const v = simpsonRule
      ? (h / 3) * (ys[0] + ys[n] + inner.reduce((s, y, i) => s + y * (i % 2 ? 2 : 4), 0))
      : (h / 2) * (ys[0] + ys[n] + 2 * inner.reduce((s, y) => s + y, 0));
    return {
      prompt: fill(simpsonRule ? w.prompts.numSimpson : w.prompts.numTrapezium, { n }),
      q: `\\int_{${a}}^{${b}} ${T(src)} \\, dx`,
      answer: num(v, 0.0006),
      show: dp(v, 3),
      plain: dp(v, 6),
      format: "dp3",
      solution: { kind: "numerical", spec: { topic: "integrate", src: `${src}; [${a}, ${b}]; n = ${n}; ${simpsonRule ? "simpson" : "trapezium"}` } },
    };
  },

  average(r, L, w) {
    const n = r.int(5, 9);
    let xs: number[];
    let stat: "mean" | "median" | "mode" | "range" | "sd";
    let v: number;
    if (L === 1) {
      stat = r.pick(["mean", "range"] as const);
      for (;;) {
        xs = Array.from({ length: n - 1 }, () => r.int(1, 20));
        const mean = r.int(5, 15);
        const last = mean * n - xs.reduce((s, x) => s + x, 0);
        if (last >= 1 && last <= 25) {
          xs.push(last);
          break;
        }
      }
    } else if (L === 2) {
      stat = r.pick(["median", "mode"] as const);
      xs = Array.from({ length: n }, () => r.int(1, 30));
      if (stat === "mode") {
        const m = xs[0];
        xs[1] = m;
        xs[2] = m;
        const counts = new Map<number, number>();
        xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
        if ([...counts.entries()].filter(([, c]) => c >= 3).length > 1) return GENS.average(r, L, w);
      }
    } else {
      stat = "sd";
      xs = Array.from({ length: n }, () => r.int(1, 20));
      if (new Set(xs).size === 1) xs[0]++;
    }
    // Shuffle (Fisher–Yates), so a mode or the last value doesn't sit at a fixed place.
    for (let i = xs.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    const sorted = [...xs].sort((a, b) => a - b);
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    if (stat === "mean") v = mean;
    else if (stat === "range") v = sorted[n - 1] - sorted[0];
    else if (stat === "median") v = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    else if (stat === "mode") v = [...new Set(sorted)].reduce((best, x) => (sorted.filter((y) => y === x).length > sorted.filter((y) => y === best).length ? x : best), sorted[0]);
    else v = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
    return {
      prompt: w.prompts[stat],
      q: xs.join(",\\ "),
      answer: num(v, stat === "sd" ? 0.0051 : 1e-9),
      show: stat === "sd" ? `s \\approx ${dp(v, 2)}` : String(v),
      plain: stat === "sd" ? dp(v, 2) : String(v),
      format: stat === "sd" ? "dp2" : "number",
      solution: { kind: "statistics", spec: { topic: "data", values: xs.join(" "), chart: "dot", bins: 0 } },
    };
  },

  probability(r, L, w) {
    if (L === 1) {
      const kind = r.pick(["even", "greater", "prime", "mult3"] as const);
      const k = r.int(2, 5);
      const good = kind === "even" ? [2, 4, 6] : kind === "greater" ? [1, 2, 3, 4, 5, 6].filter((x) => x > k) : kind === "prime" ? [2, 3, 5] : [3, 6];
      const p = fr(good.length, 6);
      return {
        prompt: fill(w.prompts.die, { event: fill(w.events[kind], { k }) }),
        q: "",
        answer: num(p.toNumber(), 1e-9, { lowest: true }),
        show: p.tex(),
        plain: plainFrac(p),
        format: "fraction",
        steps: [`\\{${good.join(", ")}\\}: \\quad P = \\frac{${good.length}}{6} = ${p.tex()}`],
      };
    }
    if (L === 2) {
      const k = r.int(2, 12);
      const pairs: string[] = [];
      for (let a = 1; a <= 6; a++) if (k - a >= 1 && k - a <= 6) pairs.push(`(${a}, ${k - a})`);
      const p = fr(pairs.length, 36);
      return {
        prompt: fill(w.prompts.dice, { k }),
        q: "",
        answer: num(p.toNumber(), 1e-9, { lowest: true }),
        show: p.tex(),
        plain: plainFrac(p),
        format: "fraction",
        steps: [`${pairs.join(",\\ ")}`, `P = \\frac{${pairs.length}}{36} = ${p.tex()}`],
      };
    }
    const [red, blue] = [r.int(3, 8), r.int(2, 7)];
    const n = red + blue;
    const p = fr(red * (red - 1), n * (n - 1));
    return {
      prompt: fill(w.prompts.marbles, { r: red, b: blue }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`P = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} = \\frac{${red * (red - 1)}}{${n * (n - 1)}} = ${p.tex()}`],
      solution: { kind: "statistics", spec: { topic: "tree", pA: `${red}/${n}`, pBA: `${red - 1}/${n - 1}`, pBnotA: `${red}/${n - 1}`, nameA: w.marbleNames.first, nameB: w.marbleNames.second } },
    };
  },

  counting(r, L, w) {
    const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
    const count = (kind: string, n: number, k: number, word = "MISSISSIPPI") => ({ kind: "comb" as const, spec: { topic: "count", kind, n: String(n), r: String(k), word } });
    if (L === 1) {
      if (r.next() < 0.5) {
        const n = r.int(4, 7);
        return { prompt: fill(w.prompts.lineUp, { n }), q: "", answer: num(fact(n)), show: `${n}! = ${fact(n)}`, plain: String(fact(n)), format: "number", solution: count("perm", n, n) };
      }
      const [n, k] = [r.int(5, 10), r.int(2, 3)];
      const v = fact(n) / fact(n - k);
      return { prompt: fill(w.prompts.podium, { n, r: k }), q: "", answer: num(v), show: `P(${n}, ${k}) = ${v}`, plain: String(v), format: "number", solution: count("perm", n, k) };
    }
    if (L === 2) {
      const [n, k] = [r.int(6, 15), r.int(2, 4)];
      const v = Math.round(fact(n) / fact(k) / fact(n - k));
      return { prompt: fill(w.prompts.choose, { n, r: k }), q: "", answer: num(v), show: `\\binom{${n}}{${k}} = ${v}`, plain: String(v), format: "number", solution: count("comb", n, k) };
    }
    const word = r.pick(["BANANA", "LEVEL", "APPLE", "PEPPER", "LETTER", "COFFEE", "BALLOON", "SUCCESS", "STATISTICS"]);
    const counts = new Map<string, number>();
    for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const v = Math.round([...counts.values()].reduce((acc, c) => acc / fact(c), fact(word.length)));
    const rep = [...counts.values()].filter((c) => c > 1).map((c) => `${c}!`).join(" \\cdot ");
    return { prompt: fill(w.prompts.word, { word }), q: "", answer: num(v), show: `\\frac{${word.length}!}{${rep}} = ${v}`, plain: String(v), format: "number", solution: count("word", 5, 3, word) };
  },

  ci(r, L, w) {
    const conf = r.pick([90, 95, 99]);
    const tail = (1 - conf / 100) / 2;
    const base = { topic: "ci", d: "", e: "", f: "", data: "", data2: "", level: String(conf), alt: "ne", seed: 1 };
    if (L === 3) {
      const n = r.pick([100, 200, 250, 400, 500]);
      const x = r.int(Math.round(n * 0.2), Math.round(n * 0.8));
      const p = x / n;
      const E = zUpper(tail) * Math.sqrt((p * (1 - p)) / n);
      return {
        prompt: fill(w.prompts.ciP, { n, x, c: conf }),
        q: "",
        answer: { k: "tuple", vs: [p - E, p + E], tol: 0.00051 },
        show: `(${dp(p - E, 3)}, \\; ${dp(p + E, 3)})`,
        plain: `(${dp(p - E, 3)}; ${dp(p + E, 3)})`,
        format: "interval",
        solution: { kind: "inference", spec: { ...base, kind: "prop", a: String(x), b: String(n), c: "" } },
      };
    }
    const n = L === 1 ? r.pick([25, 36, 49, 64, 100]) : r.int(8, 30);
    const m = r.int(20, 80) + r.pick([0, 0.5, 0.2, 0.8]);
    const s = r.int(2, 15);
    const crit = L === 1 ? zUpper(tail) : tUpper(tail, n - 1);
    const E = (crit * s) / Math.sqrt(n);
    return {
      prompt: fill(L === 1 ? w.prompts.ciZ : w.prompts.ciT, { n, m, s, c: conf }),
      q: "",
      answer: { k: "tuple", vs: [m - E, m + E], tol: 0.0051 },
      show: `(${dp(m - E, 2)}, \\; ${dp(m + E, 2)})`,
      plain: `(${dp(m - E, 2)}; ${dp(m + E, 2)})`,
      format: "interval",
      solution: { kind: "inference", spec: { ...base, kind: L === 1 ? "z" : "t", a: String(m), b: String(s), c: String(n) } },
    };
  },

  expectation(r, L, w) {
    // Three or four values, their probabilities a split of a small denominator.
    const { xs, ps } = smallDist(r);
    const E = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x))), fr(0));
    const V = xs.reduce((s, x, i) => s.add(ps[i].mul(fr(x * x))), fr(0)).sub(E.mul(E));
    const src = [xs.join(", "), ps.map(plainFrac).join(", ")];
    const out = (prompt: string, v: Frac, solution: Exercise["solution"]) => ({
      prompt, q: distTable(xs, ps), answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v), format: "fraction" as const, solution,
    });
    if (L === 1) return out(w.prompts.expMean, E, { kind: "randvar", spec: { topic: "discrete", src } });
    if (L === 2) return out(w.prompts.expVar, V, { kind: "randvar", spec: { topic: "discrete", src } });
    // Var(aX + b) = a² Var(X): b moves the values, a stretches them.
    const [a, b] = [r.pick([-3, -2, 2, 3, 4] as const), r.nz(-6, 6)];
    return out(fill(w.prompts.expRule, { e: `Var(${a < 0 ? `−${-a}` : a}X ${b < 0 ? "−" : "+"} ${Math.abs(b)})` }), V.mul(fr(a * a)), { kind: "randvar", spec: { topic: "rules", src: [...src, String(a), String(b)] } });
  },

  conditional(r, L, w) {
    if (L === 1) {
      // Counts by A and B; the condition picks the row or column, the event the cell in it.
      const [a, b, c, d] = [r.int(3, 30), r.int(3, 30), r.int(3, 30), r.int(3, 30)];
      const [ask, top, bottom] = r.pick([
        ["P(A \\mid B)", a, a + c],
        ["P(B \\mid A)", a, a + b],
        ["P(A \\mid B')", b, b + d],
        ["P(B' \\mid A')", d, c + d],
        ["P(A' \\mid B)", c, a + c],
      ] as const);
      const v = fr(top, bottom);
      return {
        prompt: fill(w.prompts.condTable, { e: ask.replace(/\\mid/g, "|").replace(/'/g, "′") }),
        q: `\\begin{array}{c|cc} & B & B' \\\\ \\hline A & ${a} & ${b} \\\\ A' & ${c} & ${d} \\end{array}`,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        steps: [`${ask} = \\frac{${top}}{${bottom}} = ${v.tex()}`],
      };
    }
    // A condition D and a test: P(D), P(+ | D), P(+ | D′) in hundredths, so every answer is exact.
    const pD = fr(r.int(1, 5), 10);
    const pPos = fr(r.pick([70, 75, 80, 85, 90, 95] as const), 100);
    const pFalse = fr(r.pick([5, 10, 15, 20] as const), 100);
    const both = pD.mul(pPos);
    const plus = both.add(fr(1).sub(pD).mul(pFalse));
    const dec = (f: Frac) => String(Math.round(f.toNumber() * 1e6) / 1e6);
    const q = `P(D) = ${dec(pD)}, \\quad P(+ \\mid D) = ${dec(pPos)}, \\quad P(+ \\mid D') = ${dec(pFalse)}`;
    const solution = { kind: "statistics" as const, spec: { topic: "tree", pA: dec(pD), pBA: dec(pPos), pBnotA: dec(pFalse), nameA: "D", nameB: "+" } };
    const total = `P(+) = ${dec(pD)} \\cdot ${dec(pPos)} + ${dec(fr(1).sub(pD))} \\cdot ${dec(pFalse)} = ${dec(plus)}`;
    if (L === 2) return { prompt: w.prompts.condTotal, q, answer: num(plus.toNumber()), show: dec(plus), plain: dec(plus), format: "number", steps: [total], solution };
    const v = both.div(plus);
    return {
      prompt: w.prompts.condBayes,
      q,
      answer: num(v.toNumber(), 0.00051),
      show: `${v.tex()} \\approx ${dp(v.toNumber(), 3)}`,
      plain: dp(v.toNumber(), 3),
      format: "dp3",
      steps: [total, `P(D \\mid +) = \\frac{P(D)\\,P(+ \\mid D)}{P(+)} = \\frac{${dec(both)}}{${dec(plus)}} = ${v.tex()} \\approx ${dp(v.toNumber(), 3)}`],
      solution,
    };
  },

  distributions(r, L, w) {
    const at3 = (v: number) => ({ answer: num(v, 0.00051), show: `${dp(v, 3)}`, plain: dp(v, 3), format: "dp3" as const });
    if (L < 3) {
      const n = r.int(4, 10);
      const p = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9] as const);
      const pmf = (k: number) => choose(n, k) * p ** k * (1 - p) ** (n - k);
      const dist = (lo: number, hi: number) => ({ kind: "statistics" as const, spec: { topic: "dist", kind: "binomial", n, p: String(p), lambda: "", mu: "", sigma: "", lo: String(lo), hi: String(hi) } });
      if (L === 1) {
        let k: number;
        do k = r.int(0, n);
        while (pmf(k) < 0.01);
        return { prompt: fill(w.prompts.binomEq, { n, p, e: `X = ${k}` }), q: "", ...at3(pmf(k)), solution: dist(k, k) };
      }
      let lo: number, hi: number, v: number;
      do {
        const k = r.int(1, n - 1);
        [lo, hi] = r.next() < 0.5 ? [0, k] : [k, n];
        v = Array.from({ length: hi - lo + 1 }, (_, i) => pmf(lo + i)).reduce((s, x) => s + x, 0);
      } while (v < 0.02 || v > 0.98);
      return { prompt: fill(w.prompts.binomEq, { n, p, e: lo === 0 ? `X ≤ ${hi}` : `X ≥ ${lo}` }), q: "", ...at3(v), solution: dist(lo, hi) };
    }
    // X ~ N(μ, σ²) with whole-number ends within two standard deviations.
    const mu = r.int(20, 80);
    const s = r.pick([2, 3, 4, 5, 8, 10] as const);
    const a = mu - r.int(0, 2 * s);
    const b = mu + r.int(1, 2 * s);
    const shape = r.int(0, 2);
    const [lo, hi] = shape === 0 ? [a, null] : shape === 1 ? [null, b] : [a, b];
    const v = (hi === null ? 1 : normCdf((hi - mu) / s)) - (lo === null ? 0 : normCdf((lo - mu) / s));
    const e = lo !== null && hi !== null ? `${lo} < X < ${hi}` : lo !== null ? `X > ${lo}` : `X < ${hi}`;
    return {
      prompt: fill(w.prompts.normalP, { mu, v: s * s, e }),
      q: "",
      ...at3(v),
      solution: { kind: "statistics", spec: { topic: "dist", kind: "normal", n: 10, p: "", lambda: "", mu: String(mu), sigma: String(s), lo: lo === null ? "" : String(lo), hi: hi === null ? "" : String(hi) } },
    };
  },

  correlation(r, L, w) {
    if (L === 3) {
      // A joint table over x ∈ {0, 1}, y ∈ {0, 1, 2} in twentieths: Cov(X, Y) = E(XY) − E(X)E(Y).
      let P: number[][], cov: Frac;
      do {
        const cuts = new Set<number>();
        while (cuts.size < 5) cuts.add(r.int(1, 19));
        const cs = [0, ...[...cuts].sort((x, y) => x - y), 20];
        const ws = cs.slice(1).map((c, i) => c - cs[i]);
        P = [ws.slice(0, 3), ws.slice(3)];
        const pX1 = fr(P[1][0] + P[1][1] + P[1][2], 20);
        const eY = fr(P[0][1] + P[1][1] + 2 * (P[0][2] + P[1][2]), 20);
        const eXY = fr(P[1][1] + 2 * P[1][2], 20);
        cov = eXY.sub(pX1.mul(eY));
      } while (cov.isZero());
      const dec = (k: number) => String(k / 20);
      const v = cov.toNumber();
      return {
        prompt: w.prompts.covJoint,
        q: `\\begin{array}{c|ccc} & y = 0 & y = 1 & y = 2 \\\\ \\hline x = 0 & ${P[0].map(dec).join(" & ")} \\\\ x = 1 & ${P[1].map(dec).join(" & ")} \\end{array}`,
        answer: num(v),
        show: String(Math.round(v * 1e6) / 1e6),
        plain: String(Math.round(v * 1e6) / 1e6),
        format: "number",
        solution: { kind: "randvar", spec: { topic: "joint", src: ["0, 1", "0, 1, 2", P.map((row) => row.map(dec).join(" ")).join(" | "), "1"] } },
      };
    }
    // Pairs with a trend and some scatter, so neither the covariance nor r is 0 and r is not ±1.
    const n = L === 1 ? r.pick([4, 5] as const) : r.pick([5, 6] as const);
    const slope = r.pick([-2, -1, 1, 2] as const);
    let xs: number[], ys: number[], c: ReturnType<typeof covariance>;
    do {
      xs = [];
      while (xs.length < n) {
        const x = r.int(1, 10);
        if (!xs.includes(x)) xs.push(x);
      }
      xs.sort((a, b) => a - b);
      const y0 = r.int(-2, 8);
      ys = xs.map((x) => y0 + slope * x + r.int(-3, 3));
      c = covariance(xs.map((x, i) => [x, ys[i]]));
    } while (Math.abs(c.corr) > 0.98 || Math.abs(c.corr) < 0.3);
    const q = `\\begin{array}{c|${"c".repeat(n)}} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}`;
    const solution = { kind: "randvar" as const, spec: { topic: "cov", src: [xs.map((x, i) => `${x}, ${ys[i]}`).join("; ")] } };
    if (L === 1) {
      const sum = (f: (i: number) => number) => xs.reduce((s, _, i) => s + f(i), 0);
      const v = fr(sum((i) => xs[i] * ys[i]), n).sub(fr(sum((i) => xs[i]), n).mul(fr(sum((i) => ys[i]), n)));
      return { prompt: w.prompts.covData, q, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v), format: "fraction", solution };
    }
    return { prompt: w.prompts.corrData, q, answer: num(c.corr, 0.00051), show: dp(c.corr, 3), plain: dp(c.corr, 3), format: "dp3", solution };
  },

  hypothesis(r, L, w) {
    if (L === 1) {
      // Reject H₀ exactly when p ≤ α.
      const alpha = r.pick([1, 5, 10] as const);
      const reject = r.next() < 0.5;
      let p: number;
      do p = reject ? r.int(1, alpha * 10) / 1000 : r.int(alpha * 10 + 1, 250) / 1000;
      while (p * 100 === alpha);
      const options = (["reject", "keep"] as const).map((k) => ({ text: w.decisions[k].text, plain: w.decisions[k].plain, tex: "" }));
      const cmp = `p = ${p} ${reject ? "\\le" : ">"} ${alpha / 100}`;
      return {
        prompt: fill(w.prompts.hypDecide, { a: alpha, p }),
        q: "",
        answer: { k: "pick", options, right: reject ? 0 : 1 },
        show: cmp,
        plain: options[reject ? 0 : 1].plain,
        format: "pick",
        steps: [cmp],
      };
    }
    // A z test of a mean: σ known, n a square so the standard error is plain.
    const n = r.pick([16, 25, 36, 49, 64, 100] as const);
    const sigma = r.int(2, 15);
    const mu0 = r.int(20, 90);
    const se = sigma / Math.sqrt(n);
    let mean: number, z: number;
    do (mean = Math.round((mu0 + r.int(-30, 30) / 10 * se) * 10) / 10), (z = (mean - mu0) / se);
    while (Math.abs(z) < 0.3 || Math.abs(z) > 3);
    if (L === 2) {
      return {
        prompt: fill(w.prompts.hypZ, { n, m: mean, s: sigma, mu: mu0 }),
        q: "",
        answer: num(z, 0.0051),
        show: dp(z, 2),
        plain: dp(z, 2),
        format: "dp2",
        solution: { kind: "inference", spec: zTest(mean, sigma, n, mu0, "ne") },
      };
    }
    // One-sided in the direction the sample went, or two-sided.
    const alt = r.pick(["ne", z > 0 ? "gt" : "lt"] as const);
    const pOf = (zz: number) => (alt === "ne" ? 2 * normSf(Math.abs(zz)) : alt === "gt" ? normSf(zz) : normCdf(zz));
    const p = pOf(z);
    // z rounded to 2 places first, as from a table, is right too.
    const tol = Math.abs(pOf(Number(dp(z, 2))) - p) + 0.00051;
    return {
      prompt: fill(w.prompts.hypP, { n, m: mean, s: sigma, mu: mu0, rel: alt === "ne" ? "≠" : alt === "gt" ? ">" : "<" }),
      q: "",
      answer: num(p, tol),
      show: `z = ${dp(z, 2)}, \\quad p \\approx ${dp(p, 3)}`,
      plain: dp(p, 3),
      format: "dp3",
      solution: { kind: "inference", spec: zTest(mean, sigma, n, mu0, alt) },
    };
  },

  descent(r, L, w) {
    if (L === 3) {
      // f = ax²: every step multiplies x by q = 1 − 2aη, so 0 < q < 1 settles, −1 < q < 0 zig-zags in, q < −1 out.
      const a = r.pick([1, 2, 4, 5] as const);
      const fate = r.pick(["steady", "zigzag", "diverge"] as const);
      const qOf = (eta: number) => Math.round((1 - 2 * a * eta) * 1000) / 1000;
      const eta = r.pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.6, 0.75, 1.25, 1.5].filter((e) => {
        const q = qOf(e);
        return fate === "steady" ? q > 0 && q < 1 : fate === "zigzag" ? q < 0 && q > -1 : q < -1;
      }));
      const q = qOf(eta);
      const fates = ["steady", "zigzag", "diverge"] as const;
      const options = fates.map((k) => ({ text: w.fates[k].text, plain: w.fates[k].plain, tex: "" }));
      const show = `x_{n+1} = x_n - ${eta} \\cdot ${2 * a} x_n = ${q}\\, x_n`;
      return {
        prompt: fill(w.prompts.gdRate, { eta }),
        q: `f(x) = ${polyStr([0, 0, a])}`,
        answer: { k: "pick", options, right: fates.indexOf(fate) },
        show,
        plain: options[fates.indexOf(fate)].plain,
        format: "pick",
        steps: [`f'(x) = ${polyStr([0, 2 * a])}`, show, `|${q}| ${Math.abs(q) < 1 ? "<" : ">"} 1`],
      };
    }
    // f = ax² + bx + c from a whole x₀ ≠ 0, η a simple fraction, so every step is an exact decimal.
    const [a, b, c] = [r.int(1, 3), r.nz(-8, 8), r.int(0, 9)];
    const eta = r.pick(L === 1 ? [fr(1, 10), fr(1, 5), fr(1, 4), fr(1, 20)] : [fr(1, 10), fr(1, 5), fr(1, 4)]);
    let x0: number;
    do x0 = r.nz(-5, 5);
    while (2 * a * x0 + b === 0);
    const xs = [fr(x0)];
    const ups = [fr(x0)];
    for (let i = 0; i < L; i++) (xs.push(gdStep(xs[i], a, b, eta)), ups.push(gdStep(ups[i], a, b, eta, true)));
    const v = xs[L].toNumber();
    const up = ups[L].toNumber();
    const traps: Trap[] = Math.abs(up - v) > 1e-9 && Math.abs(up + v) > 1e-9 ? [{ id: "uphill", a: num(up) }] : [];
    const e = dec6(eta.toNumber());
    const steps = [`f'(x) = ${polyStr([b, 2 * a])}`];
    for (let i = 0; i < L; i++) {
      const g = xs[i].mul(fr(2 * a)).add(fr(b));
      steps.push(`x_${i + 1} = x_${i} - \\eta f'(x_${i}) = ${dec6(xs[i].toNumber())} - ${e} \\cdot ${par(dec6(g.toNumber()))} = ${dec6(xs[i + 1].toNumber())}`);
    }
    return {
      prompt: fill(L === 1 ? w.prompts.gdStep : w.prompts.gdTwo, { x: x0, eta: e }),
      q: `f(x) = ${polyStr([c, b, a])}`,
      answer: { ...num(v), traps },
      show: `x_${L} = ${dec6(v)}`,
      plain: dec6(v),
      format: "number",
      steps,
    };
  },

  backprop(r, L, w) {
    const d = (top: string, by: string) => `\\frac{\\partial ${top}}{\\partial ${by}}`;
    const given = (vs: [string, number][]) => vs.map(([k, v]) => `${k} = ${v}`).join(", \\ ");
    const out = (prompt: string, q: string, v: number, steps: string[], traps: Trap[] = []) => ({
      prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const, steps,
    });
    if (L === 1) {
      // One node in the middle: f = (x ± y)z goes back through q = x ± y, f = xy + z through p = xy.
      const [x, y, z] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
      const form = r.int(0, 2);
      if (form < 2) {
        const s = form === 0 ? 1 : -1;
        const qv = x + s * y;
        const by = r.pick(qv === 0 ? (["x", "y"] as const) : (["x", "y", "z"] as const));
        const v = by === "z" ? qv : by === "x" ? z : s * z;
        const head = [`q = x ${s > 0 ? "+" : "-"} y = ${qv}`, `f = q z`];
        const last = by === "z" ? `${d("f", "z")} = q = ${qv}` : `${d("f", by)} = ${d("f", "q")} \\cdot ${d("q", by)} = z \\cdot ${par(by === "x" ? 1 : s)} = ${v}`;
        return out(fill(w.prompts.bpNode, { v: by }), `f = (x ${s > 0 ? "+" : "-"} y)\\, z, \\quad ${given([["x", x], ["y", y], ["z", z]])}`, v, [...head, last]);
      }
      const by = r.pick(["x", "y", "z"] as const);
      const v = by === "x" ? y : by === "y" ? x : 2 * z;
      const last = by === "z" ? `${d("f", "z")} = 2z = ${v}` : `${d("f", by)} = ${d("f", "p")} \\cdot ${d("p", by)} = 1 \\cdot ${by === "x" ? "y" : "x"} = ${v}`;
      return out(fill(w.prompts.bpNode, { v: by }), `f = x y + z^2, \\quad ${given([["x", x], ["y", y], ["z", z]])}`, v, [`p = x y = ${x * y}`, `f = p + z^2`, last]);
    }
    if (L === 2) {
      // A squared error L = (wx + b − y)²: ∂L/∂w = 2e·x, ∂L/∂b = 2e for the error e.
      let w0: number, x: number, b: number, y: number, e: number;
      do (w0 = r.nz(-4, 4)), (x = r.nz(-4, 4)), (b = r.int(-4, 4)), (y = r.int(-6, 6)), (e = w0 * x + b - y);
      while (e === 0);
      const by = r.pick(["w", "b"] as const);
      const v = by === "w" ? 2 * e * x : 2 * e;
      const steps = [`\\hat y = w x + b = ${w0 * x + b}`, `e = \\hat y - y = ${e}`, `${d("L", "e")} = 2e = ${2 * e}`, by === "w" ? `${d("L", "w")} = 2e \\cdot x = ${2 * e} \\cdot ${par(x)} = ${v}` : `${d("L", "b")} = 2e \\cdot 1 = ${v}`];
      return out(fill(w.prompts.bpLoss, { v: by }), `L = (w x + b - y)^2, \\quad ${given([["w", w0], ["x", x], ["b", b], ["y", y]])}`, v, steps, [{ id: "noTwo", a: num(v / 2) }]);
    }
    // h = ReLU(w₁x), ŷ = w₂h: the gradient reaches w₁ only when the ReLU is on (mostly it is).
    let w1: number, x: number, w2: number, y: number, e: number;
    do {
      (w1 = r.nz(-3, 3)), (x = r.nz(-3, 3)), (w2 = r.nz(-3, 3)), (y = r.int(-6, 6));
      if (w1 * x < 0 && r.next() < 0.5) w1 = -w1;
      e = w2 * Math.max(0, w1 * x) - y;
    } while (e === 0);
    const on = w1 * x > 0;
    const v = on ? 2 * e * w2 * x : 0;
    const steps = [
      `w_1 x = ${w1 * x}, \\quad h = \\operatorname{ReLU}(${w1 * x}) = ${Math.max(0, w1 * x)}`,
      `\\hat y = w_2 h = ${w2 * Math.max(0, w1 * x)}, \\quad ${d("L", "\\hat y")} = 2(\\hat y - y) = ${2 * e}`,
      `${d("L", "h")} = ${2 * e} \\cdot w_2 = ${2 * e * w2}`,
      on ? `${d("L", "w_1")} = ${d("L", "h")} \\cdot 1 \\cdot x = ${2 * e * w2} \\cdot ${par(x)} = ${v}` : `w_1 x < 0: \\ ${d("L", "w_1")} = ${d("L", "h")} \\cdot 0 \\cdot x = 0`,
    ];
    const traps: Trap[] = on ? [{ id: "noTwo", a: num(v / 2) }] : [{ id: "reluOff", a: num(2 * e * w2 * x) }];
    return out(w.prompts.bpRelu, given([["w_1", w1], ["x", x], ["w_2", w2], ["y", y]]), v, steps, traps);
  },

  softmax(r, L, w) {
    // Three classes' scores, whole numbers from −2 to 4 and at most 4 apart; p_k = e^{z_k} / Σ e^{z_j}.
    let zs: number[];
    do zs = [r.int(-2, 4), r.int(-2, 4), r.int(-2, 4)];
    while (Math.max(...zs) - Math.min(...zs) > 4);
    const S = zs.reduce((s, z) => s + Math.exp(z), 0);
    const p = zs.map((z) => Math.exp(z) / S);
    const q = `z = (${zs.join(", ")})`;
    const sum = zs.map((z) => `e^{${z}}`).join(" + ");
    const pTex = (k: number) => `p_${k + 1} = \\frac{e^{${zs[k]}}}{${sum}} \\approx ${dp(p[k], 4)}`;
    const at3 = (v: number) => ({ answer: num(v, 0.00051), show: dp(v, 3), plain: dp(v, 3), format: "dp3" as const });
    let k: number;
    do k = r.int(0, 2);
    while (p[k] < 0.01);
    if (L === 1) return { prompt: fill(w.prompts.smProb, { k: k + 1 }), q, ...at3(p[k]), steps: [pTex(k)] };
    if (L === 2) return { prompt: fill(w.prompts.smLoss, { k: k + 1 }), q, ...at3(-Math.log(p[k])), steps: [pTex(k), `L = -\\ln p_${k + 1} \\approx ${dp(-Math.log(p[k]), 3)}`] };
    // ∂L/∂z_i = p_i − [i is the right class].
    const i = r.next() < 0.5 ? k : (k + r.int(1, 2)) % 3;
    const v = p[i] - (i === k ? 1 : 0);
    const traps: Trap[] = i === k && Math.abs(p[i] - 0.5) > 0.002 ? [{ id: "noMinusOne", a: num(p[i], 0.00051) }] : [];
    return {
      prompt: fill(w.prompts.smGrad, { k: k + 1, i: i + 1 }),
      q,
      ...at3(v),
      answer: { ...num(v, 0.00051), traps },
      steps: [pTex(i), `\\frac{\\partial L}{\\partial z_${i + 1}} = p_${i + 1} - ${i === k ? 1 : 0} \\approx ${dp(v, 3)}`],
    };
  },

  overfitting(r, L, w) {
    const r1 = (v: number) => Math.round(v * 10) / 10;
    if (L === 1) {
      // Three models: one fits (both errors low, close), one overfits (train lowest, test high), one underfits (both high).
      const good = r1(r.int(30, 60) / 10);
      const goodTest = r1(good + r.int(5, 15) / 10);
      const overTrain = r1(r.int(2, 15) / 10);
      const overTest = r1(goodTest + r.int(20, 60) / 10);
      const underTrain = r1(goodTest + r.int(30, 60) / 10);
      const underTest = r1(underTrain + r.int(0, 15) / 10);
      const models = [[good, goodTest], [overTrain, overTest], [underTrain, underTest]];
      const order = [0, 1, 2];
      for (let i = 2; i > 0; i--) {
        const j = r.int(0, i);
        [order[i], order[j]] = [order[j], order[i]];
      }
      const ask = r.pick(["over", "under"] as const);
      const names = ["A", "B", "C"];
      const right = order.indexOf(ask === "over" ? 1 : 2);
      const cols = order.map((m) => models[m]);
      const options = names.map((n) => ({ text: n, plain: n, tex: "" }));
      return {
        prompt: ask === "over" ? w.prompts.fitOver : w.prompts.fitUnder,
        q: errTable("", names.map((n) => `\\mathrm{${n}}`), [["E_{\\mathrm{train}}", cols.map((c) => c[0])], ["E_{\\mathrm{test}}", cols.map((c) => c[1])]]),
        answer: { k: "pick", options, right },
        show: `\\mathrm{${names[right]}}: \\ E_{\\mathrm{train}} = ${cols[right][0]}, \\ E_{\\mathrm{test}} = ${cols[right][1]}`,
        plain: names[right],
        format: "pick",
        steps: cols.map((c, j) => `\\mathrm{${names[j]}}: \\ ${c[1]} - ${c[0]} = ${r1(c[1] - c[0])}`),
      };
    }
    if (L === 2) {
      // Validation error is lowest at d*, training error keeps falling: choose d*, not the last degree.
      const n = r.pick([6, 7] as const);
      const best = r.int(2, n - 2);
      const m = r.int(20, 40) / 10;
      const s = r.pick([0.6, 0.8, 1, 1.2] as const);
      const degrees = Array.from({ length: n }, (_, i) => i + 1);
      const val = degrees.map((dg) => r1(m + (dg - best) ** 2 * s + r.int(0, 3) / 10));
      const train = degrees.map((dg) => Math.round(m * 1.05 * 0.62 ** (dg - 1) * 100) / 100);
      return {
        prompt: fill(w.prompts.fitDegree, { n }),
        q: errTable("d", degrees, [["E_{\\mathrm{train}}", train], ["E_{\\mathrm{val}}", val]]),
        answer: { ...num(best), traps: [{ id: "trainError", a: num(n), vars: { d: n } }] },
        show: `d = ${best}`,
        plain: String(best),
        format: "number",
        steps: [`E_{\\mathrm{val}}(${best}) = ${val[best - 1]} = \\min E_{\\mathrm{val}}`],
      };
    }
    // Early stopping: training stops after `pat` epochs in a row without a new lowest validation loss.
    const pat = r.pick([2, 3] as const);
    const best = r.int(4, 10 - pat - 1);
    const vals: number[] = [];
    let low = r.int(150, 250) / 100;
    vals.push(low);
    // A bump shorter than the patience before the best, so it doesn't stop there.
    const bumpAt = r.int(2, best - 2);
    const bumpLen = r.int(1, pat - 1);
    for (let ep = 2; ep <= best; ep++) {
      if (ep >= bumpAt && ep < bumpAt + bumpLen && ep < best) vals.push(Math.round((low + r.int(1, 8) / 100) * 100) / 100);
      else vals.push((low = Math.round((low - r.int(3, 15) / 100) * 100) / 100));
    }
    for (let ep = best + 1; ep <= 10; ep++) vals.push(Math.round((low + r.int(1, 9) / 100) * 100) / 100);
    // Lower again after it stopped: what it never sees.
    vals[9] = Math.round((low - r.int(1, 5) / 100) * 100) / 100;
    let stop = 0;
    let since = 0;
    let min = Infinity;
    for (let ep = 1; ep <= 10 && !stop; ep++) {
      if (vals[ep - 1] < min) (min = vals[ep - 1]), (since = 0);
      else if (++since === pat) stop = ep;
    }
    const at = vals.indexOf(min) + 1;
    return {
      prompt: fill(w.prompts.fitStop, { p: pat }),
      q: errTable("t", vals.map((_, i) => i + 1), [["E_{\\mathrm{val}}", vals]]),
      answer: { ...num(stop), traps: [{ id: "bestEpoch", a: num(at), vars: { b: at, p: pat } }] },
      show: `t = ${stop}`,
      plain: String(stop),
      format: "number",
      steps: [`\\min E_{\\mathrm{val}} = ${min} \\ (t = ${at})`, `t = ${at} + ${pat} = ${stop}`],
    };
  },

  precision(r, L, w) {
    const T = (k: string) => `\\mathrm{${k}}`;
    const cm = (tp: number, fn: number, fp: number, tn: number) =>
      `\\begin{array}{c|cc} & \\hat y = 1 & \\hat y = 0 \\\\ \\hline y = 1 & ${tp} & ${fn} \\\\ y = 0 & ${fp} & ${tn} \\end{array}`;
    const asked = (ask: "P" | "R", tp: number, fp: number, fn: number, prompt: string, q: string, more: string[] = []) => {
      const v = fr(tp, tp + (ask === "P" ? fp : fn));
      const other = fr(tp, tp + (ask === "P" ? fn : fp));
      const traps: Trap[] = fp !== fn ? [{ id: "swappedPR", a: num(other.toNumber()) }] : [];
      const formula = ask === "P" ? `P = \\frac{${T("TP")}}{${T("TP")} + ${T("FP")}} = \\frac{${tp}}{${tp} + ${fp}}` : `R = \\frac{${T("TP")}}{${T("TP")} + ${T("FN")}} = \\frac{${tp}}{${tp} + ${fn}}`;
      return { prompt, q, answer: { ...num(v.toNumber(), 1e-9, { lowest: true }), traps }, show: v.tex(), plain: plainFrac(v), format: "fraction" as const, steps: [...more, `${formula} = ${v.tex()}`] };
    };
    if (L < 3) {
      const [tp, fn, fp, tn] = [r.int(10, 60), r.int(2, 30), r.int(2, 30), r.int(20, 150)];
      const q = cm(tp, fn, fp, tn);
      const ask = r.pick(["P", "R"] as const);
      if (L === 1) return asked(ask, tp, fp, fn, ask === "P" ? w.prompts.prPrecision : w.prompts.prRecall, q);
      // F1, the harmonic mean of P and R: 2TP / (2TP + FP + FN).
      const v = fr(2 * tp, 2 * tp + fp + fn);
      return {
        prompt: w.prompts.prF1,
        q,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        steps: [`P = ${fr(tp, tp + fp).tex()}, \\quad R = ${fr(tp, tp + fn).tex()}`, `F_1 = \\frac{2PR}{P + R} = \\frac{2 \\cdot ${tp}}{2 \\cdot ${tp} + ${fp} + ${fn}} = ${v.tex()}`],
      };
    }
    // Eight examples' scores and classes; predict 1 when the score is at least t.
    const t = r.pick([0.3, 0.4, 0.5, 0.6, 0.7] as const);
    let ex: { s: number; y: number }[], tp: number, fp: number, fn: number;
    do {
      const scores = new Set<number>();
      while (scores.size < 8) {
        const s = r.int(1, 19) * 5;
        if (s !== t * 100) scores.add(s);
      }
      // Higher scores are more often class 1, as from a classifier that is better than chance.
      ex = [...scores].sort((a, b) => b - a).map((s) => ({ s: s / 100, y: r.next() < 0.15 + 0.7 * (s / 100) ? 1 : 0 }));
      tp = ex.filter((e) => e.s >= t && e.y === 1).length;
      fp = ex.filter((e) => e.s >= t && e.y === 0).length;
      fn = ex.filter((e) => e.s < t && e.y === 1).length;
    } while (tp === 0 || fp === 0 || fn === 0 || fp === fn);
    const ask = r.pick(["P", "R"] as const);
    const q = errTable("s", ex.map((e) => e.s), [["y", ex.map((e) => e.y)]]);
    return asked(ask, tp, fp, fn, fill(ask === "P" ? w.prompts.prThreshP : w.prompts.prThreshR, { t }), q, [`s \\ge ${t}: \\ ${T("TP")} = ${tp}, \\ ${T("FP")} = ${fp}; \\quad s < ${t}: \\ ${T("FN")} = ${fn}`]);
  },

  clustering(r, L, w) {
    const cell = () => ({ x: r.int(0, 8), y: r.int(0, 8) });
    if (L === 1) {
      // k-NN: four points of each class, P somewhere among them, every squared distance from P different.
      const k = r.pick([3, 5] as const);
      let P: { x: number; y: number }, dots: Dot[];
      do {
        P = { x: r.int(2, 6), y: r.int(2, 6) };
        dots = [];
        while (dots.length < 8) {
          const p = cell();
          if ((p.x !== P.x || p.y !== P.y) && !dots.some((d) => d.x === p.x && d.y === p.y)) dots.push({ ...p, c: dots.length < 4 ? 0 : 1 });
        }
      } while (new Set(dots.map((d) => sq(d, P))).size < 8);
      const near = [...dots].sort((a, b) => sq(a, P) - sq(b, P)).slice(0, k);
      const votesA = near.filter((d) => d.c === 0).length;
      const right = votesA * 2 > k ? 0 : 1;
      const options = ["A", "B"].map((n) => ({ text: n, plain: n, tex: "" }));
      return {
        prompt: fill(w.prompts.knnVote, { k }),
        q: `\\begin{array}{l} \\mathrm{A}: ${ptsTex(dots.slice(0, 4))} \\\\ \\mathrm{B}: ${ptsTex(dots.slice(4))} \\\\ P = (${P.x}, ${P.y}) \\end{array}`,
        pic: dotsPic(dots, [{ ...P, name: "P" }]),
        answer: { k: "pick", options, right },
        show: `${votesA} \\times \\mathrm{A}, \\ ${k - votesA} \\times \\mathrm{B}`,
        plain: options[right].plain,
        format: "pick",
        steps: near.map((d) => `d^2(P, (${d.x}, ${d.y})) = ${sq(d, P)} \\ \\ \\mathrm{${d.c === 0 ? "A" : "B"}}`),
      };
    }
    // k-means with two centres: each point joins the nearer, no point halfway, at least two points for each.
    let pts: { x: number; y: number }[], c1: { x: number; y: number }, c2: { x: number; y: number }, joins: number[];
    do {
      c1 = cell();
      c2 = cell();
      pts = [];
      while (pts.length < 6) {
        const p = cell();
        if (!pts.some((q) => q.x === p.x && q.y === p.y) && sq(p, c1) > 0 && sq(p, c2) > 0) pts.push(p);
      }
      joins = pts.map((p) => (sq(p, c1) < sq(p, c2) ? 1 : sq(p, c1) > sq(p, c2) ? 2 : 0));
    } while (joins.includes(0) || joins.filter((j) => j === 1).length < 2 || joins.filter((j) => j === 2).length < 2);
    const q = `\\begin{array}{l} ${ptsTex(pts)} \\\\ c_1 = (${c1.x}, ${c1.y}), \\ c_2 = (${c2.x}, ${c2.y}) \\end{array}`;
    const pic = dotsPic(pts.map((p) => ({ ...p, c: 0 })), [{ ...c1, name: "c₁" }, { ...c2, name: "c₂" }]);
    const assign = pts.map((p, i) => `(${p.x}, ${p.y}): \\ ${sq(p, c1)} ${joins[i] === 1 ? "<" : ">"} ${sq(p, c2)} \\to c_${joins[i]}`);
    if (L === 2) {
      const mine = pts.filter((_, i) => joins[i] === 1);
      const [mx, my] = [fr(mine.reduce((s, p) => s + p.x, 0), mine.length), fr(mine.reduce((s, p) => s + p.y, 0), mine.length)];
      return {
        prompt: w.prompts.kmCentroid,
        q,
        pic,
        answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 },
        show: `\\left(${mx.tex()}, ${my.tex()}\\right)`,
        plain: `(${plainFrac(mx)}; ${plainFrac(my)})`,
        format: "point",
        steps: [...assign, `c_1' = \\left(\\frac{${mine.map((p) => p.x).join(" + ")}}{${mine.length}}, \\frac{${mine.map((p) => p.y).join(" + ")}}{${mine.length}}\\right) = \\left(${mx.tex()}, ${my.tex()}\\right)`],
      };
    }
    const ds = pts.map((p) => Math.min(sq(p, c1), sq(p, c2)));
    const v = ds.reduce((s, x) => s + x, 0);
    return { prompt: w.prompts.kmInertia, q, pic, answer: num(v), show: String(v), plain: String(v), format: "number", steps: [...assign, `${ds.join(" + ")} = ${v}`] };
  },

  integers(r, L, w) {
    const par = (n: number) => (n < 0 ? `(${n})` : String(n));
    const minus = (n: number) => (n < 0 ? `−${-n}` : String(n));
    const out = (prompt: string, q: string, v: number, steps: string[], traps: Trap[] = []) => ({
      prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number" as const, steps,
    });
    if (L === 1) {
      const a = r.int(1, 20);
      const kind = r.int(0, 2);
      if (kind === 0) {
        // From below zero: −a ± b.
        const b = r.int(2, 20);
        const plus = r.next() < 0.5;
        const q = `${-a} ${plus ? "+" : "-"} ${b}`;
        return out(w.prompts.times, q, plus ? b - a : -a - b, [`${q} = ${plus ? b - a : -a - b}`]);
      }
      if (kind === 1) {
        // Past zero: a − b with b > a.
        const b = a + r.int(1, 12);
        return out(w.prompts.times, `${a} - ${b}`, a - b, [`${a} - ${b} = -(${b} - ${a}) = ${a - b}`]);
      }
      const b = r.int(1, 20);
      return out(w.prompts.times, `${a} + (${-b})`, a - b, [`${a} + (${-b}) = ${a} - ${b} = ${a - b}`]);
    }
    if (L === 2) {
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [a, b] = [r.nz(-15, 15), r.int(2, 15)];
        const q = `${a} - (${-b})`;
        return out(w.prompts.times, q, a + b, [`${q} = ${a} + ${b} = ${a + b}`], [{ id: "subNeg", a: num(a - b), vars: { b } }]);
      }
      if (kind === 1) {
        const [a, b] = [r.int(-12, 8), r.int(3, 15)];
        const rise = r.next() < 0.5;
        const v = rise ? a + b : a - b;
        return out(fill(rise ? w.prompts.intRise : w.prompts.intFall, { a: minus(a), b }), "", v, [`${a} ${rise ? "+" : "-"} ${b} = ${v}`]);
      }
      const [a, b] = [-r.int(2, 15), r.int(1, 20)];
      return out(fill(w.prompts.intDiff, { a: minus(a), b }), "", b - a, [`${b} - (${a}) = ${b} + ${-a} = ${b - a}`], [{ id: "subNeg", a: num(b + a), vars: { b: -a } }]);
    }
    const kind = r.int(0, 2);
    let [a, b] = [r.int(2, 12) * r.sign(), r.int(2, 12) * r.sign()];
    if (a > 0 && b > 0) a = -a;
    if (kind === 0) return out(w.prompts.times, `${a} \\times ${par(b)}`, a * b, [`${a} \\times ${par(b)} = ${a * b}`]);
    if (kind === 1) return out(w.prompts.times, `${a * b} \\div ${par(b)}`, a, [`${a * b} \\div ${par(b)} = ${a}`]);
    [a, b] = [r.int(2, 9) * r.sign(), r.int(2, 9) * r.sign()];
    const c = r.int(2, 15);
    const q = `${a} \\times ${par(b)} - (${-c})`;
    return out(w.prompts.times, q, a * b + c, [`${q} = ${a * b} + ${c} = ${a * b + c}`], [{ id: "subNeg", a: num(a * b - c), vars: { b: c } }]);
  },

  compare(r, L, w) {
    const out = (a: string, b: string, sign: CompareSign, more: Partial<Omit<Exercise, "skill" | "level" | "seed">>, naive?: Trap) => signExercise(w, a, b, sign, more, naive ? [naive] : []);
    const swap = r.next() < 0.5;
    /** The pair in a random order: [first, second] and whether they were swapped. */
    const order = <T>(x: T, y: T): [T, T] => (swap ? [y, x] : [x, y]);
    if (L === 1) {
      const a = r.int(0, 10);
      const b = r.next() < 0.2 ? a : r.int(0, 10);
      const t = towersSvg({ a, b }, false);
      return out(String(a), String(b), compareSign(a, b), {
        pic: { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${t.body}</g>`, h: t.h, w: t.w },
        solution: { kind: "compare", spec: { a, b } },
      });
    }
    if (L === 2) {
      const kind = r.next() < 0.125 ? 3 : r.int(0, 2);
      if (kind === 3) {
        const a = r.int(10, 999);
        return out(String(a), String(a), "=", { steps: [`${a} = ${a}`] });
      }
      if (kind === 2) {
        // Fewer digits but a bigger first digit: 98 and 102.
        const n = r.int(1, 2);
        const short = r.int(6, 9) * 10 ** n + r.int(0, 10 ** n - 1);
        const long = r.int(1, 3) * 10 ** (n + 1) + r.int(0, 10 ** (n + 1) - 1);
        const [a, b] = order(short, long);
        const sign = compareSign(a, b);
        const steps = [`${short} < ${10 ** (n + 1)} \\le ${long}`, `${a} ${sign} ${b}`];
        return out(String(a), String(b), sign, { steps }, { id: "firstDigit", a: { k: "sign", v: FLIP_SIGN[sign] }, vars: { big: long, k: n + 2, small: short, j: n + 1 } });
      }
      // The same number of digits, differing in one place (or two digits swapped round).
      const n = r.int(2, 3);
      const digits = [r.int(1, 9), ...Array.from({ length: n - 1 }, () => r.int(0, 9))];
      const other = [...digits];
      if (kind === 1 && digits[1] !== 0 && digits[1] !== digits[0]) [other[0], other[1]] = [digits[1], digits[0]];
      else {
        const p = r.int(0, n - 1);
        do other[p] = r.int(p === 0 ? 1 : 0, 9);
        while (other[p] === digits[p]);
      }
      const [x, y] = [Number(digits.join("")), Number(other.join(""))];
      const [a, b] = order(x, y);
      const sign = compareSign(a, b);
      const parts = (v: number) => String(v).split("").map((d, i) => Number(d) * 10 ** (n - 1 - i));
      const at = parts(a).findIndex((v, i) => v !== parts(b)[i]);
      const steps = [`${a} = ${parts(a).join(" + ")}`, `${b} = ${parts(b).join(" + ")}`, `${parts(a)[at]} ${sign} ${parts(b)[at]} \\;\\Rightarrow\\; ${a} ${sign} ${b}`];
      return out(String(a), String(b), sign, { steps });
    }
    const kind = r.int(0, 2);
    if (kind === 0) {
      // Decimals: 0.5 and 0.45, where more digits after the point look bigger.
      const whole = r.int(0, 3);
      const t = r.int(2, 9);
      const pick = r.next();
      const h = pick < 0.5 ? r.int(Math.max(t + 1, 10), 10 * t - 1) : pick < 0.7 ? 10 * t : r.int(10 * t + 1, 10 * t + 9);
      const [x, y] = [`${whole}.${t}`, `${whole}.${String(h).padStart(2, "0")}`];
      const [a, b] = order(x, y);
      const [va, vb] = order(10 * t, h);
      const sign = compareSign(va, vb);
      const [na, nb] = order(t, h);
      const two = (v: string) => Number(v).toFixed(2);
      const steps = [...(a !== two(a) ? [`${a} = ${two(a)}`] : []), ...(b !== two(b) ? [`${b} = ${two(b)}`] : []), `${two(a)} ${sign} ${two(b)}`];
      return out(a, b, sign, { steps }, { id: "longerDecimal", a: { k: "sign", v: compareSign(na, nb) }, vars: { a: two(a), b: two(b) } });
    }
    if (kind === 1) {
      // Negative numbers: further from zero is smaller.
      let x: number;
      let y: number;
      if (r.next() < 0.7) {
        x = -r.int(1, 15);
        do y = -r.int(1, 15);
        while (y === x);
      } else {
        x = -r.int(3, 15);
        y = r.int(1, -x - 1);
      }
      const [a, b] = order(x, y);
      const sign = compareSign(a, b);
      const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
      const steps = [hi < 0 ? `${lo} = ${hi} - ${hi - lo}` : `${lo} < 0 < ${hi}`, `${a} ${sign} ${b}`];
      return out(String(a), String(b), sign, { steps }, { id: "negativeSize", a: { k: "sign", v: compareSign(Math.abs(a), Math.abs(b)) }, vars: { small: minusSign(String(lo)), big: minusSign(String(hi)) } });
    }
    // Fractions: the same top, the same bottom, or neither (then over a common bottom).
    const pick = r.next();
    let [n1, d1, n2, d2] = [0, 0, 0, 0];
    if (pick < 0.4) {
      n1 = n2 = r.int(1, 4);
      d1 = r.int(n1 + 1, 12);
      do d2 = r.int(n1 + 1, 12);
      while (d2 === d1);
    } else if (pick < 0.6) {
      d1 = d2 = r.int(5, 12);
      n1 = r.int(1, d1 - 1);
      do n2 = r.int(1, d1 - 1);
      while (n2 === n1);
    } else {
      d1 = r.int(2, 9);
      do d2 = r.int(2, 9);
      while (d2 === d1);
      [n1, n2] = [r.int(1, d1 - 1), r.int(1, d2 - 1)];
    }
    const [[an, ad], [bn, bd]] = order([n1, d1], [n2, d2]);
    const sign = compareSign(an * bd, bn * ad);
    const lcd = (ad * bd) / gcd(ad, bd);
    const [ka, kb] = [lcd / ad, lcd / bd];
    const steps =
      ad === bd
        ? [`${an} ${sign} ${bn} \\;\\Rightarrow\\; ${fracTex(an, ad)} ${sign} ${fracTex(bn, bd)}`]
        : [`${fracTex(an, ad)} = ${fracTex(an * ka, lcd)}, \\quad ${fracTex(bn, bd)} = ${fracTex(bn * kb, lcd)}`, `${fracTex(an * ka, lcd)} ${sign} ${fracTex(bn * kb, lcd)}`];
    const naive: Trap | undefined =
      an === bn ? { id: "biggerBottom", a: { k: "sign", v: compareSign(ad, bd) }, vars: { n: an, d: Math.max(ad, bd), e: Math.min(ad, bd) } } : undefined;
    return out(fracTex(an, ad), fracTex(bn, bd), sign, { steps }, naive);
  },

  compareFractions(r, L, w) {
    const swap = r.next() < 0.5;
    const tex = (f: Fraction) => fracTex(f.n, f.d);
    const plain = (f: Fraction) => `${f.n}/${f.d}`;
    /** The pair in a random order, with the bars as the worked solution (and under the question when easy). */
    const ask = (x: Fraction, y: Fraction, steps: (a: Fraction, b: Fraction, sign: CompareSign) => string[], extra: { cut?: number; half?: boolean } = {}) => {
      const [a, b] = swap ? [y, x] : [x, y];
      const sign = fracSign(a, b);
      const spec: FractionBarsSpec = { a, b, ...extra, steps: steps(a, b, sign) };
      const [big, small] = sign === "<" ? [b, a] : [a, b];
      const same = samePieces(a, b);
      // The known mistakes, each with the sign it gives: a bigger bottom read as bigger, two fractions the same
      // number of pieces short of a whole read as equal, and the tops compared without the bottoms.
      const naive: Trap[] = [];
      if (a.n === b.n && a.d !== b.d) naive.push({ id: "biggerBottom", a: { k: "sign", v: compareSign(a.d, b.d) }, vars: { n: a.n, d: Math.max(a.d, b.d), e: Math.min(a.d, b.d) } });
      if (a.d - a.n === b.d - b.n && a.d !== b.d) naive.push({ id: "sameGap", a: { k: "sign", v: "=" }, vars: { big: plain(big), small: plain(small), g: big.d - big.n, d: big.d, e: small.d } });
      if (a.d !== b.d && a.n !== b.n) naive.push({ id: "biggerTop", a: { k: "sign", v: compareSign(a.n, b.n) }, vars: { a: plain(a), b: plain(b), x: same.a, y: same.b, d: same.d } });
      const pic = L === 1 ? fractionBarsSvg(spec, false) : null;
      return signExercise(w, tex(a), tex(b), sign, {
        ...(pic ? { pic: { svg: (px: number, py: number) => `<g transform="translate(${r2(px)} ${r2(py)})">${pic.body}</g>`, h: pic.h, w: pic.w } } : {}),
        solution: { kind: "fractionBars", spec },
      }, naive);
    };
    const final = (a: Fraction, b: Fraction, sign: CompareSign) => `${tex(a)} ${sign} ${tex(b)}`;
    /** Over the lowest common bottom: 2/3 and 3/4 as 8/12 and 9/12. */
    const common = (a: Fraction, b: Fraction, sign: CompareSign) => {
      const s = samePieces(a, b);
      const [x, y] = [{ n: s.a, d: s.d }, { n: s.b, d: s.d }];
      return [
        [a, x], [b, y],
      ].filter(([f, g]) => f.d !== g.d).map(([f, g]) => `${tex(f)} = ${tex(g)}`).concat(`${tex(x)} ${sign} ${tex(y)} \\;\\Rightarrow\\; ${final(a, b, sign)}`);
    };
    // The bars cut into the same pieces while the pieces are big enough to see in the picture.
    const cutFor = (a: Fraction, b: Fraction) => {
      const d = samePieces(a, b).d;
      return d <= 24 ? { cut: d } : {};
    };
    const distinct = (lo: number, hi: number, not: number) => {
      let v: number;
      do v = r.int(lo, hi);
      while (v === not);
      return v;
    };
    if (L === 1) {
      if (r.next() < 0.7) {
        // The same bottom: the one with more pieces is bigger.
        const d = r.int(3, 10);
        const n = r.int(1, d - 1);
        const x = { n, d };
        const y = { n: distinct(1, d - 1, n), d };
        return ask(x, y, (a, b, sign) => [`${a.n} ${sign} ${b.n} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
      }
      // One piece each: the more pieces the whole is cut into, the smaller each one.
      const d = r.int(2, 8);
      return ask({ n: 1, d }, { n: 1, d: distinct(2, 8, d) }, (a, b, sign) => [`${a.d} ${FLIP_SIGN[sign]} ${b.d} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
    }
    if (L === 2) {
      const kind = r.next();
      if (kind < 0.35) {
        // The same top: the smaller pieces make the smaller fraction.
        const n = r.int(2, 5);
        const d = r.int(n + 1, 12);
        return ask({ n, d }, { n, d: distinct(n + 1, 12, d) }, (a, b, sign) => [`${a.d} ${FLIP_SIGN[sign]} ${b.d} \\;\\Rightarrow\\; ${final(a, b, sign)}`]);
      }
      if (kind < 0.7) {
        // One below a half and one above.
        const d = r.int(3, 12);
        const e = r.int(3, 12);
        const lo = { n: r.int(1, Math.ceil(d / 2) - 1), d };
        const hi = { n: r.int(Math.floor(e / 2) + 1, e - 1), d: e };
        const halfStep = (f: Fraction) => `2 \\times ${f.n} ${compareSign(2 * f.n, f.d)} ${f.d} \\;\\Rightarrow\\; ${tex(f)} ${compareSign(2 * f.n, f.d)} \\frac{1}{2}`;
        return ask(lo, hi, (a, b, sign) => [halfStep(a), halfStep(b), `${tex(a)} ${sign} \\frac{1}{2} ${sign} ${tex(b)}`], { half: true });
      }
      // Both short of a whole by the same number of pieces: the smaller pieces leave less missing.
      const g = r.int(1, 2);
      const d = r.int(g + 2, 10);
      const e = distinct(g + 2, 10, d);
      return ask({ n: d - g, d }, { n: e - g, d: e }, (a, b, sign) => [
        `1 - ${tex(a)} = ${fracTex(a.d - a.n, a.d)}, \\quad 1 - ${tex(b)} = ${fracTex(b.d - b.n, b.d)}`,
        `${fracTex(a.d - a.n, a.d)} ${FLIP_SIGN[sign]} ${fracTex(b.d - b.n, b.d)} \\;\\Rightarrow\\; ${final(a, b, sign)}`,
      ]);
    }
    if (r.next() < 0.2) {
      // The same amount cut two ways.
      const d = r.int(2, 4);
      const n = r.int(1, d - 1);
      const k = r.int(1, Math.floor(12 / d));
      const m = distinct(1, Math.floor(12 / d), k);
      const x = { n: n * k, d: d * k };
      const y = { n: n * m, d: d * m };
      return ask(x, y, common, cutFor(x, y));
    }
    // Different bottoms: over the lowest common bottom.
    let x: Fraction;
    let y: Fraction;
    do {
      const d = r.int(3, 12);
      const e = distinct(3, 12, d);
      x = { n: r.int(1, d - 1), d };
      y = { n: r.int(1, e - 1), d: e };
    } while (x.n * y.d === y.n * x.d);
    return ask(x, y, common, cutFor(x, y));
  },

  order(r, L, w) {
    const form = r.pick(ORDER_FORMS[L]);
    let src = "";
    let tree: OrderNode = { v: 0 };
    let lines: OrderNode[] = [];
    for (let tries = 0; ; tries++) {
      src = form.replace(/[a-d]/g, () => String(r.int(2, L === 1 ? 12 : 9)));
      tree = orderTree(src, "right");
      lines = [tree];
      while ("op" in lines.at(-1)!) lines.push(orderStep(lines.at(-1)!));
      // Every number in every line whole (so every ÷ comes out exact) and a modest answer.
      const leaves = (n: OrderNode): number[] => ("v" in n ? [n.v] : [...leaves(n.l), ...leaves(n.r)]);
      const whole = lines.every((n) => leaves(n).every(Number.isInteger));
      if ((whole && Math.abs(orderValue(tree)) <= 999) || tries > 400) break;
    }
    const v = orderValue(tree);
    const traps: Trap[] = [];
    for (const mode of ["leftToRight", "mulBeforePow", "grouped"] as const) {
      if (mode === "mulBeforePow" && !/\* (\w|\([^()]*\)) \^/.test(form)) continue;
      const t = orderValue(orderTree(src, mode));
      if (Number.isFinite(t) && Math.abs(t - v) > 1e-9 && !traps.some((x) => x.a.k === "num" && Math.abs(x.a.v - t) < 1e-9)) traps.push({ id: mode, a: num(t) });
    }
    return {
      prompt: w.prompts.times,
      q: orderTex(tree),
      answer: { ...num(v), traps },
      show: String(v),
      plain: String(v),
      format: "number",
      steps: lines.map((n, i) => (i === 0 ? orderTex(n) : `= ${orderTex(n)}`)),
    };
  },

  rounding(r, L, w) {
    /** Rounding m/10^p to k places, with the traps the numbers allow; placeLost when the zeros hold places. */
    const rounded = (m: number, p: number, k: number, prompt: string) => {
      const want = roundM(m, p, k);
      const traps: Trap[] = [];
      const add = (id: MistakeId, x: number) => {
        if (Math.abs(x - want / 10 ** p) > 1e-9 && !traps.some((t) => t.a.k === "num" && Math.abs(t.a.v - x) < 1e-9)) traps.push({ id, a: num(x) });
      };
      add("truncated", cutM(m, p, k) / 10 ** p);
      add("doubleRound", stagesM(m, p, k) / 10 ** p);
      if (k < 0) add("placeLost", want / 10 ** (p - k));
      const shown = fmtM(want, p, k);
      return { prompt, q: "", answer: { ...num(want / 10 ** p), traps }, show: shown, plain: shown, format: "number" as const, steps: [`${fmtM(m, p)} \\approx ${shown}`] };
    };
    /** A mantissa whose dropped digits aren't exactly a half (where people disagree on which way to go). */
    const noTie = (lo: number, hi: number, p: number, k: number) => {
      for (;;) {
        const m = r.int(lo, hi);
        if (m % 10 ** (p - k) !== 10 ** (p - k) / 2 && m % 10) return m;
      }
    };
    if (L === 1) {
      if (r.next() < 0.5) {
        const k = r.pick([-1, -2, -3]);
        const m = noTie(1000, 99999, 0, k);
        return rounded(m, 0, k, fill(k === -1 ? w.prompts.roundTo10 : k === -2 ? w.prompts.roundTo100 : w.prompts.roundTo1000, { n: m }));
      }
      const k = r.pick([1, 2]);
      const m = noTie(1001, 99999, 3, k);
      return rounded(m, 3, k, fill(k === 1 ? w.prompts.roundDp1 : w.prompts.roundDp2, { n: fmtM(m, 3) }));
    }
    if (L === 2) {
      const kind = r.int(0, 3);
      if (kind === 0) {
        const s = r.int(1, 3);
        const prompt = (n: string) => (s === 1 ? fill(w.prompts.roundSf1, { n }) : fill(w.prompts.roundSf, { n, s }));
        if (r.next() < 0.5) {
          const digits = r.int(4, 6);
          const m = noTie(10 ** (digits - 1) + 1, 10 ** digits - 1, 0, s - digits);
          return rounded(m, 0, s - digits, prompt(String(m)));
        }
        // 0.0xxxx: the first significant figure is in the second decimal place.
        const m = noTie(1001, 9999, 5, 1 + s);
        return rounded(m, 5, 1 + s, prompt(fmtM(m, 5)));
      }
      if (kind === 1) {
        const mant = r.int(101, 999);
        const e = r.next() < 0.5 ? r.int(4, 8) : -r.int(2, 6);
        const n = (mant / 100) * 10 ** e;
        const text = e > 0 ? String(mant * 10 ** (e - 2)) : (mant / 100 / 10 ** -e).toFixed(2 - e);
        const m = tidy(mant / 100);
        return {
          prompt: fill(w.prompts.stdForm, { n: text }),
          q: "",
          answer: { ...num(n), std: true },
          show: `${m} \\times 10^{${e}}`,
          plain: `${m}*10^${e}`,
          format: "standard",
          steps: [`${text} = ${m} \\times 10^{${e}}`],
        };
      }
      if (kind === 2) {
        const [A, B, m1, m2] = [r.int(11, 99), r.int(11, 99), r.int(-6, 9), r.int(-6, 9)];
        let mant = (A * B) / 100;
        let e = m1 + m2;
        if (mant >= 10) [mant, e] = [mant / 10, e + 1];
        const m = tidy(mant);
        return {
          prompt: w.prompts.stdMul,
          q: `(${tidy(A / 10)} \\times 10^{${m1}}) \\times (${tidy(B / 10)} \\times 10^{${m2}})`,
          answer: { ...num(Number(m) * 10 ** e), std: true },
          show: `${m} \\times 10^{${e}}`,
          plain: `${m}*10^${e}`,
          format: "standard",
          steps: [`${tidy(A / 10)} \\times ${tidy(B / 10)} = ${tidy((A * B) / 100)}`, `10^{${m1}} \\times 10^{${m2}} = 10^{${m1 + m2}}`, `= ${m} \\times 10^{${e}}`],
        };
      }
      // Estimating: each number to 1 significant figure, then multiply.
      const [x, y] = [r.int(110, 989) / 100, r.int(110, 989) * 10 ** r.int(-1, 1)];
      const sf1 = (v: number) => {
        const e = Math.floor(Math.log10(v));
        return [Math.round(v / 10 ** e) * 10 ** e, Math.floor(v / 10 ** e) * 10 ** e];
      };
      const [[x1, xc], [y1, yc]] = [sf1(x), sf1(y)];
      const v = Number((x1 * y1).toPrecision(12));
      const traps: Trap[] = [];
      const cut = Number((xc * yc).toPrecision(12));
      if (cut !== v) traps.push({ id: "truncated", a: num(cut) });
      return {
        prompt: w.prompts.estimate,
        q: `${tidy(x)} \\times ${tidy(y)}`,
        answer: { ...num(v), traps },
        show: tidy(v),
        plain: tidy(v),
        format: "number",
        steps: [`${tidy(x)} \\times ${tidy(y)} \\approx ${tidy(x1)} \\times ${tidy(y1)} = ${tidy(v)}`],
      };
    }
    if (r.next() < 0.7) {
      const prec = r.pick(["whole", "dp1", "ten"] as const);
      const unit = prec === "whole" ? 1 : prec === "dp1" ? 0.1 : 10;
      const x = prec === "whole" ? r.int(3, 200) : prec === "dp1" ? r.int(11, 999) / 10 : 10 * r.int(2, 60);
      const low = r.next() < 0.5;
      const v = Number((x + (low ? -unit / 2 : unit / 2)).toFixed(2));
      const p = prec === "whole" ? w.prompts.precWhole : prec === "dp1" ? w.prompts.precDp1 : w.prompts.precTen;
      const far = Number((x + (low ? -unit : unit)).toFixed(2));
      return {
        prompt: fill(low ? w.prompts.boundLow : w.prompts.boundHigh, { x: tidy(x), p }),
        q: "",
        answer: { ...num(v), traps: [{ id: "fullUnit", a: num(far), vars: { p } }] },
        show: tidy(v),
        plain: tidy(v),
        format: "number",
        steps: [`${tidy(x)} ${low ? "-" : "+"} \\frac{${tidy(unit)}}{2} = ${tidy(v)}`],
      };
    }
    const [n, x] = [r.int(3, 12), r.int(5, 40)];
    const v = n * (x + 0.5);
    return {
      prompt: fill(w.prompts.boundTotal, { n, x }),
      q: "",
      answer: { ...num(v), traps: [{ id: "fullUnit", a: num(n * (x + 1)), vars: { p: w.prompts.precWhole } }] },
      show: tidy(v),
      plain: tidy(v),
      format: "number",
      steps: [`${x} + 0.5 = ${x + 0.5}`, `${n} \\times ${x + 0.5} = ${tidy(v)}`],
    };
  },

  inequalities(r, L, w) {
    const RELS = ["<", "<=", ">", ">="] as const;
    /** x rel v as ends of the set. */
    const ends = (rel: string, v: number): [Bound | null, Bound | null] => (rel[0] === ">" ? [{ v, closed: rel === ">=" }, null] : [null, { v, closed: rel === "<=" }]);
    const result = (eq: string, q: string, lo: Bound | null, hi: Bound | null, flipped: boolean) => {
      const toggle = (b: Bound | null) => b && { ...b, closed: !b.closed };
      const traps: Trap[] = [{ id: "boundary", a: { k: "ineq", lo: toggle(lo), hi: toggle(hi) } }];
      // Not flipped: the ends swap sides (x > 4 for x < 4), each keeping its own sign.
      if (flipped) traps.unshift({ id: "noFlip", a: { k: "ineq", lo: hi, hi: lo } });
      return { prompt: w.prompts.ineqSolve, q, answer: { k: "ineq" as const, lo, hi, traps }, show: ineqTex(lo, hi), plain: ineqPlain(lo, hi), format: "inequality" as const, solution: { kind: "algebra" as const, spec: { topic: "inequality", eq, method: "factor" } } };
    };
    const side = (s: string) => T(s);
    if (L < 3) {
      const rel = r.pick(RELS);
      const x0 = r.nz(-9, 9);
      let left: string;
      let right: string;
      let coef: number;
      if (L === 1) {
        const a = r.int(2, 9);
        const b = r.nz(-15, 15);
        if (r.next() < 0.5) {
          [left, right, coef] = [polyStr([b, a]), String(a * x0 + b), a];
        } else {
          // ax + b rel cx + d, with c < a: no flip.
          const c = r.int(1, a - 1);
          [left, right, coef] = [polyStr([b, a]), polyStr([(a - c) * x0 + b, c]), a - c];
        }
      } else {
        const a = r.int(2, 9);
        const b = r.int(-12, 15);
        if (r.next() < 0.5) {
          // b − ax rel c
          [left, right, coef] = [polyStr([b, -a]), String(b - a * x0), -a];
        } else {
          const c = a + r.int(1, 5);
          [left, right, coef] = [polyStr([b, a]), polyStr([b + (a - c) * x0, c]), a - c];
        }
      }
      const final = coef < 0 ? FLIP[rel] : rel;
      const [lo, hi] = ends(final, x0);
      return result(`${left} ${rel} ${right}`, `${side(left)} ${REL_TEX[rel]} ${side(right)}`, lo, hi, coef < 0);
    }
    if (r.next() < 0.6) {
      const x1 = r.int(-8, 4);
      const x2 = x1 + r.int(2, 8);
      const a = r.int(2, 5) * (r.next() < 0.35 ? -1 : 1);
      const b = r.int(-9, 9);
      const [r1, r2] = [r.pick(["<", "<="] as const), r.pick(["<", "<="] as const)];
      const [L1, L2] = a > 0 ? [a * x1 + b, a * x2 + b] : [a * x2 + b, a * x1 + b];
      const lo = a > 0 ? { v: x1, closed: r1 === "<=" } : { v: x1, closed: r2 === "<=" };
      const hi = a > 0 ? { v: x2, closed: r2 === "<=" } : { v: x2, closed: r1 === "<=" };
      const mid = polyStr([b, a]);
      return result(`${L1} ${r1} ${mid} ${r2} ${L2}`, `${L1} ${REL_TEX[r1]} ${side(mid)} ${REL_TEX[r2]} ${L2}`, lo, hi, a < 0);
    }
    const [m, p, b] = [50 * r.int(4, 20), r.int(60, 95), r.int(15, 45)];
    const v = Math.floor((m - p) / b);
    return {
      prompt: fill(w.prompts.ineqWord, { m, p, b }),
      q: "",
      answer: num(v),
      show: String(v),
      plain: String(v),
      format: "number",
      solution: { kind: "algebra", spec: { topic: "inequality", eq: `${b}n + ${p} <= ${m}`, method: "factor" } },
    };
  },

};

/** A decimal that is really a simple fraction (gradients, values of derivatives) back to the fraction. */
function toFrac(v: number): Frac {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) return fr(n, d);
  }
  return fr(Math.round(v * 1e6), 1e6);
}

/** The exercise for a skill, level and seed: always the same one. */
export function exercise(skill: SkillId, level: Level, seed: number, w: PracticeWords): Exercise {
  exprMessages(w);
  const r = rngOf(seed);
  return { skill, level, seed, ...GENS[skill](r, level, w) };
}

// ---------- checking an answer ----------

/**
 * ok; or not, with why when the answer is sent back without counting (its form, unreadable), close when it is nearly
 * right, and mistake + hint when it is the answer a known mistake gives (still wrong: it counts as a miss).
 */
export type Verdict = { ok: boolean; why?: string; close?: boolean; mistake?: MistakeId; hint?: string };

const SAMPLES = [-2.71, -1.33, -0.62, 0.37, 0.91, 1.73, 2.29, 3.11, 0.17, 1.19, 2.63, -0.23, 4.37, 5.71, 7.13, -4.61];

/** "x = 2", "θ = 35°", "25%", "$4.05" → the bare value. */
const bare = (s: string) => s.trim().replace(/^[a-zA-Zθ]\w*\s*=\s*/, "").replace(/[%°$₾₽]/g, "").trim();

function value(s: string): number {
  const t = bare(s);
  const mixed = t.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]));
  const e = parseE(t);
  return evalE(e, NaN);
}
/**
 * Without the brackets around a whole list: "(2; 3)", "[76.2, 82.2)". Only a pair that encloses everything goes, so
 * the bracket closing sqrt(3) in "-4 + 2sqrt(3)" stays.
 */
function unwrap(s: string): string {
  let t = s.trim();
  while (/^[([{]/.test(t) && /[)\]}]$/.test(t)) {
    let depth = 0;
    let closesAt = -1;
    for (let i = 0; i < t.length && closesAt < 0; i++) {
      if ("([{".includes(t[i])) depth++;
      else if (")]}".includes(t[i]) && --depth === 0) closesAt = i;
    }
    if (closesAt !== t.length - 1) break;
    t = t.slice(1, -1).trim();
  }
  return t;
}
/** Split a list of values: on ";", or on ", " / "," / "and" / "or" between values when there is no decimal comma ambiguity. */
function parts(s: string): string[] {
  const t = unwrap(s);
  const ps = t.includes(";") ? t.split(";") : t.split(/,\s+|\s+(?:and|or)\s+|\s+(?:и|или)\s+|\s+(?:და|ან)\s+/);
  // "-4 ± 2sqrt(3)" is two values.
  return ps.map((p) => p.trim()).filter(Boolean).flatMap((p) => {
    const [a, b, ...rest] = p.split(/±|\+-|\+\/-/);
    return b === undefined || rest.length ? [p] : [`${a.trim()} - (${b.trim()})`, `${a.trim()} + (${b.trim()})`];
  });
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9 * Math.max(1, Math.abs(b));
/**
 * A matrix typed row by row: "1, 2; 3, 4" (rows split by ; or |, numbers by commas or spaces), or "[[1, 2], [3, 4]]".
 * Null when the rows can't be told apart.
 */
function matrixCells(s: string): string[][] | null {
  const t = unwrap(s);
  const rows = /^[[(]/.test(t) ? t.split(/[\])]\s*[,;]?\s*[[(]/).map((r) => r.replace(/^[[(]|[\])]$/g, "")) : t.split(/[;|\n]/);
  const cells = rows.map((r) => r.trim().split(/\s*,\s*|\s+/).filter(Boolean));
  return cells.length && cells.every((r) => r.length) ? cells : null;
}
function readMatrix(s: string): number[][] | null {
  const cells = matrixCells(s);
  const m = cells?.map((r) => r.map(value));
  return m && m.every((r) => r.every(Number.isFinite)) ? m : null;
}

/** The factors of a product, with nested products opened: 2·(3·5) → 2, 3, 5. */
const factorsOf = (e: E): E[] => (e.k === "mul" ? e.fs.flatMap(factorsOf) : [e]);

/** Every √n in the expression has n square-free, and no root is left in a denominator. */
function simplifiedSurd(e: E, inDen = false): boolean {
  switch (e.k) {
    case "pow": {
      const half = e.e.k === "num" && e.e.v.d === 2;
      if (half) {
        if (inDen) return false;
        if (e.b.k !== "num" || !e.b.v.isInt() || sqrtSplit(e.b.v).out.n !== 1) return false;
      }
      const negative = e.e.k === "num" && e.e.v.isNeg();
      return simplifiedSurd(e.b, inDen || negative);
    }
    case "add":
      return e.ts.every((t) => simplifiedSurd(t, inDen));
    case "mul":
      return factorsOf(e).every((f) => simplifiedSurd(f, inDen));
    default:
      return true;
  }
}
/** A product of linear factors with whole, coprime coefficients (and a number in front). */
function factored(e: E): boolean {
  const fs = factorsOf(e);
  if (fs.filter((f) => f.k !== "num").length < 2 && !(fs.length === 1 && e.k === "pow")) {
    // a single bracket only counts with a number or power in front: 3(x + 2), (x + 1)^2
    if (!(e.k === "mul" && fs.some((f) => f.k === "num"))) return false;
  }
  return fs.every((f) => {
    if (f.k === "num") return true;
    const base = f.k === "pow" && f.e.k === "num" && f.e.v.isInt() && f.e.v.n > 0 ? f.b : f;
    const p = toPoly(base);
    if (!p || p.length > 2 || p.every((c) => c.isZero())) return false;
    if (!p.every((c) => c.isInt())) return false;
    return p.reduce((g, c) => gcd(g, c.n), 0) === 1;
  });
}
/** No brackets left around a sum. */
function expanded(e: E): boolean {
  const sumInside = (x: E): boolean => x.k === "add" || (x.k === "mul" && x.fs.some(sumInside)) || (x.k === "pow" && sumInside(x.b));
  const terms = e.k === "add" ? e.ts : [e];
  return terms.every((t) => !(t.k === "mul" && t.fs.some(sumInside)) && !(t.k === "pow" && sumInside(t.b)));
}

/** "6.3e-4" and "6.3x10^4" as 6.3*10^(-4) and 6.3*10^4: read so only where standard form is asked for (e is Euler's number elsewhere). */
const stdText = (s: string) => s.replace(/(\d)\s*[eE]\s*([+-]?\d+)/g, "$1*10^($2)").replace(/(\d)\s*[xX×·]\s*10/g, "$1*10");
/** a × 10ⁿ with 1 ≤ |a| < 10. */
const isStandard = (s: string) => /^-?[1-9](\.\d+)?\*10\^\(?[+-]?\d+\)?$/.test(s.replace(/\s+/g, "").replace(/[−–]/g, "-"));
/** An answer that reads as an expression in a letter, where a number was asked for. */
function hasLetter(s: string): boolean {
  try {
    return Number.isFinite(evalE(parseE(bare(s)), 1.37));
  } catch {
    return false;
  }
}

const INF = /^\+?\s*(∞|inf(inity)?)$/i;
const NEG_INF = /^[-−]\s*(∞|inf(inity)?)$/i;
const FLIP: Record<Rel, Rel> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=" };
/** "x >= 4", "4 ≤ x", "-1 < x <= 3", "[4, ∞)", "(-2; 3]" as the ends of the set; null if it isn't an inequality. */
export function readIneq(src: string): { lo: Bound | null; hi: Bound | null } | null {
  try {
    return ineqEnds(src.trim());
  } catch {
    return null;
  }
}
function ineqEnds(t: string): { lo: Bound | null; hi: Bound | null } | null {
  if (/^[[(].*[\])]$/.test(t) && !/[<>=≤≥]/.test(t)) {
    const inner = t.slice(1, -1);
    const ends = inner.split(inner.includes(";") ? ";" : ",").map((x) => x.trim());
    if (ends.length !== 2) return null;
    const lo = NEG_INF.test(ends[0]) ? null : { v: value(ends[0]), closed: t[0] === "[" };
    const hi = INF.test(ends[1]) ? null : { v: value(ends[1]), closed: t.at(-1) === "]" };
    if ((!lo && !hi) || [lo, hi].some((b) => b && !Number.isFinite(b.v))) return null;
    return { lo, hi };
  }
  const { parts, rels } = splitRel(t);
  const isVar = (p: string) => /^[a-z]$/i.test(p.trim());
  if (rels.includes("=")) return null;
  if (rels.length === 1) {
    const [l, r] = parts;
    const [side, rel] = isVar(l) ? [r, rels[0]] : isVar(r) ? [l, FLIP[rels[0]]] : [null, rels[0]];
    const v = side === null ? NaN : value(side);
    if (!Number.isFinite(v)) return null;
    return rel[0] === ">" ? { lo: { v, closed: rel === ">=" }, hi: null } : { lo: null, hi: { v, closed: rel === "<=" } };
  }
  if (rels.length !== 2 || !isVar(parts[1])) return null;
  const [a, b] = [value(parts[0]), value(parts[2])];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (rels.every((r) => r[0] === "<")) return { lo: { v: a, closed: rels[0] === "<=" }, hi: { v: b, closed: rels[1] === "<=" } };
  if (rels.every((r) => r[0] === ">")) return { lo: { v: b, closed: rels[1] === ">=" }, hi: { v: a, closed: rels[0] === ">=" } };
  return null;
}
const boundTex = (b: Bound, below: boolean) => (below ? (b.closed ? "\\le" : "<") : b.closed ? "\\ge" : ">");
/** x ≥ 4, −1 < x ≤ 3 in LaTeX. */
export function ineqTex(lo: Bound | null, hi: Bound | null, v = "x"): string {
  const n = (b: Bound) => toFrac(b.v).tex();
  if (lo && hi) return `${n(lo)} ${boundTex(lo, true)} ${v} ${boundTex(hi, true)} ${n(hi)}`;
  if (lo) return `${v} ${boundTex(lo, false)} ${n(lo)}`;
  return `${v} ${boundTex(hi!, true)} ${n(hi!)}`;
}
/** The same, typed: x >= 4, -1 < x <= 3. */
export function ineqPlain(lo: Bound | null, hi: Bound | null, v = "x"): string {
  const n = (b: Bound) => plainFrac(toFrac(b.v));
  const op = (b: Bound, below: boolean) => (below ? (b.closed ? "<=" : "<") : b.closed ? ">=" : ">");
  if (lo && hi) return `${n(lo)} ${op(lo, true)} ${v} ${op(hi, true)} ${n(hi)}`;
  if (lo) return `${v} ${op(lo, false)} ${n(lo)}`;
  return `${v} ${op(hi!, true)} ${n(hi!)}`;
}

/** Negating an expression, for the sign trap. */
const negE = (e: E): E => parseE(`-(${plainE(e)})`);
/** The question's traps, then "right size, wrong sign" unless the answer is 0 or one of them is already that. */
function trapsOf(a: Answer): Trap[] {
  const own = a.traps ?? [];
  const sign = ((): Answer | null => {
    if (a.k === "num") return a.v === 0 || own.some((t) => t.a.k === "num" && near(t.a.v, -a.v, a.tol)) ? null : { k: "num", v: -a.v, tol: a.tol, std: a.std };
    if (a.k === "set") {
      const neg = a.vs.map((v) => -v).sort((x, y) => x - y);
      const same = [...a.vs].sort((x, y) => x - y).every((v, i) => near(v, neg[i], a.tol));
      return same ? null : { k: "set", vs: neg, tol: a.tol };
    }
    if (a.k === "expr") {
      if (SAMPLES.every((x) => Math.abs(evalE(a.e, x)) < 1e-9 || !Number.isFinite(evalE(a.e, x)))) return null;
      return { k: "expr", e: negE(a.e), mode: a.mode === "plusC" ? "plusC" : undefined };
    }
    return null;
  })();
  return sign ? [...own, { id: "sign", a: sign }] : own;
}

/** What a student would type to give each of a question's own traps (for the tests and the dry run). */
export function trapInputs(ex: Exercise): { id: MistakeId; input: string }[] {
  return (ex.answer.traps ?? []).flatMap(({ id, a }) => {
    // A fraction as a student would write it (9/17, not 0.5294…).
    const f = a.k === "num" ? toFrac(a.v) : null;
    const input = a.k === "num" ? (f && f.d <= 1000 && Math.abs(f.toNumber() - a.v) < 1e-12 ? plainFrac(f) : String(a.v)) : a.k === "set" ? a.vs.join("; ") : a.k === "tuple" ? `(${a.vs.join(", ")})` : a.k === "expr" ? plainE(a.e) : a.k === "ineq" ? ineqPlain(a.lo, a.hi) : a.k === "sign" ? a.v : a.k === "poly" ? a.sample : a.k === "pin" ? encodePin(a.play, a.v) : a.k === "target" ? a.sample : a.k === "near" ? a.options[a.right].plain : a.k === "order" ? a.seq.map((i) => a.items[i].text).join(", ") : a.k === "shade" ? encodeShade(Array.from({ length: a.count }, (_, i) => i)) : a.k === "pick" ? a.options[a.right].plain : a.k === "divisors" ? a.right.join(", ") : a.k === "ratio" ? a.vs.join(" : ") : null;
    return input === null ? [] : [{ id, input }];
  });
}

export function check(ex: Exercise, input: string, w: PracticeWords): Verdict {
  exprMessages(w);
  const src = input.trim();
  if (!src) return { ok: false, why: w.reasons.empty };
  const v = judge(ex.answer, src, w);
  // A form message or a near miss says more than naming a mistake would.
  if (v.ok || v.why || v.close) return v;
  for (const t of trapsOf(ex.answer)) if (judge(t.a, src, w).ok) return { ok: false, mistake: t.id, hint: fill(w.mistakes[t.id], t.vars ?? {}) };
  return v;
}

/** The answer against one expected answer: no traps. */
function judge(a: Answer, input: string, w: PracticeWords): Verdict {
  const src = a.k === "num" && a.std ? stdText(input) : input;
  try {
    switch (a.k) {
      case "num": {
        const v = value(src);
        if (!Number.isFinite(v)) return { ok: false, why: fill(hasLetter(src) ? w.reasons.notNumber : w.reasons.unreadable, { s: input }) };
        // Standard form spans powers of ten, so it is compared relatively: 9 × 10⁻¹⁰ isn't 7.31 × 10⁻¹².
        if (a.std ? Math.abs(v - a.v) > 1e-9 * Math.abs(a.v) : !near(v, a.v, a.tol))
          return a.tol >= 0.0005 && near(v, a.v, a.tol * 20) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        const t = bare(src);
        if (a.std && !isStandard(t)) return { ok: false, close: true, why: w.reasons.notStandard };
        if (a.lowest) {
          const m = t.match(/(\d+)\s*\/\s*(\d+)\s*$/);
          if (m && gcd(Number(m[1]), Number(m[2])) !== 1) return { ok: false, close: true, why: w.reasons.notLowest };
        }
        // The right value in the wrong shape: a mixed number asked for as an improper fraction, or the other way.
        if (a.form === "improper" && !/^\d+\s*\/\s*\d+$/.test(src)) return { ok: false, close: true, why: w.reasons.notImproper };
        if (a.form === "mixed" && !/^\d+\s+\d+\s*\/\s*\d+$/.test(src)) return { ok: false, close: true, why: w.reasons.notMixed };
        if (a.surd && a.tol < 1e-6 && !simplifiedSurd(parseE(t))) return { ok: false, close: true, why: w.reasons.notSimplified };
        return { ok: true };
      }
      case "set":
      case "tuple": {
        let ps = parts(src);
        if (a.k === "tuple") {
          // "y = 3; x = 2" in any order.
          const names = a.names ?? ["x", "y", "z"].slice(0, a.vs.length);
          const named: (string | undefined)[] = ps.map((p) => p.match(/^\s*([a-z])\s*=/i)?.[1].toLowerCase());
          if (named.every((n) => n !== undefined && names.includes(n)) && new Set(named).size === ps.length) ps = names.map((n) => ps[named.indexOf(n)] ?? "");
        }
        const vs = ps.map(value);
        if (vs.some((v) => !Number.isFinite(v))) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        if (a.k === "tuple") {
          if (vs.every((v, i) => near(v, a.vs[i], a.tol))) return { ok: true };
          return a.tol >= 0.0005 && vs.every((v, i) => near(v, a.vs[i], a.tol * 20)) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        }
        const left = [...a.vs];
        for (const v of vs) {
          const i = left.findIndex((x) => near(v, x, a.tol));
          if (i < 0) return { ok: false };
          left.splice(i, 1);
        }
        return { ok: true };
      }
      case "expr": {
        let t = src.replace(/[′']/g, "");
        if (t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
        if (a.mode === "plusC") t = t.replace(/\+\s*[cC]\s*$/, "").replace(/^\s*[cC]\s*\+/, "");
        const e = parseE(t);
        let diff0: number | null = null;
        let compared = 0;
        for (const x of SAMPLES) {
          const u = evalE(e, x);
          const v = evalE(a.e, x);
          if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
          compared++;
          if (a.mode === "plusC") {
            diff0 ??= u - v;
            if (!near(u - v, diff0, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
          } else if (!near(u, v, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
        }
        if (compared < 4) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (a.mode === "factor" && !factored(e)) return { ok: false, close: true, why: w.reasons.notFactored };
        if (a.mode === "expand" && !expanded(e)) return { ok: false, close: true, why: w.reasons.notExpanded };
        return { ok: true };
      }
      case "primes": {
        const e = parseE(src.replace(/[·×]/g, "*"));
        const fs = factorsOf(e);
        let prod = 1;
        let allPrime = true;
        for (const f of fs) {
          const [b, k] = f.k === "num" ? [f.v, 1] : f.k === "pow" && f.b.k === "num" && f.e.k === "num" && f.e.v.isInt() ? [f.b.v, f.e.v.n] : [null, 0];
          if (!b || !b.isInt() || k < 1) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
          prod *= b.n ** k;
          if (!isPrime(b.n)) allPrime = false;
        }
        if (prod !== a.n) return { ok: false };
        return allPrime ? { ok: true } : { ok: false, close: true, why: fill(w.reasons.notPrime, { n: a.n }) };
      }
      case "sign": {
        const got = readSign(src);
        return got ? { ok: got === a.v } : { ok: false, why: w.reasons.notSign };
      }
      case "poly": {
        const v = judgePoly(a.play, src);
        return v.ok ? v : v.problem ? { ok: false, why: w.reasons.shape[v.problem] } : { ok: false };
      }
      case "shade": {
        const v = judgeShade(a.play, a.count, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: w.reasons.shading[v.problem] } : { ok: false, hint: fill(w.reasons.shading.count, { k: v.shaded }) };
      }
      case "order": {
        const v = judgeOrder(a.items, a.seq, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: fill(w.reasons.order[v.problem], { n: a.items.length }) };
        // Biggest first: the right idea the wrong way round, sent back — unless they are unit fractions, where it is
        // also the order of their bottoms, a slip the traps name.
        const unit = a.items.every((i) => i.n === 1);
        if (!unit && v.seq.every((i, k) => i === a.seq[a.seq.length - 1 - k])) return { ok: false, why: w.reasons.order.reversed };
        return { ok: false };
      }
      case "pick": {
        const v = judgePick(a, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: fill(w.reasons.pick.notOption, { opts: a.options.map((o) => o.text).join(", ") }) } : { ok: false };
      }
      case "divisors": {
        const v = judgeDivisors(a, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: fill(w.reasons.divisors[v.problem], { divs: a.offered.join(", "), d: "d" in v ? v.d : "" }) };
        // Every one listed divides it, but some are missing: said, as the board does.
        return v.more ? { ok: false, hint: fill(w.reasons.divisors.more, { n: a.n }) } : { ok: false };
      }
      case "matrix": {
        const m = readMatrix(src);
        if (!m) return { ok: false, why: fill(w.reasons.unreadable, { s: input }) };
        const [rs, cs] = [a.rows.length, a.rows[0].length];
        if (m.length !== rs || m.some((row) => row.length !== cs)) return { ok: false, why: fill(w.reasons.matrixSize, { r: rs, c: cs }) };
        return { ok: m.every((row, i) => row.every((v, j) => near(v, a.rows[i][j], a.tol))) };
      }
      case "dir": {
        const vs = parts(src).map(value);
        if (vs.some((v) => !Number.isFinite(v))) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        if (vs.every((v) => near(v, 0, 1e-12))) return { ok: false, why: w.reasons.zeroVector };
        // Parallel: the multiple that matches the largest component matches every one.
        const i = a.vs.reduce((b, v, j) => (Math.abs(v) > Math.abs(a.vs[b]) ? j : b), 0);
        const k = vs[i] / a.vs[i];
        return { ok: vs.every((v, j) => near(v, k * a.vs[j], 1e-9 * Math.max(1, Math.abs(v)))) };
      }
      case "ratio": {
        // The same ratio is each term the same multiple of the one asked for; a multiple other than 1 is not simplest.
        const ps = src.split(/[:∶]/);
        const vs = ps.map(value);
        if (ps.length < 2 || vs.some((v) => !Number.isFinite(v) || v <= 0)) return { ok: false, why: fill(w.reasons.ratio.unreadable, { s: input }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        const k = vs[0] / a.vs[0];
        if (!vs.every((v, i) => near(v, k * a.vs[i], 1e-9 * Math.max(1, v)))) return { ok: false };
        return near(k, 1, 1e-9) ? { ok: true } : { ok: false, close: true, why: w.reasons.ratio.notSimplest };
      }
      case "near": {
        const v = judgeNear(a, src);
        if (v.ok) return v;
        return "problem" in v ? { ok: false, why: fill(w.reasons.near[v.problem], { opts: a.options.map((o) => o.text).join(", ") }) } : { ok: false };
      }
      case "target": {
        const v = judgeTarget(a.puzzle, src);
        if (v.ok) return v;
        const ops = a.puzzle.ops.map((o) => OP_SIGN[o]).join(" ");
        if ("problem" in v) return { ok: false, why: fill(w.reasons.target[v.problem], { ops }) };
        // Worked from left to right, it would have made the target: the order of operations is the slip.
        if (v.leftToRight) return { ok: false, mistake: "leftToRight", hint: w.mistakes.leftToRight };
        return { ok: false, hint: fill(w.reasons.target.makes, { v: qText(v.makes), t: a.puzzle.target }) };
      }
      case "pin": {
        const v = judgePin(a.play, a.v, src);
        if (v.ok) return v;
        if ("problem" in v) return { ok: false, why: w.reasons.pin[v.problem] };
        // Which way it was off is said, whether it was close or not.
        return { ok: false, close: v.close || undefined, hint: w.reasons.pin[v.side] };
      }
      case "ineq": {
        const got = readIneq(src);
        if (!got) return { ok: false, why: w.reasons.notIneq };
        const same = (x: Bound | null, y: Bound | null) => (!x && !y) || (!!x && !!y && near(x.v, y.v, 1e-9) && x.closed === y.closed);
        return same(got.lo, a.lo) && same(got.hi, a.hi) ? { ok: true } : { ok: false };
      }
    }
  } catch {
    return { ok: false, why: fill(w.reasons.unreadable, { s: input }) };
  }
}
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return false;
  return true;
};

/** What the input reads as, in LaTeX, so a typo shows before checking (null when it can't be read). */
export function preview(ex: Exercise, input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (ex.answer.k === "poly" || ex.answer.k === "pin" || ex.answer.k === "near" || ex.answer.k === "order" || ex.answer.k === "shade" || ex.answer.k === "pick" || ex.answer.k === "divisors") return null;
  if (ex.answer.k === "target") {
    // The sum as maths, and what it makes so far.
    const e = parseSum(s);
    const v = e && valueOf(e);
    return e && `${sumTex(e)}${v ? ` = ${v[1] === 1 ? v[0] : `\\frac{${v[0]}}{${v[1]}}`}` : ""}`;
  }
  try {
    if (ex.answer.k === "set" || ex.answer.k === "tuple") return parts(s).map((p) => tex(parseE(bare(p)))).join(", \\; ");
    if (ex.answer.k === "dir") return `\\begin{pmatrix} ${parts(s).map((p) => tex(parseE(bare(p)))).join(" \\\\ ")} \\end{pmatrix}`;
    if (ex.answer.k === "matrix") {
      const rows = matrixCells(s);
      return rows && env(rows.map((r) => r.map((c) => tex(parseE(c)))));
    }
    if (ex.answer.k === "ratio") return s.split(/[:∶]/).map((p) => tex(parseE(bare(p)))).join(" : ");
    if (ex.answer.k === "sign") {
      const got = readSign(s);
      return got && ex.q.replace("\\square", got);
    }
    if (ex.answer.k === "ineq") {
      const got = readIneq(s);
      // The variable: a letter on its own ("inf" is not one).
      return got && ineqTex(got.lo, got.hi, s.match(/(?<![a-z])[a-z](?![a-z])/i)?.[0] ?? "x");
    }
    let t = s.replace(/[′']/g, "");
    if (ex.answer.k === "expr" && t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
    if (ex.answer.k === "expr" && ex.answer.mode === "plusC") return tex(parseE(t.replace(/\+\s*[cC]\s*$/, ""))) + " + C";
    if (ex.answer.k === "num") {
      if (ex.answer.std) t = stdText(t);
      const mixed = bare(t).match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
      if (mixed) return `${mixed[1]}${mixed[2]}\\frac{${mixed[3]}}{${mixed[4]}}`;
      t = bare(t);
    }
    return tex(parseE(t.replace(/[·×]/g, "*")));
  } catch {
    return null;
  }
}

// ---------- worksheets ----------

/** A sheet of questions (count 1: a single question card). */
export type PracticeSpec = {
  area: Area;
  skill: SkillId | "mixed";
  level: Level;
  seed: number;
  count: number;
  answers: boolean;
  /** For a screen that shows a question answered by doing with its own picture (the grid, the line, the dots that flash): its picture is left off the card. */
  screen?: boolean;
};

/** The seed of question i on a sheet. */
const seedOf = (seed: number, i: number) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) + i * 7919) >>> 0;

export function exercisesOf(spec: PracticeSpec, w: PracticeWords): Exercise[] {
  const skills = spec.skill === "mixed" ? [...SKILLS[spec.area]] : [spec.skill];
  const n = Math.max(1, Math.min(30, Math.round(spec.count)));
  if (n === 1) return [exercise(skills[spec.seed % skills.length], spec.level, spec.seed, w)];
  const start = spec.seed % skills.length;
  return Array.from({ length: n }, (_, i) => exercise(skills[(start + i) % skills.length], spec.level, seedOf(spec.seed, i), w));
}

function placeTex(t: string, x: number, y: number, maxW: number, color = C.ink, scale = 1): { svg: string; h: number; w: number } {
  const r = latexToSvg(t, color);
  const k = Math.min(scale, maxW / r.width);
  const [ww, hh] = [r.width * k, r.height * k];
  return {
    svg: r.svg
      .replace(/width="[\d.]+"/, `width="${r2(ww)}"`)
      .replace(/height="[\d.]+"/, `height="${r2(hh)}"`)
      .replace(/^<svg/, `<svg x="${r2(x)}" y="${r2(y)}"`),
    h: hh,
    w: ww,
  };
}
const line = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean; anchor?: string } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 15}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

export function renderPractice(spec: PracticeSpec, w: PracticeWords): RenderedSvg {
  const exs = exercisesOf(spec, w);
  const single = exs.length === 1;
  const parts: string[] = [];
  let y = 18;
  const title = `${spec.skill === "mixed" ? w.mixed : w.skills[spec.skill]} · ${w.levels[String(spec.level) as "1" | "2" | "3"]}`;
  parts.push(line(20, y + 6, title, { size: 13, color: C.grey, bold: true }));
  y += 22;
  exs.forEach((ex, i) => {
    const x0 = single ? 20 : 48;
    if (!single) parts.push(line(20, y + 15, `${i + 1}.`, { bold: true, color: C.blue }));
    for (const l of wrap(ex.prompt, single ? 70 : 66)) {
      parts.push(line(x0, y + 15, l));
      y += 21;
    }
    if (ex.q) {
      const q = placeTex(ex.q, x0 + 8, y + 4, W - x0 - 30, C.ink, 1.1);
      parts.push(q.svg);
      y += q.h + 10;
    }
    if (ex.pic && !(spec.screen && ex.play)) {
      parts.push(ex.pic.svg(x0 + 10, y));
      y += ex.pic.h;
    }
    if (single && spec.answers) {
      parts.push(line(x0, y + 18, w.answer + ":", { bold: true, color: C.green }));
      const a = placeTex(ex.show, x0 + 80, y + 4, W - x0 - 100, C.green);
      parts.push(a.svg);
      y += Math.max(26, a.h + 8);
    }
    y += single ? 6 : 12;
  });
  if (!single && spec.answers) {
    y += 4;
    parts.push(`<line x1="20" y1="${r2(y)}" x2="${W - 20}" y2="${r2(y)}" stroke="#ced4da" stroke-dasharray="6 4"/>`);
    y += 10;
    parts.push(line(20, y + 15, w.answers, { bold: true, color: C.green }));
    y += 26;
    exs.forEach((ex, i) => {
      parts.push(line(28, y + 15, `${i + 1}.`, { bold: true, color: C.green, size: 13 }));
      const a = placeTex(ex.show, 56, y + 2, W - 80, C.green, 0.9);
      parts.push(a.svg);
      y += Math.max(22, a.h + 6);
    });
  }
  const H = Math.ceil(y + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`;
  return { svg, width: W, height: H };
}

export const PRACTICE_PRESETS: { label: string; spec: PracticeSpec }[] = AREAS.flatMap((area) =>
  LEVELS.map((level) => ({ label: `${area} ${level}`, spec: { area, skill: "mixed" as const, level, seed: 7 + level, count: 2 * SKILLS[area].length, answers: true } })),
);

/** Worked lines as a picture, for questions no tool draws. */
export function renderSteps(steps: string[]): RenderedSvg {
  const parts: string[] = [];
  let y = 12;
  for (const s of steps) {
    const t = placeTex(s, 24, y, W - 48);
    parts.push(t.svg);
    y += t.h + 14;
  }
  const H = Math.ceil(y + 4);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`, width: W, height: H };
}
