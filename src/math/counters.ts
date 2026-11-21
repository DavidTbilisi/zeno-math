// Integer counters: yellow +1 chips and red −1 chips on a mat. A + and a − together are a zero pair, worth 0, so the
// two cancel and the mat is worth what is left over. Adding a number puts its chips out. Subtracting takes chips away,
// and when there are too few of that kind to take, zero pairs go out first: they are worth nothing, so the value is
// unchanged. The chips lie wherever they are dropped (src/live/Counters.tsx drags them from trays, onto each other and
// into the bin); `tidy` lines them up, each + of a pair over its −. `sumSteps` lists the moves of a + b or a − b, and
// `taskStep` follows a learner doing them on the mat by watching what is on it.

export type CountersOp = "add" | "sub";
export const COUNTER_OPS: CountersOp[] = ["add", "sub"];

/** A chip on the mat, where it lies (its centre, in the piece's picture). */
export type MatChip = { id: number; x: number; y: number; neg: boolean };

export type LiveCounters = {
  chips: MatChip[];
  /** The id the next chip put out gets. */
  next: number;
  /** The sum to do on the mat, a + b or a − b. */
  a: number;
  op: CountersOp;
  b: number;
  /** While the sum is being done: which of its steps (sumSteps) is asked; null when it is not. */
  task: number | null;
};

export const NUM_RANGE: [number, number] = [-10, 10];

/** The chips' size and the mat they lie on. */
export const CHIP_R = 15;
export const MAT = { x: 132, y: 70, w: 496, h: 300 };
/** Tidied, the + chips rise in rows from the line across the middle and the − chips hang under it. */
export const MAT_LINE = MAT.y + MAT.h / 2;
const GRID = 39;
const HALF = 13;
const COLS = 12;
const ROWS = 3;
/** The most chips of one sign: the tidied rows. a − b at the ends of NUM_RANGE needs 20. */
export const CHIP_CAP = COLS * ROWS;

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
/** `n` chips more of a sign, up to CHIP_CAP. */
export const put = (m: Mat, negative: boolean, n = 1): Mat =>
  negative ? { ...m, neg: Math.min(CHIP_CAP, m.neg + n) } : { ...m, pos: Math.min(CHIP_CAP, m.pos + n) };

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
 * Where each chip goes, in slots (COLS to a row): the side with chips left over has them first, then the zero pairs
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

/** Where a slot is: a + slot over the line, a − slot under it, the first row of each next to it. */
export function slotAt(neg: boolean, slot: number): { x: number; y: number } {
  const row = Math.floor(slot / COLS);
  return {
    x: MAT.x + 18 + CHIP_R + (slot % COLS) * GRID,
    y: neg ? MAT_LINE + HALF + CHIP_R + row * GRID : MAT_LINE - HALF - CHIP_R - row * GRID,
  };
}

/** How many of each sign are on the mat. */
export const matOf = (chips: MatChip[]): Mat => ({ pos: chips.filter((c) => !c.neg).length, neg: chips.filter((c) => c.neg).length });

/** The chips lined up: the ones left over first, then the zero pairs, each + right over its −. Ids are kept. */
export function tidy(chips: MatChip[]): MatChip[] {
  const s = slots(matOf(chips));
  const at = { pos: 0, neg: 0 };
  return chips.map((c) => ({ ...c, ...slotAt(c.neg, c.neg ? s.neg[at.neg++] : s.pos[at.pos++]) }));
}

/** The first tidy slot of a sign with no chip on it, for a chip put out with a tap; null when the rows are full. */
export function freeSpot(chips: MatChip[], neg: boolean): { x: number; y: number } | null {
  for (let slot = 0; slot < CHIP_CAP; slot++) {
    const p = slotAt(neg, slot);
    if (!chips.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < CHIP_R * 1.6)) return p;
  }
  return null;
}

/** The first column of the lined-up rows with both its + slot and its − slot free, for a zero pair put out with a tap. */
export function freeColumn(chips: MatChip[]): { p: { x: number; y: number }; m: { x: number; y: number } } | null {
  const free = (q: { x: number; y: number }) => !chips.some((c) => Math.hypot(c.x - q.x, c.y - q.y) < CHIP_R * 1.6);
  for (let slot = 0; slot < CHIP_CAP; slot++) {
    const [p, m] = [slotAt(false, slot), slotAt(true, slot)];
    if (free(p) && free(m)) return { p, m };
  }
  return null;
}

/**
 * The chips changed to hold `want`, for "Show me": chips of a sign there are too many of go (the last put out first),
 * new ones are put out, and all of them are lined up. Returns the chips that went, to show them going.
 */
export function toMat(chips: MatChip[], want: Mat, next: number): { chips: MatChip[]; next: number; gone: MatChip[] } {
  const keep: MatChip[] = [];
  const gone: MatChip[] = [];
  const have = { pos: 0, neg: 0 };
  for (const c of [...chips].reverse()) {
    const side = c.neg ? "neg" : "pos";
    const left = chips.filter((d) => d.neg === c.neg).length - have[side];
    have[side]++;
    (left > want[side] ? gone : keep).unshift(c);
  }
  const add = (neg: boolean, n: number) => Array.from({ length: Math.max(0, n) }, () => ({ id: next++, x: 0, y: 0, neg }));
  const m = matOf(keep);
  const out = [...keep, ...add(false, want.pos - m.pos), ...add(true, want.neg - m.neg)];
  return { chips: tidy(out), next, gone };
}

export const onMat = (x: number, y: number) => x >= MAT.x && x <= MAT.x + MAT.w && y >= MAT.y && y <= MAT.y + MAT.h;
/** A point moved in so a chip there lies wholly on the mat. */
export const keepOn = (x: number, y: number) => ({
  x: Math.min(MAT.x + MAT.w - CHIP_R - 2, Math.max(MAT.x + CHIP_R + 2, x)),
  y: Math.min(MAT.y + MAT.h - CHIP_R - 2, Math.max(MAT.y + CHIP_R + 2, y)),
});

/** The chip of the other sign a chip dropped at (x, y) lands on, the nearest if several: the two cancel. */
export function landsOn(chips: MatChip[], x: number, y: number, neg: boolean, skip: number[] = []): MatChip | null {
  let best: MatChip | null = null;
  let d = CHIP_R * 1.5;
  for (const c of chips) {
    const e = Math.hypot(c.x - x, c.y - y);
    if (c.neg !== neg && !skip.includes(c.id) && e <= d) [best, d] = [c, e];
  }
  return best;
}

/**
 * The + and − chips drawn as zero pairs: a + with a − right under it, as `tidy` and taps lay them out, however many rows
 * apart. The + nearest the line take the − nearest under them first, and each chip is in one pair at most.
 */
export function stackedPairs(chips: MatChip[]): [MatChip, MatChip][] {
  const used = new Set<number>();
  const out: [MatChip, MatChip][] = [];
  const reach = 2 * (CHIP_R + HALF) + 2 * (ROWS - 1) * GRID + 4;
  for (const p of chips.filter((c) => !c.neg).sort((a, b) => b.y - a.y)) {
    const below = chips.filter((c) => c.neg && !used.has(c.id) && Math.abs(c.x - p.x) < 6 && c.y > p.y && c.y - p.y <= reach);
    const m = below.sort((a, b) => a.y - b.y)[0];
    if (m) {
      used.add(m.id);
      out.push([p, m]);
    }
  }
  return out;
}

/**
 * Which step of a + b or a − b is asked once the mat holds `m`, from step `at`: each step is done when the mat holds
 * what it says. Cancelling pairs as they go (a + put out onto a −) may skip the cancel step, but never the steps that
 * put out or take away. The last step, the answer, is reached when the one before it is done.
 */
export function taskStep(a: number, op: CountersOp, b: number, at: number, m: Mat): number {
  const steps = sumSteps(a, op, b);
  const holds = (i: number) => steps[i].mat.pos === m.pos && steps[i].mat.neg === m.neg;
  let i = at;
  for (;;) {
    if (i >= steps.length - 1) return steps.length - 1;
    if (holds(i)) i++;
    else if ((steps[i].kind === "put" || steps[i].kind === "take") && steps[i + 1].kind === "cancel" && holds(i + 1)) i += 2;
    else return i;
  }
}

/** The mat at the start: 3 + (−5), laid out. */
export const COUNTERS_START: LiveCounters = (() => {
  const chips = tidy([...Array(3)].map((_, i) => ({ id: i, x: 0, y: 0, neg: false })).concat([...Array(5)].map((_, i) => ({ id: 3 + i, x: 0, y: 0, neg: true }))));
  return { chips, next: 8, a: 3, op: "add", b: -5, task: null };
})();

/** A state saved before the chips lay where they were dropped ({ pos, neg, … }) as one with them, tidied. */
export function counterState(s: LiveCounters | (Omit<LiveCounters, "chips" | "next" | "task"> & Mat)): LiveCounters {
  if ("chips" in s && Array.isArray(s.chips)) return s;
  const old = s as Mat & Pick<LiveCounters, "a" | "op" | "b">;
  const n = Math.min(old.pos ?? 0, CHIP_CAP) + Math.min(old.neg ?? 0, CHIP_CAP);
  const chips = tidy([...Array(n)].map((_, i) => ({ id: i, x: 0, y: 0, neg: i >= Math.min(old.pos ?? 0, CHIP_CAP) })));
  return { chips, next: n, a: old.a ?? 3, op: old.op ?? "add", b: old.b ?? -5, task: null };
}
