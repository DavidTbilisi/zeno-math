// Kakooma (Greg Tang's puzzle): a few numbers, and one of them is the sum of two others — which? Easy: four numbers to
// 10; medium: five to 20; hard: nine from the times tables, and the one wanted is the product of two others. Exactly one
// number is made from two others, in exactly one way, and a number is never used twice. Medium and hard lay traps: a
// number twice another (7 and 14, which would need the 7 twice), or its square (4 and 16), and on hard one that is the
// sum of two others, not their product. A grid is four sets whose answers fill a fifth in the middle, solved last.
// The answer is the number, typed or tapped; three slips are named: one of the two parts given for the number they make,
// a number used twice, and a sum given for a product. The endless run also asks for a difference or a quotient, at
// every level: those are a sum or a product read backwards (7 − 5 = 2 is 2 + 5 = 7), and since 7 − 2 = 5 as well, two
// numbers would be a difference; so there the three numbers of the fact are tapped, in any order.
import { rng } from "./random";
import type { EndlessGame } from "./ladder";

export type KakLevel = 1 | 2 | 3;
export type KakOp = "+" | "*";
/** What the endless run asks: the sum or the product (tap it), or a difference or a quotient (tap the fact's three). */
export type KakSign = "+" | "-" | "*" | "/";
export const KAK_SIGNS: KakSign[] = ["+", "-", "*", "/"];
/** The fact a sign is read from: a difference from a sum, a quotient from a product. */
export const opOf = (sign: KakSign): KakOp => (sign === "+" || sign === "-" ? "+" : "*");
/** Whether the three numbers of the fact are tapped, not the one made from the other two. */
export const isFact = (sign: KakSign) => sign === "-" || sign === "/";
/** A set of numbers in the order shown, the one made from two others, and those two (smaller first). */
export type KakSet = { level: KakLevel; op: KakOp; nums: number[]; answer: number; parts: [number, number] };

/** A sign, how many numbers a set has, the numbers they are drawn from, and the largest of the two parts. */
export type KakSpec = { op: KakOp; size: number; lo: number; hi: number; top: number };
/** Each level of the ladder (and of practice). */
export const KAK: Record<KakLevel, KakSpec> = {
  1: { op: "+", size: 4, lo: 1, hi: 10, top: 10 },
  2: { op: "+", size: 5, lo: 1, hi: 20, top: 20 },
  // The parts come from the times tables, up to 10 × 10; the other numbers may be anything to 60.
  3: { op: "*", size: 9, lo: 2, hi: 60, top: 10 },
};
/**
 * The endless run's levels for sums (and differences) and for products (and quotients): the ladder's, with sums to 40
 * among nine numbers on hard, and products on easy (four numbers, the tables to 6 × 6) and medium (five, to 10 × 10).
 */
export const KAK_RUN: Record<KakOp, Record<KakLevel, KakSpec>> = {
  "+": { 1: KAK[1], 2: KAK[2], 3: { op: "+", size: 9, lo: 1, hi: 40, top: 40 } },
  "*": { 1: { op: "*", size: 4, lo: 2, hi: 36, top: 6 }, 2: { op: "*", size: 5, lo: 2, hi: 60, top: 10 }, 3: KAK[3] },
};
const make = (op: KakOp, a: number, b: number) => (op === "+" ? a + b : a * b);

/** Every way one number of the set is made from two others, as [x, a, b] with a < b. */
export function ways(nums: number[], op: KakOp): [number, number, number][] {
  const out: [number, number, number][] = [];
  const sorted = [...nums].sort((p, q) => p - q);
  for (const x of sorted)
    for (const [i, a] of sorted.entries())
      for (const b of sorted.slice(i + 1)) if (a !== x && b !== x && make(op, a, b) === x) out.push([x, a, b]);
  return out;
}

/** The ways of making n from two different numbers of the level (neither n itself), smaller first. */
export function partsOf(n: number, at: KakLevel | KakSpec): [number, number][] {
  const { op, lo, top } = typeof at === "number" ? KAK[at] : at;
  const out: [number, number][] = [];
  for (let a = lo; a <= top; a++) {
    const b = op === "+" ? n - a : n / a;
    if (Number.isInteger(b) && a < b && b <= top && b !== n) out.push([a, b]);
  }
  return out;
}

/** How many of the endless run's last sets the next one keeps clear of (their two parts, and the last two's answers). */
export const KAK_RECENT = 8;

/**
 * A set of the level whose one answer is made from two others. `answer` asks for that answer (a corner of a grid);
 * `size` and `usable` shape the middle of a grid, whose numbers must each be some corner's answer; `recent` is the
 * endless run's last sets' parts, not used again, nor the last two's answers; `spec` is the endless run's level when
 * it isn't the ladder's.
 */
export function kakSet(
  level: KakLevel,
  next: () => number,
  o: { answer?: number; size?: number; usable?: (n: number) => boolean; recent?: [number, number][]; spec?: KakSpec } = {},
): KakSet {
  const spec = o.spec ?? KAK[level];
  const { op, lo, hi, top } = spec;
  const size = o.size ?? spec.size;
  const ok = o.usable ?? (() => true);
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  const recent = o.recent ?? [];
  for (;;) {
    let a: number, b: number;
    if (o.answer !== undefined) {
      const ps = partsOf(o.answer, spec);
      [a, b] = ps[int(0, ps.length - 1)];
    } else {
      [a, b] = [int(lo, top), int(lo, top)].sort((p, q) => p - q);
      if (a === b || make(op, a, b) > hi) continue;
    }
    const x = make(op, a, b);
    // Not two parts of the last few sets again, nor the answer of the last two (easy has only twenty sums, and 9 or 10
    // is the answer of nearly half its sets).
    if (recent.some(([p, q]) => p === a && q === b) || recent.slice(-2).some(([p, q]) => make(op, p, q) === x)) continue;
    const nums = [x, a, b];
    const put = (y: number) => y >= lo && y <= hi && !nums.includes(y) && nums.length < size && nums.push(y);
    // Above easy, more often than not a trap: one of the parts doubled (or squared), and among products now and then
    // their sum, seldom both, which would leave no number drawn at random and the same two parts the same set every time.
    if (level > 1 && next() < 0.7) {
      const z = next() < 0.5 ? a : b;
      put(make(op, z, z));
    }
    if (level > 1 && op === "*" && next() < (nums.length === 3 ? 0.4 : 0.15)) put(a + b);
    while (nums.length < size) put(int(lo, hi));
    if (!nums.every(ok) || ways(nums, op).length !== 1) continue;
    // Above easy the answer is seldom the largest, so looking at the biggest number first isn't enough.
    if (level > 1 && x === Math.max(...nums) && next() < 0.7) continue;
    for (let i = nums.length - 1; i > 0; i--) {
      const j = int(0, i);
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return { level, op, nums, answer: x, parts: [a, b] };
  }
}

/**
 * A grid: four corner sets, and the middle made of their answers (corner i's answer is the middle's i-th number). A
 * corner has at most five numbers, so that hard's four corners still fit round the middle.
 */
export type KakGrid = { corners: KakSet[]; middle: KakSet };
export function kakGrid(level: KakLevel, next: () => number): KakGrid {
  const middle = kakSet(level, next, { size: 4, usable: (n) => partsOf(n, level).length > 0 });
  return { corners: middle.nums.map((n) => kakSet(level, next, { answer: n, size: Math.min(KAK[level].size, 5) })), middle };
}

export type KakSlip = "partForWhole" | "usedTwice" | "sumNotProduct";
/**
 * What tapping n says, if it isn't the answer: a slip that is named, or null when no two others make it at all. One of
 * the two parts (the number they make wanted instead); a number twice another, or its square (one number used twice);
 * on hard, the sum of two others (a sum, not a product).
 */
export function kakSlip(s: KakSet, n: number): { id: KakSlip; vars: Record<string, number> } | null {
  if (n === s.answer) return null;
  const z = s.nums.find((y) => y !== n && make(s.op, y, y) === n);
  if (z !== undefined) return { id: "usedTwice", vars: { n, z } };
  if (s.op === "*") {
    const sum = ways(s.nums, "+").find(([x]) => x === n);
    if (sum) return { id: "sumNotProduct", vars: { n, a: sum[1], b: sum[2] } };
  }
  if (s.parts.includes(n)) return { id: "partForWhole", vars: { n } };
  return null;
}
/** The traps a set lays: the numbers in it that are a slip, each with its slip. */
export const kakTraps = (s: KakSet) =>
  s.nums.flatMap((n) => {
    const x = kakSlip(s, n);
    return x ? [{ n, ...x }] : [];
  });

/** The sum or product that makes the answer, as written: 7 = 3 + 4, 12 = 3 × 4. */
export const kakSum = (s: Pick<KakSet, "op" | "answer" | "parts">) => `${s.answer} = ${s.parts[0]} ${s.op === "+" ? "+" : "×"} ${s.parts[1]}`;
/** The fact as the sign asks it: 7 = 3 + 4 and 12 = 3 × 4, or 7 − 4 = 3 and 12 ÷ 4 = 3. */
export const kakFact = (s: Pick<KakSet, "op" | "answer" | "parts">, sign: KakSign) =>
  isFact(sign) ? `${s.answer} ${sign === "-" ? "−" : "÷"} ${s.parts[1]} = ${s.parts[0]}` : kakSum(s);
/** Whether three numbers tapped are the fact: the answer and its two parts. */
export const kakIsFact = (s: KakSet, picked: number[]) => picked.length === 3 && [s.answer, ...s.parts].every((n) => picked.includes(n));
/**
 * Three numbers tapped that aren't the fact, read the way they were meant, the largest first: 9 − 4 isn't 3, as
 * 4 + 3 = 7; 24 ÷ 6 isn't 3, as 6 × 3 = 18. The check is the sum or product, which always comes out whole.
 */
export function kakFactSlip(s: KakSet, picked: number[]): { id: "noDiff" | "noQuot"; vars: Record<string, number> } {
  const [a, b, c] = [...picked].sort((p, q) => q - p);
  return { id: s.op === "+" ? "noDiff" : "noQuot", vars: { a, b, c, d: make(s.op, b, c) } };
}

// ---------- the board's game ----------

/**
 * Easy, medium, then hard: two sets and a grid of each — 7 = 2 + 5; 9 = 4 + 5 beside 8 (4 twice); 4 = 1 + 3, the
 * smallest but one; 20 = 4 + 16 among doubles; 24 = 4 × 6; 42 = 6 × 7 beside 49 (7 twice) and 13 (6 + 7).
 */
export const KAK_LADDER: { level: KakLevel; grid: boolean; seed: number }[] = [
  { level: 1, grid: false, seed: 102 },
  { level: 1, grid: false, seed: 108 },
  { level: 1, grid: true, seed: 103 },
  { level: 2, grid: false, seed: 208 },
  { level: 2, grid: false, seed: 202 },
  { level: 2, grid: true, seed: 203 },
  { level: 3, grid: false, seed: 435 },
  { level: 3, grid: false, seed: 522 },
  { level: 3, grid: true, seed: 303 },
];
/** A puzzle or the endless run's set: one set, or a grid's four corners and its middle last; and what it asks. */
export type KakTask = { level: KakLevel; sign: KakSign; sets: KakSet[] };
/** The ladder's sign at a level: sums to medium, products on hard (and the endless run's, until another is picked). */
export const ladderSign = (level: KakLevel): KakSign => KAK[level].op;
export function kakTask(level: KakLevel, grid: boolean, seed: number, recent: [number, number][] = [], sign = ladderSign(level)): KakTask {
  const next = rng(seed);
  if (!grid) return { level, sign, sets: [kakSet(level, next, { recent, spec: KAK_RUN[opOf(sign)][level] })] };
  const g = kakGrid(level, next);
  return { level, sign, sets: [...g.corners, g.middle] };
}
/** Stars: no miss three, one two, else one; the hint takes one off, never the last. */
export const kakStars = (misses: number, hinted: boolean) => Math.max(1, (misses === 0 ? 3 : misses === 1 ? 2 : 1) - (hinted ? 1 : 0));
/** In a grid the middle opens once every corner is solved; a set on its own is always open. */
export const kakOpen = (t: KakTask, solved: number[], i: number) => t.sets.length === 1 || i < 4 || [0, 1, 2, 3].every((k) => solved.includes(k));

export type KakNotice = "notFooled" | "grid" | "quick" | "streak10";
export const KAK_NOTICES: KakNotice[] = ["notFooled", "grid", "quick", "streak10"];
/**
 * What a puzzle done shows: ten in a row; and with no miss and no hint, a whole grid, a set with a trap in it (a number
 * doubled or squared, a sum among products), or a set done within four seconds.
 */
export function kakNotice(t: KakTask, misses: number, hinted: boolean, ms: number, streak: number): KakNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0 || hinted) return null;
  if (t.sets.length > 1) return "grid";
  if (kakTraps(t.sets[0]).some((x) => x.id !== "partForWhole")) return "notFooled";
  if (ms <= 4000) return "quick";
  return null;
}
export type LiveKakooma = EndlessGame<KakNotice, KakLevel> & {
  /** The sets solved, the last wrong tap (which set, which number), and the misses. */
  solved: number[];
  wrong: { set: number; n: number } | null;
  misses: number;
  /** Whether the hint (one of the two parts ringed in every open set) is showing. */
  hinted: boolean;
  /** The endless run's last sets' two parts (up to KAK_RECENT), which the set being played keeps clear of. */
  recent?: [number, number][];
  /** The endless run's sign, once one is picked (until then the ladder's at that level). */
  sign?: KakSign;
  /** A difference's or quotient's numbers tapped so far, and the last three tapped that weren't the fact. */
  picked?: number[];
  missed?: number[] | null;
};
/** The puzzle being played, or the endless run's set. */
export const kakNow = (d: Pick<LiveKakooma, "mode" | "stage" | "level" | "seed" | "recent" | "sign">): KakTask =>
  d.mode === "puzzle"
    ? kakTask(KAK_LADDER[d.stage].level, KAK_LADDER[d.stage].grid, KAK_LADDER[d.stage].seed)
    : kakTask(d.level, false, d.seed, d.recent, d.sign ?? ladderSign(d.level));
