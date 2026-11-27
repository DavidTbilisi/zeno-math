// Related rates seen on a sliding ladder (#747). The foot of a ladder slides out from the wall at 1 m/s and the learner
// drags it to where the top slides down at a given speed. The first rounds show the top's speed as the foot moves, so
// the learner can see that it is x/y times the foot's (x the foot's distance from the wall, y the top's height); the
// last rounds hide the speed, so the place must be found from x and y alone, and the end states the rule
// dy/dt = −(x/y)·dx/dt from x² + y² = L². src/live/LadderRates.tsx draws it.

/** A round: the ladder's length, the top's speed asked for (as a fraction of the foot's 1 m/s), and whether the speed is shown. */
export type LadderRound = { L: number; top: readonly [number, number]; target: number; step: number; showSpeed: boolean };

export const LADDER_ROUNDS: readonly LadderRound[] = [
  { L: 5, top: [3, 4], target: 3, step: 0.25, showSpeed: true },
  { L: 5, top: [4, 3], target: 4, step: 0.25, showSpeed: true },
  { L: 10, top: [3, 4], target: 6, step: 0.5, showSpeed: false },
  { L: 13, top: [12, 5], target: 12, step: 0.5, showSpeed: false },
];

export type LiveLadderRates = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** How far the foot is from the wall, in metres. */
  x: number;
  /** Whether the foot has been let go at least once this round. */
  tried: boolean;
};

export const roundOf = (s: LiveLadderRates) => LADDER_ROUNDS[s.round] ?? null;

/** x snapped to the round's step, kept off the wall and the floor. */
export const snapX = (r: LadderRound, x: number) => Math.max(r.step, Math.min(r.L - r.step, Math.round(x / r.step) * r.step));

const startOf = (r: LadderRound | undefined) => (r ? snapX(r, r.L / 5) : 1);
export const LADDER_RATES_START: LiveLadderRates = { round: 0, x: startOf(LADDER_ROUNDS[0]), tried: false };

/** The top's height when the foot is x from the wall. */
export const heightAt = (r: LadderRound, x: number) => Math.sqrt(r.L * r.L - x * x);
/** How fast the top slides down, in m/s, when the foot moves out at 1 m/s: x/y. */
export const topSpeed = (r: LadderRound, x: number) => x / heightAt(r, x);

export function done(s: LiveLadderRates): boolean {
  const r = roundOf(s);
  return !!r && s.tried && s.x === r.target;
}

/** The foot moved to x; `tried` once it is let go. Nothing moves once the round is done. */
export function moveFoot(s: LiveLadderRates, x: number, letGo: boolean): LiveLadderRates {
  const r = roundOf(s);
  if (!r || done(s)) return s;
  return { ...s, x: snapX(r, x), tried: s.tried || letGo };
}

/** Why the foot is not right: the top slides too slowly here (move the foot out) or too fast (move it in). */
export type LadderMiss = "slow" | "fast";
export function missOf(r: LadderRound, x: number): LadderMiss | null {
  if (x === r.target) return null;
  return topSpeed(r, x) < r.top[0] / r.top[1] ? "slow" : "fast";
}

export const round2 = (v: number) => Math.round(v * 100) / 100;

export const next = (s: LiveLadderRates): LiveLadderRates => {
  const round = Math.min(LADDER_ROUNDS.length, s.round + 1);
  return { round, x: startOf(LADDER_ROUNDS[round]), tried: false };
};
export const again = (): LiveLadderRates => LADDER_RATES_START;
