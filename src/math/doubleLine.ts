// Double number line: two amounts in proportion drawn as two lines tied at 0 and at one known pair (3 cups make 12
// cookies), every mark on the top line facing its partner on the bottom one, the partner always the top times the same
// k. A puzzle flags a missing amount, on either line, and the player builds marks until one stands on the flag. A move
// takes the gap between two marks, p to q, and either splits it into n equal parts (÷n: marks at p + (q − p)·i/n) or
// lays it n times from p (×n: a mark at p + n(q − p)); from 0 these are dividing and scaling the pair. The fewest moves
// is the aim: through the amount for one (÷3, then ×5) or through a common part (÷2, then ×5), whichever is shorter.
import { Frac } from "./fraction";
import type { EndlessGame, GameLevel } from "./ladder";
import { rng } from "./random";

/** What the two lines measure; the words for each are in the locales. */
export const CONTEXTS = ["flour", "drive", "apples", "paint", "print", "fuel"] as const;
export type DoubleCtx = (typeof CONTEXTS)[number];
/** The parts a gap can be split into, and the times it can be laid. */
export const NS = [2, 3, 4, 5] as const;
/** The most marks a line holds, so a run of splits cannot fill it with ticks no one can read. */
export const MAX_TICKS = 24;

export type DoubleOp = "split" | "times";
/** One move: the gap from mark p to mark q (top values, written "n/d"), split or laid n times. */
export type DMove = { p: string; q: string; op: DoubleOp; n: number };
/** A task: a top ↔ A bottom is the pair given; t is the top amount of the flag, asked on the bottom (`bot`) or, given
 *  its bottom partner, asked on the top (`top`); the lines run from 0 to `end` on the top. */
export type DoubleTask = { ctx: DoubleCtx; a: number; A: number; t: Frac; ask: "bot" | "top"; end: number };

export const fr = (f: Frac) => (f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);
const parse = (s: string) => Frac.parse(s) ?? Frac.ZERO;
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);

/** A value as it reads on a line: whole, a short decimal (1.5, 0.25), or a fraction (4/3). */
export function showVal(f: Frac): string {
  if (f.isInt()) return `${f.n}`;
  let d = f.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  const s = f.toNumber().toFixed(3).replace(/0+$/, "");
  return d === 1 && s.length <= 6 ? s : fr(f);
}

/** The bottom partner of a top value: top × A/a. */
export const partner = (t: DoubleTask, top: Frac) => top.mul(new Frac(t.A, t.a));
/** The flag's bottom amount. */
export const targetBot = (t: DoubleTask) => partner(t, t.t);

/** The marks a move makes (some may already be there). */
export function madeBy(p: Frac, q: Frac, op: DoubleOp, n: number): Frac[] {
  const gap = q.sub(p);
  if (op === "times") return [p.add(gap.mul(new Frac(n)))];
  return Array.from({ length: n - 1 }, (_, i) => p.add(gap.mul(new Frac(i + 1, n))));
}

const sorted = (fs: Frac[]) => {
  const seen = new Map<string, Frac>();
  for (const f of fs) seen.set(fr(f), f);
  return [...seen.values()].sort((x, y) => x.toNumber() - y.toNumber());
};
const has = (ticks: Frac[], f: Frac) => ticks.some((x) => x.n === f.n && x.d === f.d);

/** The marks after a move, or null when it would leave the lines, make nothing new, or crowd them past MAX_TICKS. */
export function afterMove(ticks: Frac[], end: number, p: Frac, q: Frac, op: DoubleOp, n: number): Frac[] | null {
  if (q.toNumber() <= p.toNumber() || !has(ticks, p) || !has(ticks, q)) return null;
  const made = madeBy(p, q, op, n);
  if (made.some((f) => f.toNumber() > end + 1e-9)) return null;
  const fresh = made.filter((f) => !has(ticks, f));
  if (!fresh.length || ticks.length + fresh.length > MAX_TICKS) return null;
  return sorted([...ticks, ...fresh]);
}

/** The marks the moves have made, with 0 and the given pair; a move that no longer fits is skipped. */
export function ticksOf(t: DoubleTask, moves: DMove[]): Frac[] {
  let ticks = [Frac.ZERO, new Frac(t.a)];
  for (const m of moves) ticks = afterMove(ticks, t.end, parse(m.p), parse(m.q), m.op, m.n) ?? ticks;
  return ticks;
}

export const reached = (t: DoubleTask, ticks: Frac[]) => has(ticks, t.t);

/** Every set of marks one move away. */
function nexts(ticks: Frac[], end: number): Frac[][] {
  const out: Frac[][] = [];
  for (let i = 0; i < ticks.length; i++)
    for (let j = i + 1; j < ticks.length; j++)
      for (const op of ["split", "times"] as const)
        for (const n of NS) {
          const r = afterMove(ticks, end, ticks[i], ticks[j], op, n);
          if (r) out.push(r);
        }
  return out;
}
/** Whether one move puts a mark on the target: (target − p)/(q − p) is 2 to 5 (laid), or i/n under 1 (split). */
function hits(ticks: Frac[], target: Frac, end: number): boolean {
  if (target.toNumber() > end + 1e-9) return false;
  for (let i = 0; i < ticks.length; i++)
    for (let j = i + 1; j < ticks.length; j++) {
      const r = target.sub(ticks[i]).div(ticks[j].sub(ticks[i]));
      const v = r.toNumber();
      if (r.isInt() && r.n >= 2 && r.n <= NS[NS.length - 1]) return true;
      if (v > 0 && v < 1 && r.d <= NS[NS.length - 1]) return true;
    }
  return false;
}

/** The fewest moves that put a mark on the flag, up to 3; null for more. */
export function fewest(t: DoubleTask): number | null {
  const start = ticksOf(t, []);
  if (reached(t, start)) return 0;
  if (hits(start, t.t, t.end)) return 1;
  const one = nexts(start, t.end);
  if (one.some((s) => hits(s, t.t, t.end))) return 2;
  const seen = new Set<string>();
  for (const s of one)
    for (const s2 of nexts(s, t.end)) {
      const key = s2.map(fr).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      if (hits(s2, t.t, t.end)) return 3;
    }
  return null;
}

/** Level 1: the flag a whole multiple or part of the pair (one move, ×n or ÷n); level 2: a whole k, two moves, through
 *  the amount for one or a common part; level 3: a k that is not whole (4 ↔ 6), two or three moves, the flag on either
 *  line. */
export function doubleTask(level: GameLevel, next: () => number): DoubleTask {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  for (;;) {
    const ctx = pick(CONTEXTS);
    let a: number, A: number, top: number;
    if (level < 3) {
      a = pick(range(2, 6));
      A = a * pick(range(2, level === 1 ? 6 : 8));
      top = level === 1 ? pick([...NS.map((m) => a * m), ...NS.filter((m) => a % m === 0).map((m) => a / m)]) : pick(range(1, 2 * a));
    } else {
      const s = pick([2, 3, 4]);
      const r = pick(range(s + 1, 4 * s).filter((x) => gcd(x, s) === 1));
      a = s * pick([1, 2]);
      A = (a * r) / s;
      top = pick(range(1, 3 * a).filter((x) => (x * r) % s === 0));
    }
    if (top === a) continue;
    const t: DoubleTask = { ctx, a, A, t: new Frac(top), ask: level === 3 && next() < 0.5 ? "top" : "bot", end: Math.ceil(Math.max(a, top) * 1.5) };
    const m = fewest(t);
    if (m === null) continue;
    if (level === 1 ? m !== 1 : level === 2 ? m !== 2 : m < 2) continue;
    return t;
  }
}

export const doubleStars = (moves: number, best: number) => (moves <= best ? 3 : moves === best + 1 ? 2 : 1);

export type DoubleNotice = "unit" | "common" | "streak10";
export const DOUBLE_NOTICES: DoubleNotice[] = ["unit", "common", "streak10"];
/** What a solve shows: the amount for one was made on the way, or the fewest moves went round it (through a common
 *  part, not 1); the streak of ten. */
export function doubleNotice(t: DoubleTask, moves: DMove[], streak: number): DoubleNotice | null {
  if (streak === 10) return "streak10";
  const ticks = ticksOf(t, moves);
  if (t.a !== 1 && has(ticks, Frac.ONE) && !t.t.isOne()) return "unit";
  if (moves.length >= 2 && moves.length <= (fewest(t) ?? 0) && !has(ticks, Frac.ONE)) return "common";
  return null;
}

export type LiveDouble = EndlessGame<DoubleNotice> & {
  moves: DMove[];
  /** The marks tapped (top values), at most two: two pick the gap a move works on. */
  sel: string[];
  done: boolean;
};
export const DOUBLE_FRESH: Partial<LiveDouble> = { moves: [], sel: [], done: false, said: null };
export const DOUBLE_START: LiveDouble = { mode: "puzzle", stage: 0, level: 1, seed: 1, streak: 0, said: null, moves: [], sel: [], done: false };

export const DOUBLE_LADDER: { level: GameLevel; seed: number }[] = [
  { level: 1, seed: 2211 },
  { level: 1, seed: 2212 },
  { level: 1, seed: 2213 },
  { level: 2, seed: 2221 },
  { level: 2, seed: 2222 },
  { level: 2, seed: 2223 },
  { level: 3, seed: 2231 },
  { level: 3, seed: 2232 },
  { level: 3, seed: 2233 },
];

export const doubleNow = (d: Pick<LiveDouble, "mode" | "stage" | "level" | "seed">): DoubleTask =>
  d.mode === "puzzle" ? doubleTask(DOUBLE_LADDER[d.stage].level, rng(DOUBLE_LADDER[d.stage].seed)) : doubleTask(d.level, rng(d.seed));

/** A tap on a mark: picks it, or lets it go when picked; a third pick keeps the last one and the new one. */
export function tapMark(sel: string[], v: string): string[] {
  if (sel.includes(v)) return sel.filter((s) => s !== v);
  return sel.length < 2 ? [...sel, v] : [sel[1], v];
}
/** The gap two picked marks make, smaller first. */
export function gapOf(sel: string[]): [Frac, Frac] | null {
  if (sel.length !== 2) return null;
  const [x, y] = sel.map(parse);
  return x.toNumber() < y.toNumber() ? [x, y] : [y, x];
}
