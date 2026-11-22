// Share the bag, and bar models. A fraction of a set: 3/5 of 20 sweets is dealing the twenty into five bags, fair, and
// taking three of them, twelve sweets. A bar model for a word problem: "2/5 of the money is 30, how much is all of it?"
// is a bar cut in fifths, 30 over two of them, so one part is 15 and the five are 75. Worked back from what is left
// ("3/5 is spent and 20 is left") the 20 sits over the other two parts, and putting it over the three spent is the slip.
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

/** set: a/b of n sweets, dealt into b bags. part: a/b of all is x. left: a/b is spent and x is left. */
export type ShareTask = { kind: "set"; a: number; b: number; n: number } | { kind: "part" | "left"; a: number; b: number; x: number };
export const MAX_BAGS = 6;
export const MAX_SWEETS = 24;

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** Level 1: one bag of a set (1/4 of 12); level 2: several bags (3/5 of 20), or a bar with the part known; level 3:
 *  a bar with the part known, or the part left. */
export function shareTask(level: GameLevel, next: () => number): ShareTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const proper = (b: number, from: number) => pick(range(from, b - 1).filter((a) => gcd(a, b) === 1));
  if (level === 1) {
    const b = pick(range(2, 5));
    return { kind: "set", a: 1, b, n: b * pick(range(2, 4)) };
  }
  if (level === 2 && next() < 0.6) {
    const b = pick(range(3, 5));
    return { kind: "set", a: proper(b, 2), b, n: b * pick(range(2, 4)) };
  }
  const b = pick(range(3, MAX_BAGS));
  const a = proper(b, level === 2 ? 1 : 2);
  const unit = pick(range(2, 12));
  if (level === 2 || next() < 0.5) return { kind: "part", a, b, x: a * unit };
  return { kind: "left", a, b, x: (b - a) * unit };
}

/** One part of the bar (or one bag), and all of it. */
export const unitOf = (t: ShareTask) => (t.kind === "set" ? t.n / t.b : t.kind === "part" ? t.x / t.a : t.x / (t.b - t.a));
export const wantOf = (t: ShareTask) => (t.kind === "set" ? t.a * unitOf(t) : t.b * unitOf(t));

export type ShareWhy = "deal" | "unequal" | "take" | "oneBag" | "cut" | "part" | "leftSlip" | "total" | "answer";
export type ShareNotice = "bags" | "back" | "streak10";
export const SHARE_NOTICES: ShareNotice[] = ["bags", "back", "streak10"];

export type ShareState = {
  /** Sweets in each bag (missing bags hold none). */
  bags: number[];
  /** The bags taken. */
  taken: number[];
  /** Bar: the parts it is cut into, one part's value, and all of it. */
  cut: number;
  part: number;
  /** The answer: the sweets taken, or all of the bar. */
  answer: number;
};

/** Sweets still in the pile. */
export const pileOf = (n: number, bags: number[]) => n - bags.reduce((s, k) => s + k, 0);
/** One sweet into bag j. */
export const putIn = (bags: number[], b: number, j: number) => Array.from({ length: b }, (_, i) => (bags[i] ?? 0) + (i === j ? 1 : 0));
/** One sweet back out of bag j. */
export const takeOut = (bags: number[], b: number, j: number) => Array.from({ length: b }, (_, i) => Math.max(0, (bags[i] ?? 0) - (i === j ? 1 : 0)));
/** A round from the pile: a sweet into each bag, from the first, while the pile lasts. */
export function dealRound(bags: number[], b: number, n: number): number[] {
  let pile = pileOf(n, bags);
  return Array.from({ length: b }, (_, i) => (bags[i] ?? 0) + (pile-- > 0 ? 1 : 0));
}
export const toggleTaken = (taken: number[], j: number) => (taken.includes(j) ? taken.filter((k) => k !== j) : [...taken, j].sort((x, y) => x - y));

/** What is wrong with a check, or null when right. */
export function judgeShare(t: ShareTask, d: ShareState): ShareWhy | null {
  if (t.kind === "set") {
    const bags = Array.from({ length: t.b }, (_, i) => d.bags[i] ?? 0);
    if (pileOf(t.n, bags)) return "deal";
    if (bags.some((k) => k !== bags[0])) return "unequal";
    if (d.taken.length !== t.a) return "take";
    if (d.answer === wantOf(t)) return null;
    return t.a > 1 && d.answer === unitOf(t) ? "oneBag" : "answer";
  }
  if (d.cut !== t.b) return "cut";
  if (d.part !== unitOf(t)) return t.kind === "left" && d.part * t.a === t.x ? "leftSlip" : "part";
  return d.answer === wantOf(t) ? null : "total";
}

export const shareStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: several bags taken, a whole worked back from what was left. */
export function shareNotice(t: ShareTask, streak: number): ShareNotice | null {
  if (streak === 10) return "streak10";
  if (t.kind === "left") return "back";
  return t.kind === "set" && t.a > 1 ? "bags" : null;
}

export type LiveShare = GameBase<ShareNotice, { kind: "wrong"; why: ShareWhy }> & ShareState & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** Free play: the sweets and the bags. */
  n: number;
  b: number;
  misses: number;
  done: boolean;
};

export const SHARE_FRESH: Partial<LiveShare> = { bags: [], taken: [], cut: 1, part: 0, answer: 0, misses: 0, done: false, said: null };
export const SHARE_START: LiveShare = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, bags: [], taken: [], cut: 1, part: 0, answer: 0, n: 12, b: 3, misses: 0, done: false };

export const SHARE_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 811 },
  { level: 1, seed: 812 },
  { level: 1, seed: 814 },
  { level: 2, seed: 911 },
  { level: 2, seed: 912 },
  { level: 2, seed: 914 },
  { level: 3, seed: 1016 },
  { level: 3, seed: 1034 },
  { level: 3, seed: 1037 },
];

export const shareNow = (d: Pick<LiveShare, "mode" | "stage" | "level" | "seed">): ShareTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? shareTask(SHARE_LADDER[d.stage].level, rng(SHARE_LADDER[d.stage].seed))
  : shareTask(d.level, rng(d.seed));
