// Divisible by? A number and a row of divisors: which of them divide it exactly? Easy: 2, 5 and 10, read from the last
// digit; medium: 3 and 9 as well, from the digit sum; hard: 4, 6 and 8 too, from the last two or three digits, and 6 as
// 2 and 3 together. Every number divides by at least one of them, fewer by only one, and now and then by all. The tests
// are the mental-maths tool's (src/math/mental.ts), so the board's hint and the practice question's worked solution
// say what the Divisibility tab says. The answer is the divisors that work, typed or tapped, in any order. Four slips
// are named: an even number taken for a multiple of 4, a multiple of 3 for one of 9, an odd multiple of 3 for one of
// 6, and a multiple of 10 given without 2 and 5.
import { divisibility, type MentalSpec } from "./mental";
import { rng } from "./random";

export type DivLevel = 1 | 2 | 3;
/** The divisors offered at each level. */
export const DIVISORS: Record<DivLevel, number[]> = { 1: [2, 5, 10], 2: [2, 3, 5, 9, 10], 3: [2, 3, 4, 5, 6, 8, 9, 10] };
const RANGE: Record<DivLevel, [number, number]> = { 1: [10, 999], 2: [100, 999], 3: [100, 9999] };
/** A number to test, the divisors offered, and those that divide it (smallest first). */
export type DivTask = { level: DivLevel; n: number; offered: number[]; right: number[] };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function divTask(level: DivLevel, next: () => number): DivTask {
  const offered = DIVISORS[level];
  const [lo, hi] = RANGE[level];
  const all = offered.reduce((m, d) => (m * d) / gcd(m, d), 1);
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  for (;;) {
    // Now and then a multiple of every divisor (10, 90, 360); otherwise any number, with half of those that divide by
    // one divisor alone passed over, and none that divides by none.
    const any = int(lo, hi);
    const n = next() < 1 / 50 ? all * int(Math.ceil(lo / all), Math.floor(hi / all)) : any;
    const right = offered.filter((d) => n % d === 0);
    if (right.length === 0 || (right.length === 1 && next() < 0.5)) continue;
    return { level, n, offered, right };
  }
}

/** The digits the test for d looks at in n, as the Divisibility tab shows them (…34, 12 → 3, 2 ✓ · 3 ✗). */
export const ruleTest = (n: number, d: number) => divisibility(n).find((x) => x.d === d)!.test;
/** The worked solution: the Divisibility tab's table, with only the tests for the divisors offered. */
export const rulesSpec = (t: Pick<DivTask, "n" | "offered">): MentalSpec => ({ topic: "rules", a: String(t.n), b: "", c: "", base: "", op: "*", sys: "en", words: "", divisors: t.offered });
const digitSum = (n: number) => String(n).split("").reduce((s, c) => s + Number(c), 0);

export type DivSlip = "evenForFour" | "threeForNine" | "oddSix" | "tenOnly";
/**
 * The slips this number invites, each with the divisors it would give: 4 for an even number that isn't a multiple of 4
 * (the last digit looked at, not the last two); 9 for a multiple of 3 that isn't one of 9 (a digit sum of 3, 6, 12 …
 * taken for 9's); 6 for an odd multiple of 3 (the digit sum checked, but not 2); and a multiple of 10 given as 10 alone,
 * without the 2 and 5 that come with it (only while 4, 6 and 8, which would bring 2 back, aren't among the answer).
 */
export function divSlips(t: DivTask): { id: DivSlip; right: number[]; vars: Record<string, string | number> }[] {
  const by = (d: number) => t.n % d === 0;
  const has = (d: number) => t.offered.includes(d);
  const plus = (d: number) => [...t.right, d].sort((a, b) => a - b);
  const out: ReturnType<typeof divSlips> = [];
  if (has(4) && by(2) && !by(4)) out.push({ id: "evenForFour", right: plus(4), vars: { n: t.n, t: t.n % 100 } });
  if (has(9) && by(3) && !by(9)) out.push({ id: "threeForNine", right: plus(9), vars: { n: t.n, s: digitSum(t.n) } });
  if (has(6) && by(3) && !by(2)) out.push({ id: "oddSix", right: plus(6), vars: { n: t.n } });
  if (by(10) && ![4, 6, 8].some((d) => t.right.includes(d))) out.push({ id: "tenOnly", right: t.right.filter((d) => d !== 2 && d !== 5), vars: { n: t.n } });
  return out;
}

/** The divisors typed or tapped: whole numbers with commas, semicolons, spaces or "and" between, in any order; null if not. */
export function readDivisors(src: string): number[] | null {
  const words = ["and", "&", "и", "და"];
  const ts = src.replace(/[{}()[\]]/g, " ").split(/[\s,;]+/).filter((x) => x && !words.includes(x.toLowerCase()));
  if (!ts.length || ts.some((x) => !/^\d+$/.test(x))) return null;
  return [...new Set(ts.map(Number))].sort((a, b) => a - b);
}
export type DivVerdict = { ok: true } | { ok: false; problem: "unreadable" } | { ok: false; problem: "notOffered"; d: number } | { ok: false; more: boolean };
/** Right when exactly the divisors that work are listed; a divisor not offered is sent back; `more` when some are missing but none is wrong. */
export function judgeDivisors(t: Pick<DivTask, "offered" | "right">, src: string): DivVerdict {
  const ds = readDivisors(src);
  if (!ds) return { ok: false, problem: "unreadable" };
  const other = ds.find((d) => !t.offered.includes(d));
  if (other !== undefined) return { ok: false, problem: "notOffered", d: other };
  if (ds.length === t.right.length && ds.every((d) => t.right.includes(d))) return { ok: true };
  return { ok: false, more: ds.every((d) => t.right.includes(d)) };
}

// ---------- the board's game ----------

/** 352, 585, 660; 387, 366 (3 but not 9), 945; 6214 (even but not 4), 8757 (3 but odd), 5040 (every one). */
export const DIV_LADDER: { level: DivLevel; seed: number }[] = [
  { level: 1, seed: 1002 },
  { level: 1, seed: 1013 },
  { level: 1, seed: 1001 },
  { level: 2, seed: 1109 },
  { level: 2, seed: 1101 },
  { level: 2, seed: 1108 },
  { level: 3, seed: 1202 },
  { level: 3, seed: 1213 },
  { level: 3, seed: 1232 },
];
/** Stars: right at the first check three, at the second two, else one; the hint takes one off, never the last. */
export const divStars = (misses: number, hinted: boolean) => Math.max(1, (misses === 0 ? 3 : misses === 1 ? 2 : 1) - (hinted ? 1 : 0));
/** The divisor the hint explains: the first one chosen wrongly or missed, else the first not read from the last digit. */
export function hintDivisor(t: DivTask, chosen: number[]): number {
  return t.offered.find((d) => chosen.includes(d) !== t.right.includes(d)) ?? t.offered.find((d) => ![2, 5, 10].includes(d)) ?? t.offered[0];
}
/** n ÷ d, and what is left over. */
export const divide = (n: number, d: number) => ({ q: Math.floor(n / d), r: n % d });

export type DivNotice = "all" | "notFooled" | "quick" | "streak10";
export const DIV_NOTICES: DivNotice[] = ["all", "notFooled", "quick", "streak10"];
/**
 * What a number done shows: ten in a row; and, right at the first check without the hint, from medium up every divisor
 * (on easy a third of the numbers end in 0) or a number that sets a trap (even but not by 4, by 3 but not by 9 or 6);
 * done within five seconds.
 */
export function divNotice(t: DivTask, misses: number, hinted: boolean, ms: number, streak: number): DivNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0 || hinted) return null;
  if (t.level > 1 && t.right.length === t.offered.length) return "all";
  if (t.level > 1 && divSlips(t).some((s) => s.id !== "tenOnly")) return "notFooled";
  if (ms <= 5000) return "quick";
  return null;
}
export type LiveDivisible = {
  mode: "puzzle" | "endless";
  stage: number;
  level: DivLevel;
  seed: number;
  /** The divisors chosen, those shown not dividing since the last check, and the misses. */
  chosen: number[];
  wrong: number[];
  misses: number;
  /** The divisor whose test the hint showed, or null before it. */
  hint: number | null;
  done: boolean;
  streak: number;
  said: { kind: "notice"; key: DivNotice } | { kind: "wrong"; more: boolean } | null;
};
/** The number of a puzzle or of the endless run. */
export const divNow = (d: Pick<LiveDivisible, "mode" | "stage" | "level" | "seed">): DivTask =>
  d.mode === "puzzle" ? divTask(DIV_LADDER[d.stage].level, rng(DIV_LADDER[d.stage].seed)) : divTask(d.level, rng(d.seed));
