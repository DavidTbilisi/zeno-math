// A fair price as a balance (#739). Each round is a spinner of equal parts, each paying its prize. Every part is a
// weight on a beam at its prize; the learner taps the line to set the price per spin, the fulcrum goes there, and
// the beam tips towards the side that wins over many games: the player's when the prizes outweigh the price, the
// stall's when the price does. The most likely prize, the average of the different prizes and the point halfway
// between the smallest and largest are named when they don't balance; the beam is level only at the expected value,
// and only then is the rule said: a fair price is the sum of each prize times its chance. src/live/FairGame.tsx draws it.

/** Each round's prizes, one per equal part of the spinner. */
export const FAIR_LADDER: readonly (readonly number[])[] = [
  [0, 4],
  [0, 0, 0, 8],
  [0, 0, 2, 6],
  [0, 0, 0, 0, 6, 12],
  [0, 0, 4, 8],
];

/** The price line runs from LO to HI. */
export const LO = 0;
export const HI = 12;
/** In the tally each part comes up this many times. */
export const EACH = 10;

export type LiveFairGame = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** The price set last, or null before the first tap of a round. */
  at: number | null;
};

export const FAIR_GAME_START: LiveFairGame = { round: 0, at: null };

export const prizesOf = (s: LiveFairGame) => FAIR_LADDER[s.round] ?? null;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
/** The expected winnings of a spin: the prizes' mean, each part being equally likely. */
export const expected = (xs: readonly number[]) => sum(xs) / xs.length;

/** How hard the beam turns about the price f: positive when the prizes outweigh it (the player's side). */
export const torque = (xs: readonly number[], f: number) => sum(xs.map((x) => x - f));

/** Over EACH × parts games: what the player wins and what they pay at price f. */
export function tally(xs: readonly number[], f: number) {
  const games = EACH * xs.length;
  return { games, win: EACH * sum(xs), pay: games * f };
}

export const fair = (s: LiveFairGame) => {
  const xs = prizesOf(s);
  return !!xs && s.at !== null && torque(xs, s.at) === 0;
};

/** The different prizes, smallest first. */
export const distinct = (xs: readonly number[]) => [...new Set(xs)].sort((a, b) => a - b);

/** The one prize on most parts, or null when two tie. */
export function likeliest(xs: readonly number[]): number | null {
  const n = (v: number) => xs.filter((x) => x === v).length;
  const ds = distinct(xs);
  const top = Math.max(...ds.map(n));
  const at = ds.filter((v) => n(v) === top);
  return at.length === 1 ? at[0] : null;
}

export type FairMiss = "likely" | "avg" | "mid" | "player" | "stall";

/** What a price that is not fair is: the likeliest prize, the different prizes' average, halfway, or just off. */
export function missOf(xs: readonly number[], f: number): FairMiss | null {
  const t = torque(xs, f);
  if (t === 0) return null;
  if (f === likeliest(xs)) return "likely";
  const ds = distinct(xs);
  if (f === expected(ds)) return "avg";
  if (f === (ds[0] + ds[ds.length - 1]) / 2) return "mid";
  return t > 0 ? "player" : "stall";
}

/** The price set at p (kept on the line); a fair price stands until Next. */
export function tap(s: LiveFairGame, p: number): LiveFairGame {
  if (!prizesOf(s) || fair(s)) return s;
  return { ...s, at: Math.max(LO, Math.min(HI, Math.round(p))) };
}

export const next = (s: LiveFairGame): LiveFairGame => ({ round: Math.min(FAIR_LADDER.length, s.round + 1), at: null });
export const again = (): LiveFairGame => FAIR_GAME_START;
