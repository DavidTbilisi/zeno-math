// Integer counters: yellow +1 chips and red −1 chips. A + and a − together are a zero pair, worth 0, so the two cancel
// and the mat is worth what is left over. Adding a number puts its chips out. Subtracting takes chips away, and when
// there are too few of that kind to take, zero pairs go out first: they are worth nothing, so the value is unchanged.
// `sumSteps` walks a + b or a − b through those moves; src/live/Counters.tsx draws the mat and the steps.

export type CountersOp = "add" | "sub";
export const COUNTER_OPS: CountersOp[] = ["add", "sub"];

export type LiveCounters = {
  /** The chips on the mat: positive (+1) and negative (−1). */
  pos: number;
  neg: number;
  /** The sum to walk through, a + b or a − b. */
  a: number;
  op: CountersOp;
  b: number;
  /** How many of its steps are shown; 0 when the sum is not being walked through. */
  step: number;
};

/** The most chips of one sign on the mat: a − b with both at the ends of NUM_RANGE needs 20. */
export const CHIP_CAP = 20;
export const NUM_RANGE: [number, number] = [-10, 10];

export const COUNTERS_START: LiveCounters = { pos: 3, neg: 5, a: 3, op: "add", b: -5, step: 0 };

export type Mat = { pos: number; neg: number };

const MINUS = "−";
/** A whole number with a true minus sign: "−3". */
export const num = (n: number) => (n < 0 ? `${MINUS}${-n}` : `${n}`);
/** A number after + or −, a negative one in brackets: "(−3)". */
export const signed = (n: number) => (n < 0 ? `(${num(n)})` : `${n}`);
/** "3 + (−5)", "2 − (−4)". */
export const sumText = (a: number, op: CountersOp, b: number) => `${num(a)} ${op === "add" ? "+" : MINUS} ${signed(b)}`;
export const answer = (a: number, op: CountersOp, b: number) => (op === "add" ? a + b : a - b);

export const value = ({ pos, neg }: Mat) => pos - neg;
/** How many zero pairs are on the mat. */
export const pairs = ({ pos, neg }: Mat) => Math.min(pos, neg);
/** The mat with every zero pair gone. */
export const cancelPairs = (m: Mat): Mat => ({ pos: m.pos - pairs(m), neg: m.neg - pairs(m) });
/** The mat with one zero pair gone (a + dropped on a −, or the other way round). */
export const cancelOne = (m: Mat): Mat => (pairs(m) ? { pos: m.pos - 1, neg: m.neg - 1 } : m);
/** One chip more of a sign, up to CHIP_CAP. */
export const put = (m: Mat, negative: boolean, n = 1): Mat =>
  negative ? { ...m, neg: Math.min(CHIP_CAP, m.neg + n) } : { ...m, pos: Math.min(CHIP_CAP, m.pos + n) };
/** One chip fewer of a sign, never below none. */
export const take = (m: Mat, negative: boolean): Mat =>
  negative ? { ...m, neg: Math.max(0, m.neg - 1) } : { ...m, pos: Math.max(0, m.pos - 1) };

/** One move of a sum on the mat, and the mat after it. */
export type CounterStep = { mat: Mat } & (
  | { kind: "start"; a: number }
  | { kind: "put"; n: number; negative: boolean; b: number }
  | { kind: "zeroPairs"; n: number; take: number; negative: boolean }
  | { kind: "take"; n: number; negative: boolean; b: number }
  | { kind: "cancel"; n: number }
  | { kind: "answer"; a: number; op: CountersOp; b: number; r: number }
);

/**
 * The moves of a + b or a − b with counters: put a out; then for + put b's chips out, for − take b's chips away
 * (after putting out the zero pairs that makes possible); then let the zero pairs cancel and read what is left.
 */
export function sumSteps(a: number, op: CountersOp, b: number): CounterStep[] {
  let mat: Mat = { pos: Math.max(a, 0), neg: Math.max(-a, 0) };
  const steps: CounterStep[] = [{ kind: "start", a, mat }];
  const n = Math.abs(b);
  const negative = b < 0;
  if (n && op === "add") {
    mat = put(mat, negative, n);
    steps.push({ kind: "put", n, negative, b, mat });
  }
  if (n && op === "sub") {
    const have = negative ? mat.neg : mat.pos;
    if (have < n) {
      mat = { pos: mat.pos + n - have, neg: mat.neg + n - have };
      steps.push({ kind: "zeroPairs", n: n - have, take: n, negative, mat });
    }
    mat = negative ? { ...mat, neg: mat.neg - n } : { ...mat, pos: mat.pos - n };
    steps.push({ kind: "take", n, negative, b, mat });
  }
  if (pairs(mat)) {
    const z = pairs(mat);
    mat = cancelPairs(mat);
    steps.push({ kind: "cancel", n: z, mat });
  }
  steps.push({ kind: "answer", a, op, b, r: answer(a, op, b), mat });
  return steps;
}

/**
 * Where each chip goes, in slots (10 to a row): the side with chips left over has them first, then the zero pairs
 * fill the next slots on both sides, so each + of a pair sits right above its −. Cancelling the pairs leaves the
 * left-over chips where they were.
 */
export function slots({ pos, neg }: Mat): { pos: number[]; neg: number[]; paired: number } {
  const z = Math.min(pos, neg);
  const extra = Math.max(pos, neg) - z;
  const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);
  const paired = range(extra, z);
  return {
    pos: pos > neg ? [...range(0, extra), ...paired] : paired,
    neg: neg > pos ? [...range(0, extra), ...paired] : paired,
    paired: z,
  };
}
