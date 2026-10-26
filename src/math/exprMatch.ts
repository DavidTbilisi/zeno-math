// Equal expressions: the same amount written different ways, for any x. The board's game is a set of cards to pair up
// — like terms collected (x + x + 4 and 2x + 4), brackets multiplied out (3(x + 2) and 3x + 6), products and powers
// (x · x and x², x(x + 2) and x² + 2x) — with a near miss on the board too (2x + 3 next to 2(x + 3)). The practice
// question picks the expression equal to one from four, whose wrong ones are the slips named: unlike terms joined
// (3x + 4 as 7x), only the first term in the bracket multiplied (3x + 2 for 3(x + 2)), and x · x taken for 2x.
import { rng } from "./random";
import type { EndlessGame } from "./ladder";

export type ExprLevel = 1 | 2 | 3;
/** An expression as written and what it is: the numbers of 1, x and x² it comes to. */
export type ExprCard = { text: string; poly: [number, number, number] };

const MINUS = "−";
/** Terms joined with + and −, as written: [coefficient, power] in the order given; "3x", "x²", "4", "−2x". */
export function termsText(terms: [number, 0 | 1 | 2][]): string {
  return terms
    .map(([c, p], i) => {
      const mag = Math.abs(c);
      const body = p === 0 ? String(mag) : `${mag === 1 ? "" : mag}${p === 1 ? "x" : "x²"}`;
      return i === 0 ? (c < 0 ? MINUS : "") + body : `${c < 0 ? ` ${MINUS} ` : " + "}${body}`;
    })
    .join("");
}
const polyOf = (terms: [number, 0 | 1 | 2][]): [number, number, number] => {
  const p: [number, number, number] = [0, 0, 0];
  for (const [c, k] of terms) p[k] += c;
  return p;
};
/** The simplest way to write a poly: x² first, then x, then the number. */
export const simplest = (p: [number, number, number]): string =>
  termsText(([[p[2], 2], [p[1], 1], [p[0], 0]] as [number, 0 | 1 | 2][]).filter(([c]) => c !== 0)) || "0";
export const key = (p: [number, number, number]) => p.join(",");
/** The card as the checker reads it: x^2, * and -. */
export const plainOf = (text: string) => text.replace(/²/g, "^2").replace(/·/g, "*").replace(/−/g, "-");
/** A typed expression squashed for comparing with an option: no spaces or ×, x^2 as x², − as -. */
export const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/x\^2/g, "x²").replace(/[−–]/g, "-").replace(/[×·*]/g, "·");

/** Like terms to collect: a x's and b written as a jumble of terms (x + 4 + x, 5x − 2x + 1). */
function collect(a: number, b: number, int: (lo: number, hi: number) => number, next: () => number): ExprCard {
  const xs: [number, 0 | 1 | 2][] = [];
  if (a >= 2 && next() < 0.35) {
    // A difference: (a + k)x − kx.
    const k = int(1, 3);
    xs.push([a + k, 1], [-k, 1]);
  } else {
    let left = a;
    while (left > 0) {
      const c = int(1, Math.min(left, 3));
      xs.push([c, 1]);
      left -= c;
    }
    // At least two x terms, so there is something to collect (x as 2x − x).
    if (xs.length === 1) xs.splice(0, 1, ...(a === 1 ? [[2, 1], [-1, 1]] : [[a - 1, 1], [1, 1]]) as [number, 0 | 1 | 2][]);
  }
  const nums: [number, 0 | 1 | 2][] = b === 0 ? [] : b > 3 && next() < 0.5 ? [[b - int(1, b - 1), 0]] : [[b, 0]];
  if (nums.length && nums[0][0] !== b) nums.push([b - nums[0][0], 0]);
  // Shuffle the terms, keeping a negative one off the front.
  const all = [...xs, ...nums].map((t) => [next(), t] as const).sort((p, q) => p[0] - q[0]).map(([, t]) => t);
  const first = all.findIndex(([c]) => c > 0);
  all.unshift(...all.splice(first, 1));
  return { text: termsText(all), poly: polyOf(all) };
}
/** k(x ± b) or k(b + x), and the poly it is. */
function bracket(k: number, b: number, swap: boolean): ExprCard {
  const inner = swap && b > 0 ? `${b} + x` : `x ${b < 0 ? MINUS : "+"} ${Math.abs(b)}`;
  return { text: `${k}(${inner})`, poly: [k * b, k, 0] };
}
const card = (p: [number, number, number]): ExprCard => ({ text: simplest(p), poly: p });

/** Products and powers written out, and what they come to. */
function product(kind: number, int: (lo: number, hi: number) => number): ExprCard {
  const [a, b] = [int(2, 4), int(2, 5)];
  switch (kind) {
    case 0:
      return { text: "x · x", poly: [0, 0, 1] };
    case 1:
      return { text: `${a}x · ${b}`, poly: [0, a * b, 0] };
    case 2:
      return { text: `x · ${a}x`, poly: [0, 0, a] };
    case 3:
      return { text: `x(x + ${b})`, poly: [0, b, 1] };
    case 4:
      return { text: "x² + x²", poly: [0, 0, 2] };
    default:
      return { text: `${a}x · x + x`, poly: [0, 1, a] };
  }
}

/**
 * A board of four pairs, each an expression and the simplest way to write it, no two pairs the same: easy, like
 * terms; medium, brackets, with one pair the slip of a bracket (k x + b for k(x + b)); hard, products and powers,
 * with x + x beside x · x.
 */
export function exprBoard(level: ExprLevel, next: () => number): ExprCard[][] {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  for (;;) {
    const pairs: ExprCard[][] = [];
    if (level === 1) {
      for (let i = 0; i < 4; i++) {
        const c = collect(int(1, 5), int(0, 9), int, next);
        pairs.push([c, card(c.poly)]);
      }
    } else if (level === 2) {
      for (let i = 0; i < 3; i++) {
        const b = next() < 0.3 ? -int(1, 5) : int(1, 6);
        const c = bracket(int(2, 5), b, next() < 0.3);
        pairs.push([c, card(c.poly)]);
      }
      // The first bracket's slip, as like terms to collect: only the x multiplied.
      const [k, b] = [pairs[0][0].poly[1], pairs[0][0].poly[0] / pairs[0][0].poly[1]];
      if (b > 0) {
        const slip = collect(k, b, int, next);
        pairs.push([slip, card(slip.poly)]);
      }
    } else {
      const kinds = [0, int(1, 5), int(1, 5), int(1, 5)];
      for (const kind of kinds) {
        const c = product(kind, int);
        pairs.push([c, card(c.poly)]);
      }
      // x + x for 2x, next to x · x.
      pairs[pairs.length - 1] = [{ text: "x + x", poly: [0, 2, 0] }, card([0, 2, 0])];
    }
    // Four pairs of different amounts, and no card that is already the simplest way to write it.
    if (pairs.length < 4 || new Set(pairs.map(([c]) => key(c.poly))).size < 4 || pairs.some(([a, b]) => a.text === b.text)) continue;
    return pairs;
  }
}
/** The cards of a board in the order they lie, from `next`. */
export const deal = (pairs: ExprCard[][], next: () => number): ExprCard[] =>
  pairs.flat().map((c) => [next(), c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
/** Whether two cards are equal for every x. */
export const same = (a: ExprCard, b: ExprCard) => key(a.poly) === key(b.poly);

// ---------- the practice question ----------

export type ExprOption = { text: string; plain: string; tex: string };
export type ExprMistake = "joinedUnlike" | "firstTermOnly" | "squareAsDouble";
export type ExprQuestion = { level: ExprLevel; given: ExprCard; options: ExprOption[]; right: number; traps: { id: ExprMistake; at: number; vars: Record<string, string> }[] };
export const exprTex = (text: string) => text.replace(/x²/g, "x^2").replace(/·/g, "\\cdot").replace(/−/g, "-");
const option = (text: string): ExprOption => ({ text, plain: plainOf(text), tex: exprTex(text) });

/**
 * Which is equal: easy, like terms collected (against the x's and the number joined, 7x for 3x + 4, and the numbers
 * swapped round); medium, a bracket multiplied out (against only the first term multiplied, and the bracket's number
 * added instead); hard, x · ax or x(x + b) (against x · x taken for 2x, and only the first term multiplied).
 */
export function exprQuestion(level: ExprLevel, next: () => number): ExprQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  for (;;) {
    let given: ExprCard;
    let wrong: { p: [number, number, number]; id?: ExprMistake; vars?: Record<string, string> }[];
    if (level === 1) {
      given = collect(int(2, 5), int(1, 9), int, next);
      const [b, a] = given.poly;
      wrong = [
        { p: [0, a + b, 0], id: "joinedUnlike", vars: { a: String(a), b: String(b), e: simplest(given.poly), s: String(a + b) } },
        { p: [a, b, 0] },
        { p: [b, a + 1, 0] },
      ];
    } else if (level === 2) {
      const b = next() < 0.3 ? -int(1, 5) : int(1, 6);
      const k = int(2, 5);
      given = bracket(k, b, next() < 0.3);
      wrong = [
        { p: [b, k, 0], id: "firstTermOnly", vars: { k: String(k), b: String(Math.abs(b)), kb: String(Math.abs(k * b)), e: simplest(given.poly) } },
        { p: [k + b, k, 0] },
        { p: [k * b, 1, 0] },
      ];
    } else if (next() < 0.5) {
      const a = int(2, 6);
      given = { text: `x · ${a}x`, poly: [0, 0, a] };
      wrong = [
        { p: [0, 2 * a, 0], id: "squareAsDouble" },
        { p: [0, a + 1, 0] },
        { p: [0, 0, a + 1] },
      ];
    } else {
      const b = int(2, 9);
      given = { text: `x(x + ${b})`, poly: [0, b, 1] };
      wrong = [
        { p: [b, 0, 1], id: "firstTermOnly", vars: { k: "x", b: String(b), kb: `${b}x`, e: simplest(given.poly) } },
        { p: [0, b + 2, 0], id: "squareAsDouble" },
        { p: [b, 1, 0] },
      ];
    }
    const all = [given.poly, ...wrong.map((x) => x.p)];
    // Four different expressions, or draw again.
    if (new Set(all.map(key)).size < all.length) continue;
    const order = all.map((p, i) => [next(), p, i] as const).sort((a, b) => a[0] - b[0]);
    const at = (i: number) => order.findIndex(([, , j]) => j === i);
    return {
      level,
      given,
      options: order.map(([, p]) => option(simplest(p))),
      right: at(0),
      // x · x taken for 2x: the right expression and the one the slip makes.
      traps: wrong.flatMap((x, i) => (x.id ? [{ id: x.id, at: at(i + 1), vars: x.vars ?? { e: simplest(given.poly), s: simplest(x.p) } }] : [])),
    };
  }
}
/** The option typed or picked against the options: right, another option, or none of them. */
export function judgePick(t: { options: ExprOption[]; right: number }, src: string): { ok: true } | { ok: false; problem: "notOption" } | { ok: false; picked: number } {
  const s = squash(src);
  const i = t.options.findIndex((o) => squash(o.plain) === s);
  if (i < 0) return { ok: false, problem: "notOption" };
  return i === t.right ? { ok: true } : { ok: false, picked: i };
}
/** The working: the given expression, then the step that makes it the answer. */
export function exprSteps(q: ExprQuestion): string[] {
  const right = q.options[q.right].tex;
  const g = exprTex(q.given.text);
  if (q.level === 1) return [`${g} = ${right}`];
  if (q.level === 2) {
    const [b, k] = [q.given.poly[0] / q.given.poly[1], q.given.poly[1]];
    return [`${g} = ${k} \\times x ${b < 0 ? "-" : "+"} ${k} \\times ${Math.abs(b)} = ${right}`];
  }
  if (q.given.poly[1] === 0) return [`${g} = ${q.given.poly[2]} \\times x \\times x = ${right}`];
  return [`${g} = x \\times x + ${q.given.poly[1]} \\times x = ${right}`];
}

// ---------- the board's game ----------

export const EXPR_LADDER: { level: ExprLevel; seed: number }[] = [
  { level: 1, seed: 601 },
  { level: 1, seed: 602 },
  { level: 1, seed: 603 },
  { level: 2, seed: 611 },
  { level: 2, seed: 612 },
  { level: 2, seed: 613 },
  { level: 3, seed: 621 },
  { level: 3, seed: 622 },
  { level: 3, seed: 623 },
];
/** Stars for a cleared board: no misses three, one or two two, more one. */
export const exprStars = (misses: number) => (misses === 0 ? 3 : misses <= 2 ? 2 : 1);
export type ExprNotice = "clean" | "nearMiss" | "powers" | "streak20";
export const EXPR_NOTICES: ExprNotice[] = ["clean", "nearMiss", "powers", "streak20"];
/** What a cleared board shows: no misses, a near miss left alone at medium, products and powers at hard, twenty in a row. */
export function exprNotice(level: ExprLevel, cleared: boolean, misses: number, streak: number): ExprNotice | null {
  if (streak === 20) return "streak20";
  if (!cleared || misses > 0) return null;
  return level === 3 ? "powers" : level === 2 ? "nearMiss" : "clean";
}
export type LiveExprMatch = EndlessGame<ExprNotice, ExprLevel, { kind: "miss"; a: number; b: number }> & {
  /** The places of the cards cleared, the one picked first (if any), and the misses so far. */
  cleared: number[];
  picked: number[];
  misses: number;
};
export function exprNow(d: Pick<LiveExprMatch, "mode" | "stage" | "level" | "seed">): ExprCard[] {
  const [level, seed] = d.mode === "puzzle" ? [EXPR_LADDER[d.stage].level, EXPR_LADDER[d.stage].seed] : [d.level, d.seed];
  const r = rng(seed);
  return deal(exprBoard(level, r), r);
}
