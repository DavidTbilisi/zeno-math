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
import type { LiveWall } from "./fractionWall";
import type { LiveEquiv } from "./equivMatch";
import type { LiveOrder } from "./fracOrder";
import type { LiveShade } from "./shadeFrac";
import type { LiveBalance } from "./balance";
import type { LiveMachine } from "./machine";
import type { LiveGrow } from "./growing";
import type { LiveExprMatch } from "./exprMatch";
import type { LiveAngleGuess } from "./angleGuess";
import type { LiveAngleHunt } from "./missingAngle";
import type { LiveMirror } from "./symmetry";
import type { LiveCubeNet } from "./cubeNets";
import type { LivePlot } from "./plotPoint";
import type { LiveBarChart } from "./barChart";
import type { LiveGraphStory } from "./graphStory";
import type { LiveSlope } from "./slope";
import type { LiveStroke } from "./oneStroke";
import type { LiveColour } from "./colouring";
import type { LivePath } from "./shortestPath";
import type { LiveTowns } from "./connectTowns";
import { DIVISION_LIMITS, planDivision, type DivisionStyle } from "./division";
import { PATTERN_EXAMPLES, type PatternId } from "./patternSteps";
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

/** Tapping square i (0-based) fills through it; tapping the last dot again takes it away. */
export const tapSquare = (dots: number, i: number) => (i + 1 === dots ? i : i + 1);

// ——— Ten frame and hundred square ———

/** The two colours of counters in a ten frame (0 empty, 1 and 2 the colours), counted for "a + b = n". */
export function counters(cells: number[]): { a: number; b: number; n: number } {
  const a = cells.filter((c) => c === 1).length;
  const b = cells.filter((c) => c === 2).length;
  return { a, b, n: a + b };
}

export const multiplesOf = (n: number, upTo = 100) => Array.from({ length: Math.floor(upTo / n) }, (_, i) => n * (i + 1));

/** The jumps on the hundred square: one along a row, ten down a column, and back. */
export const HUNDRED_STEPS = [1, 10, -1, -10] as const;
/** Where a jump from `at` lands, or null when it would leave the square (below 1 or past 100). */
export const hundredJump = (at: number, step: number) => (at + step >= 1 && at + step <= 100 ? at + step : null);
/** Every square a walk visits, the start first. */
export const hundredPath = (start: number, steps: number[]) => steps.reduce((p, s) => [...p, p[p.length - 1] + s], [start]);
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
export type LiveDivision = { a: number; b: number; decimals: number; style: DivisionStyle; blocks: boolean; step: number; turn: boolean; share: Sharing | null };

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
 * cube and its ball of circles are seen from, in degrees.
 */
export type LiveRubik = { scramble: string; moves: string; alg: string; reps: number; prime: boolean; yaw: number; pitch: number };

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
  compare: { a: number; b: number; joined: boolean; guess: CompareSign | null };
  compareFractions: { a: Frac; b: Frac; joined: boolean; guess: CompareSign | null; same: boolean; half: boolean };
  division: LiveDivision;
  rubik: LiveRubik;
  soroban: LiveSoroban;
  patterns: LivePatterns;
  numberLine: LiveNumberLine;
  geoboard: LiveGeoboard;
  estimate: LiveEstimate;
  quickLook: LiveQuickLook;
  target: LiveTarget;
  closerTo: LiveNear;
  divisible: LiveDivisible;
  fractionWall: LiveWall;
  equivMatch: LiveEquiv;
  fracOrder: LiveOrder;
  shadeFrac: LiveShade;
  balance: LiveBalance;
  machine: LiveMachine;
  growing: LiveGrow;
  exprMatch: LiveExprMatch;
  angleGuess: LiveAngleGuess;
  angleHunt: LiveAngleHunt;
  mirror: LiveMirror;
  cubeNet: LiveCubeNet;
  plotPoint: LivePlot;
  barChart: LiveBarChart;
  graphStory: LiveGraphStory;
  slopeLine: LiveSlope;
  oneStroke: LiveStroke;
  colourMap: LiveColour;
  shortestPath: LivePath;
  connectTowns: LiveTowns;
};
export type LiveKind = keyof LiveStates;

/** Design size of each piece in board pixels; a piece that is resized is scaled to fit. */
export const LIVE_SIZES: Record<LiveKind, [number, number]> = {
  clock: [300, 432],
  dice: [360, 236],
  spinner: [300, 372],
  coin: [260, 300],
  fractions: [320, 372],
  tenFrame: [340, 300],
  hundred: [400, 650],
  dots: [520, 600],
  graph: [640, 560],
  chance: [680, 500],
  compare: [380, 530],
  compareFractions: [400, 680],
  division: [760, 820],
  rubik: [780, 1000],
  soroban: [820, 540],
  patterns: [800, 600],
  numberLine: [800, 460],
  geoboard: [600, 660],
  estimate: [720, 390],
  quickLook: [620, 580],
  target: [640, 430],
  closerTo: [640, 470],
  divisible: [600, 480],
  fractionWall: [660, 380],
  equivMatch: [620, 480],
  fracOrder: [720, 470],
  shadeFrac: [600, 560],
  balance: [680, 560],
  machine: [600, 560],
  growing: [600, 660],
  exprMatch: [780, 400],
  angleGuess: [600, 620],
  angleHunt: [600, 620],
  mirror: [560, 620],
  cubeNet: [700, 600],
  plotPoint: [560, 700],
  barChart: [560, 600],
  graphStory: [600, 600],
  slopeLine: [560, 700],
  oneStroke: [560, 500],
  colourMap: [560, 540],
  shortestPath: [560, 540],
  connectTowns: [560, 500],
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
    chance: { device: { kind: "die", sides: 6 }, tally: emptyTally(6), view: "bars", relative: true, theory: true, focus: 5, last: -1 },
    compare: { a: 5, b: 2, joined: false, guess: null },
    compareFractions: { a: { n: 2, d: 3 }, b: { n: 3, d: 4 }, joined: false, guess: null, same: false, half: false },
    division: { a: 624, b: 12, decimals: 0, style: "bracket", blocks: false, step: 0, turn: true, share: null },
    rubik: { scramble: "", moves: "", alg: "R U R′ U′", reps: 0, prime: false, yaw: -35, pitch: 28 },
    soroban: { rods: 7, value: 0, showValue: true, showDigits: false, n: 38, work: null, target: null },
    patterns: { pattern: "twoptr", ...PATTERN_EXAMPLES.twoptr, step: 0, quiz: false },
    numberLine: { from: 0, to: 10, step: 1, fractions: false, marks: [], jumps: true, together: false },
    geoboard: { mode: "free", stage: 0, pts: [], misses: 0, peeked: false, area: true, perim: true, said: null, last: null },
    estimate: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, errors: [], pin: null, half: false, peeked: false, streak: 0, said: null },
    quickLook: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], phase: "ready", answer: null, relooked: false, streak: 0, said: null },
    target: { mode: "puzzle", stage: 0, level: 1, seed: 1, sum: [], ways: [], hinted: false, streak: 0, said: null },
    closerTo: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], picked: null, streak: 0, said: null },
    divisible: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], wrong: [], misses: 0, hint: null, done: false, streak: 0, said: null },
    fractionWall: { mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [], best: 0, streak: 0, said: null },
    equivMatch: { mode: "puzzle", stage: 0, level: 1, seed: 1, cleared: [], picked: [], misses: 0, streak: 0, said: null },
    fracOrder: { mode: "puzzle", stage: 0, level: 1, seed: 1, placed: [], sel: 0, checked: false, streak: 0, said: null },
    shadeFrac: { mode: "puzzle", stage: 0, level: 1, seed: 1, shaded: [], misses: 0, done: false, streak: 0, said: null },
    balance: { mode: "puzzle", stage: 0, level: 1, seed: 1, guess: [], weighed: false, misses: 0, done: false, streak: 0, said: null },
    machine: { mode: "puzzle", stage: 0, level: 1, seed: 1, tried: [], typed: "", misses: 0, done: false, streak: 0, said: null },
    growing: { mode: "puzzle", stage: 0, level: 1, seed: 1, built: [], typed: "", misses: 0, done: false, streak: 0, said: null },
    exprMatch: { mode: "puzzle", stage: 0, level: 1, seed: 1, cleared: [], picked: [], misses: 0, streak: 0, said: null },
    angleGuess: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, errors: [], typed: "", guess: null, streak: 0, said: null },
    angleHunt: { mode: "puzzle", stage: 0, level: 1, seed: 1, typed: "", misses: 0, done: false, streak: 0, said: null },
    mirror: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    cubeNet: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], checked: false, misses: 0, done: false, streak: 0, said: null },
    plotPoint: { mode: "puzzle", stage: 0, level: 1, seed: 1, i: 0, results: [], tap: null, streak: 0, said: null },
    barChart: { mode: "puzzle", stage: 0, level: 1, seed: 1, bars: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    graphStory: { mode: "puzzle", stage: 0, level: 1, seed: 1, drawn: [], wrong: [], misses: 0, done: false, streak: 0, said: null },
    slopeLine: { mode: "puzzle", stage: 0, level: 1, seed: 1, b: null, misses: 0, done: false, streak: 0, said: null },
    oneStroke: { mode: "puzzle", stage: 0, level: 1, seed: 1, trail: [], misses: 0, done: false, streak: 0, said: null },
    colourMap: { mode: "puzzle", stage: 0, level: 1, seed: 1, colours: [], pen: 0, misses: 0, done: false, streak: 0, said: null },
    shortestPath: { mode: "puzzle", stage: 0, level: 1, seed: 1, route: [], misses: 0, done: false, streak: 0, said: null },
    connectTowns: { mode: "puzzle", stage: 0, level: 1, seed: 1, chosen: [], misses: 0, done: false, streak: 0, said: null },
  };
  return structuredClone(start[kind]);
}
