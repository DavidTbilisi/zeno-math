// The empirical rule found by cutting a normal curve (#740). Each round is a normal model in a setting (heights,
// bottles, exam marks) drawn over its axis; the learner drags a cut (or the pair of cuts the same distance either side
// of the mean) and the area between or beyond them is shaded and given as a percent. The round asks for a share
// (about 68%, 95%, 99.7%, then one tail); a share that is too small or too large, or the tail on the wrong side, is
// named. Each share found is said in standard deviations, and only the last round states the whole rule.
// src/live/NormalCut.tsx draws it.
import { normCdf } from "./distributions";

export type CutMode = "both" | "above" | "below";
/** A round: the setting (its words), the model's mean and standard deviation, which share and where it is right. */
export type CutRound = { setting: 0 | 1 | 2; m: number; s: number; mode: CutMode; target: number };

export const CUT_ROUNDS: readonly CutRound[] = [
  { setting: 0, m: 170, s: 10, mode: "both", target: 1 },
  { setting: 0, m: 170, s: 10, mode: "both", target: 2 },
  { setting: 0, m: 170, s: 10, mode: "both", target: 3 },
  { setting: 1, m: 500, s: 4, mode: "above", target: 1 },
  { setting: 2, m: 60, s: 8, mode: "below", target: -2 },
];

/** The cut moves in quarters of a standard deviation, at most FAR from the mean. */
export const STEP = 0.25;
export const FAR = 3.5;

export type LiveNormalCut = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the cut is, in standard deviations from the mean (the right-hand one of a pair). */
  k: number;
  /** Whether the cut has been let go at least once this round. */
  tried: boolean;
};

const startOf = (r: CutRound | undefined) => (r?.mode === "both" ? 0.5 : 0);
export const NORMAL_CUT_START: LiveNormalCut = { round: 0, k: startOf(CUT_ROUNDS[0]), tried: false };

export const roundOf = (s: LiveNormalCut) => CUT_ROUNDS[s.round] ?? null;

/** The percent of the model shaded with the cut at k: between ±k, above k or below k. */
export function share(mode: CutMode, k: number): number {
  if (mode === "both") return (normCdf(k) - normCdf(-k)) * 100;
  return (mode === "above" ? 1 - normCdf(k) : normCdf(k)) * 100;
}

/** A share as read on the curve: two places below 1%, one above; never rounded up to 100. */
export function shareSay(p: number): string {
  if (p < 1) return (Math.round(p * 100) / 100).toFixed(2);
  return (p > 99 ? Math.floor(p * 10) / 10 : Math.round(p * 10) / 10).toFixed(1);
}

/** The cut at z standard deviations, put on the nearest quarter (a pair never closes up). */
export function snap(mode: CutMode, z: number): number {
  const k = Math.round(z / STEP) * STEP;
  return Math.max(mode === "both" ? STEP : -FAR, Math.min(FAR, mode === "both" ? Math.abs(k) : k)) || 0;
}

export function done(s: LiveNormalCut): boolean {
  const r = roundOf(s);
  return !!r && s.tried && s.k === r.target;
}

/** The cut moved to z (in standard deviations); `tried` once it is let go. Nothing moves once the round is done. */
export function moveCut(s: LiveNormalCut, z: number, letGo: boolean): LiveNormalCut {
  const r = roundOf(s);
  if (!r || done(s)) return s;
  return { ...s, k: snap(r.mode, z), tried: s.tried || letGo };
}

export type CutMiss = "few" | "many" | "side";

/** Why the cut is not right: too small a share, too large, or the tail on the other side of the mean. */
export function missOf(r: CutRound, k: number): CutMiss | null {
  if (k === r.target) return null;
  if (r.mode !== "both" && k === -r.target) return "side";
  return share(r.mode, k) < share(r.mode, r.target) ? "few" : "many";
}

/** A value in the setting's units, j standard deviations from the mean. */
export const valueAt = (r: CutRound, j: number) => Math.round((r.m + j * r.s) * 100) / 100;

export const next = (s: LiveNormalCut): LiveNormalCut => {
  const round = Math.min(CUT_ROUNDS.length, s.round + 1);
  return { round, k: startOf(CUT_ROUNDS[round]), tried: false };
};
export const again = (): LiveNormalCut => NORMAL_CUT_START;
