// Circle theorems worked by hand (#715). A circle with centre O is on the board and the learner moves a point on it
// (or, in the last round, a point P outside it) by dragging, by pressing where it should go, or with the arrow keys.
// The angles or lengths the round is about are read off as the point moves; only once the point has been moved to a few
// places does the right tile count, so the rule is found by watching what stays the same before it is said. Rounds: an
// angle at the circle against the angle at the centre on the same arc, the angle at the centre from the angle at the
// circle, an angle in a semicircle, the opposite angles of a quadrilateral in the circle, and two tangents from P.
// src/live/CircleHand.tsx draws it; everything here is plain data.

export type CircleRound =
  | { kind: "compare"; arc: number }
  | { kind: "centre"; arc: number }
  | { kind: "semi" }
  | { kind: "cyclic"; a: number }
  | { kind: "tangents" };

export const CIRCLE_LADDER: CircleRound[] = [
  { kind: "compare", arc: 120 },
  { kind: "centre", arc: 140 },
  { kind: "semi" },
  { kind: "cyclic", a: 80 },
  { kind: "tangents" },
];

export type LiveCircleHand = {
  /** The round being worked (the ladder's length once it is all done). */
  round: number;
  /** Where the moving point is: its angle round O in degrees (anticlockwise from the right). */
  t: number;
  /** How far P is from O, in radii (the tangents round only). */
  d: number;
  /** How many times the point has been moved somewhere new this round (at most 3). */
  seen: number;
  /** Where the point was when it last counted as moved. */
  from: [number, number];
  /** The tile tapped last in this round, and whether it was right. */
  said: { v: string; ok: boolean } | null;
};

/** Where each round's point starts. */
const START: Record<CircleRound["kind"], [number, number]> = { compare: [90, 1], centre: [110, 1], semi: [120, 1], cyclic: [0, 1], tangents: [0, 1.8] };
const at = (round: number): LiveCircleHand => {
  const r = CIRCLE_LADDER[round];
  const [t, d] = r ? START[r.kind] : [90, 1];
  return { round, t, d, seen: 0, from: [t, d], said: null };
};
export const CIRCLE_HAND_START: LiveCircleHand = at(0);
/** Moves needed before a right tile counts. */
export const MOVES = 2;
export const D_MIN = 1.25;
export const D_MAX = 2.3;
/** The circle's radius in the units the lengths are read in. */
export const RADIUS = 5;

export const roundOf = (s: LiveCircleHand) => CIRCLE_LADDER[s.round] ?? null;

/** The fixed points on the circle, by angle: A and B (and D in the quadrilateral). */
export function fixedOf(r: CircleRound): Record<string, number> {
  if (r.kind === "compare" || r.kind === "centre") return { A: 270 - r.arc / 2, B: 270 + r.arc / 2 - 360 };
  if (r.kind === "semi") return { A: 180, B: 0 };
  // ∠A stands on arc BCD, so B and D are 2a apart across the circle from A.
  if (r.kind === "cyclic") return { A: 180, B: r.a, D: -r.a };
  return {};
}

/** The range the moving point keeps to, in degrees: clear of the fixed points, on the side the round needs. */
export function rangeOf(r: CircleRound): [number, number] {
  if (r.kind === "compare" || r.kind === "centre") return [-90 + r.arc / 2 + 12, 270 - r.arc / 2 - 12];
  if (r.kind === "semi") return [14, 166];
  if (r.kind === "cyclic") return [-r.a + 12, r.a - 12];
  return [-45, 45];
}

/** An angle brought into the range's turn and kept inside it. */
function clampT(r: CircleRound, t: number): number {
  const [lo, hi] = rangeOf(r);
  let v = t;
  while (v < lo - 180 + (hi - lo) / 2) v += 360;
  while (v > hi + 180 - (hi - lo) / 2) v -= 360;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** The point moved to angle t (and distance d): counted as moved once it has gone far enough from where it last was. */
export function move(s: LiveCircleHand, t: number, d = s.d): LiveCircleHand {
  const r = roundOf(s);
  if (!r) return s;
  const nt = clampT(r, t);
  const nd = r.kind === "tangents" ? Math.max(D_MIN, Math.min(D_MAX, Math.round(d * 20) / 20)) : 1;
  const far = Math.abs(nt - s.from[0]) >= 15 || Math.abs(nd - s.from[1]) >= 0.24;
  return far ? { ...s, t: nt, d: nd, seen: Math.min(3, s.seen + 1), from: [nt, nd] } : { ...s, t: nt, d: nd };
}

/** The degrees of the angle at P between the rays to Q and R, to the nearest degree. */
export function angleAt(p: [number, number], q: [number, number], r: [number, number]): number {
  const a = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.atan2(r[1] - p[1], r[0] - p[0]);
  const deg = Math.abs((a * 180) / Math.PI) % 360;
  return Math.round(deg > 180 ? 360 - deg : deg);
}
export const onCircle = (deg: number, rad = 1): [number, number] => [rad * Math.cos((deg * Math.PI) / 180), rad * Math.sin((deg * Math.PI) / 180)];

/** What the round shows as the point moves: the angles at the circle and the centre, or the two tangents' lengths. */
export function readings(s: LiveCircleHand): Record<string, number> {
  const r = roundOf(s);
  if (!r) return {};
  const C = onCircle(s.t);
  const f = fixedOf(r);
  if (r.kind === "tangents") {
    const len = Math.round(RADIUS * Math.sqrt(s.d * s.d - 1) * 10) / 10;
    return { PA: len, PB: len };
  }
  const [A, B] = [onCircle(f.A), onCircle(f.B)];
  if (r.kind === "cyclic") return { A: angleAt(A, onCircle(f.B), onCircle(f.D)), C: angleAt(C, onCircle(f.B), onCircle(f.D)) };
  return { C: angleAt(C, A, B), O: r.kind === "semi" ? 180 : angleAt([0, 0], A, B) };
}

/** A round's tiles, the right one first: numbers are degrees, words are keys of the piece's words. */
export function tiles(s: LiveCircleHand): { right: string; slip: string; other: string } | null {
  const r = roundOf(s);
  if (!r) return null;
  if (r.kind === "compare") return { right: "half", slip: "equal", other: "double" };
  if (r.kind === "centre") return { right: String(r.arc), slip: String(r.arc / 2), other: String(r.arc / 4) };
  if (r.kind === "semi") return { right: "90", slip: "180", other: "60" };
  if (r.kind === "cyclic") return { right: "180", slip: "360", other: String(2 * (180 - r.a)) };
  return { right: "same", slip: "depends", other: "longer" };
}

/** The numbers each round's words are said with. */
export function ruleOf(r: CircleRound): Record<string, string> {
  if (r.kind === "compare" || r.kind === "centre") return { o: String(r.arc), c: String(r.arc / 2) };
  if (r.kind === "cyclic") return { a: String(r.a), c: String(180 - r.a) };
  return {};
}

/** A tile tapped: right only once the point has been moved to a few places. A right answer stands until Next. */
export function tap(s: LiveCircleHand, v: string): LiveCircleHand {
  const t = tiles(s);
  if (!t || s.said?.ok) return s;
  return { ...s, said: { v, ok: v === t.right && s.seen >= MOVES } };
}

/** The next round, its point back where the round starts it. */
export const next = (s: LiveCircleHand): LiveCircleHand => at(Math.min(CIRCLE_LADDER.length, s.round + 1));

/** The ladder started again. */
export const again = (): LiveCircleHand => CIRCLE_HAND_START;
