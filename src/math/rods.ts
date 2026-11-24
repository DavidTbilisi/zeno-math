// Number rods (the coloured rods of Cuisenaire and Gattegno): a rod for each number from 1 to 10, its length the
// number and its colour always the same, with no marks to count. Rods laid end to end in a row are a sum; two rows of
// the same length say two sums are equal (10 = 9 + 1 = 8 + 2); a row shorter than the longest has a gap, which is the
// question "7 + ? = 10" and, read the other way, a difference. The words name only what the rods already show: a gap
// is asked about, never filled in.
// src/live/Rods.tsx draws them; everything here is plain data.

export type LiveRods = {
  /** The rows, top to bottom: each the lengths of its rods, left to right. */
  rows: number[][];
  /** Each rod's number written on it, each row's length beside it, and the words under the mat. */
  numbers: boolean;
};

export const ROD_MAX = 10;
export const MAX_ROWS = 10;
/** The longest a row can be: two orange rods. */
export const MAX_SUM = 20;

/** The ways to make 10 begun, with the last left for the pupil: 7 and what? */
export const RODS_START: LiveRods = { rows: [[10], [9, 1], [8, 2], [7]], numbers: true };

export const rowSum = (row: number[]) => row.reduce((s, n) => s + n, 0);
export const longest = (rows: number[][]) => rows.reduce((m, r) => Math.max(m, rowSum(r)), 0);
const isRod = (n: number) => Number.isInteger(n) && n >= 1 && n <= ROD_MAX;

/** Rows with no rods go; what is left is at most MAX_ROWS rows. */
const tidy = (rows: number[][]) => rows.filter((r) => r.length).slice(0, MAX_ROWS);
const same = (a: number[][], b: number[][]) => a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((n, j) => n === b[i][j]));

/** A rod has room at the end of (or anywhere in) row `t`. */
export const fits = (rows: number[][], t: number, n: number) => !!rows[t] && rowSum(rows[t]) + n <= MAX_SUM;

/** A rod from the tray laid in row `t`, before the rod now at `at` (at the end when there is none). */
export function putRod(rows: number[][], n: number, t: number, at = Infinity): number[][] {
  if (!isRod(n) || !fits(rows, t, n)) return rows;
  const k = Math.max(0, Math.min(rows[t].length, at));
  return rows.map((r, j) => (j === t ? [...r.slice(0, k), n, ...r.slice(k)] : r));
}

/** A rod from the tray starting a row of its own, under the others. */
export function newRow(rows: number[][], n: number): number[][] {
  return !isRod(n) || rows.length >= MAX_ROWS ? rows : [...rows, [n]];
}

/** A tray rod tapped: on the end of the last row when it has room there, or else a new row. */
export function addRod(rows: number[][], n: number): number[][] {
  const t = rows.length - 1;
  return t >= 0 && fits(rows, t, n) ? putRod(rows, n, t) : newRow(rows, n);
}

/**
 * Rod `i` of row `t` lifted and laid again: in a row before the rod at `at` (counted without the lifted rod when it
 * is the same row), in a new row under the others ("new"), or back in the tray (null). A move there is no room for,
 * or one that changes nothing, gives back the same rows.
 */
export function moveRod(rows: number[][], t: number, i: number, to: { t: number; at: number } | "new" | null): number[][] {
  const n = rows[t]?.[i];
  if (n === undefined) return rows;
  const without = rows.map((r, j) => (j === t ? r.filter((_, k) => k !== i) : r));
  let next: number[][];
  if (to === null) next = without;
  else if (to === "new") next = [...without, [n]];
  else {
    if (!without[to.t] || rowSum(without[to.t]) + n > MAX_SUM) return rows;
    const k = Math.max(0, Math.min(without[to.t].length, to.at));
    next = without.map((r, j) => (j === to.t ? [...r.slice(0, k), n, ...r.slice(k)] : r));
  }
  if (next.filter((r) => r.length).length > MAX_ROWS) return rows;
  next = tidy(next);
  return same(next, rows) ? rows : next;
}

/** Where a rod would go in a row, by where its middle is (in units from the row's start): before the first rod whose middle is further right. */
export function slotAt(row: number[], middle: number): number {
  let at = 0;
  let from = 0;
  for (const n of row) {
    if (from + n / 2 < middle) at++;
    from += n;
  }
  return at;
}

/** How much shorter than the longest row each row is. */
export function gaps(rows: number[][]): number[] {
  const m = longest(rows);
  return rows.map((r) => m - rowSum(r));
}

/** What the rods say, as sentences to fill in. */
export type RodSay =
  | { kind: "empty" }
  /** A row of one rod. */
  | { kind: "one"; n: number }
  /** A row of several: 7 + 3 = 10. */
  | { kind: "sum"; parts: number[]; n: number }
  /** Rows of the same length: 10 = 9 + 1 = 8 + 2 (the rows of one rod are the 10 itself). */
  | { kind: "same"; n: number; ways: number[][] }
  /** A row shorter than the longest: 7 + ? = 10. */
  | { kind: "gap"; parts: number[]; n: number };

/** The first line reads the longest rows; the second asks about the first row that is shorter. */
export function says(rows: number[][]): RodSay[] {
  if (!rows.length) return [{ kind: "empty" }];
  const m = longest(rows);
  const full = rows.filter((r) => rowSum(r) === m);
  const first: RodSay =
    full.length > 1 ? { kind: "same", n: m, ways: full.filter((r) => r.length > 1) }
    : full[0].length > 1 ? { kind: "sum", parts: full[0], n: m }
    : { kind: "one", n: m };
  const short = rows.find((r) => rowSum(r) < m);
  return short ? [first, { kind: "gap", parts: short, n: m }] : [first];
}
