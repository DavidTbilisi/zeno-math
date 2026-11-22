// Stripes: fractions as stripes across a square. Multiply: one fraction is shaded as vertical stripes and the other as
// horizontal ones, and the cells shaded both ways are the product (2/3 × 3/4 = 6/12). Add: one square shows a fraction in
// vertical stripes and the other in horizontal ones; cut each the other way until their cells are the same size and the
// shaded cells pour together into one sum (1/3 + 1/4 = 4/12 + 3/12). Between: two neighbours with the same bottom
// (2/5 and 3/5) look as if nothing fits between them; cut across and the cells of the strip between them are fractions
// that do. Level 1 multiplies, level 2 adds, level 3 finds one between; free play is the multiplying square on its own.
import { Frac } from "./fraction";
import { rng } from "./random";
import type { GameBase, GameLevel, GameMode } from "./ladder";

export type StripeKind = "times" | "plus" | "between";
export type StripeTask = { kind: StripeKind; a: Frac; b: Frac };
export const STRIPE_KINDS: Record<GameLevel, StripeKind> = { 1: "times", 2: "plus", 3: "between" };
/** The most cuts a square takes one way. */
export const MAX_CUTS = 12;

/** A task of a kind: proper fractions with small bottoms; added ones have different bottoms, neighbours are n/d and (n+1)/d. */
export function stripeTask(level: GameLevel, next: () => number): StripeTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const proper = (lo: number, hi: number) => {
    const d = int(lo, hi);
    return new Frac(int(1, d - 1), d);
  };
  const kind = STRIPE_KINDS[level];
  if (kind === "between") {
    const d = int(3, 7);
    const n = int(1, d - 2);
    return { kind, a: new Frac(n, d), b: new Frac(n + 1, d) };
  }
  for (;;) {
    const [a, b] = [proper(2, 5), proper(2, 6)];
    // Kept in lowest terms as written, so the stripes are cut as the fraction says; added ones need two bottoms.
    if (kind === "plus" && a.d === b.d) continue;
    return { kind, a, b };
  }
}

export type StripeWhy = "cols" | "rows" | "answer" | "size" | "notBetween";
export type StripeNotice = "smaller" | "lowest" | "overOne" | "manyBetween" | "streak10";
export const STRIPE_NOTICES: StripeNotice[] = ["smaller", "lowest", "overOne", "manyBetween", "streak10"];

export type LiveStripes = GameBase<StripeNotice, { kind: "wrong"; why: StripeWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** Multiplying (and free play): the vertical stripes, and how many from the left are shaded; the horizontal ones, from the top. */
  cols: number;
  colsOn: number;
  rows: number;
  rowsOn: number;
  /** Adding: the cuts across the first square and down the second; finding one between: the cuts across the square. */
  across: number;
  down: number;
  /** Finding one between: the cells shaded, column by column. */
  cells: number;
  /** The answer, a top over a bottom. */
  top: number;
  bottom: number;
  misses: number;
  done: boolean;
};

export const STRIPES_FRESH: Partial<LiveStripes> = { cols: 1, colsOn: 0, rows: 1, rowsOn: 0, across: 1, down: 1, cells: 0, top: 0, bottom: 1, misses: 0, done: false, said: null };
export const STRIPES_START: LiveStripes = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, ...(STRIPES_FRESH as Omit<LiveStripes, "mode" | "stage" | "level" | "seed" | "streak" | "said">) };

export const STRIPE_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 311 },
  { level: 1, seed: 312 },
  { level: 1, seed: 313 },
  { level: 2, seed: 321 },
  { level: 2, seed: 322 },
  { level: 2, seed: 323 },
  { level: 3, seed: 331 },
  { level: 3, seed: 332 },
  { level: 3, seed: 333 },
];
/** The task now, or null in free play. */
export const stripesNow = (d: Pick<LiveStripes, "mode" | "stage" | "level" | "seed">): StripeTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? stripeTask(STRIPE_LADDER[d.stage].level, rng(STRIPE_LADDER[d.stage].seed))
  : stripeTask(d.level, rng(d.seed));

/** A tap on stripe k shades up to it, or, on the last one shaded, one fewer. */
export const tapStripe = (on: number, k: number) => (k + 1 === on ? k : k + 1);
/** Stripes cut again: no more shaded than there are. */
export const recut = (n: number, on: number) => ({ n: Math.max(1, Math.min(MAX_CUTS, n)), on: Math.min(on, Math.max(1, Math.min(MAX_CUTS, n))) });
export const fracOf = (n: number, d: number) => new Frac(n, Math.max(1, d));
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
/** The vertical stripes a task's first square is cut into: its first bottom, or, for neighbours written in lowest terms
 *  (2/6 and 3/6 are 1/3 and 1/2), the bottom they share. */
export const stripeCols = (t: StripeTask) => (t.kind === "between" ? (t.a.d * t.b.d) / gcd(t.a.d, t.b.d) : t.a.d);
const same = (x: Frac, y: Frac) => x.n === y.n && x.d === y.d;

/** Adding: the two squares' cells are the same size when both are cut into as many. */
export const sameCells = (t: StripeTask, d: Pick<LiveStripes, "across" | "down">) => t.a.d * d.across === t.b.d * d.down;
/** Adding: the cells of one square, and the shaded cells of both poured together. */
export const poured = (t: StripeTask, d: Pick<LiveStripes, "across" | "down">) => ({ each: t.a.d * d.across, filled: t.a.n * d.across + t.b.n * d.down });

/** What is wrong with a check, or null when it is right. */
export function judgeStripes(t: StripeTask, d: LiveStripes): StripeWhy | null {
  const answer = d.bottom > 0 ? fracOf(d.top, d.bottom) : null;
  if (t.kind === "times") {
    if (!same(fracOf(d.colsOn, d.cols), t.a)) return "cols";
    if (!same(fracOf(d.rowsOn, d.rows), t.b)) return "rows";
    return answer && same(answer, t.a.mul(t.b)) ? null : "answer";
  }
  if (t.kind === "plus") {
    if (!sameCells(t, d)) return "size";
    return answer && same(answer, t.a.add(t.b)) ? null : "answer";
  }
  const v = fracOf(d.cells, stripeCols(t) * d.across).toNumber();
  return v > t.a.toNumber() && v < t.b.toNumber() ? null : "notBetween";
}

export const stripeStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: a product smaller than both, an answer in lower terms than the cells, a sum past one, many between. */
export function stripeNotice(t: StripeTask, d: LiveStripes, streak: number): StripeNotice | null {
  if (streak === 10) return "streak10";
  if (t.kind === "between") return d.across >= 3 ? "manyBetween" : null;
  if (t.kind === "plus" && t.a.add(t.b).toNumber() > 1) return "overOne";
  const cells = t.kind === "times" ? d.cols * d.rows : poured(t, d).each;
  if (d.bottom < cells) return "lowest";
  return t.kind === "times" ? "smaller" : null;
}
