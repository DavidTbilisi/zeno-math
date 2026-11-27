// The arithmetic behind the live pieces on the board (the ones that respond to clicks and drags): a geared clock,
// chance devices and the tallies of an experiment, dot multiplication, the counts shown under a ten frame or a
// hundred square, towers of blocks and bars of fractions to compare, long division a step at a time, and the state
// of a Rubik's cube, of a soroban and of an algorithm pattern being stepped through. Kept free of React and Excalidraw so
// it can be tested on its own.
import type { LiveNumberLine } from "./numberLine";
import type { LiveGeoboard } from "./geoPlay";
import type { LiveEstimate } from "./estimate";
import type { LiveQuickLook } from "./quickLook";
import type { LiveTarget } from "./target";
import type { LiveNear } from "./benchmark";
import type { LiveDivisible } from "./divisible";
import type { LivePrimeSlice } from "./primeSlice";
import type { LiveKakooma } from "./kakooma";
import { rainStart, type LiveRain } from "./numberRain";
import { runStart, type LiveRun } from "./gateRun";
import { joinStart, type LiveJoin } from "./joinUp";
import type { LiveWall } from "./fractionWall";
import type { LiveEquiv } from "./equivMatch";
import { SORT_START, type LiveSort } from "./shapeSort";
import type { LiveOrder } from "./fracOrder";
import type { LiveShade } from "./shadeFrac";
import { STRIPES_START, type LiveStripes } from "./stripes";
import { FOLD_START, type LiveFold } from "./fold";
import { FIT_TILES_START, type LiveFitTiles } from "./fitTiles";
import { WHOLE_START, type LiveFindWhole } from "./findWhole";
import { OVERFLOW_START, type LiveOverflow } from "./overflowBars";
import { SHARE_START, type LiveShare } from "./shareBags";
import { FROG_START, type LiveFrog } from "./frogJumps";
import { MAKE_START, type LiveMakeOne } from "./makeOne";
import { TILE_START, type LiveTileDrop } from "./tileDrop";
import { DOUBLE_START, type LiveDouble } from "./doubleLine";
import { PIZZA_START, type LivePizza } from "./pizzaSlice";
import type { LiveBalance } from "./balance";
import type { LiveMachine } from "./machine";
import type { LiveGrow } from "./growing";
import { SHAPES_START, type LiveNumberShapes } from "./numberShapes";
import { TILES_START, type LiveAlgebraTiles } from "./algebraTiles";
import type { PlaceValueSpec } from "./placeValue";
import { CUBES_START, type LiveCubes } from "./cubes";
import { REKENREK_START, type LiveRekenrek } from "./rekenrek";
import { RODS_START, type LiveRods } from "./rods";
import { DEC_GRID_START, type LiveDecGrid } from "./decGrid";
import { MEASURE_HAND_START, type LiveMeasureHand } from "./measureHand";
import { PERCENT_HAND_START, type LivePercentHand } from "./percentHand";
import { CIRCLE_HAND_START, type LiveCircleHand } from "./circleHand";
import { TRIG_FIND_START, type LiveTrigFind } from "./trigFind";
import { VEC_FIND_START, type LiveVecFind } from "./vecFind";
import { POWER_FIND_START, type LivePowerFind } from "./powerFind";
import { INEQ_FIND_START, type LiveIneqFind } from "./ineqFind";
import { CX_PLANE_START, type LiveCxPlane } from "./cxPlane";
import { MAT_PLANE_START, type LiveMatPlane } from "./matPlane";
import { MEAN_BALANCE_START, type LiveMeanBalance } from "./meanBalance";
import { COUNT_TREE_START, type LiveCountTree } from "./countTree";
import { FAIR_GAME_START, type LiveFairGame } from "./fairGame";
import { NORMAL_CUT_START, type LiveNormalCut } from "./normalCut";
import { SHAPE_READ_START, type LiveShapeRead } from "./shapeRead";
import { LADDER_RATES_START, type LiveLadderRates } from "./ladderRates";
import { PARTIAL_SUMS_START, type LivePartialSums } from "./partialSums";
import { SIM_HAND_START, type LiveSimHand } from "./simHand";
import { AREA_START, type LiveAreaBlocks } from "./areaBlocks";
import { COUNTERS_START, type LiveCounters } from "./counters";
import { SIGN_ARROW_START, SIGN_PATTERN_START, type LiveSignArrow, type LiveSignPattern } from "./signs";
import { CARDS_START, type LiveCards } from "./cards";
import { GEO_START, type LiveGeoLab } from "./geoLab";
import { SPACE_START, type LiveSpace } from "./space";
import type { LiveExprMatch } from "./exprMatch";
import type { LiveAngleGuess } from "./angleGuess";
import type { LiveAngleHunt } from "./missingAngle";
import type { LiveTrigBuild } from "./trigBuild";
import type { LiveUnitCircle } from "./unitCircleGame";
import { SLOPE_WALK_START, type LiveSlopeWalk } from "./slopeWalk";
import { PARALLEL_LAB_START, type LiveParallelLab } from "./parallelAngles";
import { MOVE_SHAPE_START, type LiveMoveShape } from "./moveShape";
import { BUILD_START, type LiveBuildTriangle } from "./congruence";
import { CONSTRUCT_START, type LiveConstruct } from "./compass";
import { SCALE_PLAN_START, type LiveScalePlan } from "./scaleMaps";
import { COIN_START, type LiveCoinStack } from "./crossSections";
import { ROOT_START, type LiveRootZoom } from "./realNumbers";
import { ABS_START, type LiveAbsLine } from "./absValue";
import { TWO_START, type LiveTwoChanges } from "./moneySense";
import { BOX_START, type LiveBoxSplit } from "./spread";
import { TABLE_START, type LiveTableShares } from "./twoWay";
import { FITLINE_START, type LiveFitLine } from "./scatterFit";
import { SAMPLE_START, type LiveSampleField } from "./sampling";
import { TTAILS_START, type LiveTTails } from "./tTails";
import { SECANT_START, type LiveSecantRate } from "./readFunction";
import { TESTPOINTS_START, type LiveTestPoints } from "./regions";
import { GROWTH_START, type LiveGrowthRace } from "./exponential";
import { SQUARE_START, type LiveCompleteSquare } from "./quadraticGraph";
import { POLY_START, type LivePolyShape } from "./polyGraph";
import { WALK_START, type LiveAsymptoteWalk } from "./rational";
import { SQUARE_CHECK_START, type LiveSquareCheck } from "./rootEquations";
import { MOVE_START, type LiveMoveGraph } from "./fnTransform";
import { WHEEL_START, type LiveWheelWave } from "./trigWave";
import { PIN_START, type LivePinString } from "./conics";
import { TRACE_START, type LiveTracePath } from "./parametric";
import { CLOSE_START, type LiveCloseIn } from "./continuity";
import { FOLDBOX_START, type LiveFoldBox } from "./derivContext";
import { FILL_START, type LiveFillUnder } from "./accumulation";
import { DROP_START, type LiveDropPoint } from "./slopeFields";
import { SOLID_START, type LiveSolid } from "./solid";
import { TURNED_START, type LiveTurned } from "./turned";
import { CUBE_MATRIX_START, type LiveCubeMatrix } from "./cubeMatrix";
import type { LiveSoh } from "./sohcahtoa";
import type { LiveDiscover } from "./trigDiscover";
import type { LivePythDiscover } from "./pythDiscover";
import type { LiveCircleDiscover } from "./circleDiscover";
import type { LiveTessellate } from "./tessellate";
import type { LiveMirror } from "./symmetry";
import type { LiveCubeNet } from "./cubeNets";
import type { LivePlot } from "./plotPoint";
import type { LiveBarChart } from "./barChart";
import type { LiveMakeDiagram } from "./makeDiagram";
import type { LiveGraphStory } from "./graphStory";
import type { LiveSlope } from "./slope";
import type { LiveStroke } from "./oneStroke";
import type { LiveColour } from "./colouring";
import type { LivePath } from "./shortestPath";
import type { LiveTowns } from "./connectTowns";
import type { LiveBeSort } from "./beSort";
import type { LiveBeSearch } from "./beSearch";
import type { LiveBeDp } from "./beDp";
import type { LiveBeBinary } from "./beBinary";
import type { LiveBePointers } from "./bePointers";
import type { LiveBeWindow } from "./beWindow";
import type { LiveBeBacktrack } from "./beBacktrack";
import type { LiveBeHeap } from "./beHeap";
import type { LiveBeTree } from "./beTree";
import type { LiveBeStack } from "./beStack";
import type { LiveBeUnion } from "./beUnion";
import type { LiveBeCache } from "./beCache";
import type { LiveBeBalance } from "./beBalance";
import type { LiveBeRing } from "./beRing";
import type { LiveBeLimit } from "./beLimit";
import type { LiveBeQuorum } from "./beQuorum";
import type { LiveBeQueue } from "./beQueue";
import type { LiveBeComp } from "./beComp";
import type { LiveBeTopo } from "./beTopo";
import type { LiveBeName } from "./beName";
import { whichStart, type LiveWhich } from "./whichTool";
import { cruxStart, type LiveCrux } from "./crux";
import { CIRCUIT_START, type LiveCircuit } from "./circuitLab";
import { CPU_START_STATE, type LiveCpu } from "./cpuLab";
import { SYSTEM_START, type LiveSystem } from "./systemLab";
import { RAID_START, type LiveRaid } from "./raidLab";
import { CACHE_START, type LiveCache } from "./cacheLab";
import { IO_START, type LiveIo } from "./ioLab";
import { HAMMING_START, type LiveHamming } from "./hammingLab";
import { PIPE_START, type LivePipe } from "./pipelineLab";
import { PAGING_START, type LivePaging } from "./pagingLab";
import { DESCENT_START, type LiveDescent } from "./descentLab";
import { SURFACE_START, type LiveSurface } from "./surface";
import { SOLVER_START, type LiveSolver } from "./solver/index";
import { PCA_START, type LivePca } from "./pcaLab";
import { FIT_START, type LiveFit } from "./fitLab";
import { BATCH_START, type LiveBatch } from "./batchLab";
import { ROC_START, type LiveRoc } from "./rocLab";
import { KNN_START, type LiveKnn } from "./knnLab";
import { TREE_START, type LiveTree } from "./treeLab";
import { KM_START, type LiveKmeans } from "./kmeansLab";
import { NN_START, type LiveNn } from "./nnLab";
import { CONV_START, type LiveConv } from "./convLab";
import { ATTN_START, type LiveAttn } from "./attnLab";
import { RNN_START, type LiveRnn } from "./rnnLab";
import { RL_START, type LiveRl } from "./rlLab";
import { SOFTMAX_START, type LiveSoftmax } from "./softmaxLab";
import { EMBED_START, type LiveEmbed } from "./embedLab";
import { BP_START, type LiveBackprop } from "./backpropLab";
import { TN_START, type LiveTensor } from "./tensorLab";
export type { EndlessGame, GameBase, GameLevel, GameMode, TryGame } from "./ladder";
import { DIVISION_LIMITS, planDivision, type DivisionStyle } from "./division";
import { PATTERN_EXAMPLES, type PatternId } from "./patternSteps";
import type { ProblemId } from "./problems/index";
import type { Sharing } from "./sharing";

// ——— Clock ———

/** Minutes past midnight, 0 to 1439. */
export const wrapDay = (m: number) => ((Math.round(m) % 1440) + 1440) % 1440;

/** Hand angles in degrees, clockwise from twelve. The hour hand moves on between the hours, as on a real clock. */
export function handAngles(minutes: number): { hour: number; minute: number } {
  const m = ((minutes % 720) + 720) % 720;
  return { hour: m / 2, minute: (m % 60) * 6 };
}

/** The smallest turn from one angle to another, in degrees, from −180 to 180. */
export function turn(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/**
 * The time after dragging a hand to `angle` (degrees clockwise from twelve). The hands are geared: taking the minute
 * hand once round moves the hour hand on an hour, and turning the hour hand drags the minute hand along.
 */
export function dragHand(minutes: number, hand: "hour" | "minute", angle: number): number {
  const now = handAngles(minutes)[hand];
  return minutes + turn(now, angle) * (hand === "minute" ? 1 / 6 : 2);
}

export const snapTo = (minutes: number, step: number) => Math.round(minutes / step) * step;

/** 12-hour time, as the clock face shows it: 0:05 is 12:05. */
export function clockTime(minutes: number): string {
  const m = wrapDay(minutes);
  const h = Math.floor(m / 60) % 12 || 12;
  return `${h}:${String(m % 60).padStart(2, "0")}`;
}

// ——— Chance ———

/** Which of n equal sections a pointer at `angle` (degrees clockwise from twelve) is in. */
export const sectionAt = (angle: number, n: number) => Math.floor((((angle % 360) + 360) % 360) / (360 / n)) % n;

/**
 * How far a flicked spinner turns, in degrees: 2 whole turns for a gentle flick up to 6 for a hard one (`speed` in
 * degrees a millisecond), plus `r` of a turn (0 to 1, at random), the way it was flicked. A tap (speed 0) turns forward.
 */
export function spinTurn(speed: number, r: number): number {
  const turns = Math.max(2, Math.min(6, 2 + Math.abs(speed) * 2));
  return (speed < 0 ? -1 : 1) * (360 * Math.floor(turns) + 360 * r);
}

/** One more in the tally of outcome i. */
export const tallyUp = <T extends number[]>(counts: T, i: number) => counts.map((k, j) => (j === i ? k + 1 : k)) as T;


export const BAG_COLORS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00"] as const;

export type Device =
  | { kind: "coin" }
  | { kind: "die"; sides: number }
  | { kind: "twoDice" }
  | { kind: "spinner"; sections: number }
  | { kind: "bag"; counts: number[] };

export const DIE_SIDES = [4, 6, 8, 10, 12, 20];

/** Outcome i has probability p[i]; `labels` are what the chart writes under each bar (words come from the caller). */
export function outcomes(d: Device, words: { heads: string; tails: string }): { labels: string[]; p: number[] } {
  switch (d.kind) {
    case "coin":
      return { labels: [words.heads, words.tails], p: [0.5, 0.5] };
    case "die":
      return { labels: Array.from({ length: d.sides }, (_, i) => String(i + 1)), p: Array(d.sides).fill(1 / d.sides) };
    case "twoDice":
      return { labels: Array.from({ length: 11 }, (_, i) => String(i + 2)), p: Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i - 5)) / 36) };
    case "spinner":
      return { labels: Array.from({ length: d.sections }, (_, i) => String(i + 1)), p: Array(d.sections).fill(1 / d.sections) };
    case "bag": {
      const total = d.counts.reduce((a, b) => a + b, 0);
      return { labels: d.counts.map(String), p: d.counts.map((c) => (total ? c / total : 0)) };
    }
  }
}

/** One trial: the index of the outcome that came up. */
export function draw(d: Device, r: () => number): number {
  switch (d.kind) {
    case "coin":
      return r() < 0.5 ? 0 : 1;
    case "die":
      return Math.floor(r() * d.sides);
    case "twoDice":
      return Math.floor(r() * 6) + Math.floor(r() * 6);
    case "spinner":
      return Math.floor(r() * d.sections);
    case "bag": {
      const total = d.counts.reduce((a, b) => a + b, 0);
      let pick = r() * total;
      for (let i = 0; i < d.counts.length; i++) {
        pick -= d.counts[i];
        if (pick < 0) return i;
      }
      return d.counts.length - 1;
    }
  }
}

/**
 * Counts so far, with snapshots for the "over time" chart: after every trial at first, then each time the number of
 * trials has grown by a twentieth, so a million trials keep only a few hundred snapshots.
 */
export type Tally = { n: number; counts: number[]; history: { n: number; counts: number[] }[] };

export const emptyTally = (k: number): Tally => ({ n: 0, counts: Array(k).fill(0), history: [] });

export const MAX_TRIALS = 1_000_000;

export function runTrials(t: Tally, d: Device, trials: number, r: () => number): { tally: Tally; last: number } {
  const counts = [...t.counts];
  const history = [...t.history];
  let n = t.n;
  let last = -1;
  const room = Math.max(0, Math.min(trials, MAX_TRIALS - n));
  for (let i = 0; i < room; i++) {
    last = draw(d, r);
    counts[last]++;
    n++;
    const prev = history.length ? history[history.length - 1].n : 0;
    if (n <= 30 || n >= prev * 1.05) history.push({ n, counts: [...counts] });
  }
  return { tally: { n, counts, history }, last };
}

// ——— Dot multiplication ———

/**
 * Multiplying two numbers from k to 2k with k squares a row: each number is k plus its dots. Add the dots and count
 * each as 2k, then add the empty squares of one row times the empty squares of the other. It works because
 * (k + a)(k + b) = 2k(a + b) + (k − a)(k − b).
 */
export function dotProduct(k: number, top: number, bottom: number) {
  const dots = top + bottom;
  const value = 2 * k;
  const empty: [number, number] = [k - top, k - bottom];
  const parts = { dots, dotValue: dots * value, emptyProduct: empty[0] * empty[1] };
  return { a: k + top, b: k + bottom, value, empty, ...parts, product: parts.dotValue + parts.emptyProduct };
}

/** How many squares a row of dot multiplication can have: numbers from k to 2k. */
export const DOT_ROWS = [3, 4, 5, 6, 10];

/** A drag along a row of k squares (each `step` wide, the first at x0) fills through the square under x; left of it, none. */
export const dotsUpTo = (x: number, x0: number, step: number, k: number) => Math.max(0, Math.min(k, Math.floor((x - x0) / step) + 1));

/** Tapping square i (0-based) fills through it; tapping the last dot again takes it away. */
export const tapSquare = (dots: number, i: number) => (i + 1 === dots ? i : i + 1);

/** Which of n equal slices of a circle a point (dx, dy) from its centre is in, the slices counted clockwise from twelve. */
export function sliceAt(dx: number, dy: number, n: number): number {
  const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return Math.min(n - 1, Math.floor(deg / (360 / n)));
}

/** Parts a drag paints: every one passed over takes the opposite of the first one's shading. */
export const paintParts = (shaded: boolean[], first: number, over: number[]) => shaded.map((s, i) => (over.includes(i) ? !shaded[first] : s));

/** The first k of n parts shaded: the numerator set by hand. */
export const shadeFirst = (n: number, k: number) => Array.from({ length: n }, (_, i) => i < k);

// ——— Ten frame and hundred square ———

/** The two colours of counters in a ten frame (0 empty, 1 and 2 the colours), counted for "a + b = n". */
export function counters(cells: number[]): { a: number; b: number; n: number } {
  const a = cells.filter((c) => c === 1).length;
  const b = cells.filter((c) => c === 2).length;
  return { a, b, n: a + b };
}

/** The first empty square of the frames shown (10 or 20 squares), or null when they are full. */
export function firstEmpty(cells: number[], frames: number): number | null {
  const i = cells.slice(0, 10 * frames).indexOf(0);
  return i < 0 ? null : i;
}

/**
 * A counter dragged from square `from` and let go on square `to` (null: off the frames, so it is taken away). On an
 * empty square it moves; on a full one the two counters swap.
 */
export function moveCounter(cells: number[], from: number, to: number | null): number[] {
  const next = [...cells];
  if (to === null) next[from] = 0;
  else [next[from], next[to]] = [cells[to], cells[from]];
  return next;
}

/** A two-coloured counter turned over: red to yellow and back. */
export const flipCounter = (c: number) => (c === 1 ? 2 : c === 2 ? 1 : 0);

export const multiplesOf = (n: number, upTo = 100) => Array.from({ length: Math.floor(upTo / n) }, (_, i) => n * (i + 1));

/** The jumps on the hundred square: one along a row, ten down a column, and back. */
export const HUNDRED_STEPS = [1, 10, -1, -10] as const;
/** Where a jump from `at` lands, or null when it would leave the square (below 1 or past 100). */
export const hundredJump = (at: number, step: number) => (at + step >= 1 && at + step <= 100 ? at + step : null);
/** Every square a walk visits, the start first. */
export const hundredPath = (start: number, steps: number[]) => steps.reduce((p, s) => [...p, p[p.length - 1] + s], [start]);
/**
 * The jumps from one square to another by tens, then ones: 23 to 56 is +10 +10 +10 +1 +1 +1, and 41 to 38 is −1 −1 −1.
 */
export function jumpsTo(from: number, to: number): number[] {
  const d = to - from;
  const sign = Math.sign(d);
  const tens = Math.trunc(Math.abs(d) / 10);
  return [...Array(tens).fill(10 * sign), ...Array(Math.abs(d) - 10 * tens).fill(sign)];
}

/** Squares a mark-mode drag paints: every one passed over takes the opposite of the first one's mark. */
export function paintMarks(marked: number[], first: number, over: number[]): number[] {
  const on = !marked.includes(first);
  const rest = marked.filter((m) => !over.includes(m));
  return on ? [...rest, ...over.filter((v, i) => over.indexOf(v) === i)] : rest;
}

const signed = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`);
/** A walk written out jump by jump (100 − 10 − 10 − 1 = 79) and as one sum (100 − 21 = 79). */
export function hundredSum(start: number, steps: number[]): { long: string; short: string } | null {
  if (!steps.length) return null;
  const end = hundredPath(start, steps).at(-1)!;
  return { long: `${start} ${steps.map(signed).join(" ")} = ${end}`, short: `${start} ${signed(end - start)} = ${end}` };
}

// ——— Comparing two numbers with towers of blocks ———

export type CompareSign = "<" | "=" | ">";
export const COMPARE_SIGNS: CompareSign[] = ["<", "=", ">"];
export const COMPARE_MAX = 10;
/** One colour a storey, from the bottom up, like a stack of building blocks. */
export const COMPARE_COLORS = ["#ff6b6b", "#ffd43b", "#69db7c", "#e03131", "#4dabf7", "#ff922b", "#da77f2", "#38d9a9", "#748ffc", "#f783ac"];
/** The two pencils: the one that joins the tops, and the one that joins the bottoms. */
export const PENCIL_COLORS = ["#8d5a3b", "#5f3dc4"] as const;

export const compareSign = (a: number, b: number): CompareSign => (a < b ? "<" : a > b ? ">" : "=");

/**
 * Top and bottom of a tower of n blocks, each `block` high: standing on `floor` when `centred` is 0, its middle on
 * `mid` when it is 1, and part of the way between for the slide from one to the other. Once both towers are centred,
 * a line joining their tops and one joining their bottoms make the sign: the gap between the lines is each tower's
 * height, so it opens towards the bigger number, and two towers of the same height give two parallel lines, =.
 */
export function towerSpan(n: number, block: number, floor: number, mid: number, centred: number): [number, number] {
  const bottom = floor + (mid + (n * block) / 2 - floor) * centred;
  return [bottom - n * block, bottom];
}

export type Tower = "a" | "b";
/**
 * A block taken from `from` (a tower's top, or the pile) and put on `to` (a tower, or null: taken away). A tower
 * holds 0 to COMPARE_MAX blocks; a move that cannot be made leaves the towers as they were.
 */
export function moveBlock(t: { a: number; b: number }, from: Tower | "pile", to: Tower | null): { a: number; b: number } {
  if (from === to || (from !== "pile" && !t[from]) || (to && t[to] >= COMPARE_MAX)) return { a: t.a, b: t.b };
  const next = { a: t.a, b: t.b };
  if (from !== "pile") next[from]--;
  if (to) next[to]++;
  return next;
}

// ——— Comparing two fractions with bars ———

/** n of d equal parts: a fraction from 0 to 1, as a bar cut into d parts with n shaded. */
export type Frac = { n: number; d: number };
export const FRACTION_PARTS = 12;
/** The most parts the bars are cut into for "same-size pieces" before the lines get too close to see. */
export const SAME_PIECES_MAX = 48;
/** The shaded parts of the first and the second fraction. */
export const FRACTION_FILLS = ["#a5d8ff", "#ffc9c9"] as const;

const gcdOf = (a: number, b: number): number => (b ? gcdOf(b, a % b) : a);

/** The parts kept from 1 to 12 and the shaded ones from none to all of them. */
export function fracNumbers({ n, d }: Frac): Frac {
  const parts = Math.max(1, Math.min(FRACTION_PARTS, Math.round(d) || 1));
  return { n: Math.max(0, Math.min(parts, Math.round(n) || 0)), d: parts };
}

/** The parts shaded when a bar `whole` high, standing on `floor` and cut into d parts, is painted up to height y: the part under y and every part below it. */
export const shadeUpTo = (y: number, floor: number, whole: number, d: number) => Math.max(0, Math.min(d, Math.ceil(((floor - y) / whole) * d - 1e-9)));

/** n/d against m/e by cross-multiplying: n·e against m·d. */
export const fracSign = (a: Frac, b: Frac): CompareSign => compareSign(a.n * b.d, b.n * a.d);

/** Both fractions cut into the same parts, the fewest that will do: 2/3 and 3/4 are 8/12 and 9/12. */
export function samePieces(a: Frac, b: Frac): { d: number; a: number; b: number } {
  const d = (a.d / gcdOf(a.d, b.d)) * b.d;
  return { d, a: (a.n * d) / a.d, b: (b.n * d) / b.d };
}

/** A fraction against a half: n/d against 1/2 is n + n against d (2/5: 4 < 5, so less than a half). */
export const halfSign = ({ n, d }: Frac): CompareSign => compareSign(2 * n, d);

/**
 * a against 1/2 and 1/2 against b, when the half settles which is bigger (2/5 < 1/2 < 3/4, 2/4 = 1/2 > 1/3); null
 * when both are on the same side of it (2/5 and 1/3), so the half does not decide.
 */
export function viaHalf(a: Frac, b: Frac): [CompareSign, CompareSign] | null {
  const s = halfSign(a);
  const t = compareSign(b.d, 2 * b.n); // 1/2 against b
  return s === t || s === "=" || t === "=" ? [s, t] : null;
}

// ——— Long division ———

/**
 * A long division the class steps through; `turn` asks for each quotient digit before it is drawn. With `blocks`, the
 * pupil shares base-ten blocks into the groups by hand: `share` is that arrangement (null: as at the start), and the
 * written working follows it.
 */
export type LiveDivision = {
  a: number; b: number; decimals: number; style: DivisionStyle; blocks: boolean; step: number; turn: boolean; share: Sharing | null;
  /** The step just done is named beside the working: each group, taken away, what is left. */
  labels?: boolean;
};

/**
 * The numbers within the division tool's limits: a whole a ≥ 0, a whole b ≥ 0, 0 to 10 decimal places. b = 0 is let
 * through so the class can see why it has no answer; a b that isn't a number at all becomes 1.
 */
export function divisionNumbers(d: Pick<LiveDivision, "a" | "b" | "decimals">): Pick<LiveDivision, "a" | "b" | "decimals"> {
  const clamp = (v: number, lo: number, hi: number, none = lo) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : none)));
  return { a: clamp(d.a, 0, DIVISION_LIMITS.a), b: clamp(d.b, 0, DIVISION_LIMITS.b, 1), decimals: clamp(d.decimals, 0, DIVISION_LIMITS.decimals) };
}

/**
 * The special cases of division: n ÷ 0 is undefined (0 ÷ 0 too), 0 ÷ n = 0, n ÷ 1 = n and n ÷ n = 1; null for an
 * ordinary division. When two apply (1 ÷ 1), the first in that order is named.
 */
export type DivisionCase = "byZero" | "zeroBy" | "byOne" | "self";
export const divisionCase = (a: number, b: number): DivisionCase | null =>
  b === 0 ? "byZero" : a === 0 ? "zeroBy" : b === 1 ? "byOne" : a === b ? "self" : null;

export type DivisionAsk = { cur: number; b: number; q: number };

/** The question for the next step (how many times b goes into the number at that point), or null when all are done. */
export function divisionAsk(d: LiveDivision): DivisionAsk | null {
  const { steps } = planDivision(d.a, d.b, d.decimals);
  const s = steps[d.step];
  return s ? { cur: s.cur, b: d.b, q: s.q } : null;
}

/** A guessed quotient digit: right, too big (g × b is more than the number), or too small (b still fits in what is left). */
export const judgeDigit = (ask: DivisionAsk, g: number): "right" | "tooBig" | "tooSmall" => (g === ask.q ? "right" : g > ask.q ? "tooBig" : "tooSmall");

// ——— Rubik's cube ———

/**
 * A Rubik's cube (the maths is in rubik.ts): the scramble and the turns made since, written as R U R′ U′; the moves to
 * repeat and how many times running they have been done; whether the buttons turn anticlockwise; and the angle the
 * cube and its ball of circles are seen from, in degrees. While the colours of a real cube are being painted in, `paint`
 * holds them, the face whose colour each of the 54 stickers has (UUUUUUUUURRR…); once solved, `solution` is the turns
 * that solve it, done one at a time as `moves`. (Boards from before either was kept have neither.)
 */
export type LiveRubik = { scramble: string; moves: string; alg: string; reps: number; prime: boolean; yaw: number; pitch: number; paint?: string; solution?: string };

// ——— Soroban ———

/**
 * A soroban (the bead rules are in soroban.ts): how many rods it has and the number on them; whether the number and
 * each rod's digit are written underneath; the number to add or take away, and the sum being stepped through (where it
 * started, and how many rods have been moved); and a number the pupil has been asked to show.
 */
export type LiveSoroban = {
  rods: number;
  value: number;
  showValue: boolean;
  showDigits: boolean;
  n: number;
  work: { start: number; sign: 1 | -1; n: number; step: number } | null;
  target: number | null;
};

// ——— Algorithm patterns ———

/**
 * One of the algorithm patterns (the frames are in patternSteps.ts): its inputs, the step it is at, and whether the
 * pupil is asked what happens next before each move.
 */
export type LivePatterns = { pattern: PatternId; data: string; extra: string; step: number; quiz: boolean };

/**
 * One of the interview problems (math/problems): its inputs as typed (a missing one is the example's), the step it is
 * at; `solve` when it is being worked out on the solve ladder (coding questions only), on rung `rung`.
 */
export type LiveProblems = { id: ProblemId; inputs: string[]; step: number; quiz: boolean; solve?: boolean; rung?: number };

// ——— The kinds of live piece, their sizes and where each starts ———

export type LiveParam = { v: number; min: number; max: number };
export type LiveGraphState = {
  fns: { expr: string; color: string }[];
  params: Record<string, LiveParam>;
  view: { xMin: number; xMax: number; yMin: number; yMax: number };
  trace: boolean;
  tangent: boolean;
  traceX: number;
};

export const DEFAULT_LIVE_GRAPH: LiveGraphState = {
  fns: [{ expr: "a*x^2 + b*x + c", color: "#1971c2" }],
  params: { a: { v: 1, min: -5, max: 5 }, b: { v: 0, min: -5, max: 5 }, c: { v: 0, min: -5, max: 5 } },
  view: { xMin: -10, xMax: 10, yMin: -5.5, yMax: 5.5 },
  trace: false,
  tangent: false,
  traceX: 1,
};

export type ChanceView = "bars" | "time";

export type LiveStates = {
  clock: { minutes: number; showTime: boolean; snap: boolean; showMinutes?: boolean };
  dice: { count: number; faces: number[]; history: number[] };
  spinner: { sections: number; angle: number; result: number; counts: number[] };
  coin: { side: number; counts: [number, number] };
  fractions: { shape: "circle" | "bar"; parts: number; shaded: boolean[] };
  tenFrame: { double: boolean; cells: number[] };
  /** With `walk` on, a tap picks the start and the jumps from it are traced; squares saved before have none. */
  hundred: { marked: number[]; n: number; walk?: boolean; start?: number | null; steps?: number[] };
  dots: { k: number; top: number; bottom: number };
  graph: LiveGraphState;
  chance: { device: Device; tally: Tally; view: ChanceView; relative: boolean; theory: boolean; focus: number; last: number };
  cards: LiveCards;
  compare: { a: number; b: number; joined: boolean; guess: CompareSign | null };
  compareFractions: { a: Frac; b: Frac; joined: boolean; guess: CompareSign | null; same: boolean; half: boolean };
  division: LiveDivision;
  rubik: LiveRubik;
  soroban: LiveSoroban;
  patterns: LivePatterns;
  problems: LiveProblems;
  solver: LiveSolver;
  numberLine: LiveNumberLine;
  geoboard: LiveGeoboard;
  estimate: LiveEstimate;
  quickLook: LiveQuickLook;
  target: LiveTarget;
  closerTo: LiveNear;
  divisible: LiveDivisible;
  primeSlice: LivePrimeSlice;
  kakooma: LiveKakooma;
  rainPlus: LiveRain;
  rainTimes: LiveRain;
  runPlus: LiveRun;
  runTimes: LiveRun;
  joinSum: LiveJoin;
  joinProduct: LiveJoin;
  fractionWall: LiveWall;
  equivMatch: LiveEquiv;
  shapeSort: LiveSort;
  fracOrder: LiveOrder;
  shadeFrac: LiveShade;
  stripes: LiveStripes;
  foldStrip: LiveFold;
  fitTiles: LiveFitTiles;
  findWhole: LiveFindWhole;
  overflowBars: LiveOverflow;
  shareBags: LiveShare;
  frogJumps: LiveFrog;
  makeOne: LiveMakeOne;
  tileDrop: LiveTileDrop;
  doubleLine: LiveDouble;
  pizzaSlice: LivePizza;
  balance: LiveBalance;
  machine: LiveMachine;
  growing: LiveGrow;
  numberShapes: LiveNumberShapes;
  algebraTiles: LiveAlgebraTiles;
  baseTen: PlaceValueSpec;
  cubes: LiveCubes;
  rekenrek: LiveRekenrek;
  rods: LiveRods;
  decGrid: LiveDecGrid;
  measureHand: LiveMeasureHand;
  percentHand: LivePercentHand;
  simHand: LiveSimHand;
  circleHand: LiveCircleHand;
  trigFind: LiveTrigFind;
  vecFind: LiveVecFind;
  powerFind: LivePowerFind;
  ineqFind: LiveIneqFind;
  cxPlane: LiveCxPlane;
  matPlane: LiveMatPlane;
  meanBalance: LiveMeanBalance;
  countTree: LiveCountTree;
  fairGame: LiveFairGame;
  normalCut: LiveNormalCut;
  shapeRead: LiveShapeRead;
  ladderRates: LiveLadderRates;
  partialSums: LivePartialSums;
  areaBlocks: LiveAreaBlocks;
  counters: LiveCounters;
  signArrow: LiveSignArrow;
  signPattern: LiveSignPattern;
  geoLab: LiveGeoLab;
  space: LiveSpace;
  exprMatch: LiveExprMatch;
  angleGuess: LiveAngleGuess;
  angleHunt: LiveAngleHunt;
  mirror: LiveMirror;
  views3d: import("./views3d").LiveViews3d;
  cubeNet: LiveCubeNet;
  plotPoint: LivePlot;
  barChart: LiveBarChart;
  makeDiagram: LiveMakeDiagram;
  graphStory: LiveGraphStory;
  slopeLine: LiveSlope;
  trigBuild: LiveTrigBuild;
  unitCircleGame: LiveUnitCircle;
  slopeWalk: LiveSlopeWalk;
  parallelLab: LiveParallelLab;
  moveShape: LiveMoveShape;
  buildTriangle: LiveBuildTriangle;
  construct: LiveConstruct;
  scalePlan: LiveScalePlan;
  coinStack: LiveCoinStack;
  rootZoom: LiveRootZoom;
  absLine: LiveAbsLine;
  twoChanges: LiveTwoChanges;
  boxSplit: LiveBoxSplit;
  tableShares: LiveTableShares;
  fitLine: LiveFitLine;
  sampleField: LiveSampleField;
  tTails: LiveTTails;
  secantRate: LiveSecantRate;
  testPoints: LiveTestPoints;
  growthRace: LiveGrowthRace;
  completeSquare: LiveCompleteSquare;
  polyShape: LivePolyShape;
  asymptoteWalk: LiveAsymptoteWalk;
  squareCheck: LiveSquareCheck;
  moveGraph: LiveMoveGraph;
  wheelWave: LiveWheelWave;
  pinString: LivePinString;
  tracePath: LiveTracePath;
  closeIn: LiveCloseIn;
  foldBox: LiveFoldBox;
  fillUnder: LiveFillUnder;
  dropPoint: LiveDropPoint;
  solid: LiveSolid;
  turned: LiveTurned;
  cubeMatrix: LiveCubeMatrix;
  sohcahtoa: LiveSoh;
  trigDiscover: LiveDiscover;
  pythDiscover: LivePythDiscover;
  circleDiscover: LiveCircleDiscover;
  tessellate: LiveTessellate;
  oneStroke: LiveStroke;
  colourMap: LiveColour;
  shortestPath: LivePath;
  connectTowns: LiveTowns;
  beSort: LiveBeSort;
  beSearch: LiveBeSearch;
  beDp: LiveBeDp;
  beBinary: LiveBeBinary;
  bePointers: LiveBePointers;
  beWindow: LiveBeWindow;
  beBacktrack: LiveBeBacktrack;
  beHeap: LiveBeHeap;
  beTree: LiveBeTree;
  beStack: LiveBeStack;
  beUnion: LiveBeUnion;
  beCache: LiveBeCache;
  beBalance: LiveBeBalance;
  beRing: LiveBeRing;
  beLimit: LiveBeLimit;
  beQuorum: LiveBeQuorum;
  beQueue: LiveBeQueue;
  beComp: LiveBeComp;
  beTopo: LiveBeTopo;
  beName: LiveBeName;
  whichFrac: LiveWhich;
  whichWord: LiveWhich;
  whichEq: LiveWhich;
  whichQuad: LiveWhich;
  cruxWord: LiveCrux;
  cruxEq: LiveCrux;
  descentLab: LiveDescent;
  circuitLab: LiveCircuit;
  cpuLab: LiveCpu;
  systemLab: LiveSystem;
  raidLab: LiveRaid;
  cacheLab: LiveCache;
  ioLab: LiveIo;
  hammingLab: LiveHamming;
  pipelineLab: LivePipe;
  pagingLab: LivePaging;
  surface: LiveSurface;
  pcaLab: LivePca;
  softmaxLab: LiveSoftmax;
  embedLab: LiveEmbed;
  backpropLab: LiveBackprop;
  tensorLab: LiveTensor;
  fitLab: LiveFit;
  batchLab: LiveBatch;
  rocLab: LiveRoc;
  knnLab: LiveKnn;
  treeLab: LiveTree;
  kmeansLab: LiveKmeans;
  nnLab: LiveNn;
  convLab: LiveConv;
  attnLab: LiveAttn;
  rnnLab: LiveRnn;
  rlLab: LiveRl;
};
export type LiveKind = keyof LiveStates;

/** Design size of each piece in board pixels; a piece that is resized is scaled to fit. */
export const LIVE_SIZES: Record<LiveKind, [number, number]> = {
  clock: [320, 470],
  dice: [360, 330],
  spinner: [300, 470],
  coin: [280, 390],
  fractions: [320, 446],
  tenFrame: [400, 370],
  hundred: [400, 610],
  dots: [520, 620],
  graph: [640, 600],
  chance: [680, 570],
  cards: [690, 610],
  compare: [380, 530],
  compareFractions: [400, 640],
  division: [760, 640],
  rubik: [780, 1020],
  soroban: [820, 640],
  patterns: [800, 600],
  problems: [800, 700],
  solver: [800, 760],
  numberLine: [800, 440],
  geoboard: [600, 700],
  estimate: [720, 390],
  quickLook: [620, 700],
  target: [640, 430],
  closerTo: [640, 520],
  divisible: [600, 510],
  primeSlice: [640, 560],
  kakooma: [600, 600],
  rainPlus: [640, 680],
  rainTimes: [640, 680],
  runPlus: [640, 580],
  runTimes: [640, 580],
  joinSum: [500, 620],
  joinProduct: [500, 620],
  fractionWall: [660, 400],
  equivMatch: [620, 480],
  shapeSort: [660, 640],
  fracOrder: [720, 470],
  shadeFrac: [600, 610],
  stripes: [660, 680],
  foldStrip: [660, 620],
  fitTiles: [660, 560],
  findWhole: [660, 520],
  overflowBars: [660, 560],
  shareBags: [660, 580],
  frogJumps: [660, 500],
  makeOne: [640, 560],
  tileDrop: [640, 580],
  doubleLine: [680, 580],
  pizzaSlice: [640, 560],
  balance: [680, 560],
  machine: [600, 610],
  growing: [600, 660],
  numberShapes: [640, 740],
  algebraTiles: [680, 640],
  baseTen: [830, 660],
  cubes: [720, 700],
  rekenrek: [660, 590],
  rods: [720, 520],
  decGrid: [720, 560],
  measureHand: [740, 640],
  percentHand: [740, 520],
  simHand: [740, 720],
  circleHand: [740, 680],
  trigFind: [740, 680],
  vecFind: [740, 660],
  powerFind: [740, 680],
  ineqFind: [740, 640],
  cxPlane: [740, 600],
  matPlane: [740, 700],
  meanBalance: [740, 640],
  countTree: [740, 660],
  fairGame: [740, 660],
  normalCut: [740, 660],
  shapeRead: [740, 740],
  ladderRates: [740, 740],
  partialSums: [740, 740],
  areaBlocks: [780, 730],
  counters: [680, 600],
  signArrow: [680, 720],
  signPattern: [680, 640],
  geoLab: [990, 790],
  space: [720, 800],
  exprMatch: [780, 400],
  angleGuess: [600, 620],
  angleHunt: [600, 620],
  mirror: [560, 670],
  views3d: [760, 840],
  cubeNet: [700, 650],
  plotPoint: [560, 700],
  barChart: [560, 650],
  makeDiagram: [600, 630],
  graphStory: [600, 600],
  slopeLine: [560, 750],
  trigBuild: [600, 780],
  unitCircleGame: [520, 760],
  slopeWalk: [680, 820],
  parallelLab: [680, 640],
  moveShape: [680, 640],
  buildTriangle: [680, 600],
  construct: [700, 700],
  scalePlan: [700, 600],
  coinStack: [700, 590],
  rootZoom: [700, 520],
  absLine: [700, 520],
  twoChanges: [700, 520],
  boxSplit: [700, 460],
  tableShares: [700, 470],
  fitLine: [700, 490],
  sampleField: [700, 490],
  tTails: [700, 490],
  secantRate: [700, 490],
  testPoints: [700, 500],
  growthRace: [700, 490],
  completeSquare: [700, 500],
  polyShape: [700, 490],
  asymptoteWalk: [700, 500],
  squareCheck: [700, 490],
  moveGraph: [700, 490],
  wheelWave: [700, 580],
  pinString: [700, 510],
  tracePath: [700, 540],
  closeIn: [700, 560],
  foldBox: [700, 540],
  fillUnder: [700, 560],
  dropPoint: [700, 560],
  solid: [680, 760],
  turned: [680, 760],
  cubeMatrix: [680, 720],
  sohcahtoa: [600, 680],
  trigDiscover: [640, 720],
  pythDiscover: [640, 720],
  circleDiscover: [640, 720],
  tessellate: [640, 700],
  oneStroke: [560, 550],
  colourMap: [580, 580],
  shortestPath: [560, 590],
  connectTowns: [560, 550],
  beSort: [620, 440],
  beSearch: [1060, 640],
  beDp: [960, 600],
  beBinary: [1060, 520],
  bePointers: [1060, 640],
  beWindow: [1060, 620],
  beBacktrack: [1100, 660],
  beHeap: [1060, 660],
  beTree: [1060, 680],
  beStack: [1060, 620],
  beUnion: [1100, 640],
  beCache: [1060, 640],
  beBalance: [1060, 640],
  beRing: [1060, 700],
  beLimit: [1060, 640],
  beQuorum: [1060, 640],
  beQueue: [1060, 700],
  beComp: [1080, 720],
  beTopo: [1080, 680],
  beName: [1080, 700],
  whichFrac: [600, 560],
  whichWord: [600, 700],
  whichEq: [600, 560],
  whichQuad: [600, 560],
  cruxWord: [600, 780],
  cruxEq: [600, 620],
  descentLab: [660, 650],
  circuitLab: [660, 600],
  cpuLab: [700, 790],
  systemLab: [720, 790],
  raidLab: [720, 700],
  cacheLab: [700, 700],
  ioLab: [700, 680],
  hammingLab: [700, 680],
  pipelineLab: [700, 620],
  pagingLab: [700, 720],
  surface: [680, 790],
  pcaLab: [660, 720],
  softmaxLab: [660, 780],
  embedLab: [660, 600],
  backpropLab: [660, 660],
  tensorLab: [660, 730],
  fitLab: [660, 790],
  batchLab: [660, 950],
  rocLab: [660, 870],
  knnLab: [660, 810],
  treeLab: [660, 860],
  kmeansLab: [660, 830],
  nnLab: [660, 780],
  convLab: [660, 830],
  attnLab: [660, 790],
  rnnLab: [660, 800],
  rlLab: [660, 770],
};

export const LIVE_KINDS = Object.keys(LIVE_SIZES) as LiveKind[];
export const isLiveKind = (k: unknown): k is LiveKind => typeof k === "string" && Object.hasOwn(LIVE_SIZES, k);

export function initialLive<K extends LiveKind>(kind: K): LiveStates[K] {
  const start: LiveStates = {
    clock: { minutes: 10 * 60 + 10, showTime: true, snap: true, showMinutes: true },
    dice: { count: 2, faces: [3, 5], history: [] },
    spinner: { sections: 4, angle: 30, result: -1, counts: [0, 0, 0, 0] },
    coin: { side: 0, counts: [0, 0] },
    fractions: { shape: "circle", parts: 4, shaded: [true, false, false, false] },
    tenFrame: { double: false, cells: Array(20).fill(0) },
    hundred: { marked: [], n: 3 },
    dots: { k: 5, top: 3, bottom: 1 },
    graph: DEFAULT_LIVE_GRAPH,
    cards: CARDS_START,
    chance: { device: { kind: "die", sides: 6 }, tally: emptyTally(6), view: "bars", relative: true, theory: true, focus: 5, last: -1 },
    compare: { a: 5, b: 2, joined: false, guess: null },
    compareFractions: { a: { n: 2, d: 3 }, b: { n: 3, d: 4 }, joined: false, guess: null, same: false, half: false },
    division: { a: 624, b: 12, decimals: 0, style: "bracket", blocks: false, step: 0, turn: true, share: null, labels: true },
    rubik: { scramble: "", moves: "", alg: "R U R′ U′", reps: 0, prime: false, yaw: -35, pitch: 28 },
    soroban: { rods: 7, value: 0, showValue: true, showDigits: false, n: 38, work: null, target: null },
    patterns: { pattern: "twoptr", ...PATTERN_EXAMPLES.twoptr, step: 0, quiz: false },
    problems: { id: "twoNumberSum", inputs: [], step: 0, quiz: false },
    solver: SOLVER_START,
    numberLine: { from: 0, to: 10, step: 1, fractions: false, marks: [], jumps: true, together: false },
    geoboard: { mode: "free", stage: 0, pts: [], misses: 0, peeked: false, area: true, perim: true, said: null, last: null },
    estimate: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, errors: [], pin: null, half: false, peeked: false, streak: 0, said: null },
    quickLook: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], phase: "ready", answer: null, relooked: false, streak: 0, said: null },
    target: { mode: "puzzle", stage: 0, level: 1, seed: 1, sum: [], ways: [], hinted: false, streak: 0, said: null },
    closerTo: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], picked: null, streak: 0, said: null },
    divisible: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], wrong: [], misses: 0, hint: null, done: false, streak: 0, said: null },
    primeSlice: { mode: "puzzle", stage: 0, level: 1, seed: 1, done: false, cuts: 0, spared: 0, slips: 0, marks: [], streak: 0, said: null },
    kakooma: { mode: "puzzle", stage: 0, level: 1, seed: 1, solved: [], wrong: null, misses: 0, hinted: false, streak: 0, said: null },
    rainPlus: rainStart("plus"),
    rainTimes: rainStart("times"),
    runPlus: runStart("plus"),
    runTimes: runStart("times"),
    joinSum: joinStart("sum"),
    joinProduct: joinStart("product"),
    fractionWall: { mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [], best: 0, streak: 0, said: null },
    equivMatch: { mode: "puzzle", stage: 0, level: 1, seed: 1, cleared: [], picked: [], misses: 0, streak: 0, said: null },
    shapeSort: SORT_START,
    fracOrder: { mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [], sel: 0, checked: false, streak: 0, said: null },
    shadeFrac: { mode: "puzzle", stage: 0, level: 1, seed: 1, shaded: [], misses: 0, done: false, streak: 0, said: null },
    stripes: STRIPES_START,
    foldStrip: FOLD_START,
    fitTiles: FIT_TILES_START,
    findWhole: WHOLE_START,
    overflowBars: OVERFLOW_START,
    shareBags: SHARE_START,
    frogJumps: FROG_START,
    makeOne: MAKE_START,
    tileDrop: TILE_START,
    doubleLine: DOUBLE_START,
    pizzaSlice: PIZZA_START,
    balance: { mode: "puzzle", stage: 0, level: 1, seed: 1, guess: [], weighed: false, misses: 0, done: false, streak: 0, said: null },
    machine: { mode: "puzzle", stage: 0, level: 1, seed: 1, tried: [], typed: "", misses: 0, done: false, streak: 0, said: null },
    growing: { mode: "puzzle", stage: 0, level: 1, seed: 1, built: [], typed: "", misses: 0, done: false, streak: 0, said: null },
    numberShapes: SHAPES_START,
    algebraTiles: TILES_START,
    baseTen: { type: "placeValue", th: 0, h: 1, t: 2, o: 3, showTotal: true },
    cubes: CUBES_START,
    rekenrek: REKENREK_START,
    rods: RODS_START,
    decGrid: DEC_GRID_START,
    measureHand: MEASURE_HAND_START,
    percentHand: PERCENT_HAND_START,
    simHand: SIM_HAND_START,
    circleHand: CIRCLE_HAND_START,
    trigFind: TRIG_FIND_START,
    vecFind: VEC_FIND_START,
    powerFind: POWER_FIND_START,
    ineqFind: INEQ_FIND_START,
    cxPlane: CX_PLANE_START,
    matPlane: MAT_PLANE_START,
    meanBalance: MEAN_BALANCE_START,
    countTree: COUNT_TREE_START,
    fairGame: FAIR_GAME_START,
    normalCut: NORMAL_CUT_START,
    shapeRead: SHAPE_READ_START,
    ladderRates: LADDER_RATES_START,
    partialSums: PARTIAL_SUMS_START,
    areaBlocks: AREA_START,
    counters: COUNTERS_START,
    signArrow: SIGN_ARROW_START,
    signPattern: SIGN_PATTERN_START,
    geoLab: GEO_START,
    space: SPACE_START,
    exprMatch: { mode: "puzzle", stage: 0, level: 1, seed: 1, cleared: [], picked: [], misses: 0, streak: 0, said: null },
    angleGuess: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, errors: [], typed: "", guess: null, streak: 0, said: null },
    angleHunt: { mode: "puzzle", stage: 0, level: 1, seed: 1, typed: "", misses: 0, done: false, streak: 0, said: null },
    mirror: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    views3d: { difficulty: "easy", stage: 0, seed: Date.now() >>> 0, heights: Array(9).fill(0), history: [], checked: false, revealed: false },
    cubeNet: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], checked: false, misses: 0, done: false, streak: 0, said: null },
    plotPoint: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], tap: null, streak: 0, said: null },
    barChart: { mode: "puzzle", stage: 0, level: 1, seed: 1, bars: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    makeDiagram: { mode: "puzzle", stage: 0, level: 1, seed: 1, drawn: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    graphStory: { mode: "puzzle", stage: 0, level: 1, seed: 1, drawn: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    slopeLine: { mode: "puzzle", stage: 0, level: 1, seed: 1, b: null, misses: 0, done: false, streak: 0, said: null },
    trigBuild: { mode: "puzzle", stage: 0, level: 1, seed: 1, at: 0, misses: 0, done: false, streak: 0, said: null },
    unitCircleGame: { mode: "puzzle", stage: 0, level: 1, seed: 1, p: 0, placed: false, found: [], misses: 0, done: false, streak: 0, said: null },
    slopeWalk: SLOPE_WALK_START,
    parallelLab: PARALLEL_LAB_START,
    moveShape: MOVE_SHAPE_START,
    buildTriangle: BUILD_START,
    construct: CONSTRUCT_START,
    scalePlan: SCALE_PLAN_START,
    coinStack: COIN_START,
    rootZoom: ROOT_START,
    absLine: ABS_START,
    twoChanges: TWO_START,
    boxSplit: BOX_START,
    tableShares: TABLE_START,
    fitLine: FITLINE_START,
    sampleField: SAMPLE_START,
    tTails: TTAILS_START,
    secantRate: SECANT_START,
    testPoints: TESTPOINTS_START,
    growthRace: GROWTH_START,
    completeSquare: SQUARE_START,
    polyShape: POLY_START,
    asymptoteWalk: WALK_START,
    squareCheck: SQUARE_CHECK_START,
    moveGraph: MOVE_START,
    wheelWave: WHEEL_START,
    pinString: PIN_START,
    tracePath: TRACE_START,
    closeIn: CLOSE_START,
    foldBox: FOLDBOX_START,
    fillUnder: FILL_START,
    dropPoint: DROP_START,
    solid: SOLID_START,
    turned: TURNED_START,
    cubeMatrix: CUBE_MATRIX_START,
    sohcahtoa: { mode: "puzzle", stage: 0, level: 1, seed: 1, at: 0, top: null, bottom: null, misses: 0, done: false, streak: 0, said: null },
    trigDiscover: { mode: "puzzle", stage: 0, level: 1, seed: 1, n: null, rows: [], a: null, op: null, b: null, tried: [], flipped: false, misses: 0, done: false, streak: 0, said: null },
    pythDiscover: { mode: "puzzle", stage: 0, level: 1, seed: 1, n: null, rows: [], p1: null, op: null, p2: null, pr: null, tried: [], misses: 0, done: false, streak: 0, said: null },
    circleDiscover: { mode: "puzzle", stage: 0, level: 1, seed: 1, n: null, rows: [], qa: null, qx: null, qy: null, tried: [], misses: 0, done: false, streak: 0, said: null },
    tessellate: { mode: "puzzle", stage: 0, level: 1, seed: 1, count: 1, added: [], pieces: [], picked: null, misses: 0, done: false, streak: 0, said: null },
    oneStroke: { mode: "puzzle", stage: 0, level: 1, seed: 1, trail: [], misses: 0, done: false, streak: 0, said: null },
    colourMap: { mode: "puzzle", stage: 0, level: 1, seed: 1, colours: [], pen: 0, misses: 0, done: false, streak: 0, said: null },
    shortestPath: { mode: "puzzle", stage: 0, level: 1, seed: 1, route: [], misses: 0, done: false, streak: 0, said: null },
    connectTowns: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], misses: 0, done: false, streak: 0, said: null },
    beSort: { mode: "puzzle", stage: 0, level: 1, seed: 1, step: 0, misses: 0, done: false, streak: 0, said: null },
    beSearch: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beDp: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beBinary: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    bePointers: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beWindow: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beBacktrack: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beHeap: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beTree: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beStack: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beUnion: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beCache: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beBalance: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beRing: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beLimit: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beQuorum: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beQueue: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beComp: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beTopo: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    beName: { mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null },
    whichFrac: whichStart("frac"),
    whichWord: whichStart("word"),
    whichEq: whichStart("eq"),
    whichQuad: whichStart("quad"),
    cruxWord: cruxStart("word"),
    cruxEq: cruxStart("eq"),
    descentLab: DESCENT_START,
    circuitLab: CIRCUIT_START,
    cpuLab: CPU_START_STATE,
    systemLab: SYSTEM_START,
    raidLab: RAID_START,
    cacheLab: CACHE_START,
    ioLab: IO_START,
    hammingLab: HAMMING_START,
    pipelineLab: PIPE_START,
    pagingLab: PAGING_START,
    surface: SURFACE_START,
    pcaLab: PCA_START,
    softmaxLab: SOFTMAX_START,
    embedLab: EMBED_START,
    backpropLab: BP_START,
    tensorLab: TN_START,
    fitLab: FIT_START,
    batchLab: BATCH_START,
    rocLab: ROC_START,
    knnLab: KNN_START,
    treeLab: TREE_START,
    kmeansLab: KM_START,
    nnLab: NN_START,
    convLab: CONV_START,
    attnLab: ATTN_START,
    rnnLab: RNN_START,
    rlLab: RL_START,
  };
  return structuredClone(start[kind]);
}
