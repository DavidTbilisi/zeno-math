// Frog jumps. A frog hops along a number line in fraction jumps; where it lands is a sum (1/2 + 1/2 + 1/4) and, when
// every jump is one size, a product (4 jumps of 1/3 land on 4 × 1/3 = 4/3). A puzzle names a target and the jump
// sizes, and asks for the fewest jumps that land on it exactly. The line runs to 3; zooming into one whole opens its
// gap, every tick labelled, so 5/8 can be found among the eighths.
import { Frac } from "./fraction";
import type { GameBase, GameLevel, GameMode } from "./ladder";
import { rng } from "./random";

export type FrogTask = { sizes: Frac[]; target: Frac };
/** Where the line ends, and the most jumps one row holds. */
export const LINE_END = 3;
export const MAX_JUMPS = 24;

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const lcm = (x: number, y: number) => (x * y) / gcd(x, y);
/** The finest step: one over the least common denominator of the sizes and the target. */
export const stepOf = (fs: Frac[]) => fs.reduce((m, f) => lcm(m, f.d), 1);

/** The fewest jumps (forward, any mix of the sizes) that land on the target, or null when none do. */
export function fewest(sizes: Frac[], target: Frac): number | null {
  const L = stepOf([...sizes, target]);
  const T = (target.n * L) / target.d;
  const cs = sizes.map((s) => (s.n * L) / s.d);
  const best: number[] = [0];
  for (let x = 1; x <= T; x++) best[x] = Math.min(...cs.map((c) => (c <= x ? best[x - c] + 1 : Infinity)));
  return Number.isFinite(best[T]) ? best[T] : null;
}

/** Level 1: one unit size, k jumps (k × 1/d); level 2: a size and a half of it (1/2 and 1/4 to 7/4); level 3: two
 *  sizes neither of which measures the other (1/2 and 1/3 to 5/6), where the fewest need both. */
export function frogTask(level: GameLevel, next: () => number): FrogTask {
  const pick = <T>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  for (;;) {
    let sizes: Frac[];
    if (level === 1) sizes = [new Frac(1, pick([2, 3, 4, 5, 6]))];
    else if (level === 2) {
      const [a, b] = pick([[2, 4], [3, 6], [2, 6], [4, 8], [2, 8], [5, 10]]);
      sizes = [new Frac(1, a), new Frac(1, b)];
    } else {
      const [a, b] = pick([[1, 2, 1, 3], [1, 3, 1, 4], [1, 2, 1, 5], [1, 4, 1, 6], [2, 3, 1, 4], [3, 4, 1, 3], [1, 2, 2, 5]]
        .map((q) => [new Frac(q[0], q[1]), new Frac(q[2], q[3])]));
      sizes = [a, b];
    }
    const L = stepOf(sizes);
    const units = pick(Array.from({ length: 2 * L - 1 }, (_, i) => i + 2));
    const target = new Frac(units, L);
    const m = fewest(sizes, target);
    if (m === null || m < 2 || m > 9) continue;
    // Past level 1 the fewest must use both sizes: one size alone would not be a puzzle about mixing.
    if (level > 1 && sizes.some((s) => fewest([s], target) === m)) continue;
    return { sizes, target };
  }
}

/** Where the jumps land: the sum of the sizes jumped. */
export const landOf = (sizes: Frac[], jumps: number[]) => jumps.reduce((at, j) => at.add(sizes[j] ?? Frac.ZERO), Frac.ZERO);
const fr = (f: Frac) => (f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);
/** The jumps as a sum of products, the bigger sizes first: "3 × 1/2 + 1 × 1/4", or "4 × 1/3". */
export function exprOf(sizes: Frac[], jumps: number[]): string {
  return sizes
    .map((s, i) => ({ s, k: jumps.filter((j) => j === i).length }))
    .filter((x) => x.k)
    .sort((x, y) => y.s.toNumber() - x.s.toNumber())
    .map(({ s, k }) => `${k} × ${fr(s)}`)
    .join(" + ");
}

export type FrogWhy = "none" | "short" | "past" | "more";
export type FrogNotice = "times" | "mix" | "streak10";
export const FROG_NOTICES: FrogNotice[] = ["times", "mix", "streak10"];

/** What is wrong with a check, or null when right: on the target, and in the fewest jumps. */
export function judgeFrog(t: FrogTask, jumps: number[]): FrogWhy | null {
  if (!jumps.length) return "none";
  const gap = t.target.sub(landOf(t.sizes, jumps));
  if (gap.isNeg()) return "past";
  if (!gap.isZero()) return "short";
  return jumps.length > (fewest(t.sizes, t.target) ?? Infinity) ? "more" : null;
}

export const frogStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a right answer shows: jumps of one size as a product, or the fewest made of both sizes. */
export function frogNotice(t: FrogTask, streak: number): FrogNotice | null {
  if (streak === 10) return "streak10";
  return t.sizes.length > 1 ? "mix" : (fewest(t.sizes, t.target) ?? 0) > 2 ? "times" : null;
}

export type LiveFrog = GameBase<FrogNotice, { kind: "wrong"; why: FrogWhy }> & {
  mode: GameMode;
  level: GameLevel;
  seed: number;
  streak: number;
  timed?: boolean;
  /** The jumps made, each an index into the sizes. */
  jumps: number[];
  /** The whole zoomed into (0 for 0–1), or -1 for the whole line. */
  zoom: number;
  /** Free play: the jump size, top over bottom. */
  n: number;
  d: number;
  misses: number;
  done: boolean;
};

export const FROG_FRESH: Partial<LiveFrog> = { jumps: [], zoom: -1, misses: 0, done: false, said: null };
export const FROG_START: LiveFrog = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, jumps: [], zoom: -1, n: 1, d: 3, misses: 0, done: false };

export const FROG_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 1111 },
  { level: 1, seed: 1112 },
  { level: 1, seed: 1113 },
  { level: 2, seed: 1121 },
  { level: 2, seed: 1122 },
  { level: 2, seed: 1123 },
  { level: 3, seed: 1131 },
  { level: 3, seed: 1132 },
  { level: 3, seed: 1133 },
];

export const frogNow = (d: Pick<LiveFrog, "mode" | "stage" | "level" | "seed">): FrogTask | null =>
  d.mode === "free" ? null
  : d.mode === "puzzle" ? frogTask(FROG_LADDER[d.stage].level, rng(FROG_LADDER[d.stage].seed))
  : frogTask(d.level, rng(d.seed));

/** One more jump, unless it would leave the line or the row is full. */
export const canJump = (sizes: Frac[], jumps: number[], j: number) =>
  jumps.length < MAX_JUMPS && landOf(sizes, [...jumps, j]).toNumber() <= LINE_END + 1e-9;
