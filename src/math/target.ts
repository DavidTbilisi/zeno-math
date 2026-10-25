// Make the target: number cards and a target, and a sum made of the cards (each at most once) that comes to it.
// Easy: three cards, + and −; medium: four cards, + − ×, any of them; hard: all four cards with + − × ÷, like the 24
// game. The answer is the sum as typed ("(3 + 5) × 2"), worked out exactly in fractions, so the browser and the server
// always agree. Two sums count as different ways only if they differ by more than order: 3 + 4 and 4 + 3 are one way.
import { rng } from "./random";
import type { EndlessGame } from "./ladder";

export type TargetLevel = 1 | 2 | 3;
export type Op = "+" | "-" | "*" | "/";
export type TargetPuzzle = { level: TargetLevel; cards: number[]; target: number; ops: Op[]; all: boolean; sample: string };

// ---------- reading a sum ----------

type Q = [number, number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const q = (n: number, d = 1): Q => {
  const g = gcd(n, d) || 1;
  return d < 0 ? [-n / g, -d / g] : [n / g, d / g];
};
const OPS: Record<Op, (a: Q, b: Q) => Q | null> = {
  "+": (a, b) => q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]),
  "-": (a, b) => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1]),
  "*": (a, b) => q(a[0] * b[0], a[1] * b[1]),
  "/": (a, b) => (b[0] === 0 ? null : q(a[0] * b[1], a[1] * b[0])),
};

export type Expr = { k: "num"; v: number } | { k: "op"; op: Op; a: Expr; b: Expr };
type Token = number | Op | "(" | ")";

/** The sum's pieces, with ×, x, · and ÷ read as * and /, and a "= …" at the end left off. */
export function tokens(src: string): Token[] | null {
  const s = src.replace(/=.*$/, "").replace(/[×x·]/gi, "*").replace(/[÷:]/g, "/").replace(/[−–]/g, "-");
  const out: Token[] = [];
  for (const m of s.matchAll(/\s*(\d+|[-+*/()])\s*|(\S)/g)) {
    if (m[2]) return null;
    const t = m[1];
    out.push(/\d/.test(t) ? Number(t) : (t as Token));
  }
  return out.length ? out : null;
}

/** The sum as a tree, with × and ÷ before + and − and brackets first; null when it can't be read. */
export function parseSum(src: string): Expr | null {
  const ts = tokens(src);
  if (!ts) return null;
  let i = 0;
  const atom = (): Expr | null => {
    const t = ts[i++];
    if (typeof t === "number") return { k: "num", v: t };
    if (t !== "(") return null;
    const e = sum();
    return e && ts[i++] === ")" ? e : null;
  };
  const chain = (next: () => Expr | null, ops: Op[]) => () => {
    let a = next();
    while (a && ops.includes(ts[i] as Op)) {
      const op = ts[i++] as Op;
      const b = next();
      a = b && { k: "op", op, a, b };
    }
    return a;
  };
  const sum = chain(chain(atom, ["*", "/"]), ["+", "-"]);
  const e = sum();
  return e && i === ts.length ? e : null;
}

export const valueOf = (e: Expr): Q | null => {
  if (e.k === "num") return [e.v, 1];
  const [a, b] = [valueOf(e.a), valueOf(e.b)];
  return a && b && OPS[e.op](a, b);
};
const numsOf = (e: Expr): number[] => (e.k === "num" ? [e.v] : [...numsOf(e.a), ...numsOf(e.b)]);
const opsOf = (e: Expr): Op[] => (e.k === "num" ? [] : [e.op, ...opsOf(e.a), ...opsOf(e.b)]);

/** The sum worked from left to right, ignoring which comes first (null with brackets, or when it can't be). */
export function leftToRight(src: string): Q | null {
  const ts = tokens(src);
  if (!ts || ts.includes("(") || typeof ts[0] !== "number") return null;
  let v: Q | null = [ts[0], 1];
  for (let i = 1; i + 1 < ts.length && v; i += 2) {
    const [op, n] = [ts[i], ts[i + 1]];
    if (typeof n !== "number" || typeof op !== "string" || !(op in OPS)) return null;
    v = OPS[op as Op](v, [n, 1]);
  }
  return ts.length % 2 === 1 ? v : null;
}

/** One way of writing a sum whatever the order of what is added or multiplied: 3 + 4 and 4 + 3 are the same way. */
export function canonical(e: Expr): string {
  if (e.k === "num") return String(e.v);
  const add = e.op === "+" || e.op === "-";
  // The terms (or factors) of a chain of + and − (or × and ÷), each with its sign.
  const parts: string[] = [];
  const walk = (x: Expr, plus: boolean) => {
    if (x.k === "op" && (x.op === "+" || x.op === "-") === add) {
      walk(x.a, plus);
      walk(x.b, x.op === "+" || x.op === "*" ? plus : !plus);
    } else parts.push(`${plus ? (add ? "+" : "*") : add ? "-" : "/"}${canonical(x)}`);
  };
  walk(e, true);
  return `(${parts.sort().join("")})`;
}

// ---------- marking ----------

export type TargetProblem = "unreadable" | "other" | "notAll" | "op" | "divZero";
export type TargetVerdict = { ok: true } | { ok: false; problem: TargetProblem } | { ok: false; makes: Q; leftToRight: boolean };
const show = ([n, d]: Q) => (d === 1 ? String(n) : `${n}/${d}`);
export const qText = show;

export function judgeTarget(p: Pick<TargetPuzzle, "cards" | "target" | "ops" | "all">, src: string): TargetVerdict {
  const e = parseSum(src);
  if (!e) return { ok: false, problem: "unreadable" };
  const left = [...p.cards];
  for (const n of numsOf(e)) {
    const i = left.indexOf(n);
    if (i < 0) return { ok: false, problem: "other" };
    left.splice(i, 1);
  }
  if (p.all && left.length) return { ok: false, problem: "notAll" };
  if (opsOf(e).some((op) => !p.ops.includes(op))) return { ok: false, problem: "op" };
  const v = valueOf(e);
  if (!v) return { ok: false, problem: "divZero" };
  if (v[0] === p.target && v[1] === 1) return { ok: true };
  const ltr = leftToRight(src);
  return { ok: false, makes: v, leftToRight: !!ltr && ltr[0] === p.target && ltr[1] === 1 };
}

// ---------- making puzzles ----------

const SIGN: Record<Op, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
/** A sum as people write it: × and ÷, a true minus, brackets only where they are needed. */
export function sumText(e: Expr, parentOp?: Op, right = false): string {
  if (e.k === "num") return String(e.v);
  const s = `${sumText(e.a, e.op)} ${SIGN[e.op]} ${sumText(e.b, e.op, true)}`;
  const weak = (o: Op) => o === "+" || o === "-";
  const need = parentOp && ((weak(e.op) && !weak(parentOp)) || (right && (parentOp === "-" || parentOp === "/") && weak(e.op) === weak(parentOp)));
  return need ? `(${s})` : s;
}

/**
 * A puzzle of the level from `next`: cards, and a sum of some of them (all, at hard) whose value is the target —
 * a whole number in the level's range, every step whole (so a division always comes out), not just one card.
 */
export function targetPuzzle(level: TargetLevel, next: () => number): TargetPuzzle {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const ops: Op[] = level === 1 ? ["+", "-"] : level === 2 ? ["+", "-", "*"] : ["+", "-", "*", "/"];
  // How many cards, the largest card, how many the sum uses, and the targets allowed.
  const [count, hi, use, lo, top]: number[] = level === 1 ? [3, 9, int(2, 3), 3, 20] : level === 2 ? [4, 10, int(2, 3), 10, 60] : [4, 12, 4, 10, 100];
  for (;;) {
    const cards = Array.from({ length: count }, () => int(1, hi));
    // Combine cards two at a time with a step that stays whole and positive, until one sum is left.
    const pool: Expr[] = cards.slice(0, use).map((v) => ({ k: "num", v }));
    while (pool.length > 1) {
      const a = pool.splice(int(0, pool.length - 1), 1)[0];
      const b = pool.splice(int(0, pool.length - 1), 1)[0];
      const op = ops[int(0, ops.length - 1)];
      const e: Expr = { k: "op", op, a, b };
      const v = valueOf(e);
      pool.push(v && v[1] === 1 && v[0] > 0 ? e : { k: "op", op: "+", a, b });
    }
    const v = valueOf(pool[0])!;
    if (v[0] < lo || v[0] > top || cards.includes(v[0])) continue;
    // The cards in a random order, so the sum's cards aren't always the first ones.
    const shuffled = cards.map((c) => [next(), c] as const).sort((x, y) => x[0] - y[0]).map(([, c]) => c);
    return { level, cards: shuffled, target: v[0], ops, all: level === 3, sample: sumText(pool[0]) };
  }
}

// ---------- the board's game ----------

export const TARGET_LADDER: { level: TargetLevel; seed: number }[] = [
  { level: 1, seed: 71 },
  { level: 1, seed: 72 },
  { level: 1, seed: 73 },
  { level: 2, seed: 81 },
  { level: 2, seed: 82 },
  { level: 2, seed: 83 },
  { level: 3, seed: 91 },
  { level: 3, seed: 92 },
  { level: 3, seed: 93 },
];
/** A puzzle's stars: one made with a hint; two made without; three for a second, different way. */
export const targetStars = (ways: number, hinted: boolean) => (ways === 0 ? 0 : hinted ? 1 : ways >= 2 ? 3 : 2);
/** The hint: the sample's first step, the innermost pair of cards it combines. */
export function firstStep(sample: string): string {
  const e = parseSum(sample)!;
  const inner = (x: Expr): Expr => (x.k === "op" && x.a.k === "op" ? inner(x.a) : x.k === "op" && x.b.k === "op" ? inner(x.b) : x);
  return sumText(inner(e));
}

export type TargetNotice = "twoWays" | "allCards" | "speedy" | "streak10";
export const TARGET_NOTICES: TargetNotice[] = ["twoWays", "allCards", "speedy", "streak10"];
/** What a sum that makes the target shows: a second way, every card used (when that wasn't asked for), a quick one, ten in a row. */
export function targetNotice(p: TargetPuzzle, sum: string, ways: number, ms: number, streak: number): TargetNotice | null {
  if (ways === 2) return "twoWays";
  if (!p.all && parseSum(sum) && numsOf(parseSum(sum)!).length === p.cards.length) return "allCards";
  if (streak === 10) return "streak10";
  if (ms <= 15000) return "speedy";
  return null;
}

/** A sum being built on the board: the cards tapped (by their place) and the signs and brackets between them. */
export type Piece = { card: number } | { op: Op } | { paren: "(" | ")" };
export const pieceText = (p: Piece, cards: number[]) => ("card" in p ? String(cards[p.card]) : "op" in p ? SIGN[p.op] : p.paren);
export const piecesText = (ps: Piece[], cards: number[]) => ps.map((p) => pieceText(p, cards)).join(" ");

export type LiveTarget = EndlessGame<TargetNotice, TargetLevel> & {
  sum: Piece[];
  /** The different ways found so far (canonical), and whether the hint was shown. */
  ways: string[];
  hinted: boolean;
};
export const targetNow = (d: Pick<LiveTarget, "mode" | "stage" | "level" | "seed">): TargetPuzzle =>
  d.mode === "puzzle" ? targetPuzzle(TARGET_LADDER[d.stage].level, rng(TARGET_LADDER[d.stage].seed)) : targetPuzzle(d.level, rng(d.seed));
/** What the sum being built makes so far (null while it can't be worked out). */
export function sumValue(ps: Piece[], cards: number[]): Q | null {
  const e = parseSum(ps.map((p) => ("card" in p ? String(cards[p.card]) : "op" in p ? p.op : p.paren)).join(" "));
  return e && valueOf(e);
}
/** A piece of a sum added to what is typed, with a space unless it follows an opening bracket. */
export const addPiece = (typed: string, piece: string) => (typed.trim() && !typed.trimEnd().endsWith("(") && piece !== ")" ? `${typed.trimEnd()} ${piece}` : `${typed.trimEnd()}${piece}`);
/** The last piece of a typed sum taken off: a number, a sign or a bracket. */
export const dropPiece = (typed: string) => typed.trimEnd().replace(/(\d+|\S)$/, "").trimEnd();

/** The typed form of the sum being built, for the checker. */
export const sumSource = (ps: Piece[], cards: number[]) => ps.map((p) => ("card" in p ? String(cards[p.card]) : "op" in p ? p.op : p.paren)).join(" ");
