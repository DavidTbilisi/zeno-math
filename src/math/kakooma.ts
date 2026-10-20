// Kakooma (Greg Tang's puzzle): a few numbers, and one of them is the sum of two others — which? Easy: four numbers to
// 10; medium: five to 20; hard: five from the times tables, and the one wanted is the product of two others. Exactly one
// number is made from two others, in exactly one way, and a number is never used twice. Medium and hard lay traps: a
// number twice another (7 and 14, which would need the 7 twice), or its square (4 and 16), and on hard one that is the
// sum of two others, not their product. A grid is four sets whose answers fill a fifth in the middle, solved last.
// The answer is the number, typed or tapped; three slips are named: one of the two parts given for the number they make,
// a number used twice, and a sum given for a product.
import { rng } from "./random";

export type KakLevel = 1 | 2 | 3;
export type KakOp = "+" | "*";
/** A set of numbers in the order shown, the one made from two others, and those two (smaller first). */
export type KakSet = { level: KakLevel; op: KakOp; nums: number[]; answer: number; parts: [number, number] };

/** Each level's sign, how many numbers a set has, the numbers they are drawn from, and the largest of the two parts. */
export const KAK: Record<KakLevel, { op: KakOp; size: number; lo: number; hi: number; top: number }> = {
  1: { op: "+", size: 4, lo: 1, hi: 10, top: 10 },
  2: { op: "+", size: 5, lo: 1, hi: 20, top: 20 },
  // The parts come from the times tables, up to 10 × 10; the other numbers may be anything to 60.
  3: { op: "*", size: 5, lo: 2, hi: 60, top: 10 },
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
export function partsOf(n: number, level: KakLevel): [number, number][] {
  const { op, lo, top } = KAK[level];
  const out: [number, number][] = [];
  for (let a = lo; a <= top; a++) {
    const b = op === "+" ? n - a : n / a;
    if (Number.isInteger(b) && a < b && b <= top && b !== n) out.push([a, b]);
  }
  return out;
}

/**
 * A set of the level whose one answer is made from two others. `answer` asks for that answer (a corner of a grid);
 * `size` and `usable` shape the middle of a grid, whose numbers must each be some corner's answer.
 */
export function kakSet(level: KakLevel, next: () => number, o: { answer?: number; size?: number; usable?: (n: number) => boolean } = {}): KakSet {
  const { op, lo, hi, top } = KAK[level];
  const size = o.size ?? KAK[level].size;
  const ok = o.usable ?? (() => true);
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  for (;;) {
    let a: number, b: number;
    if (o.answer !== undefined) {
      const ps = partsOf(o.answer, level);
      [a, b] = ps[int(0, ps.length - 1)];
    } else {
      [a, b] = [int(lo, top), int(lo, top)].sort((p, q) => p - q);
      if (a === b || make(op, a, b) > hi) continue;
    }
    const x = make(op, a, b);
    const nums = [x, a, b];
    const put = (y: number) => y >= lo && y <= hi && !nums.includes(y) && nums.length < size && nums.push(y);
    // Above easy, more often than not a trap: one of the parts doubled (or squared), and on hard now and then their sum.
    if (level > 1 && next() < 0.7) {
      const z = next() < 0.5 ? a : b;
      put(make(op, z, z));
    }
    if (level === 3 && next() < 0.4) put(a + b);
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

/** A grid: four corner sets, and the middle made of their answers (corner i's answer is the middle's i-th number). */
export type KakGrid = { corners: KakSet[]; middle: KakSet };
export function kakGrid(level: KakLevel, next: () => number): KakGrid {
  const middle = kakSet(level, next, { size: 4, usable: (n) => partsOf(n, level).length > 0 });
  return { corners: middle.nums.map((n) => kakSet(level, next, { answer: n })), middle };
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
  { level: 3, grid: false, seed: 301 },
  { level: 3, grid: false, seed: 305 },
  { level: 3, grid: true, seed: 303 },
];
/** A puzzle or the endless run's set: one set, or a grid's four corners and its middle last. */
export type KakTask = { level: KakLevel; sets: KakSet[] };
export function kakTask(level: KakLevel, grid: boolean, seed: number): KakTask {
  const next = rng(seed);
  if (!grid) return { level, sets: [kakSet(level, next)] };
  const g = kakGrid(level, next);
  return { level, sets: [...g.corners, g.middle] };
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
export type LiveKakooma = {
  mode: "puzzle" | "endless";
  stage: number;
  level: KakLevel;
  seed: number;
  /** The sets solved, the last wrong tap (which set, which number), and the misses. */
  solved: number[];
  wrong: { set: number; n: number } | null;
  misses: number;
  /** Whether the hint (one of the two parts ringed in every open set) is showing. */
  hinted: boolean;
  streak: number;
  said: { kind: "notice"; key: KakNotice } | null;
};
/** The puzzle being played, or the endless run's set. */
export const kakNow = (d: Pick<LiveKakooma, "mode" | "stage" | "level" | "seed">): KakTask =>
  d.mode === "puzzle" ? kakTask(KAK_LADDER[d.stage].level, KAK_LADDER[d.stage].grid, KAK_LADDER[d.stage].seed) : kakTask(d.level, false, d.seed);
