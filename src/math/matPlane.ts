// A matrix acting on the plane, found by tapping points (#734). Each round shows a 2 × 2 matrix M and the unit
// square; the learner taps where M sends (1, 0), then (0, 1), working each out from M(x, y) = (ax + by, cx + dy).
// A wrong tap is named (a row read across, the point left where it was, another point); once both are found the
// image of the square is drawn, the columns light up as the two images, and the rule is said: the columns are where
// (1, 0) and (0, 1) land, and the determinant is how much the area is scaled. src/live/MatPlane.tsx draws it.

/** A point of the plane. */
export type Pt = readonly [number, number];
/** A 2 × 2 matrix, row by row. */
export type Mat2 = readonly [readonly [number, number], readonly [number, number]];

export const MAT_LADDER: Mat2[] = [
  [[2, 0], [0, 1]],
  [[0, -1], [1, 0]],
  [[1, 0], [0, -1]],
  [[1, 1], [0, 1]],
  [[2, 1], [1, 2]],
];

/** The plane runs from LO to HI on both axes. */
export const LO = -4;
export const HI = 4;

/** The two points sent, in turn. */
export const UNITS: [Pt, Pt] = [[1, 0], [0, 1]];

export type LiveMatPlane = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** How many of (1, 0) and (0, 1) have been found this round. */
  found: number;
  /** The last wrong tap, while the point it was meant for is still being looked for. */
  miss: Pt | null;
};

export const MAT_PLANE_START: LiveMatPlane = { round: 0, found: 0, miss: null };

export const matOf = (s: LiveMatPlane): Mat2 | null => MAT_LADDER[s.round] ?? null;

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

/** Where M sends a point. */
export const apply = (m: Mat2, [x, y]: Pt): Pt => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];

/** Column k of M: where the k-th unit point lands. */
export const column = (m: Mat2, k: 0 | 1): Pt => [m[0][k], m[1][k]];

export const det = (m: Mat2) => m[0][0] * m[1][1] - m[0][1] * m[1][0];

export type MatMiss = "row" | "same" | "other";

/** What a wrong tap for the k-th unit point is: a row read across, the point unmoved, or another point. */
export function missOf(m: Mat2, k: 0 | 1, p: Pt): MatMiss | null {
  if (same(p, column(m, k))) return null;
  if (same(p, m[k])) return "row";
  if (same(p, UNITS[k])) return "same";
  return "other";
}

/** A point tapped: the next image found, or the miss kept to be named. */
export function tap(s: LiveMatPlane, p: Pt): LiveMatPlane {
  const m = matOf(s);
  if (!m || s.found >= 2) return s;
  const q: Pt = [Math.max(LO, Math.min(HI, Math.round(p[0]))), Math.max(LO, Math.min(HI, Math.round(p[1])))];
  const k = s.found as 0 | 1;
  return same(q, column(m, k)) ? { ...s, found: s.found + 1, miss: null } : { ...s, miss: q };
}

/** The next round, nothing found yet. */
export const next = (s: LiveMatPlane): LiveMatPlane => ({ round: Math.min(MAT_LADDER.length, s.round + 1), found: 0, miss: null });

/** The ladder started again. */
export const again = (): LiveMatPlane => MAT_PLANE_START;

/** A number with a true minus. */
export const say = (v: number) => String(v).replace(/^-/, "−");
/** A point as read: (2, −1). */
export const sayPt = (p: Pt) => `(${say(p[0])}, ${say(p[1])})`;

/** M written as a map: M(x, y) = (2x + 0y, 0x + 1y). */
export function mapSay(m: Mat2): string {
  const row = (r: readonly [number, number]) => `${say(r[0])}x ${r[1] < 0 ? "−" : "+"} ${Math.abs(r[1])}y`;
  return `M(x, y) = (${row(m[0])}, ${row(m[1])})`;
}
