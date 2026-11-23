// Walk the slope: a small walker on a slope of length 1 at θ to the ground. How far they have gone across is the
// distance walked × cos θ, and how tall they have climbed is walked × sin θ; at the top, walked = 1, the two are
// cos θ and sin θ themselves. The walk is kept in hundredths of the slope, so the numbers on it stay exact.

export type LiveSlopeWalk = {
  /** The slope's angle to the ground, whole degrees. */
  theta: number;
  /** How much of the slope has been walked, in hundredths: 0 at the bottom, 100 at the top. */
  at: number;
};

export const SLOPE_THETA: readonly [number, number] = [5, 85];
export const SLOPE_WALK_START: LiveSlopeWalk = { theta: 35, at: 60 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rad = (deg: number) => (deg * Math.PI) / 180;

export const clampTheta = (t: number) => clamp(Math.round(t), SLOPE_THETA[0], SLOPE_THETA[1]);
export const clampAt = (a: number) => clamp(Math.round(a), 0, 100);

/** What the walk measures: the part of the slope walked, how far across and how tall, and cos θ and sin θ. */
export function walkParts(s: LiveSlopeWalk) {
  const walked = s.at / 100;
  const cos = Math.cos(rad(s.theta));
  const sin = Math.sin(rad(s.theta));
  return { walked, cos, sin, far: walked * cos, tall: walked * sin };
}

/** The angle of a point (dx right, dy up from the bottom of the slope), as the slope's angle would be pointing at it. */
export const thetaAt = (dx: number, dy: number) => clampTheta((Math.atan2(Math.max(0, dy), Math.max(0, dx)) * 180) / Math.PI);

/** How much of the slope is walked at a point (dx right, dy up, in slope lengths): the point's shadow on the slope. */
export const atOn = (theta: number, dx: number, dy: number) => clampAt(100 * (dx * Math.cos(rad(theta)) + dy * Math.sin(rad(theta))));

/** A number to two places, as written under the picture: 0.6 → "0.60". */
export const dec2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
