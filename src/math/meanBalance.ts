// The mean as the balance point (#736). Each round puts a few dots on a beam over a line from 0 to 10; the learner taps
// the line to set the balance point there, and the beam tips towards the side whose distances from it add up to more.
// A tap on the middle dot (the median) or halfway between the end dots is named for what it is; the beam balances only
// where the distances below add up to the distances above, and then the rule is said: that point is the mean, the
// total shared equally. src/live/MeanBalance.tsx draws it.

export const MEAN_LADDER: readonly (readonly number[])[] = [
  [2, 8],
  [1, 2, 9],
  [2, 3, 3, 8],
  [1, 5, 6, 6, 7],
  [0, 6, 6, 6, 7],
];

/** The line runs from LO to HI. */
export const LO = 0;
export const HI = 10;

export type LiveMeanBalance = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the balance point was set last, or null before the first tap of a round. */
  at: number | null;
};

export const MEAN_BALANCE_START: LiveMeanBalance = { round: 0, at: null };

export const dotsOf = (s: LiveMeanBalance) => MEAN_LADDER[s.round] ?? null;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
export const meanOf = (vs: readonly number[]) => sum(vs) / vs.length;
export const medianOf = (vs: readonly number[]) => {
  const a = [...vs].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
};

/** The distances of the dots below f and above f (a dot at f pulls neither way). */
export function pulls(vs: readonly number[], f: number) {
  const left = vs.filter((x) => x < f).map((x) => f - x);
  const right = vs.filter((x) => x > f).map((x) => x - f);
  return { left, right, l: sum(left), r: sum(right) };
}

/** How hard the beam turns about f: positive when the right side is heavier. */
export const torque = (vs: readonly number[], f: number) => sum(vs.map((x) => x - f));

export const balanced = (s: LiveMeanBalance) => {
  const vs = dotsOf(s);
  return !!vs && s.at !== null && torque(vs, s.at) === 0;
};

export type MeanMiss = "median" | "mid" | "left" | "right";

/** What a point that does not balance is: the middle dot, halfway between the ends, or just too far one way. */
export function missOf(vs: readonly number[], f: number): MeanMiss | null {
  const t = torque(vs, f);
  if (t === 0) return null;
  if (f === medianOf(vs)) return "median";
  if (f === (Math.min(...vs) + Math.max(...vs)) / 2) return "mid";
  return t < 0 ? "left" : "right";
}

/** The balance point set at p (kept on the line); a balanced beam stands until Next. */
export function tap(s: LiveMeanBalance, p: number): LiveMeanBalance {
  if (!dotsOf(s) || balanced(s)) return s;
  return { ...s, at: Math.max(LO, Math.min(HI, Math.round(p))) };
}

/** The next round, no balance point yet. */
export const next = (s: LiveMeanBalance): LiveMeanBalance => ({ round: Math.min(MEAN_LADDER.length, s.round + 1), at: null });

/** The ladder started again. */
export const again = (): LiveMeanBalance => MEAN_BALANCE_START;

/** Distances as a sum: "3 + 1 = 4", "5", or "0" when there are none. */
export const sumSay = (ds: readonly number[]) => (ds.length > 1 ? `${ds.join(" + ")} = ${sum(ds)}` : String(ds[0] ?? 0));
