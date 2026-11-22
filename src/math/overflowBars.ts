// Overflow bars: shading past one whole spills into a second bar, then a third, so 7/4 and 1¾ are the same picture:
// seven quarters shaded, one full bar and three quarters of the next. A number line under the bars runs past 1. The
// ladder asks for an improper fraction as a mixed number and the other way, shading it first. Turning 2¾ into one
// fraction has two classic slips: the whole times the top (2·3 + 4 = 10, so 10/4) and the whole not multiplied (5/4).
import { Frac } from "./fraction";
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

/** toMixed: shade n/d and write it as a whole and a part; toImproper: shade the whole and part of n/d (n > d, not a
 *  whole number) and write it as one fraction. */
export type OverflowTask = { kind: "toMixed" | "toImproper"; n: number; d: number };
/** The most bars, so the most wholes. */
export const MAX_BARS = 3;
export const MAX_D = 8;

/** The whole number and the part's top of n/d: 11/4 is 2 and 3. */
export const mixedOf = (n: number, d: number) => ({ w: Math.floor(n / d), a: n % d });
/** The bars drawn for a shading: the full ones and the one being shaded, or a spare one to spill into. */
export const barsFor = (shaded: number, d: number) => Math.min(MAX_BARS, Math.floor(shaded / d) + 1);

/** Level 1: one whole and a part, improper to mixed (5/3); level 2: mixed to improper (2 1/4); level 3: either way,
 *  up to three wholes, smaller parts, and wholes with no part (12/4 = 3). */
export function overflowTask(level: GameLevel, next: () => number): OverflowTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  if (level === 1) {
    const d = pick([2, 3, 4]);
    return { kind: "toMixed", n: pick(range(d + 1, 2 * d - 1)), d };
  }
  if (level === 2) {
    const d = pick(range(2, 6));
    return { kind: "toImproper", n: pick([1, 2]) * d + pick(range(1, d - 1)), d };
  }
  const d = pick(range(3, MAX_D));
  if (next() < 0.5) return { kind: "toMixed", n: pick(range(d + 1, MAX_BARS * d)), d };
  return { kind: "toImproper", n: pick(range(d + 1, MAX_BARS * d - 1).filter((n) => n % d !== 0)), d };
}

export type OverflowWhy = "shade" | "whole" | "timesTop" | "addWhole" | "answer";
export type OverflowNotice = "exact" | "three" | "streak10";
export const OVERFLOW_NOTICES: OverflowNotice[] = ["exact", "three", "streak10"];

export type LiveOverflow = GameBase<OverflowNotice, { kind: "wrong"; why: OverflowWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** The parts shaded, across the bars in reading order. */
  shaded: number;
  /** The answer: a whole (toMixed only) and top over bottom. */
  whole: number;
  top: number;
  bottom: number;
  /** Free play: the parts in each bar. */
  d: number;
  misses: number;
  done: boolean;
};

export const OVERFLOW_FRESH: Partial<LiveOverflow> = { shaded: 0, whole: 0, top: 0, bottom: 1, misses: 0, done: false, said: null };
export const OVERFLOW_START: LiveOverflow = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, shaded: 0, whole: 0, top: 0, bottom: 1, d: 4, misses: 0, done: false };

export const OVERFLOW_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 711 },
  { level: 1, seed: 712 },
  { level: 1, seed: 713 },
  { level: 2, seed: 721 },
  { level: 2, seed: 722 },
  { level: 2, seed: 723 },
  { level: 3, seed: 731 },
  { level: 3, seed: 732 },
  { level: 3, seed: 733 },
];

export const overflowNow = (d: Pick<LiveOverflow, "mode" | "stage" | "level" | "seed">): OverflowTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? overflowTask(OVERFLOW_LADDER[d.stage].level, rng(OVERFLOW_LADDER[d.stage].seed))
  : overflowTask(d.level, rng(d.seed));

/** A tap on part i (counted across the bars): shade up to it, or, on the last one shaded, take it off. */
export const tapPart = (shaded: number, i: number) => (i + 1 === shaded ? i : i + 1);

/** What is wrong with a check, or null when right: the shading first, then the answer (any equal fraction). */
export function judgeOverflow(t: OverflowTask, d: Pick<LiveOverflow, "shaded" | "whole" | "top" | "bottom">): OverflowWhy | null {
  if (d.shaded !== t.n) return "shade";
  if (d.bottom <= 0) return "answer";
  const want = new Frac(t.n, t.d);
  const { w, a } = mixedOf(t.n, t.d);
  if (t.kind === "toMixed") {
    if (new Frac(d.whole, 1).add(new Frac(d.top, d.bottom)).sub(want).isZero() && d.top < d.bottom) return null;
    return d.whole !== w ? "whole" : "answer";
  }
  const got = new Frac(d.top, d.bottom);
  if (got.sub(want).isZero()) return null;
  if (d.bottom === t.d && d.top === w * a + t.d) return "timesTop";
  if (d.bottom === t.d && d.top === w + a) return "addWhole";
  return "answer";
}

export const overflowStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: a whole number with no part, or a spill into the third bar. */
export function overflowNotice(t: OverflowTask, streak: number): OverflowNotice | null {
  if (streak === 10) return "streak10";
  if (t.n % t.d === 0) return "exact";
  return t.n > 2 * t.d ? "three" : null;
}
