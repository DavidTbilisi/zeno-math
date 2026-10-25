// Equivalence: the same amount written different ways. The board's game is a set of cards to pair up — a fraction and
// its picture (easy), a fraction and an equal one with bigger numbers (medium), or a fraction, its decimal and its
// percentage in threes (hard) — and the practice question picks the one equal to a fraction from four, whose wrong ones
// are the slips people make: the unshaded part, shaded against unshaded, the same number added to top and bottom, the
// digits of the fraction read as a decimal.
import type { Bench } from "./benchmark";
import { rng } from "./random";
import type { EndlessGame } from "./ladder";

export type EqLevel = 1 | 2 | 3;
export type CardKind = "frac" | "pic" | "dec" | "pct";
/** A card: what it shows (a fraction n/d, a picture of n of d parts, a decimal, a percentage) and the value it is. */
export type Card = { kind: CardKind; n: number; d: number; text: string; v: number };

const pctText = (v: number) => `${Number((v * 100).toFixed(1))}%`;
const decText = (v: number) => String(Number(v.toFixed(3)));
export const cardOf = (kind: CardKind, n: number, d: number): Card => {
  const v = n / d;
  return { kind, n, d, v, text: kind === "dec" ? decText(v) : kind === "pct" ? pctText(v) : `${n}/${d}` };
};

/** Fractions in lowest terms whose decimals end within three places (for the hard level), or any up to twelfths. */
const SIMPLE = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6]];
const ENDING = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20]];
const MEDIUM = [...SIMPLE, [2, 7], [3, 7], [3, 8], [5, 8], [2, 9], [4, 9], [3, 10], [7, 10], [5, 12], [7, 12]];

/** A board of cards in groups of equal value (pairs, or threes at hard), shuffled; no two groups the same value. */
export function eqBoard(level: EqLevel, next: () => number): Card[][] {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pool = (level === 1 ? SIMPLE : level === 2 ? MEDIUM : ENDING).map(([n, d]) => [n, d]);
  const groups: Card[][] = [];
  while (groups.length < (level === 3 ? 3 : 4)) {
    const [n, d] = pool.splice(int(0, pool.length - 1), 1)[0];
    if (level === 1) groups.push([cardOf("frac", n, d), cardOf("pic", n, d)]);
    else if (level === 2) {
      const k = int(2, Math.max(2, Math.floor(24 / d)));
      groups.push([cardOf("frac", n, d), cardOf("frac", n * k, d * k)]);
    } else groups.push([cardOf("frac", n, d), cardOf("dec", n, d), cardOf("pct", n, d)]);
  }
  return groups;
}
/** The cards of a board in the order they lie, from `next`. */
export const deal = (groups: Card[][], next: () => number): Card[] =>
  groups.flat().map((c) => [next(), c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => c);

/** Whether two cards are the same amount (and not the same card). */
export const same = (a: Card, b: Card) => Math.abs(a.v - b.v) < 1e-9;

// ---------- the practice question ----------

export type EqQuestion = { level: EqLevel; n: number; d: number; k: number; options: Bench[]; right: number; traps: { id: EqMistake; at: number; vars: Record<string, string> }[] };
export type EqMistake = "unshadedPart" | "partToPart" | "addedToBoth" | "fractionDigits";
const fracBench = (n: number, d: number): Bench => ({ v: n / d, text: `${n}/${d}`, plain: `${n}/${d}`, tex: `\\frac{${n}}{${d}}` });
const numBench = (v: number, pct = false): Bench => (pct ? { v, text: pctText(v), plain: pctText(v), tex: `${Number((v * 100).toFixed(1))}\\%` } : { v, text: decText(v), plain: decText(v), tex: decText(v) });

/**
 * Which is equal: easy, the fraction of a bar that is shaded (against the unshaded part, shaded to unshaded, and the
 * fraction turned upside down); medium, a fraction with bigger numbers (against the same number added to top and
 * bottom, only the top multiplied, upside down); hard, its decimal or percentage (against its digits read as a
 * decimal, the rest of the whole, and the bottom over the top).
 */
export function eqQuestion(level: EqLevel, next: () => number): EqQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  for (;;) {
    const pool = level === 1 ? [[1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 6], [5, 6], [3, 8], [5, 8], [2, 7], [3, 7]] : level === 2 ? MEDIUM : ENDING;
    const [n, d] = pool[int(0, pool.length - 1)];
    let right: Bench;
    let k = 1;
    let wrong: { b: Bench; id?: EqMistake; vars?: Record<string, string> }[];
    if (level === 1) {
      right = fracBench(n, d);
      wrong = [
        { b: fracBench(d - n, d), id: "unshadedPart", vars: { n: String(d - n), d: String(d) } },
        { b: fracBench(n, d - n), id: "partToPart", vars: { n: String(n), m: String(d - n), d: String(d) } },
        { b: fracBench(d, n) },
      ];
    } else if (level === 2) {
      k = int(2, Math.max(2, Math.floor(24 / d)));
      right = fracBench(n * k, d * k);
      const add = d * k - d;
      wrong = [
        { b: fracBench(n + add, d * k), id: "addedToBoth", vars: { k: String(k), d: String(d), kd: String(d * k), n: String(n) } },
        { b: fracBench(n * k, d) },
        { b: fracBench(d * k, n * k) },
      ];
    } else {
      const v = n / d;
      const pct = next() < 0.5;
      right = numBench(v, pct);
      const digits = Number(`0.${n}${d}`);
      wrong = [
        { b: numBench(digits, pct), id: "fractionDigits", vars: { f: `${n}/${d}`, v: decText(v), n: String(n), d: String(d) } },
        { b: numBench(1 - v, pct) },
        { b: numBench(Number((d / n).toFixed(3)), false) },
      ];
    }
    const all = [right, ...wrong.map((x) => x.b)];
    // Four different amounts, or draw again (two of the slips can give the same amount, as ½'s unshaded part does).
    if (new Set(all.map((b) => b.v.toFixed(6))).size < all.length) continue;
    const order = all.map((b, i) => [next(), b, i] as const).sort((a, b) => a[0] - b[0]);
    const options = order.map(([, b]) => b);
    const at = (i: number) => order.findIndex(([, , j]) => j === i);
    return {
      level,
      n,
      d,
      k,
      options,
      right: at(0),
      traps: wrong.flatMap((x, i) => (x.id ? [{ id: x.id, at: at(i + 1), vars: x.vars ?? {} }] : [])),
    };
  }
}

// ---------- the board's game ----------

export const EQ_LADDER: { level: EqLevel; seed: number }[] = [
  { level: 1, seed: 161 },
  { level: 1, seed: 162 },
  { level: 1, seed: 163 },
  { level: 2, seed: 171 },
  { level: 2, seed: 172 },
  { level: 2, seed: 173 },
  { level: 3, seed: 181 },
  { level: 3, seed: 182 },
  { level: 3, seed: 183 },
];
/** Stars for a cleared board: no misses three, one or two two, more one. */
export const eqStars = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
export type EqNotice = "clean" | "quick" | "threes" | "streak20";
export const EQ_NOTICES: EqNotice[] = ["clean", "quick", "threes", "streak20"];
/** What a cleared board (or a pair) shows: no misses, under twenty seconds, a hard board of threes, twenty pairs in a row. */
export function eqNotice(level: EqLevel, cleared: boolean, misses: number, ms: number, streak: number): EqNotice | null {
  if (streak === 20) return "streak20";
  if (!cleared) return null;
  if (level === 3 && misses === 0) return "threes";
  if (misses === 0 && ms <= 20000) return "quick";
  if (misses === 0) return "clean";
  return null;
}
export type LiveEquiv = EndlessGame<EqNotice, EqLevel, { kind: "miss"; a: number; b: number }> & {
  /** The places of the cards cleared, the one picked first (if any), and the misses so far. */
  cleared: number[];
  picked: number[];
  misses: number;
};
/** The cards of the board being played, in the order they lie. */
export function eqNow(d: Pick<LiveEquiv, "mode" | "stage" | "level" | "seed">): Card[] {
  const [level, seed] = d.mode === "puzzle" ? [EQ_LADDER[d.stage].level, EQ_LADDER[d.stage].seed] : [d.level, d.seed];
  const next = rng(seed);
  return deal(eqBoard(level, next), next);
}
/** How many cards make a group on this board: two, or three at hard. */
export const groupSize = (level: EqLevel) => (level === 3 ? 3 : 2);

// ---------- pictures ----------

/** A bar of d equal parts with the first n shaded: a body to place, w × h. */
export function partsSvg(n: number, d: number, w = 240, h = 44, color = "#4dabf7"): string {
  return Array.from({ length: d }, (_, i) => `<rect x="${(i * w) / d}" y="0" width="${w / d}" height="${h}" fill="${i < n ? color : "#ffffff"}" stroke="#1e1e1e" stroke-width="2"/>`).join("");
}
