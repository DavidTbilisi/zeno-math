// Fold to equal: a paper strip with a shaded part. Folding it in two (or three) and opening it doubles (triples) its
// pieces while the shaded amount stays, so 1/2 = 2/4 = 4/8 shows without a rule; unfolding, which erases every other
// line (or two of three), is simplifying, and only works when the shaded part ends on a line that stays. A puzzle asks
// for the strip as an equal fraction with a given bottom (2/3 as ?/12): fold or unfold it into that many pieces and
// write the top.
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

/** A move: fold in two or three (a positive k), or unfold by two or three (a negative one). */
export type FoldMove = 2 | 3 | -2 | -3;
export const FOLD_MOVES: FoldMove[] = [2, 3, -2, -3];
/** The most pieces a strip is drawn in. */
export const MAX_PIECES = 48;

/** A start, as written (6/8 stays 6/8), and the bottom to reach. */
export type FoldTask = { n: number; d: number; to: number };

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** Level 1 folds in two (1/3 as ?/12), level 2 needs a fold in three (3/4 as ?/12), level 3 starts unsimplified and
 *  unfolds first (6/8 as ?/4, or as ?/12). */
export function foldTask(level: GameLevel, next: () => number): FoldTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const proper = (d: number) => {
    const tops = Array.from({ length: d - 1 }, (_, k) => k + 1).filter((n) => gcd(n, d) === 1);
    return pick(tops);
  };
  if (level === 1) {
    const d = pick([2, 3, 4, 5]);
    return { n: proper(d), d, to: d * pick([2, 4]) };
  }
  if (level === 2) {
    const d = pick([2, 3, 4]);
    return { n: proper(d), d, to: d * pick([3, 6]) };
  }
  const b = pick([2, 3, 4, 5]);
  const k = pick([2, 3, 4]);
  const a = proper(b);
  const m = pick([1, 1, 2, 3].filter((x) => x !== k));
  return { n: a * k, d: b * k, to: b * m };
}

/** The strip after a run of moves, or null if a move can't be made (too many pieces, or a line under the shading's end). */
export function foldAll(n: number, d: number, path: FoldMove[]): { n: number; d: number } | null {
  let at: { n: number; d: number } | null = { n, d };
  for (const m of path) at = at && foldOnce(at, m);
  return at;
}
export function foldOnce(at: { n: number; d: number }, m: FoldMove): { n: number; d: number } | null {
  if (m > 0) return at.d * m <= MAX_PIECES ? { n: at.n * m, d: at.d * m } : null;
  const k = -m;
  return at.d % k === 0 && at.n % k === 0 ? { n: at.n / k, d: at.d / k } : null;
}

/** The fewest moves from a start to a bottom (a short search; every bottom the ladder asks for is reachable). */
export function fewestFolds(t: FoldTask): number {
  const seen = new Set([t.d]);
  let wave: { n: number; d: number }[] = [{ n: t.n, d: t.d }];
  for (let steps = 0; wave.length; steps++) {
    if (wave.some((s) => s.d === t.to)) return steps;
    const next: { n: number; d: number }[] = [];
    for (const s of wave)
      for (const m of FOLD_MOVES) {
        const o = foldOnce(s, m);
        if (o && !seen.has(o.d)) {
          seen.add(o.d);
          next.push(o);
        }
      }
    wave = next;
  }
  return Infinity;
}

export type FoldWhy = "pieces" | "top";
export type FoldNotice = "simplified" | "fewest" | "tripled" | "streak10";
export const FOLD_NOTICES: FoldNotice[] = ["simplified", "fewest", "tripled", "streak10"];

export type LiveFold = GameBase<FoldNotice, { kind: "wrong"; why: FoldWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** The moves made so far, from the start. */
  path: FoldMove[];
  /** The answer's top. */
  top: number;
  /** Free play: the strip's start, as written. */
  n: number;
  d: number;
  misses: number;
  done: boolean;
};

export const FOLD_FRESH: Partial<LiveFold> = { path: [], top: 0, misses: 0, done: false, said: null };
export const FOLD_START: LiveFold = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, path: [], top: 0, n: 1, d: 2, misses: 0, done: false };

export const FOLD_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 411 },
  { level: 1, seed: 412 },
  { level: 1, seed: 413 },
  { level: 2, seed: 421 },
  { level: 2, seed: 422 },
  { level: 2, seed: 423 },
  { level: 3, seed: 431 },
  { level: 3, seed: 432 },
  { level: 3, seed: 433 },
];

/** The task now, or null in free play. */
export const foldNow = (d: Pick<LiveFold, "mode" | "stage" | "level" | "seed">): FoldTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? foldTask(FOLD_LADDER[d.stage].level, rng(FOLD_LADDER[d.stage].seed))
  : foldTask(d.level, rng(d.seed));

/** The strip's start: the task's, or free play's own. */
export const foldStart = (t: FoldTask | null, d: Pick<LiveFold, "n" | "d">) => (t ? { n: t.n, d: t.d } : { n: d.n, d: d.d });

/** Every strip along the way, the start first: the trail of equal fractions. */
export function foldTrail(start: { n: number; d: number }, path: FoldMove[]): { n: number; d: number }[] {
  const out = [start];
  for (const m of path) {
    const o = foldOnce(out[out.length - 1], m);
    if (!o) break;
    out.push(o);
  }
  return out;
}

/** What is wrong with a check, or null when right: the strip in the asked-for pieces, and the top it shows. */
export function judgeFold(t: FoldTask, d: Pick<LiveFold, "path" | "top">): FoldWhy | null {
  const at = foldAll(t.n, t.d, d.path);
  if (!at || at.d !== t.to) return "pieces";
  return d.top === at.n ? null : "top";
}

export const foldStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: fewer pieces than it started with, the fewest moves (two or more), a fold in three. */
export function foldNotice(t: FoldTask, d: Pick<LiveFold, "path">, streak: number): FoldNotice | null {
  if (streak === 10) return "streak10";
  if (t.to < t.d) return "simplified";
  const best = fewestFolds(t);
  if (best >= 2 && d.path.length === best) return "fewest";
  if (d.path.includes(3)) return "tripled";
  return null;
}
