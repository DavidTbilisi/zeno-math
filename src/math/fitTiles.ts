// How many fit? Dividing by measuring: tiles the size of the divisor laid along a bar the size of the dividend, and
// counted. 3/4 ÷ 1/8 = 6 tiles exactly; 3/4 ÷ 1/3 = 2¼, where the last tile pokes past the end and only a quarter of
// it is inside, a quarter of a tile, not of the whole (the leftover written as 1/12, a part of the whole, is the
// classic slip, and has its own answer).
import { Frac } from "./fraction";
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

export type FitTask = { a: Frac; b: Frac };
/** The most tiles a bar takes, and the most parts the cut tile is split into. */
export const MAX_TILES = 12;
export const MAX_PARTS = 12;

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** Whole tiles, and what is inside of the cut one as a part of a tile (zero when they fit exactly). */
export function fitOf(t: FitTask): { whole: number; part: Frac } {
  const q = t.a.div(t.b);
  const whole = Math.floor(q.toNumber() + 1e-9);
  return { whole, part: q.sub(new Frac(whole, 1)) };
}
/** How many tiles cover the bar: the whole ones, and the cut one if there is one. */
export const tilesToCover = (t: FitTask) => {
  const f = fitOf(t);
  return f.whole + (f.part.isZero() ? 0 : 1);
};

/** Level 1: a unit tile that fits exactly (3/4 ÷ 1/8); level 2: a unit tile that doesn't (3/4 ÷ 1/3 = 2¼); level 3: a
 *  tile bigger than one part, on a bar up to two wholes long (1 1/2 ÷ 2/5). */
export function fitTask(level: GameLevel, next: () => number): FitTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const proper = (d: number) => new Frac(pick(Array.from({ length: d - 1 }, (_, k) => k + 1).filter((n) => gcd(n, d) === 1)), d);
  for (;;) {
    let t: FitTask;
    if (level === 1) {
      const a = proper(pick([2, 3, 4]));
      t = { a, b: new Frac(1, a.d * pick([2, 3])) };
    } else if (level === 2) {
      const a = proper(pick([2, 3, 4, 5]));
      t = { a, b: new Frac(1, pick([2, 3, 4, 5, 6])) };
      if (fitOf(t).part.isZero()) continue;
    } else {
      const a = next() < 0.5 ? proper(pick([2, 3, 4])) : proper(pick([2, 3, 4])).add(Frac.ONE);
      const k = pick([3, 4, 5, 6]);
      const m = pick(Array.from({ length: k - 1 }, (_, i) => i + 1).filter((x) => x >= 2 && gcd(x, k) === 1));
      if (m === undefined) continue;
      t = { a, b: new Frac(m, k) };
    }
    const f = fitOf(t);
    if (t.b.toNumber() >= t.a.toNumber() || tilesToCover(t) > MAX_TILES || f.part.d > MAX_PARTS) continue;
    return t;
  }
}

export type FitWhy = "short" | "ofWhole" | "answer";
export type FitNotice = "ofTile" | "bigger" | "streak10";
export const FIT_NOTICES: FitNotice[] = ["ofTile", "bigger", "streak10"];

export type LiveFitTiles = GameBase<FitNotice, { kind: "wrong"; why: FitWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** The tiles laid along the bar. */
  laid: number;
  /** The answer: a whole number and a part, top over bottom. */
  whole: number;
  top: number;
  bottom: number;
  /** Free play: the bar and the tile, each a top over a bottom. */
  an: number;
  ad: number;
  bn: number;
  bd: number;
  misses: number;
  done: boolean;
};

export const FIT_FRESH: Partial<LiveFitTiles> = { laid: 0, whole: 0, top: 0, bottom: 1, misses: 0, done: false, said: null };
export const FIT_TILES_START: LiveFitTiles = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, laid: 0, whole: 0, top: 0, bottom: 1, an: 3, ad: 4, bn: 1, bd: 3, misses: 0, done: false };

export const FIT_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 511 },
  { level: 1, seed: 512 },
  { level: 1, seed: 513 },
  { level: 2, seed: 521 },
  { level: 2, seed: 522 },
  { level: 2, seed: 523 },
  { level: 3, seed: 531 },
  { level: 3, seed: 532 },
  { level: 3, seed: 533 },
];

export const fitNow = (d: Pick<LiveFitTiles, "mode" | "stage" | "level" | "seed">): FitTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? fitTask(FIT_LADDER[d.stage].level, rng(FIT_LADDER[d.stage].seed))
  : fitTask(d.level, rng(d.seed));

/** Free play's bar and tile, as set. */
export const freeFit = (d: Pick<LiveFitTiles, "an" | "ad" | "bn" | "bd">): FitTask => ({ a: new Frac(d.an, d.ad), b: new Frac(d.bn, d.bd) });

/** The answer written: whole + top/bottom, or null with no bottom. */
export const answerOf = (d: Pick<LiveFitTiles, "whole" | "top" | "bottom">) => (d.bottom > 0 ? new Frac(d.whole, 1).add(new Frac(d.top, d.bottom)) : null);

/** What is wrong with a check, or null when right: the bar covered first, then the count with the cut tile read as a
 *  part of a tile. */
export function judgeFit(t: FitTask, d: Pick<LiveFitTiles, "laid" | "whole" | "top" | "bottom">): FitWhy | null {
  if (d.laid < tilesToCover(t)) return "short";
  const got = answerOf(d);
  const want = t.a.div(t.b);
  if (got && got.sub(want).isZero()) return null;
  // The leftover read as a part of the whole: the whole tiles, and what is left of the bar.
  const f = fitOf(t);
  const ofWhole = new Frac(f.whole, 1).add(t.a.sub(t.b.mul(new Frac(f.whole, 1))));
  return got && !f.part.isZero() && got.sub(ofWhole).isZero() ? "ofWhole" : "answer";
}

export const fitStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: a leftover counted in tiles, or, when they fit, a quotient bigger than the bar. */
export function fitNotice(t: FitTask, streak: number): FitNotice | null {
  if (streak === 10) return "streak10";
  return fitOf(t).part.isZero() ? "bigger" : "ofTile";
}
