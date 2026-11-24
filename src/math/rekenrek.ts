// A rekenrek (counting rack): rows of ten beads on a rod, five of one colour and five of the other, so a number is
// seen as "five and some more" and as "so many short of ten" without counting one by one. Beads wait on the right and
// count once they are slid to the left. The beads of a row keep their order, so a row is fully told by how many of
// its beads are on the left; a bead slid left takes every bead on its left with it, a bead slid back takes every bead
// on its right. A rack of ten rows is the hundred rack: its lower five rows swap the colours, so the fives show down
// the rack as well as along it.
// src/live/Rekenrek.tsx draws it; everything here is plain data.
import { rng } from "./random";

export const BEADS = 10;
/** The racks to choose from, by their rows: ten beads, twenty, a hundred. */
export const RACK_ROWS = [1, 2, 10] as const;

/** A sum to show on the rack: a + b or a − b, with the answer on the rack too. */
export type RackTask = { a: number; b: number; op: "+" | "−" };

export type LiveRekenrek = {
  rows: number;
  /** Beads on the left in each row, for all ten rows (the rows a smaller rack hides keep theirs). */
  left: number[];
  /** Each row's count written beside it, and what the beads say under the rack. */
  numbers: boolean;
  task: RackTask | null;
  /** How far the sum has come: 0 nothing yet, 1 the first number is shown, 2 the answer is. */
  stage: 0 | 1 | 2;
  /** Which sum the die dealt last. */
  seed: number;
};

export const REKENREK_START: LiveRekenrek = {
  rows: 2, left: [10, 5, 0, 0, 0, 0, 0, 0, 0, 0], numbers: true, task: null, stage: 0, seed: 1,
};

/** The beads on the left in the rows the rack shows. */
export const shownRows = (s: Pick<LiveRekenrek, "rows" | "left">) => s.left.slice(0, s.rows);
export const rackTotal = (s: Pick<LiveRekenrek, "rows" | "left">) => shownRows(s).reduce((a, n) => a + n, 0);
export const rackCap = (rows: number) => rows * BEADS;

/** Bead `i` of a row (0 the leftmost) is of the first colour or the second: the lower half of the hundred rack swaps them. */
export function beadColor(row: number, i: number): 0 | 1 {
  return i < 5 === row < 5 ? 0 : 1;
}

/** Bead `i` of a row slid to the left (with every bead on its left) or back to the right (with every bead on its right). */
export function slideBead(left: number[], row: number, i: number, toLeft: boolean): number[] {
  if (row < 0 || row >= left.length || i < 0 || i >= BEADS) return left;
  const n = toLeft ? Math.max(left[row], i + 1) : Math.min(left[row], i);
  return n === left[row] ? left : left.map((v, r) => (r === row ? n : v));
}

/** A tap sends a bead to the other side. */
export function tapBead(left: number[], row: number, i: number): number[] {
  return slideBead(left, row, i, i >= (left[row] ?? 0));
}

/** A row set to `n` beads on the left (the keyboard's way). */
export function setRow(left: number[], row: number, n: number): number[] {
  const c = Math.max(0, Math.min(BEADS, Math.round(n)));
  return row < 0 || row >= left.length || c === left[row] ? left : left.map((v, r) => (r === row ? c : v));
}

export const taskAnswer = (t: RackTask) => (t.op === "+" ? t.a + t.b : t.a - t.b);
/** The most beads a sum needs on the rack at once. */
const taskNeeds = (t: RackTask) => Math.max(t.a, taskAnswer(t));

/** A sum the rack has room for, the same for the same seed: both numbers at least 1. */
export function dealTask(rows: number, seed: number): RackTask {
  const r = rng(seed * 7919 + rows);
  const cap = rackCap(rows);
  const whole = 2 + Math.floor(r() * (cap - 1));
  const part = 1 + Math.floor(r() * (whole - 1));
  return r() < 0.5 ? { a: part, b: whole - part, op: "+" } : { a: whole, b: part, op: "−" };
}

/** The stage after the beads show `total`: first the sum's first number has to be shown, then its answer. */
export function advance(task: RackTask | null, stage: 0 | 1 | 2, total: number): 0 | 1 | 2 {
  if (!task) return 0;
  if (stage === 0) return total === task.a ? 1 : 0;
  if (stage === 1) return total === taskAnswer(task) ? 2 : 1;
  return 2;
}

/** The rack after its beads moved: the sum's steps are ticked by what the beads show. */
export function withBeads(s: LiveRekenrek, left: number[]): LiveRekenrek {
  if (left === s.left) return s;
  return { ...s, left, stage: advance(s.task, s.stage, rackTotal({ rows: s.rows, left })) };
}

/** Another rack: a sum it has no room for is put away, and one it keeps starts again. */
export function withRows(s: LiveRekenrek, rows: number): LiveRekenrek {
  if (rows === s.rows || !RACK_ROWS.includes(rows as (typeof RACK_ROWS)[number])) return s;
  const task = s.task && taskNeeds(s.task) <= rackCap(rows) ? s.task : null;
  return { ...s, rows, task, stage: advance(task, 0, rackTotal({ rows, left: s.left })) };
}

/** A new sum from the die, on a cleared rack. */
export function dealt(s: LiveRekenrek): LiveRekenrek {
  const seed = s.seed + 1;
  return { ...s, seed, task: dealTask(s.rows, seed), stage: 0, left: s.left.map(() => 0) };
}

/** Every bead back on the right; a sum starts again. */
export function cleared(s: LiveRekenrek): LiveRekenrek {
  return { ...s, left: s.left.map(() => 0), stage: 0 };
}

/** What the beads say, as sentences to fill in. */
export type RackSay =
  | { kind: "empty" }
  | { kind: "count"; n: number }
  /** One row past its five: 5 + 4 = 9. */
  | { kind: "fives"; more: number; n: number }
  /** A few rows, added: 10 + 5 = 15. */
  | { kind: "sum"; parts: number[]; n: number }
  /** Full rows and the rest: 3 tens and 7. */
  | { kind: "tens"; tens: number; ones: number; n: number }
  /** What is still on the right: 9 + 1 = 10. */
  | { kind: "rest"; n: number; rest: number; cap: number };

/** The first line reads the beads on the left; the second (unless the rack is full or empty) the beads still to come. */
export function says(s: Pick<LiveRekenrek, "rows" | "left">): RackSay[] {
  const rows = shownRows(s);
  const n = rackTotal(s);
  if (!n) return [{ kind: "empty" }];
  const parts = rows.filter((v) => v > 0);
  const tens = rows.filter((v) => v === BEADS).length;
  const first: RackSay =
    parts.length === 1 ? (n > 5 ? { kind: "fives", more: n - 5, n } : { kind: "count", n })
    : parts.length > 2 && tens > 0 ? { kind: "tens", tens, ones: n - tens * BEADS, n }
    : { kind: "sum", parts, n };
  const cap = rackCap(s.rows);
  return n < cap ? [first, { kind: "rest", n, rest: cap - n, cap }] : [first];
}
