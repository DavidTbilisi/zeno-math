// Why a minus times a minus is a plus, two ways, for the two live pieces that show it.
//
// The turning arrow (src/live/SignArrow.tsx): a number is an arrow from 0, multiplying by a size stretches it, and a
// minus sign turns it round. a × b is walked a step at a time: an arrow of |b| pointing right, turned round if b is
// negative, stretched |a| times, turned round again if a is negative. Each minus is a half turn, so two of them face
// the arrow the way it started. Turning it round again after the walk (× (−1)) counts on the turns.
//
// The pattern (src/live/SignPattern.tsx): the column 3 × b, 2 × b, 1 × b, 0 × b, … goes down by the same step each row,
// so its points lie on one straight line; carried on past 0 the line says what (−1) × b, (−2) × b and (−3) × b must be.
// The learner puts the points in, the first three given.

/** The arrow: a × b, both whole numbers from −4 to 4, never 0. */
export const SIGN_RANGE: [number, number] = [-4, 4];

export type LiveSignArrow = {
  a: number;
  b: number;
  /** How many of the walk's steps are shown; 0 when it is not being walked through. */
  step: number;
  /** Extra half turns (× (−1)) after the walk. */
  extra: number;
};

export const SIGN_ARROW_START: LiveSignArrow = { a: -3, b: -2, step: 0, extra: 0 };

/** One step of a × b on the arrow: what the arrow is after it. */
export type ArrowStep =
  | { kind: "size"; n: number }
  | { kind: "turnB"; b: number }
  | { kind: "stretch"; k: number; v: number }
  | { kind: "turnA"; a: number; v: number }
  | { kind: "answer"; a: number; b: number; r: number; turns: number };

/** The arrow's shape after a step: `segs` arrows of `len`, end to end, and how many half turns it has made. */
export type ArrowShape = { len: number; segs: number; turns: number };

export function arrowSteps(a: number, b: number): ArrowStep[] {
  const steps: ArrowStep[] = [{ kind: "size", n: Math.abs(b) }];
  if (b < 0) steps.push({ kind: "turnB", b });
  steps.push({ kind: "stretch", k: Math.abs(a), v: Math.abs(a) * b });
  if (a < 0) steps.push({ kind: "turnA", a, v: a * b });
  steps.push({ kind: "answer", a, b, r: a * b, turns: (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0) });
  return steps;
}

/**
 * The arrow after the first `step` steps of a × b and `extra` more turns: before the walk (step 0) it is b itself, one
 * arrow already turned if b is negative.
 */
export function arrowShape(a: number, b: number, step: number, extra = 0): ArrowShape {
  const len = Math.abs(b);
  if (step === 0) return { len, segs: 1, turns: b < 0 ? 1 : 0 };
  const done = arrowSteps(a, b).slice(0, step);
  const turns = done.filter((s) => s.kind === "turnA" || s.kind === "turnB").length + extra;
  return { len, segs: done.some((s) => s.kind === "stretch") ? Math.abs(a) : 1, turns };
}

/** Where the arrow's tip is: its length, plus or minus as its turns say. */
export const arrowValue = (s: ArrowShape) => (s.turns % 2 ? -1 : 1) * s.len * s.segs;

/** A whole number in the range, never 0: a step onto 0 goes on past it. */
export function stepPast0(v: number, was: number): number {
  const [lo, hi] = SIGN_RANGE;
  return Math.min(hi, Math.max(lo, v === 0 ? 2 * v - was : v));
}

const MINUS = "−";
export const num = (n: number) => (n < 0 ? `${MINUS}${-n}` : `${n}`);
/** A factor in a product, a negative one in brackets: "(−3)". */
export const factor = (n: number) => (n < 0 ? `(${num(n)})` : `${n}`);
/** "(−3) × (−2)", and "× (−1)" once for each turn after the walk. */
export const productText = (a: number, b: number, extra = 0) => [factor(a), factor(b), ...Array(extra).fill(factor(-1))].join(" × ");

/** The pattern: the column of a × b for a from 3 down to −3. */
export const PATTERN_AS = [3, 2, 1, 0, -1, -2, -3] as const;
/** The rows given at the start: the three a learner can count (3, 2 or 1 lots of b). */
export const PATTERN_GIVEN = 3;
/** b goes from −4 to 4, never 0; the answers from −12 to 12. */
export const PATTERN_Y = 12;

export type LiveSignPattern = {
  b: number;
  /** The answers put in so far, one for each row after the given ones, in order. */
  placed: number[];
  /** A wrong answer at the current row (drawn orange), or none. */
  wrong: number | null;
  /** Wrong taps at the current row: after one the line through the points so far is drawn on, dashed. */
  misses: number;
};

export const SIGN_PATTERN_START: LiveSignPattern = { b: -2, placed: [], wrong: null, misses: 0 };

/** The row being asked (an index into PATTERN_AS), or null once every row is in. */
export function patternRow(d: Pick<LiveSignPattern, "placed">): number | null {
  const i = PATTERN_GIVEN + d.placed.length;
  return i < PATTERN_AS.length ? i : null;
}

/** The rows known so far, given and put in: [a, a × b]. */
export const patternKnown = (d: Pick<LiveSignPattern, "b" | "placed">): [number, number][] =>
  PATTERN_AS.slice(0, PATTERN_GIVEN + d.placed.length).map((a) => [a, a * d.b]);

/** How a wrong answer at a row is wrong, for the hint. */
export type PatternSlip = "sign" | "jump" | "far";

export function patternSlip(b: number, row: number, y: number): PatternSlip {
  const want = PATTERN_AS[row] * b;
  if (y === -want) return "sign";
  const before = PATTERN_AS[row - 1] * b;
  if (Math.abs(y - before) === Math.abs(b)) return "jump";
  return "far";
}

/** A tap at answer y: the row is put in when it is right, otherwise it is held as wrong. */
export function patternTap(d: LiveSignPattern, y: number): LiveSignPattern {
  const row = patternRow(d);
  if (row === null) return d;
  // + 0 turns a −0 (a tap rounded up to the axis, or 0 × a negative) into 0.
  if (y === PATTERN_AS[row] * d.b) return { ...d, placed: [...d.placed, y + 0], wrong: null, misses: 0 };
  return { ...d, wrong: y + 0, misses: d.misses + 1 };
}

/** The step from one row to the next: how much each answer goes up (negative: down) as a goes down by 1. */
export const patternJump = (b: number) => -b;
