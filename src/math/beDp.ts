// Be the DP: the player is the computer filling a dynamic-programming table, one operation at a time. The table dp[]
// (or dp[][]) shows its indexes, the base cases the code writes first are already in, and i (and j) point at the cell
// being filled, in the order the loops go. For that cell the formula has a slot for each value it reads: the player
// drags the cell it names (dp[i−1], a[i], dp[i−1][j−1]…), left to right, into its slot; then the results the formula
// weighs (skip or take, extend or start afresh, coin by coin, from above or from the left) appear, and the player drags
// the one max or min keeps into dp[i]. When the table is full the player drags the cell the code returns into return.
// An operation the code would not make is not made and says the rule it broke. Kept free of React: the board keeps only
// the operations made so far, and the machine is the replay of them.
import type { EndlessGame, TryGame } from "./ladder";
import { rng } from "./random";

export type DpProblem = "stairs" | "robber" | "kadane" | "coins" | "paths" | "minPath" | "lcs";
export const DP_PROBLEMS: readonly DpProblem[] = ["stairs", "robber", "kadane", "coins", "paths", "minPath", "lcs"];
export type DpLevel = 1 | 2 | 3;
/**
 * A problem and its data: `a` the steps one may take (stairs), the houses' money or the numbers (robber, kadane), the
 * coins (coins); `k` the stairs or the amount; `g` the grid (its size for paths, its costs for minPath); `s` and `t`
 * the two words (lcs, the arrays a[] and b[]).
 */
export type DpTask = { p: DpProblem; a: number[]; k: number; g: number[][]; s: string; t: string };

export type DpNotice = "fib" | "greedy" | "notLast" | "diagonal" | "streak10";
export const DP_NOTICES: DpNotice[] = ["fib", "greedy", "notLast", "diagonal", "streak10"];

/** An array the formula reads: the table, or the input (a[], b[], g[][]). */
export type DpArr = "dp" | "a" | "b" | "g";
/** A slot of the formula: the cell it reads (`at`, flat by rows), its name in the code, the code line it is on. */
export type Slot = { arr: DpArr; at: number; text: string; line: number };
/** What the formula weighs once everything is read: skip or take, extend or start afresh, a coin, from above or the left, the diagonal, a sum. */
export type CandKind = "sum" | "skip" | "take" | "fresh" | "extend" | "coin" | "up" | "left" | "diag";
export type Cand = { kind: CandKind; c: number; expr: string; v: number };
/** A piece of the formula as it is drawn: text, a slot, a new line. */
export type Tok = { t: "text"; s: string } | { t: "slot"; k: number } | { t: "br" };
/**
 * The work for one cell: the slots in the order the code reads them (only the first `show` are shown until they are
 * read: the compare that picks the branch), what it weighs, whether max or min keeps one, the line that writes it.
 */
export type Plan = { reads: Slot[]; show: number; cands: Cand[]; pick: "max" | "min" | "one"; line: number; toks: Tok[] };

/** A line of the step log, as code. */
export type DpLog =
  | { op: "base" }
  | { op: "read"; text: string; name: string; v: string }
  | { op: "write"; name: string; expr: string; v: number; next: string }
  | { op: "return"; name: string; v: number };

/**
 * The machine's memory after some operations: the table (null an empty cell, flat by rows), the cells the loops fill
 * in turn and how many are filled, the slots read for the cell being filled, the cell returned (−1 before), the code
 * lines the last operation ran, the log, what the run has shown, and which result won each cell.
 */
export type DpMachine = {
  task: DpTask;
  rows: number;
  cols: number;
  dp: (number | null)[];
  order: number[];
  step: number;
  got: number;
  answer: number;
  lines: number[];
  log: DpLog[];
  seen: DpNotice[];
  won: string[];
};

/** The table's size: one row for a 1-D table. */
export function shape(t: DpTask): { rows: number; cols: number } {
  if (t.p === "stairs" || t.p === "coins") return { rows: 1, cols: t.k + 1 };
  if (t.p === "robber" || t.p === "kadane") return { rows: 1, cols: t.a.length };
  if (t.p === "lcs") return { rows: t.s.length + 1, cols: t.t.length + 1 };
  return { rows: t.g.length, cols: t.g[0].length };
}
export const twoD = (t: DpTask) => t.p === "paths" || t.p === "minPath" || t.p === "lcs";

/** The base cases the code writes before the loops. */
function base(t: DpTask, rows: number, cols: number): Map<number, number> {
  const b = new Map<number, number>();
  if (t.p === "stairs") b.set(0, 1);
  if (t.p === "coins") b.set(0, 0);
  if (t.p === "kadane") b.set(0, t.a[0]);
  if (t.p === "robber") b.set(0, t.a[0]).set(1, Math.max(t.a[0], t.a[1]));
  if (t.p === "minPath") b.set(0, t.g[0][0]);
  if (t.p === "paths" || t.p === "lcs") {
    for (let j = 0; j < cols; j++) b.set(j, t.p === "paths" ? 1 : 0);
    for (let i = 0; i < rows; i++) b.set(i * cols, t.p === "paths" ? 1 : 0);
  }
  return b;
}

/** A number as the board writes it, with a real minus sign; in a sum, a negative one in brackets. */
export const fmt = (v: number) => (v < 0 ? `−${-v}` : String(v));
const term = (v: number) => (v < 0 ? `(${fmt(v)})` : fmt(v));

/** A cell's name in the code: dp[4], dp[2][3], a[1], g[0][2]. */
export function cellName(m: Pick<DpMachine, "task" | "cols">, arr: DpArr, at: number): string {
  if (arr === "a" || arr === "b") return `${arr}[${at}]`;
  return arr === "g" || twoD(m.task) ? `${arr}[${Math.floor(at / m.cols)}][${at % m.cols}]` : `${arr}[${at}]`;
}
/** Where the loops are: i = 4, or i = 2, j = 3. */
export function whereText(m: Pick<DpMachine, "task" | "cols">, at: number): string {
  return twoD(m.task) ? `i = ${Math.floor(at / m.cols)}, j = ${at % m.cols}` : `i = ${at}`;
}
/** What a cell of an array holds, as the board writes it (a letter of a word, or a number). */
export function valueAt(m: Pick<DpMachine, "task" | "dp" | "cols">, arr: DpArr, at: number): string {
  const { task: t } = m;
  if (arr === "dp") return m.dp[at] === null ? "" : fmt(m.dp[at]!);
  if (arr === "g") return fmt(t.g[Math.floor(at / m.cols)][at % m.cols]);
  if (t.p === "lcs") return (arr === "a" ? t.s : t.t)[at];
  return fmt(t.a[at]);
}

/** The work the code does for the cell `at`, from the table as filled so far. */
export function planOf(m: Pick<DpMachine, "task" | "dp" | "cols">, at: number): Plan {
  const { task: t, cols } = m;
  const dp = (k: number) => m.dp[k]!;
  const slot = (arr: DpArr, k: number, text: string, line = 2): Slot => ({ arr, at: k, text, line });
  const S = (k: number): Tok => ({ t: "slot", k });
  const T = (s: string): Tok => ({ t: "text", s });
  const one = (kind: CandKind, expr: string, v: number, c = 0): Cand => ({ kind, c, expr, v });
  if (t.p === "stairs" || t.p === "coins") {
    const i = at;
    const steps = t.a.filter((s) => s <= i);
    const reads = steps.map((s) => slot("dp", i - s, `dp[i−${s}]`));
    const join = steps.flatMap((_, k) => (k ? [T(t.p === "stairs" ? " + " : ", "), S(k)] : [S(k)]));
    if (t.p === "stairs") {
      const vs = steps.map((s) => dp(i - s));
      return { reads, show: reads.length, cands: [one("sum", vs.map(term).join(" + "), vs.reduce((x, y) => x + y, 0))], pick: "one", line: 2, toks: [T("dp[i] = "), ...join] };
    }
    const cands = steps.map((c) => one("coin", `1 + ${fmt(dp(i - c))}`, 1 + dp(i - c), c));
    return { reads, show: reads.length, cands, pick: "min", line: 2, toks: [T("dp[i] = 1 + min("), ...join, T(")")] };
  }
  if (t.p === "robber") {
    const i = at;
    const reads = [slot("dp", i - 1, "dp[i−1]"), slot("dp", i - 2, "dp[i−2]"), slot("a", i, "a[i]")];
    const cands = [one("skip", fmt(dp(i - 1)), dp(i - 1)), one("take", `${fmt(dp(i - 2))} + ${fmt(t.a[i])}`, dp(i - 2) + t.a[i])];
    return { reads, show: 3, cands, pick: "max", line: 2, toks: [T("dp[i] = max("), S(0), T(", "), S(1), T(" + "), S(2), T(")")] };
  }
  if (t.p === "kadane") {
    const i = at;
    const reads = [slot("a", i, "a[i]"), slot("dp", i - 1, "dp[i−1]")];
    const cands = [one("fresh", `${fmt(t.a[i])} + 0`, t.a[i]), one("extend", `${fmt(t.a[i])} + ${term(dp(i - 1))}`, t.a[i] + dp(i - 1))];
    return { reads, show: 2, cands, pick: "max", line: 2, toks: [T("dp[i] = "), S(0), T(" + max(0, "), S(1), T(")")] };
  }
  const [i, j] = [Math.floor(at / cols), at % cols];
  const up = at - cols;
  const left = at - 1;
  if (t.p === "paths") {
    const reads = [slot("dp", up, "dp[i−1][j]"), slot("dp", left, "dp[i][j−1]")];
    return { reads, show: 2, cands: [one("sum", `${dp(up)} + ${dp(left)}`, dp(up) + dp(left))], pick: "one", line: 2, toks: [T("dp[i][j] = "), S(0), T(" + "), S(1)] };
  }
  if (t.p === "minPath") {
    const c = t.g[i][j];
    const reads = [slot("g", at, "g[i][j]")];
    const cands: Cand[] = [];
    if (i > 0) {
      reads.push(slot("dp", up, "dp[i−1][j]"));
      cands.push(one("up", `${c} + ${dp(up)}`, c + dp(up)));
    }
    if (j > 0) {
      reads.push(slot("dp", left, "dp[i][j−1]"));
      cands.push(one("left", `${c} + ${dp(left)}`, c + dp(left)));
    }
    const toks = cands.length === 2 ? [T("dp[i][j] = "), S(0), T(" + min("), S(1), T(", "), S(2), T(")")] : [T("dp[i][j] = "), S(0), T(" + "), S(1)];
    return { reads, show: reads.length, cands, pick: cands.length === 2 ? "min" : "one", line: 2, toks };
  }
  // The longest common subsequence: compare a[i−1] and b[j−1], then the diagonal plus one, or the larger of above and left.
  const reads = [slot("a", i - 1, "a[i−1]"), slot("b", j - 1, "b[j−1]")];
  const head: Tok[] = [T("if "), S(0), T(" == "), S(1), T(":"), { t: "br" }];
  if (t.s[i - 1] === t.t[j - 1]) {
    const d = at - cols - 1;
    reads.push(slot("dp", d, "dp[i−1][j−1]", 3));
    return { reads, show: 2, cands: [one("diag", `${dp(d)} + 1`, dp(d) + 1)], pick: "one", line: 3, toks: [...head, T("  dp[i][j] = "), S(2), T(" + 1")] };
  }
  reads.push(slot("dp", up, "dp[i−1][j]", 4), slot("dp", left, "dp[i][j−1]", 4));
  const cands = [one("up", String(dp(up)), dp(up)), one("left", String(dp(left)), dp(left))];
  return { reads, show: 2, cands, pick: "max", line: 4, toks: [...head, T("  else dp[i][j] = max("), S(2), T(", "), S(3), T(")")] };
}

/** The indexes of the results the formula keeps (more than one on a tie). */
export function bestOf(p: Plan): number[] {
  const vs = p.cands.map((c) => c.v);
  const b = p.pick === "max" ? Math.max(...vs) : p.pick === "min" ? Math.min(...vs) : vs[0];
  return vs.flatMap((v, k) => (v === b ? [k] : []));
}

/** The cells the code returns: the last one, or for max(dp) every cell that holds the largest value. */
export function answerCells(m: Pick<DpMachine, "task" | "dp">): number[] {
  const last = m.dp.length - 1;
  if (m.task.p !== "kadane") return [last];
  const best = Math.max(...m.dp.map((v) => v ?? -Infinity));
  return m.dp.flatMap((v, k) => (v === best ? [k] : []));
}

/** The machine before the first operation: the base cases written, i at the first cell the loops fill. */
export function startMachine(task: DpTask): DpMachine {
  const { rows, cols } = shape(task);
  const b = base(task, rows, cols);
  const dp = Array.from({ length: rows * cols }, (_, k) => b.get(k) ?? null);
  const order = dp.flatMap((v, k) => (v === null ? [k] : []));
  return { task, rows, cols, dp, order, step: 0, got: 0, answer: -1, lines: [0], log: [{ op: "base" }], seen: [], won: [] };
}

/** What the code does next: read a slot, write a result into the cell, return the answer; null when it is over. */
export type DpExpect = { kind: "read"; slot: Slot; k: number; at: number } | { kind: "write"; at: number; plan: Plan } | { kind: "answer"; cells: number[] } | null;
export function expect(m: DpMachine): DpExpect {
  if (m.step < m.order.length) {
    const at = m.order[m.step];
    const plan = planOf(m, at);
    return m.got < plan.reads.length ? { kind: "read", slot: plan.reads[m.got], k: m.got, at } : { kind: "write", at, plan };
  }
  return m.answer < 0 ? { kind: "answer", cells: answerCells(m) } : null;
}

/** How many coins taking the largest that fits first would need. */
export function greedyCoins(coins: number[], k: number): number {
  let n = 0;
  for (const c of [...coins].sort((x, y) => y - x)) for (; k >= c; k -= c) n++;
  return n;
}

const LAST_LINE = (t: DpTask) => CODE[t.p].length - 1;

/** The machine after one more operation: a read (any code), a write of the result `code`, the return of cell `code`. */
export function apply(m0: DpMachine, code: number): DpMachine {
  const m: DpMachine = { ...m0, dp: [...m0.dp], log: [...m0.log], seen: [...m0.seen], won: [...m0.won] };
  const see = (k: DpNotice) => m.seen.includes(k) || m.seen.push(k);
  const e = expect(m0);
  if (e?.kind === "read") {
    m.got++;
    m.lines = [e.slot.line];
    m.log.push({ op: "read", text: e.slot.text, name: cellName(m, e.slot.arr, e.slot.at), v: valueAt(m, e.slot.arr, e.slot.at) });
  } else if (e?.kind === "write") {
    const c = e.plan.cands[code];
    m.dp[e.at] = c.v;
    m.step++;
    m.got = 0;
    m.won.push(c.kind === "coin" ? `coin${c.c}` : c.kind);
    if (c.kind === "diag") see("diagonal");
    const expr = e.plan.pick === "one" ? c.expr : `${e.plan.pick}(${e.plan.cands.map((x) => x.expr).join(", ")})`;
    const next = m.step < m.order.length ? whereText(m, m.order[m.step]) : "";
    m.log.push({ op: "write", name: cellName(m, "dp", e.at), expr, v: c.v, next });
    m.lines = [e.plan.line];
  } else if (e?.kind === "answer") {
    m.answer = code;
    m.lines = [LAST_LINE(m.task)];
    m.log.push({ op: "return", name: cellName(m, "dp", code), v: m.dp[code]! });
    const { task: t } = m;
    if (t.p === "stairs" && t.a.join() === "1,2") see("fib");
    if (t.p === "coins" && m.dp[t.k]! < greedyCoins(t.a, t.k)) see("greedy");
    if (code !== m.dp.length - 1) see("notLast");
  }
  return m;
}

/** The code's own operations, start to end (a tie to the first result), and the machine at the end. */
export function dpRun(task: DpTask): { ops: number[]; end: DpMachine } {
  let m = startMachine(task);
  const ops: number[] = [];
  for (let e = expect(m); e; e = expect(m)) {
    const code = e.kind === "read" ? 0 : e.kind === "write" ? bestOf(e.plan)[0] : e.cells[0];
    ops.push(code);
    m = apply(m, code);
  }
  return { ops, end: m };
}

/** The machine after the operations the player has made. */
export function replay(task: DpTask, ops: number[]): DpMachine {
  return ops.reduce(apply, startMachine(task));
}

// ---------- checking an operation ----------

/** What the player tried: a cell dropped on slot k, result k dropped on a cell of the table, a cell dropped on return. */
export type DpAttempt = { kind: "read"; arr: DpArr; at: number; k: number } | { kind: "write"; k: number; at: number } | { kind: "answer"; at: number };
export type DpWhy = "allRead" | "full" | "order" | "empty" | "array" | "index" | "readFirst" | "here" | "max" | "min" | "notFull" | "answerAt" | "answerMax";
export type DpCheck = { ok: true; code: number } | { ok: false; why: DpWhy; vars: Record<string, string | number> };

/** Whether the attempt is the code's next operation, and if not, the rule it broke. */
export function checkOp(m: DpMachine, a: DpAttempt): DpCheck {
  const e = expect(m);
  const no = (why: DpWhy, vars: Record<string, string | number> = {}): DpCheck => ({ ok: false, why, vars });
  const name = (arr: DpArr, at: number) => cellName(m, arr, at);
  // The run is over: nothing more to do (the board never asks).
  if (!e) return no("full");
  if (a.kind === "answer") {
    if (e.kind !== "answer") return no("notFull", { x: name("dp", e.at) });
    if (e.cells.includes(a.at)) return { ok: true, code: a.at };
    const got = name("dp", a.at);
    if (m.task.p === "kadane") return no("answerMax", { v: fmt(m.dp[e.cells[0]]!), want: name("dp", e.cells[0]), got });
    return no("answerAt", { ret: RETURNS[m.task.p], want: name("dp", e.cells[0]), got });
  }
  if (e.kind === "answer") return no("full");
  if (a.kind === "read") {
    if (e.kind === "write") return no("allRead", { x: name("dp", e.at) });
    if (a.k !== e.k) return no("order", { want: e.slot.text });
    if (a.arr === "dp" && m.dp[a.at] === null) return no("empty", { x: name("dp", a.at) });
    if (a.arr !== e.slot.arr) return no("array", { slot: e.slot.text, arr: e.slot.arr, got: a.arr });
    if (a.at !== e.slot.at) return no("index", { slot: e.slot.text, at: whereText(m, e.at), want: name(e.slot.arr, e.slot.at), got: name(a.arr, a.at) });
    return { ok: true, code: 0 };
  }
  if (e.kind === "read") return no("readFirst", { want: e.slot.text });
  if (a.at !== e.at) return no("here", { want: name("dp", e.at), at: whereText(m, e.at), got: name("dp", a.at) });
  const best = bestOf(e.plan);
  if (!best.includes(a.k)) return no(e.plan.pick === "min" ? "min" : "max", { a: fmt(e.plan.cands[best[0]].v), b: fmt(e.plan.cands[a.k].v) });
  return { ok: true, code: a.k };
}

// ---------- the tasks ----------

/** A problem and its size: stairs (n, the longest step m), houses, numbers, the amount, a grid's columns (m rows), a word's letters (m in b). */
type Spec = { p: DpProblem | null; n: number; m?: number; need?: DpNotice; most?: number };
const COIN_SETS = [[1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 2, 5]];
const pick = <T>(xs: readonly T[], next: () => number): T => xs[Math.floor(next() * xs.length)];
const int = (lo: number, hi: number, next: () => number) => lo + Math.floor(next() * (hi - lo + 1));

function make(p: DpProblem, n: number, m: number | undefined, next: () => number): DpTask {
  const t: DpTask = { p, a: [], k: 0, g: [], s: "", t: "" };
  if (p === "stairs") return { ...t, a: (m ?? pick([2, 3], next)) === 3 ? [1, 2, 3] : [1, 2], k: n };
  if (p === "robber") return { ...t, a: Array.from({ length: n }, () => int(1, 9, next)) };
  if (p === "kadane") return { ...t, a: Array.from({ length: n }, () => pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7], next)) };
  if (p === "coins") return { ...t, a: pick(COIN_SETS, next), k: n };
  const rows = m ?? 3;
  if (p === "paths") return { ...t, g: Array.from({ length: rows }, () => Array<number>(n).fill(0)) };
  if (p === "minPath") return { ...t, g: Array.from({ length: rows }, () => Array.from({ length: n }, () => int(1, 9, next))) };
  const word = (len: number) => Array.from({ length: len }, () => pick(["A", "B", "C"], next)).join("");
  return { ...t, s: word(n), t: word(rows) };
}

/**
 * A task worth playing: where max or min keeps one result, more than one kind of result wins somewhere (a house
 * skipped and one taken, a run extended and one started afresh, the letters equal and not), and two words share at
 * least two letters in order; `need` asks for a run that
 * shows something (an answer not in the last cell, a greedy count beaten), and `most` caps the operations.
 */
export function dpTask(spec: Spec, next: () => number): DpTask {
  for (;;) {
    const t = make(spec.p ?? pick(DP_PROBLEMS, next), spec.n, spec.m, next);
    const run = dpRun(t);
    if (t.p !== "stairs" && t.p !== "paths" && new Set(run.end.won).size < 2) continue;
    if (t.p === "lcs" && run.end.dp[run.end.dp.length - 1]! < 2) continue;
    if (spec.need && !run.end.seen.includes(spec.need)) continue;
    if (spec.most && run.ops.length > spec.most) continue;
    return t;
  }
}

export const DP_LADDER: (Spec & { seed: number })[] = [
  { p: "stairs", n: 5, m: 2, seed: 2301 },
  { p: "robber", n: 6, seed: 2302 },
  { p: "kadane", n: 7, need: "notLast", seed: 2303 },
  { p: "coins", n: 6, need: "greedy", seed: 2304 },
  { p: "paths", n: 4, m: 3, seed: 2305 },
  { p: "minPath", n: 3, m: 3, seed: 2306 },
  { p: "lcs", n: 3, m: 2, need: "diagonal", seed: 2307 },
  { p: "stairs", n: 6, m: 3, seed: 2308 },
  { p: "lcs", n: 3, m: 3, need: "diagonal", most: 45, seed: 2309 },
];
/** The endless run: easy, the 1-D tables on five or six cells; medium, coins, paths and longer rows; hard, the 2-D tables that weigh and coins up to 9. */
export function levelSpec(level: DpLevel, next: () => number): Spec {
  if (level === 1) return { p: pick(["stairs", "robber", "kadane"] as const, next), n: int(5, 6, next) };
  if (level === 2) {
    const p = pick(["coins", "paths", "robber", "kadane", "stairs"] as const, next);
    return { p, n: p === "coins" ? int(5, 7, next) : p === "paths" ? int(3, 4, next) : p === "stairs" ? 6 : 7, most: 30 };
  }
  const p = pick(["minPath", "lcs", "coins"] as const, next);
  return { p, n: p === "coins" ? int(8, 9, next) : 3, m: p === "lcs" ? int(2, 3, next) : 3, most: 45 };
}

/** Stars: no miss three, one two, else one. */
export const dpStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
/** What a run made without a miss showed, the first of them; ten in a row in the endless run. */
export function dpNotice(m: DpMachine, misses: number, streak: number): DpNotice | null {
  if (streak === 10) return "streak10";
  return misses === 0 ? (DP_NOTICES.find((k) => m.seen.includes(k)) ?? null) : null;
}

export type LiveBeDp = EndlessGame<DpNotice, DpLevel, { kind: "wrong"; why: DpWhy; vars: Record<string, string | number> }> &
  TryGame & {
    /** The operations made so far: 0 a read, the result written, the cell returned. */
    ops: number[];
  };
export function dpNow(d: Pick<LiveBeDp, "mode" | "stage" | "level" | "seed">): DpTask {
  if (d.mode === "puzzle") {
    const s = DP_LADDER[d.stage];
    return dpTask(s, rng(s.seed));
  }
  const next = rng(d.seed);
  return dpTask(levelSpec(d.level, next), next);
}

// ---------- the code and the log ----------

/** The code each problem runs, line by line; `DpMachine.lines` lights the lines the last operation ran. */
export const CODE: Record<DpProblem, string[]> = {
  stairs: ["dp[0] = 1", "for i in 1..n:", "  dp[i] = sum(dp[i−s] for s in steps if s ≤ i)", "return dp[n]"],
  robber: ["dp[0] = a[0]; dp[1] = max(a[0], a[1])", "for i in 2..n−1:", "  dp[i] = max(dp[i−1], dp[i−2] + a[i])  # skip, take", "return dp[n−1]"],
  kadane: ["dp[0] = a[0]", "for i in 1..n−1:", "  dp[i] = a[i] + max(0, dp[i−1])  # afresh, extend", "return max(dp)"],
  coins: ["dp[0] = 0", "for i in 1..k:", "  dp[i] = 1 + min(dp[i−c] for c in coins if c ≤ i)", "return dp[k]"],
  paths: ["dp[0][j] = 1; dp[i][0] = 1", "for i in 1..R−1: for j in 1..C−1:", "  dp[i][j] = dp[i−1][j] + dp[i][j−1]", "return dp[R−1][C−1]"],
  minPath: ["dp[0][0] = g[0][0]", "for i in 0..R−1: for j in 0..C−1, not (0, 0):", "  dp[i][j] = g[i][j] + min(dp[i−1][j], dp[i][j−1])  # those there are", "return dp[R−1][C−1]"],
  lcs: ["dp[i][0] = 0; dp[0][j] = 0", "for i in 1..n: for j in 1..m:", "  if a[i−1] == b[j−1]:", "    dp[i][j] = dp[i−1][j−1] + 1", "  else: dp[i][j] = max(dp[i−1][j], dp[i][j−1])", "return dp[n][m]"],
};
/** What each problem's code returns, as the return line names it. */
export const RETURNS: Record<DpProblem, string> = { stairs: "dp[n]", robber: "dp[n−1]", kadane: "max(dp)", coins: "dp[k]", paths: "dp[R−1][C−1]", minPath: "dp[R−1][C−1]", lcs: "dp[n][m]" };

/** A log line as code. */
export function logText(l: DpLog, t: DpTask): string {
  switch (l.op) {
    case "base":
      return CODE[t.p][0];
    case "read":
      return `${l.text} → ${l.name} = ${l.v}`;
    case "write":
      return `${l.name} = ${l.expr} = ${fmt(l.v)}${l.next ? `; ${l.next}` : ""}`;
    case "return":
      return `return ${l.name}  # ${fmt(l.v)}`;
  }
}

// ---------- the picture ----------

/** A place on the picture to drag from or drop on: a cell of an array (a, b, g, d), a slot (s), a result (k), return (ans). */
export type Spot = { id: string; x: number; y: number; w: number; h: number; from: boolean; to: boolean; label: string };
export type DpPic = { w: number; h: number; body: string; spots: Spot[] };

const BLUE = "#1971c2";
const GREEN = "#2f9e44";
const ORANGE = "#f08c00";
const INK = "#1e1e1e";
const MUTED = "#868e96";
const CELL = 38;
const STEP = 42;
const LEFT = 64;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const t = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean; mono?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" fill="${o.color ?? INK}" text-anchor="${o.anchor ?? "middle"}"${o.bold ? ` font-weight="700"` : ""}${o.mono ? ` font-family="${MONO}"` : ""}>${s}</text>`;
const box = (x: number, y: number, w: number, h: number, fill: string, stroke: string, dash = false, width = 1.6) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`;
/** About how wide a run of monospace text is. */
const wide = (s: string, size: number) => s.length * size * 0.6;

/**
 * The machine drawn as a computer keeps it: the input arrays and the table with their indexes, the cell being filled
 * ringed orange with i (and j) pointing at it, the cells read for it blue; below, the formula with its slots, the
 * results it weighs once all is read, and return. `hot` lights the spot a drag is over and `sel` the one picked up.
 */
export function dpSvg(m: DpMachine, o: { hot?: string | null; sel?: string | null; finished?: boolean } = {}): DpPic {
  const { task: tk, rows, cols } = m;
  const two = twoD(tk);
  const spots: Spot[] = [];
  const parts: string[] = [];
  let right = 0;
  const e = expect(m);
  const cur = e && e.kind !== "answer" ? e.at : -1;
  const plan = cur >= 0 ? planOf(m, cur) : null;
  const read = new Set((plan?.reads.slice(0, m.got) ?? []).map((s) => `${s.arr}${s.at}`));
  const lit = (id: string) => (o.hot === id ? "hot" : o.sel === id ? "sel" : null);
  /** One cell of an array: its value, read (blue), being filled (orange), a base case (grey), empty (dashed). */
  const cell = (arr: DpArr, at: number, x: number, y: number) => {
    const id = `${arr === "dp" ? "d" : arr}${at}`;
    const v = valueAt(m, arr, at);
    const l = lit(id);
    const isCur = arr === "dp" && at === cur;
    const wasRead = read.has(`${arr}${at}`);
    const isAns = arr === "dp" && at === m.answer;
    const isBase = arr === "dp" && !m.order.includes(at);
    const fill = l === "hot" ? "#fff3bf" : l === "sel" ? "#ffe8cc" : isAns ? "#d3f9d8" : isCur ? "#fff9db" : wasRead ? "#d0ebff" : arr !== "dp" ? "#f8f9fa" : isBase ? "#f1f3f5" : "#fff";
    const stroke = l ? ORANGE : isAns ? GREEN : isCur ? ORANGE : wasRead ? BLUE : "#adb5bd";
    parts.push(box(x, y, CELL, CELL, fill, stroke, arr === "dp" && v === "" && !isCur, isCur || wasRead || l ? 2.4 : 1.6));
    if (v) parts.push(t(x + CELL / 2, y + 25, v, { size: v.length > 2 ? 14 : 17, bold: true, color: arr === "dp" ? INK : "#495057" }));
    spots.push({ id, x, y, w: CELL, h: CELL, from: v !== "", to: arr === "dp", label: v ? `${cellName(m, arr, at)} = ${v}` : cellName(m, arr, at) });
    right = Math.max(right, x + CELL);
  };
  const idx = (x: number, y: number, s: number | string) => parts.push(t(x, y, String(s), { size: 11, color: MUTED, mono: true }));
  const label = (x: number, y: number, s: string, anchor = "end") => parts.push(t(x, y, s, { size: 14, anchor, bold: true, mono: true }));
  const pointer = (cx: number, y: number, s: string) => {
    parts.push(`<path d="M ${cx} ${y} l -6 10 h 12 z" fill="${BLUE}"/>`);
    parts.push(t(cx, y + 24, s, { size: 12, color: BLUE, bold: true, mono: true }));
  };

  let y = 12;
  if (!two) {
    // A row of the table, and the input row above it with the same indexes.
    const consts = tk.p === "stairs" ? `steps = {${tk.a.join(", ")}}; n = ${tk.k}` : tk.p === "coins" ? `coins = {${tk.a.join(", ")}}; k = ${tk.k}` : "";
    if (consts) {
      parts.push(t(LEFT - 40, y + 14, consts, { size: 14, anchor: "start", mono: true, bold: true }));
      y += 30;
    }
    const col = (i: number) => LEFT + i * STEP;
    for (let i = 0; i < cols; i++) idx(col(i) + CELL / 2, y + 10, i);
    y += 16;
    if (tk.p === "robber" || tk.p === "kadane") {
      label(LEFT - 10, y + 25, "a[]");
      tk.a.forEach((_, i) => cell("a", i, col(i), y));
      y += CELL + 8;
    }
    label(LEFT - 10, y + 25, "dp[]");
    for (let i = 0; i < cols; i++) cell("dp", i, col(i), y);
    y += CELL + 6;
    if (cur >= 0) pointer(col(cur) + CELL / 2, y, "i");
    y += 34;
  } else {
    // The grid: g[][] beside it (minPath), or a[] down its side and b[] along its top (lcs); i and j point at the cell.
    // The labels on a line of their own; lcs puts b[] (with its indexes) between them and the grid.
    const by = y + 34;
    const top = tk.p === "lcs" ? by + CELL + 22 : y + 34;
    let gx = tk.p === "lcs" ? LEFT + 22 + CELL + 14 : LEFT;
    if (tk.p === "minPath") {
      label(LEFT, y + 12, "g[][]", "start");
      for (let j = 0; j < cols; j++) idx(LEFT + j * STEP + CELL / 2, top - 6, j);
      for (let i = 0; i < rows; i++) {
        idx(LEFT - 12, top + i * STEP + 24, i);
        for (let j = 0; j < cols; j++) cell("g", i * cols + j, LEFT + j * STEP, top + i * STEP);
      }
      gx = LEFT + cols * STEP + 44;
    }
    label(gx, y + 12, "dp[][]", "start");
    if (tk.p === "lcs") {
      label(gx + STEP - 10, by + 25, "b[]");
      for (let j = 1; j < cols; j++) {
        idx(gx + j * STEP + CELL / 2, by - 6, j - 1);
        cell("b", j - 1, gx + j * STEP, by);
      }
      parts.push(t(LEFT + 6 + CELL / 2, top + STEP - 16, "a[]", { size: 14, bold: true, mono: true }));
      for (let i = 1; i < rows; i++) {
        idx(LEFT - 6, top + i * STEP + 24, i - 1);
        cell("a", i - 1, LEFT + 6, top + i * STEP);
      }
    }
    for (let j = 0; j < cols; j++) idx(gx + j * STEP + CELL / 2, top - 6, j);
    for (let i = 0; i < rows; i++) {
      idx(gx - 12, top + i * STEP + 24, i);
      for (let j = 0; j < cols; j++) cell("dp", i * cols + j, gx + j * STEP, top + i * STEP);
    }
    const bottom = top + rows * STEP;
    if (cur >= 0) {
      const [ci, cj] = [Math.floor(cur / cols), cur % cols];
      pointer(gx + cj * STEP + CELL / 2, bottom + 2, "j");
      const ry = top + ci * STEP + CELL / 2;
      parts.push(`<path d="M ${gx + cols * STEP + 2} ${ry} l 10 -6 v 12 z" fill="${BLUE}"/>`);
      parts.push(t(gx + cols * STEP + 18, ry + 5, "i", { size: 12, color: BLUE, bold: true, mono: true, anchor: "start" }));
      right = Math.max(right, gx + cols * STEP + 30);
    }
    y = bottom + 40;
  }

  // The formula for the cell being filled: its text, the slots (the next one dashed orange), a new line where it breaks.
  y += 6;
  const x0 = 16;
  if (plan && cur >= 0) {
    parts.push(t(x0, y + 4, `${whereText(m, cur)}:`, { size: 13, anchor: "start", mono: true, color: BLUE, bold: true }));
    y += 14;
    const shown = m.got < plan.show ? plan.show : plan.reads.length;
    let x = x0;
    const rowH = 46;
    for (const tok of plan.toks) {
      if (tok.t === "br") {
        if (m.got < plan.show) break;
        x = x0;
        y += rowH;
      } else if (tok.t === "text") {
        parts.push(t(x, y + 27, tok.s.replace(/ /g, " "), { size: 15, anchor: "start", mono: true }));
        x += wide(tok.s, 15);
      } else if (tok.k < shown) {
        const s = plan.reads[tok.k];
        const id = `s${tok.k}`;
        const w = Math.max(52, wide(s.text, 11) + 14);
        const done = tok.k < m.got;
        const next = tok.k === m.got;
        const l = lit(id);
        parts.push(box(x, y, w, 40, l === "hot" ? "#fff3bf" : done ? "#d0ebff" : "#fff", l || next ? ORANGE : done ? BLUE : "#adb5bd", !done, next || l ? 2.4 : 1.6));
        if (done) {
          parts.push(t(x + w / 2, y + 12, cellName(m, s.arr, s.at), { size: 10, color: BLUE, mono: true }));
          parts.push(t(x + w / 2, y + 33, valueAt(m, s.arr, s.at), { size: 17, bold: true }));
        } else parts.push(t(x + w / 2, y + 25, s.text, { size: 11, color: next ? ORANGE : MUTED, mono: true, bold: next }));
        spots.push({ id, x, y, w, h: 40, from: false, to: true, label: done ? `${s.text} = ${valueAt(m, s.arr, s.at)}` : s.text });
        x += w + 4;
      }
      right = Math.max(right, x);
    }
    y += rowH + 4;
    // The results it weighs, once everything is read: drag the one kept into the cell.
    if (m.got === plan.reads.length) {
      let cx = x0;
      plan.cands.forEach((c, k) => {
        const s = `${c.expr} = ${fmt(c.v)}`;
        const w = wide(s, 14) + 22;
        const id = `k${k}`;
        const l = lit(id);
        parts.push(`<rect x="${cx}" y="${y}" width="${w}" height="34" rx="17" fill="${l ? "#ffe8cc" : "#fff4e6"}" stroke="${ORANGE}" stroke-width="2"/>`);
        parts.push(t(cx + w / 2, y + 22, s.replace(/ /g, " "), { size: 14, bold: true, mono: true }));
        spots.push({ id, x: cx, y, w, h: 34, from: true, to: false, label: s });
        cx += w + 10;
        right = Math.max(right, cx);
      });
      y += 46;
    }
  } else y += 8;
  // return: where the answer goes once the table is full.
  const rl = `return ${RETURNS[tk.p]}`;
  parts.push(t(x0, y + 26, rl.replace(/ /g, " "), { size: 15, anchor: "start", mono: true, bold: true, color: e?.kind === "answer" ? INK : MUTED }));
  const ax = x0 + wide(rl, 15) + 12;
  const al = lit("ans");
  const got = m.answer >= 0;
  parts.push(box(ax, y, 56, 40, al === "hot" ? "#fff3bf" : got ? "#d3f9d8" : "#fff", al ? ORANGE : got ? GREEN : e?.kind === "answer" ? ORANGE : "#adb5bd", !got, e?.kind === "answer" || al ? 2.4 : 1.6));
  if (got) parts.push(t(ax + 28, y + 27, fmt(m.dp[m.answer]!), { size: 18, bold: true, color: o.finished ? GREEN : INK }));
  spots.push({ id: "ans", x: ax, y, w: 56, h: 40, from: false, to: true, label: rl });
  right = Math.max(right, ax + 56);
  return { w: Math.max(right + 16, 360), h: y + 52, body: parts.join(""), spots };
}
