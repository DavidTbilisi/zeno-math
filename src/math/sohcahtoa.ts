// SOH CAH TOA: a bare right-angled triangle with whole sides (a Pythagorean triple), turned any way, and θ at one of
// its sharp corners. Each of sin θ, cos θ and tan θ is built as a fraction of two of its sides, the top and the
// bottom, so the skill is reading opposite, adjacent and hypotenuse off the triangle from θ, whichever way it lies.
// Easy sits the triangle flat with θ at the bottom and the mnemonic shown; medium turns it and moves θ; hard gives one
// ratio (sin θ = 5/13) with the sides unlabelled: put its two numbers on their sides, find the third by Pythagoras,
// then build the other two. A wrong fraction is told what it is (that's cos θ; upside down) and its sides are named.
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rng } from "./random";
import { RATIO_PARTS, type TrigName, type TrigRatio } from "./trigBuild";

/** A side by where it is before the triangle is turned: `a` along the bottom, `b` up, `c` the slant. */
export type SohSide = "a" | "b" | "c";
export const SOH_SIDES: readonly SohSide[] = ["a", "b", "c"];

export type SohTask = {
  level: GameLevel;
  /** The sides' lengths: two legs and the hypotenuse, whole. */
  len: Record<SohSide, number>;
  /** θ at the far end of `a` (the bottom corner) or of `b` (the top corner). */
  at: "a" | "b";
  /** The turn of the drawing, in degrees, and whether it is drawn the other way round. */
  turn: number;
  mirror: boolean;
  /** The ratios to build, in turn. */
  order: TrigRatio[];
  /** Hard: the ratio given, its sides unlabelled until placed, and the lengths offered for the third side. */
  given: TrigRatio | null;
  thirds: number[];
};

/** What a side is to θ: with θ at the end of `a`, `a` touches it and `b` is across from it. */
export const nameOf = (at: "a" | "b", s: SohSide): TrigName => (s === "c" ? "hyp" : s === at ? "adj" : "opp");
export const sideOf = (at: "a" | "b", n: TrigName): SohSide => (n === "hyp" ? "c" : n === "adj" ? at : at === "a" ? "b" : "a");

/** Right-angled triangles with whole sides, legs first, none too thin to read. */
export const TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
].filter(([p, q]) => q / p < 3.6) as [number, number, number][];

const RATIOS: TrigRatio[] = ["sin", "cos", "tan"];
const shuffle = <T>(xs: readonly T[], next: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A length as the choices write it: whole, or the root of a whole number. */
export const rootText = (sq: number) => (Number.isInteger(Math.sqrt(sq)) ? String(Math.sqrt(sq)) : `√${sq}`);

/**
 * The lengths offered for the third side, as squares so a root stays exact: the right one, the two sides added, the
 * two taken away, and Pythagoras the wrong way round (squares added for a leg, taken away for the hypotenuse).
 */
export function thirdChoices(len: Record<SohSide, number>, missing: SohSide): { sq: number; slip: ThirdSlip | null }[] {
  const [p, q] = SOH_SIDES.filter((s) => s !== missing).map((s) => len[s]);
  const right = len[missing] ** 2;
  const wrongSquares = missing === "c" ? Math.abs(p * p - q * q) : p * p + q * q;
  return [
    { sq: right, slip: null },
    { sq: (p + q) ** 2, slip: "add" as const },
    { sq: (p - q) ** 2, slip: "sub" as const },
    { sq: wrongSquares, slip: "squares" as const },
  ];
}
export type ThirdSlip = "add" | "sub" | "squares";
export const thirdSlip = (t: SohTask, sq: number): ThirdSlip | null => thirdChoices(t.len, missingOf(t)).find((c) => c.sq === sq)?.slip ?? null;
/** The side a hard task leaves out: the one its given ratio doesn't use. */
export const missingOf = (t: Pick<SohTask, "at" | "given">): SohSide => {
  const used = RATIO_PARTS[t.given ?? "sin"].map((n) => sideOf(t.at, n));
  return SOH_SIDES.find((s) => !used.includes(s))!;
};

/** The drawing's turns: easy lies flat; medium and hard any multiple of 30°. */
const TURNS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function sohTask(level: GameLevel, next: () => number): SohTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const [p, q, c] = pick(TRIPLES);
  const flip = next() < 0.5;
  const len = { a: flip ? q : p, b: flip ? p : q, c };
  const mirror = next() < 0.5;
  if (level === 1) return { level, len, at: "a", turn: 0, mirror, order: RATIOS, given: null, thirds: [] };
  const at = next() < 0.5 ? "a" : "b";
  const turn = pick(TURNS.filter((x) => x !== 0));
  if (level === 2) return { level, len, at, turn, mirror, order: shuffle(RATIOS, next), given: null, thirds: [] };
  const given = pick(RATIOS);
  const t = { level, len, at, turn, mirror, given } as const;
  const thirds = shuffle(
    thirdChoices(len, missingOf(t)).map((x) => x.sq),
    next,
  );
  return { ...t, order: shuffle(RATIOS.filter((r) => r !== given), next), thirds };
}

/** A puzzle's steps: on hard, the given ratio's top and bottom placed and the third side found; then each ratio built. */
export type SohStep = { kind: "place"; n: TrigName } | { kind: "third" } | { kind: "build"; r: TrigRatio };
export const stepsOf = (t: SohTask): SohStep[] => [
  ...(t.given ? [...RATIO_PARTS[t.given].map((n) => ({ kind: "place" as const, n })), { kind: "third" as const }] : []),
  ...t.order.map((r) => ({ kind: "build" as const, r })),
];
/** The sides whose length shows after `at` steps: all of them, or on hard only those placed or found. */
export function shownSides(t: SohTask, at: number): SohSide[] {
  if (!t.given) return [...SOH_SIDES];
  const steps = stepsOf(t);
  const shown: SohSide[] = [];
  steps.slice(0, at).forEach((s) => {
    if (s.kind === "place") shown.push(sideOf(t.at, s.n));
    if (s.kind === "third") shown.push(missingOf(t));
  });
  return shown;
}

/** What a fraction built is: the ratio itself, another ratio, the ratio upside down, or another upside down. */
export type BuildSlip = "other" | "flip" | "neither";
export function buildSlip(t: Pick<SohTask, "at">, r: TrigRatio, top: SohSide, bottom: SohSide): BuildSlip | null {
  const [x, y] = [nameOf(t.at, top), nameOf(t.at, bottom)];
  const [p, q] = RATIO_PARTS[r];
  if (x === p && y === q) return null;
  if (x === q && y === p) return "flip";
  return RATIOS.some((o) => RATIO_PARTS[o][0] === x && RATIO_PARTS[o][1] === y) ? "other" : "neither";
}
/** The ratio a fraction of two sides is, if any. */
export const ratioOfParts = (x: TrigName, y: TrigName): TrigRatio | null => RATIOS.find((o) => RATIO_PARTS[o][0] === x && RATIO_PARTS[o][1] === y) ?? null;

/** A ratio as a fraction of this triangle's sides: sin θ = 5/13. */
export const fractionOf = (t: SohTask, r: TrigRatio): [number, number] => RATIO_PARTS[r].map((n) => t.len[sideOf(t.at, n)]) as [number, number];

// ---------- the board's game ----------

export const SOH_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 7 },
  { level: 1, seed: 12 },
  { level: 1, seed: 10 },
  { level: 2, seed: 13 },
  { level: 2, seed: 2 },
  { level: 2, seed: 4 },
  { level: 3, seed: 9 },
  { level: 3, seed: 6 },
  { level: 3, seed: 5 },
];
/** Stars by the misses over the whole puzzle: none three, one two, more one. */
export const sohStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

export type SohNotice = "allThree" | "turned" | "fromOne" | "streak10";
export const SOH_NOTICES: SohNotice[] = ["allThree", "turned", "fromOne", "streak10"];
/** What a puzzle solved with no miss shows: the whole triangle from one ratio, one read on a slant, all three ratios; ten in a row. */
export function sohNotice(t: SohTask, misses: number, streak: number): SohNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (t.given) return "fromOne";
  if (t.turn % 90 !== 0) return "turned";
  return "allThree";
}

export type SohSaid =
  | { kind: "place"; got: TrigName }
  | { kind: "third"; sq: number }
  | { kind: "build"; top: SohSide; bottom: SohSide };
export type LiveSoh = EndlessGame<SohNotice, GameLevel, SohSaid> &
  TryGame & {
    /** How many of the puzzle's steps are done. */
    at: number;
    /** The fraction being built: the side on top and the side underneath, or nothing yet. */
    top: SohSide | null;
    bottom: SohSide | null;
  };
export const sohNow = (d: Pick<LiveSoh, "mode" | "stage" | "level" | "seed">): SohTask =>
  d.mode === "puzzle" ? sohTask(SOH_LADDER[d.stage].level, rng(SOH_LADDER[d.stage].seed)) : sohTask(d.level, rng(d.seed));
